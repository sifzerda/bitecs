// src/ecs/systems/combat.js

import { query, removeEntity } from 'bitecs'
import { world } from '../constants/world.js'
import { bulletQuery, asteroidQuery, ufoQuery, enemyBulletQuery, playerQuery } from "../constants/queries"
import { Position, Health, UfoHealth, Lifetime, BulletTag, AsteroidTag } from '../components.js'
import { gameStats } from '../../state/gameStats.js'
import { enemyDestroyed } from "../../progression/waveManager"

const HIT_RADIUS = 0.7
const UFO_HIT_RADIUS = 0.9
const PLAYER_HIT_RADIUS = 0.5

export function combatSystem() {
  const dt = world.time.delta
  const bullets = bulletQuery();
  const asteroids = asteroidQuery()
  const ufos = ufoQuery()
  const enemyBullets = enemyBulletQuery()
  const players = playerQuery()

  // Player bullets vs UFO / asteroids

  for (let i = 0; i < bullets.length; i++) {
    const bid = bullets[i]

    Lifetime.remaining[bid] -= dt

    if (Lifetime.remaining[bid] <= 0) {
      removeEntity(world, bid)
      continue
    }

    let bulletConsumed = false

    for (let k = 0; k < ufos.length; k++) {
      const uid = ufos[k]

      const dx = Position.x[bid] - Position.x[uid]
      const dy = Position.y[bid] - Position.y[uid]

      if (dx * dx + dy * dy < UFO_HIT_RADIUS * UFO_HIT_RADIUS) {
        UfoHealth.current[uid] -= 10

        removeEntity(world, bid)
        bulletConsumed = true

        if (UfoHealth.current[uid] <= 0) {
          removeEntity(world, uid)
          enemyDestroyed()
          gameStats.score += 1000
          gameStats.enemiesDestroyed++
        }

        break
      }
    }

    if (bulletConsumed) continue

    for (let j = 0; j < asteroids.length; j++) {
      const eid = asteroids[j]

      const dx = Position.x[bid] - Position.x[eid]
      const dy = Position.y[bid] - Position.y[eid]

      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
        Health.current[eid] -= 10

        removeEntity(world, bid)

        if (Health.current[eid] <= 0) {
          removeEntity(world, eid)
          enemyDestroyed()
          gameStats.score += 100
          gameStats.enemiesDestroyed++
        }

        break
      }
    }
  }

  // Enemy bullets (UFO fire) vs player

  if (players.length > 0) {
    const playerId = players[0]

    for (let i = 0; i < enemyBullets.length; i++) {
      const bid = enemyBullets[i]

      Lifetime.remaining[bid] -= dt

      if (Lifetime.remaining[bid] <= 0) {
        removeEntity(world, bid)
        continue
      }

      const dx = Position.x[bid] - Position.x[playerId]
      const dy = Position.y[bid] - Position.y[playerId]

      if (dx * dx + dy * dy < PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS) {
        removeEntity(world, bid)

        gameStats.health -= 10

        if (gameStats.health <= 0) {
          gameStats.lives -= 1
          gameStats.health = 100 // reset health on life loss — adjust if you have respawn invuln logic elsewhere
        }
      }
    }
  }
}