// Android 16 ignores portrait locks on large screens (tablets, foldables, desktop windows), so the
// app no longer declares one. Phones still stay portrait: we lock at runtime when the screen is small.

/** Android's "large screen" breakpoint, in dp. */
export const LARGE_SCREEN_MIN_DP = 600;

export function isLargeScreen(width: number, height: number): boolean {
  return Math.min(width, height) >= LARGE_SCREEN_MIN_DP;
}
