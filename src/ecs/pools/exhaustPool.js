//src/ecs/pools/exhaustPool.js

const pool = [];

export function acquireExhaust() {
  return pool.pop() || {};
}

export function releaseExhaust(exhaust) {

  for (const key in exhaust) {
    delete exhaust[key];
  }

  pool.push(exhaust);
}