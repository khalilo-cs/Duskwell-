#!/usr/bin/env python3
"""The creatures of js/species_meta.js have no parts area on a sheet: their pieces are cut from their own painted idle frame
(art/source/hq/<kind>_idle_a.webp), broken along jagged lines into six pieces, and added to art/creatures/shards.webp and
js/shards_meta.js like the others. A kind already there is left as it is."""
import json, os, re
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')


def main():
    sm = open(os.path.join(ROOT, 'js', 'species_meta.js')).read()
    kinds = re.findall(r'"k": "([a-z]+)"', sm)
    mp = os.path.join(ROOT, 'js', 'shards_meta.js'); src = open(mp).read()
    rects = json.loads(re.search(r'const SHARD_RECTS = (\{.*\});', src, re.S).group(1))
    atlas = Image.open(os.path.join(ROOT, 'art', 'creatures', 'shards.webp')).convert('RGBA')
    new = {}
    for kind in kinds:
        p = os.path.join(ROOT, 'art', 'source', 'hq', kind + '_idle_a.webp')
        if kind in rects or not os.path.exists(p): continue
        im = Image.open(p).convert('RGBA'); bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox(); im = im.crop(bb)
        k = min(1.0, 150 / im.height); im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32); al = a[..., 3] > 24; H, W = al.shape
        rng = np.random.default_rng(sum(map(ord, kind)))
        ys, xs = np.nonzero(al); seeds = np.stack([ys, xs], 1)[rng.choice(len(ys), 6, replace=False)]
        yy, xx = np.mgrid[0:H, 0:W]
        jit = ndi.gaussian_filter(rng.normal(0, 1, (H, W)), 3) * 14                  # the breaks run jagged, not straight
        d = np.stack([np.hypot(yy - sy, xx - sx) + jit * (i % 2 * 2 - 1) for i, (sy, sx) in enumerate(seeds)])
        lab = d.argmin(0)
        parts = []
        for i in range(len(seeds)):
            m = al & (lab == i)
            if m.sum() < 80: continue
            m = ndi.binary_erosion(m, iterations=1)                                     # a hair of a gap between the pieces
            py, px = np.nonzero(m); y0, y1, x0, x1 = py.min(), py.max() + 1, px.min(), px.max() + 1
            piece = a[y0:y1, x0:x1].copy(); piece[..., 3] *= m[y0:y1, x0:x1]
            parts.append(Image.fromarray(piece.clip(0, 255).astype(np.uint8), 'RGBA'))
        parts.sort(key=lambda q: -q.width * q.height)
        new[kind] = (H, parts)
    if not new: print('nothing new'); return
    x, y, row, spots = 0, atlas.height + 4, 0, []
    for kind, (H, parts) in new.items():
        for q in parts:
            if x + q.width > atlas.width: x, y, row = 0, y + row + 4, 0
            spots.append((kind, q, x, y)); x += q.width + 4; row = max(row, q.height)
    out = Image.new('RGBA', (atlas.width, y + row + 2), (0, 0, 0, 0)); out.paste(atlas, (0, 0))
    for kind, q, sx, sy in spots:
        out.paste(q, (sx, sy)); rects.setdefault(kind, {'ref': new[kind][0], 'parts': []})['parts'].append([sx, sy, q.width, q.height])
    out.save(os.path.join(ROOT, 'art', 'creatures', 'shards.webp'), quality=92, method=6)
    head = src[:src.index('const SHARD_RECTS')]
    open(mp, 'w').write(head + 'const SHARD_RECTS = ' + json.dumps(rects, separators=(',', ':')) + ';\n')
    print(out.size, {k: len(v[1]) for k, v in new.items()})


if __name__ == '__main__':
    main()
