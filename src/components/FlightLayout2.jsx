// src/components/FlightLayout.jsx

import { useEffect, useState } from 'react';

export default function FlightLayout({ title, footer, children,
  // layout controls
  size = 'md',
  scrollable = false,
  centered = true,
}) {

  const [typedTitle, setTypedTitle] = useState('');

  useEffect(() => {

    let i = 0;

    setTypedTitle('');

    const interval = setInterval(() => {

      setTypedTitle(title.slice(0, i + 1));

      i++;

      if (i >= title.length) {
        clearInterval(interval);
      }

    }, 60);

    return () => clearInterval(interval);

  }, [title]);

  const sizes = {
    sm: 'max-w-[420px]',
    md: 'max-w-[620px]',
    lg: 'max-w-[900px]',
    xl: 'max-w-[1200px]',
  };

  return (

    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16 text-[#39ff14]">
      {/* ========================================================= */}
      {/* HUD OVERLAY */}
      {/* ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* TOP ARC */}
        <div className="absolute left-1/2 top-6 h-px w-[65%] -translate-x-1/2 rounded-full bg-[#39ff14]/70 shadow-[0_0_12px_#39ff14]" />

        {/* BOTTOM ARC */}
        <div className="absolute bottom-6 left-1/2 h-px w-[45%] -translate-x-1/2 rounded-full bg-[#39ff14]/70 shadow-[0_0_12px_#39ff14]" />

        {/* ========================================================= */}
        {/* SIDE SCALES */}
        {/* ========================================================= */}
        <div className="hidden xl:block">

          {/* LEFT */}
          <div className="absolute left-10 top-1/2 h-[42vh] w-px -translate-y-1/2 bg-[#39ff14]/70 shadow-[0_0_10px_#39ff14]" />
          <div className="absolute left-10 top-1/2 -translate-y-1/2">

            {[...Array(9)].map((_, i) => (
              <div key={i} className="absolute left-0 h-px bg-[#39ff14]"
                style={{ width: i % 2 === 0 ? '28px' : '14px', top: `${i * 40}px`, transform: 'translateY(-160px)', }} />
            ))}

          </div>

          {/* RIGHT */}
          <div className="absolute right-10 top-1/2 h-[42vh] w-px -translate-y-1/2 bg-[#39ff14]/70 shadow-[0_0_10px_#39ff14]" />
          <div className="absolute right-10 top-1/2 -translate-y-1/2">

            {[...Array(9)].map((_, i) => (

              <div key={i} className="absolute right-0 h-px bg-[#39ff14]"
                style={{ width: i % 2 === 0 ? '28px' : '14px', top: `${i * 40}px`, transform: 'translateY(-160px)', }} />
            ))}

          </div>
        </div>

        {/* ========================================================= */}
        {/* TOP LABELS */}
        {/* ========================================================= */}
        <div className="absolute top-8 left-1/2 hidden -translate-x-1/2 gap-20 font-mono text-xs tracking-[0.35em] text-[#39ff14]/70 md:flex">

          <span>SPD</span>
          <span>LOC</span>
          <span>G/S</span>

        </div>

        {/* ========================================================= */}
        {/* HORIZONTAL FLIGHT LINE */}
        {/* ========================================================= */}
        <div className="absolute left-0 right-0 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative mx-auto h-px w-[88%] bg-[#39ff14]/60 shadow-[0_0_10px_#39ff14]">

            {/* center box */}
            <div className="absolute left-1/2 top-1/2 h-4 w-12 -translate-x-1/2 -translate-y-1/2 border border-[#39ff14] bg-black">
              <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[#39ff14] bg-black" />

            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COMPASS */}
        {/* ========================================================= */}
        <div className="absolute -bottom-10 left-1/2 hidden h-40 w-40 -translate-x-1/2 opacity-60 xl:block">
          <div className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-[#39ff14]/70" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONTENT PANEL */}
      {/* ========================================================= */}
      <section className={`relative z-10 w-[92%] ${sizes[size]} border border-[#39ff14]/50 bg-black/65 shadow-[0_0_24px_rgba(57,255,20,0.18)] backdrop-blur-sm`}>

        {/* TOP NOTCH */}
        <div className="absolute -top-px left-1/2 h-2 w-10 -translate-x-1/2 border border-[#39ff14]/60 bg-black" />

        {/* INNER FRAME */}
        <div className="absolute inset-3 border border-[#39ff14]/10" />

        {/* PANEL CONTENT */}
        <div className="relative z-10 p-6 md:p-8">

          {/* ========================================================= */}
          {/* TITLE */}
          {/* ========================================================= */}

          <div className="mb-8 flex flex-col items-center">
            <div className="mb-3 text-[10px] tracking-[0.45em] text-[#39ff14]/60">FLIGHT CONTROL SYSTEM</div>
            <div className="relative overflow-hidden border-b border-cyan-400/60 bg-linear-to-b from-[#120018]/90 via-black/80 to-[#050510]/95 px-6 py-4 shadow-[0_0_30px_rgba(0,255,255,0.15)] backdrop-blur-md">

              {/* synthwave glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,0,180,0.14),transparent_55%), radial-gradient(circle_at_bottom,rgba(0,255,255,0.10),transparent_60%)]" />

              {/* scanlines */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.035)_51%)] bg-size-[100%_4px] opacity-40" />

              {/* top neon line */}
              <div className="absolute left-0 top-0 h-px w-full bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00ffff]" />
              <div className="relative flex justify-center">

                {/* width stabilizer (prevents box resizing while typing) */}
                <span className="invisible font-audiowide text-2xl md:text-3xl uppercase whitespace-nowrap tracking-[0.28em]">
                  {title}
                </span>

                {/* layered title system */}
                <div className="absolute inset-0 flex justify-center">

                  {/* RED */}
                  <span aria-hidden="true" className="absolute font-audiowide text-2xl md:text-3xl uppercase whitespace-nowrap tracking-widest blur-[2px] text-red-500/80 -translate-x-1">
                    {typedTitle}
                  </span>

                  {/* BLUE */}
                  <span aria-hidden="true" className="absolute font-audiowide text-2xl md:text-3xl uppercase whitespace-nowrap tracking-widest blur-[2px] text-cyan-400/80 translate-x-1">
                    {typedTitle}
                  </span>

                  {/* WHITE */}
                  <span aria-hidden="true" className="absolute font-audiowide text-2xl md:text-3xl uppercase whitespace-nowrap tracking-widest text-white">
                    {typedTitle}
                  </span>

                </div>
              </div>

            </div>

          </div>

          {/* ========================================================= */}
          {/* CHILD CONTENT */}
          {/* ========================================================= */}
          <div className={`relative z-10 flex flex-col gap-5
              ${centered ? 'items-center text-center' : ''}
              ${scrollable
              ? 'max-h-[55vh] overflow-y-auto pr-2'
              : ''}`}>
            {children}
          </div>

          {/* ========================================================= */}
          {/* FOOTER */}
          {/* ========================================================= */}
          <div className="mt-8 flex items-center justify-between border-t border-[#39ff14]/20 pt-3 font-mono text-[10px] tracking-[0.25em] text-[#39ff14]/60">

            <span>NAV READY</span>
            <span>{footer || 'SYS NOMINAL'}</span>
            <span>HDG 240</span>

          </div>
        </div>

      </section>
    </main>
  );
}