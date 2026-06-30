// src/pages/Home.jsx

import { useEffect, useRef, useState } from 'react'
import { spawnPlayer, spawnAsteroid } from '../ecs/spawn.js'
import { spawnUfo } from '../ecs/spawnUfo.js'
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
        spawnUfo(0, 4) // test, delete once Ufo works

    }, [])

    useEffect(() => {
        const down = (e) => {
            keysRef.current[e.key] = true

            if (e.code === "KeyP") {
                handlePause()
            }
        }

        const up = (e) => {
            keysRef.current[e.key] = false
        }

        const handleBlur = () => {
            // Clear any held keys so they don't get "stuck"
            keysRef.current = {}

            if (!gameStats.paused) {
                gameStats.paused = true
                setPaused(true)
            }
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleBlur()
            }
        }

        window.addEventListener("keydown", down)
        window.addEventListener("keyup", up)
        window.addEventListener("blur", handleBlur)
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            window.removeEventListener("keydown", down)
            window.removeEventListener("keyup", up)
            window.removeEventListener("blur", handleBlur)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
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