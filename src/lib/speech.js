import { LANG_CODES } from './constants.js';
import { CONFIG } from './config.js';

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

  // 3. Remove Compass Direction acronyms (e.g. ESE, WNW, SSE)
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

  // 5. Clean colons and parentheses for smooth voice flow
  text = text.replace(/[:：]/g, ' ');
  text = text.replace(/[()（）]/g, ', ');
  text = text.replace(/[|—–_~]+/g, ', ');

  return text.trim();
}

/* ===== HIGH-FIDELITY FULL AUDIO STREAM PLAYER ===== */
export function playNativeIndianSpeech(rawText, language = 'english', onEndCallback) {
  if (typeof window === 'undefined') return null;

  const cleanScript = cleanTextForSpeech(rawText, language);
  if (!cleanScript) return null;

  const audioUrl = `/api/tts?text=${encodeURIComponent(cleanScript)}&lang=${encodeURIComponent(language)}`;
  const audio = new Audio(audioUrl);

  audio.onended = () => {
    if (onEndCallback) onEndCallback();
  };

  audio.onerror = (err) => {
    console.warn('Native audio stream error; falling back to browser SpeechSynthesis:', err);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanScript);
      utterance.lang = LANG_CODES[language] || 'en-IN';
      utterance.onend = () => {
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = () => {
        if (onEndCallback) onEndCallback();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEndCallback) onEndCallback();
    }
  };

  audio.play().catch(playErr => {
    console.warn('Audio play request failed:', playErr);
    if (onEndCallback) onEndCallback();
  });

  return {
    cancel: () => {
      audio.pause();
      audio.src = '';
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (onEndCallback) onEndCallback();
    }
  };
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
        voice: 'nova',
        speed: 0.95
      })
    });

    if (!res.ok) return null;

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    return audio;
  } catch (err) {
    console.warn('OpenAI TTS failed, falling back to native audio:', err);
    return null;
  }
}
