import { useState } from 'react';

export default function AuthModal({ onClose, onSignInWithGoogle, onSignInWithEmail }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    const { error: err } = await onSignInWithEmail(email.trim());
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close" onClick={onClose}>×</button>
        <h2 className="settings-title">Sign in</h2>
        <p className="auth-subtitle">Save your progress across devices</p>

        <button className="auth-google-btn" onClick={onSignInWithGoogle}>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        {!sent ? (
          <form onSubmit={handleEmailSubmit} className="auth-email-form">
            <input
              type="email"
              className="auth-email-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <button type="submit" className="auth-email-btn" disabled={!email.trim()}>
              Send magic link
            </button>
            {error && <p className="auth-error">{error}</p>}
          </form>
        ) : (
          <p className="auth-sent-msg">✉️ Check your email for a login link!</p>
        )}
      </div>
    </div>
  );
}
