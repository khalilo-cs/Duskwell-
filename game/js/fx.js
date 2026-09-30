/* ===== أدوات الرسم المشتركة + الجسيمات + الطقس ===== */
(() => {
'use strict';
const Z = window.Z, TAU = Math.PI * 2;
const D = Z.draw = {};
const OUT = '#20112e';
D.OUT = OUT;
D.FONT = 'Tahoma, "Noto Sans Arabic", "Segoe UI", Arial, sans-serif';

D.rr = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
D.fillRR = (c, x, y, w, h, r, fill, stroke, lw) => { D.rr(c, x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 0.9; c.strokeStyle = stroke; c.stroke(); } };
D.circ = (c, x, y, r, fill, stroke, lw) => { c.beginPath(); c.arc(x, y, r, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 0.9; c.strokeStyle = stroke; c.stroke(); } };
D.ell = (c, x, y, rx, ry, fill, stroke, lw, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 0.9; c.strokeStyle = stroke; c.stroke(); } };
D.poly = (c, pts, fill, stroke, lw) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 0.9; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke(); } };
D.lg = (c, x0, y0, x1, y1, stops) => { if (!Number.isFinite(x0 + y0 + x1 + y1)) { x0 = 0; y0 = 0; x1 = 0; y1 = 1; } const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; };
D.rg = (c, x, y, r0, r1, stops) => { if (!Number.isFinite(x + y + r0 + r1)) { x = 0; y = 0; r0 = 0; r1 = 1; } r0 = Math.max(0, r0); r1 = Math.max(r0 + 0.01, r1); const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; };
D.text = (c, s, x, y, size, color, align, stroke, lw) => {
  c.direction = /[\u0600-\u06FF]/.test(s) ? 'rtl' : 'ltr';
  c.font = `bold ${size}px ${D.FONT}`; c.textAlign = align || 'center'; c.textBaseline = 'alphabetic';
  if (stroke) { c.lineWidth = lw || Math.max(1.5, size / 5); c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = color || '#fff'; c.fillText(s, x, y);
};
D.heart = (c, x, y, s, fill, stroke) => {
  c.save(); c.translate(x, y); c.scale(s / 10, s / 10); c.beginPath(); c.moveTo(0, 3.5);
  c.bezierCurveTo(-6, -1, -4.5, -6, -1.8, -5.2); c.bezierCurveTo(-0.6, -4.9, 0, -4, 0, -3.2);
  c.bezierCurveTo(0, -4, 0.6, -4.9, 1.8, -5.2); c.bezierCurveTo(4.5, -6, 6, -1, 0, 3.5); c.closePath();
  c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 0.9; c.strokeStyle = stroke; c.stroke(); } c.restore();
};
D.gem = (c, x, y, s, col, glow) => {
  c.save(); c.translate(x, y); c.scale(s / 10, s / 10);
  if (glow) { c.fillStyle = D.rg(c, 0, 0, 1, 12, [[0, 'rgba(180,255,255,.55)'], [1, 'rgba(180,255,255,0)']]); c.fillRect(-12, -12, 24, 24); }
  D.poly(c, [0, -6, 5, -2, 3, 5, -3, 5, -5, -2], D.lg(c, 0, -6, 0, 5, [[0, Z.shade(col, .5)], [1, col]]), OUT, 0.9);
  D.poly(c, [0, -6, 2, -2, 0, 5, -2, -2], 'rgba(255,255,255,.35)');
  D.poly(c, [-5, -2, 5, -2, 0, -1], 'rgba(255,255,255,.3)');
  c.restore();
};
D.coin = (c, x, y, r, t) => {
  const w = Math.abs(Math.cos(t)) * r + 0.6;
  D.ell(c, x, y, w, r, D.lg(c, x - w, y, x + w, y, [[0, '#ffe066'], [.5, '#ffb800'], [1, '#e08a00']]), '#9a5a00', 0.8);
  if (w > 2.2) D.ell(c, x, y, w * 0.5, r * 0.62, null, 'rgba(160,90,0,.7)', 0.7);
  D.ell(c, x - w * 0.3, y - r * 0.35, w * 0.25, r * 0.25, 'rgba(255,255,255,.6)');
};
D.star = (c, x, y, r, fill, stroke, rot) => {
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + (rot || 0), rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = 0.9; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke(); }
};
D.panel = (c, x, y, w, h, r, fill, stroke) => { D.fillRR(c, x, y, w, h, r, fill || 'rgba(12,10,32,.62)', stroke || 'rgba(255,255,255,.22)', 1); };
D.button = (c, x, y, w, h, label, sel, opts) => {
  opts = opts || {}; const r = h / 2.4;
  c.save(); if (sel) { c.shadowColor = 'rgba(255,214,90,.9)'; c.shadowBlur = 10; }
  D.fillRR(c, x, y, w, h, r, sel ? D.lg(c, x, y, x, y + h, [[0, '#ffe27a'], [1, '#ff9f2e']]) : (opts.lock ? 'rgba(60,60,70,.75)' : D.lg(c, x, y, x, y + h, [[0, 'rgba(70,90,160,.85)'], [1, 'rgba(30,40,100,.9)']])), sel ? '#fff7c8' : 'rgba(255,255,255,.35)', 1.2);
  c.restore();
  D.text(c, label, x + w / 2, y + h / 2 + Math.min(4, h / 5), opts.size || Math.min(12, h * 0.5), sel ? '#3a1a00' : '#fff');
};

/* ---------------- الجسيمات ---------------- */
const F = Z.fx = { list: [] };
F.add = p => { if (F.list.length < 700) { p.life = p.max = p.life || 30; F.list.push(p); } return p; };
F.clear = () => { F.list.length = 0; };
F.update = () => {
  const L = F.list;
  for (let i = L.length - 1; i >= 0; i--) {
    const p = L[i]; p.life--; if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
    p.vy += p.g || 0; p.x += p.vx; p.y += p.vy; p.vx *= p.drag || 1; if (p.vr) p.rot = (p.rot || 0) + p.vr; if (p.grow) p.size += p.grow;
  }
};
F.draw = c => {
  for (const p of F.list) {
    const k = p.life / p.max, a = p.fade === false ? 1 : k;
    c.globalAlpha = Math.max(0, Math.min(1, a * (p.alpha == null ? 1 : p.alpha)));
    if (p.shape === 'rect') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0); c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); c.restore(); }
    else if (p.shape === 'star') { D.star(c, p.x, p.y, p.size * (0.6 + 0.4 * k), p.color, null, p.rot || 0); }
    else if (p.shape === 'ring') { c.beginPath(); c.arc(p.x, p.y, Math.max(0.1, p.size), 0, TAU); c.lineWidth = p.lw || 1.5; c.strokeStyle = p.color; c.stroke(); }
    else if (p.shape === 'line') { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); c.lineWidth = p.size; c.strokeStyle = p.color; c.stroke(); }
    else { c.beginPath(); c.arc(p.x, p.y, Math.max(0.1, p.size * (p.shrink === false ? 1 : (0.4 + 0.6 * k))), 0, TAU); c.fillStyle = p.color; c.fill(); }
  }
  c.globalAlpha = 1;
};
F.dust = (x, y, n, dir) => { for (let i = 0; i < (n || 4); i++) F.add({ x: x + Z.rnd(-3, 3), y, vx: (dir || 0) * Z.rnd(0.2, 0.7) + Z.rnd(-0.4, 0.4), vy: Z.rnd(-0.5, -0.1), size: Z.rnd(1.6, 3), color: 'rgba(230,220,200,.75)', life: Z.rndi(14, 24), drag: 0.95, grow: 0.05 }); };
F.burst = (x, y, n, colors, spd, size) => { for (let i = 0; i < n; i++) { const a = Z.rnd(0, TAU), s = Z.rnd(0.4, 1) * (spd || 2); F.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, g: 0.1, size: Z.rnd(1.2, size || 2.4), color: colors[i % colors.length], life: Z.rndi(18, 34), drag: 0.97 }); } };
F.sparkle = (x, y, colors) => F.add({ x: x + Z.rnd(-5, 5), y: y + Z.rnd(-5, 5), vx: Z.rnd(-0.2, 0.2), vy: Z.rnd(-0.5, -0.1), size: Z.rnd(1.5, 3), color: (colors || ['#fff7a0', '#ffffff'])[Z.rndi(0, 1)], shape: 'star', life: Z.rndi(16, 28), vr: 0.1 });
F.ring = (x, y, color, size, grow, life) => F.add({ x, y, vx: 0, vy: 0, size: size || 2, grow: grow || 1.4, color: color || 'rgba(255,255,255,.8)', shape: 'ring', life: life || 18, lw: 2 });
F.debris = (x, y, color) => { for (let i = 0; i < 4; i++) F.add({ x: x + (i % 2) * 8 + 4, y: y + (i >> 1) * 8 + 4, vx: (i % 2 ? 1 : -1) * Z.rnd(0.6, 1.8), vy: Z.rnd(-4, -2), g: 0.32, size: 5, color, shape: 'rect', vr: Z.rnd(-0.3, 0.3), life: 50, fade: false }); };
F.explode = (x, y, r) => { F.burst(x, y, 22, ['#fff2a0', '#ffb030', '#ff5a20', '#5a5a5a'], 3, 4); F.ring(x, y, 'rgba(255,220,120,.9)', 3, 2.4, 20); };

/* ---------------- الطقس والجوّ ---------------- */
const W = Z.weather = { list: [], kind: null };
W.setup = th => {
  W.kind = th.weather; W.list = [];
  const n = { leaves: 14, sand: 26, drips: 8, snow: 55, fireflies: 22, embers: 34, wind: 12, dust: 20, bubbles: 22, rain: 70, stars: 40 }[W.kind] || 0;
  for (let i = 0; i < n; i++) W.list.push({ x: Math.random() * Z.VW, y: Math.random() * Z.VH, s: Math.random(), t: Math.random() * 100 });
};
W.update = () => {
  for (const p of W.list) {
    p.t++;
    switch (W.kind) {
      case 'leaves': p.x -= 0.5 + p.s * 0.6; p.y += 0.3 + p.s * 0.2 + Math.sin(p.t / 20) * 0.2; break;
      case 'sand': p.x -= 2.2 + p.s * 2; p.y += Math.sin(p.t / 30) * 0.2; break;
      case 'drips': p.y += 1.5 + p.s; break;
      case 'snow': p.x += Math.sin(p.t / 25 + p.s * 6) * 0.3 - 0.15; p.y += 0.4 + p.s * 0.6; break;
      case 'fireflies': p.x += Math.sin(p.t / 40 + p.s * 9) * 0.35; p.y += Math.cos(p.t / 33 + p.s * 5) * 0.3; break;
      case 'embers': p.y -= 0.4 + p.s * 0.7; p.x += Math.sin(p.t / 20 + p.s * 4) * 0.4; break;
      case 'wind': p.x -= 2 + p.s * 3; break;
      case 'dust': p.x += Math.sin(p.t / 50 + p.s * 7) * 0.15; p.y -= 0.05 + p.s * 0.08; break;
      case 'bubbles': p.y -= 0.35 + p.s * 0.5; p.x += Math.sin(p.t / 25 + p.s * 9) * 0.3; break;
      case 'rain': p.x -= 1.2; p.y += 6 + p.s * 3; break;
      case 'stars': p.t += 0; break;
    }
    if (p.x < -6) p.x = Z.VW + 4; if (p.x > Z.VW + 6) p.x = -4;
    if (p.y > Z.VH + 6) { p.y = -4; p.x = Math.random() * Z.VW; } if (p.y < -6) { p.y = Z.VH + 4; p.x = Math.random() * Z.VW; }
  }
};
W.draw = (c, th) => {
  for (const p of W.list) {
    switch (W.kind) {
      case 'leaves': c.save(); c.translate(p.x, p.y); c.rotate(p.t / 15); D.ell(c, 0, 0, 2.6, 1.3, p.s > 0.5 ? '#9be05a' : '#e8a53a'); c.restore(); break;
      case 'sand': c.fillStyle = 'rgba(255,235,190,.55)'; c.fillRect(p.x, p.y, 3 + p.s * 4, 0.9); break;
      case 'drips': c.fillStyle = 'rgba(160,220,255,.7)'; c.fillRect(p.x, p.y, 1, 3); break;
      case 'snow': c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(p.x, p.y, 0.9 + p.s * 1.1, 0, TAU); c.fill(); break;
      case 'fireflies': { const a = 0.35 + 0.65 * Math.abs(Math.sin(p.t / 22 + p.s * 8)); c.fillStyle = D.rg(c, p.x, p.y, 0, 5, [[0, `rgba(210,255,120,${a})`], [1, 'rgba(210,255,120,0)']]); c.fillRect(p.x - 5, p.y - 5, 10, 10); break; }
      case 'embers': c.fillStyle = p.s > 0.5 ? 'rgba(255,190,60,.9)' : 'rgba(255,90,30,.9)'; c.fillRect(p.x, p.y, 1.6, 1.6); break;
      case 'wind': c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(p.x, p.y, 10 + p.s * 10, 0.8); break;
      case 'dust': c.fillStyle = 'rgba(255,240,210,.35)'; c.fillRect(p.x, p.y, 1.4, 1.4); break;
      case 'bubbles': c.beginPath(); c.arc(p.x, p.y, 1 + p.s * 2, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 0.7; c.stroke(); break;
      case 'rain': c.strokeStyle = 'rgba(200,225,255,.5)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 1.2, p.y + 5); c.stroke(); break;
      case 'stars': { const a = 0.3 + 0.7 * Math.abs(Math.sin(p.t / 30 + p.s * 9)); c.fillStyle = `rgba(200,255,255,${a})`; c.fillRect(p.x, p.y, 1.2, 1.2); break; }
    }
  }
};
})();
