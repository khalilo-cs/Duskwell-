'use strict';
// Crystal Spires tiles from art/tiles/crystal.webp, laid piece by piece: rock fill blocks, trim along the floors,
// stalactite fringes under rock, ledges for one-way plates and scenery. Hooked in through Art.tileHooks (art_world.js).
const CrystalTiles = (() => {
  const img = new Image();
  img.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; };         // lay the rooms again, now from the pieces
  img.src = 'art/tiles/crystal.webp';
  const ready = () => typeof CRYSTAL_TILES !== 'undefined' && img.complete && img.naturalWidth > 0;
  // screen px per atlas px
  const U = 0.914;                                         // screen px per atlas px (the atlas is half the sheet, drawn at 0.457)
  // rectangle of a piece in the atlas
  const R = n => CRYSTAL_TILES[n];
  // edge colour
  const INK = '#040a12';
  // what was laid in the last room (read by the tests)
  const stats = { renders: 0, fills: 0, trims: 0, fringes: 0, ledges: 0, cracks: 0, placed: [] };      // what was laid in the last room (the tests read it)
  // a part of piece n (fractions of it) put at (dx, dy, dw, dh); flip mirrors it left to right
  function part(g, n, fx0, fy0, fx1, fy1, dx, dy, dw, dh, flip) {
    const r = R(n), sx = r[0] + r[2] * fx0, sy = r[1] + r[3] * fy0, sw = r[2] * (fx1 - fx0), sh = r[3] * (fy1 - fy0);
    if (flip) { g.save(); g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh); g.restore(); }
    else g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  // ---------------------------------------------------------------- the rock, its tops, its undersides and its sides
  function solid(g, L, th, isS, seed) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    stats.renders++; stats.fills = stats.trims = stats.fringes = stats.ledges = 0; stats.placed = [];
    const T = TILE, FILLS = ['fill_0', 'fill_1', 'fill_2'];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const bx = x >> 1, by = y >> 1, k = Math.min(2, Math.floor(hash2(bx, by, seed + 31) * 3)), fx = hash2(bx, by, seed + 57) < 0.5, fy = hash2(bx, by, seed + 58) < 0.5;
      const qx = (x & 1) ^ (fx ? 1 : 0), qy = (y & 1) ^ (fy ? 1 : 0), px = x * T, py = y * T;
      const r = R(FILLS[k]);
      g.save(); g.translate(px + (fx ? T : 0), py + (fy ? T : 0)); g.scale(fx ? -1 : 1, fy ? -1 : 1);
      g.drawImage(img, r[0] + qx * r[2] / 2, r[1] + qy * r[3] / 2, r[2] / 2, r[3] / 2, -0.25, -0.25, T + 0.5, T + 0.5);
      g.restore(); stats.fills++;
      let air = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!isS(x + i, y + j)) air++;
      const a = 0.34 * (1 - clamp(air / 10, 0, 1));                  // the deep rock lies darker, the rock at an edge keeps its colour
      if (a > 0.01) { g.fillStyle = 'rgba(3,2,14,' + a.toFixed(3) + ')'; g.fillRect(px, py, T, T); }
    }
    // the sides: ink on the edge, a thin light line inside it, so that the rock reads against any background
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const px = x * T, py = y * T, eT = !isS(x, y - 1), eL = !isS(x - 1, y), eR = !isS(x + 1, y), y0 = py + (eT ? 12 : 0);
      for (const [on, ex, dirx] of [[eL, px, 1], [eR, px + T, -1]]) {
        if (!on) continue;
        g.fillStyle = INK; g.fillRect(dirx > 0 ? ex - 2.5 : ex - 1.5, y0, 4, py + T - y0);
        g.fillStyle = 'rgba(120,225,225,0.3)'; g.fillRect(dirx > 0 ? ex + 1.5 : ex - 3.1, y0, 1.6, py + T - y0);
      }
    }
    // the stalactite fringes under the rock
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        if (L.get(x, y) !== T_SOLID || isS(x, y + 1)) continue;
        let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y + 1)) x1++;
        fringe(g, x * T, (x1 + 1) * T, (y + 1) * T, hash2(x, y, seed + 71) < 0.5); stats.fringes++;
        x = x1;
      }
    }
    // the tops: the tan trim along every free-standing floor, rounded where the rock ends
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        if (L.get(x, y) !== T_SOLID || isS(x, y - 1)) continue;
        let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y - 1)) x1++;
        trim(g, x * T, (x1 + 1) * T, y * T, !isS(x - 1, y), !isS(x1 + 1, y)); stats.trims++;
        x = x1;
      }
    }
    return true;
  }
  // the trim: the top of the floor slab (its tan face and the heads of its brackets), the ends of the slab on the ends of a run
  const TRIM = 0.27;                                                // how much of the slab's height is the trim
  // tan trim along the top of a run of rock; rounded ends where the rock ends
  function trim(g, x0, x1, y, capL, capR) {
    const r = R('floor_m'), end = 9 / r[2], h = r[3] * TRIM * U, ew = end * r[2] * U, top = y - 1.5;
    let a = x0, b = x1;
    if (capL) { part(g, 'floor_m', 0, 0, end, TRIM, x0 - 1, top, ew, h); a = x0 - 1 + ew; }
    if (capR) { part(g, 'floor_m', 1 - end, 0, 1, TRIM, x1 + 1 - ew, top, ew, h); b = x1 + 1 - ew; }
    // the middle: the slab without its ends, repeated and mirrored
    const mw = r[2] * (1 - 2 * end) * U;
    let i = 0;
    for (let x = a; x < b - 0.5; x += mw, i++) {
      const cw = Math.min(mw, b - x), f = cw / mw;
      part(g, 'floor_m', end, 0, end + (1 - 2 * end) * f, TRIM, x, top, cw, h, !!(i & 1));
    }
  }
  // the fringe under a run of rock: the ceiling piece's stalactites, hanging from the rock's lower edge
  function fringe(g, x0, x1, yb, flip0) {
    const r = R('ceil_m'), k = U * 0.8, w = r[2] * k, f0 = 0.2, h = r[3] * (1 - f0) * k;
    let i = flip0 ? 1 : 0;
    for (let x = x0; x < x1 - 0.5; x += w, i++) {
      const cw = Math.min(w, x1 - x), f = cw / w;
      part(g, 'ceil_m', 0, f0, f, 1, x, yb - r[3] * 0.1 * k, cw, h, !!(i & 1));
    }
  }

  // ---------------------------------------------------------------- one-way plates: the three thin ledges, stretched to the length of the plate
  function plats(g, L, th) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const T = TILE;
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        if (L.get(x, y) !== T_ONEWAY) continue;
        let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_ONEWAY) x1++;
        let c = x, left = x1 - x + 1;
        while (left > 0) {
          const n = left <= 4 ? left : 3, name = 'ledge_' + Math.min(2, Math.floor(hash2(c, y, L.id.length * 7) * 3)), r = R(name), dw = n * T + 8, dh = r[3] * dw / r[2];
          part(g, name, 0, 0, 1, 1, c * T - 4, y * T - 2, dw, dh, hash2(c, y, 5) < 0.5);
          c += n; left -= n; stats.ledges++;
        }
        x = x1;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- scenery on the floors
  // [piece, fraction of the pieces drawn at U, tiles of free height it needs, glow]
  const PROPS = { crystal: ['prop_crystal', 1, 3, null], altar: ['prop_altar', 1, 4, null], arch_b: ['prop_arch_b', 1, 5, '#ffb060'], arch_a: ['prop_arch_a', 1, 5, '#ffb060'], pillar: ['prop_pillar', 1, 5, null], hall: ['prop_hall', 1, 5, '#ffb060'] };
  // put scenery on the floors, clear of doors, benches and pickups
  function scenery(g, L, th, isS, seed) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const T = TILE, def = L.def, keep = [];                                // places where something else stands: doors, benches, stations, signs, NPCs, things to find, levers
    for (const d of def.doors || []) keep.push([d.x - 2, d.y - 1, d.w + 4, d.h + 2]);
    for (const q of [].concat(def.benches || [], def.stations || [], def.signs || [], def.npcs || [], def.items || [], def.mech || [])) keep.push([q.x - 3, q.y - 4, 7, 6]);
    if (def.arena && def.arena.reward) keep.push([def.arena.reward.x - 3, def.arena.reward.y - 4, 7, 6]);
    const used = [], boss = !!def.arena;
    for (let y = 2; y < L.h - 1; y++) {
      for (let x = 2; x < L.w - 2; x++) {
        if (L.get(x, y) !== T_SOLID || isS(x, y - 1) || hash2(x, y, seed + 200) > 0.075) continue;
        const r = hash2(x, y, seed + 201);
        let kind = r < 0.5 ? 'crystal' : r < 0.64 ? 'altar' : r < 0.77 ? 'arch_b' : r < 0.87 ? 'arch_a' : r < 0.94 ? 'pillar' : 'hall';
        if (boss && kind !== 'crystal') kind = 'crystal';
        for (let tries = 0; tries < 3; tries++) {
          const [name, , need] = PROPS[kind], pr = R(name), w = pr[2] * U, h = pr[3] * U, fw = Math.ceil(w / T), x0 = x - Math.floor(fw / 2), nh = Math.ceil(h / T) + 1;
          let fits = x0 >= 1 && x0 + fw < L.w - 1;
          for (let i = 0; fits && i < fw; i++) {
            if (L.get(x0 + i, y) !== T_SOLID || isS(x0 + i, y - 1)) fits = false;
            for (let j = 1; fits && j <= nh; j++) if (L.get(x0 + i, y - j) !== T_AIR) fits = false;
          }
          if (fits) for (const q of keep) if (x0 < q[0] + q[2] && x0 + fw > q[0] && y - nh < q[1] + q[3] && y > q[1]) { fits = false; break; }
          if (fits) for (const u of used) if (u[2] === y && x0 < u[0] + 1 && x0 + fw > u[1] - 1) { fits = false; break; }
          if (!fits) { if (kind === 'crystal') break; kind = kind === 'hall' || kind === 'pillar' ? 'arch_a' : kind === 'arch_a' ? 'arch_b' : kind === 'arch_b' ? 'altar' : 'crystal'; continue; }
          used.push([x0, x0 + fw, y]); stats.placed.push({ kind, x0, fw, y, nh });
          const cx = (x0 + fw / 2) * T, flip = hash2(x, y, seed + 202) < 0.5, glow = PROPS[kind][3];
          if (glow) bloom(g, cx, y * T - h * 0.35, h * 0.8, glow, 0.22);
          g.save(); g.translate(cx, y * T + 3); if (flip) g.scale(-1, 1);
          g.drawImage(img, pr[0], pr[1], pr[2], pr[3], -w / 2, -h, w, h);
          g.restore();
          break;
        }
      }
    }
  }

  // the floors that only a dive breaks: the same rock, with the glowing cracks the hero is to look for
  const oldCrack = Art.drawCrack;
  Art.drawCrack = function (g, x, y, th, t) {
    if (!(th && th.name === 'crystal' && ready())) return oldCrack(g, x, y, th, t);
    const px = x * TILE, py = y * TILE, v = hash2(x, y, 51), r = R('fill_' + ((x + y) % 3)); stats.cracks++;
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(img, r[0] + (x & 1) * r[2] / 2, r[1] + (y & 1) * r[3] / 2, r[2] / 2, r[3] / 2, px - 0.4, py - 0.4, TILE + 0.8, TILE + 0.8); g.restore();
    g.strokeStyle = th.edge; g.lineWidth = 3; g.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
    g.strokeStyle = rgba(th.glow, 0.55 + 0.3 * Math.sin(t * 2 + x)); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(px + 2, py + 10 + v * 8); g.lineTo(px + 12, py + 16); g.lineTo(px + 20, py + 8 + v * 6); g.lineTo(px + 30, py + 18); g.moveTo(px + 12, py + 16); g.lineTo(px + 14, py + 30); g.stroke();
  };

  Art.tileHooks.crystal = { ready, solid, plats, scenery };
  return { ready, R, stats };
})();
