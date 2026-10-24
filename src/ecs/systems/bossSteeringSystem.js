// src/ecs/systems/bossSteeringSystem.js

import {
  Position,
  Velocity,
} from "../constants/components.js"

const MAX_SPEED = 7.5
const MAX_ACCELERATION = 14

const IDEAL_RANGE = 8
const RETREAT_SPEED = 7.5
const ORBIT_SPEED = 5.5

const RANGE_GAIN = 1.5
const RESPONSE = 3.5

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function updateBossSteering(
  id,
  pid,
  target,
  dt,
  state,
  strafeDirection
) {
  if (dt <= 0) return

  const dx =
    Position.x[id] - Position.x[pid]

  const dy =
    Position.y[id] - Position.y[pid]

  const distance = Math.hypot(dx, dy)

  // Unit vector pointing away from the player.
  const awayX =
    distance > 1e-6 ? dx / distance : 1

  const awayY =
    distance > 1e-6 ? dy / distance : 0

  let desiredX = 0
  let desiredY = 0

  if (state === 1) {
    desiredX = awayX * RETREAT_SPEED
    desiredY = awayY * RETREAT_SPEED
  } else {
    // Positive outside ideal range: move inward.
    // Negative inside ideal range: move outward.
    const inwardSpeed = clamp(
      (distance - IDEAL_RANGE) * RANGE_GAIN,
      -MAX_SPEED,
      MAX_SPEED
    )

    desiredX = -awayX * inwardSpeed
    desiredY = -awayY * inwardSpeed

    if (state === 2) {
      const direction = strafeDirection || 1

      desiredX += -awayY * ORBIT_SPEED * direction
      desiredY += awayX * ORBIT_SPEED * direction
    }
  }

  const desiredSpeed = Math.hypot(
    desiredX,
    desiredY
  )

  if (desiredSpeed > MAX_SPEED) {
    const scale = MAX_SPEED / desiredSpeed

    desiredX *= scale
    desiredY *= scale
  }

  let accelerationX =
    (desiredX - Velocity.x[id]) * RESPONSE

  let accelerationY =
    (desiredY - Velocity.y[id]) * RESPONSE

  const acceleration = Math.hypot(
    accelerationX,
    accelerationY
  )

  if (acceleration > MAX_ACCELERATION) {
    const scale =
      MAX_ACCELERATION / acceleration

    accelerationX *= scale
    accelerationY *= scale
  }

  Velocity.x[id] += accelerationX * dt
  Velocity.y[id] += accelerationY * dt

  const speed = Math.hypot(
    Velocity.x[id],
    Velocity.y[id]
  )

  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed

    Velocity.x[id] *= scale
    Velocity.y[id] *= scale
  }
}

// Compatibility export: the existing AI calls this.
// This implementation has no cached agents to clean up.
export function cleanupBossSteering() {}