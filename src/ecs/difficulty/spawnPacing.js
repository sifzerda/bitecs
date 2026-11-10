// src/ecs/difficulty/spawnPacing.js

export function getSpawnPacing(difficulty) {
    const zone = difficulty.zoneIndex
    const wave = difficulty.waveIndex

    return {
        groupSize: Math.min(
            8,
            3 + Math.floor(zone / 3) + wave
        ),

        groupInterval: Math.max(
            0.8,
            2.4 - zone * 0.1 - wave * 0.15
        ),

        spawnInterval: Math.max(
            0.08,
            0.28 - zone * 0.012
        ),

        maxActive: Math.min(
            48,
            12 + zone * 3 + wave * 3
        ),

        maxSplitters: Math.min(
            6,
            1 + Math.floor(zone / 2)
        ),

        // Reserve capacity for fragment spawning.
        poolReserve: 16,
    }
}
