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

function fireBullets(id, weapon, state, dt) {
  const pattern = state.pattern

  state.shotTimer -= dt

  if (
    state.shots >= pattern.shots ||
    state.shotTimer > 0
  ) {
    return
  }

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

  state.shotTimer += Math.max(
    1 / 60,
    pattern.gap
  )
}

function fireBeam(id, playerId, weapon, dt) {
  const angle = Rotation[id]

  const dx = Math.sin(-angle)
  const dy = Math.cos(-angle)

  const m = getBossEmission(
    id,
    "beam",
    angle
  )

  const sideX = Math.cos(-angle)
  const sideY = -Math.sin(-angle)

  const count = m.gap ? 2 : 1
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
          ? m.gap
          : -m.gap

    const x = m.x + sideX * gap
    const y = m.y + sideY * gap

    let length = range
    let target = -1
    let asteroid = false

    const playerT = rayCircle(
      x, y, dx, dy,
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
      if (Health.current[aid] <= 0) {
        continue
      }

      const t = rayCircle(
        x, y, dx, dy,
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

function fireThrower(id, playerId, weapon, dt) {
  const angle = Rotation[id]

  const dx = Math.sin(-angle)
  const dy = Math.cos(-angle)

  const m = getBossEmission(
    id,
    "thrower",
    angle
  )

  const sx = Math.cos(-angle) * m.gap
  const sy = -Math.sin(-angle) * m.gap

  const s = bossThrowerState

  s.active = true

  s.originX = m.x
  s.originY = m.y

  s.originAX = m.x + sx
  s.originAY = m.y + sy

  s.originBX = m.x - sx
  s.originBY = m.y - sy

  s.dirX = dx
  s.dirY = dy

  s.range = s.length = weapon.range ?? 5
  s.coneAngle = weapon.coneAngle ?? 0.55

  const hitA = coneHits(
    s.originAX,
    s.originAY,
    dx, dy,
    s.coneAngle,
    s.range,
    Position.x[playerId],
    Position.y[playerId],
    0.6
  )

  const hitB = coneHits(
    s.originBX,
    s.originBY,
    dx, dy,
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

export function executeBossAttack({
  id,
  playerId,
  weapon,
  state,
  dt,
}) {
  switch (weapon.category) {
    case "bullet":
      fireBullets(id, weapon, state, dt)
      break

    case "beam":
      fireBeam(id, playerId, weapon, dt)
      break

    case "thrower":
      fireThrower(id, playerId, weapon, dt)
      break
  }
}
