import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import topikCharts from './charts/TopikCharts';

export default function MonologueMode({ monologue, onNext, nextTitle }) {
  const [phase, setPhase] = useState('prompt'); // prompt | recording | reviewing
  const [elapsed, setElapsed] = useState(0);
  const [showModel, setShowModel] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);
  const [pendingAutoRecord, setPendingAutoRecord] = useState(false);
  const timerRef = useRef(null);
  const wasListeningRef = useRef(false);
  const { isListening, transcript, isSpeaking, error, startListening, stopListening, speak, setTranscript, setError } =
    useSpeech();

  // Timer during recording
  useEffect(() => {
    if (phase === 'recording' && isListening) {
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, isListening]);

  // Auto-transition when speech recognition stops on its own
  useEffect(() => {
    if (wasListeningRef.current && !isListening && phase === 'recording') {
      clearInterval(timerRef.current);
      setPhase('reviewing');
    }
    wasListeningRef.current = isListening;
  }, [isListening, phase]);

  const handleStart = () => {
    setTranscript('');
    setError(null);
    setElapsed(0);
    setShowModel(false);
    // Keep showKeywords as-is so hints stay visible if user toggled them on
    setPhase('recording');
    startListening();
  };

  const handleStop = () => {
    clearInterval(timerRef.current);
    stopListening();
    setTimeout(() => setPhase('reviewing'), 500);
  };

  const handleRetry = () => {
    setTranscript('');
    setError(null);
    setElapsed(0);
    setShowModel(false);
    setPhase('recording');
    setPendingAutoRecord(true);
  };

  // Auto-record after retry
  useEffect(() => {
    if (pendingAutoRecord && phase === 'recording' && !isListening) {
      setPendingAutoRecord(false);
      startListening();
    }
  }, [pendingAutoRecord, phase, isListening, startListening]);

  const handleListenModel = () => {
    speak(monologue.modelAnswer);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Check which keywords appear in transcript
  const matchedKeywords = monologue.keywords?.filter((kw) => transcript.includes(kw.replace(/~/g, ''))) || [];

  const ChartComponent = monologue.chartId ? topikCharts[monologue.chartId] : null;

  return (
    <div className="monologue-container">
      <div className="monologue-scroll-area">
        {/* Prompt card — always visible */}
        <div className="monologue-prompt-card">
          <p className="monologue-prompt-en">{monologue.prompt}</p>
          <p className="monologue-prompt-kr">{monologue.promptKorean}</p>
          {ChartComponent && (
            <div className="monologue-chart">
              <ChartComponent />
            </div>
          )}
          {monologue.duration && (
            <span className="monologue-suggested-time">⏱ Suggested: {formatTime(monologue.duration)}</span>
          )}
        </div>

        {/* Prompt phase */}
        {phase === 'prompt' && (
          <div className="monologue-center">
            {monologue.keywords?.length > 0 && (
              <div className="monologue-keywords-section">
                <button className="hint-link" onClick={() => setShowKeywords(!showKeywords)}>
                  {showKeywords ? '🏷️ Hide keywords' : '🏷️ Show keyword hints'}
                </button>
                {showKeywords && (
                  <div className="monologue-keywords">
                    {monologue.keywords.map((kw, i) => (
                      <span key={i} className="monologue-keyword">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recording phase */}
        {phase === 'recording' && (
          <div className="monologue-center">
            <div className="monologue-timer">{formatTime(elapsed)}</div>
            {showKeywords && monologue.keywords?.length > 0 && (
              <div className="monologue-keywords">
                {monologue.keywords.map((kw, i) => (
                  <span key={i} className="monologue-keyword">{kw}</span>
                ))}
              </div>
            )}
            {transcript && (
              <div className="monologue-live-transcript">
                <p className="monologue-live-text">{transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* Reviewing phase */}
        {phase === 'reviewing' && (
          <div className="monologue-review">
            <h3 className="monologue-review-heading">Your response</h3>
            <div className="monologue-transcript-box">
              <p className="monologue-transcript-text">{transcript || '(no speech detected)'}</p>
              <span className="monologue-duration-badge">{formatTime(elapsed)}</span>
            </div>

            {/* Keywords — match results */}
            {monologue.keywords?.length > 0 && (
              <div className="monologue-keywords-section">
                <div className="monologue-keywords">
                  {monologue.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className={`monologue-keyword ${matchedKeywords.includes(kw) ? 'matched' : ''}`}
                    >
                      {kw}
                    </span>
                  ))}
                  <span className="monologue-keyword-score">
                    {matchedKeywords.length}/{monologue.keywords.length} used
                  </span>
                </div>
              </div>
            )}

            {/* Model answer */}
            <div className="monologue-model-section">
              <button className="hint-link" onClick={() => setShowModel(!showModel)}>
                {showModel ? '💡 Hide model answer' : '💡 Show model answer'}
              </button>
              {showModel && (
                <div className="monologue-model-box">
                  <p className="monologue-model-kr">{monologue.modelAnswer}</p>
                  <p className="monologue-model-en">{monologue.modelAnswerEn}</p>
                  <button
                    className="action-btn listen-btn"
                    onClick={handleListenModel}
                    disabled={isSpeaking}
                  >
                    🔊 Listen
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {phase === 'prompt' && (
        <div className="practice-bottom-bar respond-bar">
          <button className="action-btn record-btn large" onClick={handleStart}>
            🎙️ Start speaking
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="practice-bottom-bar respond-bar">
          {error && (
            <div className="error-bar">
              {error === 'mic-denied' && '⚠️ Microphone access denied — check browser permissions'}
              {error === 'no-speech' && '⚠️ No speech detected — try again'}
            </div>
          )}
          <button className="action-btn record-btn large recording" onClick={handleStop}>
            🎙️ Recording… tap to finish
          </button>
        </div>
      )}

      {phase === 'reviewing' && (
        <div className="practice-bottom-bar respond-bar">
          <div className="respond-actions">
            <button className="action-btn retry-btn" onClick={handleRetry}>
              🔄 Try again
            </button>
            {onNext && (
              <button className="action-btn next-btn" onClick={onNext}>
                Next: {nextTitle} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
