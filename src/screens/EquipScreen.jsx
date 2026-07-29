// src/screens/EquipScreen.jsx

import { useState } from "react"

import { gameState, SCREEN } from "../state/gameState"
import { notifyUIChanged } from "../state/uiState"

import {
    WEAPONS,
    getWeapon
} from "../ecs/weapons/config/weapons"

import {
    getGunTypeByWeaponId
} from "../ecs/weapons/config/gunConfigs"

export function EquipScreen() {

    const [selected, setSelected] = useState(
        gameState.currentWeapon
    )

    const weapon = getWeapon(selected)
    const selectedGun = getGunTypeByWeaponId(selected)

    return (

        <div className="min-h-screen bg-[#05080d] flex items-center justify-center p-8">

            <div className="w-full max-w-7xl bg-[#101820] border-2 border-cyan-500 rounded-xl p-8">

                <h1 className="text-5xl font-bold text-cyan-400 mb-8">
                    ARMOURY
                </h1>

                <div className="grid grid-cols-[420px_1fr] gap-10">

                    {/* ===================================================== */}
                    {/* LEFT SIDE */}
                    {/* ===================================================== */}

                    <div>

                        <h2 className="text-lg text-cyan-300 mb-4">
                            Weapons
                        </h2>

                        <div className="grid grid-cols-2 gap-3">

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
                                        className={`
                                            relative
                                            h-24
                                            rounded-lg
                                            border
                                            transition-all
                                            text-left
                                            p-3

                                            ${isSelected
                                                ? "border-cyan-400 bg-cyan-950"
                                                : unlocked
                                                    ? "border-cyan-800 bg-[#172534] hover:border-cyan-400"
                                                    : "border-gray-800 bg-[#080808]"
                                            }

                                            ${!unlocked && "cursor-not-allowed opacity-80"}
                                        `}
                                    >



                                        <div className="relative h-16 mb-2 rounded overflow-hidden bg-[#081018] border border-cyan-900">

                                            <img
                                                src="/weapons/placeholder.png"
                                                alt={gun.name}
                                                className={`
            w-full
            h-full
            object-contain
            p-2
            ${unlocked ? "" : "brightness-0 opacity-70"}
        `}
                                            />

                                            {!unlocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">

                                                    <span className="font-bold text-red-500 text-xs tracking-widest">
                                                        LOCKED
                                                    </span>

                                                </div>
                                            )}

                                        </div>

                                        {unlocked && (

                                            <>

                                                <div className="font-bold text-cyan-300">
                                                    {gun.name}
                                                </div>

                                                <div className="text-xs text-gray-400 mt-2">

                                                    {w.category}

                                                </div>

                                                {isNew && (

                                                    <div className="absolute top-2 right-2 text-yellow-400 text-xs font-bold">

                                                        NEW

                                                    </div>

                                                )}

                                            </>

                                        )}

                                    </button>

                                )

                            })}

                        </div>

                    </div>

                    {/* ===================================================== */}
                    {/* RIGHT SIDE */}
                    {/* ===================================================== */}

                    <div className="flex flex-col">

                        <div className="h-[420px] rounded-xl border border-cyan-600 bg-[#081018] flex items-center justify-center">

                            <img
                                src="/weapons/placeholder.png"
                                alt={selectedGun.name}
                                className="max-w-[90%] max-h-[90%] object-contain"
                            />

                        </div>

                        <div className="mt-6">

                            <h2 className="text-4xl font-bold text-cyan-300">
                                {selectedGun.name}
                            </h2>

                            <p className="mt-4 text-gray-300 leading-relaxed">
                                <span className="text-cyan-400">Category:</span> {weapon.category}
                            </p>

                            <div className="mt-8 flex gap-4">

                                <button
                                    className="px-8 py-3 border-2 border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors"
                                    onClick={() => {

                                        gameState.currentWeapon = selected

                                        gameState.pendingUnlockWeapon = null

                                        gameState.stage++

                                        gameState.wave = 0

                                        gameState.paused = false

                                        gameState.screen = SCREEN.PLAY
                                        notifyUIChanged()
                                    }}
                                >

                                    EQUIP

                                </button>

                                <button
                                    className="px-8 py-3 border-2 border-gray-500 text-gray-300 hover:bg-gray-700 transition-colors"
                                    onClick={() => {

                                        gameState.screen = SCREEN.MENU
                                        notifyUIChanged()
                                    }}
                                >

                                    BACK

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    )

}