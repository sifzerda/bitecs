import { spawnSparkBurst } from "../../ecs/spawn.js"

class SparkManager {

    emit(effect) {

        spawnSparkBurst(effect.x, effect.y, {

            count: effect.count,
            speed: effect.speed,
            big: effect.big,

        })

    }

}

export const sparkManager = new SparkManager()