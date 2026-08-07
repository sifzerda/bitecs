// strip-propellers.mjs
//
// Run with: node strip-propellers.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SVG_DIR = './public/ship_svgs'

const FILES = [
    '00_player.svg',
    '01_shotgunboss.svg',
    '02_machinegunboss.svg',
    '03_cryogunboss.svg',
    '04_grenadelauncherboss.svg',
    '05_acidthrowerboss.svg',
    '06_missilelauncherboss.svg',
    '07_flamethrowerboss.svg',
    '08_lasergunboss.svg',
    '09_arcgunboss.svg',
    '10_plasmagunboss.svg',
]

function stripPropellerGroups(svg) {
    const openMarker = /<g transform="translate\([^)]*\)" class="boss-propeller">/g
    let result = ''
    let cursor = 0
    let removedCount = 0

    let match
    while ((match = openMarker.exec(svg)) !== null) {
        const blockStart = match.index
        result += svg.slice(cursor, blockStart)

        let depth = 1
        let pos = openMarker.lastIndex
        const tagRe = /<g[ >]|<\/g>/g
        tagRe.lastIndex = pos

        let tagMatch
        let blockEnd = svg.length
        while ((tagMatch = tagRe.exec(svg)) !== null) {
            if (tagMatch[0] === '</g>') {
                depth--
                if (depth === 0) {
                    blockEnd = tagRe.lastIndex
                    break
                }
            } else {
                depth++
            }
        }

        cursor = blockEnd
        openMarker.lastIndex = blockEnd
        removedCount++
    }

    result += svg.slice(cursor)
    return { cleaned: result, removedCount }
}

for (const file of FILES) {
    const path = join(SVG_DIR, file)

    if (!existsSync(path)) {
        console.log(`⚠ ${file} not found at ${path} — skipping`)
        continue
    }

    const original = readFileSync(path, 'utf-8')
    const { cleaned, removedCount } = stripPropellerGroups(original)

    if (removedCount === 0) {
        console.log(`— ${file}: no propeller groups found, unchanged`)
        continue
    }

    const backupPath = path + '.bak'
    if (!existsSync(backupPath)) {
        writeFileSync(backupPath, original, 'utf-8')
    }

    writeFileSync(path, cleaned, 'utf-8')
    console.log(`✓ ${file}: removed ${removedCount} propeller group(s), backup saved to ${file}.bak`)
}

console.log('\nDone. Re-check each SVG visually (or diff against the .bak) before committing.')