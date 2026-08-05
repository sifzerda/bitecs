// src/screens/HowToPlayScreen.jsx

import { useState, useEffect, useCallback } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';

export default function HowToPlayScreen({ onBack }) {
  const [selected, setSelected] = useState(0);
  const [pressedKeys, setPressedKeys] = useState(() => new Set());
  const [mouseDown, setMouseDown] = useState(false);

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

      if (
        e.key === 'Enter' ||
        e.key === 'Escape' ||
        e.key === 'Backspace'
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

    const onBlur = () => {
      setPressedKeys(new Set());
      setMouseDown(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleBack]);

  const isPressed = (key) =>
    pressedKeys.has(key.toLowerCase());

  const activeClass = `
    border-cyan-300
    text-cyan-200
    bg-cyan-400/20
    shadow-[0_0_14px_rgba(0,255,255,0.75),inset_0_0_10px_rgba(0,255,255,0.18)]
  `;

  const inactiveClass = `
    border-white/40
    text-white
    bg-transparent
  `;

  const keyClass = (key) => `
    flex h-8 w-8 items-center justify-center
    border text-xs
    transition-all duration-75
    ${isPressed(key) ? activeClass : inactiveClass}
  `;

  const arrowKeyClass = (key) => `
    flex h-8 w-8 items-center justify-center
    border text-base leading-none
    transition-all duration-75
    ${isPressed(key) ? activeClass : inactiveClass}
  `;

  const wideKeyClass = (key) => `
    flex h-7 w-14 items-center justify-center
    border text-[10px]
    transition-all duration-75
    ${isPressed(key) ? activeClass : inactiveClass}
  `;

  const mouseButtonClass = `
    flex h-8 w-16 items-center justify-center
    border text-[9px]
    transition-all duration-75
    ${
      mouseDown
        ? activeClass
        : inactiveClass
    }
  `;

  return (
    <FlightLayout2 title="HOW TO PLAY" footer="SECTOR CLEAR">

      <div className="mx-auto inline-block text-left font-mono text-xs tracking-[0.2em] text-white/80">

        <div className="space-y-8">

          {/* ================================================= */}
          {/* MOUSE + KEYBOARD */}
          {/* ================================================= */}

          <section>

            <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">
              MOUSE + KEYBOARD
            </div>

            <div className="space-y-3">

              {/* MOUSE MOVEMENT */}
              <div className="flex items-center gap-4">

                {/* Mouse icon */}
                <div className="relative flex h-12 w-8 items-center justify-center">

                  <div className="
                    relative
                    h-11 w-7
                    rounded-[45%]
                    border border-white/50
                    bg-black/30
                  ">

                    {/* centre divider */}
                    <div className="
                      absolute
                      left-1/2 top-0
                      h-5 w-px
                      -translate-x-1/2
                      bg-white/30
                    " />

                    {/* mouse wheel */}
                    <div className="
                      absolute
                      left-1/2 top-2
                      h-2.5 w-1
                      -translate-x-1/2
                      border border-white/50
                      rounded-full
                    " />

                    {/* movement arrows */}
                    <span className="
                      absolute -left-4 top-1/2
                      -translate-y-1/2
                      text-cyan-300/60
                      text-[9px]
                    ">
                      ‹
                    </span>

                    <span className="
                      absolute -right-4 top-1/2
                      -translate-y-1/2
                      text-cyan-300/60
                      text-[9px]
                    ">
                      ›
                    </span>

                  </div>

                </div>

                <div>

                  <div className="text-white/80">
                    Mouse movement
                  </div>

                  <div className="mt-0.5 text-[9px] text-white/40">
                    Steer / turn
                  </div>

                </div>

              </div>


              {/* LEFT MOUSE BUTTON */}
              <div className="flex items-center gap-4">

                <div className={mouseButtonClass}>
                  LEFT MOUSE
                </div>

                <div>

                  <div className="text-white/80">
                    First mouse button
                  </div>

                  <div className="mt-0.5 text-[9px] text-white/40">
                    Fire gun
                  </div>

                </div>

              </div>

            </div>

          </section>


          {/* ================================================= */}
          {/* KEYBOARD ONLY */}
          {/* ================================================= */}

          <section>

            <div className="mb-3 text-[#39ff14]/60 tracking-[0.25em]">
              KEYBOARD ONLY
            </div>


            <div className="space-y-5">


              {/* ============================================= */}
              {/* MOVEMENT */}
              {/* ============================================= */}

              <div>

                <div className="mb-2 text-white/50 text-[9px] tracking-[0.2em]">
                  MOVEMENT
                </div>

                <div className="flex items-center gap-6">


                  {/* WASD */}
                  <div className="grid grid-cols-3 grid-rows-2 gap-1">

                    <div />

                    <div className={keyClass('w')}>
                      W
                    </div>

                    <div />

                    <div className={keyClass('a')}>
                      A
                    </div>

                    <div className={keyClass('s')}>
                      S
                    </div>

                    <div className={keyClass('d')}>
                      D
                    </div>

                  </div>


                  {/* OR */}
                  <div className="text-white/30 text-[9px]">
                    OR
                  </div>


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


                  <span className="text-white/70">
                    Thrust / steer
                  </span>

                </div>

              </div>


              {/* ============================================= */}
              {/* SHOOTING */}
              {/* ============================================= */}

              <div>

                <div className="mb-2 text-white/50 text-[9px] tracking-[0.2em]">
                  SHOOTING
                </div>

                <div className="flex items-center gap-3">

                  <div className={wideKeyClass(' ')}>
                    SPACE
                  </div>

                  <span className="text-white/70">
                    Fire gun
                  </span>

                </div>

              </div>


              {/* ============================================= */}
              {/* OTHER */}
              {/* ============================================= */}

              <div>

                <div className="mb-2 text-white/50 text-[9px] tracking-[0.2em]">
                  OTHER
                </div>

                <div className="space-y-2">


                  {/* BLOCK */}
                  <div className="flex items-center gap-3">

                    <div className={keyClass('b')}>
                      B
                    </div>

                    <span className="text-white/70">
                      Block
                    </span>

                  </div>


                  {/* PAUSE */}
                  <div className="flex items-center gap-3">

                    <div className={wideKeyClass('escape')}>
                      ESC
                    </div>

                    <span className="text-white/70">
                      Pause
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </section>

        </div>


        {/* ================================================= */}
        {/* BACK */}
        {/* ================================================= */}

        <div className="mt-10 flex justify-center">

          <button
            type="button"
            onClick={handleBack}
            onMouseEnter={() => setSelected(0)}
            className={`
              cursor-pointer relative w-56 py-3
              uppercase tracking-[0.45em] text-sm
              border transition-all duration-200

              ${
                selected === 0
                  ? 'border-green-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]'
                  : 'border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40'
              }
            `}
          >

            BACK

            {selected === 0 && (
              <span className="
                absolute -left-4 top-1/2
                -translate-y-1/2
                text-cyan-300
                animate-pulse
              ">
                ▶
              </span>
            )}

          </button>

        </div>

      </div>

    </FlightLayout2>
  );
}