#!/usr/bin/env python3
"""Cuts the wizard (art/source/npc_hd/sheet_wizard.png) for the town's Elder: the standing figure without its ground
shadow, into art/npc/wizard.webp and js/wizard_meta.js (size, feet, crystal and lantern points, where the cloak starts)."""
import json, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from cut_world import background, cut
SRC = os.path.join(ROOT, 'art', 'source', 'npc_hd', 'sheet_wizard.png')
PACK = 0.5
BOX = (298, 18, 996, 672)
# the ground shadow, outside the boots and the staff's foot
OFF = [(285, 656, 413, 680), (432, 659, 441, 680), (543, 658, 564, 680), (646, 656, 905, 680)]
# on the sheet: the staff's crystal (its glow), the lantern on the pack, the left edge of the part of the cloak that flutters
CRYSTAL, LANTERN, TAIL_X, BOOTS_X = (358, 102), (778, 284), 775, 543.5       # (BOOTS_X: the middle between the two boots)

def main():
    img = cv2.imread(SRC); bg = background(img)
    p, org = cut('wizard', 'wiz', BOX, {'off': OFF, 'pocket': 30, 'holefill': 0}, img, bg)
    out = os.path.join(ROOT, 'art', 'source', 'npc_hd', 'cut'); os.makedirs(out, exist_ok=True); p.save(os.path.join(out, 'wizard.png'))
    q = p.resize((round(p.width * PACK), round(p.height * PACK)), Image.LANCZOS)
    od = os.path.join(ROOT, 'art', 'npc'); os.makedirs(od, exist_ok=True)
    q.save(os.path.join(od, 'wizard.webp'), quality=92, method=6)
    pt = lambda xy: [round((xy[0] - org[0]) * PACK, 1), round((xy[1] - org[1]) * PACK, 1)]
    a = np.array(q)[..., 3]; ys, xs = np.where(a > 128)
    meta = {'w': q.width, 'h': q.height, 'feet': [round((BOOTS_X - org[0]) * PACK, 1), int(ys.max()) + 1],
            'crystal': pt(CRYSTAL), 'lantern': pt(LANTERN), 'tailX': round((TAIL_X - org[0]) * PACK, 1)}
    open(os.path.join(ROOT, 'js', 'wizard_meta.js'), 'w').write(
        "'use strict';\n// made by tools/sprites/cut_wizard.py: the wizard (the town's Elder) in art/npc/wizard.webp, facing left\n"
        "// feet: the point on the ground the figure stands on; crystal, lantern: where its lights are; tailX: from where the cloak flutters\n"
        "const WIZARD = " + json.dumps(meta, separators=(',', ':')) + ";\n")
    print(q.size, os.path.getsize(os.path.join(od, 'wizard.webp')), 'bytes', meta)

if __name__ == '__main__':
    main()
