/* ===== البيئات ومولّد المراحل ===== */
(() => {
'use strict';
const Z = window.Z, T = Z.T;

/* ---------------- البيئات (12) ---------------- */
const TH = [
  { key: 'meadow', name: 'المروج الخضراء', sky: ['#3f86e0', '#86c6fb', '#d6f0ff'], top: '#4cc236', ground: '#b8642c', brick: '#c8683a', far: '#a6cdea', mid: '#62bb5c', near: '#2f8f3a', accent: '#ffd54a',
    foes: ['blob', 'snail', 'frog', 'bat'], boss: 'golem', deco: ['tree', 'tree', 'bush', 'flower', 'flower', 'rock'], weather: 'leaves', music: { bpm: 124, root: 57, scale: 'major', leadWave: 'triangle', seed: 11 },
    pieces: ['spring', 'hatch', 'shaft', 'moving', 'stairs', 'hill'] },
  { key: 'desert', name: 'صحراء الشمس', sky: ['#e8823a', '#f6bd6c', '#fde6b4'], top: '#efc978', ground: '#cf9848', brick: '#c47a3a', far: '#e2a866', mid: '#d69a58', near: '#b47a3a', accent: '#ffe08a',
    foes: ['blob', 'spiny', 'thrower', 'bat'], boss: 'charger', deco: ['cactus', 'cactus', 'rock', 'bones', 'dune'], weather: 'sand', music: { bpm: 112, root: 55, scale: 'phryg', leadWave: 'triangle', seed: 22 },
    pieces: ['cannon', 'moving', 'spikes', 'hatch', 'spring', 'pipes', 'hill'] },
  { key: 'cave', name: 'كهوف الظلام', sky: ['#04050e', '#0d1230', '#19204c'], top: '#5b6fd8', ground: '#2c3a8c', brick: '#3a4cb0', far: '#111744', mid: '#1a2360', near: '#0b0f30', accent: '#7fe8ff', dark: 1,
    foes: ['blob', 'spiny', 'bat', 'snail'], boss: 'flyer', deco: ['crystal', 'crystal', 'stalag', 'mushroom', 'torch'], weather: 'drips', music: { bpm: 100, root: 52, scale: 'minor', leadWave: 'sine', seed: 33 },
    pieces: ['crusher', 'falling', 'spikes', 'shaft', 'hatch', 'stairs', 'spring'] },
  { key: 'snow', name: 'جبال الثلج', sky: ['#78aae8', '#b8d4f6', '#ecf5ff'], top: '#ffffff', ground: '#7f9fcb', brick: '#6a8ac0', far: '#c4dcf6', mid: '#a4c4ea', near: '#86aad8', accent: '#bff0ff', ice: 1,
    foes: ['blob', 'snail', 'thrower', 'frog'], boss: 'thrower', deco: ['pine', 'pine', 'snowman', 'rock', 'ice'], weather: 'snow', music: { bpm: 108, root: 60, scale: 'dorian', leadWave: 'triangle', seed: 44 },
    pieces: ['ice', 'ice', 'spring', 'moving', 'shaft', 'hatch', 'hill', 'stairs'] },
  { key: 'forest', name: 'غابة الليل', sky: ['#080826', '#221856', '#48297a'], top: '#3fae7c', ground: '#3a2a5c', brick: '#584090', far: '#191545', mid: '#1f1e66', near: '#0f0c2e', accent: '#c8ff7a', dark: 0.55,
    foes: ['ghost', 'frog', 'bat', 'thrower'], boss: 'ghost', deco: ['tree', 'mushroom', 'lantern', 'mushroom', 'rock'], weather: 'fireflies', music: { bpm: 96, root: 50, scale: 'minor', leadWave: 'sine', seed: 55 },
    pieces: ['shaft', 'spikes', 'hatch', 'spring', 'falling', 'stairs', 'hill', 'pipes'] },
  { key: 'volcano', name: 'بركان النار', sky: ['#260505', '#84200f', '#e0581a'], top: '#e2521c', ground: '#4c1e18', brick: '#803224', far: '#5a1810', mid: '#7a2416', near: '#3a0f0c', accent: '#ffb030', lava: 1,
    foes: ['spiny', 'charger', 'blob', 'bat'], boss: 'fire', deco: ['rock', 'lavaplant', 'rock', 'skull'], weather: 'embers', music: { bpm: 132, root: 53, scale: 'phryg', leadWave: 'sawtooth', seed: 66 },
    pieces: ['falling', 'falling', 'moving', 'cannon', 'spikes', 'conveyor', 'lift', 'hill'] },
  { key: 'sky', name: 'جزر السماء', sky: ['#3894ff', '#88cdff', '#e2f6ff'], top: '#ffd0ee', ground: '#e6eeff', brick: '#8fb0f0', far: '#cfe8ff', mid: '#b8dcff', near: '#9bc8f8', accent: '#fff08a', island: 1,
    foes: ['bat', 'frog', 'thrower', 'blob'], boss: 'flyer', deco: ['flower', 'cloudpuff', 'flower', 'bush'], weather: 'wind', music: { bpm: 128, root: 62, scale: 'major', leadWave: 'triangle', seed: 77 },
    pieces: ['moving', 'moving', 'lift', 'spring', 'spring', 'falling', 'cannon'] },
  { key: 'castle', name: 'قلعة الملك', sky: ['#0c0616', '#2a1a44', '#4a3068'], top: '#9494b8', ground: '#484858', brick: '#68587a', far: '#1a1228', mid: '#261a3a', near: '#120c1e', accent: '#ff7a5a', lava: 1, dark: 0.45,
    foes: ['ghost', 'spiny', 'thrower', 'blob'], boss: 'king', deco: ['torch', 'banner', 'pillar', 'torch'], weather: 'dust', music: { bpm: 118, root: 49, scale: 'minor', leadWave: 'sawtooth', seed: 88 },
    pieces: ['crusher', 'crusher', 'cannon', 'spikes', 'falling', 'lift', 'stairs', 'moving'] },
  { key: 'ocean', name: 'أعماق المحيط', sky: ['#0a5896', '#2a98d0', '#8ee0f0'], top: '#f0d890', ground: '#c0a060', brick: '#e08a70', far: '#5ab8e0', mid: '#3a9ac8', near: '#2478a8', accent: '#9ff0ff', water: 1,
    foes: ['blob', 'frog', 'thrower', 'bat'], boss: 'thrower', deco: ['coral', 'seaweed', 'shell', 'coral'], weather: 'bubbles', music: { bpm: 104, root: 55, scale: 'pent', leadWave: 'sine', seed: 99 },
    pieces: ['water', 'water', 'water', 'spring', 'hatch', 'moving', 'hill'] },
  { key: 'jungle', name: 'الغابة المطيرة', sky: ['#167648', '#54bc84', '#c4eebc'], top: '#2fa030', ground: '#5a3a1c', brick: '#8a5a2c', far: '#4ea070', mid: '#2e8850', near: '#1a6a34', accent: '#ffe04a',
    foes: ['frog', 'thrower', 'charger', 'snail'], boss: 'golem', deco: ['palm', 'fern', 'flower', 'palm', 'fern'], weather: 'rain', music: { bpm: 120, root: 57, scale: 'dorian', leadWave: 'triangle', seed: 110 },
    pieces: ['pipes', 'pipes', 'shaft', 'spring', 'water', 'moving', 'hatch', 'hill'] },
  { key: 'ruins', name: 'الآثار القديمة', sky: ['#d09048', '#eec284', '#fff0cc'], top: '#c8b070', ground: '#8a7a58', brick: '#a08a60', far: '#d6b078', mid: '#bd9a62', near: '#8e7444', accent: '#7affd4',
    foes: ['charger', 'thrower', 'ghost', 'spiny'], boss: 'charger', deco: ['pillar', 'statue', 'torch', 'pillar', 'rock'], weather: 'dust', music: { bpm: 114, root: 52, scale: 'phryg', leadWave: 'triangle', seed: 121 },
    pieces: ['crusher', 'hatch', 'hatch', 'cannon', 'spikes', 'falling', 'lift', 'stairs'] },
  { key: 'space', name: 'المجرّة النيون', sky: ['#05000f', '#1a0a40', '#4a1a80'], top: '#ff5ad8', ground: '#2a1660', brick: '#5a2aa8', far: '#2a1060', mid: '#3a1a80', near: '#1a0a40', accent: '#5affff', lowGrav: 1, island: 1, dark: 0.3,
    foes: ['bat', 'blob', 'ghost', 'thrower'], boss: 'king', deco: ['crystal', 'antenna', 'crystal'], weather: 'stars', music: { bpm: 136, root: 57, scale: 'minor', leadWave: 'square', seed: 132 },
    pieces: ['moving', 'moving', 'lift', 'spring', 'spring', 'falling', 'cannon'] },
];
Z.THEMES = TH;
const cache = {};
Z.themeFor = w => {
  const bi = w % 12, cyc = Math.floor(w / 12), k = bi + ':' + cyc;
  if (cache[k]) return cache[k];
  const b = TH[bi], t = Object.assign({}, b);
  t.biome = bi; t.cycle = cyc; t.name = b.name + (cyc ? ' ٢' : '');
  if (cyc) { const rot = 28; ['top', 'brick', 'accent', 'mid', 'near', 'far'].forEach(f => t[f] = Z.hueRot(b[f], rot)); t.sky = b.sky.map(c => Z.hueRot(c, rot)); }
  t.music = Object.assign({}, b.music, cyc ? { bpm: b.music.bpm + 12, seed: b.music.seed + 7 } : {});
  return cache[k] = t;
};
Z.worldName = w => Z.themeFor(w).name;

Z.SOLID = new Set(['#', 'B', 'H', '?', '!', 'l', 'r', 'L', 'R', 'D', 'X', 'I', 'C', 'c', 'E', 'Q']);

/* ---------------- المولّد ---------------- */
Z.genLevel = function (w, s) {
  const idx = w * 4 + s, d = idx / 95, boss = s === 3, th = Z.themeFor(w), bi = th.biome;
  const rnd = Z.rng(idx * 7919 + 101);
  const R = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = p => rnd() < p;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const H = 26, base = H - 5;
  const W = boss ? 200 + R(0, 10) : 250 + R(0, 50) + Math.floor(d * 110);
  const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill('.'));
  const surf = new Int16Array(W).fill(-1);
  const q = new Map(), spawns = [], plats = [], deco = [], hints = [], gemMap = new Map();
  const haz = th.lava ? 'V' : (th.key === 'cave' ? 'S' : null);
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const get = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? '#' : g[y][x];
  const thick = th.island ? 3 : H;
  function ground(x0, x1, gy, top) {
    for (let x = x0; x < x1 && x < W; x++) { surf[x] = gy; for (let y = gy; y < Math.min(H, gy + thick); y++) g[y][x] = '#'; if (top) g[gy][x] = top; }
  }
  function chasm(x0, x1) {
    for (let x = x0; x < x1 && x < W; x++) { surf[x] = -1; for (let y = 0; y < H; y++) g[y][x] = '.'; if (haz) { g[H - 1][x] = haz; g[H - 2][x] = haz; g[H - 3][x] = haz; } }
  }
  const gemsLeft = [0, 1, 2];
  const placeGem = (x, y) => { if (!gemsLeft.length) return false; const k = gemsLeft.shift(); set(x, y, 'G'); gemMap.set(x + ',' + y, k); return true; };
  const qc = early => { if (early) return 'mush'; const r = rnd(); return r < 0.46 ? 'coin' : r < 0.62 ? 'mush' : r < 0.74 ? 'fire' : r < 0.83 ? 'feather' : r < 0.9 ? 'star' : 'life'; };
  const qblock = (x, y, c) => { set(x, y, '?'); q.set(x + ',' + y, c || qc()); };

  // الأعداء المسموحة حسب الصعوبة
  const gate = { blob: 0, snail: 0.03, frog: 0.04, spiny: 0.14, thrower: 0.2, charger: 0.22, ghost: 0.1, bat: 0.08 };
  const foes = th.foes.filter(f => d >= (gate[f] || 0));
  if (!foes.length) foes.push('blob');
  const groundFoes = foes.filter(f => f !== 'bat' && f !== 'ghost');
  const airFoes = foes.filter(f => f === 'bat' || f === 'ghost');
  const addFoe = (x, gy, kind) => { kind = kind || (groundFoes.length ? pick(groundFoes) : 'blob'); spawns.push({ t: kind, x, y: gy }); };
  const addAir = (x, y) => { if (airFoes.length) spawns.push({ t: pick(airFoes), x, y }); };
  const decoKinds = th.deco;
  const flats = [];
  const dress = (x, len, gy, opts) => {
    opts = opts || {};
    for (let i = 0; i < len; i++) if (chance(0.14) && !opts.noDeco) deco.push({ t: pick(decoKinds), x: x + i, y: gy });
    if (chance(0.42)) for (let i = 1; i < len - 1; i++) set(x + i, gy - 2, 'o');
    if (len >= 5 && chance(0.3 + d * 0.2)) { const bx = x + R(1, len - 3); if (chance(0.5)) qblock(bx, gy - 4); else { set(bx, gy - 4, 'B'); qblock(bx + 1, gy - 4); set(bx + 2, gy - 4, 'B'); } }
    if (!opts.noFoes && len >= 5) {
      const n = chance(0.5 + d * 0.4) ? R(1, 1 + Math.floor(d * 2.5)) : 0;
      for (let i = 0; i < n; i++) addFoe(x + 1 + Math.floor((len - 2) * (i + 0.5) / n), gy);
      if (airFoes.length && chance(0.12 + d * 0.22)) addAir(x + Math.floor(len / 2), gy - R(4, 6));
    }
    if (len >= 6) flats.push({ x, len, gy });
  };
  const maxGap = () => Z.clamp(2 + Math.floor(d * 2.6), 2, d > 0.55 ? 5 : 4);

  /* ---- القطع ---- */
  const P = {};
  P.flat = (x, gy) => { const len = R(5, 10); ground(x, x + len, gy); dress(x, len, gy); return [x + len, gy]; };
  P.gap = (x, gy) => {
    ground(x, x + 3, gy);
    const gw = Z.clamp(R(2, maxGap()), 2, d > 0.55 ? 5 : 4);
    chasm(x + 3, x + 3 + gw);
    for (let i = 0; i < gw; i++) set(x + 3 + i, gy - 2 - (Math.abs(i - (gw - 1) / 2) > 0.8 ? 0 : 1), 'o');
    if (gw >= 4 && chance(0.6)) set(x + 3 + (gw >> 1), gy - 2, chance(0.5) ? 'B' : 'T');
    if (th.lava && chance(0.5)) spawns.push({ t: 'fireball', x: x + 3 + (gw >> 1), y: H - 3, h: 9 });
    ground(x + 3 + gw, x + 6 + gw, gy);
    return [x + 6 + gw, gy];
  };
  P.stairs = (x, gy) => {
    const n = R(2, 4), hs = []; for (let i = 1; i <= n; i++) hs.push(i); hs.push(n); for (let i = n - 1; i >= 1; i--) hs.push(i);
    hs.forEach((h, i) => { ground(x + i, x + i + 1, gy - h); set(x + i, gy - h, '#'); });
    for (let i = 0; i < hs.length; i++) if (chance(0.5)) set(x + i, gy - hs[i] - 2, 'o');
    ground(x + hs.length, x + hs.length + 3, gy);
    return [x + hs.length + 3, gy];
  };
  P.hill = (x, gy) => {
    const rise = R(1, 3), tread = 3, top = R(6, 10);
    let cx = x;
    for (let r = 0; r < rise; r++) { ground(cx, cx + tread, gy - r); cx += tread; }
    ground(cx, cx + top, gy - rise); dress(cx, top, gy - rise); cx += top;
    for (let r = rise - 1; r >= 0; r--) { ground(cx, cx + tread, gy - r); cx += tread; }
    return [cx, gy];
  };
  P.plat = (x, gy) => {
    const len = R(5, 9); ground(x, x + len + 2, gy);
    const y1 = gy - 4;
    for (let i = 0; i < len; i++) { if (chance(0.25)) qblock(x + i, y1); else set(x + i, y1, chance(0.75) ? 'B' : 'T'); }
    if (chance(0.55)) for (let i = 0; i < len; i++) set(x + i, y1 - 2, 'o');
    if (len >= 6 && chance(0.6)) { for (let i = 1; i < len - 1; i++) set(x + i, y1 - 4, chance(0.15) ? '?' : 'T'); for (let i = 1; i < len - 1; i++) if (g[y1 - 4][x + i] === '?') q.set((x + i) + ',' + (y1 - 4), qc()); if (chance(0.6)) placeGem(x + (len >> 1), y1 - 6); }
    if (chance(0.5 + d * 0.3)) addFoe(x + R(1, len - 2), gy);
    for (let i = 0; i < len + 2; i++) if (chance(0.1)) deco.push({ t: pick(decoKinds), x: x + i, y: gy });
    return [x + len + 2, gy];
  };
  P.pipes = (x, gy) => {
    ground(x, x + 3, gy); let cx = x + 3; const n = R(1, 3);
    for (let k = 0; k < n; k++) {
      const h = R(2, 3);
      for (let j = 0; j < h; j++) { const y = gy - h + j; set(cx, y, j === 0 ? 'l' : 'L'); set(cx + 1, y, j === 0 ? 'r' : 'R'); }
      ground(cx, cx + 2, gy);
      for (let j = 0; j < h; j++) { const y = gy - h + j; set(cx, y, j === 0 ? 'l' : 'L'); set(cx + 1, y, j === 0 ? 'r' : 'R'); }
      if (d > 0.12 && chance(0.5 + d * 0.3)) spawns.push({ t: 'piranha', x: cx + 1, y: gy - h });
      set(cx, gy - h - 2, 'o'); set(cx + 1, gy - h - 2, 'o');
      ground(cx + 2, cx + 7, gy); cx += 7;
    }
    return [cx, gy];
  };
  P.spikes = (x, gy) => {
    const len = R(2, 3); ground(x, x + 4, gy); ground(x + 4, x + 4 + len, gy);
    for (let i = 0; i < len; i++) { set(x + 4 + i, gy - 1, 'S'); set(x + 4 + i, gy - 3, 'o'); }
    ground(x + 4 + len, x + 8 + len, gy);
    if (chance(0.5)) addFoe(x + 6 + len, gy);
    return [x + 8 + len, gy];
  };
  P.moving = (x, gy) => {
    const cw = R(7, 10); ground(x, x + 3, gy); chasm(x + 3, x + 3 + cw); ground(x + 3 + cw, x + 6 + cw, gy);
    plats.push({ k: 'h', x0: (x + 3) * T, x1: (x + cw) * T, y0: gy * T, y1: gy * T, w: 3 * T, speed: 0.7 + d * 0.5 });
    for (let i = 1; i < cw - 1; i++) set(x + 3 + i, gy - 3 - (i % 2), 'o');
    if (th.lava && chance(0.6)) spawns.push({ t: 'fireball', x: x + 3 + (cw >> 1), y: H - 3, h: 10 });
    if (chance(0.4)) placeGem(x + 3 + (cw >> 1), gy - 6);
    return [x + 6 + cw, gy];
  };
  P.lift = (x, gy) => {
    if (gy < 14) return P.flat(x, gy);
    const up = 8; ground(x, x + 3, gy); ground(x + 3, x + 6, gy);
    ground(x + 6, x + 14, gy - up);
    plats.push({ k: 'v', x0: (x + 3) * T, x1: (x + 3) * T, y0: (gy - up) * T - 3, y1: gy * T, w: 3 * T, speed: 0.6 });
    for (let i = 0; i < up; i += 2) set(x + 4, gy - 2 - i, 'o');
    dress(x + 6, 8, gy - up);
    return [x + 14, gy - up];
  };
  P.drop = (x, gy) => {
    if (gy > base - 7) return P.flat(x, gy);
    const dn = 8; ground(x, x + 4, gy); ground(x + 4, x + 12, gy + dn); dress(x + 4, 8, gy + dn, { noDeco: true });
    set(x + 4, gy + dn - 3, 'o'); set(x + 3, gy - 2, 'o'); set(x + 4, gy, 'o'); set(x + 5, gy + 2, 'o');
    return [x + 12, gy + dn];
  };
  P.falling = (x, gy) => {
    const n = R(3, 4); ground(x, x + 3, gy); let cx = x + 3;
    chasm(cx, cx + n * 5 + 1);
    for (let k = 0; k < n; k++) { for (let i = 0; i < 3; i++) { set(cx + 1 + k * 5 + i, gy, 'Q'); set(cx + 1 + k * 5 + i, gy - 2, 'o'); } }
    cx += n * 5 + 1; ground(cx, cx + 3, gy);
    if (th.lava && chance(0.5)) spawns.push({ t: 'fireball', x: x + 3 + 2 * n, y: H - 3, h: 11 });
    return [cx + 3, gy];
  };
  P.cannon = (x, gy) => {
    const len = 16; ground(x, x + len, gy);
    const cx = x + len - 3;
    // جدار منخفض (كتلتان) قابل للقفز فوقه، وفيه مدفع أرضي
    set(cx, gy - 1, 'H'); set(cx, gy - 2, 'H'); set(cx - 1, gy - 1, 'E'); spawns.push({ t: 'cannon', x: cx - 1, y: gy - 1, dir: -1, delay: 0 });
    // مدفع عالٍ معلّق يطلق على مستوى الرأس
    set(cx - 6, gy - 5, 'E'); spawns.push({ t: 'cannon', x: cx - 6, y: gy - 5, dir: -1, delay: 70 });
    for (let i = 2; i < 9; i++) if (chance(0.5)) set(x + i, gy - 2, 'o');
    if (d > 0.4 && chance(0.5)) addFoe(x + 4, gy);
    return [x + len, gy];
  };
  P.crusher = (x, gy) => {
    const len = R(14, 20); ground(x, x + len, gy);
    for (let i = 0; i < len; i++) set(x + i, gy - 7, 'H');
    let cx = x + 4;
    while (cx < x + len - 3) { spawns.push({ t: 'crusher', x: cx, y0: gy - 6, y1: gy - 2, ph: R(0, 60) }); for (let j = 0; j < 4; j++) set(cx + (j % 2), gy - 3 - (j >> 1), '.'); cx += R(5, 6); }
    for (let i = 2; i < len - 2; i++) if (chance(0.35)) set(x + i, gy - 2, 'o');
    return [x + len, gy];
  };
  P.spring = (x, gy) => {
    ground(x, x + 12, gy); set(x + 2, gy - 1, 'P');
    const hy = gy - 9; for (let i = 0; i < 5; i++) set(x + 5 + i, hy, chance(0.5) ? 'B' : 'T');
    for (let i = 0; i < 5; i++) set(x + 5 + i, hy - 2, 'o');
    if (chance(0.7)) placeGem(x + 7, hy - 4);
    for (let i = 0; i < 12; i++) if (chance(0.12)) deco.push({ t: pick(decoKinds), x: x + i, y: gy });
    return [x + 12, gy];
  };
  P.hatch = (x, gy) => {
    ground(x, x + 12, gy);
    for (let i = 4; i < 8; i++) { for (let j = 1; j <= 3; j++) set(x + i, gy + j, '.'); }
    for (let i = 5; i < 7; i++) set(x + i, gy, 'X');
    set(x + 5, gy + 2, 'o'); set(x + 6, gy + 2, 'o'); set(x + 4, gy + 3, 'o'); set(x + 7, gy + 3, 'o');
    if (!placeGem(x + 5, gy + 3) && chance(0.5)) set(x + 5, gy + 3, 'o');
    deco.push({ t: 'sparkle', x: x + 5, y: gy - 1 });
    set(x + 9, gy - 2, 'o');
    if (chance(0.5)) addFoe(x + 10, gy);
    return [x + 12, gy];
  };
  P.shaft = (x, gy) => {
    if (gy < 12) return P.flat(x, gy);
    const hh = 10, wlen = 16; ground(x, x + wlen, gy);
    for (let j = 1; j <= hh; j++) { set(x + 3, gy - j, 'H'); set(x + 7, gy - j, 'H'); }
    set(x + 3, gy - 1, '.'); set(x + 3, gy - 2, '.'); set(x + 7, gy - 1, '.'); set(x + 7, gy - 2, '.'); // مدخل ومخرج
    for (let j = 1; j <= hh; j += 3) set(x + 5, gy - j - 1, 'o');
    placeGem(x + 5, gy - hh - 1);
    set(x + 4, gy - hh, 'T'); set(x + 6, gy - hh, 'T');
    deco.push({ t: 'sparkle', x: x + 5, y: gy - hh });
    for (let i = 9; i < 15; i++) if (chance(0.3)) set(x + i, gy - 2, 'o');
    return [x + wlen, gy];
  };
  P.ice = (x, gy) => {
    const len = R(10, 16); ground(x, x + len, gy, 'I');
    if (chance(0.6)) { const sx = x + R(4, len - 6); for (let i = 0; i < 2; i++) set(sx + i, gy - 1, 'S'); }
    for (let i = 2; i < len - 2; i++) if (chance(0.3)) set(x + i, gy - 2, 'o');
    if (chance(0.5 + d * 0.3)) addFoe(x + R(3, len - 3), gy);
    return [x + len, gy];
  };
  P.conveyor = (x, gy) => {
    const len = R(8, 12), dir = chance(0.5); ground(x, x + 3, gy); chasm(x + 3, x + 3 + len);
    for (let i = 0; i < len; i++) { if (i % 3 !== 2) set(x + 3 + i, gy, dir ? 'C' : 'c'); }
    for (let i = 0; i < len; i++) if (chance(0.4)) set(x + 3 + i, gy - 2, 'o');
    if (th.lava) spawns.push({ t: 'fireball', x: x + 3 + (len >> 1), y: H - 3, h: 9 });
    ground(x + 3 + len, x + 6 + len, gy);
    return [x + 6 + len, gy];
  };
  P.water = (x, gy) => {
    const len = R(12, 18), dep = 5; ground(x, x + 2, gy);
    const px = x + 2; ground(px, px + len, gy + dep);
    for (let i = px; i < px + len; i++) for (let j = 0; j < dep; j++) set(i, gy + j, j === 0 ? 'w' : 'W');
    for (let i = 1; i < len - 1; i++) if (chance(0.4)) set(px + i, gy + 2, 'o');
    const nf = R(2, 3 + Math.floor(d * 2)); for (let k = 0; k < nf; k++) spawns.push({ t: 'fish', x: px + 3 + Math.floor((len - 6) * (k + 0.5) / nf), y: gy + R(1, 3), r: 4 });
    if (len >= 14) { for (let i = 0; i < 3; i++) set(px + 5 + i, gy + dep - 1, 'S'); }
    for (let i = 0; i < 4; i++) set(px + 3 + i * 3, gy + 3, 'T');
    if (chance(0.65)) placeGem(px + (len >> 1), gy + dep - 1);
    ground(px + len, px + len + 3, gy);
    return [px + len + 3, gy];
  };
  P.enemies = (x, gy) => { const len = R(8, 12); ground(x, x + len, gy); dress(x, len, gy, { noFoes: true }); const n = R(2, 3 + Math.floor(d * 2)); for (let i = 0; i < n; i++) addFoe(x + 2 + i * 3, gy); return [x + len, gy]; };

  /* ---- ترتيب المرحلة ---- */
  const gates = { shaft: 0.08, lift: 0.1, cannon: 0.12, crusher: 0.08, falling: 0.06, moving: 0.03, conveyor: 0.12, spikes: 0.05, hatch: 0, spring: 0, ice: 0, water: 0, drop: 0.05, pipes: 0, hill: 0, stairs: 0 };
  const tut = idx < 3; // مراحل التعلّم
  let weights = ['flat', 'flat', 'gap', 'plat', 'plat', 'enemies'].concat(th.pieces).filter(k => d >= (gates[k] || 0) || (!tut && k === 'hatch'));
  if (!weights.length) weights = ['flat', 'gap'];
  if (th.island || bi === 11) weights = weights.concat(['gap', 'gap', 'gap']);
  if (tut) weights = ['flat', 'flat', 'gap', 'plat', 'stairs', 'pipes', 'hill', 'spring', 'hatch', 'shaft', 'enemies'].filter(k => !(k === 'gap' && false));
  if (idx === 0) weights = ['flat', 'flat', 'gap', 'plat', 'stairs', 'pipes', 'enemies'];
  if (idx === 1) weights = ['flat', 'gap', 'plat', 'spring', 'stairs', 'enemies', 'hill'];

  const endX = boss ? W - 62 : W - 30;
  let x = 12, gy = base; ground(0, 12, gy);
  set(5, gy - 4, 'B'); qblock(6, gy - 4, 'mush'); set(7, gy - 4, 'B');
  for (let i = 9; i < 12; i++) set(i, gy - 2, 'o');
  const pieceLog = []; let last = '', dropDone = false, liftUsed = 0;
  const needHatch = () => gemsLeft.length >= 2;
  let guard = 0;
  while (x < endX && guard++ < 400) {
    let k = pick(weights);
    if (x + 26 > endX) k = 'flat';
    if (k === last && !['flat', 'plat', 'gap', 'enemies'].includes(k)) k = 'flat';
    if (k === 'lift' && liftUsed >= 2) k = 'plat';
    if (gy < base - 5 && !dropDone && chance(0.35) && x > 60) { k = 'drop'; dropDone = true; }
    if ((k === 'lift') && gy < 14) k = 'flat';
    if (tut && idx === 2 && x > 40 && !P._sh) { k = 'shaft'; P._sh = 1; }
    if (tut && idx === 1 && x > 40 && !P._sp) { k = 'spring'; P._sp = 1; }
    if (P[k] === undefined) k = 'flat';
    last = k; if (k === 'lift') { liftUsed++; dropDone = false; }
    const px0 = x; [x, gy] = P[k](x, gy); pieceLog.push({ k, x0: px0, x1: x });
    if (gy < base - 12 && k !== 'lift') { /* نتأكد أن الارتفاع لا يتجاوز الحد */ }
    if (gy > base) gy = base;
  }
  // العودة للأرض الأساسية قبل النهاية إن لزم
  if (gy < base - 4) { ground(x, x + 4, gy); [x, gy] = P.drop(x, gy); if (gy < base - 4) { ground(x, x + 12, gy); x += 12; } }

  // جواهر احتياطية: تحتاج قفزاً مزدوجاً
  let gtries = 0;
  while (gemsLeft.length && flats.length && gtries++ < 20) { const f = flats[Math.floor(rnd() * flats.length)]; const gx = f.x + (f.len >> 1); if (get(gx, f.gy - 7) === '.') placeGem(gx, f.gy - 7); }
  while (gemsLeft.length) placeGem(30 + 20 * gemsLeft.length, gy - 7);

  // الأرضية النهائية والعلم
  const fgy = gy;
  for (let xx = endX; xx < W; xx++) for (let y = 0; y < H; y++) if (y < fgy && !['G'].includes(g[y][xx])) g[y][xx] = '.';
  ground(endX, W, fgy);
  let arena = null;
  if (boss) {
    const al = W - 56, ar = al + 20; arena = { l: al, r: ar, gy: fgy, gate: ar, entry: al - 1 };
    ground(al - 6, W, fgy);
    for (let xx = al - 6; xx <= al - 1; xx++) for (let y = 0; y < fgy; y++) g[y][xx] = '.';
    for (let xx = al; xx < ar; xx++) set(xx, fgy - 13, 'H');
    for (let y = 0; y < fgy - 13; y++) { set(al - 1, y, 'H'); }
    for (let y = fgy - 13; y < fgy; y++) set(ar, y, 'D');
    for (let y = 0; y < fgy - 13; y++) set(ar, y, 'H');
    for (let i = 0; i < 3; i++) { set(al + 4 + i, fgy - 4, 'T'); set(al + 13 + i, fgy - 4, 'T'); }
    qblock(al + 10, fgy - 6, 'mush');
    spawns.push({ t: 'boss', x: al + 14, y: fgy, kind: th.boss, tier: w });
  }
  const fx = W - 14;
  for (let y = fgy - 10; y < fgy - 1; y++) set(fx, y, 'F');
  set(fx, fgy - 1, 'H');

  // نقاط الحفظ
  const cps = [];
  [0.34, 0.67].forEach(fr => {
    let cx = Math.floor(W * fr), ok = -1;
    for (let dx = 0; dx < 60 && ok < 0; dx++) for (const sgn of [1, -1]) { const c = cx + dx * sgn; if (c < 20 || c > endX - 10) continue; let good = true; for (let i = -2; i <= 2; i++) { if (surf[c + i] !== surf[c] || surf[c] < 0 || get(c + i, surf[c] - 1) !== '.' || get(c + i, surf[c] - 2) !== '.' || get(c + i, surf[c] - 3) !== '.') good = false; } if (good) { ok = c; break; } }
    if (ok >= 0) { set(ok, surf[ok] - 1, 'K'); cps.push({ x: ok, y: surf[ok] }); }
  });

  // إرشادات التعلّم
  if (idx === 0) hints.push({ x: 4, text: 'استخدم ◀ ▶ للحركة و A للقفز' }, { x: 22, text: 'اقفز فوق الأعداء لتهزمهم!' }, { x: 40, text: 'اضرب صناديق ? من الأسفل للحصول على المكافآت' }, { x: 70, text: 'اجمع 3 جواهر مخبأة في كل مرحلة 💎' });
  if (idx === 1) hints.push({ x: 4, text: 'اضغط A مرة ثانية في الهواء = قفز مزدوج' }, { x: 28, text: 'زر الاندفاع B يكسر الطوب ويهزم الأعداء' }, { x: 60, text: 'اقفز فوق النابض للوصول للأعلى' });
  if (idx === 2) hints.push({ x: 4, text: 'اقفز نحو الجدار ثم اضغط A لتتسلقه' }, { x: 26, text: 'اضغط ▼ في الهواء = ضربة أرضية تكسر الشقوق' }, { x: 60, text: 'اجمع الجواهر لفتح شخصيات جديدة!' });
  if (idx === 3) hints.push({ x: 8, text: 'اهزم الزعيم بالقفز فوقه أو بالنار!' });

  return { W, H, g, surf, q, gemMap, spawns, plats, deco, hints, theme: th, biome: bi, w, s, idx, boss, arena, fx, gy: fgy, base, cps,
    pieces: pieceLog, start: { x: 3, y: base }, time: boss ? 480 : 600, endX, lowGrav: !!th.lowGrav };
};
})();
