// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem.js"
import { movementSystem } from "../ecs/systems/movement.js"
import { collisionSystem } from "../ecs/systems/collisionSystem.js"
import { boundsSystem } from "../ecs/systems/bounds.js"
import { combatSystem } from "../ecs/systems/combat.js"
import { waveSystem } from "../ecs/systems/waveSystem.js"
import { trailSystem } from "../ecs/systems/trailSystem.js"
import { invulnerabilitySystem } from "../ecs/systems/invulnerabilitySystem.js"
import { laserSystem } from "../ecs/weapons/weaponSystems/laserSystem.js"
import { missileSystem } from "../ecs/weapons/weaponSystems/missileSystem.js"
import { throwerSystem } from "../ecs/weapons/weaponSystems/throwerSystem.js"
import { updateArcs } from "../ecs/weapons/weaponState/arcState.js"
import { statusEffectSystem } from "../ecs/systems/statusEffectSystem.js"
import { bossAISystem } from "../ecs/systems/bossAISystem.js"
import { bossLaserSystem } from "../ecs/weapons/weaponSystems/bossLaserSystem.js"
import { bossThrowerSystem } from "../ecs/weapons/weaponSystems/bossThrowerSystem.js"
import { exhaustEmitter } from "../fx/gpu/exhaustEmitter.js"
import { updateEffects } from "../fx/index.js"
import { clearSpatialGrids, insertAsteroid, insertBoss } from "../ecs/constants/spatialGrid.js"
import { activeAsteroids } from "../ecs/pools/asteroidPool.js"
import { bossQuery } from "../ecs/constants/queries.js"
import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { startState } from "./startState.js"
import { encounterSystem } from "../ecs/systems/encounterSystem.js"
import { resetWeaponVisuals } from "./resetWeaponVisuals.js"

function playing(){const s=useGameStore.getState();return s.screen===SCREEN.PLAY&&!s.paused}
function fighting(){return playing()&&startState.encounterPhase==="active"}
function grid(){clearSpatialGrids();for(const id of activeAsteroids)insertAsteroid(id);for(const id of bossQuery())insertBoss(id)}
function effects(dt){trailSystem();updateArcs(dt);exhaustEmitter();updateEffects(dt)}
export function gameLoop(shootState,dt){
 if(!playing())return
 waveSystem()
 if(startState.encounterPhase==="clearing"){
  resetWeaponVisuals();movementSystem();boundsSystem();effects(dt);encounterSystem(dt);return
 }
 if(!fighting())return
 invulnerabilitySystem();playerControlSystem(shootState)
 bossAISystem();bossLaserSystem();if(!fighting())return
 bossThrowerSystem();if(!fighting())return
 // Homing must see a current grid, not targets killed last tick.
 grid();missileSystem();movementSystem();collisionSystem()
 if(!fighting())return
 boundsSystem();grid();combatSystem()
 if(fighting())laserSystem()
 if(fighting())throwerSystem()
 if(fighting())statusEffectSystem()
 if(playing())effects(dt)
}
