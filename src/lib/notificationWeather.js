import webpush from 'web-push';

const DEFAULT_THRESHOLD_MM = 20;
const DEFAULT_PROBABILITY = 70;
const DEFAULT_LOOKAHEAD_HOURS = 12;
const DEFAULT_COOLDOWN_HOURS = 6;

function numberFrom(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAlertConfig() {
  return {
    thresholdMm: numberFrom(process.env.HEAVY_RAIN_THRESHOLD_MM, DEFAULT_THRESHOLD_MM),
    probability: numberFrom(process.env.HEAVY_RAIN_PROBABILITY, DEFAULT_PROBABILITY),
    lookaheadHours: Math.max(1, numberFrom(process.env.RAIN_ALERT_LOOKAHEAD_HOURS, DEFAULT_LOOKAHEAD_HOURS)),
    cooldownHours: Math.max(1, numberFrom(process.env.RAIN_ALERT_COOLDOWN_HOURS, DEFAULT_COOLDOWN_HOURS)),
  };
}

function googleHourToForecast(hour) {
  const amount = numberFrom(
    hour.precipitation?.qpf?.millimeters
      ?? hour.precipitation?.amount?.millimeters
      ?? hour.precipitationAmount?.millimeters
      ?? hour.precipitationAmount,
  );
  return {
    time: hour.displayDateTime || hour.forecastTime || hour.time || new Date().toISOString(),
    probability: numberFrom(hour.precipitation?.probability?.percentage ?? hour.precipitationProbability),
    amountMm: amount,
    condition: hour.weatherCondition?.description || hour.condition?.description || 'Rain',
  };
}

function openMeteoHours(data) {
  const hourly = data.hourly;
  if (!hourly?.time) return [];
  return hourly.time.map((time, index) => ({
    time,
    probability: numberFrom(hourly.precipitation_probability?.[index]),
    amountMm: numberFrom(hourly.precipitation?.[index]),
    condition: 'Rain',
  }));
}

function openMeteoDaily(data) {
  const daily = data.daily;
  if (!daily?.time?.length) return null;
  return {
    maxTemp: daily.temperature_2m_max?.[0],
    minTemp: daily.temperature_2m_min?.[0],
    probability: daily.precipitation_probability_max?.[0] ?? 0,
  };
}

function googleDaily(data) {
  const day = (data.forecastDays || data.days || [])[0];
  if (!day) return null;
  return {
    maxTemp: day.maxTemperature?.degrees ?? day.daytimeForecast?.temperature?.degrees ?? day.temperature?.max,
    minTemp: day.minTemperature?.degrees ?? day.overnightForecast?.temperature?.degrees ?? day.temperature?.min,
    probability: day.precipitation?.probability?.percentage
      ?? day.daytimeForecast?.precipitation?.probability?.percentage
      ?? day.precipitationProbability
      ?? 0,
  };
}

async function fetchOpenMeteoForecast(latitude, longitude, timezone) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'precipitation,precipitation_probability,weathercode',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: timezone || 'auto',
    forecast_days: '2',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  return response.json();
}

async function fetchGoogleForecast(latitude, longitude) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!key) throw new Error('Google Weather API key is not configured.');
  const response = await fetch(`https://weather.googleapis.com/v1/forecast/hours:lookup?key=${key}&hours=24`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude, longitude } }),
  });
  if (!response.ok) throw new Error(`Google hourly forecast HTTP ${response.status}`);
  return response.json();
}

async function fetchGoogleDaily(latitude, longitude) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!key) throw new Error('Google Weather API key is not configured.');
  const response = await fetch(`https://weather.googleapis.com/v1/forecast/days:lookup?key=${key}&days=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude, longitude } }),
  });
  if (!response.ok) throw new Error(`Google daily forecast HTTP ${response.status}`);
  return response.json();
}

export async function fetchNotificationForecast(location, timezone) {
  try {
    const googleData = await fetchGoogleForecast(location.latitude, location.longitude);
    const hours = (googleData.forecastHours || googleData.hours || []).map(googleHourToForecast);
    if (hours.some((hour) => hour.amountMm > 0)) {
      let daily = null;
      try {
        daily = googleDaily(await fetchGoogleDaily(location.latitude, location.longitude));
      } catch (error) {
        console.warn('Google daily notification forecast unavailable:', error.message);
      }
      return { hours, daily, officialAlerts: [] };
    }
  } catch (error) {
    console.warn('Google notification forecast unavailable:', error.message);
  }

  const openMeteoData = await fetchOpenMeteoForecast(location.latitude, location.longitude, timezone);
  return { hours: openMeteoHours(openMeteoData), daily: openMeteoDaily(openMeteoData), officialAlerts: [] };
}

export function findHeavyRainEvent(hours, now = new Date()) {
  const config = getAlertConfig();
  const end = new Date(now.getTime() + config.lookaheadHours * 60 * 60 * 1000);
  const upcoming = hours.filter((hour) => {
    const time = new Date(hour.time);
    return time >= now && time <= end;
  });
  const qualifying = upcoming.filter((hour) => (
    hour.amountMm >= config.thresholdMm
    || (hour.probability >= config.probability && hour.amountMm >= config.thresholdMm / 2)
  ));
  if (!qualifying.length) return null;

  const first = qualifying[0];
  const last = qualifying[qualifying.length - 1];
  const amountMm = Math.max(...qualifying.map((hour) => hour.amountMm));
  const eventId = `${new Date(first.time).toISOString().slice(0, 13)}-${new Date(last.time).toISOString().slice(0, 13)}`;
  return {
    eventId,
    start: new Date(first.time),
    end: new Date(last.time),
    probability: Math.max(...qualifying.map((hour) => hour.probability)),
    amountMm,
  };
}

export function formatLocalTime(date, timezone) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(date);
}

export function buildHeavyRainPayload(location, event, timezone) {
  return {
    title: 'Heavy Rain Alert - WeatherGPT',
    body: `Heavy rain is expected in ${location.city || 'your area'} between ${formatLocalTime(event.start, timezone)}-${formatLocalTime(event.end, timezone)}. Rain probability: ${Math.round(event.probability)}%. Expected rainfall: ${Math.round(event.amountMm)} mm.`,
    icon: '/icons/weatherGPT logo.png',
    badge: '/icons/weatherGPT logo.png',
    tag: `weathergpt-heavy-rain-${event.eventId}`,
    data: { url: '/', type: 'heavy-rain', eventId: event.eventId },
    actions: [{ action: 'view-weather', title: 'View Weather' }, { action: 'dismiss', title: 'Dismiss' }],
  };
}

export function buildDailyPayload(location, daily, heavyRain, timezone) {
  const max = Math.round(daily.maxTemp ?? 0);
  const min = Math.round(daily.minTemp ?? 0);
  const heavyText = heavyRain
    ? ` Heavy rain possible after ${formatLocalTime(heavyRain.start, timezone)}.`
    : '';
  return {
    title: 'Good Morning - WeatherGPT',
    body: `${location.city || 'Your area'} today: ${min}C-${max}C. Rain: ${Math.round(daily.probability || 0)}%.${heavyText}`,
    icon: '/icons/weatherGPT logo.png',
    badge: '/icons/weatherGPT logo.png',
    tag: `weathergpt-daily-${location.city || 'weather'}`,
    data: { url: '/', type: 'daily-weather' },
    actions: [{ action: 'view-weather', title: 'View Weather' }, { action: 'dismiss', title: 'Dismiss' }],
  };
}

export function configureWebPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are required.');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

export function isExpiredPushError(error) {
  return error?.statusCode === 404 || error?.statusCode === 410 || error?.statusCode === 403;
}