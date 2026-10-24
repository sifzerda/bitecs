// src/fx/managers/registerParticleEffect.js

import { registerEffect } from "../effects.js"

// Managers own spawning AND CPU simulation. Renderers only upload buffers.

export function registerParticleEffect(type, emit, update, pool, afterClear) {

  const pending = []

  registerEffect(type, {

    emit(data) {
      pending.push(data)
    },

    update(dt) {
      for (let i = 0; i < pending.length; i++) emit(pending[i])
      pending.length = 0
      if (dt > 0) update(dt)
    },

    clear() { pending.length = 0; pool.clear(); afterClear?.() },
  })
}
