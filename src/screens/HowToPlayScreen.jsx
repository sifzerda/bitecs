// src/screens/HowToPlayScreen.jsx

import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"
import FlightLayout2 from '../components/FlightLayout2.jsx';

const PAGES = ['mouse', 'keyboard'];

export default function HowToPlayScreen({ onBack }) {

  useScreenKeys({ escape: () => onBack?.(), backspace: () => onBack?.() })
  return <FlightLayout2 title="HOW TO PLAY" footer="FLIGHT MANUAL" scrollable>

    <div className="mx-auto max-w-2xl font-mono text-white/80">
     
      <table className="w-full text-left text-sm"><thead className="text-cyan-200"><tr><th className="p-3">Action</th>
      
        <th>Control</th></tr></thead>
       
        <tbody>{[
          ["Thrust", "W / Up"],
          ["Brake to stop", "S / Down"],
          ["Rotate · keyboard mode", "A / D or Left / Right"],
          ["Aim · mouse mode", "Move mouse"],
          ["Fire", "Space / Left mouse in mouse mode"],
          ["Deflect", "X / Right mouse in mouse mode"],
          ["Pause / resume", "P / Escape"]]
          .map(([a, b]) => 
          <tr key={a} className="border-t border-white/10">
            <td className="p-3">{a}</td><td>{b}</td></tr>
          )}</tbody></table>

      <p className="mt-6 text-sm leading-relaxed">Clear each asteroid wave, then defeat the zone boss. Open Guns after a weapon unlock to equip it. Deflect briefly reflects nearby projectiles; wait for its cooldown before using it again. Contact damages health; losing all health costs a life.</p>

      <ScreenActions items={[{ label: "Back", action: onBack }]} />
    </div>

  </FlightLayout2>
}
