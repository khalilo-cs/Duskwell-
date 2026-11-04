'use strict';
// Furnishings of the areas (js/decor_meta.js, made by tools/paint/decor.py): every room of an area that has its painted set gets
// lanterns, banners, cages and chandeliers hung from its ceilings, and candles, urns, rubble, braziers, pillars, arches, shrines,
// fences, ruins, tombs, statues and totems standing on its floors, chosen and placed from the room's own shape (the same every
// time), away from doors, benches, stations, signs and people. They are laid with the rock, behind everything that moves.
const Decor = (() => {
  const T = TILE, meta = typeof DECOR !== 'undefined' ? DECOR : {};
  const imgs = {};
  for (const t of Object.keys(meta)) { const im = new Image(); im.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; }; im.src = 'art/decor/' + t + '.webp'; imgs[t] = im; }
  const has = t => !!meta[t] && imgs[t] && imgs[t].complete && imgs[t].naturalWidth > 0;
  const HANG = ['lantern', 'banner', 'cage', 'chandelier', 'lantern', 'banner'];
  const SMALL = ['candles', 'urn', 'rubble', 'brazier', 'candles', 'rubble'];
  const BIG = ['pillar', 'arch', 'shrine', 'fence', 'ruin', 'tomb', 'statue', 'totem'];
  const H = { lantern: 2.2, banner: 3.2, cage: 2.6, chandelier: 2.2, candles: 1.1, urn: 1.6, rubble: 1.1, brazier: 1.8,
              pillar: 5, arch: 4.5, shrine: 2.6, fence: 1.6, ruin: 3, tomb: 2.2, statue: 4, totem: 3.6 };     // height in tiles
  const stats = { placed: 0 };
  function spots(L) {
    if (L._decor) return L._decor;
    const d = L.def || {}, busy = [].concat(d.doors || [], d.benches || [], d.stations || [], d.signs || [], d.npcs || [], d.items || []);
    const near = (x, y, r) => busy.some(q => Math.abs((q.x || 0) - x) < r && Math.abs((q.y || 0) - y) < 6);
    const S = (x, y) => L.get(x, y) === T_SOLID, A = (x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h && L.get(x, y) === T_AIR;
    const out = [], used = [];
    const free = (x, r) => !used.some(u => Math.abs(u - x) < r);
    let k = 0;
    // on the floors
    for (let y = 2; y < L.h - 1; y++) for (let x = 2; x < L.w - 2; x++) {
      if (!S(x, y + 1) || !A(x, y) || !A(x - 1, y) || !A(x + 1, y) || !S(x - 1, y + 1) || !S(x + 1, y + 1)) continue;
      let up = 0; while (A(x, y - up) && up < 9) up++;
      if (up < 3 || near(x, y, 4) || !free(x, 5)) continue;
      const v = hash2(x, y, 77); if (v > 0.33) continue;
      const big = up >= 6 && v < 0.14, list = big ? BIG : SMALL, n = list[(hash2(x, y, 5) * list.length) | 0];
      out.push({ n, x: x * T + T / 2, y: (y + 1) * T + 3, h: H[n] * T, back: big }); used.push(x); k++;
    }
    // under the ceilings
    for (let y = 1; y < L.h - 4; y++) for (let x = 2; x < L.w - 2; x++) {
      if (!S(x, y - 1) || !A(x, y)) continue;
      let dn = 0; while (A(x, y + dn) && dn < 9) dn++;
      if (dn < 6 || near(x, y + dn, 3) || !free(x, 4)) continue;
      if (hash2(x, y, 91) > 0.18) continue;
      const n = HANG[(hash2(x, y, 13) * HANG.length) | 0];
      out.push({ n, x: x * T + T / 2, y: y * T - 2, h: H[n] * T, hang: true }); used.push(x);
    }
    return (L._decor = out);
  }
  function lay(g, L, th) {
    const t = L.def && L.def.theme; if (!has(t)) return;
    const im = imgs[t], m = meta[t];
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const s of spots(L)) {
      const r = m[s.n]; if (!r) continue;
      const h = s.h, w = h * r[2] / r[3];
      g.globalAlpha = s.back ? 0.82 : 1;
      if (s.back) g.filter = 'brightness(0.72)';
      g.drawImage(im, r[0], r[1], r[2], r[3], s.x - w / 2, s.hang ? s.y : s.y - h, w, h);
      g.filter = 'none';
      stats.placed++;
    }
    g.restore();
  }
  for (const t of Object.keys(meta)) {
    const h = Art.tileHooks[t]; if (!h) continue;
    const old = h.scenery;
    h.scenery = (g, L, th, isS, seed) => { lay(g, L, th); if (old) old(g, L, th, isS, seed); };
  }
  return { has, stats, spots };
})();
