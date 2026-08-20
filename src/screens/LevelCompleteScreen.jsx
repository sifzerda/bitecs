// src/screens/LevelCompleteScreen.jsx

import {
    useEffect,
    useMemo,
} from "react"

import {
    useGameStore,
    formatLevelLabel,
} from "../../store/gameStore.js"

import {
    getWeapon,
} from "../ecs/weapons/config/weapons.js"

import {
    getGunTypeByWeaponId,
} from "../ecs/weapons/config/gunConfigs.js"

import FlightLayout2
    from "../components/FlightLayout2.jsx"


export function LevelCompleteScreen({
    onContinue,
    onMenu,
}) {

    // ========================================================
    // STATE
    // ========================================================

    const level =
        useGameStore(
            (state) => state.level
        )

    const pendingUnlockWeapon =
        useGameStore(
            (state) => state.pendingUnlockWeapon
        )

    const clearedLabel =
        formatLevelLabel(level)

    // ========================================================
    // WEAPON
    // ========================================================

    const unlockedWeapon =
        useMemo(
            () => {

                if (
                    pendingUnlockWeapon == null
                ) {
                    return null
                }

                const weapon =
                    getWeapon(
                        pendingUnlockWeapon
                    )

                const gun =
                    getGunTypeByWeaponId(
                        pendingUnlockWeapon
                    )

                return {

                    weapon,

                    gun,

                    name:
                        gun?.name ??
                        weapon?.name ??
                        `WEAPON ${pendingUnlockWeapon}`,
                }

            },
            [
                pendingUnlockWeapon,
            ]
        )

    // ========================================================
    // KEYBOARD
    // ========================================================

    useEffect(
        () => {

            const onKey =
                (event) => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault()

                        onContinue?.()
                    }

                }

            window.addEventListener(
                "keydown",
                onKey
            )

            return () => {

                window.removeEventListener(
                    "keydown",
                    onKey
                )

            }

        },
        [
            onContinue,
        ]
    )

    // ========================================================
    // RENDER
    // ========================================================

    return (

        <FlightLayout2
            title="ZONE CLEAR"
            footer={`${clearedLabel} CLEARED`}
        >

            <div
                className="
                    mt-10
                    flex
                    flex-col
                    items-center
                    gap-6
                    text-center
                    font-mono
                "
            >

                {/* CLEAR */}

                <div
                    className="
                        text-lg
                        tracking-[0.3em]
                        text-cyan-300
                        drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]
                    "
                >
                    {clearedLabel} CLEARED
                </div>


                {/* NEW WEAPON */}

                {unlockedWeapon && (

                    <div
                        className="
                            mt-2
                            flex
                            flex-col
                            items-center
                            gap-3
                            border
                            border-yellow-400/30
                            bg-yellow-400/5
                            px-10
                            py-6
                            shadow-[0_0_30px_rgba(255,220,50,0.08)]
                        "
                    >

                        <div
                            className="
                                text-[9px]
                                font-bold
                                tracking-[0.35em]
                                text-yellow-400/70
                            "
                        >
                            NEW WEAPON UNLOCKED
                        </div>

                        <div
                            className="
                                text-2xl
                                font-bold
                                uppercase
                                tracking-[0.25em]
                                text-yellow-300
                                drop-shadow-[0_0_12px_rgba(255,220,50,0.65)]
                            "
                        >
                            {unlockedWeapon.name}
                        </div>

                        {unlockedWeapon.gun?.id && (

                            <div
                                className="
                                    text-[7px]
                                    tracking-[0.25em]
                                    text-white/25
                                "
                            >
                                {unlockedWeapon.gun.id}
                            </div>

                        )}

                    </div>

                )}


                {/* NORMAL LEVEL COMPLETE */}

                {!unlockedWeapon && (

                    <div
                        className="
                            mt-2
                            text-xs
                            tracking-[0.25em]
                            text-white/40
                        "
                    >
                        LEVEL COMPLETE
                    </div>

                )}


                {/* ACTIONS */}

                <div
                    className="
                        mt-4
                        flex
                        flex-col
                        gap-4
                    "
                >

                    <button
                        type="button"
                        onClick={onContinue}
                        className="
                            w-56
                            border
                            border-green-300
                            bg-cyan-500/10
                            py-3
                            text-cyan-300
                            uppercase
                            tracking-[0.4em]
                            transition-all
                            hover:bg-cyan-500/20
                            hover:shadow-[0_0_18px_rgba(0,255,255,0.25)]
                        "
                    >
                        CONTINUE
                    </button>


                    <button
                        type="button"
                        onClick={onMenu}
                        className="
                            w-56
                            border
                            border-[#39ff14]/40
                            bg-black/40
                            py-3
                            text-[#39ff14]/70
                            uppercase
                            tracking-[0.4em]
                            transition-all
                            hover:border-cyan-300/70
                            hover:text-cyan-300
                        "
                    >
                        END GAME
                    </button>

                </div>

            </div>

        </FlightLayout2>
    )
}