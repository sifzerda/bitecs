// src/ecs/systems/octopusBossSystem.js

import {
    Position,
    Velocity,
    Rotation,
    BossType,
    Health,
    StatusEffect,
} from "../constants/components.js"

import { BOSSES } from "../constants/bosses.js"
import { bossQuery, playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { startState } from "../../state/startState.js"
import { damagePlayer } from "./playerDamage.js"

export const OCTOPUS = Object.freeze({
    count: 6,
    segments: 32,

    coreRadius: 0.85,

    // Same dimensions as TentacleRenderer.
    spacing: 0.9,
    baseRadius: 0.20,
    tipRadius: 0.02,

    damage: 30,
    rest: 0.9,
    warning: 0.85,
    strike: 0.6,
    hold: 0.2,
    retract: 0.75,
    entrance: 1.5,
})

const TOTAL_POINTS = OCTOPUS.count * OCTOPUS.segments

export const octopusState = {
    eid: -1,
    width: 24,
    height: 14,

    time: 0,
    phase: "entrance",
    timer: 0,
    attack: 0,

    targetX: 0,
    targetY: 0,

    hit: false,
    warning: false,
    danger: false,

    coreX: 0,
    coreY: 0,

    x: new Float32Array(TOTAL_POINTS),
    y: new Float32Array(TOTAL_POINTS),
    radius: new Float32Array(TOTAL_POINTS),
}

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

function smooth(value) {
    const t = clamp(value, 0, 1)
    return t * t * (3 - 2 * t)
}

// Independent flowing simulation for each gameplay arm.
// The rendered and collision positions are both written to octopusState.
const simulations = Array.from(
    { length: OCTOPUS.count },
    (_, arm) => ({
        seed: ((arm + 1) * 0.61803398875) % 1,

        nodes: Array.from(
            { length: OCTOPUS.segments },
            () => ({
                x: 0,
                y: 0,
                ox: 0,
                oy: 0,
                vx: 0,
                vy: 0,
            })
        ),
    })
)

export function setOctopusViewport(width, height) {
    if (width > 0 && height > 0) {
        octopusState.width = width
        octopusState.height = height
    }
}

export function findOctopusBoss() {
    for (const id of bossQuery()) {
        if (BOSSES[BossType.typeIndex[id]]?.key === "octopus") {
            return id
        }
    }

    return -1
}

export function anchorOctopusBoss() {
    const id = findOctopusBoss()
    if (id < 0) return

    const s = octopusState

    s.coreX = -s.width / 2 + 1.1
    s.coreY = 0

    Position.x[id] = s.coreX
    Position.y[id] = s.coreY

    Velocity.x[id] = 0
    Velocity.y[id] = 0
    Rotation[id] = 0
}

function rootYForArm(arm) {
    return (
        -0.75 +
        arm * 1.5 / Math.max(1, OCTOPUS.count - 1)
    ) * octopusState.height / 2
}

export function resetOctopusBoss(eid = -1) {
    const s = octopusState

    s.eid = eid
    s.time = 0
    s.phase = "entrance"
    s.timer = 0
    s.attack = 0

    s.hit = false
    s.warning = false
    s.danger = false

    s.targetX = 0
    s.targetY = 0

    s.x.fill(0)
    s.y.fill(0)
    s.radius.fill(0)

    const rootX = -s.width / 2 + 0.35

    for (let arm = 0; arm < OCTOPUS.count; arm++) {
        const rootY = rootYForArm(arm)

        for (const node of simulations[arm].nodes) {
            node.x = node.ox = rootX
            node.y = node.oy = rootY
            node.vx = 0
            node.vy = 0
        }
    }

    if (eid >= 0) {
        anchorOctopusBoss()
        buildShape()
    }
}

// Uses the visual renderer's node movement and smoothing.
// Called at 60 Hz so motion does not depend on display refresh rate.
function updateFlow(sim, rootX, rootY) {
    const nodes = sim.nodes
    const seed = sim.seed
    const time = octopusState.time

    nodes[0].x = rootX
    nodes[0].y = rootY

    const wanderX =
        Math.sin(time * 1.10 + seed * 6.283) * 0.50

    const wanderY =
        Math.cos(time * 1.10 * 0.8 + seed * 11) * 0.50

    const last = nodes.length - 1

    for (let j = 1; j < nodes.length; j++) {
        const previous = nodes[j - 1]
        const node = nodes[j]

        node.x += node.vx
        node.y += node.vy

        const angle = Math.atan2(
            previous.y - node.y,
            previous.x - node.x
        )

        node.x =
            previous.x - Math.cos(angle) * OCTOPUS.spacing

        node.y =
            previous.y - Math.sin(angle) * OCTOPUS.spacing

        // Reference friction is zero.
        node.vx = 0.85 + wanderX
        node.vy = 0.45 + wanderY

        const t = j / last

        const wave =
            Math.sin(
                time * 2.55 -
                t * 0.75 * Math.PI * 2 +
                seed * 6.283
            ) * 1.10 * t +
            Math.sin(
                -t * 1.35 * Math.PI * 2 +
                seed * 11
            ) * 0.60 * t

        // Left-edge tentacles wave along the vertical tangent.
        node.vy += wave
    }

    for (let pass = 0; pass < 6; pass++) {
        for (let j = 1; j < last; j++) {
            const node = nodes[j]

            node.x += (
                (nodes[j - 1].x + nodes[j + 1].x) * 0.5 -
                node.x
            ) * 0.2

            node.y += (
                (nodes[j - 1].y + nodes[j + 1].y) * 0.5 -
                node.y
            ) * 0.2
        }
    }

    for (const node of nodes) {
        node.ox = node.x
        node.oy = node.y
    }
}

function attackExtension() {
    const s = octopusState

    if (s.phase === "strike") {
        return smooth(s.timer / OCTOPUS.strike)
    }

    if (s.phase === "hold") {
        return 1
    }

    if (s.phase === "retract") {
        return 1 - smooth(s.timer / OCTOPUS.retract)
    }

    return 0
}

function buildShape() {
    const s = octopusState
    const extension = attackExtension()

    for (let arm = 0; arm < OCTOPUS.count; arm++) {
        const nodes = simulations[arm].nodes
        const tip = nodes[nodes.length - 1]

        const amount = arm === s.attack ? extension : 0

        const offsetX = (s.targetX - tip.x) * amount
        const offsetY = (s.targetY - tip.y) * amount

        for (let j = 0; j < OCTOPUS.segments; j++) {
            const t = j / (OCTOPUS.segments - 1)
            const index = arm * OCTOPUS.segments + j

            // Bend the flowing shape toward the locked attack point.
            // The root stays fixed and the tip reaches the target.
            const bend = smooth(t)

            s.x[index] = nodes[j].x + offsetX * bend
            s.y[index] = nodes[j].y + offsetY * bend

            s.radius[index] =
                OCTOPUS.baseRadius +
                (OCTOPUS.tipRadius - OCTOPUS.baseRadius) * t
        }
    }
}

function distanceSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax
    const dy = by - ay
    const lengthSq = dx * dx + dy * dy

    const t = lengthSq > 1e-9
        ? clamp(
            ((px - ax) * dx + (py - ay) * dy) / lengthSq,
            0,
            1
        )
        : 0

    return (
        (px - ax - dx * t) ** 2 +
        (py - ay - dy * t) ** 2
    )
}

function advance(s, dt, pid) {
    s.timer += dt

    if (s.timer < OCTOPUS[s.phase]) return

    s.timer = 0

    if (s.phase === "entrance" || s.phase === "rest") {
        s.phase = "warning"
        s.hit = false
        s.attack = (s.attack + 1) % OCTOPUS.count

        s.targetX = clamp(
            Position.x[pid] + Velocity.x[pid] * 0.12,
            -s.width / 2 + 2,
            s.width / 2 - 0.4
        )

        s.targetY = clamp(
            Position.y[pid] + Velocity.y[pid] * 0.12,
            -s.height / 2 + 0.4,
            s.height / 2 - 0.4
        )
    } else if (s.phase === "warning") {
        s.phase = "strike"
    } else if (s.phase === "strike") {
        s.phase = "hold"
    } else if (s.phase === "hold") {
        s.phase = "retract"
    } else {
        s.phase = "rest"
    }
}

export function octopusBossSystem() {
    const id = findOctopusBoss()
    const s = octopusState

    if (id < 0) {
        if (s.eid !== -1) resetOctopusBoss()
        return
    }

    if (s.eid !== id) resetOctopusBoss(id)

    anchorOctopusBoss()

    const pid = playerQuery()[0]

    const active =
        startState.encounterPhase === "active" &&
        pid !== undefined &&
        Health.current[id] > 0

    s.warning = false
    s.danger = false

    if (!active || StatusEffect.frozen[id] > 0) return

    const dt = world.time.delta

    if (!(dt > 0)) return

    s.time += dt

    advance(s, dt, pid)

    s.warning = s.phase === "warning"
    s.danger = s.phase === "strike" || s.phase === "hold"

    for (let arm = 0; arm < OCTOPUS.count; arm++) {
        updateFlow(
            simulations[arm],
            -s.width / 2 + 0.35,
            rootYForArm(arm)
        )
    }

    buildShape()

    if (s.danger && !s.hit) {
        const start = s.attack * OCTOPUS.segments

        for (let j = 1; j < OCTOPUS.segments; j++) {
            const i = start + j

            const radius =
                0.6 + Math.max(s.radius[i - 1], s.radius[i])

            if (
                distanceSq(
                    Position.x[pid],
                    Position.y[pid],
                    s.x[i - 1],
                    s.y[i - 1],
                    s.x[i],
                    s.y[i]
                ) <= radius * radius
            ) {
                if (damagePlayer(pid, OCTOPUS.damage)) {
                    s.hit = true
                }

                break
            }
        }
    }

    const dx = Position.x[pid] - s.coreX
    const dy = Position.y[pid] - s.coreY

    if (
        dx * dx + dy * dy <=
        (0.6 + OCTOPUS.coreRadius) ** 2
    ) {
        damagePlayer(pid, OCTOPUS.damage)
    }
}