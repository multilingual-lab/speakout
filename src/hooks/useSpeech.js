import { useState, useRef, useCallback } from 'react';
import { synthesize, getPreferredRate } from '../services/tts/index.js';
import { getLanguageConfig } from '../config/languages';

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

  const startListening = useCallback(({ continuous = false, languageId = 'ko', silenceTimeoutMs = 10000 } = {}) => {
    if (!SpeechRecognition) {
      setError('no-speech');
      return;
    }

    const langConfig = getLanguageConfig(languageId);
    const recognition = new SpeechRecognition();
    recognition.lang = langConfig.sttLang;
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
      timeoutRef.current = setTimeout(stop, silenceTimeoutMs);
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
    timeoutRef.current = setTimeout(stop, silenceTimeoutMs);
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
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text, languageId = 'ko') => {
    // Stop any active recognition first to avoid audio session conflicts
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      setIsListening(false);
    }
    // Stop any in-progress speech first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // Resolve language config for TTS voice and SSML lang
    const langConfig = getLanguageConfig(languageId);
    const ttsConfig = langConfig.tts;

    setIsSpeaking(true);
    setError(null);

    try {
      const { audioUrl, providerId } = await synthesize(text, {
        voice: ttsConfig.azureVoice,
        ssmlLang: ttsConfig.ssmlLang,
        rate: getPreferredRate(),
      });

      // Browser provider plays inline (audioUrl is null) — already done
      if (audioUrl) {
        await new Promise((resolve) => {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            setIsSpeaking(false);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            setIsSpeaking(false);
            setError('tts-failed');
            resolve();
          };
          audio.play().catch(() => {
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            setError('tts-failed');
            resolve();
          });
        });
        return;
      }
    } catch (err) {
      console.error('All TTS providers failed:', err);
      setError('tts-failed');
    }

    setIsSpeaking(false);
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
