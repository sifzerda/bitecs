// src/ecs/constants/arenaBounds.js

const DEFAULT_WIDTH = 20
const DEFAULT_HEIGHT = 12

const bounds = {
    left: -DEFAULT_WIDTH / 2,
    right: DEFAULT_WIDTH / 2,
    bottom: -DEFAULT_HEIGHT / 2,
    top: DEFAULT_HEIGHT / 2,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
}

export function setArenaBounds(left, right, bottom, top) {
    if (
        ![left, right, bottom, top].every(Number.isFinite) ||
        right <= left ||
        top <= bottom
    ) {
        return false
    }

    bounds.left = left
    bounds.right = right
    bounds.bottom = bottom
    bounds.top = top
    bounds.width = right - left
    bounds.height = top - bottom

    return true
}

export function getArenaBounds() {
    return bounds
}
