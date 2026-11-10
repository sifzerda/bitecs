// src/renderers/StarfieldRenderer.jsx

import * as THREE from "three"
import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"

import { useGameStore, SCREEN } from "../../store/gameStore.js"

// ============================================================
// CONFIG
// ============================================================

const FIELD_Z = -5
const PADDING = 1.4
const DPR_LIMIT = 1.5

const STAR_COUNTS = [2000, 2200, 700, 500, 55]
const STAR_TOTAL = STAR_COUNTS.reduce((a, b) => a + b, 0)

const MAX_METEORS = 24
const NEBULA_FPS = 10
const NEBULA_SCALE = 0.5

const ANGLE = THREE.MathUtils.degToRad(-32)
const COS = Math.cos(ANGLE)
const SIN = Math.sin(ANGLE)

const COLORS = [
    "#eef4ff",
    "#1fa8ff",
    "#5a24d6",
    "#f0207a",
    "#e2541f",
]

const METEOR_COLORS = [
    [0.27, 0.67, 1],
    [0.59, 0.35, 0.92],
    [0.94, 0.2, 0.51],
    [0.89, 0.35, 0.16],
]

const rand = (min = 0, max = 1) =>
    min + Math.random() * (max - min)

const gaussian = () =>
    Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-8))) *
    Math.cos(Math.random() * Math.PI * 2)

function isPaused() {
    const game = useGameStore.getState()
    return game.screen === SCREEN.PLAY && game.paused
}

function makeMaterial(vertexShader, fragmentShader, uniforms = {}, options = {}) {
    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: Object.fromEntries(
            Object.entries(uniforms).map(([key, value]) => [
                key,
                { value },
            ])
        ),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        ...options,
    })
}

// ============================================================
// BACKGROUND SHADERS
// ============================================================

const planeVertex = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position, 1.0);
}
`


const skyFragment = /* glsl */ `
varying vec2 vUv;

void main() {
    vec3 bottom = vec3(0.004, 0.003, 0.012);
    vec3 top = vec3(0.001, 0.002, 0.007);

    gl_FragColor = vec4(
        mix(bottom, top, vUv.y),
        1.0
    );
}
`

// Three-octave value noise.
// Evaluated at reduced resolution rather than full-screen.

const nebulaFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;

float hash(vec2 p) {
    return fract(
        sin(dot(p, vec2(127.1, 311.7))) *
        43758.5453
    );
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(
            hash(i),
            hash(i + vec2(1.0, 0.0)),
            f.x
        ),
        mix(
            hash(i + vec2(0.0, 1.0)),
            hash(i + vec2(1.0, 1.0)),
            f.x
        ),
        f.y
    );
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 3; i++) {
        value += noise(p) * amplitude;
        p *= 2.05;
        amplitude *= 0.5;
    }

    return value;
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    float a = radians(-32.0);

    mat2 rotation = mat2(
        cos(a), -sin(a),
        sin(a), cos(a)
    );

    vec2 p = rotation * uv;

    p.x += uTime * 0.002;

    float band = exp(-p.y * p.y * 7.0);

    float clouds = fbm(p * 3.0 + 5.0);
    float detail = fbm(p * 8.0 - 12.0);

    float density =
        band *
        smoothstep(0.25, 0.75, clouds) *
        (0.5 + detail);

vec3 cyan = vec3(0.01, 0.24, 0.42);
vec3 blue = vec3(0.005, 0.035, 0.22);
vec3 violet = vec3(0.10, 0.015, 0.25);

    vec3 color = mix(blue, cyan, clouds);
    color = mix(color, violet, detail * 0.5);

    float vignette =
        1.0 - smoothstep(0.8, 1.6, length(uv));

gl_FragColor = vec4(
    color * density * vignette * 0.16,
    1.0
);
}
`

// ============================================================
// HALF-RESOLUTION NEBULA
// ============================================================

function createNebula(gl, width, height) {
    const target = new THREE.WebGLRenderTarget(
        Math.max(1, width),
        Math.max(1, height),
        {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            depthBuffer: false,
            stencilBuffer: false,
            generateMipmaps: false,
        }
    )

    const material = makeMaterial(
        planeVertex,
        nebulaFragment,
        { uTime: 0 },
        {
            transparent: false,
            blending: THREE.NoBlending,
            depthTest: false,
        }
    )

    const geometry = new THREE.PlaneGeometry(2, 2)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(
        -1, 1, 1, -1, 0, 1
    )

    const quad = new THREE.Mesh(geometry, material)
    scene.add(quad)

    return {
        target,
        material,

        render(time) {
            material.uniforms.uTime.value = time

            const previous = gl.getRenderTarget()
            const previousAutoClear = gl.autoClear

            try {
                gl.autoClear = true
                gl.setRenderTarget(target)
                gl.render(scene, camera)
            } finally {
                gl.setRenderTarget(previous)
                gl.autoClear = previousAutoClear
            }
        },

        dispose() {
            scene.remove(quad)
            geometry.dispose()
            material.dispose()
            target.dispose()
        },
    }
}

function Background({ width, height, clock, dpr }) {
    const gl = useThree((s) => s.gl)

    const nebulaRef = useRef(null)
    const displayRef = useRef(null)
    const accumulator = useRef(0)

    const skyMaterial = useMemo(
        () => makeMaterial(
            planeVertex,
            skyFragment,
            {},
            {
                transparent: false,
                blending: THREE.NoBlending,
                depthTest: false,
            }
        ),
        []
    )

    const displayMaterial = useMemo(
        () => new THREE.MeshBasicMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        }),
        []
    )

    useEffect(() => {
        const pixels = gl.getSize(new THREE.Vector2())

        const nebula = createNebula(
            gl,
            Math.floor(pixels.x * dpr * NEBULA_SCALE),
            Math.floor(pixels.y * dpr * NEBULA_SCALE)
        )

        nebulaRef.current = nebula
        displayMaterial.map = nebula.target.texture
        displayMaterial.needsUpdate = true

        // First render happens in useFrame, when the
        // WebGL renderer is ready.
        accumulator.current = 1 / NEBULA_FPS

        return () => {
            nebulaRef.current = null
            displayMaterial.map = null
            nebula.dispose()
        }
    }, [gl, width, height, dpr, displayMaterial])

    useEffect(() => () => {
        skyMaterial.dispose()
        displayMaterial.dispose()
    }, [skyMaterial, displayMaterial])

    useFrame((_, delta) => {
        const nebula = nebulaRef.current
        if (!nebula) return

        if (!isPaused()) {
            accumulator.current += Math.min(delta, 0.05)
        }

        if (accumulator.current < 1 / NEBULA_FPS) {
            return
        }

        accumulator.current = 0
        nebula.render(clock.current)
    }, -1)

    const planeWidth = width * 1.7
    const planeHeight = height * 1.7

    return (
        <>
            <mesh
                material={skyMaterial}
                position={[0, 0, FIELD_Z - 4]}
                renderOrder={-10}
            >
                <planeGeometry
                    args={[planeWidth, planeHeight]}
                />
            </mesh>

            <mesh
                ref={displayRef}
                material={displayMaterial}
                position={[0, 0, FIELD_Z - 3]}
                renderOrder={-9}
            >
                <planeGeometry
                    args={[planeWidth, planeHeight]}
                />
            </mesh>
        </>
    )
}

// ============================================================
// STAR SHADERS
// ============================================================

const starVertex = /* glsl */ `
precision highp float;

attribute float aSize;
attribute float aPhase;
attribute float aSpeed;
attribute float aHue;
attribute float aKind;

uniform float uTime;
uniform float uDpr;

varying float vAlpha;
varying float vHue;
varying float vKind;

void main() {
    vec4 mv = modelViewMatrix *
        vec4(position, 1.0);

    gl_Position = projectionMatrix * mv;

    float twinkle =
        0.65 +
        0.35 * sin(uTime * aSpeed + aPhase);

    vKind = aKind;
    vHue = aHue;

vAlpha = twinkle * (
    aKind > 3.5 ? 0.95 :
    aKind > 2.5 ? 0.16 :
    aKind > 1.5 ? 0.65 :
    aKind > 0.5 ? 0.40 : 0.55
);

    float scale = aKind > 3.5 ? 2.4 : 1.0;

    gl_PointSize =
        aSize * scale * 18.0 * uDpr /
        max(-mv.z, 0.001);
}
`

const starFragment = /* glsl */ `
precision highp float;

uniform vec3 uColors[5];

varying float vAlpha;
varying float vHue;
varying float vKind;

void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;

    if (d >= 1.0) discard;

    float h = clamp(vHue, 0.0, 0.999) * 4.0;
    float t = fract(h);

    vec3 color;

    if (h < 1.0)
        color = mix(uColors[0], uColors[1], t);
    else if (h < 2.0)
        color = mix(uColors[1], uColors[2], t);
    else if (h < 3.0)
        color = mix(uColors[2], uColors[3], t);
    else
        color = mix(uColors[3], uColors[4], t);

    float glow = pow(1.0 - d, 1.7);

    // Procedural sparkle for the 55 bright stars.
    if (vKind > 3.5) {
        float cross =
            exp(-abs(uv.x) * 30.0) +
            exp(-abs(uv.y) * 30.0);

        glow = max(
            glow,
            cross * (1.0 - d) * 0.7
        );
    }

    gl_FragColor = vec4(
        color,
        glow * vAlpha
    );
}
`

// ============================================================
// STAR GEOMETRY
// ============================================================

// Generate in normalized coordinates.
// Resizing changes the object scale, not the buffers.

function createStars() {
    const positions = new Float32Array(STAR_TOTAL * 3)
    const sizes = new Float32Array(STAR_TOTAL)
    const phases = new Float32Array(STAR_TOTAL)
    const speeds = new Float32Array(STAR_TOTAL)
    const hues = new Float32Array(STAR_TOTAL)
    const kinds = new Float32Array(STAR_TOTAL)

    const clusters = Array.from({ length: 6 }, () => ({
        x: rand(-0.42, 0.42),
        y: rand(-0.42, 0.42),
        radius: rand(0.018, 0.058),
    }))

    let index = 0

    function add(x, y, z, kind, size) {
        const i = index++

        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z

        sizes[i] = size
        phases[i] = rand(0, Math.PI * 2)
        speeds[i] = rand(0.5, 2.5)
        hues[i] = Math.random() < 0.35 ? Math.random() : 0
        kinds[i] = kind
    }

    // Normal stars
    for (let i = 0; i < STAR_COUNTS[0]; i++) {
        add(
            rand(-0.5, 0.5),
            rand(-0.5, 0.5),
            0,
            0,
            rand(0.9, 2.8)
        )
    }

    // Milky Way
    for (let i = 0; i < STAR_COUNTS[1]; i++) {
        const t = Math.random()

        const along = (t - 0.5) * 1.5

        const wave =
            Math.sin(t * 6.9 + 1.3) * 0.55 +
            Math.sin(t * 16.6 + 4.1) * 0.22

        const taper =
            0.25 + 0.75 * Math.sin(t * Math.PI)

        const across =
            (wave + gaussian() * 0.4) *
            taper * 0.18

        add(
            COS * along - SIN * across,
            SIN * along + COS * across,
            rand(-0.04, 0.08),
            1,
            rand(0.5, 1.9)
        )
    }

    // Clusters
    for (let i = 0; i < STAR_COUNTS[2]; i++) {
        const c = clusters[
            Math.floor(Math.random() * clusters.length)
        ]

        add(
            c.x + gaussian() * c.radius,
            c.y + gaussian() * c.radius,
            rand(-0.03, 0.07),
            2,
            rand(1, 3.4)
        )
    }

    // Dust
    for (let i = 0; i < STAR_COUNTS[3]; i++) {
        const along = rand(-0.65, 0.65)
        const across = gaussian() * 0.13

        add(
            COS * along - SIN * across,
            SIN * along + COS * across,
            rand(-0.1, 0.1),
            3,
            rand(1.4, 4.6)
        )
    }

    // Bright stars
    for (let i = 0; i < STAR_COUNTS[4]; i++) {
        add(
            rand(-0.5, 0.5),
            rand(-0.5, 0.5),
            0.02,
            4,
            rand(2.2, 4.4)
        )
    }

    const geometry = new THREE.BufferGeometry()

    const attributes = {
        position: [positions, 3],
        aSize: [sizes, 1],
        aPhase: [phases, 1],
        aSpeed: [speeds, 1],
        aHue: [hues, 1],
        aKind: [kinds, 1],
    }

    for (const [name, [array, size]] of Object.entries(attributes)) {
        geometry.setAttribute(
            name,
            new THREE.BufferAttribute(array, size)
        )
    }

    // Keep the local bounding volume correct, even
    // when some stars extend outside normalized bounds.
    geometry.computeBoundingSphere()

    return geometry
}

// ============================================================
// STAR RENDERER
// ============================================================

function Stars({ width, height, dpr, clock }) {
    const geometry = useMemo(createStars, [])

    const material = useMemo(
        () => makeMaterial(
            starVertex,
            starFragment,
            {
                uTime: 0,
                uDpr: dpr,
                uColors: COLORS.map(
                    (color) => new THREE.Color(color)
                ),
            }
        ),
        []
    )

    useEffect(() => () => {
        geometry.dispose()
        material.dispose()
    }, [geometry, material])

    useFrame(() => {
        material.uniforms.uTime.value = clock.current
        material.uniforms.uDpr.value = dpr
    })

    return (
        <points
            geometry={geometry}
            material={material}
            position={[0, 0, FIELD_Z]}
            scale={[width, height, 1]}
            frustumCulled={false}
            renderOrder={-2}
        />
    )
}

// ============================================================
// METEOR SHADERS
// ============================================================

const meteorVertex = /* glsl */ `
attribute vec3 aOffset;
attribute vec2 aScale;
attribute float aRotation;
attribute float aOpacity;
attribute vec3 aColor;

varying vec2 vUv;
varying vec3 vColor;
varying float vOpacity;

void main() {
    float c = cos(aRotation);
    float s = sin(aRotation);

    vec2 p = position.xy * aScale;

    p = vec2(
        p.x * c - p.y * s,
        p.x * s + p.y * c
    );

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(p + aOffset.xy, aOffset.z, 1.0);

    vUv = uv;
    vColor = aColor;
    vOpacity = aOpacity;
}
`

const meteorFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vColor;
varying float vOpacity;

void main() {
    float tail =
        smoothstep(0.0, 0.9, vUv.x);

    float edge =
        1.0 - smoothstep(
            0.25,
            0.5,
            abs(vUv.y - 0.5)
        );

    gl_FragColor = vec4(
        vColor,
        vOpacity * tail * edge
    );
}
`

// ============================================================
// METEOR RESOURCES
// ============================================================

function createMeteorResources() {
    const base = new THREE.PlaneGeometry(1, 1)
    const geometry = new THREE.InstancedBufferGeometry()

    geometry.setIndex(base.index.clone())

    geometry.setAttribute(
        "position",
        base.attributes.position.clone()
    )

    geometry.setAttribute(
        "uv",
        base.attributes.uv.clone()
    )

    base.dispose()

    const data = {
        offsets: new Float32Array(MAX_METEORS * 3),
        scales: new Float32Array(MAX_METEORS * 2),
        rotations: new Float32Array(MAX_METEORS),
        opacities: new Float32Array(MAX_METEORS),
        colors: new Float32Array(MAX_METEORS * 3),
    }

    const definitions = {
        offsets: ["aOffset", 3],
        scales: ["aScale", 2],
        rotations: ["aRotation", 1],
        opacities: ["aOpacity", 1],
        colors: ["aColor", 3],
    }

    for (const [key, [name, size]] of Object.entries(definitions)) {
        const attribute = new THREE.InstancedBufferAttribute(
            data[key],
            size
        )

        attribute.setUsage(THREE.DynamicDrawUsage)

        geometry.setAttribute(name, attribute)
    }

    // Start with no visible instances.
    geometry.instanceCount = 0

    const material = makeMaterial(
        meteorVertex,
        meteorFragment,
        {},
        { side: THREE.DoubleSide }
    )

    return {
        geometry,
        material,
        data,

        dispose() {
            geometry.dispose()
            material.dispose()
        },
    }
}

// ============================================================
// SHOOTING STARS
// ============================================================

function ShootingStars({ width, height }) {
    const resources = useMemo(createMeteorResources, [])

    const starsRef = useRef(
        Array(MAX_METEORS).fill(null)
    )

    const pendingRef = useRef([])
    const nextSpawnRef = useRef(rand(1.5, 4))
    const nextShowerRef = useRef(rand(10, 22))

    useEffect(
        () => () => resources.dispose(),
        [resources]
    )

    useFrame((_, rawDelta) => {
        if (isPaused()) return

        const dt = Math.min(Math.max(rawDelta, 0), 0.05)
        if (dt <= 0) return

        const { geometry, data } = resources
        const stars = starsRef.current

        let staticDirty = false
        let dynamicDirty = false

        function spawn(dim = false) {
            const slot = stars.findIndex((star) => !star)
            if (slot < 0) return

            const angle = THREE.MathUtils.degToRad(
                rand(-38, -18)
            )

            const speed = rand(
                dim ? 3 : 3.5,
                6.5
            )

            const margin =
                Math.max(width, height) * 0.25

            const color = METEOR_COLORS[
                Math.floor(Math.random() * METEOR_COLORS.length)
            ]

            const star = {
                x: -width / 2 - margin,
                y: height * rand(-0.15, 0.55),
                dx: Math.cos(angle),
                dy: Math.sin(angle),
                speed,
                travel: 0,
                distance: width + margin * 2,
                opacity: dim ? 0.6 : 1,
            }

            stars[slot] = star

            data.offsets[slot * 3] = star.x
            data.offsets[slot * 3 + 1] = star.y
            data.offsets[slot * 3 + 2] = FIELD_Z + 1

            data.scales[slot * 2] = rand(
                dim ? 2.5 : 3.5,
                dim ? 5 : 6
            )

            data.scales[slot * 2 + 1] =
                dim ? 0.015 : 0.025

            data.rotations[slot] = angle
            data.colors.set(color, slot * 3)
            data.opacities[slot] = 0

            geometry.instanceCount = Math.max(
                geometry.instanceCount,
                slot + 1
            )

            staticDirty = true
            dynamicDirty = true
        }

        // ----------------------------------------------------
        // INDIVIDUAL METEORS
        // ----------------------------------------------------

        nextSpawnRef.current -= dt

        if (nextSpawnRef.current <= 0) {
            spawn()
            nextSpawnRef.current = rand(4, 10)
        }

        // ----------------------------------------------------
        // METEOR SHOWERS
        // ----------------------------------------------------

        nextShowerRef.current -= dt

        if (nextShowerRef.current <= 0) {
            const count = Math.floor(rand(5, 11))

            for (let i = 0; i < count; i++) {
                pendingRef.current.push(
                    i * rand(0.07, 0.19)
                )
            }

            nextShowerRef.current = rand(16, 34)
        }

        const pending = pendingRef.current

        for (let i = pending.length - 1; i >= 0; i--) {
            pending[i] -= dt

            if (pending[i] <= 0) {
                pending.splice(i, 1)
                spawn(true)
            }
        }

        // ----------------------------------------------------
        // ACTIVE METEOR UPDATES
        // ----------------------------------------------------

        for (let i = 0; i < geometry.instanceCount; i++) {
            const star = stars[i]
            if (!star) continue

            const step = star.speed * dt

            star.travel += step
            star.x += star.dx * step
            star.y += star.dy * step

            const t = star.travel / star.distance

            const fadeIn = Math.min(t / 0.06, 1)

            const fadeOut =
                1 - THREE.MathUtils.clamp(
                    (t - 0.75) / 0.25,
                    0,
                    1
                )

            data.offsets[i * 3] = star.x
            data.offsets[i * 3 + 1] = star.y

            data.opacities[i] =
                star.opacity * fadeIn * fadeOut

            if (t >= 1) {
                data.opacities[i] = 0
                stars[i] = null
            }

            dynamicDirty = true
        }

        // ----------------------------------------------------
        // GPU BUFFER UPDATES
        // ----------------------------------------------------

        if (staticDirty) {
            geometry.attributes.aScale.needsUpdate = true
            geometry.attributes.aRotation.needsUpdate = true
            geometry.attributes.aColor.needsUpdate = true
        }

        if (dynamicDirty) {
            geometry.attributes.aOffset.needsUpdate = true
            geometry.attributes.aOpacity.needsUpdate = true
        }

        // No need to draw the meteor pool when empty.
        if (!stars.some(Boolean)) {
            geometry.instanceCount = 0
        }
    })

    return (
        <mesh
            geometry={resources.geometry}
            material={resources.material}
            frustumCulled={false}
            renderOrder={1}
        />
    )
}

// ============================================================
// MAIN RENDERER
// ============================================================

export function StarfieldRenderer() {
    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)

    const clock = useRef(0)

    const width = viewport.width * PADDING
    const height = viewport.height * PADDING

    const dpr = Math.min(
        gl.getPixelRatio(),
        DPR_LIMIT
    )

    useFrame((_, delta) => {
        if (!isPaused()) {
            clock.current += Math.min(
                Math.max(delta, 0),
                0.05
            )
        }
    }, -2)

    return (
        <>
            <Background
                width={width}
                height={height}
                dpr={dpr}
                clock={clock}
            />

            <Stars
                width={width}
                height={height}
                dpr={dpr}
                clock={clock}
            />

            <ShootingStars
                width={width}
                height={height}
            />
        </>
    )
}
