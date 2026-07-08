// src/renderers/DeflectRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gameState } from '../state/gameState.js'

const DEFLECT_FLASH_DURATION = 0.15 // keep in sync with combat.js

export function DeflectRenderer() {

    const meshRef = useRef()
    const seedRef = useRef(Math.random() * 100)
    const lastTriggerRef = useRef(-1)

    const material = useMemo(() => new THREE.ShaderMaterial({

        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
            uProgress: { value: 1 }, // 0 = just triggered, 1 = fully faded
            uSeed: { value: 0 },      // randomizes rotation/spike pattern per-flash
        },

        vertexShader: /* glsl */`
varying vec2 vUv;
void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

        fragmentShader: /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uSeed;

#define PI 3.14159265

void main(){

    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float angle = atan(c.y, c.x) + uSeed;

    // ---- radial spikes: a star-burst of shards firing outward ----
    float spikeCount = 10.0;
    float spikePattern = abs(sin(angle * spikeCount * 0.5));
    spikePattern = pow(spikePattern, 3.0);

    float spikeReach = mix(0.05, 1.15, uProgress);
    float spikeLen = mix(0.5, 0.05, uProgress); // spikes taper as they fade
    float spikeBand = 1.0 - smoothstep(0.0, spikeLen, abs(d - spikeReach));
    float spikes = spikeBand * spikePattern;

    // ---- fast inner shockwave ring ----
    float innerRadius = mix(0.05, 0.85, pow(uProgress, 0.6));
    float innerWidth = 0.08;
    float innerRing = 1.0 - smoothstep(0.0, innerWidth, abs(d - innerRadius));

    // ---- slower, wider outer ring trailing behind ----
    float outerRadius = mix(0.0, 1.2, pow(uProgress, 1.4));
    float outerWidth = 0.16;
    float outerRing = 1.0 - smoothstep(0.0, outerWidth, abs(d - outerRadius));

    // ---- rotating hex-shield facets — angular segments that flicker in/out ----
    float facetCount = 6.0;
    float facetAngle = mod(angle * facetCount / (2.0 * PI), 1.0);
    float facetEdge = 1.0 - smoothstep(0.0, 0.06, min(facetAngle, 1.0 - facetAngle));
    float facetRing = facetEdge * (1.0 - smoothstep(0.3, 0.75, d)) * (1.0 - uProgress);

    // ---- white-hot core flash, quick to fade ----
    float core = (1.0 - smoothstep(0.0, 0.35, d)) * (1.0 - smoothstep(0.0, 0.25, uProgress));

    vec3 hotColor    = vec3(1.0, 0.95, 0.85);
    vec3 innerColor  = vec3(0.5, 0.8, 1.0);
    vec3 outerColor  = vec3(0.15, 0.4, 1.0);
    vec3 facetColor  = vec3(0.6, 0.85, 1.0);

    vec3 color =
          hotColor   * core
        + innerColor * innerRing * 1.4
        + outerColor * outerRing * 0.9
        + facetColor * facetRing * 0.8
        + innerColor * spikes * 1.1;

    float alpha = clamp(core + innerRing + outerRing * 0.8 + facetRing + spikes, 0.0, 1.0) * (1.0 - uProgress);

    gl_FragColor = vec4(color, alpha);
}
`
    }), [])

    useFrame(() => {

        const mesh = meshRef.current
        if (!mesh) return

        if (gameState.deflectFlashTimer > 0) {

            mesh.visible = true
            mesh.position.set(gameState.deflectFlashX, gameState.deflectFlashY, 0.06)

            // new random rotation/seed each time a flash starts, so repeated
            // deflects don't look identical
            if (gameState.deflectFlashTimer === DEFLECT_FLASH_DURATION && lastTriggerRef.current !== gameState.deflectFlashX + gameState.deflectFlashY) {
                seedRef.current = Math.random() * Math.PI * 2
                lastTriggerRef.current = gameState.deflectFlashX + gameState.deflectFlashY
                material.uniforms.uSeed.value = seedRef.current
            }

            const progress = 1 - (gameState.deflectFlashTimer / DEFLECT_FLASH_DURATION)
            material.uniforms.uProgress.value = THREE.MathUtils.clamp(progress, 0, 1)

        } else {
            mesh.visible = false
        }
    })

    return (
        <mesh ref={meshRef} material={material} visible={false} frustumCulled={false}>
            <planeGeometry args={[3.2, 3.2]} />
        </mesh>
    )
}