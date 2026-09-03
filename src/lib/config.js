// Configuration helper for API keys (with localStorage sync in browser)
export const CONFIG = {
  GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
  get CLAUDE_API_KEY() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('weathergpt_claude_key') || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || "";
    }
    return process.env.NEXT_PUBLIC_CLAUDE_API_KEY || "";
  },
  get GEMINI_API_KEY() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('weathergpt_gemini_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    }
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  },
  get OPENAI_API_KEY() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('weathergpt_openai_key') || process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
    }
    return process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
  },
  saveKey(provider, key) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`weathergpt_${provider}_key`, key.trim());
    }
  }
};
