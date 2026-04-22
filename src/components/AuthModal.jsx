import { useState } from 'react';

export default function AuthModal({ onClose, onSignInWithGoogle, onSignInWithPassword, onSignUp, onResetPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'forgotPassword' | 'resetSent'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    const { error: err } = await onSignInWithPassword(email.trim(), password);
    setLoading(false);
    if (err) setError(err.message);
    else onClose();
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    const { error: err } = await onSignUp(email.trim(), password);
    setLoading(false);
    if (err) setError(err.message);
    else onClose();
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error: err } = await onResetPassword(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep('resetSent');
    }
  };

  const linkStyle = { background: 'none', border: 'none', color: '#7c6bff', cursor: 'pointer', fontSize: '0.85rem', padding: 0 };
  const disabled = !email.trim() || !password || loading;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close" onClick={onClose}>×</button>

        {step === 'form' && (
          <>
            <h2 className="settings-title">Welcome</h2>
            <p className="auth-subtitle">Save your progress across devices</p>

            <button className="auth-google-btn" onClick={onSignInWithGoogle}>
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            <form onSubmit={handleSignIn} className="auth-email-form">
              <input
                type="email"
                className="auth-email-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <input
                type="password"
                className="auth-email-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="auth-btn-row">
                <button type="submit" className="auth-email-btn" disabled={disabled}>
                  Sign in
                </button>
                <button type="button" className="auth-email-btn auth-email-btn-secondary" onClick={handleSignUp} disabled={disabled}>
                  Sign up
                </button>
              </div>
              {error && <p className="auth-error">{error}</p>}
            </form>

            <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', color: '#aaa' }}>
              <button type="button" onClick={() => { setStep('forgotPassword'); setError(null); }} style={linkStyle}>
                Forgot password?
              </button>
            </p>
          </>
        )}

        {step === 'forgotPassword' && (
          <>
            <h2 className="settings-title">Reset password</h2>
            <p className="auth-subtitle">Enter your email to receive a reset link</p>
            <form onSubmit={handleResetPassword} className="auth-email-form">
              <input
                type="email"
                className="auth-email-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <button type="submit" className="auth-email-btn" disabled={!email.trim() || loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              {error && <p className="auth-error">{error}</p>}
            </form>
            <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', color: '#aaa' }}>
              <button type="button" onClick={() => { setStep('form'); setError(null); }} style={linkStyle}>
                Back to sign in
              </button>
            </p>
          </>
        )}

        {step === 'resetSent' && (
          <>
            <h2 className="settings-title">Check your email</h2>
            <p className="auth-subtitle">We sent a password reset link to <strong>{email}</strong></p>
            <div className="auth-email-form">
              <button className="auth-email-btn" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
