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
  const stoppedManuallyRef = useRef(false);
  const continuousModeRef = useRef(false);
  const accumulatedRef = useRef('');
  const finalizedRef = useRef('');
  const maxTimerRef = useRef(null);

  const startListening = useCallback(({ continuous = false } = {}) => {
    if (!SpeechRecognition) {
      setError('no-speech');
      return;
    }

    stoppedManuallyRef.current = false;
    continuousModeRef.current = continuous;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    const stopRecognition = () => {
      stoppedManuallyRef.current = true;
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };

    const resetSilenceTimer = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(stopRecognition, 10000);
    };

    let lastFinalIndex = -1;

    recognition.onresult = (event) => {
      // Reset silence timeout on every result (interim or final)
      resetSilenceTimer();

      if (continuous) {
        // Only process newly finalized results to avoid mobile duplication
        for (let i = lastFinalIndex + 1; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            accumulatedRef.current += event.results[i][0].transcript;
            lastFinalIndex = i;
          }
        }
        finalizedRef.current = accumulatedRef.current;
        // Live preview: finalized text + latest interim
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult.isFinal) {
          setTranscript(accumulatedRef.current + lastResult[0].transcript);
        } else {
          setTranscript(accumulatedRef.current);
        }
      } else {
        // Single-result mode: use first final result, ignore interim
        if (event.results[0].isFinal) {
          setTranscript(event.results[0][0].transcript);
        }
      }
      setError(null);
    };

    recognition.onend = () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimerRef.current);
      // Use finalized text only (discard any trailing interim)
      if (continuousModeRef.current) {
        setTranscript(finalizedRef.current);
      }
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      clearTimeout(timeoutRef.current);
      console.error('STT error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        setError('mic-denied');
      } else if (event.error === 'no-speech') {
        if (!continuousModeRef.current) {
          setIsListening(false);
          setError('no-speech');
        }
        // In continuous mode, onend will clean up
      } else if (event.error === 'aborted') {
        // Ignore aborted errors
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    accumulatedRef.current = '';
    finalizedRef.current = '';
    setTranscript('');
    setError(null);
    setIsListening(true);
    recognition.start();

    // Silence/safety timeout:
    // - Continuous: 10s silence timer, reset on every interim/final result
    // - Single: 30s safety fallback (browser auto-stops after one result)
    timeoutRef.current = setTimeout(stopRecognition, continuous ? 10000 : 30000);
    // Hard max duration cap — safety net against background noise
    clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(stopRecognition, continuous ? 120000 : 60000);
  }, []);

  const stopListening = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(maxTimerRef.current);
    stoppedManuallyRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
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
