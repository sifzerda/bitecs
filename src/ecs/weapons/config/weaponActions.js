// src/ecs/weapons/config/weaponActions.js

export const WEAPON_ACTIONS = {
    bullet: {
        continuous: false,
        ai: {
            preferredRange: 10,    
            leadTarget: true,     
            spreadJitter: 0.04,    
            burstCount: 1,          
            burstGap: 0.08,         
        },
    },
    beam: {
        continuous: true,
        ai: {
            preferredRange: 14,
            leadTarget: false,    
            spreadJitter: 0,
        },
    },
    thrower: {
        continuous: true,
        ai: {
            preferredRange: 3,      
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