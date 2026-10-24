// src/renderers/MissileRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { activeBullets } from '../ecs/pools/bulletPool.js'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { world } from "../ecs/constants/world.js"

const CAPACITY = 2000

export function MissileRenderer() {

    const ref = useRef(), dummy = useMemo(() => new THREE.Object3D(), [])

    useFrame(() => {
    
        const mesh = ref.current; if (!mesh) return
        let count = 0
      
        for (const id of activeBullets) {
            
            const weapon = getWeapon(Bullet.type[id]); 
            if (!(weapon?.homing)) continue
           
            dummy.position.set(Position.x[id], Position.y[id], 0)
            dummy.rotation.set(0, 0, Math.atan2(Velocity.y[id], Velocity.x[id]) - Math.PI / 2)
            dummy.updateMatrix(); mesh.setMatrixAt(count++, dummy.matrix)

            if (count === CAPACITY) break
      
        }
        mesh.count = count; if (count) mesh.instanceMatrix.needsUpdate = true
    })

    return (

        <instancedMesh ref={ref} args={[null, null, CAPACITY]} count={0} frustumCulled={false}>
            <capsuleGeometry args={[0.13, 0.7, 2, 6]} />
            <meshBasicMaterial color="#ffaa00" />
        </instancedMesh>

    )
}