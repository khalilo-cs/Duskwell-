'use strict';
// The Stone Guardian drawn from the owner's part sheet (art/bosses/guardian.webp, cut by tools/sprites/cut_boss.py).
// A cut-out puppet: legs, skirt, chest, collar, head, two shoulders, two arms, the hammer and the cloak are separate pieces
// moved by a small skeleton, so each attack is a real pose: the hammer rises behind the head before the slam and falls to the
// ground in front, the whole body crouches before the leap, the legs stride in the charge, the head drops when it is stunned.
// The pieces are drawn as they were drawn; only their placement and angle change. Below half health the cracks of the rock
// light up (a pulsing glow and rising embers over the same art). Units below are pixels of the sheet; S shrinks them to the game.
const GuardianArt = (() => {
  const img = new Image(); img.src = 'art/bosses/guardian.webp';
  const R = BOSS_PARTS.guardian;
  const ready = () => img.complete && img.naturalWidth > 0;
  const S = 0.46;                                  // game pixels per sheet pixel
  const HS = 1.1, HANDLE = 0.43;                   // the hammer head's scale, and how much the long handle is shortened
  const GRIP = [86, 150];                          // where the fist closes on the handle (hammer part pixels)
  const ease = k => k * k * (3 - 2 * k);
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  function put(g, name, ax, ay, x, y, a, sx, sy, white) {
    const r = R[name]; g.save(); g.translate(x, y); if (a) g.rotate(a); if (sx || sy) g.scale(sx || 1, sy || 1);
    g.drawImage(img, r[0], r[1], r[2], r[3], -ax, -ay, r[2], r[3]);
    if (white) { g.globalAlpha *= 0.85; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, r[0], r[1], r[2], r[3], -ax, -ay, r[2], r[3]); }
    g.restore();
  }

  function poseOf(b, t) {
    const o = { dy: 0, lean: 0, head: 0, aA: 0.55, phi: 0.0, aB: -0.1, tA: 0.05, tB: -0.05, kA: 0, kB: 0, cloak: 0.12, wave: 3, sx: 1, sy: 1, shake: 0, white: b.flash > 0 };
    const br = Math.sin(t * 1.7), moving = Math.abs(b.vx || 0) > 20, air = !b.onGround && !b.isDummy;
    const st = b.last || '';
    o.bob = br * 1.2;
    if (b.state === 'dying') { o.shake = 3; o.lean = 0.12; o.head = 0.4; o.aA = 0.9; o.aB = 0.4; o.dy = 8; return o; }
    if (b.stunned) { o.dy = 16; o.lean = 0.3; o.head = 0.55; o.aA = 0.35; o.aB = 0.4; o.phi = -0.15; o.tA = 0.5; o.kA = 0.4; o.tB = -0.5; o.kB = 0.4; o.sy = 0.96; o.cloak = 0.3; return o; }
    if (b.melee) {                                                                          // the hammer comes down in front
      const k = ease(clamp(1 - (b.melee.t != null ? b.melee.t / 0.25 : 0.5), 0, 1));
      o.aA = lerp(2.2, 0.75, k); o.phi = lerp(0.9, -2.3, k); o.lean = lerp(-0.1, 0.32, k); o.head = lerp(-0.1, 0.25, k); o.dy = lerp(0, 10, k); o.aB = lerp(0.2, -0.55, k);
      o.tA = 0.5; o.kA = 0.4; o.tB = -0.35; o.kB = 0.3; o.cloak = lerp(0.2, 0.7, k); o.wave = 4; return o;
    }
    if (b.tele > 0) {
      const k = ease(clamp(b.tele, 0, 1)), pulse = Math.sin(t * 24) * 0.03;
      if (st === 'leap') {                                                                  // crouch, arms back, then it springs
        o.dy = 26; o.lean = 0.2; o.head = 0.15; o.aA = 1.1 + pulse; o.phi = 0.6; o.aB = -0.8; o.tA = 0.8; o.kA = 0.9; o.tB = -0.4; o.kB = 0.9; o.sy = 0.93; o.sx = 1.05; o.cloak = 0.5; return o;
      }
      if (st === 'charge') {                                                                // head down, hammer trailing, shoulders forward
        o.lean = 0.42; o.head = 0.35; o.dy = 8; o.aA = 0.9 + pulse; o.phi = 1.1; o.aB = -0.6; o.tA = 0.5; o.kA = 0.5; o.tB = -0.6; o.kB = 0.5; o.cloak = 0.5; return o;
      }
      o.aA = 2.45 + pulse; o.phi = 1.0; o.lean = -0.14; o.head = -0.22; o.aB = 0.4; o.dy = -3; o.tA = 0.3; o.kA = 0.2; o.tB = -0.3; o.kB = 0.2; o.cloak = -0.1; o.wave = 5; return o;       // the slam: hammer high behind the head
    }
    if (air) {
      const up = b.vy < 0;
      o.dy = up ? -6 : 0; o.lean = up ? -0.1 : 0.15; o.aA = up ? 2.0 : 0.9; o.phi = up ? 0.5 : 0.2; o.aB = up ? 1.5 : -0.7; o.tA = up ? 0.9 : 0.05; o.kA = up ? 0.9 : 0.2; o.tB = up ? -0.2 : -0.05; o.kB = up ? 0.7 : 0.2; o.cloak = up ? -0.2 : 0.8; o.wave = 5; return o;
    }
    if (moving) {                                                                          // the stride: heavy, bobbing, the cloak streaming
      const ph = t * 9.5, sn = Math.sin(ph);
      o.tA = sn * 0.42; o.tB = -sn * 0.42; o.kA = Math.max(0, Math.cos(ph)) * 0.35; o.kB = Math.max(0, -Math.cos(ph)) * 0.35;
      o.dy = -Math.abs(Math.cos(ph)) * 2; o.bob = 0; o.lean = 0.34; o.head = 0.2; o.aA = 0.95 + sn * 0.05; o.phi = 1.0; o.aB = -0.7 - sn * 0.2; o.cloak = 0.65; o.wave = 5;
      return o;
    }
    o.aA = 0.55 + br * 0.02; o.phi = 0.0 + br * 0.01; o.aB = -0.1 - br * 0.03; o.head = br * 0.012; o.sy = 1 + br * 0.006;
    return o;
  }

  function draw(g, b, t) {
    const o = poseOf(b, t), white = o.white, ph2 = (b.phase || 1) >= 2;
    g.save(); g.scale(-S, S);                                                                // the sheet faces left, the game draws facing right
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (o.shake) g.translate(Math.sin(t * 60) * o.shake, 0);
    const hy = -150 + o.dy - o.bob, lx = Math.sin(o.lean) * 6;
    const H = [0 + lx, hy];
    // legs: stand on the ground whatever the pose, so the lowest foot touches y = 0 while grounded
    const leg = (name, ax, ay, hx, th, kn, k) => {
      const x = H[0] + hx, y = hy + 2 - Math.sin(th) * 0, lift = kn * 22;
      put(g, name, ax * k, ay * k, x, y - lift, th, k, k, white);
    };
    // the cloak, behind everything
    put(g, 'cloak', 22, 10, H[0] + 88, hy - 112, o.cloak + Math.sin(t * 3 + 1) * 0.04 * o.wave * 0.3, 1, 1, white);
    // back leg and back arm
    leg('leg_b', 47, 10, 30, o.tB, o.kB, 1.07);
    const sB = [H[0] + 92 + Math.sin(o.lean) * 30, hy - 100 + 0], armB = [38, 14];
    put(g, 'arm_b', armB[0], armB[1], sB[0], sB[1], o.aB, 1, 1, white);
    leg('leg_a', 44, 10, -22, o.tA, o.kA, 1.0);
    // the skirt and the chain at the belt
    put(g, 'skirt', 42, 6, H[0], hy - 6, Math.sin(t * 2.2) * 0.02 - o.lean * 0.3, 1.25, 0.62, white);
    put(g, 'chain', 22, 4, H[0] - 38, hy - 10, Math.sin(t * 2.6) * 0.08, 0.9, 0.9, white);
    // chest, collar, head
    const ch = [H[0] + Math.sin(o.lean) * 24, hy - 70 * Math.cos(o.lean)];
    g.save(); g.translate(H[0], hy); g.rotate(o.lean * 0.55); g.translate(-H[0], -hy);
    put(g, 'core', 58, 45, H[0], hy - 68, 0, o.sx, o.sy, white);
    put(g, 'collar', 78, 52, H[0] - 2, hy - 98, 0, o.sx, o.sy, white);
    put(g, 'head', 52, 66, H[0] - 2 + o.lean * 10, hy - 134, o.head, 1, 1, white);
    put(g, 'shoulder_b', 56, 66, H[0] + 84, hy - 106, 0.05 + o.lean * 0.2, 1, 1, white);
    g.restore();
    // the front arm and the hammer: the fist sits on the handle, wherever the arm points
    const sA = [H[0] - 90 + Math.sin(o.lean) * 14, hy - 100], armA = [42, 14], armLen = 160;
    const fist = [sA[0] - Math.sin(o.aA) * armLen, sA[1] + Math.cos(o.aA) * armLen];
    // the hammer, drawn behind the fist: the head at full width, the long handle shortened; its grip is the origin
    const hm = R.hammer, HHEAD = 108, hs = HS, gap = (GRIP[1] - HHEAD) * HANDLE * hs;
    const hammer = (wh) => {
      g.save(); g.translate(fist[0], fist[1]); g.rotate(o.phi);
      const ox = -GRIP[0] * hs, w = hm[2] * hs;
      g.drawImage(img, hm[0], hm[1] + HHEAD, hm[2], GRIP[1] - HHEAD, ox, -gap, w, gap);                                   // handle between head and fist
      g.drawImage(img, hm[0], hm[1] + GRIP[1], hm[2], hm[3] - GRIP[1], ox, 0, w, (hm[3] - GRIP[1]) * HANDLE * hs);        // handle below the fist
      g.drawImage(img, hm[0], hm[1], hm[2], HHEAD, ox, -gap - HHEAD * hs, w, HHEAD * hs);                                 // the head
      if (wh) { g.globalAlpha *= 0.85; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, hm[0], hm[1], hm[2], HHEAD, ox, -gap - HHEAD * hs, w, HHEAD * hs); }
      g.restore();
    };
    hammer(white);
    put(g, 'arm_a', armA[0], armA[1], sA[0], sA[1], o.aA, 1, 1, white);
    put(g, 'shoulder_a', 60, 62, H[0] - 84 + Math.sin(o.lean) * 10, hy - 106, -0.05 + o.lean * 0.2, 1, 1, white);
    // phase two: the cracks burn
    if (ph2 && !white) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 5.5);
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, r, a] of [[H[0], hy - 68, 110, 0.5], [fist[0] + Math.sin(o.phi) * 90, fist[1] - Math.cos(o.phi) * 90, 130, 0.45], [H[0] - 86, hy - 106, 80, 0.25], [H[0] + 84, hy - 106, 80, 0.25]]) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,150,40,' + (a * pulse) + ')'); gr.addColorStop(1, 'rgba(255,90,10,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 9; i++) {                                                          // embers climbing off the stone
        const u = (t * 0.55 + i * 0.113) % 1, x = H[0] + Math.sin(i * 12.9 + t) * 120 - 10, y = hy - 40 - u * 280;
        g.fillStyle = 'rgba(255,' + (150 + 60 * (1 - u)) + ',60,' + (0.8 * (1 - u)) + ')'; g.beginPath(); g.arc(x, y, 3.2 * (1 - u * 0.6), 0, 7); g.fill();
      }
    }
    g.restore();
    return fist;
  }

  return { ready, draw, S };
})();

Art.boss.guardian = (function (old) {
  return function (g, b, t) {
    if (!GuardianArt.ready()) return old(g, b, t);
    const tele = b.tele > 0;
    g.save(); g.translate(b.cx, b.y + b.h); g.scale(b.face || 1, 1);
    if (b.state === 'dying') g.translate(Math.sin(t * 60) * 2.5, 0);
    telGlow(g, b, '#ffb347', 0, -60, 130); groundD(g, 74);
    GuardianArt.draw(g, b, t);
    g.restore();
    bossStars(g, b, t, '#ffe98a', 0, -6);
  };
})(Art.boss.guardian);
