// src/ecs/weapons/weaponSystems/bossLaserSystem.js

import { world } from "../../constants/world.js"
import { getEmissionPoint, getBossEmissionConfig } from '../../constants/emission.js'
import { bossAIQuery, playerQuery } from "../../constants/queries.js"
import { Position, Rotation, BossAI, Health } from "../../constants/components.js"
import { getWeapon } from "../config/weapons.js"
import { bossLaserState } from "../weaponState/bossLaserState.js"

import { killAsteroid } from "../../systems/entityDeath.js"
import { activeAsteroids } from "../../pools/asteroidPool.js"
import { pushArc } from "../weaponState/arcState.js"

const BEAM_ON_DURATION = 3.0
const BEAM_OFF_DURATION = 6.0

// Mirrors laserSystem.js's getTwinOrigins — purely visual muzzle split.
// Hit detection/damage still resolves against the boss's centered aim
// point, so gunGap does not double boss beam damage.
function getTwinOrigins(centerX, centerY, rot, gap) {

    if (!gap) return [{ x: centerX, y: centerY }]

    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)

    return [
        { x: centerX + perpX * gap, y: centerY + perpY * gap },
        { x: centerX - perpX * gap, y: centerY - perpY * gap },
    ]
}

export function bossLaserSystem() {

    const dt = world.time.delta
    const bosses = bossAIQuery()
    const players = playerQuery()

    if (bosses.length === 0 || players.length === 0) {
        bossLaserState.active = false
        bossLaserState.beamCount = 0
        return
    }

    const id = bosses[0]
    const weapon = getWeapon(BossAI.weapon[id])

    if (weapon.category !== "beam") {
        bossLaserState.active = false
        bossLaserState.beamCount = 0
        return
    }

    //----------------------------------
    // On/off cycle
    //----------------------------------

    BossAI.beamCycleTimer[id] -= dt

    if (BossAI.beamCycleTimer[id] <= 0) {
        if (BossAI.beamActive[id]) {
            BossAI.beamActive[id] = 0
            BossAI.beamCycleTimer[id] = BEAM_OFF_DURATION
        } else {
            BossAI.beamActive[id] = 1
            BossAI.beamCycleTimer[id] = BEAM_ON_DURATION
        }
    }

    if (!BossAI.beamActive[id]) {
        bossLaserState.active = false
        bossLaserState.beamCount = 0
        return
    }

    //----------------------------------
    // Firing
    //----------------------------------

    const pid = players[0]

    const dx = Position.x[pid] - Position.x[id]
    const dy = Position.y[pid] - Position.y[id]

    const dist = Math.hypot(dx, dy)

    const emission = getBossEmissionConfig(id, 'beam')
    const point = getEmissionPoint(Position.x[id], Position.y[id], Rotation[id], emission)

    bossLaserState.active = true

    const centerX = point.x
    const centerY = point.y

    // Add `gunGap` to this boss's 'beam' emission config to split its
    // beam into two parallel visual streams.
    const gap = emission.gunGap ?? 0
    const origins = getTwinOrigins(centerX, centerY, Rotation[id], gap)

    for (let i = 0; i < bossLaserState.dirX.length; i++) {
        bossLaserState.hit[i] = 0
        bossLaserState.hitT[i] = 0
    }

    const inv = 1 / Math.max(dist, 0.0001)
    const dirX = dx * inv
    const dirY = dy * inv

    const hit = dist <= weapon.range
    const hitT = hit ? dist : weapon.range

    if (hit) {
        Health.current[pid] -= weapon.directDamage * dt
    }

    let outIndex = 0

    for (let o = 0; o < origins.length && outIndex < bossLaserState.dirX.length; o++) {

        const origin = origins[o]

        bossLaserState.originX[outIndex] = origin.x
        bossLaserState.originY[outIndex] = origin.y
        bossLaserState.dirX[outIndex] = dirX
        bossLaserState.dirY[outIndex] = dirY
        bossLaserState.hitT[outIndex] = hitT
        bossLaserState.hitX[outIndex] = origin.x + dirX * hitT
        bossLaserState.hitY[outIndex] = origin.y + dirY * hitT
        bossLaserState.hit[outIndex] = hit ? 1 : 0

        outIndex++
    }

    bossLaserState.beamCount = outIndex

    // legacy fields
    bossLaserState.hitLegacy = hit
    bossLaserState.hitXLegacy = bossLaserState.hitX[0]
    bossLaserState.hitYLegacy = bossLaserState.hitY[0]
    bossLaserState.length = hitT

    //----------------------------------
    // Chain lightning
    //
    // Mirrors laserSystem.js's chain branch: once the beam connects
    // with the player, it arcs out from the player's position to the
    // nearest unused asteroids, chainCount hops deep, damaging and
    // potentially destroying each one along the way. Chain lightning
    // damage is separate from and additive to the direct beam damage
    // already applied to the player above.
    //----------------------------------

    if (weapon.chainCount && hit) {

        const chainRangeSq = weapon.chainRange * weapon.chainRange
        const chainDps = weapon.chainDamage ?? weapon.directDamage * 0.4

        const asteroids = activeAsteroids
        const used = new Set()

        let chainX = Position.x[pid]
        let chainY = Position.y[pid]

        for (let chain = 0; chain < weapon.chainCount; chain++) {

            let bestId = -1
            let bestDistSq = chainRangeSq

            for (let k = 0; k < asteroids.length; k++) {

                const aid = asteroids[k]

                if (used.has(aid))
                    continue

                const adx = Position.x[aid] - chainX
                const ady = Position.y[aid] - chainY
                const distSq = adx * adx + ady * ady

                if (distSq < bestDistSq) {
                    bestDistSq = distSq
                    bestId = aid
                }
            }

            if (bestId === -1)
                break

            used.add(bestId)

            const secX = Position.x[bestId]
            const secY = Position.y[bestId]

            Health.current[bestId] -= chainDps * dt

            pushArc([{ x: chainX, y: chainY }, { x: secX, y: secY }], 0.12)

            if (Health.current[bestId] <= 0) {
                killAsteroid(bestId, secX, secY)
            }

            chainX = secX
            chainY = secY
        }
    }
}