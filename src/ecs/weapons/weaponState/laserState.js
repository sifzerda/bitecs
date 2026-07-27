// src/ecs/weapons/weaponState/laserState.js

const MAX_BEAMS = 16

export const laserState = {
    active: false,

    originX: 0,
    originY: 0,

    beamCount: 0,

    dirX: new Float32Array(3),
    dirY: new Float32Array(3),
    hitT: new Float32Array(3),
    hitX: new Float32Array(3),
    hitY: new Float32Array(3),
    hit: new Uint8Array(3),

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