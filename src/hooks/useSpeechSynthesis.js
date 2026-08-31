'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { playSequentialSpeech, playOpenAiNeuralTts, cleanTextForSpeech } from '@/lib/speech';
import { CONFIG } from '@/lib/config';

export function useSpeechSynthesis(selectedLanguage) {
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const activeAudioRef = useRef(null);
  const speechPlayerRef = useRef(null);

  // Pre-fetch voices on mount so high quality neural voices are available immediately
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = onVoicesChanged;
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, []);

  const toggleListen = useCallback(async (msg) => {
    if (typeof window === 'undefined') return;

    // 1. If currently speaking this message -> stop
    if (activeSpeakingId === msg.id) {
      if (speechPlayerRef.current) {
        speechPlayerRef.current.cancel();
        speechPlayerRef.current = null;
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setActiveSpeakingId(null);
      return;
    }

    // 2. Stop any existing playback
    if (speechPlayerRef.current) {
      speechPlayerRef.current.cancel();
      speechPlayerRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setActiveSpeakingId(msg.id);

    // 3. If OpenAI API key is configured, use Ultra-Realistic Neural Audio Studio Voice
    if (CONFIG.OPENAI_API_KEY) {
      try {
        const cleanScript = cleanTextForSpeech(msg.content, selectedLanguage);
        const audio = await playOpenAiNeuralTts(cleanScript, selectedLanguage);
        if (audio) {
          activeAudioRef.current = audio;
          audio.onended = () => {
            setActiveSpeakingId(null);
            activeAudioRef.current = null;
          };
          audio.onerror = () => {
            setActiveSpeakingId(null);
            activeAudioRef.current = null;
          };
          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('OpenAI Neural speech fallback to browser voice:', err);
      }
    }

    // 4. Enhanced Sequential Browser Speech Synthesis (Reads all sentences without cutting off)
    const player = playSequentialSpeech(msg.content, selectedLanguage, () => {
      setActiveSpeakingId(null);
      speechPlayerRef.current = null;
    });

    if (player) {
      speechPlayerRef.current = player;
    } else {
      setActiveSpeakingId(null);
    }
  }, [activeSpeakingId, selectedLanguage]);

  return {
    activeSpeakingId,
    toggleListen
  };
}
