#!/usr/bin/env python3
"""The painted interface: every sheet art/source/ui/<sheet>.png holds pieces on flat grey in rows, named in tools/paint/ui.json
({sheet: [[names of row 1, left to right], [row 2], ...]}). The rows are found from the big blobs of the picture (sorted by height
and split at the widest gaps), the pieces of a row the same way across it; every small bit (a flying shard, a fleck of a splash)
goes with the piece nearest to it. Pieces named fx_* are painted white to be tinted: they keep only their light and its alpha.
All pieces are packed into art/ui/ui.webp and listed in js/ui_meta.js as UI_RECTS[name] = [x, y, w, h]."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
LIMIT = {'default': 360, 'sw_': 520, 'bar': 1400, 'panel': 1100, 'divider': 1200, 'button': 720, 'map_': 160, 'marker': 140}


def groups(vals, n):
    """split sorted values into n groups at the n-1 widest gaps; the centre of each group"""
    v = sorted(vals)
    if n <= 1 or len(v) <= n: return [float(np.mean(v))] if n <= 1 else v
    gaps = sorted(range(1, len(v)), key=lambda k: v[k] - v[k - 1])[-(n - 1):]
    b = sorted(v[k - 1] / 2 + v[k] / 2 for k in gaps)
    out = []
    for k in range(n):
        g = [x for x in v if (k == 0 or x > b[k - 1]) and (k == n - 1 or x < b[k])]
        out.append(float(np.mean(g)))
    return out


def cut(path, rows):
    a = np.asarray(Image.open(path).convert('RGB'), np.float32); H, W = a.shape[:2]
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    grey = np.median(border, 0)
    sm = ndi.gaussian_filter(a, (1.0, 1.0, 0)); d = np.sqrt(((sm - grey) ** 2).sum(-1)); sat = sm.max(-1) - sm.min(-1)
    near = (d < 16) & (sat < 14)
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(near, lab, range(1, n + 1))
    bg = np.isin(lab, list(edge) + [i + 1 for i, s in enumerate(sizes) if s >= 0.00006 * W * H])
    fg = ndi.binary_opening(~bg, iterations=1)
    alpha = ndi.gaussian_filter(fg.astype(np.float32), 0.9)
    alpha = np.where(fg, np.maximum(alpha, 0.5), alpha * (d / 40).clip(0, 1))
    soft = np.clip(d / 95, 0, 1)                                       # for the white effects: how far from the grey, as alpha
    blobs, nb = ndi.label(ndi.binary_dilation(fg | (soft > 0.12), iterations=3))
    info = []
    for i, sl in enumerate(ndi.find_objects(blobs)):
        if sl is None: continue
        m = blobs[sl] == i + 1; s = int(m.sum())
        if s < 0.00002 * W * H: continue
        info.append([i + 1, (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, s])
    big = [x for x in info if x[3] >= 0.0004 * W * H]
    rc = groups([x[1] for x in big], len(rows))
    rowof = lambda y: int(np.argmin([abs(y - c) for c in rc]))
    out = {}
    for r, names in enumerate(rows):
        mine = [x for x in info if rowof(x[1]) == r]
        cc = groups([x[2] for x in mine if x[3] >= 0.0004 * W * H], len(names))
        for k, name in enumerate(names):
            ids = [x[0] for x in mine if int(np.argmin([abs(x[2] - c) for c in cc])) == k]
            if not ids: print('!! nothing for', name); continue
            m = np.isin(blobs, ids)
            ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            if name.startswith('fx_'):
                al = soft[y0:y1, x0:x1] * m[y0:y1, x0:x1]
                rgb = np.clip(grey + (a[y0:y1, x0:x1] - grey) / np.maximum(al, 0.08)[..., None], 0, 255)
                rgb = np.repeat(rgb.mean(-1, keepdims=True), 3, -1)          # its light only: it is tinted in the game
            else:
                al = alpha[y0:y1, x0:x1] * m[y0:y1, x0:x1]; rgb = a[y0:y1, x0:x1]
            im = Image.fromarray(np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
            bb = Image.fromarray(((al > 0.06) * 255).astype(np.uint8)).getbbox()      # only as big as what can be seen of it
            if bb: im = im.crop(bb)
            lim = next((v for k, v in LIMIT.items() if name.startswith(k)), LIMIT['panel'] if name.startswith('parch') else LIMIT['default'])
            k2 = min(1.0, lim / max(im.size)); im = im.resize((max(1, round(im.width * k2)), max(1, round(im.height * k2))), Image.LANCZOS)
            out[name] = im
    return out


def main():
    lay = json.load(open(os.path.join(HERE, 'ui.json')))
    pics = {}
    for sheet, rows in lay.items():
        p = os.path.join(ROOT, 'art', 'source', 'ui', sheet + '.png')
        if os.path.exists(p): pics.update(cut(p, rows)); print('cut', sheet)
    order = sorted(pics, key=lambda n: -pics[n].height)
    x = y = row = 0; spots = {}
    for n in order:
        im = pics[n]
        if x + im.width > 2048: x, y, row = 0, y + row + 4, 0
        spots[n] = (x, y); x += im.width + 4; row = max(row, im.height)
    atlas = Image.new('RGBA', (2048, y + row), (0, 0, 0, 0))
    for n in order: atlas.paste(pics[n], spots[n])
    os.makedirs(os.path.join(ROOT, 'art', 'ui'), exist_ok=True)
    atlas.save(os.path.join(ROOT, 'art', 'ui', 'ui.webp'), quality=92, method=6)
    bd = os.path.join(ROOT, 'art', 'ui', 'btn'); os.makedirs(bd, exist_ok=True)      # the touch buttons also as files of their own (the page's buttons use them)
    for n in pics:
        if n.startswith('btn_'): im = pics[n]; k = 192 / max(im.size); im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).save(os.path.join(bd, n[4:] + '.webp'), quality=90)
    meta = {n: [spots[n][0], spots[n][1], pics[n].width, pics[n].height] for n in sorted(pics)}
    open(os.path.join(ROOT, 'js', 'ui_meta.js'), 'w').write("'use strict';\n// made by tools/paint/ui.py: the painted pieces of the interface in art/ui/ui.webp, [x, y, w, h]\n"
                                                             "const UI_RECTS = " + json.dumps(meta, sort_keys=True) + ";\n")
    print(atlas.size, {n: v[2:] for n, v in meta.items()})


if __name__ == '__main__':
    main()
