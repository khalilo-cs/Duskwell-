'use strict';
// The other twenty creatures the owner drew frame by frame (the same atlas as js/art_anims.js, cut by tools/sprites/cut_anims.py from
// the rows and roles in tools/sprites/creature_anims.json). Each one has a brain: from the state its code is in (entities.js,
// enemies_deep.js) it picks the drawn frame, so the drawing follows what the creature really does:
//  - wind-ups play over the anticipation the code waits through, strikes while the blow is live, the recovery after it
//  - leaps and dives use the frames for going up and coming down by the creature's real speed
//  - special states have their own frames: the mole and the lava worm under the floor, the heap as a pile, rising, a lone skull and
//    knitting back, the roller's ball (turning as it rolls), the ram dazed after a wall, the veil fading and coming back, the icicle
//    trembling, falling and shattering where it lands
// The live parts stay live: the chain bearer's ball (drawn from the sheet) on its chain, the orrery's three orbs, the censer's chain.
(() => {
  const { seq, loop, since, move } = AnimArt.H, img = AnimArt.img;
  const X = () => (typeof CREATURE_EXTRAS !== 'undefined' ? CREATURE_EXTRAS : {});
  const st = e => e.currentState, T = e => e.stateT || 0;
  const hurt = (d, A) => (d.hurtT > 0 ? A.hurt[0] : null);
  // a sprite from the extras, centred at (x, y), h px tall, turned by rot
  function extra(g, name, x, y, h, rot, o) {
    const r = X()[name]; if (!r) return false;
    const k = h / r[3];
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (o && o.flip) g.scale(-1, 1); if (o && o.alpha != null) g.globalAlpha *= o.alpha;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, r[0], r[1], r[2], r[3], -r[2] * k * (o && o.ax != null ? o.ax : 0.5), -r[3] * k / 2, r[2] * k, r[3] * k);
    g.restore(); return true;
  }
  // a dive: the drawn dive points down and ahead (about 40 degrees); turned toward where the creature is really going
  const diveRot = (e, drawn) => {
    if (e.isDummy || !(Math.abs(e.vx) + Math.abs(e.vy) > 60)) return 0;
    const want = Math.atan2(e.vy, e.vx), base = (e.face || 1) > 0 ? drawn : Math.PI - drawn;
    let r = want - base; while (r > Math.PI) r -= Math.PI * 2; while (r < -Math.PI) r += Math.PI * 2;
    return Math.max(-0.9, Math.min(0.9, r));
  };
  const near = (e, R) => { const p = G.player; return p && !p.dead && !e.isDummy && Math.hypot(p.cx - e.cx, p.cy - e.cy) < R; };

  // ---------------------------------------------------------------- walkers that wind up and strike
  AnimArt.add('sentinel', { hm: 1.42, wm: 2.6, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return seq(P.wind, T(e) / 0.45);          // the blade goes up
    if (st(e) === 'attack') return seq(P.strike, T(e) / 0.28);               // the lunge and the slash
    if (since(d.after, t) < 0.3) return P.rec[0];
    return move(e, d, A, 10);
  } });
  AnimArt.add('chainman', { hm: 1.38, wm: 2.6, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return seq(P.wind, T(e) / 0.7);           // the arm winds up as the ball starts to turn
    if (st(e) === 'attack') return loop(P.strike, t, 6);                     // the full swing
    if (st(e) === 'recoil' && d.prevSt === 'attack') return P.rec[0];        // the chain winds back in
    return move(e, d, A, 9);
  }, over(g, e, t, sc) {                                                     // the chain and the spiked ball, live
    const b = e.isDummy ? { x: e.cx + (e.face || 1) * 44, y: e.cy + 10 } : e.ball; if (!b) return;
    const hx = e.cx + (e.face || 1) * 14, hy = e.y + e.h * 0.42, dx = b.x - hx, dy = b.y - hy, n = Math.max(3, Math.round(Math.hypot(dx, dy) / 6));
    for (let k = 1; k < n; k++) {
      const u = k / n, x = hx + dx * u, y = hy + dy * u + Math.sin(u * Math.PI) * 3;
      g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx) + (k % 2 ? 1.2 : 0));
      g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.ellipse(0, 0, 3.4, 2, 0, 0, 7); g.stroke();
      g.strokeStyle = '#a89a80'; g.lineWidth = 1.6; g.stroke(); g.restore();
    }
    if (st(e) === 'attack') bloom(g, b.x, b.y, 44, '#ff9c5a', 0.22);
    extra(g, 'ball_' + (Math.floor(t * 8) % 2), b.x, b.y, 30, (e.ang || 0) * 2);
  } });
  AnimArt.add('lensling', { hm: 1.75, wm: 2.7, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return T(e) < 0.6 ? loop(P.wind, t, 6) : P.strike[0];   // the lens swings after you, then locks and glows
    if (st(e) === 'attack') return P.strike[1];                                          // the ray
    if (since(d.after, t) < 0.25) return P.rec[0];
    return move(e, d, A, 8);
  } });
  AnimArt.add('imp', { hm: 1.72, wm: 2.6, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return seq(P.wind, T(e) / 0.5);           // the bomb comes out, up, and back
    if (st(e) === 'throw') return T(e) < 0.12 ? P.strike[0] : seq(P.rec, (T(e) - 0.12) / 0.28);
    return move(e, d, A, 8);
  } });

  // ---------------------------------------------------------------- jumpers
  const hop = (e, P) => (e.vy < -150 ? P.strike[0] : e.vy < 150 ? P.strike[Math.min(1, P.strike.length - 1)] : P.strike[P.strike.length - 1]);
  AnimArt.add('slime', { hm: 1.32, wm: 1.55, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return P.wind[0];                         // squashed down
    if (st(e) === 'attack' && !e.onGround) return hop(e, P);                // stretched up, then reaching out, then coming down
    if (since(d.after, t) < 0.2) return P.rec[0];
    return move(e, d, A, 9);
  }, deathFrames: (e, A) => (e.small ? A.death.slice(3) : A.death) }, ['slimelet']);
  AnimArt.add('lunarhare', { hm: 1.72, wm: 2.6, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return P.wind[0];                         // ears back, a crouch
    if (st(e) === 'attack' && !e.onGround) return hop(e, P);                // the leap, the long flight, the landing
    if (since(d.after, t) < 0.2) return P.rec[0];
    return move(e, d, A, 11);
  } });

  // ---------------------------------------------------------------- chargers
  AnimArt.add('ram', { hm: 1.78, wm: 1.9, brain(e, t, d, A, P) {
    if (st(e) === 'recoil' && e.crashed) return A.dazed[0];                 // into a wall: stars
    if (st(e) !== 'attack') { const h = hurt(d, A); if (h) return h; }
    if (st(e) === 'anticipation') return seq(P.wind, T(e) / 0.75);          // pawing, head down
    if (st(e) === 'attack') return loop(P.strike, t, 9);                     // the charge
    return move(e, d, A, 12);
  } });
  AnimArt.add('roller', { hm: 1.72, wm: 2.0, brain(e, t, d, A, P) {
    if (st(e) !== 'attack') { const h = hurt(d, A); if (h) return h; }
    if (st(e) === 'anticipation') return seq(A.atk.slice(0, 3), T(e) / 0.55);   // it curls up
    if (st(e) === 'attack') return A.roll[Math.floor(d.dist / 26) % A.roll.length];
    if (st(e) === 'dizzy') return T(e) < 0.35 ? A.atk[A.atk.length - 1] : loop(A.walk, t, 3);
    return move(e, d, A, 9);
  }, place(e, d, t, f, sc) {                                                // the ball turns as it rolls, about its centre
    if (st(e) !== 'attack') return null;
    return { x: e.cx, y: e.y + e.h + 1 - f[3] * sc / 2, pivot: 'center', rot: (e.face || 1) * d.dist / Math.max(8, f[3] * sc / 2) };
  } });

  // ---------------------------------------------------------------- burrowers (the mole of Rimecrest, the lava worm of Cinderdeep)
  function burrower(rise) {
    return function (e, t, d, A, P) {
      const s = st(e), under = rise ? [A.rise[0], A.rise[1]] : [A.dig[1], A.dig[0]];
      if (e.isDummy) return loop(A.idle, t, 2.2);
      if (s === 'idle') return under[0];                                     // under the floor: only a mound shows
      if (s === 'chase') return loop(under, t, 4);
      if (s === 'anticipation') return rise ? seq(A.rise.slice(1, 4), T(e) / 0.55) : A.dig[2];
      const h = hurt(d, A); if (h) return h;
      if (s === 'attack') return seq(P.strike, T(e) / 0.45);                // bursting out
      if (s === 'digging') return rise ? seq(A.rise.slice().reverse(), T(e) / 0.45) : seq([A.dig[3], A.dig[0], A.dig[1]], T(e) / 0.45);
      if (since(d.after, t) < 0.25) return P.rec[0];
      return rise ? loop(A.idle, t, 3, (e.x || 0) * 0.01) : move(e, d, A, 8);
    };
  }
  const buriedShadow = e => !e.buried;
  AnimArt.add('mole', { hm: 1.72, wm: 2.5, brain: burrower(false), shadow: buriedShadow });
  AnimArt.add('lavaworm', { hm: 2.05, wm: 2.4, brain: burrower(true), shadow: buriedShadow });

  // ---------------------------------------------------------------- the heap: a pile, rising, a skeleton with a femur, then a skull that knits back
  AnimArt.add('heap', { hm: 1.38, wm: 2.6, brain(e, t, d, A, P) {
    const s = st(e);
    if (s === 'pile') return loop(A.pile, t, 1.4, (e.x || 0) * 0.01);
    if (s === 'rising') return seq(A.rise, T(e) / 0.6);
    if (s === 'skull') return T(e) < 0.45 ? seq(A.fall, T(e) / 0.45) : A.skull[0];
    if (s === 'reform') return seq([A.fall[3], A.fall[2], A.fall[1]], T(e) / 0.8);
    const h = hurt(d, A); if (h) return h;
    if (s === 'windup') return seq(P.wind, T(e) / 0.4);
    if (s === 'slash') { d.slashT = t; return seq(P.strike, T(e) / 0.17); }
    if (since(d.slashT, t) < 0.25) return P.rec[0];
    return move(e, d, A, 9);
  } });

  // ---------------------------------------------------------------- turrets: the spitter's cousins
  AnimArt.add('shard', { hm: 1.45, wm: 2.4, brain(e, t, d, A, P) {
    if (d.tele > 0 && !(e.tele > 0)) d.fired = t; d.tele = e.tele;
    const h = hurt(d, A); if (h) return h;
    if (e.tele > 0) return seq(P.wind, 1 - e.tele / 0.5);                   // the core flares
    const s = since(d.fired, t); if (s < 0.22) return P.strike[0]; if (s < 0.45) return P.rec[0];
    return loop(A.idle, t, 6, (e.x || 0) * 0.013);
  } });

  // ---------------------------------------------------------------- fliers
  AnimArt.add('diver', { hm: 2.5, wm: 3.4, fly: true, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return seq(P.wind, T(e) / 0.45);          // rearing back, aiming
    if (st(e) === 'attack') return seq(P.strike, T(e) / 0.3);               // the dive
    if (since(d.after, t) < 0.3) return P.rec[0];
    return loop(A.idle, t, 14, (e.ph || 0) * 3);
  }, place(e, d, t, f, sc, ref) { return st(e) === 'attack' ? { rot: diveRot(e, 0.7) } : null; } });
  AnimArt.add('moth', { hm: 2.5, wm: 3.4, fly: true, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return seq(P.wind, T(e) / 0.4);           // wings up, the dust glowing
    if (st(e) === 'attack') return seq(P.strike, T(e) / 0.35);
    if (since(d.after, t) < 0.3) return P.rec[0];
    return loop(A.idle, t, 12, (e.ph || 0) * 3);
  }, place(e) { return st(e) === 'attack' ? { rot: diveRot(e, 0.5) } : null; } });
  AnimArt.add('jelly', { hm: 2.0, wm: 2.6, fly: true, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (near(e, 74)) return loop(A.atk, t, 7);                              // it lashes when you are close
    return loop(A.idle, t, 7, (e.ph || 0) * 3);
  } });
  AnimArt.add('skullbat', { hm: 2.25, wm: 3.5, fly: true, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (st(e) === 'anticipation') return seq(A.atk.slice(0, 3), T(e) / 0.46);   // the jaw drops open
    const s = since(d.fired, t); if (s < 0.22) return A.atk[3]; if (s < 0.42) return A.atk[4];   // the teeth, then wings wide
    return loop(A.idle, t, 10, (e.ph || 0) * 3);
  } });
  AnimArt.add('veil', { hm: 1.48, wm: 2.6, fly: true, brain(e, t, d, A, P) {
    const s = st(e), a = A.atk;
    if (d.hurtT > 0 || s === 'recoil') return A.hurt[0];
    if (s === 'fadeout') return seq([a[2], a[3]], T(e) / 0.3);              // it thins away
    if (s === 'appear') return seq([a[3], a[2], a[0], a[1]], T(e) / 0.5);    // and comes back beside you, reaching
    if (s === 'attack') return seq([a[4], a[5]], T(e) / 0.22);              // the slash
    if (s === 'vulnerable') return T(e) < 0.2 ? a[5] : A.hurt[1];           // solid, open to a strike
    return loop(A.idle, t, 7, (e.ph || 0) * 3);
  }, alpha: e => (e.isDummy || e.alpha == null ? 1 : Math.max(0.15, e.alpha)) });
  AnimArt.add('orrery', { hm: 2.2, wm: 2.6, fly: true, brain(e, t, d, A, P) {
    const h = hurt(d, A); if (h) return h;
    if (near(e, 120)) return loop(A.atk.slice(1, 4), t, 8);                 // the eye flares when you come close
    return loop(A.idle, t, 8, (e.ph || 0) * 3);
  }, over(g, e, t) {                                                         // the three orbs on their orbits, as drawn
    if (!e.orbPos) return;
    for (let i = 0; i < 3; i++) { const o = e.orbPos(i); bloom(g, o.x, o.y, 22, ['#ffd070', '#9fd0ff', '#ff9bd6'][i], 0.45); extra(g, 'orb_' + i, o.x, o.y - 6, 30); }
  } });
  // the censer swings on its chain from the ceiling: hung from its ring, turned with the chain
  AnimArt.add('censer', { hm: 1.38, wm: 2.4, fly: true, brain(e, t, d, A, P) {
    if (d.tele > 0 && !(e.tele > 0)) d.fired = t; d.tele = e.tele;
    const h = hurt(d, A); if (h) return h;
    if (e.tele > 0) return seq(P.wind.concat(P.strike.slice(0, 1)), 1 - e.tele / 0.6);   // it flares
    const s = since(d.fired, t); if (s < 0.6) return seq(P.strike.slice(1), s / 0.6);      // the ring of green wisps
    return loop(A.idle, t, 7, (e.ph || 0) * 3);
  }, place(e, d, t, f, sc) { return { x: e.cx, y: e.cy, pivot: 'center', rot: e.isDummy ? 0 : -(e.ang || 0) }; },
  under(g, e, t, sc, d) {
    const f = d.f; if (!f) return;
    const a = e.isDummy ? 0 : e.ang || 0, half = f[3] * sc * 0.48;
    const bx = e.cx - Math.sin(a) * half, by = e.cy - Math.cos(a) * half;
    const ax = e.isDummy ? e.cx + 8 * Math.sin(t * 1.2) : e.ax, ay = e.isDummy ? e.cy - 78 : e.ay, n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 9));
    for (let i = 0; i <= n; i++) { const u = i / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u; g.save(); g.translate(x, y); g.rotate(Math.atan2(by - ay, bx - ax) + (i % 2 ? Math.PI / 2 : 0)); g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, 5.4, 2.8, 0, 0, 7); g.fill(); g.strokeStyle = '#9a8a64'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, 4.2, 1.8, 0, 0, 7); g.stroke(); g.restore(); }
  } });

  // ---------------------------------------------------------------- the icicle: hangs, trembles, falls, shatters where it lands, grows back
  AnimArt.add('icicle', { hm: 1.3, wm: 4.2, top: true, noCorpse: true, brain(e, t, d, A, P) {
    const s = st(e);
    if (s === 'gone') return T(e) < 0.6 ? seq(A.shatter, T(e) / 0.6) : null;
    if (s === 'anticipation') return seq(A.atk.slice(0, 6), T(e) / 0.55);
    if (s === 'attack') return A.atk[5];
    return loop(A.idle, t, 7, (e.ox || e.x || 0) * 0.02);
  }, place(e, d, t, f, sc) {
    const o = G.level && G.level.def.theme === 'ember' ? { filter: 'hue-rotate(170deg) saturate(1.5) brightness(0.75)' } : {};   // basalt in Cinderdeep
    if (st(e) === 'gone') { o.y = e.y + e.h + 1; o.top = false; }          // the shards lie where it hit
    return o;
  } });

  // ---------------------------------------------------------------- their projectiles: the imp's bomb, the turret's shards, the skull bat's teeth
  const oldProj = Art.drawProj;
  Art.drawProj = function (g, p, t) {
    if (AnimArt.ready()) {
      const x = X();
      if (p.kind === 'bomb' && x.bomb_0) {
        bloom(g, p.x, p.y, 40, '#ff9a50', 0.25 + 0.2 * Math.sin(p.t * 22));
        if (extra(g, 'bomb_' + (Math.floor(p.t * 10) % 2), p.x, p.y - p.r * 0.4, p.r * 3.4, Math.sin(p.t * 7) * 0.4)) return;
      }
      if (p.kind === 'shard' && x.shard_0) {
        const bone = typeof p.color === 'string' && p.color.toLowerCase().startsWith('#efe6');
        const a = Math.atan2(p.vy || 0, p.vx || 1);
        if (bone ? extra(g, 'tooth', p.x, p.y, p.r * 3.2, a + Math.PI / 2) : (bloom(g, p.x, p.y, 30, '#ff8fd0', 0.3), extra(g, 'shard_' + (Math.floor(p.t * 10) % 2), p.x, p.y, p.r * 3, a))) return;
      }
    }
    return oldProj(g, p, t);
  };
})();
