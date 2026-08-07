// Post-process the Expo `dist/` build into a proper PWA:
//   - manifest.webmanifest with all standard icon sizes
//   - resized PNG icons at 192/512 (maskable + any-purpose)
//   - apple-touch-icon at 180 for iOS home-screen
//   - sw.js: minimal cache-first service worker with runtime asset caching
//   - injected <link rel="manifest">, theme-color, apple meta tags, and SW
//     registration script into dist/index.html
//
// Idempotent — running twice yields the same output.
import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

const DIST = 'dist';
const SRC_ICON = 'assets/icon.png';

async function main() {
  if (!existsSync(DIST)) throw new Error(`no ${DIST} dir — run "expo export --platform web" first`);
  if (!existsSync(SRC_ICON)) throw new Error(`no source icon at ${SRC_ICON}`);

  await mkdir(path.join(DIST, 'icons'), { recursive: true });

  const sizes = [
    { size: 192, name: 'icon-192.png', purpose: 'any maskable' },
    { size: 512, name: 'icon-512.png', purpose: 'any maskable' },
    { size: 180, name: 'apple-touch-icon.png', purpose: 'ios' },
  ];

  for (const s of sizes) {
    const out = path.join(DIST, 'icons', s.name);
    await sharp(SRC_ICON).resize(s.size, s.size, { fit: 'cover' }).png().toFile(out);
    console.log(`  ✓ ${out} (${s.size}×${s.size})`);
  }

  const manifest = {
    name: 'MomEase',
    short_name: 'MomEase',
    description: 'Your daily dose of calm — a wellness companion for working mothers.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FDE5EC',
    theme_color: '#F472B6',
    lang: 'en',
    dir: 'ltr',
    categories: ['health', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await writeFile(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('  ✓ manifest.webmanifest');

  // Minimal service worker: cache-first for JS/CSS/PNG, network-first for HTML.
  const swVersion = `momease-v${Date.now()}`;
  const sw = `// MomEase service worker — cache-first for hashed assets, network-first for HTML.
const CACHE = '${swVersion}';
const CORE = ['/', '/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't proxy cross-origin

  // Hashed assets (JS/CSS in /_expo/static/... or /icons/): cache-first.
  if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // HTML navigations: network-first, fall back to cached index for offline.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put('/', clone)).catch(() => {});
        return res;
      }).catch(() => caches.match('/').then((r) => r || new Response('Offline', { status: 503 })))
    );
    return;
  }
});
`;
  await writeFile(path.join(DIST, 'sw.js'), sw);
  console.log('  ✓ sw.js');

  // Inject PWA tags + SW registration into index.html
  const indexPath = path.join(DIST, 'index.html');
  let html = await readFile(indexPath, 'utf8');

  // Strip any prior injection so re-runs stay clean
  html = html.replace(/<!-- MOMEASE_PWA_START -->[\s\S]*?<!-- MOMEASE_PWA_END -->/g, '');

  const inject = `
    <!-- MOMEASE_PWA_START -->
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#F472B6" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="MomEase" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
    <meta name="description" content="MomEase — your daily dose of calm. A wellness companion for working mothers." />
    <meta property="og:title" content="MomEase" />
    <meta property="og:description" content="Your daily dose of calm — a wellness companion for working mothers." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/icons/icon-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW registration failed', e));
        });
      }
    </script>
    <!-- MOMEASE_PWA_END -->`;

  // Insert just before </head>
  html = html.replace(/<\/head>/i, `${inject}\n  </head>`);
  await writeFile(indexPath, html);
  console.log('  ✓ injected PWA tags into index.html');

  console.log('\nPWA build ready in ./dist');
}

main().catch((e) => { console.error(e); process.exit(1); });
