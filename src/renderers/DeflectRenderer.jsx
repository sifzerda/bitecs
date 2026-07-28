// src/renderers/DeflectRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gameState } from '../state/gameState.js'

const DEFLECT_FLASH_DURATION = 0.15 // keep in sync with combat.js

export function DeflectRenderer() {

    const meshRef = useRef()
    const lastTimer = useRef(0)
    const seed = useRef(Math.random() * Math.PI * 2)

    const geometry = useMemo(() => { return new THREE.PlaneGeometry(3.2, 3.2) }, [])

    const material = useMemo(() => new THREE.ShaderMaterial({

        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
            uProgress: { value: 1 }, // 0 = just triggered, 1 = fully faded
            uSeed: { value: seed.current },      // randomizes rotation/spike pattern per-flash
        },

        vertexShader:/* glsl */`

varying vec2 vUv;

void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}

`,

        fragmentShader:/* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uSeed;

#define PI 3.14159265

void main(){

    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float angle = atan(c.y, c.x) + uSeed;

    // ---- spikes ----//

 float spikePattern = pow(abs(sin(angle * 5.0)), 3.0);
    float spikeReach = mix(0.05, 1.15, uProgress);
    float spikeLen = mix(0.5, 0.05, uProgress);
    float spikes = (1.0 - smoothstep(0.0, spikeLen, abs(d-spikeReach))) * spikePattern;

    // ----  rings ----//

    float pSlow = pow(uProgress, 0.6);
    float innerRadius = mix(0.05, 0.85, pSlow);
    float innerRing = 1.0 - smoothstep(0.0, 0.08, abs(d-innerRadius));
    float outerRadius = mix(0.0, 1.2, pow(uProgress,1.4));
    float outerRing = 1.0 - smoothstep(0.0, 0.16, abs(d-outerRadius));

    // ---- shield facets ----//

    float facet = mod(angle * 3.0 / PI, 1.0);
    float facetEdge = 1.0 - smoothstep(0.0, 0.06, min(facet, 1.0-facet));
    float facets = facetEdge * (1.0-smoothstep(0.3,0.75,d)) * (1.0-uProgress);

    // ---- core flash ----//

    float core = (1.0 - smoothstep(0.0, 0.35, d)) * (1.0 - smoothstep(0.0, 0.25, uProgress));
    vec3 color = vec3(1.0,0.95,0.85) * core 
    + vec3(0.5,0.8,1.0) * innerRing * 1.4 
    + vec3(0.15,0.4,1.0) *outerRing * 0.9 
    + vec3(0.6,0.85,1.0) * facets * 0.8 
    + vec3(0.5,0.8,1.0) * spikes * 1.1;

    float alpha = clamp(core + innerRing + outerRing * 0.8 + facets + spikes, 0.0, 1.0) * (1.0 - uProgress);

    gl_FragColor = vec4(color, alpha);
}
`
    }), [])

    const uniforms = material.uniforms

    useFrame(() => {

        const mesh = meshRef.current
        if (!mesh) return

        const timer = gameState.deflectFlashTimer

        if (timer <= 0) {
            mesh.visible = false
            lastTimer.current = 0
            return
        }

        mesh.visible = true
        mesh.position.set(gameState.deflectFlashX, gameState.deflectFlashY, 0.06)

        // Detect new flash start
        if (lastTimer.current <= 0 && timer > 0) {
            seed.current = Math.random() * Math.PI * 2
            uniforms.uSeed.value = seed.current
        }

        lastTimer.current = timer
        const progress = 1 - timer / DEFLECT_FLASH_DURATION
        uniforms.uProgress.value = Math.min(Math.max(progress, 0), 1)
    })

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} visible={false} frustumCulled={false} />
    )
}