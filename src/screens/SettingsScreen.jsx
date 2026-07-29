// src/screens/SettingsScreen.jsx

import { useState } from "react"
import { gameState, SCREEN } from "../state/gameState"
import FlightLayout2 from "../components/FlightLayout2"

export function SettingsScreen() {

    const [music, setMusic] = useState(80)
    const [sfx, setSfx] = useState(100)
    const [screenshake, setScreenshake] = useState(true)
    const [bloom, setBloom] = useState(true)
    const [fps, setFps] = useState(false)

    return (

        <FlightLayout2 title="SETTINGS" footer="SECTOR CLEAR">

            <div className="min-h-screen bg-black flex items-center justify-center p-8">

                <div className="w-full max-w-3xl rounded-xl border-2 border-cyan-500 bg-[#101820] p-8">

                    <div className="space-y-8">

                        {/* ---------------- AUDIO ---------------- */}

                        <section>

                            <h2 className="text-xl text-cyan-300 mb-4">Audio</h2>

                            <div className="space-y-6">

                                <div>

                                    <div className="flex justify-between mb-2">

                                        <span>Music Volume</span>
                                        <span>{music}%</span>

                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={music}
                                        onChange={e => setMusic(Number(e.target.value))}
                                        className="w-full"
                                    />

                                </div>

                                <div>

                                    <div className="flex justify-between mb-2">

                                        <span>SFX Volume</span>
                                        <span>{sfx}%</span>

                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={sfx}
                                        onChange={e => setSfx(Number(e.target.value))}
                                        className="w-full"
                                    />

                                </div>

                            </div>

                        </section>

                        {/* ---------------- GRAPHICS ---------------- */}

                        <section>

                            <h2 className="text-xl text-cyan-300 mb-4">Graphics</h2>

                            <div className="space-y-3">

                                <label className="flex justify-between items-center">

                                    <span>Bloom</span>

                                    <input
                                        type="checkbox"
                                        checked={bloom}
                                        onChange={() => setBloom(!bloom)}
                                    />

                                </label>

                                <label className="flex justify-between items-center">

                                    <span>Screen Shake</span>

                                    <input
                                        type="checkbox"
                                        checked={screenshake}
                                        onChange={() => setScreenshake(!screenshake)}
                                    />

                                </label>

                            </div>

                        </section>

                        {/* ---------------- DEBUG ---------------- */}

                        <section>

                            <h2 className="text-xl text-cyan-300 mb-4">Debug</h2>

                            <label className="flex justify-between items-center">

                                <span>Show FPS</span>

                                <input
                                    type="checkbox"
                                    checked={fps}
                                    onChange={() => setFps(!fps)}
                                />

                            </label>

                        </section>

                    </div>

                    {/* ---------------- BUTTONS ---------------- */}

                    <div className="flex justify-end gap-4 mt-12">

                        <button
                            className="px-6 py-3 border border-gray-500 hover:bg-gray-700 transition"
                            onClick={() => {
                                gameState.screen = SCREEN.MENU
                                notifyUIChanged()
                            }}>BACK

                        </button>

                        <button
                            className="px-6 py-3 border border-cyan-400 hover:bg-cyan-400 hover:text-black transition"
                            onClick={() => {

                                // Save settings here later

                                gameState.screen = SCREEN.MENU
                                notifyUIChanged()
                            }}>SAVE
                        </button>

                    </div>

                </div>

            </div>
        </FlightLayout2>

    )

}