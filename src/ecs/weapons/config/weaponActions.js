// src/ecs/weapons/config/weaponActions.js

// Single source of truth for "what does this category do when the player
// fires it." Add a new category here once instead of touching
// playerControlSystem, bossAISystem, and gameLoop separately.

export const WEAPON_ACTIONS = {
    bullet: {
        continuous: false,
        ai: {
            preferredRange: 10,     // distance the boss tries to hold while using this weapon
            leadTarget: true,        // aim where the player will be, not where they are
            spreadJitter: 0.04,      // radians of random aim error (tightens under telegraph, see below)
            burstCount: 1,           // shots per trigger pull before the cooldown gate
            burstGap: 0.08,          // seconds between shots within a burst
        },
    },
    beam: {
        continuous: true,
        ai: {
            preferredRange: 14,
            leadTarget: false,       // beams track continuously, no need to lead
            spreadJitter: 0,
        },
    },
    thrower: {
        continuous: true,
        ai: {
            preferredRange: 3,       // throwers need to close distance, unlike bullets/beams
            leadTarget: false,
            spreadJitter: 0,
        },
    },
}

export function getAction(weapon) {
    const b = WEAPON_ACTIONS[weapon.category]
    if (!b) throw new Error(`No action registered for category "${weapon.category}"`)
    return b
}