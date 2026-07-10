// src/ecs/systems/tentacleSystem.js

import { addEntity, addComponent } from "bitecs"
import { world } from "../constants/world.js"
import {
    Position, Health,
    Tentacle, TentacleTag,
} from "../constants/components.js"
import { tentacleQuery, playerQuery } from "../constants/queries.js"
import { gameState } from "../../state/gameState.js"

const MAX_PER_EDGE = 4
const EDGES = [0, 1, 2, 3] // left, right, top, bottom

const PHASE = { HIDDEN: 0, EMERGING: 1, ACTIVE: 2, RETRACTING: 3 }

const TIMINGS = {
    emerge: 1.4,
    activeMin: 2.5,
    activeMax: 5.0,
    retract: 1.0,
    hiddenMin: 1.0,
    hiddenMax: 4.0,
}

const DEFAULT_TIP_RADIUS = 0.6
const DEFAULT_DAMAGE = 8
const DEFAULT_HIT_COOLDOWN = 0.6
const DEFAULT_TENTACLE_HP = 30

let spawned = false
let tentacleEids = []

function randRange(min, max) {
    return min + Math.random() * (max - min)
}

function spawnTentacles() {
    if (spawned) return tentacleEids

    tentacleEids = []
    for (const edge of EDGES) {
        for (let i = 0; i < MAX_PER_EDGE; i++) {
            const id = addEntity(world)

            addComponent(world, id, Position)
            addComponent(world, id, Health)
            addComponent(world, id, Tentacle)
            addComponent(world, id, TentacleTag)

            Health.current[id] = DEFAULT_TENTACLE_HP
            Health.max[id] = DEFAULT_TENTACLE_HP

            Tentacle.phase[id] = PHASE.HIDDEN
            Tentacle.timer[id] = randRange(0, 3)
            Tentacle.deployT[id] = 0
            Tentacle.edge[id] = edge
            Tentacle.along[id] = randRange(-0.42, 0.42)
            Tentacle.tipRadius[id] = DEFAULT_TIP_RADIUS
            Tentacle.damage[id] = DEFAULT_DAMAGE
            Tentacle.hitCooldown[id] = 0

            tentacleEids.push(id)
        }
    }

    spawned = true
    return tentacleEids
}

function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

// Sever a tentacle — call this from your bullet-vs-entity collision code
// whenever a player bullet hits a tentacle eid (from tentacleQuery).
export function damageTentacle(eid, amount) {
    if (Tentacle.phase[eid] !== PHASE.ACTIVE) return // can only be hit while reached out

    Health.current[eid] -= amount
    if (Health.current[eid] <= 0) {
        Health.current[eid] = Health.max[eid]
        Tentacle.phase[eid] = PHASE.RETRACTING
        Tentacle.timer[eid] = TIMINGS.retract
        Tentacle.deployT[eid] = 1 // start retract animation from wherever it currently is
    }
}

// Call every frame from your main system loop.
export function tentacleSystem(dt) {

    if (!gameState.tentaclesEnabled) {
        if (spawned) {
            const tentacles = tentacleQuery()
            for (let i = 0; i < tentacles.length; i++) {
                const eid = tentacles[i]
                if (Tentacle.phase[eid] === PHASE.ACTIVE || Tentacle.phase[eid] === PHASE.EMERGING) {
                    Tentacle.phase[eid] = PHASE.RETRACTING
                    Tentacle.timer[eid] = TIMINGS.retract
                } else if (Tentacle.phase[eid] === PHASE.HIDDEN) {
                    Tentacle.timer[eid] = Math.max(Tentacle.timer[eid], 999) // park it, don't re-emerge
                }
            }
        }
        return
    }

    if (!spawned) spawnTentacles()

    const tentacles = tentacleQuery()
    if (tentacles.length === 0) return

    const players = playerQuery()
    const hasPlayer = players.length > 0
    const playerEid = hasPlayer ? players[0] : null

    for (let i = 0; i < tentacles.length; i++) {
        const eid = tentacles[i]

        Tentacle.timer[eid] -= dt
        if (Tentacle.hitCooldown[eid] > 0) {
            Tentacle.hitCooldown[eid] -= dt
        }

        const phase = Tentacle.phase[eid]

        if (Tentacle.timer[eid] <= 0) {
            if (phase === PHASE.HIDDEN) {
                Tentacle.phase[eid] = PHASE.EMERGING
                Tentacle.timer[eid] = TIMINGS.emerge
            } else if (phase === PHASE.EMERGING) {
                Tentacle.phase[eid] = PHASE.ACTIVE
                const activeDuration = randRange(TIMINGS.activeMin, TIMINGS.activeMax)
                Tentacle.timer[eid] = activeDuration
            } else if (phase === PHASE.ACTIVE) {
                Tentacle.phase[eid] = PHASE.RETRACTING
                Tentacle.timer[eid] = TIMINGS.retract
            } else if (phase === PHASE.RETRACTING) {
                Tentacle.phase[eid] = PHASE.HIDDEN
                Tentacle.timer[eid] = randRange(TIMINGS.hiddenMin, TIMINGS.hiddenMax)
                // re-roll spawn point so it doesn't always emerge in the same spot
                Tentacle.along[eid] = randRange(-0.42, 0.42)
            }
        }

        // deployT is recalculated every frame from phase+timer so the renderer
        // (or anything else) can read a smooth 0..1 value without re-deriving state.
        const currentPhase = Tentacle.phase[eid]
        if (currentPhase === PHASE.EMERGING) {
            Tentacle.deployT[eid] = easeInOutCubic(1 - Math.max(0, Tentacle.timer[eid]) / TIMINGS.emerge)
        } else if (currentPhase === PHASE.ACTIVE) {
            Tentacle.deployT[eid] = 1
        } else if (currentPhase === PHASE.RETRACTING) {
            Tentacle.deployT[eid] = easeInOutCubic(Math.max(0, Tentacle.timer[eid]) / TIMINGS.retract)
        } else {
            Tentacle.deployT[eid] = 0
        }

        // Contact damage — tip position (Position.x/y[eid]) is written by the
        // renderer each frame from its verlet chain tip. Only check while active.
        if (currentPhase === PHASE.ACTIVE && hasPlayer && Tentacle.hitCooldown[eid] <= 0) {
            const dx = Position.x[playerEid] - Position.x[eid]
            const dy = Position.y[playerEid] - Position.y[eid]
            const dist = Math.hypot(dx, dy)

            if (dist <= Tentacle.tipRadius[eid]) {
                Health.current[playerEid] -= Tentacle.damage[eid]
                Tentacle.hitCooldown[eid] = DEFAULT_HIT_COOLDOWN
            }
        }
    }
}