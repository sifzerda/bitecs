// src/screens/HowToPlayScreen.jsx

import FlightLayout from '../components/FlightLayout2';
import { useState, useEffect } from 'react';

export default function HowToPlayScreen({ onBack }) {

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

    <FlightLayout title="HOW TO PLAY" footer="SECTOR CLEAR">

      <div className="mx-auto inline-block text-left font-mono text-xs tracking-[0.2em] text-white/80">

        <div className="space-y-4">

          {/* MOVEMENT */}
          <div>
            <div className="mb-2 text-[#39ff14]/60 tracking-[0.25em]">MOVEMENT</div>

            <div className="flex items-center gap-5">

              {/* WASD GRID */}
              <div className="grid grid-cols-3 grid-rows-2 gap-1">
                <div />

                <div className="flex h-8 w-8 items-center justify-center border border-white/40 text-white text-xs">
                  W
                </div>

                <div />

                <div className="flex h-8 w-8 items-center justify-center border border-white/40 text-white text-xs">
                  A
                </div>

                <div className="flex h-8 w-8 items-center justify-center border border-white/40 text-white text-xs">
                  S
                </div>

                <div className="flex h-8 w-8 items-center justify-center border border-white/40 text-white text-xs">
                  D
                </div>
              </div>

              <span className="text-white/70">Movement</span>
            </div>
          </div>

          {/* SPECIAL */}
          <div>
            <div className="mb-2 text-[#39ff14]/60 tracking-[0.25em]">SHOOTING</div>

            <div className="flex items-center gap-3">
              <div className="flex h-7 w-14 items-center justify-center border border-white/40 text-white text-[10px]">
                SPACE
              </div>

              <span className="text-white/70">Fire gun</span>
            </div>
          </div>

        </div>

        {/* BACK BUTTON */}
        <div className="mt-10 flex justify-center">

          {items.map((item, i) => {
            const active = i === selected;

            return (

              <button key={item.label} onClick={item.action} onMouseEnter={() => setSelected(i)} onMouseLeave={() => setSelected(null)}
                className={`
    cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200

    ${active
                    ? "border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]"
                    : "border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40"
                  }`}>

                {item.label}

                {active && (
                  <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse"> ▶ </span>
                )}

              </button>
            );
          })}

        </div>
      </div>

    </FlightLayout>

  );
}