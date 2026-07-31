# bitECS Asteroids v4

## Table of Contents

- [Description](#description)
- [Badges](#badges)
- [Visuals](#visuals)
- [Installation](#installation)
- [Tech](#tech)
- [Support](#support)
- [Contributing](#contributing)
- [Authors and Acknowledgment](#authors-and-acknowledgment)
- [License](#license)
- [Project Status](#project-status)
- [Tasks](#tasks) 

## Description

This is a game of asteroids made in React Vite with bitECS library + Three.js.

## Badges

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) 

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white) ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![React Router](https://img.shields.io/badge/React%20Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white) ![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Three.js](https://img.shields.io/badge/Three.js-000000.svg?style=for-the-badge&logo=threedotjs&logoColor=white) ![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white) 

## Visuals

This app has been deployed to Vercel. Visit the site: [bitECS Asteroids](https://...vercel.app/)

![pic1](...)
![pic2](...)
![pic4](...)

## Installation

```bash
npm install
```

## Tech

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [React Router](https://reactrouter.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [ESLint](https://eslint.org/)
- [bitECS](https://github.com/sifzerda/bitecs)
- [Three.js](https://threejs.org/) + [Fiber](https://github.com/pmndrs/fiber) + [Drei](https://github.com/pmndrs/drei) + [Postprocessing](https://github.com/pmndrs/postprocessing) 
- [useMemo](https://react.dev/reference/react/useMemo)
- [Leva](https://github.com/pmndrs/leva): config panel to create ship parts
- [Muscular Hydrostats](https://github.com/soulwire/Muscular-Hydrostats): for tentacles

## Support

For support, users can contact me through my portfolio contact form: [here](https://next-portfolio-sifzerdas-projects.vercel.app/contact)

## Contributing

Any contributions you make are greatly appreciated.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". 
1.	Fork the Project
2.	Create your Feature Branch (git checkout -b feature/NewFeature)
3.	Commit your Changes (git commit -m 'Add some NewFeature')
4.	Push to the Branch (git push origin feature/NewFeature)
5.	Open a Pull Request

## Authors and Acknowledgment

The author acknowledges and credits those who have contributed to this project, including:

- soulwire (Justin Windle) and ArloL (Arlo O'Keeffe) for Muscular Hydrostats

## License

Distributed under the MIT License. See LICENSE.txt for more information.

## Project Status

This project is incomplete and requires further development.

## Config Options

- boss order in bosses.js
- weapon order in weapons.js
- Position of bullet emission and gun flash currently set in spawn.js const MUZZLE_OFFSET = 0.4 
export const GUN_GAP = 0.45 // distance between twin guns

### Make a new gun:

1.  Add the weapon definition
```bash
src/weapons/config/weapons.js
{
    name: "railgun",
    category: "bullet",
    damage: 40, maxBullets: 64, hitRadius: 0.4, fireRate: 0.6,
    speed: 30, lifetime: 1.5, projectileCount: 1, spreadAngle: 0,
    color: "#e8f0ff", glowColor: "#8899ff", haloColor: "#4455cc",
},
```
2. Add gun's visual mount config
```bash
src/weapons/config/gunConfigs.js
{
    id: '11_railgun', name: 'Railgun', weaponId: WEAPON_BY_NAME.railgun.id,
    overrides: { /* frame/barrel/muzzle/coreGlow tweaks */ },
},
```
3. And optionally: add a weaponAction entry for new weapon actions:

```bash
src/weapons/config/weaponActions.js
```
4. Optionally: add a new weapon effect on hit
```bash
src/weapons/weaponSystems/hitTraits.js
```
5. Optionally: add a new renderer and/or system if the projectiles look/act different from current
6. Add gun to boss in bosses.js

### Game Over, 3 lives lost:

Inside combat.js at end of file lives = 0

## Tasks

- [ ] optimize starfield renderer
- [ ] bomb weapons lost trail

OPTIMIZE RENDERERS:
- [x] ArcRenderer
- [x] BulletRenderer
- [x] DeflectRenderer
- [x] TrailRenderer 
- [x] effectPool
- [x] all Emitter files
- [x] SmokeRenderer
- [x] SparkRenderer
- [x] ShockwaveRenderer
- [x] ExplosionRenderer
- [x] DebrisRenderer
- [x] FlashRenderer

~~- [ ] reduce gun related renderers: weaponmount, gunmount, gunrenderer, bossmount~~
- [ ] consolidate fx and renderers: debris, exhaust, explosion, fire, flash, shockwave, spark, trail
- [x] re-do/update pools

Priority:
- [x] gameloop difficulty scaling
- [ ] optimize components

Post: 
- [x] exhaust rendering
- [x] gun types/ bullet types
- [ ] floating health packs, powerups, weapon upgrades
- [ ] collision, damage, death
- [ ] Enhance and Optimize Renderers
- [ ] Enhance HUD vfx
- [x] Add game screens
- [ ] Score
- [x] settings, mouse control support/toggling
- [x] modular ship parts for upgrade and modular gun parts for upgrade
- [x] general game progression: n asteroid waves, then boss with new gun.
Defeating boss drops/awards gun. Gun can be applied. N1 asteroid wave and next boss with new gun etc.

//////

Shot gun - space cowboy
Machine gun - Military ship
Charge gun - 
acid sprayer - insectoid boss
flamethrower - 
homing missiles - 
laser - 
plasma gun - 

Arc gun electric - 
prism beam - 
cryo cannon - 

some of these boss dropped weapons, some upgrades 

 - [x] if add bosses, make one kind and swap out guns, probably after gun system
 - [ ] make one kind of boss behaviour and logic, and switch renderer (ship appearance) and gun type
 ~~- [ ] also potentially later boss has satelites that orbit it and help, or shield etc~~
 - [x] add in shockwave effect for explosive weapons
 - [x] make boost exhaust a part of normal exhaust rendering i.e. if keyB pressed, 
 boost exhaust is rendered
 - [x] Adapt missile and lasersystem for boss use: missiles dont target player and need to not hurt boss, and laser needs to be held down not fired (boss never fires it)
- [x] change boss renderer to make enemy ship/ufo
- [x] add a leva menu to configure guns which can be applied to the ship and bosses
- [x] make each gun, it will look the same for boss as player


 -  Verlet mesh, chain etc physics, or engine

 ~~## Move effects into GPU particle system API:~~

 - [x] sparks
 - [x] exhaust
 - [x] explosion on entity destruction
    - explosion rendering needs improving
 - [x] debris (asteroid, player, boss) debris upon destruction
 - [x] smoke 

 - [ ] bullets (?)
 - [x] fire
 - [x] flash (or glow)


- [x] add pool for sparks, exhaust, etc

- [x] trailrenderer needs to replace smoke in missile renderer


dragon/flamethrower boss SHAPES:

//////////////////////


iridescence

player overrides: {
  "general": {
    "extrudeDepth": 0.03
  },
  "fuselage": {
    "color": "#cfe8ff",
    "tipY": 0.78,
    "shoulderY": 0.5,
    "shoulderWidth": 0.18,
    "waistY": -0.26,
    "waistWidth": 0.14,
    "tailY": -0.55,
    "tailWidth": 0.3,
    "notchY": -0.37,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "cockpit": {
    "color": "#0070ff",
    "topY": 0.62,
    "topWidth": 0.06,
    "midY": 0.14,
    "midWidth": 0.15,
    "bottomY": 0.04,
    "bottomWidth": 0.09
  },
  "wing": {
    "color": "#cfe8ff",
    "rootX": 0.2,
    "rootY": 0.4,
    "tipX": 0.79,
    "tipY": -0.25,
    "trailX": 0.76,
    "trailY": -0.45,
    "innerX": 0.14,
    "innerY": -0.24,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "wingPanel": {
    "color": "#dff1ff",
    "inset": 0.08,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "wingtip": {
    "color": "#00ff10",
    "width": 0.04,
    "height": 0.43,
    "offsetX": 0.77,
    "offsetY": -0.35,
    "zOffset": 0.02
  },
  "horn": {
    "enabled": false,
    "color": "#ffe605",
    "baseWidth": 0.09,
    "length": 0.82,
    "curveAmount": 0.18,
    "offsetX": 0.13,
    "offsetY": 0.07,
    "sweepDeg": 25,
    "tiltDeg": 8
  },
  "decal": {
    "enabled": true,
    "color": "#00ff10",
    "width": 0.06,
    "length": 0.65,
    "offsetX": 0.3,
    "offsetY": 0,
    "tiltDeg": 0,
    "zOffset": 0.041
  },
  "cockpitGlass": {
    "enabled": true,
    "inset": 0.08,
    "zOffset": 0.05,
    "color": "#ddfdff",
    "metalness": 0,
    "roughness": 0.015,
    "transmission": 1,
    "thickness": 0.75,
    "ior": 1.52,
    "clearcoat": 1,
    "clearcoatRoughness": 0,
    "envMapIntensity": 8,
    "iridescence": 10,
    "iridescenceIOR": 1.35,
    "iridescenceThicknessMin": 180,
    "iridescenceThicknessMax": 900,
    "attenuationColor": "#006eff",
    "attenuationDistance": 2.2
  },
  "engineIntake": {
    "enabled": true,
    "color": "#00b9ff",
    "width": 0.09,
    "height": 0.3,
    "offsetX": 0.4,
    "offsetY": -0.28
  },
  "hullVent": {
    "enabled": true,
    "color": "#2030ff",
    "count": 8,
    "width": 0.09,
    "height": 0.03,
    "spacing": 0.05,
    "offsetX": 0.21,
    "offsetY": -0.08
  },
  "racingStripe": {
    "enabled": true,
    "color": "#00ff10",
    "width": 0.04,
    "length": 0.94,
    "offsetX": 0.3,
    "offsetY": -0.14,
    "tiltDeg": 0
  },
  "noseSpike": {
    "enabled": true,
    "color": "#00ff10",
    "length": 0.26,
    "width": 0.07,
    "offsetY": -0.32,
    "roundness": 0.94,
    "zOffset": 0.04
  },
  "tailFin": {
    "enabled": true,
    "color": "#7cfff4",
    "length": 0.25,
    "width": 0.35,
    "sweep": 0.5,
    "offsetX": 0.14,
    "offsetY": -0.33,
    "splayDeg": 0,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "exhaustPort": {
    "enabled": true,
    "color": "#0070ff",
    "width": 0.22,
    "height": 0.14,
    "offsetX": 0.01,
    "offsetY": 0.15
  },
  "propeller": {
    "enabled": false,
    "bladeColor": "#5f5f5f",
    "hubColor": "#000000",
    "bladeCount": 3,
    "bladeLength": 0.15,
    "bladeWidth": 0.05,
    "hubRadius": 0.03,
    "offsetX": 0.24,
    "offsetY": -1.96,
    "zOffset": 0.3,
    "spinSpeed": 6
  },
  "centerPropeller": {
    "enabled": false,
    "bladeColor": "#ffffff",
    "hubColor": "#ff004d",
    "bladeCount": 2,
    "bladeLength": 0.33,
    "bladeWidth": 0.4,
    "hubRadius": 0.09,
    "offsetY": 0.75,
    "zOffset": 0.3,
    "spinSpeed": 20
  },
  "tailBoom": {
    "enabled": false,
    "color": "#3a6bd5",
    "length": 0.25,
    "baseWidth": 0.17,
    "tipWidth": 0.06,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "boomFin": {
    "enabled": false,
    "color": "#03ff00",
    "length": 1,
    "width": 0.17,
    "sweep": 0.63,
    "offsetX": 0.42,
    "offsetY": 0.02,
    "splayDeg": 0,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "landingGear": {
    "enabled": false,
    "legColor": "#000000",
    "wheelColor": "#ff0000",
    "legLength": 0.28,
    "legWidth": 0.09,
    "wheelRadius": 0.06,
    "offsetX": 0,
    "offsetY": 0.48,
    "zOffset": 0.04
  },
  "hullTexture": {
    "enabled": false,
    "textureKey": "Light Wool",
    "opacity": 1,
    "repeatX": 1,
    "repeatY": 1
  }
}





LASER UFO BOSS

randogun overrides: {
  "general": {
    "extrudeDepth": 0.03
  },
  "fuselage": {
    "color": "#000000",
    "tipY": 0.68,
    "shoulderY": -0.43999999999999995,
    "shoulderWidth": -0.51,
    "waistY": -0.24,
    "waistWidth": -0.245,
    "tailY": -0.495,
    "tailWidth": 0,
    "notchY": 0,
    "emissive": "#00ffec",
    "emissiveIntensity": -2,
    "metalness": 2,
    "roughness": -2,
    "clearcoat": 20,
    "clearcoatRoughness": -2,
    "iridescence": 20,
    "iridescenceIOR": 0.8150000000000001,
    "iridescenceThicknessMin": 164,
    "iridescenceThicknessMax": 206,
    "envMapIntensity": 3
  },
  "cockpit": {
    "color": "#00fccd",
    "topY": -0.41,
    "topWidth": 0.11,
    "midY": -0.36,
    "midWidth": 0.16,
    "bottomY": 0.27,
    "bottomWidth": 0
  },
  "wing": {
    "color": "#ff2e7c",
    "rootX": 0,
    "rootY": 0.615,
    "tipX": 1,
    "tipY": -0.3,
    "trailX": 0.11,
    "trailY": -1.2,
    "innerX": 0.14,
    "innerY": -0.24,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "wingPanel": {
    "color": "#000000",
    "inset": 0.08,
    "emissive": "#00ff2d",
    "emissiveIntensity": 0,
    "metalness": 2,
    "roughness": -2,
    "clearcoat": 20,
    "clearcoatRoughness": -2,
    "iridescence": 20,
    "iridescenceIOR": 0.7150000000000001,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 72,
    "envMapIntensity": 1
  },
  "wingtip": {
    "color": "#d600ff",
    "width": 0.635,
    "height": 0.66,
    "offsetX": 2,
    "offsetY": -0.04,
    "zOffset": 0.02
  },
  "horn": {
    "enabled": true,
    "color": "#16ff00",
    "baseWidth": -0.59,
    "length": 0.64,
    "curveAmount": 0.105,
    "offsetX": 0.13,
    "offsetY": -0.08,
    "sweepDeg": 35,
    "tiltDeg": 8,
    "sweepAmount": 35
  },
  "decal": {
    "enabled": true,
    "color": "#000e69",
    "width": 0.6599999999999999,
    "length": 0.65,
    "offsetX": 0.35500000000000004,
    "offsetY": 0,
    "tiltDeg": 0,
    "zOffset": 0.041
  },
  "cockpitGlass": {
    "enabled": true,
    "inset": 0.08,
    "zOffset": 0.3,
    "color": "#00ff23",
    "metalness": 1,
    "roughness": -2,
    "transmission": 1,
    "thickness": 0.72,
    "ior": 1,
    "clearcoat": 1,
    "clearcoatRoughness": 0,
    "envMapIntensity": 8,
    "iridescence": 10,
    "iridescenceIOR": 1.35,
    "iridescenceThicknessMin": 180,
    "iridescenceThicknessMax": 900,
    "attenuationColor": "#ffffff",
    "attenuationDistance": 2.2
  },
  "engineIntake": {
    "enabled": true,
    "color": "#00449d",
    "width": 0.11,
    "height": 0.675,
    "offsetX": 0.255,
    "offsetY": -0.36
  },
  "hullVent": {
    "enabled": true,
    "color": "#0066ff",
    "count": 11,
    "width": 0.615,
    "height": -0.020000000000000018,
    "spacing": -0.04999999999999999,
    "offsetX": 0.39499999999999996,
    "offsetY": -0.43500000000000005
  },
  "racingStripe": {
    "enabled": true,
    "color": "#d5ff2e",
    "width": 0.04,
    "length": 0.73,
    "offsetX": 0.425,
    "offsetY": -0.325,
    "tiltDeg": 0
  },
  "noseSpike": {
    "enabled": true,
    "color": "#ff2d2d",
    "length": 0.855,
    "width": 1.3199999999999998,
    "offsetY": -1.37,
    "roundness": 0.09499999999999997,
    "zOffset": -2
  },
  "tailFin": {
    "enabled": true,
    "color": "#ff2d2d",
    "length": 2,
    "width": -0.21999999999999997,
    "sweep": 0,
    "offsetX": 0.685,
    "offsetY": 0.23,
    "splayDeg": 0,
    "emissive": "#1a3a5c",
    "emissiveIntensity": 0.4,
    "metalness": 0.2,
    "roughness": 0.5,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "exhaustPort": {
    "enabled": false,
    "color": "#ff2d2d",
    "width": 0.28,
    "height": -0.21000000000000002,
    "offsetX": 7,
    "offsetY": 0.5
  },
  "propeller": {
    "enabled": false,
    "bladeColor": "#5f5f5f",
    "hubColor": "#000000",
    "bladeCount": 3,
    "bladeLength": 0.15,
    "bladeWidth": 0.05,
    "hubRadius": 0.03,
    "offsetX": 0.24,
    "offsetY": -1.96,
    "zOffset": 0.3,
    "spinSpeed": 6
  },
  "centerPropeller": {
    "enabled": false,
    "bladeColor": "#ffffff",
    "hubColor": "#ff004d",
    "bladeCount": 2,
    "bladeLength": 0.33,
    "bladeWidth": 0.4,
    "hubRadius": 0.09,
    "offsetY": 0.75,
    "zOffset": 0.3,
    "spinSpeed": 20
  },
  "tailBoom": {
    "enabled": true,
    "color": "#3a6bd5",
    "length": -0.08500000000000002,
    "baseWidth": 0.17,
    "tipWidth": 0.06,
    "emissive": "#003876",
    "emissiveIntensity": 0.4,
    "metalness": 2,
    "roughness": -2,
    "clearcoat": 0,
    "clearcoatRoughness": 0.1,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 100,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "boomFin": {
    "enabled": true,
    "color": "#1a3a5c",
    "length": 2,
    "width": 0.545,
    "sweep": 0.675,
    "offsetX": 0.72,
    "offsetY": 0.47000000000000003,
    "splayDeg": 0,
    "emissive": "#00ff23",
    "emissiveIntensity": 0.065,
    "metalness": 0.655,
    "roughness": -2,
    "clearcoat": 0,
    "clearcoatRoughness": 0.36,
    "iridescence": 0,
    "iridescenceIOR": 1.3,
    "iridescenceThicknessMin": 164,
    "iridescenceThicknessMax": 400,
    "envMapIntensity": 1
  },
  "landingGear": {
    "enabled": false,
    "legColor": "#000000",
    "wheelColor": "#ff0000",
    "legLength": 0.28,
    "legWidth": 0.09,
    "wheelRadius": 0.06,
    "offsetX": 0,
    "offsetY": 0.48,
    "zOffset": 0.04
  },
  "hullTexture": {
    "enabled": false,
    "textureKey": "Light Wool",
    "opacity": 1,
    "repeatX": 1,
    "repeatY": 1
  }
}



Lasergun :

08_lasergun overrides: {
  "frame": {
    "color": "#000000",
    "length": 1.0899999999999999,
    "height": 0.125,
    "offsetX": 0,
    "offsetY": 0
  },
  "barrel": {
    "color": "#4d5580",
    "length": 0.6,
    "width": 0.06,
    "offsetX": 0.98,
    "offsetY": 0
  },
  "canister": {
    "enabled": false,
    "color": "#cfe8ff",
    "length": 0.24,
    "width": 0.2,
    "offsetX": 0.6,
    "offsetY": 0,
    "transmission": 0
  },
  "muzzle": {
    "offsetX": 0,
    "offsetY": 0
  },
  "mountBracket": {
    "color": "#000000",
    "length": 0.21,
    "width": 0.23
  },
  "mount": {
    "offsetX": 0.45,
    "offsetY": -0.05
  },
  "coreGlow": {
    "color": "#00ff5e",
    "intensity": 3,
    "offsetX": 1.32,
    "offsetY": 0.01
  },
  "accentStripe": {
    "color": "#44ff88"
  }
}