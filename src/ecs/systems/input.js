// src/ecs/systems/input.js

import { gameState } from "../../state/gameState.js"
import { WEAPONS } from "../constants/weapons.js"

export const input = {

    left: false,
    right: false,

    thrust: false,
    brake: false,

    fire: false,
    boost: false,
    deflect: false,

    mouseX: 0,
    mouseY: 0,
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

    KeyB: "boost",
    KeyX: "deflect",
}

let initialized = false

const wheelOptions = { passive: false }

function cycleWeapon(direction) {

    gameState.currentWeapon = (gameState.currentWeapon + direction + WEAPONS.length) % WEAPONS.length

}

export function clearInput() {

    for (const action of new Set(Object.values(bindings))) {

        input[action] = false

    }

}

export function initializeInput(onPause) {

    if (initialized) return

    initialized = true

    const weaponKeys = {
        Digit1: 0,
        Digit2: 1,
        Digit3: 2,
        Digit4: 3,
        Digit5: 4,

        Digit6: 5,
        Digit7: 6,
        Digit8: 7,
        Digit9: 8,
        Digit0: 9,
    }

    function keyDown(e) {

        const key = e.code || e.key
        const action = bindings[key]

        if (action) {
            input[action] = true
        }

        // ignore held-key repeats
        if (e.repeat)
            return

        if (e.code === "KeyP") {
            onPause?.()
            return
        }


        if (e.code === "KeyQ") {
            cycleWeapon(-1)
            return
        }


        if (e.code === "KeyE") {
            cycleWeapon(1)
            return
        }

        const weaponIndex = weaponKeys[e.code]

        if (
            weaponIndex !== undefined && weaponIndex < WEAPONS.length
        ) {
            gameState.currentWeapon = weaponIndex
        }

    }


    function keyUp(e) {

        const key = e.code || e.key

        const action = bindings[key]

        if (action) {
            input[action] = false
        }

    }

    function mouseMove(e) {
        input.mouseX = e.clientX
        input.mouseY = e.clientY
    }

    function wheel(e) {
        e.preventDefault()
        if (e.deltaY > 0) {
            cycleWeapon(1)
        } else {
            cycleWeapon(-1)
        }

    }

    window.addEventListener("keydown", keyDown)
    window.addEventListener("keyup", keyUp)
    window.addEventListener("mousemove", mouseMove)
    window.addEventListener("wheel", wheel, wheelOptions)
    window.addEventListener("blur", clearInput)
    document.addEventListener("visibilitychange", () => { if (document.hidden) { clearInput() }

    })

}