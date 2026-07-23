// src/fx/managers/DebrisManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../EffectTypes"
import { emitDebrisBurst } from "../gpu/DebrisEmitter"

const pending = []

const manager = {

    emit(effect) {

        pending.push(effect)

    },

    update() {

        while (pending.length) {

            emitDebrisBurst(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0

    }

}

registerEffect(EFFECT.DEBRIS, manager)