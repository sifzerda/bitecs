// src/ecs/weapons/weaponState/throwerState.js

export const throwerState = {
    active: false,

    // Centered mount point — cone collision/damage still tests against
    // this, unaffected by gunGap.
    originX: 0,
    originY: 0,

    // Twin visual muzzle points, read by ThrowerRenderer.jsx. Collapse
    // to originX/originY when the weapon's thrower emission has no
    // gunGap set.
    originAX: 0,
    originAY: 0,
    originBX: 0,
    originBY: 0,

    dirX: 0,
    dirY: 0,
    length: 0,
    range: 0,        // ThrowerRenderer.jsx reads .range, not .length
    coneAngle: 0,
    sparkTimer: 0,
    hitIds: [],
}