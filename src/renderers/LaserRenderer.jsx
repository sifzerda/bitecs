// src/renderers/LaserRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from "../ecs/constants/world.js"
import { laserState } from '../ecs/weapons/weaponState/laserState.js'
import { bossLaserState } from '../ecs/weapons/weaponState/bossLaserState.js'
import { startState } from '../state/startState.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { bossAIQuery } from '../ecs/constants/queries.js'
import { BossAI } from '../ecs/constants/components.js'

// -------------------------
// -------------------------

function Beam({ slot, source, laser }) {

    const ref = useRef()
    const uniforms = useMemo(() => ({
        time: { value: 0 },
        core: { value: new THREE.Color() },
        glow: { value: new THREE.Color() },
        rainbow: { value: 0 }
    }), [])

    useFrame(() => {

        const mesh = ref.current; if (!mesh) return
        const boss = source === "boss" ? bossAIQuery()[0] : undefined
        const weapon = source === "player" ? getWeapon(startState.currentWeapon) : boss === undefined ? null : getWeapon(BossAI.weapon[boss])

        mesh.visible = !!(weapon && weapon.category === "beam" && !weapon.jagged && laser.active && slot < laser.beamCount && laser.hitT[slot] > 0.01 && startState.encounterPhase === "active")
        if (!mesh.visible) return

        mesh.position.set(laser.originX[slot], laser.originY[slot], 0.02)
        mesh.rotation.z = Math.atan2(laser.dirY[slot], laser.dirX[slot]) - Math.PI / 2
        mesh.scale.set((weapon.beamWidth ?? 0.1) * 5, laser.hitT[slot], 1)

        uniforms.time.value = world.time.elapsed;
        uniforms.core.value.set(weapon.color ?? "white");
        uniforms.glow.value.set(weapon.glowColor ?? "white");
        uniforms.rainbow.value = weapon.rainbow ? 1 : 0
    })

    return (
        <mesh ref={ref} visible={false} frustumCulled={false}>

            <planeGeometry args={[1, 1]} onUpdate={g => {
                if (!g.userData.shifted) {
                    g.translate(0, 0.5, 0);
                    g.userData.shifted = true
                }
            }} />

            <shaderMaterial uniforms={uniforms}
                transparent depthTest={false}
                depthWrite={false}
                toneMapped={false}
                blending={THREE.AdditiveBlending}

                vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
                fragmentShader={`varying vec2 vUv;uniform float time;uniform vec3 core;uniform vec3 glow;uniform float rainbow;void main(){float d=abs(vUv.x-0.5)*2.0;float c=1.0-smoothstep(0.0,0.12,d);float halo=exp(-d*4.0);vec3 tint=glow;if(rainbow>0.5)tint=0.5+0.5*cos(vec3(0.0,2.1,4.2)+vUv.y*8.0-time*2.0);float pulse=0.9+0.1*sin(vUv.y*30.0-time*15.0);float edge=smoothstep(0.0,0.03,vUv.y)*(1.0-smoothstep(0.97,1.0,vUv.y));gl_FragColor=vec4((core*c*1.4+tint*halo*pulse)*edge,(c+halo*0.7)*edge);}`} />

        </mesh>
    )
}

// -------------------------
// Renderer
// -------------------------

export function LaserRenderer({ source = "player" }) {

    const laser = source === "boss" ? bossLaserState : laserState

    return (
        <>
            {Array.from({ length: laser.originX.length }, (_, slot) =>
                <Beam key={slot} slot={slot} source={source} laser={laser}
                />)}
        </>
    )
}
