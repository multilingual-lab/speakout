import { useState } from 'react';

const DISMISSED_KEY = 'speakout_stt_banner_dismissed';
const hasSpeechRecognition =
  typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);
// LINE exposes SpeechRecognition but it's broken (immediately returns no-speech)
const isLINE = /\bLine\//i.test(navigator.userAgent);
const sttAvailable = hasSpeechRecognition && !isLINE;

export default function BrowserCompatBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );
  const [copied, setCopied] = useState(false);

  if (dismissed || sttAvailable) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link and open in your system browser:', window.location.href);
    }
  };

  return (
    <div className="compat-banner">
      <span className="compat-banner-text">
        🎙️ Voice recording requires your system browser
      </span>
      <button className="compat-banner-copy" onClick={handleCopyLink}>
        {copied ? '✓ Copied!' : '📋 Copy link'}
      </button>
      <button className="compat-banner-dismiss" onClick={handleDismiss}>
        ✕
      </button>
    </div>
  );
}
