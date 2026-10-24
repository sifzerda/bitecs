// src/renderers/GrenadeRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { activeBullets } from '../ecs/pools/bulletPool.js'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { getWeapon } from "../ecs/weapons/config/weapons.js"
import { world } from "../ecs/constants/world.js"

const CAPACITY = 2000

export function GrenadeRenderer() {

    const ref = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])

    useFrame(() => {

        const mesh = ref.current; if (!mesh) return
        let count = 0

        for (const id of activeBullets) {

            const weapon = getWeapon(Bullet.type[id]);
            if (
                !(weapon?.explosive && !weapon.homing)
            )
                continue

            dummy.position.set(Position.x[id], Position.y[id], 0)
            dummy.rotation.set(0, 0, world.time.elapsed * 6 + id * 2.399963)
            dummy.updateMatrix();
            mesh.setMatrixAt(count++, dummy.matrix)

            if (count === CAPACITY) break
        }
        mesh.count = count; if (count) mesh.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={ref} args={[null, null, CAPACITY]} count={0} frustumCulled={false}>
            <icosahedronGeometry args={[0.16, 1]} />
            <meshStandardMaterial color="#3a4650" metalness={0.6} roughness={0.4} emissive="#ff6600" emissiveIntensity={0.25} />
        </instancedMesh>
    )
}
