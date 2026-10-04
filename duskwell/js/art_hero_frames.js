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
  // ---- the equipment on the drawn hero
  // the frames come twice: as drawn (with the Dusk Nail in the hand) and bare (the sword and its trail taken out,
  // art/hero/hero_frames_bare.webp); with any other weapon the bare frame is drawn and the weapon is put in the hand, along the
  // line the drawn sword had (HERO_BLADES). The cloth of the cloak takes the colour of the equipped cloak.
  const bare = new Image(); bare.src = 'art/hero/hero_frames_bare.webp';
  const KEY = new Map();                                              // frame rectangle -> its name ('run_3'), for HERO_BLADES
  const keyOf = f => { if (!KEY.size) for (const a in F()) F()[a].forEach((r, i) => KEY.set(r, a + '_' + i)); return KEY.get(f); };
  const WLEN = { duskblade: 1.08, lance: 1.45, fangs: 0.72, cleaver: 1.0, scythe: 1.25, rapier: 1.18, bonesaw: 1.0 };
  const weapon = () => (typeof Gear !== 'undefined' ? Gear.weapon() : 'nail');
  const cloakId = () => (typeof Gear !== 'undefined' ? Gear.cloak() : 'drifter');
  // the cloak's colour on the cloth: the drawing's teal (hue 170..215) is moved to the cloak's hue, saturation and lightness;
  // the glowing trail and the eyes (bright) and the gold, the leather and the mask (other hues) stay
  const tinted2 = {};
  function hslOf(hex) {
    const c = parseInt(hex.slice(1), 16), r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s2 = 0;
    if (d > 0) { s2 = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, s2, l];
  }
  function recolour(src, id) {
    const key = (src === bare ? 'b:' : 'd:') + id;
    if (tinted2[key]) return tinted2[key];
    const cv = document.createElement('canvas'); cv.width = src.naturalWidth; cv.height = src.naturalHeight;
    const c = cv.getContext('2d'); c.drawImage(src, 0, 0);
    let data; try { data = c.getImageData(0, 0, cv.width, cv.height); } catch (e) { return (tinted2[key] = src); }   // a page opened from disk cannot read its pixels
    const [th, ts, tl] = hslOf(Gear.def('cloak', id).color), d = data.data;
    const sK = Math.max(0.15, Math.min(2.2, ts / 0.42)), lK = Math.max(0.55, Math.min(2.6, tl / 0.24));
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const r = d[i] / 255, g2 = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), l = (mx + mn) / 2, dd = mx - mn;
      if (dd < 0.06 || mx > 0.64) continue;                              // greys, and the bright glow of the trail
      let h = mx === r ? ((g2 - b) / dd) % 6 : mx === g2 ? (b - r) / dd + 2 : (r - g2) / dd + 4; h *= 60; if (h < 0) h += 360;
      if (h < 165 || h > 218) continue;                                  // only the teal of the cloth
      const s0 = dd / (1 - Math.abs(2 * l - 1));
      const nh = th, ns = Math.min(1, s0 * sK), nl = Math.min(0.92, l * lK);
      const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns, p2 = 2 * nl - q;
      const f = t => { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p2 + (q - p2) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6 : p2; };
      d[i] = Math.round(f(nh / 360 + 1 / 3) * 255); d[i + 1] = Math.round(f(nh / 360) * 255); d[i + 2] = Math.round(f(nh / 360 - 1 / 3) * 255);
    }
    c.putImageData(data, 0, 0);
    return (tinted2[key] = cv);
  }
  function source(useBare) {
    const src = useBare && bare.complete && bare.naturalWidth ? bare : img, id = cloakId();
    return id === 'drifter' || typeof Gear === 'undefined' ? src : recolour(src, id);
  }
  // one frame with its ground point at (x, y); o.plain: as drawn, no equipment (the afterimages)
  function frame(g, f, x, y, face, alpha, k, o) {
    k = k || scale();
    const w = weapon(), key = keyOf(f), bl = key && HERO_BLADES[key], swap = w !== 'nail' && !!bl && !(o && o.plain);
    g.save(); g.translate(x, y); g.scale(face * k, k); if (alpha != null) g.globalAlpha *= alpha;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(o && o.plain ? img : source(swap), f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]);
    if (swap) {                                                         // the equipped weapon in the hand, along the drawn sword's line
      for (let i = 0; i < (w === 'fangs' ? bl.length : 1); i++) {
        const b = bl[i], gx = b[0] - f[4], gy = b[1] - f[5], ang = Math.atan2(b[3] - b[1], b[2] - b[0]);
        const len = Math.max(44, Math.hypot(b[2] - b[0], b[3] - b[1]) * 1.15) * (WLEN[w] || 1);   // never shorter than a sword's length
        Art.drawWeapon(g, w, gx, gy, ang, len, S.t);
      }
    }
    g.restore();
  }
  // a tinted copy, for the afterimages of a dash
  let scratch = null;
  function tinted(g, f, x, y, face, alpha, tint) {
    const k = scale(), ds = Math.max(1, Math.abs(g.getTransform().a)), w = Math.ceil(f[2] * k * ds) + 2, h = Math.ceil(f[3] * k * ds) + 2;
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < w || scratch.height < h) { scratch.width = Math.max(w, scratch.width); scratch.height = Math.max(h, scratch.height); }
    const c = scratch.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, scratch.width, scratch.height);
    c.imageSmoothingEnabled = true; c.drawImage(source(weapon() !== 'nail'), f[0], f[1], f[2], f[3], 1, 1, f[2] * k * ds, f[3] * k * ds);
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = tint; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    g.save(); g.translate(x, y); g.scale(face, 1); g.globalAlpha *= alpha;
    g.drawImage(scratch, 0, 0, w, h, -f[4] * k - 1 / ds, -f[5] * k - 1 / ds, w / ds, h / ds);
    g.restore();
  }
  return {
    ready, pick, frame, tinted, S, scale, keyOf, source,
    draw(g, p, t, alpha) {
      S.t = t;
      const o = pick(p, t);
      Pixel.shadow(g, p.cx, p.y + p.h, 18);
      // frames in the air (dash, spin, wall, stab) are placed by the middle of the body; resting, the hero sits on the bench's seat
      const y = o.mid ? p.cy + 2 : o.sit && p.sitting ? p.sitting.py - 10 : p.y + p.h + 1;
      frame(g, o.f, p.cx, y, p.face || 1, alpha);
      if (weapon() !== 'nail' && HERO_BLADES[keyOf(o.f)]) o.arc = false;   // the trail drawn with the sword is gone: the weapon's own swing is drawn
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

