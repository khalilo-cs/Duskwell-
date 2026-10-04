#!/usr/bin/env python3
"""Cuts the crystal tile sheet (art/source/tiles_hd/sheet_crystal_tiles.png) into art/tiles/crystal.webp and
js/tiles_meta.js (CRYSTAL_TILES: name -> [x, y, w, h]). Pieces: 4 rock fills (cropped inside their border), 3 floor slabs,
2 walls, 3 ceilings, 4 corners, 3 slopes, 3 ledges, 2 rows of spikes and 6 scenery pieces."""
import json, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_world import background, cut
SRC = os.path.join(ROOT, 'art', 'source', 'tiles_hd', 'sheet_crystal_tiles.png')
PACK = 0.5
INSET = 13                                  # fills: how much of the border (sheet px) is left out
PIECES = {
    'fill_0': (28, 12, 194, 180), 'fill_1': (218, 12, 388, 180), 'fill_2': (410, 12, 580, 180), 'fill_3': (1334, 572, 1510, 708),
    'floor_l': (604, 8, 896, 180), 'floor_m': (904, 52, 1196, 180), 'floor_r': (1198, 8, 1510, 180),
    'wall_l': (26, 192, 208, 370), 'wall_r': (352, 192, 540, 370),
    'ceil_l': (580, 192, 868, 370), 'ceil_m': (886, 192, 1168, 370), 'ceil_r': (1206, 192, 1496, 370),
    'corner_0': (26, 382, 214, 566), 'corner_1': (230, 382, 414, 566), 'corner_2': (422, 382, 608, 566), 'corner_3': (622, 382, 808, 566),
    'slope_a': (832, 382, 1036, 566), 'slope_b': (1062, 382, 1300, 566), 'slope_c': (1322, 382, 1510, 566),
    'ledge_0': (26, 588, 266, 706), 'ledge_1': (284, 588, 526, 706), 'ledge_2': (538, 588, 802, 706),
    'spikes_crystal': (810, 586, 1056, 706), 'spikes_skull': (1060, 586, 1306, 706),
    'prop_altar': (34, 780, 190, 990), 'prop_crystal': (190, 796, 322, 980), 'prop_arch_a': (368, 730, 596, 980), 'prop_arch_b': (622, 760, 796, 980),
    'prop_hall': (812, 722, 1210, 990), 'prop_pillar': (1226, 730, 1510, 990),
}

def main():
    img = cv2.imread(SRC); bg = background(img)
    out_dir = os.path.join(ROOT, 'art', 'source', 'tiles_hd', 'cut'); os.makedirs(out_dir, exist_ok=True)
    pieces, origin = {}, {}
    for name, box in PIECES.items():
        p, org = cut(name, 'tiles', box, {'pocket': 12, 'holefill': 0} if name.split('_')[0] in ('floor', 'wall', 'ceil', 'corner', 'slope', 'ledge') else {}, img, bg)   # (small pockets of the board between stalactites are cut out too; the glowing scenery keeps its lit insides)
        if name.startswith('fill_'):
            p = p.crop((INSET, INSET, p.width - INSET, p.height - INSET)); org = (org[0] + INSET, org[1] + INSET)
            p = p.convert('RGB').convert('RGBA')                                       # (opaque)
        p.save(os.path.join(out_dir, name + '.png')); origin[name] = org
        pieces[name] = p.resize((max(1, round(p.width * PACK)), max(1, round(p.height * PACK))), Image.LANCZOS)
        print('%-15s %4dx%-4d' % (name, p.width, p.height))
    W, x, y, row, pos = 2048, 2, 2, 0, {}
    for n, p in sorted(pieces.items(), key=lambda k: -k[1].height):
        if x + p.width + 2 > W: x, y, row = 2, y + row + 2, 0
        pos[n] = [x, y, p.width, p.height]; x += p.width + 2; row = max(row, p.height)
    atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
    for n, p in pieces.items(): atlas.paste(p, tuple(pos[n][:2]))
    od = os.path.join(ROOT, 'art', 'tiles'); os.makedirs(od, exist_ok=True)
    atlas.save(os.path.join(od, 'crystal.webp'), quality=90, method=6)
    meta = {n: pos[n] for n in sorted(pos)}
    open(os.path.join(ROOT, 'js', 'tiles_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_tiles.py: the crystal tile pieces in art/tiles/crystal.webp\n"
        "// [x, y, w, h], drawn at " + str(PACK) + " of their size on the sheet; CRYSTAL_ORIGIN: where each piece's corner was on the sheet\n"
        "const CRYSTAL_PACK = " + str(PACK) + ";\nconst CRYSTAL_TILES = " + json.dumps(meta, separators=(',', ':')) + ";\nconst CRYSTAL_ORIGIN = " + json.dumps({n: origin[n] for n in sorted(origin)}, separators=(',', ':')) + ";\n")
    print(len(pos), 'pieces', atlas.size, os.path.getsize(os.path.join(od, 'crystal.webp')), 'bytes')

if __name__ == '__main__':
    main()
