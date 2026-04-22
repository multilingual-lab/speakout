import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { computeSimilarity } from '../utils/scoring';
import { getLanguageField, getEnglishField } from '../utils/getLanguageField.js';

export default function ShadowMode({ phrases, exchanges, language = 'ko', onNext, nextSessionTitle, onComplete }) {
  if (exchanges) {
    return <DialogShadow exchanges={exchanges} language={language} onNext={onNext} nextSessionTitle={nextSessionTitle} onComplete={onComplete} />;
  }
  return <PhraseShadow phrases={phrases} language={language} onNext={onNext} nextSessionTitle={nextSessionTitle} onComplete={onComplete} />;
}

/* ── Dialog-based shadowing ───────────────────────────────────────────────────────────── */
function DialogShadow({ exchanges, language = 'ko', onNext, nextSessionTitle, onComplete }) {
  // Flatten exchanges into shadow-able lines:
  // "other" → shadow their korean line
  // "you-initiate" → shadow each expectedResponse
  const lines = useRef(buildDialogLines(exchanges, language)).current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const wasListeningRef = useRef(false);
  const scoresRef = useRef([]);
  const completedRef = useRef(false);
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
    await speak(line.text, language);
  };

  const handleRecord = () => {
    setShowResult(false);
    startListening({ languageId: language });
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
    ? computeSimilarity(line.text, transcript, language)
    : null;

  useEffect(() => {
    if (similarity != null) {
      scoresRef.current[currentIndex] = similarity;
    }
    if (currentIndex >= lines.length - 1 && showResult && !completedRef.current) {
      completedRef.current = true;
      const scores = scoresRef.current.filter((s) => s != null);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      onComplete?.(avg);
    }
  }, [similarity, currentIndex, lines.length, showResult, onComplete]);

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
                <span className="shadow-speaker-label">{l.speaker === 'you' ? 'You' : 'Other'}</span>
                <p className="shadow-line-text">{l.text}</p>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        )}

        {/* Current line to shadow */}
        <div className="shadow-card dialog-card">
          <div className={`shadow-speaker-badge ${line.speaker === 'you' ? 'badge-you' : 'badge-other'}`}>
            {line.speaker === 'you' ? 'You' : 'Other'}
          </div>
          <p className="shadow-korean">{line.text}</p>
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
                <div className="result-bar-header">
                  <span className="result-bar-text">You said:</span>
                  <span className={`result-bar-score ${similarity >= 80 ? 'good' : similarity >= 50 ? 'ok' : 'poor'}`}>
                    {similarity >= 80 ? '🎉' : similarity >= 50 ? '👍' : '💪'} {similarity}%
                  </span>
                </div>
                <p className="result-bar-capture">{transcript}</p>
              </>
            ) : (
              <span className="result-bar-text">No speech detected — try again</span>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="shadow-bottom-bar">
        {error === 'tts-failed' && (
          <div className="error-bar">⚠️ Text-to-speech failed — try opening in your system browser</div>
        )}
        {currentIndex >= lines.length - 1 && (
          onNext ? (
            <button className="next-dialog-link" onClick={onNext}>
              Next dialog: {nextSessionTitle} →
            </button>
          ) : (
            <span className="last-dialog-hint">Last dialog of this topic</span>
          )
        )}
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
            ← Prev
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

function buildDialogLines(exchanges, language = 'ko') {
  const lines = [];
  for (const ex of exchanges) {
    if (ex.speaker === 'you-initiate') {
      // Use the target-language field if available, otherwise fall back to first expectedResponse
      const langText = getLanguageField(ex, 'text', language);
      const text = langText || ex.expectedResponses[0];
      lines.push({
        speaker: 'you',
        text,
        english: ex.englishResponse || ex.english,
      });
    } else {
      lines.push({
        speaker: 'other',
        text: getLanguageField(ex, 'text', language),
        english: getEnglishField(ex, 'text'),
      });
    }
    // After the other person's line, shadow a response too
    if (ex.speaker === 'other' && ex.expectedResponses?.length) {
      lines.push({
        speaker: 'you',
        text: ex.expectedResponses[0],
        english: ex.englishResponse || '',
      });
    }
  }
  return lines;
}

/* ── Original phrase-based shadowing ────────────────────────────────── */
function PhraseShadow({ phrases, language = 'ko', onNext, nextSessionTitle, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const wasListeningRef = useRef(false);
  const scoresRef = useRef([]);
  const completedRef = useRef(false);
  const { isListening, transcript, isSpeaking, error, startListening, stopListening, speak, setTranscript } =
    useSpeech();

  const phrase = phrases[currentIndex];
  const phraseText = getLanguageField(phrase, 'text', language);
  const phraseEnglish = getEnglishField(phrase, 'text');

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
    await speak(phraseText, language);
  };

  const handleRecord = () => {
    setShowResult(false);
    startListening({ languageId: language });
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
    ? computeSimilarity(phraseText, transcript, language)
    : null;

  useEffect(() => {
    if (similarity != null) {
      scoresRef.current[currentIndex] = similarity;
    }
    if (currentIndex >= phrases.length - 1 && showResult && !completedRef.current) {
      completedRef.current = true;
      const scores = scoresRef.current.filter((s) => s != null);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      onComplete?.(avg);
    }
  }, [similarity, currentIndex, phrases.length, showResult, onComplete]);

  return (
    <div className="shadow-container">
      <div className="shadow-scroll-area">
        <div className="shadow-progress">
          {currentIndex + 1} / {phrases.length}
        </div>

        <div className="shadow-card">
          <p className="shadow-korean">{phraseText}</p>
          {showEnglish && <p className="shadow-english">{phraseEnglish}</p>}
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
                <div className="result-bar-header">
                  <span className="result-bar-text">You said:</span>
                  <span className={`result-bar-score ${similarity >= 80 ? 'good' : similarity >= 50 ? 'ok' : 'poor'}`}>
                    {similarity >= 80 ? '🎉' : similarity >= 50 ? '👍' : '💪'} {similarity}%
                  </span>
                </div>
                <p className="result-bar-capture">{transcript}</p>
              </>
            ) : (
              <span className="result-bar-text">No speech detected — try again</span>
            )}
          </div>
        )}
      </div>

      <div className="shadow-bottom-bar">
        {error === 'tts-failed' && (
          <div className="error-bar">⚠️ Text-to-speech failed — try opening in your system browser</div>
        )}
        {currentIndex >= phrases.length - 1 && (
          onNext ? (
            <button className="next-dialog-link" onClick={onNext}>
              Next dialog: {nextSessionTitle} →
            </button>
          ) : (
            <span className="last-dialog-hint">Last dialog of this topic</span>
          )
        )}
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
            ← Prev
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
