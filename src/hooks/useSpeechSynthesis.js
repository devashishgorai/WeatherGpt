'use client';

import { useState, useCallback } from 'react';
import { triggerTtsSpeech } from '@/lib/speech';

export function useSpeechSynthesis(selectedLanguage) {
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);

  const toggleListen = useCallback((msg) => {
    if (typeof window === 'undefined') return;

    if (activeSpeakingId === msg.id) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
      return;
    }

    const utterance = triggerTtsSpeech(msg.content, selectedLanguage);
    if (utterance) {
      setActiveSpeakingId(msg.id);
      utterance.onend = () => setActiveSpeakingId(null);
      utterance.onerror = () => setActiveSpeakingId(null);
    }
  }, [activeSpeakingId, selectedLanguage]);

  return {
    activeSpeakingId,
    toggleListen
  };
}
