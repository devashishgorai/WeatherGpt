import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { decryptPrivateData } from '@/lib/privateData';
import { sendAdminEmail } from '@/lib/mailer';

export async function POST(request) {
  if (!process.env.ADMIN_API_KEY || request.headers.get('authorization') !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { userId, to, subject, text, html } = await request.json();
    let recipient = typeof to === 'string' ? to.trim().toLowerCase() : '';

    if (userId) {
      await connectDB();
      const user = await User.findById(userId).select('emailEncrypted');
      if (!user?.emailEncrypted) return NextResponse.json({ message: 'That user does not have an email address.' }, { status: 400 });
      recipient = decryptPrivateData(user.emailEncrypted);
    }

    if (!recipient || !subject || (!text && !html)) {
      return NextResponse.json({ message: 'Provide a recipient, subject, and message.' }, { status: 400 });
    }

    await sendAdminEmail({ to: recipient, subject, text, html });
    return NextResponse.json({ success: true, message: 'Email sent.' });
  } catch (error) {
    console.error('Admin email failed:', error?.message || error);
    return NextResponse.json({ message: 'Unable to send email. Check the SMTP settings.' }, { status: 500 });
  }
}