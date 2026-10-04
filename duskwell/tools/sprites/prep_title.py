#!/usr/bin/env python3
"""The owner's Duskwell banner (art/source/title_hd/title_banner.png, 2172x724) made ready for the title screen: its alpha (it fades to
nothing at the top and the bottom) is laid over the night colour the screen is filled with, so the picture is flat and its edges
dissolve into the dark; the last 40 rows, where the generator left a band of coloured noise, are cut off. Output: art/title/banner.webp."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'art', 'source', 'title_hd', 'title_banner.png')
NIGHT = (5, 8, 18)                      # js/art_title.js fills the screen with this
KEEP = 684                              # rows kept (of 724)

def main():
    im = np.array(Image.open(SRC).convert('RGBA')).astype(np.float32)[:KEEP]
    a = im[..., 3:4] / 255.0
    flat = im[..., :3] * a + np.array(NIGHT, np.float32) * (1 - a)
    out = Image.fromarray(flat.clip(0, 255).astype(np.uint8), 'RGB')
    os.makedirs(os.path.join(ROOT, 'art', 'title'), exist_ok=True)
    p = os.path.join(ROOT, 'art', 'title', 'banner.webp')
    out.save(p, quality=88, method=6)
    print(out.size, os.path.getsize(p), 'bytes')

if __name__ == '__main__':
    main()
