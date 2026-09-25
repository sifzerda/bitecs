// src/ecs/constants/progression.js


// ============================================================
// ZONES
//
// Each zone contains:
//   - waves
//   - one boss
//
// A level represents exactly one encounter:
//   Wave 1
//   Wave 2
//   Wave 3
//   Boss
//
// Add another zone here and the rest of the game automatically
// scales to it.
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

 {
        id: 5,
        name: "MINEFIELD",
        boss: "grenadegun",
        waves: [
            { asteroidCount: 14 },
            { asteroidCount: 17 },
            { asteroidCount: 20 },
        ],
    },

    {
        id: 6,
        name: "TOXIC EXPANSE",
        boss: "acidthrowergun",
        waves: [
            { asteroidCount: 16 },
            { asteroidCount: 19 },
            { asteroidCount: 22 },
        ],
    },

    {
        id: 7,
        name: "MARS BLOCKADE",
        boss: "missilegun",
        waves: [
            { asteroidCount: 18 },
            { asteroidCount: 21 },
            { asteroidCount: 24 },
        ],
    },

    {
        id: 8,
        name: "ALIEN NEBULA",
        boss: "lasergun",
        waves: [
            { asteroidCount: 20 },
            { asteroidCount: 23 },
            { asteroidCount: 26 },
        ],
    },

    {
        id: 9,
        name: "ION STORM",
        boss: "arcgun",
        waves: [
            { asteroidCount: 22 },
            { asteroidCount: 25 },
            { asteroidCount: 28 },
        ],
    },

    {
        id: 10,
        name: "PLASMA RIFT",
        boss: "plasmagun",
        waves: [
            { asteroidCount: 24 },
            { asteroidCount: 27 },
            { asteroidCount: 30 },
        ],
    },

    {
        id: 11,
        name: "THE ABYSS",
        boss: "octopus",
        waves: [
            { asteroidCount: 26 },
            { asteroidCount: 29 },
            { asteroidCount: 32 },
        ],
    },
]


// ============================================================
// DERIVED PROGRESSION VALUES
// ============================================================

export const WAVES_PER_ZONE =
    ZONES[0]?.waves?.length ?? 0


export const ENCOUNTERS_PER_ZONE =
    WAVES_PER_ZONE + 1


export const TOTAL_LEVELS =
    ZONES.reduce(
        (total, zone) =>
            total + zone.waves.length + 1,
        0
    )


// ============================================================
// LEVEL → PROGRESSION
//
// This is the SINGLE source of truth for:
//
//   level
//   zone
//   wave
//   boss
//   encounter type
// ============================================================

export function getProgression(level) {

    const safeLevel = Math.max(
        1,
        Math.min(
            Number(level) || 1,
            TOTAL_LEVELS
        )
    )

    let remaining = safeLevel - 1

    for (let zoneIndex = 0; zoneIndex < ZONES.length; zoneIndex++) {

        const zone = ZONES[zoneIndex]

        const encounterCount =
            zone.waves.length + 1

        if (remaining < encounterCount) {

            const encounterIndex = remaining

            const isBoss =
                encounterIndex === zone.waves.length

            return {

                level: safeLevel,

                zone,

                zoneIndex,

                encounterIndex,

                type: isBoss
                    ? "boss"
                    : "wave",

                isBoss,

                wave: isBoss
                    ? null
                    : encounterIndex + 1,

                boss: isBoss
                    ? zone.boss
                    : null,

                config: isBoss
                    ? null
                    : zone.waves[encounterIndex],
            }
        }

        remaining -= encounterCount
    }


    // --------------------------------------------------------
    // Safety fallback
    // --------------------------------------------------------

    const lastZone =
        ZONES[ZONES.length - 1]

    const lastEncounterIndex =
        lastZone.waves.length

    return {

        level: TOTAL_LEVELS,

        zone: lastZone,

        zoneIndex: ZONES.length - 1,

        encounterIndex: lastEncounterIndex,

        type: "boss",

        isBoss: true,

        wave: null,

        boss: lastZone.boss,

        config: null,
    }
}


// ============================================================
// CONVENIENCE HELPERS
//
// Kept because your existing UI/code already uses them.
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

    return getProgression(level).boss
}


// ============================================================
// ZONE + WAVE → LEVEL
//
// Useful for level-select UI.
//
// Boss is represented by wave = 0 or "boss" if desired,
// but normal waves remain fully compatible.
// ============================================================

export function getLevelFromZoneWave(zone, wave) {

    const zoneIndex =
        ZONES.findIndex(
            item => item.id === Number(zone)
        )

    if (zoneIndex < 0) {
        return 1
    }

    let level = 1

    for (let i = 0; i < zoneIndex; i++) {

        level +=
            ZONES[i].waves.length + 1
    }

    return level + Number(wave) - 1
}


// ============================================================
// DISPLAY LABEL
// ============================================================

export function formatLevelLabel(level) {

    const progression =
        getProgression(level)

    const {
        zone,
        wave,
        isBoss,
    } = progression

    if (isBoss) {

        return `ZONE ${zone.id} · BOSS`
    }

    return `ZONE ${zone.id} · WAVE ${wave}`
}