// src/effects/effectPool.js


export function createTypedEffectPool(
    capacity,
    fields = []
) {

    const pool = {

        capacity,

        alive: new Uint8Array(capacity),
        x: new Float32Array(capacity),
        y: new Float32Array(capacity),
        vx: new Float32Array(capacity),
        vy: new Float32Array(capacity),
        life: new Float32Array(capacity),
        maxLife: new Float32Array(capacity),

        cursor: 0,


        allocate() {

            for (let i = 0; i < capacity; i++) {

                const id =
                    (this.cursor + i) % capacity


                if (this.alive[id] === 0) {

                    this.alive[id] = 1

                    this.cursor =
                        (id + 1) % capacity

                    return id
                }

            }


            return -1
        },


        kill(id) {

            this.alive[id] = 0

        },


        clear() {

            this.alive.fill(0)

        }

    }

    // create custom attributes
    for (const name of fields) {
        pool[name] = new Float32Array(capacity)
    }
    return pool
}