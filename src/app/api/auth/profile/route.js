import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getSessionUserId } from '@/lib/auth';
import { decryptPrivateData } from '@/lib/privateData';

function safeUser(user) {
  return {
    id: String(user._id),
    name: decryptPrivateData(user.nameEncrypted),
    phone: decryptPrivateData(user.phoneEncrypted),
    category: user.category,
    customCategory: user.customCategory,
    profileImage: user.profileImage || '',
  };
}

export async function GET() {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ user: null }, { status: 401 });

    await connectDB();
    const user = await User.findById(userId).select('nameEncrypted phoneEncrypted category customCategory profileImage');
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

    const { profileImage } = await request.json();
    const normalizedImage = typeof profileImage === 'string' ? profileImage.trim() : '';

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ message: 'Account not found.' }, { status: 404 });

    user.profileImage = normalizedImage;
    await user.save();

    return NextResponse.json({ success: true, user: safeUser(user) });
  } catch {
    return NextResponse.json({ message: 'Unable to update profile picture.' }, { status: 500 });
  }
}
