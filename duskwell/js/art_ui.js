'use strict';
// The painted interface (art/ui/ui.webp, cut by tools/paint/ui.py, rectangles in UI_RECTS): the life gems, the soul vessel and
// its liquid, the coin, the boss's health bar, and the painted droplets, splashes, sparks, puffs and chips that every burst of
// blood, dust or sparks in the game is made of (painted white, tinted with the colour of what they come from).
const UiArt = (() => {
  // the pieces lie on pages of at most 2048 x 4096 (a phone's graphics chip takes no bigger picture); a piece's fifth number is its page
  const pages = [];
  for (let i = 0; i < (typeof UI_PAGES !== 'undefined' ? UI_PAGES : 1); i++) { const im = new Image(); im.src = 'art/ui/' + (i ? 'ui_' + i + '.webp' : 'ui.webp'); pages.push(im); }
  const R = typeof UI_RECTS !== 'undefined' ? UI_RECTS : {};
  const ready = () => pages.every(im => im.complete && im.naturalWidth > 0);
  const has = n => !!R[n] && ready();
  const pic = r => pages[r[4] || 0];
  // piece n centred at (x, y), h px tall
  function draw(g, n, x, y, h, o) {
    const r = R[n]; if (!r || !ready()) return false;
    o = o || {}; const w = o.w || h * r[2] / r[3];
    g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha; if (o.filter) g.filter = o.filter;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(pic(r), r[0], r[1], r[2], r[3], x - w / 2, y - h / 2, w, h);
    g.restore(); return true;
  }
  // the vessel's ring alone, its glass cut out, so the soul liquid shows inside it
  const RING_IN = 0.265;                       // radius of the glass inside the ring, as a share of the picture's height
  let ring = null;
  function ringPic() {
    if (ring || !has('vessel')) return ring;
    const r = R.vessel, c = document.createElement('canvas'); c.width = r[2]; c.height = r[3];
    const g = c.getContext('2d'); g.drawImage(pic(r), r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
    g.globalCompositeOperation = 'destination-out';
    const gr = g.createRadialGradient(r[2] / 2, r[3] / 2, r[3] * RING_IN * 0.9, r[2] / 2, r[3] / 2, r[3] * RING_IN * 1.04);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(r[2] / 2, r[3] / 2, r[3] * RING_IN * 1.04, 0, 7); g.fill();
    ring = c; return ring;
  }
  // the soul vessel at (x, y), the glass ri px in radius: dark glass, the liquid up to `fill` (0..1) with a moving surface,
  // dimmer when it is not enough for a spell; above `cap` (0..1) the glass is cracked and dark
  // (painted on a small canvas of its own and then laid on the screen: its round clips cost little there, and much on the
  // whole screen of a phone)
  let vc = null;
  function vessel(g, x, y, ri, fill, bright, cap, t) {
    const pic = ringPic(); if (!pic) return false;
    const h0 = ri / RING_IN, w0 = h0 * pic.width / pic.height, m = g.getTransform(), k = Math.max(1, Math.min(3, Math.hypot(m.a, m.b)));
    const W = Math.ceil(w0 * k) + 4, H = Math.ceil(h0 * k) + 4;
    if (!vc || vc.width !== W || vc.height !== H) { vc = document.createElement('canvas'); vc.width = W; vc.height = H; }
    const c = vc.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.setTransform(k, 0, 0, k, W / 2, H / 2);
    paintVessel(c, 0, 0, ri, fill, bright, cap, t, pic);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(vc, x - W / 2 / k, y - H / 2 / k, W / k, H / k); g.restore();
    return true;
  }
  function paintVessel(g, x, y, ri, fill, bright, cap, t, pic) {
    const h = ri / RING_IN, w = h * pic.width / pic.height;
    g.save();
    g.beginPath(); g.arc(x, y, ri + 1, 0, 7); g.clip();
    draw(g, 'vessel', x, y, h);                                       // the dark glass
    const ly = y + ri - 2 * ri * fill;
    g.beginPath(); g.moveTo(x - ri - 2, y + ri + 2);
    for (let k = -ri - 2; k <= ri + 2; k += 3) g.lineTo(x + k, ly + Math.sin(t * 4 + k * 0.25) * 1.8);
    g.lineTo(x + ri + 2, y + ri + 2); g.closePath(); g.clip();
    draw(g, 'soul', x, y + Math.sin(t * 0.7) * 1.5, ri * 2.35, bright ? null : { filter: 'brightness(0.7) saturate(0.75)' });
    g.restore();
    if (cap < 1) {
      g.save(); g.beginPath(); g.arc(x, y, ri, 0, 7); g.clip();
      const cy = y + ri - 2 * ri * cap;
      g.fillStyle = 'rgba(6,8,14,0.85)'; g.fillRect(x - ri, y - ri, 2 * ri, cy - (y - ri));
      g.strokeStyle = 'rgba(170,185,210,0.75)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - ri + 2, cy); g.lineTo(x - 7, cy + 3); g.lineTo(x + 2, cy - 2); g.lineTo(x + ri - 2, cy + 2); g.stroke();
      g.restore();
    }
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(pic, x - w / 2, y - h / 2, w, h); g.restore();
    return true;
  }
  // the boss's health bar: the painted liquid inside the painted frame, w px long, centred on x
  function bossBar(g, x, y, w, k, flash) {
    if (!has('bar_frame') || !has('bar_fill')) return false;
    const f = R.bar_frame, fh = w * f[3] / f[2];
    const sx = 0.085, sw = 1 - 2 * sx, ih = fh * 0.2;                 // the slot: between the thorned ends, a fifth of its height
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.fillStyle = 'rgba(6,4,8,0.85)'; g.fillRect(x - w / 2 + w * sx, y - ih / 2, w * sw, ih);
    if (k > 0) {
      const b = R.bar_fill;
      g.save(); g.beginPath(); g.rect(x - w / 2 + w * sx, y - ih / 2 - 2, w * sw * k, ih + 4); g.clip();
      if (flash) g.filter = 'brightness(1.8)';
      g.drawImage(pic(b), b[0], b[1], b[2], b[3], x - w / 2 + w * sx, y - ih / 2 - 1, w * sw, ih + 2);
      g.restore();
    }
    g.drawImage(pic(f), f[0], f[1], f[2], f[3], x - w / 2, y - fh / 2, w, fh);
    g.restore();
    return true;
  }
  // tinted copies of the white effects, one per colour
  const tints = {};
  function tinted(n, col) {
    const key = n + col; if (tints[key]) return tints[key];
    const r = R[n]; if (!r || !ready()) return null;
    const k = Math.min(1, 96 / Math.max(r[2], r[3])), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(r[2] * k)); c.height = Math.max(1, Math.round(r[3] * k));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(pic(r), r[0], r[1], r[2], r[3], 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(pic(r), r[0], r[1], r[2], r[3], 0, 0, c.width, c.height);
    tints[key] = c; return c;
  }
  // a particle of the game: a falling one is a droplet, a fleck or a chip, a rising one a puff of dust or smoke
  const FALL = ['fx_drop', 'fx_fleck', 'fx_chip', 'fx_drop', 'fx_splash'], RISE = ['fx_puff', 'fx_smoke', 'fx_puff'];
  function particle(g, p, a) {
    if (!ready()) return false;
    if (p.sp == null) { const list = p.grav < 0 ? RISE : FALL; p.sp = list[(Math.random() * list.length) | 0]; p.rot = Math.random() * 6.28; }
    const c = tinted(p.sp, p.color); if (!c) return false;
    const s = p.size * (p.grav < 0 ? 3.4 : 2.6) * (p.sp === 'fx_splash' ? 1.4 : 1);
    g.globalAlpha = a;
    if (p.sp === 'fx_drop' || p.sp === 'fx_smoke') {                // a droplet falls along its way
      const ang = Math.atan2(p.vy, p.vx) - Math.PI / 2;
      g.save(); g.translate(p.x, p.y); g.rotate(p.sp === 'fx_drop' ? ang + Math.PI : 0); g.drawImage(c, -s * 0.4, -s / 2, s * 0.8, s); g.restore();
    } else { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.drawImage(c, -s / 2, -s / 2, s, s); g.restore(); }
    return true;
  }
  // a framed piece laid over any box without stretching its ornaments: its four corners as painted (c of its shorter side),
  // its edges repeated from a plain stretch next to each corner (so an ornament in the middle of an edge is not smeared), its
  // inside stretched
  function frame(g, n, x, y, w, h, c) {
    const r = R[n]; if (!r || !ready()) return false;
    const cs = Math.min(r[2], r[3]) * (c || 0.08), cd = Math.min(cs * 0.75, w / 3, h / 3), k = cd / cs, seg = cs * 1.1;
    const part = (sx, sy, sw, sh, dx, dy, dw, dh) => g.drawImage(pic(r), r[0] + sx, r[1] + sy, sw, sh, dx, dy, dw + 0.5, dh + 0.5);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    part(cs, cs, r[2] - 2 * cs, r[3] - 2 * cs, x + cd, y + cd, w - 2 * cd, h - 2 * cd);                       // the inside
    // the edges, a short plain stretch repeated
    const runX = (sy, dy) => { g.save(); g.beginPath(); g.rect(x + cd, dy, w - 2 * cd, cd); g.clip(); for (let px = x + cd; px < x + w - cd; px += seg * k - 0.5) part(cs, sy, seg, cs, px, dy, seg * k, cd); g.restore(); };
    const runY = (sx, dx) => { g.save(); g.beginPath(); g.rect(dx, y + cd, cd, h - 2 * cd); g.clip(); for (let py = y + cd; py < y + h - cd; py += seg * k - 0.5) part(sx, cs, cs, seg, dx, py, cd, seg * k); g.restore(); };
    runX(0, y); runX(r[3] - cs, y + h - cd); runY(0, x); runY(r[2] - cs, x + w - cd);
    // the corners
    part(0, 0, cs, cs, x, y, cd, cd); part(r[2] - cs, 0, cs, cs, x + w - cd, y, cd, cd);
    part(0, r[3] - cs, cs, cs, x, y + h - cd, cd, cd); part(r[2] - cs, r[3] - cs, cs, cs, x + w - cd, y + h - cd, cd, cd);
    g.restore(); return true;
  }
  // the chosen row of a list: the painted plate warmed to gold
  function select(g, x, y, w, h) {
    if (!has('button')) return false;
    g.save(); g.globalAlpha *= 0.9; g.filter = 'sepia(0.55) saturate(1.5) brightness(1.25)';
    frame(g, 'button', x, y, w, h, 0.42); g.restore(); return true;
  }
  const part = (g, n, sx, sy, sw, sh, dx, dy, dw, dh) => { const r = R[n]; if (r && ready()) g.drawImage(pic(r), r[0] + sx, r[1] + sy, sw, sh, dx, dy, dw, dh); };
  return { ready, has, draw, vessel, bossBar, particle, frame, select, part, tint: tinted, R };
})();
