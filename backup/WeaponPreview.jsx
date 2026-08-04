//src/components/WeaponPreview.jsx

import { Canvas, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { useMemo, useRef } from "react"
import * as THREE from "three"

import { GunRenderer } from "../renderers/GunRenderer"
import { getGunTypeByWeaponId } from "../ecs/weapons/config/gunConfigs"

function PreviewGun({ weaponId }) {

    const group = useRef()
    const platform = useRef()

    const gun = useMemo(
        () => getGunTypeByWeaponId(weaponId),
        [weaponId]
    )

    useFrame((state, delta) => {

        if (group.current) {

            group.current.rotation.y += delta * 0.8

            group.current.rotation.x =
                Math.sin(state.clock.elapsedTime * 0.7) * 0.08

            group.current.position.y =
                Math.sin(state.clock.elapsedTime * 1.6) * 0.05
        }

        if (platform.current) {
            platform.current.rotation.z += delta * 0.25
        }

    })

    return (

        <group ref={group}>

            {/* Display Platform */}

            <mesh
                ref={platform}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.75, 0]}
            >
                <circleGeometry args={[1.4, 64]} />
                <meshStandardMaterial
                    color="#16232b"
                    metalness={0.9}
                    roughness={0.3}
                />
            </mesh>

<GunRenderer
    config={gun.config}
    rotation={[0, Math.PI / 2, 0]}
    scale={thumbnail ? 2.1 : 3.2}
/>

        </group>

    )

}

export function WeaponPreview({
    weaponId,
    thumbnail = false
}) {

    return (

        <Canvas
            camera={{
                position: [0, 0, thumbnail ? 3.5 : 5],
                fov: thumbnail ? 24 : 35
            }}
            dpr={1}
        >

            <ambientLight intensity={1.4} />

            <directionalLight
                position={[4, 5, 6]}
                intensity={3}
            />

            <pointLight
                position={[-4, 3, 5]}
                intensity={2}
            />

            <Environment preset="city" />

            <PreviewGun weaponId={weaponId} />

        </Canvas>

    )

}