// src/ecs/combat/dangerBonus.js

export const DANGER_BONUS = Object.freeze({
    PLAYER_RADIUS: 0.6,

    CLOSE_DISTANCE: 1,
    MEDIUM_DISTANCE: 2,
    FAR_DISTANCE: 4,

    CLOSE_POINTS: 100,
    MEDIUM_POINTS: 50,
    FAR_POINTS: 25,
})

export function calculateDangerBonus(clearance) {
    if (!Number.isFinite(clearance)) return 0

    if (clearance <= DANGER_BONUS.CLOSE_DISTANCE) {
        return DANGER_BONUS.CLOSE_POINTS
    }

    if (clearance <= DANGER_BONUS.MEDIUM_DISTANCE) {
        return DANGER_BONUS.MEDIUM_POINTS
    }

    if (clearance <= DANGER_BONUS.FAR_DISTANCE) {
        return DANGER_BONUS.FAR_POINTS
    }

    return 0
}

export function getAsteroidDangerBonus({
    playerX,
    playerY,
    asteroidX,
    asteroidY,
    asteroidRadius,
}) {
    const values = [
        playerX,
        playerY,
        asteroidX,
        asteroidY,
        asteroidRadius,
    ]

    if (!values.every(Number.isFinite)) return 0

    const distance = Math.hypot(
        playerX - asteroidX,
        playerY - asteroidY
    )

    const clearance = Math.max(
        0,
        distance -
        DANGER_BONUS.PLAYER_RADIUS -
        Math.max(0, asteroidRadius)
    )

    return calculateDangerBonus(clearance)
}
