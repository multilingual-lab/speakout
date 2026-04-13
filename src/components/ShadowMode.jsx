import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { computeSimilarity } from '../utils/scoring';

export default function ShadowMode({ phrases, exchanges, onNext, nextSessionTitle }) {
  if (exchanges) {
    return <DialogShadow exchanges={exchanges} onNext={onNext} nextSessionTitle={nextSessionTitle} />;
  }
  return <PhraseShadow phrases={phrases} onNext={onNext} nextSessionTitle={nextSessionTitle} />;
}

/* ── Dialog-based shadowing ─────────────────────────────────────────── */
function DialogShadow({ exchanges, onNext, nextSessionTitle }) {
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
        {currentIndex >= lines.length - 1 && (onNext ? (
          <button className="action-btn next-session-btn" onClick={onNext}>
            Next: {nextSessionTitle} →
          </button>
        ) : (
          <p className="last-practice-hint">This is the last dialog of this topic.</p>
        ))}
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
function PhraseShadow({ phrases, onNext, nextSessionTitle }) {
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
        {currentIndex >= phrases.length - 1 && (onNext ? (
          <button className="action-btn next-session-btn" onClick={onNext}>
            Next: {nextSessionTitle} →
          </button>
        ) : (
          <p className="last-practice-hint">This is the last dialog of this topic.</p>
        ))}
      </div>
    </div>
  );
}
