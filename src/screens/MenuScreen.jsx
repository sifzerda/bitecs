// src/screens/MenuScreen.jsx

import { useState, useEffect, useCallback } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';
import { gameState, SCREEN } from '../state/gameState';

const ITEMS = [
  { label: 'START', screen: 'PLAY', action: 'onPlay' },
  { label: 'GUNS', screen: 'GUNS', action: 'onGuns' },
  { label: 'SETTINGS', screen: 'SETTINGS', action: 'onSettings' },
  { label: 'HOW TO PLAY', screen: 'HOW_TO_PLAY', action: 'onHowToPlay' },
  { label: 'HIGHSCORES', screen: 'HIGHSCORES', action: 'onHighscores' },

  { label: 'BOSS GALLERY', screen: 'BOSS_GALLERY', action: 'onBossGallery' },
];

export default function MenuScreen({
  onPlay,
  onGuns,
  onSettings,
  onHowToPlay,
  onHighscores,

  onBossGallery,
}) {
  const [selected, setSelected] = useState(0);

  const handlers = {
    onPlay,
    onGuns,
    onSettings,
    onHowToPlay,
    onHighscores,
    
    onBossGallery,
  };

  const activate = useCallback(
    (index) => {
      const item = ITEMS[index];
      if (!item) return;
      if (SCREEN[item.screen] !== undefined) {
        gameState.screen = SCREEN[item.screen];
      }
      handlers[item.action]?.();
    },
    [handlers]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelected((s) => (s - 1 + ITEMS.length) % ITEMS.length);
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelected((s) => (s + 1) % ITEMS.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        activate(selected);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, activate]);

  const btnClass = (active) => `
    cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200
    ${
      active
        ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
        : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
    }
  `;

  return (
    <FlightLayout2 title="ASTEROIDS" footer="SECTOR CLEAR">
      {/* ================= RADAR BACKGROUND ================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-80">
        <div className="radar-sweep absolute w-105 h-105 rounded-full overflow-hidden opacity-80">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(0,255,255,0.0),rgba(0,255,255,0.18),rgba(0,255,255,0.0))]" />
        </div>

        <div className="absolute w-105 h-105">
          <div className="blip blip1" />
          <div className="blip blip2" />
          <div className="blip blip3" />
          <div className="blip blip4" />
        </div>

        <div className="absolute w-105 h-105 rounded-full border border-green-500/40" />
        <div className="absolute w-75 h-75 rounded-full border border-green-500/40" />
        <div className="absolute w-45 h-45 rounded-full border border-green-500/40" />

        <div className="absolute w-105 h-px bg-cyan-400/5" />
        <div className="absolute w-px h-05 bg-cyan-400/5" />
      </div>

      {/* ================= MENU ================= */}
      <div className="relative z-10 mt-10 flex flex-col items-center gap-4 font-mono">
        {ITEMS.map((item, i) => {
          const active = selected === i;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => activate(i)}
              onMouseEnter={() => setSelected(i)}
              className={btnClass(active)}
            >
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