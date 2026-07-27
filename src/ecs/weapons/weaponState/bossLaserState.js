// src/ecs/weapons/weaponState/bossLaserState.js

export const bossLaserState = {
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

    // legacy
    hitLegacy: false,
    hitXLegacy: 0,
    hitYLegacy: 0,
    length: 0,
}