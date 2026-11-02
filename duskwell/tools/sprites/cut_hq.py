#!/usr/bin/env python3
"""Cuts the detailed single-pose paintings in art/source/hq/<kind>_<pose>.webp (one figure on flat grey, 1824x1024) into one atlas
per creature, art/creatures/hq/<kind>.webp, and js/creature_hq_meta.js. CREATURE_HQ[kind][state] = [[x, y, w, h, ax, ay, kind], ...]
with the same number of frames per state as the creature's old rows (CREATURE_ANIMS), so the code that picks a frame does not change.
Every pose is scaled so the body keeps the size it has in the idle pose (the paintings are made one by one, at slightly different sizes)."""
import os, sys, json, re, glob, numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_canva import objects
SRC = os.path.join(ROOT, 'art', 'source', 'hq'); OUT = os.path.join(ROOT, 'art', 'creatures', 'hq')
LIMIT = 340                                                   # the idle pose at most this many pixels on its longer side

def cut(path):
    im, fg, lab, o = objects(path, minarea=1)
    l, n = ndi.label(ndi.binary_dilation(fg, iterations=4)); sz = ndi.sum(fg, l, range(1, n + 1))
    keep = [i + 1 for i, v in enumerate(sz) if v > max(1500, sz.max() * 0.02)]
    m = np.isin(l, keep) & fg
    body = (l == int(np.argmax(sz)) + 1) & fg
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.9); a = np.clip((a - 0.2) / 0.6, 0, 1)
    yy, xx = np.where(m); y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    rgba = np.dstack([cv2.cvtColor(im, cv2.COLOR_BGR2RGB), (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
    return Image.fromarray(rgba), float(body.sum())

# old row lengths and how an attack row divides (wind-up, strike, recovery)
def rows_of(kind):
    js = open(os.path.join(ROOT, 'js', 'creature_anims_meta.js')).read()
    A = json.loads(re.search(r'const CREATURE_ANIMS = (\{.*?\});', js, re.S).group(1))
    P = json.loads(re.search(r'const CREATURE_PARTS = (\{.*?\});', js, re.S).group(1))
    return {s: len(v) for s, v in A[kind].items()}, P.get(kind)

def spread(names, n):                                         # n frames walking through the given poses in order
    return [names[min(len(names) - 1, i * len(names) // n)] for i in range(n)]

def plan(kind, have):
    L, part = rows_of(kind); out = {}
    for s, n in L.items():
        if s == 'idle': seq = spread(['idle_a', 'idle_b'], n) if n > 1 else ['idle_a']
        elif s == 'walk': seq = [['walk_a', 'walk_b', 'walk_c', 'walk_b'][i % 4] for i in range(n)]
        elif s == 'atk':
            if part: w, k, r = part
            else: w = 2 if n >= 5 else 1; k = min(2, n - w); r = n - w - k
            seq = spread(['atk_a'], w) + spread(['atk_b'], k) + spread(['atk_c'], r)
        elif s == 'hurt': seq = ['hurt'] * n
        elif s in ('death', 'fall'): seq = spread(['death_a', 'death_b'], n) if n > 1 else ['death_b']
        elif s in ('rise', 'dig'): seq = spread([p for p in ('rise_a', 'rise_b', 'idle_a') if p in have or p == 'idle_a'], n)
        elif s == 'roll': seq = spread(['roll_a', 'roll_b', 'roll_b'], n)
        elif s == 'crash': seq = spread(['crash_a'], n)
        elif s == 'shatter': seq = spread(['crash_b'], n)
        elif s == 'pile': seq = ['pile'] * n
        elif s == 'skull': seq = ['skull'] * n
        else: seq = ['idle_a'] * n
        out[s] = [p if p in have else 'idle_a' for p in seq]
    return out

kinds = sorted({os.path.basename(p).split('_')[0] for p in glob.glob(os.path.join(SRC, '*_idle_a.webp'))})
meta = {}
for kind in kinds:
    have = {os.path.basename(p)[len(kind) + 1:-5]: p for p in glob.glob(os.path.join(SRC, kind + '_*.webp'))}
    cuts = {k: cut(p) for k, p in have.items()}
    ref_im, ref_area = cuts['idle_a']; s0 = min(1.0, LIMIT / max(ref_im.size))
    pics, where = [], {}
    for k, (im, area) in sorted(cuts.items()):
        s = s0 * min(1.6, max(0.6, (ref_area / max(area, 1)) ** 0.5))   # the body as big as in the idle pose
        im = im.resize((max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))), Image.LANCZOS)
        where[k] = len(pics); pics.append(im)
    x = y = row = 0; spots = []
    for im in pics:
        if x + im.size[0] > 2048: x, y, row = 0, y + row + 2, 0
        spots.append((x, y)); x += im.size[0] + 2; row = max(row, im.size[1])
    atlas = Image.new('RGBA', (2048, y + row), (0, 0, 0, 0))
    for im, sp in zip(pics, spots): atlas.paste(im, sp)
    atlas.save(os.path.join(OUT, kind + '.webp'), quality=92, method=6)
    meta[kind] = {}
    for s, seq in plan(kind, set(cuts)).items():
        meta[kind][s] = []
        for p in seq:
            n = where[p]; (x, y), (w, h) = spots[n], pics[n].size
            meta[kind][s].append([x, y, w, h, round(w / 2, 1), h, kind])
    print(kind, atlas.size, {s: len(v) for s, v in meta[kind].items()})
with open(os.path.join(ROOT, 'js', 'creature_hq_meta.js'), 'w') as f:
    f.write("'use strict';\n// made by tools/sprites/cut_hq.py: detailed frames of the creatures in art/creatures/hq/<kind>.webp\n")
    f.write('const CREATURE_HQ = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
