// src/fx/managers/FlashManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../FXTypes"

import {
    emitFlash
}
from "../gpu/FlashEmitter"

const pending = []

const manager = {

    emit(effect) {

        pending.push(effect)

    },

    update() {

        while (pending.length) {

            emitFlash(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0

    }

}

registerEffect(
    EFFECT.FLASH,
    manager
)