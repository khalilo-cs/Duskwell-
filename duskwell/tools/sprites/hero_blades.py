#!/usr/bin/env python3
"""Finds the sword in each hero frame so that another weapon can take its place.
hero_blades.json holds a hand-marked rough line per blade ([grip x, grip y, tip x, tip y] in the frame's pixels); this snaps
every line onto the drawing and writes hero_blades_fit.json.
usage: python3 tools/sprites/hero_blades.py [--show out.jpg frame ...]"""
import json, os, sys
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
FR = os.path.join(ROOT, 'art', 'source', 'hero_hd', 'frames')

def blade_pixels(im):
    a = im[..., 3]; hsv = cv2.cvtColor(np.ascontiguousarray(im[..., :3]), cv2.COLOR_BGR2HSV)
    glow = (hsv[..., 0] >= 70) & (hsv[..., 0] <= 105) & (hsv[..., 1] > 45) & (hsv[..., 2] > 140)
    return (a > 150) & (hsv[..., 2] > 105) & (hsv[..., 1] < 75) & ~glow

def snap(im, rough, corridor=6):
    g = np.array(rough[:2], float); t = np.array(rough[2:4], float)
    d = t - g; L = np.linalg.norm(d)
    if L < 1: return rough
    d /= L; n = np.array([-d[1], d[0]])
    ys, xs = np.where(blade_pixels(im)); P = np.stack([xs, ys], 1).astype(float)
    pr = (P - g) @ d; off = (P - g) @ n
    sel = (pr > -0.25 * L) & (pr < 1.25 * L) & (np.abs(off) <= corridor)
    Q = P[sel]
    if len(Q) < 10: return [round(float(v), 1) for v in rough[:4]]
    best = None                                                       # RANSAC: the line through most of the pixels
    rng = np.random.default_rng(1)
    for _ in range(300):
        i, j = rng.choice(len(Q), 2, replace=False); e = Q[j] - Q[i]; le = np.linalg.norm(e)
        if le < 6: continue
        e /= le
        if abs(e @ d) < 0.8: continue
        m = np.array([-e[1], e[0]]); inl = np.abs((Q - Q[i]) @ m) <= 1.6
        if best is None or inl.sum() > best[0]: best = (inl.sum(), inl)
    if best is None or best[0] < 8: return [round(float(v), 1) for v in rough[:4]]
    I = Q[best[1]]; c = I.mean(0); _, _, vt = np.linalg.svd(I - c); e = vt[0]
    if e @ d < 0: e = -e
    p = (I - c) @ e
    a0, a1 = np.percentile(p, 1), np.percentile(p, 99)
    return [round(float(v), 1) for v in [*(c + e * a0), *(c + e * a1)]]

def main():
    rough = json.load(open(os.path.join(HERE, 'hero_blades.json')))
    fit = {}
    for name, blades in rough.items():
        if name.startswith('_'): continue
        im = cv2.imread(os.path.join(FR, name + '.png'), cv2.IMREAD_UNCHANGED)
        fit[name] = [snap(im, b) if (len(b) < 5 or b[4] != 'exact') else b[:4] for b in blades]
    json.dump(fit, open(os.path.join(HERE, 'hero_blades_fit.json'), 'w'), indent=0)
    if '--show' in sys.argv:
        k = sys.argv.index('--show'); out = sys.argv[k + 1]; names = sys.argv[k + 2:] or list(fit)
        tiles = []
        for nm in names:
            im = cv2.imread(os.path.join(FR, nm + '.png'), cv2.IMREAD_UNCHANGED)
            v = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR).copy(); v[im[..., 3] < 20] = (70, 100, 70); S = 3
            v = cv2.resize(v, None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
            for k2, b in enumerate(fit.get(nm, [])):
                cv2.line(v, (int(b[0] * S), int(b[1] * S)), (int(b[2] * S), int(b[3] * S)), (0, 0, 255) if k2 == 0 else (255, 0, 255), 2)
                cv2.circle(v, (int(b[0] * S), int(b[1] * S)), 5, (255, 200, 0), -1)
            pad = np.zeros((v.shape[0] + 20, v.shape[1], 3), np.uint8); pad[20:] = v
            cv2.putText(pad, nm, (4, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2); tiles.append(pad)
        rows, cur = [], []
        for t in tiles:
            cur.append(t)
            if sum(x.shape[1] + 6 for x in cur) > 1950: rows.append(cur[:-1]); cur = [cur[-1]]
        rows.append(cur)
        H = [max(t.shape[0] for t in r) for r in rows]
        img = np.zeros((sum(H) + 6 * len(rows), 1960, 3), np.uint8); y = 0
        for r, h in zip(rows, H):
            x = 0
            for t in r: img[y:y + t.shape[0], x:x + t.shape[1]] = t; x += t.shape[1] + 6
            y += h + 6
        cv2.imwrite(out, img)
    print(len(fit), 'frames')

if __name__ == '__main__':
    main()
