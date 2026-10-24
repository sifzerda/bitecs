// src/fx/managers/TrailManager.js

import { registerParticleEffect } from "./registerParticleEffect.js"
import { EFFECT } from "../FXTypes.js"
import { spawnTrailPuff, updateTrailEmitter, trailPool } from "../gpu/TrailEmitter.js"

registerParticleEffect(EFFECT.TRAIL, spawnTrailPuff, updateTrailEmitter, trailPool)
