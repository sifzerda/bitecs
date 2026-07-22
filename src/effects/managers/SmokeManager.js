// effects/managers/SmokeManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../EffectTypes"
import { smokeSources } from "../gpu/SmokeState"

const pending = []

const smokeManager = {

    emit(effect) {
        pending.push(effect)
    },

    update() {

        smokeSources.length = 0

        while (pending.length) {

            smokeSources.push(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0
        smokeSources.length = 0

    }

}

registerEffect(EFFECT.SMOKE, smokeManager)