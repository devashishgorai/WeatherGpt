import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { checkVerificationCode } from '@/lib/twilioVerify';
import { blindIndex } from '@/lib/privateData';

export async function POST(request) {
  try {
    const { phone, otp, password } = await request.json();
    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ message: 'Please provide a valid phone number.' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(String(otp || ''))) {
      return NextResponse.json({ message: 'OTP must be 6 digits.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ phoneHash: blindIndex(normalizedPhone) }).select('+phoneHash');
    if (!user) {
      return NextResponse.json({ message: 'No account found for this phone number.' }, { status: 404 });
    }

    const verification = await checkVerificationCode(normalizedPhone, String(otp));
    if (verification?.status !== 'approved') {
      return NextResponse.json({ message: 'Invalid or expired OTP.' }, { status: 401 });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch {
    return NextResponse.json({ message: 'Unable to reset your password right now.' }, { status: 500 });
  }
}