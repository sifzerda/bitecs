// src/pages/Home.jsx

import { useEffect, useRef, useState } from 'react'
 
import { spawnPlayer, spawnAsteroid } from '../ecs/spawn.js'
import { PlayScreen } from '../screens/PlayScreen.jsx'
import { gameStats } from '../state/gameStats.js'
 

export default function Home() {

    const keysRef = useRef({})
    const initialised = useRef(false)
    const [paused, setPaused] = useState(false)

    useEffect(() => {

        if (initialised.current) return
        initialised.current = true
        // create player entity
        spawnPlayer(0, 0)

        // create asteroids
        for (let i = 0; i < 8; i++) {
            spawnAsteroid((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 14)
        }
    }, [])

    useEffect(() => {
        const down = e => {
            keysRef.current[e.key] = true
            if (e.key === "Escape") { handlePause() }
        }

        const up = e => { keysRef.current[e.key] = false }

        window.addEventListener("keydown", down)
        window.addEventListener("keyup", up)

        return () => {
            window.removeEventListener("keydown", down)
            window.removeEventListener("keyup", up)
        }
    }, [])

    function handlePause() {
        gameStats.paused = !gameStats.paused
        setPaused(gameStats.paused)
    }

    return (
        <PlayScreen
            keysRef={keysRef}
            paused={paused}
            onPause={handlePause}
        />
    )
}