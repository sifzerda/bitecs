// src/screens/PlayScreen.jsx

import { Suspense, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Stats } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette, Noise, SMAA } from "@react-three/postprocessing"
import { HUD } from "../components/HUD.jsx"
import { world } from "../ecs/constants/world.js"
import { gameLoop } from "../state/gameLoop.js"
import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { useSettings, QUALITY_DPR } from "../ecs/systems/settings.js"
import MouseWorldTracker from "../ecs/systems/MouseWorldTracker.jsx"
import { PlayerRenderer, BossRenderer } from "../renderers/ShipRenderer.jsx"
import { AsteroidRenderer } from "../renderers/AsteroidRenderer.jsx"
import { BulletRenderer } from "../renderers/BulletRenderer.jsx"
import { MissileRenderer } from "../renderers/MissileRenderer.jsx"
import { ArcRenderer } from "../renderers/ArcRenderer.jsx"
import { GrenadeRenderer } from "../renderers/GrenadeRenderer.jsx"
import { LaserRenderer } from "../renderers/LaserRenderer.jsx"
import { ThrowerRenderer } from "../renderers/ThrowerRenderer.jsx"
import { DeflectRenderer } from "../renderers/DeflectRenderer.jsx"
import { StarfieldRenderer } from "../renderers/StarfieldRenderer.jsx"
import { FlashRenderer } from "../renderers/FlashRenderer.jsx"
import { SparkRenderer } from "../renderers/SparkRenderer.jsx"
import { ExplosionRenderer } from "../renderers/ExplosionRenderer.jsx"
import { GunMount } from "../renderers/GunMount.jsx"
import { DebrisRenderer } from "../renderers/DebrisRenderer.jsx"
import ExhaustRenderer from "../renderers/ExhaustRenderer.jsx"
import { SmokeRenderer } from "../renderers/SmokeRenderer.jsx"
import { TrailRenderer } from "../renderers/TrailRenderer.jsx"

const STEP = 1 / 60

export function GameLoop({ paused }) {

    const accumulator = useRef(0), shoot = useRef({ timer: 0 })

    useFrame((_, delta) => {
        const state = useGameStore.getState()

        if (paused || state.paused || state.screen !== SCREEN.PLAY) { accumulator.current = 0; return }
        accumulator.current += Math.min(delta, 0.1)
        let steps = 0

        while (accumulator.current >= STEP && steps < 6) {
            const latest = useGameStore.getState()

            if (latest.paused || latest.screen !== SCREEN.PLAY) { accumulator.current = 0; break }
            world.time.delta = STEP; world.time.elapsed += STEP
            gameLoop(shoot.current, STEP); accumulator.current -= STEP; steps++
        }
        if (steps === 6 && accumulator.current >= STEP) accumulator.current %= STEP
    }, -1)

    return null
}
export function PlayScreen({ paused, onPause }) {

    const settings = useSettings()

    return (
        <div className="flex h-[calc(100vh-120px)] flex-col border-2 border-green-400">

            <HUD paused={paused} onPause={onPause} />

            <div className="relative min-h-0 flex-1">
                <Canvas orthographic camera={{ zoom: 60, position: [0, 0, 10], near: 0.1, far: 100 }} gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, QUALITY_DPR[settings.quality]]}>
                  
                    <Suspense fallback={null}>
                       
                        <MouseWorldTracker />
                      
                        <GameLoop paused={paused} />
                        <ambientLight intensity={1.1} />
                        <directionalLight position={[5, 8, 6]} intensity={2} />
                        <pointLight position={[0, 0, 6]} intensity={4} />
                        
                        <StarfieldRenderer />
                        <Environment preset="sunset" />
                        
                        <PlayerRenderer />
                        <BossRenderer />
                       
                        <GunMount />
                       
                        <DeflectRenderer />
                       
                        <ExhaustRenderer slot={0} />
                        <ExhaustRenderer slot={1} size={5} nozzleOffset={-0.8} engineGap={0.35} hotCore="#ff8a1a" fireColor="#ff5a12" />
                       
                        <AsteroidRenderer />
                       
                        <BulletRenderer />
                       
                        <MissileRenderer />
                        <GrenadeRenderer />
                       
                        <LaserRenderer source="player" />
                        <LaserRenderer source="boss" />
                        <ArcRenderer source="player" />
                        <ArcRenderer source="boss" renderChainLinks={false} />
                        <ThrowerRenderer source="player" />
                        <ThrowerRenderer source="boss" />
                       
                        <TrailRenderer />
                        <SparkRenderer />
                        <SmokeRenderer />
                        <DebrisRenderer />
                        <ExplosionRenderer />
                        <FlashRenderer />

                        <EffectComposer multisampling={0}>
                            {settings.bloom && <Bloom intensity={1.65} luminanceThreshold={0.35} luminanceSmoothing={0.6} radius={0.9} mipmapBlur />}
                            <Vignette eskil={false} offset={0.25} darkness={0.45} />
                            <Noise opacity={0.018} />
                            <SMAA />
                        </EffectComposer>
                        {settings.fps && <Stats />}

                    </Suspense>

                </Canvas>
            </div>
        </div>
    )
}
