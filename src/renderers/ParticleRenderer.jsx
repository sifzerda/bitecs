// src/renderers/ParticleRenderer.jsx

// For creating: Smoke, Fire, Debris, Explosions, Engine trails, Missile trails, dust, steam

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
//import { exhaustSources } from "../effects/gpu/ExhaustState"

const PARTICLE_SIZE = 128

// ---------------------------------------------------------------------------

const simVertexShader = /* glsl */
    `
varying vec2 vUv;

void main() {

    vUv = uv;
    gl_Position = vec4(position.xy,0.0, 1.0);
}
`

const simFragmentShader = /* glsl */
    `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uEmitter;
uniform float uTime;
uniform float uDelta;
uniform float uEmitting;

vec2 noiseDrift(vec2 p)
{
    return vec2(sin(p.y * 0.05 + uTime), cos(p.x * 0.05 - uTime));
}

void main()
{
    vec4 data = texture2D(uState, vUv);
    vec2 pos = data.xy;
    vec2 vel = data.zw;
    bool dead = length(pos) > 1000.0;

    if(dead)
    {
        pos = uEmitter;
        float seed = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
        float angle = seed * 6.28318;
        float speed = 2.0 + seed * 5.0;
        vel = vec2(cos(angle), sin(angle)) * speed;
    }

    vel += noiseDrift(pos) * 0.5 * uDelta;
    vel.y += 0.5 * uDelta;
    vel *= exp(-1.5 * uDelta);
    pos += vel * uDelta;
    gl_FragColor = vec4(pos, vel);
}
`

const renderVertexShader = /* glsl */
    `
attribute vec2 particleUv;
uniform sampler2D uState;
uniform float uSize;
varying float vSpeed;

void main()
{
    vec4 state = texture2D(uState, particleUv);
    vec2 pos = state.xy;
    vec2 vel = state.zw;
    vSpeed = length(vel);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);

    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mvPosition;
}
`

const renderFragmentShader = /* glsl */
    `
precision highp float;
varying float vSpeed;

void main()
{
    float d = length(gl_PointCoord - vec2(0.5));
    if(d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    vec3 color = mix(vec3(0.2,0.6,1.0), vec3(1.0,1.0,1.0), clamp(vSpeed / 6.0, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
}
`

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function createMetaTexture(size) {

    const data = new Float32Array(size * size * 4)

    for (let i = 0; i < size * size; i++) {

        data[i * 4 + 0] = -1
        data[i * 4 + 1] = 1
        data[i * 4 + 2] = 1
        data[i * 4 + 3] = Math.random()

    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)
    tex.needsUpdate = true

    return tex

}

export function createParticleTexture(size) {

    const data = new Float32Array(size * size * 4)

    for (let i = 0; i < size * size; i++) {
        data[i * 4 + 0] = 0
        data[i * 4 + 1] = 0
        data[i * 4 + 2] = 0
        data[i * 4 + 3] = 0
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)

    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter

    return tex

}

export function createParticleRT(size) {

    return new THREE.WebGLRenderTarget(size, size, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
    })

    target.texture.generateMipmaps = false

}

function createParticleGeometry(size) {
    const geo = new THREE.BufferGeometry()
    const uv = new Float32Array(size * size * 2)
    const pos = new Float32Array(size * size * 3)

    let ptr = 0
    let posPtr = 0

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            pos[posPtr++] = 0
            pos[posPtr++] = 0
        }
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    geo.setAttribute("particleUv", new THREE.BufferAttribute(uv, 2))

    return geo
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------
//

export function ParticleRenderer({ size = 8, emitter = [0, 0], emitting = true }) {
    const { gl } = useThree()
    const simScene = useMemo(() => new THREE.Scene(), [])
    const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])
    const initialPosTexture = useMemo(() => createParticleTexture(PARTICLE_SIZE), [])
    const rtA = useMemo(() => createParticleRT(PARTICLE_SIZE), [])
    const rtB = useMemo(() => createParticleRT(PARTICLE_SIZE), [])

    const readTexture = useRef(initialPosTexture)
    const writeTarget = useRef(rtA)
    const otherTarget = useRef(rtB)
    const geometry = useMemo(() => createParticleGeometry(PARTICLE_SIZE), [])
    const simMaterial = useMemo(() => new THREE.ShaderMaterial({

        uniforms: {

            uState: { value: null },
            uEmitter: { value: new THREE.Vector2() },
            uTime: { value: 0 },
            uDelta: { value: 0 },
            uEmitting: { value: 1 },

        },

        vertexShader: simVertexShader,
        fragmentShader: simFragmentShader,

    }), [])

    useMemo(() => {
 const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial)
        simScene.add(quad)
    }, [simScene, simMaterial])

    const renderMaterial = useMemo(() => new THREE.ShaderMaterial({

        uniforms: {

            uState: {
                value: null
            },

            uSize: {
                value: size
            },

        },

        vertexShader: renderVertexShader,
        fragmentShader: renderFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,

    }), [size])


    useFrame((state, delta) => {

        simMaterial.uniforms.uState.value = readTexture.current
        simMaterial.uniforms.uDelta.value = Math.min(delta, 0.1)
        simMaterial.uniforms.uTime.value = state.clock.elapsedTime
        simMaterial.uniforms.uEmitter.value.set(emitter[0], emitter[1])
        simMaterial.uniforms.uEmitting.value = emitting ? 1 : 0

        const prevTarget = gl.getRenderTarget()

        gl.setRenderTarget(writeTarget.current)
        gl.render(simScene, simCamera)
        gl.setRenderTarget(prevTarget)

        renderMaterial.uniforms.uState.value = writeTarget.current.texture
        const tmp = writeTarget.current
        writeTarget.current = otherTarget.current
        otherTarget.current = tmp

    })

    return (

        <points
            geometry={geometry}
            material={renderMaterial}
            frustumCulled={false}
        />

    )
}