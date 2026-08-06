// src/screens/GunsScreen.jsx

import { useState, useEffect, useCallback } from "react"
import { gameState, advanceStage, SCREEN } from "../state/gameState"
import { notifyUIChanged } from "../state/uiState"
import { WEAPONS, getWeapon } from "../ecs/weapons/config/weapons"
import { getGunTypeByWeaponId } from "../ecs/weapons/config/gunConfigs"
import FlightLayout2 from "../components/FlightLayout2.jsx"

export function GunsScreen({ onBack, onPlay }) {

    const [selected, setSelected] = useState(
        gameState.currentWeapon
    )

    // 0 = EQUIP, 1 = BACK
    const [navSelected, setNavSelected] = useState(0)

    const weapon = getWeapon(selected)
    const selectedGun = getGunTypeByWeaponId(selected)

    const handleBack = useCallback(() => {
        if (onBack) {
            onBack()
            return
        }
        gameState.screen = SCREEN.MENU
        notifyUIChanged()
    }, [onBack])

    const handleEquip = useCallback(() => {
        gameState.currentWeapon = selected
        advanceStage()

        if (onPlay) {
            onPlay()
            return
        }

        // fallback if no onPlay prop was supplied
        gameState.screen = SCREEN.PLAY
        notifyUIChanged()
    }, [selected, onPlay])

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" || e.key === "Backspace") {
                e.preventDefault()
                handleBack()
            }
            if (e.key === "Enter") {
                e.preventDefault()
                navSelected === 0 ? handleEquip() : handleBack()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", onKey)
        }
    }, [handleBack, handleEquip, navSelected])

    const btnClass = (active) => `
        cursor-pointer relative w-40 sm:w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200
        ${active
            ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
            : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
        }
    `;

    return (
        <FlightLayout2 title="GUNS" footer="ARMORY" size="xl" centered={false}>
            <div className="mx-auto font-mono text-xs tracking-[0.2em] text-white/80 w-full max-w-5xl">

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-8 lg:gap-12">

                    {/* ================================================= */}
                    {/* LEFT SIDE - WEAPON LIST */}
                    {/* ================================================= */}

                    <section>
                        <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">WEAPONS</div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {WEAPONS.map((w) => {

                                const gun = getGunTypeByWeaponId(w.id)
                                const unlocked = gameState.unlockedWeapons.includes(w.id)
                                const isSelected = selected === w.id
                                const isNew = gameState.pendingUnlockWeapon === w.id

                                return (
                                    <button
                                        key={w.id}
                                        disabled={!unlocked}
                                        onClick={() => unlocked && setSelected(w.id)}
                                        onMouseEnter={() => unlocked && setSelected(w.id)}
                                        className={`relative w-full min-w-0 border text-left p-1.5 transition-all duration-200
                                            ${isSelected
                                                ? "border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]"
                                                : unlocked
                                                    ? "border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40 hover:border-cyan-300/70"
                                                    : "border-white/10 bg-black/60"
                                            }
                                            ${!unlocked ? "cursor-not-allowed opacity-60" : ""}
                                        `}
                                    >
                                        <div className="relative h-10 sm:h-12 mb-1 border border-white/10 bg-black/50 overflow-hidden">
                                            <img
                                                src={`/gun_svgs/${gun.id}.svg`}
                                                alt={gun.name}
                                                className={`w-full h-full object-contain p-1 ${unlocked ? "" : "brightness-0 opacity-70"}`}
                                            />
                                            {!unlocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                    <span className="font-bold text-red-400 text-[7px] tracking-[0.2em]">LOCKED</span>
                                                </div>
                                            )}
                                        </div>

                                        {unlocked && (
                                            <>
                                                <div className="text-cyan-300/90 text-[9px] truncate tracking-[0.1em]">
                                                    {gun.name}
                                                </div>
                                                <div className="text-white/40 truncate text-[8px] tracking-[0.1em]">
                                                    {w.category}
                                                </div>

                                                {isNew && (
                                                    <div className="absolute top-0.5 right-0.5 text-yellow-300 text-[7px] font-bold tracking-[0.1em] animate-pulse">
                                                        NEW
                                                    </div>
                                                )}

                                                {isSelected && (
                                                    <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 text-cyan-300 text-[10px] animate-pulse">
                                                        ▶
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    {/* ================================================= */}
                    {/* RIGHT SIDE - WEAPON DETAILS */}
                    {/* ================================================= */}

                    <section className="flex flex-col min-w-0">
                        <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">DETAILS</div>

                        <div className="w-full max-w-md mx-auto">

                            {/* Weapon preview */}
                            <div className="w-full aspect-4/3 sm:aspect-video lg:aspect-auto lg:h-55 border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden relative">

                                <img
                                    src={`/gun_svgs/${selectedGun.id}.svg`}
                                    alt={selectedGun.name}
                                    className="w-full h-full max-w-[70%] max-h-[70%] object-contain animate-gun-recoil"
                                />

                            </div>

                            <div className="mt-6">
                                <h2 className="text-xl sm:text-2xl text-cyan-300 tracking-[0.2em] break-words">
                                    {selectedGun.name}
                                </h2>

                                <div className="mt-4 flex justify-between text-white/70">
                                    <span className="text-[#39ff14]/70">Category</span>
                                    <span className="text-cyan-300/80">{weapon.category}</span>
                                </div>

                                {/* ACTIONS */}
                                <div className="mt-10 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={handleEquip}
                                        onMouseEnter={() => setNavSelected(0)}
                                        className={`flex-1 ${btnClass(navSelected === 0)}`}
                                    >
                                        EQUIP
                                        {navSelected === 0 && (
                                            <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                                                ▶
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        onMouseEnter={() => setNavSelected(1)}
                                        className={`flex-1 ${btnClass(navSelected === 1)}`}
                                    >
                                        BACK
                                        {navSelected === 1 && (
                                            <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                                                ▶
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </section>

                </div>
            </div>
        </FlightLayout2>
    )
}