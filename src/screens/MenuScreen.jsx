// src/screens/MenuScreen.jsx

import FlightLayout2 from '../components/FlightLayout2.jsx';
import { gameState, SCREEN } from '../state/gameState';

export default function MenuScreen({
  onPlay,
  onGuns,
  onSettings,
  onHowToPlay,
  onHighscores,
}) {
  const go = (screenKey, fallback) => {
    // keep gameState in sync for any systems that still read it
    if (SCREEN[screenKey] !== undefined) {
      gameState.screen = SCREEN[screenKey];
    }
    fallback?.();
  };

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
        <button
          type="button"
          className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
          onClick={() => {
            gameState.screen = SCREEN.PLAY;
            onPlay?.();
          }}
        >
          START
        </button>

        <button
          type="button"
          className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
          onClick={() => {
            gameState.screen = SCREEN.GUNS;
            onGuns?.();
          }}
        >
          EQUIPMENT
        </button>

        <button
          type="button"
          className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
          onClick={() => {
            gameState.screen = SCREEN.SETTINGS;
            onSettings?.();
          }}
        >
          SETTINGS
        </button>

        <button
          type="button"
          className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
          onClick={() => {
            gameState.screen = SCREEN.HOW_TO_PLAY;
            onHowToPlay?.();
          }}
        >
          HOW TO PLAY
        </button>

        <button
          type="button"
          className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
          onClick={() => {
            gameState.screen = SCREEN.HIGHSCORES;
            onHighscores?.();
          }}
        >
          HIGHSCORES
        </button>
      </div>
    </FlightLayout2>
  );
}