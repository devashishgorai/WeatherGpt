import { NextResponse } from 'next/server';

const LANG_MAP = {
  hindi: 'hi',
  bengali: 'bn',
  tamil: 'ta',
  telugu: 'te',
  marathi: 'mr',
  english: 'en'
};

// Split long text into <= 160 character sub-chunks for Google TTS API
function createTextChunks(text) {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).length > 150) {
      if (current.trim()) chunks.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const langKey = searchParams.get('lang') || 'english';

  if (!text || !text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  const cleanText = text.trim().slice(0, 1500);
  const targetLang = LANG_MAP[langKey] || langKey || 'en';
  const chunks = createTextChunks(cleanText);

  try {
    const audioBuffers = [];

    for (const chunk of chunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${targetLang}&client=tw-ob`;
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const buf = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(buf));
      }
    }

    if (audioBuffers.length === 0) {
      return new NextResponse('Failed to generate audio stream', { status: 502 });
    }

    const combinedBuffer = Buffer.concat(audioBuffers);

    return new NextResponse(combinedBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(combinedBuffer.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      }
    });
  } catch (err) {
    console.error('Full TTS API error:', err);
    return new NextResponse('Internal TTS Error', { status: 500 });
  }
}
