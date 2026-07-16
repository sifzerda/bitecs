// 

// src/debug/BossGunBuilder.jsx


import { useMemo, useRef } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { useControls, folder, button } from 'leva'
import * as THREE from 'three'

import { BOSSES } from '../ecs/constants/bosses.js'
import { GUN_TYPES, DEFAULT_GUN_CONFIG } from '../ecs/constants/gunConfigs.js'
import { buildBossAssets, BossShip, HULL_TEXTURES } from '../renderers/BossRenderer.jsx'
import { GunRenderer } from '../renderers/GunRenderer.jsx'

const GUN_DIRECTION = Math.PI / 2
const deg = (rad) => (rad * 180) / Math.PI
const rad = (d) => (d * Math.PI) / 180

const bossOptions = BOSSES.reduce((acc, b) => {
    acc[b.name] = b.key
    return acc
}, {})

const gunOptions = GUN_TYPES.reduce((acc, g) => {
    acc[g.name] = g.id
    return acc
}, {})

export function BossGunBuilder() {
    // ------------------------------------------------------------
    // Base selection
    // ------------------------------------------------------------
    const { bossKey } = useControls('Builder / Select', {
        bossKey: { options: bossOptions, value: BOSSES.find(b => b.key !== 'player')?.key ?? BOSSES[0].key, label: 'Boss' },
    })

    const baseBossCfg = useMemo(
        () => BOSSES.find(b => b.key === bossKey) ?? BOSSES[0],
        [bossKey]
    )

    // ------------------------------------------------------------
    // Preview transform (not part of any config, just staging)
    // ------------------------------------------------------------
    const preview = useControls('Builder / Preview', {
        show: { value: true, label: 'Show' },
        x: { value: 0, min: -10, max: 10, step: 0.1 },
        y: { value: 0, min: -10, max: 10, step: 0.1 },
        z: { value: 5, min: -10, max: 20, step: 0.1 },
        rotation: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
        scale: { value: 3, min: 0.2, max: 10, step: 0.1 },
    })

    // ------------------------------------------------------------
    // Boss part groups — seeded from baseBossCfg, reset whenever
    // the selected boss changes (dependency array below).
    // ------------------------------------------------------------
    const p = useControls('Boss Parts', {
        Fuselage: folder({
            fuselageColor: { value: baseBossCfg.fuselage.color, label: 'Color' },
            fuselageTipY: { value: baseBossCfg.fuselage.tipY, min: -2, max: 2, step: 0.01, label: 'Tip Y' },
            fuselageShoulderY: { value: baseBossCfg.fuselage.shoulderY, min: -2, max: 2, step: 0.01, label: 'Shoulder Y' },
            fuselageShoulderWidth: { value: baseBossCfg.fuselage.shoulderWidth, min: -2, max: 2, step: 0.01, label: 'Shoulder W' },
            fuselageWaistY: { value: baseBossCfg.fuselage.waistY, min: -2, max: 2, step: 0.01, label: 'Waist Y' },
            fuselageWaistWidth: { value: baseBossCfg.fuselage.waistWidth, min: -2, max: 2, step: 0.01, label: 'Waist W' },
            fuselageTailY: { value: baseBossCfg.fuselage.tailY, min: -2, max: 2, step: 0.01, label: 'Tail Y' },
            fuselageTailWidth: { value: baseBossCfg.fuselage.tailWidth, min: -2, max: 2, step: 0.01, label: 'Tail W' },
            fuselageNotchY: { value: baseBossCfg.fuselage.notchY, min: -2, max: 2, step: 0.01, label: 'Notch Y' },
        }, { collapsed: true }),

        Cockpit: folder({
            cockpitColor: { value: baseBossCfg.cockpit.color, label: 'Color' },
            cockpitTopY: { value: baseBossCfg.cockpit.topY, min: -2, max: 2, step: 0.01 },
            cockpitTopWidth: { value: baseBossCfg.cockpit.topWidth, min: 0, max: 1, step: 0.01 },
            cockpitMidY: { value: baseBossCfg.cockpit.midY, min: -2, max: 2, step: 0.01 },
            cockpitMidWidth: { value: baseBossCfg.cockpit.midWidth, min: 0, max: 1, step: 0.01 },
            cockpitBottomY: { value: baseBossCfg.cockpit.bottomY, min: -2, max: 2, step: 0.01 },
            cockpitBottomWidth: { value: baseBossCfg.cockpit.bottomWidth, min: 0, max: 1, step: 0.01 },
        }, { collapsed: true }),

        Wing: folder({
            wingColor: { value: baseBossCfg.wing.color, label: 'Color' },
            wingRootX: { value: baseBossCfg.wing.rootX, min: -2, max: 2, step: 0.01 },
            wingRootY: { value: baseBossCfg.wing.rootY, min: -2, max: 2, step: 0.01 },
            wingTipX: { value: baseBossCfg.wing.tipX, min: -2, max: 2, step: 0.01 },
            wingTipY: { value: baseBossCfg.wing.tipY, min: -2, max: 2, step: 0.01 },
            wingTrailX: { value: baseBossCfg.wing.trailX, min: -2, max: 2, step: 0.01 },
            wingTrailY: { value: baseBossCfg.wing.trailY, min: -2, max: 2, step: 0.01 },
            wingInnerX: { value: baseBossCfg.wing.innerX, min: -2, max: 2, step: 0.01 },
            wingInnerY: { value: baseBossCfg.wing.innerY, min: -2, max: 2, step: 0.01 },
        }, { collapsed: true }),

        WingPanel: folder({
            wingPanelColor: { value: baseBossCfg.wingPanel.color, label: 'Color' },
            wingPanelInset: { value: baseBossCfg.wingPanel.inset, min: 0, max: 0.5, step: 0.005, label: 'Inset' },
        }, { collapsed: true }),

        Wingtip: folder({
            wingtipColor: { value: baseBossCfg.wingtip.color, label: 'Color' },
            wingtipWidth: { value: baseBossCfg.wingtip.width, min: 0, max: 1, step: 0.005 },
            wingtipHeight: { value: baseBossCfg.wingtip.height, min: 0, max: 1, step: 0.005 },
            wingtipOffsetX: { value: baseBossCfg.wingtip.offsetX, min: -2, max: 2, step: 0.01 },
            wingtipOffsetY: { value: baseBossCfg.wingtip.offsetY, min: -2, max: 2, step: 0.01 },
            wingtipZOffset: { value: baseBossCfg.wingtip.zOffset, min: -0.2, max: 0.2, step: 0.005 },
        }, { collapsed: true }),

        Horn: folder({
            hornEnabled: { value: baseBossCfg.horn.enabled, label: 'Enabled' },
            hornColor: { value: baseBossCfg.horn.color },
            hornBaseWidth: { value: baseBossCfg.horn.baseWidth, min: 0, max: 1, step: 0.005 },
            hornLength: { value: baseBossCfg.horn.length, min: 0, max: 2, step: 0.01 },
            hornCurveAmount: { value: baseBossCfg.horn.curveAmount, min: -1, max: 1, step: 0.01 },
            hornOffsetX: { value: baseBossCfg.horn.offsetX, min: -2, max: 2, step: 0.01 },
            hornOffsetY: { value: baseBossCfg.horn.offsetY, min: -2, max: 2, step: 0.01 },
            hornSweepDeg: { value: baseBossCfg.horn.sweepDeg, min: -180, max: 180, step: 1 },
            hornTiltDeg: { value: baseBossCfg.horn.tiltDeg, min: -180, max: 180, step: 1 },
        }, { collapsed: true }),

        Decal: folder({
            decalEnabled: { value: baseBossCfg.decal.enabled, label: 'Enabled' },
            decalColor: { value: baseBossCfg.decal.color },
            decalWidth: { value: baseBossCfg.decal.width, min: 0, max: 1, step: 0.005 },
            decalLength: { value: baseBossCfg.decal.length, min: 0, max: 2, step: 0.01 },
            decalOffsetX: { value: baseBossCfg.decal.offsetX, min: -2, max: 2, step: 0.01 },
            decalOffsetY: { value: baseBossCfg.decal.offsetY, min: -2, max: 2, step: 0.01 },
            decalTiltDeg: { value: baseBossCfg.decal.tiltDeg, min: -180, max: 180, step: 1 },
            decalZOffset: { value: baseBossCfg.decal.zOffset, min: -0.2, max: 0.2, step: 0.001 },
        }, { collapsed: true }),

        CockpitGlass: folder({
            cockpitGlassEnabled: { value: baseBossCfg.cockpitGlass.enabled, label: 'Enabled' },
            cockpitGlassInset: { value: baseBossCfg.cockpitGlass.inset, min: 0, max: 0.5, step: 0.005 },
            cockpitGlassZOffset: { value: baseBossCfg.cockpitGlass.zOffset, min: -0.3, max: 0.3, step: 0.005 },
            cockpitGlassColor: { value: baseBossCfg.cockpitGlass.color },
            cockpitGlassMetalness: { value: baseBossCfg.cockpitGlass.metalness, min: 0, max: 1, step: 0.01 },
            cockpitGlassRoughness: { value: baseBossCfg.cockpitGlass.roughness, min: 0, max: 1, step: 0.005 },
            cockpitGlassTransmission: { value: baseBossCfg.cockpitGlass.transmission, min: 0, max: 1, step: 0.01 },
            cockpitGlassThickness: { value: baseBossCfg.cockpitGlass.thickness, min: 0, max: 3, step: 0.01 },
            cockpitGlassIor: { value: baseBossCfg.cockpitGlass.ior, min: 1, max: 2.5, step: 0.01 },
            cockpitGlassClearcoat: { value: baseBossCfg.cockpitGlass.clearcoat, min: 0, max: 1, step: 0.01 },
            cockpitGlassClearcoatRoughness: { value: baseBossCfg.cockpitGlass.clearcoatRoughness, min: 0, max: 1, step: 0.01 },
            cockpitGlassEnvMapIntensity: { value: baseBossCfg.cockpitGlass.envMapIntensity, min: 0, max: 15, step: 0.1 },
            cockpitGlassIridescence: { value: baseBossCfg.cockpitGlass.iridescence, min: 0, max: 15, step: 0.1 },
            cockpitGlassIridescenceIOR: { value: baseBossCfg.cockpitGlass.iridescenceIOR, min: 1, max: 2.5, step: 0.01 },
            cockpitGlassIridescenceThicknessMin: { value: baseBossCfg.cockpitGlass.iridescenceThicknessMin, min: 0, max: 1000, step: 10 },
            cockpitGlassIridescenceThicknessMax: { value: baseBossCfg.cockpitGlass.iridescenceThicknessMax, min: 0, max: 1000, step: 10 },
            cockpitGlassAttenuationColor: { value: baseBossCfg.cockpitGlass.attenuationColor },
            cockpitGlassAttenuationDistance: { value: baseBossCfg.cockpitGlass.attenuationDistance, min: 0, max: 10, step: 0.1 },
        }, { collapsed: true }),

        EngineIntake: folder({
            engineIntakeEnabled: { value: baseBossCfg.engineIntake.enabled, label: 'Enabled' },
            engineIntakeColor: { value: baseBossCfg.engineIntake.color },
            engineIntakeWidth: { value: baseBossCfg.engineIntake.width, min: 0, max: 1, step: 0.005 },
            engineIntakeHeight: { value: baseBossCfg.engineIntake.height, min: 0, max: 1, step: 0.005 },
            engineIntakeOffsetX: { value: baseBossCfg.engineIntake.offsetX, min: -2, max: 2, step: 0.01 },
            engineIntakeOffsetY: { value: baseBossCfg.engineIntake.offsetY, min: -2, max: 2, step: 0.01 },
        }, { collapsed: true }),

        HullVent: folder({
            hullVentEnabled: { value: baseBossCfg.hullVent.enabled, label: 'Enabled' },
            hullVentColor: { value: baseBossCfg.hullVent.color },
            hullVentCount: { value: baseBossCfg.hullVent.count, min: 0, max: 16, step: 1 },
            hullVentWidth: { value: baseBossCfg.hullVent.width, min: 0, max: 1, step: 0.005 },
            hullVentHeight: { value: baseBossCfg.hullVent.height, min: 0, max: 1, step: 0.005 },
            hullVentSpacing: { value: baseBossCfg.hullVent.spacing, min: 0, max: 0.5, step: 0.005 },
            hullVentOffsetX: { value: baseBossCfg.hullVent.offsetX, min: -2, max: 2, step: 0.01 },
            hullVentOffsetY: { value: baseBossCfg.hullVent.offsetY, min: -2, max: 2, step: 0.01 },
        }, { collapsed: true }),

        RacingStripe: folder({
            racingStripeEnabled: { value: baseBossCfg.racingStripe.enabled, label: 'Enabled' },
            racingStripeColor: { value: baseBossCfg.racingStripe.color },
            racingStripeWidth: { value: baseBossCfg.racingStripe.width, min: 0, max: 1, step: 0.005 },
            racingStripeLength: { value: baseBossCfg.racingStripe.length, min: 0, max: 2, step: 0.01 },
            racingStripeOffsetX: { value: baseBossCfg.racingStripe.offsetX, min: -2, max: 2, step: 0.01 },
            racingStripeOffsetY: { value: baseBossCfg.racingStripe.offsetY, min: -2, max: 2, step: 0.01 },
            racingStripeTiltDeg: { value: baseBossCfg.racingStripe.tiltDeg, min: -180, max: 180, step: 1 },
        }, { collapsed: true }),

        NoseSpike: folder({
            noseSpikeEnabled: { value: baseBossCfg.noseSpike.enabled, label: 'Enabled' },
            noseSpikeColor: { value: baseBossCfg.noseSpike.color },
            noseSpikeLength: { value: baseBossCfg.noseSpike.length, min: 0, max: 1, step: 0.005 },
            noseSpikeWidth: { value: baseBossCfg.noseSpike.width, min: 0, max: 1, step: 0.005 },
            noseSpikeOffsetY: { value: baseBossCfg.noseSpike.offsetY, min: -2, max: 2, step: 0.01 },
            noseSpikeRoundness: { value: baseBossCfg.noseSpike.roundness, min: 0, max: 1, step: 0.01 },
            noseSpikeZOffset: { value: baseBossCfg.noseSpike.zOffset, min: -0.2, max: 0.2, step: 0.005 },
        }, { collapsed: true }),

        TailFin: folder({
            tailFinEnabled: { value: baseBossCfg.tailFin.enabled, label: 'Enabled' },
            tailFinColor: { value: baseBossCfg.tailFin.color },
            tailFinLength: { value: baseBossCfg.tailFin.length, min: 0, max: 2, step: 0.01 },
            tailFinWidth: { value: baseBossCfg.tailFin.width, min: 0, max: 1, step: 0.01 },
            tailFinSweep: { value: baseBossCfg.tailFin.sweep, min: -1, max: 1, step: 0.01 },
            tailFinOffsetX: { value: baseBossCfg.tailFin.offsetX, min: -2, max: 2, step: 0.01 },
            tailFinOffsetY: { value: baseBossCfg.tailFin.offsetY, min: -2, max: 2, step: 0.01 },
            tailFinSplayDeg: { value: baseBossCfg.tailFin.splayDeg, min: -90, max: 90, step: 1 },
        }, { collapsed: true }),

        ExhaustPort: folder({
            exhaustPortEnabled: { value: baseBossCfg.exhaustPort.enabled, label: 'Enabled' },
            exhaustPortColor: { value: baseBossCfg.exhaustPort.color },
            exhaustPortWidth: { value: baseBossCfg.exhaustPort.width, min: 0, max: 1, step: 0.005 },
            exhaustPortHeight: { value: baseBossCfg.exhaustPort.height, min: 0, max: 2, step: 0.005 },
            exhaustPortOffsetX: { value: baseBossCfg.exhaustPort.offsetX, min: -2, max: 2, step: 0.01 },
            exhaustPortOffsetY: { value: baseBossCfg.exhaustPort.offsetY, min: -2, max: 2, step: 0.01 },
        }, { collapsed: true }),

        Propeller: folder({
            propellerEnabled: { value: baseBossCfg.propeller.enabled, label: 'Enabled' },
            propellerBladeColor: { value: baseBossCfg.propeller.bladeColor },
            propellerHubColor: { value: baseBossCfg.propeller.hubColor },
            propellerBladeCount: { value: baseBossCfg.propeller.bladeCount, min: 1, max: 8, step: 1 },
            propellerBladeLength: { value: baseBossCfg.propeller.bladeLength, min: 0, max: 1, step: 0.005 },
            propellerBladeWidth: { value: baseBossCfg.propeller.bladeWidth, min: 0, max: 1, step: 0.005 },
            propellerHubRadius: { value: baseBossCfg.propeller.hubRadius, min: 0, max: 0.5, step: 0.005 },
            propellerOffsetX: { value: baseBossCfg.propeller.offsetX, min: -2, max: 2, step: 0.01 },
            propellerOffsetY: { value: baseBossCfg.propeller.offsetY, min: -3, max: 3, step: 0.01 },
            propellerZOffset: { value: baseBossCfg.propeller.zOffset, min: -0.5, max: 0.5, step: 0.01 },
            propellerSpinSpeed: { value: baseBossCfg.propeller.spinSpeed, min: -30, max: 30, step: 0.5 },
        }, { collapsed: true }),

        CenterPropeller: folder({
            centerPropellerEnabled: { value: baseBossCfg.centerPropeller.enabled, label: 'Enabled' },
            centerPropellerBladeColor: { value: baseBossCfg.centerPropeller.bladeColor },
            centerPropellerHubColor: { value: baseBossCfg.centerPropeller.hubColor },
            centerPropellerBladeCount: { value: baseBossCfg.centerPropeller.bladeCount, min: 1, max: 8, step: 1 },
            centerPropellerBladeLength: { value: baseBossCfg.centerPropeller.bladeLength, min: 0, max: 1, step: 0.005 },
            centerPropellerBladeWidth: { value: baseBossCfg.centerPropeller.bladeWidth, min: 0, max: 1, step: 0.005 },
            centerPropellerHubRadius: { value: baseBossCfg.centerPropeller.hubRadius, min: 0, max: 0.5, step: 0.005 },
            centerPropellerOffsetY: { value: baseBossCfg.centerPropeller.offsetY, min: -3, max: 3, step: 0.01 },
            centerPropellerZOffset: { value: baseBossCfg.centerPropeller.zOffset, min: -0.5, max: 0.5, step: 0.01 },
            centerPropellerSpinSpeed: { value: baseBossCfg.centerPropeller.spinSpeed, min: -30, max: 30, step: 0.5 },
        }, { collapsed: true }),

        TailBoom: folder({
            tailBoomEnabled: { value: baseBossCfg.tailBoom.enabled, label: 'Enabled' },
            tailBoomColor: { value: baseBossCfg.tailBoom.color },
            tailBoomLength: { value: baseBossCfg.tailBoom.length, min: 0, max: 2, step: 0.01 },
            tailBoomBaseWidth: { value: baseBossCfg.tailBoom.baseWidth, min: 0, max: 1, step: 0.005 },
            tailBoomTipWidth: { value: baseBossCfg.tailBoom.tipWidth, min: 0, max: 1, step: 0.005 },
        }, { collapsed: true }),

        BoomFin: folder({
            boomFinEnabled: { value: baseBossCfg.boomFin.enabled, label: 'Enabled' },
            boomFinColor: { value: baseBossCfg.boomFin.color },
            boomFinLength: { value: baseBossCfg.boomFin.length, min: 0, max: 2, step: 0.01 },
            boomFinWidth: { value: baseBossCfg.boomFin.width, min: 0, max: 1, step: 0.01 },
            boomFinSweep: { value: baseBossCfg.boomFin.sweep, min: -1, max: 1, step: 0.01 },
            boomFinOffsetX: { value: baseBossCfg.boomFin.offsetX, min: -2, max: 2, step: 0.01 },
            boomFinOffsetY: { value: baseBossCfg.boomFin.offsetY, min: -2, max: 2, step: 0.01 },
            boomFinSplayDeg: { value: baseBossCfg.boomFin.splayDeg, min: -90, max: 90, step: 1 },
        }, { collapsed: true }),

        LandingGear: folder({
            landingGearEnabled: { value: baseBossCfg.landingGear.enabled, label: 'Enabled' },
            landingGearLegColor: { value: baseBossCfg.landingGear.legColor },
            landingGearWheelColor: { value: baseBossCfg.landingGear.wheelColor },
            landingGearLegLength: { value: baseBossCfg.landingGear.legLength, min: 0, max: 1, step: 0.005 },
            landingGearLegWidth: { value: baseBossCfg.landingGear.legWidth, min: 0, max: 0.5, step: 0.005 },
            landingGearWheelRadius: { value: baseBossCfg.landingGear.wheelRadius, min: 0, max: 0.3, step: 0.005 },
            landingGearOffsetX: { value: baseBossCfg.landingGear.offsetX, min: -2, max: 2, step: 0.01 },
            landingGearOffsetY: { value: baseBossCfg.landingGear.offsetY, min: -2, max: 2, step: 0.01 },
            landingGearZOffset: { value: baseBossCfg.landingGear.zOffset, min: -0.2, max: 0.2, step: 0.005 },
        }, { collapsed: true }),

        HullTexture: folder({
            hullTextureEnabled: { value: baseBossCfg.hullTexture.enabled, label: 'Enabled' },
            hullTextureKey: { value: baseBossCfg.hullTexture.textureKey, options: Object.keys(HULL_TEXTURES) },
            hullTextureOpacity: { value: baseBossCfg.hullTexture.opacity, min: 0, max: 1, step: 0.01 },
            hullTextureRepeatX: { value: baseBossCfg.hullTexture.repeatX, min: 0, max: 5, step: 0.1 },
            hullTextureRepeatY: { value: baseBossCfg.hullTexture.repeatY, min: 0, max: 5, step: 0.1 },
        }, { collapsed: true }),

        HealthBar: folder({
            healthBarBgColor: { value: baseBossCfg.healthBar.bgColor },
            healthBarFgColor: { value: baseBossCfg.healthBar.fgColor },
            healthBarWidth: { value: baseBossCfg.healthBar.width, min: 0, max: 6, step: 0.1 },
            healthBarHeight: { value: baseBossCfg.healthBar.height, min: 0, max: 1, step: 0.01 },
            healthBarOffsetY: { value: baseBossCfg.healthBar.offsetY, min: 0, max: 5, step: 0.1 },
        }, { collapsed: true }),
    }, [baseBossCfg])

    // ------------------------------------------------------------
    // Gun mount (position/rotation on the boss) — seeded from
    // baseBossCfg.gun so switching boss loads its existing mount.
    // ------------------------------------------------------------
    const mount = useControls('Gun Mount', {
        gunTypeId: { value: baseBossCfg.gun.typeId, options: gunOptions, label: 'Gun Type' },
        gunEnabled: { value: baseBossCfg.gun.enabled, label: 'Enabled' },
        mirrored: { value: baseBossCfg.gun.mirrored, label: 'Mirrored Pair' },
        offsetX: { value: baseBossCfg.gun.offsetX, min: 0, max: 1.5, step: 0.005 },
        offsetY: { value: baseBossCfg.gun.offsetY, min: -1, max: 1, step: 0.005 },
        scale: { value: baseBossCfg.gun.scale, min: 0.1, max: 3, step: 0.01 },
        rotationDeg: { value: deg(baseBossCfg.gun.rotation ?? 0), min: -180, max: 180, step: 1, label: 'Rotation (deg)' },
        zOffset: { value: baseBossCfg.gun.zOffset, min: -0.2, max: 0.3, step: 0.005 },
    }, [baseBossCfg])

    // ------------------------------------------------------------
    // Gun appearance — seeded from the selected gun type's config.
    // ------------------------------------------------------------
    const baseGunCfg = useMemo(
        () => GUN_TYPES.find(g => g.id === mount.gunTypeId)?.config ?? DEFAULT_GUN_CONFIG,
        [mount.gunTypeId]
    )

    const gunAppearance = useControls('Gun Appearance', {
        frameColor: { value: baseGunCfg.frame.color },
        frameLength: { value: baseGunCfg.frame.length, min: 0.3, max: 1.3, step: 0.01 },
        frameHeight: { value: baseGunCfg.frame.height, min: 0.05, max: 0.35, step: 0.005 },
        barrelColor: { value: baseGunCfg.barrel.color },
        barrelLength: { value: baseGunCfg.barrel.length, min: 0.05, max: 0.6, step: 0.01 },
        mountBracketColor: { value: baseGunCfg.mountBracket.color, label: 'Bracket Color' },
        mountBracketLength: { value: baseGunCfg.mountBracket.length, min: 0.05, max: 0.4, step: 0.005, label: 'Bracket Length' },
        mountBracketWidth: { value: baseGunCfg.mountBracket.width, min: 0.1, max: 0.6, step: 0.005, label: 'Bracket Width' },
        coreGlowColor: { value: baseGunCfg.coreGlow.color },
        coreGlowIntensity: { value: baseGunCfg.coreGlow.intensity, min: 0, max: 3, step: 0.05 },
        accentColor: { value: baseGunCfg.accentStripe.color },
    }, [baseGunCfg])

    // ------------------------------------------------------------
    // Assemble live configs
    // ------------------------------------------------------------
    // NOTE: deliberately not wrapped in useMemo. Leva already re-renders this
    // component on every slider tick, and chaining several useMemos off the
    // Leva-returned control objects was making updates lag behind — recomputing
    // plainly here guarantees the config always matches the very latest values.
    const liveGunCfg = {
        ...baseGunCfg,
        frame: { ...baseGunCfg.frame, color: gunAppearance.frameColor, length: gunAppearance.frameLength, height: gunAppearance.frameHeight },
        barrel: { ...baseGunCfg.barrel, color: gunAppearance.barrelColor, length: gunAppearance.barrelLength },
        mountBracket: { ...baseGunCfg.mountBracket, color: gunAppearance.mountBracketColor, length: gunAppearance.mountBracketLength, width: gunAppearance.mountBracketWidth },
        coreGlow: { ...baseGunCfg.coreGlow, color: gunAppearance.coreGlowColor, intensity: gunAppearance.coreGlowIntensity },
        accentStripe: { ...baseGunCfg.accentStripe, color: gunAppearance.accentColor },
    }

    const liveGunMountField = {
        enabled: mount.gunEnabled,
        typeId: mount.gunTypeId,
        offsetX: mount.offsetX,
        offsetY: mount.offsetY,
        scale: mount.scale,
        rotation: rad(mount.rotationDeg),
        zOffset: mount.zOffset,
        mirrored: mount.mirrored,
    }

    const liveBossCfg = {
        ...baseBossCfg,
        gun: liveGunMountField,
        fuselage: { color: p.fuselageColor, tipY: p.fuselageTipY, shoulderY: p.fuselageShoulderY, shoulderWidth: p.fuselageShoulderWidth, waistY: p.fuselageWaistY, waistWidth: p.fuselageWaistWidth, tailY: p.fuselageTailY, tailWidth: p.fuselageTailWidth, notchY: p.fuselageNotchY },
        cockpit: { color: p.cockpitColor, topY: p.cockpitTopY, topWidth: p.cockpitTopWidth, midY: p.cockpitMidY, midWidth: p.cockpitMidWidth, bottomY: p.cockpitBottomY, bottomWidth: p.cockpitBottomWidth },
        wing: { color: p.wingColor, rootX: p.wingRootX, rootY: p.wingRootY, tipX: p.wingTipX, tipY: p.wingTipY, trailX: p.wingTrailX, trailY: p.wingTrailY, innerX: p.wingInnerX, innerY: p.wingInnerY },
        wingPanel: { color: p.wingPanelColor, inset: p.wingPanelInset },
        wingtip: { color: p.wingtipColor, width: p.wingtipWidth, height: p.wingtipHeight, offsetX: p.wingtipOffsetX, offsetY: p.wingtipOffsetY, zOffset: p.wingtipZOffset },
        horn: { enabled: p.hornEnabled, color: p.hornColor, baseWidth: p.hornBaseWidth, length: p.hornLength, curveAmount: p.hornCurveAmount, offsetX: p.hornOffsetX, offsetY: p.hornOffsetY, sweepDeg: p.hornSweepDeg, tiltDeg: p.hornTiltDeg },
        decal: { enabled: p.decalEnabled, color: p.decalColor, width: p.decalWidth, length: p.decalLength, offsetX: p.decalOffsetX, offsetY: p.decalOffsetY, tiltDeg: p.decalTiltDeg, zOffset: p.decalZOffset },
        cockpitGlass: {
            enabled: p.cockpitGlassEnabled, inset: p.cockpitGlassInset, zOffset: p.cockpitGlassZOffset, color: p.cockpitGlassColor,
            metalness: p.cockpitGlassMetalness, roughness: p.cockpitGlassRoughness, transmission: p.cockpitGlassTransmission,
            thickness: p.cockpitGlassThickness, ior: p.cockpitGlassIor, clearcoat: p.cockpitGlassClearcoat,
            clearcoatRoughness: p.cockpitGlassClearcoatRoughness, envMapIntensity: p.cockpitGlassEnvMapIntensity,
            iridescence: p.cockpitGlassIridescence, iridescenceIOR: p.cockpitGlassIridescenceIOR,
            iridescenceThicknessMin: p.cockpitGlassIridescenceThicknessMin, iridescenceThicknessMax: p.cockpitGlassIridescenceThicknessMax,
            attenuationColor: p.cockpitGlassAttenuationColor, attenuationDistance: p.cockpitGlassAttenuationDistance,
        },
        engineIntake: { enabled: p.engineIntakeEnabled, color: p.engineIntakeColor, width: p.engineIntakeWidth, height: p.engineIntakeHeight, offsetX: p.engineIntakeOffsetX, offsetY: p.engineIntakeOffsetY },
        hullVent: { enabled: p.hullVentEnabled, color: p.hullVentColor, count: p.hullVentCount, width: p.hullVentWidth, height: p.hullVentHeight, spacing: p.hullVentSpacing, offsetX: p.hullVentOffsetX, offsetY: p.hullVentOffsetY },
        racingStripe: { enabled: p.racingStripeEnabled, color: p.racingStripeColor, width: p.racingStripeWidth, length: p.racingStripeLength, offsetX: p.racingStripeOffsetX, offsetY: p.racingStripeOffsetY, tiltDeg: p.racingStripeTiltDeg },
        noseSpike: { enabled: p.noseSpikeEnabled, color: p.noseSpikeColor, length: p.noseSpikeLength, width: p.noseSpikeWidth, offsetY: p.noseSpikeOffsetY, roundness: p.noseSpikeRoundness, zOffset: p.noseSpikeZOffset },
        tailFin: { enabled: p.tailFinEnabled, color: p.tailFinColor, length: p.tailFinLength, width: p.tailFinWidth, sweep: p.tailFinSweep, offsetX: p.tailFinOffsetX, offsetY: p.tailFinOffsetY, splayDeg: p.tailFinSplayDeg },
        exhaustPort: { enabled: p.exhaustPortEnabled, color: p.exhaustPortColor, width: p.exhaustPortWidth, height: p.exhaustPortHeight, offsetX: p.exhaustPortOffsetX, offsetY: p.exhaustPortOffsetY },
        propeller: { enabled: p.propellerEnabled, bladeColor: p.propellerBladeColor, hubColor: p.propellerHubColor, bladeCount: p.propellerBladeCount, bladeLength: p.propellerBladeLength, bladeWidth: p.propellerBladeWidth, hubRadius: p.propellerHubRadius, offsetX: p.propellerOffsetX, offsetY: p.propellerOffsetY, zOffset: p.propellerZOffset, spinSpeed: p.propellerSpinSpeed },
        centerPropeller: { enabled: p.centerPropellerEnabled, bladeColor: p.centerPropellerBladeColor, hubColor: p.centerPropellerHubColor, bladeCount: p.centerPropellerBladeCount, bladeLength: p.centerPropellerBladeLength, bladeWidth: p.centerPropellerBladeWidth, hubRadius: p.centerPropellerHubRadius, offsetY: p.centerPropellerOffsetY, zOffset: p.centerPropellerZOffset, spinSpeed: p.centerPropellerSpinSpeed },
        tailBoom: { enabled: p.tailBoomEnabled, color: p.tailBoomColor, length: p.tailBoomLength, baseWidth: p.tailBoomBaseWidth, tipWidth: p.tailBoomTipWidth },
        boomFin: { enabled: p.boomFinEnabled, color: p.boomFinColor, length: p.boomFinLength, width: p.boomFinWidth, sweep: p.boomFinSweep, offsetX: p.boomFinOffsetX, offsetY: p.boomFinOffsetY, splayDeg: p.boomFinSplayDeg },
        landingGear: { enabled: p.landingGearEnabled, legColor: p.landingGearLegColor, wheelColor: p.landingGearWheelColor, legLength: p.landingGearLegLength, legWidth: p.landingGearLegWidth, wheelRadius: p.landingGearWheelRadius, offsetX: p.landingGearOffsetX, offsetY: p.landingGearOffsetY, zOffset: p.landingGearZOffset },
        hullTexture: { enabled: p.hullTextureEnabled, textureKey: p.hullTextureKey, opacity: p.hullTextureOpacity, repeatX: p.hullTextureRepeatX, repeatY: p.hullTextureRepeatY },
        healthBar: { bgColor: p.healthBarBgColor, fgColor: p.healthBarFgColor, width: p.healthBarWidth, height: p.healthBarHeight, offsetY: p.healthBarOffsetY },
    }

    // ------------------------------------------------------------
    // Geometry (rebuilds only when the live boss config actually changes)
    // ------------------------------------------------------------
    const textureKeys = useMemo(() => Object.keys(HULL_TEXTURES), [])
    const loadedTextures = useLoader(THREE.TextureLoader, textureKeys.map(k => HULL_TEXTURES[k]))
    const textures = useMemo(
        () => Object.fromEntries(textureKeys.map((k, i) => [k, loadedTextures[i]])),
        [textureKeys, loadedTextures]
    )

    // liveBossCfg is a fresh object every render now, so this rebuilds
    // geometry every render too — that's fine here, it only re-renders
    // when a control actually changes.
    const bossAssets = buildBossAssets(liveBossCfg, textures)

    // BossShip's group defaults to visible={false} (it's normally toggled
    // externally by BossRenderer's useFrame loop across many boss slots).
    // Force it on every frame here so this standalone preview shows up
    // regardless of whether BossShip has been patched to accept a `visible` prop.
    const shipGroupRef = useRef()
    useFrame(() => {
        if (shipGroupRef.current) shipGroupRef.current.visible = true
    })

    // ------------------------------------------------------------
    // Log buttons — paste-ready output for bosses.js / gunConfigs.js
    // ------------------------------------------------------------
    useControls('Builder / Log', {
        'Log Boss Config (bosses.js)': button(() => {
            const { key, name, ...groups } = liveBossCfg
            console.log(
                `withDefaults({\n    key: ${JSON.stringify(key)},\n    name: ${JSON.stringify(name)},\n    ` +
                Object.entries(groups).map(([g, v]) => `${g}: ${JSON.stringify(v)}`).join(',\n    ') +
                `\n})`
            )
        }),
        'Log Gun Mount (boss.gun field)': button(() => {
            console.log('gun:', JSON.stringify(liveGunMountField, null, 2))
        }),
        'Log Gun Type Config (gunConfigs.js overrides)': button(() => {
            console.log(
                `${mount.gunTypeId} overrides:`,
                JSON.stringify({
                    frame: liveGunCfg.frame,
                    barrel: liveGunCfg.barrel,
                    mountBracket: liveGunCfg.mountBracket,
                    coreGlow: liveGunCfg.coreGlow,
                    accentStripe: liveGunCfg.accentStripe,
                }, null, 2)
            )
        }),
    })

    if (!preview.show) return null

    return (
        <group position={[preview.x, preview.y, preview.z]} rotation={[0, 0, preview.rotation]} scale={preview.scale}>
            <BossShip
                groupRef={shipGroupRef}
                geo={bossAssets.geo}
                cfg={liveBossCfg}
                hullMaterials={bossAssets.hullMaterials}
                visible={true}
            />

            {mount.gunEnabled && (
                mount.mirrored ? (
                    <>
                        <GunRenderer
                            config={liveGunCfg}
                            position={[-mount.offsetX, mount.offsetY, mount.zOffset]}
                            rotation={[0, 0, GUN_DIRECTION + rad(mount.rotationDeg)]}
                            scale={mount.scale}
                        />
                        <GunRenderer
                            config={liveGunCfg}
                            position={[mount.offsetX, mount.offsetY, mount.zOffset]}
                            rotation={[0, 0, GUN_DIRECTION + rad(mount.rotationDeg)]}
                            scale={mount.scale}
                        />
                    </>
                ) : (
                    <GunRenderer
                        config={liveGunCfg}
                        position={[mount.offsetX, mount.offsetY, mount.zOffset]}
                        rotation={[0, 0, GUN_DIRECTION + rad(mount.rotationDeg)]}
                        scale={mount.scale}
                    />
                )
            )}
        </group>
    )
}