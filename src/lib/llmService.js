import { CONFIG } from './config.js';
import { PERSONA_CONFIG } from './constants.js';
import { getWeatherEmoji } from './weatherApi.js';

function normalizePersona(persona) {
  return PERSONA_CONFIG[persona] ? persona : 'citizen';
}

function getPersonaPromptLine(persona) {
  const role = PERSONA_CONFIG[normalizePersona(persona)] || PERSONA_CONFIG.citizen;
  return `
PERSONA CONTEXT:
- Role: ${role.label}
- Core focus: ${role.focus}
- Response lens: ${role.responseInstructions}
- Relevant weather signals: ${role.relevantWeatherMetrics.join(', ')}`;
}

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

/* ===== BUILD SYSTEM PROMPT FOR GENERATIVE AI ===== */
export function buildSystemPrompt(persona, language, weatherSummary) {
  const normalizedPersona = normalizePersona(persona);
  const role = PERSONA_CONFIG[normalizedPersona] || PERSONA_CONFIG.citizen;
  const languageInstruction = language === 'bengali'
    ? 'বাংলা মোড: সম্পূর্ণ উত্তর বাংলায় লিখুন। ইংরেজি বা রোমান হরফ ব্যবহার করবেন না, আবহাওয়ার টেকনিক্যাল শব্দের প্রয়োজন হলে তার বাংলা ব্যাখ্যা দিন।'
    : `Respond directly in the native script for ${language}.`;

  return `You are WeatherGPT, an expert AI meteorological assistant for India with deep localized reasoning.

USER PROFILE:
- Selected Role: ${role.label.toUpperCase()} (${role.key})
- Language: ${language.toUpperCase()}
- ${languageInstruction}

${getPersonaPromptLine(normalizedPersona)}

LIVE METEOROLOGICAL CONTEXT:
${weatherSummary}

INSTRUCTIONS:
1. Directly answer the user's specific question first. If they ask about "tomorrow" (e.g. "kaal ki bristi hbe", "kal ka mausam"), check tomorrow's forecast specifically and DO NOT confuse it with today.
2. If the user writes in Romanized transliteration (Banglish, Hinglish, etc.), understand their intent and respond in the chosen language's native script.
3. Tailor the advice to their persona (e.g. irrigation/crops for Farmer, waves/winds for Fisherman, safety for Disaster Manager, daily commute/travel for Citizen).
4. Keep the answer natural, thoughtful, 3-6 sentences, with real meteorological reasoning.`;
}

/* ===== MULTI-PROVIDER GENERATIVE AI DISPATCHER ===== */
export async function executeClaudeRequest(systemPrompt, conversationHistory, extraContext = {}) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        conversationHistory,
        ...extraContext
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.text && data.text.trim()) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn('Serverless AI route error, using local reasoning engine:', err);
  }

  throw new Error('No live LLM key active. Falling back to local reasoning.');
}

/* ===== ADVANCED DYNAMIC METEOROLOGICAL REASONING ENGINE ===== */
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
  const isStormyToday = condLower.includes('thunder') || condLower.includes('storm') || condLower.includes('cyclone');
  const isRainyToday = isStormyToday || condLower.includes('rain') || condLower.includes('drizzle') || (w.humidity || 0) > 80;
  const isExtremeHeat = (w.temp || 0) >= 38 || (w.feelsLike || 0) >= 40;
  const isDangerousWind = (w.windSpeed || 0) > 28;
  const knots = Math.round((w.windSpeed || 10) * 0.539957);

  // Tomorrow's Forecast data from forecast API
  const tom = forecast?.daily?.[1] || {
    maxTemp: w.temp ? w.temp + 1 : 30,
    minTemp: w.temp ? w.temp - 6 : 24,
    condition: isRainyToday ? 'Partly Cloudy' : 'Clear',
    precipProb: 15
  };
  const tomCondLower = (tom.condition || '').toLowerCase();
  const isRainyTomorrow = (tom.precipProb || 0) >= 40 || tomCondLower.includes('rain') || tomCondLower.includes('thunder') || tomCondLower.includes('storm');

  // Next 7 days rainy day lookup
  const rainyDay = (forecast?.daily || []).find((d, idx) => 
    idx > 0 && ((d.condition || '').toLowerCase().includes('rain') || (d.precipProb || 0) > 40)
  );

  const q = (userQuery || '').toLowerCase().trim();
  const resolvedPersona = normalizePersona(persona);
  const roleConfig = PERSONA_CONFIG[resolvedPersona] || PERSONA_CONFIG.citizen;
  const personaGuidance = roleConfig.responseInstructions || roleConfig.focus;

  /* ===== TEMPORAL PARSING (CRITICAL: Checked FIRST before topic) ===== */
  const isTomorrowQuery = (
    q.includes('tomorrow') || q.includes('kal') || q.includes('kaal') || 
    q.includes('agami') || q.includes('naalai') || q.includes('repu') || 
    q.includes('udya') || q.includes('poroshu') || q.includes('parso')
  );

  const isWeeklyQuery = (
    q.includes('week') || q.includes('7 day') || q.includes('hafta') || 
    q.includes('shoptaho') || q.includes('vaaram') || q.includes('aathavada') || 
    q.includes('weekend') || q.includes('sunday') || q.includes('saturday') || 
    q.includes('robibar') || q.includes('chuti')
  );

  const isRainQuery = (
    q.includes('rain') || q.includes('barish') || q.includes('bristi') || 
    q.includes('brishti') || q.includes('mazhai') || q.includes('varsham') || 
    q.includes('paus') || q.includes('chata') || q.includes('umbrella') || 
    q.includes('jol') || q.includes('bheegna') || q.includes('megh') || 
    q.includes('badal') || q.includes('pani')
  );

  const isOutdoorQuery = (
    q.includes('gurte') || q.includes('ghurte') || q.includes('jawa') || 
    q.includes('jaoa') || q.includes('berono') || q.includes('uchit') || 
    q.includes('bahar') || q.includes('nikal') || q.includes('travel') || 
    q.includes('trip') || q.includes('visit') || q.includes('ghumte') || 
    q.includes('baire') || q.includes('jaana') || q.includes('chahiye') || 
    q.includes('outside') || q.includes('veli') || q.includes('pona') || 
    q.includes('vellala') || q.includes('firna') || q.includes('jaau') || 
    q.includes('picnic') || q.includes('walk') || q.includes('jabo')
  );

  const isFarmingQuery = (
    resolvedPersona === 'farmer' || q.includes('sinchai') || q.includes('sech') || 
    q.includes('irrigation') || q.includes('fasal') || q.includes('crop') || 
    q.includes('khet') || q.includes('chash') || q.includes('dhan') || 
    q.includes('alu') || q.includes('sar') || q.includes('fertilizer') || 
    q.includes('katayi') || q.includes('harvest')
  );

  const isFishingQuery = (
    resolvedPersona === 'fisherman' || q.includes('fish') || q.includes('mach') || 
    q.includes('machli') || q.includes('sea') || q.includes('samundar') || 
    q.includes('somudro') || q.includes('boat') || q.includes('noka') || 
    q.includes('trawler') || q.includes('wave') || q.includes('dheu')
  );

  if (language !== 'bengali' && resolvedPersona === 'farmer' && (isRainQuery || isFarmingQuery)) {
    return isRainyToday
      ? `🌾 **Farmer advisory for ${w.city}:**\n\nSoil moisture is high (${w.humidity}%) and rain is likely. Hold off on extra irrigation, clear drainage channels, and avoid spraying during active wet conditions. ${personaGuidance}`
      : `🌾 **Farmer advisory for ${w.city}:**\n\nConditions are dry and suitable for fieldwork. Schedule irrigation or crop checks during the cooler parts of the day and keep an eye on moisture levels.`;
  }

  if (language !== 'bengali' && resolvedPersona === 'fisherman') {
    return (isDangerousWind || isStormyToday)
      ? `⛔ **Fisherman safety check for ${w.city}:**\n\nWind is ${w.windSpeed} km/h and current conditions are ${w.condition}. Sea conditions are not favorable, so postpone travel and stay close to shore unless the forecast improves.`
      : `🎣 **Fishing conditions for ${w.city}:**\n\nWind is ${w.windSpeed} km/h and rain risk is ${isRainyToday ? 'elevated' : 'low'}. Early morning or calmer windows are usually the safest and most productive time to head out.`;
  }

  if (language !== 'bengali' && resolvedPersona === 'disaster') {
    return `🚨 **Disaster management briefing for ${w.city}:**\n\nRain risk is ${isRainyToday ? 'elevated' : 'moderate'}, humidity is ${w.humidity}%, and winds are ${w.windSpeed} km/h. Focus monitoring on low-lying areas, waterlogged roads, and drainage points; escalate preparedness if heavy rain intensifies.`;
  }

  if (language !== 'bengali' && resolvedPersona === 'citizen') {
    return `👤 **Citizen weather check for ${w.city}:**\n\nCurrent conditions are ${w.condition} with ${w.temp}°C and ${w.humidity}% humidity. For comfort and daily planning, carry an umbrella or plan a lighter commute if rain or strong wind picks up. ${personaGuidance}`;
  }

  /* ===== BENGALI GENERATOR ===== */
  if (language === 'bengali') {
    // 1. Tomorrow Specific Queries
    if (isTomorrowQuery) {
      if (isRainQuery) {
        if (isRainyTomorrow) {
          return `🌧️ **হ্যাঁ, আগামীকাল ${w.city}-এ বৃষ্টির সম্ভাবনা রয়েছে!**\n\nআগামীকালের পূর্বাভাস অনুযায়ী আকাশ ${tom.condition || 'মেঘলা'} থাকবে এবং বৃষ্টির সম্ভাবনা প্রায় ${tom.precipProb || 65}%। তাপমাত্রা সর্বোচ্চ ${tom.maxTemp}°C এবং সর্বনিম্ন ${tom.minTemp}°C থাকবে।\n\n${persona === 'farmer' ? '🌾 **চাষীদের পরামর্শ:** বৃষ্টির সম্ভাবনা থাকায় আগামীকাল জমিতে বাড়তি সেচ দেওয়া স্থগিত রাখুন।' : '☂️ আগামীকাল বাইরে যাওয়ার পরিকল্পনা থাকলে ছাতা সাথে রাখুন।'}`;
        } else {
          return `☀️ **না, আগামীকাল ${w.city}-এ বৃষ্টির সম্ভাবনা নেই বললেই চলে!**\n\nপূর্বাভাস অনুযায়ী আগামীকালের আবহাওয়া মূলত **${tom.condition || 'পরিষ্কার/রোদেলা'}** থাকবে এবং বৃষ্টির সম্ভাবনা মাত্র ${tom.precipProb || 15}%। তাপমাত্রা সর্বোচ্চ ${tom.maxTemp}°C এবং সর্বনিম্ন ${tom.minTemp}°C থাকবে।\n\n${persona === 'farmer' ? '🌾 **চাষীদের পরামর্শ:** আবহাওয়া শুষ্ক থাকবে, তাই সকালে জমিতে প্রয়োজনীয় সেচ বা কীটনাশক স্প্রে করতে পারেন।' : '👍 আপনি নিশ্চিন্তে আগামীকালের কাজ বা ভ্রমণের পরিকল্পনা করতে পারেন!'}`;
        }
      }

      return `📅 **আগামীকাল (${w.city}) আবহাওয়ার পূর্বাভাস:**\n\n• আকাশ: ${tom.condition || w.condition}\n• সর্বোচ্চ তাপমাত্রা: ${tom.maxTemp}°C | সর্বনিম্ন: ${tom.minTemp}°C\n• বৃষ্টির সম্ভাবনা: ${tom.precipProb || 15}%\n\n${isRainyTomorrow ? '🌧️ কাল বৃষ্টির সম্ভাবনা রয়েছে — ছাতা সাথে রাখুন।' : '😊 কাল আবহাওয়া মূলত মনোরম ও স্থিতিশীল থাকার সম্ভাবনা রয়েছে।'}`;
    }

    // 2. Weekly Queries
    if (isWeeklyQuery) {
      return `📊 **${w.city}-র আগামী ৭ দিনের আবহাওয়া পূর্বাভাস:**\n\nতাপমাত্রা ${Math.min(w.temp, tom.minTemp || 24)}°C থেকে ${Math.max(w.temp + 2, tom.maxTemp || 35)}°C এর মধ্যে ওঠানামা করবে।\n${rainyDay ? `সপ্তাহের মাঝে (${rainyDay.date ? rainyDay.date.slice(5) : 'কয়েক দিনের মধ্যে'}) বৃষ্টির সম্ভাবনা (${rainyDay.precipProb}%) রয়েছে।` : 'পুরো সপ্তাহ আবহাওয়া মূলত শুষ্ক ও স্বাভাবিক থাকবে।'}\n\nদিনভিত্তিক বিস্তারিত দেখতে নিচে "৭ দিনের পূর্বাভাস" বোতামে চাপ দিন।`;
    }

    // 3. Outdoor / Travel Feasibility
    if (isOutdoorQuery) {
      if (isStormyToday) {
        return `⛔ **না, আজ এখন বাইরে বের হওয়া বা ঘুরতে যাওয়া একদম উচিত নয়!**\n\n${w.city}-এ বর্তমানে **${w.condition} (বজ্রঝড়)** চলছে। তাপমাত্রা ${w.temp}°C (অনুভূত ${w.feelsLike}°C), আর্দ্রতা ${w.humidity}% এবং তীব্র বজ্রপাতের ঝুঁকি রয়েছে।\n\n🏠 ঝড় না থামা পর্যন্ত নিরাপদ আশ্রয়ে থাকুন।`;
      }
      if (isRainyToday) {
        return `🌧️ **বাইরে যাওয়ার আগে সতর্কতা:**\n\n${w.city}-এ আজ বৃষ্টির সম্ভাবনা রয়েছে এবং আকাশ মেঘলা। আর্দ্রতা ${w.humidity}%। বাইরে বের হলে অবশ্যই ছাতা বা রেইনকোট সাথে রাখুন।`;
      }
      return `✅ **হ্যাঁ, আজ বাইরে যাওয়া বা ঘুরতে বের হওয়ার জন্য আবহাওয়া অনুকূল!**\n\nবর্তমান তাপমাত্রা ${w.temp}°C এবং আবহাওয়া ${w.condition}। আপনার ভ্রমণ শুভ হোক! 😊`;
    }

    // 4. Today Rain Queries
    if (isRainQuery) {
      return isRainyToday
        ? `🌧️ **হ্যাঁ!** ${w.city}-এ আজ বৃষ্টি বা বজ্রবৃষ্টির সম্ভাবনা রয়েছে। বর্তমান আর্দ্রতা ${w.humidity}%। বাইরে বের হলে ছাতা সাথে রাখবেন!`
        : `☀️ **না,** আজ ${w.city}-এ বৃষ্টির সম্ভাবনা খুব কম। আকাশ ${w.condition} এবং আর্দ্রতা ${w.humidity}%। আপনি নিশ্চিন্তে বের হতে পারেন!`;
    }

    // 5. Farming Queries
    if (isFarmingQuery) {
      return isRainyToday
        ? `🌾 **কৃষি পরামর্শ (${w.city}):**\n\nমাটিতে আর্দ্রতা বেশি (${w.humidity}%) এবং বৃষ্টির সম্ভাবনা রয়েছে। আজ জমিতে সেচ বা রাসায়নিক স্প্রে করা স্থগিত রাখুন এবং অতিরিক্ত জল নিষ্কাশনের নালা পরিষ্কার রাখুন। 💧`
        : `🌾 **কৃষি পরামর্শ (${w.city}):**\n\nআজকের আবহাওয়া অনুকূল রয়েছে। সকালে বা বিকেলে ফসলে প্রয়োজনমাফিক সেচ দেওয়া এবং আগাছা পরিষ্কার করা যেতে পারে। 👍`;
    }

    // 6. Fishing Queries
    if (isFishingQuery) {
      return (isDangerousWind || isStormyToday)
        ? `⛔ **সমুদ্রে যাবেন না!** বাতাসের গতি ${w.windSpeed} কিমি/ঘণ্টা (${knots} নট) এবং আবহাওয়া প্রতিকূল। নৌকা তীরে বেঁধে রাখুন। 🚫🌊`
        : `🎣 **উপকূলীয় পরিস্থিতি নিরাপদ।** বাতাসের গতি ${w.windSpeed} কিমি/ঘণ্টা। মাছ ধরার জন্য ভোরবেলা ও সকালের সময় অনুকূল। ⛵`;
    }

    // General Fallback
    return `📍 **${w.city}-র বর্তমান আবহাওয়া পর্যবেক্ষণ:**\n\n• তাপমাত্রা: ${w.temp}°C (অনুভূত: ${w.feelsLike}°C)\n• অবস্থা: ${w.condition}\n• আর্দ্রতা: ${w.humidity}% | বাতাস: ${w.windSpeed} কিমি/ঘণ্টা\n\n${isStormyToday ? '⚠️ বজ্রঝড়ের সতর্কতা রয়েছে — নিরাপদে থাকুন।' : isRainyToday ? '🌧️ বৃষ্টির সম্ভাবনা রয়েছে — সাথে ছাতা রাখুন।' : '😊 আবহাওয়া মনোরম ও স্থিতিশীল রয়েছে।'}`;
  }

  /* ===== HINDI GENERATOR ===== */
  if (language === 'hindi') {
    if (isTomorrowQuery) {
      if (isRainQuery) {
        return isRainyTomorrow
          ? `🌧️ **हाँ, कल ${w.city} में बारिश होने की संभावना है!**\n\nपूर्वानुमान के अनुसार कल आसमान ${tom.condition || 'बादल छाए रहेंगे'} और बारिश की संभावना ${tom.precipProb || 60}% है। अधिकतम तापमान ${tom.maxTemp}°C रहेगा।\n\n${persona === 'farmer' ? '🌾 **किसान सलाह:** बारिश की संभावना को देखते हुए कल सिंचाई रोकें।' : '☂️ कल बाहर जाते समय छाता अवश्य साथ रखें।'}`
          : `☀️ **नहीं, कल ${w.city} में बारिश की संभावना बहुत कम है!**\n\nकल का मौसम मुख्यतः **${tom.condition || 'साफ व शुष्क'}** रहेगा और बारिश की संभावना मात्र ${tom.precipProb || 15}% है। अधिकतम तापमान ${tom.maxTemp}°C और न्यूनतम ${tom.minTemp}°C रहेगा।\n\n${persona === 'farmer' ? '🌾 **किसान सलाह:** कल मौसम साफ रहेगा, आप सुबह सिंचाई या कीटनाशक छिड़काव कर सकते हैं।' : '👍 आप बिना चिंता के कल की यात्रा या काम की योजना बना सकते हैं!'}`;
      }
      return `📅 **कल का मौसम पूर्वानुमान (${w.city}):**\n\n• स्थिति: ${tom.condition || w.condition}\n• तापमान: अधिकतम ${tom.maxTemp}°C | न्यूनतम ${tom.minTemp}°C\n• बारिश की संभावना: ${tom.precipProb || 15}%\n\n${isRainyTomorrow ? 'कल बारिश हो सकती है — छाता साथ रखें।' : 'कल मौसम सुखद और अनुकूल रहेगा।'}`;
    }

    if (isOutdoorQuery) {
      if (isStormyToday) return `⛔ **नहीं, अभी बाहर घूमने या यात्रा पर जाना बिल्कुल सुरक्षित नहीं है!**\n\n${w.city} में वर्तमान में **${w.condition} (आंधी-तूफान)** चल रहा है। कृपया सुरक्षित पक्के मकान में ही रहें। 🏠`;
      if (isRainyToday) return `🌧️ **बाहर जाने से पहले सावधानी:** आज ${w.city} में बारिश की संभावना है। छाता या रेनकोट साथ रखें। ☂️`;
      return `✅ **हाँ! आज बाहर जाने, घूमने या यात्रा के लिए मौसम बहुत ही अनुकूल है!** तापमान ${w.temp}°C है। अपनी यात्रा का आनंद लें! 😊`;
    }

    if (isRainQuery) {
      return isRainyToday
        ? `🌧️ **हाँ!** आज ${w.city} में बारिश की पूरी संभावना है। नमी ${w.humidity}% है। छाता साथ रखें!`
        : `☀️ **नहीं,** आज ${w.city} में बारिश की संभावना बहुत कम है। आसमान ${w.condition} है।`;
    }

    if (isFarmingQuery) {
      return isRainyToday
        ? `🌾 **किसान भाइयों के लिए सलाह:** नमी अधिक (${w.humidity}%) है और वर्षा की संभावना है। सिंचाई रोकें और खेतों से जल निकासी का प्रबंध रखें। 💧`
        : `🌾 **किसान भाइयों के लिए सलाह:** मौसम अनुकूल है। आवश्यकतानुसार फसलों में सुबह या शाम के समय पानी (सिंचाई) दें। 👍`;
    }

    return `📍 **${w.city} मौसम सारांश:**\n\n• तापमान: ${w.temp}°C (महसूस: ${w.feelsLike}°C)\n• मौसम: ${w.condition}\n• नमी: ${w.humidity}% | हवा: ${w.windSpeed} किमी/घंटा\n\n${isStormyToday ? '⚠️ तूफान से सावधान रहें।' : isRainyToday ? '🌧️ बारिश की संभावना है।' : '😊 मौसम सुखद बना हुआ है!'}`;
  }

  /* ===== ENGLISH GENERATOR ===== */
  if (isTomorrowQuery) {
    if (isRainQuery) {
      return isRainyTomorrow
        ? `🌧️ **Yes, rain is expected in ${w.city} tomorrow!**\n\nTomorrow's forecast indicates **${tom.condition || 'Showers'}** with approximately ${tom.precipProb || 60}% chance of rain. Expected temperatures: High of ${tom.maxTemp}°C and Low of ${tom.minTemp}°C.\n\n${persona === 'farmer' ? '🌾 **Farmer Advisory:** Hold off on irrigation tomorrow as natural precipitation is expected.' : '☂️ Remember to carry an umbrella or raincoat if stepping out tomorrow!'}`
        : `☀️ **No, rain is unlikely in ${w.city} tomorrow!**\n\nSkies are forecast to be largely **${tom.condition || 'Partly Cloudy / Clear'}** with only a ${tom.precipProb || 15}% precipitation probability. Temperature will reach a high of ${tom.maxTemp}°C and low of ${tom.minTemp}°C.\n\n${persona === 'farmer' ? '🌾 **Farmer Advisory:** Conditions will be dry and suitable for scheduled irrigation or spraying.' : '👍 Excellent conditions for outdoor work and travel tomorrow!'}`;
    }
    return `📅 **Tomorrow's Forecast for ${w.city}:**\n\n• Conditions: ${tom.condition || w.condition}\n• High / Low: ${tom.maxTemp}°C / ${tom.minTemp}°C\n• Rain Probability: ${tom.precipProb || 15}%\n\n${isRainyTomorrow ? '🌧️ Rain expected tomorrow — keep an umbrella handy.' : '😊 Pleasant outdoor conditions expected.'}`;
  }

  if (isOutdoorQuery) {
    if (isStormyToday) return `⛔ **No, going out right now is NOT recommended!**\n\nThere is an active **${w.condition}** in ${w.city}. Please remain indoors in a safe shelter. 🏠`;
    if (isRainyToday) return `🌧️ **Caution advised outdoors:** Rain or drizzle likely in ${w.city} today. Carry an umbrella. ☂️`;
    return `✅ **Yes! Weather in ${w.city} is pleasant and very favorable for going out and traveling!** 😊`;
  }

  if (isRainQuery) {
    return isRainyToday
      ? `🌧️ **Yes!** Rain is likely in ${w.city} today with ${w.humidity}% humidity. Keep an umbrella handy!`
      : `☀️ **No,** rain is unlikely in ${w.city} today. Skies are ${w.condition}. You're good to go! 👍`;
  }

  return `📍 **${w.city} Weather Briefing:**\n\n• Temperature: ${w.temp}°C (Feels like: ${w.feelsLike}°C)\n• Condition: ${w.condition}\n• Humidity: ${w.humidity}% | Wind: ${w.windSpeed} km/h\n\n${isStormyToday ? '⚠️ Active severe weather alert.' : isRainyToday ? '🌧️ Showers expected today.' : '😊 Stable weather conditions.'}`;
}
