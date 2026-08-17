// src/screens/GameOverScreen.jsx

import { simState } from "../state/simState.js"


export function GameOverScreen({
    onRestart,
    onMenu,
}) {

    return (

        <div className="fixed inset-0 bg-black flex items-center justify-center">

            <div className="w-96 p-8 border border-red-500">

                <h1 className="text-5xl text-red-500">
                    GAME OVER
                </h1>


                <div className="mt-4">
                    Score: {simState.score}
                </div>


                <div className="mt-6 flex gap-3">

                    <button
                        className="border p-3"
                        onClick={onRestart}
                    >
                        RESTART
                    </button>


                    <button
                        className="border p-3"
                        onClick={onMenu}
                    >
                        MAIN MENU
                    </button>

                </div>

            </div>

        </div>
    )
}