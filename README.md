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
- [Three.js](https://threejs.org/)
- [useMemo](https://react.dev/reference/react/useMemo)

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

The author acknowledges and credits those who have contributed to this project.

## License

Distributed under the MIT License. See LICENSE.txt for more information.

## Project Status

This project is incomplete and requires further development.

## Tasks

Priority:
- [x] gameloop difficulty scaling
- [ ] optimize components

Post: 
- [x] exhaust rendering
- [ ] gun types/ bullet types
- [ ] floating health packs, powerups, weapon upgrades
- [ ] collision, damage, death
- [ ] Enhance and Optimize Renderers
- [ ] Enhance HUD vfx
- [ ] Add game screens
- [ ] Score
- [ ] settings, mouse control support/toggling
- [ ] modular ship parts for upgrade and modular gun parts for upgrade



- [ ] general game progression: n asteroid waves, then boss with new gun.
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
particle beam - 
cluster cannon - 
proximity mines - 
prism beam - 
cryo cannon - 

some of these boss dropped weapons, some upgrades 

Arc Gun – Lightning jumps between nearby asteroids.
Particle Beam – Continuous beam that ramps up damage the longer it stays on target.

Ricochet Gun – Bullets bounce off asteroids or screen edges.
Cluster Cannon – Projectile splits into multiple fragments mid-flight.
Proximity Mine Layer – Deploys floating mines.
Grenade Launcher – Arcing explosive rounds.
Prism Beam – Splits into several smaller beams.

Dark Matter Launcher – Leaves damaging clouds.
Nano Swarm – Nanobots chew through asteroids over time.
Cryo Cannon – Freezes asteroids, making them easier to destroy.
Acid Sprayer – Leaves corrosive puddles in space.
Orbital Drones – Satellites orbit the ship and fire automatically.
Pulse Wave – Expanding ring of energy from the ship.



 - [ ] if add bosses, make one kind and swap out guns, probably after gun system
 - [ ] make one kind of boss behaviour and logic, and switch renderer (ship appearance) and gun type
 - [ ] also potentially later boss has satelites that orbit it and help, or shield etc

 - [ ] add in shockwave effect for explosive weapons

 



 - [ ] make boost exhaust a part of normal exhaust rendering i.e. if keyB pressed, 
 boost exhaust is rendered