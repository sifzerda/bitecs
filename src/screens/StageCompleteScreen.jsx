//src/screens/StageCompleteScreen.jsx

import { gameState } from "../state/gameState"
import { getWeapon } from "../ecs/weapons/config/weapons"

export function StageCompleteScreen({ onGuns }) {
    const weapon = getWeapon(gameState.pendingUnlockWeapon)

    return (

        <div className="h-screen bg-black flex justify-center items-center">
            <div className="w-96 border border-yellow-400 p-8 bg-[#101010]">
                <h1 className="text-4xl text-yellow-400">STAGE CLEAR</h1>

                {weapon && (
                    <>
                        <div className="mt-6">New Weapon Unlocked</div>
                        <div className="text-cyan-400 text-2xl">{weapon.name}</div>
                    </>
                )}

                <button className="mt-8 border p-3"
                    onClick={onGuns}>GUNS</button>

            </div>

        </div>
    )
}