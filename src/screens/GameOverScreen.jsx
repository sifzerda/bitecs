//src/screens/GameOverScreen.jsx

import { gameState, SCREEN } from "../state/gameState"

export function GameOverScreen() {

    return (

        <div className="fixed inset-0 bg-black flex items-center justify-center">

            <div className="w-96 p-8 border border-red-500">

                <h1 className="text-5xl text-red-500">
                    GAME OVER
                </h1>

                <div className="mt-4">
                    Score: {gameState.score}
                </div>

                <button
                    className="mt-6 border p-3"
                    onClick={() => {

                        gameState.lives = 3
                        gameState.screen = SCREEN.MENU
                        notifyUIChanged()
                    }}>
                    MAIN MENU
                </button>

            </div>

        </div>
    )
}