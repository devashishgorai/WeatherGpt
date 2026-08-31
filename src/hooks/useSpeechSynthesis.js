'use client';

import { useState, useCallback, useRef } from 'react';
import { playNativeIndianSpeech, playOpenAiNeuralTts, cleanTextForSpeech } from '@/lib/speech';
import { CONFIG } from '@/lib/config';

export function useSpeechSynthesis(selectedLanguage) {
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const activeAudioRef = useRef(null);
  const speechControllerRef = useRef(null);

  const toggleListen = useCallback(async (msg) => {
    if (typeof window === 'undefined') return;

    // 1. If currently speaking this message -> stop
    if (activeSpeakingId === msg.id) {
      if (speechControllerRef.current) {
        speechControllerRef.current.cancel();
        speechControllerRef.current = null;
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setActiveSpeakingId(null);
      return;
    }

    // 2. Stop any existing playback
    if (speechControllerRef.current) {
      speechControllerRef.current.cancel();
      speechControllerRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
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
        console.warn('OpenAI Neural speech fallback to native Indian audio:', err);
      }
    }

    // 4. Fluent Native Indian Audio Stream Player (Reads full Bengali, Hindi, Tamil, Telugu, Marathi, English)
    const controller = playNativeIndianSpeech(msg.content, selectedLanguage, () => {
      setActiveSpeakingId(null);
      speechControllerRef.current = null;
    });

    if (controller) {
      speechControllerRef.current = controller;
    } else {
      setActiveSpeakingId(null);
    }
  }, [activeSpeakingId, selectedLanguage]);

  return {
    activeSpeakingId,
    toggleListen
  };
}
