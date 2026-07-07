// src/ecs/constants/gunConfigs.js

function deepMerge(base, overrides) {
    const out = { ...base }
    for (const key in overrides) {
        if (
            overrides[key] &&
            typeof overrides[key] === 'object' &&
            !Array.isArray(overrides[key])
        ) {
            out[key] = deepMerge(base[key] ?? {}, overrides[key])
        } else {
            out[key] = overrides[key]
        }
    }
    return out
}

// ============================================================
// Baseline — twin-mounted rifle, no handheld parts (no grip/magazine/
// triggerGuard). `mountBracket` replaces grip as the hull-attachment
// stub. Gun points +X locally, mounted with muzzle facing ship's nose.
// ============================================================

export const DEFAULT_GUN_CONFIG = {

    general: { extrudeDepth: 0.025 },

    frame: {
        color: '#cfe8ff',
        length: 0.85,     // rifles read longer than the old pistol frame
        height: 0.13,
        taper: 0.4,
    },

    slide: {
        enabled: true, color: '#8fa8c0',
        length: 0.5, height: 0.06, offsetX: 0.05, offsetY: 0.045,
        metalness: 0.7, roughness: 0.25,
    },

    barrel: {
        enabled: true,
        color: '#3a4650', length: 0.34, width: 0.035,
        offsetX: 0.78, offsetY: 0.0, metalness: 0.8, roughness: 0.3,
    },

    muzzle: {
        enabled: true, color: '#00ff88',
        length: 0.09, width: 0.06, metalness: 0.4, roughness: 0.35,
    },

    // Hull-attachment stub — sits at the rear of the frame, fixed to the
    // hardpoint. Purely structural, no moving/handheld implication.
    mountBracket: {
        enabled: true, color: '#4a4a52',
        length: 0.14, width: 0.15,
        offsetX: -0.42,
        metalness: 0.5, roughness: 0.6,
    },

    sight: {
        enabled: true, color: '#00ff88',
        width: 0.03, height: 0.035, offsetX: 0.30,
    },

    accentStripe: {
        enabled: true, color: '#00ff10',
        width: 0.03, length: 0.6, offsetY: 0.0,
    },

    coreGlow: {
        enabled: true, color: '#00ffcc',
        size: 0.10, offsetX: 0.88, intensity: 1.2,
    },

    // hull-mount placement — where the pair sits on the ship, mirrored on ±X
    mount: {
        offsetX: 0.32,
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
        overrides: {
            frame: { color: '#cfe8ff' },
            coreGlow: { color: '#00ffcc', intensity: 1.0 },
        },
    },
    {
        id: 'rapid_cannon', name: 'Rapid Cannon', weaponId: 1,
        overrides: {
            frame: { length: 0.75, height: 0.12 },
            barrel: { length: 0.4, width: 0.03, color: '#4a5560' },
            coreGlow: { color: '#ffd23f', intensity: 1.1 },
            accentStripe: { color: '#ffaa00' },
        },
    },
    {
        id: 'ricochet_blaster', name: 'Ricochet Blaster', weaponId: 2,
        overrides: {
            frame: { color: '#d9f0ff' },
            barrel: { width: 0.05, color: '#5c7a8c' },
            muzzle: { color: '#3ad6ff', width: 0.08 },
            coreGlow: { color: '#3ad6ff', intensity: 1.3 },
            accentStripe: { color: '#00c8ff' },
        },
    },
    {
        id: 'grenade_launcher', name: 'Grenade Launcher', weaponId: 3,
        overrides: {
            frame: { length: 0.65, height: 0.20, taper: 0.3 },
            barrel: { length: 0.32, width: 0.08, color: '#3f3a35' },
            muzzle: { width: 0.12, length: 0.1, color: '#ff7a1a' },
            slide: { enabled: false },
            coreGlow: { color: '#ff8c1a', intensity: 1.4, size: 0.13 },
            accentStripe: { color: '#ff6a00' },
        },
    },
    {
        id: 'dark_matter_siphon', name: 'Dark Matter Siphon', weaponId: 4,
        overrides: {
            frame: { color: '#3a2c4a', height: 0.16 },
            barrel: { color: '#1a1220', width: 0.05 },
            muzzle: { color: '#9b30ff', width: 0.09 },
            coreGlow: { color: '#b84dff', intensity: 1.8, size: 0.14 },
            accentStripe: { color: '#7a1aff' },
            sight: { color: '#b84dff' },
        },
    },
    {
        id: 'cryo_freezer', name: 'Cryo Freezer', weaponId: 5,
        overrides: {
            frame: { color: '#dff7ff' },
            barrel: { color: '#5aa8c0', length: 0.36, width: 0.05 },
            muzzle: { color: '#aef5ff', width: 0.09 },
            coreGlow: { color: '#aef5ff', intensity: 1.3 },
            accentStripe: { color: '#4fd8ff' },
        },
    },
    {
        id: 'cluster_cannon', name: 'Cluster Cannon', weaponId: 6,
        overrides: {
            frame: { length: 0.78, height: 0.17 },
            barrel: { width: 0.07, length: 0.28, color: '#4a4038' },
            muzzle: { width: 0.11 },
            coreGlow: { color: '#ff5a3a', intensity: 1.3 },
            accentStripe: { color: '#ff5a3a' },
        },
    },
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