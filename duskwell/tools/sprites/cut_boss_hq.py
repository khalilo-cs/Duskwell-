#!/usr/bin/env python3
"""Cuts the detailed boss poses in art/source/hq/<boss>_<pose>.webp (one figure on flat grey, 1824x1024; poses idle, windup, strike,
atk2, hurt, death) into one sheet per boss, art/bosses/hq/<boss>.webp, and js/boss_hq_meta.js:
BOSS_HQ[boss] = [[x, y, w, h, boss] for idle, windup, strike, atk2, hurt, death]. Every pose keeps the body size of the idle pose."""
import os, sys, json, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_hq import cut, SRC
OUT = os.path.join(ROOT, 'art', 'bosses', 'hq')
POSES = ['idle', 'windup', 'strike', 'atk2', 'hurt', 'death']
LIMIT = 520
meta = {}
for p in sorted(glob.glob(os.path.join(SRC, '*_windup.webp'))):
    boss = os.path.basename(p)[:-len('_windup.webp')]
    if not all(os.path.exists(os.path.join(SRC, '%s_%s.webp' % (boss, q))) for q in POSES): continue
    cuts = [cut(os.path.join(SRC, '%s_%s.webp' % (boss, q))) for q in POSES]
    ref_im, ref_area = cuts[0]; s0 = min(1.0, LIMIT / max(ref_im.size))
    pics = []
    for im, area in cuts:
        s = s0 * min(1.5, max(0.65, (ref_area / max(area, 1)) ** 0.5))
        pics.append(im.resize((max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))), Image.LANCZOS))
    x = y = row = 0; spots = []
    for im in pics:
        if x + im.size[0] > 2048: x, y, row = 0, y + row + 2, 0
        spots.append((x, y)); x += im.size[0] + 2; row = max(row, im.size[1])
    atlas = Image.new('RGBA', (2048, y + row), (0, 0, 0, 0))
    for im, sp in zip(pics, spots): atlas.paste(im, sp)
    atlas.save(os.path.join(OUT, boss + '.webp'), quality=92, method=6)
    meta[boss] = [[sp[0], sp[1], im.size[0], im.size[1], boss] for im, sp in zip(pics, spots)]
    print(boss, atlas.size)
with open(os.path.join(ROOT, 'js', 'boss_hq_meta.js'), 'w') as f:
    f.write("'use strict';\n// made by tools/sprites/cut_boss_hq.py: detailed boss poses in art/bosses/hq/<boss>.webp (idle, windup, strike, atk2, hurt, death)\n")
    f.write('const BOSS_HQ = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
