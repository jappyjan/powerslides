#!/usr/bin/env node
/**
 * Generates placeholder icons for the Chrome extension.
 * Run: node scripts/generate-icons.mjs
 */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

function createIcon(size) {
  const png = new PNG({ width: size, height: size });
  const bg = { r: 99, g: 102, b: 241, a: 255 }; // indigo
  const fg = { r: 255, g: 255, b: 255, a: 255 }; // white
  const pad = Math.max(2, Math.floor(size * 0.15));
  const barH = Math.max(2, Math.floor(size * 0.12));
  const gap = Math.max(1, Math.floor(size * 0.08));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      let useFg = false;
      // Simple "slides" icon: 3 horizontal bars (slide thumbnails)
      const bar1 = y >= pad && y < pad + barH;
      const bar2 = y >= pad + barH + gap && y < pad + barH * 2 + gap;
      const bar3 = y >= pad + barH * 2 + gap * 2 && y < pad + barH * 3 + gap * 2;
      if ((bar1 || bar2 || bar3) && x >= pad && x < size - pad) {
        useFg = true;
      }
      const c = useFg ? fg : bg;
      png.data[idx] = c.r;
      png.data[idx + 1] = c.g;
      png.data[idx + 2] = c.b;
      png.data[idx + 3] = c.a;
    }
  }

  return png;
}

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = createIcon(size);
  const path = join(iconsDir, `icon${size}.png`);
  writeFileSync(path, PNG.sync.write(png));
  console.log(`Created ${path}`);
}
