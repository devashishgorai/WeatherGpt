import { CONFIG } from './config.js';
import { getWeatherEmoji } from './weatherApi.js';

/* ===== FORMAT WEATHER STATE FOR LLM SYSTEM CONTEXT ===== */
export function formatWeatherForPrompt(weather, forecast) {
  if (!weather) return "No current weather data available.";

  const next24 = (forecast?.hourly || []).slice(0, 12).map(h => 
    `${h.time}: ${h.temp}°C (${h.condition}, Rain: ${h.precipProb}%)`
  ).join(', ');

  const next7Days = (forecast?.daily || []).slice(0, 7).map(d => 
    `${d.date}: Max ${d.maxTemp}°C / Min ${d.minTemp}°C (${d.condition}, Rain: ${d.precipProb}%)`
  ).join(', ');

  const activeAlerts = (weather.alerts || []).map(a => `[${a.level?.toUpperCase()}] ${a.text}`).join('; ');

  return `
CURRENT LIVE WEATHER (Location: ${weather.city}):
- Temperature: ${weather.temp}°C (Feels like: ${weather.feelsLike}°C)
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} km/h from ${weather.windDirection}
- UV Index: ${weather.uvIndex}
- Visibility: ${weather.visibility} km
- Active Weather Alerts: ${activeAlerts || 'None'}

NEXT 12 HOURS HOURLY FORECAST:
${next24 || 'Unavailable'}

NEXT 7 DAYS FORECAST:
${next7Days || 'Unavailable'}
`.trim();
}

/* ===== BUILD SYSTEM PROMPT FOR CLAUDE / GEMINI / OPENAI ===== */
export function buildSystemPrompt(persona, language, weatherSummary) {
  return `You are WeatherGPT, an AI weather assistant for India, specialized in authentic regional communication and hyper-local meteorological reasoning.

USER PROFILE & PERSONA:
- Selected Role: ${persona.toUpperCase()}
- Language to respond in: ${language.toUpperCase()} (MUST ALWAYS respond directly in authentic native script for Hindi, Bengali, Tamil, Telugu, Marathi, or clear English).
- Tone & Style: Warm, direct, culturally nuanced, practical, and highly relevant to the role.

PERSONA ADVISORY INSTRUCTIONS:
- Farmer (Kisan): Focus on irrigation advice, soil moisture, spraying conditions, fertilizer timing, rainfall windows, and frost/heat risks.
- Fisherman (Machhuara): Focus on coastal wind speed in knots, wave height/sea state, cyclone/depression warnings, safe fishing distances, and high tide timings.
- Disaster Manager: Focus on storm tracking, localized flood/waterlogging risks, heatwave/coldwave severity, emergency shelter protocols, and IMD alert levels.
- Citizen / Everyday: Focus on daily commuting, going out/travel feasibility, clothing recommendations, umbrella necessity, outdoor sports/walking, and health/AQI advisories.

LIVE METEOROLOGICAL CONTEXT:
${weatherSummary}

IMPORTANT GUIDELINES:
1. Always give direct, clear answers to the user's question first before elaborating.
2. If the user asks in Romanized script (e.g., Banglish "aj ki gurte jawa uchit?" or Hinglish "kya aaj bahar jaana chahiye?"), ALWAYS understand the intent and reply in the selected language's native script.
3. Keep responses concise (3-6 sentences), well-structured, actionable, and free from technical jargon.`;
}

/* ===== MULTI-PROVIDER LLM DISPATCHER ===== */
export async function executeClaudeRequest(systemPrompt, conversationHistory) {
  // 1. Try Anthropic Claude API
  if (CONFIG.CLAUDE_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 600,
          system: systemPrompt,
          messages: conversationHistory.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.content?.[0]?.text || '';
      }
    } catch (cErr) {
      console.warn('Claude API call failed:', cErr);
    }
  }

  // 2. Try Google Gemini API
  if (CONFIG.GEMINI_API_KEY) {
    try {
      const geminiContents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I am WeatherGPT and will provide exact, helpful weather advice.' }] },
        ...conversationHistory.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ];

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiContents })
      });
      if (res.ok) {
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch (gErr) {
      console.warn('Gemini API call failed:', gErr);
    }
  }

  // 3. Try OpenAI API
  if (CONFIG.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map(m => ({ role: m.role, content: m.content }))
          ]
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || '';
      }
    } catch (oErr) {
      console.warn('OpenAI API call failed:', oErr);
    }
  }

  throw new Error('No active LLM API Key configured. Using smart localized engine.');
}

/* ===== ADVANCED LOCALIZED OFFLINE NLP & INTELLIGENCE ENGINE ===== */
export function generateSmartLocalResponse(persona, language, weather, userQuery, forecast) {
  const w = weather || {
    city: 'your location',
    temp: 28,
    feelsLike: 30,
    humidity: 65,
    windSpeed: 12,
    windDirection: 'SW',
    condition: 'Partly Cloudy',
    uvIndex: 6,
    visibility: 8
  };

  const condLower = (w.condition || '').toLowerCase();
  const isStormy = condLower.includes('thunder') || condLower.includes('storm') || condLower.includes('cyclone') || condLower.includes('squall');
  const isRainy = isStormy || condLower.includes('rain') || condLower.includes('drizzle') || (w.humidity || 0) > 80;
  const isExtremeHeat = (w.temp || 0) >= 38 || (w.feelsLike || 0) >= 40;
  const isCold = (w.temp || 0) <= 16;
  const isDangerousWind = (w.windSpeed || 0) > 28;
  const knots = Math.round((w.windSpeed || 10) * 0.539957);

  // Normalize query for deep intent matching
  const q = (userQuery || '').toLowerCase().trim();

  // Find rainy day in next 7 days
  const rainyDay = (forecast?.daily || []).find(d => 
    (d.condition || '').toLowerCase().includes('rain') || (d.precipProb || 0) > 40
  );
  const tom = forecast?.daily?.[1] || {};

  // Intent classification with extensive Romanized / Banglish / Hinglish / Tanglish dictionary
  let intent = 'general';

  // 1. Outdoor / Travel / Going out / Walking / Sightseeing / Outing
  if (
    q.includes('gurte') || q.includes('ghurte') || q.includes('jawa') || q.includes('jaoa') || 
    q.includes('berono') || q.includes('uchit') || q.includes('bahar') || q.includes('nikal') || 
    q.includes('travel') || q.includes('trip') || q.includes('visit') || q.includes('ghumte') || 
    q.includes('baire') || q.includes('jaana') || q.includes('chahiye') || q.includes('outside') || 
    q.includes('veli') || q.includes('pona') || q.includes('vellala') || q.includes('firna') || 
    q.includes('jaau') || q.includes('outing') || q.includes('picnic') || q.includes('ride') || 
    q.includes('drive') || q.includes('tour') || q.includes('walk') || q.includes('chala') || 
    q.includes('jaunga') || q.includes('jabo') || q.includes('ghora') || q.includes('ghura') ||
    q.includes('ghuma') || q.includes('bayata') || q.includes('veliya')
  ) {
    intent = 'outdoor';
  }
  // 2. Rain / Precipitation / Umbrella
  else if (
    q.includes('rain') || q.includes('barish') || q.includes('bristi') || q.includes('brishti') || 
    q.includes('mazhai') || q.includes('varsham') || q.includes('paus') || q.includes('chata') || 
    q.includes('umbrella') || q.includes('bheegna') || q.includes('jol') || q.includes('varsad') ||
    q.includes('badal') || q.includes('megh') || q.includes('toofan') || q.includes('thunder')
  ) {
    intent = (q.includes('when') || q.includes('kab') || q.includes('kobe') || q.includes('eppothu') || q.includes('eppudu') || q.includes('kadhi')) ? 'when_rain' : 'rain_today';
  }
  // 3. Tomorrow / Future
  else if (
    q.includes('tomorrow') || q.includes('kal') || q.includes('agami') || q.includes('naalai') || 
    q.includes('repu') || q.includes('udya') || q.includes('sokal') || q.includes('shokal') ||
    q.includes('sandhya') || q.includes('shondha') || q.includes('night') || q.includes('raat')
  ) {
    intent = 'tomorrow';
  }
  // 4. Weekly / 7-Day Forecast
  else if (
    q.includes('week') || q.includes('7 day') || q.includes('agla hafta') || q.includes('shoptaho') || 
    q.includes('vaaram') || q.includes('aathavada') || q.includes('weekend') || q.includes('sunday') || 
    q.includes('saturday') || q.includes('robibar') || q.includes('chuti')
  ) {
    intent = 'weekly';
  }
  // 5. Temperature / Heat / Cold
  else if (
    q.includes('temp') || q.includes('tapman') || q.includes('gorom') || q.includes('garmi') || 
    q.includes('heat') || q.includes('sardi') || q.includes('thand') || q.includes('sheeth') || 
    q.includes('hot') || q.includes('cold') || q.includes('kuldi') || q.includes('anubhuto')
  ) {
    intent = 'temperature';
  }
  // 6. Clothing / Dressing
  else if (
    q.includes('cloth') || q.includes('wear') || q.includes('dress') || q.includes('kapde') || 
    q.includes('jama') || q.includes('poshak') || q.includes('sweater') || q.includes('jacket') || 
    q.includes('cotton') || q.includes('raincoat')
  ) {
    intent = 'clothing';
  }
  // 7. Farming / Irrigation / Crops
  else if (
    q.includes('water') || q.includes('pani') || q.includes('sinchai') || q.includes('sech') || 
    q.includes('irrigation') || q.includes('fasal') || q.includes('crop') || q.includes('khet') || 
    q.includes('chash') || q.includes('dhan') || q.includes('alu') || q.includes('krishi') || 
    q.includes('sar') || q.includes('fertilizer') || q.includes('pest') || q.includes('keetnashak')
  ) {
    intent = 'irrigation';
  }
  // 8. Marine / Fishing / Sea
  else if (
    q.includes('fish') || q.includes('mach') || q.includes('machli') || q.includes('samundar') || 
    q.includes('somudro') || q.includes('sea') || q.includes('kadal') || q.includes('boat') || 
    q.includes('noka') || q.includes('trawler') || q.includes('meen') || q.includes('jal') || 
    q.includes('wave') || q.includes('dheu') || q.includes('cyclone') || q.includes('ghurnijhor')
  ) {
    intent = 'fishing';
  }
  // 9. Wind / Air / Breeze
  else if (
    q.includes('wind') || q.includes('hawa') || q.includes('batas') || q.includes('kaatru') || 
    q.includes('gali') || q.includes('vara')
  ) {
    intent = 'wind';
  }
  // 10. UV / Sun / Sunlight
  else if (
    q.includes('uv') || q.includes('sun') || q.includes('dhoop') || q.includes('suraj') || 
    q.includes('rod') || q.includes('surya')
  ) {
    intent = 'uv';
  }
  // 11. Humidity / Moisture
  else if (
    q.includes('humidity') || q.includes('nami') || q.includes('ardrata') || q.includes('eerappatham') || 
    q.includes('tema') || q.includes('chips')
  ) {
    intent = 'humidity';
  }
  // 12. Safety / Health / AQI
  else if (
    q.includes('safe') || q.includes('safety') || q.includes('risk') || q.includes('danger') || 
    q.includes('shurokkha') || q.includes('suraksha') || q.includes('health') || q.includes('swasthya') || 
    q.includes('tabiyat') || q.includes('mask') || q.includes('looh')
  ) {
    intent = 'safety';
  }

  // Persona Overrides for Generic questions
  if (persona === 'farmer' && (intent === 'general')) intent = 'irrigation';
  if (persona === 'fisherman' && (intent === 'general')) intent = 'fishing';
  if (persona === 'disaster' && (intent === 'general')) intent = 'safety';

  /* ===== RESPONSE GENERATORS BY LANGUAGE ===== */
  const R = {
    bengali: {
      outdoor: () => {
        if (isStormy) {
          return `⛔ **না, এখন বাইরে বের হওয়া বা ঘুরতে যাওয়া একদম উচিত নয়!**\n\n${w.city}-এ বর্তমানে **${w.condition} (বজ্রঝড়)** চলছে। তাপমাত্রা ${w.temp}°C (অনুভূত ${w.feelsLike}°C), আর্দ্রতা ${w.humidity}% এবং তীব্র বজ্রপাত ও বৃষ্টির ঝুঁকি রয়েছে।\n\n🏠 এই মুহূর্তে নিরাপদ আশ্রয়ে থাকুন এবং ঝড় না থামা পর্যন্ত বাইরে বের হওয়া এড়িয়ে চলুন।`;
        }
        if (isRainy) {
          return `🌧️ **বাইরে যাওয়ার আগে সতর্কতা প্রয়োজন:**\n\n${w.city}-এ আজ বৃষ্টির সম্ভাবনা বেশি এবং আকাশ মেঘলা রয়েছে। আর্দ্রতা ${w.humidity}%।\n\n☂️ বাইরে বের হলে ছাতা বা রেইনকোট সাথে রাখুন এবং জলাবদ্ধ এলাকা এড়িয়ে চলুন।`;
        }
        if (isExtremeHeat) {
          return `☀️ **তীব্র গরমের সতর্কতা:**\n\nবর্তমান তাপমাত্রা ${w.temp}°C (অনুভূত ${w.feelsLike}°C)। দুপুর ১২টা থেকে বিকেল ৪টা পর্যন্ত রোদ এড়িয়ে চলা ভালো। সাথে জল রাখুন। 🥤`;
        }
        return `✅ **হ্যাঁ, আজ বাইরে বের হওয়া বা ঘুরতে যাওয়ার জন্য আবহাওয়া বেশ ভালো ও অনুকূল!**\n\n${w.city}-এ বর্তমান তাপমাত্রা ${w.temp}°C এবং আবহাওয়া ${w.condition}। মনোরম আবহাওয়ায় আপনার ভ্রমণ উপভোগ করুন! 😊`;
      },
      rain_today: () => isRainy
        ? `🌧️ **হ্যাঁ!** ${w.city}-এ আজ বৃষ্টি বা বজ্রবৃষ্টির প্রবল সম্ভাবনা রয়েছে। বর্তমান আর্দ্রতা ${w.humidity}%।\n\n☂️ বাইরে বের হলে অবশ্যই ছাতা সাথে রাখবেন!`
        : `☀️ **না,** আজ ${w.city}-এ বৃষ্টির সম্ভাবনা খুবই কম। আকাশ ${w.condition} এবং আর্দ্রতা ${w.humidity}%।\n\nআপনি নিশ্চিন্তে বাইরে বের হতে পারেন! 👍`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city}-তে বৃষ্টির পরবর্তী পূর্বাভাস:\n\nআগামী ২-৩ দিনের মধ্যে (${rainyDay.date ? rainyDay.date.slice(5) : 'শীঘ্রই'}) বৃষ্টি হওয়ার সম্ভাবনা ${rainyDay.precipProb || 40}% (${rainyDay.condition})। বাকি দিনগুলো আবহাওয়া ভালো থাকবে। ☂️`
        : `☀️ ${w.city}-তে আগামী ৭ দিন বৃষ্টির সম্ভাবনা খুবই কম। গোটা সপ্তাহ আবহাওয়া মূলত শুকনো ও পরিষ্কার থাকবে। 👍`,
      tomorrow: () => `📅 আগামীকাল ${w.city}-র আবহাওয়ার পূর্বাভাস:\n\n🌡️ সর্বোচ্চ: ${tom.maxTemp || (w.temp + 1)}°C | সর্বনিম্ন: ${tom.minTemp || (w.temp - 6)}°C\n☁️ আকাশ: ${tom.condition || w.condition}\n💧 বৃষ্টির সম্ভাবনা: ${tom.precipProb || 15}%\n\n${(tom.precipProb || 0) > 40 ? 'কাল বৃষ্টি হতে পারে — ছাতা সাথে রাখুন!' : 'কাল আবহাওয়া মনোরম থাকবে।'}`,
      weekly: () => `📊 ${w.city}-র ৭ দিনের আবহাওয়ার সারাংশ:\n\nতাপমাত্রা ${Math.min(w.temp, tom.minTemp || 24)}°C থেকে ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C এর মধ্যে থাকবে।\n${rainyDay ? 'সপ্তাহের মাঝে হালকা বৃষ্টির সম্ভাবনা রয়েছে।' : 'পুরো সপ্তাহ আবহাওয়া শুষ্ক থাকবে।'}\n\nবিস্তারিত দেখতে নিচে "৭ দিনের পূর্বাভাস" দেখুন।`,
      temperature: () => `🌡️ ${w.city}-তে বর্তমান তাপমাত্রা ${w.temp}°C (অনুভূত: ${w.feelsLike}°C)।\n\n${isExtremeHeat ? '🔥 তীব্র গরম! দুপুর ১২টা থেকে ৪টা পর্যন্ত রোদ এড়িয়ে চলুন এবং প্রচুর জল পান করুন।' : isCold ? '🧥 শীতের আমেজ — হালকা গরম পোশাক সাথে রাখুন।' : '😊 আবহাওয়া আরামদায়ক রয়েছে।'}`,
      clothing: () => isRainy
        ? `🌧️ ওয়াটারপ্রুফ জুতো ও রেইনকোট/ছাতা ব্যবহার করুন। সুতির আরামদায়ক পোশাক পরা ভালো। ☂️`
        : isExtremeHeat
        ? `☀️ হালকা রঙের ঢিলেঢালা সুতির জামাকাপড় পরুন এবং রোদে সানগ্লাস ব্যবহার করুন। 🕶️`
        : `👕 সাধারণ আরামদায়ক পোশাক পরুন, আবহাওয়া অনুকূল রয়েছে।`,
      safety: () => isStormy
        ? `🚨 **জরুরি নিরাপত্তা সতর্কতা:** বজ্রপাত ও ঝড়ের সময় গাছের নিচে বা খোলা মাঠে দাঁড়াবেন না। ঘরের ভেতরের বৈদ্যুতিক সরঞ্জাম নিরাপদে রাখুন।`
        : `🛡️ ${w.city}-তে বর্তমানে কোনো বড় প্রাকৃতিক বিপদের পূর্বাভাস নেই। আবহাওয়া স্বাভাবিক।`,
      irrigation: () => isRainy
        ? `💧 **সেচ দেওয়া স্থগিত রাখুন!** মাটিতে আর্দ্রতা (${w.humidity}%) বেশি এবং বৃষ্টির সম্ভাবনা রয়েছে। অতিরিক্ত জল নিষ্কাশনের ব্যবস্থা রাখুন। 🌾`
        : `💧 **হ্যাঁ, আজ ফসলে সেচ দেওয়া যাবে।** বাষ্পীভবন কমাতে সকাল ৬-৯টা বা বিকেল ৫টার পর সেচ দেওয়া সর্বোত্তম। 🌾`,
      fishing: () => (isDangerousWind || isStormy)
        ? `⛔ **সমুদ্রে বা নদীতে যাবেন না!** বাতাসের গতিবেগ ${w.windSpeed} কিমি/ঘণ্টা (${knots} নট)। উত্তাল ঢেউ ও ঝড়ের ঝুঁকি রয়েছে। নৌকা বেঁধে রাখুন। 🚫🌊`
        : `🎣 ${w.city} উপকূলীয় অঞ্চল মাছ ধরার জন্য নিরাপদ। বাতাসের গতি ${w.windSpeed} কিমি/ঘণ্টা। সকালের সময় অনুকূল। ⛵`,
      wind: () => `💨 ${w.city}-তে বাতাসের গতিবেগ ${w.windSpeed} কিমি/ঘণ্টা (${w.windDirection} দিক থেকে)। ${isDangerousWind ? '⚠️ দমকা হাওয়ার সতর্কতা!' : 'স্বাভাবিক বাতাস বইছে।' } 🍃`,
      uv: () => `☀️ UV সূচক: ${w.uvIndex}। ${w.uvIndex > 7 ? '⚠️ অতিবেগুনি রশ্মির মাত্রা বেশি — রোদে বের হলে ছাতা ও সানস্ক্রিন ব্যবহার করুন।' : 'UV মাত্রা নিরাপদ।' } 🧴`,
      humidity: () => `💧 আপেক্ষিক আর্দ্রতা: ${w.humidity}%, দৃশ্যমানতা: ${w.visibility} কিমি। আবহাওয়া কিছুটা ঘর্মাক্ত হতে পারে।`,
      general: () => `📍 **${w.city}-র বর্তমান আবহাওয়া পরামর্শ:**\n\n• তাপমাত্রা: ${w.temp}°C (অনুভূত: ${w.feelsLike}°C)\n• অবস্থা: ${w.condition}\n• আর্দ্রতা: ${w.humidity}% | বাতাস: ${w.windSpeed} কিমি/ঘণ্টা\n\n${isStormy ? '⚠️ বজ্রঝড়ের সতর্কতা রয়েছে — সতর্ক থাকুন।' : isRainy ? '🌧️ বৃষ্টির সম্ভাবনা রয়েছে — ছাতা সাথে রাখুন।' : '😊 আবহাওয়া স্থিতিশীল ও স্বাভাবিক রয়েছে।'}`
    },

    hindi: {
      outdoor: () => {
        if (isStormy) {
          return `⛔ **नहीं, अभी बाहर घूमने या यात्रा पर जाना बिल्कुल सुरक्षित नहीं है!**\n\n${w.city} में वर्तमान में **${w.condition} (आंधी-तूफान/वज्रपात)** चल रहा है। तापमान ${w.temp}°C (महसूस: ${w.feelsLike}°C) है और आकाशीय बिजली गिरने का जोखिम है।\n\n🏠 कृपया तूफान शांत होने तक सुरक्षित पक्के मकान में ही रहें।`;
        }
        if (isRainy) {
          return `🌧️ **बाहर जाने से पहले सावधानी बरतें:**\n\n${w.city} में आज बारिश की संभावना है। नमी ${w.humidity}% है।\n\n☂️ बाहर निकलते समय छाता या रेनकोट साथ रखें।`;
        }
        if (isExtremeHeat) {
          return `☀️ **भीषण गर्मी की चेतावनी:**\n\nतापमान ${w.temp}°C (महसूस ${w.feelsLike}°C) है। दोपहर १२ से ४ बजे तक तेज धूप में जाने से बचें और पानी खूब पिएं। 🥤`;
        }
        return `✅ **हाँ! आज बाहर जाने, घूमने या यात्रा के लिए मौसम बहुत ही अनुकूल और सुखद है!**\n\n${w.city} में तापमान ${w.temp}°C और आसमान ${w.condition} है। अपनी यात्रा का आनंद लें! 😊`;
      },
      rain_today: () => isRainy
        ? `🌧️ **हाँ!** ${w.city} में आज बारिश होने की पूरी संभावना है। वर्तमान नमी ${w.humidity}% है।\n\n☂️ बाहर जाते समय छाता अवश्य साथ रखें!`
        : `☀️ **नहीं,** आज ${w.city} में बारिश की संभावना बहुत कम है। आसमान ${w.condition} है और नमी ${w.humidity}% है।\n\nआप बिना छाते के आराम से बाहर जा सकते हैं! 👍`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} में बारिश का अगला अनुमान:\n\nअगले 2-3 दिनों में (${rainyDay.date ? rainyDay.date.slice(5) : 'जल्द ही'}) बारिश की संभावना ${rainyDay.precipProb || 40}% है (${rainyDay.condition})। बाकी दिन मौसम सामान्य रहेगा। ☂️`
        : `☀️ ${w.city} में अगले 7 दिनों तक बारिश की बहुत कम संभावना है। पूरा सप्ताह मौसम मुख्यतः शुष्क एवं साफ रहेगा। 👍`,
      tomorrow: () => `📅 कल का ${w.city} का मौसम पूर्वानुमान:\n\n🌡️ अधिकतम: ${tom.maxTemp || (w.temp + 1)}°C | न्यूनतम: ${tom.minTemp || (w.temp - 6)}°C\n☁️ स्थिति: ${tom.condition || w.condition}\n💧 बारिश की संभावना: ${tom.precipProb || 15}%\n\n${(tom.precipProb || 0) > 40 ? 'कल बारिश हो सकती है — बाहर जाते समय छाता अवश्य रखें!' : 'कल मौसम अनुकूल और सुखद रहने की संभावना है।'}`,
      weekly: () => `📊 ${w.city} का 7-दिवसीय मौसम सारांश:\n\nतापमान ${Math.min(w.temp, tom.minTemp || 24)}°C से ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C के बीच रहेगा।\n${rainyDay ? `सप्ताह के मध्य में हल्की वर्षा (${rainyDay.condition}) संभव है।` : 'पूरा सप्ताह मौसम साफ और शुष्क बना रहेगा।'}\n\nविस्तृत जानकारी के लिए नीचे "7-दिन का पूर्वानुमान" देखें।`,
      temperature: () => `🌡️ ${w.city} में वर्तमान तापमान ${w.temp}°C है (महसूस: ${w.feelsLike}°C)।\n\n${isExtremeHeat ? '🔥 भीषण गर्मी है! दोपहर 12 से 4 बजे तक धूप से बचें और खूब पानी पिएं।' : isCold ? '🧥 ठंड का मौसम है — गर्म कपड़े पहनें।' : '😊 मौसम बहुत ही सुखद और आरामदायक है!'}`,
      clothing: () => isRainy
        ? `🌧️ वाटरप्रूफ जूते व छाता/रेनकोट का उपयोग करें। सूती वस्त्र पहनें। ☂️`
        : isExtremeHeat
        ? `☀️ हल्के रंग के ढीले सूती कपड़े पहनें और धूप का चश्मा लगाएं। 🕶️`
        : `👕 मौसम के अनुसार सामान्य आरामदायक कपड़े पहनें।`,
      safety: () => isStormy
        ? `🚨 **आपातकालीन सुरक्षा सलाह:** आंधी-तूफान व बिजली कड़कने के दौरान पेड़ों या खंभों के नीचे न खड़े हों। घर के भीतर सुरक्षित रहें।`
        : `🛡️ ${w.city} में मौसम सामान्य व सुरक्षित बना हुआ है।`,
      irrigation: () => isRainy
        ? `💧 **सिंचाई रोक दें!** नमी ${w.humidity}% है और बारिश की संभावना है। खेत में जलभराव न होने दें। 🌾`
        : `💧 **हाँ, आज फसल में पानी (सिंचाई) दे सकते हैं।** सुबह 6-9 बजे या शाम 5 बजे के बाद सिंचाई करना सर्वोत्तम रहेगा। 🌾`,
      fishing: () => (isDangerousWind || isStormy)
        ? `⛔ **समुद्र में न जाएं!** हवा की गति ${w.windSpeed} किमी/घंटा (${knots} समुद्री मील) है और समुद्र अशांत है। नावों को सुरक्षित बांध कर रखें। 🚫🌊`
        : `🎣 ${w.city} के तटीय क्षेत्र में स्थिति सुरक्षित है। हवा ${w.windSpeed} किमी/घंटा है। मछली पकड़ने के लिए सुबह 5:30 से 9:30 का समय अनुकूल है। ⛵`,
      wind: () => `💨 ${w.city} में हवा की गति ${w.windSpeed} किमी/घंटा है (${w.windDirection} दिशा से)। ${isDangerousWind ? '⚠️ तेज हवाओं की चेतावनी!' : 'हवा की गति सामान्य है।'} 🍃`,
      uv: () => `☀️ ${w.city} में UV इंडेक्स: ${w.uvIndex}। ${w.uvIndex > 7 ? '⚠️ अधिक UV! धूप में निकलते समय सनस्क्रीन व चश्मा लगाएं।' : 'UV स्तर सामान्य है।'} 🧴`,
      humidity: () => `💧 ${w.city} में सापेक्ष आर्द्रता: ${w.humidity}%, दृश्यता: ${w.visibility} किमी है।`,
      general: () => `📍 **${w.city} मौसम सारांश व सलाह:**\n\n• तापमान: ${w.temp}°C (महसूस: ${w.feelsLike}°C)\n• मौसम: ${w.condition}\n• नमी: ${w.humidity}% | हवा: ${w.windSpeed} किमी/घंटा\n\n${isStormy ? '⚠️ तूफान की संभावना है — सतर्क रहें।' : isRainy ? '🌧️ बारिश की संभावना है — छाता साथ रखें!' : '😊 मौसम सुखद बना हुआ है!'}`
    },

    english: {
      outdoor: () => {
        if (isStormy) {
          return `⛔ **No, going out or traveling right now is NOT recommended!**\n\nThere is an active **${w.condition}** in ${w.city}. Current temperature is ${w.temp}°C (feels like ${w.feelsLike}°C) with high humidity (${w.humidity}%) and high risk of lightning strikes and waterlogging.\n\n🏠 Please remain indoors in a safe shelter until the storm subsides.`;
        }
        if (isRainy) {
          return `🌧️ **Exercise caution if heading out:**\n\nRain or showers are likely in ${w.city} today with ${w.humidity}% humidity.\n\n☂️ Make sure to carry an umbrella or waterproof jacket!`;
        }
        if (isExtremeHeat) {
          return `☀️ **High Heat Advisory:**\n\nTemperature is ${w.temp}°C (feels like ${w.feelsLike}°C). Avoid prolonged outdoor exposure between 12 PM and 4 PM and stay well-hydrated. 🥤`;
        }
        return `✅ **Yes! The weather in ${w.city} is pleasant and very favorable for going out and traveling!**\n\nCurrent temperature is ${w.temp}°C with ${w.condition} skies. Enjoy your outing! 😊`;
      },
      rain_today: () => isRainy
        ? `🌧️ **Yes!** Rain is very likely in ${w.city} today. Humidity is at ${w.humidity}% with overcast conditions.\n\n☂️ Don't forget to carry an umbrella!`
        : `☀️ **No,** rain is unlikely in ${w.city} today. Humidity is ${w.humidity}% and skies are ${w.condition}.\n\nYou can head out without worrying about rain! 👍`,
      when_rain: () => rainyDay
        ? `🌧️ Upcoming rain forecast for ${w.city}:\n\nRain is expected around (${rainyDay.date ? rainyDay.date.slice(5) : 'next 2-3 days'}) with a ${rainyDay.precipProb || 40}% chance (${rainyDay.condition}).\n\nThe rest of the week is expected to remain largely dry. ☂️`
        : `☀️ Rain is unlikely in ${w.city} over the next 7 days. Skies will remain mostly clear and dry. 👍`,
      tomorrow: () => `📅 Tomorrow's forecast for ${w.city}:\n\n🌡️ High: ${tom.maxTemp || (w.temp + 1)}°C | Low: ${tom.minTemp || (w.temp - 6)}°C\n☁️ Conditions: ${tom.condition || w.condition}\n💧 Rain Probability: ${tom.precipProb || 15}%\n\n${(tom.precipProb || 0) > 40 ? 'Rain is expected tomorrow — carry an umbrella!' : 'Pleasant and stable outdoor conditions expected.'}`,
      weekly: () => `📊 7-Day Weather Outlook for ${w.city}:\n\nTemperatures will range between ${Math.min(w.temp, tom.minTemp || 24)}°C and ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C.\n${rainyDay ? `Expect light showers mid-week (${rainyDay.condition}).` : 'Mainly dry and clear weather expected throughout the week.'}\n\nTap "7-Day Forecast" below for details.`,
      temperature: () => `🌡️ Current temperature in ${w.city} is ${w.temp}°C (feels like ${w.feelsLike}°C).\n\n${isExtremeHeat ? '🔥 Extreme heat! Stay indoors during peak afternoon hours and drink plenty of fluids.' : isCold ? '🧥 Chilly weather — wear warm layers.' : '😊 Very pleasant and comfortable weather!'}`,
      clothing: () => isRainy
        ? `🌧️ Wear water-resistant footwear and carry an umbrella or light raincoat. ☂️`
        : isExtremeHeat
        ? `☀️ Wear light, loose-fitting cotton clothing and sunglasses. 🕶️`
        : `👕 Normal comfortable casual wear is ideal for today's weather.`,
      safety: () => isStormy
        ? `🚨 **Emergency Weather Alert:** Avoid sheltering under tall trees or metal structures during thunderstorms. Stay indoors.`
        : `🛡️ Weather conditions in ${w.city} are stable with no active severe weather alerts.`,
      irrigation: () => isRainy
        ? `💧 **Hold off on irrigation!** Soil moisture and humidity are high (${w.humidity}%) with rain expected. Ensure field drainage. 🌾`
        : `💧 **Yes, suitable for irrigation today.** Best times are early morning (6-9 AM) or evening (after 5 PM) to reduce evaporation. 🌾`,
      fishing: () => (isDangerousWind || isStormy)
        ? `⛔ **DO NOT GO TO SEA!** Wind speed is ${w.windSpeed} km/h (${knots} knots) with turbulent sea state and squally weather. Keep boats securely docked. 🚫🌊`
        : `🎣 Coastal sea conditions near ${w.city} are safe. Wind is ${w.windSpeed} km/h. Best fishing window is 5:30 AM to 9:30 AM. ⛵`,
      wind: () => `💨 Surface wind in ${w.city} is ${w.windSpeed} km/h from ${w.windDirection}. ${isDangerousWind ? '⚠️ High wind advisory!' : 'Gentle to moderate breeze.'} 🍃`,
      uv: () => `☀️ UV index in ${w.city} is ${w.uvIndex}. ${w.uvIndex > 7 ? '⚠️ Very high UV! Wear sunscreen and sunglasses.' : 'UV level is safe.'} 🧴`,
      humidity: () => `💧 Relative humidity in ${w.city} is ${w.humidity}% with visibility of ${w.visibility} km.`,
      general: () => `📍 **${w.city} Current Weather Advisory:**\n\n• Temperature: ${w.temp}°C (Feels like: ${w.feelsLike}°C)\n• Sky Condition: ${w.condition}\n• Humidity: ${w.humidity}% | Wind: ${w.windSpeed} km/h\n\n${isStormy ? '⚠️ Active Thunderstorm — stay in safe shelter.' : isRainy ? '🌧️ Rain expected — keep an umbrella handy.' : '😊 Overall stable and pleasant conditions.'}`
    },

    tamil: {
      outdoor: () => isStormy
        ? `⛔ **இல்லை, இப்போது வெளியே செல்வது அல்லது பயணம் செய்வது பாதுகாப்பானது அல்ல!**\n\n${w.city} பகுதியில் **${w.condition} (இடி மின்னல் புயல்)** நிலவுகிறது. வெப்பநிலை ${w.temp}°C, ஈரப்பதம் ${w.humidity}%.\n\n🏠 புயல் ஓயும் வரை பாதுகாப்பான இடங்களில் இருங்கள்.`
        : isRainy
        ? `🌧️ **வெளியே செல்லும்போது கவனம் தேவை:**\n\nமழை பெய்ய வாய்ப்புள்ளது. குடை அல்லது மழைக்கோட் எடுத்துச் செல்லவும்! ☂️`
        : `✅ **ஆம்! இன்று வெளியே செல்லவும் பயணிக்கவும் வானிலை மிகச் சிறப்பாக உள்ளது!**\n\n${w.city} பகுதியில் வெப்பநிலை ${w.temp}°C. உங்கள் பயணத்தை மகிழ்ச்சியுடன் தொடருங்கள்! 😊`,
      rain_today: () => isRainy
        ? `🌧️ **ஆம்!** ${w.city} பகுதியில் இன்று மழை பெய்ய அதிக வாய்ப்புள்ளது. ஈரப்பதம் ${w.humidity}%.\n\n☂️ வெளியே செல்லும்போது குடை எடுத்துச் செல்லுங்கள்!`
        : `☀️ **இல்லை,** இன்று ${w.city} பகுதியில் மழைக்கு வாய்ப்பு குறைவு. வானிலை ${w.condition}. நீங்கள் தாராளமாக வெளியே செல்லலாம்! 👍`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} பகுதியில் அடுத்த மழை வாய்ப்பு:\n\nஅடுத்த 2-3 நாட்களில் மழை பெய்ய ${rainyDay.precipProb || 40}% வாய்ப்புள்ளது. மற்ற நாட்களில் வானிலை சீராக இருக்கும். ☂️`
        : `☀️ ${w.city} பகுதியில் அடுத்த 7 நாட்களுக்கு மழைக்கு வாய்ப்பில்லை. வானிலை வறண்டு காணப்படும். 👍`,
      tomorrow: () => `📅 நாளை ${w.city} வானிலை:\n\n🌡️ அதிகபட்சம்: ${tom.maxTemp || (w.temp + 1)}°C | குறைந்தபட்சம்: ${tom.minTemp || (w.temp - 6)}°C\n☁️ நிலை: ${tom.condition || w.condition}\n💧 மழை வாய்ப்பு: ${tom.precipProb || 15}%`,
      weekly: () => `📊 ${w.city} 7-நாள் வானிலை நிலவரம்:\n\nவெப்பநிலை ${Math.min(w.temp, tom.minTemp || 24)}°C முதல் ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C வரை இருக்கும்.`,
      temperature: () => `🌡️ ${w.city} பகுதியில் வெப்பநிலை ${w.temp}°C (உணரப்படுவது: ${w.feelsLike}°C).\n\n${isExtremeHeat ? '🔥 அதிக வெப்பம்! நிறைய தண்ணீர் குடியுங்கள்.' : '😊 வானிலை இதமாக உள்ளது.'}`,
      clothing: () => isRainy ? `🌧️ குடை மற்றும் மழை ஆடைகள் பயன்படுத்தவும்.` : `👕 பருத்தி ஆடைகள் சிறந்தது.`,
      safety: () => isStormy ? `🚨 இடி மின்னலின் போது மரங்களின் கீழ் நிற்க வேண்டாம்.` : `🛡️ வானிலை சீராக உள்ளது.`,
      irrigation: () => isRainy ? `💧 மழை வாய்ப்புள்ளதால் பாசனத்தைத் தவிர்க்கவும். 🌾` : `💧 ஆம், இன்று பாசனம் செய்யலாம். காலை அல்லது மாலை வேளை சிறந்தது. 🌾`,
      fishing: () => (isDangerousWind || isStormy) ? `⛔ **கடலுக்கு செல்ல வேண்டாம்!** பலத்த காற்று மற்றும் அலைகள். 🚫🌊` : `🎣 ${w.city} கடல் பகுதி பாதுகாப்பானது. காலை 5:30 - 9:30 சிறந்த நேரம். ⛵`,
      wind: () => `💨 காற்றின் வேகம் மணிக்கு ${w.windSpeed} கி.மீ. 🍃`,
      uv: () => `☀️ UV குறியீடு: ${w.uvIndex}. 🧴`,
      humidity: () => `💧 ஈரப்பதம்: ${w.humidity}%, பார்வை தூரம்: ${w.visibility} கி.மீ.`,
      general: () => `📍 **${w.city} வானிலை நிலவரம்:**\n\n• வெப்பநிலை: ${w.temp}°C (உணரப்படுவது: ${w.feelsLike}°C)\n• வானிலை: ${w.condition}\n• ஈரப்பதம்: ${w.humidity}% | காற்று: ${w.windSpeed} கி.மீ/மணி.`
    },

    telugu: {
      outdoor: () => isStormy
        ? `⛔ **వద్దు, ఇప్పుడు బయటకు వెళ్లడం లేదా ప్రయాణం చేయడం సురక్షితం కాదు!**\n\n${w.city} లో ప్రస్తుతం **${w.condition} (ఉరుములు, మెరుపులతో కూడిన తుఫాను)** ఉంది. ఉష్ణోగ్రత ${w.temp}°C, తేమ ${w.humidity}%.\n\n🏠 తుఫాను తగ్గే వరకు సురక్షితమైన ప్రదేశంలో ఉండండి.`
        : isRainy
        ? `🌧️ **బయటకు వెళ్లే ముందు జాగ్రత్త:**\n\nవర్షం పడే అవకాశం ఉంది. గొడుగు తీసుకెళ్లండి! ☂️`
        : `✅ **అవును! నేడు బయటకు వెళ్లడానికి మరియు ప్రయాణానికి వాతావరణం చాలా బాగుంది!**\n\n${w.city} లో ఉష్ణోగ్రత ${w.temp}°C. ప్రయాణాన్ని ఆనందించండి! 😊`,
      rain_today: () => isRainy
        ? `🌧️ **అవును!** ${w.city} లో నేడు వర్షం పడే అవకాశం ఉంది. తేమ ${w.humidity}%.\n\n☂️ గొడుగు తీసుకెళ్లండి!`
        : `☀️ **లేదు,** నేడు వర్షం అవకాశం తక్కువ. తేమ ${w.humidity}%. ధైర్యంగా బయటకు వెళ్లవచ్చు! 👍`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} లో తదుపరి వర్ష సూచన:\n\nరాబోయే 2-3 రోజుల్లో వర్షం పడే అవకాశం ${rainyDay.precipProb || 40}% ఉంది. ☂️`
        : `☀️ ${w.city} లో రాబోయే 7 రోజుల్లో వర్షం పడే అవకాశం లేదు. 👍`,
      tomorrow: () => `📅 రేపు ${w.city} వాతావరణం:\n\n🌡️ గరిష్ట: ${tom.maxTemp || (w.temp + 1)}°C | కనిష్ట: ${tom.minTemp || (w.temp - 6)}°C\n☁️ పరిస్థితి: ${tom.condition || w.condition}\n💧 వర్ష అవకాశం: ${tom.precipProb || 15}%`,
      weekly: () => `📊 ${w.city} 7 రోజుల వాతావరణ సమాచారం:\n\nఉష్ణోగ్రతలు ${Math.min(w.temp, tom.minTemp || 24)}°C నుండి ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C వరకు ఉంటాయి.`,
      temperature: () => `🌡️ ప్రస్తుత ఉష్ణోగ్రత ${w.temp}°C (అనిపించేది: ${w.feelsLike}°C).\n\n${isExtremeHeat ? '🔥 ఎండ తీవ్రత ఎక్కువ! నీరు ఎక్కువగా తాగండి.' : '😊 ఆహ్లాదకరమైన వాతావరణం.'}`,
      clothing: () => isRainy ? `🌧️ గొడుగు లేదా రెయిన్‌కోట్ వాడండి.` : `👕 సౌకర్యవంతమైన కాటన్ దుస్తులు ధరించండి.`,
      safety: () => isStormy ? `🚨 ఉరుములు మెరుపుల సమయంలో చెట్ల కింద నిలబడవద్దు.` : `🛡️ వాతావరణం ప్రశాంతంగా ఉంది.`,
      irrigation: () => isRainy ? `💧 వర్షం పడే అవకాశం ఉంది, నీటిపారుదల నిలిపివేయండి. 🌾` : `💧 అవును, నేడు పంటలకు నీరు పెట్టవచ్చు. ఉదయం లేదా సాయంత్రం వేళల్లో అనుకూలం. 🌾`,
      fishing: () => (isDangerousWind || isStormy) ? `⛔ **సముద్రంలోకి వెళ్లవద్దు!** గాలులు బలంగా ఉన్నాయి. 🚫🌊` : `🎣 తీర వాతావరణం అనుకూలంగా ఉంది. ఉదయం 5:30 - 9:30 మంచి సమయం. ⛵`,
      wind: () => `💨 గాలి వేగం గంటకు ${w.windSpeed} కి.மீ. 🍃`,
      uv: () => `☀️ UV సూచిక: ${w.uvIndex}. 🧴`,
      humidity: () => `💧 తేమ: ${w.humidity}%, దృశ్యత: ${w.visibility} కి.మీ.`,
      general: () => `📍 **${w.city} వాతావరణ సమాచారం:**\n\n• ఉష్ణోగ్రత: ${w.temp}°C (అనిపించేది: ${w.feelsLike}°C)\n• వాతావరణం: ${w.condition}\n• తేమ: ${w.humidity}% | గాలి: ${w.windSpeed} కి.మీ/గం.`
    },

    marathi: {
      outdoor: () => isStormy
        ? `⛔ **नाही, आत्ता बाहेर जाणे किंवा फिरणे अजिबात सुरक्षित नाही!**\n\n${w.city} मध्ये सध्या **${w.condition} (वादळी पाऊस/विजा)** सुरू आहे. तापमान ${w.temp}°C, आर्द्रता ${w.humidity}%.\n\n🏠 वादळ शांत होईपर्यंत घरात किंवा सुरक्षित ठिकाणी राहा.`
        : isRainy
        ? `🌧️ **बाहेर पडताना काळजी घ्या:**\n\nपावसाची शक्यता आहे. छत्री किंवा रेनकोट सोबत ठेवा! ☂️`
        : `✅ **हो! आज बाहेर जाण्यासाठी आणि फिरण्यासाठी हवामान खूप छान आणि अनुकूल आहे!**\n\n${w.city} मध्ये तापमान ${w.temp}°C आहे. सहलीचा आनंद घ्या! 😊`,
      rain_today: () => isRainy
        ? `🌧️ **हो!** ${w.city} मध्ये आज पाऊस पडण्याची दाट शक्यता आहे. आर्द्रता ${w.humidity}% आहे.\n\n☂️ बाहेर पडताना छत्री सोबत ठेवा!`
        : `☀️ **नाही,** आज पावसाची शक्यता खूपच कमी आहे. आर्द्रता ${w.humidity}%. काळजी नसावी! 👍`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} मध्ये पुढील पावसाची शक्यता:\n\nयेत्या २-३ दिवसांत पाऊस पडण्याची ${rainyDay.precipProb || 40}% शक्यता आहे. ☂️`
        : `☀️ ${w.city} मध्ये पुढील ७ दिवसांत पावसाची शक्यता खूपच कमी आहे. 👍`,
      tomorrow: () => `📅 उद्याचा ${w.city} हवामान अंदाज:\n\n🌡️ कमाल तापमान: ${tom.maxTemp || (w.temp + 1)}°C | किमान: ${tom.minTemp || (w.temp - 6)}°C\n☁️ हवामान: ${tom.condition || w.condition}\n💧 पावसाची शक्यता: ${tom.precipProb || 15}%`,
      weekly: () => `📊 ${w.city} चा ७ दिवसांचा हवामान अंदाज:\n\nतापमान ${Math.min(w.temp, tom.minTemp || 24)}°C ते ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C दरम्यान राहील.`,
      temperature: () => `🌡️ सध्याचे तापमान ${w.temp}°C (अनुभव: ${w.feelsLike}°C).\n\n${isExtremeHeat ? '🔥 खूप ऊन आहे! भरपूर पाणी प्या.' : '😊 हवामान आल्हाददायक आहे.'}`,
      clothing: () => isRainy ? `🌧️ छत्री किंवा रेनकोट वापरा.` : `👕 सुती कपडे वापरा.`,
      safety: () => isStormy ? `🚨 वादळाच्या वेळी झाडांखाली थांबू नका.` : `🛡️ हवामान सामान्य आहे.`,
      irrigation: () => isRainy ? `💧 पाऊस येण्याची शक्यता असल्याने पिकांना पाणी देणे टाळा. 🌾` : `💧 हो, आज पिकांना पाणी देऊ शकता. सकाळची किंवा संध्याकाळची वेळ सर्वोत्तम. 🌾`,
      fishing: () => (isDangerousWind || isStormy) ? `⛔ **समुद्रात जाऊ नका!** वाऱ्याचा वेग जास्त आहे. 🚫🌊` : `🎣 किनारपट्टी हवामान सुरक्षित आहे. सकाळी ५:३० - ९:३० सर्वोत्तम वेळ. ⛵`,
      wind: () => `💨 वाऱ्याचा वेग ताशी ${w.windSpeed} किमी. 🍃`,
      uv: () => `☀️ UV निर्देशांक: ${w.uvIndex}. 🧴`,
      humidity: () => `💧 आर्द्रता: ${w.humidity}%, दृश्यमानता: ${w.visibility} किमी.`,
      general: () => `📍 **${w.city} हवामान सल्ला:**\n\n• तापमान: ${w.temp}°C (अनुभव: ${w.feelsLike}°C)\n• हवामान: ${w.condition}\n• आर्द्रता: ${w.humidity}% | वारा: ${w.windSpeed} किमी/तास.`
    }
  };

  const langMap = R[language] || R.english;
  const responder = langMap[intent] || langMap.general;
  return responder();
}
