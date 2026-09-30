/* ===== مغامرة زاكي 2 — أدوات عامة وحفظ التقدم ===== */
(() => {
'use strict';
const Z = window.Z = {};
Z.T = 16; Z.VW = 320; Z.VH = 180;
Z.NW = 24; Z.NS = 4; Z.NLEV = 96;
Z.CFG = window.GAME_CONFIG || {};

Z.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Z.lerp = (a, b, t) => a + (b - a) * t;
Z.sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;
Z.rnd = (a, b) => a + Math.random() * (b - a);
Z.rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
Z.rng = function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
Z.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ألوان: تدوير الصبغة لعوالم الدورة الثانية
Z.hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
Z.rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Z.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
Z.mix = (a, b, t) => { const A = Z.hex2rgb(a), B = Z.hex2rgb(b); return Z.rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
Z.shade = (h, k) => k < 0 ? Z.mix(h, '#000000', -k) : Z.mix(h, '#ffffff', k);
Z.hueRot = (hex, deg) => {
  let [r, g, b] = Z.hex2rgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  h = (h + deg) % 360;
  const f = n => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return Z.rgb2hex(f(0) * 255, f(8) * 255, f(4) * 255);
};

// ===== حفظ التقدم =====
const KEY = 'zaki2';
Z.prog = { unlocked: 0, best: 0, coins: 0, gems: {}, medals: {}, hero: 0, sfx: true, music: true, vib: true, seenHints: {}, plays: 0 };
try { Object.assign(Z.prog, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
try { const old = JSON.parse(localStorage.getItem('zaki1') || 'null'); if (old && !localStorage.getItem(KEY)) { Z.prog.unlocked = old.unlocked || 0; Z.prog.best = old.best || 0; } } catch (e) {}
Z.save = () => { try { localStorage.setItem(KEY, JSON.stringify(Z.prog)); } catch (e) {} };
Z.gemsTotal = () => Object.values(Z.prog.gems).reduce((a, m) => a + (m ? [1, 2, 4].reduce((c, b, i) => c + ((m & b) ? 1 : 0), 0) : 0), 0);
Z.gemsOf = idx => { const m = Z.prog.gems[idx] || 0; return (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0); };
// الشخصيات: الفتح حسب عدد الجواهر
Z.HEROES = [
  { id: 0, name: 'زاكي', need: 0, desc: 'متوازن • قفز مزدوج قوي', speed: 1.0, jump: 1.0, hp: 3, stat: [3, 3, 3] },
  { id: 1, name: 'لينا', need: 24, desc: 'سريعة • تنزلق في الهواء', speed: 1.1, jump: 1.0, hp: 3, stat: [4, 3, 2] },
  { id: 2, name: 'عمر', need: 60, desc: 'قوي • ضربة أرضية مدمّرة', speed: 0.94, jump: 0.97, hp: 4, stat: [2, 3, 5] },
];
Z.heroUnlocked = i => Z.gemsTotal() >= Z.HEROES[i].need;
})();
