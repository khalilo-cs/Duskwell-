#!/usr/bin/env python3
"""Cuts a parts sheet (parts spread over a flat grey background) into separate transparent PNGs.
usage: cut_parts.py sheet.png out_dir [--min-area N] [--tol T]
Background = pixels connected to the border whose colour is close to the border's median colour;
the soft edge of the outline is kept (alpha is feathered over a 1px band). Every connected piece
above min-area becomes parts_NN.png, plus a contact sheet (_index.png) with the numbers."""
import sys, os, numpy as np, cv2
from scipy import ndimage as ndi

def main():
    a = sys.argv[1:]
    src, out = a[0], a[1]
    min_area = int(a[a.index('--min-area') + 1]) if '--min-area' in a else 1500
    tol = float(a[a.index('--tol') + 1]) if '--tol' in a else 16
    im = cv2.imread(src, cv2.IMREAD_COLOR)           # BGR
    h, w = im.shape[:2]
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]).astype(np.float32)
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(im.astype(np.float32) - bg, axis=2)
    near = dist < tol
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge))
    fg = ~bgmask
    fg = ndi.binary_opening(fg, iterations=1)         # drop speckles
    fg = ndi.binary_fill_holes(fg)
    # peel the grey fringe: boundary pixels that are still grey-ish and close to the background colour
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    grey = (hsv[..., 1] < 40) & (dist < 75) & (hsv[..., 2] > 95)
    for _ in range(4):
        edge_px = fg & ~ndi.binary_erosion(fg)
        fg = fg & ~(edge_px & grey)
    # soft alpha: 1 inside, feathered 1px on the boundary
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 0.8)
    alpha = np.clip((alpha - 0.25) / 0.5, 0, 1)
    rgba = np.dstack([im, (alpha * 255).astype(np.uint8)])
    # pieces: merge nearby bits (fringe, tiny gaps) before labelling
    merged = ndi.binary_dilation(fg, iterations=int(a[a.index("--merge") + 1]) if "--merge" in a else 2)
    pl, pn = ndi.label(merged)
    boxes = ndi.find_objects(pl)
    os.makedirs(out, exist_ok=True)
    kept = []
    for i, sl in enumerate(boxes, 1):
        piece = (pl[sl] == i) & ndi.binary_dilation(fg[sl], iterations=2)
        if fg[sl][pl[sl] == i].sum() < min_area: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        crop = rgba[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(piece, crop[..., 3], 0)
        kept.append(((y0 + y1) // 2 // 120, x0, y0, x1, y1, crop))
    kept.sort(key=lambda k: (k[0], k[1]))
    idx = im.copy()
    for n_, (_, x0, y0, x1, y1, crop) in enumerate(kept, 1):
        cv2.imwrite(os.path.join(out, 'part_%02d.png' % n_), crop)
        cv2.rectangle(idx, (x0, y0), (x1, y1), (0, 200, 255), 2)
        cv2.putText(idx, str(n_), (x0 + 4, y0 + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)
        print('part_%02d' % n_, 'x=%d y=%d w=%d h=%d' % (x0, y0, x1 - x0, y1 - y0))
    cv2.imwrite(os.path.join(out, '_index.png'), idx)

main()
