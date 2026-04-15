import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSpeech } from '../hooks/useSpeech';
import { computeSimilarity } from '../utils/scoring';
import topikCharts from './charts/TopikCharts';
import KoreanKeyboardRef from './KoreanKeyboardRef';
import '../styles/Writing.css';

const phraseShape = PropTypes.shape({
  english: PropTypes.string.isRequired,
  korean: PropTypes.string.isRequired,
});

const monologueShape = PropTypes.shape({
  prompt: PropTypes.string.isRequired,
  promptKorean: PropTypes.string.isRequired,
  keywords: PropTypes.arrayOf(PropTypes.string),
  chartId: PropTypes.string,
  modelAnswer: PropTypes.string,
  modelAnswerEn: PropTypes.string,
});

// Copied from MonologueMode — grammar-aware Korean keyword matching.
// Kept as a local copy to avoid modifying MonologueMode.
function keywordMatchesTranscript(keyword, text) {
  const kw = keyword.replace(/~/g, '');
  if (kw.includes('/')) {
    return kw.split('/').some((part) => keywordMatchesTranscript(part.trim(), text));
  }
  if (kw.includes('(으)ㄹ')) {
    const suffix = kw.split('(으)ㄹ').pop();
    if (text.includes('을' + suffix)) return true;
    let pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf(suffix, pos);
      if (idx <= 0) break;
      const code = text.charCodeAt(idx - 1);
      if (code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 === 8) return true;
      pos = idx + 1;
    }
    return false;
  }
  if (kw.includes('(으)')) {
    return text.includes(kw.replace('(으)', '으')) || text.includes(kw.replace('(으)', ''));
  }
  if (kw.includes('(이)')) {
    return text.includes(kw.replace('(이)', '이')) || text.includes(kw.replace('(이)', ''));
  }
  return text.includes(kw);
}

/**
 * WritingMode — two flows in one component:
 *
 * 1. Phrase dictation (dialog scenarios): receives `phrases` prop.
 *    See English → type Korean → check similarity.
 *
 * 2. Composition (monologue scenarios): receives `monologue` prop.
 *    See prompt → write response → keyword match + model answer.
 */
export default function WritingMode({ phrases, monologue, onNext, nextTitle, onSpeakMode }) {
  const isPhraseMode = !!phrases;
  return isPhraseMode
    ? <PhraseDictation phrases={phrases} onNext={onNext} nextTitle={nextTitle} />
    : <CompositionWriting monologue={monologue} onNext={onNext} nextTitle={nextTitle} onSpeakMode={onSpeakMode} />;
}

WritingMode.propTypes = {
  phrases: PropTypes.arrayOf(phraseShape),
  monologue: monologueShape,
  onNext: PropTypes.func,
  nextTitle: PropTypes.string,
  onSpeakMode: PropTypes.func,
};

/* ── Phrase Dictation ──────────────────────────────────────────────── */
function PhraseDictation({ phrases, onNext, nextTitle }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { isSpeaking, speak } = useSpeech();

  const phrase = phrases[index];
  const hasNextAction = index < phrases.length - 1 || !!onNext;
  const score = submitted ? computeSimilarity(phrase.korean, input) : null;
  const scoreEmoji = score >= 80 ? '🎉' : score >= 50 ? '👍' : '💪';
  const scoreClass = score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low';

  const handleSubmit = () => {
    if (input.trim()) setSubmitted(true);
  };

  const handleRetry = () => {
    setInput('');
    setSubmitted(false);
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setInput('');
      setSubmitted(false);
    }
  };

  const handleNext = () => {
    setInput('');
    setSubmitted(false);
    if (index < phrases.length - 1) {
      setIndex((i) => i + 1);
    } else if (onNext) {
      onNext();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!submitted) handleSubmit();
      else handleNext();
    }
  };

  return (
    <div className="writing-container">
      <div className="writing-scroll-area">
        <div className="writing-phrase-card">
          <p className="writing-phrase-en">{phrase.english}</p>
          {submitted && (
            <p className="writing-phrase-kr">
              {phrase.korean}
              <button
                className="prompt-speak-btn"
                onClick={() => speak(phrase.korean)}
                disabled={isSpeaking}
                aria-label="Listen"
                style={{ marginLeft: '0.4rem' }}
              >
                🔊
              </button>
            </p>
          )}
          <span className="writing-progress">{index + 1} / {phrases.length}</span>
        </div>

        {!submitted && (
          <div className="writing-input-area">
            <textarea
              className="writing-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write in Korean…"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              autoFocus
            />
            <KoreanKeyboardRef value={input} onChange={setInput} />
          </div>
        )}

        {submitted && (
          <div className="writing-feedback">
            <div className="writing-result-bar">
              <span className="writing-result-text">You wrote: <strong>{input}</strong></span>
              <span className={`writing-result-score ${scoreClass}`}>
                {scoreEmoji} {score}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="writing-bottom-bar">
        <div className="writing-actions">
          {!submitted && index > 0 && (
            <button className="action-btn retry-btn" onClick={handlePrev}>
              ← Prev
            </button>
          )}
          {!submitted && (
            <button className="action-btn record-btn large" onClick={handleSubmit} disabled={!input.trim()}>
              ✅ Check
            </button>
          )}
          {submitted && (
            <>
              {index > 0 && (
                <button className="action-btn retry-btn" onClick={handlePrev}>
                  ← Prev
                </button>
              )}
              <button className="action-btn retry-btn" onClick={handleRetry}>
                🔄 Retry
              </button>
              {hasNextAction && (
                <button className="action-btn next-btn" onClick={handleNext}>
                  {index < phrases.length - 1 ? 'Next →' : `Next: ${nextTitle} →`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

PhraseDictation.propTypes = {
  phrases: PropTypes.arrayOf(phraseShape).isRequired,
  onNext: PropTypes.func,
  nextTitle: PropTypes.string,
};

/* ── Composition Writing ───────────────────────────────────────────── */
function CompositionWriting({ monologue, onNext, nextTitle, onSpeakMode }) {
  const [phase, setPhase] = useState('writing'); // writing | reviewing
  const [input, setInput] = useState('');
  const [showModel, setShowModel] = useState(false);
  const { isSpeaking, speak } = useSpeech();

  const matchedKeywords = monologue.keywords?.filter((kw) => keywordMatchesTranscript(kw, input)) || [];
  const ChartComponent = monologue.chartId ? topikCharts[monologue.chartId] : null;

  const handleRetry = () => {
    setInput('');
    setShowModel(false);
    setPhase('writing');
  };

  const handleSubmit = () => {
    if (input.trim()) setPhase('reviewing');
  };

  return (
    <div className="writing-container">
      <div className="writing-scroll-area">
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
        </div>

        {/* Keywords — visible during writing */}
        {phase === 'writing' && monologue.keywords?.length > 0 && (
          <div className="monologue-center">
            <div className="monologue-keywords">
              <span className="monologue-keywords-label">🏷️</span>
              {monologue.keywords.map((kw, i) => (
                <span key={i} className="monologue-keyword">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* Writing phase */}
        {phase === 'writing' && (
          <div className="writing-input-area">
            <textarea
              className="writing-textarea composition"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write your response in Korean…"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              autoFocus
            />
            <KoreanKeyboardRef value={input} onChange={setInput} />
            <span className="writing-char-count">{input.length} chars</span>
          </div>
        )}

        {phase === 'writing' && (
          <>
            <div className="drill-nav">
              <button className="nav-btn" onClick={handleSubmit} disabled={!input.trim()}>
                ✅ Submit
              </button>
            </div>
            {onSpeakMode && (
              <button className="hint-link drill-skip" onClick={onSpeakMode}>
                Exit writing
              </button>
            )}
          </>
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
              <p className="monologue-transcript-text">{input}</p>
            </div>

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

            {showModel && (
              <div className="monologue-model-box">
                <p className="monologue-model-kr">{monologue.modelAnswer}</p>
                <p className="monologue-model-en">{monologue.modelAnswerEn}</p>
                <button
                  className="action-btn listen-btn"
                  onClick={() => speak(monologue.modelAnswer)}
                  disabled={isSpeaking}
                >
                  🔊 Listen
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'reviewing' && (
          <>
            <div className="drill-nav">
              <button className="nav-btn" onClick={handleRetry}>
                🔄 Try again
              </button>
              {onNext && (
                <button className="nav-btn" onClick={onNext}>
                  Next: {nextTitle} →
                </button>
              )}
            </div>
            {onSpeakMode && (
              <button className="hint-link drill-skip" onClick={onSpeakMode}>
                Exit writing
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

CompositionWriting.propTypes = {
  monologue: monologueShape.isRequired,
  onNext: PropTypes.func,
  nextTitle: PropTypes.string,
  onSpeakMode: PropTypes.func,
};
