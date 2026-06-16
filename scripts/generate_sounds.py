"""
MomEase — procedural calming-sound generator.

Synthesizes seamless-looping ambient WAV files (mono, 22.05 kHz, 16-bit) used by
the Calm Space screen. No external audio assets required — everything is generated
from noise + oscillators with numpy and crossfaded so it loops without a seam.

Run:  python scripts/generate_sounds.py
"""
import os
import math
import wave
import struct
import numpy as np

SR = 22050          # sample rate
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")
rng = np.random.default_rng(7)


# ── helpers ──────────────────────────────────────────────────────────────────
def normalize(x, peak=0.85):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def seamless(x, xf_sec=2.0):
    """Crossfade the tail of `x` back into the head so the buffer loops cleanly.
    `x` must already contain xf extra seconds at the end (length = loop + xf)."""
    xf = int(xf_sec * SR)
    loop = len(x) - xf
    head = x[:xf].copy()
    tail = x[loop:loop + xf].copy()
    t = np.linspace(0, 1, xf, endpoint=False)
    fade_in, fade_out = np.sin(t * math.pi / 2) ** 2, np.cos(t * math.pi / 2) ** 2
    x[:xf] = tail * fade_out + head * fade_in
    return x[:loop]


def lowpass(x, cutoff):
    """One-pole low-pass filter."""
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def pink(n):
    """Pink-ish noise via filtered white noise."""
    white = rng.standard_normal(n)
    return lowpass(white, 1200)


def write_wav(name, samples):
    samples = normalize(samples)
    data = (samples * 32767).astype(np.int16)
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    kb = os.path.getsize(path) / 1024
    print(f"  ✓ {name:<22} {len(samples)/SR:>5.1f}s  {kb:6.0f} KB")


# ── sound recipes ────────────────────────────────────────────────────────────
def gentle_rain(loop=24, xf=2):
    n = int((loop + xf) * SR)
    base = highpass(pink(n) * 1.4, 400)          # hissy rain bed
    # random droplet transients
    drops = np.zeros(n)
    for _ in range(int(loop * 22)):
        i = rng.integers(0, n - 600)
        env = np.exp(-np.linspace(0, 8, 600))
        tone = np.sin(2 * np.pi * rng.uniform(1800, 4200) * np.arange(600) / SR)
        drops[i:i + 600] += tone * env * rng.uniform(0.2, 0.6)
    return seamless(base * 0.7 + drops * 0.5, xf)


def ocean_waves(loop=28, xf=3):
    n = int((loop + xf) * SR)
    bed = lowpass(rng.standard_normal(n), 600)    # brown-ish water
    t = np.arange(n) / SR
    # two slow swells at slightly different periods => natural rhythm
    swell = (0.5 + 0.5 * np.sin(2 * np.pi * t / 9.0 - 1)) ** 2
    swell += 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 13.0)) ** 2
    return seamless(bed * (0.25 + swell), xf)


def white_noise(loop=20, xf=2):
    n = int((loop + xf) * SR)
    soft = lowpass(rng.standard_normal(n), 5000)  # softened, not harsh
    return seamless(soft, xf)


def lullaby(loop=None, xf=1.5):
    # "Twinkle Twinkle" in C, music-box timbre (sine + bell harmonics)
    notes = {"C": 523.25, "D": 587.33, "E": 659.25, "F": 698.46,
             "G": 783.99, "A": 880.00, "B": 987.77}
    seq = ["C", "C", "G", "G", "A", "A", "G", "F", "F", "E", "E", "D", "D", "C"]
    beat = 0.5
    samples = []
    for name in seq:
        f = notes[name]
        n = int(beat * SR)
        t = np.arange(n) / SR
        env = np.exp(-t * 3.5)                    # plucked music-box decay
        tone = (np.sin(2 * np.pi * f * t)
                + 0.5 * np.sin(2 * np.pi * 2 * f * t)
                + 0.25 * np.sin(2 * np.pi * 3 * f * t))
        samples.append(tone * env)
    body = np.concatenate(samples)
    # pad so the loop length is an exact bar count, add xf for seamless wrap
    body = np.concatenate([body, body[:int(xf * SR)]])
    return seamless(body, xf)


def forest(loop=30, xf=3):
    n = int((loop + xf) * SR)
    bed = highpass(pink(n), 300) * 0.35           # gentle wind/leaves
    chirps = np.zeros(n)
    for _ in range(int(loop * 4)):
        i = rng.integers(0, n - 4000)
        dur = rng.integers(1500, 3500)
        t = np.arange(dur) / SR
        f0 = rng.uniform(2200, 3600)
        # warbling bird: frequency wobble + fast amplitude flutter
        freq = f0 + 400 * np.sin(2 * np.pi * 18 * t)
        phase = 2 * np.pi * np.cumsum(freq) / SR
        env = np.sin(np.pi * np.linspace(0, 1, dur)) ** 2
        flutter = 0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)
        chirps[i:i + dur] += np.sin(phase) * env * flutter * rng.uniform(0.3, 0.7)
    return seamless(bed + chirps * 0.6, xf)


def ambient_pad(loop=26, xf=4, root=130.81):
    """Warm, slow-evolving drone — used for body-scan + meditations."""
    n = int((loop + xf) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for mult, amp in [(1, 0.6), (1.5, 0.3), (2, 0.25), (3, 0.12)]:
        detune = 1 + 0.002 * math.sin(mult)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 0.08 * t * mult)
        out += amp * np.sin(2 * np.pi * root * mult * detune * t * vib)
    shimmer = 0.5 + 0.5 * np.sin(2 * np.pi * t / 11.0)   # slow breathing swell
    return seamless(lowpass(out, 2200) * (0.45 + 0.55 * shimmer), xf)


def main():
    os.makedirs(OUT, exist_ok=True)
    print("Generating MomEase calming sounds →", os.path.normpath(OUT))
    write_wav("rain.wav", gentle_rain())
    write_wav("ocean.wav", ocean_waves())
    write_wav("whitenoise.wav", white_noise())
    write_wav("lullaby.wav", lullaby())
    write_wav("forest.wav", forest())
    write_wav("bodyscan.wav", ambient_pad(root=110.0))
    write_wav("meditation.wav", ambient_pad(root=146.83))
    print("Done.")


if __name__ == "__main__":
    main()
