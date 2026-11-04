#!/usr/bin/env python3
"""Furnishings of the areas: every sheet art/source/decor/<themeA>_<themeB>.png holds 8 columns and 4 rows of painted pieces on
flat grey, two rows per area (hanging and small pieces, then large standing ones; names in ROWS). They are cut like the interface
pieces (tools/paint/ui.py) and packed per area into art/decor/<theme>.webp, listed in js/decor_meta.js: DECOR[theme][name] =
[x, y, w, h]."""
import glob, json, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..'); sys.path.insert(0, HERE)
import ui
ROWS = [['lantern', 'banner', 'cage', 'chandelier', 'candles', 'urn', 'rubble', 'brazier'],
        ['pillar', 'arch', 'shrine', 'fence', 'ruin', 'tomb', 'statue', 'totem']]


def main():
    meta = {}
    os.makedirs(os.path.join(ROOT, 'art', 'decor'), exist_ok=True)
    ui.LIMIT.clear(); ui.LIMIT.update({'default': 420, 'panel': 420})
    for p in sorted(glob.glob(os.path.join(ROOT, 'art', 'source', 'decor', '*_*.png'))):
        themes = os.path.basename(p)[:-4].split('_')
        rows = [[t + ':' + n for n in r] for t in themes for r in ROWS]
        pics = ui.cut(p, rows)
        for t in themes:
            mine = {k.split(':')[1]: v for k, v in pics.items() if k.startswith(t + ':')}
            x = y = row = 0; spots = {}
            for n, im in sorted(mine.items(), key=lambda kv: -kv[1].height):
                if x + im.width > 2048: x, y, row = 0, y + row + 4, 0
                spots[n] = (x, y); x += im.width + 4; row = max(row, im.height)
            atlas = Image.new('RGBA', (2048, y + row), (0, 0, 0, 0))
            for n, im in mine.items(): atlas.paste(im, spots[n])
            atlas.save(os.path.join(ROOT, 'art', 'decor', t + '.webp'), quality=90, method=6)
            meta[t] = {n: [spots[n][0], spots[n][1], mine[n].width, mine[n].height] for n in mine}
            print(t, atlas.size, len(mine))
    open(os.path.join(ROOT, 'js', 'decor_meta.js'), 'w').write("'use strict';\n// made by tools/paint/decor.py: the painted furnishings of each area in art/decor/<theme>.webp, [x, y, w, h]\n"
                                                                "const DECOR = " + json.dumps(meta, sort_keys=True) + ";\n")


if __name__ == '__main__':
    main()
