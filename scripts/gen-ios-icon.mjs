// Mease (iPhone) app icon: a soft sunrise over a rounded "M" on a warm gradient.
// Full-bleed square, no transparency (iOS rounds the corners itself).
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFD9A8"/>
      <stop offset="0.55" stop-color="#FB9DB8"/>
      <stop offset="1" stop-color="#E86AA6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.32" r="0.45">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <circle cx="512" cy="330" r="96" fill="#FFFFFF" fill-opacity="0.96"/>
  <path d="M 262 740 L 262 520 C 262 450 346 440 390 505 L 512 690 L 634 505 C 678 440 762 450 762 520 L 762 740"
        fill="none" stroke="#FFFFFF" stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
await sharp(Buffer.from(svg)).flatten({ background: "#FB9DB8" }).png().toFile("assets/icon-ios.png");
console.log("wrote assets/icon-ios.png");
