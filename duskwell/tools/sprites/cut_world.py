#!/usr/bin/env python3
"""Cuts the owner's world sheets (art/source/world_hd: objects, machinery, gates and hazards) into one atlas, art/world/world.webp, and
js/world_meta.js (WORLD_RECTS: name -> [x, y, w, h] in the atlas, at PACK times the drawing's size).
Every piece is taken as drawn. Two kinds of crop:
  - solid objects: the background (flat light grey) is found and removed, the piece keeps a thin soft edge
  - glowing things (a shining coin, the lit shrine, the open chest, the spinning saw): the glow is kept as a soft, see-through halo, by
    measuring how far each pixel is from the grey behind it and taking that much of its colour
A piece is everything inside its box that is not background, minus the parts listed in "off" (arrows and marks drawn on the sheet).
The cut pieces are also written to art/source/world_hd/cut/ for checking."""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'world_hd')
PACK = 0.5
SHEETS = {'obj': 'sheet_objects.png', 'mech': 'sheet_mechanics.png', 'gate': 'sheet_gates_hazards.png'}
# name: sheet, box (x0, y0, x1, y1), options. soft: keep glow; off: rectangles to leave out; min: smallest part kept (px)
PIECES = {
    'geo_0': ('obj', (48, 60, 168, 238), {}),
    'geo_1': ('obj', (232, 52, 382, 238), {'soft': True}),
    'geo_2': ('obj', (418, 46, 592, 238), {'soft': True}),
    'geo_3': ('obj', (596, 8, 860, 240), {'soft': True}),
    'bench': ('obj', (822, 18, 1524, 304), {}),
    'sign_lit': ('obj', (22, 266, 386, 646), {'soft': True}),
    'sign_dark': ('obj', (392, 266, 728, 646), {}),
    'chest_shut': ('obj', (690, 404, 1116, 642), {}),
    'chest_open': ('obj', (1118, 340, 1522, 640), {'soft': True}),
    'shrine_0': ('obj', (8, 700, 362, 980), {'soft': True}),
    'shrine_1': ('obj', (362, 652, 728, 982), {'soft': True}),
    'shrine_2': ('obj', (728, 636, 1118, 986), {'soft': True}),
    'shrine_3': ('obj', (1118, 636, 1524, 990), {'soft': True}),
    'saw_still': ('mech', (20, 16, 472, 420), {'saw': 182}),
    'saw_spin': ('mech', (482, 16, 930, 420), {'saw': 168, 'soft': True}),
    'lever_up': ('mech', (856, 80, 1072, 416), {'off': [(1015, 185, 1072, 262), (856, 80, 935, 250)]}),
    'lever_down': ('mech', (1072, 196, 1310, 418), {'off': [(1072, 196, 1150, 260)]}),
    'drip_hang': ('mech', (1268, 6, 1526, 286), {}),
    'drip_fall': ('mech', (1320, 320, 1490, 620), {'off': [(1400, 286, 1440, 330)]}),
    'drip_pile': ('mech', (1262, 586, 1530, 756), {'soft': True}),
    'crumble_0': ('mech', (22, 436, 440, 720), {}),
    'crumble_1': ('mech', (441, 436, 858, 720), {}),
    'crumble_2': ('mech', (852, 436, 1268, 762), {}),
    'mover_deck': ('mech', (186, 760, 420, 940), {}),
    'mover_end': ('mech', (20, 722, 130, 942), {}),
    'chain': ('mech', (126, 776, 186, 806), {}),
    'gate_shut': ('gate', (28, 14, 652, 420), {'soft': True}),
    'gate_open': ('gate', (654, 14, 1278, 420), {'soft': True, 'hole': 'open'}),
    'wall_whole': ('gate', (44, 436, 348, 734), {}),
    'wall_broken': ('gate', (396, 434, 774, 734), {}),
    'shroom': ('gate', (830, 472, 1118, 738), {}),
    'shroom_squash': ('gate', (1190, 596, 1478, 742), {}),
    'spikes_crystal': ('gate', (28, 764, 504, 968), {}),
    'spikes_skull': ('gate', (522, 776, 936, 968), {}),
    'acid_pool': ('gate', (960, 786, 1502, 976), {}),
}

def background(sub):
    """the sheet's grey, estimated around every pixel from the flat, unsaturated parts (it is not perfectly even)"""
    f = sub.astype(np.float32); hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
    blur = cv2.GaussianBlur(f, (0, 0), 1.2); sd = np.sqrt(np.maximum(cv2.GaussianBlur((f - blur) ** 2, (0, 0), 2).mean(axis=2), 0))
    cand = (hsv[..., 1] < 34) & (hsv[..., 2] > 110) & (hsv[..., 2] < 230) & (sd < 5.5)
    cand = ndi.binary_opening(cand, iterations=2).astype(np.float32)
    num = cv2.GaussianBlur(f * cand[..., None], (0, 0), 22); den = cv2.GaussianBlur(cand, (0, 0), 22)[..., None]
    return num / np.maximum(den, 1e-3)

def cut(name, sheet, box, o, img, bg):
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1].astype(np.float32); b = bg[y0:y1, x0:x1]
    d = np.linalg.norm(sub - b, axis=2)
    near = d < 22
    lab, k = ndi.label(near); sizes = ndi.sum(near, lab, range(1, k + 1))
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    big = {i + 1 for i, v in enumerate(sizes) if v >= o.get('pocket', 100)}
    fg = ~np.isin(lab, list(edge | big)); fg = ndi.binary_opening(fg, iterations=1)
    holes = ndi.binary_fill_holes(fg) & ~fg; hl, hn = ndi.label(holes)
    for i, v in enumerate(ndi.sum(holes, hl, range(1, hn + 1)), 1):
        if v < o.get('holefill', 200): fg |= hl == i
    for (a, bb, c, e) in o.get('off', []):
        fg[max(0, bb - y0):max(0, e - y0), max(0, a - x0):max(0, c - x0)] = False
    # drop specks that touch the box edge (they belong to a neighbour) and tiny ones
    pl, pn = ndi.label(fg)
    if pn:
        ar = ndi.sum(fg, pl, range(1, pn + 1)); top = ar.max()
        keep = np.zeros(pn + 1, bool)
        border = set(np.unique(np.concatenate([pl[0], pl[-1], pl[:, 0], pl[:, -1]]))) - {0}
        for i in range(1, pn + 1):
            if ar[i - 1] >= max(o.get('min', 40), 0.002 * top) and (i not in border or ar[i - 1] > 0.3 * top): keep[i] = True
        fg = keep[pl]
    if o.get('soft'):
        # glow: alpha from the distance to the grey, colour un-mixed from it; the solid body keeps full alpha
        a = np.clip((d - 6) / 46, 0, 1)
        reach = ndi.binary_dilation(fg, iterations=40)
        a = np.where(reach, a, 0)
        a = np.maximum(a, cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.7) * (fg | ndi.binary_dilation(fg, iterations=1)))
    else:
        a = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.7); a = np.clip((a - 0.25) / 0.5, 0, 1)
    if o.get('hole') == 'open':                                                    # the picture seen through the open gate is not part of it
        hh, ww = a.shape; yy, xx = np.mgrid[0:hh, 0:ww]
        cx, top, bot, half = 968 - x0, 118 - y0, 392 - y0, 64
        inside = (np.abs(xx - cx) < half) & (yy > top + 40) & (yy < bot)
        arch = (np.hypot((xx - cx) / half, (yy - (top + 40)) / 46) < 1) & (yy <= top + 40)
        a = np.where(inside | arch, 0, a)
    col = sub.copy()
    am = np.maximum(a, 1e-3)[..., None]
    unmix = np.clip((sub - b * (1 - a[..., None])) / am, 0, 255)
    col = np.where((a > 0.02)[..., None] & ~fg[..., None], unmix, sub)
    if o.get('saw'):
        col, a = saw_blade(col, a, o['saw'])
    ys, xs = np.where(a > 0.04)
    yA, yB, xA, xB = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([col[..., ::-1], a * 255]).clip(0, 255).astype(np.uint8)[yA:yB, xA:xB]
    return Image.fromarray(rgba, 'RGBA'), (int(x0 + xA), int(y0 + yA))

def saw_blade(col, a, xb):
    """the blade without its wall bracket: a disc around the hub; the arm that reaches the hub from the left is covered with the
    blade's own opposite side (the blade is the same all round). xb: where the bracket ends (box pixels)"""
    h, w = a.shape
    m = (a > 0.5).copy(); m[:, :xb] = False
    rows = np.where(m.any(axis=1))[0]; cols = np.where(m.any(axis=0))[0]
    R = (rows.max() - rows.min()) / 2; cy = (rows.min() + rows.max()) / 2; cx = cols.max() - R
    yy, xx = np.mgrid[0:h, 0:w]
    disc = np.hypot(xx - cx, yy - cy) <= R + 1
    arm = disc & (xx < cx - R * 0.3) & (np.abs(yy - cy) < R * 0.22)
    M = cv2.getRotationMatrix2D((float(cx), float(cy)), 180, 1.0)
    colR = cv2.warpAffine(col.astype(np.float32), M, (w, h)); aR = cv2.warpAffine(a.astype(np.float32), M, (w, h))
    soft = cv2.GaussianBlur(arm.astype(np.float32), (0, 0), 3)
    col = col * (1 - soft[..., None]) + colR * soft[..., None]; a = a * (1 - soft) + aR * soft
    a = np.where(disc, a, 0)
    return col, a

def main():
    imgs = {k: cv2.imread(os.path.join(SRC, v)) for k, v in SHEETS.items()}
    bgs = {k: background(v) for k, v in imgs.items()}
    out_dir = os.path.join(SRC, 'cut'); os.makedirs(out_dir, exist_ok=True)
    pieces, origin = {}, {}
    for name, (sh, box, o) in PIECES.items():
        p, org = cut(name, sh, box, o, imgs[sh], bgs[sh])
        p.save(os.path.join(out_dir, name + '.png')); origin[name] = org
        pieces[name] = p.resize((max(1, round(p.width * PACK)), max(1, round(p.height * PACK))), Image.LANCZOS)
    W, x, y, row, pos = 2048, 2, 2, 0, {}
    for n, p in sorted(pieces.items(), key=lambda k: -k[1].height):
        if x + p.width + 2 > W: x, y, row = 2, y + row + 2, 0
        pos[n] = [x, y, p.width, p.height]; x += p.width + 2; row = max(row, p.height)
    atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
    for n, p in pieces.items(): atlas.paste(p, tuple(pos[n][:2]))
    od = os.path.join(ROOT, 'art', 'world'); os.makedirs(od, exist_ok=True)
    atlas.save(os.path.join(od, 'world.webp'), quality=90, method=6)
    meta = {n: pos[n] for n in sorted(pos)}
    open(os.path.join(ROOT, 'js', 'world_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_world.py: the owner's world pieces (objects, machinery, gates, hazards) in art/world/world.webp\n"
        "// as [x, y, w, h], drawn at " + str(PACK) + " of their size on the sheet; WORLD_ORIGIN: where each piece's corner was on its sheet\n"
        "const WORLD_PACK = " + str(PACK) + ";\nconst WORLD_RECTS = " + json.dumps(meta, separators=(',', ':')) + ";\nconst WORLD_ORIGIN = " + json.dumps({n: origin[n] for n in sorted(origin)}, separators=(',', ':')) + ";\n")
    json.dump(origin, open(os.path.join(out_dir, 'origins.json'), 'w'))
    print(len(pos), 'pieces', atlas.size, os.path.getsize(os.path.join(od, 'world.webp')), 'bytes')

if __name__ == '__main__':
    main()
