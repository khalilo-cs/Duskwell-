#!/usr/bin/env python3
"""Wordless voices and new effects, all made here by synthesis (nothing recorded, nothing borrowed).
  - the people and the bosses no longer read their lines aloud: they speak in a murmured tongue of their own (syllables of a
    voice built from a throat and a mouth: a pulse, its vowels, its consonants), each with its own pitch, size and room; the
    words stay written under them as before.  audio/voices/npc_<type>_<n>.mp3, boss_<key>_<n>.mp3
  - every creature gets a fuller cry (idle, hurt, die) from its kind of body.  audio/voices/<kind>_idle|hurt|die.mp3
  - the hero's short efforts (no words).  audio/voices/hero_<what>.mp3
  - the effects of the fight and the world (nail, strikes, bursts, coins, healing...): audio/sfx/w_<event>_<n>.mp3, and
    audio/sfx/sfx.json is pointed at them.
needs: numpy, scipy, lame.   python3 tools/audio/wordless.py"""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import lfilter, butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
VO = os.path.join(ROOT, 'audio', 'voices'); SFX = os.path.join(ROOT, 'audio', 'sfx'); R = 44100
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ tools
def t_(d): return np.arange(int(d * R)) / R
def smooth(n, pts, amt=1.0):                       # slow random wander, n samples, about pts turns
    k = rng.standard_normal(max(2, pts)); return np.interp(np.linspace(0, len(k) - 1, n), np.arange(len(k)), k) * amt
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [max(20, lo), min(R / 2 - 100, hi)], 'band', fs=R, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, min(R / 2 - 100, f), 'low', fs=R, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, max(20, f), 'high', fs=R, output='sos'), x)
def env(n, a, d, curve=3.0):                       # attack seconds, then a decay to the end
    a = max(1, int(a * R)); e = np.ones(n); e[:a] = np.linspace(0, 1, a) if a < n else np.linspace(0, 1, n)[:a]
    if n > a: e[a:] = np.exp(-curve * np.linspace(0, 1, n - a) * d)
    return e
def fade(x, a=0.004, b=0.03):
    n = len(x); x = x.copy(); ia, ib = min(n, int(a * R)), min(n, int(b * R))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def noise(n): return rng.standard_normal(n)
def mix(*parts):
    n = max(len(p) for p in parts); o = np.zeros(n)
    for p in parts: o[:len(p)] += p
    return o
def at(x, sec, total=None):                        # x placed sec into silence
    pad = np.zeros(int(sec * R)); return np.concatenate([pad, x])
def room(x, size=0.6, wet=0.25, bright=4000):      # a small hall: decaying noise as its echo
    n = int(size * R); ir = noise(n) * np.exp(-np.linspace(0, 7, n)); ir = lp(ir, bright); ir[0] = 0
    w = np.convolve(x, ir)[:len(x) + n]; w = np.concatenate([w, np.zeros(len(x) + n - len(w))]); w /= (np.abs(w).max() + 1e-9)
    d = np.concatenate([x, np.zeros(n)]); d /= (np.abs(d).max() + 1e-9)
    return d * (1 - wet) + w * wet
def drive(x, k): return np.tanh(x * k) / np.tanh(k)


def save(sig, path, peak=0.9):
    sig = np.nan_to_num(sig); sig = sig / (np.abs(sig).max() + 1e-9) * peak
    sig = fade(sig, 0.002, 0.02)
    tmp = path[:-4] + '.wav'
    with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes((sig * 32767).astype(np.int16).tobytes())
    subprocess.run(['lame', '--quiet', '-V', '5', tmp, path], check=True); os.remove(tmp)


# ------------------------------------------------------------------ a voice: throat, mouth, syllables
VOWELS = {'a': (730, 1090, 2440), 'e': (530, 1840, 2480), 'i': (300, 2200, 3000), 'o': (570, 840, 2410), 'u': (330, 870, 2240), 'ə': (500, 1500, 2500)}


def throat(f0, breath=0.15, rough=0.0):
    """a pulse at the pitch f0 (array, Hz): an open/close of the folds, with a little unsteadiness and breath"""
    n = len(f0); f = f0 * (1 + smooth(n, n // 2000 + 3, 0.012)) * (1 + rough * smooth(n, n // 150 + 3, 0.06))
    ph = np.cumsum(f / R) % 1.0
    g = np.where(ph < 0.62, np.sin(np.pi * ph / 0.62) ** 2, 0.0); g = np.diff(g, prepend=0) * 40
    if rough: g *= 1 + rough * 0.8 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 0.5 / R)))     # a rasp: every other pulse heavier
    return g + noise(n) * breath * (0.6 + 0.4 * g.clip(0) / (g.max() + 1e-9))


def mouth(src, vowel, size=1.0):
    """the vowel's three resonances (size > 1: a bigger body, lower resonances)"""
    out = np.zeros_like(src)
    for i, (F, B) in enumerate(zip(VOWELS[vowel], (90, 110, 160))):
        F = F / size; r = np.exp(-np.pi * B / R); th = 2 * np.pi * F / R
        y = lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], src); out += y * (1.0, 0.6, 0.3)[i]
    return out


CONS = {'k': (2500, 4500, 0.03), 't': (3500, 7000, 0.025), 'p': (300, 1500, 0.02), 's': (4500, 10000, 0.09), 'h': (800, 3000, 0.06),
        'm': None, 'n': None, 'r': 'r', 'l': None, 'g': (1500, 3000, 0.025), 'sh': (2200, 6000, 0.09), '': None}


def syllable(f0a, f0b, vowel, cons, dur, size, breath, rough, lvl=1.0):
    n = int(dur * R); f0 = np.linspace(f0a, f0b, n)
    v = mouth(throat(f0, breath, rough), vowel, size)
    e = np.minimum(1, np.linspace(0, 6, n)) * np.minimum(1, np.linspace(5, 0, n)) ** 1.2
    if cons == 'r': v *= 1 - 0.5 * (np.sin(2 * np.pi * 28 * t_(dur)) > 0) * (np.arange(n) < n * 0.3)
    if cons in ('m', 'n', 'l'): e *= np.minimum(1, np.linspace(0.3, 3, n))              # a soft hum leading in
    s = v * e / (np.abs(v).max() + 1e-9) * lvl
    c = CONS.get(cons)
    if isinstance(c, tuple):
        cn = int(c[2] * R); burst = bp(noise(cn), c[0] / size ** 0.3, c[1]) * np.exp(-np.linspace(0, 5, cn))
        s = np.concatenate([burst / (np.abs(burst).max() + 1e-9) * 0.35 * lvl, s])
    return s


def murmur(seed, sylls, pitch, size, breath=0.12, rough=0.0, rate=1.0, shape='fall', gap=0.035):
    """a phrase of the made tongue: sylls syllables, a melody shape (fall, rise, ask, sing, laugh)"""
    r = np.random.default_rng(seed); parts = []
    vs = list('aeiouə'); cs = ['k', 't', 'm', 'n', 'h', 'r', 'l', 'g', 's', 'p', '', 'sh']
    for i in range(sylls):
        u = i / max(1, sylls - 1)
        k = {'fall': 1.15 - 0.35 * u, 'rise': 0.9 + 0.3 * u, 'ask': 1.0 if u < 0.7 else 1.35, 'sing': 1 + 0.18 * np.sin(u * 6.3),
             'laugh': 1.25 - 0.1 * (i % 2), 'flat': 1.0}[shape]
        p = pitch * k * (1 + r.uniform(-0.06, 0.06)); d = r.uniform(0.09, 0.17) / rate
        if shape == 'laugh': d = 0.08 / rate
        if i == sylls - 1 and shape != 'laugh': d *= 1.7
        stress = 1.0 if i % 3 == 0 else 0.75
        parts.append(syllable(p * 1.04, p * (0.93 if i < sylls - 1 else 0.82), r.choice(vs), r.choice(cs), d, size, breath, rough, stress))
        parts.append(np.zeros(int(r.uniform(0.6, 1.4) * gap * R / rate)))
        if r.random() < 0.15 and i < sylls - 2: parts.append(np.zeros(int(0.09 * R)))      # a short pause, like a breath between words
    return np.concatenate(parts)


# ------------------------------------------------------------------ the people
PEOPLE = {   # type: pitch, body size, breath, rasp, speed, room
    'elder': (105, 1.15, 0.3, 0.25, 0.8, (0.9, 0.3)), 'merchant': (175, 0.95, 0.1, 0.0, 1.25, (0.4, 0.15)),
    'smith': (88, 1.3, 0.12, 0.35, 0.95, (0.7, 0.25)), 'outfitter': (230, 0.85, 0.12, 0.0, 1.1, (0.4, 0.15)),
    'wizard': (190, 0.9, 0.35, 0.05, 0.85, (1.4, 0.45)), 'trader': (130, 1.05, 0.14, 0.1, 1.05, (0.5, 0.2)),
}


def people():
    for k, (p, sz, br, ro, ra, (rs, rw)) in PEOPLE.items():
        for i in range(2):
            seed = hash((k, i)) % 10000
            x = murmur(seed, 6 if i == 0 else 4, p, sz, br, ro, ra, ['sing' if k == 'wizard' else 'rise', 'fall'][i])
            if k == 'merchant' and i == 0: x = np.concatenate([x, np.zeros(int(0.05 * R)), murmur(seed + 1, 3, p * 1.2, sz, br, 0, 1.6, 'laugh')])
            if k == 'elder': x = np.concatenate([syllable(p, p * 0.8, 'ə', 'h', 0.28, sz, 0.6, 0.3, 0.5), np.zeros(int(0.1 * R)), x])   # a sigh before he speaks
            save(room(hp(x, 70), rs, rw), os.path.join(VO, 'npc_%s_%d.mp3' % (k, i)))


def hero():
    P, S = 210, 0.9
    out = {
        'atk0': syllable(P * 1.1, P * 0.95, 'a', 'h', 0.09, S, 0.45, 0, 0.7), 'atk1': syllable(P * 1.2, P, 'ə', 'h', 0.08, S, 0.5, 0, 0.7),
        'atk2': syllable(P * 1.25, P * 0.9, 'a', 'h', 0.14, S, 0.4, 0.1, 0.9), 'hurt0': syllable(P * 1.5, P * 1.0, 'a', '', 0.16, S, 0.35, 0.3, 1),
        'hurt1': syllable(P * 1.35, P * 0.9, 'u', 'k', 0.14, S, 0.4, 0.3, 1), 'jump': syllable(P, P * 1.1, 'u', 'h', 0.07, S, 0.6, 0, 0.5),
        'die': np.concatenate([syllable(P * 1.4, P * 0.6, 'a', '', 0.55, S, 0.35, 0.35, 1), syllable(P * 0.6, P * 0.45, 'ə', 'h', 0.5, S, 0.8, 0.2, 0.35)]),
        'heal': syllable(P * 0.85, P * 0.9, 'u', 'm', 0.5, S, 0.5, 0, 0.6),
    }
    for k, x in out.items(): save(room(x, 0.3, 0.12), os.path.join(VO, 'hero_%s.mp3' % k), 0.8)


# ------------------------------------------------------------------ the bosses: a cry of their own instead of read lines
BOSSES = {   # key: pitch, body size, rasp, kind
    'guardian': (62, 1.8, 0.5, 'stone'), 'weaver': (240, 1.0, 0.2, 'hiss'), 'wraith': (300, 0.9, 0.1, 'wail'), 'king': (80, 1.6, 0.4, 'roar'),
    'spore': (120, 1.4, 0.4, 'wet'), 'drowned': (70, 1.7, 0.3, 'wet'), 'brood': (200, 1.2, 0.35, 'hiss'), 'queen': (260, 1.0, 0.1, 'wail'),
    'colossus': (52, 2.0, 0.6, 'stone'), 'thunderhoof': (68, 1.8, 0.55, 'roar'), 'roc': (420, 0.8, 0.3, 'screech'), 'duelist': (150, 1.0, 0.15, 'voice'),
    'twin': (190, 0.95, 0.1, 'voice'), 'bonewright': (95, 1.4, 0.45, 'roar'), 'marrow': (58, 1.9, 0.6, 'roar'), 'stargazer': (170, 1.1, 0.1, 'wail'),
    'regent': (85, 1.6, 0.35, 'roar'),
}


def cry(p, sz, ro, kind, n, seed):
    """n: 0 the rising (a long call), 1 at half health (a furious burst), 2 its fall (a breaking, fading cry)"""
    r = np.random.default_rng(seed)
    d = (1.6, 1.0, 2.2)[n]; N = int(d * R); u = np.linspace(0, 1, N)
    shapes = (1 + 0.25 * np.sin(np.pi * u) - 0.1 * u, 1.25 + 0.35 * np.sin(np.pi * u * 0.8), 1.15 - 0.6 * u ** 0.7)
    f0 = p * shapes[n] * (1 + smooth(N, 9, 0.03))
    vowel = 'a' if n != 2 else 'o'
    if kind == 'voice':                                  # a person's voice: they speak in the murmured tongue
        x = murmur(seed, (7, 4, 5)[n], p, sz, 0.15, ro, (0.9, 1.3, 0.7)[n], ('fall', 'rise', 'fall')[n])
        return room(hp(x, 60), 1.2, 0.35)
    base = mouth(throat(f0, 0.25 + ro * 0.3, ro), vowel, sz)
    sub = mouth(throat(f0 * 0.5, 0.1, ro), 'o', sz) * 0.6                                   # an undertone an octave down: weight
    growl = 1 + (0.5 * ro) * np.sin(2 * np.pi * np.cumsum(np.full(N, 34 + 20 * ro) / R))  # a growl's tremble
    x = (base + sub) * growl
    e = np.minimum(1, u * (6, 14, 4)[n]) * np.minimum(1, (1 - u) * (3, 4, 1.5)[n])
    if n == 2: e *= 1 - 0.5 * (smooth(N, 40, 1) > 0.6)                                   # the breath breaks as it falls
    x = x * e
    if kind == 'stone':
        x = mix(x, lp(noise(N), 180) * e * 3, bp(noise(N), 900, 3000) * e * 0.6 * (smooth(N, 60) > 0.8))
    elif kind == 'hiss':
        x = mix(x * 0.7, bp(noise(N), 3000, 9000) * e * 0.9)
    elif kind == 'wail':
        x = mix(x * 0.5, mouth(throat(f0 * 2, 0.05, 0), 'u', sz) * e * 0.8); x = room(x, 1.8, 0.5, 6000); return x
    elif kind == 'wet':
        bub = np.zeros(N)
        for _ in range(int(d * 22)):
            s = r.integers(0, N - 4000); L = r.integers(900, 3000); fq = r.uniform(250, 700) / sz ** 0.5
            bub[s:s + L] += np.sin(2 * np.pi * np.cumsum(np.linspace(fq, fq * 1.8, L)) / R) * np.exp(-np.linspace(0, 6, L))
        x = mix(x, bub * 0.5 * e.max())
    elif kind == 'screech':
        x = mix(x, mouth(throat(f0 * 2.2, 0.3, 0.4), 'i', 0.7) * e * 0.9)
    x = drive(x / (np.abs(x).max() + 1e-9), 1.5 + ro * 2.5)
    return room(hp(x, 35), 1.4, 0.32, 5000)


def bosses():
    for k, (p, sz, ro, kind) in BOSSES.items():
        for n in range(3): save(cry(p, sz, ro, kind, n, hash((k, n)) % 10000), os.path.join(VO, 'boss_%s_%d.mp3' % (k, n)))


# ------------------------------------------------------------------ the creatures
KINDS = {
    'husk': ('growl', 110, 0.5, 1), 'crawler': ('chitter', 900, 0.4, 0.8), 'flyer': ('buzz', 220, 0.3, 0.9), 'hopper': ('croak', 160, 0.5, 0.9),
    'spitter': ('gurgle', 140, 0.6, 1), 'shard': ('chime', 880, 0.1, 0.9), 'sentinel': ('clank', 90, 0.3, 1), 'diver': ('shriek', 1300, 0.3, 0.8),
    'spider': ('chitter', 1300, 0.5, 0.7), 'shroom': ('puff', 300, 0.2, 0.9), 'jelly': ('gurgle', 420, 0.2, 0.9), 'warden': ('growl', 70, 0.7, 1.3),
    'ram': ('bellow', 95, 0.6, 1.1), 'mole': ('snuffle', 260, 0.4, 0.8), 'lavaworm': ('hiss', 180, 0.7, 1.1), 'imp': ('cackle', 520, 0.4, 0.8),
    'veil': ('wail', 600, 0.1, 1.3), 'roller': ('clank', 150, 0.4, 0.9), 'slime': ('gurgle', 220, 0.3, 0.8), 'chainman': ('growl', 80, 0.6, 1.2),
    'moth': ('buzz', 330, 0.2, 0.8), 'icicle': ('chime', 1400, 0.1, 0.7), 'heap': ('bellow', 70, 0.8, 1.2), 'skullbat': ('shriek', 1700, 0.4, 0.7),
    'censer': ('wail', 380, 0.4, 1.1), 'lensling': ('chime', 1100, 0.2, 0.8), 'orrery': ('clank', 300, 0.2, 1), 'lunarhare': ('squeak', 1500, 0.2, 0.6),
    'gloomhound': ('growl', 130, 0.6, 1), 'thornback': ('chitter', 700, 0.6, 0.9), 'cinderling': ('croak', 120, 0.7, 1), 'frostwisp': ('chime', 1250, 0.15, 0.8),
    'glasscrab': ('chitter', 1100, 0.3, 0.8), 'bonejackal': ('growl', 160, 0.7, 0.9), 'gearmite': ('clank', 420, 0.3, 0.7), 'stormkite': ('shriek', 1500, 0.3, 0.8),
}


def bell(f, d, partials=(1, 2.76, 5.4, 8.93), decay=4.0):
    T = t_(d); return sum(np.sin(2 * np.pi * f * m * T + rng.uniform(0, 6)) * np.exp(-T * decay * (1 + i * 0.8)) / (i + 1) for i, m in enumerate(partials))


def splat(d=0.25, f=900):                          # the wet burst of a shell giving way
    N = int(d * R); x = lp(noise(N), f) * np.exp(-np.linspace(0, 9, N)); thump = np.sin(2 * np.pi * np.cumsum(np.linspace(140, 45, N)) / R) * np.exp(-np.linspace(0, 7, N))
    return x * 0.8 + thump


def creature(body, p, ro, L, what, seed):
    r = np.random.default_rng(seed); d = {'idle': 0.6, 'hurt': 0.28, 'die': 0.8}[what] * L; N = int(d * R); u = np.linspace(0, 1, N)
    bend = {'idle': 1 + 0.12 * np.sin(np.pi * u), 'hurt': 1.3 - 0.3 * u, 'die': 1.2 - 0.55 * u}[what]
    e = np.minimum(1, u * 25) * np.minimum(1, (1 - u) * (4 if what != 'die' else 2))
    if body in ('growl', 'bellow', 'croak', 'shriek', 'wail', 'squeak', 'cackle'):
        vw = {'growl': 'o', 'bellow': 'a', 'croak': 'ə', 'shriek': 'i', 'wail': 'u', 'squeak': 'i', 'cackle': 'e'}[body]
        sz = {'growl': 1.4, 'bellow': 1.6, 'croak': 1.2, 'shriek': 0.65, 'wail': 0.9, 'squeak': 0.6, 'cackle': 0.8}[body]
        f0 = p * bend * (1 + smooth(N, 6, 0.03))
        x = mouth(throat(f0, 0.2 + ro * 0.2, ro), vw, sz)
        if body == 'croak': x *= 0.5 + 0.5 * (np.sin(2 * np.pi * 22 * t_(d)) > 0)
        if body == 'cackle': x *= 0.4 + 0.6 * (np.sin(2 * np.pi * 9 * t_(d)) > 0)
        if body in ('growl', 'bellow'): x = mix(x, mouth(throat(f0 * 0.5, 0.1, ro), 'o', sz) * 0.5)
        if body == 'wail': x = room(x, 1.0, 0.4)[:N]
        x = drive(x / (np.abs(x).max() + 1e-9) * e, 1 + ro * 3)
    elif body == 'chitter':
        x = np.zeros(N)
        for s in np.cumsum(r.uniform(0.018, 0.05, 60)):
            i = int(s * R)
            if i > N - 800: break
            c = bp(noise(700), p * r.uniform(0.8, 1.3), p * 3.5) * np.exp(-np.linspace(0, 8, 700)); x[i:i + 700] += c
        x = x * e + mouth(throat(p * 0.4 * bend, 0.3, ro), 'i', 0.7) * e * 0.15
    elif body == 'buzz':
        f0 = p * bend * (1 + 0.04 * np.sin(2 * np.pi * 7 * t_(d))); ph = np.cumsum(f0 / R) % 1
        x = bp((ph * 2 - 1) + noise(N) * 0.2, p, p * 12) * e
    elif body == 'chime':
        x = bell(p * (1.0 if what != 'die' else 1.3), d, decay=3 / L) * np.minimum(1, u * 80)
        if what == 'die': x = mix(x, bell(p * 1.5, d * 0.8), bp(noise(int(0.2 * R)), 4000, 12000) * np.exp(-np.linspace(0, 6, int(0.2 * R))))
    elif body == 'clank':
        x = bell(p, d, (1, 2.3, 3.9, 5.6, 7.7), 6 / L) + lp(noise(N), 600) * np.exp(-u * 20) * 0.5
        if what == 'idle': x = mix(x, at(bell(p * 1.1, d * 0.6, (1, 2.3, 3.9), 9), d * 0.4))
    elif body == 'gurgle':
        x = np.zeros(N)
        for _ in range(int(d * 30)):
            s = r.integers(0, max(1, N - 3000)); Lb = r.integers(800, 2600); fq = p * r.uniform(0.7, 1.6)
            x[s:s + Lb] += np.sin(2 * np.pi * np.cumsum(np.linspace(fq, fq * 2, Lb)) / R) * np.exp(-np.linspace(0, 5, Lb))
        x = x * e + lp(noise(N), 400) * e * 0.3
    elif body == 'puff':
        x = bp(noise(N), p, p * 6) * np.exp(-u * 5) + mouth(throat(p * 0.5 * bend, 0.6, 0), 'u', 1) * e * 0.4
    elif body == 'hiss':
        x = bp(noise(N), 2500, 9000) * e + mouth(throat(p * bend, 0.3, ro), 'ə', 1.3) * e * 0.4
    elif body == 'snuffle':
        x = np.zeros(N)
        for s in np.arange(0, d - 0.08, 0.11):
            i = int(s * R); c = bp(noise(3000), p, p * 8) * np.sin(np.linspace(0, np.pi, 3000)); x[i:i + 3000] += c
        x = x * e
    else:
        x = noise(N) * e
    if what == 'die': x = mix(x / (np.abs(x).max() + 1e-9), splat(0.3, 1200) * 0.8)
    if what == 'hurt': x = mix(x / (np.abs(x).max() + 1e-9), splat(0.12, 2000) * 0.4)
    return room(hp(x, 50), 0.4, 0.15)


def creatures():
    for k, (b, p, ro, L) in KINDS.items():
        for w in ('idle', 'hurt', 'die'): save(creature(b, p, ro, L, w, hash((k, w)) % 10000), os.path.join(VO, '%s_%s.mp3' % (k, w)), 0.85)


# ------------------------------------------------------------------ the effects
def nail(v):                                       # a thin blade through air: a fast swept rush with a faint ring of metal
    d = 0.2; N = int(d * R); u = np.linspace(0, 1, N); x = noise(N)
    fc = 1800 + 4500 * np.sin(np.pi * u ** 0.6) * (0.8 + 0.1 * v)
    out = np.zeros(N); blk = 512
    for i in range(0, N, blk): seg = x[max(0, i - 256):i + blk]; out[i:i + blk] = bp(seg, fc[i] * 0.6, fc[i] * 1.5)[-len(out[i:i + blk]):]
    e = np.sin(np.pi * np.minimum(1, u * 1.4)) ** 2
    ring = bell(3100 + 300 * v, d, (1, 1.51, 2.3), 18) * 0.06
    return out * e + ring


def strike(v, heavy=False):                        # the nail meets a body: a crack, a thud, a short wet crunch
    d = 0.35 if heavy else 0.22; N = int(d * R); u = np.linspace(0, 1, N)
    crack = bp(noise(N), 2000, 9000) * np.exp(-u * 60)
    thud = np.sin(2 * np.pi * np.cumsum(np.linspace(180 if not heavy else 120, 40, N)) / R) * np.exp(-u * (14 if not heavy else 8))
    crunch = bp(noise(N), 500, 2500) * np.exp(-u * 18) * (0.5 + 0.5 * (smooth(N, 40) > 0))
    ring = bell(1900 + 150 * v, d, (1, 2.4), 20) * 0.12
    x = crack * 0.7 + thud * (1.2 if heavy else 0.9) + crunch * 0.6 + ring
    return drive(x / np.abs(x).max(), 2.2 if heavy else 1.6)


def burst(v, big=False):                           # a creature's end: a wet pop and pieces of shell
    d = 2.6 if big else 0.6; N = int(d * R); u = np.linspace(0, 1, N)
    x = splat(0.45 if not big else 0.9, 1400)
    for i in range(10 if not big else 30):
        s = rng.uniform(0.02, d * 0.5); x = mix(x, at(bell(rng.uniform(1200, 3500), 0.12, (1, 2.7), 30) * 0.15, s))
    if big:
        boom = lp(noise(N), 120) * np.exp(-u * 3) * 3 + np.sin(2 * np.pi * np.cumsum(np.linspace(70, 28, N)) / R) * np.exp(-u * 2.5) * 1.5
        shimmer = bp(noise(N), 3000, 9000) * np.exp(-u * 4) * 0.08 * np.minimum(1, u * 4)
        x = mix(x, boom, shimmer); return room(drive(x / np.abs(x).max(), 1.8), 2.0, 0.35)
    return room(x, 0.3, 0.1)


def slam(v):
    d = 0.9; N = int(d * R); u = np.linspace(0, 1, N)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(90, 30, N)) / R) * np.exp(-u * 5) * 1.5 + lp(noise(N), 300) * np.exp(-u * 6) + bp(noise(N), 800, 3000) * np.exp(-u * 25) * 0.4
    for _ in range(8): x = mix(x, at(lp(noise(2500), 2500) * np.exp(-np.linspace(0, 8, 2500)) * 0.2, rng.uniform(0.08, 0.5)))   # pebbles falling after
    return room(drive(x / np.abs(x).max(), 2), 1.0, 0.25)


def breaking(v):
    d = 0.6; N = int(d * R); u = np.linspace(0, 1, N)
    x = lp(noise(N), 1500) * np.exp(-u * 12) + np.sin(2 * np.pi * np.cumsum(np.linspace(110, 50, N)) / R) * np.exp(-u * 10)
    for _ in range(14): x = mix(x, at(bp(noise(1800), 700, 4000) * np.exp(-np.linspace(0, 7, 1800)) * 0.4, rng.uniform(0.02, 0.4)))
    return room(x, 0.6, 0.2)


def coin(v):                                       # a bright little clink, two or three pieces
    x = np.zeros(1)
    for i in range(2 + v % 2): x = mix(x, at(bell(rng.uniform(2600, 3600), 0.35, (1, 2.4, 3.9), 10) * (1 - i * 0.25), i * rng.uniform(0.045, 0.08)))
    return room(x, 0.3, 0.12)


def ability(v):                                    # a gathered power let go: a rising swell, then a bright release
    d = 0.9; N = int(d * R); u = np.linspace(0, 1, N)
    sw = bp(noise(N), 400, 3000) * u ** 2 * (u < 0.55)
    tone = sum(np.sin(2 * np.pi * np.cumsum(np.linspace(220, 440, N) * m) / R) / m for m in (1, 1.5, 2, 3)) * np.minimum(1, u * 3) * np.exp(-np.maximum(0, u - 0.5) * 8)
    rel = bp(noise(N), 2000, 8000) * np.exp(-np.maximum(0, u - 0.55) * 10) * (u > 0.55)
    return room(sw * 0.8 + tone * 0.4 + rel, 1.2, 0.35)


def heal(v):                                       # breath drawn in, a soft glow of tones
    d = 1.4; N = int(d * R); u = np.linspace(0, 1, N); T = t_(d)
    pad = sum(np.sin(2 * np.pi * f * T) for f in (330, 495, 660, 990)) * np.sin(np.pi * u) ** 2
    air = bp(noise(N), 1500, 6000) * np.sin(np.pi * u) * 0.06
    return room(pad * 0.3 + air, 1.6, 0.45, 7000)


def bench(v):                                      # sitting to rest: a soft wooden creak and a calm chord
    d = 2.0; N = int(d * R); u = np.linspace(0, 1, N); T = t_(d)
    creak = bp(noise(int(0.25 * R)), 300, 1200) * (1 + np.sin(2 * np.pi * 60 * t_(0.25))) * np.exp(-np.linspace(0, 4, int(0.25 * R)))
    ch = sum(np.sin(2 * np.pi * f * T) * np.exp(-T * 1.2) for f in (196, 247, 294, 392)) * np.minimum(1, u * 10)
    return room(mix(creak * 0.5, at(ch * 0.25, 0.15)), 1.8, 0.4)


def amb_forest():                                  # a long quiet loop of wind, distant drips and the hum of deep places
    d = 30.0; N = int(d * R); u = np.linspace(0, 1, N)
    wind = lp(noise(N), 500) * (0.6 + 0.4 * (smooth(N, 12) * 0.5 + 0.5))
    hum = sum(np.sin(2 * np.pi * f * t_(d)) for f in (55, 82.5)) * 0.08
    x = wind * 0.5 + hum
    for _ in range(40): x = mix(x, at(bell(rng.uniform(900, 1800), 0.4, (1, 2.1), 14) * 0.05, rng.uniform(0, d - 0.5)))[:N]
    xf = int(2 * R); x[:xf] = x[:xf] * np.linspace(0, 1, xf) + x[-xf:] * np.linspace(1, 0, xf)                 # loops without a seam
    return room(x[:N - xf], 1.5, 0.3)[:N - xf]


EFFECTS = {   # event: (maker, how many, rate range, gain, layer over the synthesised one)
    'slash': (nail, 4, (0.94, 1.08), 0.75, False), 'hit': (lambda v: strike(v), 4, (0.92, 1.08), 0.9, False),
    'bossHit': (lambda v: strike(v, True), 3, (0.85, 1.0), 1.0, False), 'enemyDie': (lambda v: burst(v), 3, (0.9, 1.1), 0.9, False),
    'roar': (lambda v: cry(70 + v * 8, 1.7, 0.5, 'roar', 0, 900 + v), 3, (0.95, 1.05), 1.0, False),
    'bossDie': (lambda v: burst(v, True), 2, (0.95, 1.02), 1.0, False), 'slam': (slam, 3, (0.9, 1.1), 1.0, False),
    'break': (breaking, 3, (0.9, 1.1), 0.9, False), 'geo': (coin, 4, (0.95, 1.08), 0.6, False),
    'ability': (ability, 2, (0.96, 1.04), 0.8, False), 'heal': (heal, 2, (0.98, 1.02), 0.7, False), 'bench': (bench, 1, (1, 1), 0.8, False),
}


def effects():
    meta = json.load(open(os.path.join(SFX, 'sfx.json')))
    for ev, (fn, n, rate, gain, layer) in EFFECTS.items():
        names = []
        for v in range(n):
            nm = 'w_%s_%d' % (ev, v); save(fn(v), os.path.join(SFX, nm + '.mp3')); names.append(nm)
        meta['events'][ev] = {'files': names, 'rate': list(rate), 'gain': gain, 'layer': layer}
    save(amb_forest(), os.path.join(SFX, 'w_amb_deep.mp3'), 0.6)
    meta['ambience']['forest'] = dict(meta['ambience'].get('forest', {}), file='w_amb_deep')
    json.dump(meta, open(os.path.join(SFX, 'sfx.json'), 'w'), indent=1)


if __name__ == '__main__':
    import sys
    want = sys.argv[1:] or ['people', 'hero', 'bosses', 'creatures', 'effects']
    for w in want: globals()[w](); print('ok', w)
