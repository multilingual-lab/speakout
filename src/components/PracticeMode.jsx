import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';

export default function PracticeMode({ exchanges }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('listen'); // listen | respond | processing | feedback
  const [showHint, setShowHint] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [history, setHistory] = useState([]); // past chat bubbles
  const chatEndRef = useRef(null);
  const wasListeningRef = useRef(false);
  const { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, setTranscript } =
    useSpeech();

  const exchange = exchanges[currentIndex];
  const isFinished = currentIndex >= exchanges.length;
  const isYouInitiate = exchange?.speaker === 'you-initiate';

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

  useEffect(() => {
    if (isFinished || phase !== 'listen') return;
    if (isYouInitiate) {
      // You start — go directly to respond phase
      setPhase('respond');
    } else {
      let cancelled = false;
      speak(exchange.korean).then(() => {
        if (!cancelled) setPhase('respond');
      });
      return () => {
        cancelled = true;
        stopSpeaking();
      };
    }
  }, [currentIndex, phase]);

  const handleRecord = () => {
    setTranscript('');
    startListening();
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
      newHistory.push({ speaker: 'other', korean: exchange.korean });
    }

    // Add user's response
    newHistory.push({ speaker: 'you', korean: transcript || '...' });

    setHistory(newHistory);
    setShowHint(false);
    setShowModel(false);
    setTranscript('');
    setPhase('listen');
    setCurrentIndex((i) => i + 1);
  };

  const handleReplay = () => {
    if (exchange) {
      speak(exchange.korean);
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setShowModel(false);
    setPhase('respond');
    // Auto-start recording so user doesn't have to tap twice
    setTimeout(() => startListening(), 100);
  };

  if (isFinished) {
    return (
      <div className="practice-container">
        {/* Show full conversation history */}
        <div className="chat-history">
          {history.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.speaker === 'other' ? 'other-bubble' : 'user-bubble'}`}>
              <div className="bubble-speaker">{msg.speaker === 'other' ? '상대방' : '나'}</div>
              <p className="bubble-korean">{msg.korean}</p>
            </div>
          ))}
        </div>
        <div className="practice-complete">
          <span className="complete-emoji">🎉</span>
          <h3>수고했어요!</h3>
          <p>Great job! You completed the conversation.</p>
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
                <div className="bubble-speaker">{msg.speaker === 'other' ? '상대방' : '나'}</div>
                <p className="bubble-korean">{msg.korean}</p>
              </div>
            ))}
          </div>
        )}

        {/* Current exchange */}
        {isYouInitiate ? (
          /* You-initiate: show the situation prompt */
          <div className="initiate-prompt">
            <span className="initiate-icon">💭</span>
            <p className="initiate-text">{exchange.english}</p>
          </div>
        ) : (
          /* Other person's speech bubble */
          <div className="chat-bubble other-bubble">
            <div className="bubble-speaker">상대방</div>
            <p className="bubble-korean">{exchange.korean}</p>
            <button className="replay-btn" onClick={handleReplay} disabled={isSpeaking}>
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
          <div className="respond-area">
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

            {!showHint ? (
              <button className="hint-link" onClick={() => setShowHint(true)}>
                💡 Show hint
              </button>
            ) : (
              <div className="hint-text">{exchange.hint}</div>
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

            {!showModel && (
              <button className="hint-btn" onClick={() => setShowModel(true)}>
                Show model answers
              </button>
            )}

            {showModel && (
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
                        speak(r).then(() => setSpeakingIdx(null));
                      }}
                    >
                      🔊
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {phase === 'feedback' && (
        <div className="practice-bottom-bar">
          <button className="action-btn retry-btn" onClick={handleRetry}>
            🔄 Retry
          </button>
          <button className="action-btn next-btn" onClick={handleNext}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
