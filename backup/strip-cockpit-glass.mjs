// strip-cockpit-glass.mjs
//
// Run with: node strip-cockpit-glass.mjs

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

const PANEL_FILL = '#dce8f2'
const PANEL_OPACITY = 0.35

function removeBalancedBlock(svg, openTagRe, tagName) {
    const match = openTagRe.exec(svg)
    if (!match) return { result: svg, removed: false }

    const blockStart = match.index
    let depth = 1
    let pos = openTagRe.lastIndex

    const innerTagRe = new RegExp(`<${tagName}[ >]|</${tagName}>`, 'g')
    innerTagRe.lastIndex = pos

    let tagMatch
    let blockEnd = svg.length
    while ((tagMatch = innerTagRe.exec(svg)) !== null) {
        if (tagMatch[0] === `</${tagName}>`) {
            depth--
            if (depth === 0) {
                blockEnd = innerTagRe.lastIndex
                break
            }
        } else {
            depth++
        }
    }

    return {
        result: svg.slice(0, blockStart) + svg.slice(blockEnd),
        removed: true,
    }
}

function stripCockpitGlass(svg) {
    let working = svg
    let didStrip = false

    // 1) Grab the glass shape's points BEFORE removing anything, so the
    //    replacement panel can reuse the exact same footprint.
    const glassPointsMatch = working.match(
        /<polygon points="([^"]+)" fill="url\(#cockpitIridescence\)"/
    )
    const glassPoints = glassPointsMatch ? glassPointsMatch[1] : null

    // 2) Remove the <defs> block (only used for the 4 cockpit gradients
    //    in these files — safe to remove wholesale).
    const defsRemoved = removeBalancedBlock(
        working,
        /<defs>/g,
        'defs'
    )
    working = defsRemoved.result
    didStrip = didStrip || defsRemoved.removed

    // 3) Remove the 4 gradient-filled/stroked glass polygons.
    const glassLayerPatterns = [
        /<polygon points="[^"]+" fill="url\(#cockpitIridescence\)" opacity="0\.92"\/>/,
        /<polygon points="[^"]+" fill="url\(#cockpitSpecular\)" opacity="0\.65"\/>/,
        /<polygon points="[^"]+" fill="url\(#cockpitDepth\)" opacity="0\.55"\/>/,
        /<polygon points="[^"]+" fill="none" stroke="url\(#cockpitEdge\)" stroke-width="0\.025" stroke-linejoin="round" opacity="0\.9"\/>/,
    ]
    for (const pattern of glassLayerPatterns) {
        if (pattern.test(working)) {
            working = working.replace(pattern, '')
            didStrip = true
        }
    }

    const highlightPattern = /<path d="[\s\S]*?" fill="none" stroke="#ffffff" stroke-width="0\.018" stroke-linecap="round" opacity="0\.65"\/>/
    if (highlightPattern.test(working)) {
        working = working.replace(highlightPattern, '')
        didStrip = true
    }

    if (didStrip && glassPoints) {
        const panelTag = `<polygon points="${glassPoints}" style="fill: ${PANEL_FILL}; fill-opacity: ${PANEL_OPACITY};"/>`

        if (working.includes('</defs>') === false && /<\/g>\s*<\/svg>/.test(working)) {
            working = working.replace(/<\/g>\s*<\/svg>/, `${panelTag}</g></svg>`)
        } else {
            working += panelTag
        }
    }

    return { cleaned: working, didStrip }
}

for (const file of FILES) {
    const path = join(SVG_DIR, file)

    if (!existsSync(path)) {
        console.log(`⚠ ${file} not found at ${path} — skipping`)
        continue
    }

    const original = readFileSync(path, 'utf-8')
    const { cleaned, didStrip } = stripCockpitGlass(original)

    if (!didStrip) {
        console.log(`— ${file}: no cockpit-glass layers found, unchanged`)
        continue
    }

    const backupPath = path + '.bak'
    if (!existsSync(backupPath)) {
        writeFileSync(backupPath, original, 'utf-8')
    }

    writeFileSync(path, cleaned, 'utf-8')
    console.log(`✓ ${file}: stripped animated glass, added backing panel (backup: ${file}.bak)`)
}

console.log('\nDone. Re-check each SVG visually (or diff against the .bak) before committing.')
console.log('Reminder: run extract-ship-overlays.mjs BEFORE this script if you have not already —')
console.log('it needs the original gradient polygon to compute cockpitGlass offsets/size/lensColor.')