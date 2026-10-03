#!/usr/bin/env python3
"""Cuts one boss's parts from its part sheet into art/source/bosses/<key>_parts/*.png and packs them into the game's atlas
(art/bosses/<key>.webp) plus js/boss_meta_<key>.js (BOSS_PARTS.<key> = { part: [x, y, w, h] }).
usage: cut_boss.py tools/sprites/boss_<key>.json"""
import json, os, sys
import cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutsheet import cut_boxes
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
cfg = json.load(open(sys.argv[1])); key = cfg['key']
im = cv2.imread(os.path.join(ROOT, cfg['sheet']))
x0, y0, x1, y1 = cfg['crop']
parts_dir = os.path.join(ROOT, 'art', 'source', 'bosses', key + '_parts')
found = cut_boxes(im[y0:y1, x0:x1], {k: tuple(v) for k, v in cfg['boxes'].items()}, parts_dir, seeds=cfg.get('seeds'))
ims = {n: Image.open(os.path.join(parts_dir, n + '.png')).convert('RGBA') for n in found}
W, x, y, row, pos = 1024, 2, 2, 0, {}
for n, p in sorted(ims.items(), key=lambda k: -k[1].height):
    if x + p.width + 2 > W: x, y, row = 2, y + row + 2, 0
    pos[n] = [x, y, p.width, p.height]; x += p.width + 2; row = max(row, p.height)
H = y + row + 2
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for n, p in ims.items(): atlas.paste(p, tuple(pos[n][:2]))
od = os.path.join(ROOT, 'art', 'bosses'); os.makedirs(od, exist_ok=True)
atlas.save(os.path.join(od, key + '.webp'), quality=92, method=6)
open(os.path.join(ROOT, 'js', 'boss_meta_' + key + '.js'), 'w').write("'use strict';\n// made by tools/sprites/cut_boss.py: where each part of the " + key + " sits in art/bosses/" + key + ".webp as [x, y, w, h]\nvar BOSS_PARTS = typeof BOSS_PARTS === 'undefined' ? {} : BOSS_PARTS;\nBOSS_PARTS." + key + " = " + json.dumps(pos, separators=(',', ':')) + ";\n")
print(key, W, H, os.path.getsize(os.path.join(od, key + '.webp')), 'bytes', len(pos), 'parts')
