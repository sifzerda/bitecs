// src/ecs/constants/spatialGrid.js

import {
  Position,
  Health,
  Asteroid,
} from "./components.js"

const CELL_SIZE = 4

const asteroidGrid = new Map()
const bossGrid = new Map()

function cellKey(x, y) {
  return `${x},${y}`
}

export function clearSpatialGrids() {
  asteroidGrid.clear()
  bossGrid.clear()
}

function insert(grid, id) {
  const x = Math.floor(Position.x[id] / CELL_SIZE)
  const y = Math.floor(Position.y[id] / CELL_SIZE)

  const key = cellKey(x, y)

  let bucket = grid.get(key)

  if (!bucket) {
    bucket = []
    grid.set(key, bucket)
  }

  bucket.push(id)
}

export function insertAsteroid(id) {
  if (!Asteroid.active[id]) return
  insert(asteroidGrid, id)
}

export function insertBoss(id) {
  insert(bossGrid, id)
}

function findNearest(grid, x, y, isValid) {
  let bestId = -1
  let bestDistSq = Infinity

  for (const bucket of grid.values()) {
    for (let i = 0; i < bucket.length; i++) {
      const id = bucket[i]

      if (!isValid(id)) continue

      const dx = Position.x[id] - x
      const dy = Position.y[id] - y

      const distSq = dx * dx + dy * dy

      if (distSq < bestDistSq) {
        bestDistSq = distSq
        bestId = id
      }
    }
  }

  return bestId
}

export function findNearestAsteroid(x, y) {
  return findNearest(
    asteroidGrid,
    x,
    y,
    id => Asteroid.active[id] && Health.current[id] > 0
  )
}

export function findNearestBoss(x, y) {
  return findNearest(
    bossGrid,
    x,
    y,
    id => Health.current[id] > 0
  )
}
