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
    const user = await User.findById(userId).select('nameEncrypted phoneEncrypted category customCategory profileImage');
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: String(user._id),
        name: decryptPrivateData(user.nameEncrypted),
        phone: decryptPrivateData(user.phoneEncrypted),
        category: user.category,
        customCategory: user.customCategory,
        profileImage: user.profileImage || '',
      }
    });
  } catch {
    return NextResponse.json({ message: 'Unable to load account.' }, { status: 500 });
  }
}