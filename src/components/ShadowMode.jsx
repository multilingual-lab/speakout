import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';

export default function ShadowMode({ phrases }) {
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
      <div className="shadow-progress">
        {currentIndex + 1} / {phrases.length}
      </div>

      <div className="shadow-card">
        <p className="shadow-korean">{phrase.korean}</p>
        <p className="shadow-romanization">{phrase.romanization}</p>
        {showEnglish && <p className="shadow-english">{phrase.english}</p>}
        {!showEnglish && (
          <button className="hint-btn" onClick={() => setShowEnglish(true)}>
            Show English
          </button>
        )}
      </div>

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

      {showResult && transcript && (
        <div className="shadow-result">
          <p className="result-label">You said:</p>
          <p className="result-transcript">{transcript}</p>
          <div className={`result-score ${similarity >= 80 ? 'good' : similarity >= 50 ? 'ok' : 'poor'}`}>
            {similarity >= 80 ? '🎉' : similarity >= 50 ? '👍' : '💪'}{' '}
            {similarity}% match
          </div>
        </div>
      )}

      {showResult && !transcript && (
        <div className="shadow-result">
          <p className="result-label">No speech detected. Try again!</p>
        </div>
      )}

      <div className="shadow-nav">
        <button className="nav-btn" onClick={handlePrev}>
          ← Previous
        </button>
        <button className="nav-btn" onClick={handleNext}>
          Next →
        </button>
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
