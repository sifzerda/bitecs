// src/ecs/bosses/bossTelegraphs.js

import {
  Position,
  Velocity,
  Rotation,
} from "../constants/components.js"

import {
  getBossEmissionConfig,
  getEmissionPoint,
} from "../constants/emission.js"

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v))

function angleDifference(a, b) {
  return Math.atan2(
    Math.sin(a - b),
    Math.cos(a - b)
  )
}

export function rotateToward(a, b, maxStep) {
  return a + clamp(
    angleDifference(b, a),
    -maxStep,
    maxStep
  )
}

export function aimAtPlayer(id, playerId, lead = 0) {
  const x =
    Position.x[playerId] +
    Velocity.x[playerId] * lead -
    Position.x[id]

  const y =
    Position.y[playerId] +
    Velocity.y[playerId] * lead -
    Position.y[id]

  return -Math.atan2(x, y)
}

export function getBossEmission(id, category, angle) {
  const cfg = getBossEmissionConfig(id, category)

  const point = getEmissionPoint(
    Position.x[id],
    Position.y[id],
    angle,
    cfg
  )

  return {
    x: point.x,
    y: point.y,
    gap: cfg.gunGap ?? cfg.engineGap ?? 0,
  }
}

export function lockBossAim(state, id) {
  state.lockedAngle = Rotation[id]
}

export function updateBossTelegraph(
  state,
  id,
  weapon
) {
  const angle = Rotation[id]

  const category =
    weapon.category === "bullet"
      ? "projectile"
      : weapon.category

  const emission = getBossEmission(
    id,
    category,
    angle
  )

  state.originX = emission.x
  state.originY = emission.y

  state.dirX = Math.sin(-angle)
  state.dirY = Math.cos(-angle)

  state.range =
    weapon.range ??
    (weapon.speed ?? 10) *
      (weapon.lifetime ?? 1)

  state.gap = emission.gap

  state.coneAngle =
    (weapon.coneAngle ??
      weapon.spreadAngle ??
      0) +
    (state.pattern?.sweep ?? 0)

  state.warning = state.phase === "warning"
}

export function rayCircle(
  x, y, dx, dy,
  cx, cy, radius, maxLength
) {
  const rx = cx - x
  const ry = cy - y
  const d2 = rx * rx + ry * ry

  if (d2 <= radius * radius) return 0

  const projection = rx * dx + ry * dy

  if (projection < 0) return Infinity

  const perpendicularSq = Math.max(
    0,
    d2 - projection * projection
  )

  if (perpendicularSq > radius * radius) {
    return Infinity
  }

  const t = Math.max(
    0,
    projection -
      Math.sqrt(
        radius * radius - perpendicularSq
      )
  )

  return t <= maxLength ? t : Infinity
}

export function coneHits(
  x, y, dx, dy,
  angle, range,
  cx, cy, radius
) {
  const rx = cx - x
  const ry = cy - y
  const distance = Math.hypot(rx, ry)

  if (distance > range + radius) {
    return false
  }

  if (distance <= radius) {
    return true
  }

  const extraAngle = Math.asin(
    Math.min(1, radius / distance)
  )

  return (
    (rx * dx + ry * dy) / distance >=
    Math.cos(
      Math.min(
        Math.PI,
        angle / 2 + extraAngle
      )
    )
  )
}

