// src/screens/HighscoresScreen.jsx

import FlightLayout2 from "../components/FlightLayout2"
import { useState, useEffect } from 'react';

export default function HighscoresScreen({ onBack }) {

  const [selected, setSelected] = useState(0);
  const items = [{ label: 'BACK', action: onBack }];

  // keyboard navigation (arcade feel)
  useEffect(() => {
    const onKey = (e) => {
      //  if (e.key === 'ArrowDown') setSelected((s) => (s + 1) % items.length);
      //  if (e.key === 'ArrowUp') setSelected((s) => (s - 1 + items.length) % items.length);
      if (e.key === 'Enter') items[selected].action();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return (

    <FlightLayout2 title="HIGHSCORES" footer="SECTOR CLEAR">

      <div className="menu flex flex-col items-center gap-6 mt-10">

        <p className="text-[#39ff14]/70 tracking-[0.2em] uppercase text-sm">Highscores coming soon...</p>

        {items.map((item, i) => {
          const active = i === selected;

          return (

            <button key={item.label} onClick={item.action} onMouseEnter={() => setSelected(i)} onMouseLeave={() => setSelected(null)}
              className={`
    cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200

    ${active
                  ? "border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]"
                  : "border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40"
                }
  `}>

              {item.label}

              {active && (
                <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                  ▶
                </span>
              )}

            </button>
          );
        })}

      </div>

    </FlightLayout2>

  );
}