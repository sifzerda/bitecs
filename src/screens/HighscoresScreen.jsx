// src/screens/HighscoresScreen.jsx

import { useState, useEffect, useCallback } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';

export default function HighscoresScreen({ onBack }) {
  const [selected, setSelected] = useState(0);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBack]);

  const active = selected === 0;

  return (
    <FlightLayout2 title="HIGHSCORES" footer="SECTOR CLEAR">
      <div className="menu flex flex-col items-center gap-6 mt-10 font-mono">
        <p className="text-[#39ff14]/70 tracking-[0.2em] uppercase text-sm">
          Highscores coming soon...
        </p>

        <button
          type="button"
          onClick={handleBack}
          onMouseEnter={() => setSelected(0)}
          className={`
            cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200
            ${
              active
                ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
                : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
            }
          `}
        >
          BACK
          {active && (
            <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
              ▶
            </span>
          )}
        </button>
      </div>
    </FlightLayout2>
  );
}