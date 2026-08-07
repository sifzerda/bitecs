// strip-coreglow.mjs
//
// Run with: node strip-coreglow.mjs
// (from your project root, or edit SVG_DIR below)
//
// Removes the static core-glow <circle> from every gun SVG — identified
// by its distinctive style="filter:blur(...)" attribute, which no other
// element in these files uses. This is now redundant: WeaponMount.jsx's
// GunCoreGlow renders an animated, pulsing version of this glow in
// real time (see RENDER_ORDER.gunGlow), so the static baked circle just
// sits underneath it doing nothing but adding visual noise.
//
// Auto-discovers every .svg in SVG_DIR rather than using a hardcoded
// filename list, since gun IDs/filenames weren't available in this
// conversation — safer than guessing and silently skipping files.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SVG_DIR = './public/gun_svgs'

// Matches a <circle ...> element (self-closing OR with a separate
// </circle> close tag) whose attributes include style="filter:blur(...)".
// Using a permissive "any attributes" match rather than hardcoding
// fill/opacity/cx/cy values, since those differ per gun.
const CORE_GLOW_PATTERN =
    /<circle\b[^>]*style="[^"]*filter:\s*blur\([^)]*\)[^"]*"[^>]*\/?>(?:\s*<\/circle>)?/g

function stripCoreGlow(svg) {
    let removedCount = 0
    const cleaned = svg.replace(CORE_GLOW_PATTERN, () => {
        removedCount++
        return ''
    })
    return { cleaned, removedCount }
}

if (!existsSync(SVG_DIR)) {
    console.log(`⚠ Directory not found: ${SVG_DIR} — edit SVG_DIR at the top of this script.`)
    process.exit(1)
}

const files = readdirSync(SVG_DIR).filter(f => f.toLowerCase().endsWith('.svg'))

if (files.length === 0) {
    console.log(`⚠ No .svg files found in ${SVG_DIR}`)
    process.exit(0)
}

for (const file of files) {
    const path = join(SVG_DIR, file)
    const original = readFileSync(path, 'utf-8')
    const { cleaned, removedCount } = stripCoreGlow(original)

    if (removedCount === 0) {
        console.log(`— ${file}: no core-glow circle found, unchanged`)
        continue
    }

    const backupPath = path + '.bak'
    if (!existsSync(backupPath)) {
        writeFileSync(backupPath, original, 'utf-8')
    }

    writeFileSync(path, cleaned, 'utf-8')
    console.log(`✓ ${file}: removed ${removedCount} core-glow circle(s), backup saved to ${file}.bak`)
}

console.log('\nDone. Re-check a few SVGs visually (or diff against the .bak) before committing.')