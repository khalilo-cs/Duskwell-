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
  const sq = e.currentState === 'anticipation' ? 0.78 : (!e.onGround ? 1.15 : 1 + Math.sin(t * 3) * 0.03);
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
  const wind = e.currentState === 'anticipation', charge = e.currentState === 'attack', w = wind ? clamp(e.stateT / 0.45, 0, 1) : 0, fl = e.flash > 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1); g.rotate(charge ? 0.12 : 0);
  const walk = e.currentState === 'patrol' || e.currentState === 'chase' ? Math.sin(t * (e.currentState === 'chase' ? 12 : 6)) * 2 : 0;
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
Art.enemy.diver = function (g, e, t) {          // masked mosquito with a long proboscis
  const tele = e.currentState === 'anticipation', atk = e.currentState === 'attack';
  g.save(); g.translate(e.cx + (tele ? Math.sin(t * 60) * 1.5 : 0), e.cy);
  const ang = atk || tele ? (e.aim || 0) : (e.face > 0 ? 0 : Math.PI);
  g.rotate(ang); if (Math.cos(ang) < 0) g.scale(1, -1);
  const flap = Math.sin(t * 44);
  g.fillStyle = 'rgba(230,244,255,0.5)'; g.strokeStyle = INK; g.lineWidth = 1.8;
  ellipse(g, -6, -10, 5, 10 + flap * 3, -0.5); g.fill(); g.stroke(); ellipse(g, 0, -10, 5, 9 - flap * 3, 0.4); g.fill(); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(8, 1); g.lineTo(30, 2); g.stroke();
  g.strokeStyle = e.flash > 0 ? '#fff' : '#d8c8b0'; g.lineWidth = 1.6; g.stroke();
  ellipse(g, -12, 3, 9, 6, 0.3); fs(g, F(e, '#6a3a2a'), INK, 2.4);
  mask(g, 2, 0, 8.5, 8, 1.05, 1, e.flash > 0 ? '#fff' : BONE);
  g.restore();
  if (tele) bloom(g, e.cx, e.cy, 36, '#ff8a4a', 0.4);
};
Art.enemy.spider = function (g, e, t) {         // round spider on a thread
  if (e.currentState === 'idle' && e.hanging && e.anchorY !== null) {
    g.strokeStyle = 'rgba(230,230,245,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(e.cx, e.anchorY); g.lineTo(e.cx, e.y + 4); g.stroke();
  }
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face || 1, 1);
  const hang = e.currentState === 'idle' && e.hanging, walk = Math.sin(t * 16) * (e.currentState === 'chase' ? 3 : 0);
  g.strokeStyle = INK; g.lineWidth = 2.6; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const lx = -12 + i * 8, s = i % 2 ? 1 : -1;
    g.beginPath(); g.moveTo(lx * 0.5, -12); g.quadraticCurveTo(lx - 4, hang ? -24 : -22, lx * 1.3 + s * walk, hang ? -6 : 0); g.stroke();
  }
  ellipse(g, -4, -13, 13, 10); fs(g, F(e, '#2e2840'), INK, 2.8);
  g.fillStyle = e.flash > 0 ? '#fff' : 'rgba(200,170,255,0.35)'; ellipse(g, -8, -17, 5, 3, -0.4); g.fill();
  mask(g, 9, -12, 7, 6.5, 1.1, 1, e.flash > 0 ? '#fff' : BONE);
  g.restore();
};
Art.enemy.brood_child = Art.enemy.spider;
Art.enemy.shroom = function (g, e, t) {         // walking toadstool
  const puff = e.currentState === 'anticipation' ? clamp(e.stateT / 0.5, 0, 1) : 0, walk = e.currentState === 'patrol' ? Math.sin(t * 8) * 2 : 0;
  g.save(); g.translate(e.cx, e.y + e.h); g.scale(e.face, 1);
  g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-4, -8); g.lineTo(-5 + walk, 0); g.moveTo(5, -8); g.lineTo(6 - walk, 0); g.stroke();
  ellipse(g, 0, -14, 9, 9); fs(g, F(e, '#e8dcc0'), INK, 2.6);
  g.fillStyle = INK; ellipse(g, 3, -14, 1.8, 3); g.fill(); ellipse(g, 7, -14, 1.8, 3); g.fill();
  const cw = 18 + puff * 5;
  g.beginPath(); g.moveTo(-cw, -18); g.quadraticCurveTo(-cw, -40 - puff * 6, 0, -40 - puff * 6); g.quadraticCurveTo(cw, -40 - puff * 6, cw, -18); g.quadraticCurveTo(0, -24, -cw, -18); g.closePath();
  fs(g, F(e, '#d8a040'), INK, 3);
  g.fillStyle = e.flash > 0 ? '#fff' : '#fff1d0'; ellipse(g, -7, -30, 3.5, 2.5); g.fill(); ellipse(g, 6, -33, 3, 2.2); g.fill(); ellipse(g, 11, -24, 2.5, 2); g.fill();
  if (puff > 0) bloom(g, 16, -20, 30, '#e8d070', puff * 0.5);
  g.restore();
};
Art.enemy.jelly = function (g, e, t) {
  const x = e.cx, y = e.cy - 4, r = 15 + Math.sin(t * 3 + e.ph) * 1.5;
  bloom(g, x, y, 50, '#ffb070', 0.25);
  g.fillStyle = e.flash > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(235,220,255,0.35)'; g.strokeStyle = INK; g.lineWidth = 2.6;
  g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.quadraticCurveTo(x + r * 0.5, y + 5, x, y + 2); g.quadraticCurveTo(x - r * 0.5, y + 5, x - r, y); g.fill(); g.stroke();
  g.fillStyle = e.flash > 0 ? '#fff' : 'rgba(255,190,110,0.95)'; ellipse(g, x, y - r * 0.35, r * 0.34, r * 0.3); g.fill();
  g.strokeStyle = 'rgba(235,220,255,0.55)'; g.lineWidth = 1.8;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * 5, y + 3); g.quadraticCurveTo(x + k * 6 + Math.sin(t * 3 + k) * 5, y + 14, x + k * 4, y + 22); g.stroke(); }
};

// ---------------------------------------------------------------- newer bosses
Art.boss.spore = function (g, b, t) {            // a toadstool matriarch
  const fl = b.flash > 0, sq = b.tele > 0 && b.onGround ? 0.9 : (!b.onGround ? 1.06 : 1);
  g.save(); g.globalAlpha = b.alpha; g.translate(b.cx, b.y + b.h); g.scale(b.face * (2 - sq), sq);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#ffb070', 0, -60, 130);
  g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-18, -20); g.lineTo(-26, 0); g.moveTo(18, -20); g.lineTo(26, 0); g.stroke();
  // stem body
  g.beginPath(); g.moveTo(-26, -60); g.quadraticCurveTo(-34, -24, -22, -12); g.lineTo(22, -12); g.quadraticCurveTo(34, -24, 26, -60); g.closePath(); fs(g, fl ? '#fff' : '#eadfc4', INK, 3.5);
  g.strokeStyle = 'rgba(120,90,60,0.35)'; g.lineWidth = 2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 10, -56); g.lineTo(i * 12, -16); g.stroke(); }
  mask(g, 8, -44, 15, 14, 1.15, 1, fl ? '#fff' : BONE);
  // gills and cap
  g.fillStyle = fl ? '#fff' : '#b88a60'; g.beginPath(); g.moveTo(-58, -66); g.quadraticCurveTo(0, -48, 58, -66); g.lineTo(58, -70); g.lineTo(-58, -70); g.fill();
  g.beginPath(); g.moveTo(-60, -66); g.quadraticCurveTo(-58, -118, 0, -120); g.quadraticCurveTo(58, -118, 60, -66); g.quadraticCurveTo(0, -56, -60, -66); g.closePath();
  const gr = g.createLinearGradient(0, -120, 0, -60); gr.addColorStop(0, fl ? '#fff' : '#ff9a52'); gr.addColorStop(1, fl ? '#fff' : '#b8341e');
  fs(g, gr, INK, 4);
  g.fillStyle = fl ? '#fff' : '#fff1d8';
  for (const [x, y, r] of [[-34, -92, 7], [-10, -106, 6], [16, -98, 8], [40, -84, 5], [-44, -74, 4], [4, -80, 5]]) { ellipse(g, x, y, r, r * 0.75); g.fill(); }
  g.restore();
};
Art.boss.drowned = function (g, b, t) {          // barnacled diver in a round helm
  const fl = b.flash > 0;
  g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#8fe0ff', 0, -70, 130);
  const step = b.vx !== 0 ? Math.sin(t * 14) * 5 : 0;
  g.strokeStyle = INK; g.lineWidth = 11; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-18, -34); g.lineTo(-22 + step, 0); g.moveTo(18, -34); g.lineTo(22 - step, 0); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#3a5a6a'; g.lineWidth = 6; g.stroke();
  // torso
  ellipse(g, 0, -62, 42, 36); fs(g, fl ? '#fff' : '#2c4656', INK, 4);
  g.save(); ellipse(g, 0, -62, 42, 36); g.clip();
  g.strokeStyle = INK; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-44, -62 + i * 11); g.quadraticCurveTo(0, -52 + i * 11, 44, -62 + i * 11); g.stroke(); }
  g.fillStyle = fl ? '#fff' : 'rgba(150,230,255,0.25)'; ellipse(g, -16, -80, 14, 6, -0.4); g.fill();
  g.restore();
  for (const [x, y] of [[-26, -40], [28, -50], [-8, -30], [12, -86]]) { ellipse(g, x, y, 5, 4); fs(g, fl ? '#fff' : '#d8d0b8', INK, 2); }
  // helm with a glass port
  ellipse(g, 12, -106, 26, 24); fs(g, fl ? '#fff' : '#6a7a80', INK, 4);
  ellipse(g, 16, -106, 15, 14); fs(g, b.tele > 0 ? '#bff4ff' : 'rgba(40,90,110,0.9)', INK, 3);
  mask(g, 16, -106, 10, 10, 1.1, 1, fl ? '#fff' : BONE);
  bloom(g, 16, -106, 40, '#8fe0ff', 0.25);
  // anchor arm
  g.save(); g.translate(36, -72); g.rotate(b.tele > 0 ? -1.6 : (b.melee ? 0.4 : 0.9));
  g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(44, 0); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#3a5a6a'; g.lineWidth = 7; g.stroke();
  g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(44, -26); g.lineTo(44, 26); g.moveTo(44, 26); g.quadraticCurveTo(62, 22, 66, 8); g.moveTo(44, 26); g.quadraticCurveTo(26, 22, 22, 8); g.stroke();
  g.strokeStyle = fl ? '#fff' : '#9aa6ac'; g.lineWidth = 4; g.stroke();
  g.restore();
  g.restore();
  if (b.stunned) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.fillStyle = '#bff4ff'; g.fillRect(b.cx + Math.cos(a) * 30 - 3, b.y - 6 + Math.sin(a) * 6, 6, 6); }
};
Art.boss.brood = function (g, b, t) {            // great spider mother
  const fl = b.flash > 0, ceil = b.onCeil;
  g.save(); g.translate(b.cx, ceil ? b.y : b.y + b.h); if (ceil) g.scale(b.face, -1); else g.scale(b.face, 1);
  if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2, 0);
  telGlow(g, b, '#c8a8ff', 0, -40, 130);
  const walk = b.vx !== 0 ? Math.sin(t * 18) * 5 : 0;
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const bx = s * (10 + i * 12), w = (i % 2 ? 1 : -1) * walk * s;
    g.beginPath(); g.moveTo(bx * 0.6, -34); g.quadraticCurveTo(bx * 1.4, -70 + i * 4, bx * 1.9 + w, 0); g.stroke();
  }
  ellipse(g, -26, -44, 42, 32); fs(g, fl ? '#fff' : '#2a2238', INK, 4);
  g.save(); ellipse(g, -26, -44, 42, 32); g.clip();
  g.strokeStyle = fl ? '#fff' : 'rgba(200,168,255,0.45)'; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-26, -44, 12 + i * 11, 0, 7); g.stroke(); }
  g.restore();
  ellipse(g, 26, -40, 22, 18); fs(g, fl ? '#fff' : '#3a3050', INK, 3.5);
  mask(g, 34, -40, 14, 13, 1.15, 1, fl ? '#fff' : BONE);
  if (b.tele > 0) { g.fillStyle = '#ff6a8a'; for (const [x, y] of [[28, -48], [40, -48], [34, -54]]) { ellipse(g, x, y, 2, 2); g.fill(); } }
  g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(46, -34); g.quadraticCurveTo(58, -28, 54, -18); g.moveTo(44, -30); g.quadraticCurveTo(50, -20, 44, -14); g.stroke();
  g.restore();
  if (ceil) { g.strokeStyle = 'rgba(230,230,245,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.cx, 0); g.lineTo(b.cx, b.y); g.stroke(); }
};

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
  if (p.kind === 'web') {
    g.save(); g.translate(p.x, p.y); g.rotate(p.t * 4);
    bloom(g, 0, 0, 24, '#e6e0ff', 0.35);
    g.strokeStyle = '#f0ecff'; g.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.stroke(); g.rotate(Math.PI / 4); }
    g.strokeStyle = 'rgba(240,236,255,0.8)'; ellipse(g, 0, 0, 7, 7); g.stroke(); ellipse(g, 0, 0, 11, 11); g.stroke();
    g.restore();
    return;
  }
  baseDrawProj(g, p, t);
};

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
