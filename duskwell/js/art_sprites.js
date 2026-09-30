'use strict';
// Characters, projectiles, pickups and effects. Hand-inked look: heavy black outlines,
// pale masks with large hollow eyes, segmented shells. Origin is at the feet (centre for flyers).

function ellipse(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function fs(g, fill, stroke, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2.5; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
function glow(g, x, y, r, color, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function bloom(g, x, y, r, color, a) { const o = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; glow(g, x, y, r, color, a); g.globalCompositeOperation = o; }
const INK = '#050608';
const BONE = '#f3f5f7';

// pale mask with two hollow eyes; lean shifts the eyes toward the facing side
function mask(g, x, y, rx, ry, eye, lean, fill) {
  ellipse(g, x, y, rx, ry); fs(g, fill || BONE, INK, 2.8);
  if (!fill || fill === BONE) {
    g.save(); ellipse(g, x, y, rx, ry); g.clip();
    g.fillStyle = 'rgba(70,90,125,0.2)'; ellipse(g, x + rx * 0.35, y + ry * 0.5, rx, ry * 0.8); g.fill();
    g.restore();
  }
  const ex = rx * 0.42, ey = y + ry * 0.08, w = rx * 0.27 * eye, h = ry * 0.46 * eye, l = (lean || 0) * rx * 0.14;
  g.fillStyle = INK;
  ellipse(g, x - ex + l, ey, w, h, 0.12); g.fill();
  ellipse(g, x + ex + l, ey, w, h, -0.12); g.fill();
}
// a curved segmented shell: a dome cut into bands by ink arcs
function shell(g, x, y, rx, ry, bands, base, light, dark, fl) {
  const c = fl ? '#ffffff' : base;
  const gr = g.createLinearGradient(x - rx, y - ry, x + rx * 0.6, y + ry);
  gr.addColorStop(0, fl ? '#fff' : light); gr.addColorStop(0.55, c); gr.addColorStop(1, fl ? '#fff' : dark);
  ellipse(g, x, y, rx, ry); fs(g, gr, INK, 3);
  g.save(); ellipse(g, x, y, rx, ry); g.clip();
  g.strokeStyle = INK; g.lineWidth = 2.4;
  for (let i = 1; i < bands; i++) {
    const bx = x - rx + (2 * rx) * i / bands;
    g.beginPath(); g.moveTo(bx - rx * 0.12, y - ry - 2); g.quadraticCurveTo(bx + rx * 0.22, y, bx - rx * 0.05, y + ry + 2); g.stroke();
    g.strokeStyle = fl ? '#fff' : rgba(light, 0.55); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(bx - rx * 0.12 + 4, y - ry * 0.7); g.quadraticCurveTo(bx + rx * 0.2 + 3, y - ry * 0.2, bx + 3, y + ry * 0.1); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 2.4;
  }
  g.restore();
}

// ---------------------------------------------------------------- the Wanderer
function wanderer(g, fx, fy, face, o, alpha, tint) {
  g.save(); g.translate(fx, fy); g.globalAlpha = alpha;
  let sx = 1, sy = 1, lean = 0;
  if (o.air) { sy = 1 + clamp(-o.vy / 2600, -0.05, 0.1); sx = 1 / sy; }
  if (o.landT > 0) { sy = 0.88; sx = 1.1; }
  if (o.dash) { sx = 1.35; sy = 0.8; }
  if (o.sit) sy = 0.84;
  if (o.run) lean = 0.1;
  if (o.hurt) lean = -0.25;
  g.scale(face * sx, sy);
  g.rotate(lean);
  const t = o.t, bob = o.run ? Math.abs(Math.sin(t * 16)) * 2.2 : Math.sin(t * 2.4) * 0.9;
  const cloak = tint || '#11151f', scarf = tint || '#36cfc2';
  // scarf tails
  g.strokeStyle = INK; g.lineCap = 'round';
  const len = 12 + Math.min(16, Math.abs(o.vx) * 0.045) + (o.air ? 5 : 0), w1 = Math.sin(t * 9) * 3, w2 = Math.sin(t * 9 + 1.3) * 3;
  const tail = (lw, col, yo, k, ww) => {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); g.moveTo(-5, -19 - bob + yo); g.quadraticCurveTo(-len * 0.55 * k, -21 - bob + yo + ww, -len * k, -18 - bob + yo + w2 + (o.air ? o.vy * 0.009 : 0)); g.stroke();
  };
  tail(7.5, INK, 0, 1, w1); tail(4.5, scarf, 0, 1, w1);
  tail(6, INK, 4, 0.8, w2); tail(3.2, scarf, 4, 0.8, w2);
  // cloak
  g.beginPath(); g.moveTo(-6, -21 - bob); g.quadraticCurveTo(-13.5, -11, -12.5, -2.5);
  g.lineTo(-8.5, -4.8); g.lineTo(-4.5, -0.8); g.lineTo(0, -4.8); g.lineTo(4.5, -0.8); g.lineTo(8.5, -4.8); g.lineTo(12.5, -2.5);
  g.quadraticCurveTo(13.5, -11, 6, -21 - bob); g.closePath();
  fs(g, cloak, INK, 3);
  if (!tint) { g.fillStyle = 'rgba(140,170,215,0.16)'; g.beginPath(); g.moveTo(-5, -20 - bob); g.quadraticCurveTo(-10.5, -11, -9.5, -6); g.lineTo(-6.5, -6); g.quadraticCurveTo(-6.5, -13, -3, -20 - bob); g.fill(); }
  // feet
  const leg = o.run ? Math.sin(t * 16) * 3 : 0;
  g.fillStyle = INK; ellipse(g, -4 + leg, -1.5, 3.8, 2.6); g.fill(); ellipse(g, 5 - leg, -1.5, 3.8, 2.6); g.fill();
  // horns (short, swept back and outward)
  const hy = -30 - bob, horn = tint || BONE;
  g.beginPath(); g.moveTo(-8, hy - 7); g.bezierCurveTo(-15, hy - 12, -15, hy - 20, -9.5, hy - 25); g.bezierCurveTo(-10, hy - 18, -7, hy - 13, -2.5, hy - 10); g.closePath(); fs(g, horn, INK, 2.6);
  g.beginPath(); g.moveTo(8, hy - 7); g.bezierCurveTo(15, hy - 12, 15, hy - 20, 9.5, hy - 25); g.bezierCurveTo(10, hy - 18, 7, hy - 13, 2.5, hy - 10); g.closePath(); fs(g, horn, INK, 2.6);
  // mask
  if (tint) { ellipse(g, 0, hy, 12, 11); fs(g, tint, INK, 2.6); }
  else mask(g, 0, hy, 12, 11, 1.05, 1);
  // scarf wrap
  g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(-7.5, -20 - bob); g.quadraticCurveTo(0, -15.5 - bob, 7.5, -20 - bob); g.stroke();
  g.strokeStyle = scarf; g.lineWidth = 4; g.beginPath(); g.moveTo(-7, -20 - bob); g.quadraticCurveTo(0, -16 - bob, 7, -20 - bob); g.stroke();
  g.restore();
}
Art.drawPlayer = function (g, p, t) {
  for (const gh of p.ghost) {
    const a = 0.45 * (1 - (t - gh.t) / 0.22);
    if (a > 0) wanderer(g, gh.x + p.w / 2, gh.y + p.h, gh.face, { t, vx: 0, vy: 0, dash: true }, a, '#2a3a5a');
  }
  if (p.dead) return;
  let alpha = 1;
  if (p.invuln > 0 && Math.floor(t * 24) % 2 === 0) alpha = 0.4;
  const o = { t, vx: p.vx, vy: p.vy, air: !p.onGround && !p.sliding, run: p.onGround && Math.abs(p.vx) > 30, dash: p.dashT > 0, hurt: p.hurtT > 0, sit: !!p.sitting, landT: p.landT };
  if (p.focusT > 0) {
    const k = p.focusT / 0.9;
    bloom(g, p.cx, p.cy - 6, 40 + k * 50, '#dff3ff', 0.2 + k * 0.4);
    g.strokeStyle = rgba('#e8f6ff', 0.75); g.lineWidth = 2.5; ellipse(g, p.cx, p.cy - 4, 28 - k * 12, 36 - k * 14); g.stroke();
  }
  wanderer(g, p.cx, p.y + p.h + (p.sitting ? 4 : 0), p.face, o, alpha, null);
  if (p.atkT > 0) {
    const pr = 1 - clamp(p.atkT / 0.16, 0, 1), a = 1 - pr * 0.7, f = p.face, m = p.atkAlt ? 1 : -1;
    let cx = p.cx, cy = p.cy - 4, a0, a1;
    if (p.atkDir === 'up') { a0 = -Math.PI * 0.85; a1 = -Math.PI * 0.15; cy = p.cy - 8; }
    else if (p.atkDir === 'down') { a0 = Math.PI * 0.15; a1 = Math.PI * 0.85; cy = p.cy + 6; }
    else { cx = p.cx + f * 6; a0 = -0.95 * m; a1 = 0.95 * m; if (f < 0) { a0 = Math.PI - a0; a1 = Math.PI - a1; } }
    const sweep = lerp(a0, a1, clamp(pr * 1.6, 0, 1)), span = (a1 - a0) * 0.8, ccw = a1 < a0;
    g.save(); g.globalAlpha = a;
    g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, 62, sweep - span, sweep, ccw); g.arc(cx, cy, 30, sweep, sweep - span, !ccw); g.closePath(); g.fill();
    const grd = g.createRadialGradient(cx, cy, 24, cx, cy, 60); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.55, 'rgba(236,246,255,0.9)'); grd.addColorStop(1, '#ffffff');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, 58, sweep - span, sweep, ccw); g.arc(cx, cy, 34, sweep, sweep - span * 0.85, !ccw); g.closePath(); g.fill();
    g.restore();
  }
};

// ---------------------------------------------------------------- enemies
const F = (e, c) => (e.flash > 0 ? '#ffffff' : c);
Art.enemy = {};
Art.enemy.crawler = function (g, e, t) {        // armoured pill bug
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  g.strokeStyle = INK; g.lineWidth = 2.6; g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { const a = Math.sin(t * 10 + i * 2.1) * 3; g.beginPath(); g.moveTo(i * 8, -6); g.lineTo(i * 8 + a - 2, 0); g.stroke(); }
  mask(g, 12, -9, 7, 7, 1.05, 1, e.flash > 0 ? '#fff' : BONE);
  shell(g, -2, -11, 16, 11.5, 4, '#8a5a38', '#c28a5c', '#4a2c1a', e.flash > 0);
  g.restore();
};
Art.enemy.flyer = function (g, e, t) {          // pale winged larva
  g.save(); g.translate(e.cx, e.cy); g.scale(e.face, 1);
  bloom(g, 0, 0, 34, '#e8f6ff', 0.18);
  const flap = Math.sin(t * 36);
  g.fillStyle = 'rgba(230,244,255,0.55)'; g.strokeStyle = INK; g.lineWidth = 2;
  ellipse(g, -2, -13, 6, 11 + flap * 4, -0.6 + flap * 0.3); g.fill(); g.stroke();
  ellipse(g, 5, -12, 6, 9 - flap * 3, 0.5 - flap * 0.3); g.fill(); g.stroke();
  const wob = Math.sin(t * 5) * 1.5, body = F(e, '#e9eef2');
  ellipse(g, -13, 5 + wob, 5, 4.5); fs(g, body, INK, 2.4);
  ellipse(g, -6, 3 + wob * 0.5, 7, 6.5); fs(g, body, INK, 2.4);
  ellipse(g, 3, 0, 10, 9.5); fs(g, body, INK, 2.6);
  g.fillStyle = INK; ellipse(g, 1.5, 0, 2.6, 4); g.fill(); ellipse(g, 8, 0, 2.6, 4); g.fill();
  g.strokeStyle = INK; g.lineWidth = 1.8; g.beginPath(); g.moveTo(5, -9); g.quadraticCurveTo(9, -16, 14, -15); g.stroke();
  g.restore();
};
Art.enemy.hopper = function (g, e, t) {         // round masked hopper
  const sq = e.tele > 0 ? 0.78 : (!e.onGround ? 1.15 : 1 + Math.sin(t * 3) * 0.03);
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face * (2 - sq), sq);
  g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-7, -8); g.lineTo(-14, -2); g.lineTo(-9, 0); g.moveTo(7, -8); g.lineTo(14, -2); g.lineTo(9, 0); g.stroke();
  ellipse(g, -2, -14, 14, 12.5); fs(g, F(e, '#2c4a6e'), INK, 3);
  g.fillStyle = e.flash > 0 ? '#fff' : 'rgba(150,200,255,0.25)'; ellipse(g, -6, -19, 6, 4, -0.4); g.fill();
  mask(g, 8, -16, 8.5, 8, 1.1, 1, e.flash > 0 ? '#fff' : BONE);
  g.restore();
};
Art.enemy.spitter = function (g, e, t) {
  const tl = e.tele > 0 ? 1 - e.tele / 0.45 : 0, sway = Math.sin(t * 2 + e.x) * 2;
  g.save(); g.translate(e.cx, e.y + e.h);
  g.strokeStyle = INK; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4 + sway, -14, e.face * 4 + sway, -24); g.stroke();
  g.strokeStyle = F(e, '#3f8f58'); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4 + sway, -14, e.face * 4 + sway, -24); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 3, -2); g.quadraticCurveTo(s * 17, -12, s * 21, -2); g.quadraticCurveTo(s * 10, -2, s * 3, -2); fs(g, F(e, '#2f7a48'), INK, 2.6); }
  g.translate(e.face * 4 + sway, -29);
  g.rotate(e.face * (0.35 + tl * 0.4));
  ellipse(g, 0, 0, 12 + tl * 2, 12); fs(g, F(e, '#4aa066'), INK, 3);
  g.fillStyle = e.flash > 0 ? '#fff' : 'rgba(200,255,200,0.3)'; ellipse(g, -4, -5, 4, 3, -0.5); g.fill();
  g.fillStyle = INK; ellipse(g, 5, 0, 6 + tl * 3, 4 + tl * 4); g.fill();
  if (tl > 0) bloom(g, 6, 0, 20, '#b6ef6a', 0.3 + tl * 0.6);
  g.restore();
};
Art.enemy.shard = function (g, e, t) {
  const tl = e.tele > 0 ? 1 - e.tele / 0.5 : 0, pulse = 0.5 + 0.5 * Math.sin(t * 3 + e.x);
  g.save(); g.translate(e.cx, e.y + e.h);
  bloom(g, 0, -20, 44, '#ff8fd0', 0.14 + pulse * 0.1 + tl * 0.5);
  const cols = e.flash > 0 ? ['#fff', '#fff', '#fff'] : ['#8d3fb8', '#d27ae8', '#ffd0f6'];
  poly(g, [-14, 0, -12, -22, -6, -14, -4, 0]); fs(g, cols[0], INK, 2.6);
  poly(g, [10, 0, 13, -18, 6, -10, 3, 0]); fs(g, cols[0], INK, 2.6);
  poly(g, [-8, 0, -4, -30, 0, -42, 5, -30, 8, 0]); fs(g, cols[1], INK, 3);
  poly(g, [-1, 0, 0, -38, 3, -28, 4, 0]); fs(g, cols[2], null);
  g.fillStyle = tl > 0 ? '#fff' : 'rgba(255,255,255,0.8)'; ellipse(g, 0, -20, 3 + tl * 3, 3 + tl * 3); g.fill();
  g.restore();
};
Art.enemy.sentinel = function (g, e, t) {       // carapace guard with tattered cloth
  const wind = e.state === 'wind', charge = e.state === 'charge', w = wind ? 1 - e.timer / 0.55 : 0, fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1); g.rotate(charge ? 0.12 : 0);
  const walk = e.state === 'patrol' ? Math.sin(t * 6) * 2 : 0;
  g.strokeStyle = INK; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-6, -14); g.lineTo(-7 + walk, 0); g.moveTo(8, -14); g.lineTo(9 - walk, 0); g.stroke();
  // cloth skirt
  g.beginPath(); g.moveTo(-15, -26);
  for (let i = 0; i <= 6; i++) g.lineTo(-16 + i * 5.5, -8 + (i % 2 ? -5 : 2) + Math.sin(t * 5 + i) * 1.5);
  g.lineTo(17, -26); g.closePath(); fs(g, fl ? '#fff' : '#2c4470', INK, 2.6);
  // plated torso
  ellipse(g, 0, -34, 17, 15); fs(g, fl ? '#fff' : '#2a2d38', INK, 3);
  g.save(); ellipse(g, 0, -34, 17, 15); g.clip();
  g.strokeStyle = INK; g.lineWidth = 2.2;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-18, -34 + i * 6); g.quadraticCurveTo(0, -30 + i * 6, 18, -34 + i * 6); g.stroke(); }
  g.fillStyle = fl ? '#fff' : 'rgba(170,190,230,0.22)'; ellipse(g, -6, -42, 8, 4, -0.3); g.fill();
  g.restore();
  mask(g, 6, -52, 9.5, 9, 1.05, 1, fl ? '#fff' : BONE);
  poly(g, [0, -58, -5, -70, 3, -60]); fs(g, fl ? '#fff' : BONE, INK, 2.2);
  poly(g, [11, -59, 16, -70, 13, -57]); fs(g, fl ? '#fff' : BONE, INK, 2.2);
  if (wind) { g.fillStyle = '#ff6a4a'; ellipse(g, 2.5, -51, 1.6, 2.6); g.fill(); ellipse(g, 10.5, -51, 1.6, 2.6); g.fill(); }
  g.save(); g.translate(14, -34); g.rotate(wind ? -2.2 * w - 0.4 : (charge ? 0.9 : 0.5));
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 0); g.stroke();
  poly(g, [16, -3.5, 46, -1, 16, 4]); fs(g, fl ? '#fff' : '#e4e8ee', INK, 2.4);
  g.restore();
  if (wind) bloom(g, 20, -40, 50, '#ff7a5a', 0.12 + w * 0.3);
  g.restore();
};
Art.enemy.shade = function (g, e, t) {
  g.save(); g.translate(e.cx, e.cy); g.scale(e.face || 1, 1);
  glow(g, 0, 0, 64, '#0a0c14', 0.6);
  for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(8,10,16,0.8)'; g.lineWidth = 4; g.beginPath(); const a = t * 2 + i * 1.3; g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * 20, Math.sin(a) * 20 - 10, Math.cos(a) * 30, Math.sin(a) * 26); g.stroke(); }
  g.beginPath(); g.moveTo(-14, 20);
  for (let i = 0; i <= 4; i++) g.lineTo(-14 + i * 7, 22 + (i % 2 ? 7 : 0) + Math.sin(t * 6 + i) * 3);
  g.lineTo(14, 4); g.quadraticCurveTo(18, -16, 0, -22); g.quadraticCurveTo(-18, -16, -14, 4); g.closePath();
  fs(g, e.flash > 0 ? '#fff' : '#07080d', '#1a2233', 2.5);
  poly(g, [-8, -18, -14, -34, -3, -21]); fs(g, '#07080d', null); poly(g, [8, -18, 14, -34, 3, -21]); fs(g, '#07080d', null);
  g.fillStyle = '#f2f6ff'; ellipse(g, -5, -6, 3.4, 5.5); g.fill(); ellipse(g, 6, -6, 3.4, 5.5); g.fill();
  g.restore();
};
Art.enemy.shadeEnemy = Art.enemy.shade;

// ---------------------------------------------------------------- bosses
Art.boss = {};
function telGlow(g, b, color, x, y, r) { if (b.tele > 0) bloom(g, x, y, r, color, 0.22 + 0.25 * Math.abs(Math.sin(b.t * 12))); }
Art.boss.guardian = function (g, b, t) {           // giant plated pill bug with a shell mace
  const fl = b.flash > 0, tele = b.tele > 0, stun = b.stunned;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#ffb347', 0, -60, 130);
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round';
  const step = b.vx !== 0 ? Math.sin(t * 14) * 4 : 0;
  for (const [x0, s] of [[-24, 1], [-8, -1], [10, 1], [26, -1]]) { g.beginPath(); g.moveTo(x0, -26); g.lineTo(x0 - 6 + s * step, -12); g.lineTo(x0 - 2 + s * step, 0); g.stroke(); }
  // back arm
  g.lineWidth = 7; g.beginPath(); g.moveTo(-30, -60); g.lineTo(-46, -40); g.lineTo(-40, -22); g.stroke();
  shell(g, -4, -60, 46, 42, 5, '#8a5a38', '#d09a68', '#3e2415', fl);
  // face peeking from the plates
  const hy = stun ? -74 : -82;
  mask(g, 26, hy, 14, 13, 1.1, 1, fl ? '#fff' : BONE);
  if (tele && !stun) { g.fillStyle = '#ffb347'; ellipse(g, 20.5, hy + 1, 2, 3); g.fill(); ellipse(g, 32.5, hy + 1, 2, 3); g.fill(); }
  // mace arm
  let ang = 0.9;
  if (tele) ang = -2.3 + Math.sin(t * 18) * 0.05; else if (b.melee) ang = 0.15; else if (b.vx !== 0) ang = -0.3;
  g.save(); g.translate(30, -64); g.rotate(ang);
  g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(52, 0); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#5a3a24'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(52, 0); g.stroke();
  shell(g, 72, 0, 26, 22, 3, '#8a5a38', '#d09a68', '#3e2415', fl);
  for (const a of [-1.2, 0, 1.2]) { poly(g, [72 + Math.cos(a) * 22, Math.sin(a) * 18, 72 + Math.cos(a) * 36, Math.sin(a) * 30, 72 + Math.cos(a + 0.25) * 22, Math.sin(a + 0.25) * 18]); fs(g, fl ? '#fff' : BONE, INK, 2.4); }
  g.restore();
  g.restore();
  if (stun) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.fillStyle = '#ffe98a'; g.fillRect(b.cx + Math.cos(a) * 26 - 3, b.y - 6 + Math.sin(a) * 6, 6, 6); }
};
Art.boss.weaver = function (g, b, t) {             // mantis duelist on long legs
  const fl = b.flash > 0;
  g.save(); g.translate(b.cx, b.y + b.h);
  if (b.spinning) { g.translate(0, -b.h / 2); g.rotate(t * 28 * b.face); g.translate(0, b.h / 2); }
  g.scale(b.face, 1);
  if (b.vx !== 0 && !b.spinning) g.rotate(0.2);
  telGlow(g, b, '#ff6a5a', 0, -46, 90);
  const run = Math.abs(b.vx) > 20 ? Math.sin(t * 20) * 6 : 0;
  g.strokeStyle = INK; g.lineWidth = 3.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-4, -34); g.lineTo(-14 - run, -16); g.lineTo(-10 - run, 0); g.moveTo(4, -34); g.lineTo(14 + run, -16); g.lineTo(11 + run, 0);
  g.moveTo(0, -36); g.lineTo(-20, -24); g.lineTo(-24, -4); g.stroke();
  // abdomen and wing cloak
  ellipse(g, -12, -40, 16, 8, 0.5); fs(g, fl ? '#fff' : '#6a4a2c', INK, 2.8);
  g.beginPath(); g.moveTo(-2, -60); g.quadraticCurveTo(-30, -52, -34, -26); g.lineTo(-22, -34); g.lineTo(-24, -22); g.quadraticCurveTo(-8, -40, 2, -50); g.closePath(); fs(g, fl ? '#fff' : '#2c5a3c', INK, 2.6);
  // thorax
  g.beginPath(); g.moveTo(-5, -38); g.quadraticCurveTo(-8, -58, 0, -66); g.quadraticCurveTo(8, -58, 5, -38); g.closePath(); fs(g, fl ? '#fff' : '#3a2a20', INK, 2.8);
  // head: narrow mask and antennae
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-2, -80); g.quadraticCurveTo(-8, -96, -18, -100); g.moveTo(4, -80); g.quadraticCurveTo(4, -98, 14, -104); g.stroke();
  g.beginPath(); g.moveTo(-8, -76); g.quadraticCurveTo(-7, -86, 2, -86); g.quadraticCurveTo(12, -85, 11, -74); g.quadraticCurveTo(6, -64, 1, -64); g.quadraticCurveTo(-6, -66, -8, -76); g.closePath();
  fs(g, fl ? '#fff' : BONE, INK, 2.6);
  g.fillStyle = b.tele > 0 ? '#ff4a3a' : INK; ellipse(g, -2, -75, 2.4, 4.6, 0.2); g.fill(); ellipse(g, 6, -75, 2.4, 4.6, -0.2); g.fill();
  // scythe arm with needle
  g.save(); g.translate(4, -56); g.rotate(b.tele > 0 ? -1.4 : (b.melee ? 0.1 : 0.6));
  g.strokeStyle = INK; g.lineWidth = 4.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(18, 4); g.lineTo(28, -6); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(28, -6); g.lineTo(72, -6); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#f6e2b0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(28, -6); g.lineTo(72, -6); g.stroke();
  g.restore();
  g.restore();
  if (b.melee && !b.spinning) { g.save(); g.globalAlpha = 0.7; g.strokeStyle = '#fff6d8'; g.lineWidth = 3; const r = b.meleeRect(); g.beginPath(); g.moveTo(r.x, r.y + 10); g.lineTo(r.x + r.w, r.y + r.h / 2); g.stroke(); g.restore(); }
  if (b.spinning) { g.save(); g.strokeStyle = 'rgba(255,240,200,0.7)'; g.lineWidth = 3; ellipse(g, b.cx, b.cy, 62, 38); g.stroke(); g.restore(); }
};
Art.boss.wraith = function (g, b, t) {
  const fl = b.flash > 0;
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.cy);
  bloom(g, 0, 0, 120, '#ff8fd0', 0.2 + (b.tele > 0 ? 0.3 : 0));
  for (let i = 0; i < 5; i++) {
    const a = t * 1.8 + i * Math.PI * 2 / 5, r = 54 + Math.sin(t * 3 + i) * 6;
    g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r * 0.7); g.rotate(a);
    poly(g, [-11, 0, 0, -6, 15, 0, 0, 6]); fs(g, fl ? '#fff' : '#d27ae8', INK, 2.6); g.restore();
  }
  poly(g, [0, -44, 27, -6, 17, 36, 0, 46, -17, 36, -27, -6]); fs(g, fl ? '#fff' : '#3b1d66', INK, 4);
  poly(g, [0, -44, 27, -6, 0, 6]); fs(g, fl ? '#fff' : '#7a46b8', null);
  poly(g, [0, -44, -27, -6, 0, 6]); fs(g, fl ? '#fff' : '#5a3296', null);
  poly(g, [0, 6, 27, -6, 17, 36, 0, 46]); fs(g, fl ? '#fff' : '#2a1450', null);
  poly(g, [0, -44, 27, -6, 17, 36, 0, 46, -17, 36, -27, -6]); fs(g, null, INK, 4);
  bloom(g, 0, 16, 18, '#ffffff', b.tele > 0 ? 0.7 : 0.3);
  g.fillStyle = b.tele > 0 ? '#ffffff' : '#ffc0ea'; ellipse(g, 0, 16, 6, 8); g.fill();
  mask(g, 0, -14, 11, 10, 1.1, 0, fl ? '#fff' : BONE);
  g.restore();
};
Art.boss.king = function (g, b, t) {               // armoured sovereign with a halo ring
  const fl = b.flash > 0;
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 70) * 2.5, 0);
  // halo weapon held high
  let ang = -0.3;
  if (b.tele > 0) ang = -1.2 + Math.sin(t * 16) * 0.05; else if (b.melee) ang = 0.9;
  const hx = 20 + Math.cos(ang - 1.2) * 70, hy = -132 + Math.sin(ang - 1.2) * 40;
  bloom(g, hx, hy, 110, '#ffe2a8', 0.35 + (b.tele > 0 ? 0.35 : 0) + (b.phase - 1) * 0.08);
  // cloth skirt
  g.beginPath(); g.moveTo(-34, -52);
  for (let i = 0; i <= 8; i++) g.lineTo(-40 + i * 10, -2 + (i % 2 ? -12 : 4) + Math.sin(t * 4 + i) * 2.5);
  g.lineTo(38, -52); g.closePath(); fs(g, fl ? '#fff' : '#243a66', INK, 3);
  g.strokeStyle = fl ? '#fff' : 'rgba(120,160,220,0.35)'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 12, -48); g.lineTo(i * 14, -12); g.stroke(); }
  // legs
  g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-12, -30); g.lineTo(-16, 0); g.moveTo(14, -30); g.lineTo(18, 0); g.stroke();
  // plated torso
  ellipse(g, 0, -80, 38, 36); fs(g, fl ? '#fff' : '#2a2e3a', INK, 4);
  g.save(); ellipse(g, 0, -80, 38, 36); g.clip();
  g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -118); g.lineTo(0, -44); g.stroke();
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-40, -80 + i * 10); g.quadraticCurveTo(0, -70 + i * 10, 40, -80 + i * 10); g.stroke(); }
  g.fillStyle = fl ? '#fff' : 'rgba(170,190,235,0.2)'; ellipse(g, -14, -98, 14, 6, -0.4); g.fill();
  g.restore();
  // back arm with claw
  g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(-30, -96); g.quadraticCurveTo(-52, -70, -44, -46); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#2a2e3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-30, -96); g.quadraticCurveTo(-52, -70, -44, -46); g.stroke();
  poly(g, [-44, -46, -58, -34, -40, -38]); fs(g, fl ? '#fff' : '#3a3e4a', INK, 2.4);
  // small horned mask
  mask(g, 6, -124, 14, 13, 1.1, 1, fl ? '#fff' : BONE);
  poly(g, [-2, -134, -8, -156, 3, -137]); fs(g, fl ? '#fff' : BONE, INK, 2.6);
  poly(g, [14, -135, 20, -156, 9, -137]); fs(g, fl ? '#fff' : BONE, INK, 2.6);
  // weapon arm and the ring
  g.save(); g.translate(26, -100); g.rotate(ang);
  g.strokeStyle = INK; g.lineWidth = 11; g.beginPath(); g.moveTo(0, 0); g.lineTo(40, -30); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#2a2e3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(40, -30); g.stroke();
  g.translate(58, -52); g.rotate(t * 0.8);
  g.strokeStyle = INK; g.lineWidth = 12; ellipse(g, 0, 0, 44, 40); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#3a3228'; g.lineWidth = 7; ellipse(g, 0, 0, 44, 40); g.stroke();
  g.strokeStyle = '#fff4d6'; g.lineWidth = 2; ellipse(g, 0, 0, 44, 40); g.stroke();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; poly(g, [Math.cos(a) * 46, Math.sin(a) * 42, Math.cos(a + 0.12) * 62, Math.sin(a + 0.12) * 58, Math.cos(a + 0.24) * 46, Math.sin(a + 0.24) * 42]); fs(g, fl ? '#fff' : '#2a2e3a', INK, 2.6); }
  const core = g.createRadialGradient(0, 0, 2, 0, 0, 36); core.addColorStop(0, 'rgba(255,255,245,0.95)'); core.addColorStop(0.5, 'rgba(255,236,190,0.55)'); core.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = core; ellipse(g, 0, 0, 36, 33); g.fill();
  g.restore();
  g.restore();
  for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * 1.57; bloom(g, b.cx + Math.cos(a) * 80, b.y + 20 + Math.sin(a * 1.3) * 30, 10, '#ffe2a8', 0.7); }
};

// ---------------------------------------------------------------- projectiles, pickups, props
Art.drawProj = function (g, p, t) {
  const k = p.kind;
  if (k === 'bolt') {
    const dir = sign(p.vx) || 1;
    bloom(g, p.x, p.y, 46, '#a9e6ff', 0.55);
    const tr = g.createLinearGradient(p.x, 0, p.x - dir * 90, 0); tr.addColorStop(0, 'rgba(210,244,255,0.9)'); tr.addColorStop(1, 'rgba(210,244,255,0)');
    g.fillStyle = tr; g.beginPath(); g.moveTo(p.x, p.y - 13); g.quadraticCurveTo(p.x - dir * 40, p.y - 14, p.x - dir * 90, p.y); g.quadraticCurveTo(p.x - dir * 40, p.y + 14, p.x, p.y + 13); g.fill();
    ellipse(g, p.x, p.y, 13, 10); fs(g, '#ffffff', '#7fc8ff', 2);
    g.fillStyle = INK; ellipse(g, p.x + dir * 3, p.y - 1, 1.8, 3); g.fill(); ellipse(g, p.x + dir * 8, p.y - 1, 1.8, 3); g.fill();
  } else if (k === 'glob') {
    ellipse(g, p.x, p.y, p.r + Math.sin(t * 20) * 1.2, p.r - Math.sin(t * 20)); fs(g, '#b6ef6a', INK, 2.4);
    g.fillStyle = 'rgba(255,255,255,0.6)'; ellipse(g, p.x - 2, p.y - 3, 2.5, 2); g.fill();
  } else if (k === 'shard' || k === 'thorn') {
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot || Math.atan2(p.vy, p.vx));
    bloom(g, 0, 0, 22, p.color, 0.4);
    poly(g, [-12, 0, -2, -5, 14, 0, -2, 5]); fs(g, k === 'thorn' ? '#6fd04a' : '#ff9bd6', INK, 2.4); g.restore();
  } else if (k === 'needle') {
    const a = Math.atan2(p.vy, p.vx);
    g.save(); g.translate(p.x, p.y); g.rotate(a);
    g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-44, 0); g.lineTo(10, 0); g.stroke();
    g.strokeStyle = '#f6e2b0'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-44, 0); g.lineTo(10, 0); g.stroke(); g.restore();
  } else if (k === 'orb') {
    bloom(g, p.x, p.y, 30, '#ffe8c0', 0.5);
    ellipse(g, p.x, p.y, p.r, p.r); fs(g, '#fffaf0', INK, 2.6);
  } else if (k === 'shock') {
    const dir = sign(p.vx) || 1;
    g.save(); g.translate(p.x, p.y);
    bloom(g, 0, -14, 34, p.color, 0.3);
    for (let i = -1; i <= 1; i++) {
      const h = 14 + (1 - Math.abs(i)) * 14 + Math.sin(t * 30 + i) * 3;
      poly(g, [i * 14 - 8, 0, i * 14 + dir * 4, -h, i * 14 + 8, 0]); fs(g, p.color, INK, 2.4);
    }
    g.restore();
  } else if (k === 'rock') {
    if (p.t < p.tele) {
      const a = 0.25 + 0.35 * Math.abs(Math.sin(p.t * 14));
      const gr = g.createLinearGradient(0, p.y0, 0, G.floorY); gr.addColorStop(0, 'rgba(255,90,70,0)'); gr.addColorStop(1, 'rgba(255,90,70,' + a + ')');
      g.fillStyle = gr; g.fillRect(p.x - 16, p.y0, 32, G.floorY - p.y0);
      g.save(); g.translate(p.x + Math.sin(p.t * 60) * 1.5, p.y); ellipse(g, 0, 0, 14, 12); fs(g, '#6f7a86', INK, 2.4); g.restore();
    } else {
      g.save(); g.translate(p.x, p.y); g.rotate(p.t * 3);
      poly(g, [-16, -4, -6, -16, 10, -12, 17, 2, 8, 15, -10, 13]); fs(g, '#7d8894', INK, 3.2); g.restore();
    }
  } else if (k === 'beam') {
    if (p.t < p.tele) {
      const f = p.t / p.tele, w = 2 + f * 6;
      g.fillStyle = 'rgba(255,240,210,' + (0.25 + 0.4 * f) + ')'; g.fillRect(p.x - w / 2, 0, w, G.level.ph);
    } else {
      const gr = g.createLinearGradient(p.x - p.bw / 2, 0, p.x + p.bw / 2, 0);
      gr.addColorStop(0, 'rgba(255,220,170,0)'); gr.addColorStop(0.3, 'rgba(255,252,240,0.95)'); gr.addColorStop(0.7, 'rgba(255,252,240,0.95)'); gr.addColorStop(1, 'rgba(255,220,170,0)');
      g.fillStyle = gr; g.fillRect(p.x - p.bw / 2 - 10, 0, p.bw + 20, G.level.ph);
    }
  } else if (k === 'pillar') {
    if (p.t < p.tele) {
      const f = p.t / p.tele;
      bloom(g, p.x, p.y - 4, 40 + f * 20, '#ff9bd6', 0.3 + f * 0.4);
      g.strokeStyle = 'rgba(255,170,230,' + (0.4 + f * 0.5) + ')'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x - 24, p.y - 2); g.lineTo(p.x + 24, p.y - 2); g.stroke();
    } else {
      const h = p.ph * clamp((p.t - p.tele) / 0.08, 0, 1);
      poly(g, [p.x - 23, p.y, p.x - 14, p.y - h * 0.7, p.x - 6, p.y - h, p.x + 4, p.y - h * 0.75, p.x + 23, p.y]); fs(g, '#e6a0ff', INK, 3.4);
      poly(g, [p.x - 6, p.y, p.x - 6, p.y - h, p.x + 4, p.y - h * 0.75, p.x + 4, p.y]); fs(g, '#ffe0f8', null);
    }
  }
};
Art.drawGeo = function (g, c, t) {
  const x = c.x + c.w / 2, y = c.y + c.h / 2, s = c.w * 0.8 * (0.75 + 0.25 * Math.abs(Math.cos(t * 6 + c.x)));
  bloom(g, x, y, c.w * 2.2, '#ffe9a0', 0.3);
  ellipse(g, x, y, s, c.w * 0.8); fs(g, c.v >= 25 ? '#ffc66a' : '#f4f1e2', INK, 2);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x + s * 0.5, y); g.stroke();
};
Art.drawItem = function (g, it, t) {
  const y = it.y + Math.sin(t * 2.5) * 5;
  if (it.kind === 'ability') {
    bloom(g, it.x, y, 100, '#e6f3ff', 0.35 + 0.15 * Math.sin(t * 4));
    for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.09; g.strokeStyle = 'rgba(230,243,255,0.55)'; g.lineWidth = 2; ellipse(g, it.x, y, 24 + i * 4, 10 + i * 6, a); g.stroke(); }
    ellipse(g, it.x, y, 14, 14); fs(g, '#ffffff', INK, 3);
    g.fillStyle = 'rgba(120,180,255,0.5)'; ellipse(g, it.x, y, 7, 7); g.fill();
  } else if (it.kind === 'seed') {
    bloom(g, it.x, y, 56, '#e8f4ff', 0.35);
    mask(g, it.x, y, 12, 13, 1.1, 0);
  } else {
    bloom(g, it.x, y, 56, '#ffe9a0', 0.3);
    ellipse(g, it.x, y + 8, 15, 13); fs(g, '#6b4a2e', INK, 3);
    g.fillStyle = '#f4f1e2'; ellipse(g, it.x - 4, y - 2, 6, 5); g.fill(); ellipse(g, it.x + 5, y, 5, 4); g.fill();
  }
};
Art.drawBench = function (g, b, t, resting) {
  const x = b.px, y = b.py;
  bloom(g, x, y - 50, 80, '#ffe2a8', resting ? 0.4 : 0.22);
  g.strokeStyle = INK; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-26 + x, y - 18); g.bezierCurveTo(x - 34, y - 40, x - 18, y - 52, x - 8, y - 44); g.moveTo(x + 26, y - 18); g.bezierCurveTo(x + 34, y - 40, x + 18, y - 52, x + 8, y - 44); g.stroke();
  g.strokeStyle = '#3a3040'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#3d3450'; g.fillRect(x - 30, y - 19, 60, 9); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x - 30, y - 19, 60, 9);
  g.fillStyle = '#9aa0c8'; g.fillRect(x - 29, y - 18, 58, 2.5);
  g.lineWidth = 4; g.beginPath(); g.moveTo(x - 24, y - 10); g.quadraticCurveTo(x - 28, y - 4, x - 24, y); g.moveTo(x + 24, y - 10); g.quadraticCurveTo(x + 28, y - 4, x + 24, y); g.stroke();
  const fl = 0.8 + 0.2 * Math.sin(t * 6);
  ellipse(g, x, y - 50, 5.5, 6.5); fs(g, 'rgba(255,236,190,' + (0.8 * fl) + ')', INK, 2);
};
Art.drawNPC = function (g, n, t) {
  const x = n.px, y = n.py, bob = Math.sin(t * 2 + x) * 1.2;
  g.save(); g.translate(x, y);
  if (n.type === 'elder') {            // tall hooded elder with a wide shell hat
    g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-5, -14); g.lineTo(-7, 0); g.moveTo(5, -14); g.lineTo(7, 0); g.stroke();
    g.beginPath(); g.moveTo(-13, -12); g.quadraticCurveTo(-15, -36, -6, -46 - bob); g.lineTo(6, -46 - bob); g.quadraticCurveTo(15, -36, 13, -12); g.closePath(); fs(g, '#4a4f6a', INK, 3);
    mask(g, 0, -52 - bob, 9.5, 10, 1.05, 0.5);
    g.beginPath(); g.moveTo(-24, -60 - bob); g.quadraticCurveTo(0, -84 - bob, 24, -60 - bob); g.quadraticCurveTo(0, -66 - bob, -24, -60 - bob); g.closePath(); fs(g, '#d8d2c0', INK, 3);
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 0); g.lineTo(20, -64); g.stroke();
    g.strokeStyle = '#8a7a5a'; g.lineWidth = 2; g.stroke();
    bloom(g, 20, -66, 22, '#9fe6ff', 0.6); ellipse(g, 20, -66, 4.5, 5.5); fs(g, '#dff6ff', INK, 1.8);
  } else {                             // round pill-bug merchant with a lantern
    g.fillStyle = '#3a2a1c'; g.strokeStyle = INK; g.lineWidth = 3; g.fillRect(-30, -46, 14, 36); g.strokeRect(-30, -46, 14, 36);
    shell(g, -2, -22 - bob, 20, 20, 3, '#6a5a8a', '#a898c8', '#3a2e56', false);
    mask(g, 10, -40 - bob, 9.5, 9.5, 1.05, 1);
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(22, -38); g.lineTo(24, -12); g.stroke();
    bloom(g, 24, -8, 30, '#ffd98a', 0.55); ellipse(g, 24, -8, 6, 7); fs(g, '#ffe2a0', INK, 2);
  }
  g.restore();
};
Art.drawSign = function (g, s, t) {
  const x = s.px, y = s.py;
  g.strokeStyle = INK; g.lineWidth = 3.4; g.fillStyle = '#5a4630';
  g.fillRect(x - 3, y - 36, 6, 36); g.strokeRect(x - 3, y - 36, 6, 36);
  g.fillStyle = '#8a6c48'; g.fillRect(x - 20, y - 52, 40, 24); g.strokeRect(x - 20, y - 52, 40, 24);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 13, y - 45, 26, 3); g.fillRect(x - 13, y - 38, 18, 3);
};

// ---------------------------------------------------------------- effects
Art.drawFx = function (g, f) {
  const k = f.t / f.life, a = 1 - k;
  if (f.type === 'slash') {
    g.save(); g.translate(f.x, f.y); g.globalAlpha = a; g.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const ang = (f.dir > 0 ? 0 : Math.PI) + i * 0.5, r0 = 6 + k * 14, r1 = 22 + k * 38;
      g.strokeStyle = INK; g.lineWidth = 6 - i * i * 2; g.beginPath(); g.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); g.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 3 - i * i; g.stroke();
    }
    g.restore();
  } else if (f.type === 'ring') {
    g.save(); g.globalAlpha = a; g.strokeStyle = f.color; g.lineWidth = 4 * a + 1; ellipse(g, f.x, f.y, 10 + k * 90, (10 + k * 90) * (f.flat || 1)); g.stroke(); g.restore();
  }
};
