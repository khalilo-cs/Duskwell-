'use strict';
// The people of Hushvale and the travelling traders, drawn with the detail toolkit: lit forms, faces,
// stitching, a lantern's flame. Each stands with its feet at (n.px, n.py) and looks to the right.
// n.type picks the figure; a trader's palette comes from n.shop (frost, ember, storm, mirror).

const flame = (g, x, y, r, t, col) => {
  bloom(g, x, y, r * 4.2, col || '#ffd98a', 0.5 + 0.1 * Math.sin(t * 9 + x));
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(0, r * 1.2); g.bezierCurveTo(r * 1.1, r * 0.4, r * 0.7, -r * 0.8, Math.sin(t * 11 + x) * 0.8, -r * 1.8); g.bezierCurveTo(-r * 0.7, -r * 0.8, -r * 1.1, r * 0.4, 0, r * 1.2); g.closePath();
  g.fillStyle = '#ffb040'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  g.beginPath(); g.ellipse(0, r * 0.3, r * 0.45, r * 0.8, 0, 0, 7); g.fillStyle = '#fff3c0'; g.fill();
  g.restore();
};
const lantern = (g, x, y, t, col) => {                       // a small hanging lantern
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x, y - 5); g.stroke();
  formD(g, pol([x - 5, y - 5, x + 5, y - 5, x + 6, y, x + 4, y + 9, x - 4, y + 9, x - 6, y]), [x, y + 2, 6, 8], '#6a5238', { spec: 0.2, lw: 1.8 });
  flame(g, x, y + 2.5, 2.4, t, col);
  g.strokeStyle = 'rgba(255,230,160,0.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 3, y - 4); g.lineTo(x - 3, y + 8); g.moveTo(x + 3, y - 4); g.lineTo(x + 3, y + 8); g.stroke();
};
const stitchD = (g, x0, y0, x1, y1, col, n) => {             // a seam of small stitches
  g.save(); g.strokeStyle = col || 'rgba(230,210,170,0.8)'; g.lineWidth = 0.9; g.lineCap = 'round';
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = x0 + dx * u, y = y0 + dy * u; g.beginPath(); g.moveTo(x - nx * 1.5, y - ny * 1.5); g.lineTo(x + nx * 1.5, y + ny * 1.5); g.stroke(); }
  g.restore();
};

const NPC_ART = {};

// ---- the elder: a tall robed figure under a shell hat, an old staff with a crystal
NPC_ART.elder = (g, n, t, bob) => {
  g.save(); groundD(g, 28); g.restore();
  legD(g, [-4, -16, -5, -8, -6, -1], 3.4, '#2a2a38'); legD(g, [4, -16, 5, -8, 6, -1], 3.4, '#2a2a38');
  const robe = c => { c.moveTo(-8, -50 - bob); c.bezierCurveTo(-15, -40, -16, -22, -15, -8); c.lineTo(-9, -4); c.lineTo(-3, -9); c.lineTo(3, -4); c.lineTo(9, -9); c.lineTo(15, -8); c.bezierCurveTo(16, -22, 15, -40, 8, -50 - bob); c.closePath(); };
  formD(g, robe, [0, -28, 15, 24], '#4a4f6a', { spec: 0.22, lw: 3 });
  g.save(); g.beginPath(); robe(g); g.clip();
  g.strokeStyle = 'rgba(10,10,24,0.5)'; g.lineWidth = 1.4; for (const x of [-8, -3, 2, 7]) { g.beginPath(); g.moveTo(x, -44 - bob); g.quadraticCurveTo(x * 1.6, -26, x * 1.5, -6); g.stroke(); }
  g.strokeStyle = 'rgba(190,200,255,0.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-6, -44 - bob); g.quadraticCurveTo(-11, -28, -10, -9); g.stroke();
  g.fillStyle = '#c8b878'; g.fillRect(-16, -12, 32, 2.6); g.fillStyle = '#7a6a40'; for (let x = -12; x < 14; x += 6) { g.beginPath(); g.moveTo(x, -9.4); g.lineTo(x + 2.4, -6); g.lineTo(x - 2.4, -6); g.closePath(); g.fill(); }
  hatchD(g, [0, -28, 15, 24], 40, 1.4, '#ffffff', 0.12, { len: 5, w: 0.8, seed: 9 });
  g.restore();
  formD(g, ell(0, -47 - bob, 12, 5), [0, -47 - bob, 12, 5], '#6a6a86', { lw: 2.4 });                               // shoulder mantle
  for (let i = 0; i < 5; i++) { g.fillStyle = '#d8c888'; g.beginPath(); g.arc(-8 + i * 4, -42 - bob + Math.abs(i - 2) * 0.8, 1.2, 0, 7); g.fill(); }
  maskD(g, 0, -56 - bob, 9.5, 10, { glow: '#bfe6ff', eyeA: 0.7, brow: 0.6, crack: 0.5 });
  antennaD(g, -5, -64 - bob, -2.4, 14, -0.5, '#d8d2c0', { w: 1.6, segs: 5 }); antennaD(g, 5, -64 - bob, -0.74, 14, 0.5, '#d8d2c0', { w: 1.6, segs: 5 });
  // the wide shell hat
  g.save(); g.translate(0, -66 - bob);
  formD(g, c => { c.moveTo(-26, 4); c.quadraticCurveTo(0, -24, 26, 4); c.quadraticCurveTo(0, -2, -26, 4); c.closePath(); }, [0, -6, 26, 12], '#d8d2c0', { spec: 0.4, lw: 3 });
  g.save(); g.beginPath(); g.moveTo(-26, 4); g.quadraticCurveTo(0, -24, 26, 4); g.quadraticCurveTo(0, -2, -26, 4); g.clip();
  g.strokeStyle = 'rgba(90,80,60,0.55)'; g.lineWidth = 1.2; for (const x of [-16, -8, 0, 8, 16]) { g.beginPath(); g.moveTo(x * 0.55, -14); g.quadraticCurveTo(x, -6, x * 1.2, 4); g.stroke(); }
  g.restore(); g.restore();
  // the staff, with a crystal that breathes
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(21, 0); g.lineTo(21, -62); g.stroke();
  g.strokeStyle = '#8a7250'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = 'rgba(255,230,180,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(20, -4); g.lineTo(20, -60); g.stroke();
  g.fillStyle = '#4a3a28'; for (const y of [-20, -34, -48]) { g.fillRect(19.2, y, 3.6, 2.4); }
  g.beginPath(); g.moveTo(21, -62); g.quadraticCurveTo(14, -66, 14, -72); g.moveTo(21, -62); g.quadraticCurveTo(28, -66, 28, -72); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(); g.strokeStyle = '#8a7250'; g.lineWidth = 2; g.stroke();
  const pr = 1 + 0.1 * Math.sin(t * 2.4);
  bloom(g, 21, -70, 26 * pr, '#9fe6ff', 0.65);
  formD(g, pol([21, -80, 26, -71, 21, -62, 16, -71]), [21, -71, 5, 9], '#bff0ff', { spec: 0.6, hi: '#ffffff', lw: 1.8 });
  // hands on the staff
  formD(g, ell(21, -34, 3.2, 2.8), [21, -34, 3, 3], '#d8d2c0', { lw: 1.8 });
};

// ---- the merchant: a round pill-bug under a heavy pack, with a lantern
NPC_ART.merchant = (g, n, t, bob) => {
  groundD(g, 34);
  // the pack, behind
  formD(g, pol([-34, -48, -18, -52, -16, -10, -32, -8]), [-25, -30, 10, 22], '#6a4a30', { spec: 0.2, lw: 3 });
  stitchD(g, -30, -44, -20, -46, '#d8c090', 4); stitchD(g, -31, -12, -19, -12, '#d8c090', 4);
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-26, -50); g.lineTo(-24, -58); g.moveTo(-20, -51); g.lineTo(-14, -58); g.stroke();
  formD(g, ell(-24, -60, 6, 5), [-24, -60, 6, 5], '#8a6a40', { lw: 2.2 }); formD(g, pol([-16, -60, -10, -66, -8, -58, -14, -54]), [-12, -60, 4, 6], '#c8a860', { lw: 2 });
  Art.drawWeapon(g, 'lance', -30, -48, -1.9, 22, t);
  legD(g, [-5, -9, -7, -4, -8, -1], 4.4, '#3a2e56'); legD(g, [7, -9, 8, -4, 10, -1], 4.4, '#3a2e56');
  domeD(g, -2, -22 - bob, 20, 20, 4, '#6a5a8a', { seed: 3 });
  g.fillStyle = 'rgba(250,240,200,0.55)'; for (const [x, y] of [[-12, -30], [-6, -36], [3, -38], [10, -32]]) { g.beginPath(); g.arc(x, y - bob, 1.1, 0, 7); g.fill(); }
  // the belt, with a purse of Geo
  g.fillStyle = INK; g.fillRect(-20, -24 - bob, 36, 5); g.fillStyle = '#7a5a38'; g.fillRect(-19, -23.4 - bob, 34, 3.8);
  formD(g, ell(8, -17 - bob, 5.4, 6), [8, -17 - bob, 5, 6], '#8a6a40', { lw: 2 }); g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(8, -16 - bob, 1.6, 0, 7); g.fill();
  maskD(g, 11, -42 - bob, 9.5, 9.5, { glow: '#ffe0a0', eyeA: 0.75, lean: 1, brow: 0.5 });
  antennaD(g, 7, -50 - bob, -2.1, 12, -0.5, '#4a3a68', { w: 1.8, segs: 5, knob: '#ffe0a0' }); antennaD(g, 14, -50 - bob, -1.0, 12, 0.5, '#4a3a68', { w: 1.8, segs: 5, knob: '#ffe0a0' });
  // the arm and the lantern on its staff
  legD(g, [14, -26 - bob, 21, -26 - bob, 24, -34 - bob], 3.6, '#3a2e56');
  g.strokeStyle = INK; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(24, -2); g.lineTo(24, -48); g.stroke(); g.strokeStyle = '#8a6c48'; g.lineWidth = 1.8; g.stroke();
  lantern(g, 24, -50, t);
};

// ---- the smith: broad and armoured, an apron, a hammer, an anvil with a glowing blank
NPC_ART.smith = (g, n, t, bob) => {
  groundD(g, 42);
  // the anvil on a stump, to the right
  formD(g, pol([20, -14, 34, -14, 33, -2, 21, -2]), [27, -8, 8, 6], '#6a5238', { lw: 2.4 }); hatchD(g, [27, -8, 7, 5], 8, 1.57, '#2a1c10', 0.5, { len: 4, w: 0.8 });
  formD(g, pol([16, -26, 40, -26, 44, -22, 36, -18, 31, -15, 24, -15, 20, -18, 14, -22]), [28, -20, 16, 6], '#585a66', { spec: 0.5, lw: 2.6 });
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(18, -25.2, 20, 1.2);
  const hot = 0.65 + 0.3 * Math.sin(t * 3);                                                       // the blank, glowing on the anvil
  g.save(); g.translate(23, -29); g.rotate(-0.04); g.fillStyle = INK; g.fillRect(-2, -4.2, 26, 8.4); const bg = g.createLinearGradient(0, 0, 26, 0); bg.addColorStop(0, '#ffe0a0'); bg.addColorStop(0.5, '#ff8a3a'); bg.addColorStop(1, '#a8301a'); g.fillStyle = bg; g.fillRect(-1, -3, 24, 6); g.restore();
  bloom(g, 34, -28, 28, '#ff8a3a', 0.35 * hot);
  for (let i = 0; i < 7; i++) {                                                                  // sparks
    const u = ((t * 1.6 + i * 0.37) % 1), a = -1.2 + i * 0.5, r = 6 + u * 22;
    g.fillStyle = 'rgba(255,' + (200 - u * 100 | 0) + ',90,' + (1 - u) + ')'; g.beginPath(); g.arc(34 + Math.cos(a) * r, -30 + Math.sin(a) * r * 0.8 + u * u * 14, 1.5 - u, 0, 7); g.fill();
  }
  // legs and the body
  legD(g, [-8, -14, -9, -7, -10, -1], 6, '#3a3640'); legD(g, [5, -14, 6, -7, 7, -1], 6, '#3a3640');
  formD(g, ell(-3, -30 - bob, 17, 19), [-3, -30 - bob, 17, 19], '#4a4650', { spec: 0.3, lw: 3.2 });                  // the broad shell back
  g.save(); g.beginPath(); g.ellipse(-3, -30 - bob, 17, 19, 0, 0, 7); g.clip();
  g.strokeStyle = 'rgba(255,120,40,' + 0.45 * hot + ')'; g.lineWidth = 1.6; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(-16, -34); g.lineTo(-10, -30); g.lineTo(-12, -22); g.lineTo(-6, -18); g.moveTo(8, -38); g.lineTo(4, -32); g.lineTo(9, -26); g.stroke();
  hatchD(g, [-3, -30, 17, 19], 30, 1.2, '#ffffff', 0.1, { len: 4, w: 0.8, seed: 4 });
  g.restore();
  // the apron
  formD(g, c => { c.moveTo(-8, -40 - bob); c.lineTo(9, -40 - bob); c.lineTo(11, -9); c.lineTo(-10, -9); c.closePath(); }, [0, -24, 10, 16], '#7a5232', { spec: 0.18, lw: 2.6 });
  stitchD(g, -8, -38 - bob, 8, -38 - bob, '#e8d098', 6); stitchD(g, -9, -10, 10, -10, '#e8d098', 7);
  formD(g, c => { c.moveTo(-6, -26); c.lineTo(7, -26); c.lineTo(7, -18); c.lineTo(-6, -18); c.closePath(); }, [0, -22, 7, 4], '#8a6038', { spec: 0.1, lw: 1.8 }); rivetD(g, -5, -25, 1.1); rivetD(g, 6, -25, 1.1);
  g.fillStyle = '#c8c8d0'; g.fillRect(-5, -23, 2.4, 2.6); g.fillRect(-1.6, -23, 2.4, 2.6); g.fillRect(1.8, -23, 2.4, 2.6);          // pliers and files in the pocket
  // the head: a soot-grey mask, with short horns, a brow and a scar
  spikeD(g, -6, -52 - bob, -2.1, 10, 2.8, '#8a7a68'); spikeD(g, 9, -52 - bob, -1.05, 10, 2.8, '#8a7a68');
  maskD(g, 2, -46 - bob, 10.5, 10, { base: '#cbbfae', glow: '#ff9a50', eyeA: 0.85, brow: 1, lean: 0.6 });
  g.strokeStyle = 'rgba(40,30,28,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-3, -50 - bob); g.lineTo(2, -43 - bob); g.stroke();
  g.fillStyle = 'rgba(30,20,16,0.28)'; g.beginPath(); g.ellipse(2, -41 - bob, 8, 3, 0, 0, 7); g.fill();                    // soot
  // the arm and the hammer on the shoulder
  const swing = Math.sin(t * 1.4) * 0.06;
  g.save(); g.translate(8, -30 - bob); g.rotate(-1.1 + swing);
  g.fillStyle = INK; g.fillRect(-2, -4, 44, 8); const wg = g.createLinearGradient(0, -3, 0, 3); wg.addColorStop(0, '#9a7a50'); wg.addColorStop(1, '#4a3820'); g.fillStyle = wg; g.fillRect(-1, -2.8, 42, 5.6);
  formD(g, pol([36, -10, 56, -10, 56, 10, 36, 10]), [46, 0, 10, 10], '#6a6e7a', { spec: 0.5, lw: 2.6 }); rivetD(g, 40, -6, 1.4); rivetD(g, 40, 6, 1.4); rivetD(g, 52, -6, 1.4); rivetD(g, 52, 6, 1.4);
  g.restore();
  legD(g, [6, -34 - bob, 12, -30 - bob, 16, -36 - bob], 5.4, '#4a4650');
  formD(g, ell(17, -37 - bob, 4.4, 4), [17, -37 - bob, 4, 4], '#3a3640', { lw: 2 });
};

// ---- the outfitter: slender and moth-like, with folded wings, needle and spool, and a rack of cloaks
NPC_ART.outfitter = (g, n, t, bob) => {
  groundD(g, 38);
  // the rack: a pole between two posts with three cloaks hanging
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(22, -2); g.lineTo(22, -66); g.moveTo(58, -2); g.lineTo(58, -66); g.moveTo(20, -64); g.lineTo(60, -64); g.stroke();
  g.strokeStyle = '#8a6c48'; g.lineWidth = 2.6; g.stroke();
  const sway = Math.sin(t * 1.6);
  ['ironhide', 'windweave', 'soulveil'].forEach((id, i) => { const x = 30 + i * 13; g.save(); g.translate(x + sway * (i - 1) * 0.6, 0); g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -64); g.lineTo(0, -58); g.stroke(); Art.cloakIcon(g, id, 0, -40, 22, t + i); g.restore(); });
  legD(g, [-3, -18, -4, -9, -5, -1], 2.8, '#3a2a48'); legD(g, [4, -18, 5, -9, 6, -1], 2.8, '#3a2a48');
  // the wings, folded behind like a cape
  wingD(g, -3, -44 - bob, 2.5, 34, 20, '#b8a8e8', { alpha: 0.5, veins: 7, lw: 2.2 }); wingD(g, -3, -40 - bob, 2.8, 30, 17, '#9a88d0', { alpha: 0.55, veins: 6, lw: 2.2 });
  // the long dress, patched and stitched
  const dress = c => { c.moveTo(-7, -46 - bob); c.bezierCurveTo(-11, -34, -14, -18, -15, -3); c.lineTo(-8, -6); c.lineTo(-3, -2); c.lineTo(3, -6); c.lineTo(9, -3); c.lineTo(14, -4); c.bezierCurveTo(12, -18, 9, -34, 6, -46 - bob); c.closePath(); };
  formD(g, dress, [0, -26, 14, 22], '#5a3a78', { spec: 0.25, lw: 3 });
  g.save(); g.beginPath(); dress(g); g.clip();
  const patch = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(x, y, w, h); stitchD(g, x, y + 1, x + w, y + 1, 'rgba(255,240,200,0.8)', 4); };
  patch(-10, -20, 7, 7, '#36cfc2'); patch(2, -28, 7, 6, '#ffd070'); patch(-4, -9, 8, 6, '#ff9bd6');
  g.strokeStyle = 'rgba(255,230,255,0.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5, -42 - bob); g.quadraticCurveTo(-9, -26, -10, -6); g.stroke();
  g.restore();
  g.fillStyle = '#ffd070'; g.fillRect(-8, -34 - bob, 15, 2.4); g.fillStyle = INK; g.fillRect(-8, -35 - bob, 15, 0.8); g.fillRect(-8, -32.2 - bob, 15, 0.8);   // the sash
  // pincushion on the wrist and a tape measure around the neck
  formD(g, ell(-12, -30 - bob, 4, 3.6), [-12, -30 - bob, 4, 4], '#d8506a', { lw: 1.8 }); for (const [x, y] of [[-14, -33], [-11, -34], [-9, -32]]) { g.strokeStyle = '#e8e8f0'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y - bob); g.lineTo(x - 1, y - 4 - bob); g.stroke(); g.fillStyle = '#ffd070'; g.beginPath(); g.arc(x - 1, y - 4.4 - bob, 0.9, 0, 7); g.fill(); }
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-7, -47 - bob); g.quadraticCurveTo(0, -40 - bob, 7, -47 - bob); g.stroke(); g.strokeStyle = '#f0e0b0'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 0.8; for (let x = -5; x <= 5; x += 2.2) { g.beginPath(); g.moveTo(x, -45.4 - bob + Math.abs(x) * 0.1); g.lineTo(x, -43.6 - bob + Math.abs(x) * 0.1); g.stroke(); }
  // the head: a soft mask with big green eyes, feathery antennae
  maskD(g, 1, -57 - bob, 9, 9.6, { base: '#efe8f4', glow: '#7fffd8', eyeA: 0.85, brow: 0.3, lean: 1 });
  g.fillStyle = 'rgba(255,150,190,0.4)'; g.beginPath(); g.ellipse(-4, -53 - bob, 2.6, 1.6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(8, -53 - bob, 2.6, 1.6, 0, 0, 7); g.fill();
  antennaD(g, -3, -65 - bob, -2.2, 15, -0.7, '#b8a8e8', { w: 1.5, segs: 6, knob: '#ffd0ff' }); antennaD(g, 6, -65 - bob, -0.9, 15, 0.7, '#b8a8e8', { w: 1.5, segs: 6, knob: '#ffd0ff' });
  // the sewing hand: a long needle with a trailing thread, and a spool in the other
  const nx = 17, ny = -34 - bob + Math.sin(t * 2.2) * 1.4;
  legD(g, [6, -40 - bob, 11, -36 - bob, nx, ny], 2.6, '#d8c8f0');
  g.strokeStyle = INK; g.lineWidth = 3.2; g.beginPath(); g.moveTo(nx - 2, ny + 1); g.lineTo(nx + 15, ny - 11); g.stroke(); g.strokeStyle = '#eef0f8'; g.lineWidth = 1.6; g.stroke();
  g.strokeStyle = '#ff9bd6'; g.lineWidth = 1; g.beginPath(); g.moveTo(nx + 15, ny - 11); g.quadraticCurveTo(nx + 6, ny - 24 + Math.sin(t * 3) * 3, nx - 8, ny - 14); g.stroke();
  formD(g, pol([-16, -26 - bob, -10, -26 - bob, -10, -18 - bob, -16, -18 - bob]), [-13, -22 - bob, 3, 4], '#d8506a', { lw: 1.6 });
};

// ---- the travelling trader: a hooded walker under a huge pack of goods; the cloak takes its colour from the shop
const TRADER_PAL = {
  frost:  { cloak: '#9fb4d0', trim: '#ffffff', eye: '#9fe6ff', fur: true,  lamp: '#bfe8ff' },
  ember:  { cloak: '#7a2a1c', trim: '#ff9a50', eye: '#ffb040', fur: false, lamp: '#ff9a50' },
  storm:  { cloak: '#3a4a78', trim: '#a8c0ff', eye: '#bfd0ff', fur: false, lamp: '#cfe0ff' },
  mirror: { cloak: '#7a8898', trim: '#e8f0ff', eye: '#ffffff', fur: false, lamp: '#e8f0ff' },
  ossuary: { cloak: '#8a7e66', trim: '#e8dcc0', eye: '#9fe8c0', fur: false, lamp: '#9fe8c0' },
  lunar:  { cloak: '#2a3070', trim: '#ffe6a8', eye: '#e8ecff', fur: false, lamp: '#e8ecff' },
};
NPC_ART.trader = (g, n, t, bob) => {
  const pal = TRADER_PAL[n.shop] || TRADER_PAL.frost;
  groundD(g, 36);
  // the pack: a frame piled with sacks, rolls, a pot and blades sticking out
  g.save(); g.translate(-22, -34 - bob);
  Art.drawWeapon(g, ({ ember: 'cleaver', storm: 'scythe', mirror: 'rapier', ossuary: 'bonesaw', lunar: 'rapier' })[n.shop] || 'fangs', -4, -14, -1.2, 30, t);
  formD(g, ell(0, 4, 17, 21), [0, 4, 17, 21], '#7a5a38', { spec: 0.25, lw: 3 });
  g.save(); g.beginPath(); g.ellipse(0, 4, 17, 21, 0, 0, 7); g.clip();
  stitchD(g, -16, -8, 16, -8, '#e8d098', 12); stitchD(g, -16, 10, 16, 10, '#e8d098', 12);
  hatchD(g, [0, 4, 17, 21], 36, 1.2, '#2a1c10', 0.35, { len: 5, w: 0.9, seed: 8 });
  g.restore();
  formD(g, ell(-5, -20, 11, 7), [-5, -20, 11, 7], '#8a6a40', { lw: 2.4 }); stitchD(g, -14, -20, 4, -20, '#e8d098', 6);                 // a sack on top
  formD(g, c => { c.rect(-14, 10, 28, 7); }, [0, 13, 14, 4], pal.cloak, { lw: 2.2 }); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; for (const x of [-8, -2, 4, 10]) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 17); g.stroke(); }  // a rolled cloth
  formD(g, ell(12, -14, 6, 6), [12, -14, 6, 6], '#585a66', { spec: 0.6, lw: 2 }); g.fillStyle = INK; g.beginPath(); g.ellipse(12, -19, 4.4, 1.4, 0, 0, 7); g.fill();   // a pot
  g.restore();
  lantern(g, -34, -30 - bob + Math.sin(t * 1.5) * 1.2, t, pal.lamp);
  legD(g, [-4, -16, -5, -8, -6, -1], 3.8, '#2a2a34'); legD(g, [5, -16, 6, -8, 8, -1], 3.8, '#2a2a34');
  // the long cloak
  const cl = c => { c.moveTo(-9, -52 - bob); c.bezierCurveTo(-16, -40, -17, -22, -16, -4); c.lineTo(-9, -9); c.lineTo(-3, -3); c.lineTo(3, -9); c.lineTo(9, -4); c.lineTo(16, -9); c.bezierCurveTo(16, -22, 15, -40, 9, -52 - bob); c.closePath(); };
  formD(g, cl, [0, -28, 16, 26], pal.cloak, { spec: 0.25, lw: 3 });
  g.save(); g.beginPath(); cl(g); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.4; for (const x of [-7, -1, 5, 10]) { g.beginPath(); g.moveTo(x * 0.7, -48 - bob); g.quadraticCurveTo(x * 1.5, -26, x * 1.4, -4); g.stroke(); }
  g.fillStyle = pal.trim; g.globalAlpha = 0.9; g.fillRect(-20, -9, 40, 2.4); g.globalAlpha = 1;
  if (pal.fur) { g.fillStyle = '#ffffff'; for (let x = -18; x < 18; x += 4) { g.beginPath(); g.arc(x, -5, 3.2, 0, 7); g.fill(); } }
  if (n.shop === 'mirror') { g.fillStyle = 'rgba(255,255,255,0.35)'; for (const [x, y] of [[-8, -30], [4, -22], [-2, -40], [9, -34]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 3); g.lineTo(x + 1, y + 8); g.lineTo(x - 3, y + 4); g.closePath(); g.fill(); } }
  if (n.shop === 'ember') { const eg = g.createLinearGradient(0, -12, 0, -2); eg.addColorStop(0, 'rgba(255,140,50,0)'); eg.addColorStop(1, 'rgba(255,170,70,' + (0.55 + 0.25 * Math.sin(t * 4)) + ')'); g.fillStyle = eg; g.fillRect(-20, -12, 40, 10); }
  hatchD(g, [0, -28, 16, 26], 36, 1.4, '#ffffff', 0.11, { len: 5, w: 0.8, seed: 12 });
  g.restore();
  // the hood: a deep dark opening with two lit eyes
  formD(g, c => { c.moveTo(-11, -48 - bob); c.bezierCurveTo(-12, -64, -4, -70, 3, -69 - bob); c.bezierCurveTo(12, -68, 13, -56, 11, -48 - bob); c.quadraticCurveTo(0, -43 - bob, -11, -48 - bob); c.closePath(); }, [0, -58 - bob, 12, 12], pal.cloak, { spec: 0.35, lw: 3 });
  g.fillStyle = '#07090f'; g.beginPath(); g.ellipse(2.4, -55 - bob, 7.4, 8.6, 0, 0, 7); g.fill();
  for (const dx of [-1.6, 6.2]) { const bl = (t % 4.3) < 0.1; bloom(g, dx, -55 - bob, 8, pal.eye, 0.7); g.fillStyle = pal.eye; g.beginPath(); g.ellipse(dx, -55 - bob, 1.9, bl ? 0.3 : 2.6, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(dx - 0.5, -56 - bob, 0.7, 0, 7); g.fill(); }
  g.strokeStyle = pal.trim; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, -49 - bob); g.bezierCurveTo(-11, -62, -4, -68, 3, -68 - bob); g.stroke();
  // the staff and a hand on it
  g.strokeStyle = INK; g.lineWidth = 4.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 0); g.lineTo(20, -56); g.stroke(); g.strokeStyle = '#8a7250'; g.lineWidth = 2.4; g.stroke();
  formD(g, ell(20, -30, 3.4, 3), [20, -30, 3, 3], '#2a2a34', { lw: 1.8 });
  const hk = (x, y, r) => { g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.arc(x, y, r, 0.3, 4.4); g.stroke(); g.strokeStyle = '#c8c8d0'; g.lineWidth = 1.6; g.stroke(); };
  hk(20, -58, 5);
};

Art.drawNPC = function (g, n, t) {
  const fn = NPC_ART[n.type] || NPC_ART.merchant;
  const bob = Math.sin(t * 2 + n.px) * 1.2;
  g.save(); g.translate(n.px, n.py); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g, n, t, bob);
  g.restore();
};
