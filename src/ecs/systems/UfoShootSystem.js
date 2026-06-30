// src/ecs/systems/ufoShootSystem.js

import { world } from "../constants/world"
import { ufoQuery, playerQuery } from "../constants/queries"
import { Position } from "../components"
import { spawnEnemyBullet } from "../spawnEnemyBullet"
import { gameStats } from "../../state/gameStats"

const BASE_FIRE_INTERVAL = 1.4
const MIN_FIRE_INTERVAL = 0.5 // fastest firing rate at high difficulty
const AIM_SPREAD = 0.18       // radians of inaccuracy, so shots aren't laser-perfect

// Per-entity cooldown state, keyed by entity id
const fireTimers = new Map()

export function ufoShootSystem() {
    const dt = world.time.delta
    const ufos = ufoQuery()
    const players = playerQuery()

    if (players.length === 0) return
    const playerId = players[0]

    const ids = new Set(ufos)
    // Clean up timers for UFOs that no longer exist
    for (const id of fireTimers.keys()) {
        if (!ids.has(id)) fireTimers.delete(id)
    }

    for (let i = 0; i < ufos.length; i++) {
        const id = ufos[i]

        let timer = fireTimers.get(id)
        if (timer === undefined) {
            timer = Math.random() * BASE_FIRE_INTERVAL // stagger initial shot
        }

        timer -= dt

        if (timer <= 0) {
            fireAt(id, playerId)

            const interval = getFireInterval(gameStats.difficulty)
            timer = interval
        }

        fireTimers.set(id, timer)
    }
}

function getFireInterval(difficulty) {
    const t = Math.min(difficulty / 20, 1)
    return BASE_FIRE_INTERVAL - (BASE_FIRE_INTERVAL - MIN_FIRE_INTERVAL) * t
}

function fireAt(ufoId, playerId) {
    const dx = Position.x[playerId] - Position.x[ufoId]
    const dy = Position.y[playerId] - Position.y[ufoId]

    const baseAngle = Math.atan2(dy, dx)
    const angle = baseAngle + (Math.random() - 0.5) * AIM_SPREAD

    spawnEnemyBullet(Position.x[ufoId], Position.y[ufoId], angle)
}