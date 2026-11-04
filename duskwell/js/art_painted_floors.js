'use strict';
// Painted floors: for every area listed in FLOOR_ART (js/floors_meta.js, made by tools/paint/floors.py) the rock of the rooms is
// laid from a seamless painted texture of that area (art/floors/<theme>_fill.webp) and every walkable top, underside and one-way
// ledge from its painted edge strip (art/floors/<theme>_top.webp), so the ground is painted in the same hand and palette as the
// backdrop behind it. Until the pictures load (or for an area without them) the previous hook of the area draws the rock.
const PaintedFloors = (() => {
  const T = TILE, INK = '#030508';
  const FILL_P = 256;                       // logical px covered by one copy of the fill texture
  const TOP_H = 34;                         // logical px height of the painted top edge
  const stats = { renders: 0, tops: 0, unders: 0, ledges: 0, theme: '' };
  const meta = typeof FLOOR_ART !== 'undefined' ? FLOOR_ART : {};
  const imgs = {};
  const load = (t, k) => {
    const key = t + '_' + k;
    if (!imgs[key]) { const im = new Image(); im.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; }; im.src = 'art/floors/' + key + '.webp'; imgs[key] = im; }
    return imgs[key];
  };
  const ok = im => !!im && im.complete && im.naturalWidth > 0;
  const has = t => !!meta[t] && ok(load(t, 'fill')) && ok(load(t, 'top'));

  // a run of the painted edge from x0 to x1, its surface line at y; flip: hung upside down under an overhang
  function edge(g, t, x0, x1, y, h, flip, alpha) {
    const im = load(t, 'top'), m = meta[t], k = h / im.naturalHeight, P = im.naturalWidth * k;   // P: logical px of one copy
    const top = y - m.surf * k;                                    // the strip's own surface sits on the line
    g.save(); g.beginPath(); g.rect(x0 - 3, flip ? y - h * 0.15 : top - 2, x1 - x0 + 6, h * 1.2); g.clip();
    if (alpha != null) g.globalAlpha *= alpha;
    let x = Math.floor((x0 - 3) / P) * P;
    for (; x < x1 + 3; x += P) {
      if (flip) { g.save(); g.translate(0, 2 * y); g.scale(1, -1); g.drawImage(im, x, top, P + 0.5, h); g.restore(); }
      else g.drawImage(im, x, top, P + 0.5, h);
    }
    g.restore();
  }
  // the rock of a room
  function solid(g, L, th, isS, seed) {
    const t = L.def.theme, im = load(t, 'fill'), k = im.naturalWidth / FILL_P;
    stats.renders++; stats.theme = t; stats.tops = stats.unders = stats.ledges = 0;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const px = x * T, py = y * T, sx = (px % FILL_P) * k, sy = (py % FILL_P) * k;
      g.drawImage(im, sx, sy, T * k, T * k, px - 0.25, py - 0.25, T + 0.5, T + 0.5);
      let air = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!isS(x + i, y + j)) air++;
      const a = 0.45 * (1 - clamp(air / 10, 0, 1));                  // deep rock lies darker, the rock at an edge keeps its colour
      if (a > 0.01) { g.fillStyle = 'rgba(2,3,10,' + a.toFixed(3) + ')'; g.fillRect(px, py, T, T); }
    }
    // sides: an ink edge with a thin light line of the area inside it
    const hi = meta[t].hi;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const px = x * T, py = y * T, eT = !isS(x, y - 1), eL = !isS(x - 1, y), eR = !isS(x + 1, y), y0 = py + (eT ? 8 : 0);
      for (const [on, ex, dir] of [[eL, px, 1], [eR, px + T, -1]]) {
        if (!on) continue;
        g.fillStyle = INK; g.fillRect(dir > 0 ? ex - 2.5 : ex - 1.5, y0, 4, py + T - y0);
        g.fillStyle = hi; g.globalAlpha = 0.3; g.fillRect(dir > 0 ? ex + 1.5 : ex - 3.1, y0, 1.6, py + T - y0); g.globalAlpha = 1;
      }
    }
    // undersides: the painted edge hung upside down, darker
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID || isS(x, y + 1)) continue;
      let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y + 1)) x1++;
      const yb = (y + 1) * T;
      edge(g, t, x * T, (x1 + 1) * T, yb, TOP_H * 0.8, true, 0.95);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x * T, yb - 8, (x1 - x + 1) * T, 8);
      stats.unders++; x = x1;
    }
    // tops: the painted edge along every free-standing floor
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID || isS(x, y - 1)) continue;
      let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y - 1)) x1++;
      edge(g, t, x * T, (x1 + 1) * T, y * T + 3, TOP_H, false);
      stats.tops++; x = x1;
    }
    // slippery ice keeps its glaze
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.get(x, y) === T_SOLID && L.isIce && L.isIce(x, y)) {
      g.fillStyle = 'rgba(190,235,255,0.35)'; g.fillRect(x * T, y * T, T, T);
    }
    return true;
  }
  // one-way ledges: a slab of the rock under a run of the painted edge
  function plats(g, L) {
    const t = L.def.theme, im = load(t, 'fill'), k = im.naturalWidth / FILL_P;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_ONEWAY) continue;
      let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_ONEWAY) x1++;
      const x0p = x * T, x1p = (x1 + 1) * T, py = y * T;
      g.save(); g.beginPath(); g.roundRect(x0p - 2, py + 2, x1p - x0p + 4, 12, 4); g.clip();
      for (let px = x0p - 2; px < x1p + 2; px += T) g.drawImage(im, (((px % FILL_P) + FILL_P) % FILL_P) * k, ((py % FILL_P) + FILL_P) % FILL_P * k, T * k, 12 * k, px, py + 2, T + 0.5, 12);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0p - 2, py + 9, x1p - x0p + 4, 5);
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); g.roundRect(x0p - 2, py + 2, x1p - x0p + 4, 12, 4); g.stroke();
      edge(g, t, x0p - 2, x1p + 2, py + 3, TOP_H * 0.62, false);
      stats.ledges++; x = x1;
    }
    return true;
  }
  // wrap the hook of every area that has painted floors: the painted rock once loaded, the old drawing until then;
  // its scenery (props, hangings) stays as it was
  for (const t of Object.keys(meta)) {
    const prev = Art.tileHooks[t];
    load(t, 'fill'); load(t, 'top');
    Art.tileHooks[t] = {
      ready: () => has(t) || !!(prev && prev.ready()),
      solid: (g, L, th, isS, seed) => has(t) ? solid(g, L, th, isS, seed) : !!(prev && prev.solid(g, L, th, isS, seed)),
      plats: (g, L, th) => has(t) ? plats(g, L, th) : !!(prev && prev.plats(g, L, th)),
      // the mossy sheet still sets its things in its areas; with painted rock its own rock pass (which starts its count) does not run
      scenery: prev && prev.scenery ? (g, L, th, isS, seed) => {
        if (has(t) && typeof MossTiles !== 'undefined' && MossTiles.THEMES[t]) { const s = MossTiles.stats; s.props = []; s.hangs = []; s.theme = t; }
        prev.scenery(g, L, th, isS, seed);
      } : undefined,
    };
  }
  // the floors that only a dive breaks: the same painted rock, with the glowing cracks the hero is to look for
  const oldCrack = Art.drawCrack;
  Art.drawCrack = function (g, x, y, th, t) {
    const name = th && th.name;
    if (!has(name)) return oldCrack(g, x, y, th, t);
    const im = load(name, 'fill'), k = im.naturalWidth / FILL_P, px = x * T, py = y * T, v = hash2(x, y, 51);
    g.save(); g.imageSmoothingEnabled = true;
    g.drawImage(im, (px % FILL_P) * k, (py % FILL_P) * k, T * k, T * k, px - 0.4, py - 0.4, T + 0.8, T + 0.8); g.restore();
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
    g.strokeStyle = rgba(th.glow, 0.55 + 0.3 * Math.sin(t * 2 + x)); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(px + 2, py + 10 + v * 8); g.lineTo(px + 12, py + 16); g.lineTo(px + 20, py + 8 + v * 6); g.lineTo(px + 30, py + 18); g.moveTo(px + 12, py + 16); g.lineTo(px + 14, py + 30); g.stroke();
  };
  return { stats, has, themes: Object.keys(meta) };
})();
