#!/usr/bin/env python3
"""The weapons' sounds, made here: for every weapon a swing to the side, one upward and one downward (each its own sweep and
weight), and the sound of its blow landing: audio/weapons/<weapon>_<side|up|down|hit>.mp3. needs numpy, scipy, lame"""
import os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', 'audio', 'weapons'); R = 44100
rng = np.random.default_rng(11)
# weapon: (whoosh centre Hz, whoosh length s, metal ring Hz or 0, body: thump weight 0..1, extra)
W = {'nail': (1800, 0.22, 2600, 0.3, ''), 'lance': (1200, 0.28, 1500, 0.4, 'thrust'), 'rapier': (3200, 0.16, 4200, 0.1, 'thrust'),
     'fangs': (2600, 0.12, 0, 0.2, 'double'), 'scythe': (900, 0.38, 1900, 0.4, ''), 'cleaver': (600, 0.3, 900, 0.9, 'fire'),
     'bonesaw': (1400, 0.26, 0, 0.5, 'rattle')}


def bp(x, lo, hi): return sosfilt(butter(2, [lo, min(hi, R / 2 - 100)], 'band', fs=R, output='sos'), x)


def whoosh(fc, L, rise):
    n = int(R * L); t = np.linspace(0, 1, n); env = np.sin(np.pi * t) ** 1.5
    x = rng.standard_normal(n); out = np.zeros(n); seg = 256
    for i in range(0, n, seg):                                   # the band slides as the blade sweeps
        k = i / n; f = fc * (0.6 + 0.9 * (k if rise else 1 - k))
        out[i:i + seg] = bp(x[i:i + seg + 512], f * 0.7, f * 1.4)[:min(seg, n - i)]
    return out * env


def ring(f, L, d=9):
    t = np.arange(int(R * L)) / R
    return sum(np.sin(2 * np.pi * f * k * t + rng.random()) * np.exp(-t * d * k) / k for k in (1, 2.41, 3.9))


def thump(w, L=0.25):
    t = np.arange(int(R * L)) / R
    return (np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t * 18) + rng.standard_normal(len(t)) * np.exp(-t * 60) * 0.5) * w


def mix(*parts):
    n = max(len(p) for p in parts); y = np.zeros(n)
    for p in parts: y[:len(p)] += p
    return y


def save(x, name):
    x = x / (np.abs(x).max() + 1e-9) * 0.85; w = os.path.join(OUT, name + '.wav')
    with wave.open(w, 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(R); f.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(['lame', '--quiet', '-V', '5', w, w[:-4] + '.mp3'], check=True); os.remove(w)


def main():
    os.makedirs(OUT, exist_ok=True)
    for k, (fc, L, rf, body, extra) in W.items():
        for d, rise, lk, pf in (('side', True, 1, 1), ('up', True, 0.9, 1.25), ('down', False, 1.1, 0.8)):
            x = whoosh(fc * pf, L * lk, rise)
            if extra == 'double': x = mix(x, np.concatenate([np.zeros(int(R * 0.07)), whoosh(fc * pf * 1.2, L, rise) * 0.8]))
            if extra == 'thrust': x = mix(x * 0.7, np.concatenate([np.zeros(int(R * L * 0.6)), ring(rf, 0.2, 14) * 0.25]))
            if extra == 'fire': x = mix(x, rng.standard_normal(len(x)) * np.linspace(0, 1, len(x)) * 0.15)
            if rf and extra != 'thrust': x = mix(x, ring(rf * pf, 0.35) * 0.12)
            save(x, '%s_%s' % (k, d))
        hit = mix(thump(0.4 + body), ring(rf or 700, 0.3, 12) * (0.5 if rf else 0.2), bp(rng.standard_normal(int(R * 0.12)), 1500, 6000) * np.exp(-np.arange(int(R * 0.12)) / R * 40) * 0.6)
        if extra == 'rattle': hit = mix(hit, *[np.concatenate([np.zeros(int(R * 0.03 * i)), bp(rng.standard_normal(1500), 2000, 5000) * 0.4]) for i in range(1, 5)])
        if extra == 'fire': hit = mix(hit, bp(rng.standard_normal(int(R * 0.4)), 300, 2500) * np.exp(-np.arange(int(R * 0.4)) / R * 6) * 0.5)
        save(hit, k + '_hit'); print(k)


if __name__ == '__main__':
    main()
