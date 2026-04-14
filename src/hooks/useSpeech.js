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

  const startListening = useCallback(({ continuous = false } = {}) => {
    if (!SpeechRecognition) {
      setError('no-speech');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      if (continuous) {
        // Reset the silence timeout on each new result
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 10000);

        // Concatenate all final results
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            full += event.results[i][0].transcript;
          }
        }
        setTranscript(full);
      } else {
        clearTimeout(timeoutRef.current);
        setTranscript(event.results[0][0].transcript);
      }
      setError(null);
    };

    recognition.onend = () => {
      clearTimeout(timeoutRef.current);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      clearTimeout(timeoutRef.current);
      console.error('STT error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('mic-denied');
      } else if (event.error === 'no-speech') {
        setError('no-speech');
      }
    };

    recognitionRef.current = recognition;
    setTranscript('');
    setError(null);
    setIsListening(true);
    recognition.start();

    timeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 10000);
  }, []);

  const stopListening = useCallback(() => {
    clearTimeout(timeoutRef.current);
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
