 //src/progression/spawnBoss.js

 import { getBossForWave } from "./bossRegistry"

const SPAWN_RADIUS = 6

export function spawnBossForWave(wave) {

    const boss = getBossForWave(wave)

    if (!boss) return null

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * SPAWN_RADIUS
    const y = Math.sin(angle) * SPAWN_RADIUS

    return boss.spawn(x, y, wave)

}