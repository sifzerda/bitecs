// src/state/laserState.js

export const laserState = {
    active: false,
    originX: 0,
    originY: 0,
    hitX: 0,
    hitY: 0,
    length: 0,
    hit: false,
    sparkTimer: 0,

    lockTargetId: -1,   // tracks which entity the beam has been continuously locked on (particle beam ramp)
    lockTime: 0,         // seconds spent locked on lockTargetId, resets when target changes

    hits: [],            // one entry per active beam: {dirX, dirY, hitT, hitX, hitY, hit} — length 1 for normal beams, 3 for prism
}