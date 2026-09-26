/**
 * Generates the PWA / home-screen icons from the OraMedha mark.
 *
 *   npm run icons
 *
 * Source: public/brand/oramedha-mark.png — an all-black PNG whose alpha
 * channel is the shape (the same asset the in-app logo masks).
 *
 * Style matches the main app's apple-icon: the mark in near-white on a
 * near-black tile. Colours come from lib/theme/colors.ts (which mirrors the
 * tokens in app/globals.css), so there is no separate icon palette.
 *
 * Outputs (public/icons/):
 *   icon-192.png, icon-512.png   "any" purpose — mark at ~70% width
 *   maskable-512.png             "maskable" — mark inside the 80% safe zone,
 *                                so Android's circle/squircle crop never cuts it
 */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));

// Read the colour mirror without a TS toolchain: it is a plain object literal.
const colorsSource = await readFile(path("lib/theme/colors.ts"), "utf8");
const pick = (block, key) => {
  const blockMatch = colorsSource.match(new RegExp(`${block}:\\s*{([\\s\\S]*?)}`));
  const value = blockMatch?.[1].match(new RegExp(`${key}:\\s*"(#[0-9A-Fa-f]{6})"`))?.[1];
  if (!value) throw new Error(`Could not read ${block}.${key} from lib/theme/colors.ts`);
  return value;
};
const TILE = pick("light", "textPrimary"); // near-black
const MARK = pick("dark", "textPrimary"); // near-white

const MARK_SRC = path("public/brand/oramedha-mark.png");

async function makeIcon({ size, markWidthRatio, out }) {
  const markWidth = Math.round(size * markWidthRatio);

  // Resize the mark, keep only its alpha, and use it to cut a solid colour.
  const alpha = await sharp(MARK_SRC)
    .resize({ width: markWidth })
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = alpha.info;
  const markLayer = await sharp({
    create: { width, height, channels: 3, background: MARK },
  })
    .joinChannel(alpha.data, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: TILE },
  })
    .composite([
      {
        input: markLayer,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png()
    .toFile(path(`public/icons/${out}`));

  console.log(`public/icons/${out}`);
}

await makeIcon({ size: 192, markWidthRatio: 0.7, out: "icon-192.png" });
await makeIcon({ size: 512, markWidthRatio: 0.7, out: "icon-512.png" });
// Maskable: the visible safe zone is a centred circle of 80% diameter.
// A ~2:1 mark at 62% width sits comfortably inside it.
await makeIcon({ size: 512, markWidthRatio: 0.62, out: "maskable-512.png" });
