import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const svg = await readFile(new URL('../public/icons/voltwise.svg', import.meta.url))
for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['apple-touch-icon', 180],
]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(`../public/icons/${name}.png`, import.meta.url)))
}
const maskable =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#174f46"/><path d="m282 125-110 160h82l-29 110 115-177h-82z" fill="#d3f59b"/></svg>'
await sharp(Buffer.from(maskable))
  .png()
  .toFile(fileURLToPath(new URL('../public/icons/maskable-512.png', import.meta.url)))
