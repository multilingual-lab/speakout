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
    recognition.interimResults = true; // always on — resets silence timer while user speaks
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

    recognition.onresult = (event) => {
      // Reset silence timeout on every result (interim or final)
      resetSilenceTimer();

      if (continuous) {
        // Concatenate all final results from this session
        let finalOnly = accumulatedRef.current;
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalOnly += event.results[i][0].transcript;
          }
        }
        // Track finalized text separately (never includes interim)
        finalizedRef.current = finalOnly;
        // Include the latest interim result for live preview only
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult.isFinal) {
          setTranscript(finalOnly + lastResult[0].transcript);
        } else {
          setTranscript(finalOnly);
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
      if (continuousModeRef.current && !stoppedManuallyRef.current) {
        // Mobile browsers often stop recognition; save finals and restart
        try {
          // Carry over only finalized text (no interim) to avoid duplicates
          accumulatedRef.current = finalizedRef.current;
          const next = new SpeechRecognition();
          next.lang = recognition.lang;
          next.continuous = true;
          next.interimResults = true;
          next.maxAlternatives = 3;
          next.onresult = recognition.onresult;
          next.onend = recognition.onend;
          next.onerror = recognition.onerror;
          recognitionRef.current = next;
          next.start();
          // Reset silence timer for the restarted session (max timer keeps running)
          resetSilenceTimer();
          return; // Don't set isListening to false
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
      clearTimeout(maxTimerRef.current);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      clearTimeout(timeoutRef.current);
      console.error('STT error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        setError('mic-denied');
      } else if (event.error === 'no-speech') {
        // On mobile, no-speech can fire before user starts; let onend handle restart
        if (!continuousModeRef.current) {
          setIsListening(false);
          setError('no-speech');
        }
      } else if (event.error === 'aborted') {
        // Ignore aborted errors during restart
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

    // Silence timeout — stops after 10s of no speech results
    timeoutRef.current = setTimeout(stopRecognition, 10000);
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
