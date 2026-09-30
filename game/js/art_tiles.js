/* ===== رسم البلاطات والديكور والخلفيات متعددة الطبقات ===== */
(() => {
'use strict';
const Z = window.Z, D = Z.draw, T = Z.T, VW = Z.VW, VH = Z.VH, TAU = Math.PI * 2, OUT = D.OUT;
const A = Z.art = Z.art || {};
const TS = 4; // دقة البلاطات المخزّنة
let TC = {}, BG = null, curTheme = null;

function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); fn(c); return cv; }
function tileCv(fn) { return mk(T * TS, T * TS, c => { c.scale(TS, TS); fn(c); }); }

/* ---------------- البلاطات ---------------- */
function groundTile(th, mask, ice) {
  return tileCv(c => {
    const top = mask & 1, left = mask & 2, right = mask & 4, bot = mask & 8, R = 4;
    c.beginPath();
    const tl = top && left ? R : 0, tr = top && right ? R : 0, bl = bot && left ? R : 0, br = bot && right ? R : 0;
    c.moveTo(tl, 0); c.lineTo(T - tr, 0); if (tr) c.arcTo(T, 0, T, tr, tr); else c.lineTo(T, 0);
    c.lineTo(T, T - br); if (br) c.arcTo(T, T, T - br, T, br); else c.lineTo(T, T);
    c.lineTo(bl, T); if (bl) c.arcTo(0, T, 0, T - bl, bl); else c.lineTo(0, T);
    c.lineTo(0, tl); if (tl) c.arcTo(0, 0, tl, 0, tl); else c.lineTo(0, 0); c.closePath();
    c.save(); c.clip();
    c.fillStyle = D.lg(c, 0, 0, 0, T, [[0, Z.shade(th.ground, 0.06)], [1, Z.shade(th.ground, -0.22)]]); c.fillRect(0, 0, T, T);
    const r = Z.rng(mask * 97 + 5);
    for (let i = 0; i < 5; i++) D.ell(c, r() * T, 4 + r() * 11, 1 + r() * 1.6, 0.8 + r() * 1, i % 2 ? Z.shade(th.ground, -0.3) : Z.shade(th.ground, 0.22));
    if (top) {
      c.fillStyle = ice ? '#ffffff' : th.top; c.fillRect(0, 0, T, 4.5);
      c.beginPath(); c.moveTo(0, 4); for (let x = 0; x <= T; x += 2) c.lineTo(x, 4.5 + ((x / 2) % 2 ? 2.2 : 0.4)); c.lineTo(T, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = ice ? '#ffffff' : th.top; c.fill();
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 4.5, T, 0.9);
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(0, 0, T, 1.1);
    }
    if (left) { c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(0, 0, 1.2, T); }
    if (right) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(T - 1.4, 0, 1.4, T); }
    if (bot) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, T - 2, T, 2); }
    c.restore();
    c.lineWidth = 0.8; c.strokeStyle = 'rgba(20,10,30,.55)';
    c.beginPath();
    if (top) { c.moveTo(tl, 0.4); c.lineTo(T - tr, 0.4); if (tr) c.arcTo(T - 0.4, 0.4, T - 0.4, tr, tr - 0.4); }
    if (right) { c.moveTo(T - 0.4, top ? tr : 0); c.lineTo(T - 0.4, T - (bot ? br : 0)); }
    if (left) { c.moveTo(0.4, top ? tl : 0); c.lineTo(0.4, T - (bot ? bl : 0)); }
    if (bot) { c.moveTo(bl, T - 0.4); c.lineTo(T - br, T - 0.4); }
    c.stroke();
  });
}
function brickTile(th) {
  return tileCv(c => {
    D.fillRR(c, 0, 0, T, T, 1.5, D.lg(c, 0, 0, 0, T, [[0, Z.shade(th.brick, .18)], [1, Z.shade(th.brick, -.15)]]));
    c.strokeStyle = 'rgba(30,10,20,.55)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(0, 5.3); c.lineTo(T, 5.3); c.moveTo(0, 10.6); c.lineTo(T, 10.6); c.moveTo(8, 0); c.lineTo(8, 5.3); c.moveTo(4, 5.3); c.lineTo(4, 10.6); c.moveTo(12, 5.3); c.lineTo(12, 10.6); c.moveTo(8, 10.6); c.lineTo(8, T); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(0.5, 0.5, T - 1, 1); c.fillRect(0.5, 5.8, 3.4, 0.7); c.fillRect(8.5, 0.5, 0.1, 0);
    D.fillRR(c, 0.4, 0.4, T - 0.8, T - 0.8, 1.5, null, OUT, 0.9);
  });
}
function qTile(f) {
  return tileCv(c => {
    D.fillRR(c, 0, 0, T, T, 2, D.lg(c, 0, 0, 0, T, [[0, '#ffe06a'], [1, '#f0a010']]), OUT, 1);
    D.fillRR(c, 1.6, 1.6, T - 3.2, T - 3.2, 1.2, null, 'rgba(160,80,0,.55)', 0.7);
    [[2.4, 2.4], [T - 2.4, 2.4], [2.4, T - 2.4], [T - 2.4, T - 2.4]].forEach(p => D.circ(c, p[0], p[1], 0.7, '#a05a00'));
    D.text(c, '?', T / 2 + 0.3, 12.2, 11.5, '#8a4200'); D.text(c, '?', T / 2, 11.6, 11.5, '#fff6c8');
    if (f >= 0) { c.save(); c.beginPath(); c.rect(0, 0, T, T); c.clip(); c.fillStyle = 'rgba(255,255,255,.45)'; const sx = -8 + f * 6; c.beginPath(); c.moveTo(sx, T); c.lineTo(sx + 4, T); c.lineTo(sx + 12, 0); c.lineTo(sx + 8, 0); c.closePath(); c.fill(); c.restore(); }
  });
}
function usedTile() { return tileCv(c => { D.fillRR(c, 0, 0, T, T, 2, D.lg(c, 0, 0, 0, T, [[0, '#9a8064'], [1, '#6a5238']]), OUT, 1); [[2.6, 2.6], [T - 2.6, 2.6], [2.6, T - 2.6], [T - 2.6, T - 2.6]].forEach(p => D.circ(c, p[0], p[1], 0.9, '#3a2a1a')); D.fillRR(c, 4, 4, 8, 8, 1, 'rgba(0,0,0,.18)'); }); }
function hardTile(th) {
  return tileCv(c => {
    const base = Z.mix(th.ground, '#9a9aa8', 0.55);
    D.fillRR(c, 0, 0, T, T, 1.2, D.lg(c, 0, 0, T, T, [[0, Z.shade(base, .22)], [1, Z.shade(base, -.2)]]), OUT, 1);
    D.poly(c, [1, 1, T - 1, 1, T - 3.4, 3.4, 3.4, 3.4], 'rgba(255,255,255,.45)'); D.poly(c, [1, 1, 3.4, 3.4, 3.4, T - 3.4, 1, T - 1], 'rgba(255,255,255,.2)');
    D.poly(c, [T - 1, 1, T - 1, T - 1, T - 3.4, T - 3.4, T - 3.4, 3.4], 'rgba(0,0,0,.25)'); D.poly(c, [1, T - 1, T - 1, T - 1, T - 3.4, T - 3.4, 3.4, T - 3.4], 'rgba(0,0,0,.4)');
    D.fillRR(c, 4.6, 4.6, T - 9.2, T - 9.2, 1, D.lg(c, 0, 4, 0, 12, [[0, Z.shade(base, .05)], [1, Z.shade(base, -.1)]]));
  });
}
function crackTile(th) {
  return tileCv(c => {
    D.fillRR(c, 0, 0, T, T, 1.2, D.lg(c, 0, 0, 0, T, [[0, Z.shade(th.ground, .3)], [1, Z.shade(th.ground, -.05)]]), OUT, 1);
    c.strokeStyle = '#2a1408'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 1); c.lineTo(6, 6); c.lineTo(4, 9); c.lineTo(9, 13); c.lineTo(8, 15); c.moveTo(6, 6); c.lineTo(11, 5); c.lineTo(13, 8); c.stroke();
    c.strokeStyle = 'rgba(255,220,120,.55)'; c.lineWidth = 0.5; c.stroke();
  });
}
function oneWayTile(th) {
  return tileCv(c => {
    D.fillRR(c, 0, 0.5, T, 5.5, 2, D.lg(c, 0, 0, 0, 6, [[0, Z.shade(th.brick, .35)], [1, Z.shade(th.brick, -.1)]]), OUT, 0.9);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(1.5, 1.3, T - 3, 0.9);
    c.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 3; x < T; x += 5) c.fillRect(x, 3, 0.8, 2.6);
  });
}
function iceTile() { return tileCv(c => { D.fillRR(c, 0, 0, T, T, 2, D.lg(c, 0, 0, T, T, [[0, '#d8f4ff'], [1, '#7cc4ee']]), '#3a80b0', 0.9); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(2, 13); c.lineTo(6, 3); c.lineTo(8, 3); c.lineTo(4, 13); c.fill(); c.fillRect(9, 9, 5, 1); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(1, 1, T - 2, 2); }); }
function pipeTile(th, kind) {
  const col = th.pipe || '#2ab34c', lip = kind === 'l' || kind === 'r', left = kind === 'l' || kind === 'L';
  return tileCv(c => {
    const off = lip ? -0.5 : (left ? 1.2 : 0), w = lip ? T + 0.5 : T - 1.2;
    const x0 = left ? off : (lip ? 0 : 0), ww = lip ? T + 0.5 : w;
    c.save(); c.beginPath(); c.rect(0, 0, T, T); c.clip();
    D.fillRR(c, left ? (lip ? 0.6 : 1.4) : -1, lip ? 1 : -1, T + (lip ? 0 : 0.2) - (lip ? 0.6 : 0.4), lip ? T - 1 : T + 2, lip ? 2.4 : 0, D.lg(c, 0, 0, T, 0, left ? [[0, Z.shade(col, -.25)], [.3, Z.shade(col, .3)], [.6, col], [1, Z.shade(col, -.3)]] : [[0, Z.shade(col, -.15)], [.5, col], [.8, Z.shade(col, -.2)], [1, Z.shade(col, -.4)]]), OUT, 1);
    if (lip) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(left ? 2.6 : 1, 2, 2, T - 4); }
    c.restore();
  });
}
function gateTile() { return tileCv(c => { c.fillStyle = '#20202c'; c.fillRect(0, 0, T, T); for (let i = 0; i < 3; i++) D.fillRR(c, 1 + i * 5, 0, 3, T, 1, D.lg(c, 0, 0, 3, 0, [[0, '#7a7a90'], [1, '#33333f']]), OUT, 0.6); c.fillStyle = '#ff3a3a'; c.globalAlpha = 0.7; c.fillRect(0, 7, T, 2); c.globalAlpha = 1; }); }
function spikeTile() { return tileCv(c => { for (let i = 0; i < 3; i++) { const x = i * 5.4; D.poly(c, [x + 0.2, T, x + 2.7, 3.5, x + 5.2, T], D.lg(c, x, 3, x + 5, 3, [[0, '#f4f6ff'], [.5, '#b8bccc'], [1, '#6a6e80']]), OUT, 0.8); } D.fillRR(c, 0, T - 2.4, T, 2.4, 0.6, '#4a4e60', OUT, 0.7); }); }
function crumbleTile(th) { return tileCv(c => { D.fillRR(c, 0, 0, T, T, 2, D.lg(c, 0, 0, 0, T, [[0, Z.shade(th.top, .1)], [1, Z.shade(th.ground, -.1)]]), OUT, 1); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(3, 0); c.lineTo(6, 6); c.lineTo(3, 11); c.moveTo(11, 4); c.lineTo(9, 9); c.lineTo(13, 16); c.stroke(); D.fillRR(c, 0.5, 0.5, T - 1, 3, 1.5, 'rgba(255,255,255,.3)'); }); }
function conveyorTile(th) { return tileCv(c => { D.fillRR(c, 0, 0, T, T, 1.5, D.lg(c, 0, 0, 0, T, [[0, '#5a5a68'], [1, '#2a2a34']]), OUT, 1); c.fillStyle = '#ffd23a'; for (let i = -1; i < 4; i++) D.poly(c, [i * 5, 0, i * 5 + 3, 0, i * 5 + 6, 3, i * 5 + 3, 6, i * 5, 6, i * 5 + 3, 3], null); D.circ(c, 3, 12, 2, '#8a8a98', OUT, 0.7); D.circ(c, T - 3, 12, 2, '#8a8a98', OUT, 0.7); }); }

A.buildTiles = th => {
  curTheme = th; TC = {};
  th.pipe = { desert: '#c69a3a', snow: '#4aa0e8', volcano: '#d0603a', space: '#a04ae0', castle: '#7a7a98', ruins: '#b89050', ocean: '#e0708a' }[th.key] || '#2ab34c';
  for (let m = 0; m < 16; m++) { TC['g' + m] = groundTile(th, m, false); }
  TC.B = brickTile(th); TC.q = [0, 1, 2, 3, 4, 5].map(f => qTile(f < 5 ? -1 : 0)); TC.q = [qTile(-1), qTile(0), qTile(1), qTile(2)];
  TC.qs = [qTile(-1)]; TC['!'] = usedTile(); TC.H = hardTile(th); TC.X = crackTile(th); TC.T = oneWayTile(th); TC.I = iceTile();
  TC.l = pipeTile(th, 'l'); TC.r = pipeTile(th, 'r'); TC.L = pipeTile(th, 'L'); TC.R = pipeTile(th, 'R');
  TC.D = gateTile(); TC.S = spikeTile(); TC.Q = crumbleTile(th); TC.C = conveyorTile(th); TC.c = TC.C; TC.E = TC.H;
};

A.tileImg = m => TC['g' + m];
const isEarth = ch => ch === '#' || ch === 'I';
A.drawTiles = (c, L, cam, t, bumps, crumbling) => {
  const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(L.H - 1, Math.floor((cam.y + VH) / T) + 1);
  const g = L.g;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = g[ty][tx]; if (ch === '.') continue;
    const x = tx * T, y = ty * T;
    switch (ch) {
      case '#': {
        const up = ty > 0 ? g[ty - 1][tx] : '#', lf = tx > 0 ? g[ty][tx - 1] : '#', rt = tx < L.W - 1 ? g[ty][tx + 1] : '#', dn = ty < L.H - 1 ? g[ty + 1][tx] : '#';
        const m = (isEarth(up) ? 0 : 1) | (isEarth(lf) ? 0 : 2) | (isEarth(rt) ? 0 : 4) | (isEarth(dn) || ty === L.H - 1 ? 0 : 8);
        // فرق: التربة تحت الأرصفة لا تُعتبر مكشوفة يساراً/يميناً إن كانت أعمق من السطح بـ 1 وأكثر
        c.drawImage(TC['g' + m], x, y, T, T); break;
      }
      case 'B': case '?': case '!': {
        const b = bumps && bumps.get(tx + ',' + ty); const dy = b ? -Math.sin(b / 9 * Math.PI) * 6 : 0;
        const img = ch === '?' ? TC.q[Math.floor(t / 6) % 24 < 4 ? Math.floor(t / 6) % 24 : 0] : TC[ch]; c.drawImage(img, x, y + dy, T, T); break;
      }
      case 'o': D.coin(c, x + 8, y + 8 + Math.sin(t / 14 + tx) * 0.8, 5, t / 9 + tx * 0.7); break;
      case 'G': {
        const bob = Math.sin(t / 16 + tx) * 1.6;
        D.gem(c, x + 8, y + 8 + bob, 16, ['#39e6ff', '#ff5ad8', '#7dff5a'][L.gemMap.get(tx + ',' + ty) || 0], true);
        if (t % 12 === 0) Z.fx.sparkle(x + 8, y + 8 + bob); break;
      }
      case 'F': { const top = g[ty - 1] && g[ty - 1][tx] !== 'F'; D.fillRR(c, x + 7, y, 2, T, 1, D.lg(c, x + 7, 0, x + 9, 0, [[0, '#fff'], [1, '#b8b8c8']]), OUT, 0.6); if (top) { D.circ(c, x + 8, y - 1, 3.2, D.rg(c, x + 7, y - 2, 0, 3.4, [[0, '#fff2a0'], [1, '#ffb800']]), OUT, 0.8); const wv = Math.sin(t / 8) * 1.4; D.poly(c, [x + 9, y + 1, x + 24 + wv, y + 4, x + 9, y + 9], D.lg(c, x, 0, x + 24, 0, [[0, '#3ae070'], [1, '#18a848']]), OUT, 0.8); D.star(c, x + 14, y + 5, 2, '#fff', null); } break; }
      case 'K': { const on = L.cpOn && L.cpOn.has(tx); D.fillRR(c, x + 7, y - 6, 2, T + 6, 1, '#d8d8e8', OUT, 0.6); const wv = Math.sin(t / 7) * (on ? 1.6 : .4); D.poly(c, [x + 9, y - 6, x + 19 + wv, y - 3, x + 9, y], on ? '#31e0ff' : '#8a8a9a', OUT, 0.7); if (on && t % 10 === 0) Z.fx.sparkle(x + 14, y - 3, ['#8ff', '#fff']); D.circ(c, x + 8, y - 7, 2, on ? '#fff' : '#aaa', OUT, 0.6); break; }
      case 'P': { const pr = L.springT && L.springT.get(tx + ',' + ty) || 0, cmp = pr > 0 ? Math.sin(pr / 10 * Math.PI) * 4 : 0; D.fillRR(c, x + 2, y + 12, 12, 4, 1, '#4a4a5a', OUT, 0.7); c.strokeStyle = '#c8c8d8'; c.lineWidth = 1.6; c.beginPath(); const h = 9 - cmp; c.moveTo(x + 4, y + 12); c.lineTo(x + 12, y + 12 - h * 0.33); c.lineTo(x + 4, y + 12 - h * 0.66); c.lineTo(x + 12, y + 12 - h); c.stroke(); D.fillRR(c, x + 1, y + 12 - h - 3, 14, 3.4, 1.6, D.lg(c, x, y, x, y + 4, [[0, '#ff7a7a'], [1, '#d02a2a']]), OUT, 0.8); break; }
      case 'Q': { const cr = crumbling && crumbling.get(tx + ',' + ty); const jit = cr ? (Math.random() - 0.5) * 1.6 : 0; c.drawImage(TC.Q, x + jit, y, T, T); break; }
      case 'C': case 'c': { c.drawImage(TC.C, x, y, T, T); c.save(); c.beginPath(); c.rect(x, y, T, 7); c.clip(); c.fillStyle = '#ffd23a'; const dir = ch === 'C' ? 1 : -1; for (let i = -1; i < 4; i++) { const px = x + (((i * 5 + dir * t * 0.4) % 20) + 20) % 20 - 4; D.poly(c, dir > 0 ? [px, y + 1, px + 3, y + 1, px + 6, y + 3.5, px + 3, y + 6, px, y + 6, px + 3, y + 3.5] : [px + 6, y + 1, px + 3, y + 1, px, y + 3.5, px + 3, y + 6, px + 6, y + 6, px + 3, y + 3.5], '#ffd23a'); } c.restore(); break; }
      case 'V': { const wv = Math.sin(t / 12 + tx * 0.9) * 1.2; c.fillStyle = D.lg(c, 0, y, 0, y + T, [[0, '#ffb030'], [.5, '#ff5a1a'], [1, '#c01a08']]); c.fillRect(x, y + (g[ty - 1] && g[ty - 1][tx] === 'V' ? 0 : 2 + wv), T, T); if (!(g[ty - 1] && g[ty - 1][tx] === 'V')) { c.fillStyle = 'rgba(255,240,140,.85)'; c.fillRect(x, y + 2 + wv, T, 1.6); } if ((t + tx * 7) % 40 === 0) Z.fx.add({ x: x + 8, y, vx: Z.rnd(-.3, .3), vy: -1.2, size: 1.5, color: '#ffb030', life: 30, g: 0.03 }); break; }
      case 'S': c.drawImage(TC.S, x, y, T, T); break;
      case 'W': case 'w': break; // الماء يُرسم فوق الكائنات
      default: { const img = TC[ch]; if (img) c.drawImage(img, x, y, T, T); }
    }
  }
};

A.drawWater = (c, L, cam, t) => {
  const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(L.H - 1, Math.floor((cam.y + VH) / T) + 1);
  if (!L.hasWater) return;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty][tx]; if (ch !== 'W' && ch !== 'w') continue; const x = tx * T, y = ty * T;
    c.fillStyle = ch === 'w' ? 'rgba(90,190,255,.45)' : 'rgba(40,130,220,.42)'; c.fillRect(x, y, T, T);
    if (ch === 'w') { const wv = Math.sin(t / 10 + tx * 1.3) * 1.2; c.fillStyle = 'rgba(220,250,255,.75)'; c.fillRect(x, y + wv, T, 1.6); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 3 + Math.sin(t / 20 + tx) * 2, y + 5, 4, 1); }
    else if ((t + tx * 13 + ty * 7) % 70 === 0) Z.fx.add({ x: x + Z.rnd(2, 14), y: y + 14, vx: 0, vy: -0.4, size: 1.3, color: 'rgba(255,255,255,.6)', life: 40, shrink: false });
  }
};

/* ---------------- الديكور ---------------- */
const DECO = {
  tree: (c, x, y, t, th) => { const s = 1 + ((x * 7) % 3) * 0.12; D.fillRR(c, x - 2, y - 14 * s, 4, 14 * s, 1, '#6a4020', OUT, 0.8); D.circ(c, x, y - 18 * s, 9 * s, D.rg(c, x - 3, y - 22 * s, 1, 10 * s, [[0, Z.shade(th.mid, .25)], [1, th.near]]), OUT, 0.9); D.circ(c, x - 6 * s, y - 13 * s, 5.5 * s, th.near, OUT, 0.8); D.circ(c, x + 6 * s, y - 13 * s, 5.5 * s, Z.shade(th.near, .1), OUT, 0.8); },
  bush: (c, x, y, t, th) => { D.circ(c, x - 4, y - 3, 4.5, th.near, OUT, 0.8); D.circ(c, x + 4, y - 3, 4.5, th.near, OUT, 0.8); D.circ(c, x, y - 5, 5.5, Z.shade(th.near, .18), OUT, 0.8); },
  flower: (c, x, y, t, th) => { const sw = Math.sin(t / 30 + x) * 0.6; c.strokeStyle = '#2a8a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sw, y - 6); c.stroke(); const col = ['#ff5a8a', '#ffd23a', '#fff', '#a06aff'][Math.abs(Math.floor(x / 16)) % 4]; for (let i = 0; i < 5; i++) D.circ(c, x + sw + Math.cos(i * 1.257) * 2, y - 6 + Math.sin(i * 1.257) * 2, 1.5, col); D.circ(c, x + sw, y - 6, 1.1, '#ffb800'); },
  rock: (c, x, y, t, th) => { D.poly(c, [x - 6, y, x - 4, y - 5, x + 1, y - 7, x + 6, y - 3, x + 7, y], D.lg(c, 0, y - 7, 0, y, [[0, Z.shade(th.ground, .3)], [1, Z.shade(th.ground, -.15)]]), OUT, 0.9); },
  cactus: (c, x, y) => { D.fillRR(c, x - 2.5, y - 16, 5, 16, 2.4, '#3fa04a', OUT, 0.9); D.fillRR(c, x - 8, y - 11, 4, 2.8, 1.4, '#3fa04a', OUT, 0.8); D.fillRR(c, x - 8, y - 14, 2.8, 4, 1.4, '#3fa04a', OUT, 0.8); D.fillRR(c, x + 4, y - 9, 4, 2.8, 1.4, '#3fa04a', OUT, 0.8); D.fillRR(c, x + 5.4, y - 12, 2.8, 4, 1.4, '#3fa04a', OUT, 0.8); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - 1.5, y - 15, 1, 13); },
  bones: (c, x, y) => { D.ell(c, x - 3, y - 3, 4, 2, '#f4ecd6', OUT, 0.7); D.circ(c, x + 4, y - 4, 2.6, '#f4ecd6', OUT, 0.7); },
  dune: () => {},
  crystal: (c, x, y, t, th) => { const g = 0.6 + 0.4 * Math.sin(t / 25 + x); c.fillStyle = D.rg(c, x, y - 8, 0, 18, [[0, `rgba(127,232,255,${.25 * g})`], [1, 'rgba(127,232,255,0)']]); c.fillRect(x - 18, y - 26, 36, 36); D.poly(c, [x - 4, y, x - 2, y - 10, x + 1, y], '#7fe8ff', OUT, 0.8); D.poly(c, [x + 1, y, x + 4, y - 14, x + 7, y], '#b8f4ff', OUT, 0.8); D.poly(c, [x - 7, y, x - 5, y - 6, x - 3, y], '#4ab8e0', OUT, 0.8); },
  stalag: (c, x, y, t, th) => { D.poly(c, [x - 4, y, x, y - 12, x + 4, y], D.lg(c, 0, y - 12, 0, y, [[0, '#5a6ad0'], [1, '#2a3a8c']]), OUT, 0.8); },
  mushroom: (c, x, y, t, th) => { const b = Math.sin(t / 25 + x) * 0.5; D.fillRR(c, x - 1.8, y - 7, 3.6, 7, 1.6, '#f0e4d0', OUT, 0.8); D.ell(c, x, y - 8 + b * 0.3, 6.5, 4.4, '#e04a6a', OUT, 0.9); D.circ(c, x - 2.5, y - 9, 1.1, '#fff'); D.circ(c, x + 2.5, y - 8, 1, '#fff'); if (th.dark) { c.fillStyle = D.rg(c, x, y - 8, 0, 16, [[0, 'rgba(255,120,160,.25)'], [1, 'rgba(255,120,160,0)']]); c.fillRect(x - 16, y - 24, 32, 32); } },
  torch: (c, x, y, t, th) => { D.fillRR(c, x - 1.5, y - 12, 3, 12, 1, '#5a3a20', OUT, 0.8); D.fillRR(c, x - 3, y - 14, 6, 3, 1, '#8a8a98', OUT, 0.7); const f = Math.sin(t / 3 + x) * 0.8; D.poly(c, [x - 3, y - 14, x + f, y - 22, x + 3, y - 14], '#ff9a20'); D.poly(c, [x - 1.6, y - 14, x + f * 0.6, y - 19, x + 1.6, y - 14], '#ffe266'); c.fillStyle = D.rg(c, x, y - 16, 0, 26, [[0, 'rgba(255,170,60,.35)'], [1, 'rgba(255,170,60,0)']]); c.fillRect(x - 26, y - 42, 52, 52); if (t % 9 === 0) Z.fx.add({ x, y: y - 20, vx: Z.rnd(-.2, .2), vy: -0.5, size: 1, color: '#ffb030', life: 24, g: -0.005 }); },
  pine: (c, x, y, t, th) => { D.fillRR(c, x - 1.5, y - 5, 3, 5, 0.6, '#5a3a20', OUT, 0.7); for (let i = 0; i < 3; i++) { const yy = y - 4 - i * 6; D.poly(c, [x - 8 + i * 1.6, yy, x, yy - 10, x + 8 - i * 1.6, yy], D.lg(c, 0, yy - 10, 0, yy, [[0, '#3a9a5a'], [1, '#1f6a3a']]), OUT, 0.8); D.poly(c, [x - 5 + i, yy - 3, x, yy - 10, x + 5 - i, yy - 3, x + 2, yy - 5, x - 2, yy - 4], '#fff'); } },
  snowman: (c, x, y) => { D.circ(c, x, y - 4, 4.6, '#fff', OUT, 0.8); D.circ(c, x, y - 11, 3.4, '#fff', OUT, 0.8); D.circ(c, x - 1.2, y - 11.6, 0.5, '#000'); D.circ(c, x + 1.2, y - 11.6, 0.5, '#000'); D.poly(c, [x, y - 10.6, x + 3.4, y - 10, x, y - 9.6], '#ff7a1a'); D.fillRR(c, x - 3, y - 15, 6, 2, 0.6, '#c02a2a', OUT, 0.6); },
  ice: (c, x, y) => { D.poly(c, [x - 5, y, x - 3, y - 9, x, y], '#bfefff', OUT, 0.8); D.poly(c, [x, y, x + 2, y - 13, x + 6, y], '#d8f6ff', OUT, 0.8); },
  lantern: (c, x, y, t) => { D.fillRR(c, x - 1, y - 14, 2, 14, 0.6, '#4a3a2a'); const g = 0.7 + 0.3 * Math.sin(t / 15 + x); c.fillStyle = D.rg(c, x, y - 14, 0, 20, [[0, `rgba(200,255,120,${.4 * g})`], [1, 'rgba(200,255,120,0)']]); c.fillRect(x - 20, y - 34, 40, 40); D.fillRR(c, x - 3, y - 18, 6, 6, 2, '#d8ff8a', OUT, 0.7); },
  lavaplant: (c, x, y, t) => { const sw = Math.sin(t / 18 + x) * 1.2; c.strokeStyle = '#ff6a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + sw, y - 6, x + sw * 1.5, y - 11); c.stroke(); D.circ(c, x + sw * 1.5, y - 11, 2.4, '#ffd23a', OUT, 0.7); },
  skull: (c, x, y) => { D.circ(c, x, y - 4, 4, '#eee6d0', OUT, 0.8); D.fillRR(c, x - 2.4, y - 2, 4.8, 3, 1, '#eee6d0', OUT, 0.7); D.circ(c, x - 1.6, y - 4.4, 1, '#222'); D.circ(c, x + 1.6, y - 4.4, 1, '#222'); },
  cloudpuff: (c, x, y, t, th) => { D.circ(c, x - 4, y - 3, 4, '#fff', 'rgba(150,190,230,.7)', 0.7); D.circ(c, x + 4, y - 3, 4, '#fff', 'rgba(150,190,230,.7)', 0.7); D.circ(c, x, y - 5, 5, '#fff', 'rgba(150,190,230,.7)', 0.7); },
  pillar: (c, x, y, t, th) => { const col = Z.mix(th.ground, '#c8c0a8', .6); D.fillRR(c, x - 4, y - 24, 8, 24, 1, D.lg(c, x - 4, 0, x + 4, 0, [[0, Z.shade(col, .25)], [1, Z.shade(col, -.25)]]), OUT, 0.9); D.fillRR(c, x - 6, y - 26, 12, 3.4, 1, col, OUT, 0.8); D.fillRR(c, x - 6, y - 3, 12, 3, 1, col, OUT, 0.8); },
  banner: (c, x, y, t, th) => { D.fillRR(c, x - 5, y - 30, 10, 2, 1, '#8a8a98', OUT, 0.6); const sw = Math.sin(t / 22 + x) * 1.2; D.poly(c, [x - 4, y - 28, x + 4, y - 28, x + 4 + sw, y - 12, x + sw * 0.5, y - 15, x - 4 + sw, y - 12], '#a0203a', OUT, 0.8); D.star(c, x + sw * 0.4, y - 23, 2.4, '#ffd23a', null); },
  statue: (c, x, y, t, th) => { const col = Z.mix(th.ground, '#b0a890', .6); D.fillRR(c, x - 6, y - 4, 12, 4, 1, col, OUT, 0.8); D.fillRR(c, x - 3.5, y - 16, 7, 12, 2, col, OUT, 0.8); D.circ(c, x, y - 19, 3.6, col, OUT, 0.8); D.circ(c, x - 1.2, y - 19.4, 0.6, '#4affd0'); D.circ(c, x + 1.2, y - 19.4, 0.6, '#4affd0'); },
  coral: (c, x, y, t, th) => { const sw = Math.sin(t / 30 + x) * 0.6; c.strokeStyle = th.brick; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 2 + sw, y - 6, x - 5 + sw, y - 12); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - 7, x + 5 - sw, y - 10); c.moveTo(x, y - 6); c.lineTo(x + 1, y - 13); c.stroke(); c.lineCap = 'butt'; },
  seaweed: (c, x, y, t) => { c.strokeStyle = '#2aa050'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); for (let i = 1; i <= 5; i++) c.lineTo(x + Math.sin(t / 20 + i * 0.9 + x) * 2.4, y - i * 3.2); c.stroke(); },
  shell: (c, x, y) => { D.ell(c, x, y - 3, 4.4, 3.4, '#ffd2e0', OUT, 0.8); c.strokeStyle = 'rgba(200,100,140,.7)'; c.lineWidth = 0.6; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x, y - 0.5); c.lineTo(x + i * 1.6, y - 5.4); c.stroke(); } },
  palm: (c, x, y, t, th) => { c.strokeStyle = '#7a5a30'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - 14, x + 1, y - 24); c.stroke(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.7 + Math.sin(t / 30 + i) * 0.05; c.save(); c.translate(x + 1, y - 24); c.rotate(a + Math.PI / 2); D.ell(c, 0, -7, 2.6, 8, '#2fa040', OUT, 0.7); c.restore(); } },
  fern: (c, x, y, t) => { for (let i = -2; i <= 2; i++) { c.save(); c.translate(x, y); c.rotate(i * 0.35 + Math.sin(t / 40 + x) * 0.05); D.ell(c, 0, -6, 1.8, 7, '#3ab850', OUT, 0.6); c.restore(); } },
  antenna: (c, x, y, t) => { D.fillRR(c, x - 1, y - 16, 2, 16, 0.6, '#9a8ad0', OUT, 0.6); D.circ(c, x, y - 17, 2.6, (t >> 4) & 1 ? '#5affff' : '#ff5ad8', OUT, 0.7); D.fillRR(c, x - 4, y - 3, 8, 3, 1, '#5a4a90', OUT, 0.6); },
  sparkle: (c, x, y, t) => { if (t % 14 === 0) Z.fx.sparkle(x, y - 2, ['#fff7a0', '#fff', '#8ff']); },
};
A.drawDeco = (c, L, cam, t) => {
  const th = L.theme;
  for (const d of L.deco) {
    const px = d.x * T + 8; if (px < cam.x - 24 || px > cam.x + VW + 24) continue;
    const fn = DECO[d.t]; if (fn) fn(c, px, d.y * T, t, th);
  }
};

/* ---------------- الخلفيات ---------------- */
const LW = 512;
function ridge(c, w, base, amp, freq, seed, fill, k) {
  const r = Z.rng(seed), ph = [r() * 6, r() * 6, r() * 6];
  c.beginPath(); c.moveTo(0, 400);
  for (let x = 0; x <= w; x += 4) { const u = x / w * TAU; const y = base - (Math.sin(u * freq + ph[0]) * 0.5 + Math.sin(u * freq * 2 + ph[1]) * 0.3 + Math.sin(u * freq * 3 + ph[2]) * 0.2) * amp - amp; c.lineTo(x, y); }
  c.lineTo(w, 400); c.closePath(); c.fillStyle = fill; c.fill();
}
function peaks(c, w, base, hMin, hMax, n, seed, fill, cap) {
  const r = Z.rng(seed);
  for (let i = 0; i < n; i++) {
    const px = (i + r() * 0.6) * w / n, h = hMin + r() * (hMax - hMin), wd = h * (0.9 + r() * 0.6);
    for (const off of [-w, 0, w]) { const x = px + off; D.poly(c, [x - wd, base + 4, x, base - h, x + wd, base + 4], fill);
      if (cap) D.poly(c, [x - wd * 0.28, base - h * 0.72, x, base - h, x + wd * 0.28, base - h * 0.72, x + wd * 0.1, base - h * 0.62, x, base - h * 0.7, x - wd * 0.12, base - h * 0.6], cap); }
  }
}
function tri(c, x, y, s, fill) { D.poly(c, [x - s, y, x, y - s * 2.2, x + s, y], fill); }
A.buildBG = th => {
  const key = th.key, r = Z.rng(th.biome * 31 + 7);
  const mkLayer = fn => mk(LW * 2, 260 * 2, c => { c.scale(2, 2); fn(c); });
  const far = mkLayer(c => {
    const fill = D.lg(c, 0, 60, 0, 200, [[0, th.far], [1, Z.mix(th.far, th.sky[2], .5)]]);
    switch (key) {
      case 'meadow': case 'jungle': peaks(c, LW, 200, 50, 95, 5, 3, fill, key === 'meadow' ? 'rgba(255,255,255,.85)' : null); break;
      case 'desert': ridge(c, LW, 200, 26, 2, 4, fill); { const p = 230; D.poly(c, [120, 200, 170, 130, 220, 200], Z.shade(th.far, -.08)); D.poly(c, [330, 200, 360, 150, 390, 200], Z.shade(th.far, -.05)); } break;
      case 'cave': ridge(c, LW, 200, 40, 3, 9, fill); c.fillStyle = 'rgba(80,120,255,.18)'; for (let i = 0; i < 8; i++) tri(c, r() * LW, 200, 6 + r() * 8, 'rgba(80,140,255,.22)'); break;
      case 'snow': peaks(c, LW, 200, 70, 120, 4, 5, fill, '#fff'); break;
      case 'forest': ridge(c, LW, 200, 30, 3, 6, fill); break;
      case 'volcano': peaks(c, LW, 205, 90, 130, 3, 8, fill); for (let i = 0; i < 3; i++) { const vx = (i + 0.4) * LW / 3; c.fillStyle = D.rg(c, vx, 110, 0, 40, [[0, 'rgba(255,140,40,.7)'], [1, 'rgba(255,80,0,0)']]); c.fillRect(vx - 50, 70, 100, 90); } break;
      case 'sky': for (let i = 0; i < 4; i++) { const x = (i + 0.3) * LW / 4; c.fillStyle = 'rgba(255,255,255,.6)'; D.ell(c, x, 150 + (i % 2) * 20, 46, 12, 'rgba(255,255,255,.55)'); D.poly(c, [x - 20, 158, x + 20, 158, x, 190], 'rgba(150,120,90,.35)'); } break;
      case 'castle': ridge(c, LW, 200, 35, 3, 11, fill); for (let i = 0; i < 4; i++) { const x = 60 + i * 130 + r() * 30; c.fillStyle = 'rgba(20,10,40,.7)'; c.fillRect(x, 90 + r() * 30, 26, 120); c.fillRect(x - 3, 84 + r() * 6, 32, 8); for (let k = 0; k < 4; k++) c.fillRect(x - 3 + k * 9, 78, 5, 8); c.fillStyle = 'rgba(255,190,90,.8)'; c.fillRect(x + 10, 110, 5, 9); } break;
      case 'ocean': for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(255,255,255,${.07 + i * .01})`; c.beginPath(); c.moveTo(60 + i * 80, 0); c.lineTo(100 + i * 80, 0); c.lineTo(50 + i * 80 - 40, 240); c.lineTo(20 + i * 80 - 40, 240); c.fill(); } for (let i = 0; i < 6; i++) { const x = r() * LW, y = 80 + r() * 90; D.ell(c, x, y, 8, 3.6, 'rgba(20,80,140,.4)'); D.poly(c, [x + 7, y, x + 13, y - 4, x + 13, y + 4], 'rgba(20,80,140,.4)'); } break;
      case 'ruins': ridge(c, LW, 200, 24, 2, 12, fill); D.poly(c, [90, 200, 150, 120, 210, 200], Z.shade(th.far, -.1)); D.poly(c, [300, 200, 340, 140, 380, 200], Z.shade(th.far, -.06)); break;
      case 'space': for (let i = 0; i < 4; i++) { const x = r() * LW, y = 30 + r() * 100, rad = 14 + r() * 26; c.fillStyle = D.rg(c, x - rad * .3, y - rad * .3, 1, rad, [[0, ['#ff9ad8', '#7affff', '#ffd27a', '#9a7aff'][i]], [1, Z.shade(['#ff9ad8', '#7affff', '#ffd27a', '#9a7aff'][i], -.6)]]); c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill(); } for (let i = 0; i < 3; i++) { c.fillStyle = D.rg(c, r() * LW, 120, 0, 90, [[0, 'rgba(255,90,216,.22)'], [1, 'rgba(255,90,216,0)']]); c.fillRect(0, 0, LW, 260); } break;
    }
  });
  const mid = mkLayer(c => {
    const col = th.mid;
    switch (key) {
      case 'meadow': ridge(c, LW, 215, 28, 3, 21, col); for (let i = 0; i < 9; i++) { const x = r() * LW; D.fillRR(c, x - 1.5, 176, 3, 20, 1, '#4a5a30'); D.circ(c, x, 172, 10, Z.shade(col, -.15)); } break;
      case 'desert': ridge(c, LW, 215, 26, 2, 22, col); ridge(c, LW, 228, 14, 3, 23, Z.shade(col, -.08)); for (let i = 0; i < 6; i++) { const x = r() * LW; D.fillRR(c, x - 3, 180, 6, 32, 3, Z.shade(th.near, -.05)); D.fillRR(c, x - 9, 190, 4, 3, 1.5, Z.shade(th.near, -.05)); D.fillRR(c, x - 9, 186, 3, 8, 1.5, Z.shade(th.near, -.05)); } break;
      case 'cave': ridge(c, LW, 220, 26, 4, 24, col); for (let i = 0; i < 14; i++) { const x = r() * LW; D.poly(c, [x - 6, 0, x, 30 + r() * 46, x + 6, 0], Z.shade(col, -.3)); } for (let i = 0; i < 10; i++) { const x = r() * LW; D.poly(c, [x - 7, 260, x, 222 - r() * 30, x + 7, 260], Z.shade(col, -.2)); c.fillStyle = 'rgba(100,200,255,.6)'; c.fillRect(x - 1, 200 + r() * 10, 2, 5); } break;
      case 'snow': ridge(c, LW, 215, 26, 3, 25, col); for (let i = 0; i < 11; i++) { const x = r() * LW, h = 26 + r() * 22; for (const off of [0]) { D.poly(c, [x - 9, 205, x, 205 - h, x + 9, 205], '#3f8a66'); D.poly(c, [x - 6, 196 - h * .4, x, 205 - h, x + 6, 196 - h * .4], '#fff'); } } break;
      case 'forest': ridge(c, LW, 215, 20, 3, 26, col); for (let i = 0; i < 12; i++) { const x = r() * LW, h = 60 + r() * 60; c.fillStyle = 'rgba(12,8,40,.85)'; c.fillRect(x - 4, 210 - h, 8, h); D.circ(c, x, 205 - h, 18 + r() * 8, 'rgba(14,10,44,.88)'); } break;
      case 'volcano': ridge(c, LW, 220, 30, 3, 27, col); for (let i = 0; i < 6; i++) { const x = r() * LW; c.fillStyle = 'rgba(255,110,30,.55)'; c.fillRect(x, 200 + r() * 20, 2, 26); } break;
      case 'sky': for (let i = 0; i < 5; i++) { const x = r() * LW, y = 120 + r() * 100; cloudB(c, x, y, 1.4 + r()); } break;
      case 'castle': ridge(c, LW, 225, 18, 3, 28, col); for (let i = 0; i < 7; i++) { const x = i * 75 + r() * 20; c.fillStyle = Z.shade(col, -.35); c.fillRect(x, 120, 32, 140); c.fillRect(x - 3, 112, 38, 10); for (let k = 0; k < 4; k++) c.fillRect(x - 3 + k * 11, 104, 6, 8); c.fillStyle = 'rgba(255,170,70,.75)'; c.fillRect(x + 12, 150, 6, 12); c.fillRect(x + 12, 190, 6, 12); } break;
      case 'ocean': ridge(c, LW, 225, 20, 3, 29, col); for (let i = 0; i < 9; i++) { const x = r() * LW; c.strokeStyle = 'rgba(30,150,80,.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 240); for (let k = 1; k < 8; k++) c.lineTo(x + Math.sin(k) * 4, 240 - k * 12); c.stroke(); } break;
      case 'jungle': ridge(c, LW, 215, 22, 3, 30, col); for (let i = 0; i < 10; i++) { const x = r() * LW, h = 70 + r() * 70; D.fillRR(c, x - 5, 214 - h, 10, h, 3, Z.shade(th.ground, -.1)); for (let k = 0; k < 4; k++) { c.save(); c.translate(x, 214 - h); c.rotate(-1.4 + k * 0.9); D.ell(c, 0, -14, 6, 18, Z.shade(col, -.05)); c.restore(); } } break;
      case 'ruins': ridge(c, LW, 220, 20, 3, 31, col); for (let i = 0; i < 8; i++) { const x = r() * LW, h = 40 + r() * 40; c.fillStyle = Z.shade(col, -.12); c.fillRect(x - 5, 215 - h, 10, h); c.fillRect(x - 8, 210 - h, 16, 5); } break;
      case 'space': for (let i = 0; i < 6; i++) { const x = r() * LW, y = 100 + r() * 120, s = 5 + r() * 10; D.poly(c, [x - s, y, x - s * .4, y - s, x + s, y - s * .3, x + s * .6, y + s * .7], '#3a2a70', 'rgba(255,90,216,.7)', 0.8); } break;
    }
  });
  const near = mkLayer(c => {
    const col = th.near;
    ridge(c, LW, 246, 12, 5, 41, col);
    for (let i = 0; i < 26; i++) { const x = r() * LW; tri(c, x, 250, 3 + r() * 3, Z.shade(col, -.05)); }
    if (key === 'meadow' || key === 'jungle') for (let i = 0; i < 6; i++) D.circ(c, r() * LW, 246, 5 + r() * 5, Z.shade(col, .08));
  });
  BG = { far, mid, near };
};
function cloudB(c, x, y, s) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x, y, 10 * s, 0, TAU); c.arc(x + 12 * s, y - 5 * s, 13 * s, 0, TAU); c.arc(x + 26 * s, y, 10 * s, 0, TAU); c.rect(x, y, 26 * s, 10 * s); c.fill(); }

const sky = {};
A.drawSky = (c, th, cam, t) => {
  let g = sky[th.name]; if (!g) g = sky[th.name] = D.lg(c, 0, 0, 0, VH, [[0, th.sky[0]], [.55, th.sky[1]], [1, th.sky[2]]]);
  c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  const k = th.key, py = -(cam.y - 230) * 0.03;
  if (k === 'meadow' || k === 'sky' || k === 'jungle') { const sx = 250 - cam.x * 0.01, sy = 36 + py; c.fillStyle = D.rg(c, sx, sy, 4, 60, [[0, 'rgba(255,250,200,.95)'], [.15, 'rgba(255,240,150,.5)'], [1, 'rgba(255,240,150,0)']]); c.fillRect(sx - 60, sy - 60, 120, 120); D.circ(c, sx, sy, 13, '#fff7c8'); }
  if (k === 'desert' || k === 'ruins') { const sx = 90, sy = 50 + py; c.fillStyle = D.rg(c, sx, sy, 6, 90, [[0, 'rgba(255,240,180,.95)'], [.25, 'rgba(255,200,110,.45)'], [1, 'rgba(255,170,80,0)']]); c.fillRect(sx - 90, sy - 90, 180, 180); D.circ(c, sx, sy, 17, '#fff0b0'); }
  if (k === 'volcano') { c.fillStyle = D.rg(c, VW / 2, VH + 20, 10, 200, [[0, 'rgba(255,150,40,.55)'], [1, 'rgba(255,60,0,0)']]); c.fillRect(0, 0, VW, VH); }
  if (['forest', 'castle', 'space', 'cave'].includes(k)) {
    for (let i = 0; i < 46; i++) { const x = (i * 71 % 331) - cam.x * 0.02, y = (i * 47 % 150) + py; c.fillStyle = `rgba(255,255,255,${.35 + .5 * Math.abs(Math.sin(t / 40 + i))})`; c.fillRect(((x % VW) + VW) % VW, y, 1.1, 1.1); }
    if (k === 'forest' || k === 'castle') { const mx = 240 - cam.x * 0.008, my = 34 + py; c.fillStyle = D.rg(c, mx, my, 5, 44, [[0, 'rgba(255,250,215,.6)'], [1, 'rgba(255,250,215,0)']]); c.fillRect(mx - 44, my - 44, 88, 88); D.circ(c, mx, my, 12, '#fff8dc'); D.circ(c, mx + 4, my - 3, 12, th.sky[0]); D.circ(c, mx, my, 12, null, null); }
  }
  if (k === 'snow' || k === 'meadow') for (let i = 0; i < 4; i++) cloudB(c, (((i * 130 - cam.x * 0.06 - t * 0.05) % 560) + 560) % 560 - 60, 26 + i * 15 + py, 0.8 + (i % 3) * 0.25);
};
A.drawBG = (c, th, cam, t) => {
  if (!BG) return;
  const layers = [[BG.far, 0.1, 0.05, -12], [BG.mid, 0.25, 0.11, 6], [BG.near, 0.45, 0.2, 30]];
  for (const [cv, fx, fy, yo] of layers) {
    const y = VH - 190 + yo - (cam.y - 230) * fy;
    const ox = -((cam.x * fx) % LW + LW) % LW;
    for (let x = ox; x < VW; x += LW) c.drawImage(cv, x, y, LW, 260);
    // ملء ما تحت الطبقة
    const col = cv === BG.far ? th.far : cv === BG.mid ? th.mid : th.near;
    const by = y + 259; if (by < VH) { c.fillStyle = col; c.fillRect(0, by, VW, VH - by + 2); }
  }
};
})();
