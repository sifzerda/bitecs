// src/ecs/difficulty/spawnFormations.js

import { getArenaBounds } from "../constants/arenaBounds.js"

export const FORMATION = Object.freeze({
    ARC: "arc",
    LINE: "line",
    PINCER: "pincer",
    SCATTERED: "scattered",
})

const FORMATIONS = Object.values(FORMATION)

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

export function chooseFormation(zoneIndex = 0, waveIndex = 0) {
    const index =
        Math.max(0, Math.floor(zoneIndex)) +
        Math.max(0, Math.floor(waveIndex))

    return FORMATIONS[index % FORMATIONS.length]
}

export function createFormationPositions({
    count,
    formation = FORMATION.ARC,
    playerX = 0,
    playerY = 0,
    margin = 1.5,
    random = Math.random,
    bounds = getArenaBounds(),
}) {
    const positions = []

    const {
        left,
        right,
        bottom,
        top,
        width,
        height,
    } = bounds

    const centerX = (left + right) / 2
    const centerY = (bottom + top) / 2

    const halfW = width / 2
    const halfH = height / 2

    const spawnMargin = Math.max(0.5, margin)

    // Prefer the edge opposite the player's position.
    const dx = (playerX - centerX) / Math.max(halfW, 0.01)
    const dy = (playerY - centerY) / Math.max(halfH, 0.01)

    const primaryEdge =
        Math.abs(dx) > Math.abs(dy)
            ? (dx >= 0 ? "left" : "right")
            : (dy >= 0 ? "bottom" : "top")

    const opposite = {
        left: "right",
        right: "left",
        top: "bottom",
        bottom: "top",
    }

    function place(edge, along, depth = 0) {
        const t = clamp(along, -1, 1)

        switch (edge) {
            case "left":
                return {
                    x: left - spawnMargin - depth,
                    y: centerY + t * halfH * 0.85,
                }

            case "right":
                return {
                    x: right + spawnMargin + depth,
                    y: centerY + t * halfH * 0.85,
                }

            case "top":
                return {
                    x: centerX + t * halfW * 0.85,
                    y: top + spawnMargin + depth,
                }

            default:
                return {
                    x: centerX + t * halfW * 0.85,
                    y: bottom - spawnMargin - depth,
                }
        }
    }

    const total = Math.max(0, Math.floor(count))

    for (let i = 0; i < total; i++) {
        const t =
            total <= 1
                ? 0
                : (i / (total - 1)) * 2 - 1

        switch (formation) {
            case FORMATION.ARC: {
                const curve = Math.sin(t * Math.PI / 2)

                positions.push(
                    place(
                        primaryEdge,
                        curve * 0.9,
                        (1 - Math.cos(t * Math.PI / 2)) * 1.5
                    )
                )
                break
            }

            case FORMATION.LINE:
                positions.push(
                    place(primaryEdge, t * 0.9)
                )
                break

            case FORMATION.PINCER: {
                const side = i % 2 === 0
                    ? primaryEdge
                    : opposite[primaryEdge]

                const sideIndex = Math.floor(i / 2)
                const sideCount = Math.ceil(total / 2)

                const along = sideCount <= 1
                    ? 0
                    : (sideIndex / (sideCount - 1)) * 1.6 - 0.8

                positions.push(place(side, along))
                break
            }

            case FORMATION.SCATTERED:
            default: {
                const edges = ["left", "right", "top", "bottom"]
                const edge = edges[Math.floor(random() * edges.length)]

                positions.push(
                    place(edge, random() * 1.8 - 0.9, random())
                )
                break
            }
        }
    }

    return positions
}
