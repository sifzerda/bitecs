// src/ecs/constants/bosses.js

const DEFAULT_PART_CONFIG = {
    general: { extrudeDepth: 0.03 },

    gun: {
        enabled: true,
        typeId: 'pulse_blaster',
        offsetX: 0.32,
        offsetY: -0.05,
        scale: 0.9,
        rotation: 0,
        zOffset: 0.04,
        mirrored: true,
    },

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
        zOffset: 0.041,
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

    tailBoom: {
        enabled: false,
        color: "#3a6bd5",
        length: 0.25,
        baseWidth: 0.17,
        tipWidth: 0.06
    },

    boomFin: {
        enabled: false,
        color: "#03ff00",
        length: 1.00,
        width: 0.17,
        sweep: 0.63,
        offsetX: 0.42,
        offsetY: 0.02,
        splayDeg: 0,
    },

    landingGear: {
        enabled: false,
        legColor: "#000000",
        wheelColor: "#ff0000",
        legLength: 0.28,
        legWidth: 0.09,
        wheelRadius: 0.06,
        offsetX: 0.00,
        offsetY: 0.48,
        zOffset: 0.04,
    },

    hullTexture: {
        enabled: false,
        textureKey: "Light Wool",
        opacity: 1.0,
        repeatX: 1.0,
        repeatY: 1.0,
    },

    healthBar: {
        bgColor: "#ff0000",
        fgColor: "#44ff88",
        width: 3.0,
        height: 0.2,
        offsetY: 2.2,
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
        gun: { enabled: false },
    }),

    withDefaults({
        key: "shotgun",
        name: "Space Cowboy",
        gun: { typeId: '01_sg', offsetX: 0.50, offsetY: -0.15 },
        fuselage: {
            color: '#ff3355',
            tipY: 0.66,
            shoulderY: 0.39,
            shoulderWidth: 0.19,   // was missing, fell back to 0.18
            waistY: -0.40,
            waistWidth: 0.26,      // was missing, fell back to 0.14
            tailY: -0.75,
            tailWidth: 0.50,
            notchY: -0.28,
        },
        cockpit: { color: '#3a6bd5' },
        cockpitGlass: {
            color: '#90eeff',
            roughness: 0.01,       // was missing, fell back to 0.015
            attenuationColor: '#50a4ce',
        },
        engineIntake: { color: '#3a6bd5', width: 0.10, height: 0.46, offsetX: 0.35 },
        wing: { color: '#8d001c' },
        wingPanel: { color: '#ff3355' },
        wingtip: {
            color: '#ffe605',
            width: 0.04,
            height: 0.34,
            offsetX: 0.75,
            offsetY: -0.27
        }, // fixed casing
        noseSpike: {
            color: '#ffe605',
            length: 0.13,
            width: 0.07,
            offsetY: 0,            // restores flush-with-tip position
            roundness: 5,          // restores sharp triangular point
            zOffset: 0.03,        // matches old fixed z depth
        },
        tailFin: { color: '#ffe605', length: 0.85, width: 0.14, sweep: 0.40, offsetX: 0.73, offsetY: -0.11, splayDeg: 0 },
        exhaustPort: { color: '#3a6bd5', width: 0.14, height: 0.17, offsetX: 0, offsetY: 0.23 },
        hullVent: { color: '#3a6bd5', width: 0.13, height: 0.05, spacing: 0.07, offsetX: 0.26, offsetY: 0 },
        racingStripe: { color: '#ffe605', width: 0.06, length: 0.30, offsetX: 0.60, offsetY: -0.38, tiltDeg: 72 },
        decal: { color: '#ffe605', width: 0.05, length: 1.10, offsetX: 0.35, offsetY: 0.20, tiltDeg: 42 },
    }),

    withDefaults({
        key: "machinegun",
        name: "Rambo The Space Copter",
        gun: { typeId: '02_mg', offsetX: 0.5, offsetY: -0.2 },
        fuselage: { color: '#7be2af', shoulderY: 0.53, shoulderWidth: 0.21, waistY: -0.40, waistWidth: 0.26, tailY: -0.59, tailWidth: 0.77, notchY: 0.00 },
        cockpit: { color: '#00ad57', topY: 0.73, topWidth: 0.19, midWidth: 0.24, bottomY: 0.20, bottomWidth: 0.00 },
        wing: { color: '#00ad57', rootX: 0.22, rootY: 0.00, tipX: 0.68, trailX: 0.69, trailY: -0.25 },
        wingPanel: { color: '#454B1B' },
        wingtip: { color: '#ffe605', width: 0, height: 0 },
        decal: { enabled: false, color: '#ffe605' },
        cockpitGlass: { zOffset: 0.11, color: "#00444e", roughness: 0.01, iridescenceIOR: 1.62, iridescenceThicknessMin: 400, iridescenceThicknessMax: 750, attenuationColor: "#ffffff" },
        engineIntake: { enabled: false, color: '#3a6bd5' },
        hullVent: { enabled: false, color: '#3a6bd5' },
        racingStripe: { color: '#454B1B', width: 0.13, length: 0.23, offsetX: 0.37, offsetY: -0.65 },
        noseSpike: { color: '#454B1B', length: 0.17, width: 0.42, offsetY: -0.10, roundness: 0, zOffset: 0.010 },
        tailFin: { color: '#454B1B', length: 1.00, width: 0.22, sweep: 0.00, offsetX: 0.23 },
        exhaustPort: { color: '#454B1B', width: 0.07, height: 1.95, offsetX: -0.01, offsetY: 0.50 },
        propeller: { enabled: true, sideways: false },
        centerPropeller: { enabled: true, bladeColor: '#454B1B', hubColor: '#000000', bladeCount: 4, bladeLength: 1.00, bladeWidth: 0.11, hubRadius: 0.06, offsetY: -0.34, spinSpeed: 4, sideways: false },
        tailBoom: { enabled: true, color: '#00ad57', length: 1.38, baseWidth: 0.23, tipWidth: 0.09 },
        boomFin: { enabled: true, color: '#00ad57', length: 0.21, width: 0.69, sweep: 0.18, offsetX: 0.08, offsetY: 0.04 },
        hullTexture: { enabled: true },
        healthBar: { fgColor: "#44ff88" },
    }),

    withDefaults({
        key: "grenagegun",
        name: "War Machine",
        gun: { typeId: '03_gl', offsetX: 0.8, offsetY: -0.6 },
        fuselage: { color: '#63a9eb', tipY: 2.00, shoulderY: 1.83, shoulderWidth: 0.15, waistY: -0.32, waistWidth: 0.17, tailY: -2.00, tailWidth: 0.16, notchY: -1.83 },
        cockpit: { color: '#0070ff', topY: 1.83, topWidth: 0.15, midY: 1.38, midWidth: 0.17, bottomY: 1.53, bottomWidth: 0.13 },
        wing: { color: '#0070ff', rootX: 0.17, rootY: 0.08, tipX: 2.00, tipY: -0.45, trailX: 1.99, trailY: -0.25, innerX: 0.17, innerY: -0.57 },
        wingPanel: { color: '#63a9eb' },
        wingtip: { color: '#004196', width: 0.17, height: 0.35, offsetX: 0.36, offsetY: -0.57 },
        decal: { enabled: false, color: '#3a6bd5', width: 0.28, length: 0.49, offsetX: 0.41, offsetY: -0.21, tiltDeg: 0 },
        cockpitGlass: { color: "#00c6e5", roughness: 0.01, attenuationColor: "#ffffff" },
        engineIntake: { enabled: false, color: '#3a6bd5', width: 0.32, height: 0.55, offsetX: 1.41, offsetY: -0.20 },
        hullVent: { enabled: false, color: '#3a6bd5' },
        racingStripe: { color: '#3a6bd5', width: 0.07, length: 1.73, offsetX: 1.00, offsetY: -0.13, tiltDeg: 74 },
        noseSpike: { color: '#3a6bd5', length: 0.23, width: 0.36, offsetY: -0.14, roundness: 0, zOffset: 0.010 },
        tailFin: { color: '#3a6bd5', length: 0.43, width: 0.55, sweep: 0.22, offsetX: 0.10, offsetY: -1.50, flip: false },
        exhaustPort: { color: '#3a6bd5', width: 0.11, height: 0.54, offsetX: 0.01, offsetY: 0.50 },
        tailBoom: { enabled: false, color: '#00ad57', length: 1.38, baseWidth: 0.23, tipWidth: 0.09 },
        boomFin: { enabled: false, color: '#3a6bd5', length: 0.21, width: 0.69, sweep: 0.18, offsetX: 0.08, offsetY: 0.04 },
    }),

    withDefaults({
        key: "missilegun",
        name: "Rogue Mars Missiler",
        gun: { typeId: '04_ml', offsetX: 0.9, offsetY: -0.4, scale: 1.0 },
        fuselage: { color: '#cfe8ff', tipY: 1.17, shoulderY: 0.47, shoulderWidth: 0.19, waistY: -0.76, waistWidth: 0.15, tailY: -0.40, tailWidth: 0.06, notchY: -0.30 },
        cockpit: { color: '#ff3355', topY: 0.58, topWidth: 0.11, midY: 0.11, midWidth: 0.14, bottomY: 0.02, bottomWidth: 0.00 },
        wing: { color: '#818a8d' },
        wingPanel: { color: '#cfe8ff' },
        wingtip: { color: '#ff3355' },
        decal: { enabled: false, color: '#818a8d', width: 0.11, length: 0.44, offsetX: 0.40, offsetY: -0.51, zOffset: -0.10, tiltDeg: -7 },
        cockpitGlass: { color: "#00ffc6", roughness: 0.01, attenuationColor: "#ffffff" },
        engineIntake: { color: '#818a8d', width: 0.07, height: 0.52, offsetX: 0.58, offsetY: 0.03 },
        hullVent: { color: '#000000', count: 8, width: 0.26, height: 0.03, spacing: 0.07, offsetX: 0.19, offsetY: -0.04 },
        racingStripe: { color: '#ff3355', width: 0.05, length: 0.67, offsetX: 0.32, offsetY: 0.03, tiltDeg: 0 },
        noseSpike: { color: '#ff3355', length: 0.44, width: 0.21, offsetY: -0.32, roundness: 0, zOffset: 0.10 },
        tailFin: { color: '#ff3355', length: 0.17, width: 0.59, sweep: 0.00, offsetX: 0.12, offsetY: -0.47, flip: false },
        exhaustPort: { color: '#818a8d', width: 0.24, height: 0.18, offsetX: 0.01, offsetY: 0.15 },
        tailBoom: { enabled: false, color: '#cfe8ff', length: 0.44, baseWidth: 0.17, tipWidth: 0.02 },
    }),

    withDefaults({
        key: "acidthrowergun",
        name: "Space Tractor",
        gun: { typeId: '07_at', offsetX: 0.70, offsetY: -0.10, scale: 1.0 },
        fuselage: { color: '#dfff00', tipY: 0.92, shoulderY: 0.53, shoulderWidth: 0.13, waistY: -0.34, waistWidth: 0.12, tailY: -0.83, tailWidth: 0.03, notchY: -0.84 },
        cockpit: { color: '#ffbf00', topY: 0.43, topWidth: 0.11, midY: 0.11, midWidth: 0.13, bottomY: 0.15, bottomWidth: 0.08 },
        wing: { color: '#ff2d2d', rootX: 0.13, rootY: 0.28, tipX: 1.68, tipY: -0.09, trailX: 1.67, trailY: -0.27, innerX: 0.10, innerY: -0.10 },
        wingPanel: { color: '#dfff00', inset: 0.08 },
        wingtip: { color: '#ff2d2d', width: 0.08, height: 0.41, offsetX: 0.65, offsetY: 0.02, zOffset: 0.02 },
        decal: { enabled: true, color: '#000000', width: 0.06, length: 0.41, offsetX: 0.31, offsetY: 0.05, tiltDeg: 0 },
        cockpitGlass: { enabled: true, inset: 0.08, zOffset: 0.30, color: "#00c6e5", roughness: 0.15, thickness: 0.72, ior: 1.00, attenuationColor: "#ffffff" },
        engineIntake: { enabled: true, color: '#3a6bd5', width: 0.21, height: 0.28, offsetX: 0.37, offsetY: -0.76 },
        hullVent: { enabled: true, color: '#dfff00', count: 4, width: 1.0, height: 0.15, spacing: 0.01, offsetX: 0.17, offsetY: -0.67 },
        racingStripe: { enabled: true, color: '#ff2d2d', width: 0.30, length: 0.29, offsetX: 0.0, offsetY: -0.53, tiltDeg: -10 },
        noseSpike: { enabled: true, color: '#ff2d2d', length: 0.18, width: 0.14, offsetY: -0.16, roundness: 0.47, zOffset: 0.10 },
        tailFin: { enabled: true, color: '#ff2d2d', length: 0.61, width: 0.20, sweep: 0.15, offsetX: 0.63, offsetY: -0.58, splayDeg: 0 },
        exhaustPort: { enabled: true, color: '#dfff00', width: 0.22, height: 0.14, offsetX: 0.01, offsetY: 0.15 },
        propeller: { enabled: false },
        centerPropeller: { enabled: true, bladeColor: '#ffffff', hubColor: '#ff004d', bladeCount: 2, bladeLength: 0.33, bladeWidth: 0.40, hubRadius: 0.09, offsetY: 0.75, zOffset: 0.30, spinSpeed: 20.0 },
        tailBoom: { enabled: false },
        boomFin: { enabled: false },
        landingGear: { enabled: false },
    }),








    /*

        withDefaults({
        key: "plasmagun",
        name: "Starscream", 
       gun: { typeId: 'pulse_blaster', offsetX: 0.4, offsetY: -0.30, scale: 1.0 },    
          fuselage: { color: '#cfffff', tipY: 0.78, shoulderY: 0.39, shoulderWidth: 0.18, waistY: -0.26, waistWidth: 0.15, tailY: -0.52, tailWidth: 0.12, notchY: -0.41 },      
          cockpit: { color: '#e9ff00', topY: 0.62, topWidth: 0.06, midY: 0.11, midWidth: 0.18, bottomY: 0.0, bottomWidth: 0.09, zOffset: 0.05, },                    
          wing: { color: '#ff3355', rootX: 0.17, rootY: 0.40, tipX: 0.79, tipY: -0.25, trailX: 0.76, trailY: -0.45, innerX: 0.14, innerY: -0.24 },      
          wingPanel: { color: '#cfffff' }, 
          wingtip: { color: '#ff3355', width: 0.05, height: 0.5, offsetX: 0.76, offsetY: -0.36, zOffset: 2.00 },         
          decal: { enabled: true, color: '#ff3355', width: 0.10, length: 0.84, offsetX: -0.20, offsetY: 0.00, tiltDeg: 6, zOffset: 2.00 },   
          cockpitGlass: { zOffset: 0.11, color: "#ddfdff", roughness: 0.01, iridescenceIOR: 1.62, iridescenceThicknessMin: 400, iridescenceThicknessMax: 750, attenuationColor: "#ffffff", zOffset: 0.055 },      
          engineIntake: { enabled: true, color: '#ff3355', width: 0.09, height: 0.98, offsetX: 0.22, offsetY: 0.33 },      
          hullVent: { enabled: false },         
          racingStripe: { enabled: false },         
          noseSpike: { color: '#0070ff', length: 0.67, width: 0.29, offsetY: -0.32, roundness: -0.06, zOffset: 0.04 },        
          tailFin: { color: '#0070ff', length: 0.55, width: 0.31, sweep: 0.75, offsetX: 0.11, offsetY: -0.36 },        
          exhaustPort: { enabled: false },         
          propeller: { enabled: false },      
          centerPropeller: { enabled: false },      
          tailBoom: { enabled: true, color: '#0070ff', length: -0.50, baseWidth: 0.17, tipWidth: 0.06 },       
          boomFin: { enabled: true, color: '#005cff', length: 1, width: 0.17, sweep: 0.63, offsetX: 0.49, offsetY: -0.02 },        
        healthBar: { fgColor: "#44ff88" },      
    }), 

        */

    /*
    withDefaults({   
        key: "flamethrowergun",
        name: "A-10 Space Dragon", 
        gun: { typeId: '05_ft', offsetX: 0.20, offsetY: -0.30, scale: 1.0 },
        fuselage: { color: '#ddfdff', tipY: 0.68, shoulderY: 0.16, shoulderWidth: -0.73, waistY: -0.73, waistWidth: 0.13, tailY: -0.42, tailWidth: 0.0, notchY: -2.00 },
        cockpit: { color: '#ffbf00', topY: 0.11, topWidth: 0.11, midY: 0.39, midWidth: 0.16, bottomY: 0.46, bottomWidth: 0.0 },
        wing: { color: '#ff2d2d', rootX: 0.0, rootY: 0.57, tipX: 0.0, tipY: -1.50, trailX: 0.67, trailY: 0.63, innerX: 0.79, innerY: 0.04 },
        wingPanel: { color: '#dfff00', inset: 0.08 },
        wingtip: { color: '#003479', width: 0.11, height: 0.66, offsetX: 0.43, offsetY: -0.04, zOffset: 0.02 },
        decal: { enabled: true, color: '#000000', width: 0.06, length: 0.65, offsetX: 0.34, offsetY: 0.00, tiltDeg: -11 },
        cockpitGlass: { enabled: true, inset: 0.08, zOffset: 0.30, color: "#71f550", roughness: 0.15, thickness: 0.72, ior: 1.00, attenuationColor: "#ffffff" },
        engineIntake: { enabled: true, color: '#00439a', width: 0.11, height: 0.63, offsetX: 0.18, offsetY: 0.39 },
        hullVent: { enabled: true, color: '#dfff00', count: 1, width: 0.28, height: 0.29, spacing: 0.10, offsetX: 0.35, offsetY: 0.24 },
        racingStripe: { enabled: true, color: '#ff2d2d', width: 0.04, length: 0.94, offsetX: 0.30, offsetY: -0.14, tiltDeg: -10 },
        noseSpike: { enabled: true, color: '#ff2d2d', length: 0.37, width: 0.16, offsetY: -0.32, roundness: 0.94, zOffset: 0.04 },
        tailFin: { enabled: true, color: '#3a6bd5', length: 1.00, width: 0.38, sweep: 0.00, offsetX: 0.24, offsetY: -0.22, splayDeg: 0 },
        exhaustPort: { enabled: true, color: '#ff2d2d', width: 0.17, height: 0.46, offsetX: 0.0, offsetY: 0.50 },
        propeller: { enabled: true, bladeColor: '#5f5f5f', hubColor: '#000000', bladeCount: 3, bladeLength: 0.15, bladeWidth: 0.05, hubRadius: 0.03, offsetX: 0.24, offsetY: -1.96, zOffset: 0.30, spinSpeed: 6 },
        centerPropeller: { enabled: true, bladeColor: '#ffffff', hubColor: '#ff004d', bladeCount: 2, bladeLength: 0.33, bladeWidth: 0.40, hubRadius: 0.09, offsetY: 0.75, zOffset: 0.30, spinSpeed: 20.0 },
        tailBoom: { enabled: true, color: '#3a6bd5', length: 0.25, baseWidth: 0.17, tipWidth: 0.06 },
        boomFin: { enabled: true, color: '#03ff00', length: 1.00, width: 0.17, sweep: 0.63, offsetX: 0.42, offsetY: 0.02, splayDeg: 0 },
        landingGear: { enabled: false },
    }),
    */

    withDefaults({
        key: "cryogun",
        name: "The Flying Refrigerator",
        gun: { typeId: '06_cg', offsetX: 0.87, offsetY: -0.5 },
        fuselage: { color: '#cfffff', tipY: 0.18, shoulderY: 0.56, shoulderWidth: 0.44, waistY: -0.85, waistWidth: -0.40, tailY: 0.11, tailWidth: -0.24, notchY: 0.80 },
        cockpit: { color: '#6c00ff', topY: 0.60, topWidth: 0.21, midY: 0.11, midWidth: 0.35, bottomY: 0.23, bottomWidth: 0.20 },
        wing: { color: '#004cd1', rootX: 0.62, rootY: -0.09, tipX: 0.14, tipY: 0.97, trailX: 0.6, trailY: -0.60, innerX: 0.31, innerY: -1.17 },
        wingPanel: { color: '#cfffff' },
        wingtip: { color: '#cfffff', width: -0.05, height: 0, offsetX: 0.66, offsetY: -0.14, zOffset: 2.00 },
        decal: { enabled: true, color: '#004cd1', width: 0.06, length: 0.82, offsetX: 0.34, offsetY: 0.00, zOffset: 2.00 },
        cockpitGlass: { zOffset: 0.11, color: "#ddfdff", roughness: 0.01, iridescenceIOR: 1.62, iridescenceThicknessMin: 400, iridescenceThicknessMax: 750, attenuationColor: "#ffffff" },
        engineIntake: { enabled: true, color: '#000000', width: -0.18, height: 0.83, offsetX: 0.14, offsetY: 0.33 },
        hullVent: { enabled: false, color: '#3a6bd5' },
        racingStripe: { color: '#0049ff', width: 0.11, length: 0.38, offsetX: 0.15, offsetY: -0.60 },
        noseSpike: { color: '#cfffff', length: 0.39, width: 0.56, offsetY: 0.17, roundness: 3.76, zOffset: 0.04 },
        tailFin: { color: '#cfffff', length: 1.05, width: 1.52, sweep: -0.33, offsetX: 0.18, offsetY: 0.15 },
        exhaustPort: { color: '#ffffff', width: -0.02, height: -0.87, offsetX: -0.01, offsetY: -0.15 },
        propeller: { enabled: false },
        centerPropeller: { enabled: false },
        tailBoom: { enabled: true, color: '#cfffff', length: 0.30, baseWidth: 0.42, tipWidth: -0.01 },
        boomFin: { enabled: true, color: '#0031c4', length: 1, width: 0.27, sweep: 0.61, offsetX: 0.41, offsetY: 0.31 },
        healthBar: { fgColor: "#44ff88" },
    }),



]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(BOSSES.map((b, i) => [b.key, i]))