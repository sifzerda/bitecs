//src/fx/managers/ExplosionManager.js

import { registerParticleEffect } from "./registerParticleEffect.js"
import { EFFECT } from "../FXTypes.js"
import { emitExplosion, updateExplosionEmitter, explosionPool } from "../gpu/ExplosionEmitter.js"

registerParticleEffect(EFFECT.EXPLOSION, emitExplosion, updateExplosionEmitter, explosionPool)
