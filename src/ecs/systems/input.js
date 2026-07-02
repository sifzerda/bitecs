// src/ecs/systems/input.js

export const input = {
    left: false,
    right: false,
    thrust: false,
    brake: false,
    fire: false
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
    Spacebar: "fire"
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