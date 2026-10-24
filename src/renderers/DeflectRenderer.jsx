// src/renderers/DeflectRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { startState } from '../state/startState.js'

export function DeflectRenderer() {

    const ref = useRef(), uniforms = useMemo(() => ({ progress: { value: 1 } }), [])

    useFrame(() => {
        const mesh = ref.current;
        if (!mesh)
            return
        mesh.visible = startState.deflectFlashTimer > 0
        if (!mesh.visible)
            return
        mesh.position.set(startState.deflectFlashX, startState.deflectFlashY, 0.06)
        uniforms.progress.value = Math.max(0, Math.min(1, 1 - startState.deflectFlashTimer / 0.15))
    })

    return (
        <mesh ref={ref} visible={false} frustumCulled={false}>

            <planeGeometry args={[3.2, 3.2]} />
            <shaderMaterial uniforms={uniforms} transparent depthTest={false} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending}

                vertexShader={
                    `varying vec2 vUv;
                void main(){vUv=uv;
                gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
                }`}
                fragmentShader={
                    `varying vec2 vUv;
                uniform float progress;

                void main(){

                vec2 p=(vUv-0.5)*2.0;
                float d=length(p);
                float r=mix(0.05,0.9,sqrt(progress));
                float ring=1.0-smoothstep(0.0,0.1,abs(d-r));
                float core=(1.0-smoothstep(0.0,0.35,d))*(1.0-progress);
                
                gl_FragColor=vec4(vec3(0.3,0.7,1.0)*ring+vec3(1.0)*core,

                (ring+core)*(1.0-progress));
                }
                `
                }
            />
        </mesh>

    )
}
