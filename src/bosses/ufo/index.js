// src/bosses/ufo/index.js

import { spawnUfoBoss } from "./spawn"
import { updateUfoBoss } from "./update"
import { ufoQuery } from "../../ecs/constants/queries"
import { UfoHealth } from "../../ecs/components" 

export const ufoBoss = {

    id: "ufo",
    name: "Scout UFO",

    spawn(x, y, wave) {
        return spawnUfoBoss(x, y, wave)
    },

    isAlive() {
        return ufoQuery().length > 0
    },

 
}