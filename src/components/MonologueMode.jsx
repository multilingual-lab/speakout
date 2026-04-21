import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { matchKeywords } from '../utils/adapters/index.js';
import topikCharts from './charts/TopikCharts';
import { getLanguageField, getEnglishField } from '../utils/getLanguageField.js';

// Keyword matching is now handled by the language adapter layer.
// See src/utils/adapters/ for language-specific implementations.

function isLaptopRecordingMode() {
  const isLikelyMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (typeof window.matchMedia !== 'function') {
    return !isLikelyMobileUa;
  }

  const hasFinePointer =
    window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(any-pointer: fine)').matches;
  const hasHover =
    window.matchMedia('(hover: hover)').matches ||
    window.matchMedia('(any-hover: hover)').matches;

  // Enable continuous mode in laptop/desktop-like environments, including touch laptops.
  return !isLikelyMobileUa && (hasFinePointer || hasHover);
}

export default function MonologueMode({ monologue, language = 'ko', onNext, nextTitle, onWriteMode, onComplete }) {
  const [phase, setPhase] = useState('prompt'); // prompt | drill | recording | reviewing
  const [elapsed, setElapsed] = useState(0);
  const [showModel, setShowModel] = useState(false);
  const [showPromptEnglish, setShowPromptEnglish] = useState(false);
  const [showModelEnglish, setShowModelEnglish] = useState(false);
  const [pendingAutoRecord, setPendingAutoRecord] = useState(false);
  const timerRef = useRef(null);
  const wasListeningRef = useRef(false);
  const completedRef = useRef(false);
  const useContinuousRecording = isLaptopRecordingMode();
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
    setShowModelEnglish(false);
    setPhase('recording');
    startListening({ continuous: useContinuousRecording, languageId: language, silenceTimeoutMs: 15000 });
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
    setShowModelEnglish(false);
    setPhase('recording');
    setPendingAutoRecord(true);
  };

  // Auto-record after retry
  useEffect(() => {
    if (pendingAutoRecord && phase === 'recording' && !isListening) {
      setPendingAutoRecord(false);
      startListening({ continuous: useContinuousRecording, languageId: language, silenceTimeoutMs: 15000 });
    }
  }, [pendingAutoRecord, phase, isListening, startListening, language, useContinuousRecording]);

  const promptText = getLanguageField(monologue, 'prompt', language) || monologue.promptKorean;
  const promptEnglish = getEnglishField(monologue, 'prompt') || monologue.prompt;
  const modelText = getLanguageField(monologue, 'modelAnswer', language) || monologue.modelAnswer;
  const modelEnglish = getEnglishField(monologue, 'modelAnswer') || monologue.modelAnswerEn;

  const handleListenModel = () => {
    speak(modelText, language);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Check which keywords appear in transcript
  const matchedKeywords = monologue.keywords ? matchKeywords(monologue.keywords, transcript, language) : [];

  useEffect(() => {
    if (phase === 'reviewing' && !completedRef.current) {
      const total = monologue.keywords?.length || 0;
      const score = total > 0 ? matchedKeywords.length / total : null;
      if (total === 0 || score >= 0.5) {
        completedRef.current = true;
        onComplete?.(score);
      }
    }
  }, [phase, matchedKeywords.length, monologue.keywords, onComplete]);

  const ChartComponent = monologue.chartId ? topikCharts[monologue.chartId] : null;

  return (
    <div className="monologue-container">
      <div className="monologue-scroll-area">
        {/* Prompt card — always visible */}
        <div className="monologue-prompt-card">
          <p className="monologue-prompt-kr">
            {promptText}
            <button
              className="prompt-speak-btn"
              onClick={() => speak(promptText, language)}
              disabled={isSpeaking}
              aria-label="Listen to prompt"
            >
              🔊
            </button>
          </p>
          {promptEnglish && !showPromptEnglish && (
            <button className="hint-btn" onClick={() => setShowPromptEnglish(true)}>
              Show English
            </button>
          )}
          {showPromptEnglish && promptEnglish && (
            <p className="monologue-prompt-en">{promptEnglish}</p>
          )}
        </div>

        {ChartComponent && (
          <div className="monologue-chart-panel">
            <div className="monologue-chart">
              <ChartComponent />
            </div>
          </div>
        )}

        {/* Keywords & warm-up — prompt and recording phases */}
        {(phase === 'prompt' || phase === 'recording') && monologue.keywords?.length > 0 && (
          <div className="monologue-center">
            <div className="monologue-keywords">
              <span className="monologue-keywords-label">🏷️</span>
              {monologue.keywords.map((kw, i) => (
                <span key={i} className="monologue-keyword">{kw}</span>
              ))}
              {phase === 'prompt' && monologue.drills?.length > 0 && (
                <button className="warmup-link" onClick={() => setPhase('drill')}>
                  📝 warm up
                </button>
              )}
              {phase === 'prompt' && onWriteMode && (
                <button className="warmup-link" onClick={onWriteMode}>
                  ✍️ practice writing
                </button>
              )}
            </div>
          </div>
        )}

        {/* Drill phase */}
        {phase === 'drill' && (
          <DictationDrill
            drills={monologue.drills}
            language={language}
            onFinish={() => setPhase('prompt')}
          />
        )}

        {/* Recording phase — live transcript directly under keywords */}
        {phase === 'recording' && transcript && (
          <div className="monologue-live-transcript">
            <p className="monologue-live-text">{transcript}</p>
          </div>
        )}

        {/* Reviewing phase */}
        {phase === 'reviewing' && (
          <div className="monologue-review">
            <h3 className="monologue-review-heading">
              Your response
              <button className="hint-link" onClick={() => setShowModel(!showModel)} style={{ marginLeft: 'auto' }}>
                {showModel ? '💡 Hide model answer' : '💡 Show model answer'}
              </button>
            </h3>
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
                  {monologue.drills?.length > 0 && (
                    <button className="warmup-link" onClick={() => setPhase('drill')}>
                      📝 warm up
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Model answer */}
            {showModel && (
              <div className="monologue-model-box">
                <p className="monologue-model-kr">{modelText}</p>
                {modelEnglish && !showModelEnglish && (
                  <button className="hint-btn" onClick={() => setShowModelEnglish(true)}>
                    Show English
                  </button>
                )}
                {showModelEnglish && modelEnglish && (
                  <p className="monologue-model-en">{modelEnglish}</p>
                )}
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

/* ── Dictation Drill sub-component ──────────────────────────────────── */
function DictationDrill({ drills, language = 'ko', onFinish }) {
  const [index, setIndex] = useState(0);
  const { isSpeaking, speak } = useSpeech();

  const drill = drills[index];

  const handleListen = () => {
    speak(drill.example, language);
  };

  const handleNext = () => {
    if (index < drills.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  return (
    <div className="drill-container">
      <div className="drill-card" key={index}>
        <p className="drill-example">
          {drill.example}
          <button
            className="drill-speak-btn"
            onClick={handleListen}
            disabled={isSpeaking}
            aria-label="Listen"
          >
            🔊
          </button>
        </p>
        <p className="drill-meaning">{drill.term} — {drill.meaning} <span className="drill-progress">({index + 1}/{drills.length})</span></p>
      </div>

      <div className="drill-nav">
        <button className="nav-btn" onClick={handlePrev} disabled={index === 0}>
          ← Prev
        </button>
        <button className="nav-btn" onClick={handleNext}>
          {index < drills.length - 1 ? 'Next →' : 'Done ✓'}
        </button>
      </div>
      <button className="hint-link drill-skip" onClick={onFinish}>
        Exit warm-up
      </button>
    </div>
  );
}
