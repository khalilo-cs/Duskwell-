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
    // from here on each creature has its own brain(e, t, d, A): the frame for what its code is doing (see the helpers below)
    spitter: { hm: 2.1, wm: 3.4, brain(e, t, d, A) {                 // rooted: it sways; gathers its spit while e.tele counts down, then spits
      if (d.tele > 0 && !(e.tele > 0)) d.fired = t; d.tele = e.tele;
      if (d.hurtT > 0) return A.hurt[0];
      if (e.tele > 0) return seq(A.atk.slice(0, 3), 1 - e.tele / 0.45);
      const s = since(d.fired, t); if (s < 0.25) return A.atk[3]; if (s < 0.5) return A.atk[4];
      return loop(A.idle.concat(A.walk), t, 6, (e.x || 0) * 0.013);
    } },
    shroom: { hm: 1.85, wm: 2.9, stride: 8, brain(e, t, d, A) {      // swells through its anticipation, breathes its spores after it
      if (d.hurtT > 0) return A.hurt[0];
      if (e.currentState === 'anticipation') return seq(A.atk.slice(0, 3), (e.stateT || 0) / 0.5);
      const s = since(d.fired, t); if (s < 0.4) return A.atk[3]; if (s < 0.65) return A.atk[4];
      return move(e, d, A, 8);
    } },
  };
  // helpers for the brains: a frame along a list by progress k (0..1), a looping list, the time since an event, walking or standing
  const seq = (list, k) => list[Math.max(0, Math.min(list.length - 1, Math.floor(k * list.length)))];
  const loop = (list, t, fps, ph) => list[Math.floor(t * fps + (ph || 0)) % list.length];
  const since = (at, t) => (at == null ? 1e9 : t - at);
  const move = (e, d, A, stride) => (e.isDummy ? (Math.abs(e.vx || 0) > 8 ? loop(A.walk, d.t, 8) : loop(A.idle, d.t, 2.2))
    : Math.abs(e.vx || 0) > 8 ? A.walk[Math.floor(d.dist / stride) % A.walk.length] : loop(A.idle, d.t, 2.2, (e.x || 0) * 0.01));
  const ALIAS = { brood_child: 'spider' };
  const scaleOf = (kind, e) => { const c = CFG[kind], A = CREATURE_ANIMS[kind], f = (A[c.ref] || A.idle)[0]; return Math.min(e.h * c.hm / f[3], e.w * c.wm / f[2]); };
  // the attack row: the wind-up (two frames when the row has five), the strike (two), the recovery (the last)
  const parts = A => { const a = A.atk, n = a.length, W = n >= 5 ? 2 : 1; return { wind: a.slice(0, W), strike: a.slice(W, W + 2), rec: a[n - 1] }; };
  const partsOf = (kind, A) => {                                         // the creatures cut by roles say how their attack row divides
    const p = typeof CREATURE_PARTS !== 'undefined' && CREATURE_PARTS[kind]; if (!p) return parts(A);
    const a = A.atk; return { wind: a.slice(0, p[0]), strike: a.slice(p[0], p[0] + p[1]), rec: a.slice(p[0] + p[1]) };
  };
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
  // o: top (hang the frame from its top edge, not its ground point), pivot 'center' (x, y is the frame's centre), rot, filter
  function frame(g, f, x, y, sc, face, white, alpha, o) {
    g.save(); g.translate(x, y); if (alpha != null) g.globalAlpha *= alpha;
    if (o && o.filter) g.filter = o.filter;
    if (o && o.rot) g.rotate(o.rot);
    g.scale(face * sc, sc);
    const ox = o && o.pivot === 'center' ? -f[2] / 2 : -f[4], oy = o && o.pivot === 'center' ? -f[3] / 2 : o && o.top ? 0 : -f[5];
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, f[0], f[1], f[2], f[3], ox, oy, f[2], f[3]);
    if (white) { g.globalAlpha *= 0.8; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, f[0], f[1], f[2], f[3], ox, oy, f[2], f[3]); }
    g.restore();
  }
  // where the frame goes: its ground point on the floor under the creature; a flyer's frame centred on its body; a hanging one from its top.
  // A creature's config may also give place() (position, rotation...), under()/over() (things drawn behind / in front: a chain, its orbs),
  // alpha() (it fades), and a brain that returns nothing to hide it
  function draw(g, e, t, kind) {
    const c = CFG[kind], A = CREATURE_ANIMS[kind], d = e._ad || (e._ad = { dist: 0, x: e.cx, t: t, hurtT: 0, lastAtk: null, leapT: null, bite: null });
    const dt = Math.max(0, Math.min(0.1, t - d.t)); d.t = t;
    d.dist += Math.abs(e.cx - d.x); d.x = e.cx;
    if (e.currentState !== d.st) {                                    // a change of state: leaving the wind-up means the blow (or the leap) has come
      if (d.st === 'anticipation') { if (c.leap) d.leapT = t; if (e.currentState !== 'recoil') d.fired = t; }
      if (d.st === 'attack') d.after = t;                               // and leaving the attack, the recovery
      d.prevSt = d.st; d.st = e.currentState; d.stAt = t;
    }
    if (e.flash > 0.05 && !e.isDummy) { d.hurtT = 0.18; d.leapT = null; } else d.hurtT -= dt;
    const f = d.f = c.brain ? c.brain(e, t, d, A, partsOf(kind, A)) : pick(kind, e, t);
    if (!f) return true;
    const sc = scaleOf(kind, e), ref = (A[c.ref] || A.idle)[0];
    let x = e.cx, y, o = {};
    if (c.place) { o = c.place(e, d, t, f, sc, ref) || {}; x = o.x != null ? o.x : x; y = o.y; }
    if (y == null) {
      if (c.top) { y = e.y; o.top = true; }
      else if (c.fly) y = e.cy + (ref[5] - ref[3] * 0.5) * sc;
      else y = e.y + e.h + 1;
    }
    if (!c.fly && !c.top && !e.isDummy && !e.hanging && !(c.shadow && !c.shadow(e))) Pixel.shadow(g, e.cx, e.y + e.h, Math.min(e.w * 1.1, ref[2] * sc * 0.4));
    if (kind === 'spider' && e.hanging) {                                                         // the thread it hangs from
      g.strokeStyle = 'rgba(220,225,240,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(e.cx, e.anchorY != null ? e.anchorY : e.y - 300); g.lineTo(e.cx, e.y + 4); g.stroke();
    }
    if (c.under) c.under(g, e, t, sc, d);
    frame(g, f, x, y, sc, e.face || 1, e.flash > 0, c.alpha ? c.alpha(e) : null, o);
    if (c.over) c.over(g, e, t, sc, d);
    return true;
  }
  // a death: the creature collapses where it fell, frame by frame, and the last frame (dust) fades; one that dies in the air (a
  // flyer, a spider on its thread, a husk in mid-leap) drops to the floor first
  const DIE = 0.9, FALL_G = 1800;
  function corpse(g, fx) {
    const A = CREATURE_ANIMS[fx.kind]; if (!A || !ready()) return;
    const D = fx.frames || A.death, tt = fx.t - fx.fallT, n = D.length;
    const y = tt < 0 ? fx.y0 + 0.5 * FALL_G * fx.t * fx.t : fx.y;
    const k = Math.max(0, tt) / DIE, i = tt < 0 ? 0 : Math.min(n - 1, Math.floor(k * 1.3 * n));
    frame(g, D[i], fx.x, y, fx.sc, fx.face, false, k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
  }
  function onDead(e) {
    const kind = ALIAS[e.kind] || e.kind; if (e.isBoss || !CFG[kind] || !CREATURE_ANIMS[kind] || !ready()) return;
    if (typeof Skins !== 'undefined' && Skins.get(e.kind)) return;                                    // the owner put their own picture on it
    const c = CFG[kind], sc = scaleOf(kind, e), A = CREATURE_ANIMS[kind], idle = (A[c.ref] || A.idle)[0];
    if (c.noCorpse) return;
    const y0 = c.fly ? e.cy + (idle[5] - idle[3] * 0.5) * sc : e.y + e.h + 1;
    const L = G.level, tx = Math.floor(e.cx / TILE); let ty = Math.floor((y0 - 2) / TILE);
    while (ty < L.h - 1 && !L.solid(tx, ty)) ty++;
    const floor = L.solid(tx, ty) ? ty * TILE + 1 : y0, drop = Math.max(0, floor - y0);
    const fallT = drop > 3 ? Math.sqrt(2 * drop / FALL_G) : 0;
    G.fx.push({ type: 'corpse', kind, x: e.cx, y: fallT ? floor : y0, y0, fallT, face: e.face || 1, sc, t: 0, life: fallT + DIE, frames: c.deathFrames ? c.deathFrames(e, CREATURE_ANIMS[kind]) : null });
  }
  function wrap(k) {
    const kind = ALIAS[k] || k, old = Art.enemy[k];
    Art.enemy[k] = function (g, e, t) {
      if (!ready() || !CREATURE_ANIMS[kind]) return old ? old(g, e, t) : undefined;
      draw(g, e, t, kind);
    };
  }
  // more creatures (js/art_anims_more.js): their config, and other names that are drawn as them
  function add(kind, cfg, aliases) { CFG[kind] = cfg; wrap(kind); for (const a of aliases || []) { ALIAS[a] = kind; wrap(a); } }
  function install() {
    for (const k of [...Object.keys(CFG), ...Object.keys(ALIAS)]) wrap(k);
    const oldFx = Art.drawFx;
    Art.drawFx = function (g, f) { if (f.type === 'corpse') return corpse(g, f); return oldFx(g, f); };
    // their projectiles: the spitter's glob (it rolls through three frames along its flight), the shroom's cloud of spores
    const oldProj = Art.drawProj;
    Art.drawProj = function (g, p, t) {
      const X = typeof CREATURE_EXTRAS !== 'undefined' ? CREATURE_EXTRAS : {};
      if (ready() && p.kind === 'glob' && X.spit_0 && p.color === '#b6ef6a') {                // the spitter's (a boss spits orange globs of its own)
        const r = X['spit_' + (Math.floor(p.t * 12) % 3)], k = (p.r * 2.9) / r[3];
        g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(p.vy || 0, p.vx || 1)); g.imageSmoothingEnabled = true;
        bloom(g, 0, 0, p.r * 3, '#b6ef6a', 0.25);
        g.drawImage(img, r[0], r[1], r[2], r[3], -r[2] * k * 0.62, -r[3] * k / 2, r[2] * k, r[3] * k);
        g.restore(); return;
      }
      if (ready() && p.kind === 'cloud' && X.spores) {
        const r = X.spores, k = clamp(p.t / 0.25, 0.3, 1), a = clamp(p.life / 0.4, 0, 1) * 0.9, w = p.w * 1.35 * k, h = p.h * 1.4 * k;
        g.save(); g.translate(p.x, p.y); if ((p.vx || 0) < 0) g.scale(-1, 1); g.globalAlpha *= a; g.imageSmoothingEnabled = true;
        g.drawImage(img, r[0], r[1], r[2], r[3], -w / 2, -h / 2, w, h);
        g.restore(); return;
      }
      return oldProj(g, p, t);
    };
  }
  install();
  // which part of the sheet a frame comes from ('walk', 'atk'...) and its number there: for the tests
  const nameOf = (kind, f) => { const A = CREATURE_ANIMS[ALIAS[kind] || kind]; for (const k in A) { const i = A[k].indexOf(f); if (i >= 0) return k + ':' + i; } return null; };
  // one frame by name, its ground point at (x, y): for the gallery
  const drawFrame = (g, kind, part, i, x, y, sc, face) => frame(g, CREATURE_ANIMS[kind][part][i], x, y, sc, face || 1, false);
  return { ready, CFG, onDead, nameOf, drawFrame, add, frame, img, H: { seq, loop, since, move } };
})();
