// src/ecs/constants/spatialGrid.js

import {
    Position,
    Health,
    Asteroid,
} from "./components.js"

const CELL_SIZE = 4
const INV_CELL_SIZE = 1 / CELL_SIZE

const asteroidGrid = new Map()
const bossGrid = new Map()

const activeAsteroidKeys = []
const activeBossKeys = []

const asteroidStamps = new Uint32Array(Position.x.length)
const gridSpawnVersions = new Uint32Array(Position.x.length)

const processedPairs = new Set()

let queryStamp = 0
let maxAsteroidRadius = 0

const EPSILON = 1e-9

// ============================================================
// GRID HELPERS
// ============================================================

function cellKey(x, y) {
    return `${x},${y}`
}

function getCell(value) {
    return Math.floor(value * INV_CELL_SIZE)
}

function clearGrid(grid, activeKeys) {
    for (let i = 0; i < activeKeys.length; i++) {
        const bucket = grid.get(activeKeys[i])

        if (bucket) bucket.length = 0
    }

    activeKeys.length = 0
}

function insertIntoCell(grid, activeKeys, cx, cy, id) {
    const key = cellKey(cx, cy)

    let bucket = grid.get(key)

    if (!bucket) {
        bucket = []
        grid.set(key, bucket)
    }

    if (bucket.length === 0) {
        activeKeys.push(key)
    }

    bucket.push(id)
}

function nextStamp() {
    queryStamp = (queryStamp + 1) >>> 0

    if (queryStamp === 0) {
        asteroidStamps.fill(0)
        queryStamp = 1
    }

    return queryStamp
}

function validAsteroid(id) {
    return (
        Asteroid.active[id] === 1 &&
        Health.current[id] > 0 &&
        Asteroid.spawnVersion[id] ===
            gridSpawnVersions[id]
    )
}

// ============================================================
// CLEAR / INSERT
// ============================================================

export function clearSpatialGrids() {
    clearGrid(asteroidGrid, activeAsteroidKeys)
    clearGrid(bossGrid, activeBossKeys)

    maxAsteroidRadius = 0
}

export function insertAsteroid(id) {
    if (
        Asteroid.active[id] !== 1 ||
        Health.current[id] <= 0
    ) {
        return
    }

    gridSpawnVersions[id] = Asteroid.spawnVersion[id]

    const x = Position.x[id]
    const y = Position.y[id]
    const radius = Asteroid.radius[id]

    maxAsteroidRadius = Math.max(
        maxAsteroidRadius,
        radius
    )

    const minX = getCell(x - radius)
    const maxX = getCell(x + radius)
    const minY = getCell(y - radius)
    const maxY = getCell(y + radius)

    for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
            insertIntoCell(
                asteroidGrid,
                activeAsteroidKeys,
                cx,
                cy,
                id
            )
        }
    }
}

export function insertBoss(id) {
    if (Health.current[id] <= 0) return

    insertIntoCell(
        bossGrid,
        activeBossKeys,
        getCell(Position.x[id]),
        getCell(Position.y[id]),
        id
    )
}

// ============================================================
// RADIUS QUERY
// ============================================================

// Callback receives an asteroid ID.
// Returning false stops the query.
//
// Nested spatial queries from inside callbacks are not
// supported because they share query-stamp storage.

export function forEachAsteroidNear(
    x,
    y,
    radius,
    callback
) {
    if (
        !Number.isFinite(radius) ||
        radius < 0
    ) {
        return
    }

    const stamp = nextStamp()

    const minX = getCell(x - radius)
    const maxX = getCell(x + radius)
    const minY = getCell(y - radius)
    const maxY = getCell(y + radius)

    for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
            const bucket = asteroidGrid.get(
                cellKey(cx, cy)
            )

            if (!bucket) continue

            for (let i = 0; i < bucket.length; i++) {
                const id = bucket[i]

                if (asteroidStamps[id] === stamp) {
                    continue
                }

                asteroidStamps[id] = stamp

                if (!validAsteroid(id)) continue

                const dx = Position.x[id] - x
                const dy = Position.y[id] - y

                const reach =
                    radius + Asteroid.radius[id]

                if (
                    dx * dx + dy * dy >
                    reach * reach
                ) {
                    continue
                }

                if (callback(id) === false) {
                    return
                }
            }
        }
    }
}

export const forEachAsteroidInRadius = forEachAsteroidNear

// ============================================================
// RAYCAST
// ============================================================

// Returns the nearest hit:
// { id, t, x, y }
//
// Direction need not be normalized.
// maxDistance is measured in world units.
//
// A ray traverses grid cells using 2D DDA. Asteroids are
// already inserted into every cell touched by their radius,
// so exact ray-circle tests are needed only for candidates
// encountered along the ray.


export function raycastAsteroids(
    originX,
    originY,
    directionX,
    directionY,
    maxDistance
) {
    if (
        !Number.isFinite(maxDistance) ||
        maxDistance < 0
    ) {
        return null
    }

    const length = Math.hypot(directionX, directionY)

    if (length <= EPSILON) return null

    const dx = directionX / length
    const dy = directionY / length

    const stamp = nextStamp()

    let cx = getCell(originX)
    let cy = getCell(originY)

    const stepX = Math.sign(dx)
    const stepY = Math.sign(dy)

    const tDeltaX = stepX
        ? CELL_SIZE / Math.abs(dx)
        : Infinity

    const tDeltaY = stepY
        ? CELL_SIZE / Math.abs(dy)
        : Infinity

    let tMaxX = stepX > 0
        ? ((cx + 1) * CELL_SIZE - originX) / dx
        : stepX < 0
            ? (cx * CELL_SIZE - originX) / dx
            : Infinity

    let tMaxY = stepY > 0
        ? ((cy + 1) * CELL_SIZE - originY) / dy
        : stepY < 0
            ? (cy * CELL_SIZE - originY) / dy
            : Infinity

    let bestId = -1
    let bestT = maxDistance

    // --------------------------------------------------------
    // TEST ONE GRID CELL
    // --------------------------------------------------------

    function visitCell(cellX, cellY) {
        const bucket = asteroidGrid.get(
            cellKey(cellX, cellY)
        )

        if (!bucket) return

        for (let i = 0; i < bucket.length; i++) {
            const id = bucket[i]

            if (asteroidStamps[id] === stamp) continue
            asteroidStamps[id] = stamp

            if (!validAsteroid(id)) continue

            const ox = Position.x[id] - originX
            const oy = Position.y[id] - originY

            const radius = Asteroid.radius[id]
            const radiusSq = radius * radius

            const projection = ox * dx + oy * dy
            const centerDistSq = ox * ox + oy * oy

            const perpendicularSq = Math.max(
                0,
                centerDistSq - projection * projection
            )

            if (perpendicularSq > radiusSq) continue

            const offset = Math.sqrt(
                Math.max(0, radiusSq - perpendicularSq)
            )

            const t = centerDistSq <= radiusSq
                ? 0
                : projection - offset

            if (t < 0 || t > bestT) continue

            bestT = t
            bestId = id
        }
    }

    // --------------------------------------------------------
    // GRID TRAVERSAL
    // --------------------------------------------------------

    let travelled = 0

    while (travelled <= maxDistance) {
        visitCell(cx, cy)

        const nextBoundary = Math.min(tMaxX, tMaxY)

        if (
            bestId !== -1 &&
            bestT <= nextBoundary
        ) {
            break
        }

        if (nextBoundary > maxDistance) break

        if (tMaxX < tMaxY) {
            cx += stepX
            travelled = tMaxX
            tMaxX += tDeltaX

        } else if (tMaxY < tMaxX) {
            cy += stepY
            travelled = tMaxY
            tMaxY += tDeltaY

        } else {
            // The ray crosses an exact grid corner.
            //
            // Both side-adjacent cells touch that corner.
            // Inspect them before advancing diagonally.

            const nextX = cx + stepX
            const nextY = cy + stepY

            visitCell(nextX, cy)
            visitCell(cx, nextY)

            cx = nextX
            cy = nextY

            travelled = nextBoundary

            tMaxX += tDeltaX
            tMaxY += tDeltaY
        }
    }

    if (bestId === -1) return null

    return {
        id: bestId,
        t: bestT,
        x: originX + dx * bestT,
        y: originY + dy * bestT,
    }
}


// ============================================================
// CONE QUERY
// ============================================================

// Broad phase: query a circle covering the cone.
// Narrow phase: check angle and target radius.
//
// Callback receives an asteroid ID.
// Returning false stops the query.

export function forEachAsteroidInCone(
    x,
    y,
    directionX,
    directionY,
    angle,
    range,
    callback
) {
    if (
        !Number.isFinite(range) ||
        range < 0
    ) {
        return
    }

    const length = Math.hypot(
        directionX,
        directionY
    )

    if (length <= EPSILON) return

    const dx = directionX / length
    const dy = directionY / length

    // A circle centred halfway down the cone covers
    // the entire cone's range, including its endpoints.
    const halfRange = range * 0.5

    const centerX = x + dx * halfRange
    const centerY = y + dy * halfRange

    const queryRadius =
        range + maxAsteroidRadius

    const halfAngle = Math.min(
        Math.PI,
        Math.max(0, angle * 0.5)
    )

    const cosLimit = Math.cos(halfAngle)

    forEachAsteroidNear(
        centerX,
        centerY,
        queryRadius,
        (id) => {
            const tx = Position.x[id] - x
            const ty = Position.y[id] - y

            const distance = Math.hypot(tx, ty)
            const radius = Asteroid.radius[id]

            if (distance > range + radius) {
                return
            }

            if (distance <= radius) {
                return callback(id)
            }

            const extraAngle = Math.asin(
                Math.min(1, radius / distance)
            )

            const limit = Math.cos(
                Math.min(Math.PI, halfAngle + extraAngle)
            )

            const dot =
                (tx * dx + ty * dy) / distance

            if (dot < limit) return

            return callback(id)
        }
    )
}

// ============================================================
// UNIQUE ASTEROID PAIRS
// ============================================================

export function forEachAsteroidPair(callback) {
    processedPairs.clear()

    const stride = Position.x.length

    for (let k = 0; k < activeAsteroidKeys.length; k++) {
        const bucket = asteroidGrid.get(
            activeAsteroidKeys[k]
        )

        for (let i = 0; i < bucket.length; i++) {
            const a = bucket[i]

            if (!validAsteroid(a)) continue

            for (let j = i + 1; j < bucket.length; j++) {
                const b = bucket[j]

                if (
                    a === b ||
                    !validAsteroid(b)
                ) {
                    continue
                }

                const low = Math.min(a, b)
                const high = Math.max(a, b)

                const pairKey = low * stride + high

                if (processedPairs.has(pairKey)) {
                    continue
                }

                processedPairs.add(pairKey)

                callback(a, b)

                if (!validAsteroid(a)) {
                    break
                }
            }
        }
    }
}

// ============================================================
// NEAREST TARGETS
// ============================================================

export function findNearestAsteroid(x, y) {
    const stamp = nextStamp()

    let bestId = -1
    let bestDistSq = Infinity

    for (let k = 0; k < activeAsteroidKeys.length; k++) {
        const bucket = asteroidGrid.get(
            activeAsteroidKeys[k]
        )

        for (let i = 0; i < bucket.length; i++) {
            const id = bucket[i]

            if (asteroidStamps[id] === stamp) continue
            asteroidStamps[id] = stamp

            if (!validAsteroid(id)) continue

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

export function findNearestBoss(x, y) {
    let bestId = -1
    let bestDistSq = Infinity

    for (let k = 0; k < activeBossKeys.length; k++) {
        const bucket = bossGrid.get(
            activeBossKeys[k]
        )

        for (let i = 0; i < bucket.length; i++) {
            const id = bucket[i]

            if (Health.current[id] <= 0) continue

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

export function getMaxAsteroidRadius() {
    return maxAsteroidRadius
}
