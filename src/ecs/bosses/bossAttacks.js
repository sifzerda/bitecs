// src/ecs/bosses/bossAttacks.js

import {
  Position,
  Rotation,
  Health,
  Asteroid,
} from "../constants/components.js"

import { spawnBossBullet } from "../spawn.js"
import { activeAsteroids } from "../pools/asteroidPool.js"

import { bossLaserState } from "../weapons/weaponState/bossLaserState.js"
import { bossThrowerState } from "../weapons/weaponState/bossThrowerState.js"

import { killAsteroid } from "../systems/entityDeath.js"
import { damagePlayer } from "../systems/playerDamage.js"
import { applyStatusEffects } from "../systems/statusEffectSystem.js"

import {
  getBossEmission,
  rayCircle,
  coneHits,
} from "./bossTelegraphs.js"

// ============================================================
// DAMAGE
// ============================================================

function damageWithStatus(playerId, amount, weapon) {
  const damaged = damagePlayer(
    playerId,
    amount,
    { periodic: true }
  )

  if (
    damaged &&
    (weapon.corrosion || weapon.freezeDuration)
  ) {
    applyStatusEffects(playerId, weapon)
  }
}

// ============================================================
// PROJECTILES
// ============================================================

function fireBullets({ id, weapon, state, dt }) {
  const pattern = state.pattern

  if (state.shots >= pattern.shots) return

  state.shotTimer -= dt

  const gap = Math.max(
    1 / 60,
    pattern.gap
  )

  while (
    state.shots < pattern.shots &&
    state.shotTimer <= 0
  ) {
    const fraction =
      pattern.shots > 1
        ? state.shots / (pattern.shots - 1) - 0.5
        : 0

    spawnBossBullet(
      Position.x[id],
      Position.y[id],
      state.lockedAngle +
        fraction * pattern.sweep,
      weapon.id,
      id
    )

    state.shots++
    state.shotTimer += gap
  }
}

// ============================================================
// BEAM
// ============================================================

function fireBeam({ id, playerId, weapon, dt }) {
  const angle = Rotation[id]

  const dx = Math.sin(-angle)
  const dy = Math.cos(-angle)

  const emission = getBossEmission(
    id,
    "beam",
    angle
  )

  const sideX = Math.cos(-angle)
  const sideY = -Math.sin(-angle)

  const count = emission.gap ? 2 : 1
  const range = weapon.range ?? 20
  const width = (weapon.beamWidth ?? 0.1) * 0.5

  const s = bossLaserState

  s.active = true
  s.beamCount = count

  for (let n = 0; n < count; n++) {
    const gap =
      count === 1
        ? 0
        : n === 0
          ? emission.gap
          : -emission.gap

    const x = emission.x + sideX * gap
    const y = emission.y + sideY * gap

    let length = range
    let target = -1
    let asteroid = false

    const playerT = rayCircle(
      x,
      y,
      dx,
      dy,
      Position.x[playerId],
      Position.y[playerId],
      0.6 + width,
      range
    )

    if (playerT !== Infinity) {
      length = playerT
      target = playerId
    }

    for (const aid of activeAsteroids) {
      if (Health.current[aid] <= 0) continue

      const t = rayCircle(
        x,
        y,
        dx,
        dy,
        Position.x[aid],
        Position.y[aid],
        Asteroid.radius[aid] + width,
        length
      )

      if (t < length) {
        length = t
        target = aid
        asteroid = true
      }
    }

    const damage =
      (weapon.directDamage ?? 0) *
      dt / count

    if (target === playerId && !asteroid) {
      damageWithStatus(
        playerId,
        damage,
        weapon
      )
    } else if (target >= 0) {
      Health.current[target] -= damage

      if (Health.current[target] <= 0) {
        killAsteroid(
          target,
          Position.x[target],
          Position.y[target]
        )
      }
    }

    s.originX[n] = x
    s.originY[n] = y

    s.dirX[n] = dx
    s.dirY[n] = dy

    s.hitT[n] = length
    s.hitX[n] = x + dx * length
    s.hitY[n] = y + dy * length

    s.hit[n] = target >= 0 ? 1 : 0
  }

  s.hitLegacy = s.hit[0] !== 0
  s.hitXLegacy = s.hitX[0]
  s.hitYLegacy = s.hitY[0]
  s.length = s.hitT[0]
}

// ============================================================
// THROWER
// ============================================================

function fireThrower({ id, playerId, weapon, dt }) {
  const angle = Rotation[id]

  const dx = Math.sin(-angle)
  const dy = Math.cos(-angle)

  const emission = getBossEmission(
    id,
    "thrower",
    angle
  )

  const sx = Math.cos(-angle) * emission.gap
  const sy = -Math.sin(-angle) * emission.gap

  const s = bossThrowerState

  s.active = true

  s.originX = emission.x
  s.originY = emission.y

  s.originAX = emission.x + sx
  s.originAY = emission.y + sy

  s.originBX = emission.x - sx
  s.originBY = emission.y - sy

  s.dirX = dx
  s.dirY = dy

  s.range = s.length = weapon.range ?? 5
  s.coneAngle = weapon.coneAngle ?? 0.55

  const hitA = coneHits(
    s.originAX,
    s.originAY,
    dx,
    dy,
    s.coneAngle,
    s.range,
    Position.x[playerId],
    Position.y[playerId],
    0.6
  )

  const hitB = coneHits(
    s.originBX,
    s.originBY,
    dx,
    dy,
    s.coneAngle,
    s.range,
    Position.x[playerId],
    Position.y[playerId],
    0.6
  )

  if (hitA || hitB) {
    damageWithStatus(
      playerId,
      (weapon.directDamage ?? 0) * dt,
      weapon
    )
  }
}

// ============================================================
// ATTACK DISPATCH
// ============================================================

const ATTACK_HANDLERS = {
  bullet: fireBullets,
  beam: fireBeam,
  thrower: fireThrower,
}

export function executeBossAttack(context) {
  ATTACK_HANDLERS[context.weapon.category]?.(context)
}
