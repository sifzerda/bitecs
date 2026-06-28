//src/ecs/systems/movement.js
import { query } from 'bitecs'
import { world } from '../world.js'
import { Position, Velocity } from '../components.js'

export function movementSystem() {
  const dt = world.time.delta
  for (const eid of query(world, [Position, Velocity])) {
    Position.x[eid] += Velocity.x[eid] * dt
    Position.y[eid] += Velocity.y[eid] * dt
  }
}