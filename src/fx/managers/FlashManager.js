// src/fx/managers/FlashManager.js

import { registerParticleEffect } from "./registerParticleEffect.js"
import { EFFECT } from "../FXTypes.js"
import { emitFlash, updateFlashEmitter, flashPool } from "../gpu/FlashEmitter.js"

registerParticleEffect(EFFECT.FLASH, emitFlash, updateFlashEmitter, flashPool)
