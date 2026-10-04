#!/usr/bin/env python3
"""Cuts the owner's hero animation sheet (art/source/hero_hd/sheet_hero_anims.png: idle 6, run 8, jump 6, two sword slashes of 5,
hit 4, death 8, sitting on a bench 4; the run has a ninth, unnumbered drawing, kept) into art/hero/hero_frames.webp and js/hero_frames_meta.js:
  HERO_FRAMES[anim] = [[x, y, w, h, ax, ay], ...]   (ax, ay): the point under the body that stands on the ground
The sheet is a board with titles, frame numbers, floor lines and lines between the groups; only the drawings are kept:
  - each group is taken between its title and its floor line, inside its own columns
  - the floor line is removed where it is thin (under the feet the drawing is kept)
  - the frames are split at the given columns, every loose piece (a sword trail, drops of blood) going to the nearest frame
Jump frames are anchored at their own feet (the game lifts the hero itself); the rest stand on the floor line.
Frames 3 and 4 of the bench share one bench in the drawing, so only frames 1 and 2 (standing by it, sitting on it) are kept.
The second sheet (sheet_hero_moves.png, no titles or floor lines) adds the moves the first lacks: a slash upward (5), a stab
downward in the air (4), clinging to a wall (2, the drawn wall streak left out), a dash (2), a double jump (4), healing (4), casting
(4) and sitting alone (4). Frames in the air are anchored at the middle of the body (the game puts it at the hero's centre).
A sword trail or a glow goes to the frame its middle lies in (on the first sheet: the frame its left end starts from)."""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cutsheet import segment
from cut_world import background
SRC = os.path.join(ROOT, 'art', 'source', 'hero_hd', 'sheet_hero_anims.png')
MOVES = os.path.join(ROOT, 'art', 'source', 'hero_hd', 'sheet_hero_moves.png')
PACK = 0.75
# name: x0, x1, y0 (under the title), the floor line, frames, cuts between frames (sheet x), anchor ('floor', 'feet': its own bottom,
# 'mid': the middle of the body), [options: sheet, floor (a drawn floor line to remove), glow (trails and glows are see-through),
# arcs ('left' or 'center': which frame a trail belongs to), arccuts (instead: the columns that divide the trails between frames,
# where trails of neighbouring frames touch), off (rectangles left out)]
G1 = dict(sheet=SRC, floor=True, glow=False, arcs='left', off=[])
G2 = dict(sheet=MOVES, floor=False, glow=True, arcs='center', off=[])
GROUPS = {
    'idle': (10, 758, 45, 206, 6, [137, 262, 388, 510, 630], 'floor', G1),
    'run': (766, 1978, 45, 206, 9, [890, 1022, 1165, 1308, 1443, 1572, 1705, 1840], 'floor', G1),
    'jump': (5, 642, 302, 482, 6, [112, 215, 318, 420, 522], 'feet', G1),
    'slash1': (650, 1310, 302, 482, 5, [820, 950, 1080, 1192], 'floor', dict(G1, glow=True)),
    'slash2': (1318, 1978, 302, 482, 5, [1430, 1560, 1705, 1835], 'floor', dict(G1, glow=True)),
    'hit': (5, 447, 572, 734, 4, [128, 236, 340], 'floor', G1),
    'death': (455, 1465, 572, 734, 8, [572, 680, 790, 912, 1040, 1170, 1300], 'floor', G1),
    'sit': (1472, 1726, 572, 734, 2, [1562], 'floor', G1),
    'up': (8, 1048, 18, 254, 5, [162, 355, 595, 820], 'floor', dict(G2, arccuts=[160, 430, 640, 860])),
    'down': (1052, 1768, 18, 272, 4, [1235, 1405, 1580], 'mid', dict(G2, arccuts=[1275, 1430, 1600])),
    'wall': (18, 318, 272, 508, 2, [168], 'mid', dict(G2, off=[[18, 270, 48, 292], [18, 292, 37, 320], [18, 320, 48, 508],            # the drawn wall streak,
                                                                [168, 270, 196, 336], [168, 336, 182, 364], [168, 364, 196, 508]])),  # around the gripping hand
    'dash': (322, 1012, 272, 508, 2, [640], 'mid', G2),
    'double': (1012, 1768, 272, 508, 4, [1195, 1385, 1580], 'mid', dict(G2, arccuts=[1200, 1362, 1580])),
    'focus': (8, 778, 520, 690, 4, [195, 385, 580], 'floor', G2),
    'cast': (782, 1768, 520, 690, 4, [985, 1170, 1360], 'floor', dict(G2, arccuts=[1005, 1205, 1400])),
    'rest': (8, 892, 715, 868, 4, [205, 425, 645], 'floor', G2),
}

def no_floor(fg, x0, x1, y0, gl):
    """the floor line: in the rows around it, drop pixels whose vertical run is thin (the line, the faint shadows); feet stay"""
    out = np.zeros_like(fg); out[y0:gl + 6, x0:x1] = fg[y0:gl + 6, x0:x1]
    src = out.copy()
    for y in range(gl - 6, gl + 6):
        up = np.zeros(fg.shape[1], int); dn = np.zeros(fg.shape[1], int)
        for k in range(1, 12):
            up += (src[y - k] & (up == k - 1)).astype(int)
            if y + k < fg.shape[0]: dn += (src[y + k] & (dn == k - 1)).astype(int)
        out[y] &= ~(src[y] & (up + dn + 1 <= 8))
    out[gl + 4:] = False
    return out

def split(im, bg, m, x0, x1, gl, n, cuts, anchor, glow, arcs='left', arccuts=None):
    """the frames of one group: the body of each frame is the biggest piece in its column (cut at the column's edges when two
    bodies touch), loose bits go to the nearest frame; a sword trail (bright teal) goes to the frame it starts from (its left end)"""
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    arc = np.zeros_like(m)
    if glow:
        arc = m & (((hsv[..., 0] >= 70) & (hsv[..., 0] <= 105) & (hsv[..., 2] > 150) & (hsv[..., 1] > 40)) | (hsv[..., 2] > 215))
        arc = ndi.binary_closing(arc, iterations=2) & m
        arc = ndi.binary_dilation(arc, iterations=2) & m & ~ndi.binary_erosion(m & ~arc, iterations=3)
    body = m & ~arc
    cs = [x0] + cuts + [x1]
    lab, k = ndi.label(body)
    sizes = ndi.sum(body, lab, range(1, k + 1))
    masks = [np.zeros_like(m) for _ in range(n)]
    main = []
    for i in range(n):
        sub = lab[:, cs[i]:cs[i + 1]]; ids, cnt = np.unique(sub[sub > 0], return_counts=True)
        main.append(int(ids[np.argmax(cnt)]) if len(ids) else 0)
    for i in range(n):
        bm = lab == main[i]
        if main.count(main[i]) > 1: bm[:, :cs[i]] = False; bm[:, cs[i + 1]:] = False
        masks[i] |= bm
    # loose bits go to the body they are nearest to (measured to the body itself, not to its column)
    dist = [ndi.distance_transform_edt(~masks[i]) for i in range(n)]
    for c in range(1, k + 1):
        if c in main or sizes[c - 1] < 4: continue
        sel = lab == c
        i = min(range(n), key=lambda j: dist[j][sel].min())
        masks[i] |= sel
    if glow and arccuts:                                                  # trails divided by columns, pixel by pixel
        xx = np.arange(m.shape[1])[None, :].repeat(m.shape[0], 0); ac = [x0] + arccuts + [x1]
        for i in range(n): masks[i] |= arc & (xx >= ac[i]) & (xx < ac[i + 1])
    elif glow:
        al, ak = ndi.label(arc)
        for c in range(1, ak + 1):
            ys, xs = np.where(al == c)
            if len(xs) < 6: continue
            lx = np.percentile(xs, 3) if arcs == 'left' else xs.mean()
            i = max(0, min(n - 1, sum(1 for e in cs[1:-1] if lx >= e)))
            masks[i] |= al == c
    f = im.astype(np.float32); d = np.linalg.norm(f - bg, axis=2)
    out = []
    for i in range(n):
        mm = ndi.binary_dilation(masks[i], iterations=1) & m
        soft = cv2.GaussianBlur(mm.astype(np.float32), (0, 0), 0.7); soft = np.clip((soft - 0.25) / 0.5, 0, 1)
        if glow:                                                          # the trail stays see-through where it is thin glow
            ga = np.clip((d - 6) / 60, 0, 1); isarc = arc & mm
            soft = np.where(isarc, np.minimum(soft, np.maximum(ga, 0.15)), soft)
        col = f.copy()
        am = np.maximum(soft, 1e-3)[..., None]
        col = np.where((arc & mm)[..., None], np.clip((f - bg * (1 - soft[..., None])) / am, 0, 255), f)
        ys, xs = np.where(soft > 0.04)
        ya, yb, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = np.dstack([col[ya:yb, xa:xb], soft[ya:yb, xa:xb] * 255]).clip(0, 255).astype(np.uint8)
        by, bx = np.where(masks[i] & ~arc)
        top = by.min(); torso = bx[by < top + (by.max() - top) * 0.55]
        ax = float(np.median(torso)) - xa
        ay = float(yb - ya) if anchor == 'feet' else float(np.median(by)) - ya if anchor == 'mid' else float(min(gl, yb) - ya)
        out.append((rgba, ax, ay))
    return out

def main():
    sheets = {}
    frames, srcdir = {}, os.path.join(ROOT, 'art', 'source', 'hero_hd', 'frames')
    os.makedirs(srcdir, exist_ok=True)
    for name, (x0, x1, y0, gl, n, cuts, anchor, o) in GROUPS.items():
        if o['sheet'] not in sheets: im0 = cv2.imread(o['sheet']); sheets[o['sheet']] = (im0, segment(im0, 20), background(im0))
        im, fg, bg = sheets[o['sheet']]
        if o['floor']: m = no_floor(fg, x0, x1, y0, gl)
        else: m = np.zeros_like(fg); m[y0:gl, x0:x1] = fg[y0:gl, x0:x1]
        for (a, b, c, d) in o['off']: m[b:d, a:c] = False
        m = ndi.binary_opening(m, iterations=1) | (m & ndi.binary_dilation(ndi.binary_opening(m, iterations=1), iterations=2))
        if not o['floor']: ys = np.where(m.any(axis=1))[0]; gl = int(ys.max()) + 1          # no floor line: the lowest drawing in the row
        row = split(im, bg, m, x0, x1, gl, n, cuts, anchor, o['glow'], o['arcs'], o.get('arccuts'))
        out = []
        for j, (rgba, ax, ay) in enumerate(row):
            cv2.imwrite(os.path.join(srcdir, '%s_%d.png' % (name, j)), rgba)
            out.append((rgba, ax, ay))
        frames[name] = out
        print(name, len(out), [f[0].shape[:2] for f in out])
    flat = []
    for name, fr in frames.items():
        for j, (rgba, ax, ay) in enumerate(fr):
            h, w = rgba.shape[:2]; small = cv2.resize(rgba, (max(1, round(w * PACK)), max(1, round(h * PACK))), interpolation=cv2.INTER_AREA)
            flat.append((name, j, small, ax * PACK, ay * PACK))
    W, x, y, row, pos = 2048, 2, 2, 0, {}
    for name, j, small, ax, ay in sorted(flat, key=lambda t: -t[2].shape[0]):
        h, w = small.shape[:2]
        if x + w + 2 > W: x, y, row = 2, y + row + 2, 0
        pos[(name, j)] = [x, y, w, h, round(ax, 1), round(ay, 1)]; x += w + 2; row = max(row, h)
    atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
    for name, j, small, ax, ay in flat: atlas.paste(Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGRA2RGBA)), tuple(pos[(name, j)][:2]))
    od = os.path.join(ROOT, 'art', 'hero'); os.makedirs(od, exist_ok=True)
    atlas.save(os.path.join(od, 'hero_frames.webp'), quality=90, method=6)
    meta = {name: [pos[(name, j)] for j in range(len(fr))] for name, fr in frames.items()}
    open(os.path.join(ROOT, 'js', 'hero_frames_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_hero_anims.py: the owner's hero frames in art/hero/hero_frames.webp\n"
        "// [x, y, w, h, ax, ay]: (ax, ay) is the point under the body that stands on the ground\nconst HERO_FRAMES = " + json.dumps(meta, separators=(',', ':')) + ";\n")
    print(atlas.size, os.path.getsize(os.path.join(od, 'hero_frames.webp')), 'bytes')

if __name__ == '__main__':
    main()
