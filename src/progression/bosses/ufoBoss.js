//src/progression/bosses/ufoBoss.js

import { spawnUfo } from "../../ecs/spawnUfo"
import { UfoHealth } from "../../ecs/components"

export const ufoBoss = {

    id: "ufo",

    name: "UFO",

    //------------------------------------

    health(wave) {

        return 150 + wave * 25

    },

    //------------------------------------

    spawn(x, y, wave) {

        const id = spawnUfo(x, y)

        const hp = this.health(wave)

        UfoHealth.current[id] = hp
        UfoHealth.max[id] = hp

        return id

    }

}