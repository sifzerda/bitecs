//src/screens/GameOverScreen.jsx

import { gameState, resetRun, SCREEN } from "../state/gameState"
import { notifyUIChanged } from "../state/uiState"

export function GameOverScreen({ onRestart, onMenu }) {

    const handleRestart = () => {
        resetRun()
        if (onRestart) {
            onRestart()
            return
        }
        gameState.screen = SCREEN.PLAY
        notifyUIChanged()
    }

    const handleMenu = () => {
        resetRun()
        if (onMenu) {
            onMenu()
            return
        }
        gameState.screen = SCREEN.MENU
        notifyUIChanged()
    }

    return (

        <div className="fixed inset-0 bg-black flex items-center justify-center">

            <div className="w-96 p-8 border border-red-500">

                <h1 className="text-5xl text-red-500">
                    GAME OVER
                </h1>

                <div className="mt-4">
                    Score: {gameState.score}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        className="border p-3"
                        onClick={handleRestart}
                    >
                        RESTART
                    </button>

                    <button
                        className="border p-3"
                        onClick={handleMenu}
                    >
                        MAIN MENU
                    </button>
                </div>

            </div>

        </div>
    )
}