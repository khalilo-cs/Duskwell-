'use strict';
// What the sheet of the creatures shows besides their frames: when one dies it falls to pieces, and when it strikes its effect picture
// (the slash, the spear, the dust, the acid) flashes in front of it. The pieces are its own loose parts from the parts area of its sheet
// (art/creatures/shards.webp, cut by tools/sprites/cut_shards.py): they fly off from the body, turn in the air, land on the
// floor under them, hop once, lie there a moment and fade. A piece's whole path is worked out from its start, so it costs
// nothing while it lies.
const Shards = (() => {
  const img = new Image(); img.src = 'art/creatures/shards.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  const GRAV = 1500, LIFE = 2.3, FADE = 0.7, MAXV = 150;
  // the tile floor under a pixel position
  function floorUnder(L, x, y) {
    const tx = Math.floor(x / TILE); let ty = Math.floor(y / TILE);
    while (ty < L.h - 1 && !L.solid(tx, ty)) ty++;
    return L.solid(tx, ty) ? ty * TILE + 1 : y;
  }
  // where a piece is `t` seconds after it left, and how it is turned
  function at(f, t) {
    const tl = f.tl;
    if (t < tl) return { x: f.x0 + f.vx * t, y: f.y0 + f.vy * t + 0.5 * GRAV * t * t, a: f.a0 + f.vr * t };
    const lx = f.x0 + f.vx * tl, la = f.a0 + f.vr * tl, vyl = f.vy + GRAV * tl, b = t - tl;
    const vb = -Math.min(vyl, 700) * 0.3, hop = vb * b + 0.5 * GRAV * b * b;                 // one small hop, then it lies
    const a = la + (f.rest - la) * (1 - Math.exp(-9 * b));
    return { x: lx + f.vx * 0.3 * (1 - Math.exp(-5 * b)) / 5 * 3, y: f.floor + Math.min(0, hop), a };
  }
  // the pieces of a creature of this kind, scaled so its whole picture would be h tall, starting from the point (cx, cy)
  function burst(e, kind, h, cx, cy) {
    const M = typeof SHARD_RECTS !== 'undefined' && SHARD_RECTS[kind]; if (!M || !ready() || !G.level) return 0;
    const L = G.level, k = Math.max(0.28, Math.min(0.8, h / M.ref)), n = Math.min(M.parts.length, 7);
    const lean = Math.sign(e.vx || 0) * 30;
    for (let i = 0; i < n; i++) {
      const r = M.parts[i], sc = k * (0.85 + Math.random() * 0.25), pw = r[2] * sc, ph = r[3] * sc;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 90 + Math.random() * 150;
      const vx = Math.max(-MAXV, Math.min(MAXV, Math.cos(ang) * sp + lean)), vy = Math.sin(ang) * sp * 1.25 - 40;
      const x0 = cx + (Math.random() - 0.5) * h * 0.4, y0 = cy + (Math.random() - 0.5) * h * 0.5;
      let floor = floorUnder(L, x0, y0), tl = 0, lx = x0;
      for (let it = 0; it < 2; it++) {                                                          // the floor where it comes down
        const d = y0 - (floor - ph * 0.5); tl = Math.max(0.05, (-vy + Math.sqrt(vy * vy - 2 * GRAV * d)) / GRAV); lx = x0 + vx * tl;
        if (L.solidAtPx(lx, y0)) { lx = x0; tl = Math.max(0.05, (-vy + Math.sqrt(vy * vy - 2 * GRAV * (y0 - (floorUnder(L, x0, y0) - ph * 0.5)))) / GRAV); }
        floor = floorUnder(L, lx, y0);
      }
      const vr = (Math.random() - 0.5) * 12, a0 = (Math.random() - 0.5) * 1.2;
      const f = { type: 'shard', rect: r, w: pw, h: ph, x0, y0, vx: L.solidAtPx(lx, y0) ? 0 : vx, vy, vr, a0, floor: floor - ph * 0.35, tl, t: 0, life: LIFE };
      f.rest = Math.round((a0 + vr * tl) / Math.PI) * Math.PI + (Math.random() - 0.5) * 0.3;
      G.fx.push(f);
    }
    return n;
  }
  // the effect picture of a creature that has just begun a strike, in front of it for a moment
  function cue(e) {
    const M = typeof SHARD_RECTS !== 'undefined' && SHARD_RECTS[e.kind], r = M && M.fx; if (!r || !ready() || e.dead || e.isBoss || !G.level) return;
    const p = G.player; if (p && Math.hypot(p.cx - e.cx, p.cy - e.cy) > 640) return;
    const h = Math.max(26, Math.min(72, e.h * 0.95)), w = h * r[2] / r[3], face = e.face || 1;
    G.fx.push({ type: 'cfx', rect: r, x: e.cx + face * (e.w * 0.5 + w * 0.22), y: e.cy - e.h * 0.05, face, w, h, t: 0, life: 0.42 });
  }
  function drawCue(g, f) {
    if (!ready()) return;
    const k = f.t / f.life, a = Math.sin(Math.PI * Math.min(1, k * 1.1)), s = 0.8 + 0.4 * k, r = f.rect;
    g.save(); g.globalAlpha *= Math.max(0, a) * 0.85 * (0.5 + 0.5 * Comfort.bloom); g.translate(f.x, f.y); g.scale(f.face * s, s);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, r[0], r[1], r[2], r[3], -f.w / 2, -f.h / 2, f.w, f.h);
    g.restore();
  }
  function draw(g, f) {
    if (!ready()) return;
    const p = at(f, f.t), r = f.rect, fade = f.t > f.life - FADE ? Math.max(0, (f.life - f.t) / FADE) : 1;
    g.save(); g.globalAlpha *= fade; g.translate(p.x, p.y); g.rotate(p.a);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, r[0], r[1], r[2], r[3], -f.w / 2, -f.h / 2, f.w, f.h);
    g.restore();
  }
  return { ready, burst, cue, draw, drawCue, at, has: kind => typeof SHARD_RECTS !== 'undefined' && !!SHARD_RECTS[kind] };
})();
