// src/ecs/pools/missilePool.js

const pool = [];

export function acquireMissile() {
  return pool.pop() || {};
}

export function releaseMissile(missile) {
  pool.push(missile);
}