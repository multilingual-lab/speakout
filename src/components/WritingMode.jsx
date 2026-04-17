import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSpeech } from '../hooks/useSpeech';
import { computeSimilarity, matchKeywords } from '../utils/scoring';
import { getLanguageConfig } from '../config/languages';
import topikCharts from './charts/TopikCharts';
import KoreanKeyboardRef from './KoreanKeyboardRef';
import { getLanguageField, getEnglishField } from '../utils/getLanguageField.js';
import '../styles/Writing.css';

const phraseShape = PropTypes.shape({
  english: PropTypes.string.isRequired,
  korean: PropTypes.string,
  spanish: PropTypes.string,
});

const monologueShape = PropTypes.shape({
  prompt: PropTypes.string,
  promptKorean: PropTypes.string,
  promptSpanish: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  chartId: PropTypes.string,
  modelAnswer: PropTypes.string,
  modelAnswerEn: PropTypes.string,
  modelAnswerEs: PropTypes.string,
});

// Keyword matching is now handled by the language adapter layer.
// See src/utils/adapters/ for language-specific implementations.

/**
 * WritingMode — two flows in one component:
 *
 * 1. Phrase dictation (dialog scenarios): receives `phrases` prop.
 *    See English → type Korean → check similarity.
 *
 * 2. Composition (monologue scenarios): receives `monologue` prop.
 *    See prompt → write response → keyword match + model answer.
 */
export default function WritingMode({ phrases, monologue, language = 'ko', onNext, nextTitle, onSpeakMode }) {
  const isPhraseMode = !!phrases;
  const langConfig = getLanguageConfig(language);
  return isPhraseMode
    ? <PhraseDictation phrases={phrases} language={language} showKeyboard={langConfig.features.virtualKeyboard} onNext={onNext} nextTitle={nextTitle} />
    : <CompositionWriting monologue={monologue} language={language} showKeyboard={langConfig.features.virtualKeyboard} onNext={onNext} nextTitle={nextTitle} onSpeakMode={onSpeakMode} />;
}

WritingMode.propTypes = {
  phrases: PropTypes.arrayOf(phraseShape),
  monologue: monologueShape,
  language: PropTypes.string,
  onNext: PropTypes.func,
  nextTitle: PropTypes.string,
  onSpeakMode: PropTypes.func,
};

/* ── Phrase Dictation ──────────────────────────────────────────────── */
function PhraseDictation({ phrases, language = 'ko', showKeyboard, onNext, nextTitle }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { isSpeaking, speak } = useSpeech();

  const phrase = phrases[index];
  const phraseText = getLanguageField(phrase, 'text', language);
  const phraseEnglish = getEnglishField(phrase, 'text');
  const hasNextAction = index < phrases.length - 1 || !!onNext;
  const score = submitted ? computeSimilarity(phraseText, input, language) : null;
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
          <p className="writing-phrase-en">{phraseEnglish}</p>
          {submitted && (
            <p className="writing-phrase-kr">
              {phraseText}
              <button
                className="prompt-speak-btn"
                onClick={() => speak(phraseText, language)}
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
            {showKeyboard && <KoreanKeyboardRef value={input} onChange={setInput} />}
          </div>
        )}

        {submitted && (
          <div className="writing-feedback">
            <div className="writing-result-bar">
              <div className="writing-result-header">
                <span className="writing-result-text">You wrote:</span>
                <span className={`writing-result-score ${scoreClass}`}>
                  {scoreEmoji} {score}%
                </span>
              </div>
              <p className="writing-result-capture">{input}</p>
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
function CompositionWriting({ monologue, language = 'ko', showKeyboard, onNext, nextTitle, onSpeakMode }) {
  const [phase, setPhase] = useState('writing'); // writing | reviewing
  const [input, setInput] = useState('');
  const [showModel, setShowModel] = useState(false);
  const [showPromptEnglish, setShowPromptEnglish] = useState(false);
  const [showModelEnglish, setShowModelEnglish] = useState(false);
  const { isSpeaking, speak } = useSpeech();

  const matchedKeywords = monologue.keywords ? matchKeywords(monologue.keywords, input, language) : [];
  const promptText = getLanguageField(monologue, 'prompt', language) || monologue.promptKorean;
  const promptEnglish = getEnglishField(monologue, 'prompt') || monologue.prompt;
  const modelText = getLanguageField(monologue, 'modelAnswer', language) || monologue.modelAnswer;
  const modelEnglish = getEnglishField(monologue, 'modelAnswer') || monologue.modelAnswerEn;
  const ChartComponent = monologue.chartId ? topikCharts[monologue.chartId] : null;

  const handleRetry = () => {
    setInput('');
    setShowModel(false);
    setShowModelEnglish(false);
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
          {promptEnglish && (
            <button className="hint-btn" onClick={() => setShowPromptEnglish((v) => !v)}>
              {showPromptEnglish ? 'Hide English' : 'Show English'}
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
            {showKeyboard && <KoreanKeyboardRef value={input} onChange={setInput} metaText={`${input.length} chars`} />}
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
                <p className="monologue-model-kr">{modelText}</p>
                {modelEnglish && (
                  <button className="hint-btn" onClick={() => setShowModelEnglish((v) => !v)}>
                    {showModelEnglish ? 'Hide English' : 'Show English'}
                  </button>
                )}
                {showModelEnglish && modelEnglish && (
                  <p className="monologue-model-en">{modelEnglish}</p>
                )}
                <button
                  className="action-btn listen-btn"
                  onClick={() => speak(modelText, language)}
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
