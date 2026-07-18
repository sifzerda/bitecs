//src/debug/debugState.js

import * as THREE from "three"

const gunOverrideListeners = new Set()

export const debugState = {
    previewBossEnabled: false,
    previewBossIndex: 0,
    previewBossPosition: new THREE.Vector3(0, 0, 5),
    previewBossRotation: 0,
    previewBossScale: 3,

    // Live-tuned gun config (from GunPanel's Gun Tuning controls) applied
    // to whichever boss is shown in the debug preview slot. null when the
    // preview isn't active — real gameplay guns never read this.
    previewGunConfigOverride: null,
}

// Plain-object state can't drive React re-renders on its own, but
// GunRenderer needs a fresh `config` prop to rebuild its geometry when
// tuning sliders change. This tiny pub-sub lets BossShip subscribe via
// useSyncExternalStore without pulling in a state-management library.
export function setPreviewGunConfigOverride(config) {
    debugState.previewGunConfigOverride = config
    gunOverrideListeners.forEach((listener) => listener())
}

export function subscribePreviewGunConfigOverride(listener) {
    gunOverrideListeners.add(listener)
    return () => gunOverrideListeners.delete(listener)
}

export function getPreviewGunConfigOverride() {
    return debugState.previewGunConfigOverride
}