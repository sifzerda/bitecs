// src/ecs/weapons/config/weapons.js

import { validateWeapons } from "./weaponSchema.js"

function defineWeapons(list) {
    const byId = []
    const byName = {}

    list.forEach((w, i) => {
        if (byName[w.name]) throw new Error(`duplicate weapon name "${w.name}"`)
        const weapon = { ...w, id: i }
        byId.push(weapon)
        byName[w.name] = weapon
    })

    return { byId, byName }
}

const RAW = [
    {
        name: "raygun",
        category: "bullet",
        directDamage: 10, maxBullets: 128, hitRadius: 0.5, fireRate: 0.15,
        speed: 18, lifetime: 1.2, projectileCount: 1, spreadAngle: 0,
        color: "#e8fff5", glowColor: "#66ffcc", haloColor: "#77ffdd",
    },
    {
        name: "shotgun",
        category: "bullet",
        directDamage: 12, maxBullets: 128, hitRadius: 0.6, fireRate: 0.35,
        speed: 16, lifetime: 1.0, projectileCount: 3, spreadAngle: 0.20,
        color: "#fff2b0", glowColor: '#ffe605', haloColor: "#ff8800",
    },
    {
        name: "machinegun",
        category: "bullet",
        directDamage: 5, maxBullets: 128, hitRadius: 0.5, fireRate: 0.07,
        speed: 22, lifetime: 0.9, projectileCount: 1, spreadAngle: 0.05,
        color: "#c9e8ff", glowColor: "#5599ff", haloColor: "#3366ff",

        aiBurstCount: 4, aiBurstGap: 0.09,
    },
    {
        name: "cryocannon",
        category: "thrower",
        range: 5.5, // length of spray
        coneAngle: 0.6, // angular shape of spray, higher causes edges to curl around
        directDamage: 10,
        freezeDuration: 2.5,
        tickSparkInterval: 0.08,
        color: "#c9f5ff", glowColor: "#66e0ff", haloColor: "#0099cc",
        particleMist: true,
        particleTurbulence: 0.45, // how much the spray surges around (lower means straighter stream)
        particleSpeedMult: 0.5, // how fast the spray comes out
        particleSizeMult: 0.3, // how big the spray particles are
        particleFlicker: 0.0, // how much the particles switch between black and lit
        particleSpreadPower: 3.0, // how much the spray spreads out -- higher value = less spread
        particleCoreTightness: 0.85, // how much the particles stay together/tight, higher means looser
    },
    {
        name: "grenadegun",
        category: "bullet",
        trail: true, trailColor: "#7DF9FF",
        explosive: true, explosionRadius: 2.5, directDamage: 25, maxBullets: 32,
        hitRadius: 0.6, fireRate: 0.9, speed: 12, lifetime: 1.6,
        projectileCount: 1, spreadAngle: 0,
        color: "#ffcf80", glowColor: "#ff9933", haloColor: "#ff7700",
    },
    {
        name: "acidsprayer",
        category: "thrower",
        range: 5.5, coneAngle: 0.55, directDamage: 10,
        // Strong lingering corrosion.
        corrosion: true, corrosionDamage: 1, corrosionDuration: 5.0,

        tickSparkInterval: 0.08,
        color: "#ccff66", glowColor: "#99ff00", haloColor: "#669900",
        particleMist: false,

        particleTurbulence: 0.15,
        particleSpeedMult: 0.9,
        particleSizeMult: 0.3,
        particleFlicker: 0.00,
        particleSpreadPower: 2.2,
        particleCoreTightness: 0.85,
    },
    {
        name: "missilegun",
        category: "bullet",
        trail: true, trailColor: "#3366ff",
        directDamage: 30, maxBullets: 128, hitRadius: 1.0, fireRate: 0.8,
        speed: 10, lifetime: 3.0, projectileCount: 1, spreadAngle: 0,
        color: "#ffaa00", glowColor: "#ff6600", haloColor: "#ff2200",
        turnRate: 3.0, homing: true,   // <-- explicit flag, see missileSystem below
    },
    {
        name: "flamethrower",
        category: "thrower",
        range: 6, coneAngle: 0.65, directDamage: 35, tickSparkInterval: 0.06,
        color: "#ffcc66", glowColor: "#ff6600", haloColor: "#ff2200",
        particleMist: false,

        // Short-lived burn/corrosion.
        corrosion: true, corrosionDamage: 3, corrosionDuration: 1.5,

        particleTurbulence: 0.4, particleSpeedMult: 1.0,
        particleSizeMult: 0.3, particleFlicker: 0,
        particleSpreadPower: 2.4,
        particleCoreTightness: 0.8,
    },
    {
        name: "lasergun",
        category: "beam",
        hitRadius: 0.3, range: 30, directDamage: 40, beamWidth: 0.11,
        tickSparkInterval: 0.05,
        color: "#ffe0ee", glowColor: "#ff0055", haloColor: "#ff0033",
    },
    {
        name: "arcgun",
        category: "beam",
        jagged: true, range: 14, directDamage: 35, chainDamage: 14,
        chainCount: 3, chainRange: 5, beamWidth: 0.09, tickSparkInterval: 0.06,
        color: "#fffbe8", glowColor: "#1F51FF", haloColor: "#0818A8",
    },
    {
        name: "plasmagun",
        category: "beam",
        range: 20, directDamage: 22, beamWidth: 0.16, surgeSpeed: 2.2,
        tickSparkInterval: 0.08, rainbow: true, surgeIntensity: 0.6,
        color: "#ffffff", glowColor: "#ff66ff", haloColor: "#66ffff",
    },
]

export const { byId: WEAPONS, byName: WEAPON_BY_NAME } = defineWeapons(RAW)

export function getWeapon(id) {
    return WEAPONS[id] ?? WEAPONS[0]
}

if (import.meta.env?.DEV) validateWeapons(WEAPONS)