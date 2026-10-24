// src/fx/managers/SmokeManager.js

import { registerParticleEffect } from "./registerParticleEffect.js"
import { EFFECT } from "../FXTypes.js"
import { emitSmoke, updateSmokeEmitter, smokePool } from "../gpu/SmokeEmitter.js"

registerParticleEffect(EFFECT.SMOKE, emitSmoke, updateSmokeEmitter, smokePool)
