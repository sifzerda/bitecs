// src/fx/managers/ShockwaveManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../FXTypes"
import { emitShockwave } from "../gpu/ShockwaveEmitter"

const pending = []

const manager = {

    emit(effect) {

        pending.push(effect)

    },

    update() {

        while (pending.length) {

            emitShockwave(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0

    }

}

registerEffect(EFFECT.SHOCKWAVE, manager)