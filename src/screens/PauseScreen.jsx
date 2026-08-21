// src/screens/PauseScreen.jsx

import { useCallback, useEffect, useState } from "react"

export default function PauseScreen({
    onResume,
    onRestart,
    onMenu,
}) {

    const [selected, setSelected] = useState(0)

    const ITEMS = [
        {
            label: "RESUME",
            action: onResume,
        },
        {
            label: "RESTART LEVEL",
            action: onRestart,
        },
        {
            label: "END GAME",
            action: onMenu,
        },
    ]

    // ========================================================
    // ACTIVATE
    // ========================================================

    const activate = useCallback(() => {

        const item = ITEMS[selected]

        if (!item) {
            return
        }

        item.action?.()

    }, [
        selected,
        onResume,
        onRestart,
        onMenu,
    ])

    // ========================================================
    // KEYBOARD
    // ========================================================

    useEffect(() => {

        const onKey = (event) => {

            // ESC = RESUME

            if (event.key === "Escape") {

                event.preventDefault()

                onResume?.()

                return
            }

            // ENTER = SELECT

            if (event.key === "Enter") {

                event.preventDefault()

                activate()

                return
            }

            // UP

            if (
                event.key === "ArrowUp" ||
                event.key === "ArrowLeft"
            ) {

                event.preventDefault()

                setSelected((current) =>
                    (current - 1 + ITEMS.length) % ITEMS.length
                )

                return
            }

            // DOWN

            if (
                event.key === "ArrowDown" ||
                event.key === "ArrowRight"
            ) {

                event.preventDefault()

                setSelected((current) =>
                    (current + 1) % ITEMS.length
                )

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

    }, [
        activate,
        onResume,
    ])

    // ========================================================
    // BUTTON STYLE
    // ========================================================

    const btnClass = (active) => `
        cursor-pointer
        relative
        w-64
        py-3
        uppercase
        tracking-[0.45em]
        text-sm
        border
        transition-all
        duration-200

        ${
            active
                ? `
                    border-green-300
                    text-cyan-300
                    bg-cyan-500/10
                    shadow-[0_0_18px_rgba(0,255,255,0.35)]
                `
                : `
                    border-[#39ff14]/40
                    text-[#39ff14]/70
                    bg-black/40
                    hover:border-cyan-300/70
                    hover:text-cyan-300
                `
        }
    `

    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div
            className="
                absolute
                inset-0
                z-50
                flex
                items-center
                justify-center
                bg-black/65
                backdrop-blur-[2px]
                font-mono
            "
        >

            {/* ================================================= */}
            {/* SCANLINES */}
            {/* ================================================= */}

            <div
                className="
                    pointer-events-none
                    absolute
                    inset-0
                    opacity-20
                    bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.035)_51%)]
                    bg-size-[100%_4px]
                "
            />

            {/* ================================================= */}
            {/* RADAR / GLOW */}
            {/* ================================================= */}

            <div
                className="
                    pointer-events-none
                    absolute
                    h-140
                    w-140
                    rounded-full
                    border
                    border-cyan-400/10
                    shadow-[0_0_80px_rgba(0,255,255,0.04)]
                "
            />

            <div
                className="
                    pointer-events-none
                    absolute
                    h-100
                    w-100
                    rounded-full
                    border
                    border-[#39ff14]/10
                "
            />

            {/* ================================================= */}
            {/* PAUSE PANEL */}
            {/* ================================================= */}

            <div
                className="
                    relative
                    z-10
                    flex
                    min-w-[320px]
                    max-w-[90vw]
                    flex-col
                    items-center
                    border
                    border-cyan-400/40
                    bg-[#050910]/95
                    px-8
                    py-8
                    shadow-[0_0_40px_rgba(0,255,255,0.12)]
                "
            >

                {/* CORNERS */}

                <div className="
                    pointer-events-none
                    absolute
                    left-0
                    top-0
                    h-4
                    w-4
                    border-l-2
                    border-t-2
                    border-cyan-300
                " />

                <div className="
                    pointer-events-none
                    absolute
                    right-0
                    top-0
                    h-4
                    w-4
                    border-r-2
                    border-t-2
                    border-cyan-300
                " />

                <div className="
                    pointer-events-none
                    absolute
                    bottom-0
                    left-0
                    h-4
                    w-4
                    border-b-2
                    border-l-2
                    border-cyan-300
                " />

                <div className="
                    pointer-events-none
                    absolute
                    bottom-0
                    right-0
                    h-4
                    w-4
                    border-b-2
                    border-r-2
                    border-cyan-300
                " />

                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div
                    className="
                        mb-2
                        text-2xl
                        font-bold
                        tracking-[0.35em]
                        text-cyan-300
                        drop-shadow-[0_0_12px_rgba(0,255,255,0.6)]
                    "
                >
                    PAUSED
                </div>

                <div
                    className="
                        mb-8
                        text-[9px]
                        tracking-[0.35em]
                        text-white/30
                    "
                >
                    SYSTEM HALTED // COMBAT SUSPENDED
                </div>

                {/* ================================================= */}
                {/* MENU */}
                {/* ================================================= */}

                <div
                    className="
                        flex
                        flex-col
                        items-center
                        gap-3
                    "
                >

                    {ITEMS.map((item, index) => {

                        const active =
                            selected === index

                        return (

                            <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                    setSelected(index)
                                    item.action?.()
                                }}
                                onMouseEnter={() =>
                                    setSelected(index)
                                }
                                className={btnClass(active)}
                            >

                                {item.label}

                                {active && (

                                    <span
                                        className="
                                            absolute
                                            -left-5
                                            top-1/2
                                            -translate-y-1/2
                                            animate-pulse
                                            text-cyan-300
                                        "
                                    >
                                        ▶
                                    </span>

                                )}

                            </button>

                        )

                    })}

                </div>

                {/* ================================================= */}
                {/* FOOTER */}
                {/* ================================================= */}

                <div
                    className="
                        mt-7
                        text-[8px]
                        tracking-[0.25em]
                        text-white/20
                    "
                >
                    P / ESC — RESUME
                </div>

            </div>

        </div>
    )
}