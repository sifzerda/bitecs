// effects/managers/ExhaustManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../EffectTypes"
import { exhaustSources } from "../gpu/ExhaustState"

const pending = []

const exhaustManager = {

    emit(effect) {
        pending.push(effect)
    },

    update() {

        exhaustSources.length = 0

        while (pending.length) {

            exhaustSources.push(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0
        exhaustSources.length = 0

    }

}

registerEffect(EFFECT.EXHAUST, exhaustManager)