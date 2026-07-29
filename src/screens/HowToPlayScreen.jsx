// src/screens/HowToPlayScreen.jsx

import { useState, useEffect, useCallback } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';

export default function HowToPlayScreen({ onBack }) {
  const [selected, setSelected] = useState(0);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  // keyboard: Enter / Escape → back
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

  return (
    <FlightLayout2 title="HOW TO PLAY" footer="SECTOR CLEAR">
      <div className="mx-auto inline-block text-left font-mono text-xs tracking-[0.2em] text-white/80">
        <div className="space-y-6">
          {/* MOVEMENT */}
          <div>
            <div className="mb-2 text-[#39ff14]/60 tracking-[0.25em]">MOVEMENT</div>
            <div className="flex items-center gap-5">
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
              <span className="text-white/70">Thrust / steer</span>
            </div>
          </div>

          {/* SHOOTING */}
          <div>
            <div className="mb-2 text-[#39ff14]/60 tracking-[0.25em]">SHOOTING</div>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-14 items-center justify-center border border-white/40 text-white text-[10px]">
                SPACE
              </div>
              <span className="text-white/70">Fire gun</span>
            </div>
          </div>

          {/* BOOST / PAUSE — add real bindings if different */}
          <div>
            <div className="mb-2 text-[#39ff14]/60 tracking-[0.25em]">OTHER</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-14 items-center justify-center border border-white/40 text-white text-[10px]">
                  SHIFT
                </div>
                <span className="text-white/70">Boost</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-14 items-center justify-center border border-white/40 text-white text-[10px]">
                  ESC
                </div>
                <span className="text-white/70">Pause</span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={handleBack}
            onMouseEnter={() => setSelected(0)}
            className={`
              cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200
              ${
                selected === 0
                  ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
                  : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
              }
            `}
          >
            BACK
            {selected === 0 && (
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                ▶
              </span>
            )}
          </button>
        </div>
      </div>
    </FlightLayout2>
  );
}