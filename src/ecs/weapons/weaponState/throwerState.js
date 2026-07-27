// src/ecs/weapons/weaponState/throwerState.js

export const throwerState = {
    active: false,
    originX: 0,
    originY: 0,
    dirX: 0,
    dirY: 0,
    length: 0,
    range: 0,        // ThrowerRenderer.jsx reads .range, not .length
    coneAngle: 0,
    sparkTimer: 0,
    hitIds: [],
}