import { useState, useCallback } from 'react';
import ShadowMode from './ShadowMode';
import PracticeMode from './PracticeMode';
import MonologueMode from './MonologueMode';
import WritingMode from './WritingMode';
import { getLanguageConfig } from '../config/languages.js';
import { useProgress, makeProgressKey } from '../hooks/useProgress.js';

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
const sortByLevel = (sessions) => [...sessions].sort((a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99));

export default function SceneView({ scenario, initialMode, language = 'ko', onBack }) {
  const isMonologue = !!scenario.monologues;
  const [mode, setMode] = useState(isMonologue ? 'monologue' : initialMode);
  const [sessionId, setSessionId] = useState(null);
  const { recordCompletion, getProgress } = useProgress();

  const handleComplete = useCallback((score) => {
    if (!sessionId) return;
    const key = makeProgressKey(language, scenario.id, sessionId, mode);
    recordCompletion(key, score);
  }, [language, scenario.id, sessionId, mode, recordCompletion]);

  const sortedSessions = scenario.sessions ? sortByLevel(scenario.sessions) : [];
  const session = scenario.sessions?.find((s) => s.id === sessionId);
  const sortedMonologues = scenario.monologues ? sortByLevel(scenario.monologues) : [];
  const monologue = scenario.monologues?.find((m) => m.id === sessionId);

  // Compute next session for "Next Session" navigation
  const getNextSessionId = () => {
    if (!sessionId) return null;
    if (isMonologue) {
      const idx = sortedMonologues.findIndex((m) => m.id === sessionId);
      return idx >= 0 && idx < sortedMonologues.length - 1 ? sortedMonologues[idx + 1].id : null;
    }
    if (sortedSessions.length === 0) return null;
    if (sessionId === '__quick__') {
      return sortedSessions.length > 0 ? sortedSessions[0].id : null;
    }
    const idx = sortedSessions.findIndex((s) => s.id === sessionId);
    return idx >= 0 && idx < sortedSessions.length - 1 ? sortedSessions[idx + 1].id : null;
  };

  const nextSessionId = getNextSessionId();
  const nextSession = nextSessionId
    ? (isMonologue
        ? sortedMonologues.find((m) => m.id === nextSessionId)
        : sortedSessions.find((s) => s.id === nextSessionId))
    : null;

  const handleNextSession = () => {
    if (nextSessionId) setSessionId(nextSessionId);
  };

  const handleBack = () => {
    if (sessionId) {
      setSessionId(null);
      if (isMonologue && mode === 'write') setMode('monologue');
    } else {
      onBack();
    }
  };

  const getSessionProgress = (sid, m) => {
    const key = makeProgressKey(language, scenario.id, sid, m);
    return getProgress(key);
  };

  const backLabel = 'Back';

  return (
    <div className="scene-container" style={{ '--scene-color': scenario.color }}>
      <header className="scene-header">
        <button className="back-btn" onClick={handleBack}>
          ← {backLabel}
        </button>
        <div className="scene-title-area">
          <span className="scene-emoji">{scenario.emoji}</span>
          <h2 className="scene-title">
            {scenario.title}
            {session && <span className="scene-session-name"> — {session.title}</span>}
            {monologue && <span className="scene-session-name"> — {monologue.title}</span>}
          </h2>
        </div>
      </header>

      {/* Mode toggle — dialog scenarios */}
      {!isMonologue && (
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${mode === 'practice' ? 'active' : ''}`}
            onClick={() => { setMode('practice'); if (sessionId === '__quick__') setSessionId(null); }}
          >
            Practice
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'shadow' ? 'active' : ''}`}
            onClick={() => { setMode('shadow'); }}
          >
            Shadowing
          </button>
        </div>
      )}

      {/* Session picker for practice */}
      {mode === 'practice' && !sessionId && (
        <div className="session-picker">
          <div className="session-picker-header">
            <p className="session-picker-label">Choose a dialog</p>
            <button className="warmup-link" onClick={() => { setMode('write'); setSessionId(null); }}>
              ✍️ practice writing
            </button>
          </div>
          <div className="session-list">
            {sortByLevel(scenario.sessions).map((s) => {
              const prog = getSessionProgress(s.id, 'practice');
              return (
              <button
                key={s.id}
                className={`session-card${prog ? ' session-done' : ''}`}
                onClick={() => setSessionId(s.id)}
              >
                <span className="session-title">{s.title}</span>
                <span className="session-title-en">{s.titleEn}</span>
                {s.level && <span className={`level-badge level-${s.level}`}>{LEVEL_LABELS[s.level]}</span>}
                <span className="session-count">{s.exchanges.length} turns</span>
                {prog && <span className="session-progress-badge">✓ {prog.completions}×</span>}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active practice session */}
      {mode === 'practice' && session && (
        <PracticeMode key={sessionId} exchanges={session.exchanges} language={language} onNext={nextSessionId ? handleNextSession : null} nextSessionTitle={nextSession?.title} onComplete={handleComplete} />
      )}

      {/* Session picker for shadow */}
      {mode === 'shadow' && !sessionId && (
        <div className="session-picker">
          <div className="session-picker-header">
            <p className="session-picker-label">Choose what to shadow</p>
            <button className="warmup-link" onClick={() => { setMode('write'); setSessionId(null); }}>
              ✍️ practice writing
            </button>
          </div>
          <div className="session-list">
            <button
              className="session-card quick-phrases-card"
              onClick={() => setSessionId('__quick__')}
            >
              <span className="session-title">{getLanguageConfig(language).ui.quickPhrases}</span>
              <span className="session-title-en">Quick Phrases</span>
              <span className="session-count">{scenario.shadow.length} phrases</span>
            </button>
            {sortByLevel(scenario.sessions).map((s) => {
              const prog = getSessionProgress(s.id, 'shadow');
              return (
              <button
                key={s.id}
                className={`session-card${prog ? ' session-done' : ''}`}
                onClick={() => setSessionId(s.id)}
              >
                <span className="session-title">{s.title}</span>
                <span className="session-title-en">{s.titleEn}</span>
                {s.level && <span className={`level-badge level-${s.level}`}>{LEVEL_LABELS[s.level]}</span>}
                <span className="session-count">{s.exchanges.length} turns</span>
                {prog && <span className="session-progress-badge">{prog.bestScore != null ? `Best: ${Math.round(prog.bestScore)}%` : `✓ ${prog.completions}×`}</span>}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick phrases shadow */}
      {mode === 'shadow' && sessionId === '__quick__' && (
        <ShadowMode key={sessionId} phrases={scenario.shadow} language={language} onNext={nextSessionId ? handleNextSession : null} nextSessionTitle={nextSession?.title} onComplete={handleComplete} />
      )}

      {/* Dialog shadow */}
      {mode === 'shadow' && session && (
        <ShadowMode key={sessionId} exchanges={session.exchanges} language={language} onNext={nextSessionId ? handleNextSession : null} nextSessionTitle={nextSession?.title} onComplete={handleComplete} />
      )}

      {/* Monologue picker */}
      {isMonologue && !sessionId && (
        <div className="session-picker">
          <p className="session-picker-label">Choose a topic</p>
          <div className="session-list">
            {sortByLevel(scenario.monologues).map((m) => {
              const prog = getSessionProgress(m.id, 'monologue');
              return (
              <button
                key={m.id}
                className={`session-card${prog ? ' session-done' : ''}`}
                onClick={() => setSessionId(m.id)}
              >
                <span className="session-title">{m.title}</span>
                <span className="session-title-en">{m.titleEn}</span>
                {m.level && <span className={`level-badge level-${m.level}`}>{LEVEL_LABELS[m.level]}</span>}
                <span className="session-count">⏱ {Math.floor(m.duration / 60)}:{String(m.duration % 60).padStart(2, '0')}</span>
                {prog && <span className="session-progress-badge">{prog.bestScore != null ? `Best: ${Math.round(prog.bestScore * 100)}%` : `✓ ${prog.completions}×`}</span>}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active monologue (speaking) */}
      {mode === 'monologue' && monologue && (
        <MonologueMode key={sessionId} monologue={monologue} language={language} onNext={nextSessionId ? handleNextSession : null} nextTitle={nextSession?.title} onWriteMode={() => setMode('write')} onComplete={handleComplete} />
      )}

      {/* Writing — phrase dictation (dialog scenarios) */}
      {mode === 'write' && !isMonologue && (
        <WritingMode key="phrases" phrases={scenario.shadow} language={language} onComplete={handleComplete} />
      )}

      {/* Writing — composition (monologue scenarios, after topic picked) */}
      {mode === 'write' && isMonologue && monologue && (
        <WritingMode key={sessionId} monologue={monologue} language={language} onNext={nextSessionId ? handleNextSession : null} nextTitle={nextSession?.title} onSpeakMode={() => setMode('monologue')} onComplete={handleComplete} />
      )}
    </div>
  );
}
