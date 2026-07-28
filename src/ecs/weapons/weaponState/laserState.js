// src/ecs/weapons/weaponState/laserState.js

const MAX_BEAMS = 16

export const laserState = {
    active: false,

    originX: 0,
    originY: 0,

    beamCount: 0,

    dirX: new Float32Array(MAX_BEAMS),
    dirY: new Float32Array(MAX_BEAMS),

    hitT: new Float32Array(MAX_BEAMS),
    hitX: new Float32Array(MAX_BEAMS),
    hitY: new Float32Array(MAX_BEAMS),

    hit: false,
    hitActive: new Uint8Array(MAX_BEAMS),

    hitXCount: 0,

    lockTargetId: -1,
    lockTime: 0,
    sparkTimer: 0,

    // legacy
    hitXLegacy: 0,
    hitYLegacy: 0,
    hitLegacy: false,
    length: 0,
}