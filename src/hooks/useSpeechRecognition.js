'use client';

import { useState, useRef, useCallback } from 'react';
import { LANG_CODES } from '@/lib/constants';

export function useSpeechRecognition(selectedLanguage, onFinalTranscript, showToast) {
  const [micStatus, setMicStatus] = useState('default'); // default | recording | processing
  const speechRecognizerRef = useRef(null);
  const speechDebounceRef = useRef(null);

  const toggleMicrophone = useCallback((setTextInput) => {
    if (typeof window === 'undefined') return;

    if (micStatus === 'recording') {
      speechRecognizerRef.current?.stop();
      setMicStatus('default');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (showToast) {
        showToast('🎤 Web Speech API not supported in this browser. Try Chrome or Edge.');
      }
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = LANG_CODES[selectedLanguage] || 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    speechRecognizerRef.current = recognition;

    recognition.onstart = () => {
      setMicStatus('recording');
    };

    recognition.onresult = (e) => {
      let liveTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        liveTranscript += e.results[i][0].transcript;
      }
      if (setTextInput) setTextInput(liveTranscript);

      const isFinal = e.results[e.results.length - 1].isFinal;
      if (isFinal) {
        setMicStatus('processing');
        clearTimeout(speechDebounceRef.current);
        speechDebounceRef.current = setTimeout(() => {
          if (onFinalTranscript) onFinalTranscript(liveTranscript);
          setMicStatus('default');
        }, 1500);
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      setMicStatus('default');
    };

    recognition.onend = () => {
      if (micStatus === 'recording') setMicStatus('default');
    };

    recognition.start();
  }, [micStatus, selectedLanguage, onFinalTranscript, showToast]);

  return {
    micStatus,
    toggleMicrophone
  };
}
