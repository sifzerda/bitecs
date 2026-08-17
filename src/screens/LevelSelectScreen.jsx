// src/screens/LevelSelectScreen.jsx

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"

import {
    useGameStore,
    SCREEN,
    LEVEL_SECTION,
    LEVELS_PER_STAGE,
    getLevelId,
} from "../../store/gameStore.js"

import FlightLayout2 from "../components/FlightLayout2.jsx"


const SECTIONS = [
    LEVEL_SECTION.A,
    LEVEL_SECTION.B,
    LEVEL_SECTION.C,
    LEVEL_SECTION.BOSS,
]


export default function LevelSelectScreen({
    onPlay,
    onBack,
}) {

    const highestLevelReached =
        useGameStore(
            (s) => s.highestLevelReached
        )

    const isLevelUnlocked =
        useGameStore(
            (s) => s.isLevelUnlocked
        )

    const startLevel =
        useGameStore(
            (s) => s.startLevel
        )


    // Number of stages that should be displayed.
    //
    // Always show at least Stage 1.
    // Also show the next stage so the player can see
    // where progression is going.
    const stageCount = useMemo(() => {

        const reachedStage =
            Math.ceil(
                highestLevelReached /
                LEVELS_PER_STAGE
            )

        return Math.max(
            1,
            reachedStage + 1
        )

    }, [highestLevelReached])


    // --------------------------------------------------------
    // Default selection
    // --------------------------------------------------------

    const [selected, setSelected] = useState(() => {

        const safeIndex =
            Math.max(
                1,
                highestLevelReached
            )

        const stage =
            Math.floor(
                (safeIndex - 1) /
                LEVELS_PER_STAGE
            ) + 1

        const section =
            ((safeIndex - 1) %
                LEVELS_PER_STAGE) + 1

        return {
            stage,
            section,
        }
    })


    // Keep selection valid after unlocking a new level.
    useEffect(() => {

        if (
            !isLevelUnlocked(
                selected.stage,
                selected.section
            )
        ) {

            const safeIndex =
                Math.max(
                    1,
                    highestLevelReached
                )

            const stage =
                Math.floor(
                    (safeIndex - 1) /
                    LEVELS_PER_STAGE
                ) + 1

            const section =
                ((safeIndex - 1) %
                    LEVELS_PER_STAGE) + 1


            setSelected({
                stage,
                section,
            })
        }

    }, [
        highestLevelReached,
        isLevelUnlocked,
        selected.stage,
        selected.section,
    ])


    const select = useCallback(
        (stage, section) => {

            if (
                !isLevelUnlocked(
                    stage,
                    section
                )
            ) {
                return
            }

            setSelected({
                stage,
                section,
            })
        },
        [isLevelUnlocked]
    )


    const play = useCallback(() => {

        const {
            stage,
            section,
        } = selected


        if (
            !isLevelUnlocked(
                stage,
                section
            )
        ) {
            return
        }


        startLevel(
            stage,
            section
        )

        onPlay?.()

    }, [
        selected,
        isLevelUnlocked,
        startLevel,
        onPlay,
    ])


    const back = useCallback(() => {

        if (onBack) {
            onBack()
            return
        }

        useGameStore.setState({
            screen: SCREEN.MENU,
            paused: false,
        })

    }, [onBack])


    useEffect(() => {

        const onKey = (e) => {

            if (
                e.key === "Escape" ||
                e.key === "Backspace"
            ) {

                e.preventDefault()
                back()
                return
            }


            if (e.key === "Enter") {

                e.preventDefault()
                play()
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

    }, [back, play])


    // --------------------------------------------------------
    // Reached level
    // --------------------------------------------------------

    const reachedStage =
        Math.floor(
            (highestLevelReached - 1) /
            LEVELS_PER_STAGE
        ) + 1


    const reachedSection =
        ((highestLevelReached - 1) %
            LEVELS_PER_STAGE) + 1


    return (

        <FlightLayout2
            title="LEVEL SELECT"
            footer={`REACHED: ${getLevelId(
                reachedStage,
                reachedSection
            )}`}
            size="xl"
            centered={false}
        >

            <div className="max-w-5xl mx-auto font-mono text-xs tracking-[0.2em]">

                {Array.from({
                    length: stageCount,
                }).map((_, i) => {

                    const stage = i + 1

                    return (

                        <section
                            key={stage}
                            className="mb-8"
                        >

                            <div className="mb-3 text-[#39ff14]/60 tracking-[0.3em]">
                                STAGE {stage}
                            </div>


                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                                {SECTIONS.map(
                                    (section) => {

                                        const unlocked =
                                            isLevelUnlocked(
                                                stage,
                                                section
                                            )

                                        const active =
                                            selected.stage === stage &&
                                            selected.section === section

                                        const isBoss =
                                            section ===
                                            LEVEL_SECTION.BOSS


                                        return (

                                            <button
                                                key={section}
                                                type="button"
                                                disabled={!unlocked}
                                                onClick={() =>
                                                    select(
                                                        stage,
                                                        section
                                                    )
                                                }
                                                className={`
                                                    relative h-28 border flex flex-col
                                                    items-center justify-center
                                                    transition-all duration-200

                                                    ${
                                                        active && unlocked

                                                            ? "border-cyan-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]"

                                                            : unlocked

                                                                ? "border-[#39ff14]/40 text-[#39ff14]/80 bg-black/40 hover:border-cyan-300/70"

                                                                : "border-white/10 text-white/20 bg-black/60 cursor-not-allowed"
                                                    }
                                                `}
                                            >

                                                {unlocked ? (

                                                    <>

                                                        <div className="text-2xl tracking-[0.2em]">
                                                            {getLevelId(
                                                                stage,
                                                                section
                                                            )}
                                                        </div>


                                                        <div
                                                            className={`
                                                                mt-2 text-[8px]
                                                                tracking-[0.25em]

                                                                ${
                                                                    isBoss
                                                                        ? "text-yellow-400/70"
                                                                        : "text-white/30"
                                                                }
                                                            `}
                                                        >
                                                            {isBoss
                                                                ? "BOSS"
                                                                : `WAVE ${section}`}
                                                        </div>

                                                    </>

                                                ) : (

                                                    <>

                                                        <div className="text-xl opacity-30">
                                                            LOCKED
                                                        </div>

                                                        <div className="mt-2 text-[8px] text-red-400/50">
                                                            UNREACHED
                                                        </div>

                                                    </>

                                                )}


                                                {active && unlocked && (

                                                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                                                        ▶
                                                    </span>

                                                )}

                                            </button>
                                        )
                                    }
                                )}

                            </div>

                        </section>
                    )
                })}


                <div className="mt-8 flex justify-center gap-4">

                    <button
                        type="button"
                        onClick={play}
                        disabled={
                            !isLevelUnlocked(
                                selected.stage,
                                selected.section
                            )
                        }
                        className="w-44 py-3 border border-green-300 text-cyan-300 bg-cyan-500/10 uppercase tracking-[0.4em] hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        PLAY
                    </button>


                    <button
                        type="button"
                        onClick={back}
                        className="w-44 py-3 border border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40 uppercase tracking-[0.4em] hover:border-cyan-300/70 hover:text-cyan-300"
                    >
                        BACK
                    </button>

                </div>

            </div>

        </FlightLayout2>
    )
}