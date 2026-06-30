// src/screens/PlayScreen.jsx

import { useFrame } from '@react-three/fiber'
import {
    EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA,
    // ShockWave,
    // Glitch
} from '@react-three/postprocessing';
import { Canvas } from '@react-three/fiber'
import { BlendFunction } from 'postprocessing'
import { Sparkles, Trail, Float } from '@react-three/drei'
import { useRef } from 'react'
import { HUD } from '../components/HUD.jsx'
import { world } from '../ecs/constants/world.js'
import { gameLoop } from '../ecs/systems/gameLoop.js'

import { PlayerRenderer } from '../renderers/PlayerRenderer.jsx'
import { AsteroidRenderer } from '../renderers/AsteroidRenderer.jsx'
import { BulletRenderer } from '../renderers/BulletRenderer.jsx'

export function GameLoop({ keysRef, paused }) {
    const shootState = useRef({ timer: 0 })

    useFrame((_, delta) => {

        if (paused) return

        world.time.delta = Math.min(delta, 0.05)
        world.time.elapsed += world.time.delta
        gameLoop(keysRef.current, shootState.current)
    })

    return null
}

export function PlayScreen({ keysRef, paused, onPause }) {
    return (
        <div className="border-2 border-green-400">
            <div className="relative flex-1 h-[calc(100vh-120px)] px-4">

                <HUD paused={paused} onPause={onPause} />

                <Canvas
                    orthographic
                    camera={{
                        zoom: 60,
                        position: [0, 0, 10],
                        near: 0.1,
                        far: 100,
                    }}
                    gl={{
                        antialias: false,
                        powerPreference: "high-performance",
                    }}>
                    <GameLoop keysRef={keysRef} paused={paused} />

                    <ambientLight intensity={0.7} />
                    <directionalLight position={[5, 5, 5]} intensity={1} />
                    <pointLight position={[0, 0, 5]} intensity={2} />

                    <PlayerRenderer />
                    <AsteroidRenderer />
                    <BulletRenderer />

                    <EffectComposer multisampling={0}>

                        <Bloom
                            intensity={2.5}
                            blendFunction={BlendFunction.DARKEN}
                            luminanceThreshold={0.02}
                            luminanceSmoothing={0.2}
                            height={300}
                            mipmapBlur
                        />

                        <ChromaticAberration
                            blendFunction={BlendFunction.DARKEN} offset={[0.0025, 0.0025]}
                        />
                        <Noise opacity={0.025} />
                        <Vignette
                            blendFunction={BlendFunction.DARKEN}
                            eskil={false}
                            offset={0.12}
                            darkness={0.9}
                        />

                    </EffectComposer>

                    <SMAA />
                </Canvas>

            </div>
        </div>
    )
}