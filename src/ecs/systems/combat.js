// src/ecs/systems/combat.js

import { world } from "../constants/world.js"

import {
  bossQuery,
  playerQuery,
} from "../constants/queries.js"

import {
  Position,
  Velocity,
  Lifetime,
  Invulnerability,
  Asteroid,
  Bullet,
  BossType,
  BULLET_OWNER,
} from "../constants/components.js"

import { BOSSES } from "../constants/bosses.js"

import {
  useGameStore,
  SCREEN,
} from "../../../store/gameStore.js"

import { startState } from "../../state/startState.js"

import {
  killAsteroid,
  killBoss,
} from "./entityDeath.js"

import {
  explodeAt,
} from "../weapons/weaponSystems/weaponEffects.js"

import {
  releaseBulletEntity,
  activeBullets,
} from "../pools/bulletPool.js"

import {
  activeAsteroids,
} from "../pools/asteroidPool.js"

import {
  getWeapon,
} from "../weapons/config/weapons.js"

import {
  resolveHit,
} from "../weapons/weaponSystems/hitTraits.js"

import { damagePlayer } from "./playerDamage.js"

const PLAYER_RADIUS = 0.6
const DEFAULT_BOSS_RADIUS = 2

const DEFLECT_RADIUS = 4
const DEFLECT_RADIUS_SQ =
  DEFLECT_RADIUS * DEFLECT_RADIUS

const DEFLECT_SPEED_MULT = 1.3
const DEFLECT_FLASH_DURATION = 0.15

function bossRadius(id) {
  return (
    BOSSES[BossType.typeIndex[id]]?.hitRadius ??
    DEFAULT_BOSS_RADIUS
  )
}

function overlaps(a, b, radius) {
  const dx = Position.x[a] - Position.x[b]
  const dy = Position.y[a] - Position.y[b]

  return dx * dx + dy * dy <= radius * radius
}

function reflectBullet(bid, pid) {
  const dx = Position.x[bid] - Position.x[pid]
  const dy = Position.y[bid] - Position.y[pid]

  const distanceSq = dx * dx + dy * dy

  if (distanceSq > DEFLECT_RADIUS_SQ) {
    return false
  }

  const vx = Velocity.x[bid]
  const vy = Velocity.y[bid]

  const speed = Math.hypot(vx, vy)

  let nx
  let ny

  if (distanceSq > 1e-10) {
    const inverseDistance = 1 / Math.sqrt(distanceSq)

    nx = dx * inverseDistance
    ny = dy * inverseDistance
  } else if (speed > 1e-6) {
    nx = -vx / speed
    ny = -vy / speed
  } else {
    nx = 1
    ny = 0
  }

  const dot = vx * nx + vy * ny

  let reflectedX = vx - 2 * dot * nx
  let reflectedY = vy - 2 * dot * ny

  // Already travelling away: keep it travelling outward.
  if (dot >= 0) {
    reflectedX = nx
    reflectedY = ny
  }

  const reflectedLength = Math.hypot(
    reflectedX,
    reflectedY
  ) || 1

  const outputSpeed =
    Math.max(speed, 1) * DEFLECT_SPEED_MULT

  Velocity.x[bid] =
    (reflectedX / reflectedLength) * outputSpeed

  Velocity.y[bid] =
    (reflectedY / reflectedLength) * outputSpeed

  Bullet.owner[bid] = BULLET_OWNER.PLAYER
  Bullet.deflected[bid] = 1
  Bullet.source[bid] = pid

  startState.deflectFlashTimer =
    DEFLECT_FLASH_DURATION

  startState.deflectFlashX = Position.x[pid]
  startState.deflectFlashY = Position.y[pid]

  return true
}

function hitPlayerTarget(bid, weapon) {
  const projectileRadius = weapon.hitRadius ?? 0

  for (let j = 0; j < activeAsteroids.length; j++) {
    const aid = activeAsteroids[j]

    if (
      !overlaps(
        bid,
        aid,
        projectileRadius + Asteroid.radius[aid]
      )
    ) {
      continue
    }

    resolveHit({
      x: Position.x[bid],
      y: Position.y[bid],

      targetId: aid,
      weapon,
      owner: Bullet.owner[bid],

      kill: killAsteroid,

      asteroids: activeAsteroids,
      bosses: bossQuery(),
    })

    return true
  }

  const bosses = bossQuery()

  for (let j = 0; j < bosses.length; j++) {
    const id = bosses[j]

    if (
      !overlaps(
        bid,
        id,
        projectileRadius + bossRadius(id)
      )
    ) {
      continue
    }

    resolveHit({
      x: Position.x[bid],
      y: Position.y[bid],

      targetId: id,
      weapon,
      owner: Bullet.owner[bid],

      kill: killBoss,

      asteroids: activeAsteroids,
      bosses,
      big: true,
    })

    return true
  }

  return false
}

export function combatSystem() {
  const dt = world.time.delta
  const pid = playerQuery()[0]

  let i = 0

  while (i < activeBullets.length) {
    const state = useGameStore.getState()

    if (
      state.screen !== SCREEN.PLAY ||
      state.paused ||
      startState.encounterPhase !== "active"
    ) {
      return
    }

    const bid = activeBullets[i]
    const weapon = getWeapon(Bullet.type[bid])

    if (!weapon) {
      releaseBulletEntity(bid)
      continue
    }

    Lifetime.remaining[bid] -= dt

    if (Lifetime.remaining[bid] <= 0) {
      if (weapon.explosive) {
        explodeAt(
          Position.x[bid],
          Position.y[bid],
          weapon,
          activeAsteroids,
          bossQuery()
        )
      }

      releaseBulletEntity(bid)
      continue
    }

    if (Bullet.owner[bid] === BULLET_OWNER.PLAYER) {
      if (hitPlayerTarget(bid, weapon)) {
        releaseBulletEntity(bid)
        continue
      }
    } else if (pid !== undefined) {
      // Deflection remains available while invulnerable.
      if (
        startState.deflectBufferTime > 0 &&
        reflectBullet(bid, pid)
      ) {
        i++
        continue
      }

      if (
        Invulnerability.remaining[pid] <= 0 &&
        overlaps(
          bid,
          pid,
          PLAYER_RADIUS + (weapon.hitRadius ?? 0)
        )
      ) {
        damagePlayer(
          pid,
          weapon.directDamage ?? 0
        )

        releaseBulletEntity(bid)
        continue
      }
    }

    i++
  }
}