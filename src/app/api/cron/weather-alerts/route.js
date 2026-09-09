import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NotificationSubscription from '@/models/NotificationSubscription';
import WeatherAlertHistory from '@/models/WeatherAlertHistory';
import {
  buildDailyPayload,
  buildHeavyRainPayload,
  configureWebPush,
  fetchNotificationForecast,
  findHeavyRainEvent,
  getAlertConfig,
  isExpiredPushError,
} from '@/lib/notificationWeather';

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  return secret && request.headers.get('authorization') === `Bearer ${secret}`;
}

function localParts(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

async function send(subscription, payload) {
  try {
    await configureWebPush().sendNotification(subscription.toObject(), JSON.stringify(payload));
    return true;
  } catch (error) {
    if (isExpiredPushError(error)) await NotificationSubscription.updateOne({ _id: subscription._id }, { $set: { active: false } });
    else console.error('Notification delivery failed:', error);
    return false;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    await connectDB();
    const subscriptions = await NotificationSubscription.find({ active: true }).lean();
    const now = new Date();
    const config = getAlertConfig();
    let processed = 0;
    for (const subscription of subscriptions) {
      try {
        const timezone = subscription.timezone || 'Asia/Kolkata';
        const forecast = await fetchNotificationForecast(subscription.location, timezone);
        const heavyRain = findHeavyRainEvent(forecast.hours, now);
        const local = localParts(timezone, now);
        const locationKey = `${subscription.location.latitude.toFixed(3)},${subscription.location.longitude.toFixed(3)}`;

        if (subscription.dailyWeatherEnabled && local.hour === '07' && subscription.lastDailyLocalDate !== `${local.year}-${local.month}-${local.day}`) {
          const sent = await send(subscription, buildDailyPayload(subscription.location, forecast.daily || {}, heavyRain, timezone));
          if (sent) {
            await NotificationSubscription.updateOne({ _id: subscription._id }, { $set: { lastDailyLocalDate: `${local.year}-${local.month}-${local.day}` } });
            if (heavyRain) {
              await WeatherAlertHistory.create({ subscriptionId: subscription._id, eventId: heavyRain.eventId, kind: 'heavy-rain', severityAmountMm: heavyRain.amountMm, locationKey, eventEnd: heavyRain.end });
            }
          }
        }

        if (subscription.heavyRainEnabled && heavyRain) {
          const existing = await WeatherAlertHistory.findOne({ subscriptionId: subscription._id, kind: 'heavy-rain', locationKey }).sort({ sentAt: -1 });
          const cooldownActive = existing && now.getTime() - existing.sentAt.getTime() < config.cooldownHours * 60 * 60 * 1000;
          const eventAlreadySent = existing?.eventId === heavyRain.eventId;
          const significantlyWorse = existing && heavyRain.amountMm >= existing.severityAmountMm * 1.5;
          if (!eventAlreadySent && (!cooldownActive || significantlyWorse)) {
            const sent = await send(subscription, buildHeavyRainPayload(subscription.location, heavyRain, timezone));
            if (sent) await WeatherAlertHistory.create({ subscriptionId: subscription._id, eventId: heavyRain.eventId, kind: 'heavy-rain', severityAmountMm: heavyRain.amountMm, locationKey, eventEnd: heavyRain.end });
          }
        }
        processed += 1;
      } catch (error) {
        console.error(`Weather notification check failed for ${subscription._id}:`, error);
      }
    }
    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error('Weather alert cron failed:', error);
    return NextResponse.json({ message: 'Weather alert job failed.' }, { status: 500 });
  }
}