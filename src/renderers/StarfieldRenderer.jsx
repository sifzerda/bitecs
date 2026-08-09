// src/renderers/StarfieldRenderer.jsx

// v2: base layout still matches the night-sky reference photos (dense
// stars, faint dust band, low diagonal shooting streaks), but colors
// are now blended like the "glow" reference — soft chromatic blur
// across pink / purple / blue / amber rather than flat white — with
// bigger halo blur on stars and more frequent shooting-star activity,
// including occasional meteor-shower bursts.

import { useMemo, useRef, useCallback, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const FIELD_Z = -5
const PADDING = 1.4

const SMALL_STAR_COUNT = 2000
const BRIGHT_STAR_COUNT = 55
const DUST_LAYER_COUNT = 2400

/* ---------------------------------------------------------
   Shared noise for the dust band
--------------------------------------------------------- */

const noiseGLSL = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}

float snoise(vec2 v){
    const vec4 C= vec4(0.21, 0.36, -0.57, 0.02);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)? vec2(1.0,0.0): vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;
    x12.xy-=i1;
    i=mod289(i);
    vec3 p= permute(permute(i.y+ vec3(0.0, i1.y, 1.0)) + i.x+ vec3(0.0, i1.x, 1.0));
    vec3 m=max(0.5- vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m*=m;
    m*=m;
    vec3 x=2.0*fract(p*C.www)-1.0;
    vec3 h=abs(x)-0.5;
    vec3 ox=floor(x+0.5);
    vec3 a0=x-ox;
    m*=1.8- 0.9* (a0*a0+h*h);
    vec3 g;
    g.x=a0.x*x0.x+h.x*x0.y;
    g.y=a0.y*x12.x+h.y*x12.y;
    g.z=a0.z*x12.z+h.z*x12.w;
    return 130.0*dot(m,g);
}

float fbm(vec2 p){
    float v=0.0;
    float a=0.5;
    for(int i=0;i<6;i++){
        v+=a*snoise(p);
        p*=2.05;
        a*=0.55;
    }
    return v;
}
`

/* ---------------------------------------------------------
   Sky base — kept dark, but with a faint purple undertone
   so the colorful glow of everything else has somewhere
   to bloom into, like the soft background in the glow ref.
--------------------------------------------------------- */

const skyVertexShader = /* glsl */`
varying vec2 vUv;
void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const skyFragmentShader = /* glsl */`
precision highp float;
uniform vec3 uColorTop;
uniform vec3 uColorBottom;
varying vec2 vUv;

void main(){
    vec3 color = mix(uColorBottom, uColorTop, vUv.y);
    gl_FragColor = vec4(color, 1.0);
}
`

function SkyBase() {
    const viewport = useThree((s) => s.viewport)

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: skyVertexShader,
                fragmentShader: skyFragmentShader,
                uniforms: {
                    uColorTop: { value: new THREE.Color("#02020a") },
                    uColorBottom: { value: new THREE.Color("#0a0616") },
                },
                depthWrite: false,
            }),
        []
    )

    useEffect(() => () => material.dispose(), [material])

    const width = viewport.width * PADDING * 1.6
    const height = viewport.height * PADDING * 1.6

    return (
        <mesh position={[0, 0, FIELD_Z - 4]} material={material} renderOrder={-4}>
            <planeGeometry args={[width, height]} />
        </mesh>
    )
}

/* ---------------------------------------------------------
   Dust band — now carries the same soft chromatic blend as
   the glow reference: amber -> pink -> violet -> cyan, all
   heavily blurred together rather than flat grey-blue.
--------------------------------------------------------- */

const dustBandFragmentShader = /* glsl */`
precision highp float;
uniform float uTime;
uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
varying vec2 vUv;

${noiseGLSL}

void main(){
    vec2 uv = vUv * 2.0 - 1.0;

    float angle = radians(-32.0);
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 p = rot * uv;

    float band = exp(-pow(p.y, 2.0) * 6.0);
    float haze = 0.5 + 0.5 * fbm(p * 1.1 + vec2(uTime * 0.006, 0.0));
    float wisps = smoothstep(0.25, 0.85, fbm(p * 2.0 - 12.0 + uTime * 0.004));

    // slow color drift across the band, all heavily blurred together
    float mixA = 0.5 + 0.5 * fbm(p * 0.6 + uTime * 0.01 + 4.0);
    float mixB = 0.5 + 0.5 * fbm(p * 0.6 - uTime * 0.008 + 22.0);

    vec3 color = mix(uColorAmber, uColorPink, mixA);
    color = mix(color, uColorViolet, mixB);
    color = mix(color, uColorCyan, smoothstep(0.3, 0.9, haze));

    float alpha = band * haze * wisps * 0.3;

    float vignette = smoothstep(1.6, 0.3, length(uv));
    alpha *= vignette;

    gl_FragColor = vec4(color, alpha);
}
`

function DustBand() {
    const viewport = useThree((s) => s.viewport)

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: skyVertexShader,
                fragmentShader: dustBandFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uColorAmber: { value: new THREE.Color("#b0fcff") },
                    uColorPink: { value: new THREE.Color("#00e1ff") },
                    uColorViolet: { value: new THREE.Color("#0077ff") },
                    uColorCyan: { value: new THREE.Color("#0077ff") },
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        []
    )

    useEffect(() => () => material.dispose(), [material])
    useFrame((_, delta) => { material.uniforms.uTime.value += delta })

    const width = viewport.width * PADDING * 1.5
    const height = viewport.height * PADDING * 1.5

    return (
        <mesh position={[0, 0, FIELD_Z - 3]} material={material} renderOrder={-3}>
            <planeGeometry args={[width, height]} />
        </mesh>
    )
}

/* ---------------------------------------------------------
   Dense small stars — each one now carries a soft fuzzy
   chromatic tint (blended from the glow palette) instead of
   plain white, with a wider, softer blur radius.
--------------------------------------------------------- */

const starVertexShader = /* glsl */`
precision highp float;

attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
attribute float aHue;

uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;

varying float vAlpha;
varying float vHue;

void main(){
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.45 + 0.55 * sin(uTime * aSpeed + aPhase);
    vAlpha = twinkle;
    vHue = aHue;

    gl_PointSize = aSize * uBaseSize * uPixelRatio * (1.0 / -mvPosition.z);
}
`

const starFragmentShader = /* glsl */`
precision highp float;
uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
uniform vec3 uColorWhite;
varying float vAlpha;
varying float vHue;

void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;

    // wider, softer falloff = fuzzier / more blurred glow
    float core = smoothstep(1.0, 0.0, d);
    core = pow(core, 1.6);

    // most stars stay near-white, a slice of them pick up glow-palette hues
    vec3 color;
    if (vHue < 0.25) {
        color = mix(uColorWhite, uColorCyan, vHue / 0.25);
    } else if (vHue < 0.5) {
        color = mix(uColorCyan, uColorViolet, (vHue - 0.25) / 0.25);
    } else if (vHue < 0.75) {
        color = mix(uColorViolet, uColorPink, (vHue - 0.5) / 0.25);
    } else {
        color = mix(uColorPink, uColorAmber, (vHue - 0.75) / 0.25);
    }

    gl_FragColor = vec4(color, core * vAlpha);
}
`

function SmallStars() {
    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const materialRef = useRef()

    const { geometry, material } = useMemo(() => {
        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const positions = new Float32Array(SMALL_STAR_COUNT * 3)
        const phases = new Float32Array(SMALL_STAR_COUNT)
        const speeds = new Float32Array(SMALL_STAR_COUNT)
        const sizes = new Float32Array(SMALL_STAR_COUNT)
        const hues = new Float32Array(SMALL_STAR_COUNT)

        for (let i = 0; i < SMALL_STAR_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * w
            positions[i * 3 + 1] = (Math.random() - 0.5) * h
            positions[i * 3 + 2] = FIELD_Z

            phases[i] = Math.random() * Math.PI * 2
            speeds[i] = 0.6 + Math.random() * 2.2
            // bigger + softer than before so the blur reads clearly
            sizes[i] = 0.9 + Math.random() * Math.random() * 2.1
            // most stay white (vHue kept near 0 via low probability of color pickup)
            hues[i] = Math.random() < 0.35 ? Math.random() : 0.0
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
        geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1))
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
        geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1))

        const material = new THREE.ShaderMaterial({
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: gl.getPixelRatio() },
                uBaseSize: { value: 22.0 },
                uColorWhite: { value: new THREE.Color("#eef4ff") },
                uColorAmber: { value: new THREE.Color("#e2541f") },
                uColorPink: { value: new THREE.Color("#f0207a") },
                uColorViolet: { value: new THREE.Color("#5a24d6") },
                uColorCyan: { value: new THREE.Color("#1fa8ff") },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })

        return { geometry, material }
    }, [viewport.width, viewport.height, gl])

    materialRef.current = material

    useEffect(() => () => {
        geometry.dispose()
        material.dispose()
    }, [geometry, material])

    useFrame((_, delta) => { materialRef.current.uniforms.uTime.value += delta })

    return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />
}

/* ---------------------------------------------------------
   Milky-way star trail — a dense ribbon of small stars that
   follows a gently wandering diagonal path (not a straight
   line), tapering thinner and sparser at each end and denser
   toward the centerline, the way the star trail reads in the
   reference photo. Reuses the same star shader as SmallStars.
--------------------------------------------------------- */

const MILKY_WAY_STAR_COUNT = 2600

function generateMilkyWayPositions(count, w, h) {
    const angle = THREE.MathUtils.degToRad(-32)
    const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
    const normal = new THREE.Vector2(-dir.y, dir.x)
    const length = w * 1.5

    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
        const t = Math.random() // position along the trail, 0..1

        // organic wander of the trail's centerline — a couple of
        // overlapping sine waves so it isn't a perfectly straight band
        const wave =
            Math.sin(t * Math.PI * 2.2 + 1.3) * 0.55 +
            Math.sin(t * Math.PI * 5.3 + 4.1) * 0.22

        // wider and denser through the middle, thinning toward the ends
        const taper = 0.25 + 0.75 * Math.sin(t * Math.PI)

        // gaussian-ish cross-section via product of two centered randoms
        const spread = (Math.random() - 0.5) * (Math.random() - 0.5) * 4.0

        const along = (t - 0.5) * length
        const across = (wave + spread) * taper * (h * 0.18)

        const x = dir.x * along + normal.x * across
        const y = dir.y * along + normal.y * across
        const z = FIELD_Z - 0.4 + Math.random() * 1.2

        positions[i * 3 + 0] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z
    }

    return positions
}

function MilkyWayTrail() {
    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const materialRef = useRef()

    const { geometry, material } = useMemo(() => {
        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const positions = generateMilkyWayPositions(MILKY_WAY_STAR_COUNT, w, h)
        const phases = new Float32Array(MILKY_WAY_STAR_COUNT)
        const speeds = new Float32Array(MILKY_WAY_STAR_COUNT)
        const sizes = new Float32Array(MILKY_WAY_STAR_COUNT)
        const hues = new Float32Array(MILKY_WAY_STAR_COUNT)

        for (let i = 0; i < MILKY_WAY_STAR_COUNT; i++) {
            phases[i] = Math.random() * Math.PI * 2
            speeds[i] = 0.5 + Math.random() * 1.8
            // small and fine — this trail reads as texture, not individual bright stars
            sizes[i] = 0.5 + Math.random() * Math.random() * 1.4
            hues[i] = Math.random() < 0.3 ? Math.random() : 0.0
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
        geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1))
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
        geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1))

        const material = new THREE.ShaderMaterial({
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: gl.getPixelRatio() },
                uBaseSize: { value: 12.0 },
                uColorWhite: { value: new THREE.Color("#eef4ff") },
                uColorAmber: { value: new THREE.Color("#e2541f") },
                uColorPink: { value: new THREE.Color("#f0207a") },
                uColorViolet: { value: new THREE.Color("#5a24d6") },
                uColorCyan: { value: new THREE.Color("#1fa8ff") },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })

        return { geometry, material }
    }, [viewport.width, viewport.height, gl])

    materialRef.current = material

    useEffect(() => () => {
        geometry.dispose()
        material.dispose()
    }, [geometry, material])

    useFrame((_, delta) => { materialRef.current.uniforms.uTime.value += delta })

    return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />
}

/* ---------------------------------------------------------
   Star clusters — a handful of tightly packed clumps of
   stars (gaussian-distributed around random centers), like
   the small dense knots of stars visible in the reference
   photo rather than a perfectly even scatter everywhere.
--------------------------------------------------------- */

const CLUSTER_COUNT = 6
const CLUSTER_STAR_COUNT = 900

function gaussianRandom() {
    let u = 0
    let v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function generateClusterPositions(count, w, h) {
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

    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        let r = Math.random() * totalWeight
        let chosen = centers[0]
        for (const c of centers) {
            if (r < c.weight) {
                chosen = c
                break
            }
            r -= c.weight
        }

        const x = chosen.x + gaussianRandom() * chosen.radius
        const y = chosen.y + gaussianRandom() * chosen.radius
        const z = FIELD_Z - 0.3 + Math.random() * 1.0

        positions[i * 3 + 0] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z
    }

    return positions
}

function StarClusters() {
    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const materialRef = useRef()

    const { geometry, material } = useMemo(() => {
        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const positions = generateClusterPositions(CLUSTER_STAR_COUNT, w, h)
        const phases = new Float32Array(CLUSTER_STAR_COUNT)
        const speeds = new Float32Array(CLUSTER_STAR_COUNT)
        const sizes = new Float32Array(CLUSTER_STAR_COUNT)
        const hues = new Float32Array(CLUSTER_STAR_COUNT)

        for (let i = 0; i < CLUSTER_STAR_COUNT; i++) {
            phases[i] = Math.random() * Math.PI * 2
            speeds[i] = 0.6 + Math.random() * 2.0
            // a bit brighter/bigger than the fine trail stars so clusters pop
            sizes[i] = 1.0 + Math.random() * Math.random() * 2.4
            hues[i] = Math.random() < 0.3 ? Math.random() : 0.0
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
        geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1))
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
        geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1))

        const material = new THREE.ShaderMaterial({
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: gl.getPixelRatio() },
                uBaseSize: { value: 15.0 },
                uColorWhite: { value: new THREE.Color("#eef4ff") },
                uColorAmber: { value: new THREE.Color("#e2541f") },
                uColorPink: { value: new THREE.Color("#f0207a") },
                uColorViolet: { value: new THREE.Color("#5a24d6") },
                uColorCyan: { value: new THREE.Color("#1fa8ff") },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })

        return { geometry, material }
    }, [viewport.width, viewport.height, gl])

    materialRef.current = material

    useEffect(() => () => {
        geometry.dispose()
        material.dispose()
    }, [geometry, material])

    useFrame((_, delta) => { materialRef.current.uniforms.uTime.value += delta })

    return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />
}

/* ---------------------------------------------------------
   Bright sparkle stars — each gets a wide blurred color halo
   behind the sharp sparkle core, like the soft chromatic
   bloom around the letters in the glow reference.
--------------------------------------------------------- */

function makeSparkleTexture() {
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    const c = size / 2

    ctx.clearRect(0, 0, size, size)

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

// wide, very soft radial blob used for the blurred color halo layer
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

const sparkleVertexShader = /* glsl */`
precision highp float;
attribute float aPhase;
attribute float aSize;
attribute float aHue;
uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;
varying float vAlpha;
varying float vHue;

void main(){
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = 0.7 + 0.3 * sin(uTime * 0.8 + aPhase);
    vHue = aHue;
    gl_PointSize = aSize * uBaseSize * uPixelRatio * (1.0 / -mvPosition.z);
}
`

const sparkleFragmentShader = /* glsl */`
precision highp float;
uniform sampler2D uMap;
varying float vAlpha;
void main(){
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
}
`

const haloFragmentShader = /* glsl */`
precision highp float;
uniform sampler2D uMap;
uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
varying float vAlpha;
varying float vHue;

void main(){
    vec4 tex = texture2D(uMap, gl_PointCoord);

    vec3 color;
    if (vHue < 0.33) {
        color = mix(uColorCyan, uColorViolet, vHue / 0.33);
    } else if (vHue < 0.66) {
        color = mix(uColorViolet, uColorPink, (vHue - 0.33) / 0.33);
    } else {
        color = mix(uColorPink, uColorAmber, (vHue - 0.66) / 0.34);
    }

    gl_FragColor = vec4(color, tex.a * vAlpha * 0.55);
}
`

function BrightStars() {
    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const sparkleMatRef = useRef()
    const haloMatRef = useRef()

    const { geometry, sparkleMaterial, haloMaterial, sparkleTex, haloTex } = useMemo(() => {
        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const positions = new Float32Array(BRIGHT_STAR_COUNT * 3)
        const phases = new Float32Array(BRIGHT_STAR_COUNT)
        const sizes = new Float32Array(BRIGHT_STAR_COUNT)
        const hues = new Float32Array(BRIGHT_STAR_COUNT)

        for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * w
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
                uPixelRatio: { value: gl.getPixelRatio() },
                uBaseSize: { value: 16.0 },
                uMap: { value: sparkleTex },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })

        // bigger + blurrier + colorful, sits behind the sharp sparkle
        const haloMaterial = new THREE.ShaderMaterial({
            vertexShader: sparkleVertexShader,
            fragmentShader: haloFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: gl.getPixelRatio() },
                uBaseSize: { value: 58.0 },
                uMap: { value: haloTex },
                uColorAmber: { value: new THREE.Color("#e2541f") },
                uColorPink: { value: new THREE.Color("#f0207a") },
                uColorViolet: { value: new THREE.Color("#5a24d6") },
                uColorCyan: { value: new THREE.Color("#1fa8ff") },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })

        return { geometry, sparkleMaterial, haloMaterial, sparkleTex, haloTex }
    }, [viewport.width, viewport.height, gl])

    sparkleMatRef.current = sparkleMaterial
    haloMatRef.current = haloMaterial

    useEffect(() => () => {
        geometry.dispose()
        sparkleMaterial.dispose()
        haloMaterial.dispose()
        sparkleTex.dispose()
        haloTex.dispose()
    }, [geometry, sparkleMaterial, haloMaterial, sparkleTex, haloTex])

    useFrame((_, delta) => {
        sparkleMatRef.current.uniforms.uTime.value += delta
        haloMatRef.current.uniforms.uTime.value += delta
    })

    return (
        <>
            <points geometry={geometry} material={haloMaterial} frustumCulled={false} renderOrder={-1.5} />
            <points geometry={geometry} material={sparkleMaterial} frustumCulled={false} renderOrder={-1} />
        </>
    )
}

/* ---------------------------------------------------------
   Fine dust particles — now tinted with the same glow
   palette and given a wider, blurrier point size.
--------------------------------------------------------- */

const duskParticleVertex = /* glsl */`
precision highp float;
attribute float aSeed;
attribute float aSize;
attribute float aPhase;
attribute float aHue;
uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;
varying float vAlpha;
varying float vHue;

${noiseGLSL}

void main(){
    vec3 pos = position;
    float t = uTime * 0.03;
    pos.x += snoise(pos.xy * 0.1 + aSeed * 20.0 + t) * 0.5;
    pos.y += snoise(pos.xy * 0.1 + aSeed * 33.0 - t) * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = 0.3 + 0.3 * sin(uTime * 0.25 + aPhase);
    vHue = aHue;
    gl_PointSize = aSize * uBaseSize * uPixelRatio * (1.0 / -mvPosition.z);
}
`

const duskParticleFragment = /* glsl */`
precision highp float;
uniform vec3 uColorAmber;
uniform vec3 uColorPink;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
varying float vAlpha;
varying float vHue;

void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float glow = pow(smoothstep(1.0, 0.0, d), 1.6);

    vec3 color;
    if (vHue < 0.33) {
        color = mix(uColorCyan, uColorViolet, vHue / 0.33);
    } else if (vHue < 0.66) {
        color = mix(uColorViolet, uColorPink, (vHue - 0.33) / 0.33);
    } else {
        color = mix(uColorPink, uColorAmber, (vHue - 0.66) / 0.34);
    }

    gl_FragColor = vec4(color, glow * vAlpha * 0.4);
}
`

function DustMotes() {
    const viewport = useThree((s) => s.viewport)
    const gl = useThree((s) => s.gl)
    const materialRef = useRef()

    const { geometry, material } = useMemo(() => {
        const w = viewport.width * PADDING
        const h = viewport.height * PADDING

        const bandAngle = THREE.MathUtils.degToRad(-32)
        const dir = new THREE.Vector2(Math.cos(bandAngle), Math.sin(bandAngle))
        const normal = new THREE.Vector2(-dir.y, dir.x)

        const positions = new Float32Array(DUST_LAYER_COUNT * 3)
        const seeds = new Float32Array(DUST_LAYER_COUNT)
        const sizes = new Float32Array(DUST_LAYER_COUNT)
        const phases = new Float32Array(DUST_LAYER_COUNT)
        const hues = new Float32Array(DUST_LAYER_COUNT)

        for (let i = 0; i < DUST_LAYER_COUNT; i++) {
            const along = (Math.random() - 0.5) * w * 1.3
            const across = (Math.random() - 0.5) * (Math.random() - 0.5) * h * 1.4
            const x = dir.x * along + normal.x * across
            const y = dir.y * along + normal.y * across

            positions[i * 3 + 0] = x
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = FIELD_Z - 1 + Math.random() * 2

            seeds[i] = Math.random()
            sizes[i] = 1.4 + Math.random() * 3.2
            phases[i] = Math.random() * Math.PI * 2
            hues[i] = Math.random()
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1))
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
        geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1))

        const material = new THREE.ShaderMaterial({
            vertexShader: duskParticleVertex,
            fragmentShader: duskParticleFragment,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: gl.getPixelRatio() },
                uBaseSize: { value: 13.0 },
                uColorAmber: { value: new THREE.Color("#e2541f") },
                uColorPink: { value: new THREE.Color("#f0207a") },
                uColorViolet: { value: new THREE.Color("#5a24d6") },
                uColorCyan: { value: new THREE.Color("#1fa8ff") },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })

        return { geometry, material }
    }, [viewport.width, viewport.height, gl])

    materialRef.current = material

    useEffect(() => () => {
        geometry.dispose()
        material.dispose()
    }, [geometry, material])

    useFrame((_, delta) => { materialRef.current.uniforms.uTime.value += delta })

    return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />
}

/* ---------------------------------------------------------
   Shooting stars — more frequent now, colored streaks pulled
   from the same glow palette, plus occasional meteor-shower
   bursts of several streaks in quick succession.
--------------------------------------------------------- */

function makeStreakTexture(colorStops) {
    const width = 256
    const height = 8
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")

    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, "rgba(255,255,255,0)")
    gradient.addColorStop(0.55, colorStops.mid)
    gradient.addColorStop(0.9, colorStops.bright)
    gradient.addColorStop(1, "rgba(255,255,255,1)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
}

const STREAK_PALETTES = [
    { mid: "rgba(70,170,255,0.5)", bright: "rgba(180,225,255,0.9)" }, // azure blue
    { mid: "rgba(150,90,235,0.5)", bright: "rgba(210,185,255,0.9)" }, // indigo violet
    { mid: "rgba(240,50,130,0.5)", bright: "rgba(255,180,205,0.9)" }, // magenta
    { mid: "rgba(226,90,40,0.5)", bright: "rgba(255,190,150,0.9)" }, // rust ember
]

function ShootingStars() {
    const scene = useThree((s) => s.scene)
    const viewport = useThree((s) => s.viewport)

    const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
    const textures = useMemo(() => STREAK_PALETTES.map(makeStreakTexture), [])

    const activeRef = useRef([])
    const timeoutsRef = useRef([])
    const mountedRef = useRef(true)
    const nextSpawnRef = useRef(1.5 + Math.random() * 2.5)
    const nextShowerRef = useRef(10 + Math.random() * 12)
    const viewportRef = useRef(viewport)
    viewportRef.current = viewport

    const spawnStreak = useCallback(
        (dim = false) => {
            if (!mountedRef.current) return
            const vp = viewportRef.current
            const w = vp.width * PADDING
            const h = vp.height * PADDING

            const angle = THREE.MathUtils.degToRad(-18 - Math.random() * 20)
            const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle))

            const margin = Math.max(w, h) * 0.25
            const startX = -w / 2 - margin
            const startY = h * (Math.random() * 0.7 - 0.15)

            const speed = (dim ? 3 : 3.5) + Math.random() * 3
            const length = (dim ? 2.5 : 3.5) + Math.random() * 2.5

            const texture = textures[Math.floor(Math.random() * textures.length)]

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })

            const mesh = new THREE.Mesh(geometry, material)
            mesh.scale.set(length, dim ? 0.015 : 0.025, 1)
            mesh.rotation.z = angle
            mesh.position.set(startX, startY, FIELD_Z + 1)
            scene.add(mesh)

            activeRef.current.push({
                mesh,
                material,
                dir,
                speed,
                travel: 0,
                maxTravel: w + margin * 2,
                peakOpacity: dim ? 0.6 : 1.0,
            })
        },
        [scene, geometry, textures]
    )

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            timeoutsRef.current.forEach(clearTimeout)
            activeRef.current.forEach((star) => {
                scene.remove(star.mesh)
                star.material.dispose()
            })
            activeRef.current = []
            geometry.dispose()
            textures.forEach((t) => t.dispose())
        }
    }, [scene, geometry, textures])

    useFrame((_, delta) => {
        nextSpawnRef.current -= delta
        if (nextSpawnRef.current <= 0) {
            spawnStreak(false)
            nextSpawnRef.current = 4 + Math.random() * 6
        }

        nextShowerRef.current -= delta
        if (nextShowerRef.current <= 0) {
            const count = 5 + Math.floor(Math.random() * 6)
            for (let i = 0; i < count; i++) {
                const id = setTimeout(() => spawnStreak(true), i * (70 + Math.random() * 120))
                timeoutsRef.current.push(id)
            }
            nextShowerRef.current = 16 + Math.random() * 18
        }

        const remaining = []
        for (const star of activeRef.current) {
            star.travel += star.speed * delta
            star.mesh.position.x += star.dir.x * star.speed * delta
            star.mesh.position.y += star.dir.y * star.speed * delta

            const t = star.travel / star.maxTravel
            const fadeIn = Math.min(t / 0.06, 1)
            const fadeOut = 1 - Math.min(Math.max((t - 0.75) / 0.25, 0), 1)
            star.material.opacity = star.peakOpacity * fadeIn * fadeOut

            if (t >= 1) {
                scene.remove(star.mesh)
                star.material.dispose()
            } else {
                remaining.push(star)
            }
        }
        activeRef.current = remaining
    })

    return null
}

/* ---------------------------------------------------------
   Exported renderer
--------------------------------------------------------- */

export function StarfieldRenderer() {
    return (
        <>
            <SkyBase />
            <DustBand />
            <DustMotes />
            <MilkyWayTrail />
            <StarClusters />
            <SmallStars />
            <BrightStars />
            <ShootingStars />
        </>
    )
}