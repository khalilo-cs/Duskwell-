#!/usr/bin/env python3
"""New species: their painted sheets art/source/species/<kind>.png (twelve poses of one creature in a grid of 4 columns and 3 rows on
flat grey) are split into one picture per pose, art/source/hq/<kind>_<pose>.webp, which cut_hq.py then packs like the other creatures'
(with the rows of the creature each one moves like, tools/sprites/species.json 'parent'). Also writes js/species_meta.js (SPECIES)."""
import os, sys, json, glob
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
POSES = ['idle_a', 'idle_b', 'walk_a', 'walk_b', 'walk_c', 'atk_a', 'atk_b', 'atk_c', 'hurt', 'death_a', 'death_b', 'extra']


def cuts(profile, n):
    """n pieces: cut at the emptiest line near each expected boundary"""
    L = len(profile); sm = np.convolve(profile, np.ones(15) / 15, 'same'); out = [0]
    for k in range(1, n):
        c = k * L / n; lo, hi = int(c - 0.4 * L / n), int(c + 0.4 * L / n)
        out.append(lo + int(np.argmin(sm[lo:hi])))
    return out + [L]


def split(kind, path, im=None):
    im = im or Image.open(path).convert('RGB'); a = np.asarray(im, np.float32)
    nr, nc = (2, 6) if im.width > 2.2 * im.height else (3, 4)          # a half of a sheet of two: 6 columns, 2 rows
    grey = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), 0)
    fg = np.sqrt(((a - grey) ** 2).sum(-1)) > 28
    rows = cuts(fg.sum(1).astype(float), nr)
    i = 0
    for r in range(nr):
        band = fg[rows[r]:rows[r + 1]]; cols = cuts(band.sum(0).astype(float), nc)
        for c in range(nc):
            name = POSES[i]; i += 1
            piece = im.crop((cols[c], rows[r], cols[c + 1], rows[r + 1]))
            pad = Image.new('RGB', (piece.width + 80, piece.height + 80), tuple(int(v) for v in grey)); pad.paste(piece, (40, 40))
            if name != 'extra': pad.save(os.path.join(ROOT, 'art', 'source', 'hq', '%s_%s.webp' % (kind, name)), quality=92)


def pairs():
    """a sheet of two, art/source/species/<a>+<b>.png (6 columns, 4 rows: the top two rows a, the bottom two b), is split at the
    emptiest line near its middle into <a>.png and <b>.png"""
    for p in glob.glob(os.path.join(ROOT, 'art', 'source', 'species', '*+*.png')):
        a_, b_ = os.path.basename(p)[:-4].split('+')
        im = Image.open(p).convert('RGB'); a = np.asarray(im, np.float32)
        grey = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0)
        fg = (np.sqrt(((a - grey) ** 2).sum(-1)) > 28).sum(1).astype(float)
        m = cuts(fg, 4)[2]                                              # between the second and third of its four rows
        for k, box in ((a_, (0, 0, im.width, m)), (b_, (0, m, im.width, im.height))):
            out = os.path.join(ROOT, 'art', 'source', 'species', k + '.png')
            if not os.path.exists(out): im.crop(box).save(out)


def main():
    pairs()
    S = json.load(open(os.path.join(HERE, 'species.json')))
    for s in S:
        p = os.path.join(ROOT, 'art', 'source', 'species', s['k'] + '.png')
        if os.path.exists(p): split(s['k'], p); print('split', s['k'])
    have = [s for s in S if os.path.exists(os.path.join(ROOT, 'art', 'source', 'species', s['k'] + '.png'))]
    keep = [{k: s[k] for k in ('k', 'parent', 'area', 'move', 'en', 'ar')} for s in have]
    open(os.path.join(ROOT, 'js', 'species_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_species.py: the new species that have their painted sheet (see js/species.js)\n"
        "const SPECIES = " + json.dumps(keep, ensure_ascii=False) + ";\n")


if __name__ == '__main__':
    main()
