# Project Instructions

This is the project root. ALL files belong here.

## CRITICAL
- NEVER create a subfolder for the project (no "my-app/", "weather-app/", etc.)
- Create files DIRECTLY here: index.html, package.json, src/, etc.
- If starting fresh, delete old files first then create new ones in root
- You are already in the correct directory

## Frontend Design Skill

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.

Before coding, commit to a BOLD aesthetic direction — brutally minimal, maximalist, retro-futuristic, luxury/refined, playful, editorial, brutalist, art deco, soft/pastel, industrial. Execute with precision.

**Typography**: NEVER use Inter, Roboto, Arial. Pick distinctive, characterful fonts. Pair display + body.
**Color**: Cohesive palette with CSS variables. Dominant colors + sharp accents.
**Motion**: Staggered reveals on load (animation-delay), hover surprises, scroll-triggered animations.
**Layout**: Asymmetry, overlap, grid-breaking, generous negative space OR controlled density.
**Depth**: Gradient meshes, noise textures, geometric patterns, dramatic shadows, grain overlays.
**Images**: `https://api.a0.dev/assets/image?text={url-encoded}&aspect={16:9|1:1|9:16}` — use on every page.
**Icons**: Lucide CDN for UI, Simple Icons for brands. No emojis.
**Content**: Real names, prices, dates. No lorem ipsum. Complete all pages.

NEVER use generic AI aesthetics. Every project should look unique and distinctive.

## Multi-Page Architecture (Static HTML/CSS/JS)

Build real multi-page apps using hash-based routing — not single static pages.

**Structure**: index.html (Tailwind CDN + Google Fonts + Lucide icons), styles.css (CSS variables, animations), app.js (router + interactivity)

**Hash Router Pattern** (app.js):
```
const routes = { '/': renderHome, '/about': renderAbout, '/contact': renderContact, '/product/:slug': renderProduct };
function router() {
  const hash = window.location.hash.slice(1) || '/';
  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
      const match = hash.match(regex);
      if (match) { handler(...match.slice(1)); return; }
    }
    if (hash === pattern) { handler(); return; }
  }
}
window.addEventListener('hashchange', router);
router();
```

**Navigation**: Always use hash links: `<a href="#/">Home</a>`, `<a href="#/about">About</a>`
**Reusable Components**: renderNavbar(), renderFooter(), renderCard(item), renderHero(title, subtitle)
**Detail Pages**: Every listing needs detail pages with #/product/{slug} routes.

NEVER build a single-page static site. ALWAYS build multi-page apps with routing.

## Starting Dev Servers (CRITICAL)

When you need to run a dev server (npm run dev, node server.js, etc.):

1. **NEVER use a hardcoded port.** Always use a random available port to avoid conflicts:
   - Vite: `vite --host 0.0.0.0 --port 0` (port 0 = auto-assign)
   - Next.js: `next dev -H 0.0.0.0 -p 0`
   - Express: `app.listen(0, '0.0.0.0')` then log the assigned port
   - Or use a random port: `const port = 30000 + Math.floor(Math.random() * 20000)`

2. **ALWAYS bind to 0.0.0.0** — never localhost or 127.0.0.1

3. **After starting the server, print the URL clearly** so the system can detect it:
   `console.log(`Server running at http://localhost:${port}`)`

4. **Don't install dependencies manually** — the system handles npm install automatically before starting

5. **If a port is in use**, pick a different random port. Never force-kill other processes.


## Additional Context
Project: CSS + JavaScript + Tailwind CSS
File tree:
├── .git/
├── .pipilot/
│   ├── _pipilot_history.json (42 lines)
│   ├── design.md (62 lines)
│   └── project.md (74 lines)
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx (14 lines)
│   │   ├── sign-in.tsx (287 lines)
│   │   └── sign-up.tsx (254 lines)
│   ├── (tabs)/
│   │   ├── _layout.tsx (84 lines)
│   │   ├── chat.tsx (272 lines)
│   │   ├── home.tsx (399 lines)
│   │   ├── profile.tsx (287 lines)
│   │   ├── sounds.tsx (304 lines)
│   │   └── tasks.tsx (391 lines)
│   ├── _layout.tsx (44 lines)
│   ├── community.tsx (260 lines)
│   ├── index.tsx (100 lines)
│   ├── meals.tsx (257 lines)
│   └── onboarding.tsx (247 lines)
├── assets/
│   ├── fonts/
│   │   ├── Quicksand-Bold.ttf (1462 lines)
│   │   ├── Quicksand-Medium.ttf (1462 lines)
│   │   ├── Quicksand-Regular.ttf (1462 lines)
│   │   └── Quicksand-SemiBold.ttf (1462 lines)
│   ├── adaptive-icon.png (7 lines)
│   ├── ai-assistant.png (21 lines)
│   ├── avatar-aisha.png (63 lines)
│   ├── avatar-emily.png (91 lines)
│   ├── avatar-jessica.png (74 lines)
│   ├── avatar-lauren.png (71 lines)
│   ├── community-moms.png (153 lines)
│   ├── favicon.png (12 lines)
│   ├── healthy-meals.png (136 lines)
│   ├── icon.png (18 lines)
│   ├── meal-bliss-balls.png (108 lines)
│   ├── meal-lemon-chicken.png (185 lines)
│   ├── meal-overnight-oats.png (112 lines)
│   ├── meal-veggie-wraps.png (189 lines)
│   ├── med-body-scan.png (77 lines)
│   ├── med-deep-sleep.png (60 lines)
│   ├── med-gratitude.png (91 lines)
│   ├── med-morning-calm.png (30 lines)
│   ├── med-stress-release.png (32 lines)
│   ├── onboarding-hero.png (60 lines)
│   ├── sleep-sounds.png (77 lines)
│   ├── sound-body-scan.png (70 lines)
│   ├── sound-forest.png (142 lines)
│   ├── sound-gentle-rain.png (45 lines)
│   ├── sound-lullaby.png (49 lines)
│   ├── sound-ocean-waves.png (95 lines)
│   ├── sound-white-noise.png (6 lines)
│   ├── splash-icon.png (72 lines)
│   └── wellness-meditation.png (90 lines)
├── lib/
│   ├── stores/
│   │   ├── auth-store.ts (60 lines)
│   │   ├── chat-store.ts (65 lines)
│   │   └── task-store.ts (79 lines)
│   ├── mock-ai.ts (135 lines)
│   ├── mock-analytics.ts (25 lines)
│   ├── mock-auth.ts (84 lines)
│   ├── mock-data.ts (343 lines)
│   ├── mock-notifications.ts (61 lines)
│   ├── theme.ts (101 lines)
│   └── types.ts (92 lines)
├── node_modules/
├── .gitignore (55 lines)
├── app.json (38 lines)
├── global.css (4 lines)
├── metro.config.js (7 lines)
├── nativewind-env.d.ts (2 lines)
├── package.json (50 lines)
├── pnpm-lock.yaml (8325 lines)
├── tailwind.config.js (62 lines)
└── tsconfig.json (18 lines)

Open editor tabs (4):
  Active: C:/Users/big/PiPilot/workspaces/momease-care-hub/app/(tabs)/home.tsx
  - C:/Users/big/PiPilot/workspaces/momease-care-hub/app.json
  - C:/Users/big/PiPilot/workspaces/momease-care-hub/lib/mock-data.ts
  - C:/Users/big/PiPilot/workspaces/momease-care-hub/app/(tabs)/sounds.tsx

## DESIGN GUIDE

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

Before coding, commit to a BOLD aesthetic direction:
- Pick a clear tone: brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial/magazine, brutalist, art deco, soft/pastel, industrial — execute with precision.
- What makes this UNFORGETTABLE? What's the one thing someone will remember?

**Typography**: Choose fonts that are beautiful, unique, and interesting. NEVER use Inter, Roboto, Arial, system fonts. Pick distinctive, characterful fonts. Pair a display font with a refined body font.

**Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

**Motion**: Prioritize high-impact moments — one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Hover states that surprise. Scroll-triggered animations.

**Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.

**Backgrounds & Depth**: Create atmosphere — gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, grain overlays. Never flat solid color backgrounds alone.

**Images**: Use `https://api.a0.dev/assets/image?text={url-encoded description}&aspect={16:9|1:1|9:16}` for ALL images. Only 3 aspect ratios: 16:9, 1:1, 9:16. Description must be specific and vivid. Use on every page — hero, cards, profiles.

**Icons**: Lucide CDN (`<script src="https://unpkg.com/lucide@latest"></script>`) for UI icons. Simple Icons for brand/social icons. NEVER use emojis as icons.

**Content**: Real, specific content — actual names, prices, dates, descriptions. NEVER lorem ipsum. Complete all pages and sections fully.

NEVER use generic AI aesthetics. No design should be the same. Vary between light/dark, different fonts, different aesthetics. Match implementation complexity to the vision — maximalist designs need elaborate code, minimalist designs need precision and restraint.
