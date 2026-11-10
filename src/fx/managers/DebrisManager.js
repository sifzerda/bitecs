// src/fx/managers/DebrisManager.js

import { registerParticleEffect } from "./registerParticleEffect.js"
import { EFFECT } from "../FXTypes.js"
import { emitDebrisBurst, updateDebrisEmitter, debrisPool } from "../gpu/DebrisEmitter.js"

registerParticleEffect(EFFECT.DEBRIS, emitDebrisBurst, updateDebrisEmitter, debrisPool)
