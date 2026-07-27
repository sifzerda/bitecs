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

export function insertIntoSpatialGrid(id) {

  const cellX = Math.floor(Position.x[id] / CELL_SIZE)
  const cellY = Math.floor(Position.y[id] / CELL_SIZE)

  const key = `${cellX},${cellY}`

  let bucket = grid.get(key)

  if (!bucket) {
    bucket = []
    grid.set(key, bucket)
  }

  bucket.push(id);
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

  const nearby = getNearbyAsteroids(x, y)

  let bestId = -1
  let bestDistSq = Infinity

  for (let i = 0; i < nearby.length; i++) {

    const id = nearby[i]

    const dx = Position.x[id] - x
    const dy = Position.y[id] - y

    const distSq = dx * dx + dy * dy

    if (distSq < bestDistSq) {
      bestDistSq = distSq
      bestId = id
    }
  }

  return bestId
}




