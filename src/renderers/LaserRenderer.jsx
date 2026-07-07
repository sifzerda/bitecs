// src/renderers/LaserRenderer.jsx

import { useMemo, useRef } from 'react'
import { createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../state/laserState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const MAX_BEAMS = 3   // matches the highest beamCount across all beam weapons (prism beam)

const _core = new THREE.Color()
const _glow = new THREE.Color()
const _halo = new THREE.Color()

export function LaserRenderer() {

    // one shader-driven quad per possible simultaneous beam slot
    const beamRefs = useRef(
        Array.from({ length: MAX_BEAMS }, () => createRef())
    )

    // unit quad — x spans the beam's cross-section (-0.5..0.5), y spans its length (0..1)
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)
        geo.translate(0, 0.5, 0) // pivot at the beam's origin end, not its center
        return geo
    }, [])

    const materials = useMemo(() => (
        Array.from({ length: MAX_BEAMS }, () => new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            toneMapped: false,

            uniforms: {
                uTime: { value: 0 },
                uCore: { value: new THREE.Color('#ffffff') },
                uGlow: { value: new THREE.Color('#ffffff') },
                uHalo: { value: new THREE.Color('#ffffff') },
                uLength: { value: 1 },
            },

            vertexShader: /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

            fragmentShader: /* glsl */`
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec3 uCore;
uniform vec3 uGlow;
uniform vec3 uHalo;
uniform float uLength;

void main(){

    // cross-section falloff: tight bright core, mid glow, wide soft halo
    float w = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges

    float core = 1.0 - smoothstep(0.0, 0.10, w);
    float glow = exp(-w * 4.0);
    float halo = exp(-w * 1.6);

    // energy scrolling along the beam's length, gives it a "flowing power" look
    float scroll = fract(vUv.y * 6.0 - uTime * 3.0);
    float streak = smoothstep(0.0, 0.5, scroll) * smoothstep(1.0, 0.5, scroll);
    float energy = 0.75 + 0.25 * streak;

    // fast subtle flicker so the beam feels alive, not static
    float flicker = 0.92 + 0.08 * sin(uTime * 60.0 + vUv.y * 40.0);

    vec3 color =
          uCore * core * 1.4
        + uGlow * glow * 0.85 * energy
        + uHalo * halo * 0.35;

    color *= flicker;

    float alpha = clamp(core * 1.0 + glow * 0.8 + halo * 0.4, 0.0, 1.0);

    // fade the very tip so the beam end doesn't hard-cut
    alpha *= smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.97, vUv.y);

    gl_FragColor = vec4(color, alpha);
}
`
        }))
    ), [])

    useFrame((state) => {

        const t = state.clock.elapsedTime
        const weapon = getWeapon(gameState.currentWeapon)
        const isBeamWeapon = weapon.category === "beam"
        const active = isBeamWeapon && laserState.active && laserState.hits && laserState.hits.length > 0

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const mesh = beamRefs.current[slot].current
            if (!mesh) continue

            const material = materials[slot]
            material.uniforms.uTime.value = t

            const hitData = active ? laserState.hits[slot] : null
            const visible = !!hitData && hitData.hitT > 0.01

            mesh.visible = visible
            if (!visible) continue

            const dirX = hitData.dirX
            const dirY = hitData.dirY
            const length = hitData.hitT

            const angle = Math.atan2(dirY, dirX) - Math.PI / 2   // align quad's Y axis with beam direction
            const width = weapon.beamWidth * 5.0   // wide enough to contain core+glow+halo falloff

            mesh.position.set(laserState.originX, laserState.originY, 0.02)
            mesh.rotation.set(0, 0, angle)
            mesh.scale.set(width, length, 1)

            material.uniforms.uLength.value = length
            material.uniforms.uCore.value.set(weapon.color)
            material.uniforms.uGlow.value.set(weapon.glowColor)
            material.uniforms.uHalo.value.set(weapon.haloColor)
        }

    })

    return (
        <>
            {beamRefs.current.map((ref, i) => (
                <mesh
                    key={i}
                    ref={ref}
                    geometry={geometry}
                    material={materials[i]}
                    frustumCulled={false}
                />
            ))}
        </>
    )
}