import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getSessionUserId } from '@/lib/auth';
import { decryptPrivateData } from '@/lib/privateData';

export async function GET() {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ user: null });

    await connectDB();
    const user = await User.findById(userId).select('nameEncrypted phoneEncrypted emailEncrypted category customCategory profileImage +passwordHash');
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: String(user._id),
        name: decryptPrivateData(user.nameEncrypted),
        phone: decryptPrivateData(user.phoneEncrypted),
        email: user.emailEncrypted ? decryptPrivateData(user.emailEncrypted) : '',
        category: user.category,
        customCategory: user.customCategory,
        profileImage: user.profileImage || '',
        hasPassword: Boolean(user.passwordHash),
      }
    });
  } catch {
    return NextResponse.json({ message: 'Unable to load account.' }, { status: 500 });
  }
}