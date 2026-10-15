// src/ecs/systems/octoAISystem.js
//
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BossType, OctopusMinion } from "../constants/components.js"
import { bossQuery, playerQuery, octopusMinionQuery } from "../constants/queries.js"
import { isOctopusType } from "../constants/bosses.js"
import { simState } from "../../state/simState.js"
import { spawnOctopusMinion } from "../spawn.js"

// ============================================================
// SETTINGS
// ============================================================

// Central boss
const BOSS_SPEED = 2.0
const BOSS_ORBIT_DISTANCE = 5.0
const BOSS_ORBIT_STRENGTH = 0.35
// Minions
const MINION_SPEED = 3.0
const MINION_ORBIT_DISTANCE = 2.5
const MINION_ORBIT_STRENGTH = 0.7
// Respawn
const MINION_GROUP_SIZE = 3
const MINION_RESPAWN_DELAY = 2.5
// Movement
const MIN_DISTANCE = 0.1

// ============================================================
// HELPERS
// ============================================================

function normalize(x, y) {
    const length = Math.sqrt(x * x + y * y)

    if (length < MIN_DISTANCE) {
        return { x: 0, y: 0 }
    }

    return {
        x: x / length,
        y: y / length,
    }
}

// ============================================================
// CENTRAL OCTOPUS BOSS MOVEMENT
// ============================================================

function updateBossMovement(bossId, playerId, dt) {

    const dx = Position.x[playerId] - Position.x[bossId]
    const dy = Position.y[playerId] - Position.y[bossId]
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < MIN_DISTANCE) return

    const direction = normalize(dx, dy)

    // Perpendicular direction creates a gentle circling movement.
    const orbitX = -direction.y
    const orbitY = direction.x
    const orbitDirection = Math.sin(world.time.elapsed * 0.5)

    let moveX = direction.x
    let moveY = direction.y

    if (distance < BOSS_ORBIT_DISTANCE) {
        moveX += orbitX * orbitDirection * BOSS_ORBIT_STRENGTH
        moveY += orbitY * orbitDirection * BOSS_ORBIT_STRENGTH
    }

    const movement = normalize(moveX, moveY)

    Velocity.x[bossId] = movement.x * BOSS_SPEED
    Velocity.y[bossId] = movement.y * BOSS_SPEED

    Rotation[bossId] = Math.atan2(movement.y, movement.x)
}

// ============================================================
// MINION GROUP SPAWNING
// ============================================================

function spawnMinionGroup(bossId) {

    const bossX = Position.x[bossId]
    const bossY = Position.y[bossId]

    const spawnRadius = 4.0

    for (let i = 0; i < MINION_GROUP_SIZE; i++) {

        const angle = (Math.PI * 2 * i) / MINION_GROUP_SIZE

        const x = bossX + Math.cos(angle) * spawnRadius
        const y = bossY + Math.sin(angle) * spawnRadius

        const orbitDirection = i % 2 === 0 ? 1 : -1

        spawnOctopusMinion(x, y, orbitDirection)
    }

    simState.octopusMinionsRemaining = MINION_GROUP_SIZE
    simState.octopusMinionGroupActive = true

    console.log("Octopus minions spawned:", MINION_GROUP_SIZE)
}

// ============================================================
// MINION MOVEMENT
// ============================================================

function updateMinionMovement(minionId, playerId, dt) {

    const dx = Position.x[playerId] - Position.x[minionId]
    const dy = Position.y[playerId] - Position.y[minionId]
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < MIN_DISTANCE) return

    const direction = normalize(dx, dy)
    const orbitDirection = OctopusMinion.orbitDirection[minionId]

    // Each minion circles the player from a different direction.
    const orbitX = -direction.y * orbitDirection
    const orbitY = direction.x * orbitDirection

    let moveX = direction.x
    let moveY = direction.y

    if (distance < MINION_ORBIT_DISTANCE) {

        moveX += orbitX * MINION_ORBIT_STRENGTH
        moveY += orbitY * MINION_ORBIT_STRENGTH
    }

    const movement = normalize(moveX, moveY)
    const speed = OctopusMinion.moveSpeed[minionId] || MINION_SPEED

    Velocity.x[minionId] = movement.x * speed
    Velocity.y[minionId] = movement.y * speed
    Rotation[minionId] = Math.atan2(movement.y, movement.x)
}

// ============================================================
// MAIN OCTOPUS AI SYSTEM
// ============================================================

export function octoAISystem() {

    const dt = world.time.delta

    const bosses = bossQuery()
    const players = playerQuery()

    if (players.length === 0) return

    const playerId = players[0]

    // Find the actual central octopus boss.
    let octopusBossId = -1

    for (let i = 0; i < bosses.length; i++) {

        const bossId = bosses[i]

        if (!isOctopusType(BossType.typeIndex[bossId])) {
            continue
        }

        octopusBossId = bossId
        break
    }

    // No central boss means no active octopus encounter.
    if (octopusBossId === -1) {

        simState.octopusEncounterActive = false
        simState.octopusMinionsRemaining = 0
        simState.octopusMinionGroupActive = false
        simState.octopusMinionSpawnTimer = 0

        return
    }

    simState.octopusEncounterActive = true

    // --------------------------------------------------------
    // Central boss movement
    // --------------------------------------------------------

    updateBossMovement(octopusBossId, playerId, dt)

    // --------------------------------------------------------
    // Minion group spawning
    // --------------------------------------------------------

    if (!simState.octopusMinionGroupActive) {

        if (simState.octopusMinionSpawnTimer > 0) {

            simState.octopusMinionSpawnTimer -= dt

            if (simState.octopusMinionSpawnTimer < 0) {
                simState.octopusMinionSpawnTimer = 0
            }
        }

        if (simState.octopusMinionSpawnTimer <= 0) {

            spawnMinionGroup(octopusBossId)
        }
    }

    // --------------------------------------------------------
    // Minion movement
    // --------------------------------------------------------

    const minions = octopusMinionQuery()

    for (let i = 0; i < minions.length; i++) {
        const minionId = minions[i]
        updateMinionMovement(minionId, playerId, dt)
    }
}