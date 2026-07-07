// src/ecs/constants/spatialGrid.js

const CELL_SIZE = 4;
const grid = new Map();

/*
--------------------------------------------------
CLEAR GRID EACH FRAME
--------------------------------------------------
*/

export function clearSpatialGrid() {
  grid.clear();
}

/*
--------------------------------------------------
INSERT ENTITY
--------------------------------------------------
*/

export function insertIntoSpatialGrid(entity) {

  const cellX = Math.floor(entity.x / CELL_SIZE);
  const cellY = Math.floor(entity.y / CELL_SIZE);
  const key = `${cellX},${cellY}`;
  let bucket = grid.get(key);

  if (!bucket) {
    bucket = [];
    grid.set(key, bucket);
  }
  bucket.push(entity);
}

/*
--------------------------------------------------
GET NEARBY ENTITIES
--------------------------------------------------
*/

export function getNearbyAsteroids(x, y) {

  const cellX = Math.floor(x / CELL_SIZE);
  const cellY = Math.floor(y / CELL_SIZE);
  const nearby = [];

  for (let yy = -1; yy <= 1; yy++) {
    for (let xx = -1; xx <= 1; xx++) {
      const bucket = grid.get(`${cellX + xx},${cellY + yy}`);
      if (!bucket) continue;
      nearby.push(...bucket);
    }
  }
  return nearby;
}

/*
--------------------------------------------------
FIND NEAREST ASTEROID
--------------------------------------------------
*/

export function findNearestAsteroid(x, y) {
  const nearby = getNearbyAsteroids(x, y);
  let best = null;
  let bestDist = Infinity;

  for (const asteroid of nearby) {

    const dx = asteroid.x - x;
    const dy = asteroid.y - y;
    const d2 = dx * dx + dy * dy;

    if (d2 < bestDist) {
      bestDist = d2;
      best = asteroid;
    }
  }
  return best;
}



