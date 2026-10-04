'use strict';
// The hero the owner drew frame by frame (art/hero/hero_frames.webp, cut by tools/sprites/cut_hero_anims.py): breathing at rest,
// a run of nine strides, a jump, two sword slashes, a flinch, a death, and sitting down on a bench. The frames are used as drawn;
// this file picks one from what the hero is really doing:
//  - the run advances with the ground covered, so the feet do not slide; at rest the six breathing frames loop
//  - in the air the frame follows the real vertical speed (rising, the tuck at the top, falling), and a hard landing shows the last
//  - a sideways strike plays one of the two drawn slashes (they alternate, as the strikes do), the trail drawn with it
//  - strikes up and down have their own drawn cuts (from the second sheet), as do the dash, the second jump's spin, clinging to a
//    wall, healing, casting and resting on the bench
//  - a wound plays the flinch; dying plays the fall to the ground
// The game's other looks (the jointed puppet, the pixel heroes, the inked one) stay in the pause menu.
const HeroFrames = (() => {
  const img = new Image(); img.src = 'art/hero/hero_frames.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  const F = () => HERO_FRAMES;
  const H = 62;                                                       // drawn height of the hero at rest (its box is 38 tall)
  const scale = () => H / F().idle[0][3];
  const seq = (list, k) => list[Math.max(0, Math.min(list.length - 1, Math.floor(k * list.length)))];
  const loop = (list, t, fps) => list[Math.floor(t * fps) % list.length];
  const S = { dist: 0, x: null, atkLen: 0.16, atkPrev: 0, atkAt: -9, atkAlt: 0, atkDir: 'side', hits: null, sitAt: null, sitBench: null, t: 0 };

  // the frame for the hero this moment (and whether the slash trail is in it, so the game does not draw its own)
  function pick(p, t) {
    const A = F();
    if (S.x != null) S.dist += Math.abs(p.cx - S.x); S.x = p.cx;
    const atk = Math.max(0, p.atkT);                                  // (the timer runs below zero after a strike)
    if (atk > 0 && (atk > S.atkPrev + 1e-4 || p.hits !== S.hits)) {    // a new strike (each one has its own set of things it struck)
      S.atkLen = Math.max(0.08, atk); S.atkAt = t; S.atkAlt = p.atkAlt; S.atkDir = p.atkDir; S.hits = p.hits;
    }
    S.atkPrev = atk;
    if (p.sitting) { if (S.sitBench !== p.sitting) { S.sitBench = p.sitting; S.sitAt = t; } } else S.sitBench = null;
    if (!p.onGround && S.djPrev && !p.djAvail && p.vy < 0) S.djAt = t;  // the second jump, in the air
    S.djPrev = p.djAvail;
    const sdGo = !!(p.sd && p.sd.state === 'go'), sdCharge = !!(p.sd && p.sd.state === 'charge');
    if (p.sitting) return { f: loop(A.rest, t, 2.4), sit: true };                             // resting on the bench, breathing
    if (p.hurtT > 0) return { f: seq(A.hit, 1 - p.hurtT / 0.28) };
    const since = t - S.atkAt, slashLen = Math.max(S.atkLen, 0.1) + 0.14;
    if (since >= 0 && since < slashLen && (p.atkT > 0 || S.atkDir !== 'down')) {
      const k = 1 - Math.max(0, p.atkT) / S.atkLen, after = (since - S.atkLen) / 0.14;
      if (S.atkDir === 'up') return { f: p.atkT > 0 ? seq(A.up.slice(0, 4), k) : A.up[4], arc: true };    // the cut over the head, its trail drawn with it
      if (S.atkDir === 'down') return { f: seq(A.down, k), arc: true, mid: true };                         // the stab below the feet
      const sl = S.atkAlt ? A.slash2 : A.slash1;
      if (p.atkT > 0) return { f: seq(sl.slice(0, 3), k), arc: true };                         // the wind-up and the cut, with its trail
      if (p.onGround && Math.abs(p.vx) < 30 || !p.onGround) return { f: seq(sl.slice(3), after), arc: true };   // the follow-through
    }
    if (sdCharge) return { f: A.jump[0] };                                                      // gathering the Comet Heart: crouched
    if (p.novaT > 0) return { f: loop(A.double, t, 14), mid: true };                           // Soul Nova: the spin
    if (p.dashT > 0 || sdGo || p.rushT > 0) return { f: loop(A.dash, t, 10), dash: true, mid: true };
    if (p.diving) return { f: A.down[2], mid: true };                                          // the plunge: sword first
    if (p.castT > 0) return { f: seq([A.cast[2], A.cast[3], A.cast[3], A.cast[1]], 1 - p.castT / 0.25) };   // a bolt leaves the hand
    if (p.wailT > 0) return { f: loop(A.cast.slice(0, 3), t, 10) };
    if (p.focusT > 0 || p.rendHold) return p.rendHold ? { f: A.slash1[0] } : { f: loop(A.focus, t, 7) };
    if (p.sliding) return { f: loop(A.wall, t, 4), mid: true };                                 // back to the wall, sliding
    if (!p.onGround) {
      if (t - (S.djAt || -9) < 0.36) return { f: seq(A.double, (t - S.djAt) / 0.36), mid: true };   // the spin of the second jump
      if (p.vy < -420) return { f: A.jump[1] };
      if (p.vy < -120) return { f: A.jump[2] };
      if (p.vy < 160) return { f: A.jump[3] };
      return { f: A.jump[4] };
    }
    if (p.landT > 0) return { f: A.jump[5] };
    if (Math.abs(p.vx) > 30) return { f: A.run[Math.floor(S.dist / 7.5) % A.run.length] };
    return { f: loop(A.idle, t, 6) };
  }
  // one frame with its ground point at (x, y)
  function frame(g, f, x, y, face, alpha, k) {
    k = k || scale();
    g.save(); g.translate(x, y); g.scale(face * k, k); if (alpha != null) g.globalAlpha *= alpha;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]);
    g.restore();
  }
  // a tinted copy, for the afterimages of a dash
  let scratch = null;
  function tinted(g, f, x, y, face, alpha, tint) {
    const k = scale(), ds = Math.max(1, Math.abs(g.getTransform().a)), w = Math.ceil(f[2] * k * ds) + 2, h = Math.ceil(f[3] * k * ds) + 2;
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < w || scratch.height < h) { scratch.width = Math.max(w, scratch.width); scratch.height = Math.max(h, scratch.height); }
    const c = scratch.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, scratch.width, scratch.height);
    c.imageSmoothingEnabled = true; c.drawImage(img, f[0], f[1], f[2], f[3], 1, 1, f[2] * k * ds, f[3] * k * ds);
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = tint; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    g.save(); g.translate(x, y); g.scale(face, 1); g.globalAlpha *= alpha;
    g.drawImage(scratch, 0, 0, w, h, -f[4] * k - 1 / ds, -f[5] * k - 1 / ds, w / ds, h / ds);
    g.restore();
  }
  return {
    ready, pick, frame, tinted, S, scale,
    draw(g, p, t, alpha) {
      S.t = t;
      const o = pick(p, t);
      Pixel.shadow(g, p.cx, p.y + p.h, 18);
      // frames in the air (dash, spin, wall, stab) are placed by the middle of the body; resting, the hero sits on the bench's seat
      const y = o.mid ? p.cy + 2 : o.sit && p.sitting ? p.sitting.py - 10 : p.y + p.h + 1;
      frame(g, o.f, p.cx, y, p.face || 1, alpha);
      return o;
    },
    // standing at rest, any size (the title, the equipment screen)
    drawAt(g, x, y, s, t) { frame(g, loop(F().idle, t, 6), x, y, 1, 1, scale() * s); },
  };
})();

Art.drawFramesHero = function (g, p, t, alpha) {
  if (!HeroStyle.frames()) return null;
  return HeroFrames.draw(g, p, t, alpha);
};
Art.drawFramesGhosts = function (g, p, t) {
  if (!HeroStyle.frames()) return false;
  const A = HERO_FRAMES;
  for (const gh of p.ghost) {
    const life = gh.sd ? 0.26 : 0.22, a = (gh.sd ? 0.55 : 0.45) * (1 - (t - gh.t) / life);
    if (a > 0) HeroFrames.tinted(g, A.dash[0], gh.x + p.w / 2, gh.y + p.h / 2 + 2, gh.face, a, gh.sd ? '#ff9a50' : '#4a6aa8');
  }
  return true;
};
// dying: the hero falls to the ground over the slow moment before the screen fades
Art.drawFramesDeath = function (g, p, t) {
  if (!HeroStyle.frames() || G.state !== 'dying') return false;
  const A = HERO_FRAMES.death, k = Math.min(1, (G.dyingT || 0) / 1.1);
  Pixel.shadow(g, p.cx, p.y + p.h, 22);
  HeroFrames.frame(g, A[Math.min(A.length - 1, Math.floor(k * A.length))], p.cx, p.y + p.h + 1, p.face || 1, 1);
  return true;
};

