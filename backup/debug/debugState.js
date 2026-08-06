//src/debug/debugState.js

// Tiny generic pub/sub so plain values can drive React re-renders via
// useSyncExternalStore, without pulling in a state library. Used for any
// debug value that needs to be *reacted to* by components other than the
// one that owns its Leva controls.
function createStore(initial) {
    let value = initial
    const listeners = new Set()
    return {
        get: () => value,
        set: (next) => {
            value = next
            listeners.forEach((listener) => listener())
        },
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}

// Plain mutable bag for values only ever read imperatively inside
// useFrame (no React re-render needed for those reads).
export const debugState = {}

// --- Boss selection (owned by BossBuilder, read by BossBuilder + GunPanel) ---
const bossSelectionStore = createStore({ enabled: false, index: 0 })

export function setPreviewBossSelection(enabled, index) {
    bossSelectionStore.set({ enabled, index })
}
export function subscribePreviewBossSelection(listener) {
    return bossSelectionStore.subscribe(listener)
}
export function getPreviewBossSelection() {
    return bossSelectionStore.get()
}

// --- Live-tuned gun config override (owned by GunPanel's Boss Gun Tuning) ---
const gunConfigOverrideStore = createStore(null)

export function setPreviewGunConfigOverride(config) {
    gunConfigOverrideStore.set(config)
}
export function subscribePreviewGunConfigOverride(listener) {
    return gunConfigOverrideStore.subscribe(listener)
}
export function getPreviewGunConfigOverride() {
    return gunConfigOverrideStore.get()
}