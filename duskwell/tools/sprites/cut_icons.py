#!/usr/bin/env python3
"""Cuts the owner's icon sheet (art/source/icons/weapons_cloaks_charms_ui.png) into the game's icon atlas: art/icons/icons.webp and
js/icons_meta.js (ICON_RECTS: name -> [x, y, w, h]). The icons sit on a dark gradient, so every crop gets a soft edge instead of a hard
outline; the game draws them over dark panels where that is invisible.
Names: weapon_<id>, cloak_<id>, charm_<id>, mask_full, mask_empty, mask_broken, orb_empty, orb_full, geo, bench, lantern_off, lantern_on."""
import json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sheet = Image.open(os.path.join(ROOT, 'art', 'source', 'icons', 'weapons_cloaks_charms_ui.png')).convert('RGB')
WEAPONS = ['nail', 'scythe', 'lance', 'cleaver', 'rapier', 'bonesaw', 'fangs', 'duskblade']
CLOAKS = ['drifter', 'boneward', 'ironhide', 'duskmantle', 'frostfur', 'soulveil', 'windweave', 'emberweave']
CHARMS1 = ['reach', 'swift', 'siphon', 'focus', 'deep', 'thorn', 'boots', 'dashmaster', 'mage', 'spirit', 'magnet']
X1 = [85, 220, 361, 495, 625, 758, 870, 995, 1135, 1275, 1410]
CHARMS2 = ['thrift', 'fury', 'soles', 'wick', 'cinder', 'gale', 'echo', 'grave', 'moonstep', 'shell']
X2 = [91, 220, 370, 523, 660, 796, 935, 1071, 1216, 1369]
UI = {'mask_full': (22, 825, 150, 985), 'mask_empty': (150, 825, 268, 985), 'mask_broken': (275, 825, 400, 1000), 'orb_empty': (430, 830, 560, 960),
      'orb_full': (590, 830, 730, 960), 'geo': (770, 835, 920, 985), 'bench': (985, 830, 1265, 990), 'lantern_off': (1285, 820, 1390, 1000), 'lantern_on': (1395, 820, 1505, 1010)}
boxes = {}
for i, n in enumerate(WEAPONS): boxes['weapon_' + n] = (i * 192, 0, i * 192 + 192, 252, 'rect')
for i, n in enumerate(CLOAKS): boxes['cloak_' + n] = (i * 192, 255, i * 192 + 192, 500, 'rect')
for n, x in zip(CHARMS1, X1): boxes['charm_' + n] = (x - 80, 578 - 80, x + 80, 578 + 80, 'round')
for n, x in zip(CHARMS2, X2): boxes['charm_' + n] = (x - 80, 728 - 80, x + 80, 728 + 80, 'round')
for n, b in UI.items(): boxes[n] = b + ('rect',)

def keyed(img):
    """weapons and cloaks: the background is a smooth gradient, so estimate it (a heavy blur that ignores the object) and keep what differs from it"""
    import cv2
    x = np.asarray(img).astype(np.float32); h, w, _ = x.shape
    border = np.zeros((h, w), np.float32); border[:10] = 1; border[-10:] = 1; border[:, :10] = 1; border[:, -10:] = 1
    mask = border.copy()
    for _ in range(3):
        num = cv2.GaussianBlur(x * mask[..., None], (0, 0), 28); den = cv2.GaussianBlur(mask, (0, 0), 28)[..., None]
        bg = num / np.maximum(den, 1e-3)
        d = np.linalg.norm(x - bg, axis=2)
        mask = np.maximum(border, (d < 22).astype(np.float32))
    a = np.clip((d - 24) / 30, 0, 1); a = cv2.GaussianBlur(a, (0, 0), 0.8)
    a = np.maximum(a, cv2.GaussianBlur((d > 34).astype(np.float32), (0, 0), 2.0) * 0.0)
    out = Image.fromarray(x.astype(np.uint8)).convert('RGBA'); out.putalpha(Image.fromarray((a * 255).astype(np.uint8))); return out

def soft(img, kind):
    w, h = img.size; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    if kind == 'round':
        r = np.hypot(xx - w / 2, yy - h / 2); a = np.clip((79 - r) / 10, 0, 1)
    else:
        f = 14.0; a = np.clip(np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)) / f, 0, 1)
        a = a * a * (3 - 2 * a)
    out = img.convert('RGBA'); out.putalpha(Image.fromarray((a * 255).astype(np.uint8))); return out

pieces = {n: (keyed(sheet.crop(b[:4])) if n.startswith(('weapon_', 'cloak_')) else soft(sheet.crop(b[:4]), b[4])) for n, b in boxes.items()}
W, x, y, row, pos = 1024, 2, 2, 0, {}
for n, p in sorted(pieces.items(), key=lambda k: -k[1].height):
    if x + p.width + 2 > W: x, y, row = 2, y + row + 2, 0
    pos[n] = [x, y, p.width, p.height]; x += p.width + 2; row = max(row, p.height)
atlas = Image.new('RGBA', (W, y + row + 2), (0, 0, 0, 0))
for n, p in pieces.items(): atlas.paste(p, tuple(pos[n][:2]))
od = os.path.join(ROOT, 'art', 'icons'); os.makedirs(od, exist_ok=True)
atlas.save(os.path.join(od, 'icons.webp'), quality=90, method=6)
open(os.path.join(ROOT, 'js', 'icons_meta.js'), 'w').write("'use strict';\n// made by tools/sprites/cut_icons.py: the owner's icons in art/icons/icons.webp as [x, y, w, h]\nconst ICON_RECTS = " + json.dumps(pos, separators=(',', ':')) + ";\n")
print(len(pos), 'icons', atlas.size, os.path.getsize(os.path.join(od, 'icons.webp')), 'bytes')
# a contact sheet for checking the crops
S = Image.new('RGB', (1700, 1000), (14, 18, 28)); cx = cy = 0; rh = 0
for n, p in pieces.items():
    if cx + p.width > 1700: cx = 0; cy += rh + 4; rh = 0
    S.paste(p, (cx, cy), p); cx += p.width + 4; rh = max(rh, p.height)
S.save('/tmp/icons_contact.png')
