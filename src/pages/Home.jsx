// src/pages/Home.jsx

import { useEffect, useState, useRef, useCallback } from "react"
import BG from "../components/BG"
import MenuScreen from "../screens/MenuScreen"
import HowToPlayScreen from "../screens/HowToPlayScreen"
import { PlayScreen } from "../screens/PlayScreen"
import LevelSelectScreen from "../screens/LevelSelectScreen.jsx"
import { LevelCompleteScreen } from "../screens/LevelCompleteScreen"
import SettingsScreen from "../screens/SettingsScreen"
import { GunsScreen } from "../screens/GunsScreen.jsx"
import { GameOverScreen } from "../screens/GameOverScreen"
import HighscoresScreen from "../screens/HighscoresScreen"
import PauseScreen from "../screens/PauseScreen.jsx"
import { useGameStore, SCREEN, TOTAL_LEVELS } from "../../store/gameStore.js"
import { spawnPlayer } from "../ecs/spawn.js"
import { playerQuery } from "../ecs/constants/queries.js"
import { initializeInput } from "../ecs/systems/input.js"
import { initializeBulletPool } from "../ecs/pools/bulletPool.js"
import { initializeAsteroidPool } from "../ecs/pools/asteroidPool.js"
import { resetPlayerMotion } from "../ecs/systems/playerControlSystem.js"
import { initializeArcPool } from "../ecs/pools/arcPool.js"
import { startState } from "../state/startState.js"
import { recordHighscore } from "../state/highscores.js"

import "../fx/index.js"

export default function Home() {

    // ========================================================
    // STORE
    // ========================================================

    const screen = useGameStore(s => s.screen)
    const paused = useGameStore(s => s.paused)
    const level = useGameStore(s => s.level)

    const [gunsReturn, setGunsReturn] = useState(SCREEN.MENU)
    const [scoreError, setScoreError] = useState(false)
    const runId = useRef(null)
    const previous = useRef(null)

    const togglePause = useCallback(() => {
        const s = useGameStore.getState();
        if (s.screen === SCREEN.PLAY) s.togglePause()
    }, [])

    // ========================================================
    // ECS / INPUT INITIALIZATION 
    // ========================================================

    useEffect(() => {

        initializeAsteroidPool();
        initializeBulletPool();
        initializeArcPool()

        return initializeInput(togglePause)

    }, [togglePause])

    // ========================================================
    // SPAWN PLAYER
    // ========================================================

    useEffect(() => {

        if (screen === SCREEN.PLAY) {
            if (!runId.current) runId.current = crypto.randomUUID()
            if (!playerQuery().length) {
                const id = spawnPlayer(0, 0);
                resetPlayerMotion(id)
            }
        }
        if (screen === SCREEN.GAME_OVER && previous.current !== SCREEN.GAME_OVER) {
            setScoreError(!recordHighscore({
                id: runId.current ?? crypto.randomUUID(),
                score: startState.score,
                level
            }))
        }

        previous.current = screen

    }, [screen, level])



    function go(next) {
        useGameStore.getState().setScreen(next)
    }

    function menu() {
        useGameStore.setState({ screen: SCREEN.MENU, paused: false })
    }

    function newRun() {
        runId.current = crypto.randomUUID();
        setScoreError(false);
        const s = useGameStore.getState();
        s.resetRun();
        useGameStore.getState().startLevel(1)
    }

    function selectedLevel(value) {
        runId.current = crypto.randomUUID();
        const s = useGameStore.getState();
        s.resetRun();
        useGameStore.getState().startLevel(value)
    }

    function guns(from) {
        setGunsReturn(from); go(SCREEN.GUNS)
    }

    function continueLevel() {
        // Last encounter's victory is also a completed run.
        if (level >= TOTAL_LEVELS) recordHighscore({
            id: runId.current ?? crypto.randomUUID(),
            score: startState.score,
            level,
            outcome: "completed"
        })
        useGameStore.getState().continueLevel()
    }

    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div className="relative h-screen w-screen overflow-hidden bg-black">

            <BG />

            {screen === SCREEN.MENU && <MenuScreen onPlay={newRun} onLevelSelect={() => go(SCREEN.LEVEL_SELECT)} onGuns={() => guns(SCREEN.MENU)} onSettings={() => go(SCREEN.SETTINGS)} onHowToPlay={() => go(SCREEN.HOW_TO_PLAY)} onHighscores={() => go(SCREEN.HIGHSCORES)} />}
            {screen === SCREEN.PLAY && <PlayScreen paused={paused} onPause={togglePause} />}
            {screen === SCREEN.PLAY && paused && <PauseScreen onResume={() => useGameStore.getState().setPaused(false)} onMenu={menu} />}
            {screen === SCREEN.LEVEL_SELECT && <LevelSelectScreen onPlay={selectedLevel} onBack={menu} />}
            {screen === SCREEN.GAME_OVER && <><GameOverScreen onRestart={newRun} onMenu={menu} />{scoreError && <p role="alert" className="absolute bottom-5 inset-x-0 text-center text-xs text-red-300">Score could not be saved in this browser.</p>}</>}
            {screen === SCREEN.LEVEL_COMPLETE && <LevelCompleteScreen onContinue={continueLevel} onGuns={() => guns(SCREEN.LEVEL_COMPLETE)} onMenu={menu} />}
            {screen === SCREEN.GUNS && <GunsScreen onBack={() => go(gunsReturn)} />}
            {screen === SCREEN.SETTINGS && <SettingsScreen onBack={menu} />}
            {screen === SCREEN.HOW_TO_PLAY && <HowToPlayScreen onBack={menu} />}
            {screen === SCREEN.HIGHSCORES && <HighscoresScreen onBack={menu} />}

        </div>
    )
}