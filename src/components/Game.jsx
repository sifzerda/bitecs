//src/state/Game.jsx
// this is the 'startGame' equivalent from v.3

import { useEffect, useRef, useState } from "react"
import { PlayScreen } from "../screens/PlayScreen.jsx"
import { spawnPlayer } from "../ecs/spawn.js"
import { initializeInput } from "../ecs/systems/input.js"
import { gameState } from "../state/gameState.js"
import { initializeBulletPool } from '../ecs/pools/bulletPool.js'
import { initializeAsteroidPool } from '../ecs/pools/asteroidPool.js'
import { initializeSparkPool } from '../ecs/pools/sparkPool.js'

export function Game() {
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        spawnPlayer(0, 0)
        initializeInput(togglePause)
        initializeAsteroidPool()
        initializeBulletPool()
        initializeSparkPool()
    }, [])

    function togglePause() {
        gameState.paused = !gameState.paused
        setPaused(gameState.paused)
    }

    return (
        <PlayScreen paused={paused} onPause={togglePause} />
    )
}