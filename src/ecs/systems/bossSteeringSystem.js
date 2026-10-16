// src/ecs/systems/bossSteeringSystem.js


// src/ecs/systems/bossSteeringSystem.js

import * as YUKA from "yuka"

import {
    Position,
    Velocity,
} from "../constants/components.js"

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    maxSpeed: 7.5,
    maxForce: 14,
    mass: 1,

    idealRange: 8,
    retreatBuffer: 5,

    orbitSpeed: 0.85,

    // Medium evasion:
    // The boss begins reacting when the player gets close.
    evadeDistance: 4.5,
    evadeWeight: 0.85,

    seekWeight: 1.0,

    drag: 0.985,
}

// ============================================================
// YUKA STEERING AGENTS
// ============================================================

const agents = new Map()

// Reused output vector to avoid allocating every frame.
const steeringForce = new YUKA.Vector3()

function createAgent() {

    const vehicle = new YUKA.Vehicle()

    vehicle.maxSpeed = CONFIG.maxSpeed
    vehicle.maxForce = CONFIG.maxForce
    vehicle.mass = CONFIG.mass

    // We control rotation independently through ECS.
    vehicle.updateOrientation = false

    // Target used by the SeekBehavior.
    const seekTarget = new YUKA.Vector3()

    const seek = new YUKA.SeekBehavior(seekTarget)
    seek.weight = CONFIG.seekWeight

    // Player proxy. It is synchronised from ECS each frame.
    const player = new YUKA.Vehicle()

    player.updateOrientation = false

    const evade = new YUKA.EvadeBehavior(
        player,
        CONFIG.evadeDistance,
        0.8
    )

    evade.weight = CONFIG.evadeWeight

    // Evasion is evaluated before normal movement.
    vehicle.steering.add(evade)
    vehicle.steering.add(seek)

    return {
        vehicle,
        player,
        seek,
        seekTarget,
        evade,

        orbitAngle: 0,
        previousState: -1,
    }
}

// ============================================================
// GET / CREATE AGENT
// ============================================================

function getAgent(id) {

    let agent = agents.get(id)

    if (!agent) {
        agent = createAgent()
        agents.set(id, agent)
    }

    return agent
}

// ============================================================
// TARGET POSITION
// ============================================================

function updateMovementTarget(
    agent,
    state,
    bossX,
    bossY,
    playerX,
    playerY,
    distance,
    directionX,
    directionY,
    strafeDirection,
    dt
) {

    const { seekTarget } = agent

    // Initialise orbit angle when entering a new state.
    if (agent.previousState !== state) {

        agent.orbitAngle = Math.atan2(
            bossY - playerY,
            bossX - playerX
        )

        agent.previousState = state
    }

    // --------------------------------------------------------
    // APPROACH
    // --------------------------------------------------------

    if (state === 0) {

        // Approach while maintaining a preferred distance.
        seekTarget.set(
            playerX + directionX * CONFIG.idealRange,
            0,
            playerY + directionY * CONFIG.idealRange
        )
    }

    // --------------------------------------------------------
    // RETREAT
    // --------------------------------------------------------

    else if (state === 1) {

        const retreatDistance = Math.max(
            CONFIG.idealRange + CONFIG.retreatBuffer,
            distance + CONFIG.retreatBuffer
        )

        seekTarget.set(
            playerX + directionX * retreatDistance,
            0,
            playerY + directionY * retreatDistance
        )
    }

    // --------------------------------------------------------
    // ORBIT / STRAFE
    // --------------------------------------------------------

    else {

        agent.orbitAngle +=
            strafeDirection *
            CONFIG.orbitSpeed *
            dt

        seekTarget.set(
            playerX + Math.cos(agent.orbitAngle) * CONFIG.idealRange,
            0,
            playerY + Math.sin(agent.orbitAngle) * CONFIG.idealRange
        )
    }
}

// ============================================================
// STEERING UPDATE
// ============================================================

export function updateBossSteering(
    id,
    pid,
    target,
    dt,
    state,
    strafeDirection
) {

    const agent = getAgent(id)

    const {
        vehicle,
        player,
    } = agent

    // --------------------------------------------------------
    // SYNCHRONISE BOSS WITH ECS
    // --------------------------------------------------------

    const bossX = Position.x[id]
    const bossY = Position.y[id]

    vehicle.position.set(
        bossX,
        0,
        bossY
    )

    vehicle.velocity.set(
        Velocity.x[id],
        0,
        Velocity.y[id]
    )

    // --------------------------------------------------------
    // SYNCHRONISE PLAYER PROXY
    // --------------------------------------------------------

    player.position.set(
        Position.x[pid],
        0,
        Position.y[pid]
    )

    player.velocity.set(
        Velocity.x[pid],
        0,
        Velocity.y[pid]
    )

    // --------------------------------------------------------
    // UPDATE DESIRED MOVEMENT TARGET
    // --------------------------------------------------------

    updateMovementTarget(
        agent,
        state,
        bossX,
        bossY,
        Position.x[pid],
        Position.y[pid],
        target.distance,
        target.directionX,
        target.directionY,
        strafeDirection,
        dt
    )

    // --------------------------------------------------------
    // CALCULATE YUKA STEERING FORCE
    // --------------------------------------------------------

    vehicle.steering.calculate(
        dt,
        steeringForce
    )

    // --------------------------------------------------------
    // APPLY FORCE TO ECS VELOCITY
    // --------------------------------------------------------

    Velocity.x[id] +=
        (steeringForce.x / vehicle.mass) * dt

    Velocity.y[id] +=
        (steeringForce.z / vehicle.mass) * dt

    // --------------------------------------------------------
    // MAXIMUM SPEED
    // --------------------------------------------------------

    const speed = Math.hypot(
        Velocity.x[id],
        Velocity.y[id]
    )

    if (speed > CONFIG.maxSpeed) {

        const scale = CONFIG.maxSpeed / speed

        Velocity.x[id] *= scale
        Velocity.y[id] *= scale
    }

    // --------------------------------------------------------
    // INERTIAL DRAG
    // --------------------------------------------------------

    const drag = Math.pow(
        CONFIG.drag,
        dt * 60
    )

    Velocity.x[id] *= drag
    Velocity.y[id] *= drag
}

// ============================================================
// CLEANUP
// ============================================================

export function cleanupBossSteering(activeBosses) {

    const active = new Set(activeBosses)

    for (const id of agents.keys()) {

        if (!active.has(id)) {
            agents.delete(id)
        }
    }
}
