// src/pages/Home.jsx

import { useEffect, useRef, useCallback } from 'react';

import BG from '../components/BG';
import MenuScreen from '../screens/MenuScreen';
import HowToPlayScreen from '../screens/HowToPlayScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { StageCompleteScreen } from '../screens/StageCompleteScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { GunsScreen } from '../screens/GunsScreen.jsx';
import { GameOverScreen } from '../screens/GameOverScreen';
import HighscoresScreen from '../screens/HighscoresScreen';

import { gameState, resetRun, SCREEN } from '../state/gameState.js';
import { useUIState, notifyUIChanged } from '../state/uiState.js';
import { spawnPlayer } from '../ecs/spawn.js';
import { initializeInput } from '../ecs/systems/input.js';
import { initializeBulletPool } from '../ecs/pools/bulletPool.js';
import { initializeAsteroidPool } from '../ecs/pools/asteroidPool.js';

const SCREEN_TO_KEY = Object.fromEntries(
  Object.entries(SCREEN).map(([, value]) => [value, value])
);

export default function Home() {
  // re-renders whenever any screen calls notifyUIChanged()
  useUIState();

  const screen = gameState.screen;
  const paused = gameState.paused;

  const keysRef = useRef({});
  const poolsReady = useRef(false);

  const go = useCallback((next) => {
    const map = {
      menu: SCREEN.MENU,
      play: SCREEN.PLAY,
      gameover: SCREEN.GAME_OVER,
      settings: SCREEN.SETTINGS,
      highscores: SCREEN.HIGHSCORES,
      howtoplay: SCREEN.HOW_TO_PLAY,
      guns: SCREEN.GUNS,
      stagecomplete: SCREEN.STAGE_COMPLETE,
    };

    gameState.screen = map[next] ?? next;
    if (next === 'play') {
      gameState.paused = false;
    }
    notifyUIChanged();
  }, []);

  const startNewGame = useCallback(() => {
    resetRun();
    go('play');
  }, [go]);

  const backToMenuFresh = useCallback(() => {
    resetRun();
    go('menu');
  }, [go]);

  const togglePause = useCallback(() => {
    if (gameState.screen !== SCREEN.PLAY) return;
    gameState.paused = !gameState.paused;
    notifyUIChanged();
  }, []);

  // one-time ECS / input setup
  useEffect(() => {
    if (!poolsReady.current) {
      initializeAsteroidPool();
      initializeBulletPool();
      poolsReady.current = true;
    }
    initializeInput(togglePause);
  }, [togglePause]);

  // spawn when entering play
  useEffect(() => {
    if (screen !== SCREEN.PLAY) return;
    spawnPlayer(0, 0);
    gameState.paused = false;
    notifyUIChanged();
  }, [screen]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <BG />

      {screen === SCREEN.MENU && (
        <MenuScreen
          onPlay={startNewGame}
          onGuns={() => go('guns')}
          onSettings={() => go('settings')}
          onHowToPlay={() => go('howtoplay')}
          onHighscores={() => go('highscores')}
        />
      )}

      {screen === SCREEN.PLAY && (
        <PlayScreen
          keysRef={keysRef}
          paused={paused}
          onPause={togglePause}
          onGameOver={() => go('gameover')}
          onStageComplete={() => go('stagecomplete')}
        />
      )}

      {screen === SCREEN.GAME_OVER && (
        <GameOverScreen
          onRestart={startNewGame}
          onMenu={backToMenuFresh}
        />
      )}

      {screen === SCREEN.STAGE_COMPLETE && (
        <StageCompleteScreen
          onContinue={() => go('play')}
          onMenu={backToMenuFresh}
          onGuns={() => go('guns')}
        />
      )}

      {screen === SCREEN.SETTINGS && (
        <SettingsScreen onBack={() => go('menu')} />
      )}

      {screen === SCREEN.GUNS && (
        <GunsScreen
          onBack={() => go('menu')}
          onPlay={() => go('play')}
        />
      )}

      {screen === SCREEN.HOW_TO_PLAY && (
        <HowToPlayScreen onBack={() => go('menu')} />
      )}

      {screen === SCREEN.HIGHSCORES && (
        <HighscoresScreen onBack={() => go('menu')} />
      )}

    </div>
  );
}