#!/usr/bin/env python3
"""Cuts the owner's per-creature animation sheets (art/source/creatures_hd: each creature in three rows: idle + walk, attack, hurt +
death) into frames and packs them: art/creatures/anim.webp + js/creature_anims_meta.js
  CREATURE_ANIMS[kind] = { idle: [...], walk: [...], atk: [...], hurt: [...], death: [...] }, each frame [x, y, w, h, ax, ay]
where (ax, ay) is the point of the frame that stands on the ground under the creature's body (its anchor).
Frames are split at the thinnest columns near the equal divisions of a row (or at the cuts given in creature_anims.json); every
separate piece of a row (claws, swooshes, debris) goes to the frame whose body it is nearest, so overlapping frames come apart cleanly.
The ground line and the soft floor shadows under each row are removed."""
import json, os, sys
import numpy as np, cv2
from scipy.ndimage import gaussian_filter1d
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cutsheet import segment
cfg = json.load(open(os.path.join(HERE, 'creature_anims.json')))
SPLIT = {1: lambda n: (n // 2, n - n // 2)}

def frames_of_row(im, fg, y0, y1, N, cuts=None, base=False, ground=True, off=None):
    band = fg[y0:y1].copy(); sub = im[y0:y1]
    for (a, b, c, d) in (off or []): band[max(0, b - y0):max(0, d - y0), a:c] = False
    H, W = band.shape
    hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
    cover = band.sum(axis=1)
    xs_all = np.where(band.any(axis=0))[0]; span = xs_all.max() - xs_all.min()
    gl = H - 1                                                                 # the ground line: the lowest row that crosses most of the row
    for y in range(H - 1, H // 2, -1):
        if cover[y] > 0.45 * span: gl = y; break
    else:
        gl = int(np.argmax(cover[H // 2:])) + H // 2
    grey = (hsv[..., 1] < 42) & (hsv[..., 2] > 40) & (hsv[..., 2] < 185)
    if not ground: gl = int(np.where(band.any(axis=1))[0].max())             # flying or hanging: no floor, the frame's bottom is its anchor
    else:
        band[gl + 5:] = False
        near = np.zeros_like(band); near[max(0, gl - 8):gl + 5] = True
        band &= ~(near & grey)                                                # the line and the shadows under the feet
    band = ndi.binary_opening(band, iterations=1)
    body = band.copy(); body[max(0, gl - 14):] = False
    col = gaussian_filter1d(body.sum(axis=0).astype(float), 3)
    xs = np.where(col > 0.6)[0]; L, R = int(xs.min()), int(xs.max()) + 1
    if cuts: cs = [L] + [c for c in cuts] + [R]
    else:
        w = (R - L) / N; cs = [L]
        for i in range(1, N):
            c = L + w * i; a, b = int(c - w * 0.28), int(c + w * 0.28); cs.append(a + int(np.argmin(col[a:b])))
        cs.append(R)
    lab, n = ndi.label(ndi.binary_dilation(band, iterations=1))
    lab = np.where(band, lab, 0)
    sizes = ndi.sum(band, lab, range(1, n + 1))
    # the body of each frame: the biggest piece inside its cell (pixels of that piece outside the cell are cut off)
    bodies = []
    for i in range(N):
        a, b = cs[i], cs[i + 1]
        ids, cnt = np.unique(lab[:, a:b][lab[:, a:b] > 0], return_counts=True)
        bodies.append(int(ids[np.argmax(cnt)]) if len(ids) else 0)
    owner = {}
    boxes = []
    for i in range(N):
        ys, xs2 = np.where(lab == bodies[i]); boxes.append((cs[i], cs[i + 1]))
    for c in range(1, n + 1):
        if c in bodies or sizes[c - 1] < 6: continue
        ys, xs2 = np.where(lab == c); cx = xs2.mean()
        best, bd = 0, 1e9
        for i, (a, b) in enumerate(boxes):
            d = 0 if a <= cx < b else min(abs(cx - a), abs(cx - b))
            if cx >= b: d -= 25                                              # effects are thrown forward: prefer the frame on the left
            if d < bd: bd, best = d, i
        owner[c] = best
    alpha = cv2.GaussianBlur(band.astype(np.float32), (0, 0), 0.7); alpha = np.clip((alpha - 0.25) / 0.5, 0, 1)
    out = []
    for i in range(N):
        a, b = cs[i], cs[i + 1]
        m = np.zeros_like(band)
        shared = sum(1 for j in bodies if j == bodies[i]) > 1
        bm = lab == bodies[i]
        if shared: bm[:, :a] = False; bm[:, b:] = False
        m |= bm
        for c, o in owner.items():
            if o == i: m |= lab == c
        m = ndi.binary_dilation(m, iterations=1) & (alpha > 0)
        ys, xs2 = np.where(m)
        x0, x1, yy0, yy1 = xs2.min(), xs2.max() + 1, ys.min(), ys.max() + 1
        rgba = np.dstack([sub[yy0:yy1, x0:x1], (alpha[yy0:yy1, x0:x1] * m[yy0:yy1, x0:x1] * 255).astype(np.uint8)])
        # anchor: under the middle of the torso (the upper part of the body), on the ground line
        bys, bxs = np.where(bm[max(0, gl - int((gl - ys.min()) * 0.18)):gl + 1] if base else bm[:max(1, gl - int((gl - ys.min()) * 0.35))])
        ax = (np.median(bxs) if len(bxs) else (x0 + x1) / 2) - x0
        out.append((rgba, float(ax), float(gl - yy0)))
    return out

frames = {}
for path, mons in cfg['sheets'].items():
    im = cv2.imread(os.path.join(ROOT, path)); fg = segment(im, 20)
    for (a, b, c, d) in cfg.get('off', {}).get(path, []): fg[b:d, a:c] = False
    for kind, rows in mons.items():
        rs = [frames_of_row(im, fg, y0, y1, n, cfg['cuts'].get('%s:%d' % (kind, r)), kind in cfg.get('anchor_base', [])) for r, (y0, y1, n) in enumerate(rows)]
        r1, r2, r3 = rs
        if kind == 'flyer': anim = {'idle': r1, 'walk': r1}
        else: anim = {'idle': r1[:2], 'walk': r1[2:]}
        anim['atk'] = r2; anim['hurt'] = r3[:1]; anim['death'] = r3[1:]
        frames[kind] = anim
        d = os.path.join(ROOT, 'art', 'source', 'creatures_hd', kind); os.makedirs(d, exist_ok=True)
        for nm, fr in anim.items():
            for j, (rgba, ax, ay) in enumerate(fr): cv2.imwrite(os.path.join(d, '%s_%d.png' % (nm, j)), rgba)
def roles_of(spec):
    out = []
    for part in spec.split(','):
        r, ij = part.split(':'); a, b = (ij.split('-') + [ij])[:2]
        out += [(int(r), i) for i in range(int(a), int(b) + 1)]
    return out
parts = {}
by_sheet = {}
for kind, k in cfg.get('kinds', {}).items(): by_sheet.setdefault(k['sheet'], []).append(kind)
for path, kinds in by_sheet.items():
    im = cv2.imread(os.path.join(ROOT, path)); fg = segment(im, 20)
    for (a, b, c, d) in cfg.get('off', {}).get(path, []): fg[b:d, a:c] = False
    for kind in kinds:
        k = cfg['kinds'][kind]
        rows = []
        for r in k['rows']:
            y0, y1, n = r[:3]; cuts = r[3] if len(r) > 3 else None; off = r[4] if len(r) > 4 else None
            rows.append(frames_of_row(im, fg, y0, y1, n, cuts, k.get('base', False), k.get('ground', True), off))
        anim = {name: [rows[r][i] for r, i in roles_of(spec)] for name, spec in k['roles'].items()}
        frames[kind] = anim; parts[kind] = k.get('parts')
        d = os.path.join(ROOT, 'art', 'source', 'creatures_hd', kind); os.makedirs(d, exist_ok=True)
        for r, row in enumerate(rows):
            for j, (rgba, ax, ay) in enumerate(row): cv2.imwrite(os.path.join(d, 'r%d_%d.png' % (r, j)), rgba)
        print(kind, {n: len(v) for n, v in anim.items()})
PACK = 0.5                                                                    # frames are stored at half size: still about twice what the game shows
flat = []
from cut_world import background, cut as cut_soft
extras = {}
for name, (path, box) in cfg.get('extras', {}).items():
    im = cv2.imread(os.path.join(ROOT, path))
    p, org = cut_soft(name, None, tuple(box), {'soft': True}, im, background(im))
    rgba = cv2.cvtColor(np.array(p), cv2.COLOR_RGBA2BGRA)
    cv2.imwrite(os.path.join(ROOT, 'art', 'source', 'creatures_hd', name + '.png'), rgba)
    h, w = rgba.shape[:2]; extras[name] = cv2.resize(rgba, (max(1, round(w * PACK)), max(1, round(h * PACK))), interpolation=cv2.INTER_AREA)
for name, rgba in extras.items(): flat.append(('_x', name, 0, (rgba, rgba.shape[1] / 2, rgba.shape[0] / 2)))
first = {}                                                                    # a frame used by several animations is stored once
for kind, anim in frames.items():
    for nm, fr in anim.items():
        if kind == 'flyer' and nm == 'walk': continue
        for j, f in enumerate(fr):
            if id(f) in first: continue
            first[id(f)] = (kind, nm, j)
            rgba, ax, ay = f
            h, w = rgba.shape[:2]; small = cv2.resize(rgba, (max(1, round(w * PACK)), max(1, round(h * PACK))), interpolation=cv2.INTER_AREA)
            flat.append((kind, nm, j, (small, ax * PACK, ay * PACK)))
W, x, y, row, pos = 2048, 2, 2, 0, {}
for kind, nm, j, (rgba, ax, ay) in sorted(flat, key=lambda t: -t[3][0].shape[0]):
    h, w = rgba.shape[:2]
    if x + w + 2 > W: x, y, row = 2, y + row + 2, 0
    pos[(kind, nm, j)] = [x, y, w, h, round(ax, 1), round(ay, 1)]; x += w + 2; row = max(row, h)
atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
small = {(k, n, j): f[0] for k, n, j, f in flat}
for (kind, nm, j), p in pos.items():
    rgba = small[(kind, nm, j)]; atlas.paste(Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)), (p[0], p[1]))
od = os.path.join(ROOT, 'art', 'creatures'); atlas.save(os.path.join(od, 'anim.webp'), quality=90, method=6)
meta = {}
for kind, anim in frames.items():
    meta[kind] = {nm: [pos[(kind, 'idle', j)] if (kind == 'flyer' and nm == 'walk') else pos[first[id(f)]] for j, f in enumerate(fr)] for nm, fr in anim.items()}
xmeta = {name: pos[('_x', name, 0)][:4] for name in extras}
open(os.path.join(ROOT, 'js', 'creature_anims_meta.js'), 'w').write("'use strict';\n// made by tools/sprites/cut_anims.py: the animation frames of the creatures drawn by the owner, in art/creatures/anim.webp\n// [x, y, w, h, ax, ay]: (ax, ay) is the ground point under the body. CREATURE_EXTRAS: their projectiles, drawn on their own, [x, y, w, h]\nconst CREATURE_ANIMS = " + json.dumps(meta, separators=(',', ':')) + ";\nconst CREATURE_EXTRAS = " + json.dumps(xmeta, separators=(',', ':')) + ";\n// how many frames of 'atk' are the wind-up, the strike and the recovery (creatures cut by roles)\nconst CREATURE_PARTS = " + json.dumps({k: v for k, v in parts.items() if v}, separators=(',', ':')) + ";\n")
print(atlas.size, os.path.getsize(os.path.join(od, 'anim.webp')), 'bytes', {k: {n: len(v) for n, v in a.items()} for k, a in frames.items()})
