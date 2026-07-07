//src/renderers/BulletRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bulletQuery } from '../ecs/constants/queries.js'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { WEAPONS } from '../ecs/constants/weapons.js'

const MAX_BULLETS = 512
const BULLET_LENGTH = 0.9
const BULLET_WIDTH = 0.18
const tempColor = new THREE.Color()

export function BulletRenderer() {

    const meshRef = useRef()
    const geometry = useMemo(() => {

        const geo = new THREE.InstancedBufferGeometry()
        // base quad
        const plane = new THREE.PlaneGeometry(1, 1)
        geo.setIndex(plane.index)
        geo.setAttribute('position', plane.getAttribute('position'))
        geo.setAttribute('uv', plane.getAttribute('uv'))
        geo.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 2), 2))
        geo.setAttribute("instanceAngle", new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS), 1))
        geo.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 3), 3))
        geo.setAttribute("instanceVisible", new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS), 1))

        geo.instanceCount = MAX_BULLETS
        return geo

    }, [])

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.FrontSide,
            toneMapped: false,
            depthTest: false,
            uniforms: { uTime: { value: 0 } },

            vertexShader: /* glsl */
                `
attribute vec2 instancePosition;
attribute float instanceAngle;
attribute vec3 instanceColor;
 
varying vec2 vUv;
varying vec3 vColor;

void main(){

    vUv = uv;
    vColor = instanceColor;

    vec3 local = position;

    local.x *= ${BULLET_LENGTH.toFixed(2)};
    local.y *= ${BULLET_WIDTH.toFixed(2)};

    float c = cos(instanceAngle);
    float s = sin(instanceAngle);

    vec2 rotated = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
    vec3 worldPos = vec3(instancePosition + rotated, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos,1.0);
}
`,

            fragmentShader: /* glsl */
                `
precision highp float;
varying vec2 vUv;
varying vec3 vColor;

void main(){

    vec2 uv = vUv;

    float x = uv.x;
    float y = uv.y * 2.0 - 1.0;
    float width = 1.0 - smoothstep(0.18, 0.35, abs(y));
    float head = smoothstep(0.0, 0.15, x);
    float tail = 1.0 - smoothstep(0.75, 1.0, x);
    float body = width * head * tail;
    float glow = exp(-abs(y)*5.5);
    float halo = exp(-abs(y)*2.2);
    float alpha = body + glow*0.45 + halo*0.15;

    alpha = clamp(alpha,0.0,1.0);
    vec3 color = vColor * body + vColor * glow * 0.65 + vec3(1.0) * halo * 0.15;

    gl_FragColor = vec4(color,alpha);

}
`
        });

    }, []);

    const arrays = useMemo(() => ({

        instancePosition: geometry.attributes.instancePosition.array,
        instanceAngle: geometry.attributes.instanceAngle.array,
        instanceColor: geometry.attributes.instanceColor.array,
        instanceVisible: geometry.attributes.instanceVisible.array,

    }), [geometry]);

    useFrame((state) => {

        material.uniforms.uTime.value = state.clock.elapsedTime

        const bullets = bulletQuery()

        const {
            instancePosition,
            instanceAngle,
            instanceColor,
            instanceVisible
        } = arrays

        let count = 0

        for (let i = 0; i < bullets.length; i++) {

            if (count >= MAX_BULLETS)
                break

            const eid = bullets[i]
            const weapon = WEAPONS[Bullet.type[eid]]

            if (!weapon)
                continue


            const p = count * 2

            instancePosition[p] = Position.x[eid]
            instancePosition[p + 1] = Position.y[eid]
            instanceAngle[count] = Math.atan2( Velocity.y[eid], Velocity.x[eid])

            tempColor.set(1,1,1)

            const c = count * 3

            instanceColor[c] = tempColor.r
            instanceColor[c + 1] = tempColor.g
            instanceColor[c + 2] = tempColor.b
            instanceVisible[count] = 1

            count++
        }


        for (let i = count; i < MAX_BULLETS; i++) {
            instanceVisible[i] = 0
        }

        geometry.instanceCount = count

        geometry.attributes.instancePosition.needsUpdate = true
        geometry.attributes.instanceAngle.needsUpdate = true
        geometry.attributes.instanceColor.needsUpdate = true
        geometry.attributes.instanceVisible.needsUpdate = true

    })

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            frustumCulled={false}
        />
    );
}
