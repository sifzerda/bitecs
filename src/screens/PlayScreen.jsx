// src/screens/PlayScreen.jsx

// src/screens/PlayScreen.jsx

import { useFrame } from '@react-three/fiber'
import {
    EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA,
    // ShockWave,
    // Glitch
} from '@react-three/postprocessing';
import { Canvas } from '@react-three/fiber'
import { BlendFunction } from 'postprocessing'
import {
    Environment,
    //Trail -- effect to make moving things trail 
    //Float -- effect for floating power-ups
} from '@react-three/drei'
import { useRef } from 'react'
import { HUD } from '../components/HUD.jsx'
import { world } from '../ecs/constants/world.js'
import { gameLoop } from '../state/gameLoop.js'

import { PlayerRenderer } from '../renderers/PlayerRenderer.jsx'
import { AsteroidRenderer } from '../renderers/AsteroidRenderer.jsx'
import { BulletRenderer } from '../renderers/BulletRenderer.jsx'

import { MissileRenderer } from '../renderers/MissileRenderer.jsx'
import { LaserRenderer } from '../renderers/LaserRenderer.jsx'

import { SparkRenderer } from '../renderers/SparkRenderer.jsx'
import { BossRenderer } from '../renderers/BossRenderer.jsx'
import { BossBulletRenderer } from '../renderers/BossBulletRenderer.jsx'
import { ExhaustRenderer } from '../renderers/ExhaustRenderer.jsx'
import { BoostRenderer } from '../renderers/BoostRenderer.jsx'


export function GameLoop({ keysRef, paused }) {
    const shootState = useRef({ timer: 0 })

    useFrame((_, delta) => {

        if (paused) return

        world.time.delta = Math.min(delta, 0.05)
        world.time.elapsed += world.time.delta
        gameLoop(shootState.current)
    })

    return null
}

export function PlayScreen({ keysRef, paused, onPause }) {
    return (
        <div className="border-2 border-green-400 flex flex-col h-[calc(100vh-120px)]">

            <HUD paused={paused} onPause={onPause} />

            <div className="relative flex-1 px-4">

                <Canvas
                    orthographic
                    camera={{ zoom: 60, position: [0, 0, 10], near: 0.1, far: 100 }}
                    gl={{ antialias: false, powerPreference: "high-performance" }}
                    dpr={[1, 2]}>

                    <GameLoop keysRef={keysRef} paused={paused} />

                    {/* Feeds colorful reflections (skyscraper-glass cockpit, chrome, etc.)
                        into materials without rendering a visible skybox — background={false}
                        keeps your actual scene background untouched. */}
                    <Environment preset="city" background={false} />

                    <ambientLight intensity={1.1} />
                    <directionalLight position={[5, 8, 6]} intensity={2.0} />
                    <pointLight position={[0, 0, 6]} intensity={4} color="#ffffff" />

                    <PlayerRenderer />
                    <ExhaustRenderer />
                    <BoostRenderer />
                    <AsteroidRenderer />
                    <BulletRenderer />

                    <MissileRenderer />
                    <LaserRenderer />

                    <SparkRenderer />


                    <BossRenderer />
                    <BossBulletRenderer />

                    <EffectComposer multisampling={0}>

                        <Bloom
                            intensity={1.2}
                            luminanceThreshold={0.4}
                            luminanceSmoothing={0.7}
                            mipmapBlur
                        />

                        {/* Slight RGB split near screen edges */}
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0015, 0.001]} />

                        {/* Darken screen edges */}
                        <Vignette eskil={false} offset={0.25} darkness={0.45} />

                        <Noise opacity={0.02} />
                        {/* postprocessing */}
                    </EffectComposer>

                    <SMAA />
                </Canvas>

            </div>
        </div>
    )
}