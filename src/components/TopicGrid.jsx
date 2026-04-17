export default function TopicGrid({ sections, language, languageOptions, onLanguageChange, onSelect, onOpenSettings }) {
  const selectedLanguage = languageOptions.find((option) => option.id === language) || languageOptions[0];

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
          <button className="settings-gear" onClick={onOpenSettings} title="Settings">⚙️</button>
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
              return (
              <div
                key={s.id}
                className="topic-card"
                style={{ '--card-color': s.color }}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(s.id, isMonologue ? 'monologue' : 'practice')}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id, isMonologue ? 'monologue' : 'practice')}
              >
                <span className="topic-emoji">{s.emoji}</span>
                <span className="topic-title">{s.title}</span>
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
