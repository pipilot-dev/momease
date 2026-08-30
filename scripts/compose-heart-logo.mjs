// Take the real MomEase logo (violet mother-baby silhouette on white) and
// wrap it in a warm rose heart. Uses `blend: multiply` so the source's
// white background blends into the heart color instead of covering it.
//
// Inputs :  /tmp/logo/momease-source.jpg  (512×512, downloaded from repo)
// Outputs:  store-assets/icons/momease-heart-1024.png   (hi-res)
//           store-assets/icons/momease-heart-512.png    (Play Store size)
//           store-assets/icons/momease-heart-foreground-1024.png
//              (transparent bg, silhouette in adaptive-icon safe zone
//               for Android launcher use)

import sharp from "sharp";
import { mkdir } from "fs/promises";

const SRC = "/tmp/logo/momease-source.jpg";
const OUT = "store-assets/icons";
await mkdir(OUT, { recursive: true });

// Heart layer — SVG. The heart is drawn as a large filled path with a
// soft rose→pink gradient and a subtle white highlight for depth.
function heartLayerSvg({ withBg }) {
  const W = 1024;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <defs>
    <linearGradient id="heart" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#FBC8DC"/>
      <stop offset="55%" stop-color="#F9A8D4"/>
      <stop offset="100%" stop-color="#F472B6"/>
    </linearGradient>
    <radialGradient id="highlight" cx="35%" cy="30%" r="45%">
      <stop offset="0%"  stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dx="0" dy="16" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.32"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  ${withBg ? `<rect width="${W}" height="${W}" fill="#FFF1F5" rx="180" ry="180"/>` : ""}

  <!-- Heart path, centered — the top of the bumps sit at y≈180,
       tip near y≈880, wide enough to cradle a 620px source image. -->
  <g transform="translate(512 512)" filter="url(#softShadow)">
    <path d="
      M 0 380
      C -100 300, -430 90, -430 -170
      C -430 -350, -270 -450, -160 -400
      C -80 -365, -30 -300, 0 -230
      C 30 -300, 80 -365, 160 -400
      C 270 -450, 430 -350, 430 -170
      C 430 90, 100 300, 0 380
      Z
    " fill="url(#heart)"/>
    <!-- Inner highlight for glossy depth -->
    <ellipse cx="-140" cy="-170" rx="180" ry="100" fill="url(#highlight)"/>
  </g>
</svg>`;
}

/** Compose the heart + source silhouette at 1024×1024, then resize as needed.
 *  `withBg=true` gives a rounded-square blush background (Play/legacy launcher).
 *  `withBg=false` gives transparent (Android adaptive foreground). */
async function compose({ withBg }) {
  const W = 1024;
  // 1) Render heart layer to a raster buffer
  const heart = await sharp(Buffer.from(heartLayerSvg({ withBg })))
    .png()
    .toBuffer();

  // 2) Fit the source (512×512) at ~62% of the canvas, centered a bit high
  //    so it sits inside the top-heavy heart shape rather than the tip.
  const SRC_SIZE = 640;
  const srcResized = await sharp(SRC).resize(SRC_SIZE, SRC_SIZE, { fit: "cover" }).toBuffer();

  // 3) Composite. `blend: 'multiply'` melts the source's white bg into
  //    the heart color, letting the violet silhouette carry through.
  const composite = await sharp(heart)
    .composite([
      {
        input: srcResized,
        left: Math.round((W - SRC_SIZE) / 2),
        top: Math.round((W - SRC_SIZE) / 2) - 40,
        blend: "multiply",
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return composite;
}

// Play Store / launcher icon
const withBg = await compose({ withBg: true });
await sharp(withBg).resize(1024, 1024).png({ compressionLevel: 9 })
  .toFile(`${OUT}/momease-heart-1024.png`);
await sharp(withBg).resize(512, 512).png({ compressionLevel: 9 })
  .toFile(`${OUT}/momease-heart-512.png`);
console.log("  ✓ momease-heart-1024.png (1024×1024)");
console.log("  ✓ momease-heart-512.png  (512×512)");

// Android adaptive-icon foreground (no bg)
const noBg = await compose({ withBg: false });
await sharp(noBg).resize(1024, 1024).png({ compressionLevel: 9 })
  .toFile(`${OUT}/momease-heart-foreground-1024.png`);
console.log("  ✓ momease-heart-foreground-1024.png (transparent bg)");

console.log("\nDone.");
