// src/ecs/systems/octopusBossSystem.js

import { Position, Velocity, Rotation, BossType, Health, StatusEffect } from "../constants/components.js"
import { BOSSES } from "../constants/bosses.js"
import { bossQuery, playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { startState } from "../../state/startState.js"
import { damagePlayer } from "./playerDamage.js"

export const OCTOPUS = Object.freeze({ count: 6, segments: 36, coreRadius: 0.85, baseRadius: 0.27, tipRadius: 0.075, damage: 30, rest: 0.9, warning: 0.85, strike: 0.6, hold: 0.2, retract: 0.75, entrance: 1.5 })

export const octopusState = { eid: -1, width: 24, height: 14, time: 0, phase: "entrance", timer: 0, attack: 0, targetX: 0, targetY: 0, hit: false, warning: false, danger: false, coreX: 0, coreY: 0, x: new Float32Array(216), y: new Float32Array(216), radius: new Float32Array(216) }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }

export function setOctopusViewport(width, height) { if (width > 0 && height > 0) { octopusState.width = width; octopusState.height = height } }

export function resetOctopusBoss(eid = -1) {
    const s = octopusState; s.eid = eid; s.time = 0; s.phase = "entrance"; s.timer = 0; s.attack = 0; s.hit = false; s.warning = false; s.danger = false
    s.targetX = 0; s.targetY = 0; s.x.fill(0); s.y.fill(0); s.radius.fill(0)
    if (eid >= 0) { anchorOctopusBoss(); buildShape() }
}

export function findOctopusBoss() { for (const id of bossQuery()) if (BOSSES[BossType.typeIndex[id]]?.key === "octopus") return id; return -1 }

export function anchorOctopusBoss() {
    const id = findOctopusBoss(); if (id < 0) return
    const s = octopusState; s.coreX = -s.width / 2 + 1.1; s.coreY = 0
    Position.x[id] = s.coreX; Position.y[id] = 0; Velocity.x[id] = Velocity.y[id] = 0; Rotation[id] = 0
}
function buildShape() {
    const s = octopusState, c = OCTOPUS
    let extension = 0
    if (s.phase === "strike") extension = smooth(s.timer / c.strike)
    else if (s.phase === "hold") extension = 1
    else if (s.phase === "retract") extension = 1 - smooth(s.timer / c.retract)
    for (let arm = 0; arm < c.count; arm++) {
        const rootY = (-0.75 + arm * 1.5 / (c.count - 1)) * s.height / 2
        const rootX = -s.width / 2 - 0.25
        const idleX = rootX + Math.min(3.2, s.width * 0.25) + Math.sin(s.time * 0.9 + arm * 1.7) * 0.25
        const idleY = rootY + Math.sin(s.time * 1.2 + arm * 1.4) * 0.5
        const e = arm === s.attack ? extension : 0
        const tipX = idleX + (s.targetX - idleX) * e, tipY = idleY + (s.targetY - idleY) * e
        for (let j = 0; j < c.segments; j++) {
            const t = j / (c.segments - 1), i = arm * c.segments + j
            s.x[i] = rootX + (tipX - rootX) * t
            s.y[i] = rootY + (tipY - rootY) * smooth(t) + Math.sin(t * Math.PI * 3 - s.time * 2 + arm * 1.3) * Math.sin(t * Math.PI) * 0.35 * (1 - e * 0.7)
            s.radius[i] = c.baseRadius + (c.tipRadius - c.baseRadius) * t
        }
    }
}
function distanceSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l > 1e-9 ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0
    return (px - ax - dx * t) ** 2 + (py - ay - dy * t) ** 2
}

function advance(s, dt, pid) {
    s.timer += dt
    const duration = OCTOPUS[s.phase]
    if (s.timer < duration) return
    s.timer = 0
    if (s.phase === "entrance" || s.phase === "rest") {
        s.phase = "warning"; s.hit = false
        // Rotate attacks through the six arms; aim is locked before the strike.
        s.attack = (s.attack + 1) % OCTOPUS.count
        s.targetX = clamp(Position.x[pid] + Velocity.x[pid] * 0.12, -s.width / 2 + 2, s.width / 2 - 0.4)
        s.targetY = clamp(Position.y[pid] + Velocity.y[pid] * 0.12, -s.height / 2 + 0.4, s.height / 2 - 0.4)
    } else if (s.phase === "warning") s.phase = "strike"
    else if (s.phase === "strike") s.phase = "hold"
    else if (s.phase === "hold") s.phase = "retract"
    else s.phase = "rest"
}

export function octopusBossSystem() {
    const id = findOctopusBoss(), s = octopusState
    if (id < 0) { if (s.eid !== -1) resetOctopusBoss(); return }
    if (s.eid !== id) resetOctopusBoss(id)
    anchorOctopusBoss()
    const pid = playerQuery()[0]
    const active = startState.encounterPhase === "active" && pid !== undefined && Health.current[id] > 0
    s.warning = false; s.danger = false
    if (!active) return
    // Timers and damage advance only through the fixed-step game loop.
    if (StatusEffect.frozen[id] > 0) return
    const dt = world.time.delta; s.time += dt
    advance(s, dt, pid)
    s.warning = s.phase === "warning"; s.danger = s.phase === "strike" || s.phase === "hold"
    buildShape()
    if (s.danger && !s.hit) {
        const start = s.attack * OCTOPUS.segments
        for (let j = 1; j < OCTOPUS.segments; j++) {
            const i = start + j, r = 0.6 + Math.max(s.radius[i - 1], s.radius[i])
            if (distanceSq(Position.x[pid], Position.y[pid], s.x[i - 1], s.y[i - 1], s.x[i], s.y[i]) <= r * r) {
                if (damagePlayer(pid, OCTOPUS.damage)) s.hit = true
                break
            }
        }
    }
    // The anchored core is solid in gameplay, without ship knockback or ramming damage.
    const dx = Position.x[pid] - s.coreX, dy = Position.y[pid]
    if (dx * dx + dy * dy <= (0.6 + OCTOPUS.coreRadius) ** 2) damagePlayer(pid, OCTOPUS.damage)
}
