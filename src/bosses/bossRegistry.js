// src/bosses/bossRegistry.js

import { ufoBoss } from "./ufo"

const bosses = {
    ufo: ufoBoss
}

export function getBoss(wave) {
    if (wave % 5 === 0) {
        return bosses.ufo
    }
    return null
}