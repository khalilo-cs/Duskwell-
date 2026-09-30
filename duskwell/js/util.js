'use strict';
// Shared constants and small helpers.
const TILE = 32, VW = 960, VH = 540;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// deterministic pseudo random (for tile art and background shapes)
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + (s || 0) * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
}
function rgba(h, a) {
  const c = hexToRgb(h);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}
// Unity's Mathf.SmoothDamp: critically damped spring toward target. Returns [value, velocity].
function smoothDamp(cur, target, vel, smoothTime, dt) {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime, x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  let nv = (vel - omega * temp) * exp;
  let out = target + (change + temp) * exp;
  if ((target - cur > 0) === (out > target)) { out = target; nv = 0; }
  return [out, nv];
}
