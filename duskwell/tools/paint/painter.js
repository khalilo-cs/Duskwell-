'use strict';
// Duskwell background painter. Runs in a browser page (see paint.js) and paints, for every area,
// an opaque sky and three translucent parallax layers (far, mid, near) as horizontally tileable
// images. Each layer goes through the same digital-painting passes:
//   silhouettes with organic, noise-displaced edges  ->  body gradient  ->  brush strokes and grain
//   ->  rim light on the edges that face the area's light  ->  painted details (lit windows,
//   crystal facets, glowing spots)  ->  atmospheric haze  ->  depth-of-field blur.
// Layer space: x in [0, P) wraps; y in [0, H) maps to game y = Y - 40 (screen is 540 tall).
const P = 1600, H = 700, S = 1.25, M = 160;

const PAL = {
  town:     { sky: ['#1a0908', '#5c1f12', '#b4521e'], far: '#4a1c10', mid: '#2e110b', near: '#1a0907', hi: '#f0a060', fog: '#ff9a4a', glow: '#ffc27a', light: [0.62, -0.78], leaf: ['#e8742a', '#c9471e', '#f4a640', '#9e2f18'] },
  cave:     { sky: ['#04070e', '#0c1a2e', '#1c3656'], far: '#15283f', mid: '#0e1b2c', near: '#081120', hi: '#8fb4de', fog: '#4f7cb0', glow: '#8fd8ff', light: [0.18, -0.98] },
  moss:     { sky: ['#03100f', '#0b3934', '#1f7064'], far: '#0f4a43', mid: '#0a3530', near: '#062320', hi: '#7fe8b8', fog: '#5fd0b8', glow: '#9dffd8', light: [-0.42, -0.9] },
  crystal:  { sky: ['#0f0a20', '#2a1446', '#4a246e'], far: '#2e1856', mid: '#1f103c', near: '#130a28', hi: '#e39cff', fog: '#9f60e8', glow: '#ff9bd6', light: [0.1, -0.99] },
  spore:    { sky: ['#120804', '#3a200e', '#7a4a1c'], far: '#4a2a12', mid: '#2e190b', near: '#1a0e06', hi: '#ffb870', fog: '#e89a4a', glow: '#ffb070', light: [0.5, -0.86] },
  aqueduct: { sky: ['#02080c', '#0a2430', '#16505e'], far: '#0f3a46', mid: '#0a2a33', near: '#051a20', hi: '#8fe0ff', fog: '#4fb0c8', glow: '#8fe0ff', light: [-0.3, -0.95] },
  webbed:   { sky: ['#020103', '#0b0810', '#1a1424'], far: '#161022', mid: '#0d0a16', near: '#06050b', hi: '#b8a8d8', fog: '#6a5a8a', glow: '#c8a8ff', light: [0.3, -0.95] },
  foundry:  { sky: ['#0d0604', '#2a120a', '#6a3014'], far: '#4a2210', mid: '#2c140a', near: '#170a05', hi: '#ffb27a', fog: '#ff7a3a', glow: '#ffa050', light: [0.35, -0.94] },
  title:    { sky: ['#04060e', '#10183a', '#2a2552'], far: '#1a2048', mid: '#0e1430', near: '#2a3466', hi: '#9cc4ff', fog: '#5a6aa8', glow: '#ffe9b0', light: [0.6, -0.8] },
  throne:   { sky: ['#020305', '#0a0e19', '#1a2236'], far: '#10172a', mid: '#0a0f1c', near: '#05070e', hi: '#c6d6f4', fog: '#5e72a0', glow: '#ffe2a8', light: [0, -1] },
};

// ------------------------------------------------------------------ colour and noise helpers
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function rgba(c, a) { const A = hex(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s, i) { let h = Math.imul(s ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i | 0, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function vnoise(s, x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(s, i) * (1 - u) + hash(s, i + 1) * u) * 2 - 1; }
function fbm(s, x) { return vnoise(s, x) * 0.6 + vnoise(s + 7, x * 2.1) * 0.28 + vnoise(s + 13, x * 4.3) * 0.12; }
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Paths whose edges wobble like a brush outline: every segment is subdivided and pushed along
// its normal by fractal noise.
function jagPath(g, pts, amp, seed, step) {
  step = step || 9;
  g.beginPath();
  let dist = 0, first = true;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n, d = amp * fbm(seed, (dist + t * len) / 38);
      const x = a[0] + dx * t - dy / len * d, y = a[1] + dy * t + dx / len * d;
      if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y);
    }
    dist += len;
  }
  g.closePath();
}
function blobPath(g, cx, cy, rx, ry, seed, rough) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, r = 1 + (rough || 0.16) * fbm(seed, i / 4);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  jagPath(g, pts, 2, seed + 1, 12);
}
function glowAt(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.35, rgba(col, a * 0.45)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ------------------------------------------------------------------ canvases with wrap margins
function layerCanvas() {
  const c = cnv(Math.round((P + 2 * M) * S), Math.round(H * S)), g = c.getContext('2d');
  g.setTransform(S, 0, 0, S, M * S, 0);
  return { c, g };
}
function crop(c) { const o = cnv(Math.round(P * S), Math.round(H * S)); o.getContext('2d').drawImage(c, -Math.round(M * S), 0); return o; }
// Draw every item at x, x - P and x + P so the strip tiles seamlessly.
function drawWrapped(g, items, fn) {
  for (const it of items) for (const dx of [-P, 0, P]) {
    if (it.x + dx < -M - (it.reach || 500) || it.x + dx > P + M + (it.reach || 500)) continue;
    g.save(); g.translate(dx, 0); fn(it); g.restore();
  }
}
// A periodic grain tile (period divides the strip width in device pixels).
let grainTile = null;
function grain() {
  if (grainTile) return grainTile;
  const N = 400, c = cnv(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const lat = (s, x, y, p) => hash(s, ((x % p + p) % p) * 7919 + ((y % p + p) % p));
  const vn = (s, x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (lat(s, xi, yi, p) * (1 - u) + lat(s, xi + 1, yi, p) * u) * (1 - v) + (lat(s, xi, yi + 1, p) * (1 - u) + lat(s, xi + 1, yi + 1, p) * u) * v;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = vn(1, x / 50, y / 50, 8) * 0.5 + vn(2, x / 20, y / 20, 20) * 0.3 + vn(3, x / 5, y / 5, 80) * 0.2;
    const i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = n > 0.5 ? 255 : 0; d[i + 3] = Math.round(Math.abs(n - 0.5) * 2 * 255);
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

// ------------------------------------------------------------------ the painting passes
// items: { x, shape(g, fill) — builds/fills its silhouette, detail?(g) — painted on top, glow?(g) }
function paintLayer(th, li, items, opt) {
  opt = opt || {};
  const base = [th.far, th.mid, th.near][li];
  const R = mulberry32(li * 977 + 13);
  // 1. silhouettes with a vertical body gradient
  const body = layerCanvas(), g = body.g;
  const top = mix(base, th.hi, opt.topLift != null ? opt.topLift : [0.14, 0.1, 0.06][li]);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, top); grad.addColorStop(0.55, base); grad.addColorStop(1, mix(base, '#000000', 0.35));
  g.fillStyle = grad; g.strokeStyle = grad;
  drawWrapped(g, items, it => { g.fillStyle = grad; g.strokeStyle = grad; it.shape(g, grad); });
  // 2. brush strokes: short translucent dabs of lighter and darker paint, clipped to the shapes
  g.globalCompositeOperation = 'source-atop';
  const strokes = [];
  for (let i = 0; i < 1600; i++) strokes.push({ x: R() * P, y: R() * H, l: 6 + R() * 18, a: (R() - 0.5) * 0.9 + (opt.strokeAngle != null ? opt.strokeAngle : Math.PI / 2), w: 3 + R() * 6, light: R() < 0.45, al: 0.03 + R() * 0.06 });
  const dab = mix(base, th.hi, 0.4);
  drawWrapped(g, strokes.map(s => Object.assign(s, { reach: 40 })), s => {
    g.strokeStyle = s.light ? rgba(dab, s.al) : rgba('#000000', s.al * 1.3); g.lineWidth = s.w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(s.a) * s.l, s.y + Math.sin(s.a) * s.l); g.stroke();
  });
  // grain (device-space pattern so the period divides the strip width)
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = [0.1, 0.14, 0.18][li]; g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, body.c.width, body.c.height);
  g.restore();
  g.globalCompositeOperation = 'source-over';
  // 3. rim light on edges facing the light, a crisp line plus a soft wash
  const [lx, ly] = th.light;
  for (const [d, blur, alpha] of [[2.2, 0.8, opt.rim != null ? opt.rim : 0.75], [9, 5, 0.3]]) {
    const rim = cnv(body.c.width, body.c.height), rg = rim.getContext('2d');
    rg.drawImage(body.c, 0, 0);
    rg.globalCompositeOperation = 'source-in'; rg.fillStyle = th.hi; rg.fillRect(0, 0, rim.width, rim.height);
    rg.globalCompositeOperation = 'destination-out'; rg.drawImage(body.c, -lx * d * S, -ly * d * S);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha * [0.55, 0.8, 1][li]; g.filter = 'blur(' + blur * S + 'px)';
    g.drawImage(rim, 0, 0); g.restore();
  }
  // 4. painted details (kept inside the silhouettes) and glows
  g.globalCompositeOperation = 'source-atop';
  drawWrapped(g, items.filter(it => it.detail), it => it.detail(g));
  g.globalCompositeOperation = 'source-over';
  g.save(); g.globalCompositeOperation = 'lighter';
  drawWrapped(g, items.filter(it => it.glow), it => it.glow(g));
  g.restore();
  // 5. atmosphere: distant layers dissolve into the air colour, mist pools at the bottom
  g.save(); g.globalCompositeOperation = 'source-atop';
  const air = g.createLinearGradient(0, 0, 0, H), haze = [0.42, 0.2, 0.06][li] * (opt.haze != null ? opt.haze : 1);
  air.addColorStop(0, rgba(th.sky[1], haze * 0.7)); air.addColorStop(0.5, rgba(th.sky[2], haze * 0.5)); air.addColorStop(1, rgba(th.fog, haze * 1.1));
  g.fillStyle = air; g.fillRect(-M, 0, P + 2 * M, H);
  g.restore();
  // 6. depth of field
  const blurPx = (opt.blur != null ? opt.blur : [1.6, 0.7, 0][li]) * S;
  let out = body.c;
  if (blurPx > 0) { out = cnv(body.c.width, body.c.height); const og = out.getContext('2d'); og.filter = 'blur(' + blurPx + 'px)'; og.drawImage(body.c, 0, 0); }
  return crop(out);
}

function paintSky(th, extra) {
  const L = layerCanvas(), g = L.g;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, th.sky[0]); grad.addColorStop(0.5, th.sky[1]); grad.addColorStop(1, th.sky[2]);
  g.fillStyle = grad; g.fillRect(-M, 0, P + 2 * M, H);
  const R = mulberry32(99);
  // soft cloud / mist banks
  const clouds = [];
  for (let i = 0; i < 46; i++) clouds.push({ x: R() * P, y: 80 + R() * 520, rx: 120 + R() * 260, ry: 18 + R() * 50, a: 0.03 + R() * 0.06, light: R() < 0.6, reach: 400 });
  drawWrapped(g, clouds, c => {
    const gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
    const col = c.light ? th.hi : th.sky[0];
    gr.addColorStop(0, rgba(col, c.a)); gr.addColorStop(1, rgba(col, 0));
    g.save(); g.translate(c.x, c.y); g.scale(1, c.ry / c.rx); g.translate(-c.x, -c.y);
    g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, c.rx, 0, 7); g.fill(); g.restore();
  });
  if (extra) extra(g, R);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.05; g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, L.c.width, L.c.height); g.restore();
  return crop(L.c);
}

// ------------------------------------------------------------------ shape kit
function spike(x, base, w, h, dir, seed) {          // dir -1: hangs from the ceiling, +1: rises from the floor
  const t = base - dir * h, s = seed;
  return [[x - w / 2, base + dir * 40], [x - w / 2, base], [x - w * (0.28 + 0.1 * hash(s, 1)), base - dir * h * 0.42], [x - w * 0.1, base - dir * h * 0.82],
    [x + w * 0.04 * (hash(s, 2) - 0.5), t], [x + w * 0.12, base - dir * h * 0.78], [x + w * (0.26 + 0.1 * hash(s, 3)), base - dir * h * 0.4], [x + w / 2, base], [x + w / 2, base + dir * 40]];
}
function trunkPts(x, w, top, bottom, lean, flare) {
  const L = [], Rr = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, y = bottom + (top - bottom) * t, ww = w * (1 + flare * Math.pow(1 - t, 4)) * (1 - 0.25 * t);
    const cx = x + lean * t * (bottom - top) * 0.08;
    L.push([cx - ww / 2, y]); Rr.unshift([cx + ww / 2, y]);
  }
  return L.concat(Rr);
}
function pointedArch(g, x, w, top, bottom) {         // gothic window outline
  g.moveTo(x, bottom); g.lineTo(x, top + w * 0.6);
  g.quadraticCurveTo(x, top + w * 0.05, x + w / 2, top - w * 0.25);
  g.quadraticCurveTo(x + w, top + w * 0.05, x + w, top + w * 0.6);
  g.lineTo(x + w, bottom); g.closePath();
}

// ------------------------------------------------------------------ the eight areas
const SCENES = {};

SCENES.town = th => {
  const sky = paintSky(th, (g, R) => {
    glowAt(g, P * 0.7, 250, 520, '#ffb050', 0.42);
    glowAt(g, P * 0.7, 250, 120, '#ffe0a0', 0.6);
    g.fillStyle = 'rgba(255,226,170,0.92)'; g.beginPath(); g.arc(P * 0.7, 250, 52, 0, 7); g.fill();
    // long sunset clouds crossing the sun
    for (let i = 0; i < 9; i++) {
      const y = 170 + i * 26 + R() * 10, x = R() * P, w = 300 + R() * 500;
      g.fillStyle = rgba(i % 2 ? '#5c1f12' : '#8a3418', 0.35 + R() * 0.2);
      for (const dx of [-P, 0, P]) { g.beginPath(); g.ellipse(x + dx, y, w, 5 + R() * 6, 0, 0, 7); g.fill(); }
    }
    // distant blue hills
    for (const [yb, c, a, s] of [[470, '#6a2c1c', 0.55, 3], [520, '#4a1c10', 0.7, 4]]) {
      const p = [[-M, H]]; for (let x = -M; x <= P + M; x += 20) p.push([x, yb - 60 - 50 * fbm(s, ((x % P) + P) % P / 260) - 30 * Math.sin((x / P) * Math.PI * 4)]); p.push([P + M, H]);
      g.fillStyle = rgba(c, a); g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.fill();
    }
  });
  const R = mulberry32(5), layers = [[], [], []];
  // far: a village on a ridge with a tall bell tower
  for (let i = 0; i < 26; i++) {
    const x = i / 26 * P + R() * 30, w = 30 + R() * 40, h = 30 + R() * 50, gy = 470 + 30 * Math.sin(x / P * Math.PI * 2), roof = 18 + R() * 26, tower = i % 9 === 4;
    const win = [];
    for (let k = 0; k < 3; k++) if (R() < 0.6) win.push([x + 6 + R() * (w - 16), gy - h + 10 + R() * (h - 22)]);
    layers[0].push({
      x, reach: 200,
      shape(g) {
        g.beginPath(); g.rect(x, gy - h, w, H - gy + h);
        g.moveTo(x - 6, gy - h); g.lineTo(x + w / 2, gy - h - roof); g.lineTo(x + w + 6, gy - h); g.fill();
        if (tower) { g.fillRect(x + w * 0.3, gy - h - 140, 22, 140); g.beginPath(); g.moveTo(x + w * 0.3 - 6, gy - h - 140); g.lineTo(x + w * 0.3 + 11, gy - h - 210); g.lineTo(x + w * 0.3 + 28, gy - h - 140); g.fill(); }
      },
      glow(g) { for (const [wx, wy] of win) { glowAt(g, wx + 3, wy + 4, 14, '#ffb050', 0.35); g.fillStyle = 'rgba(255,205,120,0.8)'; g.fillRect(wx, wy, 6, 8); } },
    });
  }
  for (let i = 0; i < 18; i++) {             // round autumn trees between the houses
    const x = R() * P, y = 470 + 30 * Math.sin(x / P * Math.PI * 2), r = 26 + R() * 30, c = th.leaf[i % 4], s = i * 31;
    layers[0].push({ x, reach: 80, shape(g) { g.fillStyle = mix(c, th.far, 0.55); blobPath(g, x, y - r * 0.7, r, r * 0.9, s, 0.2); g.fill(); g.fillRect(x - 3, y - 10, 6, H); } });
  }
  // mid: a wood of slim trunks with autumn crowns
  for (let i = 0; i < 16; i++) {
    const x = i / 16 * P + R() * 50, w = 16 + R() * 14, top = 120 + R() * 120, s = i * 17 + 3, lean = (R() - 0.5) * 2;
    const crowns = []; for (let k = 0; k < 7; k++) crowns.push([x + (R() - 0.5) * 220, top - 20 + (R() - 0.3) * 110, 40 + R() * 46, th.leaf[(i + k) % 4]]);
    layers[1].push({
      x, reach: 300,
      shape(g, fill) {
        jagPath(g, trunkPts(x, w, top, H + 20, lean, 1.2), 2, s); g.fill();
        for (const [cx, cy, r, c] of crowns) { g.fillStyle = mix(c, th.mid, 0.62); blobPath(g, cx, cy, r, r * 0.8, s + cx | 0, 0.25); g.fill(); }
        g.fillStyle = fill;
      },
      detail(g) { for (const [cx, cy, r, c] of crowns) { g.fillStyle = rgba(mix(c, '#ffd090', 0.3), 0.13); blobPath(g, cx + r * 0.25, cy - r * 0.3, r * 0.5, r * 0.35, s + 5, 0.3); g.fill(); } },
    });
  }
  // near: big dark trunks, low branches and grass
  for (let i = 0; i < 4; i++) {
    const x = i / 4 * P + R() * 160, w = 34 + R() * 26, s = 200 + i, lean = (R() - 0.5) * 3, by = 90 + R() * 160, dir = R() < 0.5 ? -1 : 1;
    const leaves = []; for (let k = 0; k < 26; k++) { const t = 0.25 + R() * 0.75; leaves.push([t, (R() - 0.5) * 40, 7 + R() * 7, R() * 3, th.leaf[k % 4]]); }
    const bx = t => x + dir * 280 * t, byf = t => by - 70 * t + 50 * t * t;
    layers[2].push({
      x, reach: 420,
      shape(g, fill) {
        jagPath(g, trunkPts(x, w, -40, H + 20, lean, 1.6), 3, s); g.fill();
        g.lineCap = 'round'; g.lineWidth = 9; g.beginPath(); g.moveTo(x, by); g.quadraticCurveTo(x + dir * 140, by - 70, x + dir * 280, by - 20); g.stroke();
        for (const [t, dy, r, a, c] of leaves) { g.fillStyle = mix(c, th.near, 0.72); g.beginPath(); g.ellipse(bx(t), byf(t) + dy, r, r * 0.5, a, 0, 7); g.fill(); }
        g.fillStyle = fill;
      },
    });
  }
  for (let i = 0; i < 70; i++) {
    const x = R() * P, h = 20 + R() * 50, a = (R() - 0.5) * 0.6;
    layers[2].push({ x, reach: 40, shape(g) { g.beginPath(); g.moveTo(x - 5, H); g.quadraticCurveTo(x + a * 30, H - h * 0.6, x + a * 60, H - 60 - h); g.quadraticCurveTo(x + a * 20 + 4, H - h * 0.5, x + 5, H); g.fill(); } });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { strokeAngle: li === 1 ? -Math.PI / 2 : 0 })) };
};

SCENES.cave = th => {
  const sky = paintSky(th, (g, R) => {
    // far-off openings where pale light leaks into the caverns
    for (let i = 0; i < 6; i++) { const x = R() * P, y = 140 + R() * 300; for (const dx of [-P, 0, P]) glowAt(g, x + dx, y, 160 + R() * 120, '#8fb4de', 0.14); }
    for (let i = 0; i < 18; i++) {
      const x = R() * P, w = 60 + R() * 120, h = 200 + R() * 260, top = R() < 0.5;
      g.fillStyle = rgba('#0c1a2e', 0.5);
      for (const dx of [-P, 0, P]) { jagPath(g, spike(x + dx, top ? -20 : H + 20, w, h, top ? -1 : 1, i), 6, i); g.fill(); }
    }
  });
  const R = mulberry32(7), layers = [[], [], []];
  for (let li = 0; li < 3; li++) {
    const n = [16, 18, 9][li], sc = [1, 1.2, 1.7][li];
    for (let i = 0; i < n; i++) {
      const x = i / n * P + R() * 60, top = R() < 0.55, w = (40 + R() * 70) * sc, h = (130 + R() * 230) * sc * (top ? 1 : 0.9), s = li * 100 + i;
      const twin = R() < 0.4, w2 = w * 0.55, h2 = h * (0.4 + R() * 0.3), off = (R() < 0.5 ? -1 : 1) * w * 0.55;
      const drip = top && R() < 0.5 ? h * (0.7 + R() * 0.2) : 0;
      layers[li].push({
        x, reach: 300,
        shape(g) {
          jagPath(g, spike(x, top ? -10 : H + 10, w, h, top ? -1 : 1, s), 4 * sc, s); g.fill();
          if (twin) { jagPath(g, spike(x + off, top ? -10 : H + 10, w2, h2, top ? -1 : 1, s + 50), 3 * sc, s + 50); g.fill(); }
        },
        detail(g) {          // wet streaks running down the rock
          g.strokeStyle = rgba(th.hi, 0.08); g.lineWidth = 2;
          for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * w * 0.18, top ? 0 : H); g.lineTo(x + k * w * 0.08, top ? h * 0.75 : H - h * 0.7); g.stroke(); }
        },
        glow: drip ? g => { glowAt(g, x, -10 + drip + 6, 10, '#8fd8ff', 0.5); } : null,
      });
    }
  }
  // far: a broken stone bridge
  const by = 300;
  layers[0].push({ x: 500, reach: 900, shape(g) { g.fillRect(200, by, 640, 26); for (const px of [260, 520, 780]) { g.fillRect(px, by, 34, H); } g.beginPath(); for (const px of [294, 554]) { g.moveTo(px, by + 26); g.quadraticCurveTo(px + 113, by + 140, px + 226, by + 26); } g.lineTo(554, by + 26); g.fill(); } });
  // mid: chains with hanging lanterns
  for (let i = 0; i < 5; i++) {
    const x = 160 + i * 320 + R() * 80, len = 140 + R() * 160;
    layers[1].push({
      x, reach: 40,
      shape(g) { g.lineWidth = 3; for (let y = -20; y < len; y += 13) { g.beginPath(); g.ellipse(x, y, 3.5, 6, 0, 0, 7); g.stroke(); } g.fillRect(x - 9, len, 18, 24); g.beginPath(); g.moveTo(x - 12, len); g.lineTo(x, len - 12); g.lineTo(x + 12, len); g.fill(); },
      glow(g) { glowAt(g, x, len + 12, 90, '#8fd8ff', 0.35); g.fillStyle = 'rgba(220,245,255,0.9)'; g.fillRect(x - 5, len + 5, 10, 13); },
    });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it)) };
};

SCENES.moss = th => {
  const sky = paintSky(th, (g, R) => {
    glowAt(g, P * 0.25, 40, 700, '#9dffd8', 0.3);
    glowAt(g, P * 0.75, 120, 500, '#5fd0b8', 0.18);
    for (let i = 0; i < 12; i++) {           // pale columns of giant trees far away
      const x = R() * P, w = 40 + R() * 60;
      for (const dx of [-P, 0, P]) { g.fillStyle = rgba('#0b3934', 0.55); g.fillRect(x + dx, 0, w, H); glowAt(g, x + dx + w / 2, 80 + R() * 60, w * 2.4, '#1f7064', 0.35); }
    }
  });
  const R = mulberry32(11), layers = [[], [], []];
  // far: tall trunks wearing round moss crowns
  for (let i = 0; i < 12; i++) {
    const x = i / 12 * P + R() * 60, w = 30 + R() * 30, cy = 70 + R() * 90, r = 80 + R() * 70, s = i * 3, lean = R() - 0.5;
    layers[0].push({ x, reach: 250, shape(g) { jagPath(g, trunkPts(x, w, cy, H + 10, lean, 1), 3, s); g.fill(); blobPath(g, x, cy, r, r * 0.75, s, 0.22); g.fill(); blobPath(g, x - r * 0.6, cy + 30, r * 0.6, r * 0.45, s + 9, 0.25); g.fill(); } });
  }
  // mid: hanging vines with leaves, ferns rising from below
  for (let i = 0; i < 22; i++) {
    const x = i / 22 * P + R() * 40, len = 160 + R() * 280, s = i * 7, sway = (R() - 0.5) * 60, leaves = [];
    for (let k = 1; k < 9; k++) leaves.push([k / 9, k % 2 ? 1 : -1, 10 + R() * 9]);
    const pod = R() < 0.45;
    layers[1].push({
      x, reach: 120,
      shape(g) {
        g.lineWidth = 4 + (i % 3); g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, -20); g.bezierCurveTo(x + sway, len * 0.35, x - sway, len * 0.7, x + sway * 0.3, len); g.stroke();
        for (const [t, side, sz] of leaves) {
          const lx = x + sway * (3 * t * (1 - t) * (1 - t) - 3 * t * t * (1 - t)) + sway * 0.3 * t * t * t, ly = len * t;
          g.beginPath(); g.ellipse(lx + side * sz * 0.9, ly, sz, sz * 0.42, side * 0.6, 0, 7); g.fill();
        }
      },
      glow: pod ? g => { const px = x + sway * 0.3, py = len + 10; glowAt(g, px, py, 60, '#9dffd8', 0.35); g.fillStyle = 'rgba(220,255,240,0.85)'; g.beginPath(); g.ellipse(px, py, 5, 8, 0, 0, 7); g.fill(); } : null,
    });
  }
  for (let i = 0; i < 14; i++) {
    const x = R() * P, h = 120 + R() * 160, s = i;
    layers[1].push({ x, reach: 200, shape(g) { for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, H + 10); g.quadraticCurveTo(x + k * 40, H - h * 0.7, x + k * 70, H - h * 0.55 + Math.abs(k) * 22); g.quadraticCurveTo(x + k * 32, H - h * 0.45, x + 10, H + 10); g.fill(); } } });
  }
  // near: huge fronds curling in from the edges
  for (let i = 0; i < 7; i++) {
    const x = i / 7 * P + R() * 100, top = R() < 0.5, len = 260 + R() * 160, s = i * 5, dir = R() < 0.5 ? -1 : 1;
    layers[2].push({
      x, reach: 400,
      shape(g) {
        const y0 = top ? -20 : H + 20, sy = top ? 1 : -1;
        g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + dir * len * 0.6, y0 + sy * len * 0.3, x + dir * len * 0.8, y0 + sy * len * 0.75); g.stroke();
        for (let k = 1; k < 12; k++) {
          const t = k / 12, px = x + dir * len * 0.8 * (2 * t * (1 - t) * 0.75 + t * t), py = y0 + sy * len * (2 * t * (1 - t) * 0.3 + t * t * 0.75);
          for (const side of [-1, 1]) { g.beginPath(); g.ellipse(px + side * 16, py + side * 6, 30 * (1 - t * 0.6), 9 * (1 - t * 0.5), side * 0.9 + dir * 0.3, 0, 7); g.fill(); }
        }
      },
    });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { haze: [1.7, 1, 1][li] })) };
};

SCENES.crystal = th => {
  const sky = paintSky(th, (g, R) => {
    for (let i = 0; i < 8; i++) { const x = R() * P, y = 100 + R() * 400; for (const dx of [-P, 0, P]) glowAt(g, x + dx, y, 200 + R() * 200, i % 2 ? '#ff9bd6' : '#9f60e8', 0.12); }
    for (let i = 0; i < 160; i++) { const x = R() * P, y = R() * H, r = R() * 1.6 + 0.3; g.fillStyle = rgba('#ffd8f4', 0.3 + R() * 0.5); for (const dx of [-P, 0, P]) { g.beginPath(); g.arc(x + dx, y, r, 0, 7); g.fill(); } }
  });
  const R = mulberry32(13), layers = [[], [], []];
  for (let li = 0; li < 3; li++) {
    const n = [11, 13, 7][li], sc = [1, 1.25, 1.8][li];
    for (let i = 0; i < n; i++) {
      const x = i / n * P + R() * 80, top = R() < 0.45, base = top ? -30 : H + 30, dir = top ? -1 : 1, prisms = [];
      for (let k = 0; k < 3 + (R() * 3 | 0); k++) prisms.push({ dx: (R() - 0.5) * 120 * sc, w: (20 + R() * 34) * sc, h: (110 + R() * 240) * sc * (k ? 0.7 : 1), ang: (R() - 0.5) * 0.7 });
      const outline = pr => {
        const c = Math.cos(pr.ang), s = Math.sin(pr.ang);
        return [[-pr.w / 2, 0], [-pr.w / 2, pr.h * 0.78], [-pr.w * 0.1, pr.h], [pr.w / 2, pr.h * 0.8], [pr.w / 2, 0]]
          .map(([px, py]) => [x + pr.dx + px * c - py * s * -dir, base + (px * s * -dir + py * c) * -dir]);
      };
      layers[li].push({
        x, reach: 360,
        shape(g) { for (const pr of prisms) { const o = outline(pr); g.beginPath(); o.forEach((q, j) => j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); } },
        detail(g) {         // the lit facet and the bright ridge of every prism
          for (const pr of prisms) {
            const o = outline(pr), mid0 = [(o[0][0] + o[4][0]) / 2, (o[0][1] + o[4][1]) / 2];
            g.fillStyle = rgba(th.hi, 0.12 + li * 0.04);
            g.beginPath(); g.moveTo(mid0[0], mid0[1]); g.lineTo(o[2][0], o[2][1]); g.lineTo(o[3][0], o[3][1]); g.lineTo(o[4][0], o[4][1]); g.closePath(); g.fill();
            g.strokeStyle = rgba('#ffe6ff', 0.25 + li * 0.08); g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(mid0[0], mid0[1]); g.lineTo(o[2][0], o[2][1]); g.stroke();
          }
        },
        glow(g) { const pr = prisms[0], o = outline(pr); glowAt(g, (o[2][0] + x + pr.dx) / 2, (o[2][1] + base) / 2, pr.h * 0.6, th.glow, 0.12 + li * 0.03); },
      });
    }
  }
  // far: mine scaffolding
  for (let i = 0; i < 3; i++) {
    const x = 200 + i * 520, top = 220 + i * 40;
    layers[0].push({ x, reach: 200, shape(g) { g.lineWidth = 5; for (const px of [x, x + 120]) { g.fillRect(px, top, 8, H); } for (let y = top; y < H; y += 60) { g.fillRect(x, y, 128, 6); g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 124, y + 60); g.stroke(); } } });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { rim: 0.9 })) };
};

SCENES.spore = th => {
  const sky = paintSky(th, (g, R) => {
    glowAt(g, P * 0.6, 160, 560, '#ffb070', 0.25);
    for (let i = 0; i < 14; i++) {
      const x = R() * P, top = 200 + R() * 200, cw = 90 + R() * 120;
      g.fillStyle = rgba('#3a200e', 0.6);
      for (const dx of [-P, 0, P]) { g.fillRect(x + dx - 8, top, 16, H); g.beginPath(); g.ellipse(x + dx, top, cw, cw * 0.45, 0, Math.PI, 0); g.fill(); }
    }
    for (let i = 0; i < 220; i++) { const x = R() * P, y = R() * H; g.fillStyle = rgba('#ffd890', 0.15 + R() * 0.3); for (const dx of [-P, 0, P]) { g.beginPath(); g.arc(x + dx, y, R() * 1.8 + 0.4, 0, 7); g.fill(); } }
  });
  const R = mulberry32(17), layers = [[], [], []];
  for (let li = 0; li < 3; li++) {
    const n = [12, 10, 5][li], sc = [0.8, 1.1, 1.7][li];
    for (let i = 0; i < n; i++) {
      const x = i / n * P + R() * 90, sw = (16 + R() * 22) * sc, cw = (70 + R() * 110) * sc, top = (li === 2 ? 40 : 140) + R() * 220, s = li * 50 + i, bend = (R() - 0.5) * 60 * sc;
      const ch = cw * (0.5 + R() * 0.22), spots = [];
      for (let k = 0; k < 6; k++) { const u = (R() - 0.5) * 1.5, h1 = Math.pow(Math.max(0, 1 - u * u), 0.35) * ch; spots.push([u * cw, -(0.15 + R() * 0.65) * h1, (3 + R() * 6) * sc]); }
      layers[li].push({
        x, reach: 400,
        shape(g) {
          g.beginPath(); g.moveTo(x - sw / 2 + bend, top); g.quadraticCurveTo(x - sw * 0.6, (top + H) / 2, x - sw * 0.9, H + 20); g.lineTo(x + sw * 0.9, H + 20); g.quadraticCurveTo(x + sw * 0.6, (top + H) / 2, x + sw / 2 + bend, top); g.fill();
          const cap = [];
          for (let k = 0; k <= 16; k++) { const a = Math.PI * (1 - k / 16); cap.push([x + bend + Math.cos(a) * cw, top + 8 - Math.pow(Math.sin(a), 1.15) * (ch + 8)]); }
          cap.push([x + bend + cw * 0.5, top + ch * 0.1], [x + bend, top + ch * 0.16], [x + bend - cw * 0.5, top + ch * 0.1]);
          jagPath(g, cap, 2.5 * sc, s); g.fill();
        },
        detail(g) {          // gills under the cap
          g.strokeStyle = rgba(th.hi, 0.1 + li * 0.05); g.lineWidth = 1.2 * sc;
          for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(x + bend, top + ch * 0.1); g.lineTo(x + bend + k * cw / 8.5, top + 6); g.stroke(); }
        },
        glow(g) { for (const [dx, dy, r] of spots) { glowAt(g, x + bend + dx * 0.9, top + dy, r * 3, '#ffb070', 0.16 + li * 0.04); g.fillStyle = rgba('#ffe0a8', 0.3 + li * 0.12); g.beginPath(); g.ellipse(x + bend + dx * 0.9, top + dy, r * 0.7, r * 0.45, 0, 0, 7); g.fill(); } },
      });
    }
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it)) };
};

SCENES.aqueduct = th => {
  const sky = paintSky(th, (g, R) => {
    for (let i = 0; i < 5; i++) {               // distant waterfalls
      const x = R() * P, w = 10 + R() * 18, y0 = 60 + R() * 200;
      for (const dx of [-P, 0, P]) {
        const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, rgba('#8fe0ff', 0.16)); gr.addColorStop(1, rgba('#8fe0ff', 0.02));
        g.fillStyle = gr; g.fillRect(x + dx, y0, w, H); glowAt(g, x + dx + w / 2, H - 120, 160, '#4fb0c8', 0.14);
      }
    }
  });
  const R = mulberry32(19), layers = [[], [], []];
  const bay = (g, x, sp, pier, deck, bottom, broken, seed) => {
    const ow = sp - pier, ys = deck + 26 + ow / 2;
    g.beginPath();
    if (broken) jagPath(g, [[x, deck - 30 + 40 * hash(seed, 1)], [x + sp * 0.5, deck + 10 + 50 * hash(seed, 2)], [x + sp + 1, deck - 30 + 40 * hash(seed, 3)], [x + sp + 1, bottom], [x, bottom]], 6, seed);
    else { g.rect(x, deck - 30, sp + 1, bottom - deck + 30); }
    g.moveTo(x + pier, bottom + 1); g.lineTo(x + pier, ys); g.arc(x + pier + ow / 2, ys, ow / 2, Math.PI, 0); g.lineTo(x + sp, bottom + 1); g.closePath();
    g.fill('evenodd');
  };
  for (let li = 0; li < 2; li++) {
    const span = [170, 250][li], pier = [30, 46][li], deck = [250, 170][li], n = Math.round(P / span), sp = P / n;
    for (let i = 0; i < n; i++) {
      const x = i * sp, broken = R() < 0.22, upper = li === 0;
      layers[li].push({
        x, reach: sp + 100,
        shape(g) {
          bay(g, x, sp, pier, deck, H + 20, broken, i * 11 + li);
          if (upper && !broken) { bay(g, x, sp / 2, pier * 0.6, deck - 140, deck - 30, false, i); bay(g, x + sp / 2, sp / 2, pier * 0.6, deck - 140, deck - 30, false, i + 99); }
          if (!broken) g.fillRect(x - 4, (upper ? deck - 140 : deck) - 42, sp + 9, 12);
        },
        detail(g) { g.strokeStyle = rgba('#000000', 0.22); g.lineWidth = 1.2; for (let y = deck + 10; y < H; y += 26) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + pier, y); g.stroke(); } },
      });
    }
  }
  // spill water from spouts in the mid arcade
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 400 + R() * 120, w = 9 + R() * 8, y0 = 150;
    layers[1].push({ x, reach: 60, shape(g) { g.fillRect(x - 10, y0 - 6, w + 20, 10); }, glow(g) {
      const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, rgba('#c8f4ff', 0.34)); gr.addColorStop(0.7, rgba('#8fe0ff', 0.12)); gr.addColorStop(1, rgba('#8fe0ff', 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + w, y0); g.lineTo(x + w + 6, H); g.lineTo(x - 6, H); g.fill();
      glowAt(g, x + w / 2, H - 80, 90, '#8fe0ff', 0.14);
    } });
  }
  // near: big riser pipes with flanges and an elbow, and hanging chains
  for (let i = 0; i < 3; i++) {
    const x = i / 3 * P + 140 + R() * 240, w = 40 + R() * 16, y = 80 + R() * 120, dir = R() < 0.5 ? -1 : 1;
    layers[2].push({
      x, reach: 360,
      shape(g) {
        g.fillRect(x, y, w, H); g.lineWidth = w; g.beginPath(); g.moveTo(x + w / 2, y + 1); g.arc(x + w / 2 + dir * 60, y, 60, dir > 0 ? Math.PI : 0, dir > 0 ? Math.PI * 1.5 : -Math.PI * 0.5, dir < 0); g.lineTo(x + w / 2 + dir * 340, y - 60); g.stroke();
        for (const fy of [y + 120, y + 300, y + 480]) g.fillRect(x - 7, fy, w + 14, 14);
      },
      detail(g) { g.fillStyle = rgba(th.hi, 0.1); g.fillRect(x + w * 0.2, y, 5, H); },
    });
  }
  for (let i = 0; i < 5; i++) {
    const x = R() * P, len = 120 + R() * 260;
    layers[2].push({ x, reach: 40, shape(g) { g.lineWidth = 4; for (let y = -20; y < len; y += 15) { g.beginPath(); g.ellipse(x, y, 4.5, 7.5, 0, 0, 7); g.stroke(); } } });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { strokeAngle: 0 })) };
};

SCENES.webbed = th => {
  const sky = paintSky(th, (g, R) => {
    glowAt(g, P * 0.4, 260, 500, '#6a5a8a', 0.2);
    g.strokeStyle = rgba('#b8a8d8', 0.07); g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const x = R() * P, y = R() * H, a = R() * 3, l = 200 + R() * 400; for (const dx of [-P, 0, P]) { g.beginPath(); g.moveTo(x + dx, y); g.lineTo(x + dx + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }
  });
  const R = mulberry32(23), layers = [[], [], []];
  for (let li = 0; li < 3; li++) {
    const n = [5, 4, 2][li], sc = [0.9, 1.2, 1.7][li];
    for (let i = 0; i < n; i++) {
      const x = i / n * P + R() * 160, cy = -20 - R() * 40, r = (150 + R() * 170) * sc, spokes = 8 + (R() * 5 | 0), a0 = R() * 0.3, sag = [];
      for (let k = 0; k < 12; k++) sag.push(R() * 6);
      const cocoon = R() < 0.6 ? { dx: (R() - 0.5) * r, len: 60 + R() * 160, w: (10 + R() * 8) * sc } : null;
      layers[li].push({
        x, reach: r + 60,
        shape(g) {
          g.lineWidth = [1.2, 1.5, 2.2][li]; g.lineCap = 'round'; g.globalAlpha = [0.8, 0.65, 0.55][li];
          for (let k = 0; k < spokes; k++) { const a = a0 + Math.PI * (0.04 + k / (spokes - 1) * 0.92); g.beginPath(); g.moveTo(x, cy); g.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
          for (let rr = 30, j = 0; rr < r; rr += 30 + rr * 0.12, j++) {
            g.beginPath();
            for (let k = 0; k < spokes; k++) {
              const a = a0 + Math.PI * (0.04 + k / (spokes - 1) * 0.92), px = x + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
              if (!k) g.moveTo(px, py); else { const pa = a - Math.PI * 0.46 / (spokes - 1), mx = x + Math.cos(pa) * rr * 0.9, my = cy + Math.sin(pa) * rr * 0.9 + sag[j % 12]; g.quadraticCurveTo(mx, my, px, py); }
            }
            g.stroke();
          }
          if (cocoon) {
            g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + cocoon.dx, Math.max(cy, -20)); g.lineTo(x + cocoon.dx, cy + cocoon.len); g.stroke();
            g.globalAlpha = 1; g.beginPath(); g.ellipse(x + cocoon.dx, cy + cocoon.len + cocoon.w * 2.2, cocoon.w, cocoon.w * 2.4, 0, 0, 7); g.fill();
          }
          g.globalAlpha = 1;
        },
        detail: cocoon ? g => { g.strokeStyle = rgba(th.hi, 0.18); g.lineWidth = 1; for (let k = -2; k <= 2; k++) { const yy = cy + cocoon.len + cocoon.w * 2.2 + k * cocoon.w * 0.8; g.beginPath(); g.moveTo(x + cocoon.dx - cocoon.w, yy - 4); g.lineTo(x + cocoon.dx + cocoon.w, yy + 4); g.stroke(); } } : null,
      });
    }
    // twisted roots from the floor
    for (let i = 0; i < [6, 7, 4][li]; i++) {
      const x = R() * P, h = (180 + R() * 240) * sc, w = (10 + R() * 8) * sc, sway = (R() - 0.5) * 120;
      layers[li].push({ x, reach: 200, shape(g) { g.lineCap = 'round'; for (let k = 0; k < 3; k++) { g.lineWidth = w * (1 - k * 0.25); g.beginPath(); g.moveTo(x + k * 18, H + 20); g.bezierCurveTo(x + k * 18 + sway, H - h * 0.4, x - sway * 0.6 + k * 10, H - h * 0.7, x + sway * 0.4 + k * 8, H - h * (0.8 + k * 0.1)); g.stroke(); } } });
    }
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { rim: 0.5 })) };
};

SCENES.throne = th => {
  const sky = paintSky(th, (g, R) => {
    // a vast rose window glowing far behind the hall
    for (const dx of [0, P]) {
      const cx = P * 0.5 + dx, cy = 230;
      glowAt(g, cx, cy, 460, '#ffeed2', 0.2);
      g.strokeStyle = rgba('#ffecc8', 0.3); g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 150, 0, 7); g.stroke();
      g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 60, 0, 7); g.stroke();
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); g.lineTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150); g.stroke(); g.beginPath(); g.arc(cx + Math.cos(a + 0.2) * 112, cy + Math.sin(a + 0.2) * 112, 17, 0, 7); g.stroke(); }
      glowAt(g, cx, cy, 160, '#c6d6f4', 0.18);
    }
  });
  const R = mulberry32(29), layers = [[], [], []];
  // far: a gothic arcade; the pointed openings look out onto the glowing rose window
  const n0 = 7, sp0 = P / n0;
  for (let i = 0; i < n0; i++) {
    const x = i * sp0, ow = sp0 * 0.62, ox = x + (sp0 - ow) / 2, ot = 150, ob = 560;
    layers[0].push({
      x, reach: sp0 + 60,
      shape(g) {
        g.beginPath(); g.rect(x, 70, sp0 + 1, H); pointedArch(g, ox, ow, ot, ob); g.fill('evenodd');
        g.fillRect(x - 10, 20, 36, H); g.beginPath(); g.moveTo(x - 10, 20); g.lineTo(x + 8, -30); g.lineTo(x + 26, 20); g.fill();
        g.fillRect(ox + ow / 2 - 3, ot + 40, 6, ob - ot - 40);                  // mullion
        g.lineWidth = 5; g.beginPath(); g.arc(ox + ow / 2, ot + 52, ow * 0.2, 0, 7); g.stroke();
        g.fillRect(ox - 6, ob, ow + 12, 18);                                      // sill
      },
      detail(g) { g.strokeStyle = rgba('#000000', 0.25); g.lineWidth = 1.5; for (let y = 90; y < H; y += 34) { g.beginPath(); g.moveTo(x, y); g.lineTo(ox - 2, y); g.moveTo(ox + ow + 2, y); g.lineTo(x + sp0, y); g.stroke(); } },
    });
  }
  // mid: columns with capitals and bases, banners between
  const n1 = 6, sp1 = P / n1;
  for (let i = 0; i < n1; i++) {
    const x = i * sp1 + 40, w = 46, bx = x + sp1 / 2, blen = 220 + R() * 120;
    layers[1].push({
      x, reach: sp1 + 80,
      shape(g) {
        g.fillRect(x, 0, w, H); g.fillRect(x - 12, 60, w + 24, 22); g.fillRect(x - 8, 82, w + 16, 10); g.fillRect(x - 14, H - 110, w + 28, 26);
        g.beginPath(); g.moveTo(bx - 34, -20); g.lineTo(bx + 34, -20); g.lineTo(bx + 34, blen); g.lineTo(bx, blen - 40); g.lineTo(bx - 34, blen); g.closePath(); g.fill();
      },
      detail(g) {
        g.strokeStyle = rgba('#000000', 0.3); g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + k * w / 4, 92); g.lineTo(x + k * w / 4, H - 110); g.stroke(); }
        g.fillStyle = rgba(th.glow, 0.22); g.beginPath(); g.moveTo(bx - 18, 132); g.lineTo(bx - 18, 108); g.lineTo(bx - 9, 120); g.lineTo(bx, 100); g.lineTo(bx + 9, 120); g.lineTo(bx + 18, 108); g.lineTo(bx + 18, 132); g.closePath(); g.fill(); g.fillRect(bx - 2, 140, 4, 30);
      },
    });
  }
  // near: chandeliers on long chains, and a heavy colonnade edge
  for (let i = 0; i < 3; i++) {
    const x = 260 + i * 540 + R() * 60, len = 130 + R() * 100;
    layers[2].push({
      x, reach: 140,
      shape(g) { g.lineWidth = 4; for (let y = -20; y < len; y += 15) { g.beginPath(); g.ellipse(x, y, 4, 8, 0, 0, 7); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.ellipse(x, len + 20, 80, 16, 0, 0, Math.PI); g.stroke(); for (const k of [-70, -35, 0, 35, 70]) g.fillRect(x + k - 3, len + 20 + (1 - Math.abs(k) / 80) * 12 - 18, 6, 18); },
      glow(g) { for (const k of [-70, -35, 0, 35, 70]) { const yy = len + 20 + (1 - Math.abs(k) / 80) * 12 - 24; glowAt(g, x + k, yy, 40, '#ffe2a8', 0.45); g.fillStyle = 'rgba(255,240,200,0.95)'; g.beginPath(); g.ellipse(x + k, yy, 2.5, 5, 0, 0, 7); g.fill(); } },
    });
  }
  for (let i = 0; i < 2; i++) {
    const x = i * 800 + 60, w = 90;
    layers[2].push({ x, reach: 200, shape(g) { g.fillRect(x, 0, w, H); g.fillRect(x - 20, 40, w + 40, 34); g.fillRect(x - 20, H - 80, w + 40, 40); } });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { strokeAngle: -Math.PI / 2 })) };
};

// Title screen: moonlit sky, a far kingdom of spires on a mountain, rolling hills with ruined
// towers, and a near bank of drifting mist (the title draws its own foreground hill).
// The Rustworks: furnace glow under smoke, chimney stacks and great wheels far off, iron trusses
// with hanging chains in the middle distance, and pipes with valve wheels up close.
function gearPath(g, cx, cy, r, teeth, hole, rot) {
  g.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = rot + i / teeth * Math.PI * 2, a1 = a0 + Math.PI / teeth;
    g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    g.lineTo(cx + Math.cos(a0 + 0.06) * (r + r * 0.14), cy + Math.sin(a0 + 0.06) * (r + r * 0.14));
    g.lineTo(cx + Math.cos(a1 - 0.06) * (r + r * 0.14), cy + Math.sin(a1 - 0.06) * (r + r * 0.14));
    g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
  }
  g.closePath();
  if (hole) { g.moveTo(cx + r * hole, cy); g.arc(cx, cy, r * hole, 0, Math.PI * 2, true); }
}
SCENES.foundry = th => {
  const sky = paintSky(th, (g, R) => {
    for (const dx of [-P, 0, P]) {                    // the furnace glow along the bottom
      glowAt(g, P * 0.3 + dx, H - 40, 520, '#ff7a2a', 0.38); glowAt(g, P * 0.78 + dx, H - 60, 420, '#ffa050', 0.3);
    }
    for (let i = 0; i < 22; i++) {                    // drifting smoke banks
      const x = R() * P, y = 60 + R() * 320, rx = 160 + R() * 260, ry = 40 + R() * 60;
      g.fillStyle = rgba('#120604', 0.18 + R() * 0.18); g.filter = 'blur(' + 10 * S + 'px)';
      for (const dx of [-P, 0, P]) { g.beginPath(); g.ellipse(x + dx, y, rx, ry, 0, 0, 7); g.fill(); }
      g.filter = 'none';
    }
    for (let i = 0; i < 9; i++) {                     // faint stacks on the horizon
      const x = R() * P, w = 22 + R() * 30, top = 160 + R() * 160;
      for (const dx of [-P, 0, P]) { g.fillStyle = rgba('#2a120a', 0.6); g.fillRect(x + dx, top, w, H); glowAt(g, x + dx + w / 2, top, 50, '#ff9a50', 0.25); }
    }
    for (let i = 0; i < 260; i++) { const x = R() * P, y = R() * H; g.fillStyle = rgba('#ffc890', 0.2 + R() * 0.5); for (const dx of [-P, 0, P]) { g.beginPath(); g.arc(x + dx, y, R() * 1.5 + 0.3, 0, 7); g.fill(); } }
  });
  const R = mulberry32(37), layers = [[], [], []];
  // far: chimney stacks, two great wheels and a gantry crane
  for (let i = 0; i < 7; i++) {
    const x = i / 7 * P + R() * 90, w = 34 + R() * 26, top = 70 + R() * 150, s = i * 9;
    layers[0].push({ x, reach: 160,
      shape(g) { jagPath(g, [[x, H + 10], [x + w * 0.08, top + 20], [x - 6, top + 12], [x - 6, top], [x + w + 6, top], [x + w + 6, top + 12], [x + w * 0.92, top + 20], [x + w, H + 10]], 1.5, s); g.fill(); },
      detail(g) { g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; for (let y = top + 40; y < H; y += 26) { g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + w - 2, y); g.stroke(); } },
      glow(g) { glowAt(g, x + w / 2, top - 4, 46, '#ff9a50', 0.4); } });
  }
  for (const [x, y, r, rot] of [[420, 330, 150, 0.2], [1180, 260, 110, 0.5]]) {
    layers[0].push({ x, reach: 300, shape(g) { gearPath(g, x, y, r, Math.round(r / 11), 0.18, rot); g.fill('evenodd'); },
      detail(g) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 6; for (let k = 0; k < 6; k++) { const a = rot + k / 6 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22); g.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); g.stroke(); } g.beginPath(); g.arc(x, y, r * 0.86, 0, 7); g.stroke(); } });
  }
  layers[0].push({ x: 800, reach: 300, shape(g) {
    g.lineWidth = 10; g.beginPath(); g.moveTo(700, H); g.lineTo(720, 120); g.moveTo(900, H); g.lineTo(880, 120); g.moveTo(640, 120); g.lineTo(1000, 120); g.stroke();
    g.lineWidth = 4; for (let y = 160; y < H; y += 70) { g.beginPath(); g.moveTo(712, y); g.lineTo(888, y + 50); g.moveTo(888, y); g.lineTo(712, y + 50); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(960, 120); g.lineTo(960, 260); g.stroke(); g.beginPath(); g.arc(960, 274, 12, -Math.PI * 0.5, Math.PI * 0.9); g.stroke();
  } });
  // mid: iron trusses with hanging chains and crates, and furnace windows
  for (let i = 0; i < 2; i++) {
    const y = 110 + i * 190, h = 34;
    for (let x0 = 0; x0 < P; x0 += 200) {
      layers[1].push({ x: x0 + 100, reach: 220, shape(g) {
        g.fillRect(x0, y, 201, 7); g.fillRect(x0, y + h, 201, 7);
        g.lineWidth = 5; g.beginPath(); for (let k = 0; k < 200; k += 40) { g.moveTo(x0 + k, y + 3); g.lineTo(x0 + k + 20, y + h + 3); g.lineTo(x0 + k + 40, y + 3); } g.stroke();
      } });
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = R() * P, top = R() < 0.5 ? 117 : 307, len = 80 + R() * 160, crate = R() < 0.45;
    layers[1].push({ x, reach: 40, shape(g) {
      g.lineWidth = 3; for (let y = top; y < top + len; y += 12) { g.beginPath(); g.ellipse(x, y, 3, 6, 0, 0, 7); g.stroke(); }
      if (crate) { g.fillRect(x - 22, top + len, 44, 34); } else { g.lineWidth = 6; g.beginPath(); g.arc(x, top + len + 12, 11, -Math.PI * 0.5, Math.PI * 0.9); g.stroke(); }
    } });
  }
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 400 + R() * 80, top = 470 + R() * 60, w = 150 + R() * 60;
    layers[1].push({ x, reach: 260, shape(g) { g.fillRect(x - w / 2, top, w, H - top); g.beginPath(); g.moveTo(x - w / 2 - 10, top); g.lineTo(x, top - 50); g.lineTo(x + w / 2 + 10, top); g.fill(); },
      glow(g) { for (const k of [-0.25, 0.25]) { const wx = x + k * w; g.fillStyle = 'rgba(255,150,70,0.55)'; g.beginPath(); g.arc(wx, top + 50, 13, Math.PI, 0); g.rect(wx - 13, top + 50, 26, 26); g.fill(); glowAt(g, wx, top + 60, 60, '#ff8a3a', 0.35); } } });
  }
  // near: pipes with flanges and valve wheels, and a heap of cogs
  for (let i = 0; i < 3; i++) {
    const x = i / 3 * P + 120 + R() * 260, w = 26 + R() * 12, top = -20;
    layers[2].push({ x, reach: 80, shape(g) {
      g.fillRect(x, top, w, H + 40);
      for (const fy of [70 + R() * 40, 300 + R() * 80, 560]) g.fillRect(x - 6, fy, w + 12, 12);
    }, detail(g) { g.fillStyle = rgba(th.hi, 0.12); g.fillRect(x + w * 0.22, top, 4, H + 40); } });
    const vx = x + w / 2, vy = 120 + R() * 60;
    layers[2].push({ x: vx, reach: 60, shape(g) { g.lineWidth = 5; g.beginPath(); g.arc(vx + w, vy, 20, 0, 7); g.stroke(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; g.beginPath(); g.moveTo(vx + w, vy); g.lineTo(vx + w + Math.cos(a) * 20, vy + Math.sin(a) * 20); g.stroke(); } } });
  }
  for (let i = 0; i < 5; i++) {
    const x = R() * P, r = 50 + R() * 50, rot = R();
    layers[2].push({ x, reach: 140, shape(g) { gearPath(g, x, H + 10, r, Math.round(r / 9), 0.25, rot); g.fill('evenodd'); } });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, { haze: [1.2, 0.9, 1][li] })) };
};

SCENES.title = th => {
  const sky = paintSky(th, (g, R) => {
    for (let i = 0; i < 260; i++) { const x = R() * P, y = R() * 420, r = R() * 1.4 + 0.3; g.fillStyle = rgba('#ffffff', 0.2 + R() * 0.6); for (const dx of [-P, 0, P]) { g.beginPath(); g.arc(x + dx, y, r, 0, 7); g.fill(); } }
    const mx = P * 0.6, my = 170;
    glowAt(g, mx, my, 520, '#ffe9b0', 0.22); glowAt(g, mx, my, 150, '#fff4d8', 0.5);
    g.fillStyle = 'rgba(255,244,214,0.95)'; g.beginPath(); g.arc(mx, my, 56, 0, 7); g.fill();
    g.fillStyle = 'rgba(200,190,170,0.25)'; for (const [dx, dy, r] of [[-18, -12, 12], [14, 10, 9], [-6, 22, 6], [22, -20, 5]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, 7); g.fill(); }
    for (let i = 0; i < 7; i++) {                  // thin moonlit clouds
      const y = 120 + i * 40 + R() * 20, x = R() * P, w = 260 + R() * 420;
      g.fillStyle = rgba(i % 2 ? '#3a4278' : '#5a6aa8', 0.1 + R() * 0.1); g.filter = 'blur(' + (5 * S) + 'px)';
      const ry = 8 + R() * 12;
      for (const dx of [-P, 0, P]) { g.beginPath(); g.ellipse(x + dx, y, w, ry, 0, 0, 7); g.fill(); }
      g.filter = 'none';
    }
  });
  const R = mulberry32(31), layers = [[], [], []];
  // far: mountain with a kingdom of spires
  const ridge = x => 380 - 120 * Math.exp(-Math.pow((x - 900) / 260, 2)) - 30 * fbm(4, x / 200);
  layers[0].push({ x: 800, reach: 1200, shape(g) { g.beginPath(); g.moveTo(-M - 400, H); for (let x = -M - 400; x <= P + M + 400; x += 16) g.lineTo(x, ridge(((x % P) + P) % P)); g.lineTo(P + M + 400, H); g.fill(); } });
  for (let i = 0; i < 14; i++) {
    const x = 700 + i * 30 + R() * 14, base = ridge(x) + 6, h = 60 + R() * 140 * (1 - Math.abs(i - 7) / 9), w = 12 + R() * 12, lit = R() < 0.7;
    layers[0].push({ x, reach: 60, shape(g) { g.fillRect(x, base - h, w, h + 50); g.beginPath(); g.moveTo(x - 3, base - h); g.lineTo(x + w / 2, base - h - 30 - w); g.lineTo(x + w + 3, base - h); g.fill(); },
      glow: lit ? g => { g.fillStyle = 'rgba(255,214,130,0.75)'; g.fillRect(x + w / 2 - 2, base - h + 16, 4, 6); glowAt(g, x + w / 2, base - h + 19, 12, '#ffd690', 0.4); } : null });
  }
  // mid: rolling hills with a few ruined towers
  const hill = x => 450 + 26 * Math.sin(x / P * Math.PI * 4) + 20 * fbm(9, x / 150);
  layers[1].push({ x: 800, reach: 1200, shape(g) { g.beginPath(); g.moveTo(-M - 400, H); for (let x = -M - 400; x <= P + M + 400; x += 12) g.lineTo(x, hill(((x % P) + P) % P)); g.lineTo(P + M + 400, H); g.fill(); } });
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 330 + R() * 60, base = hill(x) + 8, h = 70 + R() * 90, w = 26 + R() * 10, s = i * 13;
    layers[1].push({ x, reach: 80, shape(g) { jagPath(g, [[x, base + 50], [x, base - h], [x + w * 0.3, base - h - 12], [x + w * 0.55, base - h + 6], [x + w, base - h - 20], [x + w, base + 50]], 2, s); g.fill(); },
      glow(g) { g.fillStyle = 'rgba(255,214,130,0.6)'; g.fillRect(x + w / 2 - 3, base - h + 30, 6, 9); glowAt(g, x + w / 2, base - h + 34, 22, '#ffd690', 0.35); } });
  }
  // near: drifting mist
  for (let i = 0; i < 14; i++) {
    const x = R() * P, y = 470 + R() * 120, rx = 160 + R() * 220, ry = 20 + R() * 30, s = i * 7;
    layers[2].push({ x, reach: 420, shape(g) { g.globalAlpha = 0.35; blobPath(g, x, y, rx, ry, s, 0.3); g.fill(); g.globalAlpha = 1; } });
  }
  return { sky, layers: layers.map((it, li) => paintLayer(th, li, it, li === 2 ? { blur: 14, rim: 0, haze: 0 } : { haze: [0.9, 0.6][li], rim: 0.35 })) };
};

window.paintTheme = function (name, quality) {
  const res = SCENES[name](Object.assign({ name }, PAL[name]));
  const enc = c => c.toDataURL('image/webp', quality || 0.86);
  return { sky: enc(res.sky), l0: enc(res.layers[0]), l1: enc(res.layers[1]), l2: enc(res.layers[2]), w: res.sky.width, h: res.sky.height };
};
window.THEME_NAMES = Object.keys(SCENES);
window.PAINT_GEOMETRY = { P, H, S };
