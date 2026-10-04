#!/usr/bin/env python3
"""Cuts the projectile and explosion sheet (art/source/fx_hd/sheet_projectiles.png, 8 rows of 8 frames) into
art/fx/proj.webp and js/proj_meta.js. Rows: ice, rock, void, acid, fire, bolt, bone, meteor.
The sheet is a grey board, so the frames are cut softly (opacity = distance from the grey, colour un-mixed from it) and the
columns are divided at the valleys between frames."""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage as ndi
from scipy.ndimage import gaussian_filter1d
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_world import background
SRC = os.path.join(ROOT, 'art', 'source', 'fx_hd', 'sheet_projectiles.png')
PACK = 0.5
ROWS = ['ice', 'rock', 'void', 'acid', 'fire', 'bolt', 'bone', 'meteor']
SEPS = [0, 102, 243, 380, 483, 619, 756, 846, 1024]
CUTS = {                      # the valleys between the eight frames of each row (sheet x)
    'ice': [159, 324, 517, 726, 942, 1141, 1324], 'rock': [154, 319, 507, 724, 938, 1132, 1326],
    'void': [146, 312, 500, 733, 973, 1169, 1341], 'acid': [144, 313, 503, 712, 916, 1109, 1319],
    'fire': [138, 290, 471, 680, 947, 1156, 1337], 'bolt': [152, 306, 502, 715, 937, 1147, 1333],
    'bone': [172, 361, 552, 761, 968, 1179, 1379], 'meteor': [152, 334, 520, 716, 914, 1137, 1338],
}
# where each frame sits on its projectile: 'tip' (the right end, at the middle of its height), 'bottom' (on the ground under it),
# 'mass' (the centre of what is solid), or a point on the sheet for the frames where the solid is a flame around a ball
ANCHOR = {'ice': 'tip', 'rock': 'bottom', 'void': 'mass', 'acid': 'bottom', 'fire': 'mass', 'bolt': 'bolt', 'bone': 'mass', 'meteor': 'mass'}
POINT = {'fire': {0: (88, 563), 1: (240, 563), 2: (410, 560), 3: (610, 560)}, 'meteor': {0: (132, 930), 1: (310, 945), 2: (470, 963), 3: (655, 965)}}

def main():
    im = cv2.imread(SRC); bg = background(im).astype(np.float32); f = im.astype(np.float32)
    d = np.linalg.norm(f - bg, axis=2)
    alpha = np.clip((d - 8) / 42, 0, 1)
    unmix = np.clip((f - bg * (1 - alpha[..., None])) / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    pieces, out_dir = {}, os.path.join(ROOT, 'art', 'source', 'fx_hd', 'proj'); os.makedirs(out_dir, exist_ok=True)
    for r, name in enumerate(ROWS):
        y0, y1 = SEPS[r], SEPS[r + 1]; cs = [0] + CUTS[name] + [im.shape[1]]
        for i in range(8):
            x0, x1 = cs[i], cs[i + 1]
            a = alpha[y0:y1, x0:x1].copy()
            lab, n = ndi.label(a > 0.12)                                   # specks of noise in the board are dropped
            if n:
                sizes = ndi.sum(a > 0.12, lab, range(1, n + 1)); keep = np.isin(lab, [k + 1 for k, v in enumerate(sizes) if v >= 14])
                a = np.where(ndi.binary_dilation(keep, iterations=2), a, 0)
            ys, xs = np.where(a > 0.08)
            ya, yb, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            col = unmix[y0:y1, x0:x1][ya:yb, xa:xb]; al = a[ya:yb, xa:xb]                    # (the picture is read as blue, green, red)
            rgba = np.dstack([col[..., ::-1], al * 255]).clip(0, 255).astype(np.uint8)
            solid = al > 0.6
            mode = ANCHOR[name]
            if i in POINT.get(name, {}):
                px, py = POINT[name][i]; ax, ay = px - x0 - xa, py - y0 - ya
            elif mode == 'tip':
                yy, xx = np.where(solid); ax = float(xx.max()); ay = float(np.median(yy[xx > xx.max() - 8]))
            elif mode == 'bottom':
                yy, xx = np.where(solid); ay = float(yy.max()); ax = float(np.median(xx[yy > yy.max() - 10]))
            elif mode == 'bolt':
                bright = (col.min(axis=2) > 205) & (al > 0.5); cols = bright.sum(axis=0)
                yy, xx = np.where(solid); ay = float(yy.max()); ax = float(np.argmax(gaussian_filter1d(cols.astype(float), 2)))
            else:
                yy, xx = np.where(solid if solid.sum() > 30 else al > 0.2); ax = float(xx.mean()); ay = float(yy.mean())
            Image.fromarray(rgba, 'RGBA').save(os.path.join(out_dir, '%s_%d.png' % (name, i)))
            h, w = rgba.shape[:2]; sz = (max(1, round(w * PACK)), max(1, round(h * PACK)))
            small = cv2.resize(rgba, sz, interpolation=cv2.INTER_AREA)
            pieces[(name, i)] = (small, ax * PACK, ay * PACK)
    W, x, y, row, pos = 2048, 2, 2, 0, {}
    for key, (small, ax, ay) in sorted(pieces.items(), key=lambda k: -k[1][0].shape[0]):
        h, w = small.shape[:2]
        if x + w + 2 > W: x, y, row = 2, y + row + 2, 0
        pos[key] = [x, y, w, h, round(ax, 1), round(ay, 1)]; x += w + 2; row = max(row, h)
    atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
    for key, (small, ax, ay) in pieces.items(): atlas.paste(Image.fromarray(small, 'RGBA'), tuple(pos[key][:2]))
    od = os.path.join(ROOT, 'art', 'fx'); os.makedirs(od, exist_ok=True)
    atlas.save(os.path.join(od, 'proj.webp'), quality=90, method=6)
    meta = {name: [pos[(name, i)] for i in range(8)] for name in ROWS}
    open(os.path.join(ROOT, 'js', 'proj_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_projectiles.py: the projectile and explosion frames in art/fx/proj.webp\n"
        "// [x, y, w, h, ax, ay]: (ax, ay) is the point that sits on the projectile or on the impact\nconst PROJ_FRAMES = " + json.dumps(meta, separators=(',', ':')) + ";\n")
    print(atlas.size, os.path.getsize(os.path.join(od, 'proj.webp')), 'bytes')

if __name__ == '__main__':
    main()
