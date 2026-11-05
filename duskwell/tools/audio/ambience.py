#!/usr/bin/env python3
"""The sound of each area's air, made here: flowing water, wind, crackling embers, dripping caves, humming insects, storm rain,
ringing crystal and glass, quiet halls. Each is a 24-second loop, audio/amb/<theme>.mp3, its two ends cross-faded.
needs: numpy, lame"""
import os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', 'audio', 'amb'); R = 44100; N = R * 24
rng = np.random.default_rng(7)


def lp(x, a):                      # one-pole low-pass, a in 0..1 (smaller = darker)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y


def lpf(x, a):                     # the same, fast enough on long signals: by blocks with numpy
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)


def noise(): return rng.standard_normal(N)


def slow(rate, depth=1.0):        # a slow random swell
    k = np.interp(np.arange(N), np.linspace(0, N, int(24 * rate) + 2), rng.random(int(24 * rate) + 2)); return 1 - depth + depth * k


def water():                       # a stream: bright filtered noise, gurgles
    n = lpf(noise(), 0.25) - lpf(noise(), 0.02); g = np.zeros(N)
    for _ in range(140):
        i = rng.integers(0, N - 4000); f = rng.uniform(300, 900); t = np.arange(3000) / R
        g[i:i + 3000] += np.sin(2 * np.pi * f * (1 + 2 * t) * t) * np.exp(-t * 40) * 0.5
    return n * slow(0.5, 0.4) * 0.6 + g


def wind():   return lpf(noise(), 0.015) * slow(0.25, 0.8) * 4


def embers():
    s = lpf(noise(), 0.03) * 1.5; c = np.zeros(N)
    for _ in range(900):
        i = rng.integers(0, N - 400); c[i:i + 300] += rng.standard_normal(300) * np.exp(-np.arange(300) / 30) * rng.uniform(0.3, 1.2)
    return s * slow(0.3, 0.5) + c


def drips(base=None):
    s = (base if base is not None else lpf(noise(), 0.01) * 1.2); d = np.zeros(N)
    for _ in range(70):
        i = rng.integers(0, N - 9000); f = rng.uniform(900, 2200); t = np.arange(8000) / R
        d[i:i + 8000] += np.sin(2 * np.pi * f * (1 + 0.6 * t) * t) * np.exp(-t * 30) * 0.6
        d[i + 2000:i + 8000] += np.sin(2 * np.pi * f * 0.97 * t[:6000]) * np.exp(-t[:6000] * 18) * 0.15   # its echo
    return s + d


def insects():
    s = lpf(noise(), 0.02) * 0.8; t = np.arange(N) / R
    for f, r in ((4300, 7), (5200, 11), (3700, 5)):
        s += np.sin(2 * np.pi * f * t) * (np.sin(2 * np.pi * r * t) > 0.3) * slow(0.4, 1) * 0.05
    return s + drips(np.zeros(N)) * 0.3


def rain():   return (lpf(noise(), 0.4) - lpf(noise(), 0.05)) * 0.5 + wind() * 0.6


def ring(lo, hi):
    s = lpf(noise(), 0.008); t = np.arange(N) / R
    for _ in range(40):
        i = rng.integers(0, N - 40000); f = rng.uniform(lo, hi); u = np.arange(36000) / R
        s[i:i + 36000] += (np.sin(2 * np.pi * f * u) + 0.4 * np.sin(2 * np.pi * f * 2.76 * u)) * np.exp(-u * 3) * 0.12
    return s


def hall():   return lpf(noise(), 0.006) * slow(0.15, 0.6) * 2 + drips(np.zeros(N)) * 0.2


THEMES = {'town': lambda: wind() * 0.6 + insects() * 0.6, 'cave': drips, 'moss': lambda: water() * 0.7 + insects() * 0.6,
          'spore': lambda: drips() * 0.7 + insects() * 0.4, 'aqueduct': lambda: water() + drips() * 0.4, 'webbed': lambda: hall() + insects() * 0.3,
          'foundry': lambda: embers() * 0.8 + hall() * 0.5, 'throne': hall, 'frost': lambda: wind() * 1.2, 'ember': embers,
          'storm': rain, 'mirror': lambda: ring(1800, 3200) + hall() * 0.4, 'bone': lambda: hall() + drips(np.zeros(N)) * 0.5,
          'lunar': lambda: ring(700, 1500) + wind() * 0.3, 'crystal': lambda: ring(1200, 2600) + drips() * 0.5}


def main():
    os.makedirs(OUT, exist_ok=True)
    for th, fn in THEMES.items():
        x = fn(); f = R * 2; x[:f] = x[:f] * np.linspace(0, 1, f) + x[-f:] * np.linspace(1, 0, f); x = x[:-f]   # seamless loop
        x = x / (np.abs(x).max() + 1e-9) * 0.7
        w = os.path.join(OUT, th + '.wav')
        with wave.open(w, 'wb') as fw: fw.setnchannels(1); fw.setsampwidth(2); fw.setframerate(R); fw.writeframes((x * 32767).astype(np.int16).tobytes())
        subprocess.run(['lame', '--quiet', '-V', '7', w, w[:-4] + '.mp3'], check=True); os.remove(w); print(th)


if __name__ == '__main__':
    main()
