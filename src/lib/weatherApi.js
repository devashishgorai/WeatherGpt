import { CONFIG } from './config.js';
import { WMO_WEATHER_TABLE, LANG_CODES } from './constants.js';

/* ===== HELPER FUNCTIONS ===== */
export function getWmoData(code) {
  return WMO_WEATHER_TABLE[code] || { desc: 'Variable weather', emoji: '🌤️' };
}

export function logWeatherCoordinates(latitude, longitude) {
  console.log('Weather API coordinates:', { latitude, longitude });
}

export function getWeatherEmoji(description) {
  if (!description) return '🌤️';
  const d = description.toLowerCase();
  if (d.includes('thunder') || d.includes('storm') || d.includes('lightning')) return '⛈️';
  if (d.includes('heavy rain') || d.includes('downpour') || d.includes('torrential')) return '🌧️';
  if (d.includes('rain') || d.includes('shower') || d.includes('drizzle')) return '🌦️';
  if (d.includes('snow') || d.includes('sleet') || d.includes('blizzard')) return '🌨️';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze') || d.includes('smoke')) return '🌫️';
  if (d.includes('overcast') || d.includes('cloud')) return '☁️';
  if (d.includes('partly')) return '⛅';
  if (d.includes('clear') || d.includes('sunny') || d.includes('fair')) return '☀️';
  return '🌤️';
}

export function getBackgroundTintClass(condition, isDaytime) {
  if (!condition) return 'clear';
  const c = condition.toLowerCase();
  if (!isDaytime) return 'night';
  if (c.includes('storm') || c.includes('thunder') || c.includes('cyclone')) return 'stormy';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'rainy';
  if (c.includes('clear') || c.includes('sunny') || c.includes('fair')) return 'sunny';
  return 'clear';
}

export function formatClockTime(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  } catch {
    return '--:--';
  }
}

export function formatHourLabel(isoString) {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' });
  } catch {
    return '--';
  }
}

export function formatDayLabel(isoString, index, lang) {
  if (index === 0) {
    if (lang === 'hindi') return 'आज';
    if (lang === 'bengali') return 'আজ';
    if (lang === 'tamil') return 'இன்று';
    if (lang === 'telugu') return 'నేడు';
    if (lang === 'marathi') return 'आज';
    return 'Today';
  }
  if (index === 1) {
    if (lang === 'hindi') return 'कल';
    if (lang === 'bengali') return 'আগামীকাল';
    if (lang === 'tamil') return 'நாளை';
    if (lang === 'telugu') return 'రేపు';
    if (lang === 'marathi') return 'उद्या';
    return 'Tomorrow';
  }
  try {
    const d = new Date(isoString);
    const locale = LANG_CODES[lang] || 'en-IN';
    return d.toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return `Day ${index + 1}`;
  }
}

export function getElapsedTimeLabel(date, lang) {
  if (!date) return '';
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) {
    if (lang === 'hindi') return 'अभी-अभी';
    if (lang === 'bengali') return 'এইমাত্র';
    if (lang === 'tamil') return 'சற்று முன்';
    if (lang === 'telugu') return 'ఇప్పుడే';
    if (lang === 'marathi') return 'आत्ताच';
    return 'Just now';
  }
  if (lang === 'hindi') return `${mins} मिनट पहले`;
  if (lang === 'bengali') return `${mins} মিনিট আগে`;
  if (lang === 'tamil') return `${mins} நிமிடங்களுக்கு முன்`;
  if (lang === 'telugu') return `${mins} నిమిషాల క్రితం`;
  if (lang === 'marathi') return `${mins} मिनिटांपूर्वी`;
  return `${mins}m ago`;
}

export function degreesToCardinal(deg) {
  if (deg === undefined || deg === null) return 'N/A';
  const cardinals = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return cardinals[Math.round(deg / 22.5) % 16];
}

/* ===== GOOGLE WEATHER APIS ===== */
export async function fetchGoogleCurrentWeather(lat, lng) {
  const res = await fetch(`https://weather.googleapis.com/v1/currentConditions:lookup?key=${CONFIG.GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude: lat, longitude: lng } })
  });
  if (!res.ok) throw new Error(`Google Current Weather HTTP ${res.status}`);
  return await res.json();
}

export async function fetchGoogleHourlyForecast(lat, lng) {
  const res = await fetch(`https://weather.googleapis.com/v1/forecast/hours:lookup?key=${CONFIG.GOOGLE_API_KEY}&hours=24`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude: lat, longitude: lng } })
  });
  if (!res.ok) throw new Error(`Google Hourly Forecast HTTP ${res.status}`);
  return await res.json();
}

export async function fetchGoogleDailyForecast(lat, lng) {
  const res = await fetch(`https://weather.googleapis.com/v1/forecast/days:lookup?key=${CONFIG.GOOGLE_API_KEY}&days=7`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude: lat, longitude: lng } })
  });
  if (!res.ok) throw new Error(`Google Daily Forecast HTTP ${res.status}`);
  return await res.json();
}

export async function fetchGoogleWeatherAlerts(lat, lng) {
  try {
    const res = await fetch(`https://weather.googleapis.com/v1/weatherAlerts:lookup?key=${CONFIG.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: { latitude: lat, longitude: lng } })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.weatherAlerts || data.alerts || [];
  } catch {
    return [];
  }
}

/* ===== OPEN-METEO FALLBACK API ===== */
export async function fetchOpenMeteoData(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,precipitation,apparent_temperature,uv_index,visibility,wind_direction_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,wind_speed_10m,weathercode',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,precipitation_probability_max,windspeed_10m_max,sunrise,sunset',
    timezone: 'Asia/Kolkata',
    forecast_days: '7'
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  return await res.json();
}

/* ===== NORMALIZERS ===== */
export function normalizeGoogleWeather(current, cityName, alerts) {
  const cond = current.weatherCondition?.description || current.condition?.description || 'Clear';
  return {
    city: cityName,
    temp: Math.round(current.temperature?.degrees ?? current.temperature ?? 28),
    feelsLike: Math.round(current.feelsLikeTemperature?.degrees ?? current.feelsLikeTemperature ?? current.temperature?.degrees ?? 28),
    humidity: current.relativeHumidity ?? current.humidity ?? 50,
    windSpeed: Math.round(current.windSpeed?.value ?? current.wind?.speed?.value ?? 10),
    windDirection: current.windDirection?.cardinal ?? current.wind?.direction?.cardinal ?? 'N/A',
    condition: cond,
    iconBaseUri: current.weatherCondition?.iconBaseUri || '',
    uvIndex: current.uvIndex ?? 5,
    visibility: Math.round((current.visibility?.value ?? current.visibility ?? 10000) / 1000),
    isDaytime: current.isDaytime ?? true,
    alerts: alerts || [],
    source: 'google'
  };
}

export function normalizeGoogleHourly(hourlyData) {
  const list = hourlyData.forecastHours || hourlyData.hours || [];
  return list.slice(0, 24).map(h => ({
    time: h.displayDateTime || h.forecastTime || h.time || new Date().toISOString(),
    temp: Math.round(h.temperature?.degrees ?? h.temperature ?? 0),
    condition: h.weatherCondition?.description || 'Clear',
    precipProb: h.precipitation?.probability?.percentage ?? h.precipitationProbability ?? 0,
    windSpeed: Math.round(h.windSpeed?.value ?? h.wind?.speed?.value ?? 0)
  }));
}

export function normalizeGoogleDaily(dailyData) {
  const list = dailyData.forecastDays || dailyData.days || [];
  return list.slice(0, 7).map((d, i) => ({
    date: d.displayDate || d.forecastDate || d.date || new Date().toISOString(),
    maxTemp: Math.round(d.maxTemperature?.degrees ?? d.daytimeForecast?.temperature?.degrees ?? d.temperature?.max ?? 32),
    minTemp: Math.round(d.minTemperature?.degrees ?? d.overnightForecast?.temperature?.degrees ?? d.temperature?.min ?? 22),
    condition: d.weatherCondition?.description ?? d.daytimeForecast?.weatherCondition?.description ?? 'Clear',
    precipProb: d.precipitation?.probability?.percentage ?? d.daytimeForecast?.precipitation?.probability?.percentage ?? d.precipitationProbability ?? 0,
    precipAmount: d.precipitation?.qpf?.millimeters ?? 0,
    maxWindSpeed: Math.round(d.maxWindSpeed?.value ?? d.wind?.max?.speed?.value ?? 15),
    sunriseTime: d.sunriseTime ?? d.sunrise ?? '',
    sunsetTime: d.sunsetTime ?? d.sunset ?? '',
    index: i
  }));
}

export function normalizeOpenMeteoWeather(data, cityName) {
  const c = data.current;
  const wmo = getWmoData(c.weathercode);
  return {
    city: cityName,
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    windDirection: degreesToCardinal(c.wind_direction_10m),
    condition: wmo.desc,
    iconBaseUri: '',
    uvIndex: c.uv_index ?? 5,
    visibility: Math.round((c.visibility ?? 10000) / 1000),
    isDaytime: c.is_day === 1,
    alerts: [],
    source: 'open-meteo'
  };
}

export function normalizeOpenMeteoHourly(data) {
  const h = data.hourly;
  if (!h || !h.time) return [];
  return h.time.slice(0, 24).map((t, i) => ({
    time: t,
    temp: Math.round(h.temperature_2m[i]),
    condition: getWmoData(h.weathercode[i]).desc,
    precipProb: h.precipitation_probability?.[i] ?? 0,
    windSpeed: Math.round(h.wind_speed_10m[i])
  }));
}

export function normalizeOpenMeteoDaily(data) {
  const d = data.daily;
  if (!d || !d.time) return [];
  return d.time.map((t, i) => ({
    date: t,
    maxTemp: Math.round(d.temperature_2m_max[i]),
    minTemp: Math.round(d.temperature_2m_min[i]),
    condition: getWmoData(d.weathercode[i]).desc,
    precipProb: d.precipitation_probability_max?.[i] ?? 0,
    precipAmount: d.precipitation_sum?.[i] ?? 0,
    maxWindSpeed: Math.round(d.windspeed_10m_max?.[i] ?? 0),
    sunriseTime: d.sunrise?.[i] ?? '',
    sunsetTime: d.sunset?.[i] ?? '',
    index: i
  }));
}

/* ===== ALERT EVALUATOR ===== */
export function evaluateAlertStatus(weather, googleAlerts, forecast, lang) {
  const isHi = lang === 'hindi';
  const isBn = lang === 'bengali';
  const isTa = lang === 'tamil';
  const isTe = lang === 'telugu';
  const isMr = lang === 'marathi';

  if (googleAlerts && googleAlerts.length > 0) {
    const top = googleAlerts[0];
    const s = (top.severity || '').toLowerCase();
    const safeZone = 'Move immediately to the nearest elevated safe shelter or community center. Carry minimum essentials: bottled water, ORS, basic medicines, biscuits, and dry food.';
    if (s.includes('extreme') || s.includes('severe')) {
      return { level: 'red', text: `🚨 EMERGENCY ALERT: ${top.headline || top.description}`, safeZone };
    }
    if (s.includes('moderate')) {
      return { level: 'orange', text: `🔶 Weather Warning: ${top.headline || top.description}`, safeZone: 'Shift to the nearest safer location on higher ground or a designated shelter and keep emergency food and medicines ready.' };
    }
    return { level: 'yellow', text: `⚠️ Weather Watch: ${top.headline || top.description}`, safeZone: 'Stay alert and keep your emergency kit close to hand.' };
  }

  if (!weather) return null;

  const cond = (weather.condition || '').toLowerCase();
  const maxPrecip = forecast?.daily?.[0]?.precipProb ?? 0;

  if (cond.includes('storm') || cond.includes('cyclone') || cond.includes('thunder')) {
    let alertMsg = `🚨 EMERGENCY ALERT: ${weather.condition} in ${weather.city}. Take shelter.`;
    let safeZone = 'Move to the nearest safe shelter or elevated high ground immediately. Take essential food and medicines such as bottled water, ORS, biscuits, dry fruits, and any prescribed medication.';
    if (isHi) {
      alertMsg = `🚨 आपातकालीन चेतावनी: ${weather.city} में ${weather.condition} का प्रभाव। सुरक्षित स्थान पर रहें।`;
      safeZone = 'तुरंत निकटतम सुरक्षित आश्रय या ऊंचे स्थल पर जाएं। साथ में बोतलबंद पानी, ORS, बिस्कुट, सूखे मेवे और आवश्यक दवाइयां रखें।';
    }
    if (isBn) {
      alertMsg = `🚨 জরুরি সতর্কতা: ${weather.city}-এ ${weather.condition}। নিরাপদ আশ্রয়ে থাকুন।`;
      safeZone = 'তাৎক্ষণিকভাবে নিকটতম নিরাপদ আশ্রয় বা উঁচু স্থানে যান। সঙ্গে রাখুন বোতলজাত পানি, ORS, বিস্কুট, শুকনো ফল, ও প্রয়োজনীয় ওষুধ।';
    }
    if (isTa) {
      alertMsg = `🚨 அவசர எச்சரிக்கை: ${weather.city} பகுதியில் ${weather.condition} நிலவுகிறது. பாதுகாப்பாக இருக்கவும்.`;
      safeZone = 'உடனடியாக அருகிலுள்ள பாதுகாப்பான தங்குமிடம் அல்லது உயரமான இடத்துக்குச் செல்லவும். குடிநீர், ORS, பிஸ்கட், உலர்ந்த பழங்கள் மற்றும் அத்தியாவசிய மருந்துகளை எடுத்துச் செல்லவும்.';
    }
    if (isTe) {
      alertMsg = `🚨 అత్యవసర హెచ్చరిక: ${weather.city} లో ${weather.condition} ప్రభావం. సురక్షిత ప్రదేశంలో ఉండండి.`;
      safeZone = 'వెంటనే దగ్గర్లో ఉన్న సురక్షిత ఆశ్రయం లేదా ఎత్తైన ప్రదేశానికి వెళ్లండి. బొటనవేపు నీరు, ORS, బిస్కెట్లు, పొడిగా చేసే పండ్లు, మరియు అవసరమైన మందులు తీసుకెళ్లండి.';
    }
    if (isMr) {
      alertMsg = `🚨 आणीबाणी इशारा: ${weather.city} मध्ये ${weather.condition} ची शक्यता. सुरक्षित राहा.`;
      safeZone = 'तुरळकपणे जवळच्या सुरक्षित आश्रय किंवा उंच ठिकाणी जा. सोबत बोतलबंद पाणी, ORS, बिस्किट, ड्राय फ्रूट्स आणि आवश्यक औषधे ठेवा.';
    }
    return { level: 'red', text: alertMsg, safeZone };
  }
  if (weather.temp >= 42) {
    let alertMsg = `🚨 HEATWAVE ALERT: Temperature is ${weather.temp}°C in ${weather.city}. Avoid outdoor exposure.`;
    let safeZone = 'Move to a cooler, shaded indoor safe zone and keep minimal hydration supplies ready: ORS, bottled water, and essential medicines.';
    if (isHi) {
      alertMsg = `🚨 भीषण लू (हीटवेव) चेतावनी: ${weather.city} में तापमान ${weather.temp}°C है। धूप से बचें।`;
      safeZone = 'तुरंत ठंडे, छायादार सुरक्षित स्थान पर जाएं। साथ में ORS, बोतलबंद पानी और आवश्यक दवाइयां रखें।';
    }
    if (isBn) {
      alertMsg = `🚨 তীব্র তাপপ্রবাহ সতর্কতা: ${weather.city}-এ তাপমাত্রা ${weather.temp}°C। রোদ এড়িয়ে চলুন।`;
      safeZone = 'তাৎক্ষণিকভাবে শীতল, ছায়াযুক্ত নিরাপদ স্থানে যান। সঙ্গে ORS, বোতলজাত পানি ও প্রয়োজনীয় ওষুধ রাখুন।';
    }
    if (isTa) {
      alertMsg = `🚨 கடுமையான வெப்ப அலை எச்சரிக்கை: ${weather.city} வெப்ப நிலை ${weather.temp}°C. வெயிலில் செல்ல வேண்டாம்.`;
      safeZone = 'உடனடியாக குளிர்ந்த, நிழலான பாதுகாப்பான இடத்துக்குச் செல்லவும். ORS, குடிநீர், அத்தியாவசிய மருந்துகள் எடுத்துச் செல்லவும்.';
    }
    if (isTe) {
      alertMsg = `🚨 తీవ్ర వడగాల్పుల హెచ్చరిక: ${weather.city} లో ఉష్ణోగ్రత ${weather.temp}°C. ఎండలో తిరగవద్దు.`;
      safeZone = 'వెంటనే చల్లని, నీడలున్న సురక్షిత ప్రాంతానికి వెళ్లండి. ORS, బాటిల్ నీరు, మరియు అవసరమైన మందులు తీసుకెళ్లండి.';
    }
    if (isMr) {
      alertMsg = `🚨 तीव्र उष्णतेची लाट इशारा: ${weather.city} मध्ये तापमान ${weather.temp}°C आहे. उन्हात जाणे टाळा.`;
      safeZone = 'तुरळकपणे थंड, छायादार सुरक्षित ठिकाणी जा. सोबत ORS, बोतलबंद पाणी आणि आवश्यक औषधे ठेवा.';
    }
    return { level: 'red', text: alertMsg, safeZone };
  }
  if (weather.temp <= 5) {
    let alertMsg = `❄️ COLD WAVE WARNING: Temperature is ${weather.temp}°C in ${weather.city}. Stay warm.`;
    let safeZone = 'Move to a warmer indoor safe zone and keep warm clothing, medicines, and basic food ready.';
    if (isHi) {
      alertMsg = `❄️ शीत लहर चेतावनी: ${weather.city} में तापमान गिरकर ${weather.temp}°C हो गया है। गर्म कपड़े पहनें।`;
      safeZone = 'तुरंत गर्म सुरक्षित स्थान पर जाएं। गर्म कपड़े, आवश्यक दवाइयां और बेसिक खाना तैयार रखें।';
    }
    if (isBn) {
      alertMsg = `❄️ শৈত্যপ্রবাহের সতর্কতা: ${weather.city}-এ তাপমাত্রা কমে ${weather.temp}°C। গরম পোশাক পরুন।`;
      safeZone = 'তাৎক্ষণিকভাবে উষ্ণ নিরাপদ স্থানে যান। গরম পোশাক, প্রয়োজনীয় ওষুধ ও মৌলিক খাবার প্রস্তুত রাখুন।';
    }
    if (isTa) {
      alertMsg = `❄️ குளிர் அலை எச்சரிக்கை: ${weather.city} பகுதியில் வெப்பநிலை ${weather.temp}°C ஆக குறைந்துள்ளது.`;
      safeZone = 'உடனடியாக வெதுவெதுப்பான பாதுகாப்பான இடத்துக்குச் செல்லவும். சூடான உடைகள், மருந்துகள், மற்றும் அடிப்படை உணவுகளை தயார் நிலையில் வைக்கவும்.';
    }
    if (isTe) {
      alertMsg = `❄️ చలి గాలుల హెచ్చరిక: ${weather.city} లో ఉష్ణోగ్రత ${weather.temp}°C కి పడిపోయింది.`;
      safeZone = 'వెంటనే వెచ్చని సురక్షిత ప్రాంతానికి వెళ్లండి. వెచ్చని బట్టలు, మందులు, మరియు ప్రాథమిక ఆహారం సిద్ధంగా ఉంచండి.';
    }
    if (isMr) {
      alertMsg = `❄️ थंडीची लाट इशारा: ${weather.city} मध्ये तापमान ${weather.temp}°C पर्यंत खाली आले आहे.`;
      safeZone = 'तुरळकपणे उबदार सुरक्षित ठिकाणी जा. गरम कपडे, औषधे आणि मूलभूत अन्न तयार ठेवा.';
    }
    return { level: 'blue', text: alertMsg, safeZone };
  }
  if (weather.windSpeed > 40) {
    let alertMsg = `🔶 Weather Warning: High surface winds at ${weather.windSpeed} km/h in ${weather.city}.`;
    let safeZone = 'Move to a sturdy, safer indoor shelter and keep emergency food and medicines ready.';
    if (isHi) {
      alertMsg = `🔶 मौसम चेतावनी: ${weather.city} में ${weather.windSpeed} किमी/घंटा की गति से तेज हवाएं चल रही हैं।`;
      safeZone = 'तुरंत मजबूत और सुरक्षित भवन/आश्रय स्थल पर जाएं। साथ में आवश्यक भोजन और दवाइयां रखें।';
    }
    if (isBn) {
      alertMsg = `🔶 আবহাওয়া সতর্কতা: ${weather.city}-এ ${weather.windSpeed} কিমি/ঘণ্টা বেগে ঝোড়ো বাতাস বইছে।`;
      safeZone = 'তাৎক্ষণিকভাবে শক্তিশালী নিরাপদ ভবনে যান। জরুরি খাবার ও ওষুধ প্রস্তুত রাখুন।';
    }
    if (isTa) {
      alertMsg = `🔶 வானிலை எச்சரிக்கை: ${weather.city} பகுதியில் மணிக்கு ${weather.windSpeed} கி.மீ வேகத்தில் பலத்த காற்று வீசுகிறது.`;
      safeZone = 'உடனடியாக வலுவான பாதுகாப்பான இடத்துக்குச் செல்லவும். அவசர உணவு மற்றும் மருந்துகளை தயார் நிலையில் வைத்திருங்கள்.';
    }
    if (isTe) {
      alertMsg = `🔶 వాతావరణ హెచ్చరిక: ${weather.city} లో గంటకు ${weather.windSpeed} కి.మీ వేగంతో బలమైన ఈదురు గాలులు.`;
      safeZone = 'వెంటనే బలమైన, సురక్షితమైన ఇండోర్ ఆశ్రయానికి వెళ్లండి. అత్యవసర ఆహారం మరియు మందులు సిద్ధంగా ఉంచండి.';
    }
    if (isMr) {
      alertMsg = `🔶 हवामान इशारा: ${weather.city} मध्ये ताशी ${weather.windSpeed} किमी वेगाने जोरदार वारे वाहत आहेत.`;
      safeZone = 'तुरळकपणे मजबूत, सुरक्षित घर/आश्रयस्थळावर जा. आपत्कालीन अन्न आणि औषधे तयार ठेवा.';
    }
    return { level: 'orange', text: alertMsg, safeZone };
  }
  if (maxPrecip > 80 || weather.humidity > 85) {
    let alertMsg = `⚠️ Weather Watch: Heavy rain likely (${maxPrecip}% probability) in ${weather.city}.`;
    let safeZone = 'Move to nearby elevated safer ground or a designated shelter. Keep minimum food and medicines ready for quick relocation.';
    if (isHi) {
      alertMsg = `⚠️ मौसम निगरानी: ${weather.city} में भारी बारिश की संभावना (${maxPrecip}%) है।`;
      safeZone = 'निकटतम ऊंचे और सुरक्षित स्थल पर जाएं या आश्रय केंद्र में शिफ्ट हो जाएं। तुरंत जाने के लिए न्यूनतम खाना और दवाइयां तैयार रखें।';
    }
    if (isBn) {
      alertMsg = `⚠️ আবহাওয়া নজরদারি: ${weather.city}-এ ভারী বৃষ্টির সম্ভাবনা (${maxPrecip}%) রয়েছে।`;
      safeZone = 'নিকটতম উঁচু নিরাপদ স্থানে যান বা আশ্রয়কেন্দ্রে চলে যান। দ্রুত চলাফেরার জন্য ন্যূনতম খাবার ও ওষুধ প্রস্তুত রাখুন।';
    }
    if (isTa) {
      alertMsg = `⚠️ வானிலை கண்காணிப்பு: ${weather.city} பகுதியில் கனமழை பெய்ய அதிக வாய்ப்பு (${maxPrecip}%) உள்ளது.`;
      safeZone = 'அருகிலுள்ள உயரமான பாதுகாப்பான இடத்துக்கு செல்லவும் அல்லது தங்குமிடத்துக்குச் செல்லவும். விரைவாக நகருவதற்கு குறைந்தபட்ச உணவு மற்றும் மருந்துகளை தயார் செய்யுங்கள்.';
    }
    if (isTe) {
      alertMsg = `⚠️ వాతావరణ పరిశీలన: ${weather.city} లో భారీ వర్షం కురిసే అవకాశం (${maxPrecip}%) ఉంది.`;
      safeZone = 'దగ్గర్లో ఉన్న ఎత్తైన సురక్షిత స్థలానికి వెళ్లండి లేదా ఆశ్రయం కేంద్రానికి వెళ్లండి. త్వరగా పోవడానికి కనీస ఆహారం మరియు మందులను సిద్ధంగా ఉంచండి.';
    }
    if (isMr) {
      alertMsg = `⚠️ हवामान सतर्कता: ${weather.city} मध्ये मुसळधार पावसाची शक्यता (${maxPrecip}%) आहे.`;
      safeZone = 'जवळच्या उंच आणि सुरक्षित ठिकाणी जा किंवा आश्रय केंद्रात हलवा. झटपट जाण्यासाठी किमान अन्न आणि औषधे तयार ठेवा.';
    }
    return { level: 'yellow', text: alertMsg, safeZone };
  }

  let clearMsg = `✅ Weather is clear in ${weather.city}`;
  if (isHi) clearMsg = `✅ ${weather.city} में मौसम सामान्य एवं साफ है`;
  if (isBn) clearMsg = `✅ ${weather.city}-এ আবহাওয়া পরিষ্কার ও স্বাভাবিক রয়েছে`;
  if (isTa) clearMsg = `✅ ${weather.city} பகுதியில் வானிலை இயல்பாக உள்ளது`;
  if (isTe) clearMsg = `✅ ${weather.city} లో వాతావరణం ప్రశాంతంగా ఉంది`;
  if (isMr) clearMsg = `✅ ${weather.city} मध्ये हवामान सामान्य व स्वच्छ आहे`;
  return { level: 'green', text: clearMsg, safeZone: 'No immediate emergency alert. Keep a basic emergency kit ready for future caution.' };
}
