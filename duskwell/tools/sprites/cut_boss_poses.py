#!/usr/bin/env python3
"""Cuts the assembled pose of every boss (listed in boss_poses.json) into art/bosses/poses.webp and
js/boss_poses_meta.js (BOSS_POSES: key -> [[x, y, w, h], ...], idle first). Each pose is the biggest connected piece in its
rectangle, with the background removed and the floor shadow peeled off."""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cutsheet import segment
cfg = json.load(open(os.path.join(HERE, 'boss_poses.json')))
sheets = {k: cv2.imread(os.path.join(ROOT, p)) for k, p in cfg['sheets'].items()}
out_dir = os.path.join(ROOT, 'art', 'source', 'bosses', 'poses'); os.makedirs(out_dir, exist_ok=True)

def largest(a):
    m = ndi.binary_dilation(a[..., 3] > 12, iterations=4); lab, n = ndi.label(m)
    if n <= 1: return a
    sizes = ndi.sum(a[..., 3] > 12, lab, range(1, n + 1)); keep = int(np.argmax(sizes)) + 1
    o = a.copy(); o[..., 3] = np.where(lab == keep, a[..., 3], 0); return o

pieces = {}
for key, b in cfg['bosses'].items():
    im = sheets[b['sheet']]; x0, y0, x1, y1 = b['cell']
    sub = im[y0:y1, x0:x1]
    fg = segment(sub, 22)
    hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
    shadow = (hsv[..., 1] < 36) & (hsv[..., 2] >= 90) & (hsv[..., 2] <= 175)
    for _ in range(26):                                                    # the soft floor shadow: grey, peeled in from the boundary
        e = fg & ~ndi.binary_erosion(fg); gone = e & shadow
        if not gone.any(): break
        fg &= ~gone
    fg = ndi.binary_opening(fg, iterations=1)
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.7); alpha = np.clip((alpha - 0.25) / 0.5, 0, 1)
    rgba = np.dstack([sub, (alpha * 255).astype(np.uint8)])
    ps = []
    H_, W_ = rgba.shape[:2]
    for pi_, (px0, py0, px1, py1) in enumerate(b['poses']):
        for _try in range(1):                                              # a pose cut by its box on the left or right: widen the box (inside the cell) until it ends in the open
            c = rgba[py0 - y0:py1 - y0, px0 - x0:px1 - x0].copy()
            for (cx0, cy0, cx1, cy1) in (b.get('cuts') or [[]] * 9)[pi_]:                       # parts of a neighbouring pose that reach into this box
                c[max(0, cy0 - py0):max(0, cy1 - py0), max(0, cx0 - px0):max(0, cx1 - px0), 3] = 0
            c = largest(c)
            left = (c[:, :2, 3] > 12).sum(); right = (c[:, -2:, 3] > 12).sum()
            grew = False
            if right > 14 and px1 < x1: px1 = min(x1, px1 + 14); grew = True
            if left > 14 and px0 > x0: px0 = max(x0, px0 - 14); grew = True
            if not grew: break
        c = largest(c); ys, xs = np.where(c[..., 3] > 12); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        h_ = c.shape[0]; hv = cv2.cvtColor(c[..., :3], cv2.COLOR_BGR2HSV)                    # grey smudges of the floor shadow along the bottom edge
        low = np.zeros(c.shape[:2], bool); low[int(h_ * 0.90):] = True
        c[..., 3] = np.where(low & (hv[..., 1] < 34) & (hv[..., 2] > 90) & (hv[..., 2] < 180), 0, c[..., 3])
        c = largest(c); ys, xs = np.where(c[..., 3] > 12); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        ps.append(c)
    pieces[key] = ps
    for i, c in enumerate(ps): cv2.imwrite(os.path.join(out_dir, '%s_%d.png' % (key, i)), c)
W, x, y, row, pos = 1536, 2, 2, 0, {}
flat = [(k, i, c) for k, ps in pieces.items() for i, c in enumerate(ps)]
for k, i, c in sorted(flat, key=lambda t: -t[2].shape[0]):
    h, w = c.shape[:2]
    if x + w + 2 > W: x, y, row = 2, y + row + 2, 0
    pos[(k, i)] = [x, y, w, h]; x += w + 2; row = max(row, h)
atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
for (k, i), (px, py, w, h) in pos.items(): atlas.paste(Image.fromarray(cv2.cvtColor(pieces[k][i], cv2.COLOR_BGRA2RGBA)), (px, py))
od = os.path.join(ROOT, 'art', 'bosses'); os.makedirs(od, exist_ok=True)
atlas.save(os.path.join(od, 'poses.webp'), quality=90, method=6)
meta = {k: [pos[(k, i)] for i in range(len(ps))] for k, ps in pieces.items()}
open(os.path.join(ROOT, 'js', 'boss_poses_meta.js'), 'w').write("'use strict';\n// made by tools/sprites/cut_boss_poses.py: the assembled poses of every boss in art/bosses/poses.webp as [x, y, w, h], idle first\nconst BOSS_POSES = " + json.dumps(meta, separators=(',', ':')) + ";\n")
print(atlas.size, os.path.getsize(os.path.join(od, 'poses.webp')), 'bytes', {k: len(v) for k, v in meta.items()})
# contact sheet for checking
S = Image.new('RGB', (1800, 1700), (46, 54, 70)); cx = cy = 0; rh = 0
for k, ps in pieces.items():
    for c in ps:
        im = Image.fromarray(cv2.cvtColor(c, cv2.COLOR_BGRA2RGBA)); s = min(1, 230 / im.height); im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
        if cx + im.width > 1800: cx = 0; cy += rh + 6; rh = 0
        S.paste(im, (cx, cy), im); cx += im.width + 6; rh = max(rh, im.height)
S.crop((0, 0, 1800, cy + rh)).save('/tmp/bs/poses_contact.png')
