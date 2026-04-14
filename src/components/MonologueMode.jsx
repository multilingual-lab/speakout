import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import topikCharts from './charts/TopikCharts';

// Check if a Korean grammar keyword pattern matches the transcript.
// Handles notations: (으)ㄹ (jamo 받침), (으), (이), and / alternatives.
function keywordMatchesTranscript(keyword, transcript) {
  const kw = keyword.replace(/~/g, '');

  // Slash alternatives: "아서/어서" → match either side
  if (kw.includes('/')) {
    return kw.split('/').some((part) => keywordMatchesTranscript(part.trim(), transcript));
  }

  // (으)ㄹ + suffix: ㄹ combines as 받침 with the preceding syllable
  // e.g. (으)ㄹ 거예요 → 할 거예요 (vowel stem) or 먹을 거예요 (consonant stem)
  if (kw.includes('(으)ㄹ')) {
    const suffix = kw.split('(으)ㄹ').pop();
    if (transcript.includes('을' + suffix)) return true;
    let pos = 0;
    while (pos < transcript.length) {
      const idx = transcript.indexOf(suffix, pos);
      if (idx <= 0) break;
      const code = transcript.charCodeAt(idx - 1);
      // Check preceding char is a Korean syllable with ㄹ as 종성 (index 8)
      if (code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 === 8) return true;
      pos = idx + 1;
    }
    return false;
  }

  // (으) without ㄹ jamo: 으 is optional (e.g. (으)면, (으)로)
  if (kw.includes('(으)')) {
    return transcript.includes(kw.replace('(으)', '으')) || transcript.includes(kw.replace('(으)', ''));
  }

  // (이): 이 is optional (e.g. (이)라고)
  if (kw.includes('(이)')) {
    return transcript.includes(kw.replace('(이)', '이')) || transcript.includes(kw.replace('(이)', ''));
  }

  return transcript.includes(kw);
}

export default function MonologueMode({ monologue, onNext, nextTitle }) {
  const [phase, setPhase] = useState('prompt'); // prompt | drill | recording | reviewing
  const [elapsed, setElapsed] = useState(0);
  const [showModel, setShowModel] = useState(false);
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
    setPhase('recording');
    startListening({ continuous: true });
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
      startListening({ continuous: true });
    }
  }, [pendingAutoRecord, phase, isListening, startListening]);

  const handleListenModel = () => {
    speak(monologue.modelAnswer);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Check which keywords appear in transcript
  const matchedKeywords = monologue.keywords?.filter((kw) => keywordMatchesTranscript(kw, transcript)) || [];

  const ChartComponent = monologue.chartId ? topikCharts[monologue.chartId] : null;

  return (
    <div className="monologue-container">
      <div className="monologue-scroll-area">
        {/* Prompt card — always visible */}
        <div className="monologue-prompt-card">
          <p className="monologue-prompt-en">{monologue.prompt}</p>
          <p className="monologue-prompt-kr">
            {monologue.promptKorean}
            <button
              className="prompt-speak-btn"
              onClick={() => speak(monologue.promptKorean)}
              disabled={isSpeaking}
              aria-label="Listen to prompt"
            >
              🔊
            </button>
          </p>
          {ChartComponent && (
            <div className="monologue-chart">
              <ChartComponent />
            </div>
          )}
          {monologue.duration && (
            <span className="monologue-suggested-time">⏱ Suggested: {formatTime(monologue.duration)}</span>
          )}
        </div>

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
            </div>
          </div>
        )}

        {/* Drill phase */}
        {phase === 'drill' && (
          <DictationDrill
            drills={monologue.drills}
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
function DictationDrill({ drills, onFinish }) {
  const [index, setIndex] = useState(0);
  const { isSpeaking, speak } = useSpeech();

  const drill = drills[index];

  const handleListen = () => {
    speak(drill.example);
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
      <div className="drill-card">
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
