import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getSessionUserId } from '@/lib/auth';
import NotificationSubscription from '@/models/NotificationSubscription';
import { configureWebPush, isExpiredPushError } from '@/lib/notificationWeather';

export async function POST() {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ message: 'Please log in first.' }, { status: 401 });
    await connectDB();
    const subscription = await NotificationSubscription.findOne({ userId, active: true });
    if (!subscription) return NextResponse.json({ message: 'Enable notifications on this device first.' }, { status: 404 });

    await configureWebPush().sendNotification(subscription.toObject(), JSON.stringify({
      title: 'WeatherGPT Notifications',
      body: 'Notifications are enabled. Tap to view your weather.',
      icon: '/icons/weatherGPT logo.png',
      badge: '/icons/weatherGPT logo.png',
      tag: 'weathergpt-test',
      data: { url: '/' },
      actions: [{ action: 'view-weather', title: 'View Weather' }, { action: 'dismiss', title: 'Dismiss' }],
    }));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      try {
        const userId = getSessionUserId();
        await NotificationSubscription.updateMany({ userId }, { $set: { active: false } });
      } catch {}
    }
    return NextResponse.json({ message: isExpiredPushError(error) ? 'This device subscription expired. Please enable notifications again.' : 'Unable to send the test notification.' }, { status: 500 });
  }
}