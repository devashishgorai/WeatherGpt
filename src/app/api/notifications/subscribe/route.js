import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getSessionUserId } from '@/lib/auth';
import NotificationSubscription from '@/models/NotificationSubscription';

function validNumber(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export async function POST(request) {
  try {
    const userId = getSessionUserId();
    if (!userId) return NextResponse.json({ message: 'Please log in first.' }, { status: 401 });

    const body = await request.json();
    const subscription = body.subscription || {};
    const location = body.location || {};
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ message: 'Invalid push subscription.' }, { status: 400 });
    }
    if (!validNumber(location.latitude, -90, 90) || !validNumber(location.longitude, -180, 180)) {
      return NextResponse.json({ message: 'A valid weather location is required.' }, { status: 400 });
    }

    await connectDB();
    await NotificationSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId,
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: String(location.city || 'your area').slice(0, 120),
          country: String(location.country || '').slice(0, 80),
        },
        timezone: typeof body.timezone === 'string' && body.timezone ? body.timezone : 'Asia/Kolkata',
        dailyWeatherEnabled: body.preferences?.dailyWeatherEnabled !== false,
        heavyRainEnabled: body.preferences?.heavyRainEnabled !== false,
        severeWeatherEnabled: body.preferences?.severeWeatherEnabled !== false,
        active: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification subscription failed:', error);
    return NextResponse.json({ message: 'Unable to save notification settings.' }, { status: 500 });
  }
}