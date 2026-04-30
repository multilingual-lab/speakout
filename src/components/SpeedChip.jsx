import { useState } from 'react';
import { RATE_OPTIONS, getEffectiveRate, setSessionRate } from '../services/tts/index.js';
import '../styles/SpeedChip.css';

export default function SpeedChip() {
  const [rate, setRate] = useState(getEffectiveRate);

  const handleSelect = (value) => {
    setSessionRate(value);
    setRate(value);
  };

  return (
    <div className="speed-control" aria-label="Playback speed">
      <span className="speed-control-label">▶ Speed</span>
      <div className="speed-control-options">
        {RATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`speed-option${rate === opt.value ? ' speed-option--active' : ''}`}
            onClick={() => handleSelect(opt.value)}
            aria-pressed={rate === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
