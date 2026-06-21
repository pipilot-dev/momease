// PIN hashing helpers. The PIN is never stored in plaintext — we keep only a
// salted SHA-256 hash. The hash record lives in the cloud-synced settings
// store, so the lock follows the account across devices (it's safe to sync: a
// salted hash, readable only by the owner under Supabase row-level security).
import * as Crypto from "expo-crypto";

export interface PinRecord {
  salt: string;
  hash: string;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(salt: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

/** Build a salted-hash record for a new PIN. */
export async function makePinRecord(pin: string): Promise<PinRecord> {
  const salt = toHex(await Crypto.getRandomBytesAsync(16));
  return { salt, hash: await hashPin(salt, pin) };
}

/** Check a candidate PIN against a stored record. */
export async function verifyPinRecord(record: PinRecord | null, pin: string): Promise<boolean> {
  if (!record) return false;
  return (await hashPin(record.salt, pin)) === record.hash;
}
