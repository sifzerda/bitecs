// src/pages/Home.jsx

import {
    useEffect,
    useRef,
    useCallback,
} from "react"

import BG from "../components/BG"

import MenuScreen
    from "../screens/MenuScreen"

import HowToPlayScreen
    from "../screens/HowToPlayScreen"

import {
    PlayScreen,
} from "../screens/PlayScreen"

import LevelSelectScreen
    from "../screens/LevelSelectScreen.jsx"

import {
    LevelCompleteScreen,
} from "../screens/LevelCompleteScreen"

import SettingsScreen
    from "../screens/SettingsScreen"

import {
    GunsScreen,
} from "../screens/GunsScreen.jsx"

import {
    GameOverScreen,
} from "../screens/GameOverScreen"

import HighscoresScreen
    from "../screens/HighscoresScreen"

import {
    useGameStore,
    SCREEN,
} from "../../store/gameStore.js"

import {
    spawnPlayer,
} from "../ecs/spawn.js"

import {
    initializeInput,
} from "../ecs/systems/input.js"

import {
    initializeBulletPool,
} from "../ecs/pools/bulletPool.js"

import {
    initializeAsteroidPool,
} from "../ecs/pools/asteroidPool.js"


export default function Home() {

    // ========================================================
    // STORE
    // ========================================================

    const screen =
        useGameStore(
            (s) => s.screen
        )

    const paused =
        useGameStore(
            (s) => s.paused
        )

    const resetRun =
        useGameStore(
            (s) => s.resetRun
        )

    const continueLevel =
        useGameStore(
            (s) => s.continueLevel
        )

    // ========================================================
    // REFS
    // ========================================================

    const keysRef =
        useRef({})

    const poolsReady =
        useRef(false)

    // ========================================================
    // SCREEN NAVIGATION
    // ========================================================

    const go =
        useCallback(
            (next) => {

                const map = {

                    menu:
                        SCREEN.MENU,

                    play:
                        SCREEN.PLAY,

                    levelselect:
                        SCREEN.LEVEL_SELECT,

                    gameover:
                        SCREEN.GAME_OVER,

                    settings:
                        SCREEN.SETTINGS,

                    highscores:
                        SCREEN.HIGHSCORES,

                    howtoplay:
                        SCREEN.HOW_TO_PLAY,

                    guns:
                        SCREEN.GUNS,

                    levelcomplete:
                        SCREEN.LEVEL_COMPLETE,
                }

                const nextScreen =
                    map[next] ?? next

                useGameStore.setState({

                    screen:
                        nextScreen,

                    ...(next === "play"
                        ? {
                            paused: false,
                        }
                        : {}
                    ),
                })

            },
            []
        )

    // ========================================================
    // NEW GAME
    // ========================================================
    //
    // IMPORTANT:
    //
    // resetRun() resets the RUN but does not erase
    // unlocked weapons anymore.
    //
    // ========================================================

    const startNewGame =
        useCallback(
            () => {

                resetRun()

                useGameStore
                    .getState()
                    .startLevel(1)

            },
            [
                resetRun,
            ]
        )

    // ========================================================
    // BACK TO MENU
    // ========================================================
    //
    // This is intentionally a SOFT return.
    //
    // It does not reset anything.
    //
    // ========================================================

    const backToMenu =
        useCallback(
            () => {

                useGameStore.setState({

                    screen:
                        SCREEN.MENU,

                    paused:
                        false,
                })

            },
            []
        )

    // ========================================================
    // CONTINUE AFTER LEVEL
    // ========================================================

    const continueAfterLevel =
        useCallback(
            () => {

                continueLevel()

            },
            [
                continueLevel,
            ]
        )

    // ========================================================
    // PAUSE
    // ========================================================

    const togglePause =
        useCallback(
            () => {

                if (
                    useGameStore.getState().screen
                    !== SCREEN.PLAY
                ) {
                    return
                }

                useGameStore.setState(
                    (state) => ({
                        paused:
                            !state.paused,
                    })
                )

            },
            []
        )

    // ========================================================
    // ECS / INPUT INITIALIZATION
    // ========================================================

    useEffect(
        () => {

            if (!poolsReady.current) {

                initializeAsteroidPool()

                initializeBulletPool()

                poolsReady.current =
                    true
            }

            initializeInput(
                togglePause
            )

        },
        [
            togglePause,
        ]
    )

    // ========================================================
    // SPAWN PLAYER
    // ========================================================

    useEffect(
        () => {

            if (
                screen !== SCREEN.PLAY
            ) {
                return
            }

            spawnPlayer(
                0,
                0
            )

            useGameStore.setState({
                paused: false,
            })

        },
        [
            screen,
        ]
    )

    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div
            className="
                w-screen
                h-screen
                overflow-hidden
                bg-black
                relative
            "
        >

            <BG />


            {/* ================================================= */}
            {/* MENU */}
            {/* ================================================= */}

            {screen === SCREEN.MENU && (

                <MenuScreen

                    onPlay={
                        startNewGame
                    }

                    onLevelSelect={() =>
                        go("levelselect")
                    }

                    onGuns={() =>
                        go("guns")
                    }

                    onSettings={() =>
                        go("settings")
                    }

                    onHowToPlay={() =>
                        go("howtoplay")
                    }

                    onHighscores={() =>
                        go("highscores")
                    }

                />

            )}


            {/* ================================================= */}
            {/* PLAY */}
            {/* ================================================= */}

            {screen === SCREEN.PLAY && (

                <PlayScreen

                    keysRef={
                        keysRef
                    }

                    paused={
                        paused
                    }

                    onPause={
                        togglePause
                    }

                    onGameOver={() =>
                        go("gameover")
                    }

                    onLevelComplete={() =>
                        go("levelcomplete")
                    }

                />

            )}


            {/* ================================================= */}
            {/* LEVEL SELECT */}
            {/* ================================================= */}

            {screen === SCREEN.LEVEL_SELECT && (

                <LevelSelectScreen
                    onBack={() =>
                        go("menu")
                    }
                />

            )}


            {/* ================================================= */}
            {/* GAME OVER */}
            {/* ================================================= */}

            {screen === SCREEN.GAME_OVER && (

                <GameOverScreen

                    onRestart={
                        startNewGame
                    }

                    onMenu={
                        backToMenu
                    }

                />

            )}


            {/* ================================================= */}
            {/* LEVEL COMPLETE */}
            {/* ================================================= */}

            {screen === SCREEN.LEVEL_COMPLETE && (

                <LevelCompleteScreen

                    onContinue={
                        continueAfterLevel
                    }

                    onMenu={
                        backToMenu
                    }

                />

            )}


            {/* ================================================= */}
            {/* GUNS */}
            {/* ================================================= */}

            {screen === SCREEN.GUNS && (

                <GunsScreen

                    onBack={() =>
                        go("menu")
                    }

                />

            )}


            {/* ================================================= */}
            {/* SETTINGS */}
            {/* ================================================= */}

            {screen === SCREEN.SETTINGS && (

                <SettingsScreen
                    onBack={() =>
                        go("menu")
                    }
                />

            )}


            {/* ================================================= */}
            {/* HOW TO PLAY */}
            {/* ================================================= */}

            {screen === SCREEN.HOW_TO_PLAY && (

                <HowToPlayScreen
                    onBack={() =>
                        go("menu")
                    }
                />

            )}


            {/* ================================================= */}
            {/* HIGHSCORES */}
            {/* ================================================= */}

            {screen === SCREEN.HIGHSCORES && (

                <HighscoresScreen
                    onBack={() =>
                        go("menu")
                    }
                />

            )}

        </div>
    )
}