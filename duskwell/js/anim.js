'use strict';
// Small animation toolkit for the jointed characters (the hero puppet, the bosses). Nothing here knows about any one character.
//  - Spr: a damped spring. Every pose value (an arm angle, how low the body crouches) chases its target through a spring instead of
//    jumping to it, so a move eases in, can overshoot a little and settle: weight, inertia and follow-through for free.
//  - the rest are the easing curves and the noise the poses are written with.
const Anim = (() => {
  class Spr {
    constructor(x, w, z) { this.x = x || 0; this.v = 0; this.w = w || 10; this.z = z == null ? 0.8 : z; }
    // advance by dt toward target; w (natural frequency, rad/s) and z (damping ratio: 1 = no overshoot, 0.3 = bouncy) may be given per call
    step(target, dt, w, z) {
      w = w || this.w; z = z == null ? this.z : z;
      const n = Math.max(1, Math.ceil(dt * w / 0.35));            // keep each sub-step small so a stiff spring stays stable
      const h = dt / n;
      for (let i = 0; i < n; i++) { this.v += (w * w * (target - this.x) - 2 * z * w * this.v) * h; this.x += this.v * h; }
      return this.x;
    }
    snap(x) { this.x = x; this.v = 0; }
  }
  const ease = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * (3 - 2 * k); };              // smoothstep
  const easeIn = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * k; };
  const easeOut = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return 1 - (1 - k) * (1 - k) * (1 - k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = k => (k < 0 ? 0 : k > 1 ? 1 : k);
  // smooth looping noise (sum of sines with unrelated frequencies): idle sway that never repeats visibly
  const noise = (t, seed) => (Math.sin(t * 1.0 + seed) + Math.sin(t * 2.3 + seed * 1.7) * 0.5 + Math.sin(t * 0.43 + seed * 3.1) * 0.7) / 2.2;
  return { Spr, ease, easeIn, easeOut, lerp, clamp01, noise };
})();
