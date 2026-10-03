#!/usr/bin/env python3
"""Cuts the creatures sheet (art/source/creatures/_sheet_creatures.png) into every separate piece (art/source/creatures/<cell>/cNN.png),
then packs the chosen poses of each creature into the game's atlas (art/creatures/creatures.webp + js/creatures_meta.js).
Poses are listed per creature in FRAMES: (cell, piece) or (cell, piece, 's') to split a merged piece at the vertical gaps between its poses.
The first pose is the idle, the second the walk/alt, the third the attack/anticipation; the rest are extra."""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'creatures')
CELLS = json.load(open(os.path.join(HERE, 'creature_cells.json')))

# creature -> poses (idle first). Facing right unless FLIP lists it.
BOXES = json.load(open(os.path.join(HERE, 'creature_boxes.json')))
FRAMES = json.load(open(os.path.join(HERE, 'creature_frames.json')))

LABEL_OVERLAP = {'moth': (170, 22)}

def segment():
    im = cv2.imread(os.path.join(SRC, '_sheet_creatures.png'), cv2.IMREAD_COLOR)
    bg = np.array([186, 186, 186], np.float32)
    dist = np.linalg.norm(im.astype(np.float32) - bg, axis=2)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    out = {}
    glob = np.zeros((im.shape[0], im.shape[1], 4), np.uint8)
    for n, (x0, y0, x1, y1) in CELLS.items():
        sub = im[y0:y1, x0:x1]; near = dist[y0:y1, x0:x1] < 22
        lab, k = ndi.label(near)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        sizes = ndi.sum(near, lab, range(1, k + 1))
        big = {i + 1 for i, v in enumerate(sizes) if v >= 60}                 # grey gaps between the legs are background too, not only the outer sheet
        fg = ~np.isin(lab, list(edge | big))
        grey = (hsv[y0:y1, x0:x1][..., 1] < 40) & (dist[y0:y1, x0:x1] < 75) & (hsv[y0:y1, x0:x1][..., 2] > 95)
        for _ in range(3):
            e = fg & ~ndi.binary_erosion(fg); fg = fg & ~(e & grey)
        # the soft cast shadows under the feet: grey, unsaturated, mid-tone, peeled in from the boundary until the dark outline stops it
        shadow = (hsv[y0:y1, x0:x1][..., 1] < 36) & (hsv[y0:y1, x0:x1][..., 2] >= 90) & (hsv[y0:y1, x0:x1][..., 2] <= 188)
        for _ in range(40):
            e = fg & ~ndi.binary_erosion(fg); gone = e & shadow
            if not gone.any(): break
            fg = fg & ~gone
        if n in LABEL_OVERLAP: fg[:LABEL_OVERLAP[n][1], :LABEL_OVERLAP[n][0]] = False        # a printed name touching the art
        fg = ndi.binary_opening(fg, iterations=1)
        holes = ndi.binary_fill_holes(fg) & ~fg; hl, hn = ndi.label(holes)
        for i, v in enumerate(ndi.sum(holes, hl, range(1, hn + 1)), 1):
            if v < 80: fg |= hl == i                                         # tiny holes (an eye, a rivet) belong to the art
        pl, pn = ndi.label(ndi.binary_dilation(fg, iterations=3))
        alpha = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.8); alpha = np.clip((alpha - 0.25) / 0.5, 0, 1)
        rgba = np.dstack([sub, (alpha * 255).astype(np.uint8)]); glob[y0:y1, x0:x1] = rgba
        comps = []
        for i, sl in enumerate(ndi.find_objects(pl), 1):
            area = int(fg[sl][pl[sl] == i].sum())
            ya, yb, xa, xb = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
            if area < 250 or (ya < 4 and yb - ya < 24 and xa < 110): continue          # specks and the printed label
            comps.append((ya // 60, xa, ya, xb, yb, i))
        comps.sort()
        pieces = []
        for j, (_, xa, ya, xb, yb, i) in enumerate(comps):
            piece = (pl[ya:yb, xa:xb] == i) & ndi.binary_dilation(fg[ya:yb, xa:xb], iterations=2)
            crop = rgba[ya:yb, xa:xb].copy(); crop[..., 3] = np.where(piece, crop[..., 3], 0)
            pieces.append(crop)
        out[n] = pieces
    out['_global'] = glob
    return out

def largest(a, keep_all=False):
    """keeps the biggest connected piece of a crop (bits of the neighbouring pose inside the box are dropped)"""
    m = ndi.binary_dilation(a[..., 3] > 12, iterations=3); lab, n = ndi.label(m)
    if n <= 1: return a
    sizes = ndi.sum(a[..., 3] > 12, lab, range(1, n + 1))
    keep = [i + 1 for i, v in enumerate(sizes) if (keep_all and v > 0.06 * sizes.max()) or v == sizes.max()]
    out = a.copy(); out[..., 3] = np.where(np.isin(lab, keep), a[..., 3], 0); return out

def trim(a):
    ys, xs = np.where(a[..., 3] > 12)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def split_gaps(a, min_gap=3, min_w=40):
    cols = (a[..., 3] > 12).any(axis=0); parts, start = [], None
    gap = 0
    for x, v in enumerate(cols):
        if v:
            if start is None: start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                parts.append((start, x - gap + 1)); start = None
    if start is not None: parts.append((start, len(cols)))
    outs = [trim(a[:, s:e]) for s, e in parts if e - s >= min_w and (a[:, s:e, 3] > 12).sum() > 600]
    return outs

def main():
    pieces = segment(); glob = pieces.pop('_global')
    for n, ps in pieces.items():
        d = os.path.join(SRC, n); os.makedirs(d, exist_ok=True)
        for j, c in enumerate(ps): cv2.imwrite(os.path.join(d, 'c%02d.png' % j), c)
    sel = {}
    for kind, items in FRAMES.items():
        fr = []
        for it in items:
            if it[0] == 'rect':
                x0, y0, x1, y1 = it[1:5]; fr.append(trim(largest(glob[y0:y1, x0:x1]))); continue
            cell, idx = it[0], it[1]
            _, bx, by, bw, bh, _ = BOXES[cell][idx]                                    # the piece's box on the sheet
            a = largest(glob[by:by + bh, bx:bx + bw], keep_all=len(it) > 2 and it[2] == 's')
            if len(it) > 2 and it[2] == 's': fr += [f for f in split_gaps(a)]
            else: fr.append(trim(a))
        sel[kind] = fr
    # pack
    W, x, y, row, pos = 1024, 2, 2, 0, {}
    flat = [(kind, i, f) for kind, fr in sel.items() for i, f in enumerate(fr)]
    for kind, i, f in sorted(flat, key=lambda t: -t[2].shape[0]):
        h, w = f.shape[:2]
        if x + w + 2 > W: x, y, row = 2, y + row + 2, 0
        pos[(kind, i)] = [x, y, w, h]; x += w + 2; row = max(row, h)
    H = y + row + 2
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (kind, i), (px, py, w, h) in pos.items():
        f = sel[kind][i]; atlas.paste(Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGRA2RGBA)), (px, py))
    od = os.path.join(ROOT, 'art', 'creatures'); os.makedirs(od, exist_ok=True)
    atlas.save(os.path.join(od, 'creatures.webp'), quality=90, method=6)
    meta = {k: [pos[(k, i)] for i in range(len(v))] for k, v in sel.items()}
    open(os.path.join(ROOT, 'js', 'creatures_meta.js'), 'w').write("'use strict';\n// made by tools/sprites/cut_creatures.py: the poses of every creature in art/creatures/creatures.webp as [x, y, w, h], idle first\nconst CREATURE_FRAMES = " + json.dumps(meta, separators=(',', ':')) + ";\n")
    print(W, H, os.path.getsize(os.path.join(od, 'creatures.webp')), 'bytes;', {k: len(v) for k, v in sel.items()})

main()
