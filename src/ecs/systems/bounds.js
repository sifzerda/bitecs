//src/ecs/systems/bounds.js

import { query } from 'bitecs'
import { world } from '../world.js'
import { Position, PlayerTag, EnemyTag } from '../components.js'

const BOUND_X = 6.6
const BOUND_Y = 5.0

export function boundsSystem() {
  for (const eid of query(world, [Position, PlayerTag])) {
    Position.x[eid] = Math.max(-BOUND_X, Math.min(BOUND_X, Position.x[eid]))
    Position.y[eid] = Math.max(-BOUND_Y, Math.min(BOUND_Y, Position.y[eid]))
  }
  for (const eid of query(world, [Position, EnemyTag])) {
    if (Position.x[eid] >  BOUND_X) Position.x[eid] = -BOUND_X
    if (Position.x[eid] < -BOUND_X) Position.x[eid] =  BOUND_X
    if (Position.y[eid] >  BOUND_Y) Position.y[eid] = -BOUND_Y
    if (Position.y[eid] < -BOUND_Y) Position.y[eid] =  BOUND_Y
  }
}