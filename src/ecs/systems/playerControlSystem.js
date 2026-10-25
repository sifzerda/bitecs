// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"

import {
  Position,
  Velocity,
  Rotation,
  BULLET_OWNER,
} from "../constants/components.js"

import { spawnPlayerBullet } from "../spawn.js"

import {
  input,
  isMouseControlEnabled,
} from "./input.js"

import { startState } from "../../state/startState.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

// ============================================================
// TUNING
// ============================================================

export const PLAYER_CONTROL = Object.freeze({
  thrust: 25,
  strafeThrust: 16,
  maxSpeed: 18,

  // Lower passive drag preserves some space-flight momentum.
  linearDrag: 0.55,

  // Strong deliberate braking.
  brakeDrag: 7.5,
  stopSpeed: 0.12,

  turnSpeed: 7,
  turnResponse: 16,
  turnAcceleration: 55,

  mouseTurnGain: 11,
  mouseDeadZone: 0.12,

  // While thrusting, gently remove sideways sliding.
  // Strafing remains intentional and is excluded.
  lateralGrip: 1.8,

  boostSpeed: 22,
  boostAcceleration: 65,
  boostDuration: 0.18,
  boostCooldown: 1.2,

  // Gradually return to normal speed after boosting.
  overspeedDrag: 4,

  actionBuffer: 0.12,

  deflectWindow: 0.18,
  deflectCooldown: 0.7,
})

// Mutable runtime state; read directly from a HUD if desired.
// Do not put per-frame updates into React state.
export const playerMotion = {
  angularVelocity: 0,

  boostRemaining: 0,
  boostCooldown: 0,

  boostX: 0,
  boostY: 1,
}

let activePlayerId = null

let boostBuffer = 0
let deflectBuffer = 0

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function moveToward(value, target, amount) {
  if (value < target) {
    return Math.min(target, value + amount)
  }

  return Math.max(target, value - amount)
}

function angleDifference(target, current) {
  return Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current)
  )
}

// ============================================================
// EXISTING COLLISION-SYSTEM API
// ============================================================

export function getAngularVelocity() {
  return playerMotion.angularVelocity
}

export function setAngularVelocity(value) {
  playerMotion.angularVelocity =
    Number.isFinite(value)
      ? clamp(value, -12, 12)
      : 0
}

export function applyPlayerAngularImpulse(value) {
  if (!Number.isFinite(value)) return

  setAngularVelocity(
    playerMotion.angularVelocity + value
  )
}

export function resetPlayerMotion(playerId = null) {
  activePlayerId = playerId

  playerMotion.angularVelocity = 0

  playerMotion.boostRemaining = 0
  playerMotion.boostCooldown = 0

  playerMotion.boostX = 0
  playerMotion.boostY = 1

  boostBuffer = 0
  deflectBuffer = 0
}

export function syncPlayerMotion(playerId) {
  if (activePlayerId !== playerId) {
    resetPlayerMotion(playerId)
  }
}

// ============================================================
// ROTATION
// ============================================================

function updateRotation(pid, dt, mouseMode) {
  const cfg = PLAYER_CONTROL

  let desiredTurnSpeed = 0

  if (mouseMode) {
    const dx = input.worldX - Position.x[pid]
    const dy = input.worldY - Position.y[pid]

    // Avoid unstable aim when the cursor is on the ship.
    if (
      dx * dx + dy * dy >
      cfg.mouseDeadZone * cfg.mouseDeadZone
    ) {
      const targetAngle = -Math.atan2(dx, dy)

      const error = angleDifference(
        targetAngle,
        Rotation[pid]
      )

      desiredTurnSpeed = clamp(
        error * cfg.mouseTurnGain,
        -cfg.turnSpeed,
        cfg.turnSpeed
      )
    }
  } else {
    const turn =
      Number(input.left) -
      Number(input.right)

    desiredTurnSpeed =
      turn * cfg.turnSpeed
  }

  // Responsive steering with a finite acceleration limit.
  // Collision spin still feeds into this same velocity.
  const current = playerMotion.angularVelocity

  const response =
    1 - Math.exp(-cfg.turnResponse * dt)

  const requestedChange =
    (desiredTurnSpeed - current) * response

  playerMotion.angularVelocity += clamp(
    requestedChange,
    -cfg.turnAcceleration * dt,
    cfg.turnAcceleration * dt
  )

  if (
    desiredTurnSpeed === 0 &&
    Math.abs(playerMotion.angularVelocity) < 0.005
  ) {
    playerMotion.angularVelocity = 0
  }

  Rotation[pid] +=
    playerMotion.angularVelocity * dt

  // Keep angles bounded over long sessions.
  Rotation[pid] = Math.atan2(
    Math.sin(Rotation[pid]),
    Math.cos(Rotation[pid])
  )
}

// ============================================================
// FLIGHT
// ============================================================

function updateFlight(pid, dt, mouseMode) {
  const cfg = PLAYER_CONTROL

  const angle = Rotation[pid]

  const forwardX = -Math.sin(angle)
  const forwardY = Math.cos(angle)

  const rightX = Math.cos(angle)
  const rightY = Math.sin(angle)

  const strafe =
    mouseMode
      ? Number(input.right) - Number(input.left)
      : 0

  playerMotion.boostCooldown = Math.max(
    0,
    playerMotion.boostCooldown - dt
  )

  boostBuffer = Math.max(
    0,
    boostBuffer - dt
  )

  if (input.boost) {
    boostBuffer = cfg.actionBuffer
    input.boost = false
  }

  // Braking deliberately cancels the active boost.
  if (input.brake) {
    playerMotion.boostRemaining = 0
    boostBuffer = 0
  }

  if (
    boostBuffer > 0 &&
    playerMotion.boostCooldown === 0 &&
    playerMotion.boostRemaining === 0 &&
    !input.brake
  ) {
    boostBuffer = 0

    // In mouse mode, A/D + Shift makes a lateral dodge.
    // Otherwise boost follows the ship's nose.
    const directionX =
      strafe !== 0
        ? rightX * strafe
        : forwardX

    const directionY =
      strafe !== 0
        ? rightY * strafe
        : forwardY

    playerMotion.boostX = directionX
    playerMotion.boostY = directionY

    playerMotion.boostRemaining =
      cfg.boostDuration

    playerMotion.boostCooldown =
      cfg.boostCooldown

    // Immediate kick so a boost feels responsive.
    const along =
      Velocity.x[pid] * directionX +
      Velocity.y[pid] * directionY

    const kick = Math.max(
      0,
      cfg.maxSpeed - along
    )

    Velocity.x[pid] += directionX * kick
    Velocity.y[pid] += directionY * kick
  }

  const boosting =
    playerMotion.boostRemaining > 0

  if (boosting) {
    // Limit acceleration to the actual remaining boost time.
    const boostDt = Math.min(
      dt,
      playerMotion.boostRemaining
    )

    Velocity.x[pid] +=
      playerMotion.boostX *
      cfg.boostAcceleration *
      boostDt

    Velocity.y[pid] +=
      playerMotion.boostY *
      cfg.boostAcceleration *
      boostDt

    playerMotion.boostRemaining = Math.max(
      0,
      playerMotion.boostRemaining - dt
    )
  } else if (!input.brake) {
    let accelerationX = 0
    let accelerationY = 0

    if (input.thrust) {
      accelerationX += forwardX * cfg.thrust
      accelerationY += forwardY * cfg.thrust
    }

    if (strafe !== 0) {
      accelerationX +=
        rightX * strafe * cfg.strafeThrust

      accelerationY +=
        rightY * strafe * cfg.strafeThrust
    }

    // Diagonal input must not provide extra acceleration.
    const acceleration = Math.hypot(
      accelerationX,
      accelerationY
    )

    if (acceleration > cfg.thrust) {
      const scale =
        cfg.thrust / acceleration

      accelerationX *= scale
      accelerationY *= scale
    }

    Velocity.x[pid] += accelerationX * dt
    Velocity.y[pid] += accelerationY * dt

    if (input.thrust && strafe === 0) {
      // Gently bring momentum behind the ship while turning.
      const sideways =
        Velocity.x[pid] * rightX +
        Velocity.y[pid] * rightY

      const grip =
        1 - Math.exp(-cfg.lateralGrip * dt)

      Velocity.x[pid] -=
        rightX * sideways * grip

      Velocity.y[pid] -=
        rightY * sideways * grip
    }
  }

  const drag = Math.exp(
    -(
      input.brake
        ? cfg.brakeDrag
        : cfg.linearDrag
    ) * dt
  )

  Velocity.x[pid] *= drag
  Velocity.y[pid] *= drag

  const speed = Math.hypot(
    Velocity.x[pid],
    Velocity.y[pid]
  )

  if (
    input.brake &&
    speed < cfg.stopSpeed
  ) {
    Velocity.x[pid] = 0
    Velocity.y[pid] = 0
    return
  }

  const limit = boosting
    ? cfg.boostSpeed
    : cfg.maxSpeed

  if (speed > limit) {
    // Boosts have a hard upper bound.
    // Afterward, shed excess speed smoothly.
    const nextSpeed = boosting
      ? limit
      : limit +
        (speed - limit) *
          Math.exp(-cfg.overspeedDrag * dt)

    const scale = nextSpeed / speed

    Velocity.x[pid] *= scale
    Velocity.y[pid] *= scale
  }
}

// ============================================================
// DEFLECT
// ============================================================

function updateDeflect(pid, dt) {
  const cfg = PLAYER_CONTROL

  startState.deflectBufferTime = Math.max(
    0,
    (startState.deflectBufferTime ?? 0) - dt
  )

  startState.deflectCooldownTime = Math.max(
    0,
    (startState.deflectCooldownTime ?? 0) - dt
  )

  startState.deflectFlashTimer = Math.max(
    0,
    (startState.deflectFlashTimer ?? 0) - dt
  )

  deflectBuffer = Math.max(
    0,
    deflectBuffer - dt
  )

  if (input.deflect) {
    deflectBuffer = cfg.actionBuffer
    input.deflect = false
  }

  // A slightly early press can activate when cooldown ends.
  if (
    deflectBuffer > 0 &&
    startState.deflectCooldownTime === 0
  ) {
    deflectBuffer = 0

    startState.deflectBufferTime =
      cfg.deflectWindow

    startState.deflectCooldownTime =
      cfg.deflectCooldown

    // Show feedback immediately, even if nothing is reflected.
    startState.deflectFlashTimer = 0.15
    startState.deflectFlashX = Position.x[pid]
    startState.deflectFlashY = Position.y[pid]
  }
}

// ============================================================
// SHOOTING
// ============================================================

function updateShooting(pid, shootState, dt) {
  const weapon = getWeapon(
    startState.currentWeapon
  )

  if (!weapon) return

  const action = getAction(weapon)

  if (
    shootState.playerId !== pid ||
    shootState.weaponId !== weapon.id
  ) {
    shootState.playerId = pid
    shootState.weaponId = weapon.id
    shootState.timer = 0
  }

  if (action.continuous) {
    // Beam and thrower systems read held input.fire directly.
    shootState.timer = 0
    return
  }

  shootState.timer = Math.max(
    -dt,
    (shootState.timer ?? 0) - dt
  )

  if (!input.fire) {
    shootState.timer = Math.max(
      0,
      shootState.timer
    )
    return
  }

  if (shootState.timer > 0) return

  const rot = Rotation[pid]

  const result = spawnPlayerBullet(
    Position.x[pid],
    Position.y[pid],
    rot,
    weapon.id,
    BULLET_OWNER.PLAYER,
    pid
  )

  if (result.ids.length > 0) {
    const angle = rot + Math.PI / 2

    const size =
      0.8 +
      (weapon.hitRadius ?? 0.5) * 0.6

    for (const origin of result.origins) {
      emitEffect(EFFECT.FLASH, {
        x: origin.x,
        y: origin.y,
        angle,
        size,
        color: weapon.glowColor,
      })
    }
  }

  shootState.timer += Math.max(
    dt,
    weapon.fireRate ?? 0.15
  )
}

// ============================================================
// MAIN UPDATE
// ============================================================

export default function playerControlSystem(
  shootState
) {
  const dt = Math.min(
    Math.max(world.time.delta, 0),
    0.05
  )

  if (dt === 0) return

  const pid = playerQuery()[0]

  if (pid === undefined) {
    resetPlayerMotion()
    return
  }

  syncPlayerMotion(pid)

  const mouseMode =
    isMouseControlEnabled()

  updateRotation(pid, dt, mouseMode)
  updateFlight(pid, dt, mouseMode)
  updateDeflect(pid, dt)
  updateShooting(pid, shootState, dt)
}