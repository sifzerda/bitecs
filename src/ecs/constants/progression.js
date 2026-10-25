// src/ecs/constants/progression.js

export const ZONES = [

    ["ASTEROID BELT", "shotgun", 6, 8, 10],
    ["DEEP SPACE", "machinegun", 8, 10, 12],
    ["FROZEN SECTOR", "cryogun", 10, 12, 14],
    ["VOLCANIC SECTOR", "flamethrowergun", 12, 15, 18],
    ["MINEFIELD", "grenadegun", 14, 17, 20],
    ["TOXIC EXPANSE", "acidthrowergun", 16, 19, 22],
    ["MARS BLOCKADE", "missilegun", 18, 21, 24],
    ["ALIEN NEBULA", "lasergun", 20, 23, 26],
    ["ION STORM", "arcgun", 22, 25, 28],
    ["PLASMA RIFT", "plasmagun", 24, 27, 30],
    ["THE ABYSS", "octopus", 26, 29, 32],
    ["ELDRITCH EXPANSE", "eldritch", 28, 31, 34],

].map(([name, boss, ...counts], i) => ({
    id: i + 1, name, boss, waves: counts.map(asteroidCount => ({ asteroidCount }))
}))

export const WAVES_PER_ZONE = ZONES[0].waves.length
export const ENCOUNTERS_PER_ZONE = WAVES_PER_ZONE + 1
export const TOTAL_LEVELS = ZONES.reduce((sum, z) => sum + z.waves.length + 1, 0)

export function getProgression(level) {

    const number = Number(level)
    const safeLevel = Math.max(1, Math.min(Number.isFinite(number) ? Math.trunc(number) : 1, TOTAL_LEVELS))
    let remaining = safeLevel - 1

    for (let zoneIndex = 0; zoneIndex < ZONES.length; zoneIndex++) {

        const zone = ZONES[zoneIndex], count = zone.waves.length + 1
        if (remaining < count) {

            const isBoss = remaining === zone.waves.length;

            return {
                level: safeLevel,
                zone, zoneIndex,
                encounterIndex: remaining,
                type: isBoss ? "boss" : "wave",
                isBoss, wave: isBoss ? null : remaining + 1,
                boss: isBoss ? zone.boss : null,
                config: isBoss ? null : zone.waves[remaining]
            }
        }
        remaining -= count
    }
}

export const getZone = level => getProgression(level).zone.id
export const getWave = level => getProgression(level).wave
export const isBossLevel = level => getProgression(level).isBoss
export const getBossKey = level => getProgression(level).boss

export function getLevelFromZoneWave(zoneId, wave) {

    const index = ZONES.findIndex(z => z.id === Number(zoneId));

    if (index < 0)
        return 1

    const zone = ZONES[index]
    const boss = wave === 0 || wave === "0" || wave === "boss"
    const value = boss ? zone.waves.length + 1 : Number(wave)

    if (!Number.isInteger(value) || value < 1 || value > zone.waves.length + 1)
        return 1
    return 1 + ZONES.slice(0, index).reduce((sum, z) => sum + z.waves.length + 1, 0) + value - 1
}

export function formatLevelLabel(level) {

    const p = getProgression(level);
    return (
        `ZONE ${p.zone.id} · ${p.isBoss ? "BOSS" : `WAVE ${p.wave}`}`
    )
}
