// src/screens/SettingsScreen.jsx

import { useState, useEffect, useCallback } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';

export default function SettingsScreen({ onBack }) {
  const [music, setMusic] = useState(80);
  const [sfx, setSfx] = useState(100);
  const [screenshake, setScreenshake] = useState(true);
  const [bloom, setBloom] = useState(true);
  const [fps, setFps] = useState(false);

  // 0 = BACK, 1 = SAVE
  const [selected, setSelected] = useState(0);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleSave = useCallback(() => {
    // persist settings later (localStorage / gameState)
    onBack?.();
  }, [onBack]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => (s - 1 + 2) % 2);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => (s + 1) % 2);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selected === 0 ? handleBack() : handleSave();
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleBack, handleSave]);

  const btnClass = (active) => `
    cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200
    ${
      active
        ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
        : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
    }
  `;

  return (
    <FlightLayout2 title="SETTINGS" footer="SECTOR CLEAR">
      <div className="mx-auto inline-block text-left font-mono text-xs tracking-[0.2em] text-white/80 w-full max-w-md">
        <div className="space-y-8">
          {/* AUDIO */}
          <section>
            <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">AUDIO</div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-white/70">
                  <span>Music volume</span>
                  <span className="text-cyan-300/80">{music}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={music}
                  onChange={(e) => setMusic(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="mb-2 flex justify-between text-white/70">
                  <span>SFX volume</span>
                  <span className="text-cyan-300/80">{sfx}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfx}
                  onChange={(e) => setSfx(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </section>

          {/* GRAPHICS */}
          <section>
            <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">GRAPHICS</div>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between text-white/70">
                <span>Bloom</span>
                <input
                  type="checkbox"
                  checked={bloom}
                  onChange={() => setBloom(!bloom)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between text-white/70">
                <span>Screen shake</span>
                <input
                  type="checkbox"
                  checked={screenshake}
                  onChange={() => setScreenshake(!screenshake)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>
            </div>
          </section>

          {/* DEBUG */}
          <section>
            <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">DEBUG</div>

            <label className="flex cursor-pointer items-center justify-between text-white/70">
              <span>Show FPS</span>
              <input
                type="checkbox"
                checked={fps}
                onChange={() => setFps(!fps)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          </section>
        </div>

        {/* ACTIONS */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleBack}
            onMouseEnter={() => setSelected(0)}
            className={btnClass(selected === 0)}
          >
            BACK
            {selected === 0 && (
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                ▶
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            onMouseEnter={() => setSelected(1)}
            className={btnClass(selected === 1)}
          >
            SAVE
            {selected === 1 && (
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