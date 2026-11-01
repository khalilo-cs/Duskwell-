'use strict';
// The painted set pieces of the Ossuary, the Lunar Observatory and the Mirror Vault (art/props/canva_<theme>.webp, cut by
// tools/sprites/cut_canva.py): big pieces stand dim at the back of the floors (arches, gates, walls of bone, mirrors), plaques,
// windows and torches sit on the back wall, banners, chains, bells and lanterns hang from the ceilings, and the small things
// (statues, chests, telescopes, crystals) stand on the floors. Laid with the rock, the same way on every visit.
const SetPieces = (() => {
  const imgs = {};
  for (const th of Object.keys(typeof SETPIECES !== 'undefined' ? SETPIECES : {})) {
    const im = new Image(); im.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; };   // lay the rooms again with them
    im.src = 'art/props/canva_' + th + '.webp'; imgs[th] = im;
  }
  const ready = th => !!imgs[th] && imgs[th].complete && imgs[th].naturalWidth > 0;
  // how big each kind is drawn (px): from the height on the sheet, kept between these
  const SIZE = { d: [110, 200], w: [40, 96], h: [50, 150], s: [36, 84] };
  // one piece of a kind for about this many tiles of room width, and how it is shaded
  const EVERY = { d: 16, w: 13, h: 11, s: 9 };
  const SHADE = { d: 'brightness(0.5) saturate(0.9)', w: 'brightness(0.68)', h: 'brightness(0.8)', s: 'brightness(0.86)' };
  const stats = { theme: '', placed: { d: 0, w: 0, h: 0, s: 0 }, boxes: [] };

  function lay(g, L, th, isS, seed) {
    const theme = L.def.theme, all = SETPIECES[theme]; if (!all || !ready(theme)) return;
    const T = TILE, def = L.def, keep = [], used = [];
    stats.theme = theme; stats.placed = { d: 0, w: 0, h: 0, s: 0 }; stats.boxes = [];
    for (const d of def.doors || []) keep.push([d.x - 2, d.y - 2, d.w + 4, d.h + 4]);
    for (const q of [].concat(def.benches || [], def.stations || [], def.signs || [], def.npcs || [], def.items || [], def.mech || [])) keep.push([q.x - 2, q.y - 4, 5, 6]);
    const air = (x, y) => L.get(x, y) === T_AIR;
    const clear = (x0, y0, w, h) => {                                   // a box of tiles (x0, y0 top-left) free of doors, things and other pieces
      if (keep.some(k => x0 < k[0] + k[2] && x0 + w > k[0] && y0 < k[1] + k[3] && y0 + h > k[1])) return false;
      return !used.some(u => x0 < u[0] + u[2] + 1 && x0 + w > u[0] - 1 && y0 < u[1] + u[3] && y0 + h > u[1]);
    };
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const kind of ['d', 'w', 'h', 's']) {
      const list = all.filter(r => r[4] === kind); if (!list.length) continue;
      const want = Math.max(1, Math.floor(L.w / EVERY[kind]));
      for (const thr of [0.08, 0.25, 0.6]) for (let y = kind === 'h' ? 0 : 2; y < L.h - 1 && stats.placed[kind] < want; y++) for (let x = 2; x < L.w - 2 && stats.placed[kind] < want; x++) {
        if (hash2(x, y, seed + 700 + kind.charCodeAt(0)) > thr) continue;
        const r = list[Math.floor(hash2(x, y, seed + 710 + kind.charCodeAt(0)) * list.length)];
        let h = Math.max(SIZE[kind][0], Math.min(SIZE[kind][1], r[5] * 0.3)), w = h * r[2] / r[3];
        if (w > 220) { h *= 220 / w; w = 220; }
        const fw = Math.max(1, Math.ceil(w / T)), fh = Math.max(1, Math.ceil(h / T)), x0 = x - Math.floor(fw / 2);
        if (x0 < 1 || x0 + fw > L.w - 1) continue;
        let top, bh = fh + 1, px, py;                                                // the box it takes (tiles) and where the picture goes (its bottom middle, px)
        if (kind === 'h') {                                             // under rock, free air below
          if (L.get(x, y) !== T_SOLID || !air(x, y + 1)) continue;
          let ok = true; for (let i = 0; ok && i < fw; i++) { if (L.get(x0 + i, y) !== T_SOLID) ok = false; for (let j = 1; ok && j <= fh + 2; j++) if (!air(x0 + i, y + j)) ok = false; }
          if (!ok) continue; top = y + 1; px = (x0 + fw / 2) * T; py = (y + 1) * T - 2 + h;
        } else {                                                        // on a floor (the wall pieces float a little above it)
          if (L.get(x, y) !== T_SOLID || isS(x, y - 1) || !air(x, y - 1)) continue;
          const lift = kind === 'w' ? 2 + Math.floor(hash2(x, y, seed + 720) * 3) : 0, need = fh + lift + (kind === 'd' ? 0 : 1);
          let ok = true; for (let i = 0; ok && i < fw; i++) { if (L.get(x0 + i, y) !== T_SOLID || isS(x0 + i, y - 1)) ok = false; for (let j = 1; ok && j <= need; j++) if (!air(x0 + i, y - j)) ok = false; }
          if (!ok) continue; top = y - need; bh = need; px = (x0 + fw / 2) * T; py = (y - lift) * T + (kind === 'w' ? 0 : 3);
        }
        if (!clear(x0, top, fw, bh)) continue;
        used.push([x0, top, fw, bh]); stats.placed[kind]++; stats.boxes.push([kind, x0, top, fw, bh]);
        const flip = kind !== 'w' && hash2(x, y, seed + 730) < 0.5;
        g.save(); g.translate(px, py); if (flip) g.scale(-1, 1);
        g.filter = SHADE[kind]; g.globalAlpha = kind === 'd' ? 0.88 : 1;
        g.drawImage(imgs[theme], r[0], r[1], r[2], r[3], -w / 2, -h, w, h);
        g.restore();
      }
    }
    g.restore();
  }
  // laid after the rock and the other props of the tile hooks of the three areas
  const seen = new Set();
  for (const th of Object.keys(imgs)) {
    const h = Art.tileHooks[th]; if (!h || seen.has(h)) continue; seen.add(h);
    const old = h.scenery;
    h.scenery = old ? (g, L, t, isS, seed) => { old(g, L, t, isS, seed); lay(g, L, t, isS, seed); } : lay;
  }
  return { ready, stats, lay };
})();
