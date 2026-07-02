// src/pages/Home.jsx

import { useEffect, useRef, useState } from "react"
import { PlayScreen } from "../screens/PlayScreen"
import { spawnPlayer } from "../ecs/spawn"
import { gameStats } from "../state/gameStats"

export default function Home() {

    const keysRef = useRef({})
    const initialized = useRef(false)

    const [paused, setPaused] = useState(false)

    //----------------------------------
    // Initialize game once
    //----------------------------------

    useEffect(() => {
        spawnPlayer(0, 0)
    }, [])

    //----------------------------------
    // Keyboard
    //----------------------------------

    useEffect(() => {

        function keyDown(e) {

            keysRef.current[e.key] = true
            if (e.code === "KeyP") {
                togglePause()
            }

        }

        function keyUp(e) {
            keysRef.current[e.key] = false
        }

        function handleBlur() {

            keysRef.current = {}
            if (!gameStats.paused) {
                gameStats.paused = true
                setPaused(true)

            }

        }

        function handleVisibility() {

            if (document.hidden) {
                handleBlur()
            }

        }

        window.addEventListener("keydown", keyDown)
        window.addEventListener("keyup", keyUp)
        window.addEventListener("blur", handleBlur)
        document.addEventListener(
            "visibilitychange",
            handleVisibility
        )

        return () => {

            window.removeEventListener("keydown", keyDown)
            window.removeEventListener("keyup", keyUp)
            window.removeEventListener("blur", handleBlur)
            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            )
        }

    }, [])

    //----------------------------------
    // Pause
    //----------------------------------

    function togglePause() {

        gameStats.paused = !gameStats.paused
        setPaused(gameStats.paused)

    }

    //----------------------------------
    // Render
    //----------------------------------

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>

            <PlayScreen
                keysRef={keysRef}
                paused={paused}
                onPause={togglePause}
            />

        </div>
    )
}