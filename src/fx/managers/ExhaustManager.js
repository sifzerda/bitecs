// src/fx/managers/ExhaustManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../FXTypes"
import { exhaustSources } from "../gpu/ExhaustState"
import { releaseExhaust } from "../../ecs/pools/exhaustPool"

const pending = []

const exhaustManager = {

    emit(effect) {
        pending.push(effect)
    },

    update() {

        for (let i = 0; i < exhaustSources.length; i++) {
            releaseExhaust(exhaustSources[i])
        }

        exhaustSources.length = 0

        while (pending.length) {

            exhaustSources.push(
                pending.pop()
            )

        }

    },

    clear() {

        for (let i = 0; i < exhaustSources.length; i++) {
            releaseExhaust(exhaustSources[i])
        }

        for (let i = 0; i < pending.length; i++) {
            releaseExhaust(pending[i])
        }

        pending.length = 0
        exhaustSources.length = 0

    }

}

registerEffect(EFFECT.EXHAUST, exhaustManager)