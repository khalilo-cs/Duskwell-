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
// The hero's sword: pommel, wrapped grip, crescent guard and a long slim blade, drawn along +x
// from the guard at (x, y) with the given angle; the grip extends behind the guard.
function heroSword(g, x, y, ang, len, plain) {
  g.save(); g.translate(x, y); g.rotate(ang); g.lineJoin = 'round';
  // grip, wrapped in teal cord
  g.beginPath(); g.rect(-10, -2.3, 10, 4.6); fs(g, plain || '#3a2418', INK, 2.2);
  if (!plain) { g.strokeStyle = '#36cfc2'; g.lineWidth = 1.4; for (let k = -9; k < 0; k += 3) { g.beginPath(); g.moveTo(k, -2); g.lineTo(k + 2, 2); g.stroke(); } }
  g.beginPath(); g.arc(-12.5, 0, 2.8, 0, 7); fs(g, plain || BONE, INK, 2);                  // pommel
  // blade
  g.beginPath(); g.moveTo(1, -2.6); g.lineTo(len - 9, -2.1); g.lineTo(len, 0); g.lineTo(len - 9, 2.1); g.lineTo(1, 2.6); g.closePath();
  if (plain) fs(g, plain, INK, 2.4);
  else {
    const gr = g.createLinearGradient(0, -3, 0, 3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#d6dde8'); gr.addColorStop(1, '#8a96a8');
    fs(g, gr, INK, 2.4);
    g.strokeStyle = 'rgba(70,85,110,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 0); g.lineTo(len - 12, 0); g.stroke();   // fuller
    g.fillStyle = 'rgba(60,150,150,0.7)';                                                                                    // engraved diamonds
    for (let d = 6; d < len - 12; d += 6) { g.beginPath(); g.moveTo(d - 1.3, 0); g.lineTo(d, -1); g.lineTo(d + 1.3, 0); g.lineTo(d, 1); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3, -1.7); g.lineTo(len - 10, -1.4); g.stroke();
  }
  // crescent guard sweeping toward the blade
  g.beginPath(); g.moveTo(-1, -8); g.quadraticCurveTo(4, -6, 3.5, -2.5); g.lineTo(3.5, 2.5); g.quadraticCurveTo(4, 6, -1, 8); g.quadraticCurveTo(1.5, 0, -1, -8); g.closePath();
  fs(g, plain || BONE, INK, 2.2);
  g.restore();
}

// ---------------------------------------------------------------- the Wanderer (the hero)
// Drawn facing +x with the feet at the origin. o carries the pose: run, air, dash, wall, atk,
// charge, sdGo, turn, landT, hurt, sit, dive; o.scale enlarges the whole figure (title screen).
// A tint draws a flat silhouette (dash ghosts, the shade).
const HERO_SCALE = 1.1;
function wanderer(g, fx, fy, face, o, alpha, tint) {
  g.save(); g.translate(fx, fy); g.globalAlpha = alpha;
  let sx = 1, sy = 1, lean = 0, ox = 0;
  if (o.air) { sy = 1 + clamp(-o.vy / 2600, -0.05, 0.1); sx = 1 / sy; }
  if (o.landT > 0) { sy = 0.88; sx = 1.1; }
  if (o.run) lean = 0.1 + Math.sin(o.t * 16) * 0.025;
  if (o.turn) { sx *= 0.8; lean = -0.06; }                       // a quick pivot when changing direction
  if (o.atk === 'side') { lean = 0.17; ox = 3; }                 // lunge into the swing
  else if (o.atk === 'up') { sy *= 1.07; lean = -0.05; }
  else if (o.atk === 'down') { sy *= 0.92; sx *= 1.05; }
  if (o.wall) { lean = 0.08; ox = -3; }                          // pressed against the wall behind
  if (o.dash) { sx = 1.35; sy = 0.8; lean = 0.22; }
  if (o.charge > 0) { sy = 1 - 0.13 * o.charge; sx = 1 + 0.1 * o.charge; lean = -0.1 * o.charge; }
  if (o.sdGo) { sx = 1.55; sy = 0.72; lean = 0.3; }
  if (o.dive) { sx = 0.78; sy = 1.22; }
  if (o.wail) { sx = 0.9; sy = 1.14; }
  if (o.sit) sy = 0.84;
  if (o.hurt) lean = -0.25;
  const k = HERO_SCALE * (o.scale || 1);
  g.scale(face * sx * k, sy * k);
  g.translate(ox, 0);
  g.rotate(lean);
  const t = o.t, plain = tint || null;
  const bob = o.run ? Math.abs(Math.sin(t * 16)) * 2.2 : Math.sin(t * 2.4) * 0.9;
  const scarf = plain || '#36cfc2', scarfDk = plain || '#1f8c84';
  g.lineCap = 'round'; g.lineJoin = 'round';

  // --- scarf tails streaming behind
  const len = 13 + Math.min(16, Math.abs(o.vx) * 0.045) + (o.air ? 5 : 0), w1 = Math.sin(t * 9) * 3, w2 = Math.sin(t * 9 + 1.3) * 3;
  const tail = (lw, col, yo, kk, ww) => {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); g.moveTo(-5, -19 - bob + yo); g.quadraticCurveTo(-len * 0.55 * kk, -21 - bob + yo + ww, -len * kk, -18 - bob + yo + w2 + (o.air ? o.vy * 0.009 : 0)); g.stroke();
  };
  tail(8, INK, 0, 1, w1); tail(5, scarf, 0, 1, w1);
  tail(6.5, INK, 4, 0.8, w2); tail(3.6, scarfDk, 4, 0.8, w2);
  if (!plain) {                                              // frayed tips
    g.strokeStyle = scarf; g.lineWidth = 1.2;
    const tx = -len, ty = -18 - bob + w2 + (o.air ? o.vy * 0.009 : 0);
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(tx + 1, ty + i * 1.6); g.lineTo(tx - 3, ty + i * 2.2 + w1 * 0.3); g.stroke(); }
  }

  // --- the sword, carried across the back unless it is in the hand
  if (!o.atk) heroSword(g, -9, -23 - bob, 2.02, 28, plain);

  // --- legs and feet
  const leg = o.run ? Math.sin(t * 16) * 3 : 0, tuck = o.air && !o.dash ? 1.5 : 0;
  const footY = i => -1.5 - tuck - (o.run ? Math.max(0, i * Math.sin(t * 16)) * 2 : 0);
  g.strokeStyle = INK; g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(-3.5, -6); g.lineTo(-4 + leg, footY(1)); g.moveTo(4.5, -6); g.lineTo(5 - leg, footY(-1)); g.stroke();
  g.fillStyle = INK; ellipse(g, -4 + leg, footY(1), 3.9, 2.6); g.fill(); ellipse(g, 5 - leg, footY(-1), 3.9, 2.6); g.fill();

  // --- cloak: the hem flares while falling and streams back while running
  const fl = o.air ? clamp(o.vy / 800, -0.25, 1) : 0, sw = o.run ? Math.sin(t * 16) * 1.2 : 0, back = o.run || o.dash || o.sdGo ? 2.5 : 0;
  const cloakPath = () => {
    g.beginPath(); g.moveTo(-6, -21 - bob); g.quadraticCurveTo(-13.5 - fl * 3 - back, -11, -12.5 - fl * 5 - back, -2.5 - fl * 7);
    g.lineTo(-8.5 - fl * 2, -4.8 - fl * 3 + sw); g.lineTo(-4.5, -0.8 - fl * 1.5); g.lineTo(0, -4.8 - fl * 2 - sw); g.lineTo(4.5, -0.8 - fl * 1.5); g.lineTo(8.5 + fl * 2, -4.8 - fl * 3 + sw); g.lineTo(12.5 + fl * 5, -2.5 - fl * 7);
    g.quadraticCurveTo(13.5 + fl * 3, -11, 6, -21 - bob); g.closePath();
  };
  if (plain) { cloakPath(); fs(g, plain, INK, 3); }
  else {
    cloakPath();
    const cg = g.createLinearGradient(0, -22, 0, 0); cg.addColorStop(0, '#26304a'); cg.addColorStop(0.55, '#141a28'); cg.addColorStop(1, '#0a0d16');
    fs(g, cg, INK, 3);
    g.save(); cloakPath(); g.clip();
    g.fillStyle = '#0d3a40'; g.beginPath(); g.moveTo(-14, -6 - fl * 6); g.lineTo(14, -6 - fl * 6); g.lineTo(14, 2); g.lineTo(-14, 2); g.fill();   // teal lining at the hem
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.4;                                                                    // folds
    g.beginPath(); g.moveTo(-3, -18 - bob); g.quadraticCurveTo(-6, -11, -5.5, -3); g.moveTo(3.5, -18 - bob); g.quadraticCurveTo(5, -11, 4, -3); g.moveTo(0.5, -16 - bob); g.lineTo(0, -6); g.stroke();
    g.strokeStyle = 'rgba(150,180,230,0.28)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-2, -17 - bob); g.quadraticCurveTo(-4.5, -11, -4, -5); g.stroke();
    g.strokeStyle = 'rgba(120,150,200,0.08)'; g.lineWidth = 0.8;                                                             // woven texture
    for (let k = -16; k < 16; k += 2.2) { g.beginPath(); g.moveTo(k, -22); g.lineTo(k + 8, 2); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(170,200,255,0.4)'; g.lineWidth = 1.3;                                                              // rim light up the front edge
    g.beginPath(); g.moveTo(6.5, -20 - bob); g.quadraticCurveTo(12.6, -12, 11.8, -4); g.stroke();
  }

  // --- the free hand, peeking out at the front of the cloak
  if (!o.atk && !o.sit) { g.fillStyle = INK; ellipse(g, 10.5, -11 - bob * 0.5 + (o.run ? Math.sin(t * 16) * 1.5 : 0), 2.6, 2.2); g.fill(); }
  if (o.wall) { g.fillStyle = INK; ellipse(g, -12, -16 - bob, 3.5, 2.6, 0.4); g.fill(); ellipse(g, -12.5, -7, 3.5, 2.6, -0.3); g.fill(); }   // claws gripping the wall

  // --- horns, swept back and outward
  const hy = -30 - bob, horn = plain || BONE;
  const hornPath = sgn => { g.beginPath(); g.moveTo(sgn * 8, hy - 7); g.bezierCurveTo(sgn * 15, hy - 12, sgn * 15.5, hy - 20, sgn * 9.5, hy - 26); g.bezierCurveTo(sgn * 10, hy - 18, sgn * 7, hy - 13, sgn * 2.5, hy - 10); g.closePath(); };
  for (const sgn of [-1, 1]) {
    hornPath(sgn); fs(g, horn, INK, 2.6);
    if (!plain) { g.strokeStyle = 'rgba(120,135,160,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(sgn * 6, hy - 9); g.bezierCurveTo(sgn * 11, hy - 13, sgn * 12, hy - 18, sgn * 9.5, hy - 23); g.stroke(); }
  }

  // --- the mask: shaded bone, a hairline crack, two deep eyes that blink
  const maskPath = () => { g.beginPath(); g.moveTo(0, hy - 11.5); g.bezierCurveTo(8, hy - 11.5, 12.6, hy - 6, 12.4, hy + 0.5); g.bezierCurveTo(12.2, hy + 7, 7, hy + 11.5, 0, hy + 12); g.bezierCurveTo(-7, hy + 11.5, -12.2, hy + 7, -12.4, hy + 0.5); g.bezierCurveTo(-12.6, hy - 6, -8, hy - 11.5, 0, hy - 11.5); g.closePath(); };
  if (plain) { maskPath(); fs(g, plain, INK, 2.6); }
  else {
    maskPath();
    const mg = g.createRadialGradient(4, hy - 6, 1, 0, hy, 15); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.55, '#eef2f6'); mg.addColorStop(1, '#b8c4d2');
    fs(g, mg, INK, 2.6);
    g.save(); maskPath(); g.clip();
    g.fillStyle = 'rgba(70,90,125,0.18)'; ellipse(g, -3, hy + 7, 13, 7); g.fill();
    g.restore();
    // the crack glows faintly with soul light
    const crack = () => { g.beginPath(); g.moveTo(6.5, hy - 10.4); g.lineTo(5.2, hy - 7.5); g.lineTo(6.6, hy - 5.6); g.lineTo(5.8, hy - 3.8); };
    const pulse = 0.35 + 0.2 * Math.sin(t * 2.2);
    g.strokeStyle = 'rgba(120,240,225,' + pulse + ')'; g.lineWidth = 2.4; crack(); g.stroke();
    g.strokeStyle = 'rgba(30,60,80,0.75)'; g.lineWidth = 0.9; crack(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.4;                      // gloss along the brow
    g.beginPath(); g.moveTo(-3, hy - 9.6); g.quadraticCurveTo(3, hy - 11, 8.4, hy - 7.6); g.stroke();
  }
  const blink = (t % 3.7) < 0.12 && !o.atk ? 0.15 : 1;
  const eye = (x, rx, ry, rot) => {
    g.fillStyle = INK; ellipse(g, x, hy + 1.2, rx, ry * blink, rot); g.fill();
    if (!plain && blink === 1) { g.fillStyle = 'rgba(200,225,255,0.85)'; g.beginPath(); g.arc(x + rx * 0.35, hy - ry * 0.45, 0.9, 0, 7); g.fill(); }
  };
  eye(-4.2, 3.3, 5.3, 0.12); eye(5.0, 3.5, 5.5, -0.1);

  // --- the scarf wrapped at the neck, with knitted bands
  g.strokeStyle = INK; g.lineWidth = 7.5; g.beginPath(); g.moveTo(-7.5, -20 - bob); g.quadraticCurveTo(0, -15.5 - bob, 7.5, -20 - bob); g.stroke();
  g.strokeStyle = scarf; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-7, -20 - bob); g.quadraticCurveTo(0, -16 - bob, 7, -20 - bob); g.stroke();
  if (!plain) {
    g.strokeStyle = scarfDk; g.lineWidth = 1.1;
    for (const x of [-4.5, -1.5, 1.5, 4.5]) { const y = -18.2 - bob + Math.abs(x) * 0.18; g.beginPath(); g.moveTo(x - 0.6, y - 1.6); g.lineTo(x + 0.6, y + 1.6); g.stroke(); }
    g.strokeStyle = 'rgba(220,255,250,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-5, -20 - bob); g.quadraticCurveTo(0, -17.6 - bob, 5, -20 - bob); g.stroke();
  }
  g.restore();
}
Art.drawPlayer = function (g, p, t) {
  const pixelGhosts = !Skins.get('player') && Art.drawPixelGhosts(g, p, t);
  for (const gh of pixelGhosts ? [] : p.ghost) {
    const life = gh.sd ? 0.26 : 0.22, a = (gh.sd ? 0.55 : 0.45) * (1 - (t - gh.t) / life);
    if (a > 0) wanderer(g, gh.x + p.w / 2, gh.y + p.h, gh.face, { t, vx: 0, vy: 0, dash: !gh.sd, sdGo: gh.sd }, a, gh.sd ? '#a8642a' : '#2a3a5a');
  }
  const charge = p.sd && p.sd.state === 'charge' ? clamp(p.sd.t / SD_CHARGE, 0, 1) : 0, sdGo = !!(p.sd && p.sd.state === 'go');
  if (charge > 0) {               // the Comet Heart gathering light
    const ready = p.sd.ready, pulse = ready ? 0.75 + 0.25 * Math.sin(t * 30) : charge;
    bloom(g, p.cx, p.cy, 30 + 50 * pulse, '#ffc070', 0.25 + 0.4 * pulse);
    g.strokeStyle = rgba('#ffe6a8', 0.3 + 0.5 * pulse); g.lineWidth = 2;
    g.beginPath(); g.arc(p.cx, p.cy, 40 - 18 * charge, 0, 7); g.stroke();
  }
  if (sdGo) {                     // a blazing streak behind the comet
    const d = p.sd.dir, x0 = p.cx - d * 150, gr = g.createLinearGradient(x0, 0, p.cx, 0);
    gr.addColorStop(0, 'rgba(255,190,110,0)'); gr.addColorStop(1, 'rgba(255,225,170,0.75)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0, p.cy - 4); g.lineTo(p.cx, p.cy - 16); g.lineTo(p.cx, p.cy + 12); g.lineTo(x0, p.cy + 4); g.fill();
    bloom(g, p.cx + d * 10, p.cy, 70, '#ffc070', 0.55);
  }
  if (p.dead) return;
  let alpha = 1;
  if (p.invuln > 0 && Math.floor(t * 24) % 2 === 0) alpha = 0.4;
  const o = { t, vx: p.vx, vy: p.vy, air: !p.onGround && !p.sliding && !p.diving && !sdGo, run: p.onGround && Math.abs(p.vx) > 30 && !sdGo, dash: p.dashT > 0, hurt: p.hurtT > 0, sit: !!p.sitting, landT: p.landT, dive: p.diving, wail: p.wailT > 0,
    turn: p.turnT > 0 && p.onGround, wall: p.sliding, atk: p.atkT > 0 ? p.atkDir : null, charge, sdGo };
  if (p.diving) {
    const tr = g.createLinearGradient(0, p.y - 120, 0, p.y + p.h);
    tr.addColorStop(0, 'rgba(220,240,255,0)'); tr.addColorStop(1, 'rgba(220,240,255,0.75)');
    g.fillStyle = tr; g.fillRect(p.cx - 12, p.y - 120, 24, 120 + p.h);
    bloom(g, p.cx, p.y + p.h, 60, '#dff3ff', 0.5);
  }
  if (p.focusT > 0) {
    const k = p.focusT / p.focusTime();
    bloom(g, p.cx, p.cy - 6, 40 + k * 50, '#dff3ff', 0.2 + k * 0.4);
    g.strokeStyle = rgba('#e8f6ff', 0.75); g.lineWidth = 2.5; ellipse(g, p.cx, p.cy - 4, 28 - k * 12, 36 - k * 14); g.stroke();
  }
  bloom(g, p.cx, p.cy - 8, 46, '#9cc4ff', 0.08);
  const skin = Skins.get('player');                   // a picture chosen in "Your images"
  if (skin) { g.save(); g.globalAlpha = alpha; Skins.draw(g, skin, { x: p.x, y: p.y, w: p.w, h: p.h }, p.face, 0, 1.5); g.restore(); }
  else if (Art.drawPixelHero(g, p, t, alpha)) return;      // the artist's pixel hero, lit in 3D
  else wanderer(g, p.cx, p.y + p.h + (p.sitting ? 4 : 0), p.face, o, alpha, null);
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
    // the sword in the hand, at the leading edge of the swing
    // the hand sits in front of the chest so the blade never crosses the mask
    const hx = p.cx + f * 14, hy = p.cy + (p.atkDir === 'up' ? -6 : p.atkDir === 'down' ? 6 : 0);
    heroSword(g, hx + Math.cos(sweep) * 4, hy + Math.sin(sweep) * 4, sweep, 40 * HERO_SCALE * (Charms.has('reach') ? 1.3 : 1), null);
    g.fillStyle = INK; ellipse(g, hx, hy, 3.2, 2.8); g.fill();
  }
};

// ---------------------------------------------------------------- enemies
const F = (e, c) => (e.flash > 0 ? '#ffffff' : c);
Art.enemy = {};

// ---------------------------------------------------------------- bosses
Art.boss = {};
function telGlow(g, b, color, x, y, r) { if (b.tele > 0) bloom(g, x, y, r, color, 0.22 + 0.25 * Math.abs(Math.sin(b.t * 12))); }

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
  } else if (it.kind === 'charm') {
    const c = Charms.DEFS[it.def.charm].color;
    bloom(g, it.x, y, 90, c, 0.4 + 0.12 * Math.sin(t * 3));
    Art.drawCharm(g, it.def.charm, it.x, y, 17, { glow: true });
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

// ---------------------------------------------------------------- newer enemies

// ---------------------------------------------------------------- newer bosses

// ---------------------------------------------------------------- newer projectiles
const baseDrawProj = Art.drawProj;
Art.drawProj = function (g, p, t) {
  if (p.kind === 'cloud') {
    const k = clamp(p.t / 0.25, 0.3, 1), a = clamp(p.life / 0.4, 0, 1) * 0.55;
    for (let i = 0; i < 5; i++) {
      const x = p.x + Math.cos(i * 1.3 + t) * p.w * 0.25 * k, y = p.y + Math.sin(i * 1.7 + t * 1.2) * p.h * 0.2 * k;
      glow(g, x, y, p.w * 0.4 * k, p.color, a);
    }
    return;
  }
  if (p.kind === 'bomb') {
    g.save(); g.translate(p.x, p.y); g.rotate(p.t * 7);
    bloom(g, 0, 0, 40, '#ff9a50', 0.3 + 0.2 * Math.sin(p.t * 22));
    ellipse(g, 0, 0, p.r + 2, p.r + 2); fs(g, '#2a2024', INK, 2.6);
    g.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(g, -3, -3.5, 3, 2); g.fill();
    g.strokeStyle = '#d8b878'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -p.r - 1); g.quadraticCurveTo(5, -p.r - 7, 9, -p.r - 6); g.stroke();
    g.fillStyle = '#fff1a0'; ellipse(g, 9, -p.r - 6, 2.6 + Math.sin(p.t * 40), 2.6); g.fill();
    g.restore();
    return;
  }
  if (p.kind === 'blast') {
    const k = clamp(p.t / 0.45, 0, 1), a = 1 - k;
    const gr = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * 1.2); gr.addColorStop(0, 'rgba(255,240,170,' + 0.95 * a + ')'); gr.addColorStop(0.45, 'rgba(255,130,40,' + 0.75 * a + ')'); gr.addColorStop(1, 'rgba(120,20,10,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r * 1.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,200,120,' + a + ')'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke();
    return;
  }
  if (p.kind === 'web') {
    g.save(); g.translate(p.x, p.y); g.rotate(p.t * 4);
    bloom(g, 0, 0, 24, '#e6e0ff', 0.35);
    g.strokeStyle = '#f0ecff'; g.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.stroke(); g.rotate(Math.PI / 4); }
    g.strokeStyle = 'rgba(240,236,255,0.8)'; ellipse(g, 0, 0, 7, 7); g.stroke(); ellipse(g, 0, 0, 11, 11); g.stroke();
    g.restore();
    return;
  }
  if (p.kind === 'wave') {                         // the Blade Echo: a crescent of pale light
    const dir = sign(p.vx) || 1;
    g.save(); g.translate(p.x, p.y); g.scale(dir, 1);
    bloom(g, 0, 0, 44, p.color, 0.45);
    g.lineCap = 'round';
    for (const [r, w, a] of [[17, 7, 0.95], [24, 4, 0.55], [31, 2.4, 0.3]]) { g.strokeStyle = 'rgba(245,238,255,' + a + ')'; g.lineWidth = w; g.beginPath(); g.arc(-18, 0, r + 18, -0.8, 0.8); g.stroke(); }
    g.restore();
    return;
  }
  if (p.pal && tintedProj(g, p, t)) return;
  baseDrawProj(g, p, t);
};

// the boss projectiles of Rimecrest and Cinderdeep: the same shapes, drawn in ice or in slag (p.pal, see bosses.js)
function tintedProj(g, p, t) {
  const pal = p.pal, k = p.kind;
  if (k === 'shard') {
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot || Math.atan2(p.vy, p.vx));
    bloom(g, 0, 0, 26, pal.glow, 0.45);
    poly(g, [-14, 0, -2, -5, 17, 0, -2, 5]); fs(g, pal.fill, INK, 2.4);
    poly(g, [-14, 0, -2, -5, 17, 0]); fs(g, pal.fill2, null);
    g.restore(); return true;
  }
  if (k === 'orb') {
    bloom(g, p.x, p.y, 34, pal.glow, 0.55);
    g.save(); g.translate(p.x, p.y); g.rotate(t * 2 + p.t);
    for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); poly(g, [-p.r - 3, -1.6, p.r + 3, -1.6, p.r + 3, 1.6, -p.r - 3, 1.6]); fs(g, pal.fill, INK, 1.6); }
    ellipse(g, 0, 0, p.r * 0.55, p.r * 0.55); fs(g, pal.fill2, INK, 1.8);
    g.restore(); return true;
  }
  if (k === 'rock') {
    if (p.t < p.tele) {
      const a = 0.25 + 0.35 * Math.abs(Math.sin(p.t * 14));
      const gr = g.createLinearGradient(0, p.y0, 0, G.floorY); gr.addColorStop(0, 'rgba(' + pal.rgb + ',0)'); gr.addColorStop(1, 'rgba(' + pal.rgb + ',' + a + ')');
      g.fillStyle = gr; g.fillRect(p.x - 16, p.y0, 32, G.floorY - p.y0);
    }
    g.save(); g.translate(p.x + (p.t < p.tele ? Math.sin(p.t * 60) * 1.5 : 0), p.y);
    bloom(g, 0, 0, 34, pal.glow, p.t < p.tele ? 0.25 : 0.5);
    if (pal.spike) { poly(g, [-11, -18, 11, -18, 5, 6, 0, 26, -5, 6]); fs(g, pal.fill, INK, 3); poly(g, [-11, -18, -1, -18, 0, 26, -5, 6]); fs(g, pal.fill2, null); }
    else { g.rotate(p.t * 3); poly(g, [-16, -4, -6, -16, 10, -12, 17, 2, 8, 15, -10, 13]); fs(g, '#2c2228', INK, 3.2); poly(g, [-6, -16, 10, -12, 2, -2]); fs(g, pal.fill, null); poly(g, [-3, 4, 8, 2, 3, 11]); fs(g, pal.fill2, null); }
    g.restore(); return true;
  }
  if (k === 'pillar') {
    if (p.t < p.tele) {
      const f = p.t / p.tele;
      bloom(g, p.x, p.y - 4, 40 + f * 20, pal.glow, 0.3 + f * 0.4);
      g.strokeStyle = 'rgba(' + pal.rgb + ',' + (0.4 + f * 0.5) + ')'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x - 24, p.y - 2); g.lineTo(p.x + 24, p.y - 2); g.stroke();
    } else {
      const h = p.ph * clamp((p.t - p.tele) / 0.08, 0, 1);
      bloom(g, p.x, p.y - h * 0.5, 80, pal.glow, 0.35);
      poly(g, [p.x - 23, p.y, p.x - 14, p.y - h * 0.7, p.x - 6, p.y - h, p.x + 4, p.y - h * 0.75, p.x + 23, p.y]); fs(g, pal.fill, INK, 3.4);
      poly(g, [p.x - 6, p.y, p.x - 6, p.y - h, p.x + 4, p.y - h * 0.75, p.x + 4, p.y]); fs(g, pal.fill2, null);
    }
    return true;
  }
  if (k === 'beam') {
    const rgb = pal.rgb;
    if (p.t < p.tele) {
      const f = p.t / p.tele, w = 2 + f * 6;
      g.fillStyle = 'rgba(' + rgb + ',' + (0.25 + 0.4 * f) + ')'; g.fillRect(p.x - w / 2, 0, w, G.level.ph);
    } else {
      const gr = g.createLinearGradient(p.x - p.bw / 2, 0, p.x + p.bw / 2, 0);
      gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(p.x - p.bw / 2 - 10, 0, p.bw + 20, G.level.ph);
    }
    return true;
  }
  return false;
}

// Dusk Cry: a column of pale light from the Wanderer's feet to the ceiling, flickering as it fades
Art.drawWail = function (g, p, t) {
  const k = clamp(p.wailT / 0.55, 0, 1), env = Math.sin(Math.PI * (1 - k) * 0.9 + 0.2) * 0.9 + 0.1, w = 40 * env * (0.85 + 0.15 * Math.sin(t * 60));
  const top = p.wailTop, bot = p.y + p.h, x = p.cx;
  const gr = g.createLinearGradient(x - w, 0, x + w, 0);
  gr.addColorStop(0, 'rgba(210,236,255,0)'); gr.addColorStop(0.5, 'rgba(240,250,255,' + (0.9 * env) + ')'); gr.addColorStop(1, 'rgba(210,236,255,0)');
  const o = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
  g.fillStyle = gr; g.fillRect(x - w, top, w * 2, bot - top);
  const tg = g.createLinearGradient(0, top, 0, top + 70); tg.addColorStop(0, 'rgba(10,14,22,0.5)'); tg.addColorStop(1, 'rgba(10,14,22,0)');
  g.globalCompositeOperation = o; g.fillStyle = tg; g.fillRect(x - w, top, w * 2, 70);   // the top fades into the dark
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const sx = x + (hash2(i, 3, 5) - 0.5) * w * 1.4, sy = bot - ((t * 340 + i * 97) % Math.max(40, bot - top)); g.fillStyle = 'rgba(255,255,255,' + (0.7 * env) + ')'; g.fillRect(sx - 1.5, sy - 12, 3, 24); }
  g.globalCompositeOperation = o;
  bloom(g, x, bot - 20, 90, '#dff3ff', 0.5 * env);
};

// Lantern station: an iron post with a hanging lantern. Dark until the Wanderer lights it.
Art.drawStation = function (g, st, t, lit) {
  const x = st.px, y = st.py, fl = 0.85 + 0.15 * Math.sin(t * 7 + x);
  if (lit) bloom(g, x + 22, y - 88, 190, '#ffd98a', 0.5 * fl);
  g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 96); g.quadraticCurveTo(x, y - 112, x + 22, y - 112); g.stroke();          // post and arm
  g.strokeStyle = '#3d3a4a'; g.lineWidth = 3.5; g.stroke();
  g.fillStyle = '#2a2833'; g.fillRect(x - 11, y - 8, 22, 8); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(x - 11, y - 8, 22, 8);   // foot
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 22, y - 112); g.lineTo(x + 22, y - 100); g.stroke();             // chain
  poly(g, [x + 10, y - 106, x + 34, y - 106, x + 38, y - 80, x + 6, y - 80]); fs(g, lit ? rgba('#ffd98a', 0.9) : '#16151c', INK, 3);   // lantern
  g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 22, y - 106); g.lineTo(x + 22, y - 80); g.moveTo(x + 7, y - 93); g.lineTo(x + 37, y - 93); g.stroke();
  if (lit) {
    g.fillStyle = '#fff6d0'; ellipse(g, x + 22, y - 93, 5 * fl, 8 * fl); g.fill();
  }
};

// Shield Warden: bronze-plated guard behind a tall shield; the shield is pulled back before a bash

// Ram: a low, horned beast; it lowers its head and paws the ground before the charge

// ================================================= creatures of Rimecrest and Cinderdeep
// Burrower: a mound while buried; a furred digger (frost) or a glowing worm (ember) when it erupts

// Bomber: a small imp with a lit bomb

// Blinker: a veiled wraith, half faded until it chooses to strike

// Roller: an armoured beast that curls into a ball

// Slime: a see-through jelly that squashes before it hops

// Chainman: a heavy guard whirling a spiked ball on a chain

// Moth: flutters around light, and glows with its own

// Icicle: a hanging spike of ice (or basalt in Cinderdeep) that trembles before it falls

// ---------------------------------------------------------------- the bosses of Rimecrest and Cinderdeep


// ---------------------------------------------------------------- the bosses of Stormcrest


// ---------------------------------------------------------------- the bosses of the Mirror Vault

