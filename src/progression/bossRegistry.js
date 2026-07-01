import { spawnUfo } from "../ecs/spawnUfo"
import { UfoHealth } from "../ecs/components"

/*
-------------------------------------------------------
BOSS REGISTRY
-------------------------------------------------------

Every boss lives here.

Later you'll simply add another object to this array.

wave: first wave it appears

spawn: function that creates it

-------------------------------------------------------
*/

export const bosses = [

    {
        wave: 5,

        name: "UFO",

        health(wave) {
            return 150 + wave * 20
        },

        spawn(x, y, wave) {

            const id = spawnUfo(x, y)

            const hp = this.health(wave)

            UfoHealth.current[id] = hp
            UfoHealth.max[id] = hp

            return id
        }
    }

]

/*
-------------------------------------------------------
Returns boss for current wave
-------------------------------------------------------
*/

export function getBossForWave(wave) {

    return bosses.find(b => b.wave === wave)

}