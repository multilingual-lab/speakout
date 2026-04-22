import { useState } from 'react';

export default function ResetPasswordModal({ onUpdatePassword }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await onUpdatePassword(password);
    setLoading(false);
    if (err) {
      setError(err.message);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="settings-title">Set new password</h2>
        <p className="auth-subtitle">Enter your new password below</p>
        <form onSubmit={handleSubmit} className="auth-email-form">
          <input
            type="password"
            className="auth-email-input"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="auth-email-input"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button type="submit" className="auth-email-btn" disabled={!password || !confirm || loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
