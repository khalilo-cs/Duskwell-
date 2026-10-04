'use strict';
// Drawings of the world's objects and machinery (art/world/world.webp): geo, bench, sign, station shrine, chest,
// saw, lever, stalactite, crumbling and moving platforms, gates, breakable walls, mushrooms and spikes.
// The old drawings are used until the atlas loads.
const WorldArt = (() => {
  const img = new Image();
  img.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; };   // bake the spikes and mushrooms again, now with the drawings
  img.src = 'art/world/world.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  // rectangles of the pieces in the atlas
  const R = n => WORLD_RECTS[n];
  // draw a rectangle of the atlas
  const raw = (g, r, dx, dy, dw, dh) => g.drawImage(img, r[0], r[1], r[2], r[3], dx, dy, dw, dh);
  // a part of a piece, given in the coordinates of the sheet it was drawn on
  const sub = (n, x0, y0, x1, y1) => { const r = R(n), o = WORLD_ORIGIN[n], k = WORLD_PACK; return [r[0] + (x0 - o[0]) * k, r[1] + (y0 - o[1]) * k, (x1 - x0) * k, (y1 - y0) * k]; };
  // piece n at scale k (screen px per atlas px), the point (ax, ay) of it (0..1 of its size) at (x, y)
  function put(g, n, x, y, k, ax, ay, o) {
    const r = R(n); if (!r) return;
    const w = r[2] * k, h = r[3] * k;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (o && o.alpha != null) g.globalAlpha *= o.alpha;
    if (o && o.filter) g.filter = o.filter;
    g.translate(x, y); if (o && o.rot) g.rotate(o.rot); if (o && o.flip) g.scale(-1, 1);
    raw(g, r, -w * (ax == null ? 0.5 : ax), -h * (ay == null ? 1 : ay), w, h);
    g.restore();
  }
  const fit = (n, w) => w / R(n)[2];                                     // the scale that makes piece n w px wide
  const fitH = (n, h) => h / R(n)[3];

  // ---------------------------------------------------------------- objects
  const oldGeo = Art.drawGeo, oldBench = Art.drawBench, oldSign = Art.drawSign, oldStation = Art.drawStation, oldItem = Art.drawItem;
  // frames of the coin's glint
  const GLINT = [0, 0, 0, 1, 2, 1, 0, 0, 0, 0];
  Art.drawGeo = function (g, c, t) {
    if (!ready()) return oldGeo(g, c, t);
    const x = c.x + c.w / 2, y = c.y + c.h / 2, big = c.v >= 25;
    let f = GLINT[Math.floor(t * 9 + c.x * 0.37 + c.y * 0.11) % GLINT.length];
    if (big && f === 2 && Math.sin(t * 1.3 + c.x) > 0.6) f = 3;           // the large ones flare now and then
    const k = (c.h * 2.3) / (R('geo_0')[3]);                               // the coin itself keeps its size whatever the glow around it
    bloom(g, x, y, c.w * 2.2, '#ffe9a0', 0.22);
    put(g, 'geo_' + f, x, y, k, 0.5, 0.5);
  };
  Art.drawBench = function (g, b, t, resting) {
    if (!ready()) return oldBench(g, b, t, resting);
    bloom(g, b.px, b.py - 40, 80, '#ffe2a8', resting ? 0.4 : 0.2);
    put(g, 'bench', b.px, b.py + 3, fit('bench', 116), 0.5, 1);
    if (resting) bloom(g, b.px, b.py - 44, 38, '#cfe8ff', 0.3 + 0.1 * Math.sin(t * 6));
  };
  Art.drawSign = function (g, s, t) {
    if (!ready()) return oldSign(g, s, t);
    const p = G.player, near = p && !p.dead && Math.abs(p.cx - s.px) < 90 && Math.abs(p.cy - s.py) < 90;
    const k = fitH('sign_dark', 70);
    if (near) bloom(g, s.px - 24, s.py - 36, 60, '#ffcf80', 0.35 + 0.05 * Math.sin(t * 7));
    put(g, near ? 'sign_lit' : 'sign_dark', s.px, s.py + 3, k, near ? 0.39 : 0.37, 1);
  };
  // the shrine: shrine_0 dark; when it is lit the moon rises (1), shines (2) and the light pours up (3); then it breathes between 2 and 3
  Art.drawStation = function (g, st, t, lit) {
    if (!ready()) return oldStation(g, st, t, lit);
    if (st._lit === undefined) { st._lit = lit; st._litT = -99; }
    if (lit && !st._lit) st._litT = t;
    st._lit = lit;
    const k = fit('shrine_0', 104), x = st.px, y = st.py + 3;
    if (!lit) { put(g, 'shrine_0', x, y, k, 0.5, 1); return; }
    const a = t - st._litT, fl = 0.85 + 0.15 * Math.sin(t * 5 + x);
    bloom(g, x, y - 60, 160, '#ffd98a', 0.4 * fl);
    if (a < 1.2) { put(g, 'shrine_' + (1 + Math.min(2, Math.floor(a / 0.4))), x, y, k, 0.5, 1); return; }
    const m = 0.5 + 0.5 * Math.sin(t * 1.6 + x);
    put(g, 'shrine_2', x, y, k, 0.5, 1);
    put(g, 'shrine_3', x, y, k, 0.5, 1, { alpha: m });
  };
  // the geo cache is a chest on the floor; taken, it opens and its light fades
  const groundBelow = (x, y) => { const L = G.level; let ty = Math.floor(y / TILE); while (ty < L.h - 1 && !L.ground(Math.floor(x / TILE), ty)) ty++; return ty * TILE; };
  Art.drawItem = function (g, it, t) {
    if (it.kind !== 'cache' || !ready()) return oldItem(g, it, t);
    if (it._gy == null) it._gy = groundBelow(it.x, it.y);
    bloom(g, it.x, it._gy - 18, 50, '#ffd98a', 0.18 + 0.06 * Math.sin(t * 2.5));
    put(g, 'chest_shut', it.x, it._gy + 3, fit('chest_shut', 64), 0.5, 1);
  };

  // ---------------------------------------------------------------- machinery
  const oldBack = Art.mechBack, oldFront = Art.mechFront;
  const CHAIN_W = () => R('chain')[2];
  function chainLine(g, x0, y0, x1, y1, th) {                             // the drawn chain repeated from one point to another
    const r = R('chain'), len = Math.hypot(x1 - x0, y1 - y0), k = (th || 9) / r[3], step = r[2] * k;
    g.save(); g.translate(x0, y0); g.rotate(Math.atan2(y1 - y0, x1 - x0)); g.imageSmoothingEnabled = true;
    for (let s = 0; s < len; s += step) { const w = Math.min(step, len - s); g.drawImage(img, r[0], r[1], r[2] * (w / step), r[3], s, -r[3] * k / 2, w, r[3] * k); }
    g.restore();
  }
  Art.mechBack = function (g, t) {
    const m = G.mech; if (!m) return;
    if (!ready()) return oldBack(g, t);
    const movers = m.movers; m.movers = [];                               // the saws' rails stay as they were
    try { oldBack(g, t); } finally { m.movers = movers; }
    for (const mv of movers) {
      const ax = mv.ax + mv.w / 2, ay = mv.ay + 8, bx = mv.bx + mv.w / 2, by = mv.by + 8;
      if (Math.abs(ax - bx) < 1) {                                         // an elevator: two chains from above
        for (const dx of [-mv.w / 2 + 12, mv.w / 2 - 12]) chainLine(g, mv.x + mv.w / 2 + dx, Math.min(ay, by) - 140, mv.x + mv.w / 2 + dx, mv.y + 4, 9);
      } else {                                                             // a track: the chain between two geared blocks
        const lx = Math.min(ax, bx) - mv.w / 2 - 26, rx = Math.max(ax, bx) + mv.w / 2 + 26, y0 = Math.min(ay, by), y1 = Math.max(ay, by);
        chainLine(g, lx, ax < bx ? ay : by, rx, ax < bx ? by : ay, 9);
        const k = fitH('mover_end', 58);
        put(g, 'mover_end', lx, (ax < bx ? ay : by) + 22, k, 0.6, 0.62);
        put(g, 'mover_end', rx, (ax < bx ? by : ay) + 22, k, 0.6, 0.62, { flip: true });
      }
    }
  };
  // the crumbling platform: whole, cracked (first half of the shaking), breaking (second half); the falling bits are stones
  function crumble(g, c, t) {
    if (c.state !== 'gone') {
      const n = c.state === 'shake' ? (c.t < CRUMBLE_DELAY * 0.5 ? 'crumble_1' : 'crumble_2') : 'crumble_0';
      const w = c.w * TILE + 10, sx = w / R('crumble_0')[2], sy = Math.min(sx, 0.62);
      const jx = c.state === 'shake' ? rand(-1.5, 1.5) * (1 + c.t * 3) : 0;
      const r = R(n), dw = r[2] * sx, dh = r[3] * sy;
      g.save(); g.globalAlpha *= c.fade; g.imageSmoothingEnabled = true;
      raw(g, r, c.x * TILE - 5 + jx + (w - dw) / 2, c.y * TILE - 3, dw, dh);
      g.restore();
    }
    for (const ch of c.chunks) {
      g.save(); g.translate(ch.x, ch.y); g.rotate(ch.rot); g.globalAlpha = Math.min(1, ch.life * 2);
      g.beginPath(); g.moveTo(-ch.s, -ch.s * 0.4); g.lineTo(ch.s * 0.8, -ch.s * 0.5); g.lineTo(ch.s, ch.s * 0.4); g.lineTo(-ch.s * 0.6, ch.s * 0.5); g.closePath();
      fs(g, '#2c333d', INK, 2.5); g.restore();
    }
  }
  // moving platform with its chain
  function mover(g, mv, t, th) {
    const w = mv.w + 12, sx = w / R('mover_deck')[2], sy = Math.min(sx, 0.62), r = R('mover_deck');
    g.save(); g.imageSmoothingEnabled = true; if (!mv.powered()) g.filter = 'brightness(0.65)';
    raw(g, r, mv.x - 6, mv.y - 3, r[2] * sx, r[3] * sy);
    g.restore();
    if (mv.powered()) bloom(g, mv.x + mv.w / 2, mv.y + 18, 40, th.glow, 0.18 + 0.06 * Math.sin(t * 6 + mv.ax));
  }
  // saw blade
  function saw(g, s) {
    const k = (s.r * 2.3) / R('saw_spin')[2];
    if (s.spark > 0) bloom(g, s.x, s.y, s.r * 2.4, '#ffb070', 0.35);
    put(g, 'saw_spin', s.x, s.y, k, 0.5, 0.5, { rot: s.spin });
  }
  // lever, up or down
  function lever(g, l, t) {
    const k = fitH('lever_up', 66), down = l.flip >= 0.5;
    put(g, down ? 'lever_down' : 'lever_up', l.x, l.y + 2, k, 0.5, 1);
    const kx = down ? l.x + 36 : l.x + 10, ky = down ? l.y - 42 : l.y - 62;          // the crystal at the end of the handle
    bloom(g, kx, ky, 26, l.on ? '#9dffc8' : '#7ad8ff', 0.3 + 0.12 * Math.sin(t * 4));
  }
  // stalactite
  function drip(g, d) {
    if (d.state === 'gone') return;
    const k = (d.len * 1.25) / R('drip_hang')[3] * (d.state === 'grow' ? d.grow : 1);
    const jx = d.state === 'shake' ? rand(-2, 2) : 0;
    if (d.state === 'fall') { g.strokeStyle = 'rgba(200,215,230,0.22)'; g.lineWidth = 6; g.beginPath(); g.moveTo(d.x, d.y - 30); g.lineTo(d.x, d.y); g.stroke(); }
    put(g, 'drip_hang', d.x + jx, d.y - 6, k, 0.5, 0);
  }
  // the bouncing mushrooms are drawn live (they squash), not baked into the rock
  function shroomRuns(L) {
    if (L._shrooms && L._shroomsOf === L.t) return L._shrooms;
    const out = [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.get(x, y) === T_BOUNCE && L.get(x - 1, y) !== T_BOUNCE) { let n = 1; while (L.get(x + n, y) === T_BOUNCE) n++; out.push({ x, y, n }); }
    L._shrooms = out; L._shroomsOf = L.t; return out;
  }
  // bounce mushrooms (they squash when landed on)
  function shrooms(g, t) {
    const L = G.level, b = G.bounceAt;
    for (const s of shroomRuns(L)) {
      const px = s.x * TILE, py = s.y * TILE, w = s.n * TILE + 16, k = fit('shroom', w), h = R('shroom')[3] * k;
      const top = py - h * 0.14, bottom = top + h;
      const sq = b && G.t - b.t < 0.2 && b.x > px - 8 && b.x < px + s.n * TILE + 8 && Math.abs(b.y - py) < 12;
      if (sq) put(g, 'shroom_squash', px + s.n * TILE / 2, bottom, k, 0.5, 1);
      else put(g, 'shroom', px + s.n * TILE / 2, top, k, 0.5, 0);
    }
  }
  Art.mechFront = function (g, t, th) {
    hook();
    if (!ready()) return oldFront(g, t, th);
    if (G.level) shrooms(g, t);
    const m = G.mech; if (!m) return;
    for (const c of m.crumbles) crumble(g, c, t);
    for (const mv of m.movers) mover(g, mv, t, th);
    for (const s of m.saws) saw(g, s);
    for (const l of m.levers) lever(g, l, t);
    for (const d of m.drips) drip(g, d);
  };
  // a fallen stalactite: the moment it bursts, then a heap of rubble that fades
  if (typeof Drip !== 'undefined') {
    const oldShatter = Drip.prototype.shatter;
    Drip.prototype.shatter = function () {
      if (ready()) { const tip = this.y + this.len, gy = Math.min(G.level.ph, Math.floor(tip / TILE) * TILE + (G.level.solidAtPx(this.x, tip) ? 0 : TILE)); G.fx.push({ type: 'drip', x: this.x, y: gy, top: this.y, len: this.len, t: 0, life: 1.6 }); }
      return oldShatter.apply(this, arguments);
    };
  }

  // ---------------------------------------------------------------- the baked tiles: spikes; the mushrooms are left to the live pass
  const oldSpikes = drawSpikes, oldCap = drawShroomCap;
  const SKULL_SPIKES = { bone: 1, throne: 1, webbed: 1, mirror: 1 };
  drawSpikes = function (g, th, px, py, v) {
    if (!ready()) return oldSpikes(g, th, px, py, v);
    const r = R(SKULL_SPIKES[th.name] ? 'spikes_skull' : 'spikes_crystal'), H = 31, k = H / r[3], sw = TILE / k;
    const sx = r[0] + ((px / k) % (r[2] - sw));
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, r[1], sw, r[3], px - 0.3, py + TILE - H, TILE + 0.6, H);
    g.restore();
  };
  drawShroomCap = function (g, th, px, py, w, v) { if (!ready()) return oldCap(g, th, px, py, w, v); };

  // ---------------------------------------------------------------- breakable walls and gates (drawn live, tile by tile)
  // every tile of a wall shows its own part of one drawing that covers the whole wall
  function groupOf(L, x, y, kind, key) {
    const cache = L[key] || (L[key] = {});
    const id = x + ',' + y; if (cache[id]) return cache[id];
    let x0 = x, x1 = x, y0 = y, y1 = y; const st = [[x, y]], seen = new Set([id]);
    while (st.length) {
      const [a, b] = st.pop(); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
      for (const [c, d] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) { const k2 = c + ',' + d; if (!seen.has(k2) && L.get(c, d) === kind) { seen.add(k2); st.push([c, d]); } }
    }
    const grp = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    for (const k2 of seen) cache[k2] = grp;
    return grp;
  }
  function wallSlice(n, grp, x, y) {                                     // where tile (x, y) of the wall is in the drawing
    const r = R(n), W = grp.w * TILE, H = grp.h * TILE, k = Math.max(W / R('wall_whole')[2], H / R('wall_whole')[3]);
    const dw = r[2] * k, dh = r[3] * k, ox = grp.x * TILE + (W - dw) / 2, oy = grp.y * TILE + (H - dh) / 2;
    return [r[0] + (x * TILE - ox) / k, r[1] + (y * TILE - oy) / k, TILE / k, TILE / k];
  }
  // breakable walls and arena gates
  const oldBreak = Art.drawBreak, oldGate = Art.drawGate;
  Art.drawBreak = function (g, x, y, th, t) {
    if (!ready()) return oldBreak(g, x, y, th, t);
    const s = wallSlice('wall_whole', groupOf(G.level, x, y, T_BREAK, '_brk'), x, y);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(img, s[0], s[1], s[2], s[3], x * TILE - 0.4, y * TILE - 0.4, TILE + 0.8, TILE + 0.8); g.restore();
  };
  // a gate: the drawn door (with its arch above) over the whole closed opening, a little wider than it
  const DOOR = [218, 56, 472, 406], DOOR_BODY = 112;                     // on the sheet: the door, and where its arch ends
  let gateFrame = -1, gateDone = new Set(), gateCache = {};                // gates open row by row, so their extent is found again every frame
  Art.drawGate = function (g, x, y, th, t) {
    if (!ready()) return oldGate(g, x, y, th, t);
    if (gateFrame !== t) { gateFrame = t; gateDone = new Set(); gateCache = {}; }
    const L = G.level, grp = groupOf({ get: (a, b) => L.get(a, b), _g: gateCache }, x, y, T_GATE, '_g');
    const id = grp.x + ',' + grp.y; if (gateDone.has(id)) return; gateDone.add(id);
    const s = sub('gate_shut', DOOR[0], DOOR[1], DOOR[2], DOOR[3]);
    const H = grp.h * TILE, ky = H / (DOOR[3] - DOOR_BODY), W = grp.w * TILE + 18, dh = (DOOR[3] - DOOR[1]) * ky;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, s[0], s[1], s[2], s[3], grp.x * TILE - 9, (grp.y + grp.h) * TILE - dh, W, dh);
    g.restore();
  };

  // ---------------------------------------------------------------- effects: the opened chest, the fallen stalactite, bits of a broken wall
  const oldFx = Art.drawFx;
  Art.drawFx = function (g, f) {
    if (f.type === 'chest') {
      const a = f.t > f.life - 0.5 ? (f.life - f.t) / 0.5 : 1;
      bloom(g, f.x, f.y - 24, 90, '#ffd98a', 0.45 * a);
      put(g, 'chest_open', f.x + 2, f.y + 3, fit('chest_shut', 64) * 1.0, 0.5, 1, { alpha: a });
      return;
    }
    if (f.type === 'drip') {
      const k = (f.len * 1.25) / R('drip_hang')[3];
      if (f.t < 0.12) put(g, 'drip_fall', f.x, f.y + 2, k * 1.1, 0.5, 1);
      const a = f.t < 0.08 ? f.t / 0.08 : f.t > f.life - 0.6 ? (f.life - f.t) / 0.6 : 1;
      put(g, 'drip_pile', f.x, f.y + 3, k * 1.2, 0.5, 1, { alpha: a });
      return;
    }
    if (f.type === 'wallbit') {
      const a = 1 - f.t / f.life, dy = 0.5 * 900 * f.t * f.t, s = f.s;
      g.save(); g.globalAlpha *= a; g.imageSmoothingEnabled = true;
      g.drawImage(img, s[0], s[1], s[2], s[3], f.x + f.vx * f.t, f.y + dy, TILE, TILE);
      g.restore();
      return;
    }
    return oldFx(g, f);
  };
  // the game's own functions exist only once game.js has run: taking a cache opens its chest, breaking a wall drops its pieces
  let hooked = false;
  function hook() {
    if (hooked || typeof G === 'undefined' || !G.collectItem || !G.breakTile) return;
    hooked = true;
    const oldCollect = G.collectItem;
    G.collectItem = function (it) {
      if (it.def && it.def.kind === 'cache' && ready()) G.fx.push({ type: 'chest', x: it.x, y: it._gy != null ? it._gy : groundBelow(it.x, it.y), t: 0, life: 1.8 });
      return oldCollect.apply(this, arguments);
    };
    const oldBreakTile = G.breakTile;
    G.breakTile = function (tx, ty) {
      const L = G.level;
      if (ready() && L.get(tx, ty) === T_BREAK) G.fx.push({ type: 'wallbit', s: wallSlice('wall_broken', groupOf(L, tx, ty, T_BREAK, '_brk'), tx, ty), x: tx * TILE, y: ty * TILE, vx: rand(-40, 40), t: 0, life: 0.7 });
      return oldBreakTile.apply(this, arguments);
    };
  }
  window.addEventListener('load', hook);
  setTimeout(hook, 0);

  return { ready, put, R, hook };
})();
