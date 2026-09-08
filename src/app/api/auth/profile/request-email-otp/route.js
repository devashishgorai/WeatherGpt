import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getSessionUserId } from '@/lib/auth';
import { blindIndex } from '@/lib/privateData';
import { issueOtp } from '@/lib/otp';
import { sendEmailVerificationOtp } from '@/lib/mailer';

export async function POST(request) {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ message: 'Please log in first.' }, { status: 401 });

    const { email } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ message: 'Please provide a valid email address.' }, { status: 400 });
    }

    await connectDB();
    const existingEmail = await User.findOne({ emailHash: blindIndex(normalizedEmail), _id: { $ne: userId } }).select('+emailHash');
    if (existingEmail) {
      return NextResponse.json({ message: 'An account with this email address already exists.' }, { status: 409 });
    }

    const otp = issueOtp(normalizedEmail);
    await sendEmailVerificationOtp({ to: normalizedEmail, otp });
    return NextResponse.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    if (error?.message?.includes('EMAIL_USER and EMAIL_PASS')) {
      return NextResponse.json({ message: 'Email verification is not configured. Add EMAIL_USER and EMAIL_PASS.' }, { status: 503 });
    }
    return NextResponse.json({ message: 'Unable to send email verification code right now.' }, { status: 500 });
  }
}