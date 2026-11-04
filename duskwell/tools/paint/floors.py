#!/usr/bin/env python3
"""Turns the painted area pictures in art/source/areas_hd/ into game files:
  <theme>_sky.png  -> art/bg/<theme>/sky.webp (2000x875, seamless left to right) and art/areas/<theme>.webp (960x400)
  <theme>_fill.png -> art/floors/<theme>_fill.webp (512x512, seamless both ways)
  <theme>_top.png  -> art/floors/<theme>_top.webp (the edge strip cut out of its grey ground, seamless left to right)
and writes js/floors_meta.js: FLOOR_ART[theme] = {surf: row of the strip's surface, hi: light colour of the rock} and
js/sky_meta.js: SKY_HD = [themes whose backdrop is one painting];
  prop_<name>.png  -> art/props_hd/prop_<name>.webp (cut out of its grey ground) listed in js/props_hd_meta.js."""
import glob, json, os
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'areas_hd')


def seam_x(a, frac=0.18):
    """make an image (H, W, C float) seamless left to right: cross-fade its two ends over frac of the width"""
    h, w = a.shape[:2]; n = int(w * frac)
    t = np.linspace(0, 1, n)[None, :, None]
    left, right = a[:, :n], a[:, w - n:]
    out = a[:, :w - n].copy()
    out[:, :n] = right * (1 - t) + left * t
    return out


def seam_xy(a):
    """seamless both ways: blend with a copy shifted by half, weighted toward the centre of each"""
    h, w = a.shape[:2]
    b = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    yy = np.abs(np.linspace(-1, 1, h))[:, None]; xx = np.abs(np.linspace(-1, 1, w))[None, :]
    wa = np.clip(1.0 - np.maximum(yy, xx), 0, 1) ** 0.7       # 1 in the middle, 0 at the edges
    wb = np.roll(np.roll(wa, h // 2, 0), w // 2, 1)
    m = (wa / (wa + wb + 1e-6))[..., None]
    return a * m + b * (1 - m)


def sky(theme, path):
    im = Image.open(path).convert('RGB'); w, h = im.size
    ch = int(round(w / (2000 / 875)))
    y0 = max(0, (h - ch) // 2); im = im.crop((0, y0, w, y0 + ch))
    a = seam_x(np.asarray(im, np.float32))
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((2000, 875), Image.LANCZOS)
    d = os.path.join(ROOT, 'art', 'bg', theme); os.makedirs(d, exist_ok=True)
    out.save(os.path.join(d, 'sky.webp'), quality=90, method=6)
    out.resize((960, 420), Image.LANCZOS).crop((0, 10, 960, 410)).save(os.path.join(ROOT, 'art', 'areas', theme + '.webp'), quality=88, method=6)


def fill(theme, path):
    im = Image.open(path).convert('RGB'); w, h = im.size
    m = int(min(w, h) * 0.06); im = im.crop((m, m, w - m, h - m))         # the very edge of a painting is often softer
    a = seam_xy(np.asarray(im, np.float32))
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    out.save(os.path.join(ROOT, 'art', 'floors', theme + '_fill.webp'), quality=90, method=6)
    px = np.asarray(out, np.float32).reshape(-1, 3); lum = px @ [0.3, 0.59, 0.11]
    hi = px[lum >= np.percentile(lum, 92)].mean(0)
    return '#%02x%02x%02x' % tuple(int(v) for v in hi)


def top(theme, path):
    im = Image.open(path).convert('RGB'); a = np.asarray(im, np.float32)
    # the grey ground: the colour of the border of the picture
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3)]); grey = np.median(border, 0)
    d = np.sqrt(((a - grey) ** 2).sum(-1))
    sat = a.max(-1) - a.min(-1)
    alpha = np.clip((d - 14) / 26, 0, 1)
    alpha[(d < 30) & (sat < 10)] = 0
    al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.asarray(al, np.float32) / 255
    rows = np.where(alpha.mean(1) > 0.35)[0]
    # the band of the strip: the longest run of full rows
    runs, s = [], rows[0]
    for i in range(1, len(rows)):
        if rows[i] != rows[i - 1] + 1: runs.append((s, rows[i - 1])); s = rows[i]
    runs.append((s, rows[-1])); r0, r1 = max(runs, key=lambda r: r[1] - r[0])
    lo = np.where(alpha.mean(1) > 0.04)[0]
    t0 = max(lo[lo <= r0].min() if (lo <= r0).any() else r0, r0 - (r1 - r0)); t1 = min(lo[lo >= r1].max(), r1 + (r1 - r0))
    w = a.shape[1]; c0, c1 = int(w * 0.04), int(w * 0.96)                    # leave out the ragged ends
    rgba = np.dstack([a, alpha * 255])[t0:t1 + 1, c0:c1]
    rgba = seam_x(rgba)
    surf = int(np.argmax(rgba[..., 3].mean(1) > 0.5 * 255))                   # first row that is mostly solid: the walking line
    out = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    k = 160 / out.height; out = out.resize((max(1, int(out.width * k)), 160), Image.LANCZOS)
    out.save(os.path.join(ROOT, 'art', 'floors', theme + '_top.webp'), quality=90, method=6, lossless=False)
    return int(surf * k)


def prop(name, path):
    """an object painted on the grey ground: cut out, cropped to its outline"""
    a = np.asarray(Image.open(path).convert('RGB'), np.float32)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)]); grey = np.median(border, 0)
    d = np.sqrt(((a - grey) ** 2).sum(-1)); sat = a.max(-1) - a.min(-1)
    alpha = np.clip((d - 14) / 26, 0, 1); alpha[(d < 30) & (sat < 10)] = 0
    al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.asarray(al, np.float32) / 255
    ys, xs = np.where(alpha > 0.5); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), 'RGBA').crop((x0, y0, x1, y1))
    k = min(1.0, 900 / max(out.size)); out = out.resize((max(1, int(out.width * k)), max(1, int(out.height * k))), Image.LANCZOS)
    os.makedirs(os.path.join(ROOT, 'art', 'props_hd'), exist_ok=True)
    out.save(os.path.join(ROOT, 'art', 'props_hd', name + '.webp'), quality=90, method=6)
    return list(out.size)


def main():
    os.makedirs(os.path.join(ROOT, 'art', 'floors'), exist_ok=True)
    meta_path = os.path.join(ROOT, 'js', 'floors_meta.js')
    floors, skies = {}, []
    for p in sorted(glob.glob(os.path.join(SRC, '*_sky.png'))):
        t = os.path.basename(p)[:-8]; sky(t, p); skies.append(t); print('sky ', t)
    for p in sorted(glob.glob(os.path.join(SRC, '*_fill.png'))):
        t = os.path.basename(p)[:-9]; tp = os.path.join(SRC, t + '_top.png')
        if not os.path.exists(tp): continue
        hi = fill(t, p); surf = top(t, tp); floors[t] = {'surf': surf, 'hi': hi}; print('floor', t, floors[t])
    props = {}
    for p in sorted(glob.glob(os.path.join(SRC, 'prop_*.png'))):
        n = os.path.basename(p)[:-4]; props[n] = prop(n, p); print('prop ', n, props[n])
    open(os.path.join(ROOT, 'js', 'props_hd_meta.js'), 'w').write("'use strict';\n// made by tools/paint/floors.py: painted props in art/props_hd/<name>.webp, [width, height]\nconst PROPS_HD = " + json.dumps(props, sort_keys=True) + ";\n")
    open(meta_path, 'w').write("'use strict';\n// made by tools/paint/floors.py: the areas whose floors are painted (art/floors/<theme>_fill.webp, _top.webp);\n"
                               "// surf: row of the top strip (of its 160) where one walks, hi: a light colour of the rock\n"
                               "const FLOOR_ART = " + json.dumps(floors, sort_keys=True) + ";\n")
    open(os.path.join(ROOT, 'js', 'sky_meta.js'), 'w').write("'use strict';\n// made by tools/paint/floors.py: areas whose backdrop is one detailed painting (art/bg/<theme>/sky.webp)\n"
                                                             "const SKY_HD = " + json.dumps(skies) + ";\n")


if __name__ == '__main__':
    main()
