import { useState, useEffect } from 'react';
import {
  getProviders,
  getPreferredProviderId,
  setPreferredProviderId,
  getProviderById,
} from '../services/tts/index.js';


export default function Settings({ language, onLanguageChange, onClose }) {
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

        {selectedProvider.configFields.length > 0 && (
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
        )}

        {selectedProvider.configFields.length === 0 && (
          <p className="settings-note">
            {selectedProvider.id === 'cdn'
              ? `${selectedProvider.label} requires no configuration — it plays pre-generated Azure TTS audio from a CDN.`
              : `${selectedProvider.label} requires no configuration — it uses your browser's built-in speech engine.`}
          </p>
        )}

      </div>
    </div>
  );
}
