'use strict';
// Hero v2: a cut-out puppet built from the owner's drawn parts (art/hero/hero2.webp, packed by tools/sprites/pack_hero2.py).
// Head, torso, two arms, two legs of two bones each, the sword and the long cloak are separate pieces moved by a
// small skeleton, so every pose is computed from the real state of the player instead of being a fixed frame.
// Angles are canvas rotations (clockwise positive); the hero is built facing +x and mirrored for the other side.
const Puppet = (() => {
  const S = 0.5;                                    // logical pixels per atlas pixel
  const img = new Image(); img.src = 'art/hero/hero2.webp';
  const R = HERO2_META.parts;
  // pivots and end points inside each part, in atlas pixels
  const PV = {
    torso: { hip: [16, 46], collar: [17, 5], sh: [12, 9] },
    head: { neck: [30, 45] },
    armA: { sh: [10, 6], hand: [13, 57] }, armB: { sh: [4, 4], hand: [17, 53] },
    thighA: { hip: [7, 2], knee: [6, 17] }, shinA: { knee: [9, 2], foot: [15, 33] },
    thighB: { hip: [7, 3], knee: [7, 22] }, shinB: { knee: [8, 2], foot: [12, 27] },
    sword: { grip: [24, 38] }, cloak: { collar: [45, 3] },
  };
  const LEGK = 1.22;                                // the legs are drawn a little longer than the sheet so they show under the long cloak
  const SWORD_TILT = 0.49;                          // the blade in the picture points up-right by this much
  const ready = () => img.complete && img.naturalWidth > 0;
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const add = (p, v) => [p[0] + v[0] * S, p[1] + v[1] * S];

  // cloak colours: the teal of the drawing is re-hued for the equipped cloak, only on the cloth pieces
  const variants = {};
  const CLOTH = ['torso', 'head_hooded', 'cloak_side', 'cloak_back'];
  function hsl(hex) {
    const c = parseInt(hex.slice(1), 16), r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d > 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function atlas() {
    const id = typeof Gear !== 'undefined' ? Gear.cloak() : 'drifter';
    if (id === 'drifter') return img;
    if (variants[id]) return variants[id];
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    const [h, s, l] = hsl(Gear.def('cloak', id).color);
    const f = 'hue-rotate(' + Math.round(h - 195) + 'deg) saturate(' + clamp(s / 0.4, 0.15, 2.4).toFixed(2) + ') brightness(' + clamp(l / 0.3, 0.6, 2.4).toFixed(2) + ')';
    if ('filter' in c) for (const n of CLOTH) {
      const r = R[n]; c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip(); c.clearRect(r[0], r[1], r[2], r[3]);
      c.filter = f; c.drawImage(img, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]); c.restore();
    }
    return (variants[id] = cv);
  }

  // one piece: drawn with its pivot at (x, y), turned by a, optionally stretched
  function put(g, src, name, pv, x, y, a, sx, sy) {
    const r = R[name]; g.save(); g.translate(x, y); g.rotate(a || 0); if (sx || sy) g.scale(sx || 1, sy || 1);
    g.drawImage(src, r[0], r[1], r[2], r[3], -pv[0] * S, -pv[1] * S, r[2] * S, r[3] * S); g.restore();
  }
  // the cloak as vertical strips that ripple, the tail swinging more than the collar
  function cloak(g, src, x, y, a, wave, t, lift) {
    const r = R.cloak_side, W = r[2], cx = PV.cloak.collar[0], n = Math.ceil(W / 2.5);
    g.save(); g.translate(x, y); g.rotate(a); g.scale(-1, 1);                                   // mirrored: the tail trails behind
    for (let i = 0; i < n; i++) {
      const sx = i * 2.5, sw = Math.min(2.5, W - sx), d = Math.abs(sx - (W - cx)) / W;       // distance from the collar
      const dy = Math.sin(t * 7 - sx * 0.2) * wave * d * 1.4 + lift * d * d;
      g.drawImage(src, r[0] + sx, r[1], sw, r[3], (sx - (W - cx)) * S - 0.2, (-PV.cloak.collar[1]) * S + dy, sw * S + 0.5, r[3] * S);
    }
    g.restore();
  }

  // ---------------------------------------------------------------- poses
  const ease = k => k * k * (3 - 2 * k);
  function poseOf(s, t) {
    const o = { hipY: 0, lean: 0, head: 0, armA: 0.25, armB: 0.1, tA: 0, kA: 0.12, tB: 0, kB: 0.12, sw: 1.05, cl: 0.1, wave: 0.6, lift: 0, sx: 1, sy: 1, dx: 0, grounded: true, bob: 0, swordOut: true };
    const sp = Math.abs(s.vx), br = Math.sin(t * 2.3);
    if (s.sitting) {
      o.grounded = false; o.hipY = -7; o.lean = 0.12; o.head = 0.28; o.tA = 1.35; o.kA = 1.35; o.tB = 1.2; o.kB = 1.3; o.armA = -0.55; o.armB = -0.35; o.sw = 2.6; o.cl = 0.0; o.wave = 0.25; return o;
    }
    if (s.hurt) { o.lean = -0.32; o.head = -0.35; o.armA = 0.9; o.armB = -0.9; o.tA = 0.35; o.kA = 0.3; o.tB = -0.4; o.kB = 0.3; o.sw = 1.5; o.cl = 0.5; o.wave = 2; o.grounded = s.onGround; o.hipY = s.onGround ? 0 : -3; return o; }
    if (s.atk) return attackPose(o, s, t);
    if (s.sdGo || s.dash) {
      o.lean = 0.62; o.head = -0.25; o.armA = -1.25; o.armB = 0.75; o.tA = 1.0; o.kA = 0.9; o.tB = -0.85; o.kB = 0.25; o.sw = -0.05; o.cl = 0.62; o.wave = 0.4; o.sx = 1.2; o.sy = 0.9; o.grounded = false; o.hipY = -20; return o;
    }
    if (s.charge > 0) { const c = s.charge; o.hipY = 0; o.lean = 0.25 + 0.2 * c; o.armA = -0.5; o.armB = -0.35; o.tA = 0.55; o.kA = 0.9 + 0.3 * c; o.tB = -0.55; o.kB = 0.7; o.sw = 1.6; o.sy = 1 - 0.1 * c; o.sx = 1 + 0.06 * c; o.cl = 0.3 + 0.4 * c; o.wave = 1 + 2 * c; return o; }
    if (s.dive) { o.grounded = false; o.hipY = -21; o.lean = 0.0; o.head = 0.0; o.armA = 0.1; o.armB = -0.1; o.tA = 0.1; o.kA = 0.0; o.tB = -0.1; o.kB = 0.0; o.sw = Math.PI / 2; o.armA = -Math.PI * 0.62; o.cl = 1.1; o.lift = -10; o.wave = 2.4; o.sy = 1.12; o.sx = 0.9; return o; }
    if (s.wail) { o.grounded = false; o.hipY = -18; o.head = -0.4; o.armA = -2.6; o.armB = -2.3; o.tA = 0.15; o.kA = 0.15; o.tB = -0.15; o.kB = 0.1; o.sw = -1.5; o.cl = 0.0; o.lift = 6; o.wave = 2.6; o.sy = 1.1; o.sx = 0.94; return o; }
    if (s.wall) { o.grounded = false; o.hipY = -17; o.lean = -0.15; o.head = -0.1; o.armA = -2.5; o.armB = -2.3; o.tA = 0.55; o.kA = 1.0; o.tB = 0.2; o.kB = 0.7; o.sw = 2.2; o.cl = 0.3; o.wave = 0.8; return o; }
    if (s.air) {
      o.grounded = false;
      if (s.vy < 0) {                                                                       // rising: knees tucked, cloak sinking below
        const k = clamp(-s.vy / 900, 0, 1);
        o.hipY = -17 - 3 * k; o.lean = 0.06; o.head = -0.1; o.armA = -0.95; o.armB = 0.55; o.tA = 0.85; o.kA = 1.1; o.tB = -0.25; o.kB = 0.6; o.sw = 0.5; o.cl = -0.05; o.lift = -4 * k; o.wave = 0.9 + k; o.sy = 1 + 0.06 * k; o.sx = 1 - 0.04 * k;
      } else {                                                                              // falling: legs stretched down, cloak lifting
        const k = clamp(s.vy / 900, 0, 1);
        o.hipY = -21; o.lean = -0.04; o.head = 0.1; o.armA = -2.15 - 0.2 * k; o.armB = -1.75; o.tA = 0.2; o.kA = 0.25; o.tB = -0.2; o.kB = 0.15; o.sw = -1.0; o.cl = 0.5 + 0.8 * k; o.lift = 8 * k; o.wave = 1.4 + 2 * k; o.sy = 1 + 0.08 * k; o.sx = 1 - 0.05 * k;
      }
      return o;
    }
    if (s.land > 0) { const k = clamp(s.land / 0.12, 0, 1); o.hipY = 0; o.sy = 1 - 0.16 * k; o.sx = 1 + 0.12 * k; o.tA = 0.35 * k; o.kA = 0.4 + 0.5 * k; o.tB = -0.2 * k; o.kB = 0.3 + 0.5 * k; o.lean = 0.12 * k; return o; }
    if (s.focus) { o.lean = 0.3; o.head = 0.35; o.armA = -0.5; o.armB = -0.35; o.tA = 0.4; o.kA = 0.9; o.tB = -0.3; o.kB = 0.6; o.sw = 2.3; o.cl = 0.0; o.wave = 0.4 + Math.sin(t * 12) * 0.3; o.sy = 0.94 + Math.sin(t * 9) * 0.01; return o; }
    if (sp > 30) {                                                                          // running
      const ph = t * (9 + sp / 80), c = Math.cos(ph), sn = Math.sin(ph), k = clamp(sp / 330, 0.4, 1.2);
      o.tA = sn * 0.95 * k; o.kA = 0.25 + 0.95 * Math.max(0, Math.cos(ph + 0.9)); o.tB = -sn * 0.95 * k; o.kB = 0.25 + 0.95 * Math.max(0, -Math.cos(ph + 0.9));
      o.armA = -sn * 0.9 * k - 0.15; o.armB = sn * 0.9 * k; o.lean = 0.2 * k; o.head = -0.06; o.sw = 0.6 - sn * 0.12;
      o.bob = Math.abs(Math.cos(ph)) * 1.4 * k; o.cl = 0.22 + 0.25 * k; o.wave = 0.8 + 1.2 * k; return o;
    }
    // standing
    o.bob = br * 0.45; o.tA = 0.12; o.kA = 0.1; o.tB = -0.12; o.kB = 0.1; o.armA = -0.34 + br * 0.03; o.armB = 0.1 - br * 0.03; o.sw = 0.75; o.head = 0.04 + br * 0.015; o.cl = 0.08 + br * 0.02; o.wave = 0.5; o.sy = 1 + br * 0.006;
    return o;
  }
  // the strike: wind up, thrust or sweep, follow through; up and down strikes raise or lower the blade
  function attackPose(o, s, t) {
    const pr = clamp(s.atkPr, 0, 1), e = ease(pr), alt = s.atkAlt ? 1 : -1;
    o.grounded = s.onGround; o.hipY = s.onGround ? 0 : -19; o.cl = 0.35; o.wave = 1.6;
    if (s.atk === 'up') {
      o.lean = -0.1; o.head = -0.45; o.armA = lerp(-1.2, -3.0, e); o.sw = lerp(-0.4, -1.65, e); o.armB = -0.4;
      o.tA = 0.25; o.kA = 0.3; o.tB = -0.3; o.kB = 0.25; o.sy = 1.04; return o;
    }
    if (s.atk === 'down') {
      o.lean = 0.2; o.head = 0.35; o.armA = lerp(-1.6, 0.35, e); o.sw = lerp(0.6, 1.62, e); o.armB = 0.6;
      o.tA = 0.1; o.kA = 0.4; o.tB = -0.1; o.kB = 0.4; return o;
    }
    // side: thrust forward on the first strike, a rising-to-falling sweep on the next
    const lunge = Math.sin(pr * Math.PI);
    o.lean = 0.12 + 0.32 * lunge; o.head = -0.05; o.dx = 3 * lunge;
    o.tA = 0.75 * lunge + 0.1; o.kA = 0.7 * lunge + 0.15; o.tB = -0.7 * lunge - 0.1; o.kB = 0.25 + 0.2 * lunge;
    o.armB = -0.4 + 0.5 * lunge;
    if (alt > 0) { o.sw = lerp(-0.95, 0.85, e); o.armA = lerp(-2.2, -1.0, e); }
    else { o.sw = lerp(0.9, -0.35, e); o.armA = lerp(-0.9, -1.75, e); }
    o.sx = 1 + 0.08 * lunge; return o;
  }

  // ---------------------------------------------------------------- the rig
  function render(g, s, t, k) {
    const o = poseOf(s, t), src = atlas();
    g.save(); g.scale(k * s.face, k); if (o.sx !== 1 || o.sy !== 1) g.scale(o.sx, o.sy);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    // legs first, to find where the pelvis must sit for the feet to touch the ground
    const leg = (th, kn, tn, sn, pvT, pvS) => {
      const kv = rot((pvT.knee[0] - pvT.hip[0]) * LEGK, (pvT.knee[1] - pvT.hip[1]) * LEGK, -th), fv = rot((pvS.foot[0] - pvS.knee[0]) * LEGK, (pvS.foot[1] - pvS.knee[1]) * LEGK, -(th - kn));
      return { th, kn, kv, fv, drop: (kv[1] + fv[1]) * S };
    };
    const A = leg(o.tA, o.kA, 'thighA', 'shinA', PV.thighA, PV.shinA), B = leg(o.tB, o.kB, 'thighB', 'shinB', PV.thighB, PV.shinB);
    const hipY = o.grounded ? -Math.max(A.drop, B.drop) + 0.8 - o.bob : o.hipY - o.bob, hx = o.dx;
    const H = [hx, hipY];
    // cloak behind everything
    const lean = o.lean, col = add(H, rot(PV.torso.collar[0] - PV.torso.hip[0], PV.torso.collar[1] - PV.torso.hip[1], lean)), sh = add(H, rot(PV.torso.sh[0] - PV.torso.hip[0], PV.torso.sh[1] - PV.torso.hip[1], lean));
    cloak(g, src, sh[0] - 1, sh[1] - 1, o.cl, o.wave, t, o.lift);
    const drawArm = (name, pv, ang, dark) => {
      if (dark) g.filter = 'none';
      put(g, src, name, pv.sh, sh[0], sh[1], ang);
      return add(sh, rot(pv.hand[0] - pv.sh[0], pv.hand[1] - pv.sh[1], ang));
    };
    drawArm('arm_b', PV.armB, o.armB, true);
    const drawLeg = (L, nT, nS, pvT, pvS, ox) => {
      const hip = [H[0] + ox, H[1]];
      put(g, src, nT, pvT.hip, hip[0], hip[1], -L.th, LEGK, LEGK);
      const kn = add(hip, L.kv); put(g, src, nS, pvS.knee, kn[0], kn[1], -(L.th - L.kn), LEGK, LEGK);
    };
    drawLeg(B, 'thigh_b', 'shin_b', PV.thighB, PV.shinB, -1.2);
    drawLeg(A, 'thigh_a', 'shin_a', PV.thighA, PV.shinA, 1.0);
    put(g, src, 'torso', PV.torso.hip, H[0], H[1], lean, 0.86, 1);
    put(g, src, 'head_hooded', PV.head.neck, col[0] + 0.4, col[1] + 1.2, lean * 0.6 + o.head);
    const hand = drawArm('arm_a', PV.armA, o.armA);
    if (s.sword !== false) put(g, src, 'sword', PV.sword.grip, hand[0], hand[1], o.sw + SWORD_TILT, 0.85, 0.85);
    else if (s.overlay) heroSword(g, hand[0], hand[1], o.sw, 36, null);        // another weapon, drawn by the gear code
    g.restore();
  }

  // the player's state, as the poses want it
  function stateOf(p) {
    const sdGo = !!(p.sd && p.sd.state === 'go');
    return {
      face: p.face, vx: p.vx, vy: p.vy, onGround: p.onGround, sitting: !!p.sitting, hurt: p.hurtT > 0, dash: p.dashT > 0, sdGo, dive: !!p.diving, wail: p.wailT > 0, wall: !!p.sliding,
      charge: p.sd && p.sd.state === 'charge' ? clamp(p.sd.t / SD_CHARGE, 0, 1) : 0, land: p.landT || 0, focus: p.focusT > 0,
      air: !p.onGround && !p.sliding && !p.diving && !sdGo, atk: p.atkT > 0 ? p.atkDir : null, atkPr: 1 - clamp(p.atkT / 0.16, 0, 1), atkAlt: p.atkAlt,
      sword: typeof Gear === 'undefined' || Gear.weapon() === 'nail',
    };
  }
  // an offscreen sheet for translucent or tinted draws, so overlapping parts do not show through each other
  let scratch = null;
  function viaScratch(g, x, y, s, t, k, alpha, tint) {
    const ds = Math.max(1, Math.abs(g.getTransform().a)), W = 200, H = 200, ox = 100, oy = 160;
    if (!scratch) scratch = document.createElement('canvas');
    const w = Math.ceil(W * ds), h = Math.ceil(H * ds);
    if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
    const c = scratch.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    c.setTransform(ds, 0, 0, ds, ox * ds, oy * ds); render(c, s, t, k);
    if (tint) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = tint; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over'; }
    g.save(); g.globalAlpha = alpha; g.drawImage(scratch, 0, 0, w, h, x - ox, y - oy, W, H); g.restore();
  }

  return {
    ready,
    // draws the player; (x, feetY) is where the feet touch the ground
    draw(g, p, t, alpha) {
      const s = stateOf(p), x = p.cx, y = p.y + p.h + 1;
      Pixel.shadow(g, x, p.y + p.h, 18);
      g.save(); g.translate(x, y);
      if ((alpha === undefined ? 1 : alpha) < 0.999) viaScratch(g, 0, 0, s, t, 1, alpha, null); else render(g, s, t, 1);
      g.restore();
    },
    // a fading afterimage for dashes
    ghost(g, p, gh, t, alpha, tint) {
      const s = stateOf(p); s.face = gh.face; s.dash = true; s.atk = null; s.sdGo = !!gh.sd; s.sword = false;
      g.save(); g.translate(gh.x + p.w / 2, gh.y + p.h + 1); viaScratch(g, 0, 0, s, t, 1, alpha, tint); g.restore();
    },
    // for the title and the equipment screen: standing at rest, any size
    drawAt(g, x, y, scale, t, o) {
      const s = Object.assign({ face: 1, vx: 0, vy: 0, onGround: true, sword: true }, o || {});
      if (typeof Gear !== 'undefined' && !(o && 'sword' in o)) { s.sword = Gear.weapon() === 'nail'; s.overlay = !s.sword; }
      g.save(); g.translate(x, y); render(g, s, t, scale); g.restore();
    },
    S,
  };
})();

Art.drawPuppetHero = function (g, p, t, alpha) {
  if (!HeroStyle.puppet()) return false;
  Puppet.draw(g, p, t, alpha); return true;
};
Art.drawPuppetGhosts = function (g, p, t) {
  if (!HeroStyle.puppet()) return false;
  for (const gh of p.ghost) {
    const life = gh.sd ? 0.26 : 0.22, a = (gh.sd ? 0.55 : 0.45) * (1 - (t - gh.t) / life);
    if (a > 0) Puppet.ghost(g, p, gh, t, a, gh.sd ? '#ff9a50' : '#4a6aa8');
  }
  return true;
};
