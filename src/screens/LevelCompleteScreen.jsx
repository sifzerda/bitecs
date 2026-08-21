// src/screens/LevelCompleteScreen.jsx

import {
  useEffect,
  useMemo,
} from "react"

import {
  useGameStore,
  formatLevelLabel,
} from "../../store/gameStore.js"

import {
  getWeapon,
} from "../ecs/weapons/config/weapons.js"

import {
  getGunTypeByWeaponId,
} from "../ecs/weapons/config/gunConfigs.js"

import FlightLayout2
  from "../components/FlightLayout2.jsx"


export function LevelCompleteScreen({
  onContinue,
  onGuns,
  onMenu,
}) {

  // ========================================================
  // STATE
  // ========================================================

  const level = useGameStore(
    (state) => state.level
  )

  const pendingUnlockWeapon = useGameStore(
    (state) => state.pendingUnlockWeapon
  )

  const clearedLabel =
    formatLevelLabel(level)


  // ========================================================
  // NEW WEAPON
  // ========================================================

  const unlockedWeapon = useMemo(() => {

    if (pendingUnlockWeapon == null) {
      return null
    }

    const weapon =
      getWeapon(pendingUnlockWeapon)

    const gun =
      getGunTypeByWeaponId(
        pendingUnlockWeapon
      )

    return {
      weapon,
      gun,
      name:
        gun?.name ??
        weapon?.name ??
        `WEAPON ${pendingUnlockWeapon}`,
    }

  }, [
    pendingUnlockWeapon,
  ])


  // ========================================================
  // KEYBOARD
  // ========================================================

  useEffect(() => {

    const onKey = (event) => {

      if (event.key === "Enter") {
        event.preventDefault()
        onContinue?.()
      }

      if (
        event.key === "g" ||
        event.key === "G"
      ) {
        event.preventDefault()
        onGuns?.()
      }

      if (
        event.key === "Escape" ||
        event.key === "Backspace"
      ) {
        event.preventDefault()
        onMenu?.()
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
    onContinue,
    onGuns,
    onMenu,
  ])


  // ========================================================
  // RENDER
  // ========================================================

  return (

    <FlightLayout2
      title="LEVEL COMPLETE"
      footer={`${clearedLabel} CLEARED`}
    >

      <div
        className="
          mt-10
          flex
          flex-col
          items-center
          gap-6
          text-center
          font-mono
        "
      >

        {/* ================================================== */}
        {/* CLEAR */}
        {/* ================================================== */}

        <div
          className="
            text-lg
            tracking-[0.3em]
            text-cyan-300
            drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]
          "
        >
          {clearedLabel} CLEARED
        </div>


        {/* ================================================== */}
        {/* NEW WEAPON */}
        {/* ================================================== */}

        {unlockedWeapon && (

          <div
            className="
              mt-2
              flex
              flex-col
              items-center
              gap-3
              border
              border-yellow-400/30
              bg-yellow-400/5
              px-10
              py-6
              shadow-[0_0_30px_rgba(255,220,50,0.08)]
            "
          >

            <div
              className="
                text-[9px]
                font-bold
                tracking-[0.35em]
                text-yellow-400/70
              "
            >
              NEW WEAPON UNLOCKED
            </div>

            <div
              className="
                text-2xl
                font-bold
                uppercase
                tracking-[0.25em]
                text-yellow-300
                drop-shadow-[0_0_12px_rgba(255,220,50,0.65)]
              "
            >
              {unlockedWeapon.name}
            </div>

            {unlockedWeapon.gun?.id && (
              <div
                className="
                  text-[7px]
                  tracking-[0.25em]
                  text-white/25
                "
              >
                {unlockedWeapon.gun.id}
              </div>
            )}

          </div>

        )}


        {/* ================================================== */}
        {/* NORMAL COMPLETE */}
        {/* ================================================== */}

        {!unlockedWeapon && (

          <div
            className="
              mt-2
              text-xs
              tracking-[0.25em]
              text-white/40
            "
          >
            LEVEL COMPLETE
          </div>

        )}


        {/* ================================================== */}
        {/* ACTIONS */}
        {/* ================================================== */}

        <div
          className="
            mt-4
            flex
            flex-col
            gap-3
            w-64
          "
        >

          {/* CONTINUE */}

          <button
            type="button"
            onClick={onContinue}
            className="
              relative
              w-full
              border-2
              border-cyan-300
              bg-cyan-500/10
              py-3
              text-cyan-300
              uppercase
              tracking-[0.4em]
              transition-all

              hover:bg-cyan-500/20
              hover:shadow-[0_0_18px_rgba(0,255,255,0.25)]
            "
          >
            <span className="mr-2">
              ▶
            </span>

            CONTINUE

            <span
              className="
                ml-2
                text-[8px]
                text-white/30
              "
            >
              [ENTER]
            </span>
          </button>


          {/* GUNS */}

          <button
            type="button"
            onClick={onGuns}
            className="
              relative
              w-full
              border
              border-yellow-400/50
              bg-yellow-400/5
              py-3
              text-yellow-300
              uppercase
              tracking-[0.4em]
              transition-all

              hover:border-yellow-300
              hover:bg-yellow-400/10
              hover:shadow-[0_0_18px_rgba(255,220,50,0.2)]
            "
          >
            GUNS

            <span
              className="
                ml-2
                text-[8px]
                text-white/30
              "
            >
              [G]
            </span>
          </button>


          {/* END GAME */}

          <button
            type="button"
            onClick={onMenu}
            className="
              w-full
              border
              border-[#39ff14]/30
              bg-black/40
              py-3
              text-[#39ff14]/60
              uppercase
              tracking-[0.4em]
              transition-all

              hover:border-[#39ff14]/60
              hover:text-cyan-300
            "
          >
            END GAME

            <span
              className="
                ml-2
                text-[8px]
                text-white/20
              "
            >
              [ESC]
            </span>
          </button>

        </div>

      </div>

    </FlightLayout2>
  )
}