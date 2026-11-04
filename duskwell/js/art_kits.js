'use strict';
// Painted terrain kits (js/kits_meta.js, made by tools/paint/kits.py): in an area that has its own kit, the breakable walls, arena
// gates, spikes, crumbling ledges and moving platforms are drawn from its pieces (art/kits/<theme>.webp), in the stone and light of
// that area. Elsewhere, and until the picture loads, the shared drawings of art_world_hd.js are used.
const Kits = (() => {
  const T = TILE, meta = typeof KITS !== 'undefined' ? KITS : {};
  const imgs = {};
  for (const t of Object.keys(meta)) {
    const im = new Image();
    im.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; };     // bake the spikes again, now from the kit
    im.src = 'art/kits/' + t + '.webp'; imgs[t] = im;
  }
  const has = t => !!t && !!meta[t] && !!imgs[t] && imgs[t].complete && imgs[t].naturalWidth > 0;
  const stats = { walls: 0, gates: 0, spikes: 0, ledges: 0, movers: 0, plats: 0 };
  const smooth = g => { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; };

  // tiles of one kind that touch, as one rectangle (cached on the level, per tile)
  function groupOf(L, x, y, kind, key) {
    const cache = L[key] || (L[key] = {});
    const id = x + ',' + y; if (cache[id]) return cache[id];
    let x0 = x, x1 = x, y0 = y, y1 = y; const st = [[x, y]], seen = new Set([id]);
    while (st.length) {
      const [a, b] = st.pop(); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
      for (const [c, d] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) { const k = c + ',' + d; if (!seen.has(k) && L.get(c, d) === kind) { seen.add(k); st.push([c, d]); } }
    }
    const grp = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    for (const k of seen) cache[k] = grp;
    return grp;
  }
  // a breakable wall is laid of the area's cracked blocks, each about as big as the wall is thick (one to three tiles) and every
  // one whole (a little taller or wider where the wall needs it); the part of the picture that tile (x, y) shows
  function wallPart(t, grp, x, y) {
    const r = meta[t].wall, B = T * Math.max(1, Math.min(grp.w, grp.h, 3)), W = grp.w * T, H = grp.h * T;
    const bw = W / Math.max(1, Math.round(W / B)), bh = H / Math.max(1, Math.round(H / B));
    const ox = ((x - grp.x) * T) % bw, oy = ((y - grp.y) * T) % bh, kx = r[2] / bw, ky = r[3] / bh;
    const w = Math.max(0.25, Math.min(T, bw - ox)), h = Math.max(0.25, Math.min(T, bh - oy));   // a tile across two blocks: the rest of the first here
    return [r[0] + ox * kx, r[1] + oy * ky, w * kx, h * ky, w, h];
  }
  const oldBreak = Art.drawBreak;
  Art.drawBreak = function (g, x, y, th, t) {
    const n = th && th.name;
    if (!has(n)) return oldBreak(g, x, y, th, t);
    const grp = groupOf(G.level, x, y, T_BREAK, '_kbrk');
    g.save(); smooth(g);
    // a tile may hold the end of one block and the start of the next: draw both parts
    for (let dy = 0; dy < T; ) {
      let hh = T;
      for (let dx = 0; dx < T; ) {
        const s = wallPart(n, grp, x + dx / T, y + dy / T);
        g.drawImage(imgs[n], s[0], s[1], s[2], s[3], x * T + dx - 0.4, y * T + dy - 0.4, s[4] + 0.8, s[5] + 0.8);
        dx += s[4]; hh = s[5];
      }
      dy += hh;
    }
    g.restore();
    stats.walls++;
  };
  // an arena gate: the area's barred door in its arch, standing on the floor of the opening, the arch rising a little above it
  const oldGate = Art.drawGate;
  let gateFrame = -1, gateDone = new Set(), gateCache = {};
  Art.drawGate = function (g, x, y, th, t) {
    const n = th && th.name;
    if (!has(n)) return oldGate(g, x, y, th, t);
    if (gateFrame !== t) { gateFrame = t; gateDone = new Set(); gateCache = {}; }
    const L = G.level, grp = groupOf({ get: (a, b) => L.get(a, b), _g: gateCache }, x, y, T_GATE, '_g');
    const id = grp.x + ',' + grp.y; if (gateDone.has(id)) return; gateDone.add(id);
    const r = meta[n].gate, W = grp.w * T, H = grp.h * T;
    const dh = H + Math.min(44, H * 0.22), dw = Math.max(W / 0.45, dh * r[2] / r[3]);
    g.save(); smooth(g);
    g.drawImage(imgs[n], r[0], r[1], r[2], r[3], grp.x * T + W / 2 - dw / 2, (grp.y + grp.h) * T + 2 - dh, dw, dh);
    g.restore();
    stats.gates++;
  };
  // spikes (baked with the rock): a tile-wide part of the area's row of spikes, taken at a different place for every tile
  const oldSpikes = drawSpikes;
  drawSpikes = function (g, th, px, py, v) {
    const n = th && th.name;
    if (!has(n)) return oldSpikes(g, th, px, py, v);
    const r = meta[n].spikes, H = 31, k = H / r[3], sw = T / k, span = r[2] * 0.9 - sw;
    const sx = r[0] + r[2] * 0.05 + (span > 0 ? (px / k) % span : 0);
    g.save(); smooth(g); g.drawImage(imgs[n], sx, r[1], Math.min(sw, r[2]), r[3], px - 0.3, py + T - H, T + 0.6, H); g.restore();
    stats.spikes++;
  };
  // a piece laid along a run from x to x + w, its walking line at y, dh px thick: its two ends as painted, its middle repeated
  // as often as the run needs (so a long ledge is not a stretched short one)
  function strip(g, n, piece, x, y, w, dh) {
    const r = meta[n][piece], k = dh / r[3], cap = r[2] * 0.2, capW = cap * k, top = y - r[4] * k;
    const draw = (sx, sw, dx, dw) => g.drawImage(imgs[n], r[0] + sx, r[1], sw, r[3], dx, top, dw, dh);
    if (w <= 2 * capW + 4) { g.drawImage(imgs[n], r[0], r[1], r[2], r[3], x, top, w, dh); return dh; }
    draw(0, cap, x, capW + 0.5); draw(r[2] - cap, cap, x + w - capW - 0.5, capW + 0.5);
    const mid = r[2] - 2 * cap, midW = mid * k;
    g.save(); g.beginPath(); g.rect(x + capW, top - 2, w - 2 * capW, dh + 4); g.clip();
    for (let px = x + capW, i = 0; px < x + w - capW; px += midW - 1, i++) draw(cap, mid, px, midW + 0.5);
    g.restore();
    return dh;
  }
  const slab = (g, n, piece, x, y, w, lo, hi) => strip(g, n, piece, x, y, w, clamp(w * meta[n][piece][3] / meta[n][piece][2], lo, hi));
  // crumbling ledges: whole, then cracked while they shake (shaking harder and darker in the second half); their falling bits are
  // small pieces of the same slab
  function crumble(g, n, c) {
    if (c.state !== 'gone') {
      const w = c.w * T + 10, late = c.state === 'shake' && c.t >= CRUMBLE_DELAY * 0.5;
      const jx = c.state === 'shake' ? rand(-1.5, 1.5) * (1 + c.t * 3) : 0, jy = late ? rand(-0.8, 0.8) : 0;
      g.save(); g.globalAlpha *= c.fade; smooth(g);
      if (late) g.filter = 'brightness(0.78)';
      slab(g, n, c.state === 'shake' ? 'ledge_crack' : 'ledge', c.x * T - 5 + jx, c.y * T - 2 + jy, w, 24, 46);
      g.restore();
      stats.ledges++;
    }
    const r = meta[n].ledge;
    for (const ch of c.chunks) {
      const s = ch.s * 2.2, u = (Math.abs(ch.x * 7.3) % 1) * (r[2] - s * 4);
      g.save(); g.translate(ch.x, ch.y); g.rotate(ch.rot); g.globalAlpha = Math.min(1, ch.life * 2); smooth(g);
      g.drawImage(imgs[n], r[0] + u, r[1] + r[3] * 0.25, s * 4, s * 4 * 0.6, -s, -s * 0.6, s * 2, s * 1.2);
      g.restore();
    }
  }
  // a moving platform: the area's deck, dim when it has no power, its core glowing when it has
  function mover(g, n, mv, t, th) {
    g.save(); smooth(g); if (!mv.powered()) g.filter = 'brightness(0.62)';
    const dh = slab(g, n, 'mover', mv.x - 6, mv.y - 1, mv.w + 12, 22, 40);
    g.restore();
    if (mv.powered()) bloom(g, mv.x + mv.w / 2, mv.y + dh * 0.62, 40, th.glow, 0.2 + 0.07 * Math.sin(t * 6 + mv.ax));
    stats.movers++;
  }
  const oldFront = Art.mechFront;
  Art.mechFront = function (g, t, th) {
    const m = typeof G !== 'undefined' && G.mech, n = th && th.name;
    if (!m || !has(n)) return oldFront(g, t, th);
    const crumbles = m.crumbles, movers = m.movers;                      // the rest of the machinery as it was
    m.crumbles = []; m.movers = [];
    try { oldFront(g, t, th); } finally { m.crumbles = crumbles; m.movers = movers; }
    for (const c of crumbles) crumble(g, n, c);
    for (const mv of movers) mover(g, n, mv, t, th);
  };
  // the one-way ledges of the rooms: the area's floating ledge, its top on the walking line
  for (const n of Object.keys(meta)) {
    const prev = Art.tileHooks[n];
    Art.tileHooks[n] = Object.assign({}, prev, {
      ready: () => has(n) || !!(prev && prev.ready && prev.ready()),
      plats: (g, L, th) => {
        if (!has(n)) return !!(prev && prev.plats && prev.plats(g, L, th));
        g.save(); smooth(g);
        for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
          if (L.get(x, y) !== T_ONEWAY) continue;
          let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_ONEWAY) x1++;
          strip(g, n, 'ledge', x * T - 4, y * T + 1, (x1 - x + 1) * T + 8, 30);
          stats.plats++; x = x1;
        }
        g.restore();
        return true;
      },
    });
  }
  // the bits of a broken wall fly from the blocks it was laid of
  const oldFx = Art.drawFx;
  Art.drawFx = function (g, f) {
    const L = typeof G !== 'undefined' && G.level, n = L && L.def && L.def.theme;
    if (f.type === 'wallbit' && has(n) && L._kbrk) {
      const tx = Math.round(f.x / T), ty = Math.round(f.y / T), grp = L._kbrk[tx + ',' + ty];
      if (grp) {
        const s = wallPart(n, grp, tx, ty), a = 1 - f.t / f.life, dy = 0.5 * 900 * f.t * f.t;   // its first part is enough for a falling bit
        g.save(); g.globalAlpha *= a; smooth(g); g.filter = 'brightness(0.7)';
        g.translate(f.x + f.vx * f.t + T / 2, f.y + dy + T / 2); g.rotate(f.vx * f.t * 0.02);
        g.drawImage(imgs[n], s[0], s[1], s[2], s[3], -T / 2, -T / 2, T, T);
        g.restore();
        return;
      }
    }
    return oldFx(g, f);
  };
  return { has, stats, themes: Object.keys(meta) };
})();
