// src/ecs/pools/bulletPool.js

const pool = [];

export function acquireBullet() {
  return pool.pop() || {};
}

export function releaseBullet(bullet) {
  pool.push(bullet);
}