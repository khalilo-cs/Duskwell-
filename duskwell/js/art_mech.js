'use strict';
// Drawing for the room machinery in mechanics.js, in the same heavy-ink style as the rest:
// rails and chains behind the tiles, plates, decks, blades, levers and stalactites in front.

// colours of the machinery
const RUST = { plate: '#5a3424', plateHi: '#a8643c', bolt: '#d8a070', metal: '#6a6a72', metalHi: '#c8ccd6', ember: '#ffb070' };

// rails, slots and chains: everything that sits behind the play plane
Art.mechBack = function (g, t) {
  const m = G.mech; if (!m) return;
  g.save(); g.lineCap = 'round';
  for (const mv of m.movers) {
    const ax = mv.ax + mv.w / 2, ay = mv.ay + 8, bx = mv.bx + mv.w / 2, by = mv.by + 8;
    if (Math.abs(ax - bx) < 1) {                     // elevator: two chains up to the top of its run and beyond
      for (const dx of [-mv.w / 2 + 10, mv.w / 2 - 10]) {
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(mv.x + mv.w / 2 + dx, Math.min(ay, by) - 120); g.lineTo(mv.x + mv.w / 2 + dx, mv.y); g.stroke();
        g.strokeStyle = 'rgba(160,140,120,0.45)'; g.lineWidth = 2;
        for (let y = Math.min(ay, by) - 120 + ((mv.y * 0.7) % 12); y < mv.y; y += 12) { g.beginPath(); g.ellipse(mv.x + mv.w / 2 + dx, y, 2.5, 5, 0, 0, 7); g.stroke(); }
      }
    } else {                                          // a girder track with studs
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 9; g.beginPath(); g.moveTo(ax - 24, ay); g.lineTo(bx + 24, by); g.stroke();
      g.strokeStyle = 'rgba(150,120,100,0.35)'; g.lineWidth = 3; g.stroke();
      const n = Math.floor(Math.hypot(bx - ax, by - ay) / 48);
      g.fillStyle = 'rgba(200,160,120,0.35)';
      for (let i = 0; i <= n; i++) { const k = i / Math.max(1, n); g.beginPath(); g.arc(lerp(ax, bx, k), lerp(ay, by, k), 3, 0, 7); g.fill(); }
    }
  }
  for (const s of m.saws) {
    g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = 12;
    if (s.R) { g.beginPath(); g.arc(s.cx, s.cy, s.R, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,170,110,0.18)'; g.lineWidth = 2; g.stroke(); continue; }
    g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
    g.strokeStyle = 'rgba(255,170,110,0.2)'; g.lineWidth = 2; g.stroke();
    for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); fs(g, '#2a1a14', INK, 3); }
  }
  g.restore();
};

// a rusty plate with rivets
function drawPlate(g, x, y, w, alpha, seed) {
  g.save(); g.globalAlpha = alpha;
  g.beginPath(); g.moveTo(x + 2, y + 2); g.lineTo(x + w - 2, y + 2); g.lineTo(x + w - 6, y + 20); g.lineTo(x + 6, y + 20); g.closePath();
  const gr = g.createLinearGradient(0, y, 0, y + 20); gr.addColorStop(0, RUST.plateHi); gr.addColorStop(0.35, RUST.plate); gr.addColorStop(1, '#2a160e');
  fs(g, gr, INK, 3.5);
  // corrosion holes and rivets
  g.fillStyle = 'rgba(10,4,2,0.75)';
  for (let i = 0; i < w / 18; i++) { const hx = x + 10 + hash2(i, seed, 3) * (w - 20); g.beginPath(); g.ellipse(hx, y + 9 + hash2(i, seed, 5) * 6, 2 + hash2(i, seed, 7) * 3, 1.5 + hash2(i, seed, 9) * 1.5, 0, 0, 7); g.fill(); }
  g.fillStyle = RUST.bolt;
  for (let bx = x + 9; bx < x + w - 6; bx += 22) { g.beginPath(); g.arc(bx, y + 6, 2, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(255,210,160,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 6, y + 4); g.lineTo(x + w - 6, y + 4); g.stroke();
  g.restore();
}

// saw blade: a spinning disc with a motion smear, glowing when hot
function drawBlade(g, x, y, r, spin, hot) {
  g.save(); g.translate(x, y);
  bloom(g, 0, 0, r * 2.2, '#ffb070', hot ? 0.35 : 0.12);
  // motion smear
  g.strokeStyle = 'rgba(230,235,245,0.25)'; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, r * 0.82, spin, spin + 2.4); g.stroke();
  g.rotate(spin);
  const teeth = 12;
  g.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = i / teeth * Math.PI * 2, a1 = a0 + Math.PI * 2 / teeth;
    g.lineTo(Math.cos(a0) * r * 0.78, Math.sin(a0) * r * 0.78);
    g.lineTo(Math.cos(a0 + 0.12) * r * 1.05, Math.sin(a0 + 0.12) * r * 1.05);
    g.lineTo(Math.cos(a1) * r * 0.78, Math.sin(a1) * r * 0.78);
  }
  g.closePath();
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
  gr.addColorStop(0, RUST.metalHi); gr.addColorStop(0.6, RUST.metal); gr.addColorStop(1, '#2a2a30');
  fs(g, gr, INK, 3.5);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.55, 0, 7); g.stroke();
  for (let i = 0; i < 3; i++) { const a = i * 2.09; g.fillStyle = 'rgba(20,20,26,0.8)'; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.12, r * 0.08, a, 0, 7); g.fill(); }
  g.beginPath(); g.arc(0, 0, r * 0.2, 0, 7); fs(g, '#3a2418', INK, 2.5);
  g.fillStyle = RUST.bolt; g.beginPath(); g.arc(0, 0, r * 0.07, 0, 7); g.fill();
  g.restore();
}

// machinery in front of the tiles: plates, decks, blades, levers, stalactites
Art.mechFront = function (g, t, th) {
  const m = G.mech; if (!m) return;
  // crumbling plates
  for (const c of m.crumbles) {
    if (c.state !== 'gone') {
      const sh = c.state === 'shake' ? 2 + c.t * 5 : 0;
      for (let i = 0; i < c.w; i++) {
        const jx = sh ? rand(-sh, sh) : 0, jy = sh ? rand(-sh * 0.5, sh * 0.5) : 0;
        drawPlate(g, (c.x + i) * TILE + jx, c.y * TILE + jy, TILE, c.fade, c.x * 7 + i);
      }
      // hanging brackets under the run
      g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.moveTo(c.x * TILE + 8, c.y * TILE + 18); g.lineTo(c.x * TILE + 14, c.y * TILE + 30); g.moveTo((c.x + c.w) * TILE - 8, c.y * TILE + 18); g.lineTo((c.x + c.w) * TILE - 14, c.y * TILE + 30); g.stroke();
    }
    for (const ch of c.chunks) {
      g.save(); g.translate(ch.x, ch.y); g.rotate(ch.rot); g.globalAlpha = Math.min(1, ch.life * 2);
      g.beginPath(); g.moveTo(-ch.s, -ch.s * 0.4); g.lineTo(ch.s * 0.8, -ch.s * 0.5); g.lineTo(ch.s, ch.s * 0.4); g.lineTo(-ch.s * 0.6, ch.s * 0.5); g.closePath();
      fs(g, RUST.plate, INK, 2.5); g.restore();
    }
  }
  // moving decks: riveted girder with a lamp slung underneath
  for (const mv of m.movers) {
    const x = mv.x, y = mv.y, w = mv.w, on = mv.powered();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - 8, y + 16); g.lineTo(x + 8, y + 16); g.closePath();
    const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#8a6a52'); gr.addColorStop(0.4, '#4a3426'); gr.addColorStop(1, '#22160e');
    fs(g, gr, INK, 3.5);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
    for (let k = x + 16; k < x + w - 10; k += 20) { g.beginPath(); g.moveTo(k, y + 4); g.lineTo(k + 10, y + 14); g.moveTo(k + 10, y + 4); g.lineTo(k, y + 14); g.stroke(); }
    g.strokeStyle = 'rgba(255,220,180,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 4, y + 2); g.lineTo(x + w - 4, y + 2); g.stroke();
    const lx = x + w / 2, fl = on ? 0.85 + 0.15 * Math.sin(t * 9 + mv.ax) : 0.25;
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(lx, y + 16); g.lineTo(lx, y + 24); g.stroke();
    if (on) bloom(g, lx, y + 30, 46 * fl, th.glow, 0.45);
    g.beginPath(); g.ellipse(lx, y + 30, 6, 7, 0, 0, 7); fs(g, on ? '#ffe0b0' : '#5a4a3a', INK, 2.5);
    // gear hubs at the ends turn with the motion
    for (const ex of [x + 10, x + w - 10]) {
      g.save(); g.translate(ex, y + 8); g.rotate((mv.x + mv.y) * 0.05);
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); g.lineTo(Math.cos(a + 0.39) * 5, Math.sin(a + 0.39) * 5); } g.closePath();
      fs(g, '#7a5a42', INK, 2); g.restore();
    }
  }
  for (const s of m.saws) drawBlade(g, s.x, s.y, s.r, s.spin, s.spark > 0);
  // levers
  for (const l of m.levers) {
    const x = l.x, y = l.y;
    g.beginPath(); g.moveTo(x - 15, y); g.lineTo(x - 11, y - 14); g.lineTo(x + 11, y - 14); g.lineTo(x + 15, y); g.closePath(); fs(g, '#3a2a20', INK, 3);
    g.fillStyle = RUST.bolt; for (const bx of [-7, 7]) { g.beginPath(); g.arc(x + bx, y - 7, 2, 0, 7); g.fill(); }
    const a = lerp(-0.7, 0.7, l.flip), hx = x + Math.sin(a) * 34, hy = y - 12 - Math.cos(a) * 34;
    g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = '#8a8a92'; g.lineWidth = 3.5; g.stroke();
    const col = l.on ? '#9dffc8' : '#ffb070';
    bloom(g, hx, hy, 26, col, 0.45 + 0.15 * Math.sin(t * 4));
    g.beginPath(); g.arc(hx, hy, 6.5, 0, 7); fs(g, col, INK, 2.5);
    g.beginPath(); g.arc(x, y - 12, 5, 0, 7); fs(g, '#2a1c14', INK, 2.5);
  }
  // stalactites
  for (const d of m.drips) {
    if (d.state === 'gone') continue;
    const k = d.state === 'grow' ? d.grow : 1, len = d.len * k;
    const jx = d.state === 'shake' ? rand(-2, 2) : 0;
    g.beginPath(); g.moveTo(d.x - 11 * k + jx, d.y); g.lineTo(d.x - 6 * k + jx, d.y + len * 0.55); g.lineTo(d.x + jx, d.y + len); g.lineTo(d.x + 4 * k + jx, d.y + len * 0.6); g.lineTo(d.x + 11 * k + jx, d.y); g.closePath();
    const gr = g.createLinearGradient(d.x - 10, 0, d.x + 10, 0); gr.addColorStop(0, '#6a5244'); gr.addColorStop(0.5, '#a88a72'); gr.addColorStop(1, '#3a2a22');
    fs(g, gr, INK, 3);
    g.strokeStyle = 'rgba(255,230,200,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(d.x - 4 * k + jx, d.y + 4); g.lineTo(d.x - 1 + jx, d.y + len * 0.8); g.stroke();
    if (d.state === 'fall') { g.strokeStyle = 'rgba(220,200,180,0.25)'; g.lineWidth = 6; g.beginPath(); g.moveTo(d.x, d.y - 30); g.lineTo(d.x, d.y); g.stroke(); }
  }
};

// Rustworks decor: big wall cogs and chimneys behind the tiles
Art.drawGear = function (g, d, t, th) {
  const x = d.x * TILE + 16, y = d.y * TILE + 16, r = (d.r || 3) * TILE, teeth = Math.round(r / 9), dir = d.dir || 1;
  g.save(); g.translate(x, y); g.rotate(t * 0.25 * dir * (90 / r));
  g.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = i / teeth * Math.PI * 2, a1 = a0 + Math.PI / teeth;
    g.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); g.lineTo(Math.cos(a0 + 0.08) * (r + 12), Math.sin(a0 + 0.08) * (r + 12));
    g.lineTo(Math.cos(a1 - 0.08) * (r + 12), Math.sin(a1 - 0.08) * (r + 12)); g.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  g.closePath();
  g.globalAlpha = d.a || 0.55;
  fs(g, mix(th.far, '#000000', 0.45), 'rgba(0,0,0,0.5)', 4);
  g.fillStyle = mix(th.far, '#000000', 0.25);
  g.beginPath(); g.arc(0, 0, r * 0.72, 0, 7); g.arc(0, 0, r * 0.32, 0, 7, true); g.fill('evenodd');
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.fillStyle = mix(th.far, '#000000', 0.35); g.beginPath(); g.arc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.13, 0, 7); g.fill(); }
  g.beginPath(); g.arc(0, 0, r * 0.14, 0, 7); fs(g, mix(th.far, th.hi, 0.15), 'rgba(0,0,0,0.5)', 3);
  g.restore();
};
// background chimney of the foundry with a glowing mouth
Art.drawChimney = function (g, d, t, th) {
  const x = d.x * TILE, base = d.y * TILE + TILE, h = (d.h || 8) * TILE, w = 46;
  g.fillStyle = mix(th.far, '#000000', 0.2); g.fillRect(x, base - h, w, h);
  g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(x + 6, base - h, 6, h);
  g.fillStyle = mix(th.far, '#000000', 0.4); g.fillRect(x - 6, base - h, w + 12, 14);
  for (let i = 0; i < 4; i++) {                 // the furnace mouth glows and breathes
    const k = 0.6 + 0.4 * Math.sin(t * 2 + i + d.x);
    bloom(g, x + w / 2, base - 40, 70 * k, th.glow, 0.18);
  }
  g.fillStyle = 'rgba(255,170,90,0.75)'; g.beginPath(); g.arc(x + w / 2, base - 34, 12, Math.PI, 0); g.rect(x + w / 2 - 12, base - 34, 24, 18); g.fill();
};
