// src/state/flameState.js

export const flameState = {
    active: false,
    originX: 0,
    originY: 0,
    dirX: 0,
    dirY: 0,
    range: 0,
    coneAngle: 0,
    sparkTimer: 0,
    hitIds: [],   // all entities currently inside the cone, for the renderer + spark ticks
}