#!/usr/bin/env python3
"""Cuts the set pieces of the Ossuary, the Lunar Observatory and the Mirror Vault out of the painted sheets in art/source/canva/
(flat grey ground), sorts each by how it sits in a room and packs them into art/props/canva_<theme>.webp with js/setpiece_meta.js.
SETPIECES[theme] = [[x, y, w, h, kind, srcH], ...]; kind: s on the floor, d large and behind on the floor, h hangs, w on the back wall."""
import os, sys, json, numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'canva')

def objects(path, minarea=2500, tol=26):
    im = cv2.imread(path); h, w = im.shape[:2]
    f = cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.0)
    border = np.concatenate([f[:6].reshape(-1, 3), f[-6:].reshape(-1, 3), f[:, :6].reshape(-1, 3), f[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    # the grey drifts a little across the sheet: compare against a smooth local background estimate
    d = np.linalg.norm(f - bg, axis=2)
    near = d < tol
    M = near.astype(np.float32); num = cv2.GaussianBlur(f * M[..., None], (0, 0), 40); den = cv2.GaussianBlur(M, (0, 0), 40)[..., None]
    loc = num / np.maximum(den, 1e-3); d2 = np.linalg.norm(f - loc, axis=2)
    fg = d2 > tol * 0.75
    # soft drop shadows are darker grey of low saturation: drop them
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    shadow = (hsv[..., 1] < 40) & (d2 < tol * 2.2) & (f.mean(axis=2) < loc.mean(axis=2))
    fg &= ~shadow
    fg = ndi.binary_opening(fg, iterations=1); fg = ndi.binary_closing(fg, iterations=3); fg = ndi.binary_fill_holes(fg)
    grow = ndi.binary_dilation(fg, iterations=7)                      # parts of one object close together join
    lab, n = ndi.label(grow); out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None: continue
        m = (lab[sl] == i) & fg[sl]; a = int(m.sum())
        if a < minarea: continue
        ys, xs = sl
        out.append([xs.start, ys.start, xs.stop - xs.start, ys.stop - ys.start, a])
    return im, fg, lab, out

def rng(a, b, k): return {i: k for i in range(a, b + 1)}
L = {}
def put(sheet, default, **over):
    L[sheet] = (default, {int(k[1:]): v for k, v in over.items()})
def ranges(sheet, default, pairs):
    m = {}
    for (a, b), k in pairs: m.update(rng(a, b, k))
    L[sheet] = (default, m)
ranges(1, 'x', [((0, 3), 'w'), ((4, 8), 'd'), ((9, 9), 'w'), ((10, 11), 's')])
ranges(2, 'x', [((0, 3), 'w'), ((4, 7), 'd'), ((8, 9), 's'), ((10, 10), 'w'), ((11, 11), 's')])
ranges(4, 'x', [((0, 0), 'h')])
ranges(5, 'x', [((0, 4), 'w'), ((6, 10), 'w'), ((11, 15), 'h'), ((16, 25), 'd'), ((26, 27), 's')])
ranges(6, 'd', [((6, 6), 's'), ((11, 11), 's'), ((10, 10), 'x'), ((19, 20), 'w')])
ranges(7, 'w', [((6, 6), 'h'), ((7, 8), 'd'), ((13, 14), 's')])
ranges(8, 'd', [((5, 7), 'w'), ((8, 11), 's'), ((15, 15), 'w'), ((16, 19), 's')])
ranges(9, 'd', [])
ranges(10, 's', [((2, 2), 'w')])
ranges(11, 's', [((3, 3), 'h'), ((5, 8), 'x'), ((11, 14), 'x')])
ranges(12, 's', [((4, 4), 'h'), ((5, 5), 'x'), ((7, 7), 'x'), ((10, 11), 'x')])
ranges(13, 'w', [((0, 1), 'h'), ((4, 4), 's'), ((5, 5), 'h'), ((9, 10), 'h'), ((11, 12), 'd'), ((13, 14), 's'), ((15, 15), 'x')])
ranges(17, 'w', [((6, 6), 'x'), ((7, 8), 'd'), ((28, 31), 's'), ((32, 35), 'd'), ((36, 42), 's'), ((43, 49), 'x')])
ranges(18, 'd', [((8, 13), 'w'), ((14, 14), 'x'), ((18, 22), 'w'), ((23, 23), 'x'), ((24, 30), 's')])
ranges(19, 'x', [((0, 2), 'd'), ((4, 5), 'w'), ((9, 9), 'w'), ((6, 6), 'h'), ((10, 11), 's'), ((13, 14), 's'), ((16, 16), 's'), ((18, 22), 'h'), ((23, 26), 's')])
ranges(20, 'x', [((1, 1), 's')])
ranges(23, 's', [((2, 2), 'd'), ((3, 3), 'x'), ((4, 4), 'd'), ((5, 5), 'w'), ((7, 7), 'x'), ((8, 8), 'w'), ((9, 9), 'd')])
ranges(24, 'x', [((0, 0), 's'), ((3, 3), 's'), ((11, 11), 's')])
ranges(25, 's', [((6, 6), 'x'), ((7, 7), 'd'), ((12, 12), 'd')])
ranges(26, 'x', [])
ranges(28, 'w', [((1, 2), 'x'), ((3, 4), 's'), ((6, 6), 'x'), ((7, 7), 's'), ((10, 12), 's'), ((13, 14), 'd'), ((29, 30), 'h'), ((34, 35), 's'), ((36, 36), 'd')])
ranges(29, 'w', [((2, 2), 'h'), ((8, 10), 'h')])
ranges(30, 's', [((2, 2), 'd'), ((3, 4), 'w'), ((8, 8), 'd'), ((9, 9), 'w'), ((11, 11), 'w')])
ranges(31, 's', [((4, 4), 'w'), ((5, 5), 'd'), ((9, 9), 'd'), ((10, 11), 'w')])
ranges(32, 'w', [((2, 2), 'd'), ((3, 4), 'd'), ((11, 11), 'd'), ((13, 13), 'h'), ((16, 16), 'd')])
ranges(33, 's', [((3, 3), 'd'), ((5, 6), 'x'), ((9, 9), 'x'), ((11, 11), 'x'), ((7, 7), 'w'), ((13, 13), 'd')])
ranges(39, 'd', [((1, 1), 'w'), ((3, 3), 'x'), ((6, 6), 'x'), ((7, 7), 'w'), ((10, 10), 'w')])
ranges(40, 'x', [((0, 8), 'h'), ((9, 9), 'w'), ((13, 14), 'w'), ((16, 16), 's'), ((18, 21), 'h'), ((22, 22), 'w'), ((23, 23), 'h'), ((28, 31), 's')])
ranges(41, 'x', [])
THEME = {s: 'bone' for s in (1, 2, 4, 5, 6)}
THEME.update({s: 'lunar' for s in range(7, 14)})
THEME.update({s: 'mirror' for s in range(17, 42)})
def kind(sheet, i):
    d, m = L[sheet]; return m.get(i, d)

LIMIT = {'s': 220, 'd': 300, 'h': 260, 'w': 220}            # the longest side kept in the atlas
def pieces(sheet):
    im, fg, lab, objs = objects(os.path.join(SRC, 'img%03d.webp' % sheet))
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.8); alpha = np.clip((alpha - 0.2) / 0.6, 0, 1)
    rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB); objs.sort(key=lambda o: (o[1] // 120, o[0])); out = []
    for i, (x, y, w, h, a) in enumerate(objs):
        k = kind(sheet, i)
        if k == 'x': continue
        sub = lab[y:y + h, x:x + w]; ids = np.unique(sub[sub > 0]); best = max(ids, key=lambda j: (sub == j).sum())
        m = ndi.binary_dilation((sub == best) & fg[y:y + h, x:x + w], iterations=1)
        A = (alpha[y:y + h, x:x + w] * m * 255).astype(np.uint8); ys, xs = np.where(A > 10)
        if len(xs) == 0: continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        pic = Image.fromarray(np.dstack([rgb[y:y + h, x:x + w], A])[y0:y1, x0:x1])
        s = min(1.0, LIMIT[k] / max(pic.size)); src_h = pic.size[1]
        if s < 1: pic = pic.resize((max(1, round(pic.size[0] * s)), max(1, round(pic.size[1] * s))), Image.LANCZOS)
        out.append((k, src_h, pic))
    return out

def pack(items, width=2048, pad=2):
    items = sorted(items, key=lambda it: -it[2].size[1]); x = y = row = 0; place = []
    for it in items:
        w, h = it[2].size
        if x + w > width: x, y, row = 0, y + row + pad, 0
        place.append((x, y, it)); x += w + pad; row = max(row, h)
    H = y + row; atlas = Image.new('RGBA', (width, H), (0, 0, 0, 0))
    for x, y, it in place: atlas.paste(it[2], (x, y))
    return atlas, [[x, y, it[2].size[0], it[2].size[1], it[0], it[1]] for x, y, it in place]

if __name__ == '__main__':
    by = {}
    for sheet in sorted(L): by.setdefault(THEME[sheet], []).extend(pieces(sheet))
    meta = {}
    for theme, items in by.items():
        atlas, rects = pack(items); atlas.save(os.path.join(ROOT, 'art', 'props', 'canva_%s.webp' % theme), quality=88, method=6)
        meta[theme] = rects; print(theme, len(rects), atlas.size)
    with open(os.path.join(ROOT, 'js', 'setpiece_meta.js'), 'w') as f:
        f.write("'use strict';\n// made by tools/sprites/cut_canva.py: the set pieces of three areas in art/props/canva_<theme>.webp as [x, y, w, h, kind, source height]\n")
        f.write('const SETPIECES = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
