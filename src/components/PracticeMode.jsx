import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { getLanguageField, getEnglishField } from '../utils/getLanguageField.js';
import { computeSimilarity, extractKeywords } from '../utils/adapters/index.js';

const COMPLETION_THRESHOLD = 0.3; // 30% average similarity to count as completion
const ENGAGEMENT_THRESHOLD = 0.5; // must speak in at least 50% of exchanges

export default function PracticeMode({ exchanges, language = 'ko', onNext, nextSessionTitle, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('listen'); // listen | respond | processing | feedback
  const [showModel, setShowModel] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [history, setHistory] = useState([]); // past chat bubbles
  const [pendingAutoRecord, setPendingAutoRecord] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [exchangeScores, setExchangeScores] = useState([]); // similarity score per exchange
  const [spokenCount, setSpokenCount] = useState(0); // exchanges where user actually spoke
  const [currentScore, setCurrentScore] = useState(null); // score for current exchange
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
      const avgScore = exchangeScores.length > 0
        ? exchangeScores.reduce((a, b) => a + b, 0) / exchangeScores.length
        : 0;
      const normalizedScore = avgScore / 100; // 0–1 range
      const engagementRatio = exchanges.length > 0 ? spokenCount / exchanges.length : 0;
      if (normalizedScore >= COMPLETION_THRESHOLD && engagementRatio >= ENGAGEMENT_THRESHOLD) {
        onComplete?.(normalizedScore);
      }
    }
  }, [isFinished, onComplete, exchangeScores, spokenCount, exchanges.length]);
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

  // Compute similarity score when entering feedback phase
  useEffect(() => {
    if (phase === 'feedback' && exchange && transcript) {
      const best = Math.max(
        ...exchange.expectedResponses.map((r) => computeSimilarity(r, transcript, language))
      );
      setCurrentScore(best);
      // Auto-expand model answers for low scores to encourage learning
      if (best < 50) setShowModel(true);
    } else if (phase === 'feedback' && !transcript) {
      setCurrentScore(0);
      setShowModel(true);
    }
  }, [phase, exchange, transcript, language]);

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
    // Record score for this exchange
    setExchangeScores((prev) => [...prev, currentScore ?? 0]);
    if (transcript) setSpokenCount((c) => c + 1);
    setCurrentScore(null);

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
    setShowHint(false);
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
    setCurrentScore(null);
    setPhase('respond');
    setPendingAutoRecord(true);
  };

  if (isFinished) {
    const avgScore = exchangeScores.length > 0
      ? Math.round(exchangeScores.reduce((a, b) => a + b, 0) / exchangeScores.length)
      : 0;
    const engagementRatio = exchanges.length > 0 ? spokenCount / exchanges.length : 0;
    const passed = avgScore / 100 >= COMPLETION_THRESHOLD && engagementRatio >= ENGAGEMENT_THRESHOLD;

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
            <span className="complete-emoji">{passed ? '🎉' : '💪'}</span>
            <h3>{passed ? '수고했어요!' : '다시 도전해 봐요!'}</h3>
            <p className="practice-score-summary">
              You spoke in {spokenCount}/{exchanges.length} exchanges.
              {passed
                ? ' Great conversation! Completion recorded.'
                : ' Try speaking in more exchanges and following the suggested responses.'}
            </p>
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
            {!showHint ? (
              <button className="hint-link" onClick={() => setShowHint(true)}>🏷️ Show keywords</button>
            ) : (
              <div className="practice-keywords">
                {extractKeywords(exchange.expectedResponses[0], language).map((kw, i) => (
                  <span key={i} className="practice-keyword">{kw}</span>
                ))}
              </div>
            )}
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

            {/* Qualitative feedback — no raw score shown */}
            {currentScore !== null && (
              <div className={`practice-score-badge ${currentScore >= 80 ? 'score-great' : currentScore >= 50 ? 'score-ok' : 'score-low'}`}>
                {currentScore >= 80
                  ? '🎉 Great!'
                  : currentScore >= 50
                    ? '👍 Not bad!'
                    : '💬 Check the model answer and retry!'}
              </div>
            )}

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
              {error === 'stt-network' && '⚠️ Speech recognition failed — try Chrome or Safari, or disable ad/tracker blockers for this site.'}
              {error === 'stt-network-brave' && '⚠️ Brave does not support speech recognition. Please open this page in Chrome, Edge, or Safari.'}
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
              {currentScore !== null && currentScore < 50 ? '👉 ' : '💡 '}Show model answers
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
