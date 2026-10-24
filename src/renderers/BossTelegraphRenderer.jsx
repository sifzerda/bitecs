import {useLayoutEffect,useMemo,useRef} from "react"
import {useFrame,useThree} from "@react-three/fiber"
import * as THREE from "three"
import {bossFightState as s,setBossArenaSize} from "../ecs/systems/bossAISystem.js"
import {Position,BossType} from "../ecs/constants/components.js"
import {bossAIQuery} from "../ecs/constants/queries.js"
import {BOSSES} from "../ecs/constants/bosses.js"
import {startState} from "../state/startState.js"
export function BossTelegraphRenderer(){
 const lines=useRef(),ring=useRef()
 const viewport=useThree(state=>state.viewport)
 const positions=useMemo(()=>new Float32Array(24),[])
 useLayoutEffect(()=>{setBossArenaSize(viewport.width,viewport.height)},[viewport.width,viewport.height])
 useFrame(()=>{
  if(!lines.current||!ring.current)return
  const exists=s.eid>=0&&bossAIQuery().includes(s.eid)&&startState.encounterPhase==="active"
  const warning=exists&&s.warning&&!s.frozen
  lines.current.visible=warning
  ring.current.visible=exists&&(warning||s.phase==="recover")
  if(!exists)return
  const config=BOSSES[BossType.typeIndex[s.eid]]
  ring.current.position.set(Position.x[s.eid],Position.y[s.eid],0.3)
  ring.current.scale.setScalar((config?.hitRadius??2)+0.35)
  ring.current.material.color.set(warning?"#ffcc33":"#44ff99")
  ring.current.material.opacity=warning?0.45+0.45*Math.min(1,s.timer/(s.pattern?.warning??1)):0.55
  if(!warning)return
  // Outline the planned attack lane, including twin muzzle offsets.
  const half=Math.max(0.012,s.coneAngle/2)
  const angle=Math.atan2(s.dirY,s.dirX)
  const perpendicularX=-s.dirY,perpendicularY=s.dirX
  let count=0
  for(const sign of [-1,1]){
   const ox=s.originX+perpendicularX*s.gap*sign,oy=s.originY+perpendicularY*s.gap*sign
   for(const side of [-1,1]){
    const a=angle+side*half,j=count*6
    positions[j]=ox;positions[j+1]=oy;positions[j+2]=0.3
    positions[j+3]=ox+Math.cos(a)*s.range;positions[j+4]=oy+Math.sin(a)*s.range;positions[j+5]=0.3
    count++
   }
  }
  lines.current.geometry.attributes.position.needsUpdate=true
 })
 return <>
  <lineSegments ref={lines} visible={false} frustumCulled={false} renderOrder={90}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><lineBasicMaterial color="#ffcc33" transparent opacity={0.7} depthTest={false} depthWrite={false} toneMapped={false}/></lineSegments>
  <mesh ref={ring} visible={false} renderOrder={90}><ringGeometry args={[0.97,1,48]}/><meshBasicMaterial color="#ffcc33" transparent depthTest={false} depthWrite={false} toneMapped={false}/></mesh>
 </>
}
