import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { getLanguageField, getEnglishField } from '../utils/getLanguageField.js';

export default function PracticeMode({ exchanges, language = 'ko', onNext, nextSessionTitle, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('listen'); // listen | respond | processing | feedback
  const [showModel, setShowModel] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [history, setHistory] = useState([]); // past chat bubbles
  const [pendingAutoRecord, setPendingAutoRecord] = useState(false);
  const completedRef = useRef(false);
  const chatEndRef = useRef(null);
  const wasListeningRef = useRef(false);
  const { isListening, transcript, isSpeaking, error, startListening, stopListening, speak, stopSpeaking, setTranscript, setError } =
    useSpeech();

  const exchange = exchanges[currentIndex];
  const isFinished = currentIndex >= exchanges.length;
  const isYouInitiate = exchange?.speaker === 'you-initiate';
  const exchangeText = getLanguageField(exchange, 'text', language);

  useEffect(() => {
    if (isFinished && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(null);
    }
  }, [isFinished, onComplete]);
  const exchangePrompt = getEnglishField(exchange, 'text');

  // Auto-scroll to bottom on history change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, phase]);

  // Auto-transition when speech recognition stops on its own
  useEffect(() => {
    if (wasListeningRef.current && !isListening && phase === 'respond') {
      setPhase('processing');
      setTimeout(() => setPhase('feedback'), 500);
    }
    wasListeningRef.current = isListening;
  }, [isListening, phase]);

  // Auto-record after retry (triggered by pendingAutoRecord flag)
  useEffect(() => {
    if (pendingAutoRecord && phase === 'respond' && !isListening) {
      setPendingAutoRecord(false);
      startListening({ languageId: language });
    }
  }, [pendingAutoRecord, phase, isListening, startListening, language]);

  useEffect(() => {
    if (isFinished || phase !== 'listen') return;
    if (isYouInitiate) {
      // You start — go directly to respond phase
      setPhase('respond');
    } else {
      let cancelled = false;
      const targetText = getLanguageField(exchange, 'text', language);
      speak(targetText, language).then(() => {
        if (!cancelled) setPhase('respond');
      });
      return () => {
        cancelled = true;
        stopSpeaking();
      };
    }
  }, [currentIndex, phase, isFinished, isYouInitiate, exchange, speak, stopSpeaking, language]);

  const handleRecord = () => {
    setTranscript('');
    startListening({ languageId: language });
  };

  const handleStopAndCheck = () => {
    setPhase('processing');
    stopListening();
    setTimeout(() => setPhase('feedback'), 500);
  };

  const handleNext = () => {
    // Add current exchange to history
    const newHistory = [...history];

    // Add the "other" person's line (if not you-initiate)
    if (!isYouInitiate) {
      newHistory.push({ speaker: 'other', text: exchangeText });
    }

    // Add user's response
    newHistory.push({ speaker: 'you', text: transcript || '...' });

    setHistory(newHistory);
    setShowModel(false);
    setTranscript('');
    setPhase('listen');
    setCurrentIndex((i) => i + 1);
  };

  const handleReplay = () => {
    if (exchange) {
      speak(exchangeText, language);
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setShowModel(false);
    setError(null);
    setPhase('respond');
    setPendingAutoRecord(true);
  };

  if (isFinished) {
    return (
      <div className="practice-container">
        <div className="practice-scroll-area">
          {/* Show full conversation history */}
          <div className="chat-history">
            {history.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.speaker === 'other' ? 'other-bubble' : 'user-bubble'}`}>
                <div className="bubble-speaker">{msg.speaker === 'other' ? 'Other' : 'You'}</div>
                <p className="bubble-korean">{msg.text}</p>
              </div>
            ))}
          </div>
          <div className="practice-complete">
            <span className="complete-emoji">🎉</span>
            <h3>수고했어요!</h3>
            <p>Great job! You completed the conversation.</p>
            {onNext ? (
              <button className="next-dialog-link" onClick={onNext}>
                Next dialog: {nextSessionTitle} →
              </button>
            ) : (
              <p className="last-practice-hint">This is the last dialog of this topic.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-container">
      <div className="practice-scroll-area">
        <div className="practice-progress">
          {currentIndex + 1} / {exchanges.length}
        </div>

        {/* Past conversation history */}
        {history.length > 0 && (
          <div className="chat-history">
            {history.map((msg, i) => (
              <div key={i} className={`chat-bubble history-bubble ${msg.speaker === 'other' ? 'other-bubble' : 'user-bubble'}`}>
                <div className="bubble-speaker">{msg.speaker === 'other' ? 'Other' : 'You'}</div>
                <p className="bubble-korean">{msg.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Current exchange */}
        {isYouInitiate ? (
          /* You-initiate: show the situation prompt */
          <div className="initiate-prompt">
            <span className="initiate-icon">💭</span>
            <p className="initiate-text">{exchangePrompt}</p>
          </div>
        ) : (
          /* Other person's speech bubble */
          <div className="chat-bubble other-bubble">
            <div className="bubble-speaker">Other</div>
            <p className="bubble-korean">{exchangeText}</p>
            <button className="replay-btn" onClick={handleReplay} disabled={isSpeaking || isListening}>
              🔊
            </button>
          </div>
        )}

        {/* Response area */}
        {phase === 'listen' && !isYouInitiate && (
          <div className="practice-status">
            <span className="status-icon">🔊</span>
            <span>Listening to the other person...</span>
          </div>
        )}

        {phase === 'respond' && (
          <div className="practice-status respond-prompt">
            <span className="status-icon">🎤</span>
            <span>{exchange.hint}</span>
          </div>
        )}

        {phase === 'processing' && (
          <div className="practice-status">
            <span className="status-icon">⏳</span>
            <span>Processing…</span>
          </div>
        )}

        {phase === 'feedback' && (
          <div className="feedback-area">
            {/* User's speech bubble */}
            <div className="chat-bubble user-bubble">
              <div className="bubble-speaker">나</div>
              <p className="bubble-korean">{transcript || '(no speech detected)'}</p>
            </div>

          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {phase === 'respond' && (
        <div className="practice-bottom-bar respond-bar">
          {error && (
            <div className="error-bar">
              {error === 'mic-denied' && '⚠️ Microphone access denied — check browser permissions'}
              {error === 'no-speech' && '⚠️ No speech detected — try again'}
              {error === 'tts-failed' && '⚠️ Text-to-speech failed — try opening in your system browser'}
            </div>
          )}
          <div className="respond-actions">
            {!isListening ? (
              <button className="action-btn record-btn large" onClick={handleRecord}>
                🎙️ Your turn — speak!
              </button>
            ) : (
              <button className="action-btn record-btn large recording" onClick={handleStopAndCheck}>
                🎙️ Listening… tap to finish
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'feedback' && (
        <div className="practice-bottom-bar respond-bar">
          {!showModel ? (
            <button className="hint-link" onClick={() => setShowModel(true)}>
              💡 Show model answers
            </button>
          ) : (
            <div className="model-answers">
              <p className="model-label">Model answers:</p>
              {exchange.expectedResponses.map((r, i) => (
                <div key={i} className="model-answer-row">
                  <p className="model-answer">{r}</p>
                  <button
                    className={`replay-btn${speakingIdx === i ? ' speaking' : ''}`}
                    onClick={() => {
                      if (isSpeaking) return;
                      setSpeakingIdx(i);
                      speak(r, language).then(() => setSpeakingIdx(null));
                    }}
                  >
                    🔊
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="respond-actions">
            <button className="action-btn retry-btn" onClick={handleRetry}>
              🔄 Retry
            </button>
            <button className="action-btn next-btn" onClick={handleNext}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
