//src/progression/waveSpawner.js

import { spawnAsteroid } from "../ecs/spawn"
import { registerEnemySpawn } from "./waveManager"
import { progressionState } from "./progressionState"

const SPAWN_RADIUS = 16

export function spawnWave() {

    const wave = progressionState.wave

    for (let i = 0; i < wave.enemyTarget; i++) {
        spawnOneAsteroid()
    }
}

function spawnOneAsteroid() {

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * SPAWN_RADIUS
    const y = Math.sin(angle) * SPAWN_RADIUS

    spawnAsteroid(x, y)

    registerEnemySpawn()

}