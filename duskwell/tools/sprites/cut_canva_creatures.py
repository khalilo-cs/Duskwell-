#!/usr/bin/env python3
"""Cuts the poses of three creatures from their painted sheets in art/source/canva/ (the censer 089, the bomb imp 090, the frost
mole 092) into art/creatures/canva.webp and js/creature_canva_meta.js. CREATURE_CANVA[kind][state] = [[x, y, w, h, ax, ay, 1], ...]
with the same number of frames per state as their old rows, so the code that picks a frame does not change."""
import os, sys, json, numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_canva import objects, SRC

def masks(sheet):
    im, fg, lab, o = objects(os.path.join(SRC, 'img%03d.webp' % sheet), minarea=1)
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.8); alpha = np.clip((alpha - 0.2) / 0.6, 0, 1)
    l, n = ndi.label(ndi.binary_dilation(fg, iterations=2)); sz = ndi.sum(fg, l, range(1, n + 1))
    big = np.isin(l, [i + 1 for i, v in enumerate(sz) if v > 1500]) & fg
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB), big, alpha

def crop(rgb, m, alpha, x0, y0, x1, y1):
    mm = m[y0:y1, x0:x1]; yy, xx = np.where(mm)
    A = (alpha[y0:y1, x0:x1] * mm * 255).astype(np.uint8)
    return np.dstack([rgb[y0:y1, x0:x1], A])[yy.min():yy.max() + 1, xx.min():xx.max() + 1]

def by_gaps(sheet, bands, proj, counts):
    """poses side by side in rows: split each row at the empty columns (looked for in a band of the row)"""
    rgb, big, alpha = masks(sheet); W = big.shape[1]; out = []
    for (y0, y1), k in zip(bands, counts):
        a0, a1 = int(y0 + (y1 - y0) * proj[0]), int(y0 + (y1 - y0) * proj[1]); col = big[a0:a1].sum(axis=0) > 2
        runs, x = [], 0
        while x < W:
            if col[x]:
                s = x
                while x < W and col[x]: x += 1
                runs.append([s, x])
            x += 1
        j = []
        for r in runs:
            if j and r[0] - j[-1][1] < 10: j[-1][1] = r[1]
            else: j.append(r)
        for x0, x1 in sorted(sorted(j, key=lambda r: r[1] - r[0])[-k:]): out.append(crop(rgb, big, alpha, x0, y0, x1, y1))
    return out

def by_boxes(sheet, boxes):
    rgb, big, alpha = masks(sheet); return [crop(rgb, big, alpha, *b) for b in boxes]

censer = by_gaps(89, [(0, 944)], (0.35, 0.95), [6])
for i, f in enumerate(censer):                                         # the chain above the skull is drawn by the game
    w = (f[..., 3] > 40).sum(axis=1); top = int(np.argmax(w > w.max() * 0.45)); censer[i] = f[max(0, top - 6):]
imp = by_gaps(90, [(0, 472), (472, 887)], (0, 1), [3, 3])
mole = by_boxes(92, [(0, 90, 510, 410), (560, 110, 1120, 415), (1150, 120, 1660, 405), (0, 595, 560, 835), (580, 490, 1170, 845), (1190, 530, 1610, 850)])

# which pose plays in each state (the same counts as the old rows; see CREATURE_PARTS for how an attack row divides)
PLAN = {
    'censer': (censer, {'idle': [0, 0, 1, 1, 0, 5], 'walk': [0, 0, 1, 1, 0, 5], 'atk': [1, 2, 3, 3, 3, 2], 'hurt': [2], 'death': [2, 5, 5, 5, 5]}),
    'imp': (imp, {'idle': [0, 2], 'walk': [1, 2, 1, 0], 'atk': [0, 2, 3, 4, 0, 0], 'hurt': [5], 'death': [5, 5, 5, 5]}),
    'mole': (mole, {'idle': [0, 5], 'walk': [1, 0], 'dig': [3, 3, 4, 3], 'atk': [2, 4, 4, 5, 0], 'hurt': [2], 'death': [5, 2, 3, 3]}),
}
LIMIT = 300
pics, where = [], {}
for kind, (frames, _) in PLAN.items():
    for i, f in enumerate(frames):
        im = Image.fromarray(f); s = min(1.0, LIMIT / max(im.size))
        if s < 1: im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
        where[(kind, i)] = len(pics); pics.append(im)
x = y = row = 0; spots = []
for im in pics:
    if x + im.size[0] > 2048: x, y, row = 0, y + row + 2, 0
    spots.append((x, y)); x += im.size[0] + 2; row = max(row, im.size[1])
atlas = Image.new('RGBA', (2048, y + row), (0, 0, 0, 0))
for im, (x, y) in zip(pics, spots): atlas.paste(im, (x, y))
atlas.save(os.path.join(ROOT, 'art', 'creatures', 'canva.webp'), quality=90, method=6)
meta = {}
for kind, (frames, plan) in PLAN.items():
    meta[kind] = {}
    for state, idx in plan.items():
        rows = []
        for i in idx:
            n = where[(kind, i)]; (x, y), (w, h) = spots[n], pics[n].size
            rows.append([x, y, w, h, round(w / 2, 1), h, 1])                # the ground point: bottom middle; 1: from canva.webp
        meta[kind][state] = rows
with open(os.path.join(ROOT, 'js', 'creature_canva_meta.js'), 'w') as f:
    f.write("'use strict';\n// made by tools/sprites/cut_canva_creatures.py: new frames of three creatures in art/creatures/canva.webp\n")
    f.write('const CREATURE_CANVA = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print(atlas.size, {k: {s: len(v) for s, v in m.items()} for k, m in meta.items()})
