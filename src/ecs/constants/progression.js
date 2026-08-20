// src/ecs/constants/progression.js

// ============================================================
// CORE PROGRESSION CONFIG
// ============================================================

// Three asteroid waves followed by one boss.
export const WAVES_PER_ZONE = 3

// 3 asteroid waves + 1 boss.
export const ENCOUNTERS_PER_ZONE = WAVES_PER_ZONE + 1

// ============================================================
// ZONES
// ============================================================

export const ZONES = [
    {
        id: 1,
        name: "ASTEROID BELT",
        boss: "shotgun",

        waves: [
            { asteroidCount: 6 },
            { asteroidCount: 8 },
            { asteroidCount: 10 },
        ],
    },

    {
        id: 2,
        name: "DEEP SPACE",
        boss: "machinegun",

        waves: [
            { asteroidCount: 8 },
            { asteroidCount: 10 },
            { asteroidCount: 12 },
        ],
    },

    {
        id: 3,
        name: "FROZEN SECTOR",
        boss: "cryogun",

        waves: [
            { asteroidCount: 10 },
            { asteroidCount: 12 },
            { asteroidCount: 14 },
        ],
    },

    {
        id: 4,
        name: "VOLCANIC SECTOR",
        boss: "flamethrowergun",

        waves: [
            { asteroidCount: 12 },
            { asteroidCount: 15 },
            { asteroidCount: 18 },
        ],
    },
]

// ============================================================
// TOTAL LEVELS
// ============================================================

export const TOTAL_LEVELS =
    ZONES.length * ENCOUNTERS_PER_ZONE

// ============================================================
// LEVEL → PROGRESSION
// ============================================================

export function getProgression(level) {

    const safeLevel = Math.max(
        1,
        Math.min(
            Number(level) || 1,
            TOTAL_LEVELS
        )
    )

    const zoneIndex = Math.floor(
        (safeLevel - 1) / ENCOUNTERS_PER_ZONE
    )

    const encounterIndex =
        (safeLevel - 1) % ENCOUNTERS_PER_ZONE

    const zone =
        ZONES[zoneIndex] ??
        ZONES[ZONES.length - 1]

    const isBoss =
        encounterIndex === WAVES_PER_ZONE

    return {
        zone,
        zoneIndex,
        encounterIndex,

        // Bosses don't have a wave number.
        wave: isBoss
            ? null
            : encounterIndex + 1,

        isBoss,
    }
}

// ============================================================
// CONVENIENCE HELPERS
// ============================================================

export function getZone(level) {
    return getProgression(level).zone.id
}

export function getWave(level) {
    return getProgression(level).wave
}

export function isBossLevel(level) {
    return getProgression(level).isBoss
}

export function getBossKey(level) {
    return getProgression(level).zone.boss
}

export function getLevelFromZoneWave(zone, wave) {
    return (
        (zone - 1) * ENCOUNTERS_PER_ZONE +
        wave
    )
}

// ============================================================
// DISPLAY LABEL
// ============================================================

export function formatLevelLabel(level) {

    const {
        zone,
        wave,
        isBoss,
    } = getProgression(level)

    if (isBoss) {
        return `ZONE ${zone.id} · BOSS`
    }

    return `ZONE ${zone.id} · WAVE ${wave}`
}