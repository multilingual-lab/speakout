import { useState } from 'react';
import { getAzureConfig, saveAzureConfig } from '../services/azureTts';

export default function Settings({ onClose }) {
  const config = getAzureConfig();
  const [key, setKey] = useState(config.key);
  const [endpoint, setEndpoint] = useState(config.endpoint);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveAzureConfig(key.trim(), endpoint.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <div className="settings-header-actions">
            <a
              className="settings-github"
              href="https://github.com/multilingual-lab/speakout"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
            >
              GitHub
            </a>
            <button className="settings-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <p className="settings-note">
          Azure Speech is optional — it improves TTS voice quality. Without it, the app falls back to your browser's built-in speech.
        </p>

        <label className="settings-label">Azure Speech Key</label>
        <input
          className="settings-input"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter your Azure Speech key"
        />

        <label className="settings-label">Azure Speech Endpoint</label>
        <input
          className="settings-input"
          type="url"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://<region>.tts.speech.microsoft.com"
        />

        <button className="settings-save" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save'}
        </button>

      </div>
    </div>
  );
}
