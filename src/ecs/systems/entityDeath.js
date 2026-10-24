// src/ecs/systems/entityDeath.js

import { entityExists, removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { BossAI, Velocity } from "../constants/components.js"
import { bossQuery } from "../constants/queries.js"
import { activeAsteroids, releaseAsteroidEntity } from "../pools/asteroidPool.js"
import { startState } from "../../state/startState.js"
import { useGameStore } from "../../../store/gameStore.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"
import { beginEncounterClear } from "./encounterSystem.js"

function smokeDirectionFor(id) {
  const vx = Velocity.x[id] ?? 0
  const vy = Velocity.y[id] ?? 0

  return vx === 0 && vy === 0 ? Math.random() * Math.PI * 2 : Math.atan2(vy, vx)
}

export function killAsteroid(id, x, y) {
  // Pooled entities still exist after release.
  // Membership, rather than entityExists(), determines
  // whether this asteroid is currently alive.
  if (!activeAsteroids.includes(id)) {
    return false
  }

  const direction = smokeDirectionFor(id)

  releaseAsteroidEntity(id)

  startState.asteroidsRemaining = activeAsteroids.length
  startState.score += 100

  emitEffect(EFFECT.EXPLOSION, { x, y, size: 1.5 })
  emitEffect(EFFECT.SPARK_BURST, { x, y, count: 45, speed: 13, big: true })
  emitEffect(EFFECT.SMOKE, { x, y, direction, count: 14 })
  emitEffect(EFFECT.DEBRIS, { x, y, count: 10, speed: 10, size: 0.6, kind: "rock", maxLife: 1.2 })

  if (activeAsteroids.length === 0 && bossQuery().length === 0) {
    beginEncounterClear()
  }

  return true
}

export function killBoss(id, x, y) {
  if (!entityExists(world, id) || !bossQuery().includes(id)) {
    return false
  }

  const direction = smokeDirectionFor(id)
  const weaponId = BossAI.weapon[id]

  // Remove immediately so another hit cannot reward
  // or kill the same boss again.
  removeEntity(world, id)

  startState.score += 1000

  if (weaponId != null) {
    useGameStore.getState().unlockWeapon(weaponId)
  }

  emitEffect(EFFECT.EXPLOSION, { x, y, size: 5 })
  emitEffect(EFFECT.SPARK_BURST, { x, y, count: 90, speed: 16, big: true })
  emitEffect(EFFECT.SMOKE, { x, y, direction, count: 40 })
  emitEffect(EFFECT.DEBRIS, { x, y, count: 24, speed: 8, size: 1, kind: "metal", maxLife: 2.2 })

  if (bossQuery().length === 0 && activeAsteroids.length === 0) {
    beginEncounterClear()
  }

  return true
}

export function emitPlayerDeathDebris(x, y) {
  emitEffect(EFFECT.DEBRIS, { x, y, count: 16, speed: 8, size: 0.6, kind: "metal", maxLife: 1.6 })
}