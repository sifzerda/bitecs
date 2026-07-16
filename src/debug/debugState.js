//src/debug/debugState.js

import * as THREE from "three"

export const debugState = {
    previewBossEnabled: false,
    previewBossIndex: 0,

    previewBossPosition: new THREE.Vector3(0, 0, 5),

    previewBossRotation: 0,
    previewBossScale: 3,
}