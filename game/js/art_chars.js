/* ===== رسم الشخصيات والأعداء والزعماء والعناصر ===== */
(() => {
'use strict';
const Z = window.Z, D = Z.draw, T = Z.T, OUT = D.OUT, TAU = Math.PI * 2;
const A = Z.art = Z.art || {};
const { rr, fillRR, circ, ell, poly, lg, rg } = D;

/* ---------------- الأبطال (أسلوب أنمي تشيبي) ---------------- */
const HP = [
  { skin: '#ffd9b3', cheek: 'rgba(255,120,120,.42)', hair: '#ff8624', hairD: '#c8560a', iris: '#2f6fe8', ov: '#2d5bd6', ovD: '#1d3fa0', shirt: '#ffffff', scarf: '#ffd54a', scarfD: '#e0a920', shoe: '#7a4520', glove: '#ffffff', style: 'spiky', scale: 1 },
  { skin: '#ffe2c6', cheek: 'rgba(255,110,140,.4)', hair: '#ff5ab8', hairD: '#c92a8a', iris: '#a85aff', ov: '#7a3bd8', ovD: '#5224a0', shirt: '#ffeaf6', scarf: '#7ae8ff', scarfD: '#38b8dc', shoe: '#45256a', glove: '#ffeaf6', style: 'twin', scale: 0.97 },
  { skin: '#f2c9a0', cheek: 'rgba(230,120,90,.35)', hair: '#38281a', hairD: '#1f150c', iris: '#2fae4a', ov: '#e0a020', ovD: '#a87010', shirt: '#f6f2e0', scarf: '#2fae4a', scarfD: '#1d7a30', shoe: '#33251a', glove: '#f6f2e0', style: 'band', scale: 1.06 },
];
A.heroPal = i => HP[i];

/* عين أنمي: بياض لوزي، قزحية متدرجة بلمعتين، جفن ورمش */
function aEye(c, x, y, w, h, iris, expr, look) {
  if (expr === 'blink') { c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(x - w, y + 0.3); c.quadraticCurveTo(x, y + 1.1, x + w, y + 0.3); c.stroke(); return; }
  if (expr === 'happy') { c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y + h * 0.55, w * 1.05, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); return; }
  if (expr === 'x') { c.strokeStyle = OUT; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - w * .75, y - h * .5); c.lineTo(x + w * .75, y + h * .5); c.moveTo(x + w * .75, y - h * .5); c.lineTo(x - w * .75, y + h * .5); c.stroke(); return; }
  const hh = expr === 'focus' ? h * 0.62 : h;
  ell(c, x, y, w, hh, '#fff', OUT, 0.8);
  const ix = x + (look || 0) * w * 0.35, iw = w * 0.62, ih = hh * 0.82;
  c.save(); c.beginPath(); c.ellipse(x, y, w, hh, 0, 0, TAU); c.clip();
  ell(c, ix, y + 0.25, iw, ih, lg(c, ix, y - ih, ix, y + ih, [[0, Z.shade(iris, .45)], [1, Z.shade(iris, -.3)]]));
  ell(c, ix, y + 0.45, iw * 0.5, ih * 0.5, '#150d28');
  circ(c, ix - iw * 0.35, y - ih * 0.45, w * 0.3, 'rgba(255,255,255,.95)');
  circ(c, ix + iw * 0.4, y + ih * 0.42, w * 0.14, 'rgba(255,255,255,.85)');
  c.restore();
  c.strokeStyle = OUT; c.lineWidth = 1.15; c.beginPath(); c.arc(x, y + 0.3, w * 1.04, Math.PI * 1.1, Math.PI * 1.92); c.stroke();
  c.lineWidth = 0.7; c.beginPath(); c.moveTo(x + w * 0.85, y - hh * 0.62); c.lineTo(x + w * 1.3, y - hh * 0.95); c.stroke();
}
function aBrow(c, x, y, w, mood) {
  c.strokeStyle = '#3a2415'; c.lineWidth = 1.05; c.beginPath();
  if (mood < 0) { c.moveTo(x - w, y - 1.2); c.lineTo(x + w, y + 0.6); }
  else if (mood > 0) { c.moveTo(x - w, y + 0.4); c.quadraticCurveTo(x, y - 1.4, x + w, y - 0.2); }
  else { c.moveTo(x - w, y); c.quadraticCurveTo(x, y - 0.9, x + w, y - 0.3); }
  c.stroke();
}
function aMouth(c, kind) {
  const mx = 3.1, my = -13.2;
  c.strokeStyle = '#8a3a2a'; c.lineWidth = 0.95;
  if (kind === 'open') { ell(c, mx, my, 1.9, 2.3, '#6b1f1f', OUT, 0.7); ell(c, mx, my + 1, 1.15, 0.9, '#ff8a7a'); }
  else if (kind === 'o') { ell(c, mx, my, 1.05, 1.35, '#6b1f1f', OUT, 0.7); }
  else if (kind === 'grit') { fillRR(c, mx - 2, my - 1, 4, 1.9, 0.9, '#fff', OUT, 0.75); c.strokeStyle = 'rgba(60,20,20,.4)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(mx - 0.6, my - 1); c.lineTo(mx - 0.6, my + 0.9); c.moveTo(mx + 0.7, my - 1); c.lineTo(mx + 0.7, my + 0.9); c.stroke(); }
  else if (kind === 'worry') { c.beginPath(); c.arc(mx, my + 1.3, 1.5, Math.PI + 0.5, TAU - 0.5); c.stroke(); }
  else if (kind === 'grin') { c.beginPath(); c.moveTo(mx - 2, my - 0.6); c.quadraticCurveTo(mx, my + 1.7, mx + 2.1, my - 0.9); c.quadraticCurveTo(mx, my + 0.4, mx - 2, my - 0.6); c.closePath(); c.fillStyle = '#6b1f1f'; c.fill(); c.lineWidth = 0.8; c.stroke(); }
  else { c.beginPath(); c.arc(mx - 0.3, my - 1, 1.9, 0.35, Math.PI - 0.75); c.stroke(); }
}

function aHead(c, p, pal, t, F2) {
  const hx = 0.6, hy = -17.4, r = 7.3;
  const sway = Z.clamp(-(p.vx || 0) * 1.15, -3.4, 3.4) + Math.sin(t * 0.09 + (p.hero || 0) * 2.1) * 0.7;
  const lift = Z.clamp((p.vy || 0) * 0.6, -2.8, 3);
  const H = pal.hair;
  // شعر خلفي متحرك (حركة تتبُّع ثانوية)
  if (pal.style === 'twin') {
    for (const seg of [[-4.4, -3.2, 12.5, 0], [-3.2, -5.4, 11, 1.4]]) {
      const sx0 = seg[0], sy0 = seg[1], len = seg[2], ph = seg[3];
      const ex = sx0 - len * 0.75 + sway * 1.25, ey = sy0 + len * 0.62 + lift + Math.sin(t * 0.24 + ph) * 1.5;
      c.beginPath(); c.moveTo(hx + sx0, hy + sy0);
      c.quadraticCurveTo(hx + sx0 - len * 0.55 + sway * 0.5, hy + sy0 + 1.5, hx + ex, hy + ey);
      c.quadraticCurveTo(hx + ex + 1.2, hy + ey + 2.5, hx + ex + 3.2, hy + ey + 1.6);
      c.quadraticCurveTo(hx + sx0 - len * 0.3 + sway * 0.4, hy + sy0 + 4.8, hx + sx0 + 1.6, hy + sy0 + 3.4);
      c.closePath(); c.fillStyle = lg(c, hx + sx0, hy + sy0, hx + ex, hy + ey, [[0, H], [1, Z.shade(H, .28)]]); c.fill();
      c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
      circ(c, hx + sx0 + 0.4, hy + sy0 + 1.7, 1.4, pal.scarf, OUT, 0.7);
    }
  } else if (pal.style === 'spiky') {
    for (let i = 0; i < 4; i++) {
      const a = -2.45 + i * 0.42, bx = hx + Math.cos(a) * (r - 1.2), by2 = hy + Math.sin(a) * (r - 1.2);
      poly(c, [bx, by2 - 2, bx - 3.8 - i * 0.4 + sway * 0.7, by2 - 2.4 + i * 1.8 + lift * 0.4, bx + 1.5, by2 + 1.7], i % 2 ? H : Z.shade(H, -.12), OUT, 0.8);
    }
  } else {
    for (const seg of [[-4.2, 0], [-2.5, 1.1]]) {
      const oy = seg[0], ph = seg[1], ex = -8.6 + sway * 1.1, ey = oy + 2.4 + lift * 0.7 + Math.sin(t * 0.28 + ph) * 1.4;
      poly(c, [hx - 5.4, hy + oy, hx + ex, hy + ey, hx + ex + 0.8, hy + ey + 2, hx - 5, hy + oy + 2.2], pal.scarf, OUT, 0.8);
    }
  }
  circ(c, hx - r + 1.6, hy + 0.7, 1.5, pal.skin, OUT, 0.7); // أذن
  circ(c, hx, hy, r, lg(c, hx - 3, hy - r, hx, hy + r, [[0, Z.shade(pal.skin, .12)], [1, Z.shade(pal.skin, -.06)]]), OUT, 1);
  if (pal.style === 'band') { c.strokeStyle = H; c.lineWidth = 2.5; c.beginPath(); c.arc(hx, hy - 0.5, r - 0.6, Math.PI * 0.24, Math.PI * 0.76); c.stroke(); } // لحية
  const lookX = F2.look == null ? 0.35 : F2.look;
  aEye(c, hx + 3.1, hy + 0.5, 2.15, 2.95, pal.iris, F2.eN, lookX);
  aEye(c, hx - 1.9, hy + 0.6, 1.75, 2.6, pal.iris, F2.eF, lookX);
  aBrow(c, hx + 3.1, hy - 3.2, 1.9, F2.brow); aBrow(c, hx - 1.9, hy - 3, 1.6, F2.brow);
  ell(c, hx + 5.3, hy + 3.1, 1.4, 0.75, pal.cheek); ell(c, hx - 3.6, hy + 3.2, 1.2, 0.65, pal.cheek);
  circ(c, hx + 5.6, hy + 1.4, 0.36, Z.shade(pal.skin, -.3)); // أنف
  aMouth(c, F2.mouth);
  // الغرّة الأمامية
  c.save(); c.beginPath(); c.arc(hx, hy, r + 0.4, 0, TAU); c.clip();
  if (pal.style === 'twin') {
    c.beginPath(); c.moveTo(hx - r, hy - 1.2);
    for (let i = 0; i < 4; i++) { const x1 = hx - r + (i + 0.5) * (r * 1.95 / 4), x2 = hx - r + (i + 1) * (r * 1.95 / 4); c.quadraticCurveTo(x1, hy - 1.4 + (i % 2) * 0.8, x2, hy - 3.6 + (i % 2 ? 0.7 : 0)); }
    c.lineTo(hx + r, hy - r - 1); c.lineTo(hx - r, hy - r - 1); c.closePath();
    c.fillStyle = lg(c, hx, hy - r, hx, hy - 1, [[0, Z.shade(H, .18)], [1, H]]); c.fill(); c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
  } else if (pal.style === 'spiky') {
    c.beginPath(); c.moveTo(hx - r, hy + 0.2);
    for (let i = 0; i < 5; i++) { const x2 = hx - r + (i + 1) * (r * 2 / 5); c.lineTo(hx - r + (i + 0.55) * (r * 2 / 5), hy - 1.8 + (i % 2) * 1.2); c.lineTo(x2, hy - 3.9 + (i % 2 ? 0.9 : 0)); }
    c.lineTo(hx + r, hy - r - 1); c.lineTo(hx - r, hy - r - 1); c.closePath();
    c.fillStyle = lg(c, hx, hy - r, hx, hy, [[0, Z.shade(H, .15)], [1, H]]); c.fill(); c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
  } else {
    c.beginPath(); c.arc(hx, hy, r, Math.PI * 1.02, Math.PI * 1.98); c.closePath();
    c.fillStyle = lg(c, hx, hy - r, hx, hy - 2, [[0, Z.shade(H, .2)], [1, H]]); c.fill(); c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
  }
  c.restore();
  if (pal.style === 'twin') { poly(c, [hx - r + 0.2, hy - 2, hx - r + 2.3, hy - 1.8, hx - r + 1.1, hy + 3.6], H, OUT, 0.8); poly(c, [hx + r - 2.7, hy - 2.4, hx + r - 0.3, hy - 2.2, hx + r - 1.2, hy + 2.8], H, OUT, 0.8); }
  // الإكسسوار
  if (pal.style === 'spiky') {
    fillRR(c, hx - r + 0.6, hy - 4.9, r * 2 - 1.2, 1.7, 0.85, '#5a3418', OUT, 0.7);
    for (const gx of [hx - 2.2, hx + 2.5]) { circ(c, gx, hy - 5.7, 2.05, lg(c, gx - 1, hy - 7.5, gx + 1, hy - 4, [[0, '#bfeeff'], [1, '#5aa8d8']]), '#3a2a16', 1); circ(c, gx - 0.6, hy - 6.3, 0.6, 'rgba(255,255,255,.9)'); }
  } else if (pal.style === 'twin') { D.star(c, hx + 4.7, hy - 4.7, 1.8, pal.scarf, OUT, 0.3); }
  else { fillRR(c, hx - r + 0.3, hy - 4.7, r * 2 - 0.6, 2.7, 1.35, lg(c, 0, hy - 5, 0, hy - 2, [[0, Z.shade(pal.scarf, .2)], [1, pal.scarf]]), OUT, 0.9); circ(c, hx + 3.4, hy - 3.3, 0.55, 'rgba(255,255,255,.5)'); }
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.8; c.beginPath(); c.arc(hx - 1.5, hy - 1.5, r - 2.1, Math.PI * 1.2, Math.PI * 1.5); c.stroke();
}
function scarfTail(c, p, pal, t) {
  const sw = Z.clamp(-(p.vx || 0) * 1.9, -7, 7) + Math.sin(t * 0.21) * 1.7;
  const lf = Z.clamp((p.vy || 0) * 0.9, -3.5, 4.5);
  const x0 = -3.4, y0 = -12.2;
  const x1 = x0 - 5.5 + sw * 0.55, y1 = y0 + 1.2 + lf * 0.5 + Math.sin(t * 0.3) * 0.8;
  const x2 = x0 - 10 + sw, y2 = y0 + 3 + lf + Math.sin(t * 0.3 + 1.2) * 1.4;
  c.beginPath(); c.moveTo(x0, y0);
  c.quadraticCurveTo(x1, y1 - 1.4, x2, y2);
  c.lineTo(x2 + 0.8, y2 + 2.7);
  c.quadraticCurveTo(x1 + 0.6, y1 + 2.3, x0, y0 + 3);
  c.closePath();
  c.fillStyle = lg(c, x0, y0, x2, y2, [[0, pal.scarf], [1, pal.scarfD]]); c.fill();
  c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
  poly(c, [x2, y2, x2 + 0.8, y2 + 2.7, x2 + 2.3, y2 + 1.2], pal.scarfD, OUT, 0.7);
}

A.drawHero = (c, p, t) => {
  if (p.inv > 0 && !p.dead && !p.star && (Math.floor(p.inv / 3) & 1)) return;
  const pal = HP[p.hero || 0], fx = p.x + p.w / 2, fy = p.y + p.h;
  const st = p.st;
  if (p.onG && !p.dead) { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(fx, fy + 0.5, 6.4, 1.8, 0, 0, TAU); c.fill(); }
  c.save(); c.translate(fx, fy);
  if (p.star) { const h = (t * 12) % 360; c.fillStyle = rg(c, 0, -11, 2, 22, [[0, `hsla(${h},100%,70%,.5)`], [1, `hsla(${h},100%,60%,0)`]]); c.fillRect(-22, -33, 44, 44); }
  if (p.fireP) { c.fillStyle = rg(c, 0, -11, 2, 18, [[0, 'rgba(255,140,40,.3)'], [1, 'rgba(255,140,40,0)']]); c.fillRect(-18, -30, 36, 36); }
  const face = p.face || 1; c.scale(face * (p.sx || 1) * pal.scale, (p.sy || 1) * pal.scale);
  if (p.dead) { c.rotate(p.deadRot || 0); c.translate(0, -6); }
  if (st === 'pound' && p.poundGo) {
    c.translate(0, -8); c.rotate(p.anim * 0.5);
    circ(c, 0, 0, 7.6, lg(c, 0, -8, 0, 8, [[0, pal.ov], [1, pal.ovD]]), OUT, 1);
    c.beginPath(); c.arc(0, 0, 7.6, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fillStyle = pal.hair; c.fill(); c.lineWidth = 0.9; c.strokeStyle = OUT; c.stroke();
    circ(c, -2.4, -2.6, 2.2, 'rgba(255,255,255,.4)'); circ(c, 3.2, 3.2, 2.3, pal.scarf, OUT, 0.8);
    c.restore(); return;
  }
  if (st === 'dash') { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.1; for (const yy of [-4, -11, -18, -24]) { const ln = 9 + ((t * 5 - yy * 7) % 8); c.beginPath(); c.moveTo(-9, yy); c.lineTo(-9 - ln, yy + 1.2); c.stroke(); } }
  const phase = p.anim * 0.32;
  let lean = 0, legF = 0, legB = 0, armF = 0.35, armB = -0.35, bob = 0, sqY = 1;
  const blink = (Math.floor(t / 4) % 68) < 3;
  const F2 = { eN: blink ? 'blink' : 'norm', eF: blink ? 'blink' : 'norm', mouth: 'smile', brow: 0, look: 0.35 };
  switch (st) {
    case 'idle': bob = Math.sin(t * 0.07) * 0.5; armF = 0.15 + Math.sin(t * 0.07) * 0.06; armB = -0.2; break;
    case 'run': lean = 0.16; legF = Math.sin(phase) * 1.05; legB = -legF; armF = -legF * 0.95; armB = legF * 0.95; bob = -Math.abs(Math.sin(phase)) * 1.2; F2.mouth = 'grin'; F2.look = 0.45; break;
    case 'skid': lean = -0.24; legF = 0.55; legB = -0.3; F2.mouth = 'worry'; F2.brow = 1; break;
    case 'jump': if (p.vy < 0) { legF = -0.85; legB = 0.55; armF = -2.5; armB = -2.1; F2.mouth = 'o'; F2.look = 0.5; } else { legF = 0.45; legB = -0.4; armF = -1.7; armB = -1.4; F2.mouth = 'worry'; } break;
    case 'djump': legF = -0.9; legB = 0.6; armF = -2.6; armB = -2.2; F2.eN = 'happy'; F2.eF = 'happy'; F2.mouth = 'grin'; break;
    case 'glide': armF = -1.6; armB = 1.6; legF = 0.25; legB = -0.25; lean = 0.1; F2.eN = 'happy'; F2.eF = 'happy'; break;
    case 'crouch': sqY = 0.68; armF = 0.5; armB = 0.25; F2.look = 0.45; break;
    case 'slide': lean = 0.95; sqY = 0.62; legF = 1.25; legB = 0.45; armF = -1.3; armB = -1.5; F2.mouth = 'grit'; F2.eN = 'focus'; F2.eF = 'focus'; F2.brow = -1; break;
    case 'dash': lean = 0.5; legF = 1.05; legB = -0.95; armF = -1.7; armB = -2; F2.mouth = 'grit'; F2.eN = 'focus'; F2.eF = 'focus'; F2.brow = -1; F2.look = 0.55; break;
    case 'wall': armF = -2.9; armB = -2.7; legF = 0.25; legB = 0.55; F2.mouth = 'grit'; F2.brow = -1; F2.look = -0.2; break;
    case 'swim': { const sw2 = Math.sin(p.anim * 0.4); lean = 0.62; legF = sw2 * 0.85; legB = -sw2 * 0.85; armF = -1.5 + sw2 * 0.45; armB = -1.05; F2.mouth = 'o'; break; }
    case 'hurt': armF = -2.3; armB = -2.3; legF = 0.55; legB = -0.55; F2.eN = 'x'; F2.eF = 'x'; F2.mouth = 'open'; F2.brow = 1; break;
    case 'pound': armF = -3.05; armB = -3.05; legF = 0.15; legB = -0.15; F2.mouth = 'grit'; F2.brow = -1; break;
  }
  if (p.dead) { F2.eN = 'x'; F2.eF = 'x'; F2.mouth = 'open'; F2.brow = 1; }
  c.scale(1, sqY); c.translate(0, bob); c.rotate(lean * 0.55);
  if (st === 'djump') { c.translate(0, -10); c.rotate(p.anim * 0.5); c.translate(0, 10); }
  const leg = (x, ang) => { c.save(); c.translate(x, -5.4); c.rotate(ang); fillRR(c, -1.5, 0, 3, 3.8, 1.3, lg(c, 0, 0, 0, 4, [[0, pal.ov], [1, pal.ovD]]), OUT, 0.8); fillRR(c, -2.3, 3.2, 5.4, 2.7, 1.35, pal.shoe, OUT, 0.85); fillRR(c, -2.3, 3.2, 5.4, 1, 1.3, 'rgba(255,255,255,.3)'); c.restore(); };
  const arm = (x, ang) => { c.save(); c.translate(x, -11.2); c.rotate(ang); fillRR(c, -1.25, -0.5, 2.5, 4.6, 1.2, pal.shirt, OUT, 0.8); circ(c, 0, 4.6, 1.85, pal.glove, OUT, 0.8); c.restore(); };
  scarfTail(c, p, pal, t);
  arm(-3.0, armB); leg(-2.2, legB);
  fillRR(c, -4.2, -12.6, 8.4, 7.8, 3, lg(c, 0, -12.6, 0, -4.8, [[0, pal.ov], [1, pal.ovD]]), OUT, 0.95);
  fillRR(c, -4.2, -12.6, 8.4, 3.1, 2.6, pal.shirt, OUT, 0.8);
  fillRR(c, -3.1, -11.6, 1.7, 5.2, 0.8, pal.ov); fillRR(c, 1.5, -11.6, 1.7, 5.2, 0.8, pal.ov);
  circ(c, 0, -7.4, 0.95, pal.scarf, OUT, 0.6);
  fillRR(c, -4.5, -13.4, 9, 2.5, 1.25, lg(c, 0, -13.4, 0, -10.9, [[0, Z.shade(pal.scarf, .25)], [1, pal.scarf]]), OUT, 0.85);
  leg(2.3, legF);
  aHead(c, p, pal, t, F2);
  arm(3.2, armF);
  if (p.feather) { c.save(); c.translate(-3.6, -24); c.rotate(-0.5 + Math.sin(t * 0.1) * 0.12); ell(c, 0, -3.6, 1.4, 4.6, '#fff', '#d86aae', 0.7); c.strokeStyle = 'rgba(216,106,174,.8)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 1); c.stroke(); c.restore(); }
  c.restore();
};

/* ---------------- الأعداء ---------------- */
const eyes = (c, x, y, sp, look, r, angry) => { for (const s of [-1, 1]) { const ex = x + s * sp, w = (r || 2.3) * 0.95, h = (r || 2.3) * 1.2; ell(c, ex, y, w, h, '#fff', OUT, 0.7); const ix = ex + look * 0.8; ell(c, ix, y + 0.2, w * 0.6, h * 0.72, '#20112e'); circ(c, ix - w * 0.2, y - h * 0.32, w * 0.28, '#fff'); circ(c, ix + w * 0.22, y + h * 0.3, w * 0.12, 'rgba(255,255,255,.8)'); } if (angry) { c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(x - sp - 2.6, y - (r || 2.3) - 0.6); c.lineTo(x - 0.6, y - (r || 2.3) + 0.8); c.moveTo(x + sp + 2.6, y - (r || 2.3) - 0.6); c.lineTo(x + 0.6, y - (r || 2.3) + 0.8); c.stroke(); } };
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
