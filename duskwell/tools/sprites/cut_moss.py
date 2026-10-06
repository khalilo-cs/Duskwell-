#!/usr/bin/env python3
"""Cuts the mossy stone tile sheet (art/source/tiles_hd/sheet_moss_tiles.png) into art/tiles/moss.webp and js/moss_meta.js
(MOSS_TILES: name -> [x, y, w, h], MOSS_ORIGIN: where each piece's corner was on the sheet). Everything on the sheet is kept, in groups:
  fill_*   rock blocks (cropped inside their border)        tile_* corner_* rock tiles with moss, roots, an arch or a window
  cap_* vines_* drip_* ledge_* ceiling_* arch_*   overhangs and hanging moss
  isl_*    floating plates with their stalactites           top_*   the ground tops (grass, mushrooms, roots)
  prop_*   things that stand on the floor (pillars, windows, ruins, trees, crates, rocks, statues)
  hang_*   things that hang from a ceiling (chains, lanterns, banners, a swing)
  spike_*  spikes, stones, wheels, the catapult and the red thorns          water_* lava_*   the liquid tiles
usage: cut_moss.py [--sheet]   (--sheet writes a contact sheet of the pieces to /tmp/moss_contact.png)"""
import json, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_world import background, cut
SRC = os.path.join(ROOT, 'art', 'source', 'tiles_hd', 'sheet_moss_tiles.png')
PACK = 0.6
INSET = 7                                   # fills: how much of the border (sheet px) is left out
PIECES = {
    # ---- rock blocks
    'fill_0': (2, 2, 97, 98), 'fill_1': (103, 2, 188, 99), 'fill_2': (191, 2, 285, 98), 'fill_3': (289, 2, 384, 96), 'fill_4': (392, 1, 487, 98),
    'fill_5': (3, 102, 97, 217), 'fill_6': (104, 102, 189, 217),
    # ---- rock tiles with something on them
    'tile_roots': (501, 2, 594, 98), 'tile_hang_a': (605, 1, 693, 100), 'tile_hang_b': (705, 1, 798, 100), 'tile_boulder': (191, 101, 285, 217),
    'tile_hang_c': (289, 101, 386, 217), 'tile_window': (606, 102, 683, 217), 'corner_arch_l': (392, 102, 487, 217), 'corner_arch_r': (688, 102, 797, 217),
    'corner_rock': (501, 102, 594, 216), 'block_moss': (1423, 1, 1533, 96),
    # ---- overhangs and hanging moss
    'cap_roots': (806, 1, 967, 98), 'arch_cap': (1289, 1, 1415, 98), 'vines_long': (1015, 1, 1114, 210), 'drip_small': (1163, 0, 1253, 99),
    'ledge_big': (806, 100, 1060, 217), 'ceiling_wide': (1126, 97, 1398, 217), 'arch_big': (1406, 99, 1534, 217),
    # ---- floating plates and their stalactites
    'isl_0': (2, 229, 111, 333), 'isl_1': (120, 225, 288, 336), 'isl_2': (294, 229, 384, 332), 'isl_3': (392, 230, 495, 331), 'isl_4': (503, 227, 591, 334),
    'isl_5': (597, 230, 684, 331), 'isl_6': (687, 227, 823, 334), 'isl_7': (831, 227, 946, 356), 'isl_8': (965, 226, 1225, 365), 'isl_9': (2, 335, 102, 447),
    'isl_10': (110, 334, 211, 442), 'isl_11': (673, 337, 775, 448), 'isl_grave': (188, 324, 339, 535), 'isl_shroom': (342, 335, 452, 449),
    # ---- things that stand on the floor
    'prop_pillar_a': (10, 455, 92, 675), 'prop_pillar_b': (88, 448, 162, 675), 'prop_columns': (160, 508, 255, 675), 'prop_tree_dead': (248, 540, 380, 680),
    'prop_tree_glow': (308, 432, 398, 615), 'prop_ruin_candle': (395, 445, 478, 612), 'prop_spire': (470, 322, 540, 614), 'prop_window_big': (535, 322, 678, 614),
    'prop_ruin_gate': (680, 455, 730, 614), 'prop_window_small': (735, 405, 808, 614), 'prop_pillar_thin': (806, 318, 858, 610),
    'prop_crate_tall': (871, 556, 943, 672), 'prop_fence': (950, 585, 998, 672), 'prop_gate_ruin': (1026, 548, 1082, 672), 'prop_barrel_spiked': (1095, 586, 1157, 672),
    'prop_plank_pillar': (1157, 518, 1212, 674), 'prop_chests': (1223, 608, 1352, 674), 'prop_pillar_vine': (1348, 436, 1412, 674), 'prop_arch_lantern': (1413, 436, 1534, 674),
    'prop_panel': (404, 625, 458, 672), 'prop_spike_stone': (478, 628, 510, 672), 'prop_stone_s': (522, 624, 557, 672), 'prop_thorn_bush': (572, 617, 616, 678), 'prop_spire_small': (1000, 636, 1024, 674),
    'prop_planks': (621, 636, 686, 676), 'prop_slab': (690, 621, 752, 674), 'prop_crate_dark': (755, 620, 806, 674), 'prop_crate_cross': (810, 618, 872, 674),
    'prop_cliff': (1359, 222, 1532, 432), 'prop_planks_wall': (1245, 226, 1296, 428), 'prop_cross': (1212, 284, 1248, 428), 'prop_ruin_moss': (1298, 292, 1355, 428),
    # ---- things that hang from a ceiling
    'hang_lantern_cross': (871, 356, 912, 525), 'hang_swing': (931, 314, 1056, 578), 'hang_gallows_a': (1062, 376, 1205, 590), 'hang_gallows_b': (1198, 433, 1355, 600),
    'hang_ring': (1170, 436, 1195, 520),
    # ---- spikes, wheels, the catapult and the thorns
    'spike_wood_a': (20, 687, 128, 753), 'spike_catapult': (141, 676, 308, 752), 'spike_wheel_a': (313, 666, 383, 752), 'spike_tall': (388, 666, 492, 752),
    'spike_stone_a': (506, 690, 545, 752), 'spike_stone_b': (558, 690, 628, 752), 'spike_rock_a': (634, 684, 700, 752), 'spike_stone_c': (704, 686, 774, 756),
    'spike_rock_b': (778, 684, 858, 752), 'spike_rock_c': (865, 684, 932, 752), 'spike_wood_b': (940, 690, 1044, 752), 'spike_wheel_b': (1052, 678, 1168, 756),
    'spike_thorn_a': (1180, 682, 1260, 756), 'spike_thorn_b': (1270, 682, 1350, 756), 'spike_thorn_c': (1358, 682, 1438, 756), 'spike_thorn_d': (1444, 682, 1528, 756),
    # ---- water and lava
    'water_0': (8, 760, 121, 861), 'water_1': (122, 760, 211, 861), 'water_fall_0': (212, 760, 288, 861), 'water_fall_1': (288, 760, 354, 861),
    'water_2': (359, 760, 465, 861), 'water_fall_big': (468, 760, 566, 861), 'water_wave': (568, 760, 711, 861), 'water_fall_2': (712, 760, 823, 861),
    'water_col': (823, 760, 855, 861), 'water_fall_3': (855, 760, 930, 861), 'water_shore': (933, 760, 1004, 861),
    'lava_0': (1008, 760, 1163, 861), 'lava_1': (1168, 760, 1258, 861), 'lava_2': (1256, 760, 1398, 861), 'lava_3': (1400, 760, 1531, 861),
    # ---- the ground tops
    'top_0': (5, 863, 98, 1012), 'top_1': (100, 863, 183, 1012), 'top_2': (186, 863, 346, 1012), 'top_3': (350, 863, 556, 1012), 'top_4': (559, 863, 719, 1012),
    'top_5': (720, 863, 825, 1012), 'top_6': (827, 863, 1025, 1012), 'top_7': (1027, 863, 1130, 1012), 'top_8': (1133, 863, 1212, 1012),
    'top_roots': (1213, 863, 1328, 1012), 'top_9': (1328, 863, 1528, 1012),
}
# where the stone of each ground top begins (a fraction of its height); the plants and mushrooms above it are too thick to find it by counting
TOP_CAP = {'top_0': 0.36, 'top_1': 0.26, 'top_2': 0.26, 'top_3': 0.26, 'top_4': 0.27, 'top_5': 0.33, 'top_6': 0.27, 'top_7': 0.40, 'top_8': 0.32, 'top_9': 0.40}
OPTS = {'water_': {'pocket': 12, 'holefill': 0}, 'lava_': {'pocket': 12, 'holefill': 0}, 'top_': {'pocket': 12, 'holefill': 0}, 'isl_': {'pocket': 12, 'holefill': 0},
        'tile_': {'pocket': 12, 'holefill': 0}, 'corner_': {'pocket': 12, 'holefill': 0}, 'block_': {'pocket': 12, 'holefill': 0}, 'ledge_': {'pocket': 12, 'holefill': 0}}

def opts(name):
    for k, o in OPTS.items():
        if name.startswith(k): return o
    return {}

def cap_of(p):
    # where the stone of a ground top or a floating plate begins, as a fraction of its height: the first row that is mostly opaque
    # for three rows in a row (above it are the plants)
    a = np.asarray(p.getchannel('A')) > 128; cover = a.sum(axis=1) / max(1, a.shape[1])
    for r in range(len(cover) - 3):
        if cover[r] >= 0.55 and cover[r + 1] >= 0.55 and cover[r + 2] >= 0.55: return round(r / a.shape[0], 3)
    return 0.0

def main():
    img = cv2.imread(SRC); bg = background(img)
    out_dir = os.path.join(ROOT, 'art', 'source', 'tiles_hd', 'cut_moss'); os.makedirs(out_dir, exist_ok=True)
    pieces, origin, caps = {}, {}, {}
    for name, box in PIECES.items():
        try:
            p, org = cut(name, 'moss', box, opts(name), img, bg)
        except Exception as e:
            print('FAILED', name, e); continue
        if name.startswith('fill_'):
            p = p.crop((INSET, INSET, p.width - INSET, p.height - INSET)); org = (org[0] + INSET, org[1] + INSET)
            p = p.convert('RGB').convert('RGBA')
        p.save(os.path.join(out_dir, name + '.png')); origin[name] = org
        if name.startswith('isl_'): caps[name] = cap_of(p)
        elif name in TOP_CAP: caps[name] = TOP_CAP[name]
        pieces[name] = p.resize((max(1, round(p.width * PACK)), max(1, round(p.height * PACK))), Image.LANCZOS)
    W, x, y, row, pos = 2048, 2, 2, 0, {}
    for n, p in sorted(pieces.items(), key=lambda k: -k[1].height):
        if x + p.width + 2 > W: x, y, row = 2, y + row + 2, 0
        pos[n] = [x, y, p.width, p.height]; x += p.width + 2; row = max(row, p.height)
    atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
    for n, p in pieces.items(): atlas.paste(p, tuple(pos[n][:2]))
    od = os.path.join(ROOT, 'art', 'tiles'); os.makedirs(od, exist_ok=True)
    atlas.save(os.path.join(od, 'moss.webp'), quality=90, method=6)
    meta = {n: pos[n] for n in sorted(pos)}
    open(os.path.join(ROOT, 'js', 'moss_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_moss.py: the pieces of the mossy stone tile sheet in art/tiles/moss.webp\n"
        "// [x, y, w, h], drawn at " + str(PACK) + " of their size on the sheet; MOSS_ORIGIN: where each piece's corner was on the sheet\n"
        "const MOSS_PACK = " + str(PACK) + ";\nconst MOSS_TILES = " + json.dumps(meta, separators=(',', ':')) + ";\nconst MOSS_CAP = " + json.dumps(caps, separators=(',', ':')) + ";\nconst MOSS_ORIGIN = " + json.dumps({n: origin[n] for n in sorted(origin)}, separators=(',', ':')) + ";\n")
    print(len(pos), 'pieces', atlas.size, os.path.getsize(os.path.join(od, 'moss.webp')), 'bytes')
    if '--sheet' in sys.argv:
        S = Image.new('RGB', (1800, 2400), (28, 34, 46)); cx = cy = 0; rh = 0
        from PIL import ImageDraw
        d = ImageDraw.Draw(S)
        for n, p in pieces.items():
            q = p
            if cx + q.width + 6 > 1800: cx = 0; cy += rh + 14; rh = 0
            S.paste(q, (cx, cy), q); d.text((cx, cy + q.height), n[:16], fill=(230, 230, 120)); cx += max(q.width, 60) + 6; rh = max(rh, q.height)
        S.crop((0, 0, 1800, cy + rh + 16)).save('/tmp/moss_contact.png')

if __name__ == '__main__':
    main()
