//src/ecs/systems/combat.js

import { query, removeEntity } from 'bitecs'
import { world } from '../world.js'
import { Position, Health, Lifetime, BulletTag, EnemyTag } from '../components.js'
import { gameState } from '../../state/gameState.js'

const HIT_RADIUS = 0.6

export function combatSystem() {
  const dt = world.time.delta
  const bullets = [...query(world, [Position, Lifetime, BulletTag])]
  const enemies = [...query(world, [Position, Health, EnemyTag])]

  for (const bid of bullets) {
    Lifetime.remaining[bid] -= dt
    if (Lifetime.remaining[bid] <= 0) {
      removeEntity(world, bid)
      continue
    }

    for (const eid of enemies) {
      const dx = Position.x[bid] - Position.x[eid]
      const dy = Position.y[bid] - Position.y[eid]
      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
        Health.current[eid] -= 10
        removeEntity(world, bid)
        if (Health.current[eid] <= 0) {
          removeEntity(world, eid)
          gameState.score += 100
        }
        break
      }
    }
  }
}