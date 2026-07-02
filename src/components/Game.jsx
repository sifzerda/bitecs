//src/state/Game.jsx

import { useEffect, useRef, useState } from "react"
import { PlayScreen } from "../screens/PlayScreen.jsx"
import { spawnPlayer } from "../ecs/spawn.js"
import { initializeInput } from "../ecs/systems/input.js"
import { gameStats } from "../state/gameStats.js"

export function Game() {
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        spawnPlayer(0, 0)
        initializeInput(togglePause)
    }, [])

    function togglePause() {
        gameStats.paused = !gameStats.paused
        setPaused(gameStats.paused)
    }

    return (
        <PlayScreen paused={paused} onPause={togglePause} />
    )
}