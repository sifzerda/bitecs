// src/ecs/constants/bosses.js

const DEFAULT_PART_CONFIG = {
    general: { extrudeDepth: 0.03 },

    fuselage: {
        color: '#cfe8ff',
        tipY: 0.78,
        shoulderY: 0.50,
        shoulderWidth: 0.18,
        waistY: -0.26,
        waistWidth: 0.14,
        tailY: -0.55,
        tailWidth: 0.30,
        notchY: -0.37,
    },

    cockpit: {
        color: '#0070ff',
        topY: 0.62,
        topWidth: 0.06,
        midY: 0.14,
        midWidth: 0.15,
        bottomY: 0.04,
        bottomWidth: 0.09,
    },

    wing: {
        color: '#cfe8ff',
        rootX: 0.20,
        rootY: 0.40,
        tipX: 0.79,
        tipY: -0.25,
        trailX: 0.76,
        trailY: -0.45,
        innerX: 0.14,
        innerY: -0.24,
    },

    wingPanel: {
        color: '#dff1ff',
        inset: 0.08,
    },

    wingtip: {
        color: '#00ff10',
        width: 0.04,
        height: 0.43,
        offsetX: 0.77,
        offsetY: -0.35,
        zOffset: 0.02,
    },

    horn: {
        enabled: false,
        color: "#ffe605",
        baseWidth: 0.09,
        length: 0.82,
        curveAmount: 0.18,
        offsetX: 0.13,
        offsetY: 0.07,
        sweepDeg: 25,
        tiltDeg: 8,
    },

    decal: {
        enabled: true,
        color: '#00ff10',
        width: 0.06,
        length: 0.65,
        offsetX: 0.30,
        offsetY: 0.00,
        tiltDeg: -11,
    },

    cockpitGlass: {

        enabled: true,
        inset: 0.08,
        zOffset: 0.05,
        color: "#ddfdff",
        metalness: 0,
        roughness: 0.015,
        transmission: 1,
        thickness: 0.75,
        ior: 1.52,
        clearcoat: 1,
        clearcoatRoughness: 0,
        envMapIntensity: 8,
        iridescence: 10,
        iridescenceIOR: 1.35,
        iridescenceThicknessMin: 180,
        iridescenceThicknessMax: 900,
        attenuationColor: "#006eff",
        attenuationDistance: 2.2,
    },

    engineIntake: {
        enabled: true,
        color: '#00b9ff',
        width: 0.09,
        height: 0.30,
        offsetX: 0.40,
        offsetY: -0.28,
    },

    hullVent: {
        enabled: true,
        color: '#2030ff',
        count: 8,
        width: 0.09,
        height: 0.03,
        spacing: 0.05,
        offsetX: 0.21,
        offsetY: -0.08,
    },

    racingStripe: {
        enabled: true,
        color: '#00ff10',
        width: 0.04,
        length: 0.94,
        offsetX: 0.30,
        offsetY: -0.14,
        tiltDeg: -10,
    },

    noseSpike: {
        enabled: true,
        color: '#00ff10',
        length: 0.26,
        width: 0.07,
        offsetY: -0.32,
        roundness: 0.94,
        zOffset: 0.04,
    },

    tailFin: {
        enabled: true,
        color: '#7cfff4',
        length: 0.25,
        width: 0.35,
        sweep: 0.50,
        offsetX: 0.14,
        offsetY: -0.33,
        splayDeg: 0,
    },

    exhaustPort: {
        enabled: true,
        color: '#0070ff',
        width: 0.22,
        height: 0.14,
        offsetX: 0.01,
        offsetY: 0.15,
    },

    propeller: {
        enabled: false,
        bladeColor: "#5f5f5f",
        hubColor: "#000000",
        bladeCount: 3,
        bladeLength: 0.15,
        bladeWidth: 0.05,
        hubRadius: 0.03,
        offsetX: 0.24,
        offsetY: -1.96,
        zOffset: 0.30,
        spinSpeed: 6,
    },

    centerPropeller: {
        enabled: false,
        bladeColor: "#ffffff",
        hubColor: "#ff004d",
        bladeCount: 2,
        bladeLength: 0.33,
        bladeWidth: 0.40,
        hubRadius: 0.09,
        offsetY: 0.75,
        zOffset: 0.30,
        spinSpeed: 20.0,
    },

    tailBoom: { enabled: false, color: "#3a6bd5", length: 0.25, baseWidth: 0.17, tipWidth: 0.06 },

    boomFin: {
        enabled: false, color: "#03ff00",
        length: 1.00, width: 0.17, sweep: 0.63,
        offsetX: 0.42, offsetY: 0.02, splayDeg: 0,
    },

    landingGear: {
        enabled: false, legColor: "#000000", wheelColor: "#ff0000",
        legLength: 0.28, legWidth: 0.09, wheelRadius: 0.06,
        offsetX: 0.00, offsetY: 0.48, zOffset: 0.04,
    },

    hullTexture: {
        enabled: false, textureKey: "Light Wool",
        opacity: 1.0, repeatX: 1.0, repeatY: 1.0,
    },

    healthBar: {
        bgColor: "#ff0000", fgColor: "#44ff88",
        width: 3.0, height: 0.2, offsetY: 2.2,
    },
}

// Deep-ish merge: per-part-group override, falling back to defaults for
// any group or field the boss entry doesn't specify.
function withDefaults(overrides) {
    const merged = {}
    for (const group of Object.keys(DEFAULT_PART_CONFIG)) {
        merged[group] = { ...DEFAULT_PART_CONFIG[group], ...(overrides[group] ?? {}) }
    }
    // Pass through top-level metadata fields (key, name, ...) untouched.
    for (const field of Object.keys(overrides)) {
        if (!(field in DEFAULT_PART_CONFIG)) merged[field] = overrides[field]
    }
    return merged
}

// ============================================================
// Boss roster — this is the part you'll actually edit day to day.
// ============================================================

export const BOSSES = [
    withDefaults({
        key: "player",
        name: "Player",
    }),

    withDefaults({
        key: "shotgun",
        name: "Space Cowboy",
        fuselage: { color: '#ff3355', tipY: 0.66, shoulderY: 0.39, waistY: -0.40, tailY: -0.75, tailWidth: 0.50, notchY: -0.28 },
        cockpit: { color: '#3a6bd5' },
        cockpitGlass: { color: '#90eeff', attenuationColor: '#50a4ce', },
        engineIntake: { color: '#3a6bd5', width: 0.10, height: 0.46, offsetX: 0.35 },
        wing: { color: '#8d001c' },
        wingPanel: { color: '#ff3355' },
        wingTip: { color: '#ffe605', width: 0.07, height: 0.34, offsetX: 0.71, offsetY: -0.31 },
        noseSpike: { color: '#ffe605', length: 0.13 },
        tailFin: { color: '#ffe605', length: 0.33, width: 0.15, sweep: 0, offsetX: 0.73, offsetY: -0.64 },
        exhaustPort: { color: '#3a6bd5', width: 0.14, height: 0.17, offsetX: 0, offsetY: 0.23 },
        hullVent: { color: '#3a6bd5', width: 0.13, height: 0.05, spacing: 0.07, offsetX: 0.26, offsetY: 0 },
        racingStripe: { color: '#ffe605', width: 0.07, length: 1.03, offsetX: 0.45, offsetY: -0.16, tiltDeg: -2 },
        decal: { color: '#ffe605', width: 0.07, length: 0.76, offsetX: 0.35, offsetY: 0, tiltDeg: -18 },
    }),

    withDefaults({
        key: "machinegun",
        name: "Rambo The Space Copter",
        fuselage: { color: "#dfe8ff", tailWidth: 0.05 },
        cockpit: { color: "#00c2ff" },
        wing: { color: "#1c3faa" },
        wingPanel: { color: "#cfe8ff" },
        tailFin: { enabled: false },
        tailBoom: { length: 0.65, baseWidth: 0.2, tipWidth: 0.05 },
        boomFin: { splayDeg: 20, color: "#00c2ff" },
        propeller: { enabled: false },
        centerPropeller: { bladeColor: "#cfe8ff", hubColor: "#1c3faa", bladeLength: 0.45 },
        landingGear: { enabled: true },
        noseSpike: { color: "#00c2ff", roundness: 1, length: 0.25 },
        racingStripe: { color: "#00c2ff" },
        decal: { color: "#1c3faa" },
        healthBar: { fgColor: "#00c2ff" },
    }),

    withDefaults({
        key: "missilegun",
        name: "Rogue Mars Missiler",
        // A stretched-out gunship: long tail boom with splayed fins,
        // landing gear down, no side propellers, cool blue palette.
        fuselage: { color: "#dfe8ff", tailWidth: 0.05 },
        cockpit: { color: "#00c2ff" },
        wing: { color: "#1c3faa" },
        wingPanel: { color: "#cfe8ff" },
        tailFin: { enabled: false },
        tailBoom: { length: 0.65, baseWidth: 0.2, tipWidth: 0.05 },
        boomFin: { splayDeg: 20, color: "#00c2ff" },
        propeller: { enabled: false },
        centerPropeller: { bladeColor: "#cfe8ff", hubColor: "#1c3faa", bladeLength: 0.45 },
        landingGear: { enabled: true },
        noseSpike: { color: "#00c2ff", roundness: 1, length: 0.25 },
        racingStripe: { color: "#00c2ff" },
        decal: { color: "#1c3faa" },
        healthBar: { fgColor: "#00c2ff" },
    }),

    withDefaults({
        key: "grenagegun",
        name: "War Machine",
        // A stretched-out gunship: long tail boom with splayed fins,
        // landing gear down, no side propellers, cool blue palette.
        fuselage: { color: "#dfe8ff", tailWidth: 0.05 },
        cockpit: { color: "#00c2ff" },
        wing: { color: "#1c3faa" },
        wingPanel: { color: "#cfe8ff" },
        tailFin: { enabled: false },
        tailBoom: { length: 0.65, baseWidth: 0.2, tipWidth: 0.05 },
        boomFin: { splayDeg: 20, color: "#00c2ff" },
        propeller: { enabled: false },
        centerPropeller: { bladeColor: "#cfe8ff", hubColor: "#1c3faa", bladeLength: 0.45 },
        landingGear: { enabled: true },
        noseSpike: { color: "#00c2ff", roundness: 1, length: 0.25 },
        racingStripe: { color: "#00c2ff" },
        decal: { color: "#1c3faa" },
        healthBar: { fgColor: "#00c2ff" },
    }),

]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(BOSSES.map((b, i) => [b.key, i]))

/*
============================================================
Wiring a boss entity to one of these configs
============================================================
BossRenderer looks up `BossType.typeIndex[eid]` for every entity returned
by bossQuery() to decide which entry of BOSSES to render it with.
 
Add this next to your other components in components.js (same plain
Float32Array/Uint8Array style as Position, Health, etc.):
 
    export const BossType = {
        typeIndex: new Uint8Array(MAX),
    };
 
Then, wherever you currently spawn a boss and addComponent(world, eid, BossTag),
add the matching call (note this codebase's addComponent order is
(world, eid, Component)):
 
    import { BossType } from "./components"
    import { BOSS_INDEX_BY_KEY } from "./bosses"
 
    addComponent(world, eid, BossType)
    BossType.typeIndex[eid] = BOSS_INDEX_BY_KEY.ram   // or .interceptor, .longtail, ...
*/