export default function TopicGrid({ sections, language, languageOptions, onLanguageChange, onSelect, progressData = {}, totalCompletions = 0, user, onOpenMyPage }) {
  const selectedLanguage = languageOptions.find((option) => option.id === language) || languageOptions[0];

  const getScenarioCompletionCount = (scenarioId) => {
    const prefix = `${language}:${scenarioId}:`;
    let count = 0;
    for (const key of Object.keys(progressData)) {
      if (key.startsWith(prefix) && progressData[key].completions > 0) count++;
    }
    return count;
  };

  return (
    <div className="topic-grid-container">
      <div className="app-header-row">
        <h1 className="app-title">SpeakOut <span className="app-title-slogan">Immersive Practice</span></h1>
        <div className="app-header-right">
          <select
            className="language-quick-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Practice language"
          >
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="mypage-avatar-btn" onClick={onOpenMyPage} title="My Page">
            {totalCompletions > 0 && (
              <span className="avatar-streak-inline">🔥{totalCompletions}</span>
            )}
            <span className={`avatar-letter${user ? '' : ' avatar-guest'}`}>{user ? user.email?.[0]?.toUpperCase() || '?' : '👤'}</span>
          </button>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="topic-section">
          <div className="section-header">
            <h2 className="section-title">{section.title}</h2>
            <span className="section-tag">{section.titleEn}</span>
          </div>
          <div className="topic-grid">
            {section.scenarios.map((s) => {
              const isMonologue = !!s.monologues;
              const completedSessions = getScenarioCompletionCount(s.id);
              return (
              <div
                key={s.id}
                className={`topic-card${completedSessions > 0 ? ' topic-practiced' : ''}`}
                style={{ '--card-color': s.color }}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(s.id, isMonologue ? 'monologue' : 'practice')}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id, isMonologue ? 'monologue' : 'practice')}
              >
                <span className="topic-emoji">{s.emoji}</span>
                <span className="topic-title">{s.title}</span>
                {completedSessions > 0 && (
                  <span className="topic-progress-badge">✓ {completedSessions} done</span>
                )}
                <span className="topic-title-en">
                  {s.titleEn} · <span className="topic-dialog-badge">{isMonologue ? `🎤 ${s.monologues.length}` : `🗨 ${s.sessions.length}`}</span>
                </span>
                {isMonologue ? (
                  <div className="topic-actions">
                    <span
                      className="topic-mode-link practice"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onSelect(s.id, 'monologue'); }}
                      onKeyDown={(e) => { e.stopPropagation(); e.key === 'Enter' && onSelect(s.id, 'monologue'); }}
                    >
                      Monologue
                    </span>
                  </div>
                ) : (
                <div className="topic-actions">
                  <span
                    className="topic-mode-link practice"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onSelect(s.id, 'practice'); }}
                    onKeyDown={(e) => { e.stopPropagation(); e.key === 'Enter' && onSelect(s.id, 'practice'); }}
                  >
                    Practice
                  </span>
                  <span className="topic-actions-divider" />
                  <span
                    className="topic-mode-link shadow"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onSelect(s.id, 'shadow'); }}
                    onKeyDown={(e) => { e.stopPropagation(); e.key === 'Enter' && onSelect(s.id, 'shadow'); }}
                  >
                    Shadowing
                  </span>
                </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
