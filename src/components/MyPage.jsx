import { useState } from 'react';
import { useProgress } from '../hooks/useProgress.js';
import {
  getProviders,
  getPreferredProviderId,
  setPreferredProviderId,
  getProviderById,
  getPreferredRate,
  setPreferredRate,
  getRateOptions,
} from '../services/tts/index.js';

export default function MyPage({ user, authAvailable, onOpenAuth, onSignOut, onBack, userId, onClearProgress }) {
  const { data: progressData, totalCompletions } = useProgress(userId);
  const [confirmClear, setConfirmClear] = useState(false);

  // TTS settings state
  const providers = getProviders();
  const [selectedProviderId, setSelectedProviderId] = useState(getPreferredProviderId());
  const selectedProvider = getProviderById(selectedProviderId) || providers[0];
  const [configValues, setConfigValues] = useState(() => selectedProvider.getConfig());
  const [saved, setSaved] = useState(false);
  const rateOptions = getRateOptions();
  const [selectedRate, setSelectedRate] = useState(getPreferredRate);

  const handleRateChange = (value) => {
    setSelectedRate(value);
    setPreferredRate(value);
  };

  const handleProviderChange = (e) => {
    const id = e.target.value;
    setSelectedProviderId(id);
    setPreferredProviderId(id);
    const provider = getProviderById(id);
    if (provider) setConfigValues(provider.getConfig());
    setSaved(false);
  };

  const handleFieldChange = (key, value) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    selectedProvider.saveConfig(configValues);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // Compute per-mode stats
  const stats = { shadow: 0, practice: 0, monologue: 0, write: 0 };
  for (const [key, entry] of Object.entries(progressData)) {
    const mode = key.split(':')[3];
    if (mode && stats[mode] !== undefined) {
      stats[mode] += entry.completions;
    }
  }

  return (
    <div className="scene-container">
      <header className="scene-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </header>
      <div className="mypage-panel">

        {user ? (
          <div className="mypage-profile">
            <div className="mypage-avatar">{user.email?.[0]?.toUpperCase() || '?'}</div>
            <div className="mypage-email">{user.email}</div>
          </div>
        ) : (
          authAvailable && (
            <div className="mypage-signin-section">
              <p className="mypage-signin-text">Sign in to save progress across devices</p>
              <button className="mypage-signin-btn" onClick={onOpenAuth}>
                Sign in
              </button>
            </div>
          )
        )}

        <div className="mypage-stats">
          <div className="mypage-stat-row mypage-stat-total">
            <span><span className="mypage-stat-icon">🔥</span> Total completions</span>
            <span className="mypage-stat-value">{totalCompletions}</span>
          </div>
          <div className={`mypage-stat-row${stats.practice === 0 ? ' mypage-stat-zero' : ''}`}>
            <span><span className="mypage-stat-icon">🗨</span> Practice</span>
            <span className="mypage-stat-value">{stats.practice}</span>
          </div>
          <div className={`mypage-stat-row${stats.shadow === 0 ? ' mypage-stat-zero' : ''}`}>
            <span><span className="mypage-stat-icon">🔁</span> Shadowing</span>
            <span className="mypage-stat-value">{stats.shadow}</span>
          </div>
          <div className={`mypage-stat-row${stats.monologue === 0 ? ' mypage-stat-zero' : ''}`}>
            <span><span className="mypage-stat-icon">🎤</span> Monologue</span>
            <span className="mypage-stat-value">{stats.monologue}</span>
          </div>
          <div className={`mypage-stat-row${stats.write === 0 ? ' mypage-stat-zero' : ''}`}>
            <span><span className="mypage-stat-icon">✍️</span> Writing</span>
            <span className="mypage-stat-value">{stats.write}</span>
          </div>
        </div>

        <div className="mypage-divider" />

        <h3 className="mypage-section-title">TTS Settings</h3>

        <label className="settings-label">TTS Provider</label>
        <select
          className="settings-input"
          value={selectedProviderId}
          onChange={handleProviderChange}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        {selectedProvider.configFields.length > 0 ? (
          <div className="settings-config-card">
            <p className="settings-note">
              Optional — for advanced real-time TTS.
            </p>
            {selectedProvider.configFields.map((field) => (
              <div key={field.key}>
                <label className="settings-label">{field.label}</label>
                <input
                  className="settings-input"
                  type={field.type}
                  value={configValues[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <button className="settings-save" onClick={handleSave}>
              {saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        ) : (
          <p className="settings-note">
            {selectedProvider.id === 'cdn'
              ? 'Plays pre-generated audio from CDN.'
              : 'Uses your browser\'s built-in speech engine.'}
          </p>
        )}

        {selectedProviderId === 'azure' && (
          <>
            <label className="settings-label">Speech Speed</label>
            <div className="tts-rate-options">
              {rateOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`tts-rate-btn${selectedRate === opt.value ? ' tts-rate-active' : ''}`}
                  onClick={() => handleRateChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mypage-footer">
          <a
            className="mypage-github-link"
            href="https://github.com/multilingual-lab/speakout"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <div className="mypage-footer-right">
            {totalCompletions > 0 && !confirmClear && (
              <button className="mypage-clear-btn" onClick={() => setConfirmClear(true)}>Clear progress</button>
            )}
            {user && (
              <button className="mypage-signout-btn" onClick={onSignOut}>Sign out</button>
            )}
          </div>
        </div>

        {confirmClear && (
          <div className="mypage-clear-confirm">
            <span className="mypage-clear-warn">Clear all practice history on this device?</span>
            <div className="mypage-clear-btns">
              <button className="mypage-clear-yes" onClick={() => { onClearProgress(); setConfirmClear(false); }}>Clear</button>
              <button className="mypage-clear-no" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
