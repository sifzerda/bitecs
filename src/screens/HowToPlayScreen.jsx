// src/screens/HowToPlayScreen.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';

const PAGES = ['mouse', 'keyboard'];

export default function HowToPlayScreen({ onBack }) {
  const [selected, setSelected] = useState(0);
  const [pressedKeys, setPressedKeys] = useState(() => new Set());
  const [mouseDown, setMouseDown] = useState(false);
  const [mouseMoving, setMouseMoving] = useState(false);
  const mouseMoveTimeout = useRef(null);

  // Carousel state: which page is showing, plus a fade flag for the crossfade
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimeout = useRef(null);

  const goToPage = useCallback((next) => {
    setVisible(false);

    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current);
    }

    fadeTimeout.current = setTimeout(() => {
      setPage(next);
      setVisible(true);
    }, 150);
  }, []);

  const setPageDirect = useCallback((index) => {
    goToPage(index);
  }, [goToPage]);

  const nextPageIndex = (page + 1) % PAGES.length;
  const prevPageIndex = (page - 1 + PAGES.length) % PAGES.length;

  useEffect(() => {
    return () => {
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current);
      }
    };
  }, []);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();

      setPressedKeys((prev) => {
        if (prev.has(key)) return prev;

        const next = new Set(prev);
        next.add(key);
        return next;
      });

      if (e.key === 'Tab') {
        e.preventDefault();
        setPageDirect(nextPageIndex);
      }

      if (
        e.key === 'Enter' || e.key === 'Escape' || e.key === 'Backspace'
      ) {
        e.preventDefault();
        handleBack();
      }
    };

    const onKeyUp = (e) => {
      const key = e.key.toLowerCase();

      setPressedKeys((prev) => {
        if (!prev.has(key)) return prev;

        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    const onMouseDown = (e) => {
      if (e.button === 0) {
        setMouseDown(true);
      }
    };

    const onMouseUp = (e) => {
      if (e.button === 0) {
        setMouseDown(false);
      }
    };

    const onMouseMove = () => {
      setMouseMoving(true);

      if (mouseMoveTimeout.current) {
        clearTimeout(mouseMoveTimeout.current);
      }

      mouseMoveTimeout.current = setTimeout(() => {
        setMouseMoving(false);
      }, 150);
    };

    const onBlur = () => {
      setPressedKeys(new Set());
      setMouseDown(false);
      setMouseMoving(false);
      if (mouseMoveTimeout.current) {
        clearTimeout(mouseMoveTimeout.current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
      if (mouseMoveTimeout.current) {
        clearTimeout(mouseMoveTimeout.current);
      }
    };
  }, [handleBack, nextPageIndex, setPageDirect]);

  const isPressed = (key) =>
    pressedKeys.has(key.toLowerCase());

  const activeClass = `border-cyan-300 text-cyan-200 bg-cyan-400/20 shadow-[0_0_14px_rgba(0,255,255,0.75),inset_0_0_10px_rgba(0,255,255,0.18)]`;
  const inactiveClass = `border-white/40 text-white bg-transparent`;

  const keyClass = (key) => `flex h-8 w-8 items-center justify-center border text-xs transition-all duration-75
    ${isPressed(key) ? activeClass : inactiveClass}
  `;

  const arrowKeyClass = (key) => `flex h-8 w-8 items-center justify-center border text-base leading-none transition-all duration-75
    ${isPressed(key) ? activeClass : inactiveClass}
  `;

  const wideKeyClass = (key) => `flex h-7 w-14 items-center justify-center border text-[10px] transition-all duration-75
    ${isPressed(key) ? activeClass : inactiveClass}
  `;

  // Mouse body/parts glow while moving
  const mouseBodyClass = `relative h-11 w-7 rounded-[45%] border bg-black/30 overflow-hidden transition-all duration-75
    ${mouseMoving
      ? 'border-cyan-300 shadow-[0_0_14px_rgba(0,255,255,0.75),inset_0_0_10px_rgba(0,255,255,0.18)]'
      : 'border-white/50'
    }
  `;

  const mouseDividerClass = `absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 z-10 transition-all duration-75
    ${mouseMoving ? 'bg-cyan-300/70' : 'bg-white/30'}
  `;

  const mouseWheelClass = `absolute left-1/2 top-2 h-2.5 w-1 -translate-x-1/2 border rounded-full z-10 transition-all duration-75
    ${mouseMoving ? 'border-cyan-300' : 'border-white/50'}
  `;

  const mouseArrowClass = `text-[9px] transition-all duration-75
    ${mouseMoving ? 'text-cyan-300' : 'text-cyan-300/60'}
  `;

  // Left button = top-left quarter of the mouse body, highlights on left-click
  const mouseLeftButtonClass = `absolute left-0 top-0 h-5 w-1/2 rounded-tl-[45%] transition-all duration-75
    ${mouseDown ? 'bg-cyan-400/30 shadow-[inset_0_0_8px_rgba(0,255,255,0.75)]' : 'bg-transparent'}
  `;

  const pageLabel = PAGES[page] === 'mouse' ? 'MOUSE + KEYBOARD' : 'KEYBOARD ONLY';

  return (
    <FlightLayout2 title="HOW TO PLAY" footer="SECTOR CLEAR">

      <div className="mx-auto inline-block text-left font-mono text-xs tracking-[0.2em] text-white/80 w-full max-w-md">

        {/* ================================================= */}
        {/* CAROUSEL TOGGLE */}
        {/* ================================================= */}

        <div className="mb-6 flex items-center justify-center gap-4">

          <button
            type="button"
            onClick={() => setPageDirect(prevPageIndex)}
            aria-label="Previous controls page"
            className="cursor-pointer flex h-7 w-7 items-center justify-center border border-[#39ff14]/40 text-[#39ff14]/70 hover:border-cyan-300 hover:text-cyan-300 transition-all duration-150"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => setPageDirect(nextPageIndex)}
            className="cursor-pointer min-w-[220px] border border-[#39ff14]/40 bg-black/40 px-4 py-2 text-center uppercase tracking-[0.3em] text-cyan-300 hover:border-cyan-300 hover:shadow-[0_0_14px_rgba(0,255,255,0.35)] transition-all duration-150"
          >
            {pageLabel}
          </button>

          <button
            type="button"
            onClick={() => setPageDirect(nextPageIndex)}
            aria-label="Next controls page"
            className="cursor-pointer flex h-7 w-7 items-center justify-center border border-[#39ff14]/40 text-[#39ff14]/70 hover:border-cyan-300 hover:text-cyan-300 transition-all duration-150"
          >
            ›
          </button>

        </div>

        {/* page dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {PAGES.map((p, i) => (
            <span
              key={p}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${i === page ? 'bg-cyan-300 shadow-[0_0_6px_rgba(0,255,255,0.8)]' : 'bg-white/20'
                }`}
            />
          ))}
        </div>

        {/* ================================================= */}
        {/* PAGE CONTENT (crossfades between mouse / keyboard) */}
        {/* ================================================= */}

        <div className={`transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>

          {PAGES[page] === 'mouse' && (

            <section>

              <div className="space-y-3">

                {/* MOUSE MOVEMENT + LEFT BUTTON (highlighted on the icon itself) */}
                <div className="flex items-center gap-4">

                  {/* Mouse icon */}
                  <div className="relative flex h-12 w-8 items-center justify-center">

                    <div className={mouseBodyClass}>

                      {/* left button highlight */}
                      <div className={mouseLeftButtonClass} />

                      {/* centre divider */}
                      <div className={mouseDividerClass} />

                      {/* mouse wheel */}
                      <div className={mouseWheelClass} />

                      {/* movement arrows */}
                      <span className={`absolute -left-4 top-1/2 -translate-y-1/2 ${mouseArrowClass}`}>
                        ‹
                      </span>

                      <span className={`absolute -right-4 top-1/2 -translate-y-1/2 ${mouseArrowClass}`}>
                        ›
                      </span>

                    </div>

                  </div>

                  <div>

                    <div className="text-green-400 text-md tracking-[0.3em]">Mouse movement</div>
                    <div className="mt-0.5 text-md text-white/90">Steer / turn</div>

                  </div>

                </div>


                {/* LEFT MOUSE BUTTON (label only — the icon above lights up now) */}
                <div className="flex items-center gap-4">

                  <div className="relative flex h-12 w-8 items-center justify-center" />

                  <div>

                    <div className="text-green-400 text-md tracking-[0.3em]">Left Mouse Button</div>
                    <div className="mt-0.5 text-md text-white/90">Fire gun</div>

                  </div>

                </div>


                {/* ACCELERATE / REVERSE */}
                <div className="flex items-center gap-4">

                  <div className="flex flex-col items-center gap-1">
                    <div className={keyClass('w')}>W</div>
                    <div className={keyClass('s')}>S</div>
                  </div>

                  <div>

                    <div className="text-green-400 text-md tracking-[0.3em]">W key / S key</div>
                    <div className="mt-0.5 text-md text-white/90">Accelerate / Reverse</div>

                  </div>

                </div>


                {/* BLOCK */}
                <div className="flex items-center gap-4">

                  <div className={keyClass('b')}>B</div>

                  <div>

                    <div className="text-green-400 text-md tracking-[0.3em]">B key</div>
                    <div className="mt-0.5 text-md text-white/90">Block</div>

                  </div>

                </div>

              </div>

            </section>

          )}

          {PAGES[page] === 'keyboard' && (

            <section>

              <div className="space-y-5">

                {/* ============================================= */}
                {/* MOVEMENT */}
                {/* ============================================= */}

                <div>

                  <div className="mb-2 text-green-400 text-md tracking-[0.3em]">MOVEMENT</div>

                  <div className="flex items-start gap-6">

                    <div className="flex items-center gap-6">

                      {/* WASD */}
                      <div className="grid grid-cols-3 grid-rows-2 gap-1">

                        <div />

                        <div className={keyClass('w')}>W</div>

                        <div />

                        <div className={keyClass('a')}>A</div>
                        <div className={keyClass('s')}>S</div>
                        <div className={keyClass('d')}>D</div>

                      </div>

                      {/* OR */}
                      <div className="text-cyan-300 text-md">OR</div>

                      {/* ARROWS */}
                      <div className="grid grid-cols-3 grid-rows-2 gap-1">

                        <div />

                        <div className={arrowKeyClass('arrowup')}>
                          ↑
                        </div>

                        <div />

                        <div className={arrowKeyClass('arrowleft')}>
                          ←
                        </div>

                        <div className={arrowKeyClass('arrowdown')}>
                          ↓
                        </div>

                        <div className={arrowKeyClass('arrowright')}>
                          →
                        </div>

                      </div>

                    </div>

                    {/* Per-key breakdown */}
                    <div className="space-y-1 mt-0.5 text-md text-white/90">
                      <div>W / ↑ — Accelerate</div>
                      <div>S / ↓ — Reverse</div>
                      <div>A/D or ←/→ — Steer</div>
                    </div>

                  </div>

                </div>


                {/* ============================================= */}
                {/* SHOOTING */}
                {/* ============================================= */}

                <div>

                   <div className="mb-2 text-green-400 text-md tracking-[0.3em]">SHOOTING</div>
                  <div className="flex items-center gap-3">
                    <div className={wideKeyClass(' ')}>SPACE</div>
                    <span className="text-md text-white/90">Fire gun</span>

                  </div>

                </div>


                {/* ============================================= */}
                {/* OTHER */}
                {/* ============================================= */}

                <div>

                   <div className="mb-2 text-green-400 text-md tracking-[0.3em]">OTHER</div>
                  <div className="space-y-2">


                    {/* BLOCK */}
                    <div className="flex items-center gap-3">
                      <div className={keyClass('b')}>B</div>
                      <span className="text-md text-white/90">Block</span>

                    </div>


                    {/* PAUSE */}
                    <div className="flex items-center gap-3">
                      <div className={wideKeyClass('escape')}>ESC</div>
                      <span className="text-md text-white/90">Pause</span>

                    </div>

                  </div>

                </div>

              </div>

            </section>

          )}

        </div>


        {/* ================================================= */}
        {/* BACK */}
        {/* ================================================= */}

        <div className="mt-10 flex justify-center">

          <button
            type="button"
            onClick={handleBack}
            onMouseEnter={() => setSelected(0)}
            className={`cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200

              ${selected === 0
                ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
                : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
              }`}>
            BACK
            {selected === 0 && (<span className="absolute -left-4 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">▶</span>)}
          </button>

        </div>

      </div>

    </FlightLayout2>
  );
}