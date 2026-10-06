'use strict';
// The mossy stone tile sheet (art/tiles/moss.webp, tools/sprites/cut_moss.py), laid piece by piece in the rooms of four areas: Mossgrove,
// Sporewood, the Aqueduct and Cinderdeep. The rock is made of the blocks of the sheet (some with moss, roots, a window, water or lava in
// them), the floors get the ground tops with their grass and mushrooms, the underside of the rock its hanging moss, one-way plates are the
// floating stones with their stalactites, and the floors and ceilings carry the standing and hanging things of the sheet (pillars, windows,
// ruins, trees, crates, lanterns, banners). Spikes are the sheet's too. Hooked in through Art.tileHooks (art_world.js).
const MossTiles = (() => {
  const img = new Image();
  img.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; };         // lay the rooms again, now from the pieces
  img.src = 'art/tiles/moss.webp';
  const ready = () => typeof MOSS_TILES !== 'undefined' && img.complete && img.naturalWidth > 0;
  const R = n => MOSS_TILES[n];
  const K = 0.92;                                           // screen px per atlas px for plates, props and hangings (the atlas holds 0.6 of the sheet)
  const KF = 1.3;                                           // a rock block of the atlas covers two tiles by two
  const INK = '#030608';
  // what was laid in the last room (the tests read it)
  const stats = { renders: 0, fills: 0, accents: 0, tops: 0, fringes: 0, vines: 0, arches: 0, plates: 0, props: [], hangs: [], theme: '' };

  // ---------------------------------------------------------------- what each area uses
  const FILLS = ['fill_0', 'fill_1', 'fill_2', 'fill_3', 'fill_4', 'fill_5', 'fill_6'];
  const ALL_TOPS = ['top_0', 'top_1', 'top_2', 'top_3', 'top_4', 'top_5', 'top_6', 'top_7', 'top_8', 'top_9'];
  // [piece, weight, glow colour or null]; the props that need a tall room are told apart by their own height
  const P_SMALL = [['prop_crate_tall', 3], ['prop_fence', 3], ['prop_gate_ruin', 2], ['prop_barrel_spiked', 2], ['prop_chests', 2], ['prop_panel', 2], ['prop_spike_stone', 2], ['prop_stone_s', 2],
    ['prop_thorn_bush', 2], ['prop_planks', 2], ['prop_slab', 2], ['prop_crate_dark', 2], ['prop_crate_cross', 2], ['prop_ruin_moss', 2], ['prop_cross', 2], ['prop_planks_wall', 1]];
  const P_TALL = [['prop_pillar_a', 3], ['prop_pillar_b', 3], ['prop_columns', 3], ['prop_tree_dead', 3], ['prop_tree_glow', 2, '#ffb060'], ['prop_ruin_candle', 2, '#ffb060'], ['prop_spire', 2],
    ['prop_window_big', 1, '#ffb060'], ['prop_ruin_gate', 2], ['prop_window_small', 2, '#ffb060'], ['prop_pillar_thin', 2], ['prop_plank_pillar', 2], ['prop_pillar_vine', 2],
    ['prop_arch_lantern', 1, '#ffc070'], ['prop_cliff', 2], ['top_roots', 2], ['spike_catapult', 1], ['spike_wheel_a', 1], ['spike_wheel_b', 1]];
  const HANGS = [['hang_lantern_cross', 3, '#ffc070'], ['hang_swing', 2], ['hang_gallows_a', 2], ['hang_gallows_b', 2, '#ffc070'], ['hang_ring', 2]];
  const THEMES = {
    moss: { tint: null, accents: ['tile_roots', 'tile_boulder', 'tile_hang_a', 'tile_hang_b', 'tile_hang_c', 'tile_window', 'block_moss'], tops: ALL_TOPS, props: null, hangs: HANGS,
      spikes: ['spike_wood_a', 'spike_wood_b'], islands: ['isl_0', 'isl_1', 'isl_2', 'isl_3', 'isl_4', 'isl_5', 'isl_6', 'isl_7', 'isl_9', 'isl_10', 'isl_11', 'isl_shroom', 'isl_grave'] },
    spore: { tint: null, accents: ['tile_roots', 'tile_boulder', 'tile_hang_a', 'tile_hang_c', 'block_moss'], tops: ['top_3', 'top_4', 'top_6', 'top_7', 'top_8', 'top_9', 'top_0'], props: ['prop_tree_dead', 'top_roots', 'prop_tree_glow', 'prop_ruin_candle',
      'prop_thorn_bush', 'prop_ruin_moss', 'prop_slab', 'prop_stone_s', 'prop_pillar_vine', 'prop_columns', 'prop_planks'], hangs: [HANGS[0], HANGS[4]],
      spikes: ['spike_thorn_a', 'spike_thorn_b', 'spike_thorn_c', 'spike_thorn_d'], islands: ['isl_1', 'isl_2', 'isl_4', 'isl_6', 'isl_7', 'isl_10', 'isl_shroom'] },
    aqueduct: { tint: null, accents: ['water_0', 'water_1', 'water_2', 'water_fall_0', 'water_fall_1', 'water_fall_2', 'water_fall_3', 'water_shore', 'water_col', 'water_fall_big', 'water_wave'],
      tops: ['top_1', 'top_2', 'top_3', 'top_6', 'top_8'], props: ['prop_pillar_a', 'prop_pillar_b', 'prop_columns', 'prop_window_big', 'prop_window_small', 'prop_ruin_gate', 'prop_arch_lantern', 'prop_spire',
      'prop_crate_tall', 'prop_fence', 'prop_planks', 'prop_cliff', 'prop_slab', 'prop_stone_s', 'prop_panel'], hangs: [HANGS[0], HANGS[1], HANGS[4]],
      spikes: ['spike_rock_a', 'spike_rock_b', 'spike_rock_c', 'spike_stone_a', 'spike_stone_b', 'spike_stone_c'], islands: ['isl_0', 'isl_3', 'isl_5', 'isl_6', 'isl_8', 'isl_9'] },
    ember: { tint: 'rgba(110,26,8,0.42)', accents: ['lava_0', 'lava_1', 'lava_2', 'lava_3'], tops: ['top_0', 'top_1', 'top_2', 'top_5'], props: ['prop_spire', 'prop_pillar_thin', 'prop_ruin_gate', 'prop_crate_dark',
      'prop_crate_cross', 'prop_chests', 'prop_cliff', 'spike_catapult', 'spike_wheel_a', 'spike_wheel_b', 'prop_stone_s', 'prop_slab', 'prop_spike_stone', 'prop_planks_wall'],
      hangs: [HANGS[1], HANGS[2], HANGS[3], HANGS[4]], spikes: ['spike_tall', 'spike_wood_b', 'spike_rock_b'], islands: ['isl_1', 'isl_4', 'isl_6', 'isl_7', 'isl_8', 'isl_10'] },
  };
  const has = th => !!(th && THEMES[th.name]);

  // a part of piece n (fractions of it) put at (dx, dy, dw, dh); flip mirrors it left to right
  function part(g, n, fx0, fy0, fx1, fy1, dx, dy, dw, dh, flip) {
    const r = R(n), sx = r[0] + r[2] * fx0, sy = r[1] + r[3] * fy0, sw = r[2] * (fx1 - fx0), sh = r[3] * (fy1 - fy0);
    if (flip) { g.save(); g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh); g.restore(); }
    else g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  const pick = (list, h) => { let tot = 0; for (const e of list) tot += e[1]; let r = h * tot; for (const e of list) { r -= e[1]; if (r <= 0) return e; } return list[list.length - 1]; };

  // ---------------------------------------------------------------- the rock, its sides, its undersides and its tops
  function solid(g, L, th, isS, seed) {
    const C = THEMES[th.name]; if (!C) return false;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    stats.renders++; stats.fills = stats.accents = stats.tops = stats.fringes = stats.vines = stats.arches = 0; stats.props = []; stats.hangs = []; stats.theme = th.name;
    const T = TILE;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const bx = x >> 1, by = y >> 1, px = x * T, py = y * T;
      let air = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!isS(x + i, y + j)) air++;
      // deep inside the rock now and then a block with moss, roots, a window, water or lava in it
      const accent = air === 0 && hash2(bx, by, seed + 90) < 0.1;
      let name, fx = false, fy = false;
      if (accent) { name = C.accents[Math.floor(hash2(bx, by, seed + 91) * C.accents.length)]; stats.accents++; }
      else { name = FILLS[Math.min(FILLS.length - 1, Math.floor(hash2(bx, by, seed + 31) * FILLS.length))]; fx = hash2(bx, by, seed + 57) < 0.5; fy = hash2(bx, by, seed + 58) < 0.5; }
      const r = R(name), qx = (x & 1) ^ (fx ? 1 : 0), qy = (y & 1) ^ (fy ? 1 : 0);
      g.save(); g.translate(px + (fx ? T : 0), py + (fy ? T : 0)); g.scale(fx ? -1 : 1, fy ? -1 : 1);
      g.drawImage(img, r[0] + qx * r[2] / 2, r[1] + qy * r[3] / 2, r[2] / 2, r[3] / 2, -0.25, -0.25, T + 0.5, T + 0.5);
      g.restore(); stats.fills++;
      if (C.tint) { g.fillStyle = C.tint; g.fillRect(px - 0.25, py - 0.25, T + 0.5, T + 0.5); }
      const a = 0.3 * (1 - clamp(air / 10, 0, 1));                  // the deep rock lies darker, the rock at an edge keeps its colour
      if (a > 0.01) { g.fillStyle = 'rgba(2,6,10,' + a.toFixed(3) + ')'; g.fillRect(px, py, T, T); }
    }
    // the sides: ink on the edge, a thin light line inside it, so that the rock reads against any background
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const px = x * T, py = y * T, eT = !isS(x, y - 1), eL = !isS(x - 1, y), eR = !isS(x + 1, y), y0 = py + (eT ? 12 : 0);
      for (const [on, ex, dirx] of [[eL, px, 1], [eR, px + T, -1]]) {
        if (!on) continue;
        g.fillStyle = INK; g.fillRect(dirx > 0 ? ex - 2.5 : ex - 1.5, y0, 4, py + T - y0);
        g.fillStyle = rgba(th.hi, 0.26); g.fillRect(dirx > 0 ? ex + 1.5 : ex - 3.1, y0, 1.6, py + T - y0);
      }
    }
    // the hanging moss under the rock, and now and then a long vine where there is room for it
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        if (L.get(x, y) !== T_SOLID || isS(x, y + 1)) continue;
        let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y + 1)) x1++;
        fringe(g, x * T, (x1 + 1) * T, (y + 1) * T, hash2(x, y, seed + 71) < 0.5); stats.fringes++;
        for (let vx = x; vx <= x1; vx++) {
          if (hash2(vx, y, seed + 73) > 0.07) continue;
          let free = 0; while (free < 6 && L.get(vx, y + 1 + free) === T_AIR) free++;
          if (free >= 4) { const r = R('vines_long'), w = r[2] * K, h = r[3] * K; part(g, 'vines_long', 0, 0, 1, 1, vx * T + T / 2 - w / 2, (y + 1) * T - 4, w, h, hash2(vx, y, seed + 74) < 0.5); stats.vines++; }
        }
        x = x1;
      }
    }
    arches(g, L, isS, seed);
    // the tops: the ground tops (grass, mushrooms, roots) along every free-standing floor
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        if (L.get(x, y) !== T_SOLID || isS(x, y - 1)) continue;
        let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y - 1)) x1++;
        top(g, C, th, x * T, (x1 + 1) * T, y * T, hash2(x, y, seed + 111)); stats.tops++;
        x = x1;
      }
    }
    return true;
  }
  const BAND = 15;                                                // atlas px of stone under the cap line that the top keeps
  // a run of floor from x0 to x1: ground tops side by side, their stone cap on the floor's line
  function top(g, C, th, x0, x1, y, h0) {
    let x = x0, i = 0;
    while (x < x1 - 0.5) {
      const name = C.tops[Math.floor(hash2(Math.round(x), Math.round(y), 5 + i * 13) * C.tops.length)], r = R(name), cap = MOSS_CAP[name] || 0.25;
      const w = r[2] * K, hh = r[3] * K, band = Math.min(1 - cap, BAND / r[3]), cw = Math.min(w, x1 - x), f = cw / w;
      const flip = hash2(i, Math.round(x), 17) < 0.5, sy0 = 0, sy1 = cap + band, dh = hh * sy1, capY = y - hh * cap + 1;
      if (flip) part(g, name, 1 - f, sy0, 1, sy1, x, capY, cw, dh, true); else part(g, name, 0, sy0, f, sy1, x, capY, cw, dh, false);
      if (name === 'top_7') bloom(g, x + w * 0.5, capY + hh * 0.18, 26, '#6fe0d0', 0.2);
      x += cw; i++;
    }
  }
  // the fringe under a run of rock: the hanging parts of the sheet's overhangs, hung from the rock's lower edge one after the other
  const FRINGE = [['ceiling_wide', 0.3], ['cap_roots', 0.24], ['arch_cap', 0.24], ['drip_small', 0.2], ['arch_big', 0.26], ['ceiling_wide', 0.3]];
  function fringe(g, x0, x1, yb, flip0) {
    let i = flip0 ? 1 : 0, x = x0;
    while (x < x1 - 0.5) {
      const [name, f0] = FRINGE[Math.floor(hash2(Math.round(x), Math.round(yb), 41 + i) * FRINGE.length)], r = R(name), k = K * 0.85, w = r[2] * k, h = r[3] * (1 - f0) * k;
      const cw = Math.min(w, x1 - x), f = cw / w;
      part(g, name, 0, f0, f, 1, x, yb - r[3] * 0.06 * k, cw, h, !!(i & 1));
      x += cw; i++;
    }
  }
  // the arches: where a wall meets a ceiling, an arch of the sheet springs from the wall and joins the ceiling
  function arches(g, L, isS, seed) {
    const T = TILE;
    for (let y = 0; y < L.h - 3; y++) for (let x = 1; x < L.w - 1; x++) {
      if (L.get(x, y) !== T_SOLID || L.get(x, y + 1) !== T_AIR || hash2(x, y, seed + 130) > 0.6) continue;
      for (const side of [-1, 1]) {
        if (!isS(x + side, y + 1) || !isS(x + side, y + 2)) continue;                    // a wall on that side, under the ceiling
        let ok = true; for (let i = 0; i < 2 && ok; i++) for (let j = 1; j <= 2 && ok; j++) if (L.get(x - side * i, y + j) !== T_AIR && !(i === 0 && j === 0)) ok = false;
        if (!ok) continue;
        const name = ['corner_arch_l', 'corner_arch_r', 'corner_rock'][Math.floor(hash2(x, y, seed + 131) * 3)], r = R(name), w = r[2] * K * 0.9, h = r[3] * K * 0.9;
        // the arch springs from the wall (the piece's lower left) and rises to the ceiling (its upper right); on a wall to the right it is mirrored
        const ax = side < 0 ? x * T : (x + 1) * T;
        g.save(); g.translate(ax, (y + 1) * T - 2); if (side > 0) g.scale(-1, 1);
        g.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, w, h);
        g.restore(); stats.arches++; break;
      }
    }
  }

  // ---------------------------------------------------------------- one-way plates: the floating stones with their stalactites
  function plats(g, L, th) {
    const C = THEMES[th.name]; if (!C) return false;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const T = TILE; stats.plates = 0;
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        if (L.get(x, y) !== T_ONEWAY) continue;
        let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_ONEWAY) x1++;
        let c = x, left = x1 - x + 1;
        while (left > 0) {
          const n = left <= 4 ? left : 3, want = n * T + 8;
          // the stone whose width is nearest, scaled to the plate
          let best = null, bd = 1e9;
          for (const nm of C.islands.concat(n >= 5 ? ['isl_8', 'ledge_big'] : [])) {
            const r = R(nm), d = Math.abs(r[2] * K - want) + (hash2(c, y, nm.length * 7 + nm.charCodeAt(nm.length - 1)) * 18); if (d < bd) { bd = d; best = nm; }
          }
          const name = best, r = R(name), s = clamp(want / (r[2] * K), 0.6, 1.5), dw = want, dh = r[3] * K * s;
          // the lower part of the stone fades into its stalactites: draw it all but keep the plate no deeper than two tiles
          part(g, name, 0, 0, 1, Math.min(1, 2.1 * T / dh), c * T - 4, y * T - (MOSS_CAP[name] || 0.04) * dh + 1, dw, Math.min(dh, 2.1 * T), hash2(c, y, 5) < 0.5);
          c += n; left -= n; stats.plates++;
        }
        x = x1;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- the standing and the hanging things
  // places where something else stands: doors, benches, stations, signs, people, things to find, machines
  function keepOut(L) {
    const def = L.def, keep = [];
    for (const d of def.doors || []) keep.push([d.x - 2, d.y - 1, d.w + 4, d.h + 2]);
    for (const q of [].concat(def.benches || [], def.stations || [], def.signs || [], def.npcs || [], def.items || [], def.mech || [])) keep.push([q.x - 3, q.y - 4, 7, 6]);
    if (def.arena && def.arena.reward) keep.push([def.arena.reward.x - 3, def.arena.reward.y - 4, 7, 6]);
    return keep;
  }
  function scenery(g, L, th, isS, seed) {
    const C = THEMES[th.name]; if (!C) return;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const T = TILE, keep = keepOut(L), used = [], boss = !!L.def.arena;
    const pool = C.props ? C.props.map(n => [n, 2, (P_TALL.find(e => e[0] === n) || P_SMALL.find(e => e[0] === n) || [])[2] || null]) : null;
    const all = pool || P_SMALL.concat(P_TALL);
    const small = all.filter(e => R(e[0])[3] * K < 70), tall = all.filter(e => R(e[0])[3] * K >= 70);
    // floor things
    for (let y = 2; y < L.h - 1; y++) {
      for (let x = 2; x < L.w - 2; x++) {
        if (L.get(x, y) !== T_SOLID || isS(x, y - 1) || hash2(x, y, seed + 200) > 0.11) continue;
        let list = boss || hash2(x, y, seed + 203) < 0.55 || !tall.length ? (small.length ? small : tall) : tall;
        for (let tries = 0; tries < 3; tries++) {
          const e = pick(list, hash2(x, y, seed + 201 + tries)), name = e[0], pr = R(name), w = pr[2] * K, h = pr[3] * K, fw = Math.max(1, Math.ceil(w / T)), x0 = x - Math.floor(fw / 2), nh = Math.ceil(h / T) + 1;
          let fits = x0 >= 1 && x0 + fw < L.w - 1;
          for (let i = 0; fits && i < fw; i++) {
            if (L.get(x0 + i, y) !== T_SOLID || isS(x0 + i, y - 1)) fits = false;
            for (let j = 1; fits && j <= nh; j++) if (L.get(x0 + i, y - j) !== T_AIR) fits = false;
          }
          if (fits) for (const q of keep) if (x0 < q[0] + q[2] && x0 + fw > q[0] && y - nh < q[1] + q[3] && y > q[1]) { fits = false; break; }
          if (fits) for (const u of used) if (u[2] === y && x0 < u[1] + 1 && x0 + fw > u[0] - 1) { fits = false; break; }
          if (!fits) { if (list === tall && small.length) list = small; else break; continue; }
          used.push([x0, x0 + fw, y]); stats.props.push({ name, x0, fw, y, nh });
          const cx = (x0 + fw / 2) * T, flip = hash2(x, y, seed + 202) < 0.5, glow = e[2];
          if (glow) bloom(g, cx, y * T - h * 0.4, h * 0.75, glow, 0.2);
          g.save(); g.translate(cx, y * T + 3); if (flip) g.scale(-1, 1);
          g.drawImage(img, pr[0], pr[1], pr[2], pr[3], -w / 2, -h, w, h);
          g.restore();
          break;
        }
      }
    }
    // things that hang from a ceiling: chains with lanterns, banners, a swing
    if (boss) return;
    for (let y = 0; y < L.h - 5; y++) {
      for (let x = 3; x < L.w - 3; x++) {
        if (L.get(x, y) !== T_SOLID || L.get(x, y + 1) !== T_AIR || hash2(x, y, seed + 220) > 0.06) continue;
        const e = pick(C.hangs, hash2(x, y, seed + 221)), name = e[0], pr = R(name), w = pr[2] * K, h = pr[3] * K, fw = Math.max(1, Math.ceil(w / T)), x0 = x - Math.floor(fw / 2), nh = Math.ceil(h / T) + 1;
        let fits = x0 >= 1 && x0 + fw < L.w - 1;
        for (let i = 0; fits && i < fw; i++) {
          if (L.get(x0 + i, y) !== T_SOLID) fits = false;
          for (let j = 1; fits && j <= nh; j++) if (L.get(x0 + i, y + j) !== T_AIR) fits = false;
        }
        if (fits) for (const q of keep) if (x0 < q[0] + q[2] && x0 + fw > q[0] && y + nh > q[1] && y < q[1] + q[3] + 2) { fits = false; break; }
        if (fits) for (const u of used) if (u[2] <= y + nh && u[2] >= y && x0 < u[1] + 1 && x0 + fw > u[0] - 1) { fits = false; break; }
        if (!fits) continue;
        used.push([x0, x0 + fw, y + nh]); stats.hangs.push({ name, x0, fw, y, nh });
        const cx = (x0 + fw / 2) * T, flip = hash2(x, y, seed + 222) < 0.5;
        g.save(); g.translate(cx, (y + 1) * T - 3); if (flip) g.scale(-1, 1);
        g.drawImage(img, pr[0], pr[1], pr[2], pr[3], -w / 2, 0, w, h);
        g.restore();
        if (e[2]) bloom(g, cx, (y + 1) * T + h * 0.8, 34, e[2], 0.22);
      }
    }
  }

  // ---------------------------------------------------------------- the floors that only a dive breaks: the same rock, with the glowing cracks
  const oldCrack = Art.drawCrack;
  Art.drawCrack = function (g, x, y, th, t) {
    if (!(has(th) && ready())) return oldCrack(g, x, y, th, t);
    const px = x * TILE, py = y * TILE, v = hash2(x, y, 51), r = R(FILLS[(x + y) % FILLS.length]);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(img, r[0] + (x & 1) * r[2] / 2, r[1] + (y & 1) * r[3] / 2, r[2] / 2, r[3] / 2, px - 0.4, py - 0.4, TILE + 0.8, TILE + 0.8); g.restore();
    g.strokeStyle = th.edge; g.lineWidth = 3; g.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
    g.strokeStyle = rgba(th.glow, 0.55 + 0.3 * Math.sin(t * 2 + x)); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(px + 2, py + 10 + v * 8); g.lineTo(px + 12, py + 16); g.lineTo(px + 20, py + 8 + v * 6); g.lineTo(px + 30, py + 18); g.moveTo(px + 12, py + 16); g.lineTo(px + 14, py + 30); g.stroke();
  };

  // ---------------------------------------------------------------- spikes: one tile's width of the sheet's spikes, a different stretch of the piece for each tile
  const oldSpikes = drawSpikes;
  drawSpikes = function (g, th, px, py, v) {
    const C = has(th) && ready() && THEMES[th.name];
    if (!C) return oldSpikes(g, th, px, py, v);
    const name = C.spikes[Math.floor(hash2(px >> 5, py >> 5, 9) * C.spikes.length)], r = R(name), H = 33, k = H / r[3], sw = TILE / k;
    const sx = r[0] + (((px / k) % Math.max(1, r[2] - sw)) + Math.max(1, r[2] - sw)) % Math.max(1, r[2] - sw);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, r[1], Math.min(sw, r[2]), r[3], px - 0.3, py + TILE - H, TILE + 0.6, H);
    g.restore();
  };

  // an area drawn from this tileset registers its own hook (replacing the procedural floors of art_floors.js)
  for (const n of Object.keys(THEMES)) Art.tileHooks[n] = { ready, solid, plats, scenery };
  // every piece of the sheet that the rooms can show: the shared ones and each area's own
  function used() {
    const u = new Set(FILLS.concat(['vines_long', 'isl_8', 'ledge_big', 'corner_arch_l', 'corner_arch_r', 'corner_rock']));
    for (const f of FRINGE) u.add(f[0]);
    for (const e of P_SMALL.concat(P_TALL, HANGS)) u.add(e[0]);
    for (const C of Object.values(THEMES)) for (const k of ['accents', 'tops', 'props', 'spikes', 'islands']) for (const n of C[k] || []) u.add(n);
    for (const C of Object.values(THEMES)) for (const e of C.hangs) u.add(e[0]);
    return u;
  }
  return { ready, R, stats, THEMES, has, used };
})();
