// src/renderers/TentacleBossRenderer.jsx

import {useLayoutEffect,useMemo,useRef} from "react"
import {useFrame,useThree} from "@react-three/fiber"
import * as THREE from "three"
import {OCTOPUS,octopusState as s,setOctopusViewport,findOctopusBoss} from "../ecs/systems/octopusBossSystem.js"
import {Health} from "../ecs/constants/components.js"
import {startState} from "../state/startState.js"
export function TentacleBossRenderer(){
 const arms=useRef(),core=useRef(),warning=useRef()
 const viewport=useThree(state=>state.viewport)
 useLayoutEffect(()=>{setOctopusViewport(viewport.width,viewport.height)},[viewport.width,viewport.height])
 const d=useMemo(()=>({dummy:new THREE.Object3D(),idle:new THREE.Color("#64439b"),warning:new THREE.Color("#ffcc33"),attack:new THREE.Color("#ff3355")}),[])
 useLayoutEffect(()=>{arms.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)},[])
 useFrame(()=>{
  const mesh=arms.current;if(!mesh||!core.current||!warning.current)return
  const alive=s.eid>=0&&findOctopusBoss()===s.eid
  mesh.visible=core.current.visible=alive
  warning.current.visible=alive&&s.warning&&startState.encounterPhase==="active"
  if(!alive)return
  core.current.position.set(s.coreX,0,0.1)
  core.current.material.emissiveIntensity=0.6+(1-Health.current[s.eid]/Math.max(1,Health.max[s.eid]))+Math.sin(s.time*4)*0.15
  warning.current.position.set(s.targetX,s.targetY,0.2)
  warning.current.scale.setScalar(1+Math.sin(s.time*18)*0.12)
  for(let arm=0;arm<OCTOPUS.count;arm++){
   const selected=arm===s.attack
   const color=selected&&s.danger?d.attack:selected&&s.warning?d.warning:d.idle
   for(let j=0;j<OCTOPUS.segments;j++){
    const i=arm*OCTOPUS.segments+j,previous=j?i-1:i
    const dx=s.x[i]-s.x[previous],dy=s.y[i]-s.y[previous],r=s.radius[i]
    d.dummy.position.set((s.x[i]+s.x[previous])/2,(s.y[i]+s.y[previous])/2,0)
    d.dummy.rotation.set(0,0,Math.atan2(dy,dx))
    d.dummy.scale.set(Math.hypot(dx,dy)/2+r,r,r*0.85)
    d.dummy.updateMatrix();mesh.setMatrixAt(i,d.dummy.matrix);mesh.setColorAt(i,color)
   }
  }
  mesh.count=OCTOPUS.count*OCTOPUS.segments;mesh.instanceMatrix.needsUpdate=true
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
 })
 return <>
  <instancedMesh ref={arms} args={[null,null,OCTOPUS.count*OCTOPUS.segments]} count={0} visible={false} frustumCulled={false}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial roughness={0.55} metalness={0.2}/></instancedMesh>
  <mesh ref={core} visible={false}><sphereGeometry args={[OCTOPUS.coreRadius,20,14]}/><meshStandardMaterial color="#37245c" emissive="#a329ff" roughness={0.35} metalness={0.4}/></mesh>
  <mesh ref={warning} visible={false} renderOrder={100}><ringGeometry args={[0.55,0.65,32]}/><meshBasicMaterial color="#ffcc33" transparent opacity={0.9} depthTest={false} depthWrite={false} toneMapped={false}/></mesh>
 </>
}
