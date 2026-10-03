'use strict';
// The creatures drawn from the owner's pose sheet (art/creatures/creatures.webp, cut and packed by tools/sprites/cut_creatures.py).
// Each creature has a few poses (idle first); this picks one from what the creature is doing and moves it a little (breathing,
// walking bounce, squash before an attack, spinning when it rolls). The poses are used exactly as drawn, never repainted.
// Creatures that are still missing a pose, or are in a state the sheet does not show (buried, a pile of bones), fall back
// to the old procedural drawing, so nothing disappears.
const FrameArt = (() => {
  const img = new Image(); img.src = 'art/creatures/creatures.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  // per creature: which poses to use for idle / move / attack (/ air up, air down), how big the first idle pose is
  // compared with the creature's box (h: of its height, w: cap by its width), and a few special switches
  const CFG = {
    husk: { idle: [1], move: [1, 2], atk: [2], h: 1.15 },
    crawler: { idle: [0], move: [0, 1], atk: [1], h: 1.2, w: 1.35 },
    flyer: { idle: [0, 1], move: [0, 1], atk: [2], h: 1.35, rate: 9 },
    hopper: { idle: [0], move: [0], atk: [0], air: [1, 2], h: 1.15, w: 1.5 },
    spitter: { idle: [2], move: [2], atk: [0, 1], h: 1.2 },
    shard: { idle: [0], move: [0], atk: [1], h: 1.2 },
    sentinel: { idle: [0], move: [3, 0], atk: [2], h: 1.12 },
    diver: { idle: [2], move: [2], atk: [3], h: 1.4, rate: 10 },
    spider: { idle: [0], move: [0, 2], atk: [2], h: 1.3, w: 1.5 },
    shroom: { idle: [0], move: [0, 1, 2], atk: [1], h: 1.15 },
    jelly: { idle: [0, 1], move: [0, 1], atk: [1], h: 1.3, bob: 3 },
    warden: { idle: [0], move: [1, 3], atk: [2], h: 1.1 },
    ram: { idle: [0], move: [1], atk: [2], h: 1.15, w: 1.35 },
    mole: { idle: [0], move: [1, 2], atk: [3], h: 1.2, w: 1.5, orig: e => e.buried },
    lavaworm: { idle: [0], move: [0], atk: [2], h: 1.3, w: 1.55, orig: e => e.buried },
    imp: { idle: [0], move: [1, 2], atk: [3], h: 1.15 },
    veil: { idle: [0], move: [1, 2], atk: [3, 4], h: 1.1, alpha: true, bob: 3 },
    roller: { idle: [0], move: [0, 1], atk: [2, 3], h: 1.2, w: 1.35, spinAtk: true },
    slime: { idle: [0], move: [0, 2], atk: [1], h: 1.2, w: 1.35 },
    chainman: { idle: [0], move: [0], atk: [0], h: 1.1, crop: [0, 0.7], extra: 'chain' },
    moth: { idle: [0, 1], move: [0, 1], atk: [1], h: 1.5, rate: 8 },
    icicle: { idle: [0], move: [0], atk: [1], top: true, h: 1.0 },
    heap: { idle: [0], move: [0], atk: [0], h: 1.15, orig: e => e.currentState === 'pile' || e.currentState === 'rising' || e.currentState === 'skull' },
    skullbat: { idle: [1], move: [1, 3], atk: [0, 2], h: 1.5, rate: 9 },
    censer: { idle: [0], move: [0], atk: [0], h: 1.15, extra: 'censer' },
    lensling: { idle: [0], move: [0], atk: [0], h: 1.1 },
    orrery: { idle: [0], move: [0], atk: [0], h: 1.7, extra: 'orrery' },
    lunarhare: { idle: [2], move: [2, 3], atk: [0], air: [1, 1], h: 1.15, w: 1.5 },
  };
  const K = 1.35;                                   // the drawings are bigger than the boxes that hurt and get hurt
  const ALIAS = { slimelet: 'slime', brood_child: 'spider' };

  const pickFrame = (list, t, rate, ph) => list[Math.floor(t * rate + ph) % list.length];
  function frameFor(c, e, t, ph) {
    const st = e.currentState, acting = st === 'attack' || st === 'anticipation';
    if (acting && c.atk) return pickFrame(c.atk, t, 8, ph);
    if (c.air && !e.onGround && !e.isDummy) return c.air[e.vy < 0 ? 0 : 1];
    const moving = Math.abs(e.vx || 0) > 10 || (c.rate && c.rate > 8) || e.isDummy && c.move && c.move.length > 1 && false;
    if (moving && c.move) return pickFrame(c.move, t, c.rate || 5, ph);
    return pickFrame(c.idle, t, c.rate ? c.rate * 0.6 : 2, ph);
  }

  function draw(g, e, t, kind) {
    const c = CFG[kind], fr = CREATURE_FRAMES[kind], ph = (e.ph || (e.x || 0) * 0.013) % 7;
    const fi = Math.min(fr.length - 1, frameFor(c, e, t, ph)), r = fr[fi], ref = fr[Math.min(fr.length - 1, c.idle[0])];
    // one scale for every pose of the creature, set by the first idle pose
    const sc = K * Math.min(e.h * (c.h || 1.2) / ref[3], e.w * (c.w || 1.5) / ref[2]);
    const st = e.currentState, face = e.face || 1;
    let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0;
    const moving = Math.abs(e.vx || 0) > 10;
    if (st === 'anticipation') { const k = clamp((e.stateT || 0) / 0.5, 0, 1); sy = 1 - 0.12 * k; sx = 1 + 0.07 * k; dx = -face * 2 * k; }
    else if (st === 'attack' && !c.spinAtk) { sx = 1.06; sy = 0.97; }
    else if (moving) { dy = -Math.abs(Math.sin(t * 9 + ph)) * 1.6; rot = Math.sin(t * 9 + ph) * 0.03; }
    else sy = 1 + Math.sin(t * 2.4 + ph) * 0.018;
    if (c.bob) dy += Math.sin(t * 2 + ph) * c.bob;
    const fl = e.flash > 0;
    let w = r[2] * sc, h = r[3] * sc, a = 1;
    if (c.alpha) { a = clamp(e.alpha === undefined ? 1 : e.alpha, 0, 1); if (a < 0.02) return; }
    const flying = FLYING.has(kind), cx = e.cx, baseY = c.top ? e.y : flying ? e.cy + h / 2 : e.y + e.h;
    if (!flying && !c.top && !e.isDummy && st !== 'attack') Pixel.shadow(g, cx, e.y + e.h, Math.min(e.w, w) * 0.55);
    g.save(); g.translate(cx + dx, baseY + dy);
    if (c.spinAtk && st === 'attack') { g.translate(0, -h / 2); g.rotate(t * 14 * face); g.translate(0, h / 2); }
    g.scale(face, 1); if (rot) g.rotate(rot * face); g.scale(sx, sy);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.globalAlpha *= a;
    // a part of the pose can be left out (the chain bearer's ball is drawn live)
    const cr = c.crop, srcX = r[0] + (cr ? r[2] * cr[0] : 0), srcW = r[2] * (cr ? cr[1] - cr[0] : 1);
    const ox = -w / 2, oy = c.top ? 0 : -h;
    if (c.circle) {                                                                  // keep only a round centre (the orrery's core and rings)
      const R = Math.min(w, h) * c.circle; g.save(); g.beginPath(); g.arc(0, c.top ? h / 2 : -h / 2, R, 0, 7); g.clip();
    }
    g.drawImage(img, srcX, r[1], srcW, r[3], ox, oy, srcW * sc, h);
    if (fl) { g.save(); g.filter = 'brightness(0) invert(1)'; g.globalAlpha *= 0.8; g.drawImage(img, srcX, r[1], srcW, r[3], ox, oy, srcW * sc, h); g.restore(); }
    if (c.circle) g.restore();
    g.restore();
    if (c.extra && EXTRA[c.extra]) EXTRA[c.extra](g, e, t, sc);
  }

  // live parts that belong to the creature's behaviour, drawn over its pose
  const EXTRA = {
    chain(g, e, t) {                                                                  // the chain and the spiked ball of the chain bearer
      if (!e.ball) return;
      const st = e.currentState, fl = e.flash > 0;
      const hx = e.cx + (e.face || 1) * 12, hy = e.y + e.h - 36, dx = e.ball.x - hx, dy = e.ball.y - hy, n = Math.max(3, Math.round(Math.hypot(dx, dy) / 6));
      for (let k = 1; k < n; k++) { const u = k / n, x = hx + dx * u, y = hy + dy * u + Math.sin(u * Math.PI) * 3; g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx) + (k % 2 ? 1.2 : 0)); g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.ellipse(0, 0, 3.4, 2, 0, 0, 7); g.stroke(); g.strokeStyle = '#a8a8b4'; g.lineWidth = 1.6; g.stroke(); g.restore(); }
      g.save(); g.translate(e.ball.x, e.ball.y); g.rotate(e.ang * 2);
      if (st === 'attack') bloom(g, 0, 0, 44, '#ff9c5a', 0.28);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; spikeD(g, Math.cos(a) * 9, Math.sin(a) * 9, a, 11, 3.4, '#b4b4c0', fl); }
      formD(g, ell(0, 0, 12, 12), [0, 0, 12, 12], '#3a3a44', { flash: fl, spec: 0.55, lw: 2.8 }); if (!fl) { for (let i = 0; i < 4; i++) rivetD(g, Math.cos(i * 1.57 + 0.78) * 6, Math.sin(i * 1.57 + 0.78) * 6, 1.3); }
      g.restore();
    },
    orrery(g, e, t) {                                                                 // the three orbs on their thin arms
      const fl = e.flash > 0;
      g.save(); g.translate(e.cx, e.cy);
      for (let i = 0; i < 3; i++) {
        const o = e.orbPos(i), ox = o.x - e.cx, oy = o.y - e.cy;
        g.strokeStyle = 'rgba(200,170,100,0.65)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(ox, oy); g.stroke();
        bloom(g, ox, oy, 20, '#ffe9a0', 0.5);
        formD(g, ell(ox, oy, 7, 7), [ox, oy, 7, 7], ['#ffd070', '#9fd0ff', '#ff9bd6'][i], { flash: fl, spec: 0.7, lw: 2 });
      }
      g.restore();
    },
    censer(g, e, t) {                                                                 // the chain from the ceiling to the lid
      const fl = e.flash > 0, ax = e.isDummy ? e.cx + 8 * Math.sin(t * 1.2) : e.ax, ay = e.isDummy ? e.cy - 78 : e.ay;
      const bx = e.cx, by = e.cy - 26, n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 9));
      for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(ax, bx, u), y = lerp(ay, by, u); g.save(); g.translate(x, y); g.rotate(Math.atan2(by - ay, bx - ax) + (i % 2 ? Math.PI / 2 : 0)); g.fillStyle = INK; ellipse(g, 0, 0, 5.4, 2.8); g.fill(); g.strokeStyle = fl ? '#fff' : '#9a8a64'; g.lineWidth = 1.6; ellipse(g, 0, 0, 4.2, 1.8); g.stroke(); g.restore(); }
    },
  };

  function install() {
    for (const kind of Object.keys(CFG)) {
      const target = kind;
      for (const k of [kind, ...Object.keys(ALIAS).filter(a => ALIAS[a] === kind)]) {
        const orig = Art.enemy[k];
        Art.enemy[k] = function (g, e, t) {
          const c = CFG[target];
          if (!ready() || !CREATURE_FRAMES[target] || (c.orig && c.orig(e)) || (e.gone && c.top)) return orig ? orig(g, e, t) : undefined;
          if (c.top && e.gone) return;
          draw(g, e, t, target);
        };
      }
    }
  }
  install();
  return { ready, CFG };
})();
