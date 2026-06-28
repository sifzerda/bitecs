//src/ecs/components.js
// equivalent of Miniplex queries
const MAX_ENTITIES = 10_000

// Position in world space
export const Position = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
}

// Velocity (units/sec)
export const Velocity = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
}

// Rotation in radians
export const Rotation = new Float32Array(MAX_ENTITIES)

// Health
export const Health = {
  current: new Float32Array(MAX_ENTITIES),
  max:     new Float32Array(MAX_ENTITIES),
}

// Lifetime — entities that expire (bullets, particles)
export const Lifetime = {
  remaining: new Float32Array(MAX_ENTITIES),
}

// Tag components — no data, just membership
// addComponent(world, eid, PlayerTag) marks it as the player
export const PlayerTag  = {}
export const EnemyTag   = {}
export const BulletTag  = {}