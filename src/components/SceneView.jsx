import { useState } from 'react';
import ShadowMode from './ShadowMode';
import PracticeMode from './PracticeMode';

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function SceneView({ scenario, initialMode, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [sessionId, setSessionId] = useState(null);

  const session = scenario.sessions?.find((s) => s.id === sessionId);

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
          onClick={() => { setMode('practice'); setSessionId(null); }}
        >
          Practice
        </button>
        <button
          className={`mode-toggle-btn ${mode === 'shadow' ? 'active' : ''}`}
          onClick={() => { setMode('shadow'); setSessionId(null); }}
        >
          Shadowing
        </button>
      </div>

      {/* Session picker for practice */}
      {mode === 'practice' && !sessionId && (
        <div className="session-picker">
          <p className="session-picker-label">Choose a dialog</p>
          <div className="session-list">
            {scenario.sessions.map((s) => (
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
        <PracticeMode exchanges={session.exchanges} />
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
            {scenario.sessions.map((s) => (
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
        <ShadowMode phrases={scenario.shadow} />
      )}

      {/* Dialog shadow */}
      {mode === 'shadow' && session && (
        <ShadowMode exchanges={session.exchanges} />
      )}
    </div>
  );
}
