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
        id: '00_raygun', name: 'Ray Gun', weaponId: 0,

    },
    // shotgun
    {
        id: '01_shotgun', name: 'Shotgun', weaponId: 1,
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
        id: '02_machinegun', name: 'Machine Gun', weaponId: 2,
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
        id: '03_grenadelauncher', name: 'Grenade Launcher', weaponId: 3,
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
        id: '04_missilelauncher', name: 'Missile Launcher', weaponId: 4,
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
        id: '05_flamethrower', name: 'Flamethrower', weaponId: 5,
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
        id: '06_cryogun', name: 'Cryo Gun', weaponId: 6,
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

    // acidthrower
 
    {
        id: '07_acidthrower', name: 'Acidthrower', weaponId: 6,
        overrides: {
            frame: { color: '#98D6F5', length: 0.89, height: 0.27, taper: 0.35, offsetX: -0.12 },
            slide: {
                color: '#00FF40', length: 0.48, height: 0.06,
                offsetX: 0.04, offsetY: 0.02,
                metalness: 0.85, roughness: 0.15,
            },
            canister: {
                enabled: true, color: '#98FB98',
                length: 0.87, width: 0.44,
                offsetX: 0.42, offsetY: 0,
                metalness: 0.05, roughness: 0.03,
                transmission: 1, thickness: 0.2, ior: 1.4,
                clearcoat: 1, clearcoatRoughness: 0.05,
            },
            // starts right at the canister's front edge (0.5 + 0.6/2 = 0.8)
            barrel: {
                color: '#98D6F5', length: 0.6, width: 0.05,
                offsetX: 1.08, offsetY: 0,
                metalness: 0.75, roughness: 0.2,
            },
            muzzle: {
                color: '#00FF7F', width: 0.065, length: 0.05,
                offsetX: 0, offsetY: 0,
                metalness: 0.3, roughness: 0.1,
            },
            mountBracket: { color: '#7c8f9c', length: 0.22, width: 0.24 },
            sight: { enabled: false },
            accentStripe: { color: '#0049ff', width: 0.07, length: 0.75 },
            // sized and centered to match the canister's own footprint
            coreGlow: {
                color: '#00FF7F', intensity: 1.15,
                offsetX: 0.45, offsetY: 0,
                mist: true, width: 0.9, height: 0.7,
            },
            mount: { offsetX: 0.45, offsetY: -0.05, scale: 0.9 },
        },
    },

    /*  
 
 
 
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