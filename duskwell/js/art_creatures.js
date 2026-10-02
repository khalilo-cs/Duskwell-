'use strict';
// The creatures of Duskwell in detail. Each one is drawn facing right from its feet (or its centre for flyers) and
// flipped by e.face; e.flash > 0 whitens it; the states (tele, currentState, stateT) show what it is about to do.
// Built from the toolkit in art_detail.js: lit forms, faces, eyes, teeth, claws, plates, hatching.

Art.enemy.crawler = function (g, e, t) {        // an armoured pill bug with a pale masked face
  const fl = e.flash > 0, sw = t * 10;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  groundD(g, 24);
  for (let i = 0; i < 3; i++) {                    // far legs, darker and a half-step behind
    const x = -9 + i * 8.5, ph = Math.sin(sw + i * 2.1 + 1.6) * 2.4;
    legD(g, [x + 1, -7, x - 1 + ph * 0.4, -3.6, x - 2 + ph, 0], 1.5, '#2c1a10', { flash: fl, claw: 2, clawAng: 1.3 });
  }
  // the underbelly and the tail plate
  formD(g, ell(-3, -5.5, 15, 4.2), [-3, -5.5, 15, 4.2], '#5a3a26', { flash: fl, spec: 0, rim: 0, lw: 2 });
  domeD(g, -2, -11.5, 16.5, 11.5, 5, '#8a5a38', { flash: fl, seed: 4 });
  if (!fl) { g.fillStyle = 'rgba(255,230,190,0.5)'; g.beginPath(); g.ellipse(-8, -18.5, 4.2, 1.7, -0.45, 0, 7); g.fill(); }
  for (let i = 0; i < 3; i++) {                    // near legs
    const x = -10 + i * 8.5, ph = Math.sin(sw + i * 2.1) * 2.6;
    legD(g, [x, -7, x - 2 + ph * 0.4, -3.4, x - 3 + ph, 0], 1.8, '#4a2c1a', { flash: fl, claw: 2.6, clawAng: 1.3 });
  }
  // the face: a pale mask under the lip of the shell, with feelers and small jaws
  antennaD(g, 15, -15, -0.9, 9, 0.5, '#d8cdb8', { flash: fl, segs: 4, w: 1.4, knob: '#f2e6c8' });
  antennaD(g, 12.5, -16, -1.3, 8, 0.35, '#d8cdb8', { flash: fl, segs: 4, w: 1.2 });
  maskD(g, 13, -9, 7.2, 6.8, { fill: fl ? '#fff' : null, glow: '#ffb860', eyeA: 0.85, lean: 1, brow: 1 });
  clawD(g, 18, -5.8, 0.5, 4.2, 1.5, '#e6dcc4', fl); clawD(g, 18, -4.2, 1.05, 3.6, 1.3, '#e6dcc4', fl);
  g.restore();
};

Art.enemy.flyer = function (g, e, t) {          // a pale winged larva: ringed body, a masked face, veined wings
  const fl = e.flash > 0, flap = Math.sin(t * 36), wob = Math.sin(t * 5) * 1.5;
  g.save(); g.translate(e.cx, e.cy); g.scale(e.face, 1);
  bloom(g, 0, 0, 38, '#e8f6ff', 0.2);
  wingD(g, -1, -6, -1.3 + flap * 0.4, 21, 15, '#cfe0f4', { flash: fl, veins: 5, alpha: 0.72 });
  wingD(g, 3, -5, -0.75 - flap * 0.34, 18, 13, '#e4eefa', { flash: fl, veins: 4, alpha: 0.65 });
  const seg = [[-15, 6 + wob, 4.6], [-9, 4.2 + wob * 0.6, 6], [-1, 1.6, 8]];
  for (const [x, y, r] of seg) {
    formD(g, ell(x, y, r, r * 0.92), [x, y, r, r], '#e9eef2', { flash: fl, spec: 0.5, lw: 2.2 });
    if (!fl) { g.save(); g.beginPath(); ell(x, y, r, r * 0.92)(g); g.clip(); g.strokeStyle = 'rgba(80,96,120,0.5)'; g.lineWidth = 0.8; for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(x + r * 0.2, y + k * r * 0.5, r * 0.9, 1.2, 2.3); g.stroke(); } g.restore(); }
  }
  g.fillStyle = fl ? '#fff' : '#9aa8bc'; poly(g, [-19.5, 6 + wob, -23, 4 + wob, -21, 8 + wob]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();   // the sting
  for (const dx of [-6, -1, 4]) legD(g, [dx, 6, dx + 1.6, 9, dx + 1, 11.5], 1, '#9aa8bc', { flash: fl });
  maskD(g, 7, -0.5, 8.4, 8.2, { fill: fl ? '#fff' : null, glow: '#bfe4ff', eyeA: 0.8, lean: 1, teeth: true, crack: 0.5 });
  antennaD(g, 9, -8, -1.15, 8.5, 0.5, '#c8d4e6', { flash: fl, segs: 4, w: 1.2 }); antennaD(g, 5, -8, -1.55, 7.5, 0.4, '#c8d4e6', { flash: fl, segs: 4, w: 1.1 });
  g.restore();
};

Art.enemy.hopper = function (g, e, t) {         // a round masked hopper with plated flanks and strong hind legs
  const sq = e.currentState === 'anticipation' ? 0.78 : (!e.onGround ? 1.15 : 1 + Math.sin(t * 3) * 0.03), fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face * (2 - sq), sq);
  groundD(g, 22);
  legD(g, [-6, -9, -15, -9.5, -12, -1.5], 3, '#1c3350', { flash: fl, claw: 3.4, clawAng: 0.1 });           // hind leg, folded
  legD(g, [5, -7, 9, -4.5, 8, 0], 2.2, '#1c3350', { flash: fl, claw: 2.6, clawAng: 0.5 });
  formD(g, ell(-2, -14, 14, 12.5), [-2, -14, 14, 12.5], '#2c4a6e', { flash: fl, spec: 0.5, lw: 3 });
  if (!fl) {
    g.save(); g.beginPath(); ell(-2, -14, 14, 12.5)(g); g.clip();
    for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(8,16,30,0.6)'; g.lineWidth = 1.8; g.beginPath(); g.arc(-14 + k * 7, -14, 12 + k * 1.2, -1.2, 1.2); g.stroke(); g.strokeStyle = 'rgba(190,225,255,0.28)'; g.lineWidth = 1; g.beginPath(); g.arc(-13 + k * 7, -14, 12 + k * 1.2, -1.2, 0.2); g.stroke(); }
    scalesD(g, [-6, -14, 10, 10], 4.2, 'rgba(10,20,40,0.35)', 'rgba(200,230,255,0.18)');
    g.restore();
  }
  legD(g, [-8, -7, -17, -5, -15, 0], 3.2, '#2c4a6e', { flash: fl, claw: 3.6, clawAng: 0.2 });                // near hind leg
  spikeD(g, -13, -21, -2.4, 7, 2, '#8fb4de', fl); spikeD(g, -8, -25, -2.0, 6, 1.8, '#8fb4de', fl);          // dorsal spines
  maskD(g, 8, -16, 8.6, 8.2, { fill: fl ? '#fff' : null, glow: '#9fd8ff', eyeA: 0.85, lean: 1, teeth: true, brow: 1 });
  g.restore();
};

Art.enemy.spitter = function (g, e, t) {        // a stalked bloom with a toothed maw that gathers its spit
  const tl = e.tele > 0 ? 1 - e.tele / 0.45 : 0, sway = Math.sin(t * 2 + e.x) * 2, fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h);
  groundD(g, 20);
  g.lineCap = 'round';
  g.strokeStyle = INK; g.lineWidth = 11; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4 + sway, -14, e.face * 4 + sway, -24); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#3f8f58'; g.lineWidth = 6.4; g.stroke();
  g.strokeStyle = 'rgba(200,255,200,0.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-1.6, -1); g.quadraticCurveTo(-5.4 + sway, -14, e.face * 2.6 + sway, -24); g.stroke();
  g.strokeStyle = 'rgba(8,40,20,0.55)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { const u = (k + 1) / 5; g.beginPath(); g.moveTo(-3.4 + sway * u, -u * 24); g.lineTo(3.6 + sway * u, -u * 24 - 1.5); g.stroke(); }
  for (const s of [-1, 1]) {                        // leaves with veins
    g.save(); g.translate(s * 3, -2); g.scale(s, 1);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -12, 19, -1); g.quadraticCurveTo(9, -1, 0, 0);
    g.fillStyle = fl ? '#fff' : '#2f7a48'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = 'rgba(190,255,190,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(1, -0.5); g.quadraticCurveTo(10, -6, 17, -1.5); g.stroke();
    g.restore();
  }
  g.translate(e.face * 4 + sway, -29); g.rotate(e.face * (0.35 + tl * 0.4));
  for (let k = 0; k < 6; k++) { const a = -2.6 + k * 0.42; spikeD(g, Math.cos(a) * 10, Math.sin(a) * 10, a, 6.5, 2.2, '#2f7a48', fl); }   // sepals
  formD(g, ell(0, 0, 12 + tl * 2, 12), [0, 0, 12, 12], '#4aa066', { flash: fl, spec: 0.5, lw: 3 });
  // the maw: a dark throat ringed with teeth, a red tongue
  g.save(); g.translate(5, 0); g.fillStyle = '#1a0a10'; g.beginPath(); g.ellipse(0, 0, 6.4 + tl * 3, 4.8 + tl * 4, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, 0, 6.4 + tl * 3, 4.8 + tl * 4, 0, 0, 7); g.clip(); g.fillStyle = '#c23a4a'; g.beginPath(); g.ellipse(-1.5, 2.2, 4.4, 2.6, 0.2, 0, 7); g.fill(); g.restore();
  g.fillStyle = '#f2f0e4'; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, r1 = [6.4 + tl * 3, 4.8 + tl * 4]; g.beginPath(); g.moveTo(Math.cos(a - 0.2) * r1[0], Math.sin(a - 0.2) * r1[1]); g.lineTo(Math.cos(a) * r1[0] * 0.55, Math.sin(a) * r1[1] * 0.55); g.lineTo(Math.cos(a + 0.2) * r1[0], Math.sin(a + 0.2) * r1[1]); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.6; g.stroke(); }
  g.restore();
  eyeD(g, -2.5, -5.5, 2.8, 2.4, { iris: '#e0c040', pupil: 'slit', angry: 0.7, lidc: '#2f7a48' });
  if (tl > 0) bloom(g, 6, 0, 22, '#b6ef6a', 0.3 + tl * 0.6);
  g.restore();
};

Art.enemy.shard = function (g, e, t) {          // a crystal cluster: faceted prisms with an inner glow
  const tl = e.tele > 0 ? 1 - e.tele / 0.5 : 0, pulse = 0.5 + 0.5 * Math.sin(t * 3 + e.x), fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h);
  bloom(g, 0, -20, 48, '#ff8fd0', 0.14 + pulse * 0.1 + tl * 0.5);
  const prism = (x, w, h, lean, c) => {            // a prism: a lit face, a shaded face and a tip
    const lx = x - w / 2, rx = x + w / 2, tx = x + lean, ty = -h, kx = x + lean * 0.5, ky = -h * 0.78;
    g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx + lean * 0.2, -h * 0.7); g.lineTo(tx, ty); g.lineTo(kx + w * 0.38, ky); g.lineTo(rx, 0); g.closePath();
    const gr = g.createLinearGradient(lx, 0, rx, 0); gr.addColorStop(0, fl ? '#fff' : mix(c, '#ffffff', 0.5)); gr.addColorStop(0.5, fl ? '#fff' : c); gr.addColorStop(1, fl ? '#fff' : mix(c, '#000000', 0.5));
    g.fillStyle = gr; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.lineJoin = 'round'; g.stroke();
    if (!fl) { g.fillStyle = 'rgba(255,255,255,0.32)'; g.beginPath(); g.moveTo(lx + w * 0.12, -h * 0.1); g.lineTo(lx + lean * 0.2 + w * 0.12, -h * 0.66); g.lineTo(tx - w * 0.05, ty + h * 0.05); g.lineTo(x, -h * 0.5); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(lx + lean * 0.2 + 1, -h * 0.68); g.lineTo(tx - 0.5, ty + 1.5); g.stroke(); }
  };
  prism(-9, 8, 22, -3, '#7a36a8'); prism(10, 8, 19, 3, '#7a36a8'); prism(-1, 11, 44, 1.5, '#c06ee0'); prism(-15, 5, 13, -2, '#a050c8'); prism(16, 5, 11, 2, '#a050c8');
  if (!fl) {                                        // a core of light and a few cracks
    const core = tl > 0 ? 1 : 0.7 + 0.3 * pulse; bloom(g, 0, -20, 12 + tl * 6, '#ffffff', 0.5 * core);
    g.fillStyle = 'rgba(255,255,255,' + (0.75 * core) + ')'; poly(g, [-1, -14, 3, -21, -1, -29, -4, -21]); g.fill();
    g.strokeStyle = 'rgba(40,10,60,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(2, -6); g.lineTo(-1, -12); g.lineTo(2, -16); g.moveTo(-9, -4); g.lineTo(-8, -10); g.stroke();
    for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1, sp = 0.5 + 0.5 * Math.sin(a * 2); g.fillStyle = 'rgba(255,235,255,' + (0.6 * sp) + ')'; g.save(); g.translate(Math.cos(a) * 15, -22 + Math.sin(a * 1.3) * 15); poly(g, [0, -2.4, 0.7, 0, 0, 2.4, -0.7, 0]); g.fill(); g.rotate(1.57); poly(g, [0, -2.4, 0.7, 0, 0, 2.4, -0.7, 0]); g.fill(); g.restore(); }
  }
  g.restore();
};

Art.enemy.sentinel = function (g, e, t) {       // a carapace guard in a tattered tabard, sword in hand
  const wind = e.currentState === 'anticipation', charge = e.currentState === 'attack', w = wind ? clamp(e.stateT / 0.45, 0, 1) : 0, fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1); g.rotate(charge ? 0.12 : 0);
  groundD(g, 24);
  const walk = e.currentState === 'patrol' || e.currentState === 'chase' ? Math.sin(t * (e.currentState === 'chase' ? 12 : 6)) * 2.4 : 0;
  legD(g, [-6, -15, -7.5 + walk * 0.5, -8, -7 + walk, 0], 3.6, '#262a36', { flash: fl, claw: 3, clawAng: 0.3 });
  legD(g, [8, -15, 9 - walk * 0.5, -8, 10 - walk, 0], 3.6, '#2e3340', { flash: fl, claw: 3, clawAng: 0.3 });
  // the tabard: cloth with seams, a stitched patch and a ragged hem
  g.beginPath(); g.moveTo(-15, -27); for (let i = 0; i <= 7; i++) g.lineTo(-17 + i * 5, -7 + (i % 2 ? -6 : 2) + Math.sin(t * 5 + i) * 1.5); g.lineTo(17, -27); g.closePath();
  const cg = g.createLinearGradient(0, -27, 0, -2); cg.addColorStop(0, fl ? '#fff' : '#3c5a90'); cg.addColorStop(1, fl ? '#fff' : '#1c2c4a'); g.fillStyle = cg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.lineJoin = 'round'; g.stroke();
  if (!fl) {
    g.strokeStyle = 'rgba(8,14,30,0.5)'; g.lineWidth = 1; for (const x of [-9, -2, 6, 12]) { g.beginPath(); g.moveTo(x, -26); g.lineTo(x + 1.2, -10); g.stroke(); }
    g.fillStyle = '#6a4a3a'; g.fillRect(3, -22, 6, 6); g.strokeStyle = 'rgba(240,220,190,0.8)'; g.setLineDash([1.2, 1.2]); g.lineWidth = 0.7; g.strokeRect(3.2, -21.8, 5.6, 5.6); g.setLineDash([]);
  }
  // the carapace torso, banded, with rivets
  formD(g, ell(0, -34, 17, 15), [0, -34, 17, 15], '#2f3342', { flash: fl, spec: 0.45, lw: 3 });
  if (!fl) {
    g.save(); g.beginPath(); ell(0, -34, 17, 15)(g); g.clip();
    for (let i = -2; i <= 2; i++) { g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, -34 + i * 6); g.quadraticCurveTo(0, -30 + i * 6, 18, -34 + i * 6); g.stroke(); g.strokeStyle = 'rgba(190,205,240,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-17, -35.4 + i * 6); g.quadraticCurveTo(0, -31.4 + i * 6, 17, -35.4 + i * 6); g.stroke(); }
    hatchD(g, [0, -34, 16, 14], 40, 0.2, '#0c0e16', 0.4, { len: 5, w: 0.8, seed: 2 });
    g.restore(); for (const [x, y] of [[-10, -38], [-9, -29], [10, -38], [9, -29]]) rivetD(g, x, y, 1.3);
  }
  formD(g, ell(-11, -44, 7, 4.6, -0.3), [-11, -44, 7, 4.6], '#4a5068', { flash: fl, spec: 0.5, lw: 2.2 });      // pauldron
  // the head: a pale masked face with two horns
  spikeD(g, 1, -58, -1.9, 12, 2.4, '#ece9e1', fl); spikeD(g, 12, -59, -1.1, 11, 2.4, '#ece9e1', fl);
  maskD(g, 6, -52, 9.6, 9.2, { fill: fl ? '#fff' : null, glow: wind ? '#ff6a4a' : '#9fb4e8', eyeA: wind ? 1 : 0.7, lean: 1, brow: 1, crack: 0.8 });
  // the sword: a grip, a guard, a fuller and a gleam
  g.save(); g.translate(14, -34); g.rotate(wind ? -2.2 * w - 0.4 : (charge ? 0.9 : 0.5));
  g.strokeStyle = INK; g.lineWidth = 6.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2, 0); g.lineTo(14, 0); g.stroke(); g.strokeStyle = fl ? '#fff' : '#4a3626'; g.lineWidth = 3.6; g.stroke();
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(15, -7); g.lineTo(15, 7); g.stroke(); g.strokeStyle = fl ? '#fff' : '#b8985a'; g.lineWidth = 2.4; g.stroke();
  g.beginPath(); g.moveTo(16, -3.8); g.lineTo(46, -1); g.lineTo(16, 4); g.closePath(); const bg = g.createLinearGradient(0, -4, 0, 4); bg.addColorStop(0, fl ? '#fff' : '#f4f7fb'); bg.addColorStop(1, fl ? '#fff' : '#8f98a8'); g.fillStyle = bg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
  if (!fl) { g.strokeStyle = 'rgba(80,90,110,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(18, 0); g.lineTo(42, -0.4); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(18, -2.2); g.lineTo(40, -1.2); g.stroke(); }
  g.restore();
  if (wind) bloom(g, 20, -40, 50, '#ff7a5a', 0.12 + w * 0.3);
  g.restore();
};

Art.enemy.shade = function (g, e, t) {          // the shade of a fallen wanderer: black smoke, a pale horned face, burning eyes
  const fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.cy); g.scale(e.face || 1, 1);
  glow(g, 0, 0, 72, '#0a0c14', 0.65);
  for (let i = 0; i < 7; i++) {
    const a = t * 1.8 + i * 0.9; g.strokeStyle = 'rgba(8,10,18,0.85)'; g.lineWidth = 5 - i * 0.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(Math.cos(a) * 18, 10 + Math.sin(a) * 10, Math.cos(a * 0.8) * 30, 20 + Math.sin(a) * 10 + i * 1.5); g.stroke();
  }
  g.beginPath(); g.moveTo(-15, 20); for (let i = 0; i <= 5; i++) g.lineTo(-15 + i * 6, 22 + (i % 2 ? 8 : 0) + Math.sin(t * 6 + i) * 3);
  g.lineTo(15, 4); g.quadraticCurveTo(19, -16, 0, -22); g.quadraticCurveTo(-19, -16, -15, 4); g.closePath();
  const bg = g.createLinearGradient(0, -22, 0, 26); bg.addColorStop(0, fl ? '#fff' : '#161a2a'); bg.addColorStop(1, fl ? '#fff' : '#04050a'); g.fillStyle = bg; g.fill(); g.strokeStyle = fl ? '#fff' : 'rgba(120,140,200,0.55)'; g.lineWidth = 2; g.stroke();
  if (!fl) { g.save(); g.clip(); hatchD(g, [0, 0, 16, 24], 30, 1.3, '#6a78a8', 0.28, { len: 7, w: 0.8, seed: 9 }); g.restore(); }
  spikeD(g, -7, -18, -2.0, 16, 3.2, '#1a1e30', fl); spikeD(g, 7, -18, -1.14, 16, 3.2, '#1a1e30', fl);
  for (const s of [-1, 1]) { g.save(); g.translate(s * 5.5, -6); g.rotate(-s * 0.18); bloom(g, 0, 0, 14, '#dfe8ff', 0.9); g.fillStyle = '#f4f8ff'; g.beginPath(); g.ellipse(0, 0, 3.4, 5.6, 0, 0, 7); g.fill(); g.fillStyle = '#0a0c14'; g.beginPath(); g.ellipse(0.3, 0.6, 1.2, 3.2, 0, 0, 7); g.fill(); g.restore(); }
  g.restore();
};
Art.enemy.shadeEnemy = Art.enemy.shade;

Art.enemy.diver = function (g, e, t) {          // a masked mosquito: striped abdomen, veined wings, a long needle
  const tele = e.currentState === 'anticipation', atk = e.currentState === 'attack', fl = e.flash > 0;
  g.save(); g.translate(e.cx + (tele ? Math.sin(t * 60) * 1.5 : 0), e.cy);
  const ang = atk || tele ? (e.aim || 0) : (e.face > 0 ? 0 : Math.PI);
  g.rotate(ang); if (Math.cos(ang) < 0) g.scale(1, -1);
  const flap = Math.sin(t * 44);
  wingD(g, -3, -4, -1.35 + flap * 0.3, 20, 14, '#d4e4f4', { flash: fl, veins: 5, alpha: 0.72 }); wingD(g, 1, -4, -0.8 - flap * 0.3, 17, 12, '#e8f2fc', { flash: fl, veins: 4, alpha: 0.62 });
  for (const [x, a, l] of [[-5, 1.9, 13], [-1, 1.6, 14], [3, 1.3, 12]]) legD(g, [x, 4, x + Math.cos(a) * l * 0.5, 4 + Math.sin(a) * l * 0.4 + 2, x + Math.cos(a - 0.4) * l, 4 + Math.sin(a) * l * 0.8 + 4], 0.9, '#3a2418', { flash: fl, claw: 2, clawAng: 1.3 });
  formD(g, ell(-13, 3, 10, 6.2, 0.3), [-13, 3, 10, 6.2], '#6a3a2a', { flash: fl, spec: 0.4, lw: 2.4 });
  if (!fl) { g.save(); g.beginPath(); ell(-13, 3, 10, 6.2, 0.3)(g); g.clip(); g.strokeStyle = 'rgba(240,215,180,0.7)'; g.lineWidth = 1.2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-20 + k * 4.4, -4); g.lineTo(-18.5 + k * 4.4, 11); g.stroke(); } g.restore(); }
  formD(g, ell(-3, 1, 5.4, 4.6), [-3, 1, 5.4, 4.6], '#8a5a3a', { flash: fl, spec: 0.4, lw: 2.2 });
  g.strokeStyle = INK; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, 1.2); g.lineTo(31, 2); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#e0d2b8'; g.lineWidth = 1.6; g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(10, 0.6); g.lineTo(29, 1.4); g.stroke();
  antennaD(g, 4, -6, -1.1, 9, 0.4, '#c8b89c', { flash: fl, segs: 4, w: 1.1 });
  maskD(g, 2.5, 0, 8.6, 8.2, { fill: fl ? '#fff' : null, glow: tele ? '#ff8a4a' : '#ffcf8a', eyeA: 0.85, lean: 1, teeth: true });
  g.restore();
  if (tele) bloom(g, e.cx, e.cy, 36, '#ff8a4a', 0.4);
};

Art.enemy.spider = function (g, e, t) {         // a round spider: marked abdomen, eight jointed legs, a masked face with spare eyes and fangs
  const fl = e.flash > 0;
  if (e.currentState === 'idle' && e.hanging && e.anchorY !== null) { g.strokeStyle = 'rgba(230,230,245,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(e.cx, e.anchorY); g.lineTo(e.cx, e.y + 4); g.stroke(); }
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face || 1, 1);
  const hang = e.currentState === 'idle' && e.hanging, walk = Math.sin(t * 16) * (e.currentState === 'chase' ? 3 : 0);
  if (!hang) groundD(g, 22);
  for (let i = 0; i < 4; i++) {                    // legs: far four darker
    for (const far of [true, false]) {
      const lx = -12 + i * 8 + (far ? 3 : 0), s = (i + (far ? 1 : 0)) % 2 ? 1 : -1;
      legD(g, [lx * 0.45, -11, lx - 4 + (far ? 3 : 0), hang ? -25 : -22, lx * 1.25 + s * walk, hang ? -6 : 0], far ? 1.5 : 1.9, far ? '#1a1626' : '#2e2840', { flash: fl, claw: 2.4, clawAng: 1.35 });
    }
  }
  formD(g, ell(-4, -13, 13, 10), [-4, -13, 13, 10], '#2e2840', { flash: fl, spec: 0.5, lw: 2.8 });
  if (!fl) {
    g.save(); g.beginPath(); ell(-4, -13, 13, 10)(g); g.clip();
    hatchD(g, [-4, -13, 13, 10], 60, 1.4, '#08060e', 0.45, { len: 4.5, w: 0.8, seed: 11 }); hatchD(g, [-8, -17, 8, 5], 20, 0.6, '#c8aaff', 0.3, { len: 4, w: 0.7, seed: 12 });
    g.fillStyle = 'rgba(200,170,255,0.55)'; poly(g, [-8, -17, -4, -13, -8, -8, -12, -13]); g.fill(); g.strokeStyle = 'rgba(8,6,14,0.7)'; g.lineWidth = 1; g.stroke();
    g.restore();
  }
  // the head
  maskD(g, 9, -12, 7.2, 6.8, { fill: fl ? '#fff' : null, glow: '#e07aff', eyeA: 0.85, lean: 1, brow: 1 });
  if (!fl) { g.fillStyle = '#12101c'; for (const [x, y, r] of [[8.5, -17.4, 1], [11.5, -16.4, 0.9], [5.6, -16.6, 0.8]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); g.fill(); g.fillStyle = '#12101c'; } }
  clawD(g, 14.5, -7, 1.2, 5, 1.5, '#e6dcc4', fl); clawD(g, 11.5, -6.6, 1.5, 4.4, 1.4, '#e6dcc4', fl);
  g.restore();
};
Art.enemy.brood_child = Art.enemy.spider;

Art.enemy.shroom = function (g, e, t) {         // a walking toadstool: gilled cap, speckled, a sleepy-eyed face on the stem
  const puff = e.currentState === 'anticipation' ? clamp(e.stateT / 0.5, 0, 1) : 0, walk = e.currentState === 'patrol' ? Math.sin(t * 8) * 2 : 0, fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  groundD(g, 18);
  legD(g, [-4, -8, -5 + walk * 0.4, -4, -5.4 + walk, 0], 2.6, '#cdbd9a', { flash: fl }); legD(g, [5, -8, 6 - walk * 0.4, -4, 6.6 - walk, 0], 2.6, '#d8caa8', { flash: fl });
  formD(g, ell(0, -14, 9.4, 9.4), [0, -14, 9.4, 9.4], '#e8dcc0', { flash: fl, spec: 0.4, lw: 2.6 });
  if (!fl) { g.save(); g.beginPath(); ell(0, -14, 9.4, 9.4)(g); g.clip(); g.strokeStyle = 'rgba(120,96,60,0.4)'; g.lineWidth = 0.8; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 4, -24); g.quadraticCurveTo(k * 4.6, -14, k * 3.6, -4); g.stroke(); } g.restore(); }
  eyeD(g, 3.2, -15.5, 2.4, 2.5, { iris: '#7a5a2a', pupil: 'round', lid: 0.35, lidc: '#c8b890', look: [0.5, 0] }); eyeD(g, 7.4, -15.5, 2.2, 2.4, { iris: '#7a5a2a', lid: 0.35, lidc: '#c8b890', look: [0.5, 0] });
  g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(3.4, -10.2); g.quadraticCurveTo(5.4, -9, 7.6, -10.4); g.stroke(); g.fillStyle = 'rgba(220,120,110,0.5)'; g.beginPath(); g.arc(1.6, -11.6, 1.6, 0, 7); g.fill();
  const cw = 18 + puff * 5, ct = -40 - puff * 6;
  const cap = c => { c.moveTo(-cw, -18); c.quadraticCurveTo(-cw, ct, 0, ct); c.quadraticCurveTo(cw, ct, cw, -18); c.quadraticCurveTo(0, -24, -cw, -18); c.closePath(); };
  formD(g, cap, [0, -29, cw, 12], '#d8a040', { flash: fl, spec: 0.5, hi: '#f4cc78', lo: '#8a5a1a', lw: 3 });
  if (!fl) {
    g.save(); g.beginPath(); cap(g); g.clip();
    g.strokeStyle = 'rgba(90,50,10,0.55)'; g.lineWidth = 0.9; for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(k * 3, -20.5); g.lineTo(k * 2.2, -17.5); g.stroke(); }                    // gills under the rim
    for (const [x, y, rx, ry] of [[-7, -30, 3.6, 2.6], [6, -33, 3.2, 2.4], [11, -24, 2.6, 2], [-13, -25, 2.2, 1.8], [0, -36, 2.4, 1.8], [-3, -26, 1.6, 1.2]]) { const sg = g.createRadialGradient(x - 1, y - 1, 0, x, y, rx); sg.addColorStop(0, '#fffbe8'); sg.addColorStop(1, '#e8d8a8'); g.fillStyle = sg; g.beginPath(); g.ellipse(x, y, rx, ry, -0.2, 0, 7); g.fill(); g.strokeStyle = 'rgba(90,60,20,0.5)'; g.lineWidth = 0.6; g.stroke(); }
    hatchD(g, [0, -30, cw * 0.9, 9], 24, 1.57, '#6a3a0a', 0.3, { len: 4, w: 0.7, seed: 21 });
    g.restore();
  }
  if (puff > 0) bloom(g, 16, -20, 30, '#e8d070', puff * 0.5);
  g.restore();
};

Art.enemy.jelly = function (g, e, t) {          // a drifting jelly: a clear bell with glowing organs, ruffled rim and beaded tendrils
  const x = e.cx, y = e.cy - 4, r = 15 + Math.sin(t * 3 + e.ph) * 1.5, fl = e.flash > 0;
  bloom(g, x, y, 56, '#ffb070', 0.28);
  g.save(); g.translate(x, y);
  for (let k = -3; k <= 3; k++) {                  // tendrils with glowing beads
    const sx = k * 4.6, sw = Math.sin(t * 3 + k) * 5; g.strokeStyle = 'rgba(235,220,255,0.6)'; g.lineWidth = 1.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, 3); g.quadraticCurveTo(sx * 1.2 + sw, 14, sx * 0.8, 24 + (k % 2) * 4); g.stroke();
    for (let b = 1; b <= 3; b++) { const u = b / 3.4; g.fillStyle = 'rgba(255,200,140,' + (0.7 - u * 0.3) + ')'; g.beginPath(); g.arc(sx * (1 + 0.2 * u) + sw * u * u, 3 + u * 21, 1.1, 0, 7); g.fill(); }
  }
  const bell = c => { c.arc(0, 0, r, Math.PI, 0); c.quadraticCurveTo(r * 0.55, 6, r * 0.2, 2.6); c.quadraticCurveTo(0, 6.5, -r * 0.2, 2.6); c.quadraticCurveTo(-r * 0.55, 6, -r, 0); c.closePath(); };
  g.beginPath(); bell(g); const bg = g.createLinearGradient(0, -r, 0, 6); bg.addColorStop(0, fl ? '#fff' : 'rgba(250,236,255,0.55)'); bg.addColorStop(1, fl ? '#fff' : 'rgba(190,160,240,0.3)'); g.fillStyle = bg; g.fill();
  if (!fl) {
    g.save(); g.beginPath(); bell(g); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.9; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(k * r * 0.2, -r * 0.5, k * r * 0.24, -r * 0.95); g.stroke(); }           // radial canals
    const og = g.createRadialGradient(0, -r * 0.32, 0, 0, -r * 0.32, r * 0.5); og.addColorStop(0, 'rgba(255,230,160,1)'); og.addColorStop(1, 'rgba(255,150,80,0.1)'); g.fillStyle = og; g.beginPath(); g.ellipse(0, -r * 0.32, r * 0.34, r * 0.32, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,170,90,0.7)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -r * 0.32, r * 0.2, r * 0.18, 0.4, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.62, r * 0.18, r * 0.09, -0.6, 0, 7); g.fill();
    g.restore();
  }
  g.beginPath(); bell(g); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
  g.strokeStyle = 'rgba(235,220,255,0.9)'; g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k <= 8; k++) { const px = -r + k * r / 4, py = 1.5 + (k % 2 ? 1.6 : 0); k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  g.restore();
};

Art.enemy.warden = function (g, e, t) {         // a shield-bearer: a helmed mask, a gorget, a tabard with a device, a tall studded shield
  const st = e.currentState, wind = st === 'anticipation', bash = st === 'attack', fl = e.flash > 0, w = wind ? clamp(e.stateT / 0.55, 0, 1) : 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  groundD(g, 26);
  const walk = st === 'patrol' || st === 'chase' ? Math.sin(t * (st === 'chase' ? 9 : 5)) * 2.4 : 0;
  legD(g, [-7, -16, -8 + walk * 0.4, -8, -8 + walk, 0], 4, '#4a3a2a', { flash: fl, claw: 3.2, clawAng: 0.2 }); legD(g, [7, -16, 8 - walk * 0.4, -8, 8 - walk, 0], 4, '#54422f', { flash: fl, claw: 3.2, clawAng: 0.2 });
  g.beginPath(); g.moveTo(-13, -15); g.lineTo(13, -15); g.lineTo(16, -2 + Math.sin(t * 3) * 0.6); g.lineTo(8, -5); g.lineTo(0, -1); g.lineTo(-8, -5); g.lineTo(-16, -2); g.closePath();   // the tabard
  const tg = g.createLinearGradient(0, -15, 0, 0); tg.addColorStop(0, fl ? '#fff' : '#7a4a30'); tg.addColorStop(1, fl ? '#fff' : '#40261a'); g.fillStyle = tg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.lineJoin = 'round'; g.stroke();
  if (!fl) { g.fillStyle = '#e8c870'; poly(g, [0, -13, 3, -9, 0, -5, -3, -9]); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.9; g.stroke(); }
  formD(g, ell(0, -30, 14, 17), [0, -30, 14, 17], '#6b5a3c', { flash: fl, spec: 0.45, lw: 3 });
  if (!fl) { g.save(); g.beginPath(); ell(0, -30, 14, 17)(g); g.clip(); for (let i = -2; i <= 2; i++) { g.strokeStyle = 'rgba(20,14,6,0.7)'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(-13, -30 + i * 7); g.quadraticCurveTo(0, -27 + i * 7, 13, -30 + i * 7); g.stroke(); g.strokeStyle = 'rgba(255,230,170,0.26)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-12, -31 + i * 7); g.quadraticCurveTo(0, -28 + i * 7, 12, -31 + i * 7); g.stroke(); } hatchD(g, [0, -30, 13, 16], 30, 0.3, '#1a1208', 0.35, { len: 4, w: 0.8, seed: 14 }); g.restore(); for (const [x, y] of [[-7, -42], [7, -42], [-9, -26], [9, -26]]) rivetD(g, x, y, 1.2); }
  formD(g, ell(0, -44, 11, 4.4), [0, -44, 11, 4.4], '#8a7a56', { flash: fl, spec: 0.4, lw: 2.2 });                 // the gorget
  // the helm: a rounded dome over the mask, a nose guard, a crest
  formD(g, c => { c.moveTo(-11, -54); c.quadraticCurveTo(-12, -68, 0, -68); c.quadraticCurveTo(12, -68, 11, -54); c.lineTo(8, -55); c.lineTo(-8, -55); c.closePath(); }, [0, -61, 11, 8], '#7a7e88', { flash: fl, spec: 0.5, lw: 2.6 });
  maskD(g, 1.5, -51, 8.4, 8.2, { fill: fl ? '#fff' : null, glow: wind ? '#ff7a4a' : '#e0c890', eyeA: wind ? 1 : 0.7, lean: 1, brow: 1, crack: 0.5 });
  if (!fl) { g.fillStyle = '#5a5e68'; g.fillRect(-0.4, -58, 3.4, 9); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(-0.4, -58, 3.4, 9); }
  spikeD(g, -2, -67, -1.9, 9, 2.2, '#c8c2b0', fl);
  // the shield: a tall plate, rim studs, an embossed eye, drawn back while winding up and thrust out in the bash
  const sx = 14 + (bash ? 9 : 0) - w * 7;
  g.save(); g.translate(sx, -30);
  const sh = c => { c.moveTo(-3, -34); c.lineTo(13, -30); c.lineTo(15, 4); c.lineTo(13, 30); c.lineTo(-3, 34); c.lineTo(-7, 0); c.closePath(); };
  formD(g, sh, [4, 0, 11, 34], '#8a8f9a', { flash: fl, spec: 0.5, lw: 3.2 });
  if (!fl) {
    g.save(); g.beginPath(); sh(g); g.clip(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-8, -35, 5, 70); hatchD(g, [4, 0, 10, 32], 40, 1.57, '#2a2e38', 0.3, { len: 6, w: 0.8, seed: 31 }); g.restore();
    g.strokeStyle = 'rgba(30,34,44,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -26); g.lineTo(9, -23); g.lineTo(10, 4); g.lineTo(9, 24); g.lineTo(0, 27); g.lineTo(-2, 0); g.closePath(); g.stroke();
    for (const y of [-27, -13, 13, 27]) rivetD(g, 5, y, 1.4);
    g.save(); g.translate(5, 0); bloom(g, 0, 0, 16, '#ff9c5a', 0.55 + w * 0.4); g.fillStyle = '#ffb870'; g.beginPath(); g.ellipse(0, 0, 3.4, 5.4, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); g.fillStyle = '#3a1608'; g.beginPath(); g.ellipse(0.3, 0.2, 1.1, 3.4, 0, 0, 7); g.fill(); g.restore();
  }
  g.restore();
  if (e.blocked > 0) bloom(g, sx + 6, -30, 40, '#fff3c4', 0.8);
  if (wind) bloom(g, sx + 6, -30, 50, '#ff9c5a', 0.1 + w * 0.3);
  g.restore();
};

Art.enemy.ram = function (g, e, t) {            // a shaggy horned beast: ridged curled horns, a skull-pale face, steaming breath
  const st = e.currentState, wind = st === 'anticipation', charge = st === 'attack', dazed = st === 'recoil' && e.crashed, fl = e.flash > 0;
  const sw = charge ? Math.sin(t * 28) * 4 : (st === 'patrol' ? Math.sin(t * 7) * 2 : 0);
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1); g.rotate(charge ? 0.1 : 0);
  groundD(g, 34);
  legD(g, [-18, -14, -19 - sw * 0.4, -7, -21 - sw, 0], 5, '#2e2620', { flash: fl, claw: 3.6, clawAng: 0.3, clawCol: '#1a1410' }); legD(g, [10, -14, 9 - sw * 0.4, -7, 9 - sw, wind ? -3 - Math.abs(Math.sin(t * 16)) * 5 : 0], 5, '#2e2620', { flash: fl, claw: 3.6, clawAng: 0.3, clawCol: '#1a1410' });
  // the body: a shaggy mass, its outline ragged with tufts
  g.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, rr = 1 + (k % 2 ? 0.1 : -0.02) + Math.sin(k * 1.9) * 0.04; g.lineTo(-2 + Math.cos(a) * 26 * rr, -22 + Math.sin(a) * 14 * rr); } g.closePath();
  const bgd = g.createLinearGradient(-14, -38, 10, -6); bgd.addColorStop(0, fl ? '#fff' : '#7a6a5a'); bgd.addColorStop(0.5, fl ? '#fff' : '#4b4038'); bgd.addColorStop(1, fl ? '#fff' : '#241c18'); g.fillStyle = bgd; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke();
  if (!fl) {
    g.save(); g.beginPath(); ell(-2, -22, 26, 14)(g); g.clip();
    hatchD(g, [-2, -24, 26, 12], 110, 0.35, '#120c08', 0.5, { len: 8, w: 1, spread: 0.6, seed: 17 }); hatchD(g, [-8, -30, 18, 6], 70, 0.2, '#d8c8a8', 0.28, { len: 7, w: 0.9, spread: 0.6, seed: 18 });
    g.restore();
  }
  legD(g, [-9, -14, -9 + sw * 0.4, -7, -8 + sw, 0], 5.4, '#3e342c', { flash: fl, claw: 3.8, clawAng: 0.3, clawCol: '#1a1410' }); legD(g, [19, -14, 20 + sw * 0.4, -7, 21 + sw, 0], 5.4, '#3e342c', { flash: fl, claw: 3.8, clawAng: 0.3, clawCol: '#1a1410' });
  // the head
  g.save(); g.translate(22, -24); g.rotate(wind ? 0.3 : (dazed ? 0.5 + Math.sin(t * 9) * 0.08 : 0));
  g.beginPath(); g.moveTo(-9, -8); g.bezierCurveTo(-13, -29, -33, -19, -22, 0); g.bezierCurveTo(-26, -15, -14, -18, -5, -4); g.closePath();                 // the far horn
  g.fillStyle = fl ? '#fff' : '#a89870'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
  formD(g, c => { c.moveTo(-8, -9); c.quadraticCurveTo(8, -13, 17, -3); c.quadraticCurveTo(19, 6, 10, 9); c.quadraticCurveTo(-4, 12, -9, 4); c.closePath(); }, [4, 0, 14, 11], '#e6dcc6', { flash: fl, spec: 0.4, lw: 2.8 });
  if (!fl) { g.strokeStyle = 'rgba(60,50,40,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-4, -8); g.lineTo(-2, -2); g.moveTo(2, -10); g.lineTo(3, -4); g.stroke(); g.fillStyle = 'rgba(30,24,20,0.8)'; g.beginPath(); g.ellipse(15, 1, 1.4, 2.2, 0.2, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(6, 6); g.quadraticCurveTo(12, 8, 16, 5); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(8 + k * 2.2, 6.2); g.lineTo(8.6 + k * 2.2, 8.2); g.stroke(); } }
  eyeD(g, 6.5, -2.6, 3.2, 3, { iris: (wind || charge) ? '#ff4a2a' : '#b86a2a', pupil: 'slit', angry: 0.8, lidc: '#cbbea4', glow: (wind || charge) ? '#ff6a4a' : null, glowA: 0.6, look: [0.5, 0] });
  g.beginPath(); g.moveTo(-4, -8); g.bezierCurveTo(-14, -28, -31, -14, -20, -2); g.bezierCurveTo(-24, -14, -12, -18, -2, -6); g.closePath();                      // the near horn, with growth rings
  const hg = g.createLinearGradient(-30, -20, 0, 0); hg.addColorStop(0, fl ? '#fff' : '#f0e6c2'); hg.addColorStop(1, fl ? '#fff' : '#a08c58'); g.fillStyle = hg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  if (!fl) { g.save(); g.clip(); g.strokeStyle = 'rgba(70,50,20,0.5)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-6 - k * 4, -9 + k * 0.4); g.quadraticCurveTo(-9 - k * 4, -5, -4 - k * 4, 0); g.stroke(); } g.restore(); }
  g.restore();
  if (wind || charge) { g.fillStyle = 'rgba(235,240,250,0.35)'; for (let k = 0; k < 3; k++) { const u = (t * 3 + k / 3) % 1; g.beginPath(); g.arc(34 + u * 12, -20 - u * 6, 2 + u * 3, 0, 7); g.fill(); } }
  if (wind) bloom(g, 28, -20, 60, '#ff7a5a', 0.2);
  g.restore();
};

Art.enemy.mole = Art.enemy.lavaworm = function (g, e, t) {   // frost: a furred digger with spade claws; ember: a glowing worm with a toothed maw
  const lava = e.kind === 'lavaworm', fl = e.flash > 0, st = e.currentState;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  if (e.buried) {                                   // a mound of loose earth, trembling before it erupts
    const tre = st === 'anticipation', k = tre ? 1 + e.stateT * 0.7 : 1, sh = tre ? Math.sin(t * 60) * 1.6 : 0;
    g.translate(sh, 0);
    formD(g, ell(0, 1, 22 * k, 8 * k), [0, 1, 22 * k, 8 * k], lava ? '#2c1a16' : '#cfe0ee', { flash: fl, spec: 0.3, lw: 2.6 });
    if (!fl) { g.save(); g.beginPath(); ell(0, 1, 22 * k, 8 * k)(g); g.clip(); hatchD(g, [0, 1, 22, 8], 40, 0.2, lava ? '#0a0604' : '#6a8aa8', 0.5, { len: 6, w: 1, seed: 33 }); g.restore(); for (const [x, y, r] of [[-12, -5, 3], [8, -6, 2.4], [15, -3, 2], [-4, -8, 2]]) { formD(g, ell(x, y, r, r * 0.8), [x, y, r, r], lava ? '#4a2a20' : '#e8f2fa', { spec: 0.3, lw: 1.4 }); } }
    if (lava) bloom(g, 0, -4, 28, '#ff7a30', 0.3 + (tre ? 0.3 : 0));
    g.restore(); return;
  }
  const rise = st === 'digging' ? clamp(1 - e.stateT / 0.45, 0, 1) : 1;
  g.translate(0, (1 - rise) * 24); g.rotate(st === 'attack' ? -0.25 : 0);
  groundD(g, 28);
  if (!lava) {                                      // the digger
    formD(g, ell(-4, -14, 19, 15), [-4, -14, 19, 15], '#dfe9f2', { flash: fl, spec: 0.4, lw: 3 });
    if (!fl) { g.save(); g.beginPath(); ell(-4, -14, 19, 15)(g); g.clip(); hatchD(g, [-4, -14, 19, 15], 120, 0.3, '#7a96b0', 0.45, { len: 7, w: 1, spread: 0.7, seed: 41 }); hatchD(g, [-10, -22, 14, 6], 70, 0.2, '#ffffff', 0.5, { len: 6, w: 1, spread: 0.7, seed: 42 }); g.restore(); }
    formD(g, ell(15, -16, 11, 10), [15, -16, 11, 10], '#eef5fb', { flash: fl, spec: 0.4, lw: 3 });
    for (const [ex, ey, a] of [[10, -24, -0.6], [18, -25.5, -0.2]]) { formD(g, ell(ex, ey, 3.6, 4.4, a), [ex, ey, 3.6, 4.4], '#f4b8c0', { flash: fl, spec: 0.2, lw: 1.6 }); }
    poly(g, [22, -17, 34, -13, 22, -9]); fs(g, fl ? '#fff' : '#f4b8c0', INK, 2.4); g.fillStyle = fl ? '#fff' : '#7a3a48'; g.beginPath(); g.ellipse(33, -13, 1.8, 1.4, 0, 0, 7); g.fill();
    eyeD(g, 17.5, -20, 2, 2.2, { iris: '#2a2030', pupil: 'none', sclera: '#d8e0ea', look: [0.6, 0], irisK: 0.9 });
    if (!fl) { g.strokeStyle = 'rgba(40,40,60,0.7)'; g.lineWidth = 0.7; for (const dy of [-1.6, 0.4]) { g.beginPath(); g.moveTo(27, -13 + dy); g.lineTo(38, -15 + dy * 2.6); g.stroke(); } }          // whiskers
    for (const cx of [3, 13]) { g.save(); g.translate(cx, -4); g.beginPath(); g.moveTo(0, -3); g.quadraticCurveTo(8, -5, 12, 3); g.lineTo(2, 3); g.closePath(); g.fillStyle = fl ? '#fff' : '#9fb4c8'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); for (const k of [3, 6.5, 10]) { clawD(g, k, 1.6, 1.3, 4.2, 1, '#e8eef4', fl); } g.restore(); }       // spade claws
  } else {                                          // the worm: glowing seams between plated rings
    for (let i = 4; i >= 0; i--) {
      const x = -22 + i * 11, y = -10 - Math.sin(t * 6 + i * 0.9) * 3 - (i > 2 ? 6 : 0), r = 8 + i * 1.4;
      formD(g, ell(x, y, r, r - 1), [x, y, r, r], '#3a1a14', { flash: fl, spec: 0.4, lw: 2.8, hi: '#7a4636', rimc: '255,150,80' });
      if (!fl) { g.save(); g.beginPath(); ell(x, y, r, r - 1)(g); g.clip(); const gl = 0.55 + 0.25 * Math.sin(t * 5 + i); g.strokeStyle = 'rgba(255,140,50,' + gl + ')'; g.lineWidth = 1.6; g.beginPath(); g.arc(x + r * 0.35, y, r * 0.9, 1.8, 4.5); g.stroke(); g.fillStyle = 'rgba(255,130,50,' + gl * 0.8 + ')'; g.beginPath(); g.ellipse(x - 1, y + 2, r * 0.45, r * 0.28, 0, 0, 7); g.fill(); hatchD(g, [x, y, r, r], 14, 1.0, '#0a0604', 0.5, { len: 4, w: 0.8, seed: 43 + i }); g.restore(); }
    }
    bloom(g, 14, -18, 50, '#ff7a30', 0.35);
    formD(g, c => { c.moveTo(18, -27); c.quadraticCurveTo(30, -26, 35, -18); c.lineTo(22, -14); c.quadraticCurveTo(14, -16, 14, -22); c.closePath(); }, [24, -21, 12, 8], '#5a2a1a', { flash: fl, spec: 0.4, lw: 2.6 });
    if (!fl) { g.fillStyle = '#1a0806'; g.beginPath(); g.moveTo(22, -18); g.lineTo(35, -18); g.lineTo(33, -14); g.lineTo(22, -14); g.closePath(); g.fill(); for (let k = 0; k < 5; k++) { g.fillStyle = '#f6ecd0'; poly(g, [23 + k * 2.4, -18, 24.2 + k * 2.4, -14.6, 25.4 + k * 2.4, -18]); g.fill(); } }
    eyeD(g, 21, -22, 2.4, 2.4, { iris: '#ffe070', pupil: 'slit', glow: '#ffb040', glowA: 0.7, angry: 0.6, lidc: '#3a1a14' });
    spikeD(g, 15, -26, -1.7, 8, 2, '#6a3a24', fl);
  }
  g.restore();
};

Art.enemy.imp = function (g, e, t) {            // a small red imp: horns, pointed ears, a fanged grin, a barbed tail, a lit bomb
  const st = e.currentState, wind = st === 'anticipation', fl = e.flash > 0, w = wind ? clamp(e.stateT / 0.5, 0, 1) : 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  groundD(g, 18);
  const walk = Math.abs(e.vx) > 10 ? Math.sin(t * 14) * 3 : 0, tail = Math.sin(t * 5) * 3;
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, -14); g.quadraticCurveTo(-26, -8, -21 + tail, -29); g.stroke(); g.strokeStyle = fl ? '#fff' : '#c0391f'; g.lineWidth = 2.6; g.stroke();
  g.save(); g.translate(-21 + tail, -29); g.rotate(-0.9); poly(g, [0, -4.5, 8, 0, 0, 4.5]); g.fillStyle = fl ? '#fff' : '#8a1a10'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke(); g.restore();   // the barb
  legD(g, [-5, -10, -6.5 + walk * 0.4, -5, -6 + walk, 0], 3, '#8a2214', { flash: fl, claw: 2.6, clawAng: 0.5 }); legD(g, [5, -10, 6.5 - walk * 0.4, -5, 7 - walk, 0], 3, '#a52d1c', { flash: fl, claw: 2.6, clawAng: 0.5 });
  wingD(g, -4, -26, -2.3, 14, 10, '#8a2a30', { flash: fl, veins: 4, alpha: 0.85 });                           // small bat wings
  formD(g, ell(0, -20, 11, 12), [0, -20, 11, 12], '#a52d1c', { flash: fl, spec: 0.45, lw: 3, rimc: '255,170,120' });
  if (!fl) { g.save(); g.beginPath(); ell(0, -20, 11, 12)(g); g.clip(); hatchD(g, [0, -20, 11, 12], 36, 0.4, '#3a0a06', 0.45, { len: 4, w: 0.8, seed: 51 }); formD(g, ell(2, -16, 6, 7), [2, -16, 6, 7], '#e0a070', { spec: 0.2, rim: 0, lw: 1.2 }); g.restore(); }       // a paler belly
  // the head
  spikeD(g, -1, -39, -2.0, 11, 2.6, '#f0d8a0', fl); spikeD(g, 9, -40, -1.2, 11, 2.6, '#f0d8a0', fl);
  formD(g, ell(-5, -35, 4.6, 2.2, -0.5), [-5, -35, 4.6, 2.2], '#c0391f', { flash: fl, spec: 0.2, lw: 1.8 }); formD(g, ell(12.5, -35, 4.4, 2.2, 0.5), [12, -35, 4.4, 2.2], '#c0391f', { flash: fl, spec: 0.2, lw: 1.8 });   // ears
  formD(g, ell(3.4, -34, 9.2, 8.6), [3.4, -34, 9.2, 8.6], '#c0391f', { flash: fl, spec: 0.5, lw: 3, rimc: '255,190,140' });
  eyeD(g, 6.5, -36, 2.6, 2.9, { iris: '#ffe070', pupil: 'slit', glow: '#ffb040', glowA: 0.55, angry: 0.9, lidc: '#8a1a10' }); eyeD(g, 12, -35.4, 2.2, 2.6, { iris: '#ffe070', pupil: 'slit', angry: 0.9, lidc: '#8a1a10', look: [0.3, 0] });
  if (!fl) { g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, -30); g.quadraticCurveTo(8, -27.4, 13, -30.6); g.stroke(); g.fillStyle = '#f6f0dc'; poly(g, [6, -29.4, 7.3, -26.4, 8.4, -28.6]); g.fill(); poly(g, [10.2, -29.4, 11.4, -26.6, 12.4, -29.8]); g.fill(); g.fillStyle = 'rgba(30,6,4,0.7)'; g.beginPath(); g.ellipse(13.2, -32.2, 0.8, 1.1, 0, 0, 7); g.fill(); }
  g.save(); g.translate(8, -22); g.rotate(wind ? -1.9 * w - 0.5 : -0.2);       // the throwing arm
  legD(g, [0, 0, 5.5, 1, 11, 0], 3, '#a52d1c', { flash: fl, claw: 2, clawAng: 0 });
  if (st === 'anticipation' || st === 'chase' && e.cool < 0.5) {
    formD(g, ell(15, 0, 6.5, 6.5), [15, 0, 6.5, 6.5], '#3a3036', { flash: fl, spec: 0.5, lw: 2.4 }); bloom(g, 15, -6, 22, '#ffb060', 0.5 + 0.3 * Math.sin(t * 30));
    g.strokeStyle = '#d8b878'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(15, -6.5); g.quadraticCurveTo(18, -11, 21, -9.5); g.stroke(); g.fillStyle = '#fff1a0'; g.beginPath(); g.arc(21, -9.5, 2.1 + Math.sin(t * 40) * 0.6, 0, 7); g.fill();
    if (!fl) { g.fillStyle = 'rgba(255,170,90,0.9)'; g.beginPath(); g.arc(15, -2, 0.9, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,140,60,0.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(10.5, 0); g.lineTo(19, -2.5); g.moveTo(12, 4); g.lineTo(18, 2); g.stroke(); }
  }
  g.restore();
  g.restore();
};

Art.enemy.veil = function (g, e, t) {           // a veiled wraith: layered drapes with folds, a hollow hood with a pale half-seen face, thin hands
  const st = e.currentState, a = clamp(e.alpha, 0, 1), fl = e.flash > 0;
  if (a < 0.02) return;
  g.save(); g.translate(e.cx, e.cy + 8); g.scale(e.face, 1); g.globalAlpha *= a;
  bloom(g, 0, -10, 74, '#bfe6ff', 0.25 * a);
  const wake = st === 'appear' || st === 'attack' || st === 'vulnerable';
  for (const [k, c1, c2, sc] of [[1, 'rgba(110,140,190,0.9)', 'rgba(60,84,130,0.9)', 1.06], [0, 'rgba(150,185,225,0.88)', 'rgba(84,116,170,0.88)', 1]]) {   // two layers of drapery
    g.beginPath(); g.moveTo(-14 * sc, -34); g.quadraticCurveTo(-22 * sc, -4, (-18 + Math.sin(t * 4 + k) * 3) * sc, 24);
    for (let i = 0; i <= 5; i++) g.lineTo((-18 + i * 7 + Math.sin(t * 5 + i + k) * 2.4) * sc, 24 + (i % 2) * 9 + k * 2);
    g.quadraticCurveTo(22 * sc, -4, 14 * sc, -34); g.closePath();
    const gr = g.createLinearGradient(-20, -34, 20, 30); gr.addColorStop(0, fl ? '#fff' : c1); gr.addColorStop(1, fl ? '#fff' : c2); g.fillStyle = gr; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.lineJoin = 'round'; g.stroke();
    if (!k && !fl) { g.save(); g.clip(); g.strokeStyle = 'rgba(20,30,60,0.45)'; g.lineWidth = 1.1; for (let f = -3; f <= 3; f++) { g.beginPath(); g.moveTo(f * 4.4, -30); g.quadraticCurveTo(f * 6 + Math.sin(t * 3 + f) * 2, -2, f * 5.6, 28); g.stroke(); } g.strokeStyle = 'rgba(220,240,255,0.32)'; for (let f = -3; f <= 3; f++) { g.beginPath(); g.moveTo(f * 4.4 - 1.4, -30); g.quadraticCurveTo(f * 6 - 1.4, -2, f * 5.6 - 1.4, 28); g.stroke(); } g.restore(); }
  }
  for (const s of [-1, 1]) {                       // thin pale hands, folded in the drapes
    g.save(); g.translate(s * 9, -6); g.rotate(s * 0.25); g.fillStyle = fl ? '#fff' : '#d8e6f4'; g.strokeStyle = INK; g.lineWidth = 1.4; for (let f = 0; f < 4; f++) { g.beginPath(); g.moveTo(f * 1.6 - 2.4, 0); g.lineTo(f * 1.9 - 3.2, 8 + (f % 2)); g.stroke(); } formD(g, ell(0, -1, 3.6, 2.6), [0, -1, 3.6, 2.6], '#d8e6f4', { flash: fl, spec: 0.3, lw: 1.4 }); g.restore();
  }
  formD(g, ell(0, -36, 11.5, 12.5), [0, -36, 11.5, 12.5], '#1c2638', { flash: fl, spec: 0, rim: 0.12, hi: '#222d44', lw: 2.8 });                     // the hood's hollow
  if (!fl) { g.save(); g.beginPath(); ell(0, -36, 10, 11)(g); g.clip(); const fg = g.createRadialGradient(5, -36, 1, 5, -36, 11); fg.addColorStop(0, wake ? 'rgba(220,244,255,0.5)' : 'rgba(150,180,220,0.25)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fg; g.fillRect(-12, -50, 24, 28); g.restore(); }
  for (const [x, r] of [[3.6, 2.6], [10, 2.4]]) { g.save(); g.translate(x, -37); bloom(g, 0, 0, 10, wake ? '#e8fbff' : '#8fb4d8', wake ? 0.9 : 0.5); g.fillStyle = wake ? '#f2fcff' : '#9fc0e0'; g.beginPath(); g.ellipse(0, 0, r * 0.85, r * 1.35, 0, 0, 7); g.fill(); g.restore(); }
  if (!fl) { g.strokeStyle = wake ? 'rgba(220,244,255,0.7)' : 'rgba(120,150,190,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3, -29.6); g.quadraticCurveTo(7, -28, 11, -30); g.stroke(); }
  if (st === 'attack') {                                                                                     // the slash
    g.strokeStyle = 'rgba(235,250,255,0.95)'; g.lineWidth = 5; g.beginPath(); g.arc(18, -10, 50, -1.0, 0.9); g.stroke();
    g.strokeStyle = 'rgba(160,210,255,0.5)'; g.lineWidth = 11; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(18, -10, 56, -0.9, 0.8); g.stroke();
  }
  g.restore();
};

Art.enemy.roller = function (g, e, t) {         // an armoured rolling beast: banded plates, a small wary face, a ball of spikes when it rolls
  const st = e.currentState, ball = st === 'attack' || st === 'anticipation', fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  if (ball) {
    groundD(g, 22);
    const sh = st === 'anticipation' ? Math.sin(t * 50) * 1.6 : 0;
    g.translate(sh, -15); if (st === 'attack') g.rotate(e.face * t * 14);
    formD(g, ell(0, 0, 16, 16), [0, 0, 16, 16], '#9a8460', { flash: fl, spec: 0.5, lw: 3 });
    if (!fl) {
      g.save(); g.beginPath(); ell(0, 0, 16, 16)(g); g.clip();
      for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 16, i * 1.57 + 0.2, i * 1.57 + 1.3); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(i * 1.57) * 16, Math.sin(i * 1.57) * 16); g.stroke(); g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.cos(i * 1.57 + 0.12) * 2, Math.sin(i * 1.57 + 0.12) * 2); g.lineTo(Math.cos(i * 1.57 + 0.12) * 15, Math.sin(i * 1.57 + 0.12) * 15); g.stroke(); }
      hatchD(g, [0, 0, 15, 15], 40, 0.8, '#1a1208', 0.35, { len: 4, w: 0.8, seed: 61 }); g.restore();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4; spikeD(g, Math.cos(a) * 15, Math.sin(a) * 15, a, 5, 2, '#d8c8a0', false); }
    }
  } else {
    const walk = Math.abs(e.vx) > 5 ? Math.sin(t * 9) * 2 : 0, dz = st === 'dizzy' ? Math.sin(t * 8) * 0.12 : 0;
    groundD(g, 28); g.rotate(dz);
    legD(g, [-10, -9, -10.5 + walk * 0.4, -4, -11 + walk, 0], 4, '#6a5a3c', { flash: fl, claw: 3, clawAng: 0.4 }); legD(g, [10, -9, 10.5 - walk * 0.4, -4, 11 - walk, 0], 4, '#6a5a3c', { flash: fl, claw: 3, clawAng: 0.4 });
    domeD(g, -2, -15, 20, 13, 7, '#9a8460', { flash: fl, seed: 62, seam: 2.6 });
    if (!fl) for (const x of [-14, -8, -2, 4, 10]) { g.fillStyle = 'rgba(255,240,200,0.5)'; g.beginPath(); g.ellipse(x, -25, 2.2, 0.9, 0, 0, 7); g.fill(); }
    formD(g, ell(17, -12, 8, 7), [17, -12, 8, 7], '#c8b088', { flash: fl, spec: 0.4, lw: 2.8 });
    formD(g, ell(13, -17, 2.6, 3.2, -0.3), [13, -17, 2.6, 3.2], '#a89068', { flash: fl, spec: 0.2, lw: 1.6 });
    eyeD(g, 19.5, -14, 2.2, 2.4, { iris: '#7a4a1a', pupil: 'round', look: [0.6, 0.1] }); g.fillStyle = 'rgba(40,30,20,0.85)'; g.beginPath(); g.ellipse(24, -10.6, 1.1, 1.5, 0, 0, 7); g.fill();
    if (!fl) { g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(16, -8.6); g.quadraticCurveTo(20, -7.2, 23, -9); g.stroke(); }
    if (st === 'dizzy') { g.strokeStyle = '#ffe9a0'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.beginPath(); g.arc(Math.cos(a) * 12 + 12, -28 + Math.sin(a) * 3, 2, 0, 7); g.stroke(); } }
  }
  g.restore();
};

Art.enemy.slime = Art.enemy.slimelet = function (g, e, t) {   // a clear jelly with a nucleus, drifting bubbles, a droopy rim and a wobbly face
  const st = e.currentState, sq = st === 'anticipation' ? 1 - 0.3 * clamp(e.stateT / 0.3, 0, 1) : (!e.onGround ? 1.18 : 1 + Math.sin(t * 3 + e.x) * 0.04), fl = e.flash > 0;
  const W = e.w * 0.5, H = e.h, sm = !!e.small;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale((2 - sq) * 1, sq);
  groundD(g, W + 6);
  const body = c => { c.moveTo(-W - 1.5, 0); c.bezierCurveTo(-W - 4, -H * 0.9, W + 4, -H * 0.9, W + 1.5, 0); c.quadraticCurveTo(W * 0.5, 2.4, 0, 0.6); c.quadraticCurveTo(-W * 0.5, 2.4, -W - 1.5, 0); c.closePath(); };
  g.beginPath(); body(g); const bg = g.createLinearGradient(0, -H, 0, 2); bg.addColorStop(0, fl ? '#fff' : 'rgba(190,235,255,0.92)'); bg.addColorStop(1, fl ? '#fff' : 'rgba(70,160,230,0.85)'); g.fillStyle = bg; g.fill();
  if (!fl) {
    g.save(); g.beginPath(); body(g); g.clip();
    const ng = g.createRadialGradient(0, -H * 0.3, 0, 0, -H * 0.3, W * 0.8); ng.addColorStop(0, 'rgba(30,90,170,0.75)'); ng.addColorStop(1, 'rgba(30,90,170,0)'); g.fillStyle = ng; g.beginPath(); g.ellipse(0, -H * 0.3, W * 0.8, H * 0.28, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.9; for (const [x, y, r] of [[-W * 0.55, -H * 0.35, 1.8], [W * 0.5, -H * 0.2, 1.4], [W * 0.15, -H * 0.62, 1.2], [-W * 0.2, -H * 0.12, 1]]) { const bob = Math.sin(t * 2 + x) * 0.8; g.beginPath(); g.arc(x, y + bob, r, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-W * 0.45, -H * 0.66, W * 0.26, H * 0.1, -0.5, 0, 7); g.fill(); g.beginPath(); g.arc(-W * 0.12, -H * 0.8, 1.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,70,140,0.35)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-W, -1); g.quadraticCurveTo(0, 3, W, -1); g.stroke();
    g.restore();
  }
  g.beginPath(); body(g); g.strokeStyle = INK; g.lineWidth = sm ? 2.4 : 3; g.lineJoin = 'round'; g.stroke();
  const er = sm ? 1.9 : 2.8; eyeD(g, -W * 0.28, -H * 0.4, er, er * 1.25, { iris: '#1a3a6a', sclera: '#f4fbff', look: [0.3, 0.3], irisK: 0.8 }); eyeD(g, W * 0.28, -H * 0.4, er, er * 1.25, { iris: '#1a3a6a', sclera: '#f4fbff', look: [0.3, 0.3], irisK: 0.8 });
  g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-W * 0.18, -H * 0.2); g.quadraticCurveTo(0, -H * (st === 'anticipation' ? 0.12 : 0.16), W * 0.18, -H * 0.2); g.stroke();
  g.restore();
};

Art.enemy.chainman = function (g, e, t) {       // a heavy guard in a bucket helm with an eye-slit, mail and belts, whirling a spiked ball on a chain
  const st = e.currentState, fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  groundD(g, 28);
  const walk = Math.abs(e.vx) > 5 ? Math.sin(t * 8) * 2.4 : 0;
  legD(g, [-8, -16, -9 + walk * 0.4, -8, -9.5 + walk, 0], 5, '#3a2a2a', { flash: fl, claw: 3.4, clawAng: 0.2, clawCol: '#8a8a96' }); legD(g, [8, -16, 9 - walk * 0.4, -8, 9.5 - walk, 0], 5, '#46322e', { flash: fl, claw: 3.4, clawAng: 0.2, clawCol: '#8a8a96' });
  formD(g, c => { c.moveTo(-17, -14); c.lineTo(17, -14); c.lineTo(20, -1); c.lineTo(-20, -1); c.closePath(); }, [0, -8, 18, 7], '#4a3a38', { flash: fl, spec: 0.3, lw: 2.8 });
  if (!fl) { g.strokeStyle = 'rgba(10,6,6,0.6)'; g.lineWidth = 1; for (let x = -16; x <= 16; x += 4) { g.beginPath(); g.moveTo(x, -13); g.lineTo(x + (x > 0 ? 1.4 : -1.4), -2); g.stroke(); } }
  formD(g, ell(0, -32, 17, 19), [0, -32, 17, 19], '#6a6a74', { flash: fl, spec: 0.5, lw: 3.2 });
  if (!fl) {
    g.save(); g.beginPath(); ell(0, -32, 17, 19)(g); g.clip(); scalesD(g, [0, -32, 17, 19], 3.6, 'rgba(10,10,16,0.5)', 'rgba(255,255,255,0.18)');       // mail
    for (const y of [-20, -14]) { g.fillStyle = '#5a3a24'; g.fillRect(-18, y, 36, 3.6); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(-18, y, 36, 3.6); }                 // belts
    g.restore(); g.fillStyle = '#c8a860'; g.fillRect(-2.6, -20.4, 5.2, 4.4); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(-2.6, -20.4, 5.2, 4.4); for (const [x, y] of [[-12, -40], [12, -40]]) rivetD(g, x, y, 1.3);
  }
  formD(g, ell(-9, -43, 8, 4.4, -0.3), [-9, -43, 8, 4.4], '#8a8a96', { flash: fl, spec: 0.5, lw: 2.2 }); spikeD(g, -13, -45, -2.2, 7, 2, '#b8b8c4', fl); spikeD(g, 11, -45, -0.9, 7, 2, '#b8b8c4', fl);     // pauldrons
  formD(g, c => { c.moveTo(-10, -52); c.lineTo(10, -52); c.lineTo(12, -40); c.lineTo(-12, -40); c.closePath(); }, [0, -46, 11, 7], '#7a7a86', { flash: fl, spec: 0.5, lw: 2.8 });   // the helm
  if (!fl) { g.fillStyle = '#0c0a0e'; g.fillRect(-8, -48.6, 17, 3); const st2 = st === 'attack' ? '#ff9c5a' : '#d86a2a'; bloom(g, 1, -47, 12, st2, 0.7); g.fillStyle = st2; g.fillRect(-5, -47.8, 11, 1.2); g.fillStyle = '#5a5a66'; g.fillRect(-1, -52, 2, 12); for (const y of [-44, -42]) { g.fillStyle = '#0c0a0e'; g.fillRect(4 + (y + 44) * 2, y, 1.2, 1.2); } for (const [x, y] of [[-8, -51], [8, -51], [-9, -41], [9, -41]]) rivetD(g, x, y, 1); }
  g.restore();
  if (e.ball) {                                                                                                // the chain, link by link, and the spiked ball
    const hx = e.cx + e.face * 12, hy = e.y + e.h - 36, dx = e.ball.x - hx, dy = e.ball.y - hy, n = Math.max(3, Math.round(Math.hypot(dx, dy) / 6));
    for (let k = 1; k < n; k++) { const u = k / n, x = hx + dx * u, y = hy + dy * u + Math.sin(u * Math.PI) * 3; g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx) + (k % 2 ? 1.2 : 0)); g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.ellipse(0, 0, 3.4, 2, 0, 0, 7); g.stroke(); g.strokeStyle = '#a8a8b4'; g.lineWidth = 1.6; g.stroke(); g.restore(); }
    g.save(); g.translate(e.ball.x, e.ball.y); g.rotate(e.ang * 2);
    if (st === 'attack') bloom(g, 0, 0, 44, '#ff9c5a', 0.28);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; spikeD(g, Math.cos(a) * 9, Math.sin(a) * 9, a, 11, 3.4, '#b4b4c0', fl); }
    formD(g, ell(0, 0, 12, 12), [0, 0, 12, 12], '#3a3a44', { flash: fl, spec: 0.55, lw: 2.8 }); if (!fl) { for (let i = 0; i < 4; i++) rivetD(g, Math.cos(i * 1.57 + 0.78) * 6, Math.sin(i * 1.57 + 0.78) * 6, 1.3); }
    g.restore();
  }
};

Art.enemy.moth = function (g, e, t) {           // a night moth: furred body, plumed feelers, wings patterned with eyespots, drifting dust
  const st = e.currentState, fl = e.flash > 0, flap = Math.sin(t * (st === 'attack' ? 38 : 22) + e.ph);
  const gl = st === 'anticipation' ? 0.45 + e.stateT * 0.9 : 0.35;
  g.save(); g.translate(e.cx, e.cy); g.scale(e.face || 1, 1);
  bloom(g, 0, 0, 84 + (st === 'anticipation' ? e.stateT * 120 : 0), '#ffd890', gl);
  for (const sgn of [-1, 1]) {
    g.save(); g.translate(-2, -2); g.rotate(sgn * (0.35 + flap * 0.5)); if (sgn > 0) g.globalAlpha *= 0.9;
    const wing = c => { c.moveTo(0, 0); c.quadraticCurveTo(-20, sgn * -24, -5, sgn * -28); c.quadraticCurveTo(9, sgn * -24, 11, sgn * -10); c.quadraticCurveTo(8, sgn * -2, 0, 0); c.closePath(); };
    g.beginPath(); wing(g); const wg = g.createLinearGradient(0, 0, -8, sgn * -28); wg.addColorStop(0, fl ? '#fff' : 'rgba(255,232,170,0.95)'); wg.addColorStop(1, fl ? '#fff' : 'rgba(214,150,80,0.9)'); g.fillStyle = wg; g.fill();
    if (!fl) {
      g.save(); g.beginPath(); wing(g); g.clip();
      g.strokeStyle = 'rgba(120,70,20,0.5)'; g.lineWidth = 0.8; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(-18 + k * 4, sgn * (-27 + k * 1.2)); g.stroke(); }
      hatchD(g, [-4, sgn * -16, 10, 12], 40, 1.0, '#fff4d0', 0.35, { len: 4, w: 0.8, seed: 71 });
      for (const [x, y, r] of [[-4, sgn * -17, 4.6], [3, sgn * -8, 2.6]]) { const eg = g.createRadialGradient(x, y, 0, x, y, r); eg.addColorStop(0, '#2a1608'); eg.addColorStop(0.45, '#2a1608'); eg.addColorStop(0.55, '#ffe9a8'); eg.addColorStop(0.8, '#c8541a'); eg.addColorStop(1, '#6a2a10'); g.fillStyle = eg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.2, 0, 7); g.fill(); }
      g.restore();
    }
    g.beginPath(); wing(g); g.strokeStyle = INK; g.lineWidth = 2.4; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }
  formD(g, ell(0, 0, 6, 10), [0, 0, 6, 10], '#6a4a38', { flash: fl, spec: 0.3, lw: 2.4 }); if (!fl) { g.save(); g.beginPath(); ell(0, 0, 6, 10)(g); g.clip(); hatchD(g, [0, 0, 6, 10], 40, 1.5, '#e8c8a0', 0.5, { len: 3, w: 0.9, seed: 72 }); g.restore(); }
  formD(g, ell(6, -6, 4.8, 4.8), [6, -6, 4.8, 4.8], '#8a5a42', { flash: fl, spec: 0.3, lw: 2.2 }); if (!fl) { g.save(); g.beginPath(); ell(6, -6, 4.8, 4.8)(g); g.clip(); hatchD(g, [6, -6, 5, 5], 24, 1.0, '#f0d0b0', 0.5, { len: 2.6, w: 0.8, seed: 73 }); g.restore(); }
  eyeD(g, 8.4, -6.8, 2.1, 2.3, { iris: '#ffd860', pupil: 'round', glow: '#ffe890', glowA: 0.5, look: [0.5, 0] });
  for (const [x, a, c] of [[7, -1.2, 0.5], [4.6, -1.65, 0.35]]) { g.save(); g.translate(x, -10); g.rotate(a); g.strokeStyle = INK; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.quadraticCurveTo(8, -c * 10, 14, -c * 4); g.stroke(); g.strokeStyle = fl ? '#fff' : '#d8b890'; g.lineWidth = 1.1; g.stroke(); g.strokeStyle = fl ? '#fff' : '#c8a070'; g.lineWidth = 0.8; for (let k = 1; k <= 5; k++) { const u = k / 6; const px = u * 14, py = -c * 4 * u - c * 10 * u * (1 - u); g.beginPath(); g.moveTo(px, py); g.lineTo(px - 1, py - 3.4); g.moveTo(px, py); g.lineTo(px - 1, py + 3.4); g.stroke(); } g.restore(); }
  if (!fl) for (let k = 0; k < 4; k++) { const u = (t * 0.8 + k * 0.27) % 1; g.fillStyle = 'rgba(255,230,160,' + (0.55 * (1 - u)) + ')'; g.beginPath(); g.arc(-4 - k * 3, 6 + u * 14, 1 + (k % 2) * 0.6, 0, 7); g.fill(); }
  g.restore();
};

Art.enemy.icicle = function (g, e, t) {         // a hanging spike of ice (or basalt in Cinderdeep): faceted, refracting, a droplet on the point, cracks before it falls
  if (e.gone) return;
  const ember = G.level && G.level.def.theme === 'ember', fl = e.flash > 0, tre = e.currentState === 'anticipation';
  g.save(); g.translate(e.x + e.w / 2, e.y);
  const lit = tre ? 0.5 + 0.5 * Math.sin(t * 40) : 0, H = e.h;
  const base = ember ? '#3a2428' : '#bfe4f8';
  const sp = c => { c.moveTo(-9, 0); c.lineTo(9, 0); c.lineTo(5, 24); c.lineTo(0.6, H); c.lineTo(-4, 24); c.closePath(); };
  g.beginPath(); sp(g); const gr = g.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, fl ? '#fff' : mix(base, '#ffffff', ember ? 0.3 : 0.7)); gr.addColorStop(0.5, fl ? '#fff' : base); gr.addColorStop(1, fl ? '#fff' : mix(base, '#000000', ember ? 0.4 : 0.35)); g.fillStyle = gr; g.fill();
  if (!fl) {
    g.save(); g.beginPath(); sp(g); g.clip();
    g.fillStyle = ember ? 'rgba(255,170,110,0.2)' : 'rgba(255,255,255,0.55)'; poly(g, [-6, 1, -1.5, 1, 0, 14, -1, 30, -3.4, 22]); g.fill();                         // the lit facet
    g.strokeStyle = ember ? 'rgba(255,120,50,' + (0.5 + lit * 0.4) + ')' : 'rgba(255,255,255,0.65)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0.4, 1); g.lineTo(0.6, H - 2); g.moveTo(-6, 1); g.lineTo(-2, 20); g.moveTo(6, 1); g.lineTo(3, 20); g.stroke();
    g.strokeStyle = ember ? 'rgba(0,0,0,0.5)' : 'rgba(60,110,150,0.4)'; g.lineWidth = 0.8; for (const y of [8, 15, 22]) { g.beginPath(); g.moveTo(-8 + y * 0.12, y); g.lineTo(8 - y * 0.12, y + 1); g.stroke(); }
    if (ember) { g.strokeStyle = 'rgba(255,140,60,' + (0.7 + lit * 0.3) + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-3, 4); g.lineTo(0, 12); g.lineTo(-2, 20); g.lineTo(1, 28); g.stroke(); }
    else { g.strokeStyle = 'rgba(40,80,120,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(3, 6); g.lineTo(1, 13); g.lineTo(3.4, 19); g.stroke(); }
    g.restore();
  }
  g.beginPath(); sp(g); g.strokeStyle = INK; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke();
  if (!fl && !ember) { const dr = (t * 0.9 + e.x * 0.01) % 1; g.fillStyle = 'rgba(210,240,255,0.9)'; g.beginPath(); g.ellipse(0.6, H + 3 + dr * 8, 1.4, 2.2 + dr, 0, 0, 7); g.fill(); }
  if (e.currentState === 'attack') { g.strokeStyle = 'rgba(220,245,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -34); g.stroke(); }
  if (tre) bloom(g, 0, H * 0.6, 34, ember ? '#ff8a4a' : '#bfe8ff', 0.2 + lit * 0.2);
  g.restore();
};

// =============================================================== the bosses, in detail
function bossStars(g, b, t, col, dx, dy) { if (b.stunned) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.fillStyle = col || '#ffe98a'; g.save(); g.translate(b.cx + dx + Math.cos(a) * 28, b.y + dy + Math.sin(a) * 6); g.rotate(a); poly(g, [0, -4, 1.2, 0, 0, 4, -1.2, 0]); g.fill(); g.rotate(1.57); poly(g, [0, -4, 1.2, 0, 0, 4, -1.2, 0]); g.fill(); g.restore(); } }

Art.boss.guardian = function (g, b, t) {           // a giant plated pill bug: a mossy cracked shell, a masked face with jaws, a shell mace
  const fl = b.flash > 0, tele = b.tele > 0, stun = b.stunned;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2.5, 0);
  telGlow(g, b, '#ffb347', 0, -60, 130); groundD(g, 74);
  const step = b.vx !== 0 ? Math.sin(t * 14) * 4 : 0;
  for (const [x0, s, far] of [[-30, 1, 1], [-12, -1, 1], [8, 1, 0], [26, -1, 0]]) legD(g, [x0 * 0.8, -30, x0 - 9 + s * step, -17, x0 - 4 + s * step, 0], far ? 4.6 : 5.6, far ? '#2a190e' : '#4a2c1a', { flash: fl, claw: 8, clawAng: 1.25, clawCol: '#d8c8a8' });
  legD(g, [-30, -62, -50, -46, -42, -22], 6.4, '#5a3a24', { flash: fl, claw: 8, clawAng: 1.4, clawCol: '#d8c8a8' });                       // the back arm
  domeD(g, -4, -62, 48, 44, 6, '#8a5a38', { flash: fl, seed: 8, seam: 3.4, lw: 4 });
  if (!fl) {
    g.save(); g.beginPath(); ell(-4, -62, 48, 44)(g); g.clip();
    g.strokeStyle = 'rgba(20,10,4,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-26, -100); g.lineTo(-20, -84); g.lineTo(-30, -70); g.lineTo(-24, -56); g.moveTo(14, -104); g.lineTo(8, -88); g.lineTo(16, -74); g.stroke();      // cracks
    for (const [x, y, r] of [[-34, -78, 7], [-16, -98, 5], [20, -92, 6]]) { const mg = g.createRadialGradient(x, y, 0, x, y, r); mg.addColorStop(0, 'rgba(120,190,90,0.9)'); mg.addColorStop(1, 'rgba(60,110,40,0)'); g.fillStyle = mg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); hatchD(g, [x, y, r, r], 10, -1.57, '#b8f080', 0.7, { len: 4, w: 0.8, seed: x }); }              // moss
    g.restore();
    for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.5; rivetD(g, -4 + Math.cos(a) * 41, -62 + Math.sin(a) * 37, 2); }
  }
  // the head tucked under the lip of the shell
  const hy = stun ? -74 : -82;
  antennaD(g, 30, hy - 11, -1.0, 24, 0.45, '#d8c8a0', { flash: fl, segs: 6, w: 2.6, knob: '#f2e6c8' }); antennaD(g, 22, hy - 12, -1.4, 22, 0.3, '#d8c8a0', { flash: fl, segs: 6, w: 2.4 });
  maskD(g, 26, hy, 15.5, 14.5, { fill: fl ? '#fff' : null, glow: tele ? '#ffb347' : '#e8c070', eyeA: tele ? 1 : 0.75, lean: 1, brow: 1, crack: 1, teeth: true });
  clawD(g, 38, hy + 9, 0.6, 12, 3, '#e6dcc4', fl); clawD(g, 36, hy + 12, 1.15, 10, 2.6, '#e6dcc4', fl);                    // jaws
  // the mace arm and the mace
  let ang = 0.9;
  if (tele) ang = -2.3 + Math.sin(t * 18) * 0.05; else if (b.melee) ang = 0.15; else if (b.vx !== 0) ang = -0.3;
  g.save(); g.translate(30, -64); g.rotate(ang);
  legD(g, [0, 0, 28, -3, 52, 0], 8, '#5a3a24', { flash: fl });
  formD(g, c => { c.moveTo(-2, -9); c.lineTo(22, -11); c.lineTo(24, 11); c.lineTo(-2, 9); c.closePath(); }, [11, 0, 12, 10], '#6a6a74', { flash: fl, spec: 0.5, lw: 2.8 });          // vambrace
  if (!fl) { for (const x of [4, 12, 20]) rivetD(g, x, 0, 1.4); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; spikeD(g, 72 + Math.cos(a) * 22, Math.sin(a) * 22, a, 14, 4, '#e8e0cc', fl); }
  domeD(g, 72, 0, 24, 22, 4, '#8a5a38', { flash: fl, seed: 9, seam: 2.6, lw: 3.4 });
  if (!fl) { g.strokeStyle = '#3a3a44'; g.lineWidth = 3; g.beginPath(); g.ellipse(72, 0, 25, 23, 0, 0, 7); g.stroke(); rivetD(g, 72, 0, 3); }
  g.restore();
  g.restore();
  bossStars(g, b, t, '#ffe98a', 0, -6);
};

Art.boss.weaver = function (g, b, t) {             // a mantis duelist: a slender jointed body, leaf-wing cloak, a narrow masked head, a scythe arm and a needle
  const fl = b.flash > 0, tele = b.tele > 0;
  g.save(); g.translate(b.cx, b.y + b.h);
  if (b.spinning) { g.translate(0, -b.h / 2); g.rotate(t * 28 * b.face); g.translate(0, b.h / 2); }
  g.scale(b.face, 1);
  if (b.vx !== 0 && !b.spinning) g.rotate(0.2);
  telGlow(g, b, '#ff6a5a', 0, -46, 90); groundD(g, 40);
  const run = Math.abs(b.vx) > 20 ? Math.sin(t * 20) * 6 : 0;
  legD(g, [-4, -34, -15 - run, -17, -9 - run, 0], 3.2, '#3a2a1c', { flash: fl, claw: 6, clawAng: 1.3, clawCol: '#e8dcc0' }); legD(g, [4, -34, 15 + run, -17, 11 + run, 0], 3.4, '#4a3624', { flash: fl, claw: 6, clawAng: 1.3, clawCol: '#e8dcc0' });
  legD(g, [0, -36, -21, -25, -24, -4], 2.8, '#2a1c12', { flash: fl, claw: 5, clawAng: 1.4, clawCol: '#e8dcc0' });
  // the wing cloak: layered leaf-wings with veins
  wingD(g, -3, -58, 2.5, 38, 26, '#2c6a40', { flash: fl, veins: 7, alpha: 0.92, lw: 2.6 }); wingD(g, -1, -56, 2.1, 30, 20, '#3a8050', { flash: fl, veins: 6, alpha: 0.9, lw: 2.4 });
  formD(g, ell(-12, -40, 17, 8.5, 0.5), [-12, -40, 17, 8.5], '#6a4a2c', { flash: fl, spec: 0.4, lw: 2.8 });                  // abdomen
  if (!fl) { g.save(); g.beginPath(); ell(-12, -40, 17, 8.5, 0.5)(g); g.clip(); g.strokeStyle = 'rgba(240,210,150,0.6)'; g.lineWidth = 1.4; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-26 + k * 5, -50); g.lineTo(-22 + k * 5, -30); g.stroke(); } g.restore(); }
  formD(g, c => { c.moveTo(-5, -38); c.quadraticCurveTo(-9, -58, 0, -66); c.quadraticCurveTo(9, -58, 5, -38); c.closePath(); }, [0, -52, 8, 14], '#3a2a20', { flash: fl, spec: 0.45, lw: 3 });           // thorax
  if (!fl) { g.strokeStyle = 'rgba(190,150,100,0.55)'; g.lineWidth = 1; for (const y of [-44, -50, -56]) { g.beginPath(); g.moveTo(-5, y); g.quadraticCurveTo(0, y + 2.4, 5, y); g.stroke(); } }
  antennaD(g, -2, -80, -1.9, 28, 0.5, '#c8a878', { flash: fl, segs: 7, w: 1.8 }); antennaD(g, 4, -80, -1.3, 30, 0.35, '#c8a878', { flash: fl, segs: 7, w: 1.8, knob: '#f0d8a0' });
  formD(g, c => { c.moveTo(-8, -76); c.quadraticCurveTo(-7, -86, 2, -86); c.quadraticCurveTo(12, -85, 11, -74); c.quadraticCurveTo(6, -64, 1, -64); c.quadraticCurveTo(-6, -66, -8, -76); c.closePath(); }, [1, -75, 10, 11], '#ece9e1', { flash: fl, spec: 0.4, lw: 2.8 });
  for (const [ex, ey, rr] of [[-2, -75, 2.8], [6, -75.4, 2.5]]) eyeD(g, ex, ey, rr, rr * 1.7, { iris: tele ? '#ff3a2a' : '#c83a2a', pupil: 'slit', sclera: '#2a1c1c', glow: tele ? '#ff4a3a' : null, glowA: 0.7, angry: 0.7, lidc: '#ece9e1', rot: ex < 0 ? 0.2 : -0.2 });
  if (!fl) { g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(0, -67.6); g.quadraticCurveTo(2.6, -66, 5.4, -68); g.stroke(); }
  clawD(g, 5, -65, 0.9, 5, 1.4, '#d8cdb0', fl); clawD(g, -3, -65.5, 2.2, 5, 1.4, '#d8cdb0', fl);                                // mandibles
  // the scythe arm and the needle
  g.save(); g.translate(4, -56); g.rotate(tele ? -1.4 : (b.melee ? 0.1 : 0.6));
  legD(g, [0, 0, 20, 5, 30, -6], 4.4, '#3a2a1c', { flash: fl });
  for (let k = 0; k < 4; k++) spikeD(g, 8 + k * 5, 3 - k * 0.4, 1.1, 5, 1.6, '#b8a888', fl);                                      // thorns along the forearm
  g.strokeStyle = INK; g.lineWidth = 5.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, -6); g.lineTo(74, -6); g.stroke(); g.strokeStyle = fl ? '#fff' : '#f6e2b0'; g.lineWidth = 2.8; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(32, -7.4); g.lineTo(72, -7); g.stroke(); poly(g, [74, -8, 82, -6, 74, -4]); g.fillStyle = fl ? '#fff' : '#f6e2b0'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
  g.restore();
  g.restore();
  if (b.melee && !b.spinning) { g.save(); g.globalAlpha = 0.7; g.strokeStyle = '#fff6d8'; g.lineWidth = 3; const r = b.meleeRect(); g.beginPath(); g.moveTo(r.x, r.y + 10); g.lineTo(r.x + r.w, r.y + r.h / 2); g.stroke(); g.restore(); }
  if (b.spinning) { g.save(); g.strokeStyle = 'rgba(255,240,200,0.7)'; g.lineWidth = 3; ellipse(g, b.cx, b.cy, 62, 38); g.stroke(); g.restore(); }
};

Art.boss.wraith = function (g, b, t) {             // a crystal wraith: a faceted body, a mask in the crystal, a core of light, orbiting shards
  const fl = b.flash > 0, tele = b.tele > 0;
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.cy);
  bloom(g, 0, 0, 130, '#ff8fd0', 0.2 + (tele ? 0.3 : 0));
  const shard = (x, y, rot, s) => { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -6.5); g.lineTo(16, 0); g.lineTo(0, 6.5); g.closePath(); const sg = g.createLinearGradient(0, -6, 0, 6); sg.addColorStop(0, fl ? '#fff' : '#f0a0ff'); sg.addColorStop(1, fl ? '#fff' : '#6a2a96'); g.fillStyle = sg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.lineJoin = 'round'; g.stroke(); if (!fl) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-10, 0); g.lineTo(14, 0); g.moveTo(-2, -5.4); g.lineTo(2, 5.4); g.stroke(); } g.restore(); };
  for (let i = 0; i < 5; i++) { const a = t * 1.8 + i * Math.PI * 2 / 5, r = 56 + Math.sin(t * 3 + i) * 6; shard(Math.cos(a) * r, Math.sin(a) * r * 0.7, a, 1); }
  const body = [[0, -48], [28, -8], [18, 38], [0, 50], [-18, 38], [-28, -8]];
  const facet = (pts, c1, c2) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); const fg = g.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]); fg.addColorStop(0, fl ? '#fff' : c1); fg.addColorStop(1, fl ? '#fff' : c2); g.fillStyle = fg; g.fill(); };
  facet([body[0], body[1], [0, 6]], '#9a58d8', '#6a3aa8'); facet([body[0], [-0, 6], body[5]], '#7a44b8', '#4a2878'); facet([[0, 6], body[1], body[2], body[3]], '#5a3098', '#2a1450'); facet([[0, 6], body[3], body[4], body[5]], '#3a1c70', '#1a0c40');
  g.beginPath(); body.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
  if (!fl) { g.strokeStyle = 'rgba(255,230,255,0.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -48); g.lineTo(0, 6); g.lineTo(28, -8); g.moveTo(0, 6); g.lineTo(-28, -8); g.stroke(); g.strokeStyle = 'rgba(20,6,40,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(12, 14); g.lineTo(6, 24); g.lineTo(11, 34); g.moveTo(-14, 6); g.lineTo(-8, 18); g.stroke(); }
  bloom(g, 0, 22, 22, '#ffffff', tele ? 0.8 : 0.35); if (!fl) { g.fillStyle = tele ? '#fff' : '#ffc0ea'; poly(g, [0, 10, 5, 22, 0, 36, -5, 22]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(); }
  maskD(g, 0, -14, 11.5, 10.5, { fill: fl ? '#fff' : null, glow: '#ff8fd0', eyeA: 0.9, brow: 1, crack: 0.7, base: '#efe6f4' });
  g.restore();
};

Art.boss.king = function (g, b, t) {               // the Hollow King: an armoured sovereign, a horned mask with a crown of spikes, a ringed halo-blade
  const fl = b.flash > 0, tele = b.tele > 0;
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 70) * 2.5, 0);
  let ang = -0.3;
  if (tele) ang = -1.2 + Math.sin(t * 16) * 0.05; else if (b.melee) ang = 0.9;
  const hx = 20 + Math.cos(ang - 1.2) * 70, hy = -132 + Math.sin(ang - 1.2) * 40;
  bloom(g, hx, hy, 120, '#ffe2a8', 0.35 + (tele ? 0.35 : 0) + (b.phase - 1) * 0.08); groundD(g, 56);
  // the cloak: a long cloth with a gold hem and folds
  g.beginPath(); g.moveTo(-34, -52); for (let i = 0; i <= 8; i++) g.lineTo(-40 + i * 10, -2 + (i % 2 ? -12 : 4) + Math.sin(t * 4 + i) * 2.5); g.lineTo(38, -52); g.closePath();
  const cg = g.createLinearGradient(0, -52, 0, 4); cg.addColorStop(0, fl ? '#fff' : '#35529a'); cg.addColorStop(1, fl ? '#fff' : '#142040'); g.fillStyle = cg; g.fill(); g.strokeStyle = INK; g.lineWidth = 3.2; g.lineJoin = 'round'; g.stroke();
  if (!fl) { g.save(); g.clip(); g.strokeStyle = 'rgba(8,14,34,0.55)'; g.lineWidth = 1.4; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 9, -50); g.quadraticCurveTo(i * 11 + Math.sin(t * 2 + i) * 2, -28, i * 13, 0); g.stroke(); } g.strokeStyle = 'rgba(200,170,90,0.7)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 8; i++) { const x = -40 + i * 10, y = -2 + (i % 2 ? -12 : 4) - 3 + Math.sin(t * 4 + i) * 2.5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore(); }
  legD(g, [-12, -30, -15, -16, -16, 0], 7.4, '#22262f', { flash: fl, claw: 6, clawAng: 0.2, clawCol: '#8a8a96' }); legD(g, [14, -30, 17, -16, 18, 0], 7.4, '#2a2e3a', { flash: fl, claw: 6, clawAng: 0.2, clawCol: '#8a8a96' });
  legD(g, [-30, -96, -52, -70, -44, -46], 8, '#2a2e3a', { flash: fl, claw: 12, clawAng: 1.5, clawCol: '#8a8a96' });                              // back arm with a claw
  // the plated torso: ribbed, riveted, with a chest sigil
  formD(g, ell(0, -80, 38, 36), [0, -80, 38, 36], '#2a2e3a', { flash: fl, spec: 0.45, lw: 4 });
  if (!fl) {
    g.save(); g.beginPath(); ell(0, -80, 38, 36)(g); g.clip();
    for (let i = -3; i <= 3; i++) { g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-40, -80 + i * 10); g.quadraticCurveTo(0, -70 + i * 10, 40, -80 + i * 10); g.stroke(); g.strokeStyle = 'rgba(190,205,245,0.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-39, -81.6 + i * 10); g.quadraticCurveTo(0, -71.6 + i * 10, 39, -81.6 + i * 10); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -118); g.lineTo(0, -44); g.stroke(); hatchD(g, [0, -80, 36, 34], 120, 0.2, '#0a0c12', 0.4, { len: 7, w: 0.9, seed: 81 });
    g.restore(); for (const [x, y] of [[-24, -100], [24, -100], [-30, -70], [30, -70], [-18, -50], [18, -50]]) rivetD(g, x, y, 2);
    g.fillStyle = '#e8d8a0'; poly(g, [0, -86, 6, -78, 0, -68, -6, -78]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); bloom(g, 0, -78, 14, '#ffe2a8', 0.4);
  }
  formD(g, ell(-26, -108, 14, 7.4, -0.3), [-26, -108, 14, 7.4], '#3a3e4a', { flash: fl, spec: 0.5, lw: 3 }); spikeD(g, -34, -112, -2.3, 14, 3.4, '#8a8a96', fl); spikeD(g, 30, -110, -0.8, 14, 3.4, '#8a8a96', fl);       // pauldrons
  // the head: horned, with a spiked crown
  spikeD(g, -2, -134, -1.9, 22, 3.2, '#ece9e1', fl); spikeD(g, 14, -135, -1.2, 22, 3.2, '#ece9e1', fl);
  for (let k = -2; k <= 2; k++) spikeD(g, 6 + k * 5, -136 + Math.abs(k) * 1.4, -1.57 + k * 0.12, 8 + (2 - Math.abs(k)) * 2, 1.8, '#c8a860', fl);
  maskD(g, 6, -124, 14.5, 13.5, { fill: fl ? '#fff' : null, glow: tele ? '#ffe2a8' : '#cfe0ff', eyeA: 0.95, lean: 1, brow: 1, crack: 1, teeth: false });
  // the weapon arm and the halo-blade: a ring with runes, spikes and a core of light
  g.save(); g.translate(26, -100); g.rotate(ang);
  legD(g, [0, 0, 22, -12, 40, -30], 8.4, '#2a2e3a', { flash: fl });
  g.translate(58, -52); g.rotate(t * 0.8);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; spikeD(g, Math.cos(a) * 45, Math.sin(a) * 41, a, 18, 5, '#c8c0a8', fl); }
  g.strokeStyle = INK; g.lineWidth = 13; ellipse(g, 0, 0, 44, 40); g.stroke(); g.strokeStyle = fl ? '#fff' : '#5a4a30'; g.lineWidth = 8; g.stroke(); g.strokeStyle = fl ? '#fff' : '#c8a860'; g.lineWidth = 2.4; g.stroke();
  if (!fl) { g.fillStyle = '#ffe8b0'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.save(); g.rotate(a); g.fillRect(41, -1.2, 6, 2.4); g.restore(); } }
  const core = g.createRadialGradient(0, 0, 2, 0, 0, 36); core.addColorStop(0, 'rgba(255,255,245,0.95)'); core.addColorStop(0.5, 'rgba(255,236,190,0.55)'); core.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = core; ellipse(g, 0, 0, 36, 33); g.fill();
  g.restore();
  g.restore();
  for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * 1.57; bloom(g, b.cx + Math.cos(a) * 80, b.y + 20 + Math.sin(a * 1.3) * 30, 10, '#ffe2a8', 0.7); }
};

Art.boss.spore = function (g, b, t) {            // the toadstool matriarch: a gilled, spotted cap, a stern masked face on the stem, root-feet, small mushrooms growing on her
  const fl = b.flash > 0, sq = b.tele > 0 && b.onGround ? 0.9 : (!b.onGround ? 1.06 : 1);
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.y + b.h); g.scale(b.face * (2 - sq), sq);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#ffb070', 0, -60, 130); groundD(g, 64);
  for (const [x, s] of [[-18, -1], [18, 1]]) { legD(g, [x, -20, x + s * 8, -10, x + s * 10, 0], 7, '#c8b890', { flash: fl }); for (let k = -1; k <= 1; k++) { g.strokeStyle = fl ? '#fff' : '#a89870'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + s * 10, 0); g.quadraticCurveTo(x + s * 14 + k * 4, 3, x + s * 18 + k * 7, 1); g.stroke(); } }
  const stem = c => { c.moveTo(-26, -60); c.quadraticCurveTo(-34, -24, -22, -12); c.lineTo(22, -12); c.quadraticCurveTo(34, -24, 26, -60); c.closePath(); };
  formD(g, stem, [0, -36, 30, 26], '#eadfc4', { flash: fl, spec: 0.35, lw: 3.6 });
  if (!fl) { g.save(); g.beginPath(); stem(g); g.clip(); g.strokeStyle = 'rgba(120,90,60,0.4)'; g.lineWidth = 1.2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 8, -60); g.quadraticCurveTo(i * 10 + 2, -36, i * 9, -12); g.stroke(); } hatchD(g, [0, -36, 28, 24], 90, 1.57, '#8a6a40', 0.3, { len: 7, w: 0.8, seed: 91 }); g.strokeStyle = 'rgba(120,90,60,0.5)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-26, -50); g.quadraticCurveTo(0, -44, 26, -50); g.stroke(); g.restore(); }       // a ring on the stem
  maskD(g, 8, -40, 15, 14, { fill: fl ? '#fff' : null, glow: '#f0c860', eyeA: 0.8, lean: 1, brow: 1, crack: 0.6, teeth: true, base: '#f0e6d0' });
  for (const [x, y, r] of [[-22, -28, 6], [-14, -20, 4], [22, -26, 5]]) { formD(g, c => { c.moveTo(x - r, y); c.quadraticCurveTo(x, y - r * 1.5, x + r, y); c.closePath(); }, [x, y - r * 0.6, r, r], '#ff9a52', { flash: fl, spec: 0.4, lw: 1.8 }); g.fillStyle = fl ? '#fff' : '#eadfc4'; g.fillRect(x - r * 0.25, y, r * 0.5, r * 0.9); }       // small mushrooms
  // the gills and the cap
  const cap = c => { c.moveTo(-60, -66); c.quadraticCurveTo(-58, -118, 0, -120); c.quadraticCurveTo(58, -118, 60, -66); c.quadraticCurveTo(0, -56, -60, -66); c.closePath(); };
  g.beginPath(); g.moveTo(-58, -66); g.quadraticCurveTo(0, -48, 58, -66); g.lineTo(58, -70); g.lineTo(-58, -70); g.fillStyle = fl ? '#fff' : '#b88a60'; g.fill();
  if (!fl) { g.strokeStyle = 'rgba(70,40,16,0.75)'; g.lineWidth = 1.1; for (let k = -28; k <= 28; k++) { const x = k * 2; g.beginPath(); g.moveTo(x, -64 + Math.abs(k) * 0.07); g.lineTo(x * 0.96, -52 + (1 - (k / 28) ** 2) * 4); g.stroke(); } }
  formD(g, cap, [0, -92, 60, 30], '#d8603a', { flash: fl, spec: 0.55, hi: '#ffb86a', lo: '#7a1c14', lw: 4 });
  if (!fl) {
    g.save(); g.beginPath(); cap(g); g.clip();
    for (const [x, y, r] of [[-34, -92, 7.5], [-10, -106, 6.5], [16, -98, 8.5], [40, -84, 5.5], [-44, -74, 4.5], [4, -80, 5.5], [-22, -104, 3.4], [32, -104, 4]]) { const sg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); sg.addColorStop(0, '#fffbe8'); sg.addColorStop(1, '#f0d8a8'); g.fillStyle = sg; g.beginPath(); g.ellipse(x, y, r, r * 0.76, -0.1, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,60,20,0.6)'; g.lineWidth = 0.9; g.stroke(); }
    hatchD(g, [0, -94, 56, 24], 150, 1.2, '#4a0c08', 0.32, { len: 8, w: 1, seed: 92 }); hatchD(g, [-26, -108, 24, 8], 50, 0.9, '#ffe0a0', 0.4, { len: 6, w: 1, seed: 93 });
    g.restore();
  }
  for (let k = 0; k < 6; k++) { const u = (t * 0.5 + k * 0.17) % 1; g.fillStyle = 'rgba(255,226,140,' + (0.7 * (1 - u)) + ')'; g.beginPath(); g.arc(-40 + k * 16 + Math.sin(t * 2 + k) * 5, -66 - u * 40, 1.4 + (k % 2), 0, 7); g.fill(); }
  g.restore();
};

Art.boss.drowned = function (g, b, t) {          // a barnacled diver: a riveted helm with a porthole and a pale face inside, banded suit, an air hose, a great anchor
  const fl = b.flash > 0, tele = b.tele > 0;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#8fe0ff', 0, -70, 130); groundD(g, 64);
  const step = b.vx !== 0 ? Math.sin(t * 14) * 5 : 0;
  legD(g, [-18, -34, -21 + step * 0.4, -16, -22 + step, 0], 11, '#2c4656', { flash: fl, claw: 0 }); legD(g, [18, -34, 21 - step * 0.4, -16, 22 - step, 0], 11, '#34505e', { flash: fl, claw: 0 });
  for (const x of [-22 + step, 22 - step]) { formD(g, ell(x, -2, 12, 5.4), [x, -2, 12, 5.4], '#4a4a44', { flash: fl, spec: 0.4, lw: 2.8 }); }                            // lead boots
  formD(g, ell(0, -62, 42, 36), [0, -62, 42, 36], '#2c4656', { flash: fl, spec: 0.45, lw: 4, rimc: '160,230,255' });
  if (!fl) {
    g.save(); g.beginPath(); ell(0, -62, 42, 36)(g); g.clip();
    for (let i = -2; i <= 2; i++) { g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2.8; g.beginPath(); g.moveTo(-44, -62 + i * 11); g.quadraticCurveTo(0, -52 + i * 11, 44, -62 + i * 11); g.stroke(); g.strokeStyle = 'rgba(170,230,255,0.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-43, -63.5 + i * 11); g.quadraticCurveTo(0, -53.5 + i * 11, 43, -63.5 + i * 11); g.stroke(); }
    hatchD(g, [0, -62, 40, 34], 100, 0.3, '#06121a', 0.35, { len: 7, w: 0.9, seed: 101 });
    g.restore(); for (const [x, y] of [[-30, -76], [30, -76], [-34, -54], [34, -54], [-22, -42], [22, -42]]) rivetD(g, x, y, 2.2);
    for (const [x, y, r] of [[-26, -40, 6], [28, -50, 5.4], [-8, -30, 5], [12, -86, 4.6], [-34, -66, 4], [4, -42, 3.4]]) {                      // barnacles
      formD(g, ell(x, y, r, r * 0.8), [x, y, r, r], '#d8d0b8', { spec: 0.4, lw: 1.8 }); g.fillStyle = '#2a2820'; g.beginPath(); g.ellipse(x, y - r * 0.15, r * 0.4, r * 0.28, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(80,70,50,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-8, -98); g.quadraticCurveTo(-34, -112, -46, -84 + Math.sin(t * 2) * 3); g.stroke(); g.strokeStyle = '#6a6a60'; g.lineWidth = 2.6; g.stroke();     // the air hose
  }
  // the helm with its glass port
  formD(g, ell(12, -106, 26, 24), [12, -106, 26, 24], '#6a7a80', { flash: fl, spec: 0.55, lw: 4, rimc: '200,240,255' });
  if (!fl) { g.save(); g.beginPath(); ell(12, -106, 26, 24)(g); g.clip(); hatchD(g, [12, -106, 24, 22], 70, 0.5, '#202a30', 0.35, { len: 6, w: 0.9, seed: 102 }); g.restore(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; rivetD(g, 16 + Math.cos(a) * 19, -106 + Math.sin(a) * 18, 1.6); } }
  formD(g, ell(16, -106, 15, 14), [16, -106, 15, 14], tele ? '#bff4ff' : '#285a6e', { flash: fl, spec: 0, rim: 0, lw: 3.2 });
  maskD(g, 16, -106, 10, 10, { fill: fl ? '#fff' : null, glow: '#9fe8ff', eyeA: 0.9, brow: 1, crack: 0.5 });
  if (!fl) { g.save(); g.beginPath(); ell(16, -106, 15, 14)(g); g.clip(); g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(10, -113, 6, 2.4, -0.5, 0, 7); g.fill(); g.restore(); }
  bloom(g, 16, -106, 40, '#8fe0ff', 0.25);
  // the anchor arm
  g.save(); g.translate(36, -72); g.rotate(tele ? -1.6 : (b.melee ? 0.4 : 0.9));
  legD(g, [0, 0, 22, -3, 44, 0], 12, '#34505e', { flash: fl });
  if (!fl) for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(8 + k * 9, -6); g.lineTo(8 + k * 9, 6); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(44, -26); g.lineTo(44, 26); g.moveTo(44, 26); g.quadraticCurveTo(64, 22, 68, 6); g.moveTo(44, 26); g.quadraticCurveTo(24, 22, 20, 6); g.moveTo(34, -18); g.lineTo(54, -18); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#9aa6ac'; g.lineWidth = 6; g.stroke(); if (!fl) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(43, -24); g.lineTo(43, 24); g.stroke(); g.fillStyle = '#c8d0d4'; poly(g, [64, 8, 72, 0, 70, 12]); g.fill(); poly(g, [24, 8, 16, 0, 18, 12]); g.fill(); for (let k = 0; k < 3; k++) { g.fillStyle = '#d8d0b8'; g.beginPath(); g.ellipse(44, -8 + k * 14, 3, 2.2, 0, 0, 7); g.fill(); } }
  g.restore();
  g.restore();
  bossStars(g, b, t, '#bff4ff', 0, -6);
};

Art.boss.brood = function (g, b, t) {            // the great spider mother: a patterned egg-bearing abdomen, hairy jointed legs, six eyes and fangs, spiderlings on her back
  const fl = b.flash > 0, ceil = b.onCeil;
  g.save(); g.translate(b.cx, ceil ? b.y : b.y + b.h); if (ceil) g.scale(b.face, -1); else g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#c8a8ff', 0, -40, 130); if (!ceil) groundD(g, 70);
  const walk = b.vx !== 0 ? Math.sin(t * 18) * 5 : 0;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const bx = s * (10 + i * 12), w = (i % 2 ? 1 : -1) * walk * s, far = s < 0;
    legD(g, [bx * 0.6, -34, bx * 1.35, -72 + i * 4, bx * 1.9 + w, 0], far ? 4 : 5.2, far ? '#1a1426' : '#2e2640', { flash: fl, claw: 9, clawAng: 1.45, clawCol: '#d8cce8' });
    if (!fl) { g.strokeStyle = far ? 'rgba(200,170,255,0.3)' : 'rgba(220,190,255,0.5)'; g.lineWidth = 0.9; for (let k = 1; k <= 4; k++) { const u = k / 5, x = bx * (0.6 + 0.75 * u), y = -34 - 38 * u * (1 - u) * 2 + (i * 4) * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 3, y - 4); g.stroke(); } }
  }
  const ab = ell(-26, -44, 42, 32);
  formD(g, ab, [-26, -44, 42, 32], '#2a2238', { flash: fl, spec: 0.5, lw: 4, rimc: '210,180,255' });
  if (!fl) {
    g.save(); g.beginPath(); ab(g); g.clip();
    g.strokeStyle = 'rgba(200,168,255,0.5)'; g.lineWidth = 2.4; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-26, -44, 12 + i * 11, 0, 7); g.stroke(); } g.strokeStyle = 'rgba(200,168,255,0.35)'; g.lineWidth = 1; for (let k = 0; k < 10; k++) { const a = k * 0.63; g.beginPath(); g.moveTo(-26 + Math.cos(a) * 12, -44 + Math.sin(a) * 12); g.lineTo(-26 + Math.cos(a) * 44, -44 + Math.sin(a) * 34); g.stroke(); }
    hatchD(g, [-26, -44, 40, 30], 160, 0.9, '#08060e', 0.5, { len: 6, w: 0.9, seed: 111 }); hatchD(g, [-40, -60, 22, 10], 50, 0.5, '#d8b8ff', 0.35, { len: 5, w: 0.9, seed: 112 });
    g.restore();
    for (const [x, y, r, a] of [[-40, -66, 5, 0.3], [-26, -72, 4, 0.5], [-12, -68, 4.6, 0.2]]) { g.save(); g.translate(x, y); g.rotate(a); formD(g, ell(0, 0, r, r * 1.2), [0, 0, r, r], '#3a3050', { spec: 0.3, lw: 1.6 }); eyeD(g, 0.6, 0, r * 0.45, r * 0.55, { iris: '#c8a8ff', pupil: 'round', look: [0.6, 0] }); g.restore(); }            // spiderlings
  }
  formD(g, ell(26, -40, 22, 18), [26, -40, 22, 18], '#3a3050', { flash: fl, spec: 0.45, lw: 3.6 });
  if (!fl) { g.save(); g.beginPath(); ell(26, -40, 22, 18)(g); g.clip(); hatchD(g, [26, -40, 20, 16], 80, 1.0, '#0a0814', 0.5, { len: 5, w: 0.9, seed: 113 }); g.restore(); }
  maskD(g, 34, -40, 14, 13, { fill: fl ? '#fff' : null, glow: b.tele > 0 ? '#ff6a8a' : '#d8a8ff', eyeA: 0.85, lean: 1, brow: 1, crack: 0.8 });
  if (!fl) for (const [x, y, r] of [[28, -50, 2.4], [35, -52, 2.6], [41, -49, 2.2], [24, -46, 1.8]]) { eyeD(g, x, y, r, r, { iris: b.tele > 0 ? '#ff6a8a' : '#c8a0ff', pupil: 'round', sclera: '#1a1424', glow: b.tele > 0 ? '#ff6a8a' : null, glowA: 0.6 }); }
  for (const [x0, y0, a] of [[46, -34, 0.9], [43, -30, 1.35]]) { g.save(); g.translate(x0, y0); g.rotate(a); g.beginPath(); g.moveTo(0, -2.6); g.quadraticCurveTo(12, -2, 14, 8); g.quadraticCurveTo(7, 2, 0, 2.6); g.closePath(); g.fillStyle = fl ? '#fff' : '#e8e0f0'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); if (!fl) { g.fillStyle = 'rgba(170,230,120,0.7)'; g.beginPath(); g.arc(13, 7, 1.4, 0, 7); g.fill(); } g.restore(); }       // fangs, a drop of venom
  g.restore();
  if (ceil) { g.strokeStyle = 'rgba(230,230,245,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.cx, 0); g.lineTo(b.cx, b.y); g.stroke(); }
};

Art.boss.queen = function (g, b, t) {              // the Rime Queen: a gown of faceted ice and lace, a pale masked face with a gemmed crown, fingered hands, a snowflake of cold
  const fl = b.flash > 0, tele = b.tele > 0;
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.cy + Math.sin(t * 2.2) * 3);
  if (b.state === 'dying') g.translate(Math.sin(t * 70) * 2.5, 0);
  bloom(g, 0, -8, 170, '#9fdcff', 0.2 + (tele ? 0.3 : 0) + (b.phase - 1) * 0.05);
  g.scale(b.face, 1); if (b.sweeping) g.rotate(0.35);
  for (let i = 0; i < 4; i++) {                    // orbiting shards of ice, faceted
    const a = t * 1.7 + i * Math.PI / 2, x = Math.cos(a) * 68, y = -10 + Math.sin(a) * 22;
    g.save(); g.translate(x, y); g.rotate(a * 2); g.beginPath(); g.moveTo(-10, 0); g.lineTo(0, -5); g.lineTo(14, 0); g.lineTo(0, 5); g.closePath(); const sg = g.createLinearGradient(0, -5, 0, 5); sg.addColorStop(0, fl ? '#fff' : '#f0fbff'); sg.addColorStop(1, fl ? '#fff' : '#7ab8e0'); g.fillStyle = sg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  g.strokeStyle = fl ? '#fff' : 'rgba(170,220,255,0.55)'; g.lineWidth = 4.4; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-6 + i * 5, -54); g.quadraticCurveTo(-30 - i * 8, -34 + Math.sin(t * 3 + i) * 5, -42 - i * 9, -4 + Math.sin(t * 2.4 + i) * 6); g.stroke(); }       // the veil
  // the gown: a bell of ice with a lace of frost and hanging points
  const gown = c => { c.moveTo(-17, -12); for (let i = 0; i <= 8; i++) c.lineTo(-38 + i * 9.5, 48 + (i % 2 ? 16 : 0) + Math.sin(t * 3 + i * 1.3) * 3); c.lineTo(17, -12); c.closePath(); };
  formD(g, gown, [0, 20, 38, 40], '#4a78b8', { flash: fl, spec: 0.5, hi: '#9fd0f4', lo: '#142a58', lw: 3.6, rimc: '200,240,255' });
  if (!fl) {
    g.save(); g.beginPath(); gown(g); g.clip();
    g.strokeStyle = 'rgba(230,248,255,0.55)'; g.lineWidth = 1.4; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 3.6, -12); g.lineTo(i * 11, 66); g.stroke(); }
    g.strokeStyle = 'rgba(240,252,255,0.7)'; g.lineWidth = 1.1; for (let r = 0; r < 4; r++) { g.beginPath(); for (let k = -5; k <= 5; k++) { const x = k * 6.4, y = 4 + r * 14 + Math.abs(k) * 0.6; g.moveTo(x - 3, y); g.quadraticCurveTo(x, y + 6, x + 3, y); } g.stroke(); }        // lace
    for (const [x, y] of [[-12, 10], [8, 20], [-4, 34], [14, 40], [-18, 28]]) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.9; g.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; g.moveTo(x - Math.cos(a) * 3.4, y - Math.sin(a) * 3.4); g.lineTo(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4); } g.stroke(); }                 // frost flakes
    hatchD(g, [0, 20, 36, 40], 90, 1.45, '#0a1c3c', 0.3, { len: 9, w: 0.9, seed: 121 });
    g.restore();
  }
  formD(g, c => { c.moveTo(-15, -34); c.lineTo(15, -34); c.lineTo(19, -8); c.lineTo(12, 4); c.lineTo(-12, 4); c.lineTo(-19, -8); c.closePath(); }, [0, -15, 16, 19], '#3a64a0', { flash: fl, spec: 0.5, lw: 3.2, rimc: '200,240,255' });
  if (!fl) { g.strokeStyle = 'rgba(210,240,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-10, -30); g.lineTo(0, -4); g.lineTo(10, -30); g.moveTo(-14, -14); g.lineTo(14, -14); g.stroke(); }
  spikeD(g, -15, -34, -2.5, 20, 5, '#d8f0ff', fl); spikeD(g, 15, -34, -0.64, 20, 5, '#d8f0ff', fl); spikeD(g, -17, -26, -3.0, 13, 3.4, '#bfe4fa', fl); spikeD(g, 17, -26, -0.14, 13, 3.4, '#bfe4fa', fl);        // frozen shoulders
  bloom(g, 0, -16, 16, '#dff6ff', tele ? 0.8 : 0.35); if (!fl) { g.fillStyle = tele ? '#fff' : '#bfeaff'; poly(g, [0, -26, 4.6, -16, 0, -6, -4.6, -16]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); }
  const up = tele ? 1 : 0;                           // arms, raised to gather the cold
  for (const s of [-1, 1]) {
    const hx = s * (24 - up * 8), hy = -46 - up * 34 + Math.sin(t * 4 + s) * 2;
    legD(g, [s * 14, -30, s * 32, -22 - up * 22, hx, hy], 5, '#9cc6ec', { flash: fl });
    g.save(); g.translate(hx, hy); g.rotate(s * (0.4 - up * 0.7)); g.fillStyle = fl ? '#fff' : '#e2f0fa'; g.strokeStyle = INK; g.lineWidth = 1.6; formD(g, ell(0, -2, 3.6, 3), [0, -2, 3.6, 3], '#e2f0fa', { flash: fl, spec: 0.3, lw: 1.6 }); for (let f = -1; f <= 1; f++) { g.beginPath(); g.moveTo(f * 1.7, -4); g.lineTo(f * 2.6, -9.6 + Math.abs(f)); g.stroke(); } g.restore();
  }
  if (tele) { bloom(g, 0, -80, 52, '#dff6ff', 0.6 + 0.2 * Math.sin(t * 18)); g.save(); g.translate(0, -80); g.rotate(t * 3); for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.strokeStyle = '#f4fcff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16); g.moveTo(0, -9); g.lineTo(-4, -13); g.moveTo(0, -9); g.lineTo(4, -13); g.stroke(); } g.restore(); }
  maskD(g, 0, -50, 12.8, 14.8, { fill: fl ? '#fff' : null, glow: tele ? '#ffffff' : '#7fe8ff', eyeA: 1, lean: 0.6, brow: 1, crack: 0, base: '#e8f4ff' });
  if (!fl) { g.strokeStyle = 'rgba(120,200,240,0.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-9, -56); g.lineTo(-6, -53); g.moveTo(9, -56); g.lineTo(6, -53); g.stroke(); }
  // the crown: five points, a gem in each
  const crown = c => { c.moveTo(-17, -58); c.lineTo(-14, -86); c.lineTo(-7, -67); c.lineTo(-2, -100); c.lineTo(3, -67); c.lineTo(9, -90); c.lineTo(13, -64); c.lineTo(18, -58); c.closePath(); };
  formD(g, crown, [0, -78, 18, 22], '#bfe8ff', { flash: fl, spec: 0.5, hi: '#f4fcff', lo: '#6aa8d8', lw: 3.2 });
  if (!fl) { for (const [x, y, c] of [[-14, -80, '#ff9ad8'], [-2, -92, '#7fe8ff'], [9, -84, '#ff9ad8']]) { bloom(g, x, y, 8, c, 0.8); g.fillStyle = c; poly(g, [x, y - 3.4, x + 2.4, y, x, y + 3.4, x - 2.4, y]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke(); } }
  g.restore();
};

Art.boss.colossus = function (g, b, t) {           // the Cinder Colossus: faceted basalt with glowing seams, a carved face with a toothed slit, a furnace for a heart
  const fl = b.flash > 0, tele = b.tele > 0, heat = 0.55 + 0.25 * Math.sin(t * 3) + (b.phase - 1) * 0.12;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 3, 0);
  bloom(g, 0, -80, 200, '#ff7a2a', 0.14 + 0.06 * heat + (tele ? 0.25 : 0)); groundD(g, 80);
  const rock = '#3a3440', crack = (pts, w) => { g.strokeStyle = fl ? '#fff' : 'rgba(255,208,112,' + (0.55 + 0.4 * heat) + ')'; g.lineWidth = w || 2.2; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); if (!fl) { g.strokeStyle = 'rgba(255,120,40,0.35)'; g.lineWidth = (w || 2.2) * 2.6; g.stroke(); } };
  const block = (pts, c, o) => { formD(g, pol(pts), [pts.reduce((a, v, i) => a + (i % 2 ? 0 : v), 0) / (pts.length / 2), pts.reduce((a, v, i) => a + (i % 2 ? v : 0), 0) / (pts.length / 2), 30, 30], c || rock, Object.assign({ flash: fl, spec: 0.4, lw: 3.6, rimc: '255,170,110', hi: '#6a6072' }, o || {})); };
  if (b.rolling) {                                  // curled into a ball of rock
    g.translate(0, -62); g.rotate(t * 11);
    const pts = []; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = 60 + (i % 2) * 7; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
    block(pts); if (!fl) { g.save(); g.beginPath(); pol(pts)(g); g.clip(); hatchD(g, [0, 0, 60, 60], 150, 0.8, '#0c0a10', 0.4, { len: 8, w: 1, seed: 131 }); g.restore(); }
    crack([-40, -10, -16, 0, -4, 24, 20, 30, 44, 8]); crack([0, -52, 8, -22, -6, -4], 2); crack([-30, 30, -10, 14]); bloom(g, 0, 0, 46, '#ff8a3a', 0.4);
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3; spikeD(g, Math.cos(a) * 58, Math.sin(a) * 58, a, 14, 6, '#5a5062', fl); }
    g.restore(); return;
  }
  const step = Math.abs(b.vx) > 20 ? Math.sin(t * 8) * 3 : 0;
  for (const [x0, s] of [[-34, 1], [8, -1]]) {      // legs: basalt columns with a glowing knee
    block([x0, -58, x0 + 28, -58, x0 + 32 + s * step, 0, x0 - 4 + s * step, 0]);
    if (!fl) { g.save(); g.beginPath(); pol([x0, -58, x0 + 28, -58, x0 + 32 + s * step, 0, x0 - 4 + s * step, 0])(g); g.clip(); hatchD(g, [x0 + 14, -30, 16, 28], 50, 1.57, '#0c0a10', 0.4, { len: 8, w: 1, seed: 132 + x0 }); g.restore(); }
    crack([x0 + 14, -50, x0 + 10, -30, x0 + 18, -12]); bloom(g, x0 + 14, -30, 14, '#ff8a3a', 0.25);
  }
  g.save(); g.translate(-38, -108); g.rotate(b.stunned ? 1.3 : 1.55 + Math.sin(t * 2) * 0.05);       // the back arm
  block([0, -13, 58, -15, 60, 15, 0, 13], '#2a2430'); block([54, -22, 90, -20, 92, 22, 54, 24]); crack([62, -8, 76, 0, 84, 10]); for (let k = 0; k < 4; k++) spikeD(g, 88, -14 + k * 9, 0.2, 9, 3, '#5a5062', fl);
  g.restore();
  block([-56, -64, 52, -64, 60, -112, 40, -130, -40, -130, -62, -112]);                              // the torso
  if (!fl) {
    g.save(); g.beginPath(); pol([-56, -64, 52, -64, 60, -112, 40, -130, -40, -130, -62, -112])(g); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(-56, -64); g.lineTo(-20, -64); g.lineTo(-26, -130); g.lineTo(-40, -130); g.lineTo(-62, -112); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(20, -64); g.lineTo(52, -64); g.lineTo(60, -112); g.lineTo(40, -130); g.lineTo(30, -130); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-30, -130); g.lineTo(-34, -64); g.moveTo(30, -130); g.lineTo(34, -64); g.moveTo(-60, -90); g.lineTo(58, -90); g.stroke();
    hatchD(g, [0, -97, 56, 32], 220, 0.9, '#0c0a10', 0.42, { len: 9, w: 1, seed: 133 }); g.restore();
    for (const [x, y] of [[-44, -76], [44, -76], [-46, -116], [46, -116]]) rivetD(g, x, y, 2.4);
  }
  crack([-44, -118, -30, -96, -38, -80, -20, -68]); crack([34, -122, 24, -100, 40, -84, 30, -68]); crack([-6, -126, 2, -104]);
  bloom(g, 0, -92, 60, '#ff7a2a', 0.35 + 0.35 * heat + (tele ? 0.3 : 0));                              // the furnace in the chest
  formD(g, ell(0, -92, 16, 20), [0, -92, 16, 20], '#ffb050', { flash: fl, spec: 0, rim: 0, hi: '#fff2b0', lo: '#d86a1a', lw: 3.4 });
  if (!fl) { g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(0, -92, 8, 11, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,40,10,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-14, -92); g.lineTo(14, -92); g.moveTo(0, -108); g.lineTo(0, -76); g.stroke(); for (let k = 0; k < 3; k++) { const u = (t * 0.7 + k / 3) % 1; g.fillStyle = 'rgba(255,200,90,' + (0.7 * (1 - u)) + ')'; g.beginPath(); g.arc(Math.sin(t * 3 + k * 2) * 10, -92 - u * 30, 1.8, 0, 7); g.fill(); } }
  spikeD(g, -60, -112, -2.0, 30, 9, '#4a4252', fl); spikeD(g, 58, -112, -1.1, 34, 9, '#4a4252', fl); spikeD(g, -46, -126, -2.4, 18, 6, '#5a5062', fl);
  // the head: a carved slab of basalt with a brow, burning eyes and a toothed slit of a mouth
  block([-20, -126, 22, -126, 16, -152, -14, -152], '#3a3440', { lw: 3.4 });
  if (!fl) {
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(-16, -140); g.lineTo(18, -140); g.lineTo(17, -143); g.lineTo(-15, -146); g.closePath(); g.fill();           // brow
    for (const [x, w] of [[-9, 11], [5, 11]]) { bloom(g, x + 5, -139.5, 14, tele ? '#fff' : '#ffb050', 0.7); g.fillStyle = tele ? '#ffffff' : '#ffd070'; g.beginPath(); g.moveTo(x, -141.4); g.lineTo(x + w, -139.4 + (x < 0 ? 0 : -1.4)); g.lineTo(x + w, -136.4 + (x < 0 ? 0 : -1)); g.lineTo(x, -137.6); g.closePath(); g.fill(); }
    g.fillStyle = '#12080a'; g.beginPath(); g.moveTo(-10, -131); g.lineTo(12, -131); g.lineTo(10, -127.6); g.lineTo(-8, -127.6); g.closePath(); g.fill(); g.fillStyle = '#e8c890'; for (let k = 0; k < 6; k++) { poly(g, [-9 + k * 3.6, -131, -7.4 + k * 3.6, -128.6, -5.8 + k * 3.6, -131]); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.65)'; g.beginPath(); g.ellipse(0, -134, 1, 1.4, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,170,90,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-14, -152); g.lineTo(-10, -146); g.moveTo(8, -152); g.lineTo(12, -146); g.stroke();
  }
  crack([-12, -150, -9, -142]); bloom(g, 4, -140, 30, '#ffb050', tele ? 0.7 : 0.3);
  let ang = 0.95;
  if (tele) ang = -2.25 + Math.sin(t * 18) * 0.05; else if (b.melee) ang = 0.1; else if (b.stunned) ang = 1.2;
  g.save(); g.translate(40, -108); g.rotate(ang);                                                      // the striking arm
  block([0, -14, 62, -16, 64, 16, 0, 14], '#2a2430'); block([58, -26, 98, -24, 100, 26, 58, 28]); crack([66, 4, 80, 10, 92, 4]);
  for (let k = 0; k < 3; k++) spikeD(g, 96, -16 + k * 14, 0.15, 12, 4, '#5a5062', fl); for (const [x, y] of [[8, -8], [8, 8], [30, -8], [30, 8]]) if (!fl) rivetD(g, x, y, 1.8);
  bloom(g, 88, 0, 36, '#ff7a2a', tele ? 0.55 : 0.2); g.restore();
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const u = (t * 0.6 + i * 0.31) % 1; g.fillStyle = 'rgba(255,170,80,' + (0.8 * (1 - u)) + ')'; g.fillRect(b.cx + Math.sin(i * 7 + t) * 44, b.y + b.h - 40 - u * 160, 3, 3); }
  g.restore();
  bossStars(g, b, t, '#ffe98a', 0, -6);
};

Art.boss.thunderhoof = function (g, b, t) {        // Thunderhoof: a storm-cloud bull with plated flanks, ridged horns, a steaming snout and lightning in its hide
  const fl = b.flash > 0, tele = b.tele > 0, run = b.charging || Math.abs(b.vx) > 40;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 3, 0);
  bloom(g, 0, -50, 140, '#a8c0ff', 0.12 + (tele ? 0.3 : 0) + (b.charging ? 0.2 : 0)); groundD(g, 70);
  const step = run ? Math.sin(t * 22) * 9 : 0;
  for (const [x0, s, far] of [[-44, 1, 1], [28, -1, 1], [-26, -1, 0], [46, 1, 0]]) {
    legD(g, [x0, -46, x0 + 3 * s, -24, x0 + 2 + s * step, -6], far ? 8 : 9.6, far ? '#192038' : '#323d5e', { flash: fl });
    formD(g, c => { c.moveTo(x0 - 6 + s * step, -8); c.lineTo(x0 + 7 + s * step, -8); c.lineTo(x0 + 9 + s * step, 0); c.lineTo(x0 - 8 + s * step, 0); c.closePath(); }, [x0 + s * step, -4, 8, 5], far ? '#14181a' : '#26282c', { flash: fl, spec: 0.3, lw: 2.4 });                  // hooves
  }
  g.strokeStyle = INK; g.lineWidth = 7.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-58, -64); g.lineTo(-76, -76); g.lineTo(-70, -58); g.lineTo(-92, -62); g.stroke(); g.strokeStyle = fl ? '#fff' : '#cfe0ff'; g.lineWidth = 3.2; g.stroke(); bloom(g, -92, -62, 14, '#a8c0ff', 0.5);   // the tail
  const body = [[-62, -50], [-48, -86], [-10, -98], [30, -94], [58, -78], [66, -52], [48, -34], [0, -30], [-44, -34]];
  const bpath = c => body.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]));
  formD(g, c => { bpath(c); c.closePath(); }, [0, -64, 62, 34], '#323d5e', { flash: fl, spec: 0.45, hi: '#6a78a8', lo: '#141a30', lw: 4, rimc: '190,210,255' });
  if (!fl) {
    g.save(); g.beginPath(); bpath(g); g.closePath(); g.clip();
    g.strokeStyle = 'rgba(5,6,12,0.65)'; g.lineWidth = 2.6; for (let i = -2; i <= 3; i++) { g.beginPath(); g.moveTo(i * 20 - 6, -100); g.quadraticCurveTo(i * 20 + 10, -64, i * 20 - 4, -28); g.stroke(); g.strokeStyle = 'rgba(190,210,255,0.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(i * 20 - 4, -98); g.quadraticCurveTo(i * 20 + 12, -64, i * 20 - 2, -28); g.stroke(); g.strokeStyle = 'rgba(5,6,12,0.65)'; g.lineWidth = 2.6; }
    hatchD(g, [0, -64, 60, 32], 200, 0.5, '#080a14', 0.4, { len: 9, w: 1, seed: 141 }); hatchD(g, [-20, -86, 36, 12], 80, 0.2, '#d0dcff', 0.3, { len: 7, w: 1, seed: 142 });
    for (const [x, y] of [[-40, -86], [10, -94], [44, -80]]) rivetD(g, x, y, 2); g.restore();
  }
  for (let k = 0; k < 6; k++) { const px = -60 + k * 16, py = -98 + Math.sin(k * 1.7) * 4; const cg = g.createRadialGradient(px, py, 0, px, py, 12); cg.addColorStop(0, 'rgba(235,242,255,0.95)'); cg.addColorStop(1, 'rgba(160,184,240,0)'); g.fillStyle = fl ? '#fff' : cg; g.beginPath(); g.arc(px, py - 4 + Math.sin(t * 2 + k) * 1.5, 11, 0, 7); g.fill(); }        // a mane of cloud
  g.strokeStyle = fl ? '#fff' : 'rgba(215,232,255,' + (0.6 + 0.35 * Math.sin(t * 9) + (tele ? 0.3 : 0)) + ')'; g.lineWidth = 2.4; g.lineJoin = 'round';
  for (const pts of [[-40, -88, -30, -70, -42, -60, -28, -42], [10, -96, 20, -78, 8, -68, 22, -48], [44, -84, 38, -68, 52, -58]]) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
  // the head, lowered to the charge
  const dip = tele || b.charging || b.stunned ? 14 : 0;
  g.save(); g.translate(56, -66 + dip); g.rotate(dip ? 0.25 : 0);
  g.beginPath(); g.moveTo(-6, -20); g.bezierCurveTo(-14, -52, 24, -56, 30, -34); g.bezierCurveTo(22, -46, 6, -42, 2, -22); g.closePath();                         // the far horn
  g.fillStyle = fl ? '#fff' : '#a8b0c8'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  formD(g, c => { c.moveTo(-16, -22); c.quadraticCurveTo(0, -30, 14, -26); c.quadraticCurveTo(34, -8, 40, 8); c.quadraticCurveTo(36, 18, 20, 18); c.quadraticCurveTo(-4, 16, -14, 12); c.closePath(); }, [12, -2, 26, 20], '#4a5680', { flash: fl, spec: 0.45, hi: '#8090c0', lo: '#1c2440', lw: 3.6 });
  if (!fl) {
    g.strokeStyle = 'rgba(8,10,20,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8, -22); g.lineTo(-2, -10); g.moveTo(4, -26); g.lineTo(8, -14); g.stroke();
    g.fillStyle = 'rgba(8,8,16,0.85)'; g.beginPath(); g.ellipse(36, 6, 1.8, 2.8, 0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(31, 10, 1.6, 2.4, 0.3, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, 13); g.quadraticCurveTo(26, 16, 34, 12); g.stroke(); g.fillStyle = '#e8e4d4'; for (const x of [18, 23, 28]) { poly(g, [x, 13.4, x + 1.4, 17.6, x + 2.8, 14.4]); g.fill(); }
  }
  eyeD(g, 14, -9, 4.2, 3.6, { iris: tele || b.charging ? '#ffffff' : '#a8c8ff', pupil: 'slit', sclera: '#1c2440', glow: '#a8c0ff', glowA: tele ? 1 : 0.7, angry: 0.9, lidc: '#4a5680', look: [0.5, 0] });
  g.beginPath(); g.moveTo(-6, -22); g.bezierCurveTo(-14, -56, 28, -60, 34, -30); g.bezierCurveTo(22, -48, 4, -44, 2, -20); g.closePath();            // the near horn: ridged
  const hg = g.createLinearGradient(-10, -50, 30, -24); hg.addColorStop(0, fl ? '#fff' : '#f4f6ff'); hg.addColorStop(1, fl ? '#fff' : '#8a94b8'); g.fillStyle = hg; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  if (!fl) { g.save(); g.clip(); g.strokeStyle = 'rgba(60,70,110,0.55)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-6 + k * 5, -44 - Math.sin(k * 0.6) * 6); g.quadraticCurveTo(-3 + k * 5, -38, -4 + k * 5, -30); g.stroke(); } g.restore(); }
  if (tele || b.charging) { g.fillStyle = 'rgba(235,242,255,0.4)'; for (let k = 0; k < 3; k++) { const u = (t * 3 + k / 3) % 1; g.beginPath(); g.arc(42 + u * 14, 0 - u * 8, 2 + u * 3.4, 0, 7); g.fill(); } }
  g.restore();
  g.restore();
  if (b.charging) { g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#dfe9ff'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const yy = b.y + 20 + i * 18; g.beginPath(); g.moveTo(b.cx - b.face * 70, yy); g.lineTo(b.cx - b.face * (110 + i * 16), yy); g.stroke(); } g.restore(); }
  bossStars(g, b, t, '#e8f0ff', b.face * 50, -2);
};

Art.boss.roc = function (g, b, t) {                // the Storm Roc: layered slate feathers, a fierce eye, a hooked beak with nostrils, a lightning crest, hooked talons
  const fl = b.flash > 0, tele = b.tele > 0, tuck = b.sweeping;
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.cy + (tuck ? 0 : Math.sin(t * 2.4) * 3));
  if (b.state === 'dying') g.translate(Math.sin(t * 70) * 3, 0);
  bloom(g, 0, 0, 200, '#a8c0ff', 0.16 + (tele ? 0.3 : 0) + (b.phase - 1) * 0.05);
  g.scale(b.face, 1); if (b.sweeping && b.vy > 200) g.rotate(0.6);
  const flap = tuck ? 0.15 : Math.sin(t * (tele ? 11 : 6.5)) * 0.55 + (tele ? 0.35 : 0);
  const feather = (len, wd, c, c2) => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -wd, len, -wd * 0.1); g.quadraticCurveTo(len * 0.5, wd * 0.8, 0, 0); g.closePath(); const fg = g.createLinearGradient(0, -wd, len, wd); fg.addColorStop(0, fl ? '#fff' : c); fg.addColorStop(1, fl ? '#fff' : c2); g.fillStyle = fg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke(); if (!fl) { g.strokeStyle = 'rgba(220,232,255,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(2, -0.4); g.lineTo(len * 0.95, -wd * 0.1); g.stroke(); g.strokeStyle = 'rgba(5,8,20,0.45)'; g.lineWidth = 0.7; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(len * k / 5, 0); g.lineTo(len * k / 5 - 3, -wd * 0.5 * (1 - k / 6)); g.stroke(); } } };
  const wing = (rot, dark) => {
    g.save(); g.translate(-8, -12); g.rotate(-1.1 + rot);
    const cols = dark ? ['#222a4a', '#12182e'] : ['#4a5a96', '#1e2850'];
    for (let k = 0; k < 9; k++) { g.save(); g.rotate(-0.35 + k * 0.1); g.translate(18 + k * 4, 0); feather(70 - k * 3, 12, cols[0], cols[1]); g.restore(); }       // primaries
    for (let k = 0; k < 6; k++) { g.save(); g.translate(8 + k * 12, -14 + k * 1.5); g.rotate(-0.15 + k * 0.05); feather(40, 10, dark ? '#2c3660' : '#6a7ab4', cols[1]); g.restore(); }   // coverts
    g.restore();
  };
  wing(flap * 0.8 + 0.25, true);
  g.save(); g.translate(-26, 8); for (let k = -2; k <= 2; k++) { g.save(); g.rotate(3.14 + k * 0.17); feather(66 - Math.abs(k) * 6, 11, '#2c3660', '#12182e'); g.restore(); } g.restore();   // the tail fan
  legD(g, [-6, 16, -10, 30, -16, 40], 5, '#c8b878', { flash: fl, claw: 9, clawAng: 0.9, clawCol: '#1a1a22' }); legD(g, [10, 16, 9, 30, 2, 40], 5, '#d8c888', { flash: fl, claw: 9, clawAng: 0.9, clawCol: '#1a1a22' });
  formD(g, ell(0, 2, 38, 25, -0.08), [0, 2, 38, 25], '#3a4676', { flash: fl, spec: 0.45, hi: '#8a9ad0', lo: '#161c38', lw: 4, rimc: '200,215,255' });
  if (!fl) { g.save(); g.beginPath(); ell(0, 2, 38, 25, -0.08)(g); g.clip(); const bg = g.createLinearGradient(0, -4, 0, 26); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(235,240,255,0.85)'); g.fillStyle = bg; g.fillRect(-40, -4, 80, 30); for (let r = 0; r < 4; r++) for (let k = -4; k <= 4; k++) { g.strokeStyle = 'rgba(20,30,70,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.arc(k * 8 + (r % 2) * 4, -6 + r * 8, 5, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); } g.restore(); }
  // the head: a fierce eye under a heavy brow, a hooked beak, a crest of lightning
  formD(g, ell(38, -14, 15, 14), [38, -14, 15, 14], '#3a4676', { flash: fl, spec: 0.45, lw: 3.4 });
  if (!fl) { g.save(); g.beginPath(); ell(38, -14, 15, 14)(g); g.clip(); hatchD(g, [38, -14, 14, 13], 50, 0.2, '#e0e8ff', 0.35, { len: 4, w: 0.9, seed: 151 }); g.restore(); }
  g.beginPath(); g.moveTo(48, -22); g.quadraticCurveTo(70, -20, 80, -7); g.quadraticCurveTo(70, -9, 66, -4); g.quadraticCurveTo(58, -2, 48, -4); g.closePath(); const bk = g.createLinearGradient(48, -22, 70, 0); bk.addColorStop(0, fl ? '#fff' : '#f8ecc0'); bk.addColorStop(1, fl ? '#fff' : '#b89a50'); g.fillStyle = bk; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.8; g.lineJoin = 'round'; g.stroke();
  if (!fl) { g.strokeStyle = 'rgba(60,40,10,0.8)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(52, -6); g.quadraticCurveTo(62, -5, 68, -7); g.stroke(); g.fillStyle = 'rgba(40,24,8,0.85)'; g.beginPath(); g.ellipse(56, -16, 1.4, 1, -0.3, 0, 7); g.fill(); }
  eyeD(g, 43, -17, 4.2, 4.2, { iris: tele ? '#ffffff' : '#ffd860', pupil: 'round', glow: '#a8c0ff', glowA: tele ? 1 : 0.6, angry: 0.9, lidc: '#3a4676', look: [0.5, 0.1] });
  g.save(); for (const [x, y, a, l] of [[30, -26, -2.1, 20], [36, -28, -1.8, 28], [42, -27, -1.45, 22], [24, -22, -2.5, 16]]) { g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5); g.lineTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l); g.stroke(); g.strokeStyle = fl ? '#fff' : (tele ? '#ffffff' : '#cfe0ff'); g.lineWidth = 2.6; g.stroke(); } bloom(g, 34, -34, 24, '#a8c0ff', tele ? 0.8 : 0.35); g.restore();
  wing(flap, false);
  if (tele) { g.strokeStyle = 'rgba(235,244,255,0.9)'; g.lineWidth = 2.2; for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1, r = 70 + 30 * Math.sin(t * 9 + i); g.beginPath(); g.moveTo(Math.cos(a) * 40, Math.sin(a) * 30); g.lineTo(Math.cos(a) * r * 0.7 + 8, Math.sin(a) * r * 0.5 - 6); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); g.stroke(); } }
  g.restore();
};

Art.boss.duelist = function (g, b, t) {            // the Glass Duelist: a plumed visored helm, a coat of faceted black glass, a mirrored breastplate, a cup-hilted rapier
  const fl = b.flash > 0, tele = b.tele > 0, guard = b.guarding, lunge = b.lunging;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 3, 0);
  bloom(g, 0, -46, 100, '#c8b8ff', 0.1 + (tele ? 0.3 : 0) + (guard ? 0.3 : 0)); groundD(g, 34);
  if (lunge) g.rotate(0.22);
  const dark = '#1c1830', mid = '#3a3260', lit = '#8c80cc', step = Math.abs(b.vx) > 40 ? Math.sin(t * 20) * 8 : 0;
  legD(g, [-6, -38, -9 - step * 0.5, -20, -10 - step, 0], 9, '#2a2448', { flash: fl, claw: 6, clawAng: 0.2, clawCol: '#8c80cc' }); legD(g, [6, -38, 9 + step * 0.5 + (lunge ? 6 : 0), -20, 12 + step + (lunge ? 14 : 0), 0], 9, '#3a3260', { flash: fl, claw: 6, clawAng: 0.2, clawCol: '#8c80cc' });
  // the cape behind, and the coat of glass shards
  g.beginPath(); g.moveTo(-14, -80); g.quadraticCurveTo(-36, -60 + Math.sin(t * 3) * 3, -32 - (lunge ? 14 : 0), -20); g.lineTo(-22, -26); g.lineTo(-14, -14); g.lineTo(-6, -30); g.closePath(); g.fillStyle = fl ? '#fff' : '#241c44'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  for (const [pts, c] of [[[-18, -66, -26, -34, -16, -22, -8, -38], dark], [[-8, -40, -4, -20, 6, -36, 14, -22, 20, -40], mid], [[6, -62, 20, -62, 22, -30, 14, -22, 8, -38], lit]]) { formD(g, pol(pts), [0, -44, 16, 22], c, { flash: fl, spec: 0.5, lw: 2.6, rimc: '220,210,255' }); }
  if (!fl) { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-18, -66); g.lineTo(-10, -46); g.moveTo(14, -22); g.lineTo(6, -36); g.moveTo(20, -62); g.lineTo(14, -44); g.stroke(); }
  formD(g, pol([-15, -80, 15, -80, 17, -46, 0, -38, -17, -46]), [0, -60, 17, 22], '#4a4278', { flash: fl, spec: 0.7, hi: '#d8d0ff', lo: '#1c1636', lw: 3.4, rimc: '240,236,255' });                  // the mirrored breastplate
  if (!fl) { g.save(); g.beginPath(); pol([-15, -80, 15, -80, 17, -46, 0, -38, -17, -46])(g); g.clip(); g.fillStyle = 'rgba(255,255,255,0.35)'; poly(g, [-14, -78, -2, -78, -6, -48, -16, -48]); g.fill(); g.strokeStyle = 'rgba(20,16,40,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -80); g.lineTo(0, -40); g.moveTo(-16, -64); g.lineTo(16, -64); g.stroke(); g.restore(); rivetD(g, -10, -74, 1.2); rivetD(g, 10, -74, 1.2); }
  formD(g, ell(-15, -78, 7, 4.4, -0.3), [-15, -78, 7, 4.4], '#5a5090', { flash: fl, spec: 0.6, lw: 2.4 }); formD(g, ell(15, -78, 7, 4.4, 0.3), [15, -78, 7, 4.4], '#5a5090', { flash: fl, spec: 0.6, lw: 2.4 });   // pauldrons
  // the helm: a plume, a crest, a visor slit that burns when it prepares to strike
  g.beginPath(); g.moveTo(0, -102); g.quadraticCurveTo(-16, -122 + Math.sin(t * 5) * 2, -26, -104 + Math.sin(t * 4) * 3); g.quadraticCurveTo(-12, -104, 0, -98); g.closePath(); g.fillStyle = fl ? '#fff' : '#a898f0'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
  formD(g, c => { c.moveTo(-12, -100); c.quadraticCurveTo(0, -108, 12, -100); c.lineTo(14, -78); c.lineTo(0, -72); c.lineTo(-14, -78); c.closePath(); }, [0, -88, 14, 16], '#2a2448', { flash: fl, spec: 0.6, hi: '#9a8ee0', lo: '#100c20', lw: 3.4, rimc: '230,224,255' });
  if (!fl) { const vc = tele || guard ? '#ffffff' : '#c8b8ff'; bloom(g, 1, -89, 24, vc, tele ? 0.9 : 0.45); g.fillStyle = vc; g.beginPath(); g.moveTo(-9, -91); g.lineTo(11, -91); g.lineTo(9, -86); g.lineTo(-7, -86); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-8, -96); g.lineTo(-10, -82); g.stroke(); g.strokeStyle = 'rgba(8,6,20,0.7)'; g.beginPath(); g.moveTo(1, -85.6); g.lineTo(1, -76); g.stroke(); }
  spikeD(g, 0, -100, -1.57, 18, 3.2, '#8c80cc', fl);
  g.save(); g.translate(14, -62);                                                                                                   // the rapier arm and the blade
  g.rotate(guard ? -1.45 : lunge ? 0 : b.slashing === 2 ? 1.0 : b.slashing === 1 ? -0.35 : tele ? -1.0 : 0.5);
  legD(g, [-10, 4, -2, 2, 6, 0], 6, '#3a3260', { flash: fl });
  formD(g, ell(8, 0, 4.4, 3.6), [8, 0, 4.4, 3.6], '#5a5090', { flash: fl, spec: 0.5, lw: 2.2 });
  g.beginPath(); g.ellipse(10, 0, 3, 8, 0, 0, 7); g.fillStyle = fl ? '#fff' : '#c8b8ff'; g.globalAlpha = 0.6; g.fill(); g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = 2; g.stroke();   // the cup hilt
  g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, 0); g.lineTo(guard ? 88 : 102, 0); g.stroke(); g.strokeStyle = fl ? '#fff' : '#f2edff'; g.lineWidth = 2.8; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(14, -1); g.lineTo(guard ? 86 : 100, -0.8); g.stroke(); poly(g, [guard ? 88 : 102, -1.6, guard ? 96 : 110, 0, guard ? 88 : 102, 1.6]); g.fillStyle = fl ? '#fff' : '#f2edff'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
  if (guard) bloom(g, 50, 0, 64, '#ffffff', 0.35 + 0.15 * Math.sin(t * 16));
  g.restore();
  g.restore();
  if (lunge) { g.save(); g.globalAlpha = 0.45; g.strokeStyle = '#e8e0ff'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const yy = b.y + 20 + i * 16; g.beginPath(); g.moveTo(b.cx - b.face * 30, yy); g.lineTo(b.cx - b.face * (90 + i * 14), yy); g.stroke(); } g.restore(); }
  bossStars(g, b, t, '#e8e0ff', 0, -14);
};

Art.boss.twin = function (g, b, t) {               // the Wanderer's Twin: a horned white mask with burning violet eyes, a black cloak with glowing seams, a pale nail
  const fl = b.flash > 0, tele = b.tele > 0;
  const pose = (ox, alpha) => {
    g.save(); g.globalAlpha = alpha; g.translate(b.cx + ox, b.y + b.h); g.scale(b.face * 1.45, 1.45);
    if (b.dashing) g.rotate(0.28);
    const run = Math.abs(b.vx) > 40 && !b.airborne ? Math.sin(t * 22) * 5 : 0, air = b.airborne;
    legD(g, [-3, -14, air ? -7 : -4.4 - run * 0.5, -7, air ? -8 : -5 - run, air ? -2 : 0], 3.6, '#1a1730', { flash: fl, claw: 2.2, clawAng: 0.3, clawCol: '#e8e0ff' }); legD(g, [3, -14, air ? 8 : 5.4 + run * 0.5, -7, air ? 9 : 6 + run, air ? -4 : 0], 3.6, '#221e3a', { flash: fl, claw: 2.2, clawAng: 0.3, clawCol: '#e8e0ff' });
    g.beginPath(); g.moveTo(-9, -22); g.quadraticCurveTo(-18 - run * 0.4, -14, -13, -3 + Math.sin(t * 5) * 1.5); g.lineTo(-8, -7); g.lineTo(-3, -10); g.lineTo(2, -4); g.lineTo(7, -9); g.lineTo(10, -12); g.quadraticCurveTo(12, -22, 8, -26); g.closePath();
    const cg = g.createLinearGradient(-12, -26, 10, -2); cg.addColorStop(0, fl ? '#fff' : '#26204a'); cg.addColorStop(1, fl ? '#fff' : '#08060f'); g.fillStyle = cg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
    if (!fl) { g.save(); g.clip(); g.strokeStyle = 'rgba(200,170,255,0.8)'; g.lineWidth = 0.9; for (const [x0, y0, x1, y1, qx] of [[-6, -22, -8, -4, -11], [0, -20, 1, -3, -1], [6, -22, 8, -6, 10]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(qx, (y0 + y1) / 2, x1, y1); g.stroke(); } hatchD(g, [-1, -14, 11, 12], 22, 1.5, '#8a70e0', 0.3, { len: 4, w: 0.5, seed: 161 }); g.restore(); }
    formD(g, ell(0, -24, 8, 9), [0, -24, 8, 9], '#14102a', { flash: fl, spec: 0.3, lw: 2.2, rimc: '190,170,255' });
    if (!fl) { g.fillStyle = '#6a50c8'; g.fillRect(-7.6, -19, 15.2, 1.8); g.fillStyle = '#e8e0ff'; g.fillRect(-1.2, -19.4, 2.4, 2.6); }      // a belt and its clasp
    spikeD(g, -6, -43, -2.0, 15, 2.4, '#f0ecff', fl); spikeD(g, 6, -43, -1.14, 15, 2.4, '#f0ecff', fl);
    maskD(g, 0, -37, 9.2, 10.2, { fill: fl ? '#fff' : null, glow: tele ? '#ffffff' : '#c8a8ff', eyeA: 1, brow: 1, crack: 0.8, lean: 0.3, base: '#f4f0ff' });
    g.save(); g.translate(7, -21); g.rotate(b.slashing === 2 ? -1.9 : b.slashing === 1 ? 0.25 : b.diving ? 1.65 : tele ? -1.2 : (b.casting ? -0.4 : 0.95));
    legD(g, [-5, 1, 0, 1, 5, 0], 2.6, '#14102a', { flash: fl }); heroSword(g, 3, 0, 0, 40, fl ? '#ffffff' : '#e8e0ff'); g.restore();
    if (b.casting) bloom(g, 14, -26, 26, '#d8c8ff', 0.8);
    g.restore();
  };
  if (b.state === 'dying') { g.save(); g.translate(Math.sin(t * 70) * 2.5, 0); }
  if (b.dashing || b.diving) for (let k = 3; k >= 1; k--) pose(-b.face * (b.diving ? 0 : k * 22), 0.18);
  bloom(g, b.cx, b.cy, 84, '#b898ff', 0.12 + (tele ? 0.3 : 0) + (b.phase - 1) * 0.04);
  pose(0, b.alpha);
  if (b.state === 'dying') g.restore();
};
