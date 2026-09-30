/* ===== رسم الشخصيات والأعداء والزعماء والعناصر ===== */
(() => {
'use strict';
const Z = window.Z, D = Z.draw, T = Z.T, OUT = D.OUT, TAU = Math.PI * 2;
const A = Z.art = Z.art || {};
const { rr, fillRR, circ, ell, poly, lg, rg } = D;

/* ---------------- الأبطال ---------------- */
const HP = [
  { cap: '#f5761a', capD: '#c24f0a', ov: '#2d5bd6', ovD: '#1d3fa0', shirt: '#ffffff', skin: '#f9c9a0', hair: '#5a2e12', shoe: '#5a3418', acc: '#ffd54a', scale: 1 },
  { cap: '#e0489c', capD: '#a02a70', ov: '#7a3bd8', ovD: '#5224a0', shirt: '#ffe6f2', skin: '#f6c39a', hair: '#2a1a3a', shoe: '#3a1a5a', acc: '#7affff', scale: 0.98, pony: 1 },
  { cap: '#2fae4a', capD: '#1c7a30', ov: '#e0a020', ovD: '#a87010', shirt: '#f2f2e4', skin: '#e8b48a', hair: '#2a1a10', shoe: '#3a2a1a', acc: '#ff5a5a', scale: 1.1, beard: 1 },
];
A.heroPal = i => HP[i];
A.drawHero = (c, p, t) => {
  if (p.inv > 0 && !p.dead && !p.star && (Math.floor(p.inv / 3) & 1)) return;
  const pal = HP[p.hero || 0], fx = p.x + p.w / 2, fy = p.y + p.h;
  const st = p.st, air = !p.onG && !p.swim && st !== 'wall';
  // ظل
  if (p.onG) { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(fx, fy + 0.4, 5.6, 1.7, 0, 0, TAU); c.fill(); }
  c.save(); c.translate(fx, fy);
  if (p.star) { const h = (t * 12) % 360; c.fillStyle = D.rg(c, 0, -9, 2, 20, [[0, `hsla(${h},100%,70%,.55)`], [1, `hsla(${h},100%,60%,0)`]]); c.fillRect(-20, -30, 40, 40); }
  if (p.fireP) { c.fillStyle = D.rg(c, 0, -9, 2, 16, [[0, 'rgba(255,140,40,.35)'], [1, 'rgba(255,140,40,0)']]); c.fillRect(-16, -26, 32, 32); }
  const face = p.face || 1; c.scale(face * (p.sx || 1) * pal.scale, (p.sy || 1) * pal.scale);
  if (p.dead) { c.rotate(p.deadRot || 0); c.translate(0, -8); }
  if (st === 'pound' && p.poundGo) { // كرة دوّارة
    c.translate(0, -7); c.rotate(p.anim * 0.5); circ(c, 0, 0, 7, lg(c, 0, -7, 0, 7, [[0, pal.ov], [1, pal.ovD]]), OUT, 1); circ(c, -2, -3, 2.4, 'rgba(255,255,255,.4)'); D.fillRR(c, -1, -7, 2, 3, 1, pal.acc); circ(c, 3, 3, 2.2, pal.cap, OUT, 0.8); c.restore(); return;
  }
  const phase = p.anim * 0.3, run = st === 'run' || st === 'skid';
  let lean = 0, legF = 0, legB = 0, armF = 0.3, armB = -0.3, bob = 0, sqY = 1, mouth = 0;
  if (st === 'idle') { bob = Math.sin(t * 0.08) * 0.4; armF = 0.1 + Math.sin(t * 0.08) * 0.05; armB = -0.15; }
  else if (run) { lean = 0.14; legF = Math.sin(phase) * 0.95; legB = -legF; armF = -legF * 0.9; armB = legF * 0.9; bob = -Math.abs(Math.sin(phase)) * 1.1; if (st === 'skid') { lean = -0.2; legF = 0.5; legB = -0.3; } }
  else if (air && st !== 'glide') { if (p.vy < 0) { legF = -0.7; legB = 0.6; armF = -2.4; armB = -2.0; mouth = 1; } else { legF = 0.4; legB = -0.4; armF = -1.6; armB = -1.3; } if (st === 'djump') { c.rotate(p.anim * 0.4); c.translate(0, 0); } }
  else if (st === 'glide') { armF = -1.5; armB = 1.5; legF = 0.2; legB = -0.2; lean = 0.08; }
  else if (st === 'crouch') { sqY = 0.66; armF = 0.5; armB = 0.2; }
  else if (st === 'slide') { lean = 0.9; sqY = 0.62; legF = 1.2; legB = 0.4; armF = -1.2; armB = -1.4; }
  else if (st === 'dash') { lean = 0.5; legF = 1.0; legB = -0.9; armF = -1.6; armB = -1.9; mouth = 1; }
  else if (st === 'wall') { armF = -2.8; armB = -2.6; legF = 0.2; legB = 0.5; }
  else if (st === 'swim') { const sw = Math.sin(p.anim * 0.4); lean = 0.6; legF = sw * 0.8; legB = -sw * 0.8; armF = -1.4 + sw * 0.4; armB = -1.0; }
  else if (st === 'hurt') { armF = -2.2; armB = -2.2; legF = 0.5; legB = -0.5; mouth = 1; }
  else if (st === 'pound') { armF = -3; armB = -3; legF = 0.1; legB = -0.1; lean = 0.05; }
  c.scale(1, sqY); c.translate(0, bob); c.rotate(lean * 0.6);
  // شعر/ذيل خلفي
  if (pal.pony) { const w = Math.sin(t * 0.2) * 1.2 - (p.vx || 0) * 0.5 * -1; c.beginPath(); c.moveTo(-3.5, -16); c.quadraticCurveTo(-9 - w, -15, -10 - w * 1.4, -9 + w * .4); c.quadraticCurveTo(-6, -12.5, -3.2, -12.8); c.closePath(); c.fillStyle = pal.hair; c.fill(); c.lineWidth = .8; c.strokeStyle = OUT; c.stroke(); circ(c, -4, -15.4, 1.7, pal.acc, OUT, 0.7); }
  const leg = (x, ang) => { c.save(); c.translate(x, -5); c.rotate(ang); fillRR(c, -1.8, 0, 3.6, 5, 1.5, lg(c, 0, 0, 0, 5, [[0, pal.ov], [1, pal.ovD]]), OUT, 0.8); fillRR(c, -2.4, 4.0, 5.6, 2.5, 1.2, pal.shoe, OUT, 0.8); c.restore(); };
  const arm = (x, ang) => { c.save(); c.translate(x, -10.4); c.rotate(ang); fillRR(c, -1.5, -0.6, 3, 5.4, 1.5, pal.shirt, OUT, 0.8); circ(c, 0, 5.4, 1.8, pal.skin, OUT, 0.7); c.restore(); };
  arm(-3.2, armB); leg(-2.2, legB);
  // الجسم
  fillRR(c, -4.6, -11.8, 9.2, 7.6, 2.8, lg(c, 0, -12, 0, -4, [[0, pal.ov], [1, pal.ovD]]), OUT, 0.9);
  fillRR(c, -4.6, -11.8, 9.2, 3.2, 2.2, pal.shirt, OUT, 0.8);
  fillRR(c, -3.4, -10.8, 1.8, 4.8, 0.8, pal.ov); fillRR(c, 1.6, -10.8, 1.8, 4.8, 0.8, pal.ov);
  circ(c, -2.5, -8.2, 0.8, pal.acc); circ(c, 2.5, -8.2, 0.8, pal.acc);
  leg(2.2, legF);
  if (pal.beard) { ell(c, 1, -10.5, 3.6, 2.4, pal.hair, OUT, 0.7); }
  // الرأس
  circ(c, 0.4, -14.6, 5.5, lg(c, 0, -20, 0, -9, [[0, Z.shade(pal.skin, .1)], [1, pal.skin]]), OUT, 0.9);
  ell(c, -4.7, -14.4, 1.3, 1.8, pal.skin, OUT, 0.7);
  const blink = (Math.floor(t / 4) % 60) < 2;
  if (blink) { c.strokeStyle = OUT; c.lineWidth = 0.9; c.beginPath(); c.moveTo(1.6, -14.4); c.lineTo(3.8, -14.4); c.stroke(); }
  else { ell(c, 2.9, -14.6, 1.6, 2.1, '#fff', OUT, 0.7); circ(c, 3.5 + Math.min(0.4, (p.vx || 0) * 0.1), -14.4, 1, '#20112e'); circ(c, 3.8, -15, 0.35, '#fff'); }
  circ(c, 3.6, -11.9, 1.2, 'rgba(255,110,110,.45)');
  c.strokeStyle = '#7a3a2a'; c.lineWidth = 0.8; c.beginPath(); if (mouth) { ell(c, 2.4, -11.4, 1, 1.2, '#7a2a20'); } else { c.arc(2.2, -12.3, 1.4, 0.15, Math.PI - 0.3); c.stroke(); }
  // شعر
  fillRR(c, -5.2, -16.6, 2.8, 5, 1.2, pal.hair);
  // القبعة
  c.save(); c.beginPath(); c.rect(-8, -22, 16, 8.4); c.clip();
  ell(c, 0.2, -16.2, 5.9, 5, lg(c, 0, -21, 0, -15, [[0, Z.shade(pal.cap, .2)], [1, pal.cap]]), OUT, 0.9); c.restore();
  fillRR(c, 1.6, -16.4, 6.6, 2.2, 1.1, pal.capD, OUT, 0.8);
  circ(c, 0.4, -19, 1.6, '#fff'); D.star(c, 0.4, -19, 1.2, pal.acc, null);
  if (p.feather) { c.save(); c.translate(-2, -20); c.rotate(-0.5 + Math.sin(t * 0.1) * 0.1); ell(c, 0, -4, 1.4, 5, '#ffe6f2', OUT, 0.6); c.restore(); }
  arm(3.4, armF);
  c.restore();
};

/* ---------------- الأعداء ---------------- */
const eyes = (c, x, y, sp, look, r, angry) => { for (const s of [-1, 1]) { circ(c, x + s * sp, y, r || 2.3, '#fff', OUT, 0.7); circ(c, x + s * sp + look * 0.8, y + 0.3, (r || 2.3) * 0.5, '#20112e'); } if (angry) { c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(x - sp - 2.6, y - r - 0.6); c.lineTo(x - 0.6, y - r + 0.8); c.moveTo(x + sp + 2.6, y - r - 0.6); c.lineTo(x + 0.6, y - r + 0.8); c.stroke(); } };
const SK = {
  slime: (c, e, t, f, col) => { const sq = 1 + Math.sin(e.age * 0.25) * 0.06; c.scale(1 / sq, sq); c.beginPath(); c.moveTo(-7, 0); c.bezierCurveTo(-8, -10, -3, -14, 0, -14); c.bezierCurveTo(3, -14, 8, -10, 7, 0); c.closePath(); c.fillStyle = lg(c, 0, -14, 0, 0, [[0, Z.shade(col, .3)], [1, Z.shade(col, -.15)]]); c.fill(); c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke(); ell(c, -2.5, -10.5, 2, 1.1, 'rgba(255,255,255,.5)'); eyes(c, 0, -6.6, 2.6, e.face, 2.4, true); },
  scarab: (c, e, t, f, col) => { for (let i = -1; i <= 1; i++) { c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(i * 3, -3); c.lineTo(i * 3 + (f ? 3 : -3), 0); c.stroke(); } ell(c, 0, -6, 7, 5.6, lg(c, 0, -12, 0, 0, [[0, Z.shade(col, .3)], [1, col]]), OUT, 0.9); c.strokeStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.moveTo(0, -11); c.lineTo(0, -1); c.stroke(); circ(c, e.face * 5.6, -6.4, 2.6, Z.shade(col, -.2), OUT, 0.8); circ(c, e.face * 6.4, -7, 0.8, '#fff'); },
  penguin: (c, e, t, f) => { ell(c, 0, -7, 6.4, 7, '#26264a', OUT, 0.9); ell(c, 0, -5.4, 4.2, 5, '#fff'); poly(c, [e.face * 3, -9, e.face * 7.5, -8, e.face * 3, -7], '#ff9a20', OUT, 0.7); eyes(c, 0, -10.4, 2.2, e.face, 1.7); ell(c, -4 - (f ? 1 : 0), -1, 3, 1.4, '#ff9a20', OUT, 0.7); ell(c, 4 + (f ? 1 : 0), -1, 3, 1.4, '#ff9a20', OUT, 0.7); },
  crab: (c, e, t, f, col) => { for (const s of [-1, 1]) { ell(c, s * 8, -9 - (f ? 1 : 0), 3, 2.4, col, OUT, 0.8); c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 5, -5); c.lineTo(s * 7, -8); c.stroke(); } ell(c, 0, -5.4, 7, 5, lg(c, 0, -10, 0, 0, [[0, Z.shade(col, .3)], [1, col]]), OUT, 0.9); eyes(c, 0, -9, 2.4, e.face, 1.7, true); },
  robot: (c, e, t, f) => { fillRR(c, -6, -13, 12, 10, 2.4, lg(c, 0, -13, 0, -3, [[0, '#c8c8e8'], [1, '#6a6a98']]), OUT, 0.9); fillRR(c, -4, -11, 8, 4.4, 1.2, '#20204a'); circ(c, -1.8 + e.face * 0.6, -9, 1.1, '#5affff'); circ(c, 1.8 + e.face * 0.6, -9, 1.1, '#5affff'); c.strokeStyle = OUT; c.beginPath(); c.moveTo(0, -13); c.lineTo(0, -16); c.stroke(); circ(c, 0, -16.5, 1.2, (t >> 4) & 1 ? '#ff5a5a' : '#5a1a1a', OUT, 0.5); fillRR(c, -5, -3, 3.4, 3.4 + (f ? 0 : 0.6), 1, '#4a4a70', OUT, 0.7); fillRR(c, 1.6, -3, 3.4, f ? 3.4 : 4, 1, '#4a4a70', OUT, 0.7); },
};
const ECOL = { meadow: '#9b40c8', desert: '#d8a838', cave: '#5a8ad8', snow: '#5ab8ff', forest: '#3aa06a', volcano: '#e04a20', sky: '#ff8ac8', castle: '#8a6ac8', ocean: '#ff6a4a', jungle: '#5ab040', ruins: '#c89a4a', space: '#7a5aff' };
const SKINOF = { meadow: 'slime', desert: 'scarab', cave: 'slime', snow: 'penguin', forest: 'slime', volcano: 'slime', sky: 'slime', castle: 'slime', ocean: 'crab', jungle: 'slime', ruins: 'scarab', space: 'robot' };

A.drawEnemy = (c, e, t, th) => {
  if (e.rm) return;
  const cx = e.x + e.w / 2, by = e.y + e.h, f = ((e.age >> 3) & 1) === 1, key = th.key, col = ECOL[key] || '#9b40c8';
  if (!e.dead && !e.squash && e.onG) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(cx, by + 1, e.w * 0.42, 1.6, 0, 0, TAU); c.fill(); }
  c.save(); c.translate(cx, by);
  if (e.dead) { c.translate(0, -e.h / 2); c.scale(1, -1); c.translate(0, e.h / 2); }
  if (e.flash > 0 && (e.flash >> 1) & 1) c.globalAlpha = 0.5;
  switch (e.t) {
    case 'blob':
      if (e.squash) { ell(c, 0, -2, 8, 2.4, Z.shade(col, -.1), OUT, 0.8); break; }
      SK[e.skin || SKINOF[key] || 'slime'](c, e, t, f, col);
      if (e.skin === 'penguin' || SKINOF[key] === 'penguin') { /* الرجلان ضمن الشكل */ } else if ((SKINOF[key] || 'slime') === 'slime') { fillRR(c, f ? -6 : -4, -1.2, 4.6, 2.4, 1.2, Z.shade(col, -.4), OUT, 0.7); fillRR(c, f ? 1.4 : 0, -1.2, 4.6, 2.4, 1.2, Z.shade(col, -.4), OUT, 0.7); }
      break;
    case 'snail': {
      c.scale(e.face < 0 ? 1 : -1, 1);
      if (e.state === 'walk') {
        ell(c, 1, -2.4, 8, 2.6, '#f8d58a', OUT, 0.8); circ(c, -6, -6, 3, '#f8d58a', OUT, 0.8); c.strokeStyle = OUT; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-7, -8); c.lineTo(-9, -12); c.moveTo(-5, -8.4); c.lineTo(-5.4, -12.4); c.stroke(); circ(c, -9, -12, 1, '#fff', OUT, 0.6); circ(c, -5.4, -12.6, 1, '#fff', OUT, 0.6);
        circ(c, 2, -8, 6.4, lg(c, 0, -14, 0, -2, [[0, Z.shade(col, .3)], [1, col]]), OUT, 0.9); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.9; c.beginPath(); c.arc(2, -8, 3.6, 0, 4.7); c.stroke(); c.beginPath(); c.arc(2, -8, 1.4, 0, 4.7); c.stroke();
      } else { const spin = e.state === 'slide' ? e.age * 0.5 : 0; c.translate(0, -6); c.rotate(spin); circ(c, 0, 0, 6.6, lg(c, 0, -7, 0, 7, [[0, Z.shade(col, .3)], [1, col]]), OUT, 0.9); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.9; c.beginPath(); c.arc(0, 0, 3.6, 0, 4.7); c.stroke(); c.beginPath(); c.arc(0, 0, 1.4, 0, 4.7); c.stroke(); if (e.state === 'shell' && e.age % 60 < 20) { c.rotate(-spin); ell(c, -8, 2, 1.6, 2, '#f8d58a'); } }
      break; }
    case 'spiny': {
      const sc = key === 'desert' || key === 'ruins';
      for (let i = 0; i < 5; i++) { const a = -Math.PI + (i + 0.5) * Math.PI / 5; poly(c, [Math.cos(a) * 5, -6 + Math.sin(a) * 5, Math.cos(a) * 10.5, -6 + Math.sin(a) * 10.5, Math.cos(a + 0.4) * 5, -6 + Math.sin(a + 0.4) * 5], '#fff5e0', OUT, 0.7); }
      ell(c, 0, -5.6, 7.4, 5.6, lg(c, 0, -11, 0, 0, [[0, sc ? '#e8a838' : '#f04a3a'], [1, sc ? '#a06a18' : '#a01a1a']]), OUT, 0.9);
      eyes(c, e.face * 1.2, -6.2, 2.4, e.face, 1.9, true); fillRR(c, f ? -6 : -4, -1.6, 4, 2.4, 1.2, '#4a2a1a', OUT, 0.6); fillRR(c, f ? 2 : 0.6, -1.6, 4, 2.4, 1.2, '#4a2a1a', OUT, 0.6);
      break; }
    case 'frog': {
      const air = !e.onG; c.scale(1, air ? 1.15 : 1 - (e.crouch ? 0.2 : 0));
      ell(c, 0, -5, 6.6, 5.2, lg(c, 0, -10, 0, 0, [[0, '#7ae04a'], [1, '#2f9a2a']]), OUT, 0.9); ell(c, 0, -2.6, 4.6, 2.6, '#d8f4a0');
      for (const s of [-1, 1]) { circ(c, s * 3.4, -10, 2.8, '#7ae04a', OUT, 0.8); circ(c, s * 3.4, -10.2, 1.7, '#fff'); circ(c, s * 3.4 + e.face * 0.5, -10, 0.9, '#20112e'); }
      if (air) { ell(c, -6, 0, 2, 4, '#2f9a2a', OUT, 0.7); ell(c, 6, 0, 2, 4, '#2f9a2a', OUT, 0.7); } else { ell(c, -6, -1, 3, 1.6, '#2f9a2a', OUT, 0.7); ell(c, 6, -1, 3, 1.6, '#2f9a2a', OUT, 0.7); }
      break; }
    case 'bat': {
      c.translate(0, e.h / 2 - 1); const fl = Math.sin(e.age * 0.5) * 5;
      for (const s of [-1, 1]) { poly(c, [s * 2, -1, s * 11, -5 + fl, s * 13, 1 + fl * .5, s * 8, 0, s * 6, 4, s * 3, 2], lg(c, 0, -5, 0, 4, [[0, '#7a4ac0'], [1, '#3a2280']]), OUT, 0.8); }
      ell(c, 0, 0, 4.4, 4.8, lg(c, 0, -5, 0, 5, [[0, '#5a3aa0'], [1, '#2a1a60']]), OUT, 0.9); poly(c, [-3, -3, -2.4, -7, -0.8, -3.6], '#5a3aa0', OUT, 0.7); poly(c, [3, -3, 2.4, -7, 0.8, -3.6], '#5a3aa0', OUT, 0.7);
      circ(c, -1.7, -0.6, 1.1, '#ff4a4a'); circ(c, 1.7, -0.6, 1.1, '#ff4a4a'); if (e.state === 'dive') { poly(c, [-1.4, 2, 0, 3.6, 1.4, 2], '#fff'); }
      break; }
    case 'ghost': {
      c.translate(0, e.h / 2 - 2 + Math.sin(e.age * 0.1) * 1.5); const shy = e.shy; c.globalAlpha *= shy ? 0.55 : 0.92;
      c.beginPath(); c.moveTo(-6.4, 6); c.bezierCurveTo(-8, -6, -5, -9, 0, -9); c.bezierCurveTo(5, -9, 8, -6, 6.4, 6); for (let i = 0; i < 4; i++) c.lineTo(6.4 - (i + 0.5) * 3.2, 6 - (i % 2 ? 0 : 2.2)); c.closePath();
      c.fillStyle = lg(c, 0, -9, 0, 6, [[0, '#ffffff'], [1, '#bcc4ff']]); c.fill(); c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
      if (shy) { fillRR(c, -5, -4, 3.6, 4, 1.8, '#fff', OUT, 0.7); fillRR(c, 1.4, -4, 3.6, 4, 1.8, '#fff', OUT, 0.7); } else { circ(c, -2.4, -3.2, 1.3, '#20112e'); circ(c, 2.4, -3.2, 1.3, '#20112e'); ell(c, 0, 0.8, 1.6, 2, '#20112e'); }
      break; }
    case 'thrower': {
      const sk = { jungle: 'monkey', snow: 'yeti', castle: 'skeleton', ruins: 'skeleton', ocean: 'pirate' }[key] || 'goblin';
      const body = { monkey: '#a06a3a', yeti: '#e8f4ff', skeleton: '#efe8d4', pirate: '#e05a4a', goblin: '#6ab04a' }[sk];
      c.scale(e.face < 0 ? -1 : 1, 1);
      fillRR(c, -4.4, -9, 8.8, 8, 3, lg(c, 0, -9, 0, -1, [[0, Z.shade(body, .2)], [1, body]]), OUT, 0.9);
      circ(c, 0, -12, 4.8, Z.shade(body, .1), OUT, 0.9); eyes(c, 0.4, -12.4, 1.7, 1, 1.4, true);
      if (sk === 'skeleton') { fillRR(c, -2.6, -9.6, 5.2, 1.3, 0.6, '#20112e'); } if (sk === 'pirate') { poly(c, [-5, -15, 5, -15, 0, -19], '#20112e', OUT, 0.6); } if (sk === 'monkey') { circ(c, -4.6, -12, 1.8, '#d8a068', OUT, 0.6); }
      fillRR(c, f ? -4 : -2, -1.6, 3.4, 2.6, 1.2, Z.shade(body, -.3), OUT, 0.6); fillRR(c, f ? 1 : 0.4, -1.6, 3.4, 2.6, 1.2, Z.shade(body, -.3), OUT, 0.6);
      const wind = e.state === 'wind'; c.save(); c.translate(3, wind ? -15 : -6); circ(c, 0, 0, 1.6, body, OUT, 0.6); if (wind || e.state === 'walk') { const pc = { monkey: '#7a4a1a', yeti: '#fff', skeleton: '#efe8d4', pirate: '#444', goblin: '#c8a06a' }[sk]; circ(c, 0, -2.8, 2.4, pc, OUT, 0.7); } c.restore();
      break; }
    case 'charger': {
      c.scale(e.face < 0 ? -1 : 1, 1); const ch = e.state === 'charge', bob = ch ? Math.sin(e.age * 0.9) * 0.8 : 0;
      c.translate(0, bob); ell(c, 0, -7, 9.4, 6.6, lg(c, 0, -13, 0, 0, [[0, '#a87a4a'], [1, '#6a4a2a']]), OUT, 0.9); ell(c, 8, -8, 4.6, 4.4, '#b88a58', OUT, 0.9); poly(c, [9, -5, 13, -4, 10, -2], '#fff8e0', OUT, 0.7); poly(c, [6, -5, 8, -1.6, 4.4, -3], '#fff8e0', OUT, 0.7);
      circ(c, 9, -9.4, 1.3, '#fff'); circ(c, 9.4, -9.4, 0.7, ch ? '#ff2a2a' : '#20112e'); poly(c, [5, -12, 7, -15, 8, -11], '#8a5a30', OUT, 0.6);
      fillRR(c, -6, -1.2 + (f ? 0 : 0.4), 3.4, 3, 1.2, '#4a2a1a', OUT, 0.6); fillRR(c, 3, -1.2 + (f ? 0.4 : 0), 3.4, 3, 1.2, '#4a2a1a', OUT, 0.6);
      break; }
    case 'piranha': {
      const open = 0.35 + Math.abs(Math.sin(e.age * 0.12)) * 0.65;
      c.save(); c.beginPath(); c.rect(-12, -40, 24, 40 + (e.pipeClip || 0)); c.restore();
      fillRR(c, -1.4, -e.h + 12, 2.8, e.h, 1, '#2a9a3a', OUT, 0.7);
      c.save(); c.translate(0, -e.h + 6); circ(c, 0, 0, 7, lg(c, 0, -7, 0, 7, [[0, '#ff6a6a'], [1, '#c02020']]), OUT, 0.9);
      c.beginPath(); c.moveTo(-7, 0); c.lineTo(7, 0); c.lineTo(7 * Math.cos(open * 0.9), -7 * Math.sin(open * 0.9)); c.closePath(); c.save(); c.rotate(0); c.restore();
      ell(c, 0, 0, 5, 2 + open * 3, '#3a0a0a'); for (let i = -2; i <= 2; i++) poly(c, [i * 2 - 1, -1.6 - open * 2, i * 2 + 1, -1.6 - open * 2, i * 2, 0.4 - open * 1], '#fff'); circ(c, -3.5, -4.6, 1, '#fff'); circ(c, -4, -5.5, 0.9, '#fff'); for (let i = 0; i < 4; i++) circ(c, -4.5 + i * 3, -5.6 + (i % 2), 0.9, '#fff5f0');
      c.restore(); break; }
    case 'fish': {
      c.translate(0, -e.h / 2); c.scale(e.face < 0 ? -1 : 1, 1); const w = Math.sin(e.age * 0.4) * 2;
      poly(c, [-6, 0, -11, -4 + w, -11, 4 + w], '#ff8a3a', OUT, 0.8); ell(c, 0, 0, 7, 5, lg(c, 0, -5, 0, 5, [[0, '#ffb070'], [1, '#ff6a2a']]), OUT, 0.9); circ(c, 3.4, -1, 1.7, '#fff', OUT, 0.6); circ(c, 3.9, -1, 0.9, '#20112e'); poly(c, [-1, -4, 1, -8, 3, -4], '#ff8a3a', OUT, 0.6);
      break; }
    case 'fireball': {
      c.translate(0, -e.h / 2); const a = Math.atan2(e.vy, 0.0001); c.rotate(e.vy > 0 ? Math.PI : 0); poly(c, [-4, 2, 0, 14, 4, 2], 'rgba(255,120,30,.7)'); circ(c, 0, 0, 5.4, rg(c, 0, 0, 0, 6, [[0, '#fff5b0'], [.5, '#ffb030'], [1, '#e03a10']]), '#7a1a08', 0.8); c.fillStyle = D.rg(c, 0, 0, 0, 14, [[0, 'rgba(255,150,40,.4)'], [1, 'rgba(255,150,40,0)']]); c.fillRect(-14, -14, 28, 28);
      break; }
    case 'bullet': {
      c.translate(0, -e.h / 2); c.scale(e.dirx < 0 ? 1 : -1, 1); for (let i = 0; i < 3; i++) circ(c, 9 + i * 3, Z.rnd(-1, 1), 3 - i * 0.7, `rgba(255,170,60,${.6 - i * .18})`);
      fillRR(c, -7, -4.6, 13, 9.2, 4.6, lg(c, 0, -5, 0, 5, [[0, '#5a5a70'], [1, '#20202c']]), OUT, 0.9); circ(c, -3, -1, 1.7, '#fff'); circ(c, -3.5, -1, 0.8, '#ff3a3a'); poly(c, [-5, -3, -1, -1.6, -5, -2.6], '#fff'); fillRR(c, 2, -3.6, 1.4, 7.2, 0.6, '#ffd23a');
      break; }
    case 'crusher': {
      const sh = e.state === 'warn' ? Math.sin(e.age * 2) * 1.2 : 0; c.translate(sh, 0);
      fillRR(c, -e.w / 2, -e.h, e.w, e.h, 3, lg(c, 0, -e.h, 0, 0, [[0, '#a8a8c0'], [1, '#585870']]), OUT, 1);
      for (let i = 0; i < 4; i++) poly(c, [-e.w / 2 + 3 + i * 7, 0, -e.w / 2 + 6.5 + i * 7, 5, -e.w / 2 + 10 + i * 7, 0], '#d8d8e8', OUT, 0.7);
      const ang = e.state === 'slam' || e.state === 'warn';
      eyes(c, 0, -e.h / 2 - 1, 4.4, 0, 2.4, true); for (const s of [-1, 1]) circ(c, s * 4.4, -e.h / 2 - 1, 1.2, ang ? '#ff2a2a' : '#20112e'); fillRR(c, -4, -e.h / 2 + 4, 8, 2.4, 1, '#20112e'); for (let i = 0; i < 4; i++) c.fillRect(-3.2 + i * 2, -e.h / 2 + 4, 0.8, 2.4 * 0.6);
      break; }
    case 'cannon': {
      c.translate(0, -8); c.scale(e.dir < 0 ? -1 : 1, 1); const rec = e.recoil || 0;
      fillRR(c, -5 - rec, -3.6, 15, 7.2, 2, lg(c, 0, -4, 0, 4, [[0, '#6a6a80'], [1, '#2a2a38']]), OUT, 0.9); fillRR(c, 8 - rec, -4.6, 3.4, 9.2, 1.4, '#8a8a9a', OUT, 0.8); circ(c, -1, 0, 3, '#3a3a4a', OUT, 0.8);
      if (e.flash > 0) { circ(c, 14, 0, 5 + e.flash * 0.3, 'rgba(255,220,120,.9)'); }
      break; }
    case 'proj': {
      c.translate(0, -e.h / 2); const k = e.kind;
      if (k === 'snowball') { circ(c, 0, 0, 3.6, '#fff', '#9ac0e8', 0.8); circ(c, -1, -1, 1, 'rgba(180,210,240,.7)'); }
      else if (k === 'coconut') { c.rotate(e.age * 0.3); circ(c, 0, 0, 3.6, '#8a5a2a', OUT, 0.8); circ(c, -1, -1, 0.7, '#3a2210'); circ(c, 1, -1, 0.7, '#3a2210'); circ(c, 0, 1, 0.7, '#3a2210'); }
      else if (k === 'bone') { c.rotate(e.age * 0.4); fillRR(c, -4.6, -1, 9.2, 2, 1, '#f4ecd6', OUT, 0.7); circ(c, -4.6, -1.2, 1.5, '#f4ecd6', OUT, 0.6); circ(c, -4.6, 1.2, 1.5, '#f4ecd6', OUT, 0.6); circ(c, 4.6, -1.2, 1.5, '#f4ecd6', OUT, 0.6); circ(c, 4.6, 1.2, 1.5, '#f4ecd6', OUT, 0.6); }
      else if (k === 'orb') { c.fillStyle = D.rg(c, 0, 0, 0, 12, [[0, 'rgba(200,120,255,.55)'], [1, 'rgba(200,120,255,0)']]); c.fillRect(-12, -12, 24, 24); circ(c, 0, 0, 4, rg(c, 0, 0, 0, 4, [[0, '#fff'], [1, '#a04aff']]), '#5a1a9a', 0.7); }
      else if (k === 'flame') { c.rotate(e.age * 0.2); circ(c, 0, 0, 5, rg(c, 0, 0, 0, 5, [[0, '#fff5b0'], [.5, '#ffb030'], [1, '#e03a10']]), '#7a1a08', 0.7); }
      else if (k === 'wave') { poly(c, [-5, 4 + 0, 0, -e.h + 8, 5, 4], 'rgba(255,220,120,.9)', '#a06a10', 0.8); }
      else if (k === 'bomb') { circ(c, 0, 0, 4.4, '#30303c', OUT, 0.9); circ(c, -1.4, -1.4, 1.2, 'rgba(255,255,255,.4)'); c.strokeStyle = '#a88'; c.beginPath(); c.moveTo(2, -4); c.lineTo(4, -7); c.stroke(); if ((e.age >> 2) & 1) circ(c, 4, -7.4, 1.4, '#ffd23a'); }
      else if (k === 'icicle') { poly(c, [-2.6, -e.h / 2, 0, e.h / 2, 2.6, -e.h / 2], '#d8f6ff', '#5aa8d8', 0.8); }
      else if (k === 'spark') { D.star(c, 0, 0, 4, '#fff8a0', '#ffb030', e.age * 0.3); }
      else { circ(c, 0, 0, 3, '#fff', OUT, 0.7); }
      break; }
  }
  c.restore();
};

/* ---------------- الزعماء ---------------- */
A.drawBoss = (c, e, t, th) => {
  const cx = e.x + e.w / 2, by = e.y + e.h, acc = th.accent;
  if (!e.dead && e.kind !== 'flyer' && e.kind !== 'ghost') { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(cx, by + 1, e.w * 0.46, 2.2, 0, 0, TAU); c.fill(); }
  c.save(); c.translate(cx, by);
  if (e.dead) { c.translate(0, -e.h / 2); c.rotate(Math.sin(e.age * 0.6) * 0.15); c.translate(0, e.h / 2); }
  if (e.tele > 0) c.globalAlpha = Math.abs(Math.sin(e.age * 0.6)) * 0.6 + 0.2;
  if (e.inv > 0 && (e.inv >> 2) & 1) c.globalAlpha = 0.4;
  c.scale(e.face < 0 ? -1 : 1, 1);
  const hurt = e.inv > 30, tint = c2 => hurt ? Z.mix(c2, '#ffffff', .6) : c2;
  const eyeC = e.state === 'charge' || e.state === 'slam' || e.enraged ? '#ff2a2a' : '#ffe14a';
  switch (e.kind) {
    case 'golem': {
      const sq = e.state === 'jump' ? 1.1 : 1; c.scale(1 / sq, sq);
      const stone = tint(Z.mix('#9a9aa8', th.ground, .3));
      fillRR(c, -14, -34, 28, 30, 6, lg(c, 0, -34, 0, -4, [[0, Z.shade(stone, .25)], [1, Z.shade(stone, -.25)]]), OUT, 1.2);
      fillRR(c, -18, -30, 8, 20, 4, stone, OUT, 1); fillRR(c, 10, -30, 8, 20, 4, stone, OUT, 1); fillRR(c, -12, -6, 9, 6, 2, Z.shade(stone, -.3), OUT, 1); fillRR(c, 3, -6, 9, 6, 2, Z.shade(stone, -.3), OUT, 1);
      fillRR(c, -10, -44, 20, 14, 5, stone, OUT, 1.2);
      poly(c, [-8, -44, -5, -52, -2, -44], acc, OUT, 0.8); poly(c, [-2, -44, 1, -54, 4, -44], acc, OUT, 0.8); poly(c, [4, -44, 7, -52, 10, -44], acc, OUT, 0.8);
      for (const s of [-1, 1]) { fillRR(c, s * 4.6 - 3, -40, 6, 5, 2, '#20112e'); circ(c, s * 4.6, -37.5, 1.8, eyeC); } fillRR(c, -5, -34, 10, 2.4, 1, '#20112e');
      c.strokeStyle = acc; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -24); c.lineTo(-2, -20); c.lineTo(-5, -14); c.moveTo(7, -26); c.lineTo(4, -20); c.stroke();
      break; }
    case 'charger': {
      const ch = e.state === 'charge', body = tint('#c05a2a'); c.translate(0, ch ? Math.sin(e.age) * 0.8 : 0);
      ell(c, -2, -16, 20, 14, lg(c, 0, -30, 0, 0, [[0, Z.shade(body, .25)], [1, Z.shade(body, -.3)]]), OUT, 1.2); ell(c, 15, -19, 9, 8.6, Z.shade(body, .1), OUT, 1.1);
      poly(c, [18, -12, 28, -14, 20, -8], '#fff8e0', OUT, 0.9); poly(c, [11, -12, 16, -5, 7, -8], '#fff8e0', OUT, 0.9); poly(c, [10, -26, 14, -33, 17, -25], Z.shade(body, -.2), OUT, 0.9);
      circ(c, 17, -21, 2.4, '#fff'); circ(c, 17.6, -21, 1.3, eyeC); c.strokeStyle = '#4a1a08'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(13, -25); c.lineTo(20, -23); c.stroke();
      for (let i = 0; i < 4; i++) poly(c, [-14 + i * 5, -29, -12 + i * 5, -35, -10 + i * 5, -29], Z.shade(body, -.4), OUT, 0.7);
      fillRR(c, -12, -4, 7, 5, 2, '#3a1a08', OUT, 0.9); fillRR(c, 6, -4, 7, 5, 2, '#3a1a08', OUT, 0.9);
      if (e.tail) { c.strokeStyle = '#3a1a08'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, -16); c.quadraticCurveTo(-30, -26, -24, -36); c.stroke(); poly(c, [-27, -36, -22, -42, -21, -34], acc, OUT, 0.8); }
      break; }
    case 'flyer': {
      c.translate(0, e.h / 2 - 2); const fl = Math.sin(e.age * 0.35) * 9;
      for (const s of [-1, 1]) poly(c, [s * 6, -6, s * 30, -18 + fl, s * 34, -2 + fl * 0.5, s * 26, 0, s * 22, 8, s * 14, 4, s * 8, 10], lg(c, 0, -18, 0, 10, [[0, tint('#8a5ad0')], [1, '#3a2280']]), OUT, 1.1);
      ell(c, 0, 0, 12, 14, lg(c, 0, -14, 0, 14, [[0, tint('#6a4ab8')], [1, '#2a1a60']]), OUT, 1.2); poly(c, [-9, -10, -7, -20, -3, -12], '#6a4ab8', OUT, 0.9); poly(c, [9, -10, 7, -20, 3, -12], '#6a4ab8', OUT, 0.9);
      circ(c, -4.4, -3, 2.6, '#fff'); circ(c, 4.4, -3, 2.6, '#fff'); circ(c, -4, -3, 1.4, eyeC); circ(c, 4.8, -3, 1.4, eyeC); poly(c, [-3.6, 4, -2, 8, -0.6, 4], '#fff'); poly(c, [0.6, 4, 2, 8, 3.6, 4], '#fff'); ell(c, 0, 3, 5, 2, '#3a0a3a');
      break; }
    case 'thrower': {
      const fur = tint(th.key === 'snow' ? '#eaf6ff' : '#e05a7a'); const sq = e.state === 'slam' ? 1.1 : 1; c.scale(1 / sq, sq);
      ell(c, 0, -18, 17, 18, lg(c, 0, -34, 0, -2, [[0, Z.shade(fur, .2)], [1, Z.shade(fur, -.25)]]), OUT, 1.2);
      circ(c, 0, -34, 11, Z.shade(fur, .05), OUT, 1.2); ell(c, 0, -32, 7, 6, '#f8d8c0', OUT, 0.9);
      circ(c, -3.4, -35, 1.8, '#fff'); circ(c, 3.4, -35, 1.8, '#fff'); circ(c, -3.2, -35, 1, eyeC); circ(c, 3.6, -35, 1, eyeC); c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -38); c.lineTo(-1.6, -36.6); c.moveTo(6, -38); c.lineTo(1.6, -36.6); c.stroke();
      ell(c, 0, -28.6, 3.6, 1.6, '#5a1a1a'); for (const s of [-1, 1]) { fillRR(c, s * 15 - 4, -24, 8, 16, 4, fur, OUT, 1); circ(c, s * 15, -7, 4.6, fur, OUT, 1); }
      if (e.state === 'wind') { circ(c, 15, -34, 4.6, th.key === 'snow' ? '#fff' : '#7a4a1a', OUT, 0.9); }
      break; }
    case 'ghost': {
      c.translate(0, e.h / 2 - 2 + Math.sin(e.age * 0.08) * 3);
      c.beginPath(); c.moveTo(-15, 15); c.bezierCurveTo(-20, -12, -12, -20, 0, -20); c.bezierCurveTo(12, -20, 20, -12, 15, 15); for (let i = 0; i < 5; i++) c.lineTo(15 - (i + 0.5) * 6, 15 - (i % 2 ? 0 : 6)); c.closePath();
      c.fillStyle = lg(c, 0, -20, 0, 15, [[0, tint('#f4eaff')], [1, '#a890e8']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
      poly(c, [-9, -19, -7, -28, -3, -20, 0, -30, 3, -20, 7, -28, 9, -19], '#ffd23a', OUT, 0.9);
      for (const s of [-1, 1]) { ell(c, s * 6, -7, 3.4, 4.2, '#20112e'); circ(c, s * 6, -6.4, 1.5, eyeC); } ell(c, 0, 2, 3.6, 4, '#20112e');
      break; }
    case 'fire': {
      const sc = tint('#d83a2a'); const sq = e.state === 'breath' ? 1.06 : 1; c.scale(sq, 1 / sq);
      poly(c, [-18, -8, -30, -18, -22, -6], sc, OUT, 1); for (let i = 0; i < 5; i++) poly(c, [-16 + i * 6, -26, -13 + i * 6, -32, -10 + i * 6, -26], '#ffb030', OUT, 0.8);
      ell(c, -2, -14, 18, 13, lg(c, 0, -28, 0, 0, [[0, Z.shade(sc, .25)], [1, Z.shade(sc, -.3)]]), OUT, 1.2); ell(c, -2, -9, 12, 8, '#ffd08a');
      ell(c, 14, -22, 10, 8.6, Z.shade(sc, .08), OUT, 1.2); poly(c, [22, -26, 30, -22, 22, -18], sc, OUT, 1); circ(c, 16, -25, 2.6, '#fff'); circ(c, 16.8, -25, 1.4, eyeC); poly(c, [11, -30, 12, -37, 16, -31], '#ffb030', OUT, 0.8);
      if (e.state === 'breath') { c.fillStyle = D.rg(c, 34, -20, 0, 22, [[0, 'rgba(255,220,100,.9)'], [1, 'rgba(255,80,0,0)']]); c.fillRect(20, -40, 40, 40); }
      poly(c, [-6, -26, -22, -40 + Math.sin(e.age * 0.3) * 4, -14, -20], '#8a2a18', OUT, 1);
      fillRR(c, -10, -4, 8, 5, 2, '#8a2a18', OUT, 0.9); fillRR(c, 6, -4, 8, 5, 2, '#8a2a18', OUT, 0.9);
      break; }
    case 'king': {
      const robe = tint('#5a2a90');
      poly(c, [-16, 0, -12, -30, 12, -30, 16, 0], lg(c, 0, -30, 0, 0, [[0, Z.shade(robe, .2)], [1, Z.shade(robe, -.35)]]), OUT, 1.2);
      poly(c, [-6, -30, 0, -8, 6, -30], '#f4eaff', OUT, 0.8);
      circ(c, 0, -37, 10, '#e8c8a0', OUT, 1.1); poly(c, [-10, -42, -8, -54, -4, -46, 0, -56, 4, -46, 8, -54, 10, -42], '#ffd23a', OUT, 1); circ(c, 0, -49, 1.6, '#ff3a3a');
      circ(c, -3.6, -38, 1.7, '#fff'); circ(c, 3.6, -38, 1.7, '#fff'); circ(c, -3.4, -38, 1, eyeC); circ(c, 3.8, -38, 1, eyeC); ell(c, 0, -32.6, 5.6, 3.6, '#f4f4f4', OUT, 0.8);
      c.strokeStyle = '#e8c010'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 0); c.lineTo(18, -34); c.stroke(); circ(c, 18, -37, 4, acc, OUT, 0.9); c.fillStyle = D.rg(c, 18, -37, 0, 14, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(4, -51, 28, 28);
      break; }
    default: fillRR(c, -14, -30, 28, 30, 6, '#888', OUT, 1);
  }
  c.restore();
};

/* ---------------- العناصر ---------------- */
A.drawItem = (c, it, t) => {
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2, bob = Math.sin(t / 10 + it.x) * 0.8;
  c.save(); c.translate(cx, cy + bob);
  const glow = col => { c.fillStyle = D.rg(c, 0, 0, 0, 14, [[0, col], [1, 'rgba(255,255,255,0)']]); c.fillRect(-14, -14, 28, 28); };
  switch (it.t) {
    case 'mush': glow('rgba(255,120,120,.35)'); ell(c, 0, 0, 7, 5.6, lg(c, 0, -6, 0, 3, [[0, '#ff6a6a'], [1, '#c81e1e']]), OUT, 0.9); circ(c, -3, -2, 1.7, '#fff'); circ(c, 3, -1.6, 1.4, '#fff'); circ(c, 0, -4, 1.1, '#fff'); fillRR(c, -3.2, 2, 6.4, 5, 2, '#fbeed6', OUT, 0.8); circ(c, -1, 4, 0.5, '#20112e'); circ(c, 1, 4, 0.5, '#20112e'); break;
    case 'life': glow('rgba(120,255,140,.35)'); ell(c, 0, 0, 7, 5.6, lg(c, 0, -6, 0, 3, [[0, '#5aea6a'], [1, '#1e9a2a']]), OUT, 0.9); circ(c, -3, -2, 1.7, '#fff'); circ(c, 3, -1.6, 1.4, '#fff'); fillRR(c, -3.2, 2, 6.4, 5, 2, '#fbeed6', OUT, 0.8); break;
    case 'fire': glow('rgba(255,150,50,.4)'); fillRR(c, -0.9, 0, 1.8, 7, 0.9, '#2aa040', OUT, 0.6); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 0.03; ell(c, Math.cos(a) * 3.2, -2 + Math.sin(a) * 3.2, 2.6, 2.6, i % 2 ? '#ff6a2a' : '#ff9a30', OUT, 0.6); } circ(c, 0, -2, 2.6, '#ffe266', OUT, 0.6); break;
    case 'star': glow('rgba(255,240,120,.55)'); c.rotate(Math.sin(t / 12) * 0.2); D.star(c, 0, 0, 8, lg(c, 0, -8, 0, 8, [[0, '#fff58a'], [1, '#ffb800']]), OUT, 0); circ(c, -1.8, -0.6, 0.9, '#20112e'); circ(c, 1.8, -0.6, 0.9, '#20112e'); break;
    case 'feather': glow('rgba(255,180,230,.4)'); c.rotate(-0.6 + Math.sin(t / 14) * 0.15); ell(c, 0, 0, 3.6, 8, lg(c, 0, -8, 0, 8, [[0, '#fff'], [1, '#ff9ad8']]), OUT, 0.8); c.strokeStyle = 'rgba(200,80,160,.7)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, -7); c.lineTo(0, 8); c.stroke(); break;
    case 'heart': glow('rgba(255,90,120,.4)'); D.heart(c, 0, 0, 14, '#ff3a5a', OUT); D.fillRR(c, -3.4, -3.6, 2, 1.4, 0.7, 'rgba(255,255,255,.7)'); break;
  }
  c.restore();
};
A.drawFire = (c, f, t) => { circ(c, f.x + 3, f.y + 3, 3.4, rg(c, f.x + 3, f.y + 3, 0, 3.4, [[0, '#fff8c0'], [.6, '#ffb030'], [1, '#ff4a10']]), '#7a1a08', 0.6); c.fillStyle = 'rgba(255,140,40,.35)'; c.beginPath(); c.arc(f.x - f.vx * 2, f.y + 3 - f.vy, 2.4, 0, TAU); c.fill(); };
A.drawPlat = (c, p, t, th) => {
  fillRR(c, p.x, p.y, p.w, 6, 3, lg(c, 0, p.y, 0, p.y + 6, [[0, Z.shade(th.brick, .35)], [1, Z.shade(th.brick, -.15)]]), OUT, 0.9);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(p.x + 3, p.y + 1.2, p.w - 6, 1);
  for (let x = p.x + 4; x < p.x + p.w - 3; x += 8) { circ(c, x, p.y + 3.4, 0.9, 'rgba(0,0,0,.35)'); }
  if (p.k === 'v') { c.strokeStyle = 'rgba(200,220,255,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x + 3, p.y + 6); c.lineTo(p.x + 3, p.y + 20); c.moveTo(p.x + p.w - 3, p.y + 6); c.lineTo(p.x + p.w - 3, p.y + 20); c.stroke(); }
};
})();
