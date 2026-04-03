#!/usr/bin/env node
// Run this script once to generate placeholder PWA icons
// Usage: node scripts/gen-icons.mjs
//
// In Claude Code, replace with real icons or use:
//   pnpm add -D sharp
//   and generate from a source SVG

import { createCanvas } from 'canvas'  // npm i canvas
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const sizes = [192, 512]
const outDir = join(process.cwd(), 'public', 'icons')
mkdirSync(outDir, { recursive: true })

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#1a1625'
  ctx.fillRect(0, 0, size, size)

  // Border
  ctx.strokeStyle = '#6b5ce7'
  ctx.lineWidth = size * 0.04
  const r = size * 0.15
  ctx.beginPath()
  ctx.roundRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84, r)
  ctx.stroke()

  // Letter M
  ctx.fillStyle = '#c9a84c'
  ctx.font = `bold ${size * 0.55}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('M', size / 2, size / 2)

  writeFileSync(join(outDir, `icon-${size}.png`), canvas.toBuffer('image/png'))
  console.log(`Generated icon-${size}.png`)
}
