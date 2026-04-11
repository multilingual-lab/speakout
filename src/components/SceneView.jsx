import { useState } from 'react';
import ShadowMode from './ShadowMode';
import PracticeMode from './PracticeMode';

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

      {mode === 'shadow' && <ShadowMode phrases={scenario.shadow} />}
    </div>
  );
}
