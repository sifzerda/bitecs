// src/ecs/world.js
import { createWorld } from 'bitecs'

export const world = createWorld({
  time: {
    delta: 0,
    elapsed: 0,
    then: performance.now(),
  }
})