// src/ecs/constants/bosses.js

// ============================================================
// Boss roster
// ============================================================
//

export const BOSSES = [
    {
        key: "shotgun",
        name: "Space Cowboy",
        gun: {
            typeId: "01_shotgun",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.28,
            width: 0.34,
            height: 0.42,
            lensColor: '#ff5577',
        },
        propellers: [],
    },

    {
        key: "machinegun",
        name: "Rambo The Space Copter",
        gun: {
            typeId: "02_machinegun",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.30,
            width: 0.10,
            height: 0.10,
            lensColor: '#7cffb0',
        },
        // Helicopter-flavored boss — two wing-mounted rotors + one main
        // rotor up top, matching the "Space Copter" theme.
        propellers: [
            {
                mountKey: 'left',
                offsetX: -0.45,
                offsetY: -0.55,
                radius: 0.22,
                bladeCount: 3,
                bladeColor: '#454B1B',
                hubColor: '#111111',
                spinSpeed: 14,
                direction: 1,
            },
            {
                mountKey: 'right',
                offsetX: 0.45,
                offsetY: -0.55,
                radius: 0.22,
                bladeCount: 3,
                bladeColor: '#454B1B',
                hubColor: '#111111',
                spinSpeed: 14,
                direction: -1,
            },
            {
                mountKey: 'main-rotor',
                offsetX: 0,
                offsetY: 0.65,
                radius: 0.34,
                bladeCount: 4,
                bladeColor: '#454B1B',
                hubColor: '#000000',
                spinSpeed: 9,
                direction: 1,
            },
        ],
    },

    {
        key: "cryogun",
        name: "The Flying Refrigerator",
        gun: {
            typeId: "03_cryogun",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.25,
            width: 0.36,
            height: 0.44,
            lensColor: '#8ecbff',
        },
        propellers: [],
    },

    {
        key: "grenadegun",
        name: "War Machine",
        gun: {
            typeId: "04_grenadelauncher",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.30,
            width: 0.30,
            height: 0.38,
            lensColor: '#5aa9ff',
        },
        propellers: [],
    },

    {
        key: "acidthrowergun",
        name: "Space Tractor",
        gun: {
            typeId: "05_acidthrower",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.26,
            width: 0.32,
            height: 0.40,
            lensColor: '#c6ff4d',
        },
        propellers: [
    {
        mountKey: 'nose',
        offsetX: 0,
        offsetY: 0.42,      // toward the ship's nose (positive = forward, per our y-flip convention)
        radius: 0.16,
        bladeColor: '#dfff00',
        spinSpeed: 22,
        sideways: true,     // nose-mounted — renders as a blur streak, not a blade fan
    },
],
    },

    {
        key: "missilegun",
        name: "Rogue Mars Missiler",
        gun: {
            typeId: "06_missilelauncher",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.32,
            width: 0.30,
            height: 0.38,
            lensColor: '#ff8a5a',
        },
        propellers: [],
    },

    {
        key: "flamethrowergun",
        name: "X-10 Space Dragon",
        gun: {
            typeId: "07_flamethrower",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.28,
            width: 0.32,
            height: 0.40,
            lensColor: '#ff5a1a',
        },
        propellers: [],
    },

    {
        key: "lasergun",
        name: "UFO",
        gun: {
            typeId: "08_lasergun",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: -0.05,
            width: 0.40,
            height: 0.34,
            lensColor: '#44ff88',
        },
        propellers: [],
    },

    {
        key: "arcgun",
        name: "Electric SpaceProbe",
        gun: {
            typeId: "09_arcgun",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: -0.10,
            width: 0.34,
            height: 0.36,
            lensColor: '#7fe0ff',
        },
        propellers: [],
    },

    {
        key: "plasmagun",
        name: "Starscream",
        gun: {
            typeId: "10_plasmagun",
        },
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.20,
            width: 0.32,
            height: 0.40,
            lensColor: '#e9ff5a',
        },
        propellers: [],
    },

]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(
    BOSSES.map((boss, index) => [boss.key, index])
)