'use strict';
// Detail toolkit for the creatures and the hero: faces, eyes, teeth, claws, plates, rivets, fur, scales and the shading
// that turns a flat inked shape into a form with a lit side and a shadowed side. Everything here is plain canvas
// drawing (no images), so it stays crisp at any scale. The bestiary (pause menu) draws each creature large with
// Art.drawCreature, which also serves the tests.

// light comes from the upper left
const LIGHT = { x: -0.55, y: -0.83 };

// a path, filled with a lit-to-shadowed gradient, inked, then given a soft highlight and a rim of reflected light.
// build(g) must add the path to g (without filling); box = [cx, cy, rx, ry] is used for the gradient and the highlight.
function formD(g, build, box, base, o) {
  o = o || {};
  const [cx, cy, rx, ry] = box, hi = o.hi || mix(base, '#ffffff', 0.42), lo = o.lo || mix(base, '#000000', 0.5);
  const gr = g.createLinearGradient(cx + LIGHT.x * rx, cy + LIGHT.y * ry, cx - LIGHT.x * rx, cy - LIGHT.y * ry);
  gr.addColorStop(0, o.flash ? '#fff' : hi); gr.addColorStop(0.42, o.flash ? '#fff' : base); gr.addColorStop(1, o.flash ? '#fff' : lo);
  g.beginPath(); build(g); g.fillStyle = gr; g.fill();
  if (!o.flash) {
    g.save(); g.beginPath(); build(g); g.clip();
    if (o.spec !== 0) { const sg = g.createRadialGradient(cx - rx * 0.38, cy - ry * 0.42, 0, cx - rx * 0.38, cy - ry * 0.42, Math.max(rx, ry) * 0.7); sg.addColorStop(0, 'rgba(255,255,255,' + (o.spec == null ? 0.38 : o.spec) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4); }
    if (o.rim !== 0) { g.strokeStyle = 'rgba(' + (o.rimc || '210,225,255') + ',' + (o.rim == null ? 0.35 : o.rim) + ')'; g.lineWidth = 3.2; g.translate(-LIGHT.x * 1.4, -LIGHT.y * 1.4); g.beginPath(); build(g); g.stroke(); }
    g.restore();
  }
  g.beginPath(); build(g); g.strokeStyle = INK; g.lineWidth = o.lw || 2.8; g.lineJoin = 'round'; g.stroke();
}
// path builders for formD: an ellipse and a polygon from [x, y, ...]
const ell = (cx, cy, rx, ry, rot) => g => g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
const pol = pts => g => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); };

// short brush strokes inside the current clip, for fur, bark, hide, hatching: n strokes over the box, at an angle
function hatchD(g, box, n, ang, col, alpha, o) {
  o = o || {};
  const [cx, cy, rx, ry] = box, R = mulberry32((o.seed || 7) * 131 + n);
  g.save(); g.lineCap = 'round'; g.lineWidth = o.w || 1.1;
  for (let i = 0; i < n; i++) {
    const x = cx + (R() * 2 - 1) * rx, y = cy + (R() * 2 - 1) * ry, a = ang + (R() - 0.5) * (o.spread == null ? 0.5 : o.spread), l = (o.len || 6) * (0.6 + R() * 0.8);
    g.strokeStyle = rgbaOf(col, alpha * (0.5 + R() * 0.7)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
}
// add alpha to a #hex or rgb() colour
function rgbaOf(c, a) { if (c[0] === '#') return rgba(c, a); const m = /^rgb\((.*)\)$/.exec(c); return m ? 'rgba(' + m[1] + ',' + a + ')' : c; }

// rows of overlapping scales over a box (clipped by the caller)
function scalesD(g, box, size, col, hiCol) {
  const [cx, cy, rx, ry] = box;
  g.save(); g.lineWidth = 1;
  for (let j = 0, y = cy - ry; y < cy + ry + size; j++, y += size * 0.62) for (let x = cx - rx - (j % 2) * size * 0.5; x < cx + rx + size; x += size) {
    g.strokeStyle = col; g.beginPath(); g.arc(x, y, size * 0.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    if (hiCol) { g.strokeStyle = hiCol; g.beginPath(); g.arc(x - 0.4, y - 0.6, size * 0.5, 1.15 * Math.PI, 1.55 * Math.PI); g.stroke(); }
  }
  g.restore();
}

// small rivet
function rivetD(g, x, y, r) {
  r = r || 1.6; const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r * 1.2);
  gr.addColorStop(0, '#f4f1ea'); gr.addColorStop(1, '#3a3a40'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = 0.7; g.stroke();
}

// a detailed eye. o: iris colour, pupil 'round'|'slit'|'none', look [dx, dy] in -1..1, lid 0..1 closed, glow colour, rot, angry (brow slant)
function eyeD(g, x, y, rx, ry, o) {
  o = o || {};
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot);
  if (o.glow) bloom(g, 0, 0, Math.max(rx, ry) * 3.6, o.glow, o.glowA == null ? 0.5 : o.glowA);
  ell(0, 0, rx, ry)(g.beginPath() || g); g.fillStyle = o.sclera || '#f4efe2'; g.fill(); g.strokeStyle = INK; g.lineWidth = Math.max(1.1, rx * 0.22); g.stroke();
  g.save(); g.beginPath(); ell(0, 0, rx, ry)(g); g.clip();
  const lx = (o.look ? o.look[0] : 0) * rx * 0.35, ly = (o.look ? o.look[1] : 0) * ry * 0.3, ir = Math.min(rx, ry) * (o.irisK || 0.82);
  const ig = g.createRadialGradient(lx - ir * 0.2, ly - ir * 0.3, ir * 0.1, lx, ly, ir);
  const ic = o.iris || '#d28a2a'; ig.addColorStop(0, mix(ic, '#ffffff', 0.45)); ig.addColorStop(0.55, ic); ig.addColorStop(1, mix(ic, '#000000', 0.55));
  g.fillStyle = ig; g.beginPath(); g.arc(lx, ly, ir, 0, 7); g.fill();
  g.strokeStyle = rgbaOf(mix(ic, '#000000', 0.6), 0.6); g.lineWidth = 0.7; g.beginPath(); g.arc(lx, ly, ir, 0, 7); g.stroke();
  g.fillStyle = INK;
  if (o.pupil === 'slit') { g.beginPath(); g.ellipse(lx, ly, Math.max(0.5, ir * 0.22), ir * 0.92, 0, 0, 7); g.fill(); }
  else if (o.pupil !== 'none') { g.beginPath(); g.arc(lx, ly, ir * 0.46, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(lx - ir * 0.34, ly - ir * 0.38, Math.max(0.5, ir * 0.2), 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(lx + ir * 0.3, ly + ir * 0.34, Math.max(0.4, ir * 0.1), 0, 7); g.fill();
  const lid = o.lid || 0;
  if (lid > 0) { g.fillStyle = o.lidc || '#2a2430'; g.fillRect(-rx - 2, -ry - 2, rx * 2 + 4, (ry * 2 + 4) * lid * 0.5); }
  if (o.angry) { g.fillStyle = o.lidc || '#2a2430'; g.beginPath(); g.moveTo(-rx - 1, -ry - 1); g.lineTo(rx + 1, -ry - 1); g.lineTo(rx + 1, -ry * 0.1 * o.angry); g.lineTo(-rx - 1, -ry * 0.1 * o.angry - ry * 0.7 * o.angry); g.closePath(); g.fill(); }
  g.restore();
  g.restore();
}

// the pale mask of the old kingdom, in detail: lit and shaded, brow, cheeks, hairline cracks, sockets with a faint glow
// o: eye colour (a glow inside the sockets), eyeA, brow (0..1), crack (0..1), teeth, lean (-1..1), fill (flash), scars, horns
function maskD(g, x, y, rx, ry, o) {
  o = o || {};
  const fl = o.fill === '#fff' || o.flash, base = o.base || '#ece9e1';
  g.save(); g.translate(x, y);
  formD(g, ell(0, 0, rx, ry), [0, 0, rx, ry], base, { flash: fl, spec: 0.34, lw: Math.max(2, rx * 0.2) });
  if (!fl) {
    g.save(); g.beginPath(); ell(0, 0, rx, ry)(g); g.clip();
    g.fillStyle = 'rgba(70,90,125,0.16)'; g.beginPath(); g.ellipse(rx * 0.35, ry * 0.5, rx, ry * 0.8, 0, 0, 7); g.fill();
    hatchD(g, [0, ry * 0.3, rx, ry * 0.7], Math.round(rx * 1.4), 1.2, '#6a7488', 0.28, { len: 3.2, w: 0.7, seed: 3 });
    if ((o.crack || 0) > 0) { g.strokeStyle = 'rgba(40,36,48,0.75)'; g.lineWidth = Math.max(0.7, rx * 0.07); g.beginPath(); g.moveTo(rx * 0.2, -ry); g.lineTo(rx * 0.05, -ry * 0.55); g.lineTo(rx * 0.22, -ry * 0.25); g.lineTo(rx * 0.1, 0); if (o.crack > 0.6) { g.moveTo(rx * 0.05, -ry * 0.55); g.lineTo(-rx * 0.2, -ry * 0.4); } g.stroke(); }
    g.restore();
  }
  const l = (o.lean || 0) * rx * 0.14, ex = rx * 0.42, ey = ry * 0.1, w = rx * 0.29 * (o.eye || 1), h = ry * 0.5 * (o.eye || 1);
  // brow ridge over the sockets
  if (!fl && o.brow !== 0) { g.strokeStyle = 'rgba(40,40,52,0.55)'; g.lineWidth = Math.max(0.9, rx * 0.1); g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex + l - s * w * 1.1, ey - h * 1.12 - (s < 0 ? 0.6 : 0) * (o.brow == null ? 1 : o.brow) * 1.4); g.quadraticCurveTo(s * ex + l, ey - h * 1.5, s * ex + l + s * w * 1.1, ey - h * 1.0 + (o.brow == null ? 1 : o.brow) * 1.2); g.stroke(); } }
  for (const s of [-1, 1]) {                         // sockets
    g.save(); g.translate(s * ex + l, ey); g.rotate(-s * 0.12); g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, 7); g.fill();
    if (o.glow && !fl) { const gg = g.createRadialGradient(0, h * 0.1, 0, 0, h * 0.1, w * 1.1); gg.addColorStop(0, rgbaOf(o.glow, o.eyeA == null ? 0.9 : o.eyeA)); gg.addColorStop(1, rgbaOf(o.glow, 0)); g.fillStyle = gg; g.beginPath(); g.ellipse(0, h * 0.1, w * 0.85, h * 0.8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-w * 0.2, -h * 0.15, Math.max(0.5, w * 0.16), 0, 7); g.fill(); }
    else if (!fl) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-w * 0.25, -h * 0.35, Math.max(0.4, w * 0.15), 0, 7); g.fill(); }
    g.restore();
  }
  if (!fl) {                                         // nose holes and the lines of the cheeks
    g.fillStyle = 'rgba(30,28,40,0.7)'; g.beginPath(); g.ellipse(l * 0.5 - rx * 0.07, ry * 0.4, rx * 0.04, ry * 0.07, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(l * 0.5 + rx * 0.07, ry * 0.4, rx * 0.04, ry * 0.07, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,60,76,0.38)'; g.lineWidth = Math.max(0.6, rx * 0.05); g.beginPath(); g.moveTo(-rx * 0.62 + l, ry * 0.2); g.quadraticCurveTo(-rx * 0.5 + l, ry * 0.62, -rx * 0.22 + l, ry * 0.8); g.moveTo(rx * 0.62 + l, ry * 0.2); g.quadraticCurveTo(rx * 0.5 + l, ry * 0.62, rx * 0.22 + l, ry * 0.8); g.stroke();
    if (o.teeth) { g.strokeStyle = INK; g.lineWidth = Math.max(0.8, rx * 0.08); g.beginPath(); g.moveTo(-rx * 0.34 + l, ry * 0.62); g.quadraticCurveTo(l, ry * 0.78, rx * 0.34 + l, ry * 0.62); g.stroke(); g.lineWidth = Math.max(0.5, rx * 0.04); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * rx * 0.14 + l, ry * (0.66 + 0.06 * (2 - Math.abs(i)) * 0.4)); g.lineTo(i * rx * 0.14 + l, ry * 0.8); g.stroke(); } }
  }
  g.restore();
}

// ---------------------------------------------------------------- showing a creature large (bestiary, tests)
Art.DUMMY = {};
// kinds drawn around their centre instead of their feet
const FLYING = new Set(['flyer', 'diver', 'jelly', 'moth', 'veil', 'wraith', 'queen', 'roc', 'shade', 'shard_fly']);
// a stand-in enemy object (size, hp) so a portrait can be drawn without a room
Art.creatureDummy = function (kind, boss) {
  const key = (boss ? 'b:' : 'e:') + kind;
  if (Art.DUMMY[key] !== undefined) return Art.DUMMY[key];
  let e = null;
  try {
    if (boss) { e = new BOSS_TYPES[kind]({ x: 0, y: 0 }); e.state = 'fight'; e.introT = 0; e.invul = false; }
    else if (ENEMY_TYPES[kind]) { e = new ENEMY_TYPES[kind]({ type: kind, x: 0, y: 0 }); e.kind = kind; }
    else { e = { kind, x: 0, y: 0, w: 30, h: 44, get cx() { return this.x + this.w / 2; }, get cy() { return this.y + this.h / 2; } }; }
    e.isDummy = true; e.alpha = 1; e.flash = 0; e.tele = 0; e.face = 1; e.vx = 0; e.vy = 0; e.onGround = true; if ('buried' in e) e.buried = false;
  } catch (err) { e = null; }
  Art.DUMMY[key] = e;
  return e;
};
// draws the creature with its feet at (X, Y) (flyers: centre at Y), scaled by s. o: face, tele, flash, state, vx, t
Art.drawCreature = function (g, kind, boss, X, Y, s, t, o) {
  const e = Art.creatureDummy(kind, boss); o = o || {};
  const fn = boss ? Art.boss[kind] : Art.enemy[kind];
  if (!e || !fn) return false;
  e.face = o.face || 1; e.flash = o.flash || 0; e.tele = o.tele || 0; e.vx = o.vx || 0; e.vy = o.vy || 0; e.t = t; e.stateT = o.stateT || 0.3;
  if (o.state) e.currentState = o.state; else if (!boss && e.currentState !== undefined) e.currentState = 'idle';
  for (const k of ['stunned', 'rolling', 'charging', 'guarding', 'lunging', 'slashing', 'sweeping', 'casting', 'dashing', 'diving', 'airborne']) e[k] = !!(o.flags && o.flags[k]);
  g.save(); g.scale(s, s);
  e.x = X / s - e.w / 2; e.y = (boss ? FLYING.has(kind) : FLYING.has(kind)) ? Y / s - e.h / 2 : Y / s - e.h;
  try { fn(g, e, t); } catch (err) { g.restore(); return false; }
  g.restore();
  return true;
};

// ---------------------------------------------------------------- limbs, feelers, claws, spikes, wings
// a two-segment limb through three points, with a knee, highlight line and an optional claw at the tip
function legD(g, pts, w, col, o) {
  o = o || {};
  const [x0, y0, x1, y1, x2, y2] = pts;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = INK; g.lineWidth = w + 2.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = o.flash ? '#fff' : col; g.lineWidth = w; g.stroke();
  if (!o.flash) { g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = Math.max(0.6, w * 0.3); g.beginPath(); g.moveTo(x0 + LIGHT.x * -0.2, y0 - w * 0.22); g.lineTo(x1, y1 - w * 0.22); g.lineTo(x2, y2 - w * 0.2); g.stroke(); }
  g.fillStyle = o.flash ? '#fff' : mix(col, '#ffffff', 0.18); g.beginPath(); g.arc(x1, y1, w * 0.62, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
  if (o.claw) clawD(g, x2, y2, o.clawAng == null ? Math.atan2(y2 - y1, x2 - x1) : o.clawAng, o.claw, Math.max(1.4, w * 0.45), o.clawCol || '#e8e2d0', o.flash);
  g.restore();
}
// a curved claw or thorn from (x, y) pointing along ang
function clawD(g, x, y, ang, len, w, col, flash) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.moveTo(0, -w); g.quadraticCurveTo(len * 0.6, -w * 0.8, len, w * 0.9); g.quadraticCurveTo(len * 0.45, w * 0.1, 0, w); g.closePath();
  g.fillStyle = flash ? '#fff' : col; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke();
  if (!flash) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(len * 0.1, -w * 0.5); g.quadraticCurveTo(len * 0.55, -w * 0.5, len * 0.9, w * 0.55); g.stroke(); }
  g.restore();
}
// a straight horn or spike: a tapering triangle with a lit edge
function spikeD(g, x, y, ang, len, w, col, flash) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.moveTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.closePath();
  const gr = g.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, flash ? '#fff' : mix(col, '#ffffff', 0.4)); gr.addColorStop(1, flash ? '#fff' : mix(col, '#000000', 0.45));
  g.fillStyle = gr; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
  if (!flash) { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(w * 0.2, -w * 0.55); g.lineTo(len * 0.8, -w * 0.05); g.stroke(); }
  g.restore();
}
// a segmented feeler that curls; ends in a knob
function antennaD(g, x, y, ang, len, curl, col, o) {
  o = o || {}; const segs = o.segs || 6;
  g.save(); g.translate(x, y); g.rotate(ang); g.lineCap = 'round';
  const pt = k => { const u = k / segs; return [u * len, -curl * len * u * u]; };
  g.strokeStyle = INK; g.lineWidth = (o.w || 2) + 1.8; g.beginPath(); for (let k = 0; k <= segs; k++) { const [px, py] = pt(k); k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  g.strokeStyle = o.flash ? '#fff' : col; g.lineWidth = o.w || 2; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; for (let k = 1; k < segs; k++) { const [px, py] = pt(k); g.beginPath(); g.moveTo(px, py - (o.w || 2) * 0.55); g.lineTo(px, py + (o.w || 2) * 0.55); g.stroke(); }
  const [ex, ey] = pt(segs); g.fillStyle = o.flash ? '#fff' : (o.knob || col); g.beginPath(); g.arc(ex, ey, (o.w || 2) * 0.95, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  g.restore();
}
// a membranous wing from (x, y) along ang: translucent, veined, with a darker leading edge. beat: 0..1 folds it
function wingD(g, x, y, ang, len, wid, col, o) {
  o = o || {}; const a = o.alpha == null ? 0.55 : o.alpha;
  g.save(); g.translate(x, y); g.rotate(ang);
  const build = c => { c.moveTo(0, 0); c.bezierCurveTo(len * 0.25, -wid * 0.9, len * 0.75, -wid * 0.7, len, -wid * 0.1); c.bezierCurveTo(len * 0.8, wid * 0.25, len * 0.4, wid * 0.4, 0, 0); };
  g.beginPath(); build(g);
  const gr = g.createLinearGradient(0, -wid, len, wid * 0.4); gr.addColorStop(0, rgbaOf(o.flash ? '#ffffff' : mix(col, '#ffffff', 0.5), Math.min(1, a + 0.2))); gr.addColorStop(1, rgbaOf(o.flash ? '#ffffff' : col, a * 0.7));
  g.fillStyle = gr; g.fill();
  g.save(); g.beginPath(); build(g); g.clip(); g.strokeStyle = 'rgba(30,30,44,0.55)'; g.lineWidth = 0.8;
  const nv = o.veins || 6; for (let i = 0; i < nv; i++) { const u = (i + 1) / (nv + 1); g.beginPath(); g.moveTo(len * 0.02, 0); g.quadraticCurveTo(len * (0.3 + 0.4 * u), -wid * (0.9 - u * 0.9), len * (0.55 + 0.45 * u), -wid * (0.65 - u * 0.95)); g.stroke(); }
  g.restore();
  g.beginPath(); build(g); g.strokeStyle = INK; g.lineWidth = o.lw || 2; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = 'rgba(30,30,44,0.7)'; g.lineWidth = (o.lw || 2) * 1.05; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wid * 0.9, len * 0.75, -wid * 0.7, len, -wid * 0.1); g.stroke();
  g.restore();
}
// a soft contact shadow under a creature standing at the origin
function groundD(g, w) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, w); gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.scale(1, 0.26); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w, 0, 7); g.fill(); g.restore(); }

// a segmented dome (the back of a pill bug, a helmet, a carapace): lit gradient, curved seams, ridge lights, growth lines
function domeD(g, cx, cy, rx, ry, bands, base, o) {
  o = o || {};
  formD(g, ell(cx, cy, rx, ry), [cx, cy, rx, ry], base, { flash: o.flash, spec: 0.42, lw: o.lw || 3 });
  if (o.flash) return;
  g.save(); g.beginPath(); ell(cx, cy, rx, ry)(g); g.clip();
  for (let i = 1; i < bands; i++) {
    const x = cx - rx + 2 * rx * i / bands, bulge = rx * 0.2;
    g.strokeStyle = 'rgba(0,0,0,0.62)'; g.lineWidth = o.seam || 2.2; g.beginPath(); g.moveTo(x - rx * 0.1, cy - ry - 2); g.quadraticCurveTo(x + bulge, cy, x - rx * 0.04, cy + ry + 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.34)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x - rx * 0.1 + 1.7, cy - ry * 0.86); g.quadraticCurveTo(x + bulge + 1.7, cy - ry * 0.1, x + 1.2, cy + ry * 0.45); g.stroke();
  }
  hatchD(g, [cx, cy, rx, ry], Math.round(rx * ry / 9), Math.PI / 2, mix(base, '#000000', 0.6), 0.42, { len: 4, w: 0.8, spread: 0.35, seed: o.seed || 5 });
  hatchD(g, [cx - rx * 0.25, cy - ry * 0.35, rx * 0.6, ry * 0.45], Math.round(rx * ry / 22), Math.PI / 2, '#ffffff', 0.22, { len: 3, w: 0.7, spread: 0.3, seed: (o.seed || 5) + 2 });
  g.restore();
}
