import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getSessionUserId } from '@/lib/auth';
import NotificationSubscription from '@/models/NotificationSubscription';

export async function POST(request) {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ message: 'Please log in first.' }, { status: 401 });
    const { endpoint } = await request.json();
    if (!endpoint || typeof endpoint !== 'string') return NextResponse.json({ message: 'Invalid endpoint.' }, { status: 400 });
    await connectDB();
    await NotificationSubscription.updateOne({ userId, endpoint }, { $set: { active: false } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: 'Unable to disable notifications.' }, { status: 500 });
  }
}