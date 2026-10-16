// src/ecs/systems/playerMotion.js

let angularVelocity = 0
let activePlayerId = null

export function getAngularVelocity() {
    return angularVelocity
}

export function setAngularVelocity(value) {
    angularVelocity = value
}

export function applyPlayerAngularImpulse(value) {
    angularVelocity += value
}

export function resetPlayerMotion(playerId = null) {
    angularVelocity = 0
    activePlayerId = playerId
}

export function syncPlayerMotion(playerId) {
    if (activePlayerId !== playerId) {
        angularVelocity = 0
        activePlayerId = playerId
    }
}
