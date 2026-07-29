// src/components/FlightLayout.jsx

import { useEffect, useState } from 'react';

export default function FlightLayout({title, footer, children}) {
    const [typedTitle, setTypedTitle] = useState("");

    useEffect(() => {
        let i = 0;

        const interval = setInterval(() => {
            setTypedTitle(title.slice(0, i + 1));
            i++;

            if (i >= title.length) {
                clearInterval(interval);
            }
        }, 120);

        return () => clearInterval(interval);
    }, [title]);

    return (
        <main className="relative flex flex-1 items-center justify-center overflow-hidden text-[#39ff14]">

            {/* ================= HUD OVERLAY ================= */}

            <div className="pointer-events-none absolute inset-0 overflow-hidden">

                {/* TOP ARC */}
                <div className="absolute left-1/2 top-6 h-px w-[72%] -translate-x-1/2 rounded-full bg-[#39ff14] shadow-[0_0_18px_#39ff14]" />

                {/* BOTTOM ARC */}
                <div className="absolute bottom-6 left-1/2 h-px w-[52%] -translate-x-1/2 rounded-full bg-[#39ff14] shadow-[0_0_18px_#39ff14]" />

                {/* LEFT SCALE */}
                <div className="absolute left-10 top-1/2 h-[58vh] w-px -translate-y-1/2 bg-[#39ff14]/90 shadow-[0_0_10px_#39ff14]" />

                {/* RIGHT SCALE */}
                <div className="absolute right-10 top-1/2 h-[58vh] w-px -translate-y-1/2 bg-[#39ff14]/90 shadow-[0_0_10px_#39ff14]" />

                {/* LEFT TICKS */}
                <div className="absolute left-10 top-1/2 -translate-y-1/2">
                    {[...Array(11)].map((_, i) => (
                        <div key={i} className="absolute left-0 h-px bg-[#39ff14]"
                            style={{width: i % 2 === 0 ? "34px" : "18px", top: `${i * 52}px`, transform: "translateY(-260px)" }} />))}
                </div>

                {/* RIGHT TICKS */}
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    {[...Array(11)].map((_, i) => (
                        <div key={i} className="absolute right-0 h-px bg-[#39ff14]"
                            style={{width: i % 2 === 0 ? "34px" : "18px", top: `${i * 52}px`, transform: "translateY(-260px)" }} />))}
                </div>

                {/* TOP LABELS */}
                <div className="absolute top-8 left-1/2 flex -translate-x-1/2 gap-24 font-mono text-xs tracking-[0.35em] text-[#39ff14]">
                    <span>SPD</span>
                    <span>LOC</span>
                    <span>G/S</span>
                </div>

                {/* LEFT NUMBERS */}
                <div className="absolute left-5 top-[28%] font-mono text-2xl tracking-widest text-[#39ff14]/90">168</div>
                <div className="absolute left-14 top-[50%] font-mono text-xl tracking-widest text-[#39ff14]/80">GS170</div>

                {/* RIGHT NUMBERS */}
                <div className="absolute right-5 top-[28%] font-mono text-2xl tracking-widest text-[#39ff14]/90">140</div>
                <div className="absolute right-14 top-[50%] font-mono text-xl tracking-widest text-[#39ff14]/80">BARO</div>

                {/* ================= CALIBRATED DISPLAY ================= */}

                <div className="absolute left-1/2 top-[8%] -translate-x-1/2">
                    <div className="relative flex flex-col items-center">

                        <div className="mb-2 flex items-center gap-12 font-mono text-xs tracking-[0.3em] text-[#39ff14]">
                            <span>ROLLOUT</span>
                            <span>FLARE</span>
                        </div>

                        <div className="mb-3 font-mono text-xs tracking-[0.3em] text-[#39ff14]">
                            A/P
                        </div>

                        <div className="relative flex flex-col items-center">
                            {/* arrow */}
                            <div className="h-0 w-0 border-l-8 border-r-8 border-t-14 border-l-transparent border-r-transparent border-t-[#39ff14]" />
                            {/* line */}
                            <div className="h-6 w-px bg-[#39ff14]" />
                            {/* box */}
                            <div className="relative h-3 w-12 border border-[#39ff14]">

                                {/* left marks */}
                                <div className="absolute -left-20 top-1/2 flex -translate-y-1/2 gap-4">
                                    <div className="h-4 w-0.5 bg-[#39ff14]" />
                                    <div className="h-7 w-0.5 bg-[#39ff14]" />
                                </div>
                                {/* right marks */}
                                <div className="absolute -right-20 top-1/2 flex -translate-y-1/2 gap-4">
                                    <div className="h-7 w-0.5 bg-[#39ff14]" />
                                    <div className="h-4 w-0.5 bg-[#39ff14]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= HORIZONTAL FLIGHT LINE ================= */}

                <div className="absolute left-0 right-0 top-1/2 -translate-y-45">

                    <div className="relative mx-auto h-px w-[92%] bg-[#39ff14] shadow-[0_0_10px_#39ff14]">
                        {/* center box */}
                        <div className="absolute left-1/2 top-1/2 h-4 w-12 -translate-x-1/2 -translate-y-1/2 border border-[#39ff14] bg-black">
                            {/* notch */}
                            <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[#39ff14] bg-black" />
                        </div>
                    </div>
                </div>

                {/* left floating indicators */}
                <div className="absolute left-[18%] top-1/2 flex flex-col gap-8 text-[#39ff14]">
                    <div className="h-2 w-2 rotate-45 bg-[#39ff14]" />
                    <div className="h-2 w-2 rounded-full border border-[#39ff14]" />
                    <div className="h-2 w-2 rounded-full border border-[#39ff14]" />
                </div>

                {/* right floating indicators */}
                <div className="absolute right-[18%] top-1/2 flex flex-col gap-8 text-[#39ff14]">
                    <div className="h-2 w-2 rotate-45 bg-[#39ff14]" />
                    <div className="h-2 w-2 rounded-full border border-[#39ff14]" />
                    <div className="h-2 w-2 rounded-full border border-[#39ff14]" />
                </div>

                {/* ================= FULL COMPASS ================= */}

                <div className="absolute -bottom-27.5 left-1/2 h-55 w-55 -translate-x-1/2">
                    {/* vertical line */}
                    <div className="absolute left-1/2 top-10 bottom-10 w-0.5 -translate-x-1/2 bg-[#39ff14]/80" />
                    {/* ticks */}
                    {[...Array(72)].map((_, i) => {
                        const long = i % 2 === 0;

                        return (
                            <div
                                key={i}
                                className="absolute left-1/2 top-1/2 origin-center"
                                style={{
                                    transform: `translate(-50%, -50%) rotate(${i * 5}deg)`,
                                }}
                            >
                                <div
                                    className="bg-[#39ff14]"
                                    style={{
                                        width: "2px",
                                        height: long ? "18px" : "9px",
                                        transform: "translateY(-150px)",
                                    }}
                                />
                            </div>
                        );
                    })}

                    {/* numbers */}
                    {[
                        { n: "15", d: 281 },
                        { n: "18", d: 311 },
                        { n: "21", d: 340 },
                        { n: "24", d: 10 },
                        { n: "27", d: 40 },
                        { n: "30", d: 70 },
                        { n: "35", d: 100 },
                    ].map((item, i) => (
                        <div key={i} className="absolute left-1/2 top-1/2 font-mono text-[16px] text-[#39ff14]"
                            style={{ transform: `
                                    translate(-50%, -50%)
                                    rotate(${item.d}deg)
                                    translateY(-127px)
                                    rotate(-${item.d}deg)` }}>
                            {item.n}
                        </div>
                    ))}

                    {/* top marker */}
                    <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
                        <div className="-mt-18.75 border-l-10 border-r-10 border-t-20 border-l-transparent border-r-transparent border-t-[#39ff14]" />
                        <div className="mt-5 h-30 w-0.5 bg-[#39ff14]" />
                    </div>

                    {/* top dots */}
                    <div className="absolute -top-16 left-1/2 flex -translate-x-1/2 gap-20">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-2 w-2 rounded-full border border-[#39ff14]" />
                        ))}
                    </div>

                </div>
            </div>

            {/* ================= INPUT PANEL ================= */}

            <section className="relative z-10 w-[90%] max-w-97.5 border border-[#39ff14]/70 bg-black/65 p-6 shadow-[0_0_24px_rgba(57,255,20,0.2)] backdrop-blur-sm">

                {/* top notch */}
                <div className="absolute -top-px left-1/2 h-2 w-8 -translate-x-1/2 border border-[#39ff14]/70 bg-black" />

                {/* scanline overlay */}
                <div className="scanlines" />

                <h1 className="font-audiowide text-center text-xl tracking-[0.3em] uppercase text-green-300 drop-shadow-[0_0_6px_rgba(0,255,0,0.6)]">
                    {typedTitle}
                    <span className="cursor-blink">▍</span>
                </h1>

                {children}

                {/* system status */}
                <div className="mt-6 flex items-center justify-between border-t border-[#39ff14]/25 pt-2 font-mono text-[10px] tracking-[0.22em] text-[#39ff14]/70">
                    <span>NAV READY</span>
                    <span>SYS NOMINAL</span>
                    <span>HDG 240</span>
                </div>

                {/* footer */}
                {footer && (
                    <div className="mt-4 text-center font-mono text-xs tracking-[0.22em] text-[#39ff14]/70">
                        {footer}
                    </div>
                )}
            </section>
        </main>
    );
}


