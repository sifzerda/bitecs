// src/pages/Home.jsx

import { useState, useEffect, useRef, useCallback } from 'react';

import BG from '../components/BG';
import MenuScreen from '../screens/MenuScreen';
import HowToPlayScreen from '../screens/HowToPlayScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { StageCompleteScreen } from '../screens/StageCompleteScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { GunsScreen } from '../screens/GunsScreen.jsx';
import { GameOverScreen } from '../screens/GameOverScreen';
import HighscoresScreen from '../screens/HighscoresScreen';

import { gameState, SCREEN } from '../state/gameState.js';
import { spawnPlayer } from '../ecs/spawn.js';
import { initializeInput } from '../ecs/systems/input.js';
import { initializeBulletPool } from '../ecs/pools/bulletPool.js';
import { initializeAsteroidPool } from '../ecs/pools/asteroidPool.js';

export default function Home() {
  const [screen, setScreen] = useState('menu');
  const [paused, setPaused] = useState(false);
  const keysRef = useRef({});
  const poolsReady = useRef(false);

  const go = useCallback((next) => {
    setScreen(next);
    // keep shared gameState in sync for systems that still read it
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
    if (map[next]) gameState.screen = map[next];
    if (next === 'play') {
      gameState.paused = false;
      setPaused(false);
    }
  }, []);

  const togglePause = useCallback(() => {
    if (screen !== 'play') return;
    const next = !gameState.paused;
    gameState.paused = next;
    setPaused(next);
  }, [screen]);

  // one-time ECS / input setup
  useEffect(() => {
    if (!poolsReady.current) {
      initializeAsteroidPool();
      initializeBulletPool();
      poolsReady.current = true;
    }
    initializeInput(togglePause);
  }, [togglePause]);

  // spawn / reset when entering play
  useEffect(() => {
    if (screen !== 'play') return;
    spawnPlayer(0, 0);
    gameState.paused = false;
    setPaused(false);
  }, [screen]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <BG />

      {screen === 'menu' && (
        <MenuScreen
          onPlay={() => go('play')}
          onGuns={() => go('guns')}
          onSettings={() => go('settings')}
          onHowToPlay={() => go('howtoplay')}
          onHighscores={() => go('highscores')}
        />
      )}

      {screen === 'play' && (
        <PlayScreen
          keysRef={keysRef}
          paused={paused}
          onPause={togglePause}
          onGameOver={() => go('gameover')}
          onStageComplete={() => go('stagecomplete')}
        />
      )}

      {screen === 'gameover' && (
        <GameOverScreen
          onRestart={() => go('play')}
          onMenu={() => go('menu')}
        />
      )}

      {screen === 'stagecomplete' && (
        <StageCompleteScreen
          onContinue={() => go('play')}
          onMenu={() => go('menu')}
          onGuns={() => go('guns')}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen onBack={() => go('menu')} />
      )}

      {screen === 'guns' && (
        <GunsScreen
          onBack={() => go('menu')}
          onPlay={() => go('play')}
        />
      )}

      {screen === 'howtoplay' && (
        <HowToPlayScreen onBack={() => go('menu')} />
      )}

      {screen === 'highscores' && (
        <HighscoresScreen onBack={() => go('menu')} />
      )}

    </div>
  );
}