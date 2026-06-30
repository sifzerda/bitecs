// src/pages/Home.jsx

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { spawnPlayer, spawnAsteroid } from '../ecs/spawn.js'
import { PlayScreen } from '../screens/PlayScreen.jsx'
import { gameStats } from '../state/gameStats.js'
import { HUD } from '../components/HUD'

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

        <div className="border-2 border-green-400">
            <div className="flex-1 h-[calc(100vh-120px)] items-center justify-center px-4">
                <HUD
                    onPause={handlePause}
                    paused={paused}
                />
                <Canvas
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                    orthographic
                    camera={{
                        zoom: 60,
                        position: [0, 0, 10],
                        near: 0.1,
                        far: 100
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                    }}>
                    <PlayScreen
                        keysRef={keysRef}
                        paused={paused}
                    />
                </Canvas>
            </div>
        </div>
    )
}