// src/screens/MenuScreen.jsx

import { gameState, SCREEN } from "../state/gameState"
import { notifyUIChanged } from "../state/uiState"

export function MenuScreen() {

    return (
        <div className="h-screen bg-black flex items-center justify-center">

            <div className="w-96 p-8 border-2 border-cyan-400 bg-[#0b1220]">

                <h1 className="text-5xl text-cyan-400 text-center mb-8">
                    ASTEROIDS
                </h1>

                <div className="flex flex-col gap-3">

                    <button
                        className="menuButton"
                        onClick={() => {
                            gameState.screen = SCREEN.PLAY
                            notifyUIChanged()
                        }}>
                        START
                    </button>

                    <button
                        className="menuButton"
                        onClick={() => {
                            gameState.screen = SCREEN.ARMOURY
                            notifyUIChanged()
                        }}>
                        ARMOURY
                    </button>

                    <button
                        className="menuButton"
                        onClick={() => {
                            gameState.screen = SCREEN.SETTINGS
                            notifyUIChanged()
                        }}>
                        SETTINGS
                    </button>

                </div>

            </div>

        </div>
    )
}