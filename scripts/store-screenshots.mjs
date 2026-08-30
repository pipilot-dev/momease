// Play Store phone screenshots at 1080 × 1920 (exact 9:16, standard size).
//
// We drive the live production URL, inject a pre-authenticated user so the
// AuthGate doesn't bounce, and capture 8 screens that tell the app's story:
//   1. Sign-in
//   2. Home dashboard (personalized greeting + quick actions)
//   3. Breathing orb
//   4. AI companion / chat
//   5. Sounds / auto-play
//   6. Journal
//   7. Mood check-in
//   8. Upgrade / Premium
//
// All shots use a fresh browser context per screen so we get pristine
// entrance animations, no lingering focus rings, no cache flake.

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const APP = "http://localhost:45700";
const OUT = "store-assets/screenshots";
mkdirSync(OUT, { recursive: true });

// 360 CSS px is a normal phone width — this triggers the phone layout in
// react-native-web. A 3× device pixel ratio makes each screenshot come out
// at 1080 × 1920 exactly, which is the Play Store phone-screenshot ideal.
const VIEWPORT = { width: 360, height: 640 };
const SCALE = 3;

async function shoot(name, path, prep) {
  const browser = await chromium.launch({ headless: true, args: ["--ignore-certificate-errors"] });
  try {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log(`  ! ${name}: ${e.message}`));
    await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Seed a hydrated auth + subscription so we render app-side screens without a login round-trip.
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem(
        "momease-auth",
        JSON.stringify({
          user: {
            id: "usr_demo_store",
            email: "you@momease.app",
            name: "Anna",
            role: "free",
            createdAt: now,
            onboardingCompleted: true,
          },
          isAuthenticated: true,
        })
      );
      localStorage.setItem(
        "momease-notifications",
        JSON.stringify({
          notifications: [
            { id: "s1", title: "Welcome to MomEase", body: "You're in a calm space. Take a minute for you.", type: "motivation", read: false, createdAt: new Date(Date.now() - 60000).toISOString() },
            { id: "s2", title: "Try a 2-minute reset", body: "Guided breathing can lower stress in under a minute.", type: "wellness", read: false, createdAt: new Date(Date.now() - 6 * 60000).toISOString(), route: "/breathe" },
          ],
        })
      );
    });

    if (prep) await prep(page);
    await page.goto(APP + path, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    // Extra beat for entrance animations to finish.
    await page.waitForTimeout(4200);

    const file = `${OUT}/${name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  ✓ ${file}`);
    await ctx.close();
  } finally {
    await browser.close();
  }
}

await shoot("01-signin", "/sign-in", async (page) => {
  // Fresh session — clear auth so sign-in renders.
  await page.evaluate(() => localStorage.removeItem("momease-auth"));
});
await shoot("02-home", "/home");
await shoot("03-breathe", "/breathe");
await shoot("04-chat", "/chat");
await shoot("05-sounds", "/sounds");
await shoot("06-journal", "/journal");
await shoot("07-mood", "/mood");
await shoot("08-upgrade", "/upgrade");

console.log("\nAll 8 screenshots ready in", OUT);
