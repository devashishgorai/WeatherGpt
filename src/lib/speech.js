import { LANG_CODES } from './constants';
import { CONFIG } from './config';

/* ===== COMPREHENSIVE TEXT PREPROCESSING FOR NATURAL HUMAN SPEECH ===== */
export function cleanTextForSpeech(rawText, language = 'english') {
  if (!rawText) return '';

  let text = String(rawText);

  // 1. Remove Markdown formatting (bold, italic, headers, blockquotes, bullets, links)
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/_(.*?)_/g, '$1');
  text = text.replace(/#{1,6}\s+/g, '');
  text = text.replace(/`{1,3}.*?`{1,3}/gs, '');
  text = text.replace(/^\s*[-*•]\s+/gm, '');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 2. Strip ALL Unicode emojis, pictographs, weather symbols, and variation selectors
  text = text.replace(/\p{Extended_Pictographic}/gu, '');
  text = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '');

  // 3. Remove Compass Direction acronyms that sound awkward in Indian languages (e.g. ESE, WNW, SSE)
  text = text.replace(/\b(ESE|WNW|NNE|SSE|NNW|SSW|ENE|WSW|NW|NE|SW|SE|N|S|E|W)\b/g, '');

  // 4. Expand meteorological units and shorthand to natural conversational phrasing
  if (language === 'bengali') {
    text = text.replace(/(\d+)\s*°C/g, '$1 ডিগ্রি সেলসিয়াস');
    text = text.replace(/(\d+)\s*°/g, '$1 ডিগ্রি');
    text = text.replace(/(\d+)\s*%/g, '$1 শতাংশ');
    text = text.replace(/(\d+)\s*(?:কিমি\/ঘণ্টা|km\/h|kmph)/gi, '$1 কিলোমিটার প্রতি ঘণ্টা');
    text = text.replace(/\bUV\s*:\s*/gi, 'ইউভি সূচক ');
    text = text.replace(/\bUV\b/gi, 'ইউভি সূচক');
  } else if (language === 'hindi') {
    text = text.replace(/(\d+)\s*°C/g, '$1 डिग्री सेल्सियस');
    text = text.replace(/(\d+)\s*°/g, '$1 डिग्री');
    text = text.replace(/(\d+)\s*%/g, '$1 प्रतिशत');
    text = text.replace(/(\d+)\s*(?:किमी\/घंटा|km\/h|kmph)/gi, '$1 किलोमीटर प्रति घंटा');
    text = text.replace(/\bUV\s*:\s*/gi, 'यूवी इंडेक्स ');
    text = text.replace(/\bUV\b/gi, 'यूवी इंडेक्स');
  } else if (language === 'tamil') {
    text = text.replace(/(\d+)\s*°C/g, '$1 டிகிரி செல்சியஸ்');
    text = text.replace(/(\d+)\s*°/g, '$1 டிகிரி');
    text = text.replace(/(\d+)\s*%/g, '$1 சதவீதம்');
    text = text.replace(/(\d+)\s*(?:கிமீ\/மணி|km\/h|kmph)/gi, '$1 கிலோமீட்டர் வேகம்');
    text = text.replace(/\bUV\s*:\s*/gi, 'யுவி குறியீடு ');
  } else if (language === 'telugu') {
    text = text.replace(/(\d+)\s*°C/g, '$1 డిగ్రీల సెల్సియస్');
    text = text.replace(/(\d+)\s*°/g, '$1 డిగ్రీలు');
    text = text.replace(/(\d+)\s*%/g, '$1 శాతం');
    text = text.replace(/(\d+)\s*(?:కి\.మీ\/గం|km\/h|kmph)/gi, '$1 కిలోమీటర్ల వేగం');
    text = text.replace(/\bUV\s*:\s*/gi, 'యువి సూచిక ');
  } else if (language === 'marathi') {
    text = text.replace(/(\d+)\s*°C/g, '$1 अंश सेल्सिअस');
    text = text.replace(/(\d+)\s*°/g, '$1 अंश');
    text = text.replace(/(\d+)\s*%/g, '$1 टक्के');
    text = text.replace(/(\d+)\s*(?:किमी\/तास|km\/h|kmph)/gi, '$1 किलोमीटर प्रति तास');
    text = text.replace(/\bUV\s*:\s*/gi, 'यूव्ही निर्देशांक ');
  } else {
    // English
    text = text.replace(/(\d+)\s*°C/g, '$1 degrees Celsius');
    text = text.replace(/(\d+)\s*°/g, '$1 degrees');
    text = text.replace(/(\d+)\s*%/g, '$1 percent');
    text = text.replace(/(\d+)\s*(?:km\/h|kmph)/gi, '$1 kilometers per hour');
    text = text.replace(/\bUV\s*:\s*/gi, 'UV index ');
  }

  // 5. Clean colons, parentheses, extra punctuation to create smooth natural pauses
  text = text.replace(/[:：]/g, ' ');
  text = text.replace(/[()（）]/g, ', ');
  text = text.replace(/[|—–_~]+/g, ', ');

  return text.trim();
}

/* ===== SPLIT TEXT INTO NATURAL SENTENCE CHUNKS ===== */
export function splitIntoSentences(text) {
  if (!text) return [];

  // Split by line breaks, periods, question marks, exclamation marks, or Hindi/Bengali purna viram (।)
  const rawSegments = text.split(/[\n\r।|!?]+|\.\s+/);

  const sentences = [];
  for (const seg of rawSegments) {
    const clean = seg.replace(/\s+/g, ' ').trim();
    if (clean.length > 0) {
      sentences.push(clean);
    }
  }

  return sentences;
}

/* ===== BEST HUMAN-LIKE NEURAL VOICE SELECTOR ===== */
export function findBestHumanVoice(language = 'english') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLangCode = (LANG_CODES[language] || 'en-IN').toLowerCase();
  const langPrefix = targetLangCode.split('-')[0];

  // Candidates matching language code or prefix
  const matchingVoices = voices.filter(v => {
    const vLang = (v.lang || '').toLowerCase().replace('_', '-');
    return vLang === targetLangCode || vLang.startsWith(langPrefix);
  });

  if (matchingVoices.length === 0) {
    // Fallback: look for Indian English or high quality English voice
    return voices.find(v => v.lang.includes('en-IN') || v.name.includes('Natural') || v.name.includes('Google')) || voices[0];
  }

  // Rank matching voices by naturalness & neural capability:
  // 1. "Online (Natural)" or "Neural" (Microsoft Edge / Windows 11 Natural Voices)
  const naturalVoice = matchingVoices.find(v => 
    v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')
  );
  if (naturalVoice) return naturalVoice;

  // 2. Google High-Definition Voices (Chrome)
  const googleVoice = matchingVoices.find(v => 
    v.name.toLowerCase().includes('google')
  );
  if (googleVoice) return googleVoice;

  // 3. Apple/Siri Premium Voices (macOS/iOS)
  const premiumVoice = matchingVoices.find(v => 
    v.name.toLowerCase().includes('premium') || v.name.toLowerCase().includes('enhanced') || v.name.toLowerCase().includes('siri')
  );
  if (premiumVoice) return premiumVoice;

  // 4. Exact locale match (e.g. bn-IN, hi-IN, ta-IN, te-IN, mr-IN)
  const exactLocaleVoice = matchingVoices.find(v => 
    v.lang.toLowerCase().replace('_', '-') === targetLangCode
  );
  if (exactLocaleVoice) return exactLocaleVoice;

  return matchingVoices[0];
}

/* ===== STUDIO NEURAL TTS (OpenAI TTS Engine Fallback) ===== */
export async function playOpenAiNeuralTts(text, language = 'english') {
  if (!CONFIG.OPENAI_API_KEY) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 2000),
        voice: 'nova', // Warm, expressive, human-like voice
        speed: 0.95
      })
    });

    if (!res.ok) return null;

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    return audio;
  } catch (err) {
    console.warn('OpenAI TTS failed, falling back to browser speech:', err);
    return null;
  }
}

/* ===== UNINTERRUPTED SEQUENTIAL SPEECH ENGINE ===== */
export function playSequentialSpeech(rawText, language = 'english', onEndCallback) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  window.speechSynthesis.cancel();

  // 1. Clean the full text
  const cleanScript = cleanTextForSpeech(rawText, language);
  if (!cleanScript) return null;

  // 2. Split into clean individual sentences
  const sentences = splitIntoSentences(cleanScript);
  if (sentences.length === 0) return null;

  const bestVoice = findBestHumanVoice(language);
  const langCode = LANG_CODES[language] || 'en-IN';

  let currentIndex = 0;
  let isCancelled = false;

  function speakNext() {
    if (isCancelled) return;

    if (currentIndex >= sentences.length) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const sentence = sentences[currentIndex];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = langCode;

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Natural human cadence
    utterance.rate = 0.94;
    utterance.pitch = 1.02;

    utterance.onend = () => {
      if (!isCancelled) {
        currentIndex++;
        speakNext();
      }
    };

    utterance.onerror = (err) => {
      console.warn('Speech chunk error:', err);
      if (!isCancelled) {
        currentIndex++;
        speakNext();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  // Start sequential playback
  speakNext();

  return {
    cancel: () => {
      isCancelled = true;
      window.speechSynthesis.cancel();
      if (onEndCallback) onEndCallback();
    }
  };
}
