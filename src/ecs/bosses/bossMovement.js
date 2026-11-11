// src/ecs/bosses/bossMovement.js

import {
  Position,
  Velocity,
} from "../constants/components.js"

export const BOSS_MOVEMENT = Object.freeze({
  ORBIT: "orbit",
  CHASE: "chase",
  RETREAT: "retreat",
  STRAFE: "strafe",
  KITE: "kite",
  HOLD: "hold",
})

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value))

export const BOSS_MOVEMENT_BY_TYPE = Object.freeze({
  shotgun: BOSS_MOVEMENT.CHASE,
  machinegun: BOSS_MOVEMENT.STRAFE,
  cryogun: BOSS_MOVEMENT.KITE,
  grenadegun: BOSS_MOVEMENT.KITE,
  acidthrowergun: BOSS_MOVEMENT.CHASE,
  missilegun: BOSS_MOVEMENT.RETREAT,
  flamethrowergun: BOSS_MOVEMENT.CHASE,
  lasergun: BOSS_MOVEMENT.STRAFE,
  arcgun: BOSS_MOVEMENT.ORBIT,
  plasmagun: BOSS_MOVEMENT.STRAFE,
})

export function getBossMovementStrategy(bossKey) {
  return (
    BOSS_MOVEMENT_BY_TYPE[bossKey] ??
    BOSS_MOVEMENT.ORBIT
  )
}

export function steerBoss({
  id,
  playerId,
  pattern,
  state,
  dt,
  strategy = BOSS_MOVEMENT.ORBIT,
}) {
  const dx = Position.x[id] - Position.x[playerId]
  const dy = Position.y[id] - Position.y[playerId]

  const distance = Math.hypot(dx, dy)

  const ax = distance > 0.001 ? dx / distance : 1
  const ay = distance > 0.001 ? dy / distance : 0

  const direction = state.orbitDirection
  const speed = pattern.speed
  const orbit = pattern.orbit

  let vx = 0
  let vy = 0

  if (
    state.phase === "approach" ||
    state.phase === "warning" ||
    state.phase === "attack"
  ) {
    const radial = clamp(
      (distance - pattern.range) * 1.4,
      -speed,
      speed
    )

    switch (strategy) {
      case BOSS_MOVEMENT.CHASE: {
        const desiredRange = pattern.range * 0.75

        const approach = clamp(
          (distance - desiredRange) * 1.8,
          -speed,
          speed
        )

        vx = -ax * approach - ay * orbit * 0.4 * direction
        vy = -ay * approach + ax * orbit * 0.4 * direction
        break
      }

      case BOSS_MOVEMENT.RETREAT: {
        const desiredRange = pattern.range * 1.15

        const retreat = clamp(
          (desiredRange - distance) * 1.8,
          -speed,
          speed
        )

        vx = ax * retreat - ay * orbit * 0.5 * direction
        vy = ay * retreat + ax * orbit * 0.5 * direction
        break
      }

      case BOSS_MOVEMENT.STRAFE:
        vx = -ax * radial * 0.5 - ay * speed * direction
        vy = -ay * radial * 0.5 + ax * speed * direction
        break

      case BOSS_MOVEMENT.KITE: {
        const retreat = clamp(
          (pattern.range - distance) * 2,
          -speed,
          speed
        )

        vx = ax * retreat - ay * orbit * direction
        vy = ay * retreat + ax * orbit * direction
        break
      }

      case BOSS_MOVEMENT.HOLD:
        break

      default:
        vx = -ax * radial - ay * orbit * direction
        vy = -ay * radial + ax * orbit * direction
    }
  } else if (state.phase === "recover") {
    vx = -ay * orbit * 0.35 * direction
    vy = ax * orbit * 0.35 * direction
  }

  // Arena containment.
  const mx = Math.max(1, state.width / 2 - 2.1)
  const my = Math.max(1, state.height / 2 - 2.1)

  vx +=
    clamp((-mx - Position.x[id]) * 3, 0, speed) -
    clamp((Position.x[id] - mx) * 3, 0, speed)

  vy +=
    clamp((-my - Position.y[id]) * 3, 0, speed) -
    clamp((Position.y[id] - my) * 3, 0, speed)

  const magnitude = Math.hypot(vx, vy)

  if (magnitude > speed) {
    vx *= speed / magnitude
    vy *= speed / magnitude
  }

  const response =
    state.phase === "attack"
      ? 4
      : state.phase === "warning"
        ? 4.5
        : state.phase === "approach"
          ? 3
          : 8

  let fx = (vx - Velocity.x[id]) * response
  let fy = (vy - Velocity.y[id]) * response

  const force = Math.hypot(fx, fy)

  if (force > 12) {
    fx *= 12 / force
    fy *= 12 / force
  }

  Velocity.x[id] += fx * dt
  Velocity.y[id] += fy * dt

  return distance
}
