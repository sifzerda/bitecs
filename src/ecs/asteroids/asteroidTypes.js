// src/ecs/constants/asteroidTypes.js

export const ASTEROID_TYPE = Object.freeze({
    NORMAL: 0,
    HEAVY: 1,
    FAST: 2,
    ERRATIC: 3,
    SPLITTER: 4,
    HUNTER: 5,
})

export const ASTEROID_TYPES = Object.freeze({
    [ASTEROID_TYPE.NORMAL]: {
        name: "Normal",
        scale: [0.8, 1.4],
        speed: [0.8, 2.2],
        healthMultiplier: 1,
        acceleration: 0,
        turnRate: 0,
        color: "#a8846a",
    },

    [ASTEROID_TYPE.HEAVY]: {
        name: "Heavy",
        scale: [1.5, 2.0],
        speed: [0.45, 1.0],
        healthMultiplier: 2.2,
        acceleration: 0,
        turnRate: 0,
        color: "#777783",
    },

    [ASTEROID_TYPE.FAST]: {
        name: "Fast",
        scale: [0.55, 0.9],
        speed: [2.8, 4.2],
        healthMultiplier: 0.7,
        acceleration: 0,
        turnRate: 0,
        color: "#d5b88b",
    },

    [ASTEROID_TYPE.ERRATIC]: {
        name: "Erratic",
        scale: [0.7, 1.1],
        speed: [1.6, 2.8],
        healthMultiplier: 0.85,
        acceleration: 2.0,
        turnRate: 1.5,
        color: "#a57bd1",
    },

    [ASTEROID_TYPE.SPLITTER]: {
        name: "Splitter",
        scale: [1.2, 1.7],
        speed: [0.8, 1.6],
        healthMultiplier: 1.5,
        acceleration: 0,
        turnRate: 0,
        color: "#e18a55",
    },

    [ASTEROID_TYPE.HUNTER]: {
        name: "Hunter",
        scale: [0.85, 1.2],
        speed: [1.3, 2.1],
        healthMultiplier: 1.1,
        acceleration: 1.4,
        turnRate: 1.2,
        color: "#d45b65",
    },
})