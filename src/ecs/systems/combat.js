// src/ecs/systems/combat.js

import { query, removeEntity } from 'bitecs'
import { world } from '../constants/world.js'
import { bulletQuery, asteroidQuery, playerQuery } from "../constants/queries"
import { Position, Health, Lifetime, BulletTag, AsteroidTag } from '../components.js'
import { gameStats } from '../../state/gameStats.js'
import { enemyDestroyed } from "../../progression/waveManager"

const HIT_RADIUS = 0.7
const PLAYER_HIT_RADIUS = 0.5

export function combatSystem() {
  const dt = world.time.delta
  const bullets = bulletQuery();
  const asteroids = asteroidQuery()
  const players = playerQuery()

  // Player bullets vs UFO / asteroids

  for (let i = 0; i < bullets.length; i++) {
    const bid = bullets[i]  // bullet id

    Lifetime.remaining[bid] -= dt

    if (Lifetime.remaining[bid] <= 0) {
      removeEntity(world, bid)
      continue
    }

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

}