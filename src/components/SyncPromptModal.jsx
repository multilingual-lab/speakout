export default function SyncPromptModal({ onMerge, onUseCloud }) {
  return (
    <div className="settings-overlay" onClick={onUseCloud}>
      <div className="settings-modal auth-modal sync-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="settings-title">Sync Progress</h2>
        <p className="auth-subtitle">
          You have local practice history on this device. How would you like to handle it?
        </p>
        <div className="sync-prompt-options">
          <button className="auth-email-btn" onClick={onMerge}>
            Merge with my account
          </button>
          <p className="sync-option-desc">Combine local and cloud progress — keeps the best of both.</p>
          <button className="auth-email-btn auth-email-btn-secondary" onClick={onUseCloud}>
            Use cloud only
          </button>
          <p className="sync-option-desc">Discard local data and load your saved progress.</p>
        </div>
      </div>
    </div>
  );
}
