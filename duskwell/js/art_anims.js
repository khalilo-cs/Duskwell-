'use strict';
// The creatures the owner drew frame by frame (art/creatures/anim.webp, cut by tools/sprites/cut_anims.py): idle, a walk cycle, an
// attack (wind-up, strike, recovery), a hurt frame and a death. The frames are drawn as drawn; this file only decides which one to
// show, from what the creature is really doing:
//  - the walk advances with the ground actually covered, so the feet do not slide; standing still breathes on the two idle frames
//  - the wind-up frames play over the creature's own anticipation, the strike frames while it attacks, the recovery right after
//  - a wound shows the hurt frame for a moment; a death leaves the creature collapsing into dust where it fell (a "corpse" effect)
// Every frame is placed by its ground point, so the creature stays planted while its pose changes.
const AnimArt = (() => {
  const img = new Image(); img.src = 'art/creatures/anim.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  // hm: drawn height of the idle frame against the hitbox height; wm: a cap on its width against the hitbox width; stride: ground
  // covered by one walk frame (px); fly: flies (centred on its body, no shadow)
  const CFG = {
    husk: { hm: 1.65, wm: 3.2, stride: 9, wind: 0.25, leap: true },
    crawler: { hm: 1.95, wm: 2.3, stride: 8, near: 64 },
    flyer: { hm: 2.0, wm: 3.0, fly: true, near: 92 },
    hopper: { hm: 1.75, wm: 3.0, stride: 9, wind: 0.28, leap: true },
    spider: { hm: 2.15, wm: 2.7, stride: 8, wind: 0.3, leap: true },
    warden: { hm: 1.5, wm: 3.0, stride: 8, wind: 0.55, bash: 0.3 },
  };
  const ALIAS = { brood_child: 'spider' };
  const scaleOf = (kind, e) => { const c = CFG[kind], f = CREATURE_ANIMS[kind].idle[0]; return Math.min(e.h * c.hm / f[3], e.w * c.wm / f[2]); };
  // the attack row: the wind-up (two frames when the row has five), the strike (two), the recovery (the last)
  const parts = A => { const a = A.atk, n = a.length, W = n >= 5 ? 2 : 1; return { wind: a.slice(0, W), strike: a.slice(W, W + 2), rec: a[n - 1] }; };
  // the frame to show
  function pick(kind, e, t) {
    const A = CREATURE_ANIMS[kind], c = CFG[kind], d = e._ad, st = e.currentState, P = parts(A), air = !e.onGround && !e.isDummy;
    if (d.hurtT > 0) return A.hurt[0];
    if (st === 'anticipation' && c.wind) return P.wind[Math.min(P.wind.length - 1, Math.floor((e.stateT || 0) / c.wind * P.wind.length))];
    if (c.leap && d.leapT != null) {                                                               // a leap: the lunge on the way up, claws out coming down
      if (air) { d.lastAtk = t; return P.strike[e.vy < 0 ? 0 : 1]; }
      if (t - d.leapT > 0.1) d.leapT = null;
    }
    if (st === 'attack' && c.bash) { d.lastAtk = t; return P.strike[Math.min(1, Math.floor((e.stateT || 0) / c.bash * 2))]; }
    if (st === 'attack' && kind === 'spider') return P.strike[0];                                  // dropping from its thread
    if (d.lastAtk != null && t - d.lastAtk < (c.bash ? 0.4 : 0.22)) return P.rec;
    if (c.near && !e.isDummy && G.player && !G.player.dead) {                                     // biters bite when the hero is in reach
      const p = G.player, dx = (p.cx - e.cx) * (e.face || 1);
      if (dx > -10 && dx < c.near && Math.abs(p.cy - e.cy) < 50) {
        if (d.bite == null) d.bite = t;
        const k = ((t - d.bite) % 0.8) / 0.8; return A.atk[Math.min(A.atk.length - 1, Math.floor(k * A.atk.length))];
      }
    }
    d.bite = null;
    if (c.fly) return A.idle[Math.floor(t * 14 + (e.ph || 0) * 3) % A.idle.length];
    if (air) return st === 'recoil' ? A.hurt[0] : P.strike[0];
    if (e.isDummy && Math.abs(e.vx || 0) > 8) return A.walk[Math.floor(t * 8) % A.walk.length];
    if (Math.abs(e.vx || 0) > 8) return A.walk[Math.floor(d.dist / c.stride) % A.walk.length];
    return A.idle[Math.floor(t * 2.2 + (e.x || 0) * 0.01) % A.idle.length];
  }
  function frame(g, f, x, y, sc, face, white, alpha) {
    g.save(); g.translate(x, y); g.scale(face * sc, sc); if (alpha != null) g.globalAlpha *= alpha;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]);
    if (white) { g.globalAlpha *= 0.8; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]); }
    g.restore();
  }
  function draw(g, e, t, kind) {
    const c = CFG[kind], d = e._ad || (e._ad = { dist: 0, x: e.cx, t: t, hurtT: 0, lastAtk: null, leapT: null, bite: null });
    const dt = Math.max(0, Math.min(0.1, t - d.t)); d.t = t;
    d.dist += Math.abs(e.cx - d.x); d.x = e.cx;
    if (e.flash > 0.05 && !e.isDummy) { d.hurtT = 0.18; d.leapT = null; } else d.hurtT -= dt;
    if (e.currentState !== d.st) { if (d.st === 'anticipation' && c.leap) d.leapT = t; d.st = e.currentState; }   // it has just left the ground to strike
    const f = d.f = pick(kind, e, t), sc = scaleOf(kind, e), idle = CREATURE_ANIMS[kind].idle[0];
    const gy = c.fly ? e.cy + (idle[5] - idle[3] * 0.5) * sc : e.y + e.h + 1;
    if (!c.fly && !e.isDummy && !e.hanging) Pixel.shadow(g, e.cx, e.y + e.h, Math.min(e.w * 1.1, idle[2] * sc * 0.4));
    if (kind === 'spider' && e.hanging) {                                                         // the thread it hangs from
      g.strokeStyle = 'rgba(220,225,240,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(e.cx, e.anchorY != null ? e.anchorY : e.y - 300); g.lineTo(e.cx, e.y + 4); g.stroke();
    }
    frame(g, f, e.cx, gy, sc, e.face || 1, e.flash > 0);
    return true;
  }
  // a death: the creature collapses where it fell, frame by frame, and the last frame (dust) fades; one that dies in the air (a
  // flyer, a spider on its thread, a husk in mid-leap) drops to the floor first
  const DIE = 0.9, FALL_G = 1800;
  function corpse(g, fx) {
    const A = CREATURE_ANIMS[fx.kind]; if (!A || !ready()) return;
    const tt = fx.t - fx.fallT, n = A.death.length;
    const y = tt < 0 ? fx.y0 + 0.5 * FALL_G * fx.t * fx.t : fx.y;
    const k = Math.max(0, tt) / DIE, i = tt < 0 ? 0 : Math.min(n - 1, Math.floor(k * 1.3 * n));
    frame(g, A.death[i], fx.x, y, fx.sc, fx.face, false, k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
  }
  function onDead(e) {
    const kind = ALIAS[e.kind] || e.kind; if (e.isBoss || !CFG[kind] || !CREATURE_ANIMS[kind] || !ready()) return;
    if (typeof Skins !== 'undefined' && Skins.get(e.kind)) return;                                    // the owner put their own picture on it
    const c = CFG[kind], sc = scaleOf(kind, e), idle = CREATURE_ANIMS[kind].idle[0];
    const y0 = c.fly ? e.cy + (idle[5] - idle[3] * 0.5) * sc : e.y + e.h + 1;
    const L = G.level, tx = Math.floor(e.cx / TILE); let ty = Math.floor((y0 - 2) / TILE);
    while (ty < L.h - 1 && !L.solid(tx, ty)) ty++;
    const floor = L.solid(tx, ty) ? ty * TILE + 1 : y0, drop = Math.max(0, floor - y0);
    const fallT = drop > 3 ? Math.sqrt(2 * drop / FALL_G) : 0;
    G.fx.push({ type: 'corpse', kind, x: e.cx, y: fallT ? floor : y0, y0, fallT, face: e.face || 1, sc, t: 0, life: fallT + DIE });
  }
  function install() {
    for (const k of [...Object.keys(CFG), ...Object.keys(ALIAS)]) {
      const kind = ALIAS[k] || k, old = Art.enemy[k];
      Art.enemy[k] = function (g, e, t) {
        if (!ready() || !CREATURE_ANIMS[kind]) return old ? old(g, e, t) : undefined;
        draw(g, e, t, kind);
      };
    }
    const oldFx = Art.drawFx;
    Art.drawFx = function (g, f) { if (f.type === 'corpse') return corpse(g, f); return oldFx(g, f); };
  }
  install();
  // which part of the sheet a frame comes from ('walk', 'atk'...) and its number there: for the tests
  const nameOf = (kind, f) => { const A = CREATURE_ANIMS[ALIAS[kind] || kind]; for (const k in A) { const i = A[k].indexOf(f); if (i >= 0) return k + ':' + i; } return null; };
  // one frame by name, its ground point at (x, y): for the gallery
  const drawFrame = (g, kind, part, i, x, y, sc, face) => frame(g, CREATURE_ANIMS[kind][part][i], x, y, sc, face || 1, false);
  return { ready, CFG, onDead, nameOf, drawFrame };
})();
