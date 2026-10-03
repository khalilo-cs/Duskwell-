'use strict';
// Art for the equipment: the weapons (in the hand, on the shop shelf), the cloaks, the icons of the
// nail arts, and the effects of the three arts (Moon Rend, Dusk Rush, Soul Nova). Weapons are drawn
// along +x from the guard, like heroSword in art_sprites.js, which this file wraps.

const gradV = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
const WEAPON_ART = {};

// ---- Duskblade: a long blue steel blade, winged guard, glowing runes
WEAPON_ART.duskblade = (g, len, f, plain, t) => {
  g.beginPath(); g.rect(-11, -2.2, 11, 4.4); fs(g, plain || '#1e2a4a', INK, 2.2);
  if (!plain) { g.strokeStyle = '#9ad0ff'; g.lineWidth = 1.2; for (let k = -10; k < 0; k += 2.6) { g.beginPath(); g.moveTo(k, -2); g.lineTo(k + 1.6, 2); g.stroke(); } }
  g.beginPath(); g.arc(-13.5, 0, 3, 0, 7); fs(g, plain || '#6aa8ff', INK, 2);
  if (!plain) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-14.2, -0.9, 0.9, 0, 7); g.fill(); }
  poly(g, [-1.5, -9.5, 3.5, -7, 3.5, 7, -1.5, 9.5, -3, 4, -3, -4]); fs(g, plain || '#d8b868', INK, 2.2);          // winged guard
  if (!plain) { g.strokeStyle = 'rgba(255,240,190,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-0.5, -8); g.lineTo(2.4, -6); g.stroke(); }
  const L = len * 1.12;
  g.beginPath(); g.moveTo(3.5, -3.2); g.lineTo(L - 12, -2.6); g.lineTo(L, 0); g.lineTo(L - 12, 2.6); g.lineTo(3.5, 3.2); g.closePath();
  if (plain) fs(g, plain, INK, 2.4);
  else {
    fs(g, gradV(g, -3.2, 3.2, ['#ffffff', '#b8dcff', '#5a80b8']), INK, 2.4);
    g.strokeStyle = '#2f4f90'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(6, 0); g.lineTo(L - 14, 0); g.stroke();
    const a = 0.55 + 0.35 * Math.sin(t * 3);
    g.fillStyle = 'rgba(120,230,255,' + a + ')';
    for (let d = 10; d < L - 14; d += 7) { g.beginPath(); g.moveTo(d - 1.4, 0); g.lineTo(d, -1.2); g.lineTo(d + 1.4, 0); g.lineTo(d, 1.2); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(4, -2.2); g.lineTo(L - 12, -1.8); g.stroke();
  }
};

// ---- Gale Lance: a long shaft, a leaf-shaped head, a teal tassel that flutters
WEAPON_ART.lance = (g, len, f, plain, t) => {
  const tip = len * 1.05;
  g.beginPath(); g.moveTo(-17, -1.9); g.lineTo(tip * 0.62, -1.6); g.lineTo(tip * 0.62, 1.6); g.lineTo(-17, 1.9); g.closePath();
  fs(g, plain || gradV(g, -2, 2, ['#8a6a44', '#5a4228', '#2e2014']), INK, 2.2);
  if (!plain) {
    g.strokeStyle = '#36cfc2'; g.lineWidth = 1.6; for (const x of [-12, -2, 8]) { g.beginPath(); g.moveTo(x, -2); g.lineTo(x + 1.4, 2); g.stroke(); }
    g.strokeStyle = 'rgba(255,230,180,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-15, -1); g.lineTo(tip * 0.6, -0.9); g.stroke();
  }
  g.beginPath(); g.arc(-18.5, 0, 2.6, 0, 7); fs(g, plain || '#c8d0d8', INK, 2);                       // butt cap
  const x0 = tip * 0.6;
  poly(g, [x0 - 1, -3.4, x0 + 3, -2.2, x0 + 2.6, 2.2, x0 - 1, 3.4]); fs(g, plain || '#d8b868', INK, 2.2);   // socket
  g.beginPath(); g.moveTo(x0 + 2, 0); g.bezierCurveTo(x0 + 5, -7.5, x0 + 15, -7, tip + 8, 0); g.bezierCurveTo(x0 + 15, 7, x0 + 5, 7.5, x0 + 2, 0); g.closePath();   // the head
  fs(g, plain || gradV(g, -7, 7, ['#ffffff', '#cfeee0', '#7aa898']), INK, 2.4);
  if (!plain) { g.strokeStyle = 'rgba(50,100,90,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 5, 0); g.lineTo(tip + 3, 0); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x0 + 5, -3.4); g.quadraticCurveTo(x0 + 13, -4.4, tip + 2, -0.8); g.stroke(); }
  const w = Math.sin(t * 7) * 2.4;                                                                     // tassel
  g.strokeStyle = INK; g.lineWidth = 4.6; g.beginPath(); g.moveTo(x0 - 2, 2); g.quadraticCurveTo(x0 - 8, 8 + w, x0 - 15, 6 - w); g.stroke();
  g.strokeStyle = plain || '#36cfc2'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x0 - 2, 2); g.quadraticCurveTo(x0 - 8, 8 + w, x0 - 15, 6 - w); g.stroke();
};

// ---- Twin Fangs: two curved daggers held together
WEAPON_ART.fangs = (g, len, f, plain, t) => {
  for (const [rot, dy, col] of [[-0.22, -3.2, '#e8dcff'], [0.2, 3.4, '#c0a8f0']]) {
    g.save(); g.translate(0, dy); g.rotate(rot);
    g.beginPath(); g.rect(-8, -1.7, 8, 3.4); fs(g, plain || '#2a1e3e', INK, 2);
    g.beginPath(); g.arc(-9.5, 0, 2.2, 0, 7); fs(g, plain || '#a888e0', INK, 1.8);
    poly(g, [-1.2, -5, 2.4, -3.4, 2.4, 3.4, -1.2, 5]); fs(g, plain || '#c8a868', INK, 2);
    const L = len * 0.62;
    g.beginPath(); g.moveTo(2.4, -2.8); g.bezierCurveTo(L * 0.6, -4.6, L * 0.95, -2.4, L, 3.4); g.bezierCurveTo(L * 0.7, 1.6, L * 0.4, 1.8, 2.4, 2.8); g.closePath();
    fs(g, plain || gradV(g, -4, 3, ['#ffffff', col, '#7a60b0']), INK, 2.2);
    if (!plain) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(5, -2.2); g.bezierCurveTo(L * 0.6, -3.7, L * 0.9, -1.8, L - 1.5, 2.6); g.stroke(); g.fillStyle = INK; g.beginPath(); g.moveTo(L * 0.45, 1.4); g.lineTo(L * 0.52, 3); g.lineTo(L * 0.6, 1.4); g.fill(); }
    g.restore();
  }
};

// ---- Ember Cleaver: wide, heavy iron with glowing cracks
WEAPON_ART.cleaver = (g, len, f, plain, t) => {
  g.beginPath(); g.rect(-12, -2.6, 12, 5.2); fs(g, plain || '#3a2418', INK, 2.2);
  if (!plain) { g.strokeStyle = '#ff9a50'; g.lineWidth = 1.4; for (let k = -11; k < 0; k += 3.2) { g.beginPath(); g.moveTo(k, -2.4); g.lineTo(k + 2, 2.4); g.stroke(); } }
  g.beginPath(); g.arc(-14.5, 0, 3.6, 0, 7); fs(g, plain || '#6a4a38', INK, 2.2);
  poly(g, [-1.5, -8, 4, -7, 4, 7, -1.5, 8]); fs(g, plain || '#4a4448', INK, 2.4);
  const L = len * 0.95;
  g.beginPath(); g.moveTo(4, -5.2); g.lineTo(L - 4, -7.4); g.lineTo(L + 3, -3); g.lineTo(L + 3, 3.4); g.lineTo(L - 4, 8.8); g.lineTo(4, 5.2); g.closePath();
  if (plain) fs(g, plain, INK, 2.6);
  else {
    fs(g, gradV(g, -8, 9, ['#8a8084', '#524a50', '#2a2428']), INK, 2.6);
    g.save(); g.clip();
    const a = 0.65 + 0.3 * Math.sin(t * 4);
    g.strokeStyle = 'rgba(255,140,50,' + a + ')'; g.lineWidth = 1.7; g.lineJoin = 'miter';
    g.beginPath(); g.moveTo(8, 0); g.lineTo(L * 0.3, -2.6); g.lineTo(L * 0.45, 1); g.lineTo(L * 0.7, -1.6); g.lineTo(L, 0.4); g.stroke();
    g.beginPath(); g.moveTo(L * 0.3, -2.6); g.lineTo(L * 0.36, -6); g.moveTo(L * 0.45, 1); g.lineTo(L * 0.5, 5.6); g.stroke();
    g.strokeStyle = 'rgba(255,230,160,' + a * 0.6 + ')'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(8, 0); g.lineTo(L * 0.3, -2.6); g.lineTo(L * 0.45, 1); g.lineTo(L * 0.7, -1.6); g.lineTo(L, 0.4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(5, 5); g.lineTo(L - 4, 8); g.stroke();
    g.restore();
    g.fillStyle = '#c8b8a8'; for (const x of [9, 17]) { g.beginPath(); g.arc(x, -3.6, 0.9, 0, 7); g.fill(); g.beginPath(); g.arc(x, 3.6, 0.9, 0, 7); g.fill(); }
  }
};

// ---- Moon Scythe: a long pole and a pale crescent blade
WEAPON_ART.scythe = (g, len, f, plain, t) => {
  const pole = len * 0.72;
  g.beginPath(); g.moveTo(-20, -1.8); g.lineTo(pole, -1.5); g.lineTo(pole, 1.5); g.lineTo(-20, 1.8); g.closePath();
  fs(g, plain || gradV(g, -2, 2, ['#5a5a78', '#34344e', '#1c1c2e']), INK, 2.2);
  if (!plain) { g.strokeStyle = '#cfe0ff'; g.lineWidth = 1.5; for (const x of [-14, -4, 6, 16]) { g.beginPath(); g.moveTo(x, -2); g.lineTo(x + 1.2, 2); g.stroke(); } }
  g.beginPath(); g.arc(-21.5, 0, 2.6, 0, 7); fs(g, plain || '#cfe0ff', INK, 2);
  poly(g, [pole - 3, -3.4, pole + 2, -2.4, pole + 2, 2.4, pole - 3, 3.4]); fs(g, plain || '#a8b8d8', INK, 2);
  // the blade sweeps out and forward like a crescent moon
  g.beginPath(); g.moveTo(pole, 1.2);
  g.bezierCurveTo(pole + 2, -14, pole + 16, -26, pole + 40, -22);
  g.bezierCurveTo(pole + 26, -19, pole + 14, -13, pole + 10, 1.6);
  g.closePath();
  fs(g, plain || gradV(g, -26, 2, ['#ffffff', '#dfe9ff', '#8aa0d0']), INK, 2.5);
  if (!plain) {
    bloom(g, pole + 18, -14, 26, '#cfe0ff', 0.3 + 0.1 * Math.sin(t * 3));
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pole + 2, -4); g.bezierCurveTo(pole + 6, -14, pole + 18, -22, pole + 36, -21.2); g.stroke();
    g.fillStyle = 'rgba(120,150,220,0.8)'; for (const [x, y] of [[pole + 8, -4], [pole + 14, -9], [pole + 21, -13]]) { g.beginPath(); g.arc(x, y, 0.9, 0, 7); g.fill(); }
  }
};

// ---- Star Rapier: slim blade, cup guard, a gold star pommel
WEAPON_ART.rapier = (g, len, f, plain, t) => {
  g.beginPath(); g.rect(-11, -1.9, 11, 3.8); fs(g, plain || '#6a1e2e', INK, 2);
  if (!plain) { g.strokeStyle = '#ffd890'; g.lineWidth = 1; for (let k = -10; k < 0; k += 2.8) { g.beginPath(); g.moveTo(k, -1.8); g.lineTo(k + 1.8, 1.8); g.stroke(); } }
  const star = (r, ro) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ro : r; g.lineTo(-14 + Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); };
  star(4.2, 1.8); fs(g, plain || '#ffd890', INK, 1.8);
  g.beginPath(); g.moveTo(-1, -2); g.bezierCurveTo(6, -9, 6, 9, -1, 2); g.closePath(); fs(g, plain || '#e8c070', INK, 2.2);             // cup guard
  g.strokeStyle = INK; g.lineWidth = 3.6; g.beginPath(); g.moveTo(-1, 7.4); g.quadraticCurveTo(-8, 8, -9.5, 1.4); g.stroke();
  g.strokeStyle = plain || '#e8c070'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-1, 7.4); g.quadraticCurveTo(-8, 8, -9.5, 1.4); g.stroke();      // knuckle bow
  const L = len * 1.2;
  g.beginPath(); g.moveTo(3, -1.7); g.lineTo(L - 6, -1); g.lineTo(L, 0); g.lineTo(L - 6, 1); g.lineTo(3, 1.7); g.closePath();
  if (plain) fs(g, plain, INK, 2.2);
  else {
    fs(g, gradV(g, -1.8, 1.8, ['#ffffff', '#fff1c8', '#c8aa60']), INK, 2.2);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(4, -1); g.lineTo(L - 6, -0.6); g.stroke();
    const s = 0.5 + 0.5 * Math.sin(t * 5);
    bloom(g, L, 0, 9 + s * 5, '#fff3c0', 0.5); g.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * s) + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(L - 4, 0); g.lineTo(L + 4, 0); g.moveTo(L, -4); g.lineTo(L, 4); g.stroke();
  }
};

// ---- Bone Saw: a blade of old bone with a toothed edge
WEAPON_ART.bonesaw = (g, len, f, plain, t) => {
  g.beginPath(); g.rect(-11, -2.3, 11, 4.6); fs(g, plain || '#4a3a2a', INK, 2.2);
  if (!plain) { g.strokeStyle = '#d8cfba'; g.lineWidth = 1.3; for (let k = -10; k < 0; k += 3) { g.beginPath(); g.moveTo(k, -2.2); g.lineTo(k + 1.6, 2.2); g.stroke(); } }
  g.beginPath(); g.arc(-13.5, 0, 3.4, 0, 7); fs(g, plain || '#e8dcc0', INK, 2.2);
  if (!plain) { g.fillStyle = INK; g.beginPath(); g.arc(-14.6, -0.6, 0.8, 0, 7); g.arc(-12.4, -0.6, 0.8, 0, 7); g.fill(); }
  poly(g, [-1.5, -7, 3.5, -6, 3.5, 6, -1.5, 7]); fs(g, plain || '#8a7a60', INK, 2.2);
  const L = len * 1.0;
  g.beginPath(); g.moveTo(3.5, -4.4); g.lineTo(L - 2, -4.8); g.lineTo(L + 4, -2.2); g.lineTo(L + 2, 3.8);
  for (let x = L; x > 6; x -= 4.6) { g.lineTo(x - 1.6, 8.4); g.lineTo(x - 4.6, 4.2); }
  g.lineTo(3.5, 4.6); g.closePath();
  if (plain) fs(g, plain, INK, 2.4);
  else {
    fs(g, gradV(g, -5, 8, ['#fffaf0', '#e8dcc0', '#a89878']), INK, 2.4);
    g.strokeStyle = 'rgba(110,90,60,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(8, -1); g.lineTo(L - 6, -1.4); g.moveTo(14, 1.6); g.lineTo(L - 12, 1.2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(5, -3.6); g.lineTo(L - 3, -3.8); g.stroke();
    g.fillStyle = 'rgba(120,20,20,0.5)'; g.beginPath(); g.arc(L - 10, 5, 1.2, 0, 7); g.fill();
  }
};

// the sword the hero wears is whatever is equipped
const CARRY_K = { lance: 0.62, scythe: 0.6, rapier: 0.72, duskblade: 0.9 };
const heroSwordBase = heroSword;
heroSword = function (g, x, y, ang, len, plain) {
  const id = Gear.weapon();
  if (id === 'nail' || !WEAPON_ART[id]) { heroSwordBase(g, x, y, ang, len, plain); return; }
  g.save(); g.translate(x, y); g.rotate(ang); g.lineJoin = 'round'; g.lineCap = 'round';
  WEAPON_ART[id](g, len <= 30 ? len * (CARRY_K[id] || 1) : len, len / 40, plain, (G && G.t) || 0);       // the long ones are worn shorter on the back
  g.restore();
};
// any weapon at any place (shop shelf, equipment screen): same drawing, chosen by id
Art.drawWeapon = function (g, id, x, y, ang, len, t) {
  g.save(); g.translate(x, y); g.rotate(ang); g.lineJoin = 'round'; g.lineCap = 'round';
  if (id === 'nail' || !WEAPON_ART[id]) { g.restore(); heroSwordBase(g, x, y, ang, len, null); return; }
  WEAPON_ART[id](g, len, len / 40, null, t || 0);
  g.restore();
};

// ---------------------------------------------------------------- icons
const ICON_K = { nail: 0.62, duskblade: 0.56, lance: 0.5, fangs: 0.8, cleaver: 0.62, scythe: 0.46, rapier: 0.52, bonesaw: 0.62 };
Art.weaponIcon = function (g, id, x, y, size, t) {
  const k = size / 26 * (ICON_K[id] || 0.6) * 2.0;
  g.save(); g.translate(x, y); g.rotate(-0.78); g.scale(k, k);
  const off = { nail: -16, duskblade: -20, lance: -16, fangs: -14, cleaver: -18, scythe: -24, rapier: -22, bonesaw: -18 }[id] || -16;
  g.translate(off, 0);
  Art.drawWeapon(g, id, 0, 0, 0, 40, t || 0);
  g.restore();
};
Art.cloakIcon = function (g, id, x, y, size, t) {
  const c = Gear.CLOAKS[id], s = size / 26;
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  const tt = t || 0, sw = Math.sin(tt * 2) * 0.8;
  if (id === 'windweave') {                                    // streamers behind
    g.strokeStyle = INK; g.lineWidth = 5; for (const dy of [-8, 0, 8]) { g.beginPath(); g.moveTo(-6, dy); g.quadraticCurveTo(-18, dy + 3 + sw * 2, -26, dy - 2); g.stroke(); }
    g.strokeStyle = c.trim; g.lineWidth = 2.4; for (const dy of [-8, 0, 8]) { g.beginPath(); g.moveTo(-6, dy); g.quadraticCurveTo(-18, dy + 3 + sw * 2, -26, dy - 2); g.stroke(); }
  }
  // the cloak body
  g.beginPath(); g.moveTo(0, -20); g.bezierCurveTo(12, -18, 17, -6, 19, 15); g.lineTo(11, 12 + sw); g.lineTo(5, 18); g.lineTo(0, 12); g.lineTo(-5, 18); g.lineTo(-11, 12 - sw); g.lineTo(-19, 15); g.bezierCurveTo(-17, -6, -12, -18, 0, -20); g.closePath();
  const gr = g.createLinearGradient(0, -20, 0, 18); gr.addColorStop(0, shade(c.color, 1.25)); gr.addColorStop(0.6, c.color); gr.addColorStop(1, shade(c.color, 0.55));
  fs(g, gr, INK, 2.6);
  g.save(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5, -14); g.quadraticCurveTo(-8, 0, -7, 14); g.moveTo(5, -14); g.quadraticCurveTo(8, 0, 7, 14); g.stroke();
  g.fillStyle = rgba(c.trim, 0.9); g.fillRect(-22, 11, 44, 3.2);                                      // hem trim
  if (id === 'ironhide' || id === 'boneward') {                                                        // plates
    for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(sg * 12, -9, 8, 5, sg * 0.4, 0, 7); fs(g, id === 'boneward' ? '#efe6d0' : '#a8b0c4', INK, 1.8); g.fillStyle = id === 'boneward' ? '#6a5a44' : '#e8eef8'; for (const dx of [-3, 0, 3]) { g.beginPath(); g.arc(sg * 12 + dx, -9 + sg * dx * 0.3, 0.9, 0, 7); g.fill(); } }
    if (id === 'boneward') { g.strokeStyle = '#efe6d0'; g.lineWidth = 2; for (const y of [-2, 3, 8]) { g.beginPath(); g.moveTo(-8, y); g.quadraticCurveTo(0, y + 3, 8, y); g.stroke(); } }
  } else if (id === 'frostfur') {
    g.fillStyle = '#ffffff'; for (let x = -20; x < 22; x += 4) { g.beginPath(); g.arc(x, 13, 3.3, 0, 7); g.fill(); }
    for (let x = -14; x < 16; x += 5) { g.beginPath(); g.arc(x, -15, 3.8, 0, 7); g.fill(); }
  } else if (id === 'emberweave') {
    const a = 0.6 + 0.3 * Math.sin(tt * 4);
    const eg = g.createLinearGradient(0, 4, 0, 16); eg.addColorStop(0, 'rgba(255,140,50,0)'); eg.addColorStop(1, 'rgba(255,170,70,' + a + ')'); g.fillStyle = eg; g.fillRect(-22, 4, 44, 14);
  } else if (id === 'soulveil') {
    g.fillStyle = 'rgba(207,168,255,0.35)'; g.beginPath(); g.ellipse(0, -2, 9, 12, 0, 0, 7); g.fill();
  } else if (id === 'duskmantle') {
    g.strokeStyle = c.trim; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-9, -12); g.quadraticCurveTo(0, -6, 9, -12); g.moveTo(-10, 2); g.lineTo(10, 2); g.stroke();
    g.fillStyle = c.trim; for (const x of [-7, 0, 7]) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 2, 7); g.lineTo(x, 10); g.lineTo(x - 2, 7); g.closePath(); g.fill(); }
  }
  g.restore();
  // hood and clasp
  g.beginPath(); g.moveTo(-9, -15); g.quadraticCurveTo(0, -25, 9, -15); g.quadraticCurveTo(0, -8, -9, -15); g.closePath(); fs(g, shade(c.color, 0.7), INK, 2.2);
  g.beginPath(); g.arc(0, -9, 3.4, 0, 7); fs(g, c.trim, INK, 1.8);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-0.9, -10, 0.9, 0, 7); g.fill();
  g.restore();
};
Art.artIcon = function (g, id, x, y, size, t) {
  const s = size / 24, c = Gear.ARTS[id].color, tt = t || 0;
  g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
  bloom(g, 0, 0, 30, c, 0.3);
  if (id === 'rend') {
    g.beginPath(); g.arc(-2, 0, 17, -1.7, 1.7); g.arc(-8, 0, 15, 1.4, -1.4, true); g.closePath(); fs(g, gradV(g, -17, 17, ['#ffffff', '#cfe0ff', '#8aa0d0']), INK, 2.4);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; for (const dy of [-9, 0, 9]) { g.beginPath(); g.moveTo(-18, dy); g.lineTo(-10, dy); g.stroke(); }
  } else if (id === 'rush') {
    for (const [dx, dy, a] of [[-3, -10, 0.9], [0, 0, 1], [3, 10, 0.9]]) { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(-16 + dx, dy + 6); g.lineTo(16 + dx, dy - 6); g.stroke(); g.strokeStyle = 'rgba(255,224,168,' + a + ')'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16 + dx, dy + 6); g.lineTo(16 + dx, dy - 6); g.stroke(); }
    g.strokeStyle = 'rgba(255,192,112,0.7)'; g.lineWidth = 1.4; for (const dy of [-4, 6]) { g.beginPath(); g.moveTo(-22, dy); g.lineTo(-12, dy); g.stroke(); }
  } else if (id === 'nova') {
    const sp = 12 + 2 * Math.sin(tt * 3);
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 6 : (i % 4 === 0 ? 20 : 13); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); fs(g, gradV(g, -20, 20, ['#ffffff', '#9cf0ff', '#4a9cd8']), INK, 2);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, sp, 0, 7); g.stroke();
  }
  g.restore();
};
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = clamp(((n >> 16) & 255) * k, 0, 255), gg = clamp(((n >> 8) & 255) * k, 0, 255), b = clamp((n & 255) * k, 0, 255);
  return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
}

// ---------------------------------------------------------------- effects of the arts
const baseFx = Art.drawFx;
Art.drawFx = function (g, f) {
  const k = f.t / f.life, a = 1 - k;
  if (f.type === 'cut') {                 // one slash across an enemy during the Rush
    g.save(); g.translate(f.x, f.y); g.rotate(f.a); g.globalAlpha = a; g.lineCap = 'round';
    const L = 20 + k * 54;
    g.strokeStyle = INK; g.lineWidth = 8 * a + 2; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
    g.strokeStyle = f.color || '#fff'; g.lineWidth = 4 * a + 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
    g.restore();
    return;
  }
  if (f.type === 'nova') {
    const e = 1 - Math.pow(1 - clamp(k * 1.6, 0, 1), 3), R = f.R * e;
    g.save();
    const fl = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, R); gr.addColorStop(0, 'rgba(255,255,255,' + 0.9 * a + ')'); gr.addColorStop(0.55, 'rgba(120,225,255,' + 0.35 * a + ')'); gr.addColorStop(1, 'rgba(60,150,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, R, 0, 7); g.fill();
    g.lineCap = 'round';
    for (const [r, w, c] of [[1, 9, '255,255,255'], [0.82, 5, '156,240,255'], [0.62, 3, '207,230,255']]) { g.strokeStyle = 'rgba(' + c + ',' + a + ')'; g.lineWidth = w * a + 1; g.beginPath(); g.arc(f.x, f.y, R * r, 0, 7); g.stroke(); }
    for (let i = 0; i < 20; i++) {                        // rays
      const an = i * Math.PI / 10 + 0.1, r0 = R * 0.2, r1 = R * (0.55 + 0.45 * ((i * 37) % 10) / 10);
      g.strokeStyle = 'rgba(255,255,255,' + 0.8 * a + ')'; g.lineWidth = 2 * a + 0.5; g.beginPath(); g.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); g.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1); g.stroke();
    }
    g.globalCompositeOperation = fl; g.restore();
    return;
  }
  baseFx(g, f);
};

// the crescent that Moon Rend sends out
const baseProj2 = Art.drawProj;
Art.drawProj = function (g, p, t) {
  if (p.kind === 'moon') {
    const dir = sign(p.vx) || 1, R = p.r * 1.25;
    g.save(); g.translate(p.x, p.y); g.scale(dir, 1);
    bloom(g, 0, 0, R * 2.2, '#cfe0ff', 0.5);
    const tr = g.createLinearGradient(-R * 3.2, 0, 0, 0); tr.addColorStop(0, 'rgba(210,225,255,0)'); tr.addColorStop(1, 'rgba(210,225,255,0.55)');
    g.fillStyle = tr; g.beginPath(); g.moveTo(-R * 0.6, -R * 0.9); g.lineTo(-R * 3.2, 0); g.lineTo(-R * 0.6, R * 0.9); g.closePath(); g.fill();
    g.beginPath(); g.arc(-0.35 * R, 0, R, -1.93, 1.93); g.arc(-0.85 * R, 0, 0.95 * R, 1.41, -1.41, true); g.closePath();
    fs(g, gradV(g, -R, R, ['#ffffff', '#e4eeff', '#9fb8e8']), INK, 3);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.beginPath(); g.arc(-0.35 * R, 0, R * 0.92, -1.2, 1.2); g.stroke();
    g.restore();
    return;
  }
  baseProj2(g, p, t);
};

// slashes of the weapons that are not the nail: each leaves its own mark in the air
Art.swingFx = function (g, p, t) {
  const id = Gear.weapon(), w = Gear.w(), pr = 1 - clamp(p.atkT / Math.max(0.05, Math.min(0.16, w.cd * 0.6)), 0, 1), a = 1 - pr * 0.75, f = p.face, m = p.atkAlt ? 1 : -1, col = w.color;
  const vert = p.atkDir !== 'side', up = p.atkDir === 'up';
  let cx = p.cx + (vert ? 0 : f * 6), cy = p.cy - (vert ? (up ? 8 : -6) : 4);
  const rk = p.reachK(), ang0 = vert ? (up ? -Math.PI / 2 : Math.PI / 2) : (f > 0 ? 0 : Math.PI);
  g.save(); g.globalAlpha = a; g.lineCap = 'round'; g.lineJoin = 'round';
  if (id === 'lance' || id === 'rapier') {                // a thrust: one long streak and a sparkle at the tip
    const L = (id === 'lance' ? 92 : 80) * rk * (0.5 + 0.5 * clamp(pr * 2.2, 0, 1)), dx = vert ? 0 : f, dy = vert ? (up ? -1 : 1) : 0, x0 = cx + dx * 14, y0 = cy + dy * 14 - (vert ? 0 : 0);
    const nx = -dy, ny = dx;
    g.fillStyle = INK; g.beginPath(); g.moveTo(x0 + nx * 7, y0 + ny * 7); g.lineTo(x0 + dx * L, y0 + dy * L); g.lineTo(x0 - nx * 7, y0 - ny * 7); g.closePath(); g.fill();
    const gr = g.createLinearGradient(x0, y0, x0 + dx * L, y0 + dy * L); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba('#ffffff', 0.95));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 + nx * 4, y0 + ny * 4); g.lineTo(x0 + dx * L, y0 + dy * L); g.lineTo(x0 - nx * 4, y0 - ny * 4); g.closePath(); g.fill();
    bloom(g, x0 + dx * L, y0 + dy * L, 30, col, 0.6 * a);
    g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = 1.6; const sx = x0 + dx * L, sy = y0 + dy * L; g.beginPath(); g.moveTo(sx - 9, sy); g.lineTo(sx + 9, sy); g.moveTo(sx, sy - 9); g.lineTo(sx, sy + 9); g.stroke();
  } else if (id === 'fangs') {                            // two quick crossed cuts
    g.save(); g.translate(cx + (vert ? 0 : f * 22), cy);
    for (const s of [-1, 1]) { const ra = (vert ? 0 : 0) + s * 0.55 + (vert ? Math.PI / 2 : 0), L = 36 * rk * clamp(pr * 2.2, 0.2, 1); g.save(); g.rotate(ra); g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke(); g.strokeStyle = s > 0 ? '#ffffff' : col; g.lineWidth = 3.6; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke(); g.restore(); }
    g.restore();
    bloom(g, cx + (vert ? 0 : f * 22), cy, 34, col, 0.4 * a);
  } else if (id === 'scythe') {                           // a very wide moon-shaped sweep
    const sweep = clamp(pr * 1.5, 0, 1), th = 2.9, mid = ang0, s0 = mid - th / 2 * (f > 0 || vert ? 1 : -1) * m, s1 = s0 + th * (f > 0 || vert ? 1 : -1) * m * sweep;
    const r = 70 * rk;
    for (const [rr, wd, c] of [[r, 14, 'rgba(235,242,255,0.95)'], [r - 12, 8, 'rgba(180,200,245,0.7)'], [r + 8, 3, '#ffffff']]) {
      g.strokeStyle = INK; g.lineWidth = wd + 4; g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, s1), Math.max(s0, s1)); g.stroke();
      g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, s1), Math.max(s0, s1)); g.stroke();
    }
    bloom(g, cx + Math.cos(s1) * r, cy + Math.sin(s1) * r, 40, '#cfe0ff', 0.5 * a);
  } else if (id === 'cleaver') {                          // a heavy slab of an arc that throws embers
    const sweep = clamp(pr * 1.4, 0, 1), th = 2.2, dir = (f > 0 || vert ? 1 : -1) * m, s0 = ang0 - th / 2 * dir, s1 = s0 + th * dir * sweep, r = 66 * rk;
    for (const [rr, wd, c] of [[r, 20, 'rgba(255,170,90,0.95)'], [r - 8, 9, '#fff0c8']]) {
      g.strokeStyle = INK; g.lineWidth = wd + 5; g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, s1), Math.max(s0, s1)); g.stroke();
      g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, s1), Math.max(s0, s1)); g.stroke();
    }
    const ex = cx + Math.cos(s1) * r, ey = cy + Math.sin(s1) * r;
    bloom(g, ex, ey, 46, '#ff8a3a', 0.6 * a);
    if (Math.random() < 0.9) G.burst(ex, ey, 1, { color: pick(['#ff8a3a', '#ffd070']), speed: 120, life: 0.4, size: 3, grav: 120 });
  } else {                                                // duskblade, bonesaw and the like: a clean bright crescent in the weapon's colour
    const sweep = clamp(pr * 1.6, 0, 1), th = 1.9, dir = (f > 0 || vert ? 1 : -1) * m, s0 = ang0 - th / 2 * dir, s1 = s0 + th * dir * sweep, r = 56 * rk;
    for (const [rr, wd, c] of [[r, 11, rgba(col, 0.95)], [r - 7, 6, '#ffffff']]) {
      g.strokeStyle = INK; g.lineWidth = wd + 4; g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, s1), Math.max(s0, s1)); g.stroke();
      g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.arc(cx, cy, rr, Math.min(s0, s1), Math.max(s0, s1)); g.stroke();
    }
    if (id === 'bonesaw') { g.fillStyle = '#fffaf0'; for (let i = 0; i < 6; i++) { const aa = s0 + (s1 - s0) * (i / 5), x = cx + Math.cos(aa) * (r + 8), y = cy + Math.sin(aa) * (r + 8); g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); } }
  }
  g.restore();
};

// what the hero does around the body while an art is going on
Art.drawArtsFx = function (g, p, t) {
  if (p.dead) return;
  if (p.rendHold && p.rendT > 0.2 && p.atkT <= 0.02 || p.rendReady) {                         // Moon Rend: the blade gathers moonlight
    const q = clamp(p.rendT / Gear.REND_CHARGE, 0, 1), rd = p.rendReady, pulse = rd ? 0.75 + 0.25 * Math.sin(t * 28) : q;
    const x = p.cx + p.face * 30, y = p.cy - 6;
    bloom(g, x, y, 18 + 44 * pulse, '#dbe8ff', 0.2 + 0.45 * pulse);
    g.strokeStyle = rgba('#ffffff', 0.25 + 0.5 * pulse); g.lineWidth = 2;
    g.beginPath(); g.arc(p.cx, p.cy - 4, 46 - 18 * q, 0, 7); g.stroke();
    for (let i = 0; i < 3; i++) { const aa = t * 5 + i * 2.1, r = 40 * (1 - q) + 10; bloom(g, p.cx + p.face * 18 + Math.cos(aa) * r, p.cy - 6 + Math.sin(aa) * r, 7, '#ffffff', 0.5); }
    if (rd) {                                                                                  // a small crescent shows what is coming
      g.save(); g.translate(x + p.face * 18, y); g.scale(p.face, 1); g.globalAlpha = 0.4 + 0.3 * Math.sin(t * 16);
      g.beginPath(); g.arc(-8, 0, 20, -1.9, 1.9); g.arc(-16, 0, 18, 1.4, -1.4, true); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.restore();
    }
  }
  if (p.rushT > 0) {                                                                            // Dusk Rush: blades and streaks
    const f = p.face, L = 150;
    const gr = g.createLinearGradient(p.cx - f * L, 0, p.cx + f * 30, 0); gr.addColorStop(0, 'rgba(255,190,110,0)'); gr.addColorStop(1, 'rgba(255,235,190,0.8)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(p.cx - f * L, p.cy - 2); g.lineTo(p.cx + f * 30, p.cy - 20); g.lineTo(p.cx + f * 44, p.cy - 2); g.lineTo(p.cx + f * 30, p.cy + 16); g.closePath(); g.fill();
    for (let i = 0; i < 5; i++) { const y = p.cy - 18 + i * 9, ln = 60 + ((i * 53) % 50); g.strokeStyle = 'rgba(255,240,200,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p.cx - f * (20 + ln * 0.2), y); g.lineTo(p.cx - f * (20 + ln), y); g.stroke(); }
    bloom(g, p.cx + f * 28, p.cy - 2, 60, '#ffc070', 0.6);
    g.save(); g.translate(p.cx + f * 22, p.cy - 4); g.scale(f, 1); g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(46, 0); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(46, 0); g.stroke(); g.restore();
  }
  if (p.novaT > 0) {                                                                            // Soul Nova: the whole vessel gathers into one star
    const el = 1 - p.novaT, k = clamp(el / 0.45, 0, 1);
    if (!p.novaFired) {
      bloom(g, p.cx, p.cy - 4, 40 + k * 110, '#9cf0ff', 0.3 + 0.5 * k);
      const r = 30 * (1 - k) + 8; g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * k) + ')'; g.beginPath(); g.arc(p.cx, p.cy - 4, r * 0.6 + 2, 0, 7); g.fill();
      g.strokeStyle = 'rgba(207,240,255,' + (0.4 + 0.5 * k) + ')'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(p.cx, p.cy - 4, 20 + (1 - k) * 90 + i * 10, 0, 7); g.stroke(); }
    } else bloom(g, p.cx, p.cy - 4, 90, '#ffffff', 0.5 * (1 - clamp((el - 0.45) / 0.55, 0, 1)));
  }
};
// a foe the Frostfur has frozen
Art.frozenFx = function (g, e, t) {
  const b = e.hb(), a = clamp(e.frozenT / 0.3, 0, 1) * 0.8;
  g.save(); g.globalAlpha = a;
  const gr = g.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h); gr.addColorStop(0, 'rgba(230,248,255,0.65)'); gr.addColorStop(1, 'rgba(120,190,240,0.5)');
  g.fillStyle = gr; g.beginPath(); g.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 8); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ffffff'; for (const [dx, dy] of [[0.2, 0], [0.7, 0.05], [0.95, 0.6], [0.05, 0.7]]) { const x = b.x + b.w * dx, y = b.y + b.h * dy; g.beginPath(); g.moveTo(x - 4, y + 4); g.lineTo(x, y - 8); g.lineTo(x + 4, y + 4); g.closePath(); g.fill(); }
  g.restore();
};

// the hero: the weapon's own swing for everything but the nail, plus the arts around the body. The artist's pixel
// sprite carries only the nail, so for any other weapon it is drawn over the sprite: on the back at rest, in the hand
// when striking.
const baseDrawPlayer = Art.drawPlayer;
Art.drawPlayer = function (g, p, t) {
  const id = Gear.weapon(), pixel = !Skins.get('player') && HeroStyle.sprite() && !p.dead, other = id !== 'nail';
  const f = p.face, HS = 1.1;
  if (pixel && other && p.atkT <= 0 && !p.sitting) heroSword(g, p.cx - f * 10, p.y + p.h - 27, f > 0 ? 2.02 : Math.PI - 2.02, 28, null);
  baseDrawPlayer(g, p, t);
  if (p.atkT > 0 && !p.dead && other) {
    if (pixel) {
      const pr = 1 - clamp(p.atkT / Math.max(0.05, Math.min(0.16, Gear.w().cd * 0.6)), 0, 1), m = p.atkAlt ? 1 : -1;
      let a0, a1;
      if (p.atkDir === 'up') { a0 = -Math.PI * 0.85; a1 = -Math.PI * 0.15; }
      else if (p.atkDir === 'down') { a0 = Math.PI * 0.15; a1 = Math.PI * 0.85; }
      else { a0 = -0.95 * m; a1 = 0.95 * m; if (f < 0) { a0 = Math.PI - a0; a1 = Math.PI - a1; } }
      const sweep = lerp(a0, a1, clamp(pr * 1.6, 0, 1)), hx = p.cx + f * 14, hy = p.cy + (p.atkDir === 'up' ? -6 : p.atkDir === 'down' ? 6 : 0);
      heroSword(g, hx + Math.cos(sweep) * 4, hy + Math.sin(sweep) * 4, sweep, 40 * HS * (Charms.has('reach') ? 1.3 : 1), null);
    }
    Art.swingFx(g, p, t);
  }
  Art.drawArtsFx(g, p, t);
};

// the Wanderer standing at rest, for the equipment screen: always the inked figure, since that is the one that shows the gear
Art.drawHeroPreview = function (g, x, y, scale, t) {
  if (HeroStyle.puppet()) { Pixel.shadow(g, x, y, 26); Puppet.drawAt(g, x, y, scale * 0.66, t); return; }
  wanderer(g, x, y, 1, { t, vx: 0, vy: 0, scale }, 1, null);
};

// ---------------------------------------------------------------- the cloaks on the inked hero
// Drawn in the hero's own space (feet at the origin, facing +x) over the cloak, under the head. cloakPath() adds the cloak's outline.
function cloakExtras(g, id, t, bob, fl, o, cloakPath) {
  const c = Gear.CLOAKS[id], neck = -21 - bob;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (id === 'ironhide') {
    g.save(); cloakPath(); g.clip();                                                      // a leather belt and its buckle
    g.fillStyle = '#2a2018'; g.fillRect(-14, -12.4, 28, 3); g.strokeStyle = INK; g.lineWidth = 0.8; g.strokeRect(-14, -12.4, 28, 3);
    formD(g, pol([-2.4, -13.4, 2.4, -13.4, 2.4, -8.8, -2.4, -8.8]), [0, -11, 3, 3], '#d8b868', { lw: 1.2, spec: 0.5 });
    g.restore();
    for (const sg of [-1, 1]) {                                                            // pauldrons with rivets
      formD(g, ell(sg * 8.4, neck + 0.4, 6, 3.6, sg * 0.28), [sg * 8.4, neck, 6, 3.6], '#a2aac0', { lw: 2.1, spec: 0.5 });
      rivetD(g, sg * 6.4, neck, 0.9); rivetD(g, sg * 10.2, neck + 0.6, 0.9);
    }
  } else if (id === 'windweave') {
    const len = 22 + Math.min(14, Math.abs(o.vx) * 0.05) + (o.air ? 5 : 0);
    for (const [dy, ph, col] of [[0, 0, c.trim], [3.6, 1.2, shade(c.trim, 0.7)]]) {         // long ribbons streaming from the shoulders
      const w = Math.sin(t * 8 + ph) * 3;
      g.strokeStyle = INK; g.lineWidth = 5.6; g.beginPath(); g.moveTo(-6, neck + 2 + dy); g.quadraticCurveTo(-len * 0.5, neck + 3 + dy + w, -len, neck + 1 + dy - w * 0.6); g.stroke();
      g.strokeStyle = col; g.lineWidth = 3; g.stroke();
    }
    g.fillStyle = c.trim; g.beginPath(); g.arc(0, neck + 3, 2.2, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  } else if (id === 'soulveil') {
    g.save(); cloakPath(); g.clip();
    const vg = g.createLinearGradient(0, -22, 0, 0); vg.addColorStop(0, 'rgba(207,168,255,0.0)'); vg.addColorStop(1, 'rgba(207,168,255,0.42)'); g.fillStyle = vg; g.fillRect(-16, -24, 32, 26);
    g.strokeStyle = 'rgba(230,205,255,0.35)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { const x = -9 + k * 6; g.beginPath(); g.moveTo(x, -18); g.quadraticCurveTo(x + Math.sin(t * 2 + k) * 2, -10, x - 1, -2); g.stroke(); }
    g.restore();
    for (let k = 0; k < 3; k++) {                                                          // little souls that circle the shoulders
      const a = t * 1.8 + k * 2.1, x = Math.cos(a) * 14, y = -14 - bob + Math.sin(a) * 6;
      bloom(g, x, y, 8, '#e0c8ff', 0.7); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill();
    }
  } else if (id === 'emberweave') {
    g.save(); cloakPath(); g.clip();
    const eg = g.createLinearGradient(0, -12, 0, 0); eg.addColorStop(0, 'rgba(255,120,40,0)'); eg.addColorStop(1, 'rgba(255,170,70,' + (0.65 + 0.25 * Math.sin(t * 5)) + ')'); g.fillStyle = eg; g.fillRect(-16, -12, 32, 14);
    g.strokeStyle = 'rgba(255,200,120,0.7)'; g.lineWidth = 0.9; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(-8, -9); g.lineTo(-5, -5); g.lineTo(-1, -8); g.lineTo(3, -4); g.lineTo(7, -8); g.stroke();
    g.restore();
    for (let k = 0; k < 4; k++) { const u = (t * 0.9 + k * 0.27) % 1; g.fillStyle = 'rgba(255,' + (190 - u * 90 | 0) + ',80,' + (1 - u) + ')'; g.beginPath(); g.arc(-8 + k * 5.4 + Math.sin(t * 3 + k) * 1.4, -4 - u * 20, 1.3 - u * 0.6, 0, 7); g.fill(); }
  } else if (id === 'frostfur') {
    g.fillStyle = '#ffffff';
    g.save(); cloakPath(); g.clip(); for (let x = -14; x < 15; x += 3.4) { g.beginPath(); g.arc(x, -3 + (Math.abs(x) % 2) * 0.4, 2.6, 0, 7); g.fill(); g.strokeStyle = 'rgba(150,180,215,0.7)'; g.lineWidth = 0.8; g.stroke(); } g.restore();
    for (let x = -9; x <= 9; x += 3.2) { g.beginPath(); g.arc(x, neck + 1.2 - Math.abs(x) * 0.07 + (Math.abs(x) % 2) * 0.3, 2.9, 0, 7); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); }
    g.fillStyle = 'rgba(160,200,240,0.6)'; for (const x of [-5, 0, 5]) { g.beginPath(); g.arc(x - 0.6, neck - 0.4, 1, 0, 7); g.fill(); }
  } else if (id === 'duskmantle') {
    g.save(); cloakPath(); g.clip();
    g.strokeStyle = c.trim; g.lineWidth = 1.6; cloakPath(); g.save(); g.translate(0, 0); g.scale(0.9, 0.95); g.translate(0, -0.5); g.stroke(); g.restore();
    g.fillStyle = c.trim; for (const x of [-8, -2.6, 2.8, 8.2]) { g.beginPath(); g.moveTo(x, -8); g.lineTo(x + 1.5, -5.6); g.lineTo(x, -3.4); g.lineTo(x - 1.5, -5.6); g.closePath(); g.fill(); }
    g.restore();
    for (const sg of [-1, 1]) spikeD(g, sg * 9, neck + 1, sg > 0 ? -0.9 : -2.24, 6, 1.6, '#d8b868');
    bloom(g, 0, neck + 3, 8, '#ffe0a0', 0.5); formD(g, pol([0, neck, 2.4, neck + 2.6, 0, neck + 5.4, -2.4, neck + 2.6]), [0, neck + 2.7, 2.6, 3], '#d84a68', { lw: 1.2, spec: 0.6 });
  } else if (id === 'boneward') {
    g.save(); cloakPath(); g.clip();
    for (let k = 0; k < 3; k++) { const y = -17 + k * 4.6; g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-9, y); g.quadraticCurveTo(0, y + 3.6, 9, y); g.stroke(); g.strokeStyle = '#efe6d0'; g.lineWidth = 1.8; g.stroke(); }
    g.restore();
    for (const sg of [-1, 1]) formD(g, ell(sg * 8.2, neck + 0.4, 5.2, 3.2, sg * 0.3), [sg * 8.2, neck, 5, 3], '#e8dcc0', { lw: 1.9, spec: 0.4 });
    formD(g, ell(0, neck + 3.2, 3.4, 3.2), [0, neck + 3.2, 3.4, 3.2], '#efe6d0', { lw: 1.5 }); g.fillStyle = INK; g.beginPath(); g.arc(-1.2, neck + 2.8, 0.8, 0, 7); g.arc(1.2, neck + 2.8, 0.8, 0, 7); g.fill();
  }
  g.restore();
}
