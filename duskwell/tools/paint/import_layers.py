#!/usr/bin/env python3
"""Cuts the backdrop layers out of the concept sheets and the pictures of the areas.
  sheet_all15_areas.png      15 cells: a picture, four strips (Sky, Far, Mid, Near), a row of props and a 2x2 palette
  layers_quiet_village.png   the four layers of the village at full width (Sky, Far, Mid, Foreground) and their sum
  panorama_village.png       the village in the afternoon (used for the roads out of the town and the ending)
  panorama_cavern.png        the sunken cave (the sky of the Crossroads)
Writes art/bg/<theme>/{sky,l0,l1,l2}.webp (2000x875; l0 far, l1 mid, l2 near, with soft top and bottom edges), art/bg/townb/sky.webp,
art/areas/<theme>.webp (the picture of each area, for the map and the banners) and art/areas/<theme>_strip.webp (its Sky strip),
art/props/props.webp (the silhouettes of every area) with js/props_meta.js and js/palette_meta.js (the four colours of every area).
usage: import_layers.py [layers|pictures|props|panoramas ...]   (default: all)"""
import os, sys, json
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'backgrounds_concept')
SHEET = os.path.join(SRC, 'sheet_all15_areas.png')
W, H = 2000, 875
AREAS = ['town', 'cave', 'moss', 'spore', 'aqueduct', 'crystal', 'webbed', 'foundry', 'throne', 'frost', 'ember', 'storm', 'mirror', 'bone', 'lunar']
ROW_Y = [0, 222, 444, 666, 870, 1024]
# cell-local boxes of the parts in a 222-pixel row; the lower rows are squeezed, the last one has its own boxes
BASE = dict(S=[(366, 37, 504, 68), (366, 71, 504, 101), (366, 104, 504, 135), (366, 138, 504, 168)], P=(15, 172, 457, 217), C=(460, 173, 505, 215), PIC=(7, 37, 322, 166))
LAST = dict(S=[(363, 33, 504, 54), (363, 57, 504, 76), (363, 78, 504, 97), (363, 99, 504, 117)], P=(8, 118, 457, 148), C=(460, 122, 505, 148), PIC=(8, 31, 322, 117))
NAMES = ['sky', 'far', 'mid', 'near']

def boxes(i):
    col, row = i % 3, i // 3
    x0, y0 = col * 512, ROW_Y[row]
    if row == 4: L = LAST
    else:
        r = (ROW_Y[row + 1] - ROW_Y[row]) / 222.0
        sc = lambda q: (q[0], round(q[1] * r), q[2], round(q[3] * r))
        L = dict(S=[sc(q) for q in BASE['S']], P=sc(BASE['P']), C=sc(BASE['C']), PIC=sc(BASE['PIC']))
    mv = lambda q: (x0 + q[0], y0 + q[1], x0 + q[2], y0 + q[3])
    return dict(S=[mv(q) for q in L['S']], P=mv(L['P']), C=mv(L['C']), PIC=mv(L['PIC']))

def cel(pic, w, h, sp=9, sr=22):
    """enlarge, flatten the colours with a mean-shift (clean areas with firm edges), then sharpen"""
    x = cv2.cvtColor(np.asarray(pic.convert('RGB')), cv2.COLOR_RGB2BGR)
    x = cv2.resize(x, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    x = cv2.pyrMeanShiftFiltering(x, sp, sr)
    x = cv2.resize(x, (w, h), interpolation=cv2.INTER_LANCZOS4)
    x = cv2.addWeighted(x, 2.0, cv2.GaussianBlur(x, (0, 0), 2.4), -1.0, 0)
    return cv2.cvtColor(x, cv2.COLOR_BGR2RGB)

def seamless(a, frac=0.12):
    """makes the picture repeat without a seam: the start is cross-faded into what comes after the end, and the end is cut where the fade begins"""
    x = np.asarray(a).astype(np.float32); h, w = x.shape[:2]; n = int(w * frac); w2 = w - n
    k = np.linspace(0, 1, n)[None, :, None]
    out = x[:, :w2].copy()
    out[:, :n] = x[:, w2:w2 + n] * (1 - k) + x[:, :n] * k
    return out

def rgba(rgb, alpha):
    out = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    out[..., :3] = np.clip(rgb, 0, 255); out[..., 3] = np.clip(alpha * 255, 0, 255)
    return out

def band(rgb, y0, h, top, bottom, dim=1.0):
    """a strip put on a transparent canvas at row y0 (h rows tall), faded in over `top` rows and out over `bottom` rows"""
    canvas = np.zeros((H, W, 3), np.float32); alpha = np.zeros((H, W), np.float32)
    ys, ye = max(0, y0), min(H, y0 + h); sy = ys - y0
    canvas[ys:ye] = rgb[sy:sy + (ye - ys)] * dim
    col = np.ones(h, np.float32)
    if top: col[:top] = np.linspace(0, 1, top)
    if bottom: col[h - bottom:] = np.linspace(1, 0, bottom)
    alpha[ys:ye] = col[sy:sy + (ye - ys), None]
    return rgba(canvas, alpha)

def save(arr, path, q=88):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr).save(path, quality=q, method=6)

# ---------------------------------------------------------------- the layers of the 15 areas
# where the far, mid and near strips sit on the canvas (row, rows tall, fade in, fade out), and how dark they are
ZONES = {'far': (210, 440, 170, 120), 'mid': (330, 440, 170, 120), 'near': (435, 440, 150, 0)}
DIM = {'far': 0.92, 'mid': 0.88, 'near': 0.85}

def key(rgb, lo=30, hi=70, shade=0.7):
    """silhouettes: the dark parts of a strip stay, the glow behind them goes (percentiles of the strip's own brightness)"""
    lum = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.6 + rgb[..., 2] * 0.1
    a, b = np.percentile(lum, lo), np.percentile(lum, hi)
    alpha = np.clip((b - lum) / max(1.0, b - a), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    return rgb * shade, alpha

# which strips are kept whole (a haze of light) and which as silhouettes (dark shapes against the glow)
KEYED = {'far': (25, 75, 0.9, 0.55), 'mid': (30, 70, 0.75, 1.0), 'near': (35, 65, 0.6, 1.0)}

def layers(only=None):
    sheet = Image.open(SHEET).convert('RGB')
    for i, th in enumerate(AREAS):
        if only and th not in only: continue
        b = boxes(i)
        for j, nm in enumerate(NAMES[1:], 1):
            strip = sheet.crop(b['S'][j])
            y0, h, top, bot = ZONES[nm]
            a = cv2.resize(seamless(cel(strip, W, h)), (W, h), interpolation=cv2.INTER_LINEAR)
            lo, hi, shade, gain = KEYED[nm]
            rgb, alpha = key(a, lo, hi, shade)
            col = np.ones(h, np.float32)
            if top: col[:top] = np.linspace(0, 1, top)
            if bot: col[h - bot:] = np.linspace(1, 0, bot)
            canvas = np.zeros((H, W, 3), np.float32); al = np.zeros((H, W), np.float32)
            ye = min(H, y0 + h); canvas[y0:ye] = rgb[:ye - y0]; al[y0:ye] = (alpha * col[:, None] * gain)[:ye - y0]
            save(rgba(canvas, al), os.path.join(ROOT, 'art', 'bg', th, 'l%d.webp' % (j - 1)), 86)
        print('layers', th)

def village():
    """the village at full width: the four layers stacked from the top, a little stretched, with soft joins"""
    im = np.asarray(Image.open(os.path.join(SRC, 'layers_quiet_village.png')).convert('RGB'))
    parts = {'sky': im[0:172], 'far': im[176:326], 'mid': im[333:502], 'near': im[508:590]}
    out = os.path.join(ROOT, 'art', 'bg', 'town')
    # heights on the canvas: the strips keep their widths (stretched to 2000), their height a little more than their own
    plan = {'sky': (0, 330), 'far': (255, 290), 'mid': (440, 300), 'near': (700, 175)}
    for nm, (y0, h) in plan.items():
        s = cv2.resize(parts[nm][:, 320:], (W, h), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)   # the labels of the sheet are on the left
        s = cv2.resize(seamless(s, 0.08), (W, h), interpolation=cv2.INTER_LINEAR)
        if nm == 'sky':
            canvas = np.zeros((H, W, 3), np.float32); canvas[:h] = s
            low = s[-6:].mean(axis=(0, 1)); k = np.linspace(0, 1, H - h)[:, None, None]
            canvas[h:] = low * (1 - 0.45 * k)                    # under the sky strip the colour of its lower edge, a little darker
            save(np.clip(canvas, 0, 255).astype(np.uint8), os.path.join(out, 'sky.webp'), 90)
        else:
            top = 90 if nm != 'near' else 50; bot = 70 if nm != 'near' else 0
            save(band(s, y0, h, top, bot, 0.9), os.path.join(out, {'far': 'l0', 'mid': 'l1', 'near': 'l2'}[nm] + '.webp'), 88)
    print('village layers')

def panoramas():
    for name, theme, dim in (('panorama_village.png', 'townb', 0.88), ('panorama_cavern.png', 'cave', 0.95)):
        im = Image.open(os.path.join(SRC, name)).convert('RGB').resize((W, H), Image.LANCZOS)
        a = cv2.resize(seamless(np.asarray(im), 0.12), (W, H), interpolation=cv2.INTER_LINEAR) * dim
        save(np.clip(a, 0, 255).astype(np.uint8), os.path.join(ROOT, 'art', 'bg', theme, 'sky.webp'), 90)
        print('panorama', theme)

# ---------------------------------------------------------------- the pictures of the areas (map, banners)
def pictures():
    sheet = Image.open(SHEET).convert('RGB')
    out = os.path.join(ROOT, 'art', 'areas'); os.makedirs(out, exist_ok=True)
    for i, th in enumerate(AREAS):
        b = boxes(i)
        pic = sheet.crop(b['PIC'])
        a = np.asarray(pic).astype(np.int32)                     # a strip of grey props may hang under the picture: cut at its first row
        for k in range(60, a.shape[0]):
            if a[k].mean() > 135 and (a[k].max(axis=1) - a[k].min(axis=1)).mean() < 45: a = a[:k - 1]; break
        pic = Image.fromarray(a.astype(np.uint8))
        save(cel(pic, 960, 400, 7, 18), os.path.join(out, th + '.webp'), 88)
        strip = sheet.crop(b['S'][0])
        save(cel(strip, 960, 220, 7, 18), os.path.join(out, th + '_strip.webp'), 88)
    # the village picture in full: the combined view of the layer sheet
    comb = Image.open(os.path.join(SRC, 'layers_quiet_village.png')).convert('RGB').crop((0, 598, 1536, 1023)).resize((960, 266), Image.LANCZOS)
    comb.save(os.path.join(out, 'town.webp'), quality=90, method=6)
    pan = Image.open(os.path.join(SRC, 'panorama_village.png')).convert('RGB').resize((960, 320), Image.LANCZOS)
    pan.save(os.path.join(out, 'townb.webp'), quality=90, method=6)
    cav = Image.open(os.path.join(SRC, 'panorama_cavern.png')).convert('RGB').resize((960, 320), Image.LANCZOS)
    cav.save(os.path.join(out, 'cave.webp'), quality=90, method=6)
    print('pictures')

# ---------------------------------------------------------------- props and palettes
def props():
    sheet = Image.open(SHEET).convert('RGB')
    atlas_rects = {}; items = []
    palettes = {}
    for i, th in enumerate(AREAS):
        b = boxes(i)
        strip = np.asarray(sheet.crop(b['P'])).astype(np.int32)
        # the strip lies on a light grey plate; what is not that plate is a prop
        lum = strip.mean(axis=2); chroma = strip.max(axis=2) - strip.min(axis=2)
        mask = (~((chroma < 28) & (lum > 105) & (lum < 215))).astype(np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
        comps = sorted([[stats[k, 0], stats[k, 0] + stats[k, 2], stats[k, 1], stats[k, 1] + stats[k, 3], [k]] for k in range(1, n) if stats[k, 4] > 30], key=lambda c: c[0])
        # a piece that lies over another (a finial, a flame) belongs to it
        groups = []
        for c in comps:
            for g in groups:
                ov = min(g[1], c[1]) - max(g[0], c[0])
                if ov > 0.5 * min(g[1] - g[0], c[1] - c[0]): g[0] = min(g[0], c[0]); g[1] = max(g[1], c[1]); g[2] = min(g[2], c[2]); g[3] = max(g[3], c[3]); g[4] += c[4]; break
            else: groups.append(c)
        for g in groups:
            x1, x2, y1, y2 = g[0], g[1], g[2], g[3]
            if x2 - x1 < 8 or y2 - y1 < 10: continue
            reg = (np.isin(lab[y1:y2, x1:x2], g[4])).astype(np.uint8)
            items.append((th, strip[y1:y2, x1:x2].astype(np.uint8), reg))
        # the palette: four squares
        pal = np.asarray(sheet.crop(b['C'])).astype(np.int32); ph, pw = pal.shape[:2]
        q = [pal[ph // 4, pw // 4], pal[ph // 4, 3 * pw // 4], pal[3 * ph // 4, pw // 4], pal[3 * ph // 4, 3 * pw // 4]]
        palettes[th] = ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in q]
    # pack: scale every prop to 4x with smooth alpha, shelf layout
    S = 4; shelves = []; x = y = rowh = 0; AW = 2048; rects = {}
    pos = []
    for th, rgb, reg in items:
        h0, w0 = rgb.shape[:2]
        w, h = w0 * S, h0 * S
        if x + w + 2 > AW: x = 0; y += rowh + 2; rowh = 0
        pos.append((th, x, y, w, h, rgb, reg)); x += w + 2; rowh = max(rowh, h)
    AH = y + rowh + 2
    atlas = np.zeros((AH, AW, 4), np.uint8)
    for th, x, y, w, h, rgb, reg in pos:
        c = cv2.resize(rgb, (w, h), interpolation=cv2.INTER_CUBIC)
        m = cv2.GaussianBlur(cv2.resize(reg * 255, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), 1.6)
        m = np.clip((m.astype(np.float32) - 60) * 2.0, 0, 255).astype(np.uint8)
        atlas[y:y + h, x:x + w, :3] = c; atlas[y:y + h, x:x + w, 3] = m
        rects.setdefault(th, []).append([x, y, w, h])
    os.makedirs(os.path.join(ROOT, 'art', 'props'), exist_ok=True)
    Image.fromarray(atlas).save(os.path.join(ROOT, 'art', 'props', 'props.webp'), quality=88, method=6)
    with open(os.path.join(ROOT, 'js', 'props_meta.js'), 'w') as f:
        f.write("'use strict';\n// made by tools/paint/import_layers.py: the props of every area in art/props/props.webp as [x, y, w, h]\nconst PROP_RECTS = " + json.dumps(rects, separators=(',', ':')) + ';\n')
    with open(os.path.join(ROOT, 'js', 'palette_meta.js'), 'w') as f:
        f.write("'use strict';\n// made by tools/paint/import_layers.py: the four colours of every area (light, glow, dark, deep)\nconst AREA_PALETTE = " + json.dumps(palettes, separators=(',', ':')) + ';\n')
    print('props', {k: len(v) for k, v in rects.items()}, 'atlas', atlas.shape)

def main():
    what = sys.argv[1:] or ['layers', 'village', 'panoramas', 'pictures', 'props']
    if 'layers' in what: layers()
    if 'village' in what: village()
    if 'panoramas' in what: panoramas()
    if 'pictures' in what: pictures()
    if 'props' in what: props()

if __name__ == '__main__': main()
