// src/progression/directors/DifficultyDirector.js

import { progressionState } from "../progressionState"
import { difficultyProfiles } from "../config/difficultyConfig"

export function difficultyDirectorSystem() {

    const level = progressionState.wave.number

    const profile = difficultyProfiles[
            Math.min(level - 1, difficultyProfiles.length - 1)
        ]

    progressionState.difficulty = {
        ...profile
    }

}