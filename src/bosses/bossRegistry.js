// src/bosses/bossRegistry.js

import { ufoBoss } from "./ufo"

export const bossRegistry = {
    ufo: ufoBoss
}

export function getBoss(id) {
    return bossRegistry[id]
}