// src/ecs/weapons/weaponState/bossLaserState.js

const MAX_BEAMS = 16

export const bossLaserState = {
    active: false,

    // Per-beam origin — mirrors laserState.js. Twin-gun bosses get two
    // origins split by gunGap; single-muzzle bosses just use index 0.
    originX: new Float32Array(MAX_BEAMS),
    originY: new Float32Array(MAX_BEAMS),

    beamCount: 0,

    dirX: new Float32Array(MAX_BEAMS),
    dirY: new Float32Array(MAX_BEAMS),

    hitT: new Float32Array(MAX_BEAMS),
    hitX: new Float32Array(MAX_BEAMS),
    hitY: new Float32Array(MAX_BEAMS),

    hit: new Uint8Array(MAX_BEAMS),

    // legacy
    hitLegacy: false,
    hitXLegacy: 0,
    hitYLegacy: 0,
    length: 0,
}