// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { useGameStore } from "../../../store/gameStore.js"
import { simState } from "../../state/simState.js"
import { getGunTypeByWeaponId, getGunTypeById } from "../weapons/config/gunConfigs.js"
import { BossAI, BossType, Velocity } from "../constants/components.js"
import { BOSSES } from "../constants/bosses.js"
import { releaseAsteroidEntity } from "../pools/asteroidPool.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

// ============================================================
// SMOKE DIRECTION
// ============================================================

function smokeDirectionFor(id) {

    const vx = Velocity.x[id] ?? 0
    const vy = Velocity.y[id] ?? 0

    if (vx === 0 && vy === 0) {

        return (Math.random() * Math.PI * 2)
    }

    return Math.atan2(vy, vx)
}

// ============================================================
// ASTEROID DEATH
// ============================================================

export function killAsteroid(id, x, y) {

    const direction = smokeDirectionFor(id)

    // --------------------------------------------------------
    // Remove asteroid
    // --------------------------------------------------------

    releaseAsteroidEntity(id)

    // --------------------------------------------------------
    // Runtime state
    // --------------------------------------------------------

    simState.asteroidsRemaining = Math.max(0, simState.asteroidsRemaining - 1)
    simState.score += 100

    // --------------------------------------------------------
    // Death effects
    // --------------------------------------------------------

    emitEffect(EFFECT.EXPLOSION, { x, y, size: 1.5 })
    emitEffect(EFFECT.SPARK_BURST, { x, y, count: 45, speed: 13, big: true })
    emitEffect(EFFECT.SMOKE, { x, y, direction, count: 14 })
    // Rock debris drifts: slow pieces that curve away and linger, so they need a little
    // more size and count than the old quick pops to stay visible.
    emitEffect(EFFECT.DEBRIS, { x, y, count: 10, speed: 10, size: 0.6, kind: "rock", maxLife: 1.2 })

    // --------------------------------------------------------
    // ENCOUNTER COMPLETE
    //
    // IMPORTANT:
    //
    // Do NOT call advanceWave().
    //
    // completeLevel() changes the screen to LEVEL_COMPLETE.
    // The level itself is advanced only when the player presses
    // CONTINUE and continueLevel() is called.
    // --------------------------------------------------------

    if (simState.asteroidsRemaining === 0) {
        useGameStore
            .getState()
            .completeLevel()
    }
}

// ============================================================
// BOSS DEATH
// ============================================================

export function killBoss(id, x, y) {

    const direction = smokeDirectionFor(id)

    // ========================================================
    // RESOLVE BOSS TYPE
    // ========================================================
    const bossTypeIndex = BossType.typeIndex[id]
    const boss = BOSSES[bossTypeIndex]

    // ========================================================
    // RESOLVE WEAPON
    // ========================================================

    const weaponId = BossAI.weapon[id]
    const weaponTypeId = boss?.gun?.typeId ?? null

    // ========================================================
    // RESOLVE GUN
    // ========================================================

    let gun = null

    if (weaponTypeId != null) {
        gun = getGunTypeById(weaponTypeId)

    } else if (weaponId != null) {
        gun = getGunTypeByWeaponId(weaponId)
    }

    // ========================================================
    // DEBUG
    // ========================================================

    console.log("[BOSS DEFEATED]",
        {
            bossTypeIndex,
            boss: boss?.key,
            bossName: boss?.name,
            weaponId,
            weaponTypeId,
            gunId: gun?.id,
            gunName: gun?.name,
        }
    )

    // ========================================================
    // REMOVE BOSS
    // ========================================================

    removeEntity(world, id)

    // ========================================================
    // SCORE
    // ========================================================

    simState.score += 1000

    // ========================================================
    // WEAPON REWARD
    // ========================================================

    if (weaponId != null) {

        const gameStore = useGameStore.getState()
        const newlyUnlocked = gameStore.unlockWeapon(weaponId)
        console.log("[WEAPON REWARD]", { weaponId, newlyUnlocked })
    }

    // ========================================================
    // COMPLETE ENCOUNTER
    //
    // This is deliberately the same progression call used
    // by the final asteroid.
    // ========================================================

    // ========================================================
    // DEATH EFFECTS
    // ========================================================

    emitEffect(EFFECT.EXPLOSION, { x, y, size: 5 })
    emitEffect(EFFECT.SPARK_BURST, { x, y, count: 90, speed: 16, big: true })
    emitEffect(EFFECT.SMOKE, { x, y, direction, count: 40 })
    // Metal debris is ricochet shards. They are fast (their tiers run 1x to 3x the
    // speed value), so the speed here is lower than the old 14 to keep them on screen.
    emitEffect(EFFECT.DEBRIS, { x, y, count: 24, speed: 8, size: 1.0, kind: "metal", maxLife: 2.2 })

    // Keep the gameplay screen visible while the effects play.
    // Then transition to Level Complete, which clears the old level.
    setTimeout(() => {
        useGameStore.getState().completeLevel();
    }, 2800);

}

// ============================================================
// PLAYER SHIP DEATH
//
// Shared by every path that costs the player a life, so the
// look is tuned in one place.
// ============================================================

export function emitPlayerDeathDebris(x, y) {

    emitEffect(EFFECT.DEBRIS, { x, y, count: 16, speed: 8, size: 0.6, kind: "metal", maxLife: 1.6 })
}