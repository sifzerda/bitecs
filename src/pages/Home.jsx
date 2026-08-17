// src/pages/Home.jsx

import { useEffect, useRef, useCallback } from "react"

import BG from "../components/BG"
import MenuScreen from "../screens/MenuScreen"
import HowToPlayScreen from "../screens/HowToPlayScreen"
import { PlayScreen } from "../screens/PlayScreen"
import LevelSelectScreen from "../screens/LevelSelectScreen.jsx"
import { StageCompleteScreen } from "../screens/StageCompleteScreen"
import SettingsScreen from "../screens/SettingsScreen"
import { GunsScreen } from "../screens/GunsScreen.jsx"
import { GameOverScreen } from "../screens/GameOverScreen"
import HighscoresScreen from "../screens/HighscoresScreen"

import {
  useGameStore,
  SCREEN,
} from "../../store/gameStore.js"

import { spawnPlayer } from "../ecs/spawn.js"
import { initializeInput } from "../ecs/systems/input.js"
import { initializeBulletPool } from "../ecs/pools/bulletPool.js"
import { initializeAsteroidPool } from "../ecs/pools/asteroidPool.js"

export default function Home() {

  const screen = useGameStore((s) => s.screen)
  const paused = useGameStore((s) => s.paused)

  const resetRun = useGameStore((s) => s.resetRun)
  const advanceLevel = useGameStore((s) => s.advanceLevel)

  const openGunsFromMenu = useGameStore((s) => s.openGunsFromMenu)
  const openGunsAfterStage = useGameStore((s) => s.openGunsAfterStage)

  const keysRef = useRef({})
  const poolsReady = useRef(false)


  // ========================================================
  // SCREEN NAVIGATION
  // ========================================================

  const go = useCallback((next) => {

    const map = {
      menu: SCREEN.MENU,
      play: SCREEN.PLAY,
      levelselect: SCREEN.LEVEL_SELECT,
      gameover: SCREEN.GAME_OVER,
      settings: SCREEN.SETTINGS,
      highscores: SCREEN.HIGHSCORES,
      howtoplay: SCREEN.HOW_TO_PLAY,
      guns: SCREEN.GUNS,
      stagecomplete: SCREEN.STAGE_COMPLETE,
    }

    const nextScreen = map[next] ?? next

    useGameStore.setState({
      screen: nextScreen,

      ...(next === "play"
        ? { paused: false }
        : {}),
    })

  }, [])


  // ========================================================
  // NEW GAME
  // ========================================================

  const startNewGame = useCallback(() => {

    resetRun()

    go("play")

  }, [go, resetRun])


  // ========================================================
  // MENU
  // ========================================================

  const backToMenuFresh = useCallback(() => {

    resetRun()

    go("menu")

  }, [go, resetRun])


  // ========================================================
  // CONTINUE AFTER STAGE
  // ========================================================
  //
  // THIS is the only place that advances the level from the
  // UI flow.
  //
  // StageComplete -> Continue
  // StageComplete -> Guns -> Equip -> Continue
  //
  // both eventually arrive here.
  //
  // ========================================================

  const continueAfterStage = useCallback(() => {

    advanceLevel()

  }, [advanceLevel])

  // ========================================================
  // PAUSE
  // ========================================================

  const togglePause = useCallback(() => {

    if (
      useGameStore.getState().screen !== SCREEN.PLAY
    ) {
      return
    }

    useGameStore.setState((s) => ({
      paused: !s.paused,
    }))

  }, [])


  // ========================================================
  // ECS / INPUT INITIALIZATION
  // ========================================================

  useEffect(() => {

    if (!poolsReady.current) {

      initializeAsteroidPool()
      initializeBulletPool()

      poolsReady.current = true
    }

    initializeInput(togglePause)

  }, [togglePause])


  // ========================================================
  // SPAWN PLAYER
  // ========================================================

  useEffect(() => {

    if (screen !== SCREEN.PLAY) {
      return
    }

    spawnPlayer(0, 0)

    useGameStore.setState({
      paused: false,
    })

  }, [screen])


  // ========================================================
  // RENDER
  // ========================================================

  return (

    <div className="w-screen h-screen overflow-hidden bg-black relative">

      <BG />


      {screen === SCREEN.MENU && (

        <MenuScreen
          onPlay={startNewGame}
          onLevelSelect={() => go("levelselect")}
          onGuns={openGunsFromMenu}
          onSettings={() => go("settings")}
          onHowToPlay={() => go("howtoplay")}
          onHighscores={() => go("highscores")}
        />

      )}


      {screen === SCREEN.PLAY && (

        <PlayScreen
          keysRef={keysRef}
          paused={paused}
          onPause={togglePause}
          onGameOver={() => go("gameover")}
          onStageComplete={() => go("stagecomplete")}
        />

      )}


      {screen === SCREEN.LEVEL_SELECT && (

        <LevelSelectScreen
          onBack={() => go("menu")}
          onPlay={() => go("play")}
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
          onContinue={continueAfterStage}
          onMenu={backToMenuFresh}
          onGuns={openGunsAfterStage}
        />

      )}


      {screen === SCREEN.GUNS && (

        <GunsScreen
          onContinueAfterStage={continueAfterStage}
          onBack={() => {
            const returnScreen =
              useGameStore.getState().gunsReturnScreen

            go(returnScreen)
          }}
        />

      )}


      {screen === SCREEN.SETTINGS && (

        <SettingsScreen
          onBack={() => go("menu")}
        />

      )}


      {screen === SCREEN.HOW_TO_PLAY && (

        <HowToPlayScreen
          onBack={() => go("menu")}
        />

      )}


      {screen === SCREEN.HIGHSCORES && (

        <HighscoresScreen
          onBack={() => go("menu")}
        />

      )}

    </div>
  )
}