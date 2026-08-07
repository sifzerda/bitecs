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

- [ ] config bullet/missile/beam emission point for bosses and player
- [ ] config exhaust emission point for player and bosses

- [ ] add irridescent cockpit glass, plus moving propellers, plus gun core glow flashing animation

- [x] fix gun rendering for bosses

- [x] switch guns to the gun_svgs (remove glow and add it to be animated as currently is)
- [x] switch boss gun to svgs. boss gun currently not showing
- [ ] create svgs of ships and switch bosses and player with svgs
- [x] create a shipgallery like gungallery but for ships
- [x] see if you can combine gunmout, weaponmount, boss mount, svggun, 

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


 