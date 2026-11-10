// src/fx/gpu/gpuParticleUtils.js

import * as THREE from "three"

/**
 * Creates a uniform object from plain values.
 */
export function makeUniforms(values) {
    return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
            key,
            { value },
        ])
    )
}

/**
 * Creates an RGBA float texture containing particle state:
 *
 * R = x position
 * G = y position
 * B = remaining lifetime
 * A = random seed
 */
export function createParticleTexture(size, maxDelay = 0.5) {
    const count = size * size
    const data = new Float32Array(count * 4)

    for (let i = 0; i < count; i++) {
        const j = i * 4

        data[j + 2] = -Math.random() * maxDelay
        data[j + 3] = Math.random()
    }

    const texture = new THREE.DataTexture(
        data,
        size,
        size,
        THREE.RGBAFormat,
        THREE.FloatType
    )

    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true

    return texture
}

/**
 * Creates a float render target for GPU simulation.
 */
export function createParticleTarget(size) {
    return new THREE.WebGLRenderTarget(size, size, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
    })
}

/**
 * Creates particle UVs used to sample the position texture.
 */
export function createParticleGeometry(size) {
    const count = size * size
    const uvs = new Float32Array(count * 2)

    for (let i = 0; i < count; i++) {
        uvs[i * 2] = ((i % size) + 0.5) / size
        uvs[i * 2 + 1] =
            (Math.floor(i / size) + 0.5) / size
    }

    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            new Float32Array(count * 3),
            3
        )
    )

    geometry.setAttribute(
        "particleUv",
        new THREE.BufferAttribute(uvs, 2)
    )

    return geometry
}

/**
 * Creates a GPU particle system.
 *
 * The caller supplies its simulation and rendering shaders.
 */
export function createGPUParticles({
    size,
    simVertex,
    simFragment,
    renderVertex,
    renderFragment,
    simUniforms = {},
    renderUniforms = {},
    maxDelay = 0.5,
}) {
    const initial = createParticleTexture(size, maxDelay)

    const targets = [
        createParticleTarget(size),
        createParticleTarget(size),
    ]

    const sim = new THREE.ShaderMaterial({
        vertexShader: simVertex,
        fragmentShader: simFragment,
        uniforms: makeUniforms({
            uPosTex: initial,
            ...simUniforms,
        }),
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
    })

    const render = new THREE.ShaderMaterial({
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        uniforms: makeUniforms({
            uPosTex: initial,
            ...renderUniforms,
        }),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    })

    const geometry = createParticleGeometry(size)

    const quadGeometry = new THREE.PlaneGeometry(2, 2)
    const quad = new THREE.Mesh(quadGeometry, sim)

    quad.frustumCulled = false

    const scene = new THREE.Scene()
    scene.add(quad)

    const camera = new THREE.OrthographicCamera(
        -1, 1, 1, -1, 0, 1
    )

    return {
        sim,
        render,
        geometry,

        read: initial,
        index: 0,
        time: 0,

        /**
         * Advance simulation by one frame.
         */
        update(gl) {
            const target = targets[this.index]

            sim.uniforms.uPosTex.value = this.read

            const previousTarget = gl.getRenderTarget()
            const previousAutoClear = gl.autoClear

            try {
                gl.autoClear = true
                gl.setRenderTarget(target)
                gl.render(scene, camera)
            } finally {
                gl.setRenderTarget(previousTarget)
                gl.autoClear = previousAutoClear
            }

            this.read = target.texture
            this.index = 1 - this.index

            render.uniforms.uPosTex.value = this.read
        },

        /**
         * Release all owned GPU resources.
         */
        dispose() {
            scene.remove(quad)

            quadGeometry.dispose()
            geometry.dispose()

            sim.dispose()
            render.dispose()

            initial.dispose()

            targets.forEach((target) => target.dispose())
        },
    }
}
