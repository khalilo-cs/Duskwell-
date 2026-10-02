'use strict';
// Art for the Ossuary and the Lunar Observatory: the six creatures (enemies_deep.js) and the shared pieces the
// four bosses use (bones, skulls, lenses). Same conventions as art_creatures.js.

FLYING.add('skullbat'); FLYING.add('orrery'); FLYING.add('censer');

const BONEC = '#e8dcc0';
// a long bone: a shaft with a knob at both ends; from (x0, y0) to (x1, y1)
function boneD(g, x0, y0, x1, y1, w, o) {
  o = o || {}; const fl = o.flash, col = fl ? '#ffffff' : (o.col || BONEC), a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = INK; g.lineWidth = w + 2.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  if (!fl) {
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(0.6, w * 0.28); g.beginPath(); g.moveTo(x0 + Math.sin(a) * w * 0.22, y0 - Math.cos(a) * w * 0.22); g.lineTo(x1 + Math.sin(a) * w * 0.22, y1 - Math.cos(a) * w * 0.22); g.stroke();
    g.strokeStyle = 'rgba(100,84,56,0.4)'; g.lineWidth = Math.max(0.5, w * 0.2); g.beginPath(); g.moveTo(x0 - Math.sin(a) * w * 0.26, y0 + Math.cos(a) * w * 0.26); g.lineTo(x1 - Math.sin(a) * w * 0.26, y1 + Math.cos(a) * w * 0.26); g.stroke();
  }
  for (const [x, y, s] of [[x0, y0, 1], [x1, y1, -1]]) for (const k of [-1, 1]) {
    const kx = x + Math.cos(a + Math.PI / 2) * k * w * 0.42 + Math.cos(a) * s * w * 0.1, ky = y + Math.sin(a + Math.PI / 2) * k * w * 0.42 + Math.sin(a) * s * w * 0.1;
    g.fillStyle = col; g.beginPath(); g.arc(kx, ky, w * 0.55, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
  }
  g.restore();
  return L;
}
// a skull seen from the side-front: cranium, sockets with a green glow, nose, teeth, a jaw that opens (jaw 0..1)
function skullD(g, x, y, r, o) {
  o = o || {}; const fl = o.flash, jaw = o.jaw || 0, glow = o.glow === undefined ? '#9fe8c0' : o.glow, base = o.base || '#eee3c8';
  g.save(); g.translate(x, y); g.lineJoin = 'round';
  // the jaw first, behind the face
  formD(g, c => { c.moveTo(-r * 0.62, r * 0.42); c.lineTo(-r * 0.5, r * (0.9 + jaw * 0.7)); c.quadraticCurveTo(0, r * (1.12 + jaw * 0.7), r * 0.5, r * (0.9 + jaw * 0.7)); c.lineTo(r * 0.62, r * 0.42); c.closePath(); }, [0, r * (0.7 + jaw * 0.4), r * 0.62, r * 0.45], mix(base, '#000000', 0.12), { flash: fl, spec: 0.2, lw: Math.max(1.6, r * 0.15) });
  if (!fl) { g.fillStyle = INK; g.fillRect(-r * 0.46, r * 0.5, r * 0.92, Math.max(1, r * (0.18 + jaw * 0.6))); }
  formD(g, c => { c.moveTo(0, -r * 1.02); c.bezierCurveTo(r * 0.95, -r * 1.02, r * 1.05, -r * 0.1, r * 0.72, r * 0.42); c.lineTo(-r * 0.72, r * 0.42); c.bezierCurveTo(-r * 1.05, -r * 0.1, -r * 0.95, -r * 1.02, 0, -r * 1.02); c.closePath(); }, [0, -r * 0.3, r, r * 0.8], base, { flash: fl, spec: 0.4, lw: Math.max(1.8, r * 0.17) });
  if (!fl) {
    g.save(); g.beginPath(); g.ellipse(0, -r * 0.3, r, r * 0.8, 0, 0, 7); g.clip();
    hatchD(g, [0, 0, r, r * 0.9], Math.round(r * 2.2), 1.3, '#6a5a3c', 0.3, { len: r * 0.3, w: 0.7, seed: 11 });
    g.strokeStyle = 'rgba(40,32,22,0.7)'; g.lineWidth = Math.max(0.7, r * 0.06); g.beginPath(); g.moveTo(r * 0.3, -r * 1.02); g.lineTo(r * 0.12, -r * 0.62); g.lineTo(r * 0.3, -r * 0.4); g.stroke();
    g.restore();
  }
  for (const s of [-1, 1]) {                                           // sockets
    g.save(); g.translate(s * r * 0.4, -r * 0.18); g.rotate(-s * 0.2);
    g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.34, 0, 0, 7); g.fill();
    if (glow && !fl) { bloom(g, 0, 0, r * 0.9, glow, 0.5); g.fillStyle = glow; g.beginPath(); g.ellipse(0, r * 0.04, r * 0.15, r * 0.2, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.05, -r * 0.05, r * 0.05, 0, 7); g.fill(); }
    g.restore();
  }
  g.fillStyle = INK; g.beginPath(); g.moveTo(-r * 0.09, r * 0.14); g.lineTo(r * 0.09, r * 0.14); g.lineTo(0, r * 0.32); g.closePath(); g.fill();       // the nose
  g.strokeStyle = INK; g.lineWidth = Math.max(0.8, r * 0.07);                                                                                         // teeth
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * r * 0.16, r * 0.4); g.lineTo(i * r * 0.16, r * (0.52 + jaw * 0.1)); g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------- the Heap
Art.enemy.heap = function (g, e, t) {
  const fl = e.flash > 0, s = e.currentState, sw = Math.sin(t * 8);
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  groundD(g, s === 'skull' ? 12 : 26);
  const pile = (k) => {                                  // a mound of bones; k 0..1 how much of it is still there
    const A = [[-13, -3, -4, -9], [-8, -2, 4, -8], [3, -2, 14, -6], [-14, -6, -2, -3], [5, -4, 13, -2]];
    A.forEach(([a, b, c, d], i) => boneD(g, a, b + (1 - k) * 4, c, d + (1 - k) * 4, 3.2, { flash: fl }));
    for (const [x, y, r] of [[-9, -6, 5.2], [10, -5, 4.4]]) { formD(g, ell(x, y, r, r * 0.8), [x, y, r, r], '#d8ccae', { flash: fl, spec: 0.3, lw: 1.8 }); if (!fl) { g.fillStyle = INK; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.1, r * 0.2, 0, 7); g.arc(x + r * 0.35, y - r * 0.1, r * 0.2, 0, 7); g.fill(); } }
    for (let i = 0; i < 4; i++) { const x = -10 + i * 6, y = -4 - (i % 2) * 3; g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.arc(x, y - 2, 4, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.strokeStyle = fl ? '#fff' : BONEC; g.lineWidth = 1.8; g.stroke(); }
  };
  if (s === 'pile') {
    pile(1);
    if (!fl) { const a = 0.35 + 0.3 * Math.sin(t * 2.2 + e.cx); bloom(g, 1, -10, 18, '#9fe8c0', a * 0.6); g.fillStyle = 'rgba(159,232,192,' + (a + 0.3) + ')'; g.beginPath(); g.arc(-2, -9, 1.3, 0, 7); g.arc(4, -9, 1.3, 0, 7); g.fill(); }
  } else if (s === 'rising') {
    const k = clamp(e.stateT / 0.6, 0, 1);
    pile(1 - k * 0.6);
    g.save(); g.scale(1, 0.25 + 0.75 * k); g.translate(0, -2 * (1 - k));
    boneD(g, -3, -30, -3, -8, 3, { flash: fl }); boneD(g, 3, -30, 3, -8, 3, { flash: fl });
    g.restore();
    skullD(g, 1, -16 - 24 * k, 8, { flash: fl, jaw: 0.3 * (1 - k) });
    for (let i = 0; i < 6; i++) { const u = (t * 2 + i * 0.37) % 1; g.fillStyle = 'rgba(232,220,192,' + (1 - u) + ')'; g.beginPath(); g.arc(Math.sin(i * 2.1 + t * 3) * 14, -4 - u * 34, 1.6, 0, 7); g.fill(); }
  } else if (s === 'skull') {
    const rock = Math.sin(t * 14) * 0.08;
    g.save(); g.translate(0, 0); g.rotate(rock);
    skullD(g, 0, -8, 8.5, { flash: fl, jaw: 0.5 + 0.4 * Math.abs(Math.sin(t * 9)) });
    g.restore();
    if (!fl) bloom(g, 0, -9, 22, '#9fe8c0', 0.25 + 0.15 * Math.sin(t * 4));
    boneD(g, -14, -2, -8, -1, 2.4, { flash: fl });
  } else if (s === 'reform') {
    const k = clamp(e.stateT / 0.8, 0, 1);
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 5, r = 22 * (1 - k) + 4; boneD(g, Math.cos(a) * r - 3, -10 + Math.sin(a) * r * 0.6, Math.cos(a) * r + 3, -9 + Math.sin(a) * r * 0.6, 2.4, { flash: fl }); }
    bloom(g, 0, -10, 26 + k * 10, '#9fe8c0', 0.35 + 0.4 * k);
    skullD(g, 0, -9, 6.5 * (0.4 + 0.6 * k), { flash: fl });
  } else {                                               // standing: a skeleton with a femur for a club
    const walk = Math.abs(e.vx) > 8 ? sw : 0, wind = s === 'windup', slash = s === 'slash', k = wind ? clamp(e.stateT / 0.4, 0, 1) : 0;
    // legs
    boneD(g, -3, -17, -5 + walk * 2, -9, 2.6, { flash: fl }); boneD(g, -5 + walk * 2, -9, -6 + walk * 3, -1.5, 2.6, { flash: fl });
    boneD(g, 4, -17, 6 - walk * 2, -9, 2.8, { flash: fl }); boneD(g, 6 - walk * 2, -9, 7 - walk * 3, -1.5, 2.8, { flash: fl });
    for (const x of [-7 + walk * 3, 8 - walk * 3]) { g.fillStyle = fl ? '#fff' : '#c8bc9c'; g.beginPath(); g.ellipse(x + 1.5, -1, 3.6, 1.8, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); }
    // pelvis, spine, ribs
    formD(g, ell(0, -18, 7.5, 3.6), [0, -18, 7.5, 3.6], '#d8ccae', { flash: fl, lw: 2 });
    boneD(g, 0, -17, 0, -35, 2.4, { flash: fl });
    for (let i = 0; i < 4; i++) { const y = -33 + i * 3.8, r = 8.5 - i * 0.9; g.strokeStyle = INK; g.lineWidth = 4.4; g.beginPath(); g.arc(1, y, r, -0.25, Math.PI * 1.2 - 2.2 * 0 + 0.05, false); g.stroke(); g.strokeStyle = fl ? '#fff' : BONEC; g.lineWidth = 2.2; g.stroke(); }
    if (!fl) { bloom(g, 1, -28, 12, '#9fe8c0', 0.25 + 0.1 * Math.sin(t * 3)); }
    // the skull
    skullD(g, 2 + (slash ? 3 : 0), -41, 7.8, { flash: fl, jaw: wind ? 0.5 * k : slash ? 0.7 : 0.1 });
    // the club arm: a femur raised overhead when winding, thrown forward when striking
    const sh = [5, -33], ang = slash ? 0.5 : wind ? -2.2 + k * 0.4 : -0.7 + Math.sin(t * 3) * 0.1, ex = sh[0] + Math.cos(ang) * 9, ey = sh[1] + Math.sin(ang) * 9;
    boneD(g, sh[0], sh[1], ex, ey, 2.4, { flash: fl });
    const cx2 = ex + Math.cos(ang - 0.15) * 22, cy2 = ey + Math.sin(ang - 0.15) * 22;
    boneD(g, ex, ey, cx2, cy2, 4.4, { flash: fl, col: '#f2e8d0' });
    if (slash) { g.strokeStyle = 'rgba(255,255,240,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(sh[0], sh[1], 30, -1.3, 1.1); g.stroke(); }
    boneD(g, -4, -33, -9, -26, 2, { flash: fl }); boneD(g, -9, -26, -8, -19, 2, { flash: fl });             // the free arm
  }
  g.restore();
};

// ---------------------------------------------------------------- the Skull Bat
Art.enemy.skullbat = function (g, e, t) {
  const fl = e.flash > 0, flap = Math.sin(t * 22), open = e.currentState === 'anticipation' ? clamp(e.stateT / 0.46, 0, 1) : 0;
  g.save(); g.translate(e.cx, e.cy); g.scale(e.face, 1);
  bloom(g, 0, 0, 34, '#9fe8c0', 0.16);
  for (const [s, ph, big] of [[-1, 0, 1], [1, 1.2, 0.9]]) {                         // wings: bony fingers with a thin membrane between
    g.save(); g.translate(-2, -4); g.rotate(-0.7 + flap * 0.45 * (ph ? -1 : 1) * 0.8 + (ph ? 0.5 : 0)); g.scale(big, big);
    const tips = [[-16, -14], [-24, -5], [-22, 7]];
    g.fillStyle = fl ? '#fff' : 'rgba(70,64,60,0.78)'; g.beginPath(); g.moveTo(0, 0); tips.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(-6, 5); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
    tips.forEach(([x, y]) => boneD(g, 0, 0, x, y, 1.6, { flash: fl }));
    g.restore();
  }
  skullD(g, 3, 0, 8.2, { flash: fl, jaw: 0.15 + open * 0.8 });
  if (open > 0 && !fl) bloom(g, 6, 8, 14 + open * 10, '#efe6d0', 0.4 * open);
  g.restore();
};

// ---------------------------------------------------------------- the Censer (a skull-shaped thurible on a chain)
Art.enemy.censer = function (g, e, t) {
  const fl = e.flash > 0, ax = e.isDummy ? e.cx + 8 * Math.sin(t * 1.2) : e.ax, ay = e.isDummy ? e.cy - 78 : e.ay, hot = e.tele > 0 ? 1 - e.tele / 0.6 : 0, swing = e.isDummy ? 0.12 * Math.sin(t * 1.2) : e.ang;
  // the chain: small links from the ceiling to the lid
  const bx = e.cx, by = e.cy - 20, n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 9));
  for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(ax, bx, u), y = lerp(ay, by, u); g.save(); g.translate(x, y); g.rotate(Math.atan2(by - ay, bx - ax) + (i % 2 ? Math.PI / 2 : 0)); g.fillStyle = INK; ellipse(g, 0, 0, 5.4, 2.8); g.fill(); g.strokeStyle = fl ? '#fff' : '#9a8a64'; g.lineWidth = 1.6; ellipse(g, 0, 0, 4.2, 1.8); g.stroke(); g.restore(); }
  g.save(); g.translate(e.cx, e.cy); g.rotate(-swing * 0.5);
  const flare = 0.5 + 0.2 * Math.sin(t * 7) + hot * 0.6;
  bloom(g, 0, 2, 52 + hot * 40, '#9fe8c0', 0.35 * flare);
  formD(g, pol([-5, -22, 5, -22, 7, -17, -7, -17]), [0, -19, 7, 4], '#b8a878', { flash: fl, lw: 2 });                                // the lid and its ring
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(0, -24, 3.6, Math.PI, 0); g.stroke();
  formD(g, c => { c.moveTo(-15, -16); c.quadraticCurveTo(0, -24, 15, -16); c.lineTo(15, 4); c.quadraticCurveTo(15, 20, 0, 22); c.quadraticCurveTo(-15, 20, -15, 4); c.closePath(); }, [0, 2, 15, 22], '#8a7a54', { flash: fl, spec: 0.4, lw: 2.8 });
  if (!fl) {
    g.save(); g.beginPath(); g.moveTo(-15, -16); g.quadraticCurveTo(0, -24, 15, -16); g.lineTo(15, 4); g.quadraticCurveTo(15, 20, 0, 22); g.quadraticCurveTo(-15, 20, -15, 4); g.closePath(); g.clip();
    const fg = g.createRadialGradient(0, 2, 1, 0, 2, 20); fg.addColorStop(0, 'rgba(230,255,240,' + 0.95 * flare + ')'); fg.addColorStop(0.5, 'rgba(120,230,170,' + 0.7 * flare + ')'); fg.addColorStop(1, 'rgba(40,120,90,0)'); g.fillStyle = fg; g.fillRect(-16, -16, 32, 38);
    g.restore();
    for (const x of [-10, 0, 10]) { g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, -17 + Math.abs(x) * 0.15); g.lineTo(x * 0.95, 19 - Math.abs(x) * 0.25); g.stroke(); }                 // bars
  }
  // the face on the front: eyes and a mouth the wisps pour from
  for (const s of [-1, 1]) { g.fillStyle = INK; g.beginPath(); g.ellipse(s * 5.4, -3, 3.4, 4.2, 0, 0, 7); g.fill(); g.fillStyle = fl ? '#fff' : 'rgba(240,255,246,' + (0.7 + hot * 0.3) + ')'; g.beginPath(); g.ellipse(s * 5.4, -2.4, 1.6, 2.4, 0, 0, 7); g.fill(); }
  g.fillStyle = INK; g.beginPath(); g.moveTo(-6, 8); g.quadraticCurveTo(0, 12 + hot * 3, 6, 8); g.quadraticCurveTo(0, 15 + hot * 4, -6, 8); g.fill();
  for (let i = 0; i < 3; i++) { const u = (t * 0.8 + i * 0.33) % 1; g.fillStyle = 'rgba(190,255,220,' + (0.7 * (1 - u)) + ')'; g.beginPath(); g.arc(Math.sin(t * 3 + i * 2) * 3, -22 - u * 18, 2.2 * (1 - u * 0.5), 0, 7); g.fill(); }   // smoke from the lid
  g.restore();
};

// ---------------------------------------------------------------- the Lensling
Art.enemy.lensling = function (g, e, t) {
  const fl = e.flash > 0, aim = e.currentState === 'anticipation', fire = e.currentState === 'attack', sw = Math.sin(t * 6);
  g.save(); g.translate(e.cx, e.y + e.h);
  // the warning line, before the body flips: drawn in world direction
  if (aim && e.stateT > 0.05) {
    const ey = e.eye ? e.eye() : { x: e.cx, y: e.y + 11 }, len = rayLength(ey.x, ey.y, e.aim, 560), lock = e.stateT > 0.6, a = lock ? 0.55 + 0.3 * Math.sin(t * 40) : 0.22;
    g.save(); g.translate(ey.x - e.cx, ey.y - (e.y + e.h)); g.rotate(e.aim);
    g.strokeStyle = 'rgba(190,200,255,' + a + ')'; g.lineWidth = lock ? 2 : 1.2; g.setLineDash(lock ? [] : [6, 6]); g.beginPath(); g.moveTo(8, 0); g.lineTo(len, 0); g.stroke(); g.setLineDash([]);
    g.restore();
  }
  g.scale(e.face, 1);
  groundD(g, 24);
  for (let i = 0; i < 3; i++) legD(g, [-8 + i * 8, -7, -9 + i * 8 + sw * (i % 2 ? 1 : -1), -3, -10 + i * 8 + sw * (i % 2 ? 1.6 : -1.6), 0], 2, '#2a2040', { flash: fl, claw: 2.4, clawAng: 1.3 });
  // the body: a plated violet shell, a brass collar, a short neck
  domeD(g, -4, -11, 15, 10.5, 4, '#4a3a78', { flash: fl, seed: 6 });
  formD(g, ell(10, -12, 5, 8), [10, -12, 5, 8], '#2e2450', { flash: fl, lw: 2.2 });
  formD(g, ell(12, -13, 7.6, 9.6), [12, -13, 7.6, 9.6], '#c8a868', { flash: fl, spec: 0.5, lw: 2.4 });                  // the collar
  for (const a of [-1.2, -0.4, 0.4, 1.2]) rivetD(g, 12 + Math.cos(a) * 7.4 * 0.7, -13 + Math.sin(a) * 9.4 * 0.9, 0.9);
  // the lens: a glass disc, a ring of iris, a slit of dark that follows what it aims at
  const glow = aim ? clamp(e.stateT / 0.9, 0, 1) : fire ? 1 : 0.15;
  if (!fl) bloom(g, 13, -13, 24 + glow * 24, '#bcc8ff', 0.25 + glow * 0.5);
  formD(g, ell(13, -13, 5.8, 7.4), [13, -13, 5.8, 7.4], fl ? '#fff' : '#dfe6ff', { flash: fl, spec: 0.7, hi: '#ffffff', lw: 1.8 });
  if (!fl) {
    const lx = aim || fire ? Math.cos(e.aim) * 1.8 : 0, ly = aim || fire ? Math.sin(e.aim) * 2.2 : 0;
    const ig = g.createRadialGradient(13 + lx, -13 + ly, 0.5, 13 + lx, -13 + ly, 4.4); ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.5, '#9fb0ff'); ig.addColorStop(1, '#3a4aa8');
    g.fillStyle = ig; g.beginPath(); g.ellipse(13 + lx, -13 + ly, 3.8, 4.8, 0, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.ellipse(13 + lx, -13 + ly, 1, 3.4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(11, -16, 1.3, 0, 7); g.fill();
  }
  antennaD(g, 6, -19, -1.2, 9, 0.5, '#b8a8e8', { flash: fl, segs: 4, w: 1.3, knob: '#dfe6ff' });
  g.restore();
};

// ---------------------------------------------------------------- the Orrery
Art.enemy.orrery = function (g, e, t) {
  const fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.cy);
  bloom(g, 0, 0, 74, '#ffe9a0', 0.14);
  // two rings that turn about each other, drawn as ellipses
  for (const [rx, ry, rot, w] of [[40, 15, t * 0.5, 3], [40, 15, t * 0.5 + Math.PI / 2.4, 2.4]]) {
    g.save(); g.rotate(rot); g.strokeStyle = INK; g.lineWidth = w + 3; ellipse(g, 0, 0, rx, ry); g.stroke(); g.strokeStyle = fl ? '#fff' : '#c8a868'; g.lineWidth = w; ellipse(g, 0, 0, rx, ry); g.stroke();
    if (!fl) { g.strokeStyle = 'rgba(255,240,190,0.7)'; g.lineWidth = 0.9; ellipse(g, 0, -0.8, rx - 0.5, ry - 0.5); g.stroke(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.strokeStyle = 'rgba(60,40,10,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(Math.cos(a) * (rx - 2), Math.sin(a) * (ry - 1)); g.lineTo(Math.cos(a) * (rx + 2), Math.sin(a) * (ry + 1)); g.stroke(); } }
    g.restore();
  }
  // the three orbs, each on a thin arm
  for (let i = 0; i < 3; i++) {
    const o = e.orbPos(i), ox = o.x - e.cx, oy = o.y - e.cy;
    g.strokeStyle = 'rgba(200,170,100,0.65)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(ox, oy); g.stroke();
    bloom(g, ox, oy, 20, '#ffe9a0', 0.5);
    formD(g, ell(ox, oy, 7, 7), [ox, oy, 7, 7], ['#ffd070', '#9fd0ff', '#ff9bd6'][i], { flash: fl, spec: 0.7, lw: 2 });
    if (!fl) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(ox - 2, oy - 2.4, 1.4, 0, 7); g.fill(); }
  }
  // the core: a brass sphere with a single lidded eye
  formD(g, ell(0, 0, 13, 13), [0, 0, 13, 13], '#d8b868', { flash: fl, spec: 0.55, lw: 2.8 });
  if (!fl) {
    g.save(); g.beginPath(); g.arc(0, 0, 13, 0, 7); g.clip();
    g.strokeStyle = 'rgba(80,50,10,0.55)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(0, 0, 13, 5 + Math.abs(k) * 2, k * 0.5, 0, 7); g.stroke(); }
    g.restore();
    const look = Math.atan2(G.player.cy - e.cy, G.player.cx - e.cx);
    eyeD(g, 0, 0, 6.4, 5.4, { iris: '#7fb8ff', glow: '#bcd8ff', glowA: 0.4, look: [Math.cos(look), Math.sin(look)], lid: 0.2 + 0.1 * Math.sin(t * 1.3) });
  }
  g.restore();
};

// ---------------------------------------------------------------- the Lunar Hare
Art.enemy.lunarhare = function (g, e, t) {
  const crouch = e.currentState === 'anticipation', air = !e.onGround, fl = e.flash > 0, sq = crouch ? 0.74 : air ? 1.14 : 1 + Math.sin(t * 3) * 0.03;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face * (2 - sq), sq);
  groundD(g, 22);
  // hind leg: a big folded haunch and a long foot
  formD(g, ell(-8, -10, 8.5, 8), [-8, -10, 8.5, 8], '#cfd6ee', { flash: fl, spec: 0.4, lw: 2.4 });
  formD(g, ell(-9, -2.2, 8, 2.6, air ? -0.5 : 0), [-9, -2.2, 8, 2.6], '#aab4d4', { flash: fl, lw: 2 });
  // the round, furred body, a tail like a cloud
  formD(g, ell(0, -15, 14, 11.5), [0, -15, 14, 11.5], '#e6ebf8', { flash: fl, spec: 0.5, lw: 3 });
  if (!fl) { hatchD(g, [0, -15, 12, 9], 36, 2.3, '#8a96c0', 0.35, { len: 5, w: 0.9, seed: 6 }); hatchD(g, [-3, -19, 8, 5], 16, 2.2, '#ffffff', 0.5, { len: 4, w: 0.8, seed: 9 }); }
  formD(g, ell(-15, -12, 5.6, 5.2), [-15, -12, 5.6, 5.2], '#ffffff', { flash: fl, spec: 0.5, lw: 2.2 });
  // front paw, head, the ears
  formD(g, ell(9, -3.4, 4.2, 3), [9, -3.4, 4.2, 3], '#cfd6ee', { flash: fl, lw: 1.8 });
  const ear = (dx, dy, rot, big) => { g.save(); g.translate(dx, dy); g.rotate(rot); formD(g, ell(0, -big * 0.5, 3.4, big * 0.5), [0, -big * 0.5, 3.4, big * 0.5], '#e6ebf8', { flash: fl, spec: 0.3, lw: 2 }); if (!fl) { g.fillStyle = 'rgba(200,170,235,0.85)'; g.beginPath(); g.ellipse(0, -big * 0.45, 1.6, big * 0.34, 0, 0, 7); g.fill(); } g.restore(); };
  const lay = crouch ? 1.25 : air ? -0.35 : 0, wob = Math.sin(t * 4) * 0.05;
  ear(7, -25, -0.5 - lay * 0.3 + wob, 15); ear(11, -24, 0.05 + lay * 0.5 - wob, 14);
  formD(g, ell(11, -17, 8, 7.2), [11, -17, 8, 7.2], '#eef1fb', { flash: fl, spec: 0.55, lw: 2.6 });
  eyeD(g, 14.4, -18.2, 3.2, 3.8, { iris: '#7a6ad8', look: [0.6, 0.1], sclera: '#fff' });
  if (!fl) {
    g.fillStyle = 'rgba(255,170,200,0.7)'; g.beginPath(); g.ellipse(17.6, -15.6, 1.6, 1.2, 0, 0, 7); g.fill();                                 // nose
    g.strokeStyle = 'rgba(60,50,90,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(17, -14.6); g.lineTo(17, -13); g.moveTo(17, -13); g.quadraticCurveTo(15.6, -11.6, 14, -12.4); g.stroke();
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(10, -22.4, 1.5, 0, 7); g.fill(); g.fillStyle = '#e6ebf8'; g.beginPath(); g.arc(10.7, -22.8, 1.3, 0, 7); g.fill();   // a crescent mark
    g.strokeStyle = 'rgba(230,236,255,0.8)'; g.lineWidth = 0.8; for (const dy of [-1, 0.6]) { g.beginPath(); g.moveTo(16, -13.6 + dy); g.lineTo(23, -14.6 + dy * 2); g.stroke(); }
    if (air || crouch) bloom(g, 0, -12, 30, '#cfd8ff', 0.2);
  }
  g.restore();
};

// ---------------------------------------------------------------- the ray: a warning line, then a bar of light
const baseProj4 = Art.drawProj;
Art.drawProj = function (g, p, t) {
  if (p.kind !== 'ray') { baseProj4(g, p, t); return; }
  const glow = (p.pal && p.pal.glow) || '#b8c4ff', rgb = (p.pal && p.pal.rgb) || '200,210,255';
  g.save(); g.translate(p.x, p.y); g.rotate(p.a);
  if (p.t < p.tele) {
    const f = p.t / Math.max(0.01, p.tele);
    g.strokeStyle = 'rgba(' + rgb + ',' + (0.2 + 0.5 * f) + ')'; g.lineWidth = 1 + f * 2; g.setLineDash([8, 6]); g.lineDashOffset = -p.t * 80; g.beginPath(); g.moveTo(0, 0); g.lineTo(p.len, 0); g.stroke(); g.setLineDash([]);
    bloom(g, 0, 0, 20 + f * 20, glow, 0.4 * f);
  } else {
    const k = 1 - clamp((p.t - p.tele) / p.dur, 0, 1), w = p.rw * (0.5 + 0.7 * k);
    const gr = g.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.65, 'rgba(' + rgb + ',0.9)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, -w, p.len, w * 2);
    bloom(g, 0, 0, 44, glow, 0.7); bloom(g, p.len, 0, 30, glow, 0.5);
    for (let i = 0; i < 8; i++) { const x = ((i * 97 + p.t * 900) % p.len); bloom(g, x, Math.sin(i * 3 + p.t * 30) * w * 0.6, 8, '#ffffff', 0.5); }
  }
  g.restore();
};

// ---------------------------------------------------------------- the bosses
FLYING.add('stargazer'); FLYING.add('regent');
// a barrel of ribs: n arcs from a spine at (cx, cy), each a little wider toward the middle
function ribsD(g, cx, cy, rx, ry, n, w, fl, face) {
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0.5, y = cy - ry + u * ry * 2, r = rx * (0.62 + 0.38 * Math.sin(u * Math.PI)), a0 = -0.35, a1 = Math.PI * 0.75;
    g.strokeStyle = INK; g.lineWidth = w + 2.6; g.lineCap = 'round'; g.beginPath(); g.ellipse(cx, y, r, ry * 0.3, 0, a0, a1); g.stroke();
    g.strokeStyle = fl ? '#fff' : '#efe6d0'; g.lineWidth = w; g.stroke();
    if (!fl) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = w * 0.3; g.beginPath(); g.ellipse(cx, y - w * 0.2, r, ry * 0.3, 0, a0 + 0.2, a1 - 0.5); g.stroke(); }
  }
}
function vertebraeD(g, x0, y0, x1, y1, n, r, fl) {
  for (let i = 0; i < n; i++) { const u = i / (n - 1), x = lerp(x0, x1, u), y = lerp(y0, y1, u); formD(g, ell(x, y, r * (1.2 - u * 0.3), r * 0.62), [x, y, r, r * 0.6], '#dcd0b2', { flash: fl, spec: 0.3, lw: 1.8 }); if (!fl) { g.fillStyle = INK; g.fillRect(x - 1.2, y + r * 0.5, 2.4, 1.6); } }
}

Art.boss.bonewright = function (g, b, t) {           // the Bonewright: a tall four-armed sculptor of bone, a goggled skull, a leather apron, a chisel the size of a man's arm
  const fl = b.flash > 0, tele = b.tele > 0, sw = b.slashing, cast = b.casting, lunge = b.lunging;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 3, 0);
  if (lunge) g.rotate(0.16);
  groundD(g, 48); if (!fl) bloom(g, 0, -64, 90, '#9fe8c0', 0.08 + (tele ? 0.22 : 0));
  const step = Math.abs(b.vx) > 30 ? Math.sin(t * 12) * 6 : 0, bob = Math.sin(t * 2) * 1.2;
  // the spare bones he carries on his back, behind everything
  g.save(); g.translate(-18, -76);
  boneD(g, -4, 6, -12, -34, 3.4, { flash: fl }); boneD(g, 2, 4, 4, -40, 3.4, { flash: fl }); boneD(g, 8, 8, 18, -30, 3, { flash: fl });
  skullD(g, -2, -30, 6.4, { flash: fl, glow: null }); g.restore();
  // legs: long shin bones with big knees
  for (const [dx, far] of [[-6, 1], [8, 0]]) {
    const s = far ? -step : step, col = far ? '#c0b494' : BONEC;
    boneD(g, dx, -48, dx - 2 + s * 0.4, -26, 6.4, { flash: fl, col }); boneD(g, dx - 2 + s * 0.4, -26, dx - 2 + s, -4, 5.6, { flash: fl, col });
    formD(g, ell(dx + 2 + s, -2, 10, 3.6), [dx + 2 + s, -2, 10, 3.6], col, { flash: fl, lw: 2.2 });
    for (let k = 0; k < 3; k++) clawD(g, dx + 10 + s, -3 + (k - 1) * 1.8, 0, 5, 1.1, '#e8e0d0', fl);
  }
  // pelvis and the spine up to the neck, bending with the work
  formD(g, ell(0, -52, 16, 7), [0, -52, 16, 7], '#d8ccae', { flash: fl, spec: 0.3, lw: 2.8 });
  vertebraeD(g, -1, -58, 4 + (cast ? 1 : 0), -100 + bob, 9, 3.6, fl);
  // the ribcage, with the faint green of something still alive inside
  formD(g, ell(2, -80 + bob, 19, 21), [2, -80, 19, 21], '#16130e', { flash: fl, lw: 2, spec: 0, rim: 0 });
  if (!fl) bloom(g, 3, -80, 22, '#9fe8c0', 0.3 + 0.15 * Math.sin(t * 3));
  ribsD(g, 2, -80 + bob, 20, 21, 5, 3.4, fl);
  // the apron over the hips and the belt of tools
  formD(g, pol([-12, -62, 14, -62, 16, -24, 0, -18, -14, -26]), [1, -42, 15, 22], '#8a6a44', { flash: fl, spec: 0.18, lw: 2.8 });
  if (!fl) { stitchD(g, -11, -60, 13, -60, '#ead8a8', 8); formD(g, c => c.rect(-8, -50, 16, 12), [0, -44, 8, 6], '#6a4e30', { lw: 1.8, spec: 0.1 }); g.fillStyle = '#d8d8e0'; for (const x of [-5, -1.5, 2, 5.5]) g.fillRect(x, -52, 1.8, 5); g.fillStyle = INK; g.fillRect(-12, -62, 26, 2.2); hatchD(g, [1, -42, 14, 20], 24, 1.3, '#3a2a18', 0.4, { len: 5, w: 0.8, seed: 3 }); }
  // scapulae and the four arms: the front pair work, the lower pair hold the tools
  for (const [x, y, rot] of [[-12, -99, -0.4], [14, -99, 0.4]]) { formD(g, ell(x, y + bob, 10, 5.4, rot), [x, y, 10, 5.4], '#e2d6b8', { flash: fl, spec: 0.4, lw: 2.4 }); rivetD(g, x - 3, y + bob, 1.2); rivetD(g, x + 3, y + bob, 1.2); }
  boneD(g, -14, -94, -30, -78 + Math.sin(t * 3) * 2, 4.4, { flash: fl }); boneD(g, -30, -78 + Math.sin(t * 3) * 2, -24, -62, 4, { flash: fl });             // the far arm, holding calipers
  boneD(g, -24, -62, -18, -52, 2, { flash: fl }); boneD(g, -24, -62, -30, -52, 2, { flash: fl });
  boneD(g, 8, -76, 24, -66, 3.4, { flash: fl }); formD(g, ell(27, -66, 4.4, 3.4), [27, -66, 4.4, 3.4], '#d8ccae', { flash: fl, lw: 1.8 });                         // a small arm with a file
  g.save(); g.translate(18, -96 + bob);                                                                                                                           // the working arm and the great chisel
  const arm = sw === 1 ? 1.15 : tele ? -1.9 : cast ? -1.2 : -0.3 + Math.sin(t * 2.4) * 0.07;
  g.rotate(arm);
  boneD(g, 0, 0, 22, 0, 5, { flash: fl }); boneD(g, 22, 0, 44, 3, 4.4, { flash: fl });
  formD(g, ell(47, 4, 5.4, 4.4), [47, 4, 5, 4], '#d8ccae', { flash: fl, lw: 2 });
  g.save(); g.translate(48, 4); g.rotate(sw === 1 ? 0.2 : -0.4);                                                                                                  // the chisel
  g.fillStyle = INK; g.fillRect(-4, -3.4, 24, 6.8); g.fillStyle = fl ? '#fff' : '#6a4e30'; g.fillRect(-3, -2.4, 20, 4.8); formD(g, pol([18, -6, 54, -3, 62, 0, 54, 3, 18, 6]), [38, 0, 22, 6], '#b8c0cc', { flash: fl, spec: 0.7, lw: 2.2 });
  if (!fl) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(22, -3); g.lineTo(58, -1); g.stroke(); }
  g.restore(); g.restore();
  // the head: a long skull under brass goggles pushed up, a respirator hanging at the throat
  g.save(); g.translate(7 + (lunge ? 4 : 0), -112 + bob);
  boneD(g, -4, 6, -4, 14, 3.4, { flash: fl });
  skullD(g, 0, -2, 13.5, { flash: fl, jaw: cast ? 0.9 : tele ? 0.5 : 0.12, glow: tele ? '#e8fff4' : '#9fe8c0' });
  formD(g, c => { c.moveTo(-14, -16); c.lineTo(14, -16); c.lineTo(15, -10); c.lineTo(-15, -10); c.closePath(); }, [0, -13, 15, 3.4], '#7a5a38', { flash: fl, spec: 0.2, lw: 2 });                      // the strap
  for (const x of [-7, 7]) { formD(g, ell(x, -14, 6, 5.6), [x, -14, 6, 5.6], '#c8a868', { flash: fl, spec: 0.6, lw: 2.2 }); formD(g, ell(x, -14, 3.8, 3.4), [x, -14, 3.8, 3.4], fl ? '#fff' : '#9fd0e8', { flash: fl, spec: 0.8, lw: 1.4 }); }
  formD(g, ell(6, 12, 6, 4.4), [6, 12, 6, 4.4], '#8a8a96', { flash: fl, spec: 0.5, lw: 1.8 }); if (!fl) { g.strokeStyle = 'rgba(30,30,40,0.7)'; g.lineWidth = 0.8; for (const x of [3, 6, 9]) { g.beginPath(); g.moveTo(x, 9); g.lineTo(x, 15); g.stroke(); } }
  g.restore();
  // dust of bone chips that circles him while he works
  for (let i = 0; i < (cast || tele ? 9 : 4); i++) { const a = t * 2.4 + i * 1.7, r = 30 + (i % 3) * 12; g.fillStyle = 'rgba(239,230,208,0.8)'; g.beginPath(); g.arc(Math.cos(a) * r, -66 + Math.sin(a * 1.3) * 34, 1.5 + (i % 2), 0, 7); g.fill(); }
  g.restore();
  bossStars(g, b, t, '#efe6d0', 0, 0);
};

Art.boss.marrow = function (g, b, t) {               // the Marrow Tyrant: every bone of the dead in one body, a crown of skulls, a heart of glowing marrow, a fist of fingers
  const fl = b.flash > 0, tele = b.tele > 0, sw = b.slashing, cast = b.casting, rat = b.rattling;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 4, 0);
  const jit = () => (rat ? (Math.random() - 0.5) * 5 : 0), bob = Math.sin(t * 1.6) * 1.5;
  groundD(g, 100); if (!fl) bloom(g, 0, -86, 140, '#9fe8c0', 0.1 + (tele ? 0.2 : 0) + (rat ? 0.25 : 0));
  // legs: two pillars of stacked bones with a great knee each
  for (const [dx, far] of [[-30, 1], [24, 0]]) {
    const col = far ? '#b8ac8c' : '#e2d6b8';
    for (let k = 0; k < 4; k++) formD(g, ell(dx + jit(), -8 - k * 14, 17 - k * 1.2, 9), [dx, -8 - k * 14, 17, 9], col, { flash: fl, spec: 0.3, lw: 2.6 });
    boneD(g, dx - 14, -36, dx - 14, -8, 4.4, { flash: fl, col }); boneD(g, dx + 14, -36, dx + 14, -8, 4.4, { flash: fl, col });
    formD(g, ell(dx + 4, -2, 24, 5.6), [dx + 4, -2, 24, 5.6], col, { flash: fl, lw: 2.6 });
    for (let k = 0; k < 4; k++) clawD(g, dx + 24, -3 + (k - 1.5) * 2.4, 0, 8, 1.5, '#f2e8d0', fl);
  }
  // pelvis, a spine ridge up the back
  formD(g, ell(-2 + jit(), -62, 40, 12), [-2, -62, 40, 12], '#d8ccae', { flash: fl, spec: 0.3, lw: 3.2 });
  vertebraeD(g, -26, -70, -18, -134 + bob, 11, 6.4, fl);
  // the barrel of the ribs and the heart of marrow
  formD(g, ell(0, -102 + bob, 38, 40), [0, -102, 38, 40], '#120f0a', { flash: fl, lw: 3, spec: 0, rim: 0 });
  const beat = 0.6 + 0.4 * Math.sin(t * 3.4) + (tele ? 0.5 : 0) + (rat ? 0.6 : 0);
  if (!fl) { bloom(g, 4, -102, 62 * beat, '#9fe8c0', 0.5 * Math.min(1, beat)); formD(g, ell(4, -102 + bob, 13 + beat * 2, 15 + beat * 2), [4, -102, 14, 16], '#8fe8b8', { spec: 0.7, hi: '#ffffff', lo: '#2a8a6a', lw: 2.4 }); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1, -110); g.quadraticCurveTo(10, -104, 0, -92); g.stroke(); }
  ribsD(g, 0 + jit(), -102 + bob, 40, 40, 7, 5.4, fl);
  formD(g, ell(-8, -64, 20, 9), [-8, -64, 20, 9], '#cfc3a4', { flash: fl, lw: 2.4 });                                                                         // a girdle of broken ribs below
  // the arms: far one hanging, near one raised for the fist
  g.save(); g.translate(-34, -130 + bob); g.rotate(0.35);
  boneD(g, 0, 0, 0, 36, 7, { flash: fl, col: '#c4b898' }); boneD(g, 0, 36, 4, 70, 6, { flash: fl, col: '#c4b898' });
  for (let k = 0; k < 4; k++) boneD(g, 4 + (k - 1.5) * 3.6, 70, 4 + (k - 1.5) * 4.6, 88, 2.6, { flash: fl, col: '#c4b898' }); g.restore();
  g.save(); g.translate(36, -132 + bob);
  const raise = sw === 1 ? -2.6 : sw === 2 ? 0.2 : tele ? -2.3 : cast ? -1.3 : -0.2 + Math.sin(t * 1.8) * 0.06;
  g.rotate(raise);
  formD(g, ell(0, 0, 16, 10), [0, 0, 16, 10], '#e2d6b8', { flash: fl, spec: 0.4, lw: 3 });
  boneD(g, 6, 0, 52, 0, 8, { flash: fl }); boneD(g, 52, 0, 90, 5, 7, { flash: fl });
  g.save(); g.translate(96, 5);                                                                                                                                  // the fist
  formD(g, ell(0, 0, 18, 15), [0, 0, 18, 15], '#efe6d0', { flash: fl, spec: 0.5, lw: 3 });
  for (let k = 0; k < 4; k++) { boneD(g, 6, -10 + k * 7, 22, -8 + k * 7, 4.2, { flash: fl }); boneD(g, 22, -8 + k * 7, 28, -2 + k * 7.6, 3.6, { flash: fl }); }
  boneD(g, -4, -12, 8, -22, 4, { flash: fl });
  g.restore(); g.restore();
  // the head: a great horned skull and a crown of five lesser ones, a jaw that hangs open
  g.save(); g.translate(-4 + jit(), -152 + bob);
  for (const [dx, dy, r, rot] of [[-30, 2, 8, -0.5], [-16, -14, 8.6, -0.25], [0, -20, 9.4, 0], [16, -14, 8.6, 0.25], [30, 2, 8, 0.5]]) { g.save(); g.translate(dx, dy); g.rotate(rot); skullD(g, 0, 0, r, { flash: fl, glow: '#9fe8c0' }); g.restore(); }
  for (const s of [-1, 1]) { g.save(); g.scale(s, 1); boneD(g, 18, -2, 38, -10, 6, { flash: fl }); boneD(g, 38, -10, 44, -30, 5, { flash: fl }); boneD(g, 44, -30, 36, -46, 3.6, { flash: fl }); g.restore(); }  // femur horns
  skullD(g, 0, 8, 22, { flash: fl, jaw: cast ? 1 : tele ? 0.7 : 0.35 + 0.1 * Math.sin(t * 2), glow: tele ? '#f4fff8' : '#8ff0b8' });
  if (cast && !fl) bloom(g, 6, 34, 36, '#bfe8d0', 0.6);
  g.restore();
  // wisps rising from the whole body
  for (let i = 0; i < 9; i++) { const u = (t * 0.5 + i * 0.37) % 1; g.fillStyle = 'rgba(190,255,220,' + 0.5 * (1 - u) + ')'; g.beginPath(); g.arc(Math.sin(i * 3.1) * 50 + Math.sin(t * 2 + i) * 6, -40 - u * 140, 2.4 * (1 - u * 0.5), 0, 7); g.fill(); }
  g.restore();
  bossStars(g, b, t, '#efe6d0', 0, 0);
};

Art.boss.stargazer = function (g, b, t) {            // the Stargazer: a robe of night sewn with stars, a brass lens-helm with a glass eye, a beard of starlight, a long brass telescope
  const fl = b.flash > 0, tele = b.tele > 0, cast = b.casting, bob = Math.sin(t * 2) * 3;
  g.save(); g.globalAlpha = b.alpha === undefined ? 1 : b.alpha; g.translate(b.cx, b.cy + bob); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 3, 0);
  bloom(g, 0, -4, 110, '#b8c4ff', 0.12 + (tele ? 0.3 : 0));
  // the star charts that float around him
  for (let i = 0; i < 3; i++) { const a = t * 0.8 + i * 2.1, x = Math.cos(a) * 46, y = -10 + Math.sin(a * 1.2) * 26; g.save(); g.translate(x, y); g.rotate(Math.sin(a * 2) * 0.4); g.fillStyle = fl ? '#fff' : 'rgba(232,220,184,0.9)'; g.fillRect(-7, -5, 14, 10); g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(-7, -5, 14, 10); g.fillStyle = '#2a3070'; for (const [dx, dy] of [[-3, -2], [1, 1], [3, -2]]) { g.beginPath(); g.arc(dx, dy, 0.9, 0, 7); g.fill(); } g.restore(); }
  // the robe: it hangs to a ragged hem that dissolves into stars
  const robe = c => { c.moveTo(-14, -32); c.bezierCurveTo(-26, -8, -30, 24, -24, 46); c.lineTo(-17, 38); c.lineTo(-11, 50); c.lineTo(-4, 40); c.lineTo(3, 52); c.lineTo(10, 40); c.lineTo(17, 48); c.lineTo(24, 38); c.bezierCurveTo(30, 20, 26, -8, 14, -32); c.closePath(); };
  formD(g, robe, [0, 6, 28, 46], '#2a3070', { flash: fl, spec: 0.25, lw: 3, rimc: '180,196,255' });
  if (!fl) {
    g.save(); g.beginPath(); robe(g); g.clip();
    g.strokeStyle = 'rgba(8,10,40,0.6)'; g.lineWidth = 1.4; for (const x of [-14, -5, 4, 13]) { g.beginPath(); g.moveTo(x * 0.6, -30); g.quadraticCurveTo(x * 1.5, 8, x * 1.3, 50); g.stroke(); }
    for (let i = 0; i < 26; i++) { const x = ((i * 53) % 52) - 26, y = -28 + ((i * 37) % 76), tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3); g.fillStyle = 'rgba(255,248,210,' + (0.4 + 0.6 * tw) + ')'; g.beginPath(); g.arc(x, y, 0.7 + (i % 3) * 0.45, 0, 7); g.fill(); }
    g.fillStyle = '#e8c870'; g.fillRect(-28, 22, 56, 2.4); g.fillRect(-28, 36, 56, 1.6);
    g.restore();
  }
  // the collar, high and gold-edged, and the beard of light running down the chest
  formD(g, pol([-16, -38, -6, -30, 0, -26, 6, -30, 16, -38, 12, -22, 0, -18, -12, -22]), [0, -30, 16, 12], '#3a4290', { flash: fl, spec: 0.4, lw: 2.6 });
  g.strokeStyle = fl ? '#fff' : '#e8c870'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-16, -38); g.lineTo(-12, -22); g.lineTo(0, -18); g.lineTo(12, -22); g.lineTo(16, -38); g.stroke();
  const beard = c => { c.moveTo(-8, -26); c.quadraticCurveTo(-10, -4, -3, 14 + Math.sin(t * 2) * 2); c.quadraticCurveTo(0, 24, 3, 14 + Math.sin(t * 2 + 1) * 2); c.quadraticCurveTo(10, -4, 8, -26); c.closePath(); };
  formD(g, beard, [0, -6, 10, 20], '#e8eeff', { flash: fl, spec: 0.5, lw: 2.2, hi: '#ffffff', lo: '#8a9ad8' });
  if (!fl) { hatchD(g, [0, -6, 8, 18], 16, 1.5, '#8a9ad8', 0.5, { len: 6, w: 0.8, seed: 5 }); bloom(g, 0, -4, 20, '#cfd8ff', 0.3); }
  // the helm: a brass dome with a big glass eye, the real eyes peering from beneath
  g.save(); g.translate(0, -46);
  formD(g, ell(0, 0, 14, 14), [0, 0, 14, 14], '#d8b868', { flash: fl, spec: 0.6, lw: 3 });
  g.save(); g.beginPath(); g.arc(0, 0, 14, 0, 7); g.clip(); g.strokeStyle = 'rgba(70,46,10,0.55)'; g.lineWidth = 1; for (const k of [-1, 0, 1]) { g.beginPath(); g.ellipse(0, 0, 14, 5 + Math.abs(k) * 4, k * 0.4, 0, 7); g.stroke(); } g.restore();
  for (const a of [0.4, 1.3, 2.2, 3.1, 4.0, 4.9]) rivetD(g, Math.cos(a) * 12, Math.sin(a) * 12, 1);
  formD(g, ell(8, -1, 7.6, 8.6), [8, -1, 7.6, 8.6], '#a8844a', { flash: fl, spec: 0.5, lw: 2.4 });                                              // the lens housing
  formD(g, ell(9, -1, 5.4, 6.4), [9, -1, 5.4, 6.4], fl ? '#fff' : '#cfe0ff', { flash: fl, spec: 0.9, hi: '#ffffff', lo: '#4a5ab8', lw: 1.6 });
  if (!fl) { const k = tele ? 1 : 0.3 + 0.15 * Math.sin(t * 4); bloom(g, 10, -1, 26 + k * 20, '#e8f0ff', 0.4 + k * 0.5); eyeD(g, 9.4, -0.6, 3.4, 3.8, { iris: '#7fa8ff', look: [Math.cos(b.aimA || 0), Math.sin(b.aimA || 0)], sclera: '#fff', lid: 0.1 }); }
  g.restore();
  g.fillStyle = fl ? '#fff' : '#f0f4ff'; g.beginPath(); g.moveTo(1, -52); g.quadraticCurveTo(12, -56, 20, -48); g.quadraticCurveTo(10, -50, 1, -48); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();   // a white brow
  // the telescope: brass sections, ringed, pointing where he aims
  g.save(); g.translate(18, -22); g.rotate(cast || tele ? clamp((b.face > 0 ? (b.aimA || 0) : Math.PI - (b.aimA || 0)), -1.2, 1.2) : -0.12 + Math.sin(t * 1.5) * 0.05);
  legD(g, [-18, 6, -6, 2, 4, 0], 6.4, '#2a3070', { flash: fl });
  for (const [x0, x1, w, c] of [[0, 30, 8, '#c8a460'], [30, 56, 6.6, '#d8b868'], [56, 78, 5.4, '#e8c878']]) { g.fillStyle = INK; g.fillRect(x0 - 1, -w / 2 - 1.4, x1 - x0 + 2.4, w + 2.8); const tg = g.createLinearGradient(0, -w / 2, 0, w / 2); tg.addColorStop(0, fl ? '#fff' : mix(c, '#ffffff', 0.4)); tg.addColorStop(0.5, fl ? '#fff' : c); tg.addColorStop(1, fl ? '#fff' : mix(c, '#000000', 0.5)); g.fillStyle = tg; g.fillRect(x0, -w / 2, x1 - x0, w); g.fillStyle = INK; g.fillRect(x1 - 1.4, -w / 2 - 1, 2.8, w + 2); }
  formD(g, ell(78, 0, 5, 6.6), [78, 0, 5, 6.6], '#cfe0ff', { flash: fl, spec: 0.8, lw: 2 });
  if (!fl) bloom(g, 82, 0, 24 + (tele ? 30 : 0), '#e8f0ff', 0.4 + (tele ? 0.5 : 0));
  formD(g, ell(10, 4, 4.4, 3.8), [10, 4, 4.4, 3.8], '#e2d6e8', { flash: fl, lw: 1.8 });
  g.restore();
  g.restore();
  bossStars(g, b, t, '#dfe6ff', 0, -16);
};

Art.boss.regent = function (g, b, t) {               // the Eclipse Regent: a black disc ringed with corona behind a robed sovereign, a silver mask under a crown of rays, moon phases down the hem
  const fl = b.flash > 0, tele = b.tele > 0, cast = b.casting, bob = Math.sin(t * 1.7) * 3, eclipse = G.eclipse || 0;
  g.save(); g.translate(b.cx, b.cy + bob); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 4, 0);
  // the disc and its corona
  const pulse = 0.7 + 0.3 * Math.sin(t * 2.6) + (tele ? 0.5 : 0) + (cast ? 0.2 : 0) + eclipse * 0.4;
  bloom(g, 0, -22, 170, '#ffe6a8', 0.2 * pulse); bloom(g, 0, -22, 120, '#ffffff', 0.18 * pulse);
  g.save(); g.translate(0, -26);
  for (let i = 0; i < 28; i++) { const a = i * Math.PI * 2 / 28 + t * 0.15, len = 16 + 18 * (0.5 + 0.5 * Math.sin(t * 2 + i * 2.3)) * pulse; g.strokeStyle = 'rgba(255,238,190,' + (0.5 + 0.2 * Math.sin(i + t)) + ')'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(Math.cos(a) * 62, Math.sin(a) * 62); g.lineTo(Math.cos(a) * (62 + len), Math.sin(a) * (62 + len)); g.stroke(); }
  g.fillStyle = INK; g.beginPath(); g.arc(0, 0, 66, 0, 7); g.fill();
  const dg = g.createRadialGradient(-10, -12, 6, 0, 0, 62); dg.addColorStop(0, fl ? '#fff' : '#1c2040'); dg.addColorStop(0.8, fl ? '#fff' : '#05060f'); dg.addColorStop(1, fl ? '#fff' : '#000'); g.fillStyle = dg; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,240,200,' + (0.7 + 0.3 * pulse * 0.5) + ')'; g.lineWidth = 3.4; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 62, -2.8, -1.4); g.stroke();
  g.restore();
  // the robe: black, widening to a hem embroidered with the eight phases of the moon
  const robe = c => { c.moveTo(-18, -38); c.bezierCurveTo(-34, -6, -40, 30, -38, 66); c.lineTo(-24, 58); c.lineTo(-12, 70); c.lineTo(0, 60); c.lineTo(12, 70); c.lineTo(24, 58); c.lineTo(38, 66); c.bezierCurveTo(40, 30, 34, -6, 18, -38); c.closePath(); };
  formD(g, robe, [0, 14, 38, 56], '#10122a', { flash: fl, spec: 0.2, lw: 3.4, rimc: '200,208,255', lo: '#000000', hi: '#3a4278' });
  if (!fl) {
    g.save(); g.beginPath(); robe(g); g.clip();
    g.strokeStyle = 'rgba(200,208,255,0.22)'; g.lineWidth = 1.2; for (const x of [-22, -10, 2, 14, 26]) { g.beginPath(); g.moveTo(x * 0.5, -34); g.quadraticCurveTo(x * 1.4, 14, x * 1.3, 66); g.stroke(); }
    for (let i = 0; i < 8; i++) { const x = -32 + i * 9.2, y = 48 + Math.abs(i - 3.5) * -1.2, ph = i / 8; g.fillStyle = '#e8ecff'; g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.fill(); g.fillStyle = '#10122a'; g.beginPath(); g.arc(x + (ph - 0.5) * 7, y, 3.6, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,238,190,0.8)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.stroke(); }
    g.fillStyle = '#ffe6a8'; g.fillRect(-40, 38, 80, 2); g.fillRect(-40, 58, 80, 1.6);
    for (let i = 0; i < 20; i++) { const x = ((i * 47) % 70) - 35, y = -30 + ((i * 29) % 80); g.fillStyle = 'rgba(255,248,214,' + (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i))) + ')'; g.beginPath(); g.arc(x, y, 0.8, 0, 7); g.fill(); }
    g.restore();
  }
  // the high collar like a fan of rays, a crescent clasp
  for (let i = -3; i <= 3; i++) spikeD(g, i * 6, -34, -1.57 + i * 0.28, 26 - Math.abs(i) * 3, 3, '#e8ecff', fl);
  formD(g, pol([-16, -36, 16, -36, 12, -18, 0, -10, -12, -18]), [0, -26, 16, 12], '#1c2048', { flash: fl, spec: 0.4, lw: 2.8 });
  g.save(); g.translate(0, -22); g.strokeStyle = INK; g.lineWidth = 6.4; g.beginPath(); g.arc(0, 0, 6, -2.2, 2.2); g.stroke(); g.strokeStyle = fl ? '#fff' : '#ffe6a8'; g.lineWidth = 3.4; g.stroke(); g.restore();
  // arms, the pale long hands, raised toward the disc when he casts
  for (const s of [-1, 1]) {
    const up = cast || tele ? 1 : 0, ang = s * (0.9 + up * 0.7), ex = s * 40, ey = -8 - up * 26 + Math.sin(t * 2 + s) * 2;
    legD(g, [s * 20, -28, s * 34, -22 - up * 8, ex, ey], 7, '#1c2048', { flash: fl });
    formD(g, ell(ex + s * 2, ey - 2, 5.2, 4.2), [ex, ey, 5, 4], '#e8ecff', { flash: fl, spec: 0.6, lw: 2 });
    for (let k = -1; k <= 1; k++) boneD(g, ex + s * 4, ey - 2 + k * 2.4, ex + s * (11 + Math.abs(k) * -1.5), ey - 4 + k * 5 - up * 4, 1.8, { flash: fl, col: '#e8ecff' });
    void ang;
  }
  // the head: a silver mask, calm, two bright slits for eyes, a crown of thin rays and a pale crescent on the brow
  g.save(); g.translate(0, -50);
  for (let i = -4; i <= 4; i++) spikeD(g, i * 3.4, -12, -1.57 + i * 0.2, 20 - Math.abs(i) * 1.6, 1.8, '#ffe6a8', fl);
  maskD(g, 0, 0, 13, 15.5, { base: '#dfe5f4', glow: '#fff6d0', eyeA: 1, brow: 0.8, crack: 0.3 });
  if (!fl) { bloom(g, 0, -1, 30, '#fff6d0', 0.25 + (tele ? 0.4 : 0)); g.strokeStyle = '#ffe6a8'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -11, 5, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  g.restore();
  g.restore();
  bossStars(g, b, t, '#fff0c0', 0, 0);
};
