// src/renderers/RendererManager.jsx

export function RendererManager() {

    useFrame((state, delta) => {

        updatePlayerRenderer(delta)
        updateBossRenderer(delta)
        updateAsteroidRenderer(delta)
        
        updateBulletRenderer(delta)
        updateMissileRenderer(delta)
        updateLaserRenderer(delta)
        updateGrenadeRenderer(delta)
        updateExplosionRenderer(delta)


        updateDeflectRenderer(delta)
        updateSmokeRenderer(delta)
        updateExhaustRenderer(delta)
        updateThrowerRenderer(delta)
        updateTrailRenderer(delta)
        updateArcRenderer(delta)
        updateBossMount(delta)
        updateGunMount(delta)
        updateGunRenderer(delta)
        updateFlashRenderer(delta)
        updateShockwaveRenderer(delta)
        updateSparkRenderer(delta)
        updateDebrisRenderer(delta)



    })

    return null

}