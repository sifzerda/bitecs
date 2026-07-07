// src/ecs/pools/sparkPool.js

const pool = [];

export function acquireSpark() {
  return pool.pop() || {};
}

export function releaseSpark(spark) {

  for (const key in spark) {
    delete spark[key];
  }

  pool.push(spark);
}