import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { setSessionCookie } from '@/lib/auth';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { blindIndex, decryptPrivateData } from '@/lib/privateData';
import bcrypt from 'bcryptjs';

function safeUser(user) {
  return {
    id: String(user._id),
    name: decryptPrivateData(user.nameEncrypted),
    phone: decryptPrivateData(user.phoneEncrypted),
    email: user.emailEncrypted ? decryptPrivateData(user.emailEncrypted) : '',
    category: user.category,
    customCategory: user.customCategory,
    profileImage: user.profileImage || '',
  };
}

export async function POST(request) {
  try {
    const { phone, password } = await request.json();
    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ message: 'Please provide a valid phone number.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'Please provide your password.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ phoneHash: blindIndex(normalizedPhone) }).select('+phoneHash +passwordHash');
    if (!user) {
      return NextResponse.json({ message: 'No account found for this phone number.' }, { status: 404 });
    }

    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ message: 'Incorrect phone number or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: safeUser(user) });
    setSessionCookie(response, user._id);
    return response;
  } catch {
    return NextResponse.json({ message: 'Unable to log in right now.' }, { status: 500 });
  }
}