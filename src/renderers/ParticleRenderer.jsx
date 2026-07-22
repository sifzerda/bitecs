// src/renderers/ParticleRenderer.jsx

// For creating: Smoke, Fire, Debris, Explosions, Engine trails, Missile trails, dust, steam

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_SIZE = 128

// ---------------------------------------------------------------------------

const simVertexShader = /* glsl */
    `
varying vec2 vUv;

void main()
{
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// Position sim: advects living particles, and on spawn pulls a fresh
// position/velocity from the emitter, chosen per-particle so that any
// slot can draw from any emitter (not locked 1:1 by UV index).
const positionSimFragmentShader = /* glsl */
    `
precision highp float;

varying vec2 vUv;

uniform sampler2D uPositionState;
uniform sampler2D uMetaState;
uniform sampler2D uEmitterTexture;

uniform vec2 uEmitterTexelSize; // 1 / emitterTextureSize
uniform float uEmitterCount;

uniform vec2 uAcceleration;
uniform float uDelta;
uniform float uTime;
uniform float uEmitting;

vec2 noiseDrift(vec2 p)
{
    return vec2(sin(p.y * 0.1 + uTime), cos(p.x * 0.1 - uTime));
}

void main()
{
    vec4 posData = texture2D(uPositionState, vUv);
    vec4 metaData = texture2D(uMetaState, vUv);

    vec2 pos = posData.xy;
    vec2 vel = posData.zw;

    float life = metaData.r;
    float seed = metaData.a;

    if(life <= 0.0 && uEmitting < 0.5)
    {
        gl_FragColor = posData;
        return;
    }

    if(life > 0.0)
    {
        vel += noiseDrift(pos) * 0.5 * uDelta;
        vel += uAcceleration * uDelta;

        vel *= exp(-1.2 * uDelta);
        pos += vel * uDelta;
    }
    else if(uEmitting > 0.5)
    {
        // pick an emitter deterministically from this slot's seed so
        // spawns are spread across all active emitters, not just the
        // emitter whose index happens to match this particle's UV.
        float count = max(uEmitterCount, 1.0);
        float emitterIndex = floor(fract(seed * 9973.0) * count);

        vec2 emitterUv = (vec2(emitterIndex, 0.0) + 0.5) * uEmitterTexelSize;
        vec4 emitterData = texture2D(uEmitterTexture, emitterUv);

        pos = emitterData.xy;
        vel = emitterData.zw;
    }

    gl_FragColor = vec4(pos, vel);
}
`

const metaSimFragmentShader = /* glsl */
    `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMetaState;
uniform float uTime;
uniform float uDelta;
uniform float uEmitting;

uniform float uGrowthRate;
uniform float uParticleLife;
uniform float uStartSize;
uniform float uSpawnRate; // chance per-second-ish a dead slot ignites

void main()
{
    vec4 meta = texture2D(uMetaState, vUv);

    float life = meta.r;
    float maxLife = meta.g;
    float size = meta.b;
    float seed = meta.a;

    if(life > 0.0)
    {
        life -= uDelta;
        size += uDelta * uGrowthRate;
    }
    else if(uEmitting > 0.5 && fract(seed * 1000.0 + uTime * uSpawnRate) < 0.02)
    {
        life = uParticleLife;
        maxLife = uParticleLife;
        size = uStartSize;
    }

    gl_FragColor = vec4(life, maxLife, size, seed);
}
`

const renderVertexShader = /* glsl */
    `
attribute vec2 particleUv;
uniform sampler2D uPositionState;
uniform sampler2D uMetaState;
uniform float uSize;
varying float vAge;

void main()
{
    vec4 posData = texture2D(uPositionState, particleUv);
    vec4 metaData = texture2D(uMetaState, particleUv);
    vec2 pos = posData.xy;

    float life = metaData.r;
    float maxLife = metaData.g;
    float size = metaData.b;

    if(life <= 0.0)
    {
        gl_PointSize = 0.0;
        gl_Position = vec4(-9999.0, -9999.0, 0.0, 1.0);
        return;
    }

    vAge = clamp(1.0 - life / max(maxLife, 0.0001), 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);

    gl_PointSize = size * uSize * (40.0 / max(-mvPosition.z, 0.1));
    gl_Position = projectionMatrix * mvPosition;
}
`

const renderFragmentShader = /* glsl */
    `
precision highp float;

varying float vAge;

uniform vec3 uColorStart;
uniform vec3 uColorEnd;

void main()
{
    float d = length(gl_PointCoord - vec2(0.5));

    if(d > 0.5)
        discard;

    vec3 color = mix(uColorStart, uColorEnd, pow(vAge, 0.8));

    float alpha = (1.0 - vAge) * smoothstep(0.5, 0.0, d);

    gl_FragColor = vec4(color, alpha);
}
`

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// Emitter texture is laid out as a 1D strip (N x 1) so it can hold an
// arbitrary, growing number of emitters without needing to be square.
export function createEmitterTexture(maxEmitters) {

    const data = new Float32Array(maxEmitters * 4)

    const tex = new THREE.DataTexture(
        data,
        maxEmitters,
        1,
        THREE.RGBAFormat,
        THREE.FloatType
    )

    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter

    return tex
}

//----------------------------------------------//

export function createMetaTexture(size) {

    const data = new Float32Array(size * size * 4)

    for (let i = 0; i < size * size; i++) {
        data[i * 4 + 0] = -1              // life
        data[i * 4 + 1] = 3               // maxLife
        data[i * 4 + 2] = 1               // size
        data[i * 4 + 3] = Math.random()   // seed
    }

    const tex = new THREE.DataTexture(
        data,
        size,
        size,
        THREE.RGBAFormat,
        THREE.FloatType
    )

    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter

    return tex
}

//----------------------------------------------//

export function createParticleTexture(size) {

    const data = new Float32Array(size * size * 4)

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)

    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter

    return tex
}

//----------------------------------------------//

export function createParticleRT(size) {
    const target = new THREE.WebGLRenderTarget(
        size,
        size,
        {
            type: THREE.FloatType,
            format: THREE.RGBAFormat,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            depthBuffer: false,
            stencilBuffer: false,
        }
    )

    target.texture.generateMipmaps = false

    return target
}

//----------------------------------------------//

function createParticleGeometry(size) {
    const geo = new THREE.BufferGeometry()
    const uv = new Float32Array(size * size * 2)
    const pos = new Float32Array(size * size * 3)

    let ptr = 0
    let posPtr = 0

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            uv[ptr++] = (x + 0.5) / size
            uv[ptr++] = (y + 0.5) / size

            pos[posPtr++] = 0
            pos[posPtr++] = 0
            pos[posPtr++] = 0
        }
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    geo.setAttribute("particleUv", new THREE.BufferAttribute(uv, 2))

    return geo
}

export function updateEmitterTexture(texture, emitters, maxEmitters) {

    const data = texture.image.data
    data.fill(0)

    const max = Math.min(emitters.length, maxEmitters)

    for (let i = 0; i < max; i++) {
        const e = emitters[i]
        const ptr = i * 4

        data[ptr + 0] = e.x
        data[ptr + 1] = e.y
        data[ptr + 2] = e.vx
        data[ptr + 3] = e.vy
    }

    texture.needsUpdate = true

    return max
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export function ParticleRenderer({

    size = 8,

    emitters = [],
    emitting = true,
    maxEmitters = 64,

    particleLife = 3,
    startSize = 0.2,
    growthRate = 0.8,
    spawnRate = 1,

    acceleration = [0, 0],

    colorStart = '#e6e6e6',
    colorEnd = '#141414',

}) {
    const { gl } = useThree()

    const positionScene = useMemo(() => new THREE.Scene(), [])
    const metaScene = useMemo(() => new THREE.Scene(), [])

    const simCamera = useMemo(
        () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        []
    )

    const initialPosTexture = useMemo(() => createParticleTexture(PARTICLE_SIZE), [])
    const initialMetaTexture = useMemo(() => createMetaTexture(PARTICLE_SIZE), [])

    const posA = useMemo(() => createParticleRT(PARTICLE_SIZE), [])
    const posB = useMemo(() => createParticleRT(PARTICLE_SIZE), [])
    const metaA = useMemo(() => createParticleRT(PARTICLE_SIZE), [])
    const metaB = useMemo(() => createParticleRT(PARTICLE_SIZE), [])

    const emitterTexture = useMemo(
        () => createEmitterTexture(maxEmitters),
        [maxEmitters]
    )

    useEffect(() => {

        const prev = gl.getRenderTarget()

        ;[posA, posB, metaA, metaB].forEach(rt => {
            gl.setRenderTarget(rt)
            gl.clear()
        })

        gl.setRenderTarget(prev)

    }, [gl, posA, posB, metaA, metaB])

    const readPos = useRef(initialPosTexture)
    const writePos = useRef(posA)
    const otherPos = useRef(posB)

    const readMeta = useRef(initialMetaTexture)
    const writeMeta = useRef(metaA)
    const otherMeta = useRef(metaB)

    const geometry = useMemo(() => createParticleGeometry(PARTICLE_SIZE), [])

    const positionSimMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: {
                uPositionState: { value: null },
                uMetaState: { value: null },
                uEmitterTexture: { value: null },
                uEmitterTexelSize: { value: new THREE.Vector2(1 / maxEmitters, 1) },
                uEmitterCount: { value: 1 },
                uAcceleration: { value: new THREE.Vector2() },
                uDelta: { value: 0 },
                uTime: { value: 0 },
                uEmitting: { value: 1 },
            },
            vertexShader: simVertexShader,
            fragmentShader: positionSimFragmentShader,
        }),
        [maxEmitters]
    )

    const metaSimMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: {
                uMetaState: { value: null },
                uDelta: { value: 0 },
                uTime: { value: 0 },
                uEmitting: { value: 1 },
                uGrowthRate: { value: growthRate },
                uParticleLife: { value: particleLife },
                uStartSize: { value: startSize },
                uSpawnRate: { value: spawnRate },
            },
            vertexShader: simVertexShader,
            fragmentShader: metaSimFragmentShader,
        }),
        []
    )

    useEffect(() => {

        const positionQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), positionSimMaterial)
        const metaQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), metaSimMaterial)

        positionScene.add(positionQuad)
        metaScene.add(metaQuad)

        return () => {
            positionScene.remove(positionQuad)
            metaScene.remove(metaQuad)

            positionQuad.geometry.dispose()
            metaQuad.geometry.dispose()
        }

    }, [positionScene, metaScene, positionSimMaterial, metaSimMaterial])

    const renderMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: {
                uPositionState: { value: null },
                uMetaState: { value: null },
                uSize: { value: size },
                uColorStart: { value: new THREE.Color(colorStart) },
                uColorEnd: { value: new THREE.Color(colorEnd) },
            },
            vertexShader: renderVertexShader,
            fragmentShader: renderFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
        []
    )

    // keep size/color live without recreating the material
    useEffect(() => {
        renderMaterial.uniforms.uSize.value = size
    }, [renderMaterial, size])

    useEffect(() => {
        renderMaterial.uniforms.uColorStart.value.set(colorStart)
        renderMaterial.uniforms.uColorEnd.value.set(colorEnd)
    }, [renderMaterial, colorStart, colorEnd])

    useFrame((state, delta) => {

        const dt = Math.min(delta, 0.05)
        const t = state.clock.elapsedTime

        const activeCount = updateEmitterTexture(emitterTexture, emitters, maxEmitters)

        // ---- position pass ----
        positionSimMaterial.uniforms.uEmitterTexture.value = emitterTexture
        positionSimMaterial.uniforms.uEmitterCount.value = Math.max(activeCount, 1)
        positionSimMaterial.uniforms.uPositionState.value = readPos.current
        positionSimMaterial.uniforms.uMetaState.value = readMeta.current
        positionSimMaterial.uniforms.uDelta.value = dt
        positionSimMaterial.uniforms.uTime.value = t
        positionSimMaterial.uniforms.uEmitting.value = (emitting && activeCount > 0) ? 1 : 0
        positionSimMaterial.uniforms.uAcceleration.value.set(acceleration[0], acceleration[1])

        const prevTarget = gl.getRenderTarget()

        gl.setRenderTarget(writePos.current)
        gl.render(positionScene, simCamera)
        gl.setRenderTarget(prevTarget)

        // ---- meta (life/size) pass ----
        metaSimMaterial.uniforms.uMetaState.value = readMeta.current
        metaSimMaterial.uniforms.uDelta.value = dt
        metaSimMaterial.uniforms.uTime.value = t
        metaSimMaterial.uniforms.uEmitting.value = (emitting && activeCount > 0) ? 1 : 0
        metaSimMaterial.uniforms.uGrowthRate.value = growthRate
        metaSimMaterial.uniforms.uParticleLife.value = particleLife
        metaSimMaterial.uniforms.uStartSize.value = startSize
        metaSimMaterial.uniforms.uSpawnRate.value = spawnRate

        gl.setRenderTarget(writeMeta.current)
        gl.render(metaScene, simCamera)
        gl.setRenderTarget(prevTarget)

        // ---- ping-pong swap ----
        const finishedPos = writePos.current
        writePos.current = otherPos.current
        otherPos.current = finishedPos
        readPos.current = finishedPos.texture

        const finishedMeta = writeMeta.current
        writeMeta.current = otherMeta.current
        otherMeta.current = finishedMeta
        readMeta.current = finishedMeta.texture

        renderMaterial.uniforms.uPositionState.value = readPos.current
        renderMaterial.uniforms.uMetaState.value = readMeta.current
    })

    return (
        <points
            geometry={geometry}
            material={renderMaterial}
            frustumCulled={false}
        />
    )
}