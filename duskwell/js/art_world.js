'use strict';
// World drawing: palettes, pre-rendered tile layers, painted parallax backgrounds,
// living background creatures (bubbles, jellyfish, fireflies, leaves), dark foreground framing.
const Art = {};
Art.tileHooks = {};          // theme -> { ready(), solid(g, L, th, isS, seed), plats(g, L, th), scenery(g, L, th, isS, seed) }: a theme drawn from a tileset
// colours and details of each area: sky, three depth layers, tile, highlight, fog and glow
const THEMES = {
  town:    { sky: ['#1a0908', '#5c1f12', '#b4521e'], far: '#4a1c10', mid: '#2e110b', near: '#1a0907', tile: '#2a1510', hi: '#f0a060', edge: '#070203', fog: '#ff9a4a', part: '#ffb36b', glow: '#ffc27a', leaf: ['#e8742a', '#c9471e', '#f4a640', '#9e2f18'], name: 'town' },
  cave:    { sky: ['#04070e', '#0c1a2e', '#1c3656'], far: '#15283f', mid: '#0e1b2c', near: '#081120', tile: '#131c2a', hi: '#8fb4de', edge: '#020407', fog: '#4f7cb0', part: '#8fd8ff', glow: '#8fd8ff', name: 'cave' },
  moss:    { sky: ['#03100f', '#0b3934', '#1f7064'], far: '#0f4a43', mid: '#0a3530', near: '#062320', tile: '#0c2420', hi: '#7fe8b8', edge: '#010605', fog: '#5fd0b8', part: '#c6fff0', glow: '#9dffd8', name: 'moss' },
  crystal: { sky: ['#0f0a20', '#2a1446', '#4a246e'], far: '#2e1856', mid: '#1f103c', near: '#130a28', tile: '#1c1333', hi: '#e39cff', edge: '#040210', fog: '#9f60e8', part: '#ffb0e0', glow: '#ff9bd6', name: 'crystal' },
  spore:   { sky: ['#120804', '#3a200e', '#7a4a1c'], far: '#4a2a12', mid: '#2e190b', near: '#1a0e06', tile: '#221409', hi: '#ffb870', edge: '#060301', fog: '#e89a4a', part: '#ffd890', glow: '#ffb070', leaf: ['#e8742a', '#ffb070', '#d8a040', '#9e2f18'], name: 'spore' },
  aqueduct:{ sky: ['#02080c', '#0a2430', '#16505e'], far: '#0f3a46', mid: '#0a2a33', near: '#051a20', tile: '#0d2026', hi: '#8fe0ff', edge: '#010507', fog: '#4fb0c8', part: '#c8f4ff', glow: '#8fe0ff', name: 'aqueduct' },
  webbed:  { sky: ['#020103', '#0b0810', '#1a1424'], far: '#161022', mid: '#0d0a16', near: '#06050b', tile: '#110e18', hi: '#b8a8d8', edge: '#010102', fog: '#6a5a8a', part: '#d8d0ff', glow: '#c8a8ff', name: 'webbed' },
  foundry: { sky: ['#0d0604', '#2a120a', '#5a2a12'], far: '#3a1a0e', mid: '#26120a', near: '#160a06', tile: '#24140e', hi: '#ffb27a', edge: '#060201', fog: '#ff7a3a', part: '#ffc890', glow: '#ff9a50', name: 'foundry' },
  storm:   { sky: ['#05060f', '#1a2042', '#3c4c7e'], far: '#2a3560', mid: '#1b2447', near: '#0e1430', tile: '#1c2336', hi: '#c4d4ff', edge: '#03040a', fog: '#6a80c0', part: '#e4ecff', glow: '#a8c0ff', name: 'storm' },
  bone:    { sky: ['#07060a', '#1c1612', '#3e3224'], far: '#2c2219', mid: '#1d1610', near: '#0e0a07', tile: '#2a2219', hi: '#f2e8d0', edge: '#050403', fog: '#bfae8c', part: '#efe4c8', glow: '#bfe8d0', name: 'bone' },
  lunar:   { sky: ['#03040c', '#0e1236', '#2c3270'], far: '#20285a', mid: '#141a40', near: '#0a0e26', tile: '#1a1f3a', hi: '#dfe6ff', edge: '#020309', fog: '#8a96e0', part: '#f4f0ff', glow: '#e8ecff', name: 'lunar' },
  mirror:  { sky: ['#030308', '#0e0a1c', '#261c40'], far: '#1c1636', mid: '#120e24', near: '#08060f', tile: '#16111f', hi: '#ece4ff', edge: '#020106', fog: '#8a78c8', part: '#f2ecff', glow: '#d8c8ff', name: 'mirror' },
  frost:   { sky: ['#0c1a2a', '#2a4a6a', '#8cb8d8'], far: '#5a86a8', mid: '#3a6080', near: '#1e3a54', tile: '#2b4256', hi: '#e6f8ff', edge: '#050b12', fog: '#a8d8f0', part: '#ffffff', glow: '#cfeeff', name: 'frost' },
  ember:   { sky: ['#0a0304', '#2a0a0a', '#6a1a0a'], far: '#4a1410', mid: '#2a0c0a', near: '#150606', tile: '#201316', hi: '#ff7a3a', edge: '#050203', fog: '#ff4a1a', part: '#ffb060', glow: '#ff8a3a', name: 'ember' },
  title:   { sky: ['#04060e', '#10183a', '#2a2552'], far: '#1a2048', mid: '#0e1430', near: '#060a18', tile: '#0e1430', hi: '#9cc4ff', edge: '#020308', fog: '#5a6aa8', part: '#dfe8ff', glow: '#ffe9b0', name: 'title' },
  throne:  { sky: ['#020305', '#0a0e19', '#1a2236'], far: '#10172a', mid: '#0a0f1c', near: '#05070e', tile: '#0e121e', hi: '#c6d6f4', edge: '#010203', fog: '#5e72a0', part: '#eef4ff', glow: '#ffe2a8', name: 'throne' },
};

// ---------- tile layer (rendered once per room and scale) ----------
// wind zones: pale streaks that run with the wind (up for an updraft, sideways for a crosswind)
Art.drawWinds = function (g, L, t, cx, cy) {
  for (const w of L.winds) {
    if (w.x > cx + VW || w.x + w.w < cx || w.y > cy + VH || w.y + w.h < cy) continue;
    const n = Math.max(4, Math.round(w.w * w.h / 2600));
    g.save(); g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip();
    g.lineCap = 'round'; g.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const h1 = hash2(i, 7, w.x | 0), h2 = hash2(i, 11, w.y | 0), len = 22 + h1 * 34;
      g.strokeStyle = 'rgba(214,230,255,' + (0.22 + 0.3 * h2) + ')';
      g.beginPath();
      if (w.wy) {
        const span = w.h + len, d = (h2 * span - Math.sign(w.wy) * t * Math.abs(w.wy) * 0.8) % span, y = w.y + (d < 0 ? d + span : d), x = w.x + 6 + h1 * (w.w - 12);
        g.moveTo(x, y); g.lineTo(x, y + (w.wy < 0 ? len : -len));
      } else {
        const span = w.w + len, d = (h2 * span + Math.sign(w.wx) * t * Math.abs(w.wx) * 2.4) % span, x = w.x + (d < 0 ? d + span : d), y = w.y + 6 + h1 * (w.h - 12);
        g.moveTo(x, y); g.lineTo(x - Math.sign(w.wx) * len, y);
      }
      g.stroke();
    }
    g.restore();
  }
};

// low-gravity fields: a faint silver haze, slow motes that rise and twinkle, and a shimmering rim
Art.drawGravs = function (g, L, t, cx, cy) {
  for (const z of L.gravs) {
    if (z.x > cx + VW || z.x + z.w < cx || z.y > cy + VH || z.y + z.h < cy) continue;
    g.save(); g.beginPath(); g.rect(z.x, z.y, z.w, z.h); g.clip();
    const gr = g.createLinearGradient(0, z.y, 0, z.y + z.h); gr.addColorStop(0, 'rgba(190,200,255,0.03)'); gr.addColorStop(1, 'rgba(190,200,255,0.12)');
    g.fillStyle = gr; g.fillRect(z.x, z.y, z.w, z.h);
    const n = Math.max(6, Math.round(z.w * z.h / 3600));
    for (let i = 0; i < n; i++) {
      const h1 = hash2(i, 3, z.x | 0), h2 = hash2(i, 5, z.y | 0), h3 = hash2(i, 9, 31), span = z.h + 20;
      const d = (h2 * span - t * (10 + h3 * 16)) % span, y = z.y + (d < 0 ? d + span : d), x = z.x + 8 + h1 * (z.w - 16) + Math.sin(t * 0.7 + i) * 6;
      const a = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7));
      bloom(g, x, y, 6 + h3 * 6, '#dfe6ff', a * 0.6); g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.beginPath(); g.arc(x, y, 1 + h3, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(200,210,255,' + (0.14 + 0.08 * Math.sin(t * 1.4)) + ')'; g.lineWidth = 2; g.setLineDash([10, 8]); g.lineDashOffset = -t * 12; g.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2); g.setLineDash([]);
    g.restore();
  }
};

// draw the whole tile layer of a room once (rock, edges, ledges, spikes, door fog)
Art.renderLevel = function (L, s) {
  const th = THEMES[L.def.theme];
  const c = document.createElement('canvas');
  c.width = Math.ceil(L.pw * s); c.height = Math.ceil(L.ph * s);
  const g = c.getContext('2d');
  g.scale(s, s);
  // is the tile rock (for edges)
  const isS = (x, y) => { const v = L.get(x, y); return v === T_SOLID || v === T_BREAK || v === T_GATE || v === T_CRACK; };
  const seed = L.id.length * 77;
  const rim = mix(th.tile, th.hi, 0.2), rimHi = mix(th.tile, th.hi, 0.62);
  // a theme drawn from a tileset (js/art_tiles.js) lays its own rock, edges, ledges and scenery
  const hook = Art.tileHooks && Art.tileHooks[L.def.theme], mine = !!(hook && hook.ready());
  const mineSolid = mine && hook.solid(g, L, th, isS, seed), minePlats = mine && hook.plats(g, L, th);

  if (!mineSolid) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (L.get(x, y) !== T_SOLID) continue;
    let air = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!isS(x + i, y + j)) air++;
    const v = hash2(x, y, seed);
    const depth = clamp(air / 10, 0, 1);
    g.fillStyle = mix(mix(th.tile, '#000000', 0.26 - depth * 0.16), th.hi, 0.06 + v * 0.035);
    g.fillRect(x * TILE - 0.5, y * TILE - 0.5, TILE + 1, TILE + 1);
    if (v > 0.45) {                           // rounded pebbles in the rock face, also deep inside so a mass of rock is never a flat black
      g.fillStyle = rgba(th.hi, 0.08 + depth * 0.03); ellipse(g, x * TILE + 8 + v * 16, y * TILE + 10 + v * 10, 6 + v * 5, 4 + v * 3); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.stroke();
    }
  }

  if (!mineSolid) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (L.get(x, y) !== T_SOLID) continue;
    const px = x * TILE, py = y * TILE, v = hash2(x, y, seed + 9);
    const eT = !isS(x, y - 1), eB = !isS(x, y + 1), eL = !isS(x - 1, y), eR = !isS(x + 1, y);
    if (eT) {
      g.fillStyle = rim; g.beginPath(); g.moveTo(px, py + 7);
      for (let i = 1; i <= 4; i++) g.lineTo(px + i * 8, py + 3 + hash2(x * 4 + i, y, seed) * 6);
      g.lineTo(px + TILE, py - 0.5); g.lineTo(px, py - 0.5); g.fill();
      g.strokeStyle = rimHi; g.lineWidth = 2; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(px, py + 2.5);
      for (let i = 1; i <= 4; i++) g.lineTo(px + i * 8, py + 2 + hash2(x * 4 + i, y, seed) * 2.5);
      g.stroke(); g.globalAlpha = 1;
    }
    if (eL || eR) {
      g.fillStyle = mix(th.tile, th.hi, 0.12);
      if (eL) g.fillRect(px, py, 5, TILE); if (eR) g.fillRect(px + TILE - 5, py, 5, TILE);
    }
    if (eB) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(px, py + TILE - 7, TILE, 7); }
    // heavy ink outline with a slightly wobbly edge
    g.strokeStyle = th.edge; g.lineWidth = 4.5; g.lineCap = 'round';
    g.beginPath();
    const wob = (a, b) => (hash2(a, b, seed + 5) - 0.5) * 2.4;
    if (eT) { g.moveTo(px, py + wob(x, y)); g.lineTo(px + 16, py + wob(x + 7, y)); g.lineTo(px + TILE, py + wob(x + 1, y)); }
    if (eB) { g.moveTo(px, py + TILE + wob(x, y + 1)); g.lineTo(px + TILE, py + TILE + wob(x + 1, y + 1)); }
    if (eL) { g.moveTo(px + wob(x, y + 3), py); g.lineTo(px + wob(x, y + 4), py + TILE); }
    if (eR) { g.moveTo(px + TILE + wob(x + 1, y + 3), py); g.lineTo(px + TILE + wob(x + 1, y + 4), py + TILE); }
    g.stroke();
    // the border read clearly against any background: a light line just inside the ink, and a faint light line just outside it
    g.lineCap = 'round';
    g.strokeStyle = rgba(th.hi, 0.5); g.lineWidth = 1.6; g.beginPath();
    if (!eT) { /* the top rim is drawn above */ } else { g.moveTo(px + 1, py + 4.5); g.lineTo(px + TILE - 1, py + 4.5); }
    if (eL) { g.moveTo(px + 4.5, py + (eT ? 6 : 0)); g.lineTo(px + 4.5, py + TILE - (eB ? 6 : 0)); }
    if (eR) { g.moveTo(px + TILE - 4.5, py + (eT ? 6 : 0)); g.lineTo(px + TILE - 4.5, py + TILE - (eB ? 6 : 0)); }
    if (eB) { g.moveTo(px + 1, py + TILE - 4.5); g.lineTo(px + TILE - 1, py + TILE - 4.5); }
    g.stroke();
    g.strokeStyle = rgba(th.hi, 0.3); g.lineWidth = 1.4; g.beginPath();
    if (eT) { g.moveTo(px, py - 3.4); g.lineTo(px + TILE, py - 3.4); }
    if (eL) { g.moveTo(px - 3.4, py); g.lineTo(px - 3.4, py + TILE); }
    if (eR) { g.moveTo(px + TILE + 3.4, py); g.lineTo(px + TILE + 3.4, py + TILE); }
    if (eB) { g.moveTo(px, py + TILE + 3.4); g.lineTo(px + TILE, py + TILE + 3.4); }
    g.stroke();
    themeDetail(g, th, L, x, y, px, py, v, eT, eB, isS);
    if (L.isIce(x, y)) {                         // slippery ice: a pale glaze with a bright streak
      g.fillStyle = 'rgba(190,235,255,0.42)'; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 3, py + 4); g.lineTo(px + TILE - 8, py + 4); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 6 + v * 10, py + 8); g.lineTo(px + 14 + v * 10, py + TILE - 4); g.stroke();
    }
  }

  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const t = L.get(x, y), px = x * TILE, py = y * TILE, v = hash2(x, y, seed + 3);
    if (t === T_ONEWAY) {
      if (minePlats) continue;
      g.fillStyle = th.edge; g.fillRect(px, py - 2, TILE, 13);
      g.fillStyle = mix(th.tile, th.hi, 0.3); g.fillRect(px, py, TILE, 8);
      g.fillStyle = mix(th.tile, th.hi, 0.72); g.fillRect(px, py, TILE, 2.5);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px, py + 5, TILE, 3);
      if (v < 0.5) { g.fillStyle = mix(th.tile, th.hi, 0.25); g.strokeStyle = th.edge; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 6, py + 9); g.lineTo(px + 12, py + 9); g.lineTo(px + 9, py + 15 + v * 14); g.closePath(); g.fill(); g.stroke(); }
      if (th.name === 'moss' && v > 0.55) { g.strokeStyle = '#3aa070'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px + 16, py + 9); g.quadraticCurveTo(px + 21, py + 22, px + 15, py + 32); g.stroke(); }
      if (th.name === 'town' && v > 0.6) { g.fillStyle = pick(th.leaf); ellipse(g, px + 10 + v * 12, py - 1, 4, 2, v); g.fill(); }
    } else if (t === T_HAZARD) drawSpikes(g, th, px, py, v);
    else if (t === T_BOUNCE && L.get(x - 1, y) !== T_BOUNCE) {
      let n = 1; while (L.get(x + n, y) === T_BOUNCE) n++;
      drawShroomCap(g, th, px, py, n * TILE, v);
    }
  }

  if (mine && hook.scenery) hook.scenery(g, L, th, isS, seed);

  for (const d of L.def.doors) {
    const dx = d.x * TILE, dy = d.y * TILE, dw = d.w * TILE, dh = d.h * TILE;
    let gr, r;
    if (d.x === 0) { gr = g.createLinearGradient(dx, 0, dx + 130, 0); r = [dx, dy - 10, 130, dh + 20]; }
    else if (d.x + d.w === L.w) { gr = g.createLinearGradient(dx + dw, 0, dx + dw - 130, 0); r = [dx + dw - 130, dy - 10, 130, dh + 20]; }
    else if (d.y === 0) { gr = g.createLinearGradient(0, dy, 0, dy + 130); r = [dx - 8, dy, dw + 16, 130]; }
    else { gr = g.createLinearGradient(0, dy + dh, 0, dy + dh - 130); r = [dx - 8, dy + dh - 130, dw + 16, 130]; }
    gr.addColorStop(0, rgba(th.fog, 0.36)); gr.addColorStop(1, rgba(th.fog, 0));
    g.fillStyle = gr; g.fillRect(r[0], r[1], r[2], r[3]);
  }
  return c;
};

// per-area decoration on the top and bottom edges of rock
function themeDetail(g, th, L, x, y, px, py, v, eT, eB, isS) {
  const n = th.name;
  if (eT) {
    if (n === 'moss') {
      // cushions of moss spilling over the edge, then grass blades
      for (let i = 0; i < 2; i++) {
        const mx = px + 6 + i * 16 + hash2(x, y, i + 40) * 6, r = 7 + hash2(x, y, i + 44) * 6;
        g.beginPath(); g.arc(mx, py + 4, r, Math.PI, 0); g.closePath(); fs(g, '#2f8a62', th.edge, 2.5);
        g.fillStyle = 'rgba(160,255,200,0.35)'; g.beginPath(); g.arc(mx - r * 0.3, py + 1, r * 0.45, Math.PI, 0); g.fill();
      }
      if (v < 0.45) {
        for (let i = 0; i < 4; i++) {
          const bx = px + 3 + i * 8 + hash2(x, y, i) * 4, h = 8 + hash2(x, y, i + 20) * 14;
          g.strokeStyle = i % 2 ? '#3fae78' : '#8ff0b8'; g.lineWidth = 2; g.lineCap = 'round';
          g.beginPath(); g.moveTo(bx, py - 2); g.quadraticCurveTo(bx + (hash2(x, y, i + 5) - 0.5) * 8, py - h * 0.6, bx + (hash2(x, y, i + 9) - 0.3) * 10, py - h); g.stroke();
        }
      }
      if (v > 0.9) { bloom(g, px + 16, py - 8, 16, '#c6fff0', 0.5); g.fillStyle = '#e6fff6'; g.beginPath(); g.arc(px + 16, py - 7, 4, Math.PI, 0); g.fill(); g.fillRect(px + 15, py - 7, 2, 6); }
    } else if (n === 'town') {
      // autumn leaf litter
      for (let i = 0; i < 3; i++) {
        const lx = px + 4 + i * 10 + hash2(x, y, i + 3) * 6;
        g.fillStyle = th.leaf[Math.floor(hash2(x, y, i + 8) * th.leaf.length)];
        ellipse(g, lx, py + 1, 5, 2.4, hash2(x, y, i) * 2 - 1); g.fill();
      }
      if (v < 0.25) { g.strokeStyle = '#6a2a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 20, py); g.quadraticCurveTo(px + 22, py - 10, px + 26, py - 14); g.stroke(); g.fillStyle = '#e8742a'; ellipse(g, px + 27, py - 15, 4, 2.5, -0.5); g.fill(); }
    } else if (n === 'crystal' && v < 0.3) {
      const h = 10 + v * 60, bx = px + 6 + v * 60;
      g.beginPath(); g.moveTo(bx - 5, py + 2); g.lineTo(bx - 1, py - h); g.lineTo(bx + 5, py + 2); g.closePath(); fs(g, mix(th.tile, th.hi, 0.75), th.edge, 2.5);
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.moveTo(bx - 1, py - h); g.lineTo(bx + 1, py + 2); g.lineTo(bx - 3, py + 2); g.fill();
    } else if (n === 'cave') {
      if (v < 0.35) { ellipse(g, px + 8 + v * 50, py + 1, 5 + v * 10, 4 + v * 6); g.save(); g.clip(); g.fillStyle = mix(th.tile, th.hi, 0.35); g.fillRect(px - 10, py - 20, 60, 21); g.restore(); ellipse(g, px + 8 + v * 50, py + 1, 5 + v * 10, 4 + v * 6); fs(g, null, th.edge, 2); }
      if (v > 0.93) { bloom(g, px + 16, py - 6, 18, '#8fd8ff', 0.5); ellipse(g, px + 16, py - 5, 3, 4); fs(g, '#d8f4ff', th.edge, 1.5); }
    } else if (n === 'spore') {
      if (v < 0.35) {
        const mx = px + 6 + v * 50, h = 6 + v * 16;
        g.strokeStyle = th.edge; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, py); g.lineTo(mx, py - h); g.stroke();
        g.strokeStyle = '#eadfc4'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); g.arc(mx, py - h, 4 + v * 8, Math.PI, 0); g.closePath(); fs(g, v < 0.15 ? '#ff8a4a' : '#d8a040', th.edge, 2);
        if (v < 0.08) bloom(g, mx, py - h, 20, '#ffb070', 0.4);
      }
    } else if (n === 'aqueduct') {
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px, py + 14); g.lineTo(px + TILE, py + 14); g.moveTo(px + (y % 2 ? 8 : 22), py + 14); g.lineTo(px + (y % 2 ? 8 : 22), py + TILE); g.stroke();
      if (v < 0.3) { g.fillStyle = '#2f7a6a'; ellipse(g, px + 16, py + 1, 12, 3); g.fill(); }
    } else if (n === 'webbed') {
      if (v < 0.2) { g.strokeStyle = 'rgba(220,215,240,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py - 1); g.quadraticCurveTo(px + 16, py - 14, px + 32, py - 1); g.moveTo(px + 16, py - 7); g.lineTo(px + 16, py); g.stroke(); }
    } else if (n === 'foundry') {
      // riveted iron trim along the edge, and the odd pipe running over it
      g.fillStyle = 'rgba(255,190,140,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(px + 6 + i * 10, py + 6, 1.8, 0, 7); g.fill(); }
      if (v < 0.22) { g.strokeStyle = th.edge; g.lineWidth = 9; g.beginPath(); g.moveTo(px - 2, py - 5); g.lineTo(px + TILE + 2, py - 5); g.stroke(); g.strokeStyle = '#6a4632'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#8a5a3c'; g.fillRect(px + 12, py - 11, 6, 12); }
      if (v > 0.94) { bloom(g, px + 16, py - 4, 22, '#ff9a50', 0.5); g.fillStyle = '#ffd0a0'; g.beginPath(); g.arc(px + 16, py - 3, 2.5, 0, 7); g.fill(); }
    } else if (n === 'throne') {
      g.strokeStyle = 'rgba(210,225,255,0.35)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(px, py + 5); g.lineTo(px + TILE, py + 5); g.stroke();
      if (v < 0.12) { g.strokeStyle = 'rgba(255,226,168,0.5)'; g.beginPath(); g.moveTo(px + 8, py + 12); g.lineTo(px + 14, py + 20); g.lineTo(px + 20, py + 12); g.stroke(); }
    }
  }
  if (eB) {
    const k = hash2(x, y, 77);
    if (k < 0.4 && n !== 'town') {
      const len = 8 + k * 44, bx = px + 6 + k * 40;
      g.beginPath(); g.moveTo(bx - 6, py + TILE - 1); g.lineTo(bx, py + TILE + len); g.lineTo(bx + 6, py + TILE - 1); g.closePath();
      fs(g, n === 'crystal' ? mix(th.tile, th.hi, 0.55) : mix(th.tile, th.hi, 0.16), th.edge, 2.5);
    }
    if (n === 'webbed' && k > 0.55) {
      g.strokeStyle = 'rgba(225,220,245,0.4)'; g.lineWidth = 1.2; const bx = px + 4 + (k - 0.5) * 40, len = 20 + k * 40;
      g.beginPath(); g.moveTo(bx - 10, py + TILE); g.lineTo(bx, py + TILE + len); g.lineTo(bx + 12, py + TILE); g.moveTo(bx - 5, py + TILE + len * 0.45); g.lineTo(bx + 6, py + TILE + len * 0.45); g.stroke();
    }
    if (n === 'aqueduct' && k > 0.8) { g.fillStyle = 'rgba(160,230,255,0.6)'; ellipse(g, px + 16, py + TILE + 6 + k * 10, 2, 3.5); g.fill(); }
    if ((n === 'moss' || n === 'town') && k > 0.62) {
      const bx = px + 6 + (k - 0.6) * 60, len = 26 + k * 60;
      g.strokeStyle = th.edge; g.lineWidth = 5; g.beginPath(); g.moveTo(bx, py + TILE); g.bezierCurveTo(bx + 8, py + TILE + len * 0.4, bx - 8, py + TILE + len * 0.7, bx + 3, py + TILE + len); g.stroke();
      g.strokeStyle = n === 'moss' ? '#3aa070' : '#8a3a1a'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = n === 'moss' ? '#5fd09a' : th.leaf[0]; ellipse(g, bx + 4, py + TILE + len * 0.55, 5, 2.6, 0.6); g.fill(); ellipse(g, bx - 3, py + TILE + len * 0.85, 5, 2.6, -0.6); g.fill();
    }
  }
}
// bounce mushroom cap
function drawShroomCap(g, th, px, py, w, v) {
  const cx = px + w / 2;
  // stem
  g.beginPath(); g.moveTo(cx - 9, py + 8); g.quadraticCurveTo(cx - 13, py + 40, cx - 8, py + 70); g.lineTo(cx + 8, py + 70); g.quadraticCurveTo(cx + 13, py + 40, cx + 9, py + 8); g.closePath();
  fs(g, '#e8dcc0', th.edge, 3);
  g.strokeStyle = 'rgba(120,90,60,0.4)'; g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 6 + i * 6, py + 14); g.lineTo(cx - 7 + i * 6, py + 64); g.stroke(); }
  // cap
  g.beginPath(); g.moveTo(px - 4, py + 12); g.quadraticCurveTo(px - 2, py - 16, cx, py - 18); g.quadraticCurveTo(px + w + 2, py - 16, px + w + 4, py + 12); g.quadraticCurveTo(cx, py + 4, px - 4, py + 12); g.closePath();
  const gr = g.createLinearGradient(0, py - 18, 0, py + 12); gr.addColorStop(0, '#ff8a4a'); gr.addColorStop(1, '#b8341e');
  fs(g, gr, th.edge, 3.5);
  g.fillStyle = '#fff1d8'; for (let i = 0; i < Math.max(2, w / 22); i++) { ellipse(g, px + 8 + hash2(i, px, 7) * (w - 16), py - 8 + hash2(i, px, 9) * 10, 3 + hash2(i, px, 3) * 3, 2.2 + hash2(i, px, 5) * 2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.25)'; ellipse(g, cx - w * 0.2, py - 10, w * 0.18, 3, -0.2); g.fill();
}
// spikes in the colour of the area
function drawSpikes(g, th, px, py, v) {
  const n = th.name, cols = { foundry: '#b8b0a8', cave: '#e4ebf2', moss: '#2c7d4a', crystal: '#e8a8ff', throne: '#eef4ff', town: '#4a2414' };
  for (let i = 0; i < 4; i++) {
    const bx = px + i * 8, h = 15 + hash2(px + i, py, 4) * 6;
    g.beginPath(); g.moveTo(bx, py + TILE); g.lineTo(bx + 4, py + TILE - h); g.lineTo(bx + 8, py + TILE); g.closePath();
    fs(g, cols[n] || '#ddd', th.edge, 2.4);
    if (n === 'moss') { g.fillStyle = '#d04a3a'; g.beginPath(); g.moveTo(bx + 2.5, py + TILE - h + 5); g.lineTo(bx + 4, py + TILE - h); g.lineTo(bx + 5.5, py + TILE - h + 5); g.fill(); }
  }
}

// ---------- parallax background ----------
// Every layer has a depth z behind the play plane (negative = in front). Its screen speed is
// CAM_DIST / (CAM_DIST + z): the ratio a perspective camera at distance CAM_DIST would produce.
const LAYER_PERIOD = 2200, CAM_DIST = 10;
// parallax: layers further away move less
const depthFactor = z => CAM_DIST / (CAM_DIST + z);
const LAYER_Z = [70, 28, 11], CRITTER_Z = [12, 26], FOG_Z = [8, -1.3], FORE_Z = -2, VERTICAL_PARALLAX = 0.18;
// random shapes of the three background layers of an area
function makeLayers(th) {
  const rnd = mulberry32(th.name.length * 9973 + th.name.charCodeAt(0) * 131);
  const layers = [[], [], []];
  for (let li = 0; li < 3; li++) {
    const count = [14, 16, 10][li], scale = [0.8, 1, 1.35][li];
    for (let i = 0; i < count; i++) {
      const x = i / count * LAYER_PERIOD + rnd() * 80;
      layers[li].push({ x, r1: rnd(), r2: rnd(), r3: rnd(), top: rnd() < 0.5, s: scale });
    }
  }
  th.critters = [];
  for (let i = 0; i < 16; i++) th.critters.push({ x: rnd() * LAYER_PERIOD, y: 60 + rnd() * 380, r: 8 + rnd() * 26, p: rnd() * 7, jelly: rnd() < 0.3, par: depthFactor(lerp(CRITTER_Z[0], CRITTER_Z[1], rnd())) });
  return layers;
}
// one background shape (stalactite, vine, crystal, pillar ...) by area
function drawShape(g, th, li, o) {
  const n = th.name, col = [th.far, th.mid, th.near][li], s = o.s;
  g.fillStyle = col;
  if (n === 'cave') {
    const w = (30 + o.r1 * 60) * s, h = (80 + o.r2 * 200) * s;
    if (li === 0 && o.r3 < 0.3) { g.fillRect(o.x, 0, w * 1.6, VH + 40); return; }
    g.beginPath();
    if (o.top) { g.moveTo(o.x - w, -10); g.quadraticCurveTo(o.x - w * 0.3, h * 0.5, o.x, h); g.quadraticCurveTo(o.x + w * 0.3, h * 0.5, o.x + w, -10); }
    else { g.moveTo(o.x - w, VH + 10); g.quadraticCurveTo(o.x - w * 0.3, VH - h * 0.35, o.x, VH - h * 0.7); g.quadraticCurveTo(o.x + w * 0.3, VH - h * 0.35, o.x + w, VH + 10); }
    g.fill();
  } else if (n === 'moss') {
    if (li === 0) {
      const w = (24 + o.r1 * 40) * s; g.fillRect(o.x, 0, w, VH + 40);
      g.beginPath(); g.arc(o.x + w / 2, 60 + o.r2 * 80, 70 + o.r3 * 80, 0, 7); g.fill();
    } else {
      const len = (120 + o.r2 * 260) * s;
      if (o.top) {
        g.strokeStyle = col; g.lineWidth = 5 + o.r1 * 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(o.x, -10); g.bezierCurveTo(o.x + 30, len * 0.3, o.x - 30, len * 0.6, o.x + 10, len); g.stroke();
        for (let k = 1; k < 5; k++) { g.beginPath(); g.ellipse(o.x + (k % 2 ? 12 : -12), len * k / 5, 13, 6, 0.6, 0, 7); g.fill(); }
      } else {
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(o.x, VH + 10); g.quadraticCurveTo(o.x + k * 50, VH - len * 0.6, o.x + k * 80, VH - len * 0.4 + Math.abs(k) * 30); g.quadraticCurveTo(o.x + k * 40, VH - len * 0.3, o.x + 14, VH + 10); g.fill(); }
      }
    }
  } else if (n === 'crystal') {
    const w = (26 + o.r1 * 50) * s, h = (120 + o.r2 * 240) * s;
    const grad = g.createLinearGradient(0, o.top ? 0 : VH - h, 0, o.top ? h : VH);
    grad.addColorStop(0, col); grad.addColorStop(1, mix(col, th.hi, li === 2 ? 0.25 : 0.12)); g.fillStyle = grad;
    for (let k = 0; k < 3; k++) {
      const kw = w * (1 - k * 0.25), kh = h * (1 - k * 0.3), kx = o.x + (k - 1) * w * 0.7;
      g.beginPath();
      if (o.top) { g.moveTo(kx - kw * 0.5, -10); g.lineTo(kx - kw * 0.3, kh * 0.6); g.lineTo(kx, kh); g.lineTo(kx + kw * 0.5, kh * 0.5); g.lineTo(kx + kw * 0.5, -10); }
      else { g.moveTo(kx - kw * 0.5, VH + 10); g.lineTo(kx - kw * 0.4, VH - kh * 0.6); g.lineTo(kx, VH - kh); g.lineTo(kx + kw * 0.5, VH - kh * 0.5); g.lineTo(kx + kw * 0.5, VH + 10); }
      g.closePath(); g.fill();
    }
  } else if (n === 'throne') {
    const w = (40 + o.r1 * 50) * s;
    if (li === 0 || (li === 2 && o.r3 < 0.5)) {
      g.fillRect(o.x, 0, w, VH + 40); g.fillRect(o.x - 10, 0, w + 20, 26); g.fillRect(o.x - 10, VH - 40, w + 20, 40);
      g.fillStyle = rgba(th.hi, 0.05); g.fillRect(o.x + w * 0.2, 0, 3, VH);
    } else {
      g.strokeStyle = col; g.lineWidth = 3;
      const len = 80 + o.r2 * 220; g.beginPath(); g.moveTo(o.x, -10); g.lineTo(o.x, len); g.stroke();
      for (let k = 0; k < len; k += 16) { g.beginPath(); g.ellipse(o.x, k, 5, 8, 0, 0, 7); g.stroke(); }
      g.beginPath(); g.moveTo(o.x - 14, len); g.lineTo(o.x, len + 28); g.lineTo(o.x + 14, len); g.fill();
    }
  } else if (n === 'spore') {           // a forest of giant mushrooms
    const sw = (16 + o.r1 * 30) * s, cw = (70 + o.r2 * 120) * s, top = (o.top ? 60 : 180) + o.r3 * 160;
    g.fillRect(o.x - sw / 2, top, sw, VH + 40 - top);
    g.beginPath(); g.moveTo(o.x - cw, top + 14); g.quadraticCurveTo(o.x - cw, top - cw * 0.55, o.x, top - cw * 0.6); g.quadraticCurveTo(o.x + cw, top - cw * 0.55, o.x + cw, top + 14); g.closePath(); g.fill();
    if (li < 2) { g.fillStyle = rgba(th.hi, 0.06 + li * 0.04); for (let k = 0; k < 4; k++) { ellipse(g, o.x + (hash2(k, Math.floor(o.x), 2) - 0.5) * cw * 1.2, top - hash2(k, Math.floor(o.x), 3) * cw * 0.4, 6 * s, 4 * s); g.fill(); } }
  } else if (n === 'aqueduct') {        // arches and pipes
    const w = (120 + o.r1 * 120) * s, top = 120 + o.r2 * 160;
    if (li < 2 || o.r3 < 0.5) {
      g.fillRect(o.x, top, 34 * s, VH + 40 - top); g.fillRect(o.x + w, top, 34 * s, VH + 40 - top);
      g.strokeStyle = col; g.lineWidth = 30 * s; g.beginPath(); g.arc(o.x + w / 2 + 17 * s, top + 10, w / 2, Math.PI, 0); g.stroke();
      g.fillRect(o.x - 20, top - w / 2 - 20, w + 74 * s, 26 * s);
    } else {
      g.strokeStyle = col; g.lineWidth = 22 * s; const py = 90 + o.r2 * 300;
      g.beginPath(); g.moveTo(o.x - 200, py); g.lineTo(o.x + 200, py); g.stroke();
      g.lineWidth = 34 * s; for (const k of [-120, 40, 160]) { g.beginPath(); g.moveTo(o.x + k, py - 1); g.lineTo(o.x + k + 16, py - 1); g.stroke(); }
    }
  } else if (n === 'foundry') {         // gears, chimneys and girders
    if (li === 0 || o.r3 < 0.4) {
      const w = (40 + o.r1 * 30) * s, top = 120 + o.r2 * 200;
      g.fillRect(o.x, top, w, VH + 40 - top); g.fillRect(o.x - 8, top, w + 16, 14);
    } else {
      const r = (50 + o.r1 * 70) * s, cy = o.top ? 40 + o.r2 * 120 : VH - 60 - o.r2 * 120;
      g.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; g.lineTo(o.x + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(o.x + Math.cos(a + 0.22) * (r + 10), cy + Math.sin(a + 0.22) * (r + 10)); } g.closePath(); g.fill();
    }
  } else if (n === 'webbed') {          // webs, roots and hanging cocoons
    g.strokeStyle = col; g.lineWidth = 2;
    if (o.top) {
      const cx = o.x, cy = -10, r = (140 + o.r1 * 160) * s;
      for (let k = 0; k < 7; k++) { const a = Math.PI * (0.1 + k * 0.13); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
      for (let rr = 30; rr < r; rr += 34) { g.beginPath(); g.arc(cx, cy, rr, Math.PI * 0.1, Math.PI * 0.88); g.stroke(); }
      const len = 80 + o.r2 * 200; g.beginPath(); g.moveTo(o.x + 60, -10); g.lineTo(o.x + 60, len); g.stroke();
      ellipse(g, o.x + 60, len + 22, 12 * s, 26 * s); g.fill();
    } else {
      g.lineWidth = 8 * s + 4;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(o.x + k * 30, VH + 10); g.bezierCurveTo(o.x + k * 30 + 40, VH - 120, o.x - 30 + k * 20, VH - 200, o.x + 20 + k * 10, VH - 260 * (0.5 + o.r2 * 0.5)); g.stroke(); }
    }
  } else { // town: an autumn wood around the village
    if (li === 1) {
      const w = (50 + o.r1 * 80) * s, h = (80 + o.r2 * 150) * s, top = VH - h;
      g.fillRect(o.x, top, w, h + 40);
      g.beginPath(); g.moveTo(o.x - 8, top); g.lineTo(o.x + w / 2, top - 36 - o.r1 * 40); g.lineTo(o.x + w + 8, top); g.fill();
      g.fillStyle = 'rgba(255,200,120,0.6)';
      for (let k = 0; k < 5; k++) { const wx = o.x + 8 + hash2(k, Math.floor(o.x), 3) * (w - 22), wy = top + 14 + hash2(k, Math.floor(o.x), 8) * (h - 30); if (hash2(k, Math.floor(o.x), 11) < 0.5) { g.beginPath(); g.arc(wx + 3, wy + 4, 4, Math.PI, 0); g.rect(wx - 1, wy + 4, 8, 7); g.fill(); } }
      return;
    }
    const tw = (18 + o.r1 * 26) * s, cx = o.x;
    g.beginPath(); g.moveTo(cx - tw, VH + 20); g.quadraticCurveTo(cx - tw * 0.4, VH * 0.5, cx - tw * 0.5, 40); g.lineTo(cx + tw * 0.5, 40); g.quadraticCurveTo(cx + tw * 0.4, VH * 0.5, cx + tw, VH + 20); g.fill();
    const lc = li === 0 ? mix(col, '#c9471e', 0.35) : mix(col, '#e8742a', 0.25);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k % 2 ? lc : col;
      g.beginPath(); g.arc(cx + (hash2(k, Math.floor(cx), 1) - 0.5) * 180 * s, 30 + hash2(k, Math.floor(cx), 2) * 120, (50 + hash2(k, Math.floor(cx), 4) * 50) * s, 0, 7); g.fill();
    }
  }
}
// background creatures: bubbles, jellyfish, fireflies, leaves
function drawCritters(g, th, camX, camY, t) {
  if (!['moss', 'cave', 'aqueduct', 'spore'].includes(th.name)) return;
  for (const c of th.critters) {
    const x = ((c.x - camX * c.par + Math.sin(t * 0.2 + c.p) * 40) % LAYER_PERIOD + LAYER_PERIOD) % LAYER_PERIOD - 200;
    if (x < -80 || x > VW + 80) continue;
    const y = c.y - camY * c.par * VERTICAL_PARALLAX + Math.sin(t * 0.6 + c.p) * 14;
    if (th.name === 'cave' || th.name === 'spore') {          // drifting lumafly lanterns / glowing spores
      if (!c.jelly) continue;
      bloom(g, x, y, 34, th.glow, 0.4 + 0.2 * Math.sin(t * 3 + c.p));
      g.fillStyle = '#e6f8ff'; ellipse(g, x, y, 3, 3); g.fill();
      continue;
    }
    if (c.jelly) {                     // jellyfish with glowing cores
      const r = c.r * 0.9 + 10;
      bloom(g, x, y, r * 1.8, '#ffb070', 0.18);
      g.fillStyle = 'rgba(230,220,255,0.28)'; g.strokeStyle = 'rgba(8,16,20,0.75)'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.quadraticCurveTo(x + r * 0.5, y + r * 0.25, x, y + r * 0.1); g.quadraticCurveTo(x - r * 0.5, y + r * 0.25, x - r, y); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,190,110,0.85)'; ellipse(g, x, y - r * 0.35, r * 0.32, r * 0.3); g.fill();
      g.strokeStyle = 'rgba(230,220,255,0.4)'; g.lineWidth = 1.6;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * r * 0.25, y + 2); g.quadraticCurveTo(x + k * r * 0.3 + Math.sin(t * 2 + k) * 6, y + r * 0.8, x + k * r * 0.2, y + r * 1.5); g.stroke(); }
    } else {                           // bubbles
      g.strokeStyle = 'rgba(200,255,240,0.3)'; g.lineWidth = 1.6; ellipse(g, x, y, c.r * 0.7, c.r * 0.7); g.stroke();
      g.fillStyle = 'rgba(200,255,240,0.07)'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; ellipse(g, x - c.r * 0.25, y - c.r * 0.28, c.r * 0.16, c.r * 0.1, -0.6); g.fill();
    }
  }
}
// ---------- painted backgrounds ----------
// art/bg/<area>/{sky,l0,l1,l2}.webp are painted offline by tools/paint (an opaque sky plus far,
// mid and near layers, each tiling every PAINT_P logical px). Until an area's set has loaded,
// or if it cannot load, the procedural layers below are drawn instead.
const PAINT_P = 1600, PAINT_H = 700, PAINT_TOP = -40, SKY_Z = 160, PAINT_KEEP = 3;
// the sky of these areas is a whole concept picture (tools/paint/import_concept.py); the silhouette layers over it are
// thinned (alpha per layer: sky, far, mid, near) so it shows and the play field stays readable
// the far, mid and near layers are the strips of the concept sheets (tools/paint/import_layers.py); the village has full-width layers
const CONCEPT_ALPHA = { default: [1, 1, 1, 1], town: [1, 1, 1, 1], townb: [1, 0, 0, 0] };
for (const k of ['cave', 'moss', 'spore', 'aqueduct', 'crystal', 'webbed', 'foundry', 'throne', 'frost', 'ember', 'storm', 'mirror', 'bone', 'lunar']) CONCEPT_ALPHA[k] = CONCEPT_ALPHA.default;
// backdrop sets that belong to no theme of their own: the afternoon village behind the roads out of the town
const EXTRA_BG = { townb: true };
// painted backgrounds loaded so far
const painted = new Map();             // theme -> { imgs, n, ready }, most recently used last
// start loading the painted layers of an area
Art.loadPainted = function (theme) {
  if (!THEMES[theme] && !EXTRA_BG[theme]) return;
  if (painted.has(theme)) { const p = painted.get(theme); painted.delete(theme); painted.set(theme, p); return; }
  const p = { imgs: [], n: 0, ready: false };
  ['sky', 'l0', 'l1', 'l2'].forEach((k, i) => {
    const im = new Image();
    im.onload = () => { if (++p.n === 4) p.ready = true; };
    im.src = 'art/bg/' + theme + '/' + k + '.webp';
    p.imgs[i] = im;
  });
  painted.set(theme, p);
  // each set is ~28 MB once decoded, so keep only the current area and its neighbours
  while (painted.size > PAINT_KEEP) painted.delete(painted.keys().next().value);
};
// whether an area's painted layers have all arrived (tests wait on it before measuring the picture)
Art.paintedReady = theme => painted.has(theme) && painted.get(theme).ready;
// draw the four painted layers with parallax
function drawPainted(g, th, p, camX, camY, t, key) {
  for (let li = 0; li < 4; li++) {
    const f = depthFactor(li ? LAYER_Z[li - 1] : SKY_Z);
    const off = -(((camX * f) % PAINT_P) + PAINT_P) % PAINT_P;
    const y = PAINT_TOP - camY * f * VERTICAL_PARALLAX + (li ? 14 * (li - 2) : 0);
    const ca = CONCEPT_ALPHA[key || th.name], la = ca ? ca[li] : 1;
    if (la > 0.01) { g.save(); g.globalAlpha *= la; for (let x = off; x < VW; x += PAINT_P) g.drawImage(p.imgs[li], x, y, PAINT_P, PAINT_H); g.restore(); }
    if (li === 0) drawRays(g, th, camX);
    if (li === 2) drawCritters(g, th, camX, camY, t);
    if (li > 0) {
      const fog = g.createLinearGradient(0, VH * 0.4, 0, VH);
      fog.addColorStop(0, rgba(th.fog, 0)); fog.addColorStop(1, rgba(th.fog, 0.04 + li * 0.035));
      g.fillStyle = fog; g.fillRect(0, 0, VW, VH);
    }
  }
}
// light rays through the air
function drawRays(g, th, camX) {
  const n = th.name;
  if (n === 'throne' || n === 'cave' || n === 'title') return;
  for (let i = 0; i < 5; i++) {
    const x = ((i * 280 - camX * 0.1) % (VW + 300) + VW + 300) % (VW + 300) - 120;
    const ray = g.createLinearGradient(x, 0, x + 120, VH);
    const rc = n === 'town' ? '255,200,130' : n === 'moss' ? '190,255,225' : n === 'foundry' ? '255,170,110' : '255,170,230';
    ray.addColorStop(0, 'rgba(' + rc + ',0.13)'); ray.addColorStop(1, 'rgba(' + rc + ',0)');
    g.fillStyle = ray; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x + 220, VH); g.lineTo(x + 80, VH); g.fill();
  }
}
// Title screen backdrop: true when the painted set was drawn.
Art.drawTitleBackdrop = function (g, camX, t) {
  const p = painted.get('title');
  if (!p || !p.ready) return false;
  const th = THEMES.title;
  if (!th.critters) makeLayers(th);
  drawPainted(g, th, p, camX, 0, t);
  return true;
};
// background of a room: painted layers, or the code-drawn fallback
Art.drawBackground = function (g, L, camX, camY, t) {
  const th = THEMES[L.def.theme];
  if (!th.critters) makeLayers(th);
  const p = painted.get(L.def.bg);
  if (p && p.ready) { drawPainted(g, th, p, camX, camY, t, L.def.bg); return; }
  if (!th.layers) th.layers = makeLayers(th);
  const sky = g.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.55, th.sky[1]); sky.addColorStop(1, th.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  const n = th.name;
  if (n === 'town') {
    const sx = VW * 0.72 - camX * 0.02;
    glow(g, sx, 200, 380, '#ffb050', 0.3);
    g.fillStyle = 'rgba(255,215,150,0.85)'; g.beginPath(); g.arc(sx, 200, 46, 0, 7); g.fill();
  } else if (n === 'throne') {
    const cx = VW * 0.5 - camX * 0.04, cy = 190;
    const halo = g.createRadialGradient(cx, cy, 10, cx, cy, 300);
    halo.addColorStop(0, 'rgba(255,238,210,0.35)'); halo.addColorStop(0.3, 'rgba(160,160,210,0.12)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo; g.fillRect(0, 0, VW, VH);
    g.strokeStyle = 'rgba(255,236,200,0.25)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 110, 0, 7); g.stroke();
  }
  drawRays(g, th, camX);
  for (let li = 0; li < 3; li++) {
    g.save();
    const f = depthFactor(LAYER_Z[li]);
    const off = -((camX * f) % LAYER_PERIOD);
    g.translate(0, -camY * f * VERTICAL_PARALLAX + 14 * (li - 1));
    for (const o of th.layers[li]) {
      for (let rep = -1; rep <= 1; rep++) {
        const x = o.x + off + rep * LAYER_PERIOD;
        if (x < -300 || x > VW + 300) continue;
        drawShape(g, th, li, Object.assign({}, o, { x }));
      }
    }
    g.restore();
    if (li === 1) drawCritters(g, th, camX, camY, t);
    const fog = g.createLinearGradient(0, VH * 0.4, 0, VH);
    fog.addColorStop(0, rgba(th.fog, 0)); fog.addColorStop(1, rgba(th.fog, 0.06 + li * 0.05));
    g.fillStyle = fog; g.fillRect(0, 0, VW, VH);
  }
};

// ---------- dark foreground framing (drawn over the world) ----------
Art.drawForeground = function (g, theme, camX, camY, t) {
  const th = THEMES[theme];
  if (!th.fg) {
    const rnd = mulberry32(theme.length * 31 + 7);
    th.fg = [];
    for (let i = 0; i < 18; i++) th.fg.push({ x: i / 18 * 2600 + rnd() * 90, top: i % 2 === 0, s: 0.6 + rnd() * 0.9, r: rnd() });
  }
  const col = mix(th.edge, th.near, 0.35);
  g.save(); g.fillStyle = col; g.strokeStyle = col;
  for (const o of th.fg) {
    const x = ((o.x - camX * depthFactor(FORE_Z)) % 2600 + 2600) % 2600 - 200;
    if (x < -220 || x > VW + 220) continue;
    const sway = Math.sin(t * 0.8 + o.r * 6) * 4, s = o.s;
    const y0 = o.top ? -camY * 0.02 - 6 : VH + 6 - camY * 0.02 * 0;
    const dir = o.top ? 1 : -1;
    if (theme === 'moss' || theme === 'town') {
      for (let k = 0; k < 4; k++) {       // broad leaves
        const a = (k - 1.5) * 0.5 + sway * 0.02, len = (60 + k * 16) * s;
        g.save(); g.translate(x + k * 16 * s, y0); g.rotate(dir > 0 ? Math.PI / 2 + a : -Math.PI / 2 + a);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0); g.fill();
        g.restore();
      }
      if (!o.top) { g.lineWidth = 3; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(x + k * 7, VH + 4); g.quadraticCurveTo(x + k * 7 + 6, VH - 20 * s, x + k * 7 + sway + 10, VH - (30 + (k % 3) * 14) * s); g.stroke(); } }
    } else if (theme === 'spore') {
      const cw = 60 * s, sy = o.top ? 30 * s : VH - 50 * s;
      if (o.top) { g.fillRect(x - 6, -4, 12, 40 * s); } else { g.fillRect(x - 8, sy, 16, 70 * s); }
      g.beginPath(); g.moveTo(x - cw, sy + 10); g.quadraticCurveTo(x - cw, sy - cw * 0.6, x, sy - cw * 0.62); g.quadraticCurveTo(x + cw, sy - cw * 0.6, x + cw, sy + 10); g.closePath(); g.fill();
    } else if (theme === 'webbed') {
      g.lineWidth = 2; g.strokeStyle = col;
      const r = 120 * s, cy0 = o.top ? -4 : VH + 4, d = o.top ? 1 : -1;
      for (let k = 0; k < 6; k++) { const a = (k / 5) * Math.PI; g.beginPath(); g.moveTo(x, cy0); g.lineTo(x + Math.cos(a) * r, cy0 + d * Math.sin(a) * r); g.stroke(); }
      for (let rr = 24; rr < r; rr += 26) { g.beginPath(); g.arc(x, cy0, rr, o.top ? 0 : Math.PI, o.top ? Math.PI : Math.PI * 2); g.stroke(); }
    } else if (theme === 'crystal') {
      for (let k = 0; k < 3; k++) { const w = (18 + k * 6) * s, h = (50 + k * 30) * s * (k === 1 ? 1.4 : 1), kx = x + k * 20 * s; g.beginPath(); g.moveTo(kx - w / 2, y0); g.lineTo(kx, y0 + dir * h); g.lineTo(kx + w / 2, y0); g.fill(); }
    } else if (theme === 'foundry') {
      if (o.top) {                         // a crane hook on a chain
        g.lineWidth = 4; const len = 70 * s;
        for (let k = 0; k < len; k += 13) { g.beginPath(); g.ellipse(x + sway * k / len, k, 4, 7, 0, 0, 7); g.stroke(); }
        g.lineWidth = 7; g.beginPath(); g.arc(x + sway, len + 14, 12, -Math.PI * 0.5, Math.PI * 0.9); g.stroke();
      } else {                              // a heap of scrap cogs
        for (let k = 0; k < 3; k++) {
          const r = (34 + k * 12) * s, cx2 = x + (k - 1) * 46 * s, cy2 = VH + 10 - k * 6 * s;
          g.beginPath(); for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2 + k; g.lineTo(cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r); g.lineTo(cx2 + Math.cos(a + 0.26) * (r + 9), cy2 + Math.sin(a + 0.26) * (r + 9)); } g.closePath(); g.fill();
        }
      }
    } else if (theme === 'throne') {
      if (o.top) { g.lineWidth = 4; g.beginPath(); g.moveTo(x, -4); g.lineTo(x + sway, 60 * s); g.stroke(); for (let k = 0; k < 60 * s; k += 14) { g.beginPath(); g.ellipse(x + sway * k / 60, k, 5, 8, 0, 0, 7); g.stroke(); } }
      else { g.fillRect(x, VH - 70 * s, 40 * s, 80 * s); g.fillRect(x - 6, VH - 70 * s, 52 * s, 12); }
    } else {
      const w = (40 + o.r * 50) * s, h = (40 + o.r * 70) * s;
      g.beginPath(); g.moveTo(x - w, y0); g.quadraticCurveTo(x - w * 0.2, y0 + dir * h * 0.6, x, y0 + dir * h); g.quadraticCurveTo(x + w * 0.2, y0 + dir * h * 0.5, x + w, y0); g.fill();
    }
  }
  g.restore();
};

// ---------- ambient particles (screen space) ----------
Art.motes = [];
// floating motes and leaves in front of everything
Art.ambientInit = function () {
  Art.motes = [];
  for (let i = 0; i < 50; i++) Art.motes.push({ x: Math.random() * VW, y: Math.random() * VH, z: 0.3 + Math.random() * 0.9, p: Math.random() * 7, s: 1 + Math.random() * 2.2, rot: Math.random() * 6, kind: Math.random() });
};
// move and draw the ambient motes
Art.drawAmbient = function (g, dt, theme, camX, camY, t) {
  const th = THEMES[theme];
  for (const m of Art.motes) {
    const leafy = theme === 'town' && m.kind < 0.6, bubble = (theme === 'moss' || theme === 'aqueduct') && m.kind < 0.4, snow = theme === 'frost', rain = theme === 'storm';
    const fall = rain ? 420 : leafy ? 34 : snow ? 30 : theme === 'throne' ? 12 : 0, rise = bubble ? 26 : (theme === 'foundry' || theme === 'ember') ? 30 : (theme === 'crystal' || theme === 'cave' || theme === 'spore') ? 10 : 4;
    m.x += (rain ? -110 : Math.sin(t * 0.5 + m.p) * (leafy ? 30 : 8)) * dt * m.z;
    m.y += (fall - rise) * dt * m.z;
    m.rot += dt * (leafy ? 2 : 0);
    if (m.y < -12) m.y = VH + 12; if (m.y > VH + 12) m.y = -12;
    if (m.x < -12) m.x = VW + 12; if (m.x > VW + 12) m.x = -12;
    const a = (0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + m.p))) * m.z;
    if (rain) {
      g.strokeStyle = 'rgba(205,220,255,' + (0.18 + 0.25 * m.z) + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x + 4 + 3 * m.z, m.y - 12 - 8 * m.z); g.stroke();
    } else if (snow) {
      g.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, 0.35 + a) + ')'; g.beginPath(); g.arc(m.x, m.y, 1.2 + m.s * m.z * 0.7, 0, 7); g.fill();
    } else if (leafy) {
      g.save(); g.translate(m.x, m.y); g.rotate(m.rot); g.scale(1, Math.abs(Math.cos(m.rot * 1.3)) * 0.8 + 0.2);
      g.fillStyle = th.leaf[Math.floor(m.kind * 6.6) % th.leaf.length]; ellipse(g, 0, 0, 5 * m.z + 2, 2.6 * m.z + 1); g.fill(); g.restore();
    } else if (bubble) {
      g.strokeStyle = 'rgba(210,255,245,' + (0.25 + 0.3 * m.z) + ')'; g.lineWidth = 1.2; ellipse(g, m.x, m.y, m.s * 2.2 * m.z + 1.5, m.s * 2.2 * m.z + 1.5); g.stroke();
    } else if (theme === 'cave' || theme === 'moss' || theme === 'spore' || theme === 'aqueduct' || theme === 'foundry' || theme === 'ember' || (theme === 'town' && m.kind > 0.85)) {
      bloom(g, m.x, m.y, 10 * m.z + 4, theme === 'town' ? '#ffb0d8' : th.part, a * 0.6);
      g.fillStyle = rgba('#ffffff', Math.min(0.9, a)); g.beginPath(); g.arc(m.x, m.y, m.s * m.z * 0.8, 0, 7); g.fill();
    } else {
      g.fillStyle = rgba(th.part, Math.min(0.9, a)); g.beginPath(); g.arc(m.x, m.y, m.s * m.z, 0, 7); g.fill();
    }
  }
};

// ---------- decorations ----------
Art.drawDecor = function (g, d, t, th) {
  const px = d.x * TILE, py = d.y * TILE + TILE;
  if (d.type === 'lamp') {
    const fl = 0.85 + 0.15 * Math.sin(t * 7 + d.x);
    bloom(g, px + 16, py - 104, 130 * fl, th.glow, 0.35);
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(px + 16, py); g.lineTo(px + 16, py - 94); g.quadraticCurveTo(px + 16, py - 112, px + 28, py - 112); g.stroke();
    g.strokeStyle = '#4a2a1a'; g.lineWidth = 2.5; g.stroke();
    ellipse(g, px + 16, py - 104, 8, 11); fs(g, '#ffe6b0', INK, 3);
  } else if (d.type === 'house') {
    const w = d.w * TILE, h = d.h * TILE, x0 = px, y0 = py - h;
    g.beginPath(); g.moveTo(x0, py); g.lineTo(x0, y0 + 20); g.quadraticCurveTo(x0 + w / 2, y0 - 70, x0 + w, y0 + 20); g.lineTo(x0 + w, py); g.closePath(); fs(g, '#2a120c', INK, 4);
    g.beginPath(); g.moveTo(x0 - 8, y0 + 22); g.quadraticCurveTo(x0 + w / 2, y0 - 84, x0 + w + 8, y0 + 22); g.lineTo(x0 + w, y0 + 12); g.quadraticCurveTo(x0 + w / 2, y0 - 58, x0, y0 + 12); g.closePath(); fs(g, '#5a2414', INK, 3);
    const on = Math.floor(d.x) % 2 === 0;
    for (const wx of [0.28, 0.62]) { g.beginPath(); g.arc(x0 + w * wx + 7, y0 + h * 0.34, 7, Math.PI, 0); g.rect(x0 + w * wx, y0 + h * 0.34, 14, 12); fs(g, on ? 'rgba(255,200,120,0.9)' : 'rgba(255,200,120,0.35)', INK, 2.5); }
    if (on) bloom(g, x0 + w / 2, y0 + h * 0.4, 70, '#ffb050', 0.18);
    g.beginPath(); g.arc(x0 + w / 2, py - 30, 11, Math.PI, 0); g.rect(x0 + w / 2 - 11, py - 30, 22, 30); fs(g, '#0d0504', INK, 3);
  } else if (d.type === 'pillar') {
    const h = d.h * TILE, w = 46;
    g.fillStyle = rgba(th.far, 0.95); g.fillRect(px - 7, py - h, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(px - 3, py - h, 5, h);
    g.fillStyle = rgba(th.far, 1); g.fillRect(px - 13, py - h - 10, w + 12, 14); g.fillRect(px - 13, py - 14, w + 12, 14);
  } else if (d.type === 'well') {
    const w = d.w * TILE;
    for (const bx of [px - 16, px + w]) { g.fillStyle = '#3a1c10'; g.strokeStyle = INK; g.lineWidth = 3.5; g.fillRect(bx, py - 28, 16, 28); g.strokeRect(bx, py - 28, 16, 28); g.fillStyle = '#c98a5a'; g.fillRect(bx + 1, py - 27, 14, 4); }
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(px - 8, py - 28); g.lineTo(px - 8, py - 80); g.lineTo(px + w + 8, py - 80); g.lineTo(px + w + 8, py - 28); g.stroke();
    g.strokeStyle = '#6a3a20'; g.lineWidth = 2; g.stroke();
    const gr = g.createLinearGradient(0, py, 0, py + 140); gr.addColorStop(0, 'rgba(140,200,255,0.25)'); gr.addColorStop(1, 'rgba(140,200,255,0)');
    g.fillStyle = gr; g.fillRect(px, py, w, 140);
  }
};

// breakable wall, cracked floor, acid / lava, seal door, gate (old drawings)
Art.drawBreak = function (g, x, y, th, t) {
  const px = x * TILE, py = y * TILE, v = hash2(x, y, 99);
  g.fillStyle = mix(th.tile, th.hi, 0.14); g.fillRect(px, py, TILE, TILE);
  g.strokeStyle = th.edge; g.lineWidth = 3.5; g.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(px + 6 + v * 8, py + 4); g.lineTo(px + 14, py + 14); g.lineTo(px + 9, py + 22); g.lineTo(px + 18 + v * 6, py + 30); g.moveTo(px + 14, py + 14); g.lineTo(px + 26, py + 12); g.stroke();
};
Art.drawCrack = function (g, x, y, th, t) {
  const px = x * TILE, py = y * TILE, v = hash2(x, y, 51);
  g.fillStyle = mix(th.tile, th.hi, 0.18); g.fillRect(px - 0.5, py - 0.5, TILE + 1, TILE + 1);
  g.strokeStyle = th.edge; g.lineWidth = 3; g.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
  g.strokeStyle = rgba(th.glow, 0.45 + 0.25 * Math.sin(t * 2 + x)); g.lineWidth = 2;
  g.beginPath(); g.moveTo(px + 2, py + 10 + v * 8); g.lineTo(px + 12, py + 16); g.lineTo(px + 20, py + 8 + v * 6); g.lineTo(px + 30, py + 18); g.moveTo(px + 12, py + 16); g.lineTo(px + 14, py + 30); g.stroke();
};
Art.drawAcid = function (g, x, y, surface, t, th) {
  const px = x * TILE, py = y * TILE;
  if (th && th.name === 'ember') {              // lava
    const g1 = g.createLinearGradient(0, py, 0, py + TILE); g1.addColorStop(0, 'rgba(255,200,90,0.95)'); g1.addColorStop(0.35, 'rgba(255,110,30,0.92)'); g1.addColorStop(1, 'rgba(170,30,10,0.95)');
    g.fillStyle = g1; g.fillRect(px, py + (surface ? 8 : 0), TILE, TILE - (surface ? 8 : 0));
    if (!surface) { g.fillStyle = 'rgba(255,120,40,' + (0.12 + 0.1 * Math.sin(t * 2 + x * 3 + y)) + ')'; g.fillRect(px, py, TILE, TILE); return; }
    bloom(g, px + 16, py + 6, 54, '#ff7a30', 0.32);
    g.beginPath(); g.moveTo(px, py + 10);
    for (let i = 0; i <= 4; i++) g.lineTo(px + i * 8, py + 7 + Math.sin(t * 2.4 + (x * 4 + i) * 0.8) * 2.5);
    g.lineTo(px + TILE, py + 14); g.lineTo(px, py + 14); g.closePath(); g.fillStyle = 'rgba(255,236,150,0.95)'; g.fill();
    if (Math.sin(t * 1.7 + x * 5) > 0.93) { g.fillStyle = 'rgba(255,230,150,0.9)'; ellipse(g, px + 16, py + 3, 3, 4); g.fill(); }
    return;
  }
  if (th && th.name === 'mirror') {             // quicksilver
    const g1 = g.createLinearGradient(0, py, 0, py + TILE); g1.addColorStop(0, 'rgba(230,224,250,0.92)'); g1.addColorStop(1, 'rgba(110,96,170,0.9)');
    g.fillStyle = g1; g.fillRect(px, py + (surface ? 8 : 0), TILE, TILE - (surface ? 8 : 0));
    if (!surface) { g.fillStyle = 'rgba(255,255,255,' + (0.06 + 0.06 * Math.sin(t * 2 + x * 3 + y)) + ')'; g.fillRect(px, py, TILE, TILE); return; }
    bloom(g, px + 16, py + 8, 34, '#e8e0ff', 0.22);
    g.beginPath(); g.moveTo(px, py + 10);
    for (let i = 0; i <= 4; i++) g.lineTo(px + i * 8, py + 8 + Math.sin(t * 2 + (x * 4 + i) * 0.9) * 2);
    g.lineTo(px + TILE, py + 14); g.lineTo(px, py + 14); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
    return;
  }
  g.fillStyle = 'rgba(70,200,80,0.55)'; g.fillRect(px, py + (surface ? 8 : 0), TILE, TILE - (surface ? 8 : 0));
  if (!surface) return;
  bloom(g, px + 16, py + 10, 30, '#9dff6a', 0.18);
  g.beginPath(); g.moveTo(px, py + 10);
  for (let i = 0; i <= 4; i++) g.lineTo(px + i * 8, py + 8 + Math.sin(t * 3 + (x * 4 + i) * 0.9) * 2.5);
  g.lineTo(px + TILE, py + 14); g.lineTo(px, py + 14); g.closePath();
  g.fillStyle = 'rgba(190,255,150,0.85)'; g.fill();
  if (Math.sin(t * 2 + x * 7) > 0.96) { g.strokeStyle = 'rgba(210,255,190,0.8)'; g.lineWidth = 1.5; ellipse(g, px + 16, py + 6, 3, 3); g.stroke(); }
};
Art.drawSeals = function (g, d, t, lit) {
  const px = d.x * TILE + 16, py = d.y * TILE + 16;
  lit.forEach((on, i) => {
    const a = -Math.PI * 0.85 + i * (Math.PI * 0.7 / (lit.length - 1)), r = 110;
    const x = px + Math.cos(a) * r, y = py + Math.sin(a) * r * 0.9;
    if (on) bloom(g, x, y, 34, '#ffe2a8', 0.6 + 0.2 * Math.sin(t * 3 + i));
    const k = lit.length > 8 ? 0.72 : 1;
    ellipse(g, x, y, 11 * k, 11 * k); fs(g, on ? '#fff4d6' : '#1a1e2a', INK, 3);
    if (on) { g.fillStyle = INK; ellipse(g, x - 3.5 * k, y, 1.6 * k, 3 * k); g.fill(); ellipse(g, x + 3.5 * k, y, 1.6 * k, 3 * k); g.fill(); }
  });
};
Art.drawGate = function (g, x, y, th, t) {
  const px = x * TILE, py = y * TILE;
  g.fillStyle = mix(th.tile, '#8aa0c0', 0.22); g.fillRect(px - 1, py - 1, TILE + 2, TILE + 2);
  g.strokeStyle = th.edge; g.lineWidth = 3.5; g.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(px + 4, py + 4, 6, TILE - 8);
  const gl = 0.5 + 0.4 * Math.sin(t * 3 + y);
  g.strokeStyle = rgba(th.glow, 0.4 + gl * 0.4); g.lineWidth = 2;
  g.beginPath(); g.arc(px + 16, py + 16, 7, 0, 7); g.moveTo(px + 16, py + 6); g.lineTo(px + 16, py + 26); g.stroke();
};

// ---------- lighting (a darkness map with lights cut out of it) and drifting fog ----------
let lightCanvas = null;
// how dark each area is outside the lights
const DARKNESS = { bone: 0.58, lunar: 0.4, storm: 0.42, mirror: 0.62, frost: 0.3, ember: 0.52, foundry: 0.48, town: 0.22, cave: 0.55, moss: 0.42, crystal: 0.45, throne: 0.58, spore: 0.45, aqueduct: 0.5, webbed: 0.72 };
// 2D lighting: a darkness map lit by the scene's lights (used when WebGL lighting is off)
Art.drawLighting = function (g, k, theme, lights) {
  const w = Math.max(64, Math.ceil(VW * k * 0.5)), h = Math.max(36, Math.ceil(VH * k * 0.5));
  if (!lightCanvas || lightCanvas.width !== w || lightCanvas.height !== h) { lightCanvas = document.createElement('canvas'); lightCanvas.width = w; lightCanvas.height = h; }
  const c = lightCanvas.getContext('2d');
  c.setTransform(w / VW, 0, 0, h / VH, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, VW, VH);
  const dk = DARKNESS[theme] == null ? 0.45 : DARKNESS[theme];
  c.fillStyle = 'rgba(2,3,8,' + dk + ')'; c.fillRect(0, 0, VW, VH);
  c.globalCompositeOperation = 'destination-out';
  for (const L of lights) {
    if (L.x < -L.r || L.y < -L.r || L.x > VW + L.r || L.y > VH + L.r) continue;
    const gr = c.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    gr.addColorStop(0, 'rgba(0,0,0,' + L.a + ')'); gr.addColorStop(0.45, 'rgba(0,0,0,' + (L.a * 0.62) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
  }
  g.drawImage(lightCanvas, 0, 0, VW, VH);
  // coloured light bleeding into the air
  const o = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    if (!L.c || L.x < -L.r || L.y < -L.r || L.x > VW + L.r || L.y > VH + L.r) continue;
    glow(g, L.x, L.y, L.r * 0.7, L.c, 0.07 * L.a);
  }
  g.globalCompositeOperation = o;
};
// slow fog layers
Art.drawFog = function (g, theme, camX, camY, t) {
  const th = THEMES[theme];
  for (let i = 0; i < 7; i++) {
    const par = depthFactor(i < 3 ? FOG_Z[0] : FOG_Z[1]), span = VW + 700;
    const x = ((i * 390 - camX * par + t * (8 + i * 3)) % span + span) % span - 350;
    const y = VH * (0.45 + 0.08 * (i % 4)) - camY * 0.03 * par + Math.sin(t * 0.3 + i) * 18;
    const r = 260 + (i % 3) * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(th.fog, 0.1)); gr.addColorStop(1, rgba(th.fog, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
};
