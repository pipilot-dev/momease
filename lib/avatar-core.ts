// Default profile pictures made on the device: the person's initials on a soft colour.
// (Replaces placeholder pictures that used to be downloaded from a third-party service.)

const PALETTE = ["#F9A8D4", "#C4B5FD", "#FDBA74", "#86EFAC", "#7DD3FC", "#FDE68A", "#FCA5A5", "#A5B4FC"];

/** Up to two capital letters from a display name or @username. "M" when there is nothing to use. */
export function initialsOf(name?: string | null): string {
  const words = (name ?? "").replace(/^@/, "").trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "M";
  const first = [...words[0]][0] ?? "M";
  const second = words.length > 1 ? [...words[words.length - 1]][0] ?? "" : "";
  return (first + second).toUpperCase();
}

/** The same name always gets the same colour. */
export function avatarColor(name?: string | null): string {
  let h = 0;
  for (const ch of name ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
