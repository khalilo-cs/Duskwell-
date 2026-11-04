#!/usr/bin/env python3
"""Terrain kits: every sheet art/source/kits/<themeA>_<themeB>[_<themeC>].png holds the painted pieces of two or three areas on flat
grey, in 3 columns and two rows per area (from the top, in the order of the name):
    breakable wall, closed gate, spikes
    ledge, cracked ledge, moving platform
Each piece is cut out of its grey ground (the grey that reaches the border, and the larger grey gaps inside it, such as between
the bars of a gate) and packed per area into art/kits/<theme>.webp; js/kits_meta.js gets KITS[theme][piece] = [x, y, w, h, top],
top being the row of the piece where one stands (for the ledges and the platform), 0 for the others."""
import glob, json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'kits'); OUT = os.path.join(ROOT, 'art', 'kits')
NAMES = [['wall', 'gate', 'spikes'], ['ledge', 'ledge_crack', 'mover']]
LIMIT = 640                                        # longest side of a piece in the atlas


def cut_sheet(path, rows):
    a = np.asarray(Image.open(path).convert('RGB'), np.float32); H, W = a.shape[:2]
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    grey = np.median(border, 0)
    sm = ndi.gaussian_filter(a, (1.2, 1.2, 0))
    d = np.sqrt(((sm - grey) ** 2).sum(-1)); sat = sm.max(-1) - sm.min(-1)
    near = (d < 18) & (sat < 14)
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(near, lab, range(1, n + 1))
    bg = np.isin(lab, list(edge) + [i + 1 for i, s in enumerate(sizes) if s >= 0.00006 * W * H])
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)
    # soft edge: the grey that is close to the ground fades out over a couple of px
    alpha = ndi.gaussian_filter(fg.astype(np.float32), 0.9)
    alpha = np.where(fg, np.maximum(alpha, 0.5), alpha * (d / 40).clip(0, 1))
    # the pieces: blobs of the figure (grown a little, so a piece's loose bits stay with it). The rows of the sheet are seldom
    # even (a row with a gate is taller than a row of ledges), so they are found from the big blobs: sorted by height on the
    # sheet and split at the widest gaps; every blob then goes to the nearest row and to the column its centre falls in
    blobs, nb = ndi.label(ndi.binary_dilation(fg, iterations=3))
    info = []
    for i, sl in enumerate(ndi.find_objects(blobs)):
        if sl is None: continue
        n = int((blobs[sl] == i + 1).sum())
        if n < 0.00002 * W * H: continue                              # a speck
        info.append((i + 1, (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, n))
    big = sorted(x for x in info if x[3] >= 0.0015 * W * H)
    ys = sorted(x[1] for x in big)
    gaps = sorted(range(1, len(ys)), key=lambda k: ys[k] - ys[k - 1])[-(rows - 1):]
    bounds = sorted(ys[k - 1] / 2 + ys[k] / 2 for k in gaps)
    centres = [np.mean([y for y in ys if (k == 0 or y > bounds[k - 1]) and (k == rows - 1 or y < bounds[k])]) for k in range(rows)]
    rowof = lambda y: int(np.argmin([abs(y - c) for c in centres]))
    cells = {}
    for r in range(rows):                                             # the columns of each row: its big blobs split at the 2 widest gaps
        mine = [x for x in info if rowof(x[1]) == r]
        xs = sorted(x[2] for x in mine if x[3] >= 0.0015 * W * H)
        if len(xs) >= 3:
            g2 = sorted(range(1, len(xs)), key=lambda k: xs[k] - xs[k - 1])[-2:]
            cb = sorted(xs[k - 1] / 2 + xs[k] / 2 for k in g2)
        else: cb = [W / 3, 2 * W / 3]
        for i, cy, cx, n in mine:
            c = sum(cx > b for b in cb)
            cells.setdefault((r, c), []).append(i)
    cells = {k: np.isin(blobs, v) for k, v in cells.items()}
    out = {}
    for (r, c), cm in cells.items():
        m = cm & (alpha > 0.02)
        ys, xs = np.where(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgb = a[y0:y1, x0:x1].copy()
        if (r % 2, c) == (0, 1):                                    # a gate: the grey seen between its bars is the dark passage behind it
            dd, ss = d[y0:y1, x0:x1], sat[y0:y1, x0:x1]
            rgb[(dd < 40) & (ss < 18)] *= 0.32
        rgba = np.dstack([rgb, (alpha[y0:y1, x0:x1] * m[y0:y1, x0:x1]) * 255])
        im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
        k = min(1.0, LIMIT / max(im.size)); im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        out[(r, c)] = im
    return out


def surface(im):
    """the first row of a piece that is mostly solid across its middle: where one stands on it"""
    al = np.asarray(im)[..., 3].astype(np.float32) / 255; w = al.shape[1]
    mid = al[:, int(w * 0.15):int(w * 0.85)].mean(1)
    rows = np.where(mid > 0.6)[0]
    return int(rows[0]) if len(rows) else 0


def main():
    os.makedirs(OUT, exist_ok=True)
    meta_path = os.path.join(ROOT, 'js', 'kits_meta.js')
    meta = {}
    for p in sorted(glob.glob(os.path.join(SRC, '*_*.png'))):
        themes = os.path.basename(p)[:-4].split('_')
        pieces = cut_sheet(p, 2 * len(themes))
        for half, theme in enumerate(themes):
            pics = {}
            for rr in range(2):
                for c in range(3):
                    im = pieces.get((half * 2 + rr, c))
                    if im is not None: pics[NAMES[rr][c]] = im
            if len(pics) < 6: print('!! missing pieces', theme, sorted(pics));
            x = y = row = 0; spots = {}
            for n, im in pics.items():
                if x + im.width > 2048: x, y, row = 0, y + row + 4, 0
                spots[n] = (x, y); x += im.width + 4; row = max(row, im.height)
            atlas = Image.new('RGBA', (2048, y + row), (0, 0, 0, 0))
            for n, im in pics.items(): atlas.paste(im, spots[n])
            atlas.save(os.path.join(OUT, theme + '.webp'), quality=90, method=6)
            meta[theme] = {n: [spots[n][0], spots[n][1], im.width, im.height, surface(im) if n in ('ledge', 'ledge_crack', 'mover') else 0] for n, im in pics.items()}
            print(theme, atlas.size, {n: v[2:] for n, v in meta[theme].items()})
    open(meta_path, 'w').write("'use strict';\n// made by tools/paint/kits.py: the painted walls, gates, spikes, ledges and platforms of each area in art/kits/<theme>.webp,\n"
                               "// [x, y, w, h, row where one stands]\nconst KITS = " + json.dumps(meta, sort_keys=True) + ";\n")


if __name__ == '__main__':
    main()
