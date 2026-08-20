import { removeEntity } from "bitecs"

import { world } from "../constants/world.js"

import {
  useGameStore,
} from "../../../store/gameStore.js"

import { simState } from "../../state/simState.js"

import {
  getGunTypeByWeaponId,
  getGunTypeById,
} from "../weapons/config/gunConfigs.js"

import {
  BossAI,
  BossType,
  Velocity,
} from "../constants/components.js"

import {
  BOSSES,
} from "../constants/bosses.js"

import {
  releaseAsteroidEntity,
} from "../pools/asteroidPool.js"

import { emitEffect } from "../../fx/effects.js"

import {
  EFFECT,
} from "../../fx/FXTypes.js"

// ============================================================
// SMOKE DIRECTION
// ============================================================

function smokeDirectionFor(id) {

  const vx = Velocity.x[id] ?? 0
  const vy = Velocity.y[id] ?? 0

  if (vx === 0 && vy === 0) {
    return Math.random() * Math.PI * 2
  }

  return Math.atan2(vy, vx)
}

// ============================================================
// ASTEROID DEATH
// ============================================================

export function killAsteroid(id, x, y) {

  const direction =
    smokeDirectionFor(id)

  releaseAsteroidEntity(id)

  simState.asteroidsRemaining--
  simState.score += 100

  emitEffect(
    EFFECT.EXPLOSION,
    {
      x,
      y,
      size: 1.5,
    }
  )

  emitEffect(
    EFFECT.SPARK_BURST,
    {
      x,
      y,
      count: 45,
      speed: 13,
      big: true,
    }
  )

  emitEffect(
    EFFECT.SMOKE,
    {
      x,
      y,
      direction,
      count: 14,
    }
  )

  emitEffect(
    EFFECT.DEBRIS,
    {
      x,
      y,
      count: 8,
      speed: 10,
      size: 0.5,
      kind: "rock",
      maxLife: 1.6,
    }
  )

  if (simState.asteroidsRemaining <= 0) {

    useGameStore
      .getState()
      .advanceWave()
  }
}

export function killBoss(id, x, y) {

  const direction =
    smokeDirectionFor(id)

  // ==========================================================
  // RESOLVE BOSS TYPE
  // ==========================================================

  const bossTypeIndex =
    BossType.typeIndex[id]

  const boss =
    BOSSES[bossTypeIndex]

  // ==========================================================
  // RESOLVE WEAPON
  // ==========================================================

  const weaponId =
    BossAI.weapon[id]

  const weaponTypeId =
    boss?.gun?.typeId ?? null

  // ==========================================================
  // RESOLVE GUN
  // ==========================================================

  let gun = null

  if (weaponTypeId) {

    gun =
      getGunTypeById(
        weaponTypeId
      )

  } else if (weaponId != null) {

    gun =
      getGunTypeByWeaponId(
        weaponId
      )
  }

  console.log(
    "[BOSS DEFEATED]",
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

  // ==========================================================
  // REMOVE BOSS
  // ==========================================================

  removeEntity(
    world,
    id
  )

  // ==========================================================
  // SCORE
  // ==========================================================

  simState.score += 1000

  // ============================================================
  // UNLOCK WEAPON
  // ============================================================

  if (weaponId != null) {

    const gameStore =
      useGameStore.getState()

    const newlyUnlocked =
      gameStore.unlockWeapon(
        weaponId
      )

    console.log(
      "[WEAPON REWARD]",
      {
        weaponId,
        newlyUnlocked,
      }
    )
  }

  // ==========================================================
  // COMPLETE LEVEL
  // ==========================================================

  useGameStore
    .getState()
    .completeLevel()

  // ==========================================================
  // DEATH EFFECTS
  // ==========================================================

  emitEffect(
    EFFECT.EXPLOSION,
    {
      x,
      y,
      size: 5,
    }
  )

  emitEffect(
    EFFECT.SPARK_BURST,
    {
      x,
      y,
      count: 90,
      speed: 16,
      big: true,
    }
  )

  emitEffect(
    EFFECT.SMOKE,
    {
      x,
      y,
      direction,
      count: 40,
    }
  )

  emitEffect(
    EFFECT.DEBRIS,
    {
      x,
      y,
      count: 24,
      speed: 14,
      size: 1.2,
      kind: "metal",
      maxLife: 2.2,
    }
  )
}