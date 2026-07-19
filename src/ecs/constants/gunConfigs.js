// src/ecs/constants/gunConfigs.js
function deepMerge(base, overrides) {
    const out = { ...base }
    for (const key in overrides) {
        if (
            overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])
        ) {
            out[key] = deepMerge(base[key] ?? {}, overrides[key])
        } else {
            out[key] = overrides[key]
        }
    }
    return out
}

// ============================================================

export const DEFAULT_GUN_CONFIG = {

    general: { extrudeDepth: 0.025 },

 frame: {
        color: '#cfe8ff',
        length: 0.60,
        height: 0.13,
        taper: 0.4,
        offsetX: 0,
        offsetY: 0,
    },

    slide: {
        enabled: true, color: '#3a4650',
        length: 0.5, height: 0.06, offsetX: 0.05, offsetY: 0.020,
        metalness: 0.7, roughness: 0.25,
    },

    barrel: {
        enabled: true,
        color: '#cfe8ff', length: 0.24, width: 0.035,
        offsetX: 0.70, offsetY: 0.0, metalness: 0.8, roughness: 0.3,
    },

    canister: {
        enabled: false, color: '#cfe8ff',
        length: 0.24, width: 0.20,
        offsetX: 0.6, offsetY: 0,
        metalness: 0.1, roughness: 0.1,
        transmission: 0, thickness: 0.15, ior: 1.4,
        clearcoat: 0, clearcoatRoughness: 0.05,
    },

    muzzle: {
        enabled: true, color: 'cyan',
        length: 0.09, width: 0.06, metalness: 0.4, roughness: 0.35,
        offsetX: 0, offsetY: 0,
    },

    mountBracket: {
        enabled: true, color: '#3a4650',
        length: 0.21, width: 0.23,
        offsetX: -0.42,
        metalness: 0.5, roughness: 0.6,
    },

    sight: {
        enabled: false, color: '#00ff88',
        width: 0.03, height: 0.035, offsetX: 0.30,
    },

    accentStripe: {
        enabled: true, color: '#00e5ff',
        width: 0.09, length: 0.6, offsetY: 0.0,
    },

    coreGlow: {
        enabled: true, color: '#00e5ff',
        size: 0.3, offsetX: 0.88, offsetY: 0,
        intensity: 1.0,
    },

    mount: {
        offsetX: 0.45,
        offsetY: -0.05,
        scale: 0.9,
    },


}

// ============================================================
// 20 gun types
// ============================================================

const RAW_TYPES = [

    {
        id: 'pulse_blaster', name: 'Pulse Blaster', weaponId: 0,

    },
    // shotgun
    {
        id: '01_sg', name: 'Shotgun', weaponId: 1,
        overrides: {
            frame: { color: '#ff3355', length: 0.45, height: 0.20 },
            barrel: { color: '#3a6bd5', length: 0.27, width: 0.15, offsetX: 0.54, offsetY: 0 },
            muzzle: { color: '#ffe605', width: 0.13, length: 0.1, offsetX: -0.01, offsetY: 0 },
            mountBracket: { color: '#4a5560', length: 0.2, width: 0.33 },
            mount: { offsetX: 0.45, offsetY: -0.05 },
            coreGlow: { color: '#ffe605', intensity: 0.8, offsetX: 0.74, offsetY: 0 },
            accentStripe: { color: '#ffe605' },
        },
    },



    // machinegun
    {
        id: '02_mg', name: 'Machine Gun', weaponId: 2,
        overrides: {
            frame: { color: '#00444e', length: 0.9, height: 0.14 },
            barrel: { color: '#000000', length: 0.2, width: 0.037, offsetX: 0.7, offsetY: 0 },
            muzzle: { color: '#ff3355', offsetX: 0.1, offsetY: 0, width: 0.12 },
            mountBracket: { color: '#ff3355', length: 0.08, width: 0.3 },
            mount: { color: '#000000', offsetX: 0.55, offsetY: -0.21 },
            coreGlow: { color: '#ff3355', intensity: 2, offsetX: 1, offsetY: 0 },
            accentStripe: { color: '#00224e', width: 0.2, length: 0.5 },
        },
    },
    // grenade launcher
    {
        id: '03_gl', name: 'Grenade Launcher', weaponId: 3,
        overrides: {
            frame: { color: '#5a88eb', length: 0.9, height: 0.45 },
            barrel: { color: '#0049ff', length: 0.4, width: 0.3, offsetX: 1, offsetY: 0 },
            muzzle: { color: '#ff3355', width: 0.3, length: 0.2, offsetX: -0.1, offsetY: 0 },
            slide: { color: '#0049ff', length: 0.5, height: 0.06, offsetX: 0.05, offsetY: 0.02 },
            mountBracket: { color: '#3a4650', length: 0.4, width: 0.275 },
            mount: { offsetX: 0.74, offsetY: -0.5 },
            coreGlow: { color: '#ff8a1a', intensity: 1, size: 1, offsetX: 1.2, offsetY: 0 },
            accentStripe: { color: '#00224e' },
        },
    },
    // homing missile
    {
        id: '04_ml', name: 'Missile Launcher', weaponId: 4,
        overrides: {
            frame: { color: '#cfe8ff', length: 0.9, height: 0.34 },
            barrel: { color: '#ff3355', length: 0.15, width: 0.25, offsetX: 0.9, offsetY: 0 },
            muzzle: { offsetX: -0.06, offsetY: 0, length: 0.12, width: 0.3, color: '#3a4650', },
            mountBracket: { color: '#3a4650', length: 0.34, width: 0.4 },
            mount: { offsetX: 0.86, offsetY: -0.4 },
            coreGlow: { color: '#ff8a1a', size: 1, intensity: 1, offsetX: 0.95, offsetY: 0 },
            accentStripe: { color: '#ff3355', length: 0.6, offsetX: 0.6 },
        },
    },
    // flamethrower
    {
        id: '05_ft', name: 'Flamethrower', weaponId: 5,
        overrides: {
            frame: { color: '#000000', length: 0.74, height: 0.235 },
            barrel: { color: '#ff3355', length: 0.6, width: 0.055, offsetX: 0.92, offsetY: 0 },
            muzzle: { offsetX: 0, offsetY: 0 },
            mountBracket: { color: '#3a4650', length: 0.21, width: 0.23 },
            mount: { offsetX: 0.45, offsetY: -0.21 },
            coreGlow: { color: '#ff3355', intensity: 1, offsetX: 1.34, offsetY: 0 },
            accentStripe: { color: '#ff3355' },
        },
    },

  // cryogun
    {
        id: '06_cg', name: 'Cryo Gun', weaponId: 6,
        overrides: {
            frame: { color: '#c8d8e0', length: 0.89, height: 0.27, taper: 0.35, offsetX: -0.12 },
            slide: {
                color: '#8fa8b8', length: 0.48, height: 0.06,
                offsetX: 0.04, offsetY: 0.02,
                metalness: 0.85, roughness: 0.15,
            },
            canister: {
                enabled: true, color: '#a8ecfc',
                length: 0.87, width: 0.44,
                offsetX: 0.42, offsetY: 0,
                metalness: 0.05, roughness: 0.03,
                transmission: 1, thickness: 0.2, ior: 1.4,
                clearcoat: 1, clearcoatRoughness: 0.05,
            },
            // starts right at the canister's front edge (0.5 + 0.6/2 = 0.8)
            barrel: {
                color: '#c8d8e0', length: 0.6, width: 0.05,
                offsetX: 1.08, offsetY: 0,
                metalness: 0.75, roughness: 0.2,
            },
            muzzle: {
                color: '#eafcff', width: 0.065, length: 0.05,
                offsetX: 0, offsetY: 0,
                metalness: 0.3, roughness: 0.1,
            },
            mountBracket: { color: '#7c8f9c', length: 0.22, width: 0.24 },
            sight: { enabled: false },
            accentStripe: { color: '#0049ff', width: 0.07, length: 0.75 },
            // sized and centered to match the canister's own footprint
            coreGlow: {
                color: '#aef6ff', intensity: 1.15,
                offsetX: 0.45, offsetY: 0,
                mist: true, width: 0.9, height: 0.7,
            },
            mount: { offsetX: 0.45, offsetY: -0.05, scale: 0.9 },
        },
    },

    /*  
    
       {
           id: 'arc_gun', name: 'Arc Gun', weaponId: 7,
           overrides: {
               frame: { color: '#e8fdff' },
               barrel: { color: '#6a7a80', width: 0.04 },
               muzzle: { color: '#4dffe0', width: 0.08 },
               coreGlow: { color: '#4dffe0', intensity: 1.6 },
               accentStripe: { color: '#00ffcc' },
               sight: { color: '#4dffe0' },
           },
       },
       {
           id: 'proximity_mine_layer', name: 'Proximity Mine Layer', weaponId: 8,
           overrides: {
               frame: { length: 0.6, height: 0.2, taper: 0.25 },
               barrel: { length: 0.14, width: 0.09, color: '#3a3a3a' },
               muzzle: { enabled: false },
               slide: { enabled: false },
               coreGlow: { color: '#ffcc00', intensity: 1.2, offsetX: 0.5 },
               accentStripe: { color: '#ffcc00' },
           },
       },
       {
           id: 'pulse_wave_emitter', name: 'Pulse Wave Emitter', weaponId: 9,
           overrides: {
               frame: { height: 0.18 },
               barrel: { length: 0.16, width: 0.1, color: '#5a5a6a' },
               muzzle: { width: 0.13, length: 0.06 },
               coreGlow: { color: '#c8b6ff', intensity: 1.6, size: 0.13 },
               accentStripe: { color: '#a78bff' },
           },
       },
       {
           id: 'particle_beam_rifle', name: 'Particle Beam Rifle', weaponId: 10,
           overrides: {
               frame: { length: 1.0, height: 0.12 },
               barrel: { length: 0.46, width: 0.03, color: '#2f3a42' },
               slide: { length: 0.6 },
               coreGlow: { color: '#00e5ff', intensity: 1.7, offsetX: 1.1 },
               accentStripe: { color: '#00e5ff', length: 0.8 },
           },
       },
       {
           id: 'prism_beam_splitter', name: 'Prism Beam Splitter', weaponId: 11,
           overrides: {
               frame: { length: 0.9, height: 0.16 },
               barrel: { length: 0.38, width: 0.045, color: '#3a3550' },
               muzzle: { width: 0.11 },
               coreGlow: { color: '#ff6bff', intensity: 1.6 },
               accentStripe: { color: '#ff6bff' },
               sight: { color: '#ff6bff' },
           },
       },
       {
           id: 'orbital_drone_bay', name: 'Orbital Drone Bay', weaponId: 12,
           overrides: {
               frame: { length: 0.7, height: 0.24, taper: 0.2 },
               barrel: { enabled: false },
               muzzle: { enabled: false },
               slide: { length: 0.55, height: 0.09 },
               coreGlow: { color: '#7fffb0', intensity: 1.5, size: 0.15, offsetX: 0.4 },
               accentStripe: { color: '#5affa0' },
               mount: { scale: 1.05 },
           },
       },
       {
           id: 'flamethrower', name: 'Flamethrower', weaponId: 13,
           overrides: {
               frame: { color: '#8a3a2a', height: 0.17 },
               barrel: { length: 0.3, width: 0.07, color: '#2a1a14' },
               muzzle: { width: 0.12, color: '#ff8a1a' },
               coreGlow: { color: '#ff8a1a', intensity: 1.5 },
               accentStripe: { color: '#ff5a1a' },
           },
       },
       {
           id: 'railgun', name: 'Railgun', weaponId: 14,
           overrides: {
               frame: { length: 1.1, height: 0.11, taper: 0.55 },
               barrel: { length: 0.55, width: 0.028, color: '#5c5c66' },
               slide: { length: 0.65, offsetX: 0.08 },
               coreGlow: { color: '#79e0ff', intensity: 1.8, offsetX: 1.25, size: 0.08 },
               accentStripe: { color: '#79e0ff', length: 0.95 },
           },
       },
       {
           id: 'shotgun_spread', name: 'Shotgun Spread', weaponId: 15,
           overrides: {
               frame: { length: 0.6, height: 0.18, taper: 0.35 },
               barrel: { length: 0.2, width: 0.08, color: '#4a4038' },
               muzzle: { width: 0.12, length: 0.07 },
               coreGlow: { color: '#ffb347', intensity: 1.2 },
               accentStripe: { color: '#ffb347' },
           },
       },
       {
           id: 'missile_pod', name: 'Missile Pod', weaponId: 16,
           overrides: {
               frame: { length: 0.65, height: 0.26, taper: 0.15 },
               barrel: { enabled: false },
               muzzle: { enabled: false },
               slide: { length: 0.5, height: 0.1 },
               coreGlow: { color: '#ff3a3a', intensity: 1.4, offsetX: 0.4 },
               accentStripe: { color: '#ff3a3a' },
           },
       },
       {
           id: 'laser_emitter', name: 'Laser Emitter', weaponId: 17,
           overrides: {
               frame: { length: 0.88, height: 0.11 },
               barrel: { length: 0.42, width: 0.028, color: '#4a5560' },
               coreGlow: { color: '#ff2e2e', intensity: 1.8, offsetX: 1.05 },
               accentStripe: { color: '#ff2e2e' },
               sight: { color: '#ff2e2e' },
           },
       },
       {
           id: 'chain_lightning_coil', name: 'Chain Lightning Coil', weaponId: 18,
           overrides: {
               frame: { height: 0.18 },
               barrel: { length: 0.22, width: 0.08, color: '#3a3a4a' },
               muzzle: { width: 0.11 },
               coreGlow: { color: '#e0ff4d', intensity: 1.7, size: 0.13 },
               accentStripe: { color: '#e0ff4d' },
               sight: { color: '#e0ff4d' },
           },
       },
       {
           id: 'void_ripper', name: 'Void Ripper', weaponId: 19,
           overrides: {
               frame: { color: '#151018', length: 1.05, height: 0.17, taper: 0.45 },
               barrel: { color: '#0a0810', length: 0.4, width: 0.05 },
               muzzle: { color: '#ff0090', width: 0.12 },
               mountBracket: { color: '#0a0810' },
               coreGlow: { color: '#ff0090', intensity: 2.2, size: 0.16, offsetX: 1.15 },
               accentStripe: { color: '#ff0090', length: 0.9 },
               sight: { color: '#ff0090' },
               mount: { scale: 1.1 },
           },
       },
   
           */
]

export const GUN_TYPES = RAW_TYPES.map(({ id, name, weaponId, overrides }) => ({
    id,
    name,
    weaponId,
    config: deepMerge(DEFAULT_GUN_CONFIG, overrides),
}))

export function getGunTypeByWeaponId(weaponId) {
    return GUN_TYPES.find(g => g.weaponId === weaponId) ?? GUN_TYPES[0]
}

export function getGunTypeById(id) {
    return GUN_TYPES.find(g => g.id === id) ?? GUN_TYPES[0]
}