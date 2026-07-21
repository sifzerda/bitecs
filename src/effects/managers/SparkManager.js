// src/effects/managers/SparkManager.js

import { registerEffect } from "../effects.js"
import { EFFECT } from "../EffectTypes.js"
import { spawnSparkBurst } from "../../ecs/spawn.js"
import { emitSparkBurst } from "../gpu/SparkEmitter.js"

const pending = []

const sparkManager = {

    emit(effect) {
        pending.push(effect)
    },

    update() {

        while (pending.length) {

            const effect = pending.pop()

            emitSparkBurst(effect)

        }

    },

    clear() {
        pending.length = 0
    }

}

registerEffect(EFFECT.SPARK_BURST, sparkManager)