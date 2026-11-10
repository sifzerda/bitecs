// src/ecs/difficulty/asteroidDifficulty.js

import {
  Velocity,
  Asteroid,
  Health,
} from "../constants/components.js"

const DEFAULT_DIFFICULTY = Object.freeze({
  speedMultiplier: 1,
  aggressionMultiplier: 1,
  healthMultiplier: 1,
})

// Per-entity metadata, keyed by the pool's spawn version.
// This does not require new bitECS components.
const difficultyByEntity = new Map()

export function applyAsteroidDifficulty(id, difficulty) {
  if (!Number.isInteger(id) || id < 0) return

  const speed = difficulty?.speedMultiplier ?? 1
  const aggression = difficulty?.aggressionMultiplier ?? 1
  const health = difficulty?.healthMultiplier ?? 1

  const version = Asteroid.spawnVersion[id]

  const existing = difficultyByEntity.get(id)

  // Never multiply the same spawn twice.
  if (existing?.version === version) return

  Velocity.x[id] *= speed
  Velocity.y[id] *= speed

  Asteroid.maxSpeed[id] *= speed
  Asteroid.acceleration[id] *= aggression
  Asteroid.turnRate[id] *= aggression

  Health.current[id] *= health
  Health.max[id] *= health

  difficultyByEntity.set(id, {
    version,
    speedMultiplier: speed,
    aggressionMultiplier: aggression,
    healthMultiplier: health,
  })
}

export function getAsteroidDifficulty(id) {
  const entry = difficultyByEntity.get(id)

  if (
    !entry ||
    entry.version !== Asteroid.spawnVersion[id]
  ) {
    return DEFAULT_DIFFICULTY
  }

  return entry
}

export function clearAsteroidDifficulty(id) {
  difficultyByEntity.delete(id)
}

export function resetAsteroidDifficulty() {
  difficultyByEntity.clear()
}
