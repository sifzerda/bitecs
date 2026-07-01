//src/progression/GameDirector.js

import { waveManagerSystem } from "./waveManager"
import { difficultyDirectorSystem } from "./directors/DifficultyDirector"

export function gameDirectorSystem() {

    waveManagerSystem()

    difficultyDirectorSystem()

}