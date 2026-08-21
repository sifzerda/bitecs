// src/ecs/pools/exhaustPool.js

const pool = [];

function createExhaustEffect() {
  return {
    slot: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    emitting: false,
  };
}

export function acquireExhaust() {
  return pool.pop() || createExhaustEffect();
}

export function releaseExhaust(exhaust) {
  pool.push(exhaust);
}