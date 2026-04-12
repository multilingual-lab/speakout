import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';

export default function ShadowMode({ phrases, exchanges }) {
  if (exchanges) {
    return <DialogShadow exchanges={exchanges} />;
  }
  return <PhraseShadow phrases={phrases} />;
}

/* ── Dialog-based shadowing ─────────────────────────────────────────── */
function DialogShadow({ exchanges }) {
  // Flatten exchanges into shadow-able lines:
  // "other" → shadow their korean line
  // "you-initiate" → shadow each expectedResponse
  const lines = useRef(buildDialogLines(exchanges)).current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const wasListeningRef = useRef(false);
  const chatEndRef = useRef(null);
  const historyEndRef = useRef(null);
  const { isListening, transcript, isSpeaking, startListening, stopListening, speak, setTranscript } =
    useSpeech();

  const line = lines[currentIndex];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Auto-scroll history to bottom
    setTimeout(() => historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  }, [currentIndex, showResult]);

  useEffect(() => {
    if (wasListeningRef.current && !isListening && !showResult) {
      setTimeout(() => setShowResult(true), 500);
    }
    wasListeningRef.current = isListening;
  }, [isListening, showResult]);

  const handleListen = async () => {
    setShowResult(false);
    setTranscript('');
    await speak(line.korean);
  };

  const handleRecord = () => {
    setShowResult(false);
    startListening();
  };

  const handleStopAndCheck = () => {
    stopListening();
    setTimeout(() => setShowResult(true), 500);
  };

  const handleNext = () => {
    setShowResult(false);
    setShowEnglish(false);
    setTranscript('');
    if (currentIndex < lines.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handlePrev = () => {
    setShowResult(false);
    setShowEnglish(false);
    setTranscript('');
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const similarity = showResult && transcript
    ? computeSimilarity(line.korean, transcript)
    : null;

  // Conversation context: all lines before current
  const past = lines.slice(0, currentIndex);

  return (
    <div className="shadow-container dialog-shadow">
      <div className="shadow-scroll-area">
        <div className="shadow-progress">
          {currentIndex + 1} / {lines.length}
        </div>

        {/* Past conversation context */}
        {past.length > 0 && (
          <div className="shadow-dialog-history">
            {past.map((l, i) => (
              <div key={i} className={`shadow-dialog-line ${l.speaker === 'you' ? 'shadow-you' : 'shadow-other'}`}>
                <span className="shadow-speaker-label">{l.speaker === 'you' ? '나' : '상대방'}</span>
                <p className="shadow-line-text">{l.korean}</p>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        )}

        {/* Current line to shadow */}
        <div className="shadow-card dialog-card">
          <div className={`shadow-speaker-badge ${line.speaker === 'you' ? 'badge-you' : 'badge-other'}`}>
            {line.speaker === 'you' ? '나 (Your turn)' : '상대방 (Other)'}
          </div>
          <p className="shadow-korean">{line.korean}</p>
          {showEnglish && line.english && <p className="shadow-english">{line.english}</p>}
          {!showEnglish && line.english && (
            <button className="hint-btn" onClick={() => setShowEnglish(true)}>
              Show English
            </button>
          )}
        </div>

        {showResult && (
          <div className="shadow-result-bar">
            {transcript ? (
              <>
                <span className="result-bar-text">You said: <strong>{transcript}</strong></span>
                <span className={`result-bar-score ${similarity >= 80 ? 'good' : similarity >= 50 ? 'ok' : 'poor'}`}>
                  {similarity >= 80 ? '🎉' : similarity >= 50 ? '👍' : '💪'} {similarity}%
                </span>
              </>
            ) : (
              <span className="result-bar-text">No speech detected — try again</span>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="shadow-bottom-bar">
        <div className="shadow-actions">
          <button
            className="action-btn listen-btn"
            onClick={handleListen}
            disabled={isSpeaking || isListening}
          >
            {isSpeaking ? '🔊 Playing...' : '🔊 Listen'}
          </button>
          {!isListening ? (
            <button className="action-btn record-btn" onClick={handleRecord} disabled={isSpeaking}>
              🎙️ Record
            </button>
          ) : (
            <button className="action-btn record-btn recording" onClick={handleStopAndCheck}>
              🎙️ Listening…
            </button>
          )}
        </div>
        <div className="shadow-nav">
          <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
            ← Previous
          </button>
          {currentIndex >= lines.length - 1 ? (
            <span className="nav-btn finished">Finished ✓</span>
          ) : (
            <button className="nav-btn" onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildDialogLines(exchanges) {
  const lines = [];
  for (const ex of exchanges) {
    if (ex.speaker === 'you-initiate') {
      // Shadow each expected response as "your" line
      const firstResponse = ex.expectedResponses[0];
      lines.push({
        speaker: 'you',
        korean: firstResponse,
        english: ex.englishResponse || ex.english,
      });
    } else {
      lines.push({
        speaker: 'other',
        korean: ex.korean,
        english: ex.english,
      });
    }
    // After the other person's line, shadow a response too
    if (ex.speaker === 'other' && ex.expectedResponses?.length) {
      lines.push({
        speaker: 'you',
        korean: ex.expectedResponses[0],
        english: ex.englishResponse || '',
      });
    }
  }
  return lines;
}

/* ── Original phrase-based shadowing ────────────────────────────────── */
function PhraseShadow({ phrases }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const wasListeningRef = useRef(false);
  const { isListening, transcript, isSpeaking, startListening, stopListening, speak, setTranscript } =
    useSpeech();

  const phrase = phrases[currentIndex];

  // Auto-transition when speech recognition stops on its own
  useEffect(() => {
    if (wasListeningRef.current && !isListening && !showResult) {
      setTimeout(() => setShowResult(true), 500);
    }
    wasListeningRef.current = isListening;
  }, [isListening, showResult]);

  const handleListen = async () => {
    setShowResult(false);
    setTranscript('');
    await speak(phrase.korean);
  };

  const handleRecord = () => {
    setShowResult(false);
    startListening();
  };

  const handleStopAndCheck = () => {
    stopListening();
    setTimeout(() => setShowResult(true), 500);
  };

  const handleNext = () => {
    setShowResult(false);
    setShowEnglish(false);
    setTranscript('');
    setCurrentIndex((i) => (i + 1) % phrases.length);
  };

  const handlePrev = () => {
    setShowResult(false);
    setShowEnglish(false);
    setTranscript('');
    setCurrentIndex((i) => (i - 1 + phrases.length) % phrases.length);
  };

  const similarity = showResult && transcript
    ? computeSimilarity(phrase.korean, transcript)
    : null;

  return (
    <div className="shadow-container">
      <div className="shadow-scroll-area">
        <div className="shadow-progress">
          {currentIndex + 1} / {phrases.length}
        </div>

        <div className="shadow-card">
          <p className="shadow-korean">{phrase.korean}</p>
          {showEnglish && <p className="shadow-english">{phrase.english}</p>}
          {!showEnglish && (
            <button className="hint-btn" onClick={() => setShowEnglish(true)}>
              Show English
            </button>
          )}
        </div>

        {showResult && (
          <div className="shadow-result-bar">
            {transcript ? (
              <>
                <span className="result-bar-text">You said: <strong>{transcript}</strong></span>
                <span className={`result-bar-score ${similarity >= 80 ? 'good' : similarity >= 50 ? 'ok' : 'poor'}`}>
                  {similarity >= 80 ? '🎉' : similarity >= 50 ? '👍' : '💪'} {similarity}%
                </span>
              </>
            ) : (
              <span className="result-bar-text">No speech detected — try again</span>
            )}
          </div>
        )}
      </div>

      <div className="shadow-bottom-bar">
        <div className="shadow-actions">
          <button
            className="action-btn listen-btn"
            onClick={handleListen}
            disabled={isSpeaking || isListening}
          >
            {isSpeaking ? '🔊 Playing...' : '🔊 Listen'}
          </button>

          {!isListening ? (
            <button
              className="action-btn record-btn"
              onClick={handleRecord}
              disabled={isSpeaking}
            >
              🎙️ Record
            </button>
          ) : (
            <button
              className="action-btn record-btn recording"
              onClick={handleStopAndCheck}
            >
              🎙️ Listening…
            </button>
          )}
        </div>

        <div className="shadow-nav">
          <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
            ← Previous
          </button>
          {currentIndex >= phrases.length - 1 ? (
            <span className="nav-btn finished">Finished ✓</span>
          ) : (
            <button className="nav-btn" onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function computeSimilarity(target, spoken) {
  const normalize = (s) =>
    s.replace(/[.,!?~\s]/g, '').toLowerCase();
  const a = normalize(target);
  const b = normalize(spoken);

  if (a === b) return 100;

  // Simple character-level Levenshtein-based similarity
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLen = Math.max(a.length, b.length);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}
