// src/screens/GameOverScreen.jsx

import { startState } from "../state/startState.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"
import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"

export function GameOverScreen({ onRestart, onMenu }) {

    useScreenKeys({
        enter: () => onRestart?.(),
        escape: () => onMenu?.(),
        backspace: () => onMenu?.()
    })

    return (<FlightLayout2 title="GAME OVER" footer="SHIP DESTROYED">
        <div className="mt-10 text-center font-mono">
            <p className="text-red-300">FINAL SCORE</p>
            <p className="mt-4 text-3xl text-white">{startState.score.toLocaleString()}</p>
            <ScreenActions items={[
                {
                    label: "Restart [Enter]",
                    action: onRestart
                },
                {
                    label: "Main menu [Esc]",
                    action: onMenu
                }]} />
        </div>
    </FlightLayout2>
    )
}