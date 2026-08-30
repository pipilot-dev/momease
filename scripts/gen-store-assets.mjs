// Generate Google Play store assets:
//   - store-assets/feature-graphic.png  (1024 × 500)
//   - store-assets/app-icon.png         (copy of assets/icon.png)
//
// Feature graphic layout: warm rose gradient background, heart mark on the
// left, product name + tagline on the right, subtle grain overlay. Matches
// the app's brand.

import sharp from "sharp";
import { mkdir, copyFile } from "fs/promises";

const OUT = "store-assets";
await mkdir(OUT, { recursive: true });

const W = 1024;
const H = 500;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF1F5"/>
      <stop offset="50%" stop-color="#FDE5EC"/>
      <stop offset="100%" stop-color="#FBC8DC"/>
    </linearGradient>
    <linearGradient id="heart" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F9A8D4"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F472B6" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#F472B6" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="12"/>
      <feOffset dx="0" dy="10" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Soft accent blobs -->
  <circle cx="200" cy="150" r="180" fill="url(#glow)"/>
  <circle cx="880" cy="380" r="220" fill="url(#glow)" opacity="0.6"/>

  <!-- Heart mark, left side -->
  <g transform="translate(140, 250)" filter="url(#soft-shadow)">
    <circle cx="0" cy="0" r="90" fill="url(#heart)"/>
    <path d="M 0 30 C -30 5, -55 -15, -55 -40 C -55 -60, -35 -70, -20 -60 C -10 -50, -5 -40, 0 -30 C 5 -40, 10 -50, 20 -60 C 35 -70, 55 -60, 55 -40 C 55 -15, 30 5, 0 30 Z"
          fill="#FFFFFF"/>
  </g>

  <!-- Text block, right side -->
  <g transform="translate(280, 155)">
    <!-- Wordmark -->
    <text x="0" y="0" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="700" fill="#1C1917" font-style="italic" letter-spacing="-2">MomEase</text>
    <!-- Tagline -->
    <text x="0" y="60" font-family="'Helvetica Neue', Arial, sans-serif" font-size="30" font-weight="500" fill="#57534E">Your daily dose of calm.</text>
    <!-- Sub-tagline / audience -->
    <text x="0" y="120" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="400" fill="#78716C">A wellness companion for busy working moms.</text>

    <!-- Feature chips -->
    <g transform="translate(0, 175)">
      <g transform="translate(0, 0)">
        <rect width="150" height="42" rx="21" fill="#FFFFFF" opacity="0.85"/>
        <text x="24" y="27" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="600" fill="#EC4899">Guided breathing</text>
      </g>
      <g transform="translate(160, 0)">
        <rect width="130" height="42" rx="21" fill="#FFFFFF" opacity="0.85"/>
        <text x="20" y="27" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="600" fill="#EC4899">Sleep sounds</text>
      </g>
      <g transform="translate(300, 0)">
        <rect width="170" height="42" rx="21" fill="#FFFFFF" opacity="0.85"/>
        <text x="20" y="27" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="600" fill="#EC4899">Mood + journal</text>
      </g>
      <g transform="translate(480, 0)">
        <rect width="115" height="42" rx="21" fill="#FFFFFF" opacity="0.85"/>
        <text x="20" y="27" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="600" fill="#EC4899">Community</text>
      </g>
    </g>
  </g>
</svg>`;

const outPath = `${OUT}/feature-graphic.png`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
console.log(`  ✓ ${outPath} (1024 × 500)`);

// Icon copy for convenience
await copyFile("assets/icon.png", `${OUT}/app-icon.png`);
console.log(`  ✓ ${OUT}/app-icon.png (512 × 512)`);

console.log("\nStore assets ready in ./store-assets/");
