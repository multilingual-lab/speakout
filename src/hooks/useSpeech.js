import { useState, useRef, useCallback } from 'react';
import { azureSpeak, isAzureConfigured } from '../services/azureTts';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null); // 'mic-denied' | 'no-speech' | 'tts-failed' | null
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const timeoutRef = useRef(null);
  const maxTimerRef = useRef(null);

  const startListening = useCallback(({ continuous = false } = {}) => {
    if (!SpeechRecognition) {
      setError('no-speech');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const stop = () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };

    const resetSilenceTimer = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(stop, 10000);
    };

    recognition.onresult = (event) => {
      resetSilenceTimer();

      // Build transcript: concatenate only final results,
      // plus the last result if it's still interim (live preview).
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          text += event.results[i][0].transcript;
        }
      }
      // Append trailing interim for live preview
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) {
        text += last[0].transcript;
      }
      setTranscript(text);
      setError(null);
    };

    recognition.onend = () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimerRef.current);
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('STT error:', event.error);
      if (event.error === 'not-allowed') {
        setError('mic-denied');
        stop();
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        setError('no-speech');
        stop();
        setIsListening(false);
      }
      // Other errors (aborted, network, etc.) — let onend handle cleanup
    };

    recognitionRef.current = recognition;
    setTranscript('');
    setError(null);
    setIsListening(true);
    recognition.start();

    // Silence timeout: reset on every result (interim or final)
    timeoutRef.current = setTimeout(stop, 10000);
    // Hard max cap — safety net
    clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(stop, continuous ? 120000 : 60000);
  }, []);

  const stopListening = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(maxTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text, lang = 'ko-KR') => {
    // Stop any in-progress speech first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();

    // Use Azure TTS if configured, otherwise fall back to Web Speech API
    if (isAzureConfigured()) {
      try {
        setIsSpeaking(true);
        const audioUrl = await azureSpeak(text);
        await new Promise((resolve) => {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            resolve();
          };
          audio.play();
        });
      } catch (err) {
        console.error('Azure TTS error, falling back to browser TTS:', err);
        setIsSpeaking(false);
        await new Promise((resolve) => {
          speakBrowser(text, lang, setIsSpeaking, resolve);
        });
      }
      return;
    }

    await new Promise((resolve) => {
      speakBrowser(text, lang, setIsSpeaking, resolve);
    });
  }, []);

  return {
    isListening,
    transcript,
    isSpeaking,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setTranscript,
    setError,
    supported: !!SpeechRecognition,
  };
}

function speakBrowser(text, lang, setIsSpeaking, resolve) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.onstart = () => setIsSpeaking(true);
  utterance.onend = () => {
    setIsSpeaking(false);
    resolve();
  };
  utterance.onerror = () => {
    setIsSpeaking(false);
    resolve();
  };
  speechSynthesis.speak(utterance);
}
