//src/ecs/systems/bossBehaviorTree.js

const MIN_RANGE = 3.5
const MAX_RANGE = 14

const RETREAT_DURATION = 0.65

const MIN_ORBIT_DURATION = 1.5
const MAX_ORBIT_DURATION = 2.8

export function updateBossBehavior(
  id,
  target,
  BossAI
) {
  if (
    BossAI.state[id] === 1 &&
    BossAI.stateTimer[id] > 0
  ) {
    return
  }

  if (target.distance < MIN_RANGE) {
    BossAI.state[id] = 1
    BossAI.stateTimer[id] = RETREAT_DURATION
    return
  }

  if (target.distance > MAX_RANGE) {
    BossAI.state[id] = 0
    BossAI.stateTimer[id] = 0.25
    return
  }

  if (BossAI.stateTimer[id] > 0) return

  BossAI.state[id] = 2

  if (!BossAI.strafeDirection[id]) {
    BossAI.strafeDirection[id] =
      Math.random() < 0.5 ? -1 : 1
  } else if (Math.random() < 0.3) {
    BossAI.strafeDirection[id] *= -1
  }

  BossAI.stateTimer[id] =
    MIN_ORBIT_DURATION +
    Math.random() *
      (MAX_ORBIT_DURATION - MIN_ORBIT_DURATION)
}