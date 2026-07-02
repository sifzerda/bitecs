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
    KeyA: "left",

    ArrowRight: "right",
    KeyD: "right",

    ArrowUp: "thrust",
    KeyW: "thrust",

    ArrowDown: "brake",
    KeyS: "brake",

    Space: "fire"
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

        const action = bindings[e.code]

        if (action) {
            input[action] = true
        }

        if (e.code === "KeyP") {
            onPause?.()
        }
    }

    function keyUp(e) {

        const action = bindings[e.code]

        if (action) {
            input[action] = false
        }
    }

    function clearInput() {

        for (const action of Object.values(bindings)) {
            input[action] = false
        }

    }

}