// src/ecs/systems/input.js

import { gameState } from "../../state/gameState.js"
import { WEAPONS } from "../constants/weapons.js"

export const input = {
    left: false,
    right: false,
    thrust: false,
    brake: false,
    fire: false,
    boost: false
}

const bindings = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "thrust",
    ArrowDown: "brake",
    KeyA: "left",
    KeyD: "right",
    KeyW: "thrust",
    KeyS: "brake",
    Space: "fire",
    Spacebar: "fire",
    KeyB: "boost"
}

let initialized = false

export function initializeInput(onPause) {

    if (initialized) return
    initialized = true

    window.addEventListener("keydown", keyDown)
    window.addEventListener("keyup", keyUp)
    window.addEventListener("blur", clearInput)

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) clearInput()
    })

    function keyDown(e) {

        const key = e.code || e.key
        const action = bindings[key]

        if (action) {
            input[action] = true
        }

        if (e.code === "KeyP") {
            onPause?.()
        }
        // ---- weapon switching (fires once per keypress) ----

        if (e.code === "Digit1") gameState.currentWeapon = 0
        if (e.code === "Digit2") gameState.currentWeapon = 1
        if (e.code === "Digit3") gameState.currentWeapon = 2

        if (e.code === "KeyQ") {
            gameState.currentWeapon = (gameState.currentWeapon - 1 + WEAPONS.length) % WEAPONS.length
        }

        if (e.code === "KeyE") {
            gameState.currentWeapon = (gameState.currentWeapon + 1) % WEAPONS.length
        }
    }

    function keyUp(e) {

        const key = e.code || e.key
        const action = bindings[key]

        if (action) {
            input[action] = false
        }
    }

    function clearInput() {

        for (const action of new Set(Object.values(bindings))) {
            input[action] = false
        }

    }

}