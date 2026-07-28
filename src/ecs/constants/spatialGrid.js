// src/ecs/constants/spatialGrid.js

import { Position } from "./components.js"

const CELL_SIZE = 4
const asteroidGrid = new Map()
const bossGrid = new Map()

function cellKey(x, y) {
    return `${x},${y}`
}

/*
--------------------------------------------------
CLEAR GRIDS
--------------------------------------------------
*/

export function clearSpatialGrids() {
    asteroidGrid.clear()
    bossGrid.clear()
}

/*
--------------------------------------------------
INSERT ASTEROID
--------------------------------------------------
*/

export function insertAsteroid(id) {

    const key = cellKey(Math.floor(Position.x[id] / CELL_SIZE), Math.floor(Position.y[id] / CELL_SIZE))

    let bucket = asteroidGrid.get(key)

    if (!bucket) {
        bucket = []
        asteroidGrid.set(key, bucket)
    }

    bucket.push(id)
}

/*
--------------------------------------------------
INSERT BOSS
--------------------------------------------------
*/

export function insertBoss(id) {

    const key = cellKey(Math.floor(Position.x[id] / CELL_SIZE), Math.floor(Position.y[id] / CELL_SIZE))

    let bucket = bossGrid.get(key)

    if (!bucket) {
        bucket = []
        bossGrid.set(key, bucket)
    }

    bucket.push(id)
}

/*
--------------------------------------------------
SHARED NEAREST SEARCH
--------------------------------------------------
*/

function findNearest(grid, x, y) {

    const cellX = Math.floor(x / CELL_SIZE)
    const cellY = Math.floor(y / CELL_SIZE)

    let bestId = -1
    let bestDistSq = Infinity

    for (let yy = -1; yy <= 1; yy++) {

        for (let xx = -1; xx <= 1; xx++) {

            const bucket = grid.get(cellKey(cellX + xx, cellY + yy))
            if (!bucket) continue

            for (let i = 0; i < bucket.length; i++) {

                const id = bucket[i]

                const dx = Position.x[id] - x
                const dy = Position.y[id] - y
                const distSq = dx * dx + dy * dy

                if (distSq < bestDistSq) {
                    bestDistSq = distSq
                    bestId = id
                }
            }
        }
    }

    return bestId
}

/*
--------------------------------------------------
PUBLIC SEARCHES
--------------------------------------------------
*/

export function findNearestAsteroid(x, y) {
    return findNearest(asteroidGrid, x, y)
}

export function findNearestBoss(x, y) {
    return findNearest(bossGrid, x, y)
}