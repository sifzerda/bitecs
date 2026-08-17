import { useEffect } from "react"
import { useGameStore, getLevelId } from "../../store/gameStore.js"
import { simState } from "../state/simState.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"

export function StageCompleteScreen({ onContinue, onMenu, onGuns}) {

    const stage = useGameStore((s) => s.stage)
    const section = useGameStore((s) => s.section)
    const clearedLabel = getLevelId(stage, section)
    const unlockedWeapon = simState.pendingUnlockWeapon

    useEffect(() => {

        const onKey = (e) => {

            if (e.key === "Enter") {
                e.preventDefault()
                onContinue?.()
            }
        }

        window.addEventListener("keydown", onKey)

        return () => {
            window.removeEventListener("keydown", onKey)
        }

    }, [onContinue])


    return (

        <FlightLayout2
            title="STAGE COMPLETE"
            footer={`${clearedLabel} CLEARED`}>

            <div className="mt-10 flex flex-col items-center gap-6 font-mono text-center">

                <div className="text-cyan-300 tracking-[0.3em] text-lg">
                    {clearedLabel} CLEARED
                </div>


                {unlockedWeapon != null && (

                    <div className="text-yellow-400 tracking-[0.25em] text-sm">
                        NEW WEAPON UNLOCKED
                    </div>

                )}

                <div className="mt-4 flex flex-col gap-4">

                    <button
                        type="button"
                        onClick={onContinue}
                        className="w-56 py-3 border border-green-300 text-cyan-300 bg-cyan-500/10 uppercase tracking-[0.4em] hover:bg-cyan-500/20"> CONTINUE</button>


                    {unlockedWeapon != null && (

                        <button
                            type="button"
                            onClick={onGuns}
                            className="w-56 py-3 border border-yellow-400/60 text-yellow-300 bg-yellow-500/10 uppercase tracking-[0.4em] hover:bg-yellow-500/20"
                        >
                            VIEW GUNS
                        </button>

                    )}


                    <button
                        type="button"
                        onClick={onMenu}
                        className="w-56 py-3 border border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40 uppercase tracking-[0.4em] hover:border-cyan-300/70 hover:text-cyan-300"
                    >
                        MENU
                    </button>

                </div>

            </div>

        </FlightLayout2>
    )
}