// src/ecs/constants/bosses.js

// ============================================================
// Boss roster
// ============================================================
//

export const BOSSES = [
    {
        key: "shotgun",
        name: "Space Cowboy",
        gun: { typeId: "01_shotgun" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.06,
            width: 0.06,
            height: 0.1,
            lensColor: '#CCCCFF',
        },
        propellers: [],

        emission: {
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            projectile: { offsetX: 0, offsetY: 1.0, gunGap: 0.45 },
            beam: { offsetX: 0, offsetY: 0.65, },
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "machinegun",
        name: "Rambo The Space Copter",
        gun: { typeId: "02_machinegun" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.15,
            width: 0.09,
            height: 0.13,
            lensColor: '#4169E1',
        },
        propellers: [
            { mountKey: 'left', offsetX: 0.08, offsetY: -0.653, radius: 0.05, bladeCount: 3, bladeColor: '#2A3439', hubColor: '#000000', spinSpeed: 6, direction: 1, hubScale: 0.7 },
            { mountKey: 'right', offsetX: -0.08, offsetY: -0.653, radius: 0.05, bladeCount: 3, bladeColor: '#2A3439', hubColor: '#000000', spinSpeed: 6, direction: -1, hubScale: 0.7 },
            { mountKey: 'main', offsetX: 0, offsetY: -0.09, radius: 0.2, bladeCount: 4, bladeColor: '#2A3439', hubColor: '#000000', spinSpeed: 4, direction: 1, hubScale: 0.5 },
        ],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "cryogun",
        name: "The Flying Refrigerator",
        gun: { typeId: "03_cryogun" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.14,
            width: 0.11,
            height: 0.1,
            lensColor: '#8ecbff',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "grenadegun",
        name: "War Machine",
        gun: { typeId: "04_grenadelauncher" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.55,
            width: 0.06,
            height: 0.13,
            lensColor: '#5aa9ff',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "acidthrowergun",
        name: "Space Tractor",
        gun: { typeId: "05_acidthrower" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.1,
            width: 0.05,
            height: 0.06,
            lensColor: '#5aa9ff',
        },
        propellers: [
            {
                mountKey: 'nose',
                offsetX: 0,
                offsetY: 0.3,
                radius: 0.07,
                bladeColor: '#FFFFFF',
                spinSpeed: 22,
                sideways: false,
            },
        ],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "missilegun",
        name: "Rogue Mars Missiler",
        gun: { typeId: "06_missilelauncher" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.1,
            width: 0.06,
            height: 0.09,
            lensColor: '#ff8a5a',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "flamethrowergun",
        name: "X-10 Space Dragon",
        gun: { typeId: "07_flamethrower" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.04,
            width: 0.07,
            height: 0.13,
            lensColor: '#ff3355',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "lasergun",
        name: "UFO",
        gun: { typeId: "08_lasergun" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: -0.05,
            width: 0.13,
            height: 0.14,
            lensColor: '#44ff88',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "arcgun",
        name: "Electric SpaceProbe",
        gun: { typeId: "09_arcgun" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: -0.03,
            width: 0.06,
            height: 0.1,
            lensColor: '#005eff',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

    {
        key: "plasmagun",
        name: "Starscream",
        gun: { typeId: "10_plasmagun" },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.05,
            width: 0.08,
            height: 0.10,
            lensColor: '#e9ff5a',
        },
        propellers: [],

        emission: {
            // Where exhaust particles originate
            exhaust: { offsetX: 0, offsetY: -0.65, engineGap: 0.15, nozzleOffset: 0, },
            // Bullet + missile muzzle
            projectile: { offsetX: 0, offsetY: 0.65, gunGap: 0.45 },
            // Beam origin
            beam: { offsetX: 0, offsetY: 0.65, },
            // Flamethrower / acid / cryo origin
            thrower: { offsetX: 0, offsetY: 0.65, },
        },

    },

]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(
    BOSSES.map((boss, index) => [boss.key, index])
)