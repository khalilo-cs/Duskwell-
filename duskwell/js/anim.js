'use strict';
// Animation helpers for the jointed characters (hero puppet, bosses).
// Spr is a damped spring; the rest are easing curves and a smooth noise.
const Anim = (() => {
  // damped spring: a value that chases its target instead of jumping to it
  class Spr {
    // x: start value, w: natural frequency, z: damping
    constructor(x, w, z) { this.x = x || 0; this.v = 0; this.w = w || 10; this.z = z == null ? 0.8 : z; }
    // advance by dt toward target; w (natural frequency, rad/s) and z (damping ratio: 1 = no overshoot, 0.3 = bouncy) may be given per call
    step(target, dt, w, z) {
      w = w || this.w; z = z == null ? this.z : z;
      const n = Math.max(1, Math.ceil(dt * w / 0.35));            // keep each sub-step small so a stiff spring stays stable
      const h = dt / n;
      for (let i = 0; i < n; i++) { this.v += (w * w * (target - this.x) - 2 * z * w * this.v) * h; this.x += this.v * h; }
      return this.x;
    }
    // jump to a value with no motion
    snap(x) { this.x = x; this.v = 0; }
  }
  const ease = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * (3 - 2 * k); };              // smoothstep
  // slow start
  const easeIn = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * k; };
  // slow finish
  const easeOut = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return 1 - (1 - k) * (1 - k) * (1 - k); };
  // blend from a to b by k
  const lerp = (a, b, k) => a + (b - a) * k;
  // keep k between 0 and 1
  const clamp01 = k => (k < 0 ? 0 : k > 1 ? 1 : k);
  // smooth looping noise (sum of sines with unrelated frequencies): idle sway that never repeats visibly
  const noise = (t, seed) => (Math.sin(t * 1.0 + seed) + Math.sin(t * 2.3 + seed * 1.7) * 0.5 + Math.sin(t * 0.43 + seed * 3.1) * 0.7) / 2.2;
  // public helpers
  return { Spr, ease, easeIn, easeOut, lerp, clamp01, noise };
})();
