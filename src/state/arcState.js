// src/state/arcState.js
// Transient lightning-arc segments for Arc Gun, written by chainLightning()
// in combatSystem and consumed/faded by ArcRenderer.

export const arcState = {
    arcs: [],   // each: { points: [{x,y}, ...], life: number, maxLife: number }
}

export function pushArc(points, life = 0.18) {
    arcState.arcs.push({ points, life, maxLife: life })
}