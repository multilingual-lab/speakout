import { useState } from 'react';
import ShadowMode from './ShadowMode';
import PracticeMode from './PracticeMode';

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
const sortByLevel = (sessions) => [...sessions].sort((a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99));

export default function SceneView({ scenario, initialMode, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [sessionId, setSessionId] = useState(null);

  const sortedSessions = scenario.sessions ? sortByLevel(scenario.sessions) : [];
  const session = scenario.sessions?.find((s) => s.id === sessionId);

  // Compute next session for "Next Session" navigation
  const getNextSessionId = () => {
    if (!sessionId || sortedSessions.length === 0) return null;
    if (sessionId === '__quick__') {
      return sortedSessions.length > 0 ? sortedSessions[0].id : null;
    }
    const idx = sortedSessions.findIndex((s) => s.id === sessionId);
    return idx >= 0 && idx < sortedSessions.length - 1 ? sortedSessions[idx + 1].id : null;
  };

  const nextSessionId = getNextSessionId();
  const nextSession = nextSessionId ? sortedSessions.find((s) => s.id === nextSessionId) : null;

  const handleNextSession = () => {
    if (nextSessionId) setSessionId(nextSessionId);
  };

  const handleBack = () => {
    if (sessionId) {
      setSessionId(null);
    } else {
      onBack();
    }
  };

  const backLabel = sessionId ? 'Choose Dialog' : 'Back';

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
          </h2>
        </div>
      </header>

      {/* Mode toggle */}
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

      {/* Session picker for practice */}
      {mode === 'practice' && !sessionId && (
        <div className="session-picker">
          <p className="session-picker-label">Choose a dialog</p>
          <div className="session-list">
            {sortByLevel(scenario.sessions).map((s) => (
              <button
                key={s.id}
                className="session-card"
                onClick={() => setSessionId(s.id)}
              >
                <span className="session-title">{s.title}</span>
                <span className="session-title-en">{s.titleEn}</span>
                {s.level && <span className={`level-badge level-${s.level}`}>{LEVEL_LABELS[s.level]}</span>}
                <span className="session-count">{s.exchanges.length} turns</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active practice session */}
      {mode === 'practice' && session && (
        <PracticeMode key={sessionId} exchanges={session.exchanges} onNext={nextSessionId ? handleNextSession : null} nextSessionTitle={nextSession?.title} />
      )}

      {/* Session picker for shadow */}
      {mode === 'shadow' && !sessionId && (
        <div className="session-picker">
          <p className="session-picker-label">Choose what to shadow</p>
          <div className="session-list">
            <button
              className="session-card quick-phrases-card"
              onClick={() => setSessionId('__quick__')}
            >
              <span className="session-title">빠른 연습</span>
              <span className="session-title-en">Quick Phrases</span>
              <span className="session-count">{scenario.shadow.length} phrases</span>
            </button>
            {sortByLevel(scenario.sessions).map((s) => (
              <button
                key={s.id}
                className="session-card"
                onClick={() => setSessionId(s.id)}
              >
                <span className="session-title">{s.title}</span>
                <span className="session-title-en">{s.titleEn}</span>
                {s.level && <span className={`level-badge level-${s.level}`}>{LEVEL_LABELS[s.level]}</span>}
                <span className="session-count">{s.exchanges.length} turns</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick phrases shadow */}
      {mode === 'shadow' && sessionId === '__quick__' && (
        <ShadowMode key={sessionId} phrases={scenario.shadow} onNext={nextSessionId ? handleNextSession : null} nextSessionTitle={nextSession?.title} />
      )}

      {/* Dialog shadow */}
      {mode === 'shadow' && session && (
        <ShadowMode key={sessionId} exchanges={session.exchanges} onNext={nextSessionId ? handleNextSession : null} nextSessionTitle={nextSession?.title} />
      )}
    </div>
  );
}
