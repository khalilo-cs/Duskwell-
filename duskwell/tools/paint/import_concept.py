#!/usr/bin/env python3
"""Turns the owner's background concept sheet (art/source/backgrounds_concept/sheet_all15_areas.png: 15 areas, each a wide picture
plus Sky/Far/Mid/Near strips) into the game's backdrop layers.
The strips are only ~140x30 px and carry their own opaque sky, so they cannot serve as layers; the big picture of each area (about
315x129 px) is what is used: cropped, upscaled with a sharpened bicubic, flattened into clean cel colours with firm edges, made to tile sideways, darkened
a little so the play field stays readable, and saved as art/bg/<theme>/sky.webp (the opaque back layer, 2000x875 = 1600x700 logical).
Row 5 of the sheet was squeezed vertically in the original image; it is stretched back.
usage: import_concept.py [theme ...]   (default: all)"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SHEET = os.path.join(ROOT, 'art', 'source', 'backgrounds_concept', 'sheet_all15_areas.png')
# cell (column, row) -> theme; the picture's box inside a cell
AREAS = {'town': (0, 0), 'cave': (1, 0), 'moss': (2, 0), 'spore': (0, 1), 'aqueduct': (1, 1), 'crystal': (2, 1), 'webbed': (0, 2), 'foundry': (1, 2), 'throne': (2, 2),
         'frost': (0, 3), 'ember': (1, 3), 'storm': (2, 3), 'mirror': (0, 4), 'bone': (1, 4), 'lunar': (2, 4)}
ROW_Y = [0, 222, 444, 666, 870]
DIM = {k: 0.92 for k in AREAS}
DIM.update({'frost': 0.88, 'ember': 0.84, 'foundry': 0.86, 'spore': 0.88})

def picture(sheet, col, row):
    x0 = col * 512
    if row < 4: box = (x0 + 7, ROW_Y[row] + 37, x0 + 322, ROW_Y[row] + 166)
    else:
        box = (x0 + 8, 901, x0 + 322, 987)                                              # the last row is squeezed
    pic = sheet.crop(box)
    a = np.asarray(pic).astype(np.int32)                                                  # a strip of grey props under some pictures: cut at its first row
    for i in range(80, a.shape[0]):
        if a[i].mean() > 135 and (a[i].max(axis=1) - a[i].min(axis=1)).mean() < 45: a = a[:i - 1]; break
    pic = Image.fromarray(a.astype(np.uint8)).crop((3, 2, a.shape[1] - 3, a.shape[0] - 2))
    if row == 4: pic = pic.resize((pic.width, round(pic.height * 129 / 86)), Image.BICUBIC)
    return pic

def upscale(pic, W=2000, H=875):
    """enlarge 4x, flatten the colours with a mean-shift (the cel look: clean areas with firm edges instead of the mush that a plain
    enlargement or a blur-heavy denoise gives), down to the layer size with Lanczos, then sharpen the edges"""
    import cv2
    x = cv2.cvtColor(np.asarray(pic), cv2.COLOR_RGB2BGR)
    x = cv2.resize(x, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    x = cv2.pyrMeanShiftFiltering(x, 9, 22)
    x = cv2.resize(x, (W, H), interpolation=cv2.INTER_LANCZOS4)
    x = cv2.addWeighted(x, 2.3, cv2.GaussianBlur(x, (0, 0), 2.0), -1.3, 0)
    return Image.fromarray(cv2.cvtColor(x, cv2.COLOR_BGR2RGB))

def seamless(a, frac=0.14):
    """cross-fades the right edge into the left so the picture repeats without a visible seam"""
    x = np.asarray(a).astype(np.float32); h, w, _ = x.shape; n = int(w * frac)
    left = x[:, :n]; right = x[:, w - n:]
    k = np.linspace(0, 1, n)[None, :, None]
    blend = right * (1 - k) + left * k                                                   # ends exactly on the picture's first columns
    out = x.copy(); out[:, w - n:] = blend
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def grain(a, amount=3.2, seed=7):
    x = np.asarray(a).astype(np.float32); rng = np.random.default_rng(seed)
    n = rng.normal(0, amount, x.shape[:2])[:, :, None]
    n = np.asarray(Image.fromarray(((n[:, :, 0] * 4) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)[:, :, None]
    return Image.fromarray(np.clip(x + (n - 128) / 4, 0, 255).astype(np.uint8))

def main():
    themes = sys.argv[1:] or list(AREAS)
    sheet = Image.open(SHEET).convert('RGB')
    src = os.path.join(ROOT, 'art', 'source', 'backgrounds_concept', 'pictures'); os.makedirs(src, exist_ok=True)
    for th in themes:
        col, row = AREAS[th]
        pic = picture(sheet, col, row); pic.save(os.path.join(src, th + '.png'))
        a = seamless(upscale(pic))
        a = Image.fromarray(np.clip(np.asarray(a).astype(np.float32) * DIM[th], 0, 255).astype(np.uint8))
        out = os.path.join(ROOT, 'art', 'bg', th); os.makedirs(out, exist_ok=True)
        a.save(os.path.join(out, 'sky.webp'), quality=90, method=6)
        print(th, pic.size, os.path.getsize(os.path.join(out, 'sky.webp')), 'bytes')

if __name__ == '__main__': main()
