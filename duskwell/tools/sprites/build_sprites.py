#!/usr/bin/env python3
"""Builds the pixel-art sprite sheets the game draws from the artist's source files.

art/source/hero.ase            blue hero: cover, idle, run, jump, fall (64x64 frames, Aseprite tags)
art/source/husk.ase            masked husk: cover, idle, run, jump, fall
art/source/hero_dark_*.png     dark hero strips (30x30 / 40x30 frames): idle, run and the nail strike

Every hero frame is placed in a 48x40 cell with the feet at y=38 and the mask centred on x=24, so
frames from both sources line up. The strike frames exist only for the dark hero; they are
recoloured with the blue hero's palette (and the blue frames with the dark palette), giving two
complete heroes. The strike's crescent is cut out into its own sprite so it can also be turned
for upward and downward strikes. Output: art/sprites/{hero_blue,hero_dark,husk,slash}.png and
sprites.json (cell sizes and animations).   Usage: python3 build_sprites.py
"""
import base64
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import aseprite  # noqa: E402

ROOT = os.path.join(HERE, '..', '..')
SRC, OUT = os.path.join(ROOT, 'art', 'source'), os.path.join(ROOT, 'art', 'sprites')
HERO_CELL, HERO_FEET, HERO_MID = (48, 40), 38, 24
HUSK_CELL, HUSK_FEET, HUSK_MID = (32, 24), 22, 16

# dark hero colour -> blue hero colour (outline, mask, mask shade, cloak, cloak shade)
DARK_TO_BLUE = {
    (0, 0, 0): (24, 20, 37), (232, 216, 219): (255, 255, 255), (169, 161, 175): (234, 212, 170),
    (29, 32, 54): (61, 93, 164), (24, 24, 47): (25, 44, 62),
}
BLUE_TO_DARK = {v: k for k, v in DARK_TO_BLUE.items()}


def recolour(im, table):
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = table[(r, g, b)] + (a,)
    return out


def components(im):
    """4-connected groups of opaque pixels, largest first."""
    w, h = im.size
    px, seen, groups = im.load(), set(), []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 or (x, y) in seen:
                continue
            stack, group = [(x, y)], []
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                group.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3]:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            groups.append(group)
    return sorted(groups, key=len, reverse=True)


def anchor(im, mask_colours):
    """Mask centre x and lowest opaque row: how a frame lines up with the others."""
    px = im.load()
    xs = [x for y in range(im.height) for x in range(im.width) if px[x, y][3] and px[x, y][:3] in mask_colours]
    feet = max(y for y in range(im.height) for x in range(im.width) if px[x, y][3])
    return (min(xs) + max(xs) + 1) / 2, feet


def place(frames, cell, feet, mid, ref):
    """Pastes frames into cells using one reference anchor so the animation keeps its bob."""
    cx, fy = ref
    dx, dy = int(round(mid - cx)), feet - fy
    cells = []
    for f in frames:
        c = Image.new('RGBA', cell, (0, 0, 0, 0))
        c.alpha_composite(f, (max(0, dx), max(0, dy)), (max(0, -dx), max(0, -dy)))
        cells.append(c)
    return cells


def strip(cells):
    s = Image.new('RGBA', (cells[0].width * len(cells), cells[0].height))
    for i, c in enumerate(cells):
        s.paste(c, (i * c.width, 0))
    return s


def ase_frames(path):
    a = aseprite.read(path)
    tags = {t['name']: list(range(t['from'], t['to'] + 1)) for t in a['tags']}
    return a, tags, [aseprite.render(a, i) for i in range(len(a['frames']))]


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}

    # ---- the hero
    a, tags, blue = ase_frames(os.path.join(SRC, 'hero.ase'))
    order = tags['idle'] + tags['run'] + tags['jump'] + tags['fall']
    blue_cells = place([blue[i] for i in order], HERO_CELL, HERO_FEET, HERO_MID, anchor(blue[tags['idle'][0]], {(255, 255, 255), (234, 212, 170)}))

    atk = Image.open(os.path.join(SRC, 'hero_dark_attack.png')).convert('RGBA')
    fw = atk.width // 4
    dark_atk = [atk.crop((i * fw, 0, i * fw + fw, atk.height)) for i in range(4)]
    run = Image.open(os.path.join(SRC, 'hero_dark_run.png')).convert('RGBA')
    dark_run = [run.crop((i * 30, 0, i * 30 + 30, 30)) for i in range(run.width // 30)]
    idle = Image.open(os.path.join(SRC, 'hero_dark_idle.png')).convert('RGBA')
    dark_idle = [idle.crop((i * 30, 0, i * 30 + 30, 30)) for i in range(idle.width // 30)]

    # cut the crescent out of the last strike frame: everything that is not the body
    last = dark_atk[3]
    groups = components(last)
    body = Image.new('RGBA', last.size, (0, 0, 0, 0))
    arc = Image.new('RGBA', last.size, (0, 0, 0, 0))
    lp, bp, ap = last.load(), body.load(), arc.load()
    for x, y in groups[0]:
        bp[x, y] = lp[x, y]
    for g in groups[1:]:
        for x, y in g:
            ap[x, y] = lp[x, y]
    dark_atk[3] = body
    arc_box = arc.getbbox()
    slash = arc.crop(arc_box)
    slash.save(os.path.join(OUT, 'slash.png'))

    mask_dark = {(232, 216, 219), (169, 161, 175)}
    ref_dark = anchor(dark_idle[0], mask_dark)
    atk_cells_dark = place(dark_atk[1:], HERO_CELL, HERO_FEET, HERO_MID, ref_dark)
    atk_cells_blue = [recolour(c, DARK_TO_BLUE) for c in atk_cells_dark]

    # blue hero: its own idle/run/jump/fall + the strike recoloured; dark hero: its own idle, run and
    # strike + the jump and fall recoloured from the blue hero
    hero_blue = blue_cells + atk_cells_blue
    dark_own = place(dark_idle + dark_run, HERO_CELL, HERO_FEET, HERO_MID, ref_dark)
    n_idle, n_run = len(tags['idle']), len(tags['run'])
    jf = [recolour(c, BLUE_TO_DARK) for c in blue_cells[n_idle + n_run:n_idle + n_run + 2]]
    hero_dark = dark_own + jf + atk_cells_dark
    strip(hero_blue).save(os.path.join(OUT, 'hero_blue.png'))
    strip(hero_dark).save(os.path.join(OUT, 'hero_dark.png'))

    def anim_map(counts):
        i0, out = 0, {}
        for name, n in counts:
            out[name] = list(range(i0, i0 + n)); i0 += n
        return out
    # where the crescent sits relative to the hero's feet centre, in sprite pixels
    ax = arc_box[0] + (HERO_MID - ref_dark[0]) - HERO_MID
    ay = arc_box[1] + (HERO_FEET - ref_dark[1]) - HERO_FEET
    common = {'cell': HERO_CELL, 'feet': HERO_FEET, 'mid': HERO_MID,
              'fps': {'idle': 6, 'run': 12, 'jump': 1, 'fall': 1, 'attack': 18},
              'slash': {'w': slash.width, 'h': slash.height, 'x': ax, 'y': ay}}
    meta['hero_blue'] = dict(common, anims=anim_map((('idle', n_idle), ('run', n_run), ('jump', 1), ('fall', 1), ('attack', 3))))
    meta['hero_dark'] = dict(common, anims=anim_map((('idle', len(dark_idle)), ('run', len(dark_run)), ('jump', 1), ('fall', 1), ('attack', 3))))

    # ---- the husk
    a, tags, husk = ase_frames(os.path.join(SRC, 'husk.ase'))
    order = tags['idle'] + tags['run'] + tags['jump'] + tags['fall']
    bb = [husk[i].getbbox() for i in order]
    ref = ((min(b[0] for b in bb) + max(b[2] for b in bb)) / 2, max(b[3] for b in bb) - 1)
    cells = place([husk[i] for i in order], HUSK_CELL, HUSK_FEET, HUSK_MID, ref)
    strip(cells).save(os.path.join(OUT, 'husk.png'))
    i0, anims = 0, {}
    for name, n in (('idle', len(tags['idle'])), ('run', len(tags['run'])), ('jump', 1), ('fall', 1)):
        anims[name] = list(range(i0, i0 + n)); i0 += n
    meta['husk'] = {'cell': HUSK_CELL, 'feet': HUSK_FEET, 'mid': HUSK_MID, 'anims': anims,
                    'fps': {'idle': 7, 'run': 10, 'jump': 1, 'fall': 1}}

    with open(os.path.join(OUT, 'sprites.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    # the game reads the same data from a script, so it also works when index.html is opened from disk
    # The sheets are embedded as data URIs: a data image is same-origin everywhere, so the lighting
    # code may read its pixels even when index.html is opened straight from disk.
    def data_uri(name):
        with open(os.path.join(OUT, name + '.png'), 'rb') as fh:
            return 'data:image/png;base64,' + base64.b64encode(fh.read()).decode()
    js = {k: dict(v, src=data_uri(k)) for k, v in meta.items()}
    with open(os.path.join(ROOT, 'js', 'sprite_meta.js'), 'w') as f:
        f.write("'use strict';\n// Made by tools/sprites/build_sprites.py from the artist's Aseprite files; do not edit.\n")
        f.write('const SPRITE_META = ' + json.dumps(js, separators=(',', ':')) + ';\n')
        f.write('const SLASH_SRC = ' + json.dumps(data_uri('slash')) + ';\n')
    for k, v in meta.items():
        print(k, v['cell'], {a: len(f) for a, f in v['anims'].items()})


if __name__ == '__main__':
    main()
