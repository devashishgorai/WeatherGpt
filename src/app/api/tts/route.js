import { NextResponse } from 'next/server';

const LANG_MAP = {
  hindi: 'hi',
  bengali: 'bn',
  tamil: 'ta',
  telugu: 'te',
  marathi: 'mr',
  english: 'en'
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const langKey = searchParams.get('lang') || 'english';

  if (!text || !text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  const cleanText = text.trim().slice(0, 500);
  const targetLang = LANG_MAP[langKey] || langKey || 'en';

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${targetLang}&client=tw-ob`;
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch TTS audio', { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      }
    });
  } catch (err) {
    console.error('TTS API error:', err);
    return new NextResponse('Internal TTS Error', { status: 500 });
  }
}
