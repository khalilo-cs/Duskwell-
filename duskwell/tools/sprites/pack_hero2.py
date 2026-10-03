#!/usr/bin/env python3
"""Packs the hero v2 parts (art/source/hero_parts) into one atlas for the game: art/hero/hero2.webp + hero2.json.
Parts are shrunk by SCALE (they were drawn far larger than they are shown) and keep a 2px transparent margin."""
import json, os
from PIL import Image
SCALE = 0.2
USE = ['head_hooded', 'torso', 'cloak_side', 'cloak_back', 'arm_a', 'arm_b', 'thigh_a', 'shin_a', 'thigh_b', 'shin_b', 'sword', 'hand_c', 'mask']
src = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'source', 'hero_parts')
out = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'hero')
os.makedirs(out, exist_ok=True)
ims = {}
for n in USE:
    im = Image.open(os.path.join(src, n + '.png')).convert('RGBA')
    ims[n] = im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.LANCZOS)
W, x, y, row, pos = 512, 2, 2, 0, {}
for n, im in sorted(ims.items(), key=lambda k: -k[1].height):
    if x + im.width + 2 > W: x, y, row = 2, y + row + 2, 0
    pos[n] = [x, y, im.width, im.height]; x += im.width + 2; row = max(row, im.height)
H = y + row + 2
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for n, im in ims.items(): atlas.paste(im, tuple(pos[n][:2]))
atlas.save(os.path.join(out, 'hero2.webp'), quality=92, method=6)
json.dump({'scale': SCALE, 'w': W, 'h': H, 'parts': pos}, open(os.path.join(out, 'hero2.json'), 'w'), separators=(',', ':'))
js = os.path.join(os.path.dirname(__file__), '..', '..', 'js', 'hero2_meta.js')
open(js, 'w').write("'use strict';\n// made by tools/sprites/pack_hero2.py: where each part of the hero v2 sits in art/hero/hero2.webp (x, y, w, h)\nconst HERO2_META = " + json.dumps({'scale': SCALE, 'parts': pos}, separators=(',', ':')) + ";\n")
print(W, H, os.path.getsize(os.path.join(out, 'hero2.webp')), 'bytes')
