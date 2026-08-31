import { CONFIG } from './config';
import { LANG_OPTIONS } from './constants';
import { formatHourLabel, getWeatherEmoji } from './weatherApi';

/* ===== WEATHER DATA FORMATTER ===== */
export function formatWeatherForPrompt(weather, forecast) {
  const hourlySummary = (forecast.hourly || []).slice(0, 6).map(h => 
    `  ${formatHourLabel(h.time)}: ${h.temp}°C, ${h.condition}, ${h.precipProb}% rain chance`
  ).join('\n') || '  No hourly data available';

  const dailySummary = (forecast.daily || []).map((d, idx) => 
    `  Day ${idx+1}: ${d.maxTemp}°C / ${d.minTemp}°C, ${d.condition}, ${d.precipProb}% rain`
  ).join('\n') || '  No daily data available';

  const alertsSummary = (weather.alerts && weather.alerts.length > 0)
    ? weather.alerts.map(a => `  ${a.severity || 'ALERT'}: ${a.headline || a.description}`).join('\n')
    : '  No active weather alerts';

  return `
CURRENT CONDITIONS (${weather.city}):
- Temperature: ${weather.temp}°C (Feels like ${weather.feelsLike}°C)
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} km/h from ${weather.windDirection}
- UV Index: ${weather.uvIndex}
- Visibility: ${weather.visibility} km
- Time of day: ${weather.isDaytime ? 'Day' : 'Night'}

24-HOUR OUTLOOK:
${hourlySummary}

7-DAY FORECAST:
${dailySummary}

ACTIVE ALERTS:
${alertsSummary}
  `.trim();
}

/* ===== SYSTEM PROMPT BUILDER FOR LLM ===== */
export function buildSystemPrompt(persona, language, weatherData) {
  const langName = LANG_OPTIONS[language] || 'English';

  const scriptInstructions = {
    hindi: "Respond 100% in authentic Devanagari Hindi (शुद्ध एवं सरल हिंदी लिपि). NEVER write Hinglish/Romanized Hindi.",
    bengali: "Respond 100% in authentic Bengali script (বাংলা লিপি). NEVER write Banglish/Romanized Bengali.",
    tamil: "Respond 100% in authentic Tamil script (தமிழ் எழுத்து). NEVER write Tanglish/Romanized Tamil.",
    telugu: "Respond 100% in authentic Telugu script (తెలుగు లిపి). NEVER write Telugish/Romanized Telugu.",
    marathi: "Respond 100% in authentic Marathi Devanagari script (मराठी देवनागरी). NEVER write Romanized Marathi.",
    english: "Respond in clear, professional English."
  };

  const baseScriptNotice = scriptInstructions[language] || scriptInstructions.english;

  const dialectInstructions = language !== 'english' ? `
CRITICAL LANGUAGE RULES:
- The user may type in Romanized/transliterated form (e.g. Hinglish, Banglish, Tanglish, Tenglish). 
- Example: "aj ki bristi hbe" means "আজ কি বৃষ্টি হবে?" in Bengali, "kal barish hogi kya" means "कल बारिश होगी क्या?" in Hindi.
- You MUST detect the intent from such informal inputs and ALWAYS respond in the authentic native script (${langName}).
- NEVER respond in Romanized text. ALWAYS use the native script characters.
- Match the user's conversational tone — be warm, friendly, and natural like talking to a neighbor.
` : '';

  const personaPrompts = {
    farmer: `You are WeatherGPT, an AI weather assistant for Indian farmers. 
${baseScriptNotice}
${dialectInstructions}
Weather data for user location: ${weatherData}

Your response style:
- Start with: 1-line weather summary in simple words in the native script
- Give: 2-3 specific farming recommendations
- Mention: crop impact, irrigation need, pest risk from humidity, frost/heat stress
- If rain > 70%: advise to delay outdoor farming
- If UV > 8: warn about heat stress on crops
- If wind > 30 kmph: warn about damage to crops
- Max 120 words
- Never use technical meteorology terms`,

    fisherman: `You are WeatherGPT, an AI weather assistant for Indian fishermen.
${baseScriptNotice}
${dialectInstructions}
Weather data for user location: ${weatherData}

Your response style:
- Start with: CLEAR SAFETY VERDICT (Safe to go / Caution / Dangerous - Do not go)
- Wind speed in km/h and knots (1 knot = 1.852 km/h)
- Wave condition estimate (Calm / Moderate / Rough / Very Rough)
- Best fishing time window based on hourly forecast
- Cyclone / depression alerts prominently if present
- If wind > 30 km/h: DO NOT GO TO SEA warning
- Max 120 words`,

    disaster: `You are WeatherGPT, an AI assistant for Disaster Managers in India.
${baseScriptNotice}
${dialectInstructions}
Weather data for user location: ${weatherData}

Your response style:
- Start with: Alert level: GREEN / YELLOW / ORANGE / RED
- Rainfall accumulation risk (mm estimate)
- Flood risk assessment for low-lying areas
- Heatwave / Cold wave severity if applicable
- 3 specific administrative action recommendations
- Max 130 words`,

    citizen: `You are WeatherGPT, a friendly neighborhood weather assistant.
${baseScriptNotice}
${dialectInstructions}
Weather data for user location: ${weatherData}

Your response style:
- Conversational and helpful
- Umbrella needed today?
- What to wear (light cotton / warm jacket / raincoat)
- Best time for outdoor activities/travel
- Health tip based on AQI/temperature/humidity
- Max 100 words`
  };

  return personaPrompts[persona] || personaPrompts.citizen;
}

/* ===== UNIFIED MULTI-LLM API ENGINE ===== */
export async function executeClaudeRequest(systemPrompt, conversationHistory) {
  // 1. Try Anthropic Claude
  if (CONFIG.CLAUDE_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
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
        { role: 'model', parts: [{ text: 'Understood. I am WeatherGPT and will follow all instructions.' }] },
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

/* ===== SMART LOCALIZED OFFLINE PERSONA ENGINE ===== */
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

  const isRainy = (w.condition || '').toLowerCase().includes('rain') || (w.humidity || 0) > 75;
  const isDangerousWind = (w.windSpeed || 0) > 30;
  const knots = Math.round((w.windSpeed || 10) * 0.539957);
  const q = (userQuery || '').toLowerCase();

  // Find rainy day in next 7 days
  const rainyDay = (forecast?.daily || []).find(d => 
    (d.condition || '').toLowerCase().includes('rain') || (d.precipProb || 0) > 40
  );
  const tom = forecast?.daily?.[1] || {};

  // Intent classification
  let intent = 'general';
  if (q.includes('rain') || q.includes('barish') || q.includes('bristi') || q.includes('mazhai') || q.includes('varsham') || q.includes('paus') || q.includes('chata') || q.includes('umbrella')) {
    intent = q.includes('when') || q.includes('kab') || q.includes('kobe') || q.includes('eppothu') || q.includes('eppudu') || q.includes('kadhi') ? 'when_rain' : 'rain_today';
  } else if (q.includes('tomorrow') || q.includes('kal') || q.includes('agami') || q.includes('naalai') || q.includes('repu') || q.includes('udya')) {
    intent = 'tomorrow';
  } else if (q.includes('week') || q.includes('7 day') || q.includes('agla hafta') || q.includes('shoptaho') || q.includes('vaaram') || q.includes('aathavada')) {
    intent = 'weekly';
  } else if (q.includes('temp') || q.includes('tapman') || q.includes('gorom') || q.includes('heat') || q.includes('sardi') || q.includes('thand')) {
    intent = 'temperature';
  } else if (q.includes('water') || q.includes('pani') || q.includes('sinchai') || q.includes('sech') || q.includes('irrigation') || q.includes('fasal') || q.includes('crop') || q.includes('khet')) {
    intent = 'irrigation';
  } else if (q.includes('fish') || q.includes('mach') || q.includes('samundar') || q.includes('sea') || q.includes('kadal') || q.includes('boat') || q.includes('machli') || q.includes('meen')) {
    intent = 'fishing';
  } else if (q.includes('wind') || q.includes('hawa') || q.includes('batas') || q.includes('kaatru') || q.includes('gali') || q.includes('vara')) {
    intent = 'wind';
  } else if (q.includes('outside') || q.includes('bahar') || q.includes('travel') || q.includes('ghumte') || q.includes('veli') || q.includes('baher')) {
    intent = 'outdoor';
  } else if (q.includes('uv') || q.includes('sun') || q.includes('dhoop') || q.includes('suraj') || q.includes('rod')) {
    intent = 'uv';
  } else if (q.includes('humidity') || q.includes('nami') || q.includes('ardrata') || q.includes('eerappatham') || q.includes('tema')) {
    intent = 'humidity';
  } else if (q.includes('hello') || q.includes('hi') || q.includes('namaste') || q.includes('nomoshkar') || q.includes('vanakkam') || q.includes('namaskaram')) {
    intent = 'greeting';
  }

  // Response dictionary for all 6 languages
  const R = {
    hindi: {
      greeting: () => `🙏 नमस्ते! मैं WeatherGPT हूँ।\n\n${w.city} में वर्तमान तापमान ${w.temp}°C और मौसम ${w.condition} है।\n\nआप मुझसे बारिश, कल का मौसम या फसलों के बारे में पूछ सकते हैं!`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} में बारिश का अगला अनुमान:\n\nअगले 2-3 दिनों में (${rainyDay.date ? rainyDay.date.slice(5) : 'जल्द ही'}) बारिश की संभावना ${rainyDay.precipProb || 40}% है (${rainyDay.condition})। बाकी दिन मौसम सामान्य रहेगा। ☂️`
        : `☀️ ${w.city} में अगले 7 दिनों तक बारिश की बहुत कम संभावना है। पूरा सप्ताह मौसम मुख्यतः शुष्क एवं साफ रहेगा। 👍`,
      tomorrow: () => `📅 कल का ${w.city} का मौसम पूर्वानुमान:\n\n🌡️ अधिकतम: ${tom.maxTemp || (w.temp + 1)}°C | न्यूनतम: ${tom.minTemp || (w.temp - 6)}°C\n☁️ स्थिति: ${tom.condition || w.condition}\n💧 बारिश की संभावना: ${tom.precipProb || 15}%\n\n${(tom.precipProb || 0) > 40 ? 'कल बारिश हो सकती है — बाहर जाते समय छाता अवश्य रखें!' : 'कल मौसम अनुकूल और सुखद रहने की संभावना है।'}` ,
      weekly: () => `📊 ${w.city} का 7-दिवसीय मौसम सारांश:\n\nतापमान ${Math.min(w.temp, tom.minTemp || 24)}°C से ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C के बीच रहेगा।\n${rainyDay ? `सप्ताह के मध्य में हल्की वर्षा (${rainyDay.condition}) संभव है।` : 'पूरा सप्ताह मौसम साफ और शुष्क बना रहेगा।'}\n\nविस्तृत जानकारी के लिए नीचे "7-दिन का पूर्वानुमान" देखें।`,
      rain_today: () => isRainy
        ? `🌧️ हाँ! ${w.city} में आज बारिश की पूरी संभावना है। नमी ${w.humidity}% है।\n\n☂️ बाहर निकलते समय छाता ज़रूर साथ रखें!`
        : `☀️ नहीं, आज ${w.city} में बारिश की संभावना बहुत कम है। नमी ${w.humidity}% है और आसमान ${w.condition} है।\n\nआप बिना छाते के आराम से बाहर जा सकते हैं! 👍`,
      temperature: () => `🌡️ ${w.city} में वर्तमान तापमान ${w.temp}°C है (महसूस: ${w.feelsLike}°C)।\n\n${w.temp > 38 ? '🔥 भीषण गर्मी है! दोपहर 12 से 4 बजे तक धूप से बचें और खूब पानी पिएं।' : w.temp > 30 ? '☀️ मौसम गर्म है — पर्याप्त पानी पिएं।' : w.temp < 15 ? '🧥 ठंड का मौसम है — गर्म कपड़े पहनें।' : '😊 मौसम बहुत ही सुखद और आरामदायक है!'}`,
      irrigation: () => isRainy
        ? `💧 सिंचाई रोक दें! नमी ${w.humidity}% है और बारिश की संभावना है। खेत में जलभराव न होने दें। 🌾`
        : `💧 हाँ, आज फसल में पानी (सिंचाई) दे सकते हैं। सुबह 6-9 बजे या शाम 5 बजे के बाद सिंचाई करना सर्वोत्तम रहेगा। 🌾`,
      fishing: () => isDangerousWind
        ? `⛔ **समुद्र में न जाएं!** हवा की गति ${w.windSpeed} किमी/घंटा (${knots} समुद्री मील) है। समुद्र में ऊंची लहरें हैं। 🚫🌊`
        : `🎣 ${w.city} के तटीय क्षेत्र में स्थिति सुरक्षित है। हवा ${w.windSpeed} किमी/घंटा है। मछली पकड़ने के लिए सुबह 5:30 से 9:30 का समय अनुकूल है। ⛵`,
      wind: () => `💨 ${w.city} में हवा की गति ${w.windSpeed} किमी/घंटा है (${w.windDirection} दिशा से)।\n\n${isDangerousWind ? '⚠️ तेज हवाओं की चेतावनी!' : 'हवा की गति सामान्य है।'} 🍃`,
      outdoor: () => `${getWeatherEmoji(w.condition)} ${w.city} में मौसम ${w.condition} है (${w.temp}°C)।\n\n${isRainy ? '🌧️ बारिश की संभावना है — छाता लेकर निकलें।' : '👍 बाहर जाने और यात्रा के लिए मौसम बहुत अच्छा है!'}`,
      uv: () => `☀️ ${w.city} में यूवी (UV) इंडेक्स: ${w.uvIndex}।\n\n${w.uvIndex > 8 ? '⚠️ बहुत अधिक UV! धूप का चश्मा और सनस्क्रीन लगाएं।' : 'UV स्तर सुरक्षित है।'} 🧴`,
      humidity: () => `💧 ${w.city} में सापेक्ष आर्द्रता (नमी): ${w.humidity}%, दृश्यता: ${w.visibility} किमी है।`,
      general: () => `${getWeatherEmoji(w.condition)} ${w.city} मौसम सारांश:\n\n🌡️ तापमान: ${w.temp}°C (महसूस: ${w.feelsLike}°C)\n💧 नमी: ${w.humidity}%\n💨 हवा: ${w.windSpeed} किमी/घंटा (${w.windDirection})\n☀️ UV इंडेक्स: ${w.uvIndex}\n\n${isRainy ? '🌧️ बारिश की संभावना है — छाता साथ रखें!' : '😊 मौसम सुखद बना हुआ है!'}`
    },

    bengali: {
      greeting: () => `🙏 নমস্কার! আমি WeatherGPT।\n\n${w.city}-এ বর্তমান তাপমাত্রা ${w.temp}°C এবং আবহাওয়া ${w.condition}।\n\nবৃষ্টি, আগামীকালের পূর্বাভাস বা চাষবাস নিয়ে জিজ্ঞাসা করতে পারেন!`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city}-তে বৃষ্টির পরবর্তী পূর্বাভাস:\n\nআগামী ২-৩ দিনের মধ্যে (${rainyDay.date ? rainyDay.date.slice(5) : 'শীঘ্রই'}) বৃষ্টি হওয়ার সম্ভাবনা ${rainyDay.precipProb || 40}% (${rainyDay.condition})। বাকি দিনগুলো আবহাওয়া ভালো থাকবে। ☂️`
        : `☀️ ${w.city}-তে আগামী ৭ দিন বৃষ্টির সম্ভাবনা খুবই কম। গোটা সপ্তাহ আবহাওয়া মূলত শুকনো ও পরিষ্কার থাকবে। 👍`,
      tomorrow: () => `📅 আগামীকাল ${w.city}-র আবহাওয়ার পূর্বাভাস:\n\n🌡️ সর্বোচ্চ: ${tom.maxTemp || (w.temp + 1)}°C | সর্বনিম্ন: ${tom.minTemp || (w.temp - 6)}°C\n☁️ আকাশ: ${tom.condition || w.condition}\n💧 বৃষ্টির সম্ভাবনা: ${tom.precipProb || 15}%\n\n${(tom.precipProb || 0) > 40 ? 'কাল বৃষ্টি হতে পারে — ছাতা সাথে রাখুন!' : 'কাল আবহাওয়া মনোরম থাকবে।'}`,
      weekly: () => `📊 ${w.city}-র ৭ দিনের আবহাওয়ার সারাংশ:\n\nতাপমাত্রা ${Math.min(w.temp, tom.minTemp || 24)}°C থেকে ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C এর মধ্যে থাকবে।\n${rainyDay ? 'সপ্তাহের মাঝে হালকা বৃষ্টির সম্ভাবনা রয়েছে।' : 'পুরো সপ্তাহ আবহাওয়া শুষ্ক থাকবে।'}\n\nবিস্তারিত দেখতে নিচে "৭ দিনের পূর্বাভাস" দেখুন।`,
      rain_today: () => isRainy
        ? `🌧️ হ্যাঁ! ${w.city}-তে আজ বৃষ্টি হওয়ার প্রবল সম্ভাবনা রয়েছে। আর্দ্রতা ${w.humidity}%।\n\n☂️ বাইরে বের হলে ছাতা সাথে রাখতে ভুলবেন না!`
        : `☀️ না, আজ ${w.city}-তে বৃষ্টির সম্ভাবনা নেই। আর্দ্রতা ${w.humidity}%।\n\nছাতা ছাড়াই নিরাপদে বের হতে পারেন! 👍`,
      temperature: () => `🌡️ ${w.city}-তে বর্তমান তাপমাত্রা ${w.temp}°C (অনুভূত: ${w.feelsLike}°C)।\n\n${w.temp > 38 ? '🔥 তীব্র গরম! দুপুর ১২টা থেকে ৪টা পর্যন্ত রোদ এড়িয়ে চলুন এবং প্রচুর জল পান করুন।' : '😊 আবহাওয়া মনোরম রয়েছে।'}`,
      irrigation: () => isRainy ? `💧 সেচ দেওয়া স্থগিত রাখুন! বৃষ্টির সম্ভাবনা রয়েছে। 🌾` : `💧 হ্যাঁ, আজ ফসলে সেচ দেওয়া যেতে পারে। সকাল বা বিকেলের সময় সবচেয়ে ভালো। 🌾`,
      fishing: () => isDangerousWind ? `⛔ **সমুদ্রে যাবেন না!** বাতাসের গতিবেগ ${w.windSpeed} কিমি/ঘণ্টা। উত্তাল ঢেউ। 🚫🌊` : `🎣 ${w.city} উপকূলীয় অঞ্চল নিরাপদ। সকাল ৫:৩০ থেকে ৯:৩০ মাছ ধরার জন্য সেরা সময়। ⛵`,
      wind: () => `💨 বাতাসের গতিবেগ ${w.windSpeed} কিমি/ঘণ্টা (${w.windDirection} দিক থেকে)। 🍃`,
      outdoor: () => `${getWeatherEmoji(w.condition)} বাইরে যাওয়ার জন্য আবহাওয়া ${isRainy ? 'বৃষ্টি হতে পারে, ছাতা রাখুন।' : 'বেশ ভালো ও অনুকূল।'}` ,
      uv: () => `☀️ UV সূচক: ${w.uvIndex}। ${w.uvIndex > 8 ? 'সানস্ক্রিন ও সানগ্লাস ব্যবহার করুন।' : 'নিরাপদ।'} 🧴`,
      humidity: () => `💧 আপেক্ষিক আর্দ্রতা: ${w.humidity}%, দৃশ্যমানতা: ${w.visibility} কিমি।`,
      general: () => `${getWeatherEmoji(w.condition)} ${w.city}-র আবহাওয়া:\n\n🌡️ তাপমাত্রা: ${w.temp}°C (অনুভূত: ${w.feelsLike}°C)\n💧 আর্দ্রতা: ${w.humidity}%\n💨 বাতাস: ${w.windSpeed} কিমি/ঘণ্টা (${w.windDirection})\n☀️ UV: ${w.uvIndex}\n\n${isRainy ? '🌧️ বৃষ্টি হতে পারে, ছাতা রাখুন!' : '😊 আবহাওয়া ভালো রয়েছে!'}`
    },

    tamil: {
      greeting: () => `🙏 வணக்கம்! நான் WeatherGPT.\n\n${w.city} பகுதியில் தற்போது வெப்பநிலை ${w.temp}°C, வானிலை ${w.condition}.\n\nமழை, நாளைய வானிலை, பாசனம் பற்றி என்னிடம் கேட்கலாம்!`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} பகுதியில் அடுத்த மழை வாய்ப்பு:\n\nஅடுத்த 2-3 நாட்களில் மழை பெய்ய ${rainyDay.precipProb || 40}% வாய்ப்புள்ளது. மற்ற நாட்களில் வானிலை சீராக இருக்கும். ☂️`
        : `☀️ ${w.city} பகுதியில் அடுத்த 7 நாட்களுக்கு மழைக்கு வாய்ப்பில்லை. வானிலை வறண்டு காணப்படும். 👍`,
      tomorrow: () => `📅 நாளை ${w.city} வானிலை:\n\n🌡️ அதிகபட்சம்: ${tom.maxTemp || (w.temp + 1)}°C | குறைந்தபட்சம்: ${tom.minTemp || (w.temp - 6)}°C\n☁️ நிலை: ${tom.condition || w.condition}\n💧 மழை வாய்ப்பு: ${tom.precipProb || 15}%`,
      weekly: () => `📊 ${w.city} 7-நாள் வானிலை நிலவரம்:\n\nவெப்பநிலை ${Math.min(w.temp, tom.minTemp || 24)}°C முதல் ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C வரை இருக்கும். வானிலை பெரும்பாலும் சீராக இருக்கும்.`,
      rain_today: () => isRainy
        ? `🌧️ ஆம்! ${w.city} பகுதியில் இன்று மழை பெய்ய வாய்ப்புள்ளது. ஈரப்பதம் ${w.humidity}%.\n\n☂️ வெளியே செல்லும்போது குடை எடுத்துச் செல்லுங்கள்!`
        : `☀️ இல்லை, ${w.city} பகுதியில் இன்று மழைக்கு வாய்ப்பு குறைவு. ஈரப்பதம் ${w.humidity}%. குடை தேவையில்லை! 👍`,
      temperature: () => `🌡️ ${w.city} பகுதியில் வெப்பநிலை ${w.temp}°C (உணரப்படுவது: ${w.feelsLike}°C).\n\n${w.temp > 38 ? '🔥 அதிக வெப்பம்! நிறைய தண்ணீர் குடியுங்கள்.' : '😊 வானிலை இதமாக உள்ளது.'}`,
      irrigation: () => isRainy ? `💧 மழை வாய்ப்புள்ளதால் பாசனத்தைத் தவிர்க்கவும். 🌾` : `💧 ஆம், இன்று பாசனம் செய்யலாம். காலை அல்லது மாலை வேளை சிறந்தது. 🌾`,
      fishing: () => isDangerousWind ? `⛔ **கடலுக்கு செல்ல வேண்டாம்!** காற்று வேகம் அதிகம். 🚫🌊` : `🎣 ${w.city} கடல் பகுதி பாதுகாப்பானது. காலை 5:30 - 9:30 சிறந்த நேரம். ⛵`,
      wind: () => `💨 காற்றின் வேகம் மணிக்கு ${w.windSpeed} கி.மீ. 🍃`,
      outdoor: () => `${getWeatherEmoji(w.condition)} வெளியே செல்ல வானிலை ${isRainy ? 'மழைக்கு வாய்ப்பு உள்ளது, குடை தேவை.' : 'நல்ல நிலையில் உள்ளது.'}`,
      uv: () => `☀️ UV குறியீடு: ${w.uvIndex}. ${w.uvIndex > 8 ? 'சன்ஸ்கிரீன் பயன்படுத்தவும்.' : 'பாதுகாப்பானது.'} 🧴`,
      humidity: () => `💧 ஈரப்பதம்: ${w.humidity}%, பார்வை தூரம்: ${w.visibility} கி.மீ.`,
      general: () => `${getWeatherEmoji(w.condition)} ${w.city} வானிலை: ${w.temp}°C, ஈரப்பதம்: ${w.humidity}%, காற்று: ${w.windSpeed} கி.மீ/மணி.`
    },

    telugu: {
      greeting: () => `🙏 నమస్కారం! నేను WeatherGPT.\n\n${w.city} లో ఇప్పుడు ఉష్ణోగ్రత ${w.temp}°C, వాతావరణం ${w.condition}.\n\nవర్షం, రేపటి వాతావరణం, పంటల గురించి నన్ను అడగండి!`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} లో తదుపరి వర్ష సూచన:\n\nరాబోయే 2-3 రోజుల్లో వర్షం పడే అవకాశం ${rainyDay.precipProb || 40}% ఉంది. మిగిలిన రోజుల్లో వాతావరణం పొడిగా ఉంటుంది. ☂️`
        : `☀️ ${w.city} లో రాబోయే 7 రోజుల్లో వర్షం పడే అవకాశం లేదు. వాతావరణం స్పష్టంగా ఉంటుంది. 👍`,
      tomorrow: () => `📅 రేపు ${w.city} వాతావరణం:\n\n🌡️ గరిష్ట: ${tom.maxTemp || (w.temp + 1)}°C | కనిష్ట: ${tom.minTemp || (w.temp - 6)}°C\n☁️ పరిస్థితి: ${tom.condition || w.condition}\n💧 వర్ష అవకాశం: ${tom.precipProb || 15}%`,
      weekly: () => `📊 ${w.city} 7 రోజుల వాతావరణ సమాచారం:\n\nఉష్ణోగ్రతలు ${Math.min(w.temp, tom.minTemp || 24)}°C నుండి ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C వరకు నమోదవుతాయి.`,
      rain_today: () => isRainy
        ? `🌧️ అవును! ${w.city} లో నేడు వర్షం పడే అవకాశం ఉంది. తేమ ${w.humidity}%.\n\n☂️ గొడుగు తీసుకెళ్లండి!`
        : `☀️ లేదు, నేడు వర్షం అవకాశం తక్కువ. తేమ ${w.humidity}%. ధైర్యంగా బయటకు వెళ్లవచ్చు! 👍`,
      temperature: () => `🌡️ ప్రస్తుత ఉష్ణోగ్రత ${w.temp}°C (అనిపించేది: ${w.feelsLike}°C).\n\n${w.temp > 38 ? '🔥 ఎండ తీవ్రత ఎక్కువ! నీరు ఎక్కువగా తాగండి.' : '😊 ఆహ్లాదకరమైన వాతావరణం.'}`,
      irrigation: () => isRainy ? `💧 వర్షం పడే అవకాశం ఉంది, నీటిపారుదల నిలిపివేయండి. 🌾` : `💧 అవును, నేడు పంటలకు నీరు పెట్టవచ్చు. ఉదయం లేదా సాయంత్రం వేళల్లో అనుకూలం. 🌾`,
      fishing: () => isDangerousWind ? `⛔ **సముద్రంలోకి వెళ్లవద్దు!** గాలులు బలంగా ఉన్నాయి. 🚫🌊` : `🎣 తీర వాతావరణం అనుకూలంగా ఉంది. ఉదయం 5:30 - 9:30 మంచి సమయం. ⛵`,
      wind: () => `💨 గాలి వేగం గంటకు ${w.windSpeed} కి.మీ. 🍃`,
      outdoor: () => `${getWeatherEmoji(w.condition)} బయటకు వెళ్లడానికి వాతావరణం ${isRainy ? 'వర్షం రావచ్చు, జాగ్రత్త.' : 'అనుకూలంగా ఉంది.'}`,
      uv: () => `☀️ UV సూచిక: ${w.uvIndex}. ${w.uvIndex > 8 ? 'సన్‌స్క్రీన్ వాడండి.' : 'సాధారణం.'} 🧴`,
      humidity: () => `💧 తేమ: ${w.humidity}%, దృశ్యత: ${w.visibility} కి.మీ.`,
      general: () => `${getWeatherEmoji(w.condition)} ${w.city} వాతావరణం: ${w.temp}°C, తేమ: ${w.humidity}%, గాలి: ${w.windSpeed} కి.మీ/గం.`
    },

    marathi: {
      greeting: () => `🙏 नमस्कार! मी WeatherGPT आहे.\n\n${w.city} मध्ये सध्या तापमान ${w.temp}°C, हवामान ${w.condition}.\n\nपाऊस, उद्याचा अंदाज किंवा शेतीकामांबद्दल मला विचारा!`,
      when_rain: () => rainyDay
        ? `🌧️ ${w.city} मध्ये पुढील पावसाची शक्यता:\n\nयेत्या २-३ दिवसांत पाऊस पडण्याची ${rainyDay.precipProb || 40}% शक्यता आहे. उर्वरित दिवस हवामान प्रामुख्याने कोरडे राहील. ☂️`
        : `☀️ ${w.city} मध्ये पुढील ७ दिवसांत पावसाची शक्यता खूपच कमी आहे. संपूर्ण आठवडा हवामान कोरडे व निरभ्र राहील. 👍`,
      tomorrow: () => `📅 उद्याचा ${w.city} हवामान अंदाज:\n\n🌡️ कमाल तापमान: ${tom.maxTemp || (w.temp + 1)}°C | किमान: ${tom.minTemp || (w.temp - 6)}°C\n☁️ हवामान: ${tom.condition || w.condition}\n💧 पावसाची शक्यता: ${tom.precipProb || 15}%`,
      weekly: () => `📊 ${w.city} चा ७ दिवसांचा हवामान अंदाज:\n\nतापमान ${Math.min(w.temp, tom.minTemp || 24)}°C ते ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C दरम्यान राहील. हवामान सामान्यतः स्वच्छ राहील.`,
      rain_today: () => isRainy
        ? `🌧️ हो! ${w.city} मध्ये आज पाऊस पडण्याची दाट शक्यता आहे. आर्द्रता ${w.humidity}% आहे.\n\n☂️ बाहेर पडताना छत्री सोबत ठेवा!`
        : `☀️ नाही, आज पावसाची शक्यता खूपच कमी आहे. आर्द्रता ${w.humidity}%. काळजी नसावी! 👍`,
      temperature: () => `🌡️ सध्याचे तापमान ${w.temp}°C (अनुभव: ${w.feelsLike}°C).\n\n${w.temp > 38 ? '🔥 खूप ऊन आहे! भरपूर पाणी प्या.' : '😊 हवामान आल्हाददायक आहे.'}`,
      irrigation: () => isRainy ? `💧 पाऊस येण्याची शक्यता असल्याने पिकांना पाणी देणे टाळा. 🌾` : `💧 हो, आज पिकांना पाणी देऊ शकता. सकाळची किंवा संध्याकाळची वेळ सर्वोत्तम. 🌾`,
      fishing: () => isDangerousWind ? `⛔ **समुद्रात जाऊ नका!** वाऱ्याचा वेग जास्त आहे. 🚫🌊` : `🎣 किनारपट्टी हवामान सुरक्षित आहे. सकाळी ५:३० - ९:३० सर्वोत्तम वेळ. ⛵`,
      wind: () => `💨 वाऱ्याचा वेग ताशी ${w.windSpeed} किमी. 🍃`,
      outdoor: () => `${getWeatherEmoji(w.condition)} बाहेर जाण्यासाठी हवामान ${isRainy ? 'पावसाची शक्यता, छत्री ठेवा.' : 'छान आहे.'}`,
      uv: () => `☀️ UV निर्देशांक: ${w.uvIndex}. 🧴`,
      humidity: () => `💧 आर्द्रता: ${w.humidity}%, दृश्यमानता: ${w.visibility} किमी.`,
      general: () => `${getWeatherEmoji(w.condition)} ${w.city} हवामान: ${w.temp}°C, आर्द्रता: ${w.humidity}%, वारा: ${w.windSpeed} किमी/तास.`
    },

    english: {
      greeting: () => `🙏 Hello! I'm WeatherGPT.\n\n${w.city} is currently at ${w.temp}°C with ${w.condition} skies.\n\nAsk me about upcoming rain, tomorrow's forecast, 7-day outlook, or crop recommendations!`,
      when_rain: () => rainyDay
        ? `🌧️ Upcoming rain forecast for ${w.city}:\n\nRain is expected in the coming days (${rainyDay.date ? rainyDay.date.slice(5) : 'next 2-3 days'}) with a ${rainyDay.precipProb || 40}% chance (${rainyDay.condition}).\n\nThe rest of the week is expected to remain largely dry. ☂️`
        : `☀️ Rain is unlikely in ${w.city} over the next 5 to 7 days.\n\nSkies will remain mostly clear and dry with no significant precipitation systems approaching. 👍`,
      tomorrow: () => `📅 Tomorrow's forecast for ${w.city}:\n\n🌡️ High: ${tom.maxTemp || (w.temp + 1)}°C | Low: ${tom.minTemp || (w.temp - 6)}°C\n☁️ Conditions: ${tom.condition || w.condition}\n💧 Rain Probability: ${tom.precipProb || 15}%\n\n${(tom.precipProb || 0) > 40 ? 'Rain is expected tomorrow — carry an umbrella!' : 'Pleasant and stable outdoor conditions expected.'}`,
      weekly: () => `📊 7-Day Weather Outlook for ${w.city}:\n\nTemperatures will range between ${Math.min(w.temp, tom.minTemp || 24)}°C and ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C.\n${rainyDay ? `Expect light showers mid-week (${rainyDay.condition}).` : 'Mainly dry and clear weather expected throughout the week.'}\n\nTap "7-Day Forecast" below for day-by-day details.`,
      rain_today: () => isRainy
        ? `🌧️ Yes! Rain is very likely in ${w.city} today. Humidity is at ${w.humidity}% with overcast skies.\n\n☂️ Don't forget to carry an umbrella!`
        : `☀️ No, rain is unlikely in ${w.city} today. Humidity is ${w.humidity}% and skies are ${w.condition}.\n\nYou're good to go without an umbrella! 👍`,
      temperature: () => `🌡️ Current temperature in ${w.city} is ${w.temp}°C (feels like ${w.feelsLike}°C).\n\n${w.temp > 38 ? '🔥 Extreme heat! Stay indoors during peak hours (12-4 PM) and drink plenty of fluids.' : w.temp > 30 ? '☀️ Warm conditions — stay hydrated.' : w.temp < 15 ? '🧥 Chilly weather — wear warm layers.' : '😊 Very pleasant and comfortable weather!'}`,
      irrigation: () => isRainy
        ? `💧 Hold off on irrigation! Humidity is high (${w.humidity}%) and rainfall is likely. Ensure proper field drainage to prevent waterlogging. 🌾`
        : `💧 Yes, suitable for crop irrigation today. Best time: early morning (6-9 AM) or evening (after 5 PM) to minimize evaporation. 🌾`,
      fishing: () => isDangerousWind
        ? `⛔ **DO NOT GO TO SEA!** Wind speed is ${w.windSpeed} km/h (${knots} knots). Hazardous rough sea conditions. Keep all boats moored. 🚫🌊`
        : `🎣 Coastal conditions near ${w.city} are safe. Wind is ${w.windSpeed} km/h. Best fishing window is 5:30 AM to 9:30 AM. ⛵`,
      wind: () => `💨 Surface wind in ${w.city} is ${w.windSpeed} km/h from the ${w.windDirection}.\n\n${isDangerousWind ? '⚠️ High wind hazard!' : w.windSpeed > 25 ? 'Moderately breezy.' : 'Gentle breeze, normal conditions.'} 🍃`,
      outdoor: () => `${getWeatherEmoji(w.condition)} Weather in ${w.city} is ${w.condition} at ${w.temp}°C.\n\n${isRainy ? '🌧️ Rain expected — keep an umbrella handy.' : '👍 Great weather for outdoor activities and travel!'}`,
      uv: () => `☀️ UV index in ${w.city} is ${w.uvIndex}.\n\n${w.uvIndex > 8 ? '⚠️ Very high UV! Apply SPF 30+ sunscreen and wear sunglasses/hat.' : 'UV levels are safe.'} 🧴`,
      humidity: () => `💧 Relative humidity in ${w.city} is ${w.humidity}% with visibility of ${w.visibility} km.`,
      general: () => `${getWeatherEmoji(w.condition)} ${w.city} Weather Summary:\n\n🌡️ Temperature: ${w.temp}°C (Feels: ${w.feelsLike}°C)\n💧 Humidity: ${w.humidity}%\n💨 Wind: ${w.windSpeed} km/h (${w.windDirection})\n☀️ UV Index: ${w.uvIndex}\n\n${isRainy ? '🌧️ Rain likely — carry an umbrella!' : '😊 Pleasant weather conditions!'}`
    }
  };

  // Map persona-specific intents
  let effectiveIntent = intent;
  if (persona === 'farmer' && (intent === 'general' || intent === 'greeting')) effectiveIntent = 'irrigation';
  if (persona === 'fisherman' && (intent === 'general' || intent === 'greeting')) effectiveIntent = 'fishing';

  const langBuilder = R[language] || R.english;
  const intentFn = langBuilder[effectiveIntent] || langBuilder.general;
  return intentFn();
}
