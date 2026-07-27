// src/ecs/weapons/config/weaponActions.js

// Single source of truth for "what does this category do when the player
// fires it." Add a new category here once instead of touching
// playerControlSystem, bossAISystem, and gameLoop separately.

export const WEAPON_ACTIONS = {
    bullet:  { continuous: false },  // fired on cooldown, handled inline in playerControlSystem
    beam:    { continuous: true },   // driven every frame by laserSystem / bossLaserSystem
    thrower: { continuous: true },   // driven every frame by throwerSystem / bossThrowerSystem
}

export function getAction(weapon) {
    const b = WEAPON_ACTIONS[weapon.category]
    if (!b) throw new Error(`No action registered for category "${weapon.category}"`)
    return b
}