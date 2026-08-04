// src/screens/GunGallery.jsx

import { useRef, useCallback } from 'react'
import { GUN_TYPES } from '../ecs/weapons/config/gunConfigs.js'
import GunIcon from '../components/GunIcon.jsx'
import FlightLayout2 from '../components/FlightLayout2.jsx'

function downloadSvg(svgEl, filename) {
    if (!svgEl) return

    // clone so we don't mutate the live DOM node
    const clone = svgEl.cloneNode(true)

    // ensure standalone SVG has proper namespace + explicit size
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    if (!clone.getAttribute('width')) clone.setAttribute('width', '420')
    if (!clone.getAttribute('height')) clone.setAttribute('height', '220')

    // strip any elements/classes that depend on Tailwind animation classes
    // (animate-muzzle-flash / animate-bullet-fire won't exist outside the app's CSS)
    clone.querySelectorAll('[class*="animate-"]').forEach((el) => el.remove())

    const svgString = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function GunCard({ gun }) {
    const svgWrapperRef = useRef(null)

    const handleDownload = useCallback(() => {
        const svgEl = svgWrapperRef.current?.querySelector('svg')
        const filename = `${gun.id}.svg`
        downloadSvg(svgEl, filename)
    }, [gun.id])

    return (
        <div className="border border-[#39ff14]/40 bg-black/40 p-4 flex flex-col items-center gap-3">
            <div
                ref={svgWrapperRef}
                className="w-full aspect-[420/220] border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden"
            >
                <GunIcon config={gun.config} className="w-full h-full max-w-[80%] max-h-[80%]" />
            </div>

            <div className="text-cyan-300/90 text-xs tracking-[0.15em] text-center">
                {gun.name}
            </div>

            <button
                type="button"
                onClick={handleDownload}
                className="cursor-pointer w-full py-2 uppercase tracking-[0.3em] text-[10px] border border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40 hover:border-cyan-300/70 hover:text-cyan-300 transition-all duration-200"
            >
                Download SVG
            </button>
        </div>
    )
}

export default function GunGallery({ onBack }) {
    return (
        <FlightLayout2 title="GUN GALLERY" footer="ASSET EXPORT" size="xl" centered={false} scrollable>
            <div className="mx-auto font-mono text-xs tracking-[0.2em] text-white/80 w-full max-w-5xl">

                <div className="mb-6 flex justify-between items-center">
                    <div className="text-[#39ff14]/60 tracking-[0.25em]">
                        {GUN_TYPES.length} WEAPONS
                    </div>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="cursor-pointer px-4 py-2 uppercase tracking-[0.3em] text-[10px] border border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40 hover:border-cyan-300/70 hover:text-cyan-300 transition-all duration-200"
                        >
                            Back
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {GUN_TYPES.map((gun) => (
                        <GunCard key={gun.id} gun={gun} />
                    ))}
                </div>

            </div>
        </FlightLayout2>
    )
}