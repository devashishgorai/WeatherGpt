import { LANG_CODES } from './constants';

export function triggerTtsSpeech(text, language) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_CODES[language] || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
  return utterance;
}
