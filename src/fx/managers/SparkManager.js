// src/fx/managers/SparkManager.js

import { registerParticleEffect } from "./registerParticleEffect.js"
import { EFFECT } from "../FXTypes.js"
import { emitSparkBurst, updateSparkEmitter, sparkPool } from "../gpu/SparkEmitter.js"

registerParticleEffect(EFFECT.SPARK_BURST, emitSparkBurst, updateSparkEmitter, sparkPool)
