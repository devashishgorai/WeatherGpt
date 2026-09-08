import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { sendVerificationCode } from '@/lib/twilioVerify';
import { blindIndex, decryptPrivateData } from '@/lib/privateData';
import { issueOtp } from '@/lib/otp';
import { sendPasswordResetOtp } from '@/lib/mailer';

export async function POST(request) {
  try {
    const { phone, email, channel = 'phone' } = await request.json();
    if (channel === 'email') {
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return NextResponse.json({ message: 'Please provide a valid email address.' }, { status: 400 });
      }

      await connectDB();
      const user = await User.findOne({ emailHash: blindIndex(normalizedEmail) }).select('+emailHash +emailEncrypted');
      if (!user) return NextResponse.json({ message: 'No account found for this email address.' }, { status: 404 });

      const otp = issueOtp(normalizedEmail);
      await sendPasswordResetOtp({ to: decryptPrivateData(user.emailEncrypted), otp });
      return NextResponse.json({ success: true, message: 'OTP sent to your email.' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ message: 'Please provide a valid phone number.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ phoneHash: blindIndex(normalizedPhone) }).select('+phoneHash');
    if (!user) return NextResponse.json({ message: 'No account found for this phone number.' }, { status: 404 });

    await sendVerificationCode(normalizedPhone);
    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    if (error?.message?.includes('EMAIL_USER and EMAIL_PASS')) {
      return NextResponse.json(
        { message: 'Email OTP is not configured. Add a Gmail address and App Password to EMAIL_USER and EMAIL_PASS.' },
        { status: 503 }
      );
    }
    if (error?.code === 60200 || error?.code === 60203) {
      return NextResponse.json({ message: 'Twilio rejected this phone number. Check the country code and confirm the number can receive SMS.' }, { status: 400 });
    }
    if (error?.code === 60202) {
      return NextResponse.json({ message: 'This phone number is not verified for the current Twilio trial account. Verify it in Twilio Console or upgrade the account.' }, { status: 403 });
    }
    if (error?.code === 20404 || error?.code === 20003) {
      return NextResponse.json({ message: 'Twilio configuration is invalid. Check the Verify Service SID and Twilio credentials.' }, { status: 503 });
    }
    console.error('OTP delivery failed:', { code: error?.code || null, status: error?.status || null, message: error?.message || 'Unknown error' });
    return NextResponse.json({ message: 'Unable to send OTP right now. Check the phone number and Twilio SMS settings.' }, { status: 500 });
  }
}