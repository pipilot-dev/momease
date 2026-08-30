// Heart-around-mother-baby app icon.
//
// Composition: warm blush heart holds a violet mother-baby silhouette.
// Rendered at 1024x for crisp output, then a 512x version for Play Store
// listing + assets/icon.png, plus a foreground-only 512x version tailored
// to Android's adaptive-icon safe area (silhouette inside the middle 66%).
//
// SVG-first so shapes stay razor-sharp at any density.

import sharp from "sharp";
import { mkdir, copyFile } from "fs/promises";

const OUT = "store-assets/icons";
await mkdir(OUT, { recursive: true });

// The mother-and-baby silhouette, hand-tuned to match the reference the
// user shared: rounded head-and-shoulders wrap, arm cradling a smaller head.
// Path is drawn in a 240x260 box centered on (120, 130).
const silhouette = (fill) => `
<g transform="translate(-120 -130)" fill="${fill}">
  <!-- Mother's body wrap (teardrop-ish) -->
  <path d="
    M 120 12
    C 178 12, 224 60, 224 130
    C 224 205, 178 250, 120 250
    C 68 250, 30 205, 30 150
    C 30 92, 55 40, 90 22
    C 100 16, 110 12, 120 12
    Z
  "/>
  <!-- Cutout: mom's forehead + arm curve reveals the interior for the baby -->
  <path d="
    M 100 40
    C 128 34, 158 46, 168 76
    C 170 82, 168 88, 162 90
    C 152 92, 142 96, 132 106
    C 122 116, 114 130, 110 148
    C 108 158, 100 162, 92 158
    L 80 152
    C 66 146, 60 132, 62 118
    C 66 92, 78 60, 92 46
    C 94 43, 98 41, 100 40
    Z
  " fill="#FFFFFF"/>
  <!-- Baby's head resting in the arm -->
  <circle cx="128" cy="112" r="22" fill="${fill}"/>
</g>
`;

// Heart path — classic "cardioid-ish" with two bumps + a point.
// Drawn in a 480x440 box centered on (0,0), pointing down.
const heart = (fill) => `
<g fill="${fill}">
  <path d="
    M 0 180
    C -60 130, -220 40, -220 -80
    C -220 -170, -140 -220, -80 -190
    C -40 -170, -14 -140, 0 -100
    C 14 -140, 40 -170, 80 -190
    C 140 -220, 220 -170, 220 -80
    C 220 40, 60 130, 0 180
    Z
  "/>
</g>
`;

/** Compose a 1024×1024 SVG. `bg` is the outer color (transparent for the
 *  adaptive foreground version). */
function svgFor({ bg, heartFill, siluFill }) {
  const W = 1024;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="-512 -512 ${W} ${W}">
  <defs>
    <linearGradient id="heartG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#FBC8DC"/>
      <stop offset="60%" stop-color="#F9A8D4"/>
      <stop offset="100%" stop-color="#F472B6"/>
    </linearGradient>
    <linearGradient id="siluG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#C4A0F4"/>
      <stop offset="100%" stop-color="#A78BFA"/>
    </linearGradient>
    <radialGradient id="glowG" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="0" dy="10" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  ${bg ? `<rect x="-512" y="-512" width="${W}" height="${W}" fill="${bg}" rx="140" ry="140"/>` : ""}

  <!-- Heart, scaled up to fill most of the canvas -->
  <g transform="translate(0 30) scale(1.55)" filter="url(#soft)">
    ${heart(heartFill || "url(#heartG)")}
  </g>

  <!-- Inner highlight for depth -->
  <g transform="translate(0 30) scale(1.55)" opacity="0.55">
    <ellipse cx="-70" cy="-100" rx="90" ry="55" fill="url(#glowG)"/>
  </g>

  <!-- Mother-baby silhouette centered in the heart's upper body -->
  <g transform="translate(0 -20) scale(1.35)">
    ${silhouette(siluFill || "url(#siluG)")}
  </g>
</svg>`;
}

// Play Store / launcher icon: 512×512 rounded-square background.
const playSvg = svgFor({ bg: "#FFF1F5", heartFill: "url(#heartG)", siluFill: "url(#siluG)" });
// Android adaptive-icon foreground: transparent bg, silhouette sits within
// the middle 66% safe area (Android crops with round/squircle masks).
const foregroundSvg = svgFor({ bg: null, heartFill: "url(#heartG)", siluFill: "url(#siluG)" });

const outputs = [
  { name: "app-icon-heart-1024.png", svg: playSvg, size: 1024 },
  { name: "app-icon-heart-512.png", svg: playSvg, size: 512 },
  { name: "adaptive-icon-heart-1024.png", svg: foregroundSvg, size: 1024 },
];

for (const o of outputs) {
  await sharp(Buffer.from(o.svg)).resize(o.size, o.size).png({ compressionLevel: 9 }).toFile(`${OUT}/${o.name}`);
  console.log(`  ✓ ${OUT}/${o.name} (${o.size}×${o.size})`);
}

console.log("\nReady in ./store-assets/icons/");
