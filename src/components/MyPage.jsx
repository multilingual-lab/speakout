import { useState } from 'react';
import { useProgress } from '../hooks/useProgress.js';
import {
  getProviders,
  getPreferredProviderId,
  setPreferredProviderId,
  getProviderById,
} from '../services/tts/index.js';

export default function MyPage({ user, authAvailable, onOpenAuth, onSignOut, onClose, userId }) {
  const { data: progressData, totalCompletions } = useProgress(userId);

  // TTS settings state
  const providers = getProviders();
  const [selectedProviderId, setSelectedProviderId] = useState(getPreferredProviderId());
  const selectedProvider = getProviderById(selectedProviderId) || providers[0];
  const [configValues, setConfigValues] = useState(() => selectedProvider.getConfig());
  const [saved, setSaved] = useState(false);

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
    <div className="settings-overlay" onClick={onClose}>
      <div className="mypage-panel" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close" onClick={onClose}>×</button>

        <h2 className="mypage-title">My Page</h2>

        {user ? (
          <div className="mypage-profile">
            <div className="mypage-avatar">{user.email?.[0]?.toUpperCase() || '?'}</div>
            <div className="mypage-email">{user.email}</div>
          </div>
        ) : (
          authAvailable && (
            <div className="mypage-signin-section">
              <p className="mypage-signin-text">Sign in to save progress across devices</p>
              <button className="mypage-signin-btn" onClick={() => { onClose(); onOpenAuth(); }}>
                Sign in
              </button>
            </div>
          )
        )}

        <div className="mypage-stats">
          <div className="mypage-stat-row mypage-stat-total">
            <span>🔥 Total completions</span>
            <span className="mypage-stat-value">{totalCompletions}</span>
          </div>
          <div className="mypage-stat-row">
            <span>🗨 Practice</span>
            <span className="mypage-stat-value">{stats.practice}</span>
          </div>
          <div className="mypage-stat-row">
            <span>🔁 Shadowing</span>
            <span className="mypage-stat-value">{stats.shadow}</span>
          </div>
          <div className="mypage-stat-row">
            <span>🎤 Monologue</span>
            <span className="mypage-stat-value">{stats.monologue}</span>
          </div>
          <div className="mypage-stat-row">
            <span>✍️ Writing</span>
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
          <>
            <p className="settings-note">
              {selectedProvider.label} improves TTS voice quality. Without credentials, the app falls back to the next available provider.
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
          </>
        ) : (
          <p className="settings-note">
            {selectedProvider.id === 'cdn'
              ? `${selectedProvider.label} requires no configuration — it plays pre-generated Azure TTS audio from a CDN.`
              : `${selectedProvider.label} requires no configuration — it uses your browser's built-in speech engine.`}
          </p>
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
          {user && (
            <button className="mypage-signout-btn" onClick={onSignOut}>Sign out</button>
          )}
        </div>
      </div>
    </div>
  );
}
