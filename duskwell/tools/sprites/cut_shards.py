#!/usr/bin/env python3
"""Cuts the loose parts of every creature of the states sheet (the "Parts" area at the top of each panel) into one atlas,
art/creatures/shards.webp, with js/shards_meta.js. A creature falls to pieces on death, and the pieces are these.
In every panel the top area holds the whole creature drawn large and then its parts; the whole picture is left out (it is
only used as the size to scale the parts by). Per creature: ref = height of the whole picture, parts = [x, y, w, h] in the
atlas, biggest first.
usage: cut_shards.py [--preview]"""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cutsheet import segment
from cut_world import background

SHEET = os.path.join(ROOT, 'art', 'source', 'creatures', '_sheet_creatures2_states.png')
# panel boxes [x0, x1] by row [y0, y1]; the parts are in the top part of each panel, under its title bar
ROWS = [(0, 192), (197, 400), (405, 598), (600, 805), (810, 1024)]
PANELS = [
    [('husk', 3, 290), ('crawler', 295, 560), ('flyer', 565, 797), ('hopper', 802, 1052), ('spitter', 1057, 1308), ('shard', 1313, 1536)],
    [('sentinel', 3, 285), ('diver', 290, 562), ('spider', 567, 795), ('shroom', 800, 1060), ('jelly', 1065, 1308), ('warden', 1313, 1536)],
    [('ram', 3, 278), ('mole', 283, 515), ('lavaworm', 520, 803), ('imp', 808, 1052), ('veil', 1057, 1308), ('roller', 1313, 1536)],
    [('slime', 3, 222), ('chainman', 227, 427), ('moth', 432, 655), ('icicle', 660, 855), ('heap', 860, 1120), ('skullbat', 1125, 1536)],
    [('censer', 3, 215), ('lensling', 220, 415), ('orrery', 420, 652), ('lunarhare', 657, 885)],
]
TOP, BOTTOM = 22, 0.6          # the parts lie between the title bar and this share of the panel's height
MIN_AREA, MAX_PARTS, WHOLE_AREA = 260, 9, 2400      # a piece bigger than WHOLE_AREA is a whole picture, not a part

def pieces(im, x0, x1, y0, y1):
    sub = im[y0:y1, x0:x1]
    fg = segment(sub, 22)
    hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV); grey = (hsv[..., 1] < 40) & (hsv[..., 2] > 115) & (hsv[..., 2] < 235)
    for _ in range(3): fg = fg & ~((fg & ~ndi.binary_erosion(fg)) & grey)          # the grey fringe of the sheet's ground
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.7); alpha = np.clip((alpha - 0.25) / 0.5, 0, 1)
    rgba = np.dstack([sub, (alpha * 255).astype(np.uint8)])
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=2))
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = (lab[sl] == i) & fg[sl]
        area = int(m.sum())
        if area < MIN_AREA: continue
        h, w = m.shape
        if h < 12 or w < 8: continue                      # the labels ("Parts") are small and flat
        crop = rgba[sl].copy(); crop[..., 3] = np.where(ndi.binary_dilation(m, iterations=1), crop[..., 3], 0)
        out.append({'img': crop, 'area': area, 'x': sl[1].start + x0, 'y': sl[0].start + y0, 'w': w, 'h': h})
    return out

# where each creature's effect picture stands on the sheet (x from, x to; the panel's bottom row, above its label). Crawler, roller and
# skull bat have none, and the lunar hare's leap is only a swirl round its frames
FX_X = {'husk': (226, 288), 'flyer': (742, 794), 'hopper': (990, 1046), 'spitter': (1180, 1302), 'shard': (1456, 1526), 'sentinel': (218, 282),
        'diver': (510, 560), 'spider': (738, 795), 'shroom': (980, 1058), 'jelly': (1262, 1308), 'warden': (1480, 1531), 'ram': (203, 276),
        'mole': (476, 514), 'lavaworm': (722, 800), 'imp': (973, 1048), 'veil': (1238, 1304), 'slime': (124, 172), 'chainman': (365, 418),
        'moth': (603, 650), 'icicle': (783, 853), 'heap': (1060, 1120), 'censer': (163, 214), 'lensling': (365, 411), 'orrery': (585, 640)}

def effect(im, bgall, kind, ya, yb):
    # the effect picture of a creature, glow cut softly from the grey board; the label (a line of text) and specks are left out
    xa, xb = FX_X[kind]; h = yb - ya; y0 = ya + int(0.63 * h); y1 = yb - 16
    f = im[y0:y1, xa:xb].astype(np.float32); bg = bgall[y0:y1, xa:xb]
    d = np.linalg.norm(f - bg, axis=2); a = np.clip((d - 10) / 40, 0, 1)
    lab, n = ndi.label(ndi.binary_dilation(a > 0.15, iterations=2))
    keep = np.zeros(a.shape, bool)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == i; ar = int((a[sl][m] > 0.3).sum()); ch = sl[0].stop - sl[0].start; cw = sl[1].stop - sl[1].start
        if ar < 50 or (ch < 18 and cw > 1.6 * ch and ar < 700): continue
        keep[sl] |= m
    a = np.where(keep, a, 0)
    rows = (a > 0.45).sum(axis=1) >= 2; runs = []; r0 = None                     # a label above the picture is a short band of rows with a gap under it
    for y in range(len(rows) + 1):
        on = y < len(rows) and rows[y]
        if on and r0 is None: r0 = y
        if not on and r0 is not None: runs.append((r0, y)); r0 = None
    if len(runs) >= 2 and runs[0][1] - runs[0][0] <= 16 and runs[1][0] - runs[0][1] >= 1: a[:runs[1][0]] = 0
    ys, xs = np.nonzero(a > 0.1)
    if len(xs) < 150: return None
    ya_, yb_, xa_, xb_ = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    col = np.clip((f - bg * (1 - a[..., None])) / np.maximum(a, 1e-3)[..., None], 0, 255)[ya_:yb_, xa_:xb_]
    rgba = np.dstack([col, a[ya_:yb_, xa_:xb_] * 255]).clip(0, 255).astype(np.uint8)
    return {'img': rgba, 'area': int((a > 0.3).sum()), 'x': xa_ + xa, 'y': ya_ + y0, 'w': xb_ - xa_, 'h': yb_ - ya_}

def crack(p, n, kind):
    # n jagged pieces of a picture: every opaque pixel goes to the nearest of n seeds
    img = p['img']; a = img[..., 3] > 40; ys, xs = np.nonzero(a)
    if len(xs) < 400: return []
    rng = np.random.RandomState(sum(map(ord, kind)))
    pick = rng.choice(len(xs), n, replace=False); sx, sy = xs[pick], ys[pick]
    d = (xs[:, None] - sx[None]) ** 2 + (ys[:, None] - sy[None]) ** 2; own = d.argmin(1)
    out = []
    for i in range(n):
        m = np.zeros(a.shape, bool); m[ys[own == i], xs[own == i]] = True
        if m.sum() < 220: continue
        yy, xx = np.nonzero(m); y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
        crop = img[y0:y1, x0:x1].copy(); crop[..., 3] = np.where(m[y0:y1, x0:x1], crop[..., 3], 0)
        out.append({'img': crop, 'area': int(m.sum()), 'x': p['x'] + x0, 'y': p['y'] + y0, 'w': x1 - x0, 'h': y1 - y0})
    return out

def main():
    im = cv2.imread(SHEET, cv2.IMREAD_COLOR)
    kinds, atlas_items = {}, []
    bgall = background(im)
    for (ya, yb), row in zip(ROWS, PANELS):
        for kind, xa, xb in row:
            top, bot = ya + TOP, ya + int((yb - ya) * BOTTOM)
            ps = pieces(im, xa + 2, xb - 2, top, bot)
            if not ps: print('no pieces', kind); continue
            ps.sort(key=lambda p: -p['area'])
            # the whole creature drawn large (one or two of them) is not a part; what is left are the parts
            wholes = [p for p in ps if p['area'] > WHOLE_AREA][:2]
            parts = [p for p in ps if all(p is not w for w in wholes)]
            # a creature with few loose parts also breaks along jagged lines through its whole picture
            src = wholes[0] if wholes else ps[0]
            if len(parts) < 4 and src['area'] > 900: parts += crack(src, 5 - len(parts), kind)
            parts = sorted(parts, key=lambda p: -p['area'])[:MAX_PARTS]
            kinds[kind] = {'ref': int(round(0.5 * (yb - ya))), 'parts': parts, 'fx': effect(im, bgall, kind, ya, yb) if kind in FX_X else None}
            print('%-9s wholes=%d parts=%d' % (kind, len(wholes), len(parts)))
    # shelf-pack all pieces into one atlas
    items = [(k, j, p) for k, v in kinds.items() for j, p in enumerate(v['parts'])] + [(k, -1, v['fx']) for k, v in kinds.items() if v['fx']]
    items.sort(key=lambda t: -t[2]['h'])
    W = 1024; x = y = row_h = 0; PAD = 2; place = {}
    for k, j, p in items:
        if x + p['w'] + PAD > W: x = 0; y += row_h + PAD; row_h = 0
        place[(k, j)] = (x, y); x += p['w'] + PAD; row_h = max(row_h, p['h'])
    H = y + row_h + PAD
    atlas = np.zeros((H, W, 4), np.uint8)
    meta = {}
    for k, v in kinds.items():
        rs = []
        for j, p in enumerate(v['parts']):
            ax, ay = place[(k, j)]; atlas[ay:ay + p['h'], ax:ax + p['w']] = p['img']; rs.append([int(ax), int(ay), int(p['w']), int(p['h'])])
        meta[k] = {'ref': v['ref'], 'parts': rs}
        if v['fx']:
            ax, ay = place[(k, -1)]; fx = v['fx']; atlas[ay:ay + fx['h'], ax:ax + fx['w']] = fx['img']; meta[k]['fx'] = [int(ax), int(ay), int(fx['w']), int(fx['h'])]
    out = os.path.join(ROOT, 'art', 'creatures'); os.makedirs(out, exist_ok=True)
    from PIL import Image
    Image.fromarray(cv2.cvtColor(atlas, cv2.COLOR_BGRA2RGBA)).save(os.path.join(out, 'shards.webp'), 'WEBP', quality=88, method=6)
    with open(os.path.join(ROOT, 'js', 'shards_meta.js'), 'w') as f:
        f.write("'use strict';\n// the loose parts of each creature, cut by tools/sprites/cut_shards.py: ref is the height of the whole picture, parts are [x, y, w, h] in art/creatures/shards.webp\n")
        f.write('const SHARD_RECTS = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
    print('atlas', atlas.shape, 'creatures', len(meta), 'pieces', len(items))
    if '--preview' in sys.argv:
        prev = np.full((H, W, 3), 90, np.uint8); a = atlas[..., 3:4] / 255.0
        prev = (atlas[..., :3] * a + prev * (1 - a)).astype(np.uint8)
        cv2.imwrite(os.path.join('/tmp', 'shards_preview.png'), prev)

if __name__ == '__main__':
    main()
