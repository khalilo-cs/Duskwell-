"""Splitting one row of a drawn animation sheet into its frames (used by cut_anims.py and cut_hero_anims.py).
frames_of_row(im, fg, y0, y1, N, cuts, base, ground, off) -> [(rgba, ax, ay)]: the frames left to right, each cut out with its
pieces (every separate piece goes to the frame whose body it is nearest), and its anchor (ax, ay): the ground point under the body."""
import numpy as np, cv2
from scipy.ndimage import gaussian_filter1d
from scipy import ndimage as ndi

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
