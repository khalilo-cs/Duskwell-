'use strict';
// The map screen. Every room is drawn from its own tiles (rock, plates, spikes, acid, breakable walls), the rooms of an area
// stand together with their doors lined up, and the areas are packed side by side in one block. Benches, lanterns, merchants,
// wizards, the smith and the guardians have signs. Z steps through three views: this room, this area, the whole world.
const MapView = (() => {
  const GAP = 14, LABEL = 20;                                  // tiles between blocks, and the strip above a block for its name
  const VX = 24, VY = 76, VWd = VW - 48, VHd = 388;            // the window the map is seen through
  const SCALE_ROOM = 3, MAX_AREA = 3;
  let lay = null;
  const minis = {};

  // ---------------------------------------------------------------- layout (tiles)
  const rooms = () => WORLD.rooms;
  const edge = d => (d.w > d.h ? (d.y === 0 ? 'n' : 's') : (d.x === 0 ? 'w' : 'e'));
  const backDoor = (a, d) => { const B = rooms()[d.to]; return B ? (B.doors.find(q => q.id === d.toDoor && q.to === a) || B.doors.find(q => q.to === a)) : null; };
  const hits = (p, A, q, B) => Math.min(p.x + A.w, q.x + B.w) - Math.max(p.x, q.x) > 0 && Math.min(p.y + A.h, q.y + B.h) - Math.max(p.y, q.y) > 0;

  // the rooms of one area, each next to the one it opens into, door level with door level; a room that would land on another slides down
  function layoutArea(ids) {
    const W = rooms(), pos = {}, order = [];
    const free = (id, p) => ids.every(o => o === id || !pos[o] || !hits(p, W[id], pos[o], W[o]));
    const start = root => {
      pos[root] = { x: 0, y: 0 }; if (ids.some(o => o !== root && pos[o])) { let r = -1e9; for (const o of ids) if (pos[o] && o !== root) r = Math.max(r, pos[o].x + W[o].w); pos[root].x = r + 6; }
      const q = [root]; order.push(root);
      while (q.length) {
        const a = q.shift(), A = W[a], p = pos[a];
        for (const d of A.doors) {
          const b = d.to, B = W[b]; if (!B || B.area !== A.area || pos[b]) continue;
          const bd = backDoor(a, d), s = edge(d); let np;
          const bx = bd ? bd.x : 0, by = bd ? bd.y : 0;
          if (s === 'e') np = { x: p.x + A.w, y: p.y + d.y - by };
          else if (s === 'w') np = { x: p.x - B.w, y: p.y + d.y - by };
          else if (s === 's') np = { x: p.x + d.x - bx, y: p.y + A.h };
          else np = { x: p.x + d.x - bx, y: p.y - B.h };
          if (!free(b, np)) for (let k = 1; k < 120; k++) { const dn = { x: np.x, y: np.y + k }, up = { x: np.x, y: np.y - k }; if (free(b, dn)) { np = dn; break; } if (free(b, up)) { np = up; break; } }
          pos[b] = np; order.push(b); q.push(b);
        }
      }
    };
    for (const id of ids) if (!pos[id]) start(id);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id of ids) { const p = pos[id], R = W[id]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + R.w); y1 = Math.max(y1, p.y + R.h); }
    for (const id of ids) { pos[id].x -= x0; pos[id].y -= y0; }
    return { pos, w: x1 - x0, h: y1 - y0, ids };
  }
  // blocks on shelves, tallest first; the shelf width is the one that lets the whole map be seen largest
  function shelves(blocks, maxW) {
    const sorted = blocks.slice().sort((a, b) => b.h - a.h || b.w - a.w), rows = [];
    for (const b of sorted) {
      let row = rows.find(r => r.w + GAP + b.w <= maxW);
      if (!row) { row = { w: -GAP, h: 0, items: [] }; rows.push(row); }
      row.items.push(b); row.w += GAP + b.w; row.h = Math.max(row.h, b.h);
    }
    let y = 0, W = 0;
    for (const r of rows) { r.y = y; y += LABEL + r.h + GAP; W = Math.max(W, r.w); }
    return { rows, w: W, h: y - GAP };
  }
  function layout() {
    if (lay) return lay;
    const by = {};
    for (const id of WORLD.order) (by[rooms()[id].area] = by[rooms()[id].area] || []).push(id);
    const names = Diff.ORDER.filter(a => by[a]).concat(Object.keys(by).filter(a => !Diff.ORDER.includes(a)));
    const blocks = names.map(a => Object.assign(layoutArea(by[a]), { name: a }));
    let best = null;
    for (let mw = 600; mw <= 2600; mw += 20) {
      const s = shelves(blocks, mw), fit = Math.min(VWd / (s.w + 10), VHd / (s.h + 10));
      if (!best || fit > best.fit + 1e-9) best = { s, fit };
    }
    const pos = {}, areas = {};
    for (const r of best.s.rows) {
      let x = 0;
      for (const b of r.items) {
        const y = r.y + LABEL;
        areas[b.name] = { x, y, w: b.w, h: b.h, ids: b.ids };
        for (const id of b.ids) pos[id] = { x: x + b.pos[id].x, y: y + b.pos[id].y };
        x += b.w + GAP;
      }
    }
    lay = { pos, areas, w: best.s.w, h: best.s.h, fit: best.fit, names };
    return lay;
  }

  // ---------------------------------------------------------------- the picture of a room, from its tiles
  // the area colours are '#rrggbb' at first and 'rgb(r,g,b)' once the painted palettes have been applied
  const rgbOf = c => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : (/(\d+)\D+(\d+)\D+(\d+)/.exec(c) || [0, 156, 196, 255]).slice(1, 4).map(Number));
  const cA = (c, a) => { const [r, g, b] = rgbOf(c); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
  const tint = (c, k) => { const [r, g, b] = rgbOf(c); return 'rgb(' + Math.round(r + (255 - r) * k) + ',' + Math.round(g + (255 - g) * k) + ',' + Math.round(b + (255 - b) * k) + ')'; };
  const BLOCKS = new Set([T_SOLID, T_BREAK, T_GATE, T_CRACK, T_CRUMBLE]);
  // p pixels to a tile: 1 for the whole world, 2 and 4 for the closer views
  function mini(id, p) {
    const key = id + ':' + p; if (minis[key]) return minis[key];
    const d = rooms()[id], c = document.createElement('canvas'); c.width = d.w * p; c.height = d.h * p;
    const g = c.getContext('2d'), col = AREA_COLORS[d.area] || '#9cc4ff', hot = d.area === 'ember' || d.area === 'rustworks';
    const at = (x, y) => (x < 0 || y < 0 || x >= d.w || y >= d.h ? T_SOLID : d.t[y * d.w + x]);
    g.fillStyle = 'rgba(4,7,14,0.9)'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = cA(col, 0.13); g.fillRect(0, 0, c.width, c.height);
    const body = cA(col, 0.42), rim = tint(col, 0.45), top = tint(col, 0.8), ice = '#bfeaff';
    const thin = Math.max(1, Math.round(p / 4));
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const v = d.t[y * d.w + x]; if (v === T_AIR) continue;
      const px = x * p, py = y * p;
      if (v === T_SOLID || v === T_CRACK || v === T_CRUMBLE || v === T_BREAK || v === T_GATE) {
        const open = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)].map(t => !BLOCKS.has(t));
        const isIce = v === T_SOLID && d.iceCells && d.iceCells.has(y * d.w + x);
        const special = v === T_CRACK ? '#d9b48a' : v === T_CRUMBLE ? '#c8aa78' : v === T_BREAK ? '#f0dca0' : v === T_GATE ? '#ffd54a' : null;
        if (p === 1) { g.fillStyle = special || (isIce ? ice : (open.some(Boolean) ? rim : body)); g.fillRect(px, py, 1, 1); continue; }
        g.fillStyle = special ? cA(special, 0.55) : (isIce ? 'rgba(191,234,255,0.5)' : body); g.fillRect(px, py, p, p);
        if (special) { g.fillStyle = special; if (v === T_BREAK || v === T_CRACK) { g.fillRect(px, py, p, thin); g.fillRect(px, py + p - thin, p, thin); g.fillRect(px, py, thin, p); g.fillRect(px + p - thin, py, thin, p); } else g.fillRect(px, py, p, thin); continue; }
        g.fillStyle = isIce ? ice : rim;
        if (open[0]) { g.fillStyle = top; g.fillRect(px, py, p, thin); g.fillStyle = isIce ? ice : rim; }
        if (open[1]) g.fillRect(px, py + p - thin, p, thin);
        if (open[2]) g.fillRect(px, py, thin, p);
        if (open[3]) g.fillRect(px + p - thin, py, thin, p);
      } else if (v === T_ONEWAY) { g.fillStyle = '#d8e6ff'; g.fillRect(px, py, p, p === 1 ? 1 : thin + (p > 2 ? 1 : 0)); }
      else if (v === T_HAZARD) { g.fillStyle = '#ff5a4a'; if (p === 1) g.fillRect(px, py, 1, 1); else for (let k = 0; k < p; k += 2) g.fillRect(px + k, py + p - 1 - Math.min(p - 1, (k % 4 ? 2 : 3)), Math.min(2, p - k), Math.min(p, (k % 4 ? 2 : 3))); }
      else if (v === T_ACID) { g.fillStyle = hot ? 'rgba(255,122,58,0.9)' : 'rgba(125,255,90,0.85)'; g.fillRect(px, py, p, p); }
      else if (v === T_BOUNCE) { g.fillStyle = '#7dff8a'; g.fillRect(px, py + (p === 1 ? 0 : p - thin * 2), p, p === 1 ? 1 : thin * 2); }
    }
    minis[key] = c; return c;
  }

  // ---------------------------------------------------------------- signs
  const DARK = 'rgba(2,4,10,0.9)';
  function lantern(g, x, y, r, lit) {
    poly(g, [x, y - r, x + r * 0.72, y, x, y + r, x - r * 0.72, y]);
    g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = lit ? '#ffd98a' : '#6d6048'; g.fill();
    if (lit) { g.fillStyle = '#fff6d8'; g.fillRect(x - r * 0.12, y - r * 0.4, r * 0.24, r * 0.8); }
  }
  function bench(g, x, y, r) {
    g.lineWidth = 2; g.strokeStyle = DARK; g.lineJoin = 'round';
    g.beginPath(); g.rect(x - r, y - r * 0.9, r * 0.45, r * 1.1); g.rect(x - r, y - r * 0.2, r * 2, r * 0.5); g.rect(x - r, y + r * 0.3, r * 0.4, r * 0.65); g.rect(x + r * 0.6, y + r * 0.3, r * 0.4, r * 0.65); g.stroke();
    g.fillStyle = '#ffffff'; g.fill();
  }
  function coin(g, x, y, r, c) {
    g.beginPath(); g.arc(x, y, r * 0.9, 0, 7); g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = c; g.fill();
    g.beginPath(); g.arc(x, y, r * 0.5, 0, 7); g.lineWidth = 1.2; g.strokeStyle = 'rgba(90,60,0,0.8)'; g.stroke();
  }
  function star(g, x, y, r) {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.42 : r * 1.1; pts.push(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    poly(g, pts); g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = '#caa0ff'; g.fill();
  }
  function anvil(g, x, y, r) {
    poly(g, [x - r, y - r * 0.6, x + r, y - r * 0.6, x + r * 0.55, y - r * 0.05, x + r * 0.3, y - r * 0.05, x + r * 0.45, y + r * 0.75, x - r * 0.45, y + r * 0.75, x - r * 0.3, y - r * 0.05, x - r * 0.55, y - r * 0.05]);
    g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = '#ff9a4a'; g.fill();
  }
  function hanger(g, x, y, r) {
    poly(g, [x, y - r * 0.5, x + r, y + r * 0.7, x - r, y + r * 0.7]); g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = '#7fe0d0'; g.fill();
    g.beginPath(); g.arc(x, y - r * 0.8, r * 0.28, 0, 7); g.lineWidth = 1.6; g.strokeStyle = '#7fe0d0'; g.stroke();
  }
  function skull(g, x, y, r, alive) {
    g.beginPath(); g.arc(x, y - r * 0.15, r * 0.9, 0, 7); g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = alive ? '#ff6a6a' : '#6f7c90'; g.fill();
    g.fillRect(x - r * 0.5, y + r * 0.5, r, r * 0.55);
    g.fillStyle = DARK; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.2, r * 0.27, 0, 7); g.arc(x + r * 0.35, y - r * 0.2, r * 0.27, 0, 7); g.fill();
    if (!alive) { g.strokeStyle = '#d9e4f2'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.stroke(); }
  }
  function pin(g, x, y, r, t) {
    const k = 0.5 + 0.5 * Math.sin(t * 6);
    g.beginPath(); g.arc(x, y, r * (1.5 + 0.6 * k), 0, 7); g.strokeStyle = 'rgba(255,255,255,' + (0.55 - 0.35 * k) + ')'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.lineWidth = 2; g.strokeStyle = DARK; g.stroke(); g.fillStyle = '#ffffff'; g.fill();
  }
  const SIGNS = { bench, lantern, wizard: star, smith: anvil, outfitter: hanger, merchant: (g, x, y, r) => coin(g, x, y, r, '#ffd24a'), skull };

  // ---------------------------------------------------------------- the view
  // where the map is looking: room, area or world
  function base(mv) {
    const L = layout(), cd = G.level.def, cp = L.pos[G.level.id];
    if (mv.mode === 0) return { s: SCALE_ROOM, fx: cp.x + cd.w / 2, fy: cp.y + cd.h / 2 };
    if (mv.mode === 1) { const a = L.areas[cd.area]; return { s: Math.min(VWd / (a.w + 20), VHd / (a.h + 30), MAX_AREA), fx: a.x + a.w / 2, fy: a.y + a.h / 2 - 4 }; }
    return { s: L.fit, fx: L.w / 2, fy: L.h / 2 };
  }
  function view(mv) { const b = base(mv); if (mv.mode < 2) { b.fx += mv.px; b.fy += mv.py; } return b; }

  function update() {
    const mv = G.mapView || (G.mapView = { mode: 0, px: 0, py: 0 });
    if (Input.pressed('map') || Input.pressed('pause') || Input.pressed('attack')) { G.state = 'play'; G.mapView = null; Input.consume('map'); Input.consume('pause'); return; }
    if (Input.pressed('confirm')) { mv.mode = (mv.mode + 1) % 3; mv.px = mv.py = 0; Sound.play('select'); }
    if (mv.mode < 2) {
      const b = base(mv), L = layout(), k = 5 / b.s;
      mv.px = clamp(mv.px + Input.axisX() * k, -b.fx, L.w - b.fx); mv.py = clamp(mv.py + Input.axisY() * k, -b.fy, L.h - b.fy);
    }
  }

  const visitedIn = ids => ids.filter(id => G.visited[id]).length;
  function draw(g) {
    const L = layout(), W = rooms(), mv = G.mapView || (G.mapView = { mode: 0, px: 0, py: 0 }), v = view(mv), s = v.s, t = G.t, ar = LANG.cur === 'ar';
    const cur = G.level.id, cd = G.level.def;
    g.fillStyle = '#03050a'; g.fillRect(0, 0, VW, VH);
    const pic = AreaArt.picture(AreaArt.THEME_OF[cd.area]);
    if (pic) AreaArt.cover(g, pic, 0, 0, VW, VH, 0.3);
    g.fillStyle = 'rgba(3,5,10,0.84)'; g.fillRect(0, 0, VW, VH);
    setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, tr('map'), VW / 2, 32, '#eef5ff');
    const total = WORLD.order.length, found = WORLD.order.filter(id => G.visited[id]).length, col0 = AREA_COLORS[cd.area];
    g.font = font(17, '600'); g.fillStyle = col0; g.fillText(tr('area_' + cd.area) + '   ·   ' + sx('الغرف المكتشفة ', 'Rooms found ') + found + ' / ' + total, VW / 2, 58);
    // the window
    g.fillStyle = 'rgba(3,5,10,0.55)'; g.fillRect(VX, VY, VWd, VHd);
    g.save(); g.beginPath(); g.rect(VX, VY, VWd, VHd); g.clip();
    const X = x => VX + VWd / 2 + (x - v.fx) * s, Y = y => VY + VHd / 2 + (y - v.fy) * s;
    const p = s < 0.9 ? 1 : s < 1.8 ? 2 : 4;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const seen = id => G.visited[id];
    const on = id => { const q = L.pos[id], R = W[id], x = X(q.x), y = Y(q.y); return x < VX + VWd && y < VY + VHd && x + R.w * s > VX && y + R.h * s > VY; };
    // rooms not seen yet, next to ones that were: an outline and a question mark
    for (const id of WORLD.order) {
      if (seen(id)) continue;
      const R = W[id]; if (!R.doors.some(d => seen(d.to) && W[d.to].area === R.area)) continue;
      if (!on(id)) continue;
      const q = L.pos[id], x = X(q.x), y = Y(q.y), w = R.w * s, h = R.h * s, c = AREA_COLORS[R.area];
      g.fillStyle = cA(c, 0.07); g.fillRect(x, y, w, h);
      g.setLineDash([5, 4]); g.strokeStyle = cA(c, 0.5); g.lineWidth = 1.2; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); g.setLineDash([]);
      if (s >= 0.9) { g.font = font(Math.min(26, 8 + s * 4), '700'); g.fillStyle = cA(c, 0.55); g.textAlign = 'center'; g.fillText('?', x + w / 2, y + h / 2); }
    }
    // the rooms seen
    for (const id of WORLD.order) {
      if (!seen(id) || !on(id)) continue;
      const q = L.pos[id], R = W[id], x = X(q.x), y = Y(q.y), w = R.w * s, h = R.h * s, c = AREA_COLORS[R.area], here = id === cur;
      g.drawImage(mini(id, p), x, y, w, h);
      g.strokeStyle = here ? 'rgba(255,255,255,0.95)' : cA(c, 0.85); g.lineWidth = here ? 2.2 : 1.4; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      if (here) { g.save(); g.shadowColor = 'rgba(255,255,255,0.8)'; g.shadowBlur = 12; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); g.restore(); }
    }
    // doors, and the way to the rooms that are next to each other on the map but not touching
    const taken = [];                                                              // where names have been written, so no two overlap
    for (const id of WORLD.order) {
      if (!seen(id) || !on(id)) continue;
      const q = L.pos[id], R = W[id], c = AREA_COLORS[R.area];
      for (const d of R.doors) {
        const dx = X(q.x + d.x), dy = Y(q.y + d.y), dw = Math.max(d.w * s, 2.6), dh = Math.max(d.h * s, 2.6), horiz = d.w > d.h;
        g.fillStyle = '#fff1c4'; g.fillRect(horiz ? dx : dx - (d.x === 0 ? 0.5 : dw - 0.5), horiz ? dy - (d.y === 0 ? 0.5 : dh - 0.5) : dy, horiz ? Math.max(d.w * s, 3) : dw, horiz ? dh : Math.max(d.h * s, 3));
        const B = W[d.to]; if (!B) continue;
        const e = edge(d), cx = q.x + d.x + d.w / 2, cy = q.y + d.y + d.h / 2;
        if (B.area !== R.area) {                                                // out of this area: an arrow and where it leads
          if (!seen(d.to) && s < 0.9) continue;
          const ux = e === 'e' ? 1 : e === 'w' ? -1 : 0, uy = e === 's' ? 1 : e === 'n' ? -1 : 0, ax = X(cx) + ux * 10, ay = Y(cy) + uy * 10, r = 5;
          poly(g, [ax + ux * r, ay + uy * r, ax - ux * r * 0.6 + uy * r * 0.8, ay - uy * r * 0.6 + ux * r * 0.8, ax - ux * r * 0.6 - uy * r * 0.8, ay - uy * r * 0.6 - ux * r * 0.8]);
          g.fillStyle = AREA_COLORS[B.area]; g.fill(); g.lineWidth = 1.5; g.strokeStyle = DARK; g.stroke();
          if (s >= 1.1) {
            const nm = tr('area_' + B.area), lx = ax + ux * 10, ly = ay + uy * 12;
            g.font = font(12, '600'); g.textAlign = ux > 0 ? 'left' : ux < 0 ? 'right' : 'center'; g.fillStyle = AREA_COLORS[B.area]; textShadow(g, nm, lx, ly, AREA_COLORS[B.area], 4);
            const tw = g.measureText(nm).width; taken.push({ x0: ux > 0 ? lx : ux < 0 ? lx - tw : lx - tw / 2, x1: ux > 0 ? lx + tw : ux < 0 ? lx : lx + tw / 2, y0: ly - 8, y1: ly + 8 });
          }
        } else if (seen(d.to) && id < d.to) {                                    // inside the area: join the two doors when the rooms do not touch
          const bd = backDoor(id, d), P2 = L.pos[d.to]; if (!bd) continue;
          const x2 = P2.x + bd.x + bd.w / 2, y2 = P2.y + bd.y + bd.h / 2;
          if (Math.abs(x2 - cx) + Math.abs(y2 - cy) > 3) { g.strokeStyle = 'rgba(255,241,196,0.7)'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(cx), Y(cy)); g.lineTo(X(x2), Y(y2)); g.stroke(); g.setLineDash([]); }
        }
      }
    }
    // signs
    const r = s >= 2.4 ? 6.5 : s >= 1.2 ? 5 : 3.8;
    for (const id of WORLD.order) {
      if (!seen(id) || !on(id)) continue;
      const q = L.pos[id], R = W[id], at = (o, k) => [X(q.x + o.x + 0.5), Y(q.y + o.y - k)];
      for (const b of R.benches) bench(g, ...at(b, 1.2), r * 0.85);
      for (const sn of R.stations) lantern(g, ...at(sn, 1.6), r, stationLit(id));
      for (const n of R.npcs) { const k = n.type === 'trader' ? 'merchant' : n.type; if (SIGNS[k]) SIGNS[k](g, ...at(n, 2.2), r * 0.95); }
      if (R.arena) skull(g, X(q.x + R.w / 2), Y(q.y + R.h / 2), r * 1.15, !G.flags[R.arena.flag]);
    }
    // the hero
    const cp = L.pos[cur]; pin(g, X(cp.x + clamp(P.cx / 32, 0, cd.w)), Y(cp.y + clamp(P.cy / 32, 0, cd.h)), Math.max(4, r * 0.8), t);
    // names of the areas, over the left end of each block, only where the name fits inside the part of the block that is in view
    for (const name of L.names) {
      const a = L.areas[name]; if (!visitedIn(a.ids)) continue;
      const txt = tr('area_' + name) + '  ' + visitedIn(a.ids) + '/' + a.ids.length, ly = Y(a.y) - 8;
      g.font = font(s < 1 ? 13 : 15, '700'); g.textAlign = 'left'; g.direction = ar ? 'rtl' : 'ltr';
      const v0 = Math.max(X(a.x), VX), v1 = Math.min(X(a.x + a.w), VX + VWd), tw = g.measureText(txt).width;
      let lx = v0 + 6;
      for (let k = 0; k < 4; k++) { const hit = taken.find(r => lx < r.x1 + 4 && lx + tw > r.x0 - 4 && ly - 9 < r.y1 && ly + 9 > r.y0); if (!hit) break; lx = hit.x1 + 10; }
      if (ly < VY + 6 || ly > VY + VHd || lx + tw > v1 - 4) continue;
      g.fillStyle = AREA_COLORS[name]; textShadow(g, txt, lx, ly, AREA_COLORS[name], 4); taken.push({ x0: lx, x1: lx + tw, y0: ly - 9, y1: ly + 9 });
    }
    g.restore();
    g.strokeStyle = 'rgba(150,170,200,0.3)'; g.lineWidth = 1; g.strokeRect(VX + 0.5, VY + 0.5, VWd - 1, VHd - 1);
    // key
    const items = [['bench', sx('مقعد', 'Bench')], ['lantern', sx('فانوس', 'Lantern')], ['merchant', sx('تاجر', 'Merchant')], ['wizard', sx('ساحر', 'Wizard')], ['smith', sx('حدّاد', 'Smith')], ['skull', sx('حارس', 'Guardian')], ['door', sx('باب', 'Door')], ['you', sx('أنت', 'You')]];
    g.font = font(14, '600'); g.textBaseline = 'middle'; g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr';
    const wid = items.map(i => 28 + g.measureText(i[1]).width), tw = wid.reduce((a, b) => a + b + 14, -14);
    let x = (VW - tw) / 2; const y = 484;
    items.forEach((it, i) => {
      const ix = ar ? x + wid[i] - 10 : x + 10;
      if (it[0] === 'you') pin(g, ix, y, 4.5, t); else if (it[0] === 'door') { g.fillStyle = '#fff1c4'; g.fillRect(ix - 2, y - 7, 4, 14); }
      else if (it[0] === 'lantern') lantern(g, ix, y, 7, true); else if (it[0] === 'skull') skull(g, ix, y, 7, true); else SIGNS[it[0]](g, ix, y, 7);
      g.fillStyle = '#c3d2ea'; g.fillText(it[1], ar ? ix - 16 : ix + 16, y + 1);
      x += wid[i] + 14;
    });
    g.textAlign = 'center'; g.direction = ar ? 'rtl' : 'ltr'; g.font = font(14, '500'); g.fillStyle = 'rgba(190,205,230,0.65)'; g.fillText(tr('mapHint'), VW / 2, 521);
  }
  return { layout, mini, update, draw, view, base, edge, backDoor, hits, reset() { lay = null; for (const k of Object.keys(minis)) delete minis[k]; }, SIGNS };
})();
