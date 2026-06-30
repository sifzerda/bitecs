//src/ecs/systems/combat.js

import { query, removeEntity } from 'bitecs'
import { world } from '../constants/world.js'
import { bulletQuery, asteroidQuery } from "../constants/queries"
import { Position, Health, Lifetime, BulletTag, AsteroidTag } from '../components.js'
import { gameStats } from '../../state/gameStats.js'

const HIT_RADIUS = 0.6

export function combatSystem() {
  const dt = world.time.delta
  const bullets = bulletQuery();
  const asteroids = asteroidQuery()

  for (let i = 0; i < bullets.length; i++) {
    const bid = bullets[i]

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
          gameStats.score += 100
        }

        break
      }
    }
  }
}