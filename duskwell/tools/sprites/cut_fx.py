#!/usr/bin/env python3
"""Cuts the owner's nail-art effect strips (art/source/effects/strips_moon_rend_dash_nova_dive_comet.png: Moon Rend, Dusk Rush, Soul Nova,
the dive burst, the comet trail; each a row of frames on a flat grey) into art/fx/fx.webp + js/fx_meta.js (FX_FRAMES: name -> [[x, y, w, h], ...]).
Frame borders are the valleys between the frames' light mass (fx_cuts.json). Transparency comes from the difference to the local
background, and the colour is un-premultiplied so a glow does not carry a grey halo."""
import json, os
import numpy as np, cv2
from scipy.signal import find_peaks
from scipy.ndimage import gaussian_filter1d
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
im = cv2.imread(os.path.join(ROOT, 'art', 'source', 'effects', 'strips_moon_rend_dash_nova_dive_comet.png')).astype(np.float32)
cuts = json.load(open(os.path.join(HERE, 'fx_cuts.json')))
bg0 = np.median(im.reshape(-1, 3)[::50], axis=0)
d0 = np.linalg.norm(im - bg0, axis=2); m0 = (d0 < 14).astype(np.float32)
bgl = cv2.GaussianBlur(im * m0[..., None], (0, 0), 30) / np.maximum(cv2.GaussianBlur(m0, (0, 0), 30)[..., None], 1e-3)
a = np.clip((np.linalg.norm(im - bgl, axis=2) - 9) / 55, 0, 1)
frames = {}
for k, r in cuts.items():
    y0, y1 = r['y']; cs = r['cuts']; fr = []
    for i in range(len(cs) - 1):
        x0, x1 = max(0, cs[i]), cs[i + 1]
        aa = a[y0:y1, x0:x1]; c = im[y0:y1, x0:x1]
        ys, xs = np.where(aa > 0.12)
        if len(ys) < 20: continue
        aa = aa[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        al = np.clip(aa, 0.001, 1)[..., None]
        col = np.clip((c - (1 - al) * bg0) / al, 0, 255)
        fr.append(np.dstack([col[..., ::-1], aa * 255]).astype(np.uint8))             # RGBA
    frames[k] = fr
W, x, y, row, pos = 2048, 2, 2, 0, {}
flat = [(k, i, f) for k, fr in frames.items() for i, f in enumerate(fr)]
for k, i, f in flat:
    h, w = f.shape[:2]
    if x + w + 2 > W: x, y, row = 2, y + row + 2, 0
    pos[(k, i)] = [x, y, w, h]; x += w + 2; row = max(row, h)
atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
for (k, i), (px, py, w, h) in pos.items(): atlas.paste(Image.fromarray(frames[k][i], 'RGBA'), (px, py))
od = os.path.join(ROOT, 'art', 'fx'); os.makedirs(od, exist_ok=True)
atlas.save(os.path.join(od, 'fx.webp'), quality=92, method=6)
meta = {k: [pos[(k, i)] for i in range(len(fr))] for k, fr in frames.items()}
open(os.path.join(ROOT, 'js', 'fx_meta.js'), 'w').write("'use strict';\n// made by tools/sprites/cut_fx.py: the frames of the nail-art effects in art/fx/fx.webp as [x, y, w, h]\nconst FX_FRAMES = " + json.dumps(meta, separators=(',', ':')) + ";\n")
print(atlas.size, os.path.getsize(os.path.join(od, 'fx.webp')), 'bytes', {k: len(v) for k, v in meta.items()})
