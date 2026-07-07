// src/ecs/pools/beamPool.js

const pool = [];

export function acquireBeam() {
  return pool.pop() || {};
}

export function releaseBeam(beam) {
  pool.push(beam);
}