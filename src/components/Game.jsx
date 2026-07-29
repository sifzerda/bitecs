// src/state/Game.jsx

import { useEffect, useState } from "react"

import { spawnPlayer } from "../ecs/spawn.js"
import { initializeInput } from "../ecs/systems/input.js"

import { initializeBulletPool } from "../ecs/pools/bulletPool.js"
import { initializeAsteroidPool } from "../ecs/pools/asteroidPool.js"

import { gameState, SCREEN } from "../state/gameState.js"
import { useUIState } from "../state/uiState"

import { PlayScreen } from "../screens/PlayScreen.jsx"
import { MenuScreen } from "../screens/MenuScreen.jsx"
import { EquipScreen } from "../screens/EquipScreen.jsx"
import { StageCompleteScreen } from "../screens/StageCompleteScreen.jsx"
import { SettingsScreen } from "../screens/SettingsScreen.jsx"
import { GameOverScreen } from "../screens/GameOverScreen.jsx"

export function Game() {

    const [, forceUpdate] = useState(0)
    const [paused, setPaused] = useState(gameState.paused)

    useEffect(() => {

        spawnPlayer(0, 0)

        initializeAsteroidPool()
        initializeBulletPool()

        initializeInput(togglePause)

        let frame

        const update = () => {

            // Force React to notice screen changes
            forceUpdate(v => v + 1)

            // Keep pause state in sync
            setPaused(gameState.paused)

            frame = requestAnimationFrame(update)

        }

        update()

        return () => cancelAnimationFrame(frame)

    }, [])

    function togglePause() {

        if (gameState.screen !== SCREEN.PLAY)
            return

        gameState.paused = !gameState.paused

        setPaused(gameState.paused)

    }

    switch (gameState.screen) {

        case SCREEN.MENU:

            return <MenuScreen />

        case SCREEN.PLAY:

            return (
                <PlayScreen
                    paused={paused}
                    onPause={togglePause}
                />
            )

        case SCREEN.ARMOURY:

            return <EquipScreen />

        case SCREEN.STAGE_COMPLETE:

            return <StageCompleteScreen />

        case SCREEN.SETTINGS:

            return <SettingsScreen />

        case SCREEN.GAME_OVER:

            return <GameOverScreen />

        default:

            return <MenuScreen />

    }

}