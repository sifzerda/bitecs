// src/ecs/weapons/config/gunConfigs.js

import { WEAPON_BY_NAME } from "./weapons.js"

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
    mount: {
        offsetX: 0.45,
        offsetY: -0.05,
        scale: 0.9,
        width: 1.4,
        height: 0.45,
    },

}

// ============================================================
// 20 gun types
// ============================================================


const RAW_TYPES = [
    {
        id: "00_raygun",
        name: "Ray Gun",
        weaponId: WEAPON_BY_NAME.raygun.id,
        svg: "/gun_svgs/00_raygun.svg",
        overrides: { mount: { width: 1.1, height: 0.4, offsetX: 0.5, offsetY: 0.1 } },
    },
    {
        id: "01_shotgun",
        name: "Shotgun",
        weaponId: WEAPON_BY_NAME.shotgun.id,
        svg: "/gun_svgs/01_shotgun.svg",
        overrides: { mount: { width: 1.6, height: 0.45, offsetX: 0.5, offsetY: -0.02, scale: 1.0 } },
    },
    {
        id: "02_machinegun",
        name: "Machine Gun",
        weaponId: WEAPON_BY_NAME.machinegun.id,
        svg: "/gun_svgs/02_machinegun.svg",
        overrides: { mount: { width: 1.5, height: 0.4, offsetX: 0.48, offsetY: -0.03, scale: 0.95 } },
    },
    {
        id: "03_cryogun",
        name: "Cryo Gun",
        weaponId: WEAPON_BY_NAME.cryocannon.id,
        svg: "/gun_svgs/03_cryogun.svg",
        overrides: { mount: { width: 1.3, height: 0.5, offsetX: 0.42, offsetY: -0.04, scale: 0.9 } },
    },
    {
        id: "04_grenadelauncher",
        name: "Grenade Launcher",
        weaponId: WEAPON_BY_NAME.grenadegun.id,
        svg: "/gun_svgs/04_grenadelauncher.svg",
        overrides: { mount: { width: 1.4, height: 0.55, offsetX: 0.45, offsetY: -0.02, scale: 1.0 } },
    },
    {
        id: "05_acidthrower",
        name: "Acidthrower",
        weaponId: WEAPON_BY_NAME.acidsprayer.id,
        svg: "/gun_svgs/05_acidthrower.svg",
        overrides: { mount: { width: 1.35, height: 0.5, offsetX: 0.43, offsetY: -0.03, scale: 0.9 } },
    },
    {
        id: "06_missilelauncher",
        name: "Missile Launcher",
        weaponId: WEAPON_BY_NAME.missilegun.id,
        svg: "/gun_svgs/06_missilelauncher.svg",
        overrides: { mount: { width: 1.7, height: 0.6, offsetX: 0.55, offsetY: -0.01, scale: 1.05 } },
    },
    {
        id: "07_flamethrower",
        name: "Flamethrower",
        weaponId: WEAPON_BY_NAME.flamethrower.id,
        svg: "/gun_svgs/07_flamethrower.svg",
        overrides: { mount: { width: 1.5, height: 0.5, offsetX: 0.48, offsetY: -0.02, scale: 1.0 } },
    },
    {
        id: "08_lasergun",
        name: "Laser Gun",
        weaponId: WEAPON_BY_NAME.lasergun.id,
        svg: "/gun_svgs/08_lasergun.svg",
        overrides: { mount: { width: 1.2, height: 0.35, offsetX: 0.4, offsetY: -0.05, scale: 0.85 } },
    },
    {
        id: "09_arcgun",
        name: "RTL Gun",
        weaponId: WEAPON_BY_NAME.arcgun.id,
        svg: "/gun_svgs/09_arcgun.svg",
        overrides: { mount: { width: 1.25, height: 0.4, offsetX: 0.4, offsetY: -0.04, scale: 0.85 } },
    },
    {
        id: "10_plasmagun",
        name: "Plasma Gun",
        weaponId: WEAPON_BY_NAME.plasmagun.id,
        svg: "/gun_svgs/10_plasmagun.svg",
        overrides: { mount: { width: 1.3, height: 0.45, offsetX: 0.42, offsetY: -0.03, scale: 0.9 } },
    },
]

export const GUN_TYPES = RAW_TYPES.map(({
    id,
    name,
    weaponId,
    svg,
    overrides = {},
}) => ({
    id,
    name,
    weaponId,
    svg,
    config: deepMerge(DEFAULT_GUN_CONFIG, overrides),
}))

export function getGunTypeByWeaponId(weaponId) {
    return GUN_TYPES.find(g => g.weaponId === weaponId) ?? GUN_TYPES[0]
}

export function getGunTypeById(id) {
    const found = GUN_TYPES.find(g => g.id === id)
    if (!found) {
        console.warn(`getGunTypeById: no gun type with id "${id}" — falling back to ${GUN_TYPES[0].id}`)
        return GUN_TYPES[0]
    }
    return found
}

if (import.meta.env?.DEV) {
    const seen = new Set()
    for (const g of GUN_TYPES) {
        if (seen.has(g.weaponId)) console.warn(`${g.id}: weaponId ${g.weaponId} already claimed by another gun`)
        seen.add(g.weaponId)
    }
}
