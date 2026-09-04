import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { setSessionCookie } from '@/lib/auth';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { checkVerificationCode } from '@/lib/twilioVerify';
import { blindIndex, decryptPrivateData } from '@/lib/privateData';

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

export async function POST(request) {
  try {
    const { phone, otp } = await request.json();
    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ message: 'Please provide a valid phone number.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ phoneHash: blindIndex(normalizedPhone) }).select('+phoneHash');
    if (!user) {
      return NextResponse.json({ message: 'No account found for this phone number.' }, { status: 404 });
    }

    if (otp) {
      if (!/^\d{6}$/.test(String(otp))) {
        return NextResponse.json({ message: 'OTP must be 6 digits.' }, { status: 400 });
      }
      const verification = await checkVerificationCode(normalizedPhone, String(otp));
      if (verification?.status !== 'approved') {
        return NextResponse.json({ message: 'Invalid or expired OTP.' }, { status: 401 });
      }
    }

    const response = NextResponse.json({ success: true, user: safeUser(user) });
    setSessionCookie(response, user._id);
    return response;
  } catch {
    return NextResponse.json({ message: 'Unable to log in right now.' }, { status: 500 });
  }
}