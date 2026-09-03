import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { sendVerificationCode } from '@/lib/twilioVerify';
import { blindIndex } from '@/lib/privateData';

export async function POST(request) {
  try {
    const { phone } = await request.json();
    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ message: 'Please provide a valid phone number.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ phoneHash: blindIndex(normalizedPhone) }).select('+phoneHash');
    if (!user) return NextResponse.json({ message: 'No account found for this phone number.' }, { status: 404 });

    await sendVerificationCode(normalizedPhone);
    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
  } catch {
    return NextResponse.json({ message: 'Unable to send OTP right now.' }, { status: 500 });
  }
}