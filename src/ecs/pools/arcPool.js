// src/ecs/pools/arcPool.js

import { createPool } from "./createPool"
import { Arc, ArcPointsX, ArcPointsY } from "../constants/components"

const pool = createPool({

    size: 256,
    components: [ Arc ],
    activeField: [ Arc, "active" ],

    resetFields(id){

        Arc.life[id]=0
        Arc.maxLife[id]=0
        Arc.pointCount[id]=0

        Arc.colorR[id]=0
        Arc.colorG[id]=0
        Arc.colorB[id]=0

        ArcPointsX[id].fill(0)
        ArcPointsY[id].fill(0)

    }

})

export const activeArcs = pool.active
export const initializeArcPool = pool.initialize
export const acquireArcEntity = pool.acquire
export const releaseArcEntity = pool.release