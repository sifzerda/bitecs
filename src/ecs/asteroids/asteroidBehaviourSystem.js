// src/ecs/systems/asteroidBehaviourSystem.js

import { world } from "../constants/world.js"

import {
  Position,
  Velocity,
  Asteroid,
  Health,
  StatusEffect,
} from "../constants/components.js"

import { playerQuery } from "../constants/queries.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { ASTEROID_TYPE } from "./asteroidTypes.js"

const TAU = Math.PI * 2
const EPSILON = 0.000001

// Per-entity steering targets. A version check prevents
// pooled entity IDs from inheriting old behaviour.
const erraticTargets = new Map()

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function angleDifference(target, current) {
  return Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current)
  )
}

function steerToward(id, targetAngle, dt) {
  const vx = Velocity.x[id]
  const vy = Velocity.y[id]

  const speed = Math.hypot(vx, vy)

  if (speed < EPSILON) return

  const currentAngle = Math.atan2(vy, vx)
  const difference = angleDifference(
    targetAngle,
    currentAngle
  )

  const maxTurn = Math.max(
    0,
    Asteroid.turnRate[id] * dt
  )

  const newAngle = currentAngle +
    clamp(difference, -maxTurn, maxTurn)

  Velocity.x[id] = Math.cos(newAngle) * speed
  Velocity.y[id] = Math.sin(newAngle) * speed
}

// ============================================================
// ERRATIC ASTEROIDS
// ============================================================

function updateErratic(id, dt) {
  const version = Asteroid.spawnVersion[id]
  let target = erraticTargets.get(id)

  if (!target || target.version !== version) {
    target = {
      version,
      angle: Math.atan2(
        Velocity.y[id],
        Velocity.x[id]
      ),
    }

    erraticTargets.set(id, target)
    Asteroid.behaviourTimer[id] = 0
  }

  Asteroid.behaviourTimer[id] -= dt

  if (Asteroid.behaviourTimer[id] <= 0) {
    const currentAngle = Math.atan2(
      Velocity.y[id],
      Velocity.x[id]
    )

    target.angle =
      currentAngle +
      (Math.random() - 0.5) * 1.6

    Asteroid.behaviourTimer[id] =
      0.6 + Math.random() * 1.2
  }

  steerToward(id, target.angle, dt)
}

// ============================================================
// HUNTER ASTEROIDS
// ============================================================

function updateHunter(id, playerId, dt) {
  if (playerId === -1) return

  const dx = Position.x[playerId] - Position.x[id]
  const dy = Position.y[playerId] - Position.y[id]

  const distanceSq = dx * dx + dy * dy

  if (distanceSq < 0.25) return

  const targetAngle = Math.atan2(dy, dx)

  steerToward(id, targetAngle, dt)

  const vx = Velocity.x[id]
  const vy = Velocity.y[id]

  const speed = Math.hypot(vx, vy)

  const nextSpeed = Math.min(
    Asteroid.maxSpeed[id],
    speed + Asteroid.acceleration[id] * dt
  )

  if (speed > EPSILON) {
    const multiplier = nextSpeed / speed

    Velocity.x[id] *= multiplier
    Velocity.y[id] *= multiplier
  }
}

// ============================================================
// MAIN SYSTEM
// ============================================================

export function asteroidBehaviourSystem() {
  const dt = world.time.delta

  if (!Number.isFinite(dt) || dt <= 0) return

  const players = playerQuery()

  const playerId =
    players.length > 0 &&
    Health.current[players[0]] > 0
      ? players[0]
      : -1

  for (let i = 0; i < activeAsteroids.length; i++) {
    const id = activeAsteroids[i]

    if (!Asteroid.active[id]) continue
    if (StatusEffect.frozen[id] > 0) continue

    switch (Asteroid.type[id]) {
      case ASTEROID_TYPE.ERRATIC:
        updateErratic(id, dt)
        break

      case ASTEROID_TYPE.HUNTER:
        updateHunter(id, playerId, dt)
        break

      default:
        break
    }

    Asteroid.visualRotation[id] +=
      Asteroid.spinSpeed[id] * dt

    // Normalize even after unusually large time steps.
    Asteroid.visualRotation[id] =
      ((Asteroid.visualRotation[id] % TAU) + TAU) % TAU
  }
}
