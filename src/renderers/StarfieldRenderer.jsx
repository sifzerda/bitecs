// src/renderers/StarfieldRenderer.jsx

import { useMemo, useRef, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ============================================================
// CONFIG
// ============================================================

const FIELD_Z = -5
const PADDING = 1.4

// One combined particle buffer.
const SMALL_STAR_COUNT = 2000
const MILKY_WAY_STAR_COUNT = 2200
const CLUSTER_STAR_COUNT = 700
const DUST_LAYER_COUNT = 500

const BRIGHT_STAR_COUNT = 55

// Shooting stars are pooled rather than created dynamically.
const MAX_SHOOTING_STARS = 24
const STAR_TOTAL = SMALL_STAR_COUNT + MILKY_WAY_STAR_COUNT + CLUSTER_STAR_COUNT + DUST_LAYER_COUNT
const DPR_LIMIT = 1.5

const COLORS = {
    white: "#eef4ff",
    amber: "#e2541f",
    pink: "#f0207a",
    violet: "#5a24d6",
    cyan: "#1fa8ff",
}

// ============================================================
// SHARED NOISE
// Reduced from 6 FBM octaves to 4.
// ============================================================

const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.21, 0.36, -0.57, 0.024);

    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;

    x12.xy -= i1;

    i = mod289(i);

    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);

    m *= m;
    m *= m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.8 - 0.9 * (a0 * a0 + h * h);

    vec3 g;

    g.x = a0.x * x0.x + h.x * x0.y;
    g.y = a0.y * x12.x + h.y * x12.y;
    g.z = a0.z * x12.z + h.z * x12.w;

    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
        value += amplitude * snoise(p);
        p *= 2.03;
        amplitude *= 0.55;
    }

    return value;
}
`

// ============================================================
// SKY
// ============================================================

const skyVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const skyFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uColorTop;
uniform vec3 uColorBottom;

varying vec2 vUv;

void main() {
    vec3 color = mix(uColorBottom, uColorTop, smoothstep(0.0, 1.0, vUv.y));
    gl_FragColor = vec4(color, 1.0);
}
`

function SkyBase() {
    const viewport = useThree((s) => s.viewport)

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            uniforms: {
                uColorTop: { value: new THREE.Color("#02020a") },
                uColorBottom: { value: new THREE.Color("#0a0616") },
            },
            depthWrite: false,
            depthTest: false,
        })
    }, [])

    useEffect(() => {
        return () => material.dispose()
    }, [material])

    const width = viewport.width * PADDING * 1.7
    const height = viewport.height * PADDING * 1.7

    return (
        <mesh position={[0, 0, FIELD_Z - 4]} renderOrder={-10} material={material}>
            <planeGeometry args={[width, height]} />
        </mesh>
    )
}

// ============================================================
// PROCEDURAL MILKY WAY / NEBULA
// ============================================================

const dustBandFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;

uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;

varying vec2 vUv;

${noiseGLSL}

void main() {

    vec2 uv = vUv * 2.0 - 1.0;

    float angle = radians(-32.0);

    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 p = rot * uv;

    float band = exp(-pow(p.y, 2.0) * 7.0);
    float haze = 0.5 + 0.5 * fbm(p * 1.05 + vec2(uTime * 0.004, 0.0));
    float wisps = smoothstep(0.18, 0.82, fbm(p * 1.8 - 10.0 + uTime * 0.002));
    float colorNoise = 0.5 + 0.5 * fbm(p * 0.55 + uTime * 0.006);

    vec3 color = mix(uColorAmber, uColorPink, colorNoise);

    color = mix(color, uColorViolet, smoothstep(0.25, 0.75, haze));
    color = mix(color, uColorCyan, smoothstep(0.55, 0.95, haze));

    float alpha = band * haze * wisps * 0.28;
    float vignette = smoothstep(1.65, 0.25, length(uv));

    alpha *= vignette;

    gl_FragColor = vec4(color, alpha);
}
`

function DustBand() {
    const viewport = useThree((s) => s.viewport)

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: dustBandFragmentShader,

            uniforms: {
                uTime: { value: 0 },
                uColorAmber: { value: new THREE.Color("#b0fcff"), },
                uColorPink: { value: new THREE.Color("#00e1ff"), },
                uColorViolet: { value: new THREE.Color("#0077ff"), },
                uColorCyan: { value: new THREE.Color("#0077ff"), },
            },

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
        })
    }, [])

    useEffect(() => {
        return () => material.dispose()
    }, [material])

    useFrame((_, delta) => {
        material.uniforms.uTime.value += delta
    })

    const width = viewport.width * PADDING * 1.6
    const height = viewport.height * PADDING * 1.6

    return (
        <mesh position={[0, 0, FIELD_Z - 3]} renderOrder={-9} material={material}>
            <planeGeometry args={[width, height]} />
        </mesh>
    )
}

// ============================================================
// ============================================================

const starVertexShader = /* glsl */ `
precision highp float;

attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
attribute float aHue;
attribute float aKind;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;

varying float vAlpha;
varying float vHue;
varying float vKind;

${noiseGLSL}

void main() {

    vec3 pos = position;

    if (aKind > 2.5) {

        float t = uTime * 0.025;

        pos.x += snoise(pos.xy * 0.08 + aSeed * 19.0 + t) * 0.45;
        pos.y += snoise(pos.xy * 0.08 + aSeed * 31.0 - t) * 0.45;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.45 + 0.55 * sin(uTime * aSpeed + aPhase);

    if (aKind < 0.5) {
        vAlpha = twinkle * 0.8;
    }
    else if (aKind < 1.5) {
        vAlpha = twinkle * 0.65;
    }
    else if (aKind < 2.5) {
        vAlpha = twinkle * 0.85;
    }
    else {
        vAlpha = 0.3 + 0.3 * sin( uTime * 0.25 + aPhase);
    }

    vHue = aHue;
    vKind = aKind;

    gl_PointSize = aSize * uBaseSize * uPixelRatio * (1.0 / max(-mvPosition.z, 0.001));
}
`

const starFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
uniform vec3 uColorWhite;

varying float vAlpha;
varying float vHue;
varying float vKind;

void main() {

    vec2 uv = gl_PointCoord - 0.5;

    float d = length(uv) * 2.0;
    float glow = smoothstep(1.0, 0.0, d);

    glow = pow(glow, 1.65);

    if (vKind > 2.5) {
        glow = pow(glow, 1.8);
    }

    vec3 color;

    if (vHue < 0.25) {

        color = mix(uColorWhite, uColorCyan, vHue / 0.25);

    }
    else if (vHue < 0.5) {

        color = mix(uColorCyan, uColorViolet, (vHue - 0.25) / 0.25);

    }
    else if (vHue < 0.75) {

        color = mix(uColorViolet, uColorPink, (vHue - 0.5) / 0.25);

    }
    else {

        color = mix(uColorPink, uColorAmber, (vHue - 0.75) / 0.25);
    }

    gl_FragColor = vec4(color, glow * vAlpha);
}
`

// ============================================================
// RANDOM HELPERS
// ============================================================

function gaussianRandom() {
    let u = 0
    let v = 0

    while (u === 0) {
        u = Math.random()
    }

    while (v === 0) {
        v = Math.random()
    }

    return (
        Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    )
}

// ============================================================
// COMBINED STAR GENERATION
// ============================================================

function generateStars(w, h) {

    const positions = new Float32Array(STAR_TOTAL * 3)
    const phases = new Float32Array(STAR_TOTAL)
    const speeds = new Float32Array(STAR_TOTAL)
    const sizes = new Float32Array(STAR_TOTAL)
    const hues = new Float32Array(STAR_TOTAL)
    const kinds = new Float32Array(STAR_TOTAL)
    const seeds = new Float32Array(STAR_TOTAL)

    let index = 0

    // --------------------------------------------------------
    // NORMAL STARS
    // --------------------------------------------------------

    for (let i = 0; i < SMALL_STAR_COUNT; i++) {

        positions[index * 3] = (Math.random() - 0.5) * w
        positions[index * 3 + 1] = (Math.random() - 0.5) * h
        positions[index * 3 + 2] = FIELD_Z

        phases[index] = Math.random() * Math.PI * 2
        speeds[index] = 0.6 + Math.random() * 2.2
        sizes[index] = 0.9 + Math.random() * Math.random() * 2.1
        hues[index] = Math.random() < 0.35 ? Math.random() : 0

        kinds[index] = 0
        seeds[index] = Math.random()

        index++
    }

    // --------------------------------------------------------
    // MILKY WAY
    // --------------------------------------------------------

    const angle = THREE.MathUtils.degToRad(-32)

    const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
    const normal = new THREE.Vector2(-dir.y, dir.x)

    const trailLength = w * 1.5

    for (let i = 0; i < MILKY_WAY_STAR_COUNT; i++) {

        const t = Math.random()

        const wave = Math.sin(t * Math.PI * 2.2 + 1.3) * 0.55 + Math.sin(t * Math.PI * 5.3 + 4.1) * 0.22
        const taper = 0.25 + 0.75 * Math.sin(t * Math.PI)
        const spread = (Math.random() - 0.5) * (Math.random() - 0.5) * 4.0
        const along = (t - 0.5) * trailLength
        const across = (wave + spread) * taper * h * 0.18

        positions[index * 3] = dir.x * along + normal.x * across
        positions[index * 3 + 1] = dir.y * along + normal.y * across
        positions[index * 3 + 2] = FIELD_Z - 0.4 + Math.random() * 1.2
        phases[index] = Math.random() * Math.PI * 2
        speeds[index] = 0.5 + Math.random() * 1.8
        sizes[index] = 0.5 + Math.random() * Math.random() * 1.4
        hues[index] = Math.random() < 0.3 ? Math.random() : 0
        kinds[index] = 1
        seeds[index] = Math.random()

        index++
    }

    // --------------------------------------------------------
    // CLUSTERS
    // --------------------------------------------------------

    const CLUSTER_COUNT = 6

    const centers = []

    for (let c = 0; c < CLUSTER_COUNT; c++) {

        centers.push({
            x: (Math.random() - 0.5) * w * 0.85,
            y: (Math.random() - 0.5) * h * 0.85,
            radius: 0.18 + Math.random() * 0.4,
            weight: 0.6 + Math.random() * 0.8,
        })
    }

    const totalWeight = centers.reduce((sum, c) => sum + c.weight, 0)

    for (let i = 0; i < CLUSTER_STAR_COUNT; i++) {

        let r = Math.random() * totalWeight
        let chosen = centers[0]

        for (const center of centers) {

            if (r < center.weight) {
                chosen = center
                break
            }

            r -= center.weight
        }

        positions[index * 3] = chosen.x + gaussianRandom() * chosen.radius
        positions[index * 3 + 1] = chosen.y + gaussianRandom() * chosen.radius
        positions[index * 3 + 2] = FIELD_Z - 0.3 + Math.random()

        phases[index] = Math.random() * Math.PI * 2
        speeds[index] = 0.6 + Math.random() * 2.0
        sizes[index] = 1.0 + Math.random() * Math.random() * 2.4
        hues[index] = Math.random() < 0.3 ? Math.random() : 0

        kinds[index] = 2
        seeds[index] = Math.random()

        index++
    }

    // --------------------------------------------------------
    // DUST
    // --------------------------------------------------------

    const bandAngle = THREE.MathUtils.degToRad(-32)
    const dustDir = new THREE.Vector2(Math.cos(bandAngle), Math.sin(bandAngle))
    const dustNormal = new THREE.Vector2(-dustDir.y, dustDir.x)

    for (let i = 0; i < DUST_LAYER_COUNT; i++) {

        const along = (Math.random() - 0.5) * w * 1.3
        const across = (Math.random() - 0.5) * (Math.random() - 0.5) * h * 1.4

        positions[index * 3] = dustDir.x * along + dustNormal.x * across
        positions[index * 3 + 1] = dustDir.y * along + dustNormal.y * across
        positions[index * 3 + 2] = FIELD_Z - 1 + Math.random() * 2

        phases[index] = Math.random() * Math.PI * 2
        speeds[index] = 0.5 + Math.random()

        sizes[index] = 1.4 + Math.random() * 3.2
        hues[index] = Math.random()

        kinds[index] = 3
        seeds[index] = Math.random()

        index++
    }

    return { positions, phases, speeds, sizes, hues, kinds, seeds }
}

// ============================================================
// COMBINED STARS
// ============================================================

function StarParticles() {

    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const materialRef = useRef(null)
    const pixelRatio = Math.min(gl.getPixelRatio(), DPR_LIMIT)

    const { geometry, material } = useMemo(() => {

        const w = viewport.width * PADDING
        const h = viewport.height * PADDING
        const data = generateStars(w, h)

        const geometry = new THREE.BufferGeometry()

        geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3))
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(data.phases, 1))
        geometry.setAttribute("aSpeed", new THREE.BufferAttribute(data.speeds, 1))

        geometry.setAttribute("aSize",
            new THREE.BufferAttribute(data.sizes,
                1
            )
        )

        geometry.setAttribute("aHue",
            new THREE.BufferAttribute(data.hues,
                1
            )
        )

        geometry.setAttribute("aKind", new THREE.BufferAttribute(data.kinds, 1))
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(data.seeds, 1))

        const material = new THREE.ShaderMaterial({

            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,

            uniforms: {
                uTime: { value: 0, },
                uPixelRatio: { value: pixelRatio },
                uBaseSize: { value: 18 },
                uColorWhite: { value: new THREE.Color(COLORS.white) },
                uColorAmber: { value: new THREE.Color(COLORS.amber) },
                uColorPink: { value: new THREE.Color(COLORS.pink) },
                uColorViolet: { value: new THREE.Color(COLORS.violet) },
                uColorCyan: { value: new THREE.Color(COLORS.cyan) },
            },

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        })

        return {
            geometry,
            material,
        }

    }, [
        viewport.width,
        viewport.height,
        pixelRatio,
    ])

    materialRef.current = material

    useEffect(() => {

        return () => {
            geometry.dispose()
            material.dispose()
        }

    }, [geometry, material])

    useFrame((_, delta) => {

        if (!materialRef.current)
            return

        materialRef.current.uniforms.uTime.value += delta

    })

    return (
        <points
            geometry={geometry}
            material={material}
            frustumCulled={false}
            renderOrder={-2}
        />
    )
}

// ============================================================
// BRIGHT STAR TEXTURES
// ============================================================

function makeSparkleTexture() {

    const size = 64
    const canvas = document.createElement("canvas")

    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext("2d")
    const c = size / 2

    const glow = ctx.createRadialGradient(c, c, 0, c, c, c)

    glow.addColorStop(0, "rgba(255,255,255,1)")
    glow.addColorStop(0.35, "rgba(255,255,255,0.55)")
    glow.addColorStop(1, "rgba(255,255,255,0)")

    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)

    ctx.strokeStyle = "rgba(255,255,255,0.9)"
    ctx.lineCap = "round"
    ctx.lineWidth = 1.4

    ctx.beginPath()

    ctx.moveTo(c, 2)
    ctx.lineTo(c, size - 2)
    ctx.moveTo(2, c)
    ctx.lineTo(size - 2, c)

    ctx.stroke()

    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.5

    ctx.beginPath()

    ctx.moveTo(c - c * 0.6, c - c * 0.6)
    ctx.lineTo(c + c * 0.6, c + c * 0.6)
    ctx.moveTo(c - c * 0.6, c + c * 0.6)
    ctx.lineTo(c + c * 0.6, c - c * 0.6)

    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)

    texture.needsUpdate = true

    return texture
}

function makeHaloTexture() {

    const size = 128

    const canvas = document.createElement("canvas")

    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext("2d")

    const c = size / 2

    const glow = ctx.createRadialGradient(c, c, 0, c, c, c)

    glow.addColorStop(0, "rgba(255,255,255,0.9)")
    glow.addColorStop(0.4, "rgba(255,255,255,0.35)")
    glow.addColorStop(1, "rgba(255,255,255,0)")

    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)

    texture.needsUpdate = true

    return texture
}

// ============================================================
// BRIGHT STARS
// ============================================================

const sparkleVertexShader = /* glsl */ `
precision highp float;

attribute float aPhase;
attribute float aSize;
attribute float aHue;

uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;

varying float vAlpha;
varying float vHue;

void main() {

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    vAlpha = 0.7 + 0.3 * sin(uTime * 0.8 + aPhase);

    vHue = aHue;

    gl_PointSize = aSize * uBaseSize * uPixelRatio * (1.0 / max(-mvPosition.z, 0.001));
}
`

const sparkleFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uMap;

varying float vAlpha;

void main() {

    vec4 tex = texture2D(uMap, gl_PointCoord);

    gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
}
`

const haloFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uMap;

uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;

varying float vAlpha;
varying float vHue;

void main() {

    vec4 tex = texture2D(uMap, gl_PointCoord);

    vec3 color;

    if (vHue < 0.33) {

        color = mix(uColorCyan, uColorViolet, vHue / 0.33);

    }
    else if (vHue < 0.66) {

        color = mix(uColorViolet, uColorPink, (vHue - 0.33) / 0.33);

    }
    else {

        color = mix(uColorPink, uColorAmber, (vHue - 0.66) / 0.34);
    }

    gl_FragColor = vec4(color, tex.a * vAlpha * 0.55);
}
`

function BrightStars() {

    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const sparkleMatRef = useRef(null)
    const haloMatRef = useRef(null)

    const {
        geometry,
        sparkleMaterial,
        haloMaterial,
        sparkleTex,
        haloTex,
    } = useMemo(() => {

        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const positions = new Float32Array(BRIGHT_STAR_COUNT * 3)
        const phases = new Float32Array(BRIGHT_STAR_COUNT)
        const sizes = new Float32Array(BRIGHT_STAR_COUNT)
        const hues = new Float32Array(BRIGHT_STAR_COUNT)

        for (
            let i = 0; i < BRIGHT_STAR_COUNT; i++
        ) {

            positions[i * 3] = (Math.random() - 0.5) * w
            positions[i * 3 + 1] = (Math.random() - 0.5) * h
            positions[i * 3 + 2] = FIELD_Z + 0.2
            phases[i] = Math.random() * Math.PI * 2
            sizes[i] = 2.2 + Math.random() * 2.2
            hues[i] = Math.random()
        }

        const geometry = new THREE.BufferGeometry()

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
        geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1))

        const sparkleTex = makeSparkleTexture()
        const haloTex = makeHaloTexture()
        const sparkleMaterial = new THREE.ShaderMaterial({
            vertexShader: sparkleVertexShader,
            fragmentShader: sparkleFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(gl.getPixelRatio(), DPR_LIMIT), },
                uBaseSize: { value: 16 },
                uMap: { value: sparkleTex },
            },

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        })

        const haloMaterial = new THREE.ShaderMaterial({

            vertexShader: sparkleVertexShader,
            fragmentShader: haloFragmentShader,

            uniforms: {

                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(gl.getPixelRatio(), DPR_LIMIT) },
                uBaseSize: { value: 58 },
                uMap: { value: haloTex },
                uColorAmber: { value: new THREE.Color(COLORS.amber) },
                uColorPink: { value: new THREE.Color(COLORS.pink), },
                uColorViolet: {  value: new THREE.Color(COLORS.violet) },
                uColorCyan: { value: new THREE.Color(COLORS.cyan), },
            },

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        })

        return {
            geometry,
            sparkleMaterial,
            haloMaterial,
            sparkleTex,
            haloTex,
        }

    }, [
        viewport.width,
        viewport.height,
        gl,
    ])

    sparkleMatRef.current = sparkleMaterial

    haloMatRef.current = haloMaterial

    useEffect(() => {

        return () => {

            geometry.dispose()
            sparkleMaterial.dispose()
            haloMaterial.dispose()
            sparkleTex.dispose()
            haloTex.dispose()
        }

    }, [
        geometry,
        sparkleMaterial,
        haloMaterial,
        sparkleTex,
        haloTex,
    ])

    useFrame((_, delta) => {

        if (
            !sparkleMatRef.current || !haloMatRef.current
        ) {
            return
        }

        sparkleMatRef.current.uniforms.uTime.value += delta
        haloMatRef.current.uniforms.uTime.value += delta
    })

    return (
        <>
            <points
                geometry={geometry}
                material={haloMaterial}
                frustumCulled={false}
                renderOrder={-1.5}
            />

            <points
                geometry={geometry}
                material={sparkleMaterial}
                frustumCulled={false}
                renderOrder={-1}
            />
        </>
    )
}

// ============================================================
// ============================================================

const shootingStarVertexShader = /* glsl */ `
precision highp float;

attribute vec3 aOffset;
attribute vec2 aScale;
attribute float aRotation;
attribute float aOpacity;
attribute vec3 aColor;

varying float vOpacity;
varying vec3 vColor;

void main() {

    vec3 p = position;

    float c = cos(aRotation);
    float s = sin(aRotation);

    vec2 rotated = vec2(p.x * c - p.y * s, p.x * s + p.y * c);

    p.xy = rotated * aScale;
    p += aOffset;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);

    vOpacity = aOpacity;
    vColor = aColor;
}
`

const shootingStarFragmentShader = /* glsl */ `
precision highp float;

varying float vOpacity;
varying vec3 vColor;

void main() {

    float head = smoothstep(0.25, 0.5, gl_FragCoord.x);
    float alpha = vOpacity * head;

    gl_FragColor = vec4(vColor, alpha);
}
`

function ShootingStars() {

    const viewport = useThree((s) => s.viewport)
    const meshRef = useRef(null)
    const stateRef = useRef([])

    const nextSpawnRef = useRef(1.5 + Math.random() * 2.5)
    const nextShowerRef = useRef(10 + Math.random() * 12)

    const geometry = useMemo(() => {

        const base = new THREE.PlaneGeometry(1, 1)
        const geo = new THREE.InstancedBufferGeometry()

        geo.index = base.index
        geo.attributes = base.attributes

        return geo

    }, [])

    const attributes = useMemo(() => {

        const offsets = new Float32Array(MAX_SHOOTING_STARS * 3)
        const scales = new Float32Array(MAX_SHOOTING_STARS * 2)
        const rotations = new Float32Array(MAX_SHOOTING_STARS)
        const opacities = new Float32Array(MAX_SHOOTING_STARS)
        const colors = new Float32Array(MAX_SHOOTING_STARS * 3)

        opacities.fill(0)

        geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3))
        geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 2))
        geometry.setAttribute("aRotation", new THREE.InstancedBufferAttribute(rotations, 1))
        geometry.setAttribute("aOpacity", new THREE.InstancedBufferAttribute(opacities, 1))
        geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3))

        geometry.instanceCount = MAX_SHOOTING_STARS

        return {
            offsets,
            scales,
            rotations,
            opacities,
            colors,
        }

    }, [geometry])

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            vertexShader: shootingStarVertexShader,
            fragmentShader: shootingStarFragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        })

    }, [])

    useEffect(() => {

        return () => {
            geometry.dispose()
            material.dispose()
        }

    }, [geometry, material])

    function createStar(dim = false) {

        const existing = stateRef.current
        let slot = -1

        for (let i = 0; i < MAX_SHOOTING_STARS; i++) {

            if (!existing[i] || !existing[i].active) {
                slot = i
                break
            }
        }

        if (slot === -1) {
            return
        }

        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const angle = THREE.MathUtils.degToRad(-18 - Math.random() * 20)

        const speed = (dim ? 3 : 3.5) + Math.random() * 3
        const length = (dim ? 2.5 : 3.5) + Math.random() * 2.5
        const margin = Math.max(w, h) * 0.25
        const startX = -w / 2 - margin
        const startY = h * (Math.random() * 0.7 - 0.15)

        const colors = [
            [0.27, 0.67, 1.0],
            [0.59, 0.35, 0.92],
            [0.94, 0.2, 0.51],
            [0.89, 0.35, 0.16],
        ]

        const color = colors[Math.floor(Math.random() * colors.length)]

        const star = {
            active: true,
            x: startX,
            y: startY,
            speed,
            angle,
            length,
            travel: 0,
            maxTravel: w + margin * 2,
            peakOpacity:
                dim ? 0.6 : 1.0,
            dirX: Math.cos(angle),
            dirY: Math.sin(angle), color,
        }

        existing[slot] = star

        attributes.offsets[slot * 3] = star.x
        attributes.offsets[slot * 3 + 1] = star.y
        attributes.offsets[slot * 3 + 2] = FIELD_Z + 1
        attributes.scales[slot * 2] = length
        attributes.scales[slot * 2 + 1] = dim ? 0.015 : 0.025
        attributes.rotations[slot] = angle
        attributes.colors[slot * 3] = color[0]
        attributes.colors[slot * 3 + 1] = color[1]
        attributes.colors[slot * 3 + 2] = color[2]
        attributes.opacities[slot] = 0
    }

    useFrame((_, delta) => {

        if (!meshRef.current)
            return

        nextSpawnRef.current -= delta

        if (nextSpawnRef.current <= 0) {

            createStar(false)

            nextSpawnRef.current = 4 + Math.random() * 6
        }

        nextShowerRef.current -= delta

        if (nextShowerRef.current <= 0) {

            const count = 5 + Math.floor(Math.random() * 6)

            for (let i = 0; i < count; i++) {

                const delay = i * (0.07 + Math.random() * 0.12)
                stateRef.current.push({ active: false, pending: true, delay, })
            }

            nextShowerRef.current = 16 + Math.random() * 18
        }

        for (let i = stateRef.current.length - 1; i >= 0; i--) {

            const star = stateRef.current[i]

            if (star && star.pending) {

                star.delay -= delta

                if (star.delay <= 0) {

                    stateRef.current[i] = null

                    createStar(true)
                }
            }
        }

        for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
            const star = stateRef.current[i]
            if (!star || !star.active) {
                attributes.opacities[i] = 0
                continue
            }

            star.travel += star.speed * delta
            star.x += star.dirX * star.speed * delta
            star.y += star.dirY * star.speed * delta

            const t = star.travel / star.maxTravel
            const fadeIn = Math.min(t / 0.06, 1)
            const fadeOut = 1 - Math.min(Math.max((t - 0.75) / 0.25, 0), 1)

            attributes.offsets[i * 3] = star.x
            attributes.offsets[i * 3 + 1] = star.y
            attributes.opacities[i] = star.peakOpacity * fadeIn * fadeOut

            if (t >= 1) {

                star.active = false
                attributes.opacities[i] = 0
            }
        }

        geometry.attributes.aOffset.needsUpdate = true
        geometry.attributes.aOpacity.needsUpdate = true
    })

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            frustumCulled={false}
            renderOrder={1}
        />
    )
}

// ============================================================
// MAIN RENDERER
// ============================================================

export function StarfieldRenderer() {

    return (
        <>
            <SkyBase />
            <DustBand />
            <StarParticles />
            <BrightStars />
            <ShootingStars />
        </>
    )
}