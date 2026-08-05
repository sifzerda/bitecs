// src/screens/BossGallery.jsx

// src/screens/BossGallery.jsx

import { useRef, useCallback } from 'react'
import { BOSSES } from '../ecs/constants/bosses.js'
import BossIcon from '../components/BossIcon.jsx'
import FlightLayout2 from '../components/FlightLayout2.jsx'


function downloadSvg(svgEl, filename) {
    if (!svgEl) return

    const clone = svgEl.cloneNode(true)

    clone.setAttribute(
        'xmlns',
        'http://www.w3.org/2000/svg'
    )

    clone.setAttribute(
        'width',
        '1024'
    )

    clone.setAttribute(
        'height',
        '1024'
    )

    clone.setAttribute(
        'viewBox',
        '-3 -3 6 6'
    )

    /*
     * SVG exported from the browser should not depend
     * on Tailwind classes.
     */
clone
    .querySelectorAll('[class*="animate-"]')
    .forEach((el) => el.remove())

    const svgString =
        new XMLSerializer()
            .serializeToString(clone)

    const blob = new Blob(
        [svgString],
        {
            type: 'image/svg+xml;charset=utf-8',
        }
    )

    const url =
        URL.createObjectURL(blob)

    const a =
        document.createElement('a')

    a.href = url
    a.download = filename

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
}


function BossCard({ boss }) {

    const svgWrapperRef =
        useRef(null)

    const handleDownload =
        useCallback(() => {

            const svgEl =
                svgWrapperRef.current
                    ?.querySelector('svg')

            if (!svgEl) return

            const filename =
                `${boss.key}.svg`

            downloadSvg(
                svgEl,
                filename
            )

        }, [boss.key])


    return (
        <div
            className="
                border
                border-[#39ff14]/40
                bg-black/40
                p-4
                flex
                flex-col
                items-center
                gap-3
            "
        >

            {/* ================================================= */}
            {/* BOSS PREVIEW */}
            {/* ================================================= */}

            <div
                ref={svgWrapperRef}
                className="
                    w-full
                    aspect-square
                    border
                    border-white/10
                    bg-black/50
                    flex
                    items-center
                    justify-center
                    overflow-hidden
                    p-4
                "
            >

                <BossIcon
                    config={boss}
                    className="
                        w-full
                        h-full
                        max-w-full
                        max-h-full
                    "
                />

            </div>


            {/* ================================================= */}
            {/* NAME */}
            {/* ================================================= */}

            <div
                className="
                    text-cyan-300/90
                    text-xs
                    tracking-[0.15em]
                    text-center
                    min-h-[1rem]
                "
            >
                {boss.name}
            </div>


            {/* ================================================= */}
            {/* ID */}
            {/* ================================================= */}

            <div
                className="
                    text-white/30
                    text-[9px]
                    tracking-[0.2em]
                    uppercase
                "
            >
                {boss.key}
            </div>


            {/* ================================================= */}
            {/* DOWNLOAD */}
            {/* ================================================= */}

            <button
                type="button"
                onClick={handleDownload}
                className="
                    cursor-pointer
                    w-full
                    py-2
                    uppercase
                    tracking-[0.3em]
                    text-[10px]
                    border
                    border-[#39ff14]/40
                    text-[#39ff14]/70
                    bg-black/40
                    hover:border-cyan-300/70
                    hover:text-cyan-300
                    transition-all
                    duration-200
                "
            >
                Download SVG
            </button>

        </div>
    )
}


export default function BossGallery({
    onBack,
}) {

    return (
        <FlightLayout2
            title="BOSS GALLERY"
            footer="ASSET EXPORT"
            size="xl"
            centered={false}
        >

            <div
                className="
                    mx-auto
                    font-mono
                    text-xs
                    tracking-[0.2em]
                    text-white/80
                    w-full
                    max-w-6xl
                "
            >

                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div
                    className="
                        mb-6
                        flex
                        justify-between
                        items-center
                    "
                >

                    <div
                        className="
                            text-[#39ff14]/60
                            tracking-[0.25em]
                        "
                    >
                        {BOSSES.length} SHIPS
                    </div>


                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="
                                cursor-pointer
                                px-4
                                py-2
                                uppercase
                                tracking-[0.3em]
                                text-[10px]
                                border
                                border-[#39ff14]/40
                                text-[#39ff14]/70
                                bg-black/40
                                hover:border-cyan-300/70
                                hover:text-cyan-300
                                transition-all
                                duration-200
                            "
                        >
                            Back
                        </button>
                    )}

                </div>


                {/* ================================================= */}
                {/* SHIP GRID */}
                {/* ================================================= */}

                <div
                    className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        lg:grid-cols-3
                        xl:grid-cols-4
                        gap-4
                    "
                >

                    {BOSSES.map((boss) => (
                        <BossCard
                            key={boss.key}
                            boss={boss}
                        />
                    ))}

                </div>

            </div>

        </FlightLayout2>
    )
}