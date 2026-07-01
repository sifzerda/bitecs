// src/bosses/ufo/index.js

import { spawnUfoBoss } from "./spawn"
import { updateUfoBoss } from "./update"
import { ufoQuery } from "../../ecs/constants/queries"
import { UfoHealth } from "../../ecs/components" 

export const ufoBoss = {

    id: "ufo",

    spawn(x, y, wave) {
        const id = spawnUfoBoss(x, y)

        const hp = this.getHealth(wave)

        UfoHealth.current[id] = hp
        UfoHealth.max[id] = hp

        this.entity = id

        return id
    },

    getHealth(wave) {
        return 200 + wave * 40
    },

    isAlive() {
        return ufoQuery().length > 0
    }
}