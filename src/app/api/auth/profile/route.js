import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getSessionUserId } from '@/lib/auth';
import { blindIndex, decryptPrivateData, encryptPrivateData } from '@/lib/privateData';
import bcrypt from 'bcryptjs';
import { verifyOtp } from '@/lib/otp';

function safeUser(user) {
  return {
    id: String(user._id),
    name: decryptPrivateData(user.nameEncrypted),
    phone: decryptPrivateData(user.phoneEncrypted),
    email: user.emailEncrypted ? decryptPrivateData(user.emailEncrypted) : '',
    category: user.category,
    customCategory: user.customCategory,
    profileImage: user.profileImage || '',
    hasPassword: Boolean(user.passwordHash),
  };
}

export async function GET() {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ user: null }, { status: 401 });

    await connectDB();
    const user = await User.findById(userId).select('nameEncrypted phoneEncrypted emailEncrypted category customCategory profileImage +passwordHash');
    if (!user) return NextResponse.json({ user: null }, { status: 404 });

    return NextResponse.json({ user: safeUser(user) });
  } catch {
    return NextResponse.json({ message: 'Unable to load profile.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ message: 'Please log in first.' }, { status: 401 });

    const { name, email, emailOtp, profileImage, password } = await request.json();
    const normalizedImage = typeof profileImage === 'string' ? profileImage.trim() : '';
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (password !== undefined && normalizedPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    if (name !== undefined && normalizedName.length < 2) {
      return NextResponse.json({ message: 'Name must be at least 2 characters long.' }, { status: 400 });
    }

    if (email !== undefined && normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ message: 'Please provide a valid email address.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) return NextResponse.json({ message: 'Account not found.' }, { status: 404 });

    if (name !== undefined) user.nameEncrypted = encryptPrivateData(normalizedName);
    if (email !== undefined) {
      if (normalizedEmail) {
        const currentEmail = user.emailEncrypted ? decryptPrivateData(user.emailEncrypted) : '';
        if (normalizedEmail !== currentEmail && !verifyOtp(normalizedEmail, String(emailOtp || ''))) {
          return NextResponse.json({ message: 'Please verify your new email address with the OTP first.' }, { status: 401 });
        }
        const emailHash = blindIndex(normalizedEmail);
        const existingEmail = await User.findOne({ emailHash, _id: { $ne: user._id } }).select('+emailHash');
        if (existingEmail) {
          return NextResponse.json({ message: 'An account with this email address already exists.' }, { status: 409 });
        }
        user.emailEncrypted = encryptPrivateData(normalizedEmail);
        user.emailHash = emailHash;
      } else {
        user.emailEncrypted = '';
        user.emailHash = undefined;
      }
    }
    if (profileImage !== undefined) user.profileImage = normalizedImage;
    if (password !== undefined) {
      if (user.passwordHash) {
        return NextResponse.json({ message: 'A password is already set. Use Forgot password to replace it.' }, { status: 409 });
      }
      user.passwordHash = await bcrypt.hash(normalizedPassword, 12);
    }
    await user.save();

    return NextResponse.json({ success: true, user: safeUser(user) });
  } catch {
    return NextResponse.json({ message: 'Unable to update profile picture.' }, { status: 500 });
  }
}
