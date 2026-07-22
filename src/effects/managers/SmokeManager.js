// src/effects/managers/SmokeManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../EffectTypes"
import { emitSmoke, updateSmokeEmitter, smokeParticles } from "../gpu/SmokeEmitter"
import { world } from "../../ecs/constants/world.js"

const smokeManager = {

    emit(effect) {
        emitSmoke(effect)
    },

    update() {
        updateSmokeEmitter(world.time.delta)
    },

    clear() {

        for (const p of smokeParticles) {
            p.alive = false
        }

    },

}

registerEffect(EFFECT.SMOKE, smokeManager)