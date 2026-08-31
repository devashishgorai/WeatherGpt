import { NextResponse } from 'next/server';
import { CONFIG } from '@/lib/config';

export async function POST(request) {
  try {
    const { systemPrompt, conversationHistory, persona, language, weather, userQuery, forecast } = await request.json();

    // 1. Check Google Gemini API Key
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || CONFIG.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim()) {
      try {
        const geminiContents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I am WeatherGPT and will provide accurate meteorological reasoning.' }] },
          ...conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        ];

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiContents })
        });

        if (res.ok) {
          const json = await res.json();
          const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer && answer.trim()) {
            return NextResponse.json({ text: answer.trim(), provider: 'gemini' });
          }
        } else {
          console.warn('Gemini API returned status:', res.status);
        }
      } catch (gemErr) {
        console.warn('Gemini API call failed:', gemErr);
      }
    }

    // 2. Check Anthropic Claude API Key
    const claudeKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || CONFIG.CLAUDE_API_KEY;
    if (claudeKey && claudeKey.trim()) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01'
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
          const answer = json.content?.[0]?.text;
          if (answer && answer.trim()) {
            return NextResponse.json({ text: answer.trim(), provider: 'claude' });
          }
        }
      } catch (claudeErr) {
        console.warn('Claude API call failed:', claudeErr);
      }
    }

    // 3. Check OpenAI API Key
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || CONFIG.OPENAI_API_KEY;
    if (openaiKey && openaiKey.trim()) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
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
          const answer = json.choices?.[0]?.message?.content;
          if (answer && answer.trim()) {
            return NextResponse.json({ text: answer.trim(), provider: 'openai' });
          }
        }
      } catch (openaiErr) {
        console.warn('OpenAI API call failed:', openaiErr);
      }
    }

    return NextResponse.json({ text: null, provider: 'fallback' });
  } catch (err) {
    console.error('Chat API route error:', err);
    return NextResponse.json({ text: null, provider: 'fallback' }, { status: 500 });
  }
}
