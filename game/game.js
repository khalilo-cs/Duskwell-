(() => {
'use strict';
/* ===================== مغامرة زاكي — لعبة منصات كلاسيكية ===================== */
const T = 16, VW = 256, VH = 224, ROWS = 14, SC = 2;
const NW = 24, NS = 4, NLEV = NW * NS, PAGE = 12;
const CFG = window.GAME_CONFIG || {};
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
cv.width = VW * SC; cv.height = VH * SC;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------------------- الثيمات ---------------------------- */
const THEMES = [
  { name: 'المروج الخضراء', sky: ['#5c94fc', '#b4e0ff'], ground: '#c84c0c', top: '#38c020', brick: '#b03c00', hills: '#38a838', mode: 'day' },
  { name: 'صحراء الشمس', sky: ['#f8a850', '#fce8b0'], ground: '#d8a048', top: '#f0d078', brick: '#c07828', hills: '#e0a850', mode: 'day' },
  { name: 'كهوف الظلام', sky: ['#000010', '#101038'], ground: '#2038a0', top: '#3858d0', brick: '#2848b8', mode: 'cave' },
  { name: 'جبال الثلج', sky: ['#88b8f0', '#e8f4ff'], ground: '#7898c8', top: '#ffffff', brick: '#5878b0', hills: '#d0e4fa', mode: 'snow' },
  { name: 'غابة الليل', sky: ['#080828', '#302060'], ground: '#302050', top: '#40a060', brick: '#503080', hills: '#201848', mode: 'night' },
  { name: 'بركان النار', sky: ['#380808', '#c03010'], ground: '#582018', top: '#e04818', brick: '#783020', hills: '#501010', mode: 'lava' },
  { name: 'جزر السماء', sky: ['#40a8ff', '#d0f4ff'], ground: '#e8f0ff', top: '#ffc8ec', brick: '#90b0e8', mode: 'sky' },
  { name: 'قلعة الملك', sky: ['#100818', '#382848'], ground: '#404050', top: '#8080a0', brick: '#605070', mode: 'castle' },
];
const worldName = w => THEMES[w % 8].name + (w >= 8 ? ' ' + ['', '', '٢', '٣'][Math.floor(w / 8) + 1] : '');
const SOLID = new Set(['#', 'B', 'H', '?', '!', 'l', 'r', 'L', 'R', 'D']);

/* ---------------------------- توليد المراحل ---------------------------- */
function genLevel(w, s) {
  const idx = w * NS + s, d = idx / (NLEV - 1), boss = s === NS - 1;
  const rnd = mulberry32(idx * 7919 + 13);
  const R = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const th = boss ? THEMES[7] : THEMES[w % 8];
  const sky = !boss && w % 8 === 6;
  const W = boss ? 150 + R(0, 10) : 240 + R(0, 60) + Math.floor(d * 120);
  const g = []; for (let y = 0; y < ROWS; y++) g.push(new Array(W).fill('.'));
  const q = new Map(), spawns = [];
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) g[y][x] = c; };
  for (let x = 0; x < W; x++) { set(x, 12, '#'); set(x, 13, '#'); }
  const endX = boss ? W - 52 : W - 24;
  const qc = () => { const r = rnd(); return r < 0.62 ? 'coin' : r < 0.93 ? 'mush' : 'life'; };
  const pickEnemy = () => {
    const pool = ['blob', 'blob'];
    if (idx >= 3) pool.push('snail');
    if (idx >= 9) pool.push('spiny', 'snail');
    return pool[R(0, pool.length - 1)];
  };
  const groundEnemy = x => spawns.push({ t: pickEnemy(), x, y: 12 });
  const bat = x => spawns.push({ t: 'bat', x, y: R(6, 8) });

  // بداية آمنة مع كتلة الفطر
  set(9, 8, 'B'); set(10, 8, '?'); q.set('10,8', 'mush'); set(11, 8, 'B');
  set(13, 10, 'o'); set(14, 10, 'o'); set(15, 10, 'o');
  let x = 18;
  const kinds = ['flat', 'flat', 'gap', 'pipe', 'stairs', 'plat', 'plat', 'coins', 'spikes', 'enemies', 'enemies', 'enemies'];
  if (sky) kinds.push('gap', 'gap', 'gap', 'gap');
  if (boss) kinds.push('gap', 'gap');
  let last = '';
  while (x < endX) {
    let k = kinds[R(0, kinds.length - 1)];
    if (k === 'spikes' && idx < 7) k = 'enemies';
    if (k === last && (k === 'pipe' || k === 'stairs' || k === 'spikes')) k = 'flat';
    if (x + 14 > endX) k = 'flat';
    last = k;
    if (k === 'flat') {
      const len = R(3, 6);
      if (rnd() < 0.5) for (let i = 0; i < len; i++) set(x + i, 10, 'o');
      x += len;
    } else if (k === 'gap') {
      const gw = clamp(R(2, 2 + Math.floor(d * 3)) + (sky ? 1 : 0), 2, 5);
      for (let i = 0; i < gw; i++) { set(x + i, 12, '.'); set(x + i, 13, '.'); }
      for (let i = 0; i < gw; i++) set(x + i, 8 + (Math.abs(i - (gw - 1) / 2) > 0.8 ? 1 : 0), 'o');
      if (gw >= 4 && rnd() < 0.6) set(x + (gw >> 1), 9, 'B');
      x += gw + 4;
    } else if (k === 'pipe') {
      const h = R(2, 3);
      for (let j = 0; j < h; j++) { const y = 12 - h + j; set(x, y, j === 0 ? 'l' : 'L'); set(x + 1, y, j === 0 ? 'r' : 'R'); }
      if (rnd() < 0.4) { set(x, 12 - h - 2, 'o'); set(x + 1, 12 - h - 2, 'o'); }
      x += 5;
    } else if (k === 'stairs') {
      const n = R(2, 4), hs = [];
      for (let i = 1; i <= n; i++) hs.push(i);
      hs.push(n); for (let i = n - 1; i >= 1; i--) hs.push(i);
      hs.forEach((h, i) => { for (let j = 0; j < h; j++) set(x + i, 11 - j, 'H'); });
      x += hs.length + 3;
    } else if (k === 'plat') {
      const len = R(3, 7);
      for (let i = 0; i < len; i++) {
        if (rnd() < 0.3) { set(x + i, 8, '?'); q.set((x + i) + ',8', qc()); } else set(x + i, 8, 'B');
      }
      if (rnd() < 0.5) for (let i = 0; i < len; i++) set(x + i, 6, 'o');
      if (len >= 5 && rnd() < 0.4 + d * 0.3) {
        for (let i = 1; i < len - 1; i++) set(x + i, 5, rnd() < 0.2 ? '?' : 'B');
        for (let i = 1; i < len - 1; i++) if (g[5][x + i] === '?') q.set((x + i) + ',5', qc());
      }
      if (rnd() < 0.5 + d * 0.3) groundEnemy(x + R(0, len - 1));
      x += len + 3;
    } else if (k === 'coins') {
      for (let i = 0; i < 7; i++) set(x + i, 9 - Math.round(2 * Math.sin(i / 6 * Math.PI)), 'o');
      if (idx >= 6 && rnd() < 0.5) bat(x + 6);
      x += 10;
    } else if (k === 'spikes') {
      const len = R(2, 3);
      for (let i = 0; i < len; i++) set(x + i, 11, 'S');
      for (let i = 0; i < len; i++) set(x + i, 8, 'o');
      x += len + 4;
    } else if (k === 'enemies') {
      const len = R(7, 10), n = R(1, 1 + (d > 0.35 ? 1 : 0) + (d > 0.7 ? 1 : 0));
      for (let i = 0; i < n; i++) groundEnemy(x + 2 + i * 3);
      if (idx >= 8 && rnd() < 0.35) bat(x + len - 1);
      x += len;
    }
  }

  // نقطة الحفظ في منتصف المرحلة
  let cpX = -1;
  for (let cx = Math.floor(W / 2); cx < W - 40 && cpX < 0; cx++) {
    let ok = true;
    for (let i = -2; i <= 2; i++) if (g[12][cx + i] !== '#' || g[11][cx + i] !== '.' || g[10][cx + i] !== '.') ok = false;
    if (ok) cpX = cx;
  }
  if (cpX >= 0) set(cpX, 11, 'K');

  // الأرضية النهائية
  for (let xx = endX; xx < W; xx++) for (let y = 0; y < 12; y++) if (g[y][xx] !== '.' && xx >= endX) g[y][xx] = '.';
  for (let xx = endX; xx < W; xx++) { set(xx, 12, '#'); set(xx, 13, '#'); }
  const fx = W - 14;
  for (let y = 2; y < 11; y++) set(fx, y, 'F');
  set(fx, 11, 'H');
  let arenaL = 0, gateX = 0;
  if (boss) {
    arenaL = W - 48; gateX = W - 26;
    for (let xx = arenaL - 4; xx < gateX + 12; xx++) { set(xx, 12, '#'); set(xx, 13, '#'); }
    for (let i = 0; i < 3; i++) { set(arenaL + 6 + i, 9, 'B'); set(arenaL + 14 + i, 9, i === 1 ? '?' : 'B'); }
    q.set((arenaL + 15) + ',9', 'mush');
    for (let y = 0; y < 12; y++) set(gateX, y, 'D');
    spawns.push({ t: 'boss', x: gateX - 6, y: 12 });
  }
  return { W, g, q, spawns, theme: th, boss, sky, idx, w, s, time: boss ? 400 : 600, lava: th.mode === 'lava' || th.mode === 'castle', fx, arenaL, gateX };
}

/* ---------------------------- الصوت ---------------------------- */
let AC = null, muted = false, musicTimer = null;
try { muted = localStorage.getItem('zaki_mute') === '1'; } catch (e) {}
function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(f0, f1, dur, type = 'square', vol = 0.06, delay = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  jump: () => tone(300, 700, 0.18), coin: () => { tone(988, 988, 0.08); tone(1319, 1319, 0.25, 'square', 0.06, 0.07); },
  stomp: () => tone(220, 90, 0.12, 'square', 0.08), bump: () => tone(130, 90, 0.08, 'triangle', 0.1),
  brick: () => tone(200, 40, 0.2, 'sawtooth', 0.06), power: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.1, 'square', 0.06, i * 0.07)),
  life: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.12, 'square', 0.06, i * 0.09)),
  shrink: () => tone(600, 150, 0.35, 'sawtooth', 0.07), die: () => { [494, 466, 440, 415].forEach((f, i) => tone(f, f * 0.9, 0.2, 'square', 0.07, i * 0.16)); },
  kick: () => tone(500, 250, 0.1), flag: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.14, 'square', 0.06, i * 0.1)),
  boss: () => { tone(200, 40, 0.5, 'sawtooth', 0.1); tone(100, 30, 0.6, 'square', 0.08, 0.1); }, hit: () => tone(160, 60, 0.2, 'square', 0.09),
  cp: () => { tone(660, 880, 0.15); tone(880, 1320, 0.2, 'square', 0.06, 0.12); }, select: () => tone(660, 660, 0.05),
};
const sfx = n => { try { SFX[n] && SFX[n](); } catch (e) {} };
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 2, 4, 6, 9]];
function startMusic(w) {
  stopMusic(); if (!AC) return;
  const r = mulberry32(w * 31 + 5), sc = SCALES[w % 4], base = 174.6 * Math.pow(2, ((w * 5) % 12) / 12);
  const mel = [], bass = [];
  for (let i = 0; i < 32; i++) { mel.push(r() < 0.2 ? -1 : sc[Math.floor(r() * 5)] + (r() < 0.3 ? 12 : 0)); bass.push(i % 4 === 0 ? sc[Math.floor(r() * 3)] - 12 : -99); }
  let step = 0;
  musicTimer = setInterval(() => {
    if (muted || !AC || state !== 'play') return;
    const m = mel[step % 32], b = bass[step % 32];
    if (m >= 0) tone(base * Math.pow(2, m / 12), base * Math.pow(2, m / 12), 0.13, 'square', 0.025);
    if (b > -50) tone(base * Math.pow(2, b / 12), base * Math.pow(2, b / 12), 0.28, 'triangle', 0.06);
    step++;
  }, 150);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

/* ---------------------------- الإدخال ---------------------------- */
const down = new Set(), hit = new Set();
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump', KeyZ: 'jump', KeyK: 'jump', ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run', Enter: 'start', KeyP: 'pause', Escape: 'pause', KeyM: 'mute' };
addEventListener('keydown', e => { const a = KEYMAP[e.code]; if (!a) return; e.preventDefault(); initAudio(); if (!down.has(a)) hit.add(a); down.add(a); });
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) down.delete(a); });
addEventListener('blur', () => { down.clear(); if (state === 'play') state = 'paused'; });
document.querySelectorAll('[data-act]').forEach(b => {
  const a = b.dataset.act;
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); try { b.setPointerCapture(e.pointerId); } catch (_) {} if (!down.has(a)) hit.add(a); down.add(a); b.classList.add('on'); });
  const up = () => { down.delete(a); b.classList.remove('on'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
});
cv.addEventListener('pointerdown', e => {
  initAudio();
  const r = cv.getBoundingClientRect();
  tap((e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH);
});

/* ---------------------------- الحالة ---------------------------- */
let state = 'title', tick = 0, L = null, P = null, ents = [], items = [], parts = [], bumps = [], pops = [];
let cam = 0, score = 0, coins = 0, lives = 5, levelIdx = 0, time = 0, timeAcc = 0, introT = 0, clearT = 0, shake = 0, cpX = null, gameoverT = 0, combo = 0;
let prog = { unlocked: 0, best: 0 };
try { Object.assign(prog, JSON.parse(localStorage.getItem('zaki1') || '{}')); } catch (e) {}
const saveProg = () => { try { localStorage.setItem('zaki1', JSON.stringify(prog)); } catch (e) {} };
let selW = 0, selS = 0, menu = { items: [], sel: 0 };
let TC = {}; // ذاكرة مؤقتة للبلاط
const snow = Array.from({ length: 40 }, (_, i) => ({ x: (i * 53) % VW, y: (i * 97) % VH, s: 0.3 + (i % 5) * 0.15 }));

const tile = (tx, ty) => { if (tx < 0 || tx >= L.W) return 'H'; if (ty < 0 || ty >= ROWS) return '.'; return L.g[ty][tx]; };
const solidAt = (tx, ty) => SOLID.has(tile(tx, ty));

function startLevel(idx, keepCP) {
  levelIdx = idx; L = genLevel(Math.floor(idx / NS), idx % NS);
  if (!keepCP) cpX = null;
  buildTiles(L.theme);
  P = { x: 2 * T, y: 12 * T - 14, w: 12, h: 14, vx: 0, vy: 0, big: false, onG: true, face: 1, inv: 0, dead: false, deadT: 0, anim: 0, coyote: 0, jbuf: 0, flag: 0 };
  if (cpX !== null) { P.x = cpX * T; P.y = 12 * T - 14; }
  ents = L.spawns.map(mkEnemy); items = []; parts = []; bumps = []; pops = [];
  cam = clamp(P.x - VW / 2, 0, L.W * T - VW); time = L.time; timeAcc = 0; shake = 0; combo = 0;
  state = 'intro'; introT = 100; stopMusic();
}
function loseLife() {
  lives--;
  if (lives <= 0) { state = 'gameover'; gameoverT = 240; stopMusic(); prog.best = Math.max(prog.best, score); saveProg(); return; }
  startLevel(levelIdx, true);
}
function completeLevel() {
  try { CFG.onLevelEnd && CFG.onLevelEnd(levelIdx + 1); } catch (e) {}
  prog.unlocked = Math.max(prog.unlocked, Math.min(NLEV - 1, levelIdx + 1)); prog.best = Math.max(prog.best, score); saveProg();
  if (levelIdx >= NLEV - 1) { state = 'end'; stopMusic(); return; }
  startLevel(levelIdx + 1);
}
function newGame(idx) { score = 0; coins = 0; lives = 5; startLevel(idx); }

/* ---------------------------- الأعداء ---------------------------- */
const ESPEC = { blob: { w: 14, h: 14, spd: 0.5 }, snail: { w: 14, h: 14, spd: 0.45 }, spiny: { w: 14, h: 13, spd: 0.5 }, bat: { w: 14, h: 10, spd: 0.6 }, boss: { w: 30, h: 30, spd: 0.6 } };
function mkEnemy(s) {
  const sp = ESPEC[s.t], e = { t: s.t, w: sp.w, h: sp.h, x: s.x * T + (T - sp.w) / 2, y: s.t === 'bat' ? s.y * T : s.y * T - sp.h, vx: -sp.spd, vy: 0, face: -1, act: false, age: 0, state: 'walk', onG: false };
  if (s.t === 'bat') { e.by = e.y; }
  if (s.t === 'boss') { e.hp = e.max = 3 + Math.floor(L.w / 3); e.inv = 0; e.jt = 80; e.x = s.x * T; }
  return e;
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function moveX(e, dx) {
  e.x += dx; e.blockedX = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (solidAt(tx, ty)) { if (dx > 0) e.x = tx * T - e.w; else if (dx < 0) e.x = (tx + 1) * T; e.blockedX = true; return; }
  }
}
function moveY(e, dy) {
  e.y += dy; e.onG = false; e.bumpTile = null;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  if (dy > 0) {
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, y1)) { e.y = y1 * T - e.h; e.onG = true; e.vy = 0; return; }
  } else if (dy < 0) {
    let best = -1, bd = 1e9;
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, y0)) { const dd = Math.abs(tx * T + T / 2 - (e.x + e.w / 2)); if (dd < bd) { bd = dd; best = tx; } }
    if (best >= 0) { e.y = (y0 + 1) * T; e.vy = 0; e.bumpTile = [best, y0]; }
  }
}

function killEnemy(e, pts, vx) {
  if (e.dead) return; e.dead = true; e.vy = -4; e.vx = vx || (Math.random() < 0.5 ? -1.5 : 1.5);
  addScore(pts, e.x + e.w / 2, e.y);
}
function addScore(p, x, y) { score += p; if (x !== undefined) pops.push({ x, y, t: 0, txt: '' + p }); }
function stompEnemy(e) {
  combo++; const pts = [100, 200, 400, 800, 1000, 2000][Math.min(combo - 1, 5)];
  sfx('stomp');
  if (e.t === 'blob') { e.squash = 24; addScore(pts, e.x + 7, e.y); }
  else if (e.t === 'bat') killEnemy(e, pts);
  else if (e.t === 'snail') {
    if (e.state === 'walk') { e.state = 'shell'; e.vx = 0; e.h = 12; e.y += 2; addScore(pts, e.x + 7, e.y); }
    else if (e.state === 'slide') { e.state = 'shell'; e.vx = 0; addScore(pts, e.x + 7, e.y); }
  }
  else if (e.t === 'boss') {
    if (e.inv > 0) return;
    e.hp--; e.inv = 70; shake = 12; sfx('boss'); addScore(500, e.x + 15, e.y);
    if (e.hp <= 0) {
      e.dead = true; e.vy = -5; e.vx = 0; addScore(5000, e.x + 15, e.y - 10); shake = 30;
      for (let y = 0; y < 12; y++) if (L.g[y][L.gateX] === 'D') L.g[y][L.gateX] = '.';
      for (let i = 0; i < 12; i++) L.g[9 - (i % 3)][L.arenaL + 4 + i * 2] = 'o';
      L.bossDead = true; sfx('life');
    }
  }
}
function hurtPlayer() {
  if (P.inv > 0 || P.dead || P.flag) return;
  if (P.big) { P.big = false; P.y += 14; P.h = 14; P.inv = 120; sfx('shrink'); }
  else killPlayer();
}
function killPlayer() { if (P.dead) return; P.dead = true; P.vy = -7; P.deadT = 0; stopMusic(); sfx('die'); }

function updateEnemy(e) {
  if (e.rm) return;
  if (e.dead) { e.vy += 0.35; e.y += e.vy; e.x += e.vx * 0.4; if (e.y > VH + 60) e.rm = true; return; }
  if (e.squash) { if (--e.squash <= 0) e.rm = true; return; }
  if (!e.act) { if (e.x < cam + VW + 24 && e.x > cam - 60) e.act = true; else return; }
  e.age++;
  if (e.t === 'bat') { const dx = P.x < e.x ? -1 : 1; e.face = dx; e.x += dx * 0.5; e.y = e.by + Math.sin(e.age / 20) * 18; return; }
  e.vy = Math.min(e.vy + 0.4, 6.5);
  if (e.t === 'boss') {
    if (e.inv > 0) e.inv--;
    const dir = P.x + P.w / 2 < e.x + e.w / 2 ? -1 : 1; e.face = dir;
    const sp = 0.5 + (e.max - e.hp) * 0.12;
    if (e.onG) { e.vx = dir * sp; if (--e.jt <= 0) { e.vy = -6.5; e.jt = 60 + Math.floor(Math.random() * 60); sfx('kick'); } }
    moveX(e, e.vx); if (e.x < L.arenaL * T) e.x = L.arenaL * T;
    moveY(e, e.vy); return;
  }
  if (e.t === 'snail' && e.state === 'shell') { e.vx = 0; if (e.kickT > 0) e.kickT--; }
  else if (e.state === 'slide' && e.kickT > 0) e.kickT--;
  moveX(e, e.vx);
  if (e.blockedX) { e.vx = -e.vx; e.face = e.vx < 0 ? -1 : 1; }
  moveY(e, e.vy);
  if (e.bumpTile === null && e.onG === false) { /* في الهواء */ }
  if (e.y > VH + 40) e.rm = true;
  if (e.t === 'snail' && e.state === 'slide') {
    for (const o of ents) if (o !== e && !o.dead && !o.squash && o.t !== 'boss' && overlap(e, o)) killEnemy(o, 500, e.vx > 0 ? 2 : -2);
  }
}
function enemyVsPlayer(e) {
  if (e.dead || e.squash || P.dead || P.flag || !e.act || !overlap(P, e)) return;
  if (e.t === 'snail' && e.state === 'shell' && !(e.kickT > 0)) {
    const dir = P.x + P.w / 2 < e.x + e.w / 2 ? 1 : -1;
    const stompShell = P.vy > 0 && P.y + P.h - P.vy <= e.y + 6;
    e.state = 'slide'; e.vx = dir * 4; e.kickT = 12; sfx('kick'); addScore(400, e.x + 7, e.y);
    if (stompShell) { P.vy = -4; P.y = e.y - P.h; }
    return;
  }
  if (e.t === 'snail' && e.state === 'shell') return;
  const fromAbove = P.vy > 0 && P.y + P.h - P.vy <= e.y + (e.t === 'boss' ? 12 : 7);
  if (e.t === 'spiny') { hurtPlayer(); return; }
  if (e.t === 'snail' && e.state === 'slide' && e.kickT > 0) return;
  if (fromAbove) {
    if (e.t === 'boss' && e.inv > 0) { P.vy = -5; return; }
    stompEnemy(e); P.vy = down.has('jump') ? -7 : -4.5; P.y = e.y - P.h;
  } else {
    if (e.t === 'boss' && e.inv > 0) return;
    hurtPlayer();
  }
}

/* ---------------------------- اللاعب ---------------------------- */
function updatePlayer() {
  const p = P;
  if (p.dead) {
    p.deadT++; if (p.deadT > 20) { p.vy = Math.min(p.vy + 0.35, 8); p.y += p.vy; }
    if (p.deadT > 110) loseLife();
    return;
  }
  if (p.flag) {
    if (p.flag === 1) { p.x = L.fx * T - 3; p.y += 1.6; if (solidAt(Math.floor((p.x + 6) / T), Math.floor((p.y + p.h) / T))) { p.y = Math.floor((p.y + p.h) / T) * T - p.h; p.flag = 2; p.face = 1; p.x = L.fx * T + 6; } }
    else { p.vy = Math.min(p.vy + 0.5, 6); moveX(p, 1.1); moveY(p, p.vy); p.anim++; if (p.x >= (L.W - 8) * T) { p.flag = 3; clearT = 0; state = 'clear'; } }
    return;
  }
  const run = down.has('run'), maxv = run ? 2.1 : 1.3;
  const dir = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0);
  if (dir) {
    p.face = dir;
    const skid = Math.sign(p.vx) === -dir && p.vx !== 0;
    const acc = (p.onG ? 0.13 : 0.09) * (skid ? 2.2 : 1);
    if (Math.abs(p.vx) < maxv || skid) p.vx += dir * acc;
    else p.vx -= Math.sign(p.vx) * 0.05;
  } else {
    const fr = p.onG ? 0.12 : 0.02;
    if (Math.abs(p.vx) <= fr) p.vx = 0; else p.vx -= Math.sign(p.vx) * fr;
  }
  if (hit.has('jump') || hit.has('up')) p.jbuf = 7;
  if (p.onG) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (p.jbuf > 0) { p.jbuf--; if (p.coyote > 0) { p.vy = -(7.0 + Math.abs(p.vx) * 0.25); p.onG = false; p.coyote = 0; p.jbuf = 0; sfx('jump'); } }
  const holding = down.has('jump') || down.has('up');
  p.vy = Math.min(p.vy + ((p.vy < 0 && holding) ? 0.38 : 0.62), 7.5);
  moveX(p, p.vx); if (p.blockedX) p.vx = 0;
  moveY(p, p.vy);
  if (p.onG) combo = 0;
  if (p.bumpTile) bumpBlock(p.bumpTile[0], p.bumpTile[1]);
  if (p.onG && Math.abs(p.vx) > 0.1) p.anim += Math.abs(p.vx) * 1.4;
  if (p.inv > 0) p.inv--;
  if (p.y > VH + 20) { killPlayer(); p.deadT = 40; return; }
  // بلاط تفاعلي
  const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 0.01) / T), y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = tile(tx, ty);
    if (c === 'o') { L.g[ty][tx] = '.'; getCoin(tx * T + 8, ty * T); }
    else if (c === 'F') { p.flag = 1; p.vx = 0; stopMusic(); sfx('flag'); const left = time; addScore(clamp(Math.floor((12 * T - p.y) / 16), 1, 8) * 400, p.x, p.y); void left; return; }
    else if (c === 'K' && cpX !== tx) { cpX = tx; sfx('cp'); pops.push({ x: tx * T, y: ty * T - 6, t: 0, txt: '✔' }); }
    else if (c === 'S') { const r = { x: tx * T + 1, y: ty * T + 8, w: 14, h: 8 }; if (overlap(p, r)) hurtPlayer(); }
  }
  for (const e of ents) enemyVsPlayer(e);
}
function getCoin(x, y) {
  coins++; score += 200; sfx('coin'); pops.push({ x, y, t: 0, txt: '', coin: true });
  if (coins >= 100) { coins -= 100; oneUp(x, y); }
}
function oneUp(x, y) { lives++; sfx('life'); pops.push({ x, y: y - 8, t: 0, txt: '1UP' }); }

function bumpBlock(tx, ty) {
  const c = L.g[ty][tx];
  if (c === '?') {
    L.g[ty][tx] = '!'; bumps.push({ tx, ty, t: 0 });
    const cont = L.q.get(tx + ',' + ty) || 'coin';
    if (cont === 'coin') { coins++; score += 200; sfx('coin'); pops.push({ x: tx * T + 8, y: ty * T - 4, t: 0, txt: '', coin: true }); if (coins >= 100) { coins -= 100; oneUp(tx * T, ty * T); } }
    else { items.push({ t: cont, x: tx * T, y: ty * T, w: 14, h: 14, vx: 0.8, vy: 0, emerge: 16, sy: ty * T, onG: false }); sfx('bump'); }
  } else if (c === 'B') {
    if (P.big) {
      L.g[ty][tx] = '.'; sfx('brick'); score += 50;
      for (let i = 0; i < 4; i++) parts.push({ x: tx * T + (i % 2) * 8, y: ty * T + (i >> 1) * 8, vx: (i % 2 ? 1 : -1) * (1 + Math.random()), vy: -4 - (i >> 1) * -2 - Math.random() * 2, c: L.theme.brick });
    } else { bumps.push({ tx, ty, t: 0 }); sfx('bump'); }
  } else sfx('bump');
  // يقتل الأعداء فوق الكتلة
  for (const e of ents) if (!e.dead && !e.squash && e.act && e.x + e.w > tx * T && e.x < tx * T + T && Math.abs(e.y + e.h - ty * T) < 5) killEnemy(e, 100);
  for (const it of items) if (it.emerge === undefined || it.emerge <= 0) if (it.x + it.w > tx * T && it.x < tx * T + T && Math.abs(it.y + it.h - ty * T) < 5) { it.vy = -4; it.vx = -it.vx; }
}

function updateItems() {
  for (const it of items) {
    if (it.emerge > 0) { it.emerge -= 0.5; it.y = it.sy - (16 - it.emerge); continue; }
    it.vy = Math.min(it.vy + 0.35, 6);
    moveX(it, it.vx); if (it.blockedX) it.vx = -it.vx;
    moveY(it, it.vy);
    if (it.y > VH + 30) it.rm = true;
    if (!P.dead && overlap(P, it)) {
      it.rm = true;
      if (it.t === 'life') oneUp(it.x, it.y);
      else { sfx('power'); addScore(1000, it.x, it.y); if (!P.big) { P.big = true; P.y -= 14; P.h = 28; P.inv = 30; } }
    }
  }
  items = items.filter(i => !i.rm);
}
function updateFx() {
  for (const p of parts) { p.vy += 0.4; p.x += p.vx; p.y += p.vy; }
  parts = parts.filter(p => p.y < VH + 40);
  for (const b of bumps) b.t++; bumps = bumps.filter(b => b.t < 9);
  for (const p of pops) p.t++; pops = pops.filter(p => p.t < 40);
  if (shake > 0) shake -= 1;
}

function playStep() {
  if (hit.has('pause')) { state = 'paused'; return; }
  tick++;
  updatePlayer();
  if (state !== 'play') return;
  if (!P.dead) { for (const e of ents) updateEnemy(e); ents = ents.filter(e => !e.rm); updateItems(); }
  updateFx();
  const tx = P.x + P.w / 2 - VW / 2 + P.face * 16;
  cam += (clamp(tx, 0, L.W * T - VW) - cam) * 0.12;
  cam = clamp(cam, 0, L.W * T - VW);
  if (!P.dead && !P.flag) { if (++timeAcc >= 45) { timeAcc = 0; if (--time <= 0) { time = 0; killPlayer(); } } }
  if (hit.has('mute')) toggleMute();
}
function clearStep() {
  clearT++;
  if (hit.has('start')) { score += time * 50; time = 0; completeLevel(); return; }
  if (clearT > 20 && time > 0) { const d = Math.min(time, 2); time -= d; score += d * 50; if (clearT % 3 === 0) tone(1200, 1200, 0.03, 'square', 0.03); }
  else if (time <= 0 && clearT > 40) completeLevel();
}
function toggleMute() { muted = !muted; try { localStorage.setItem('zaki_mute', muted ? '1' : '0'); } catch (e) {} if (!muted) initAudio(); }

/* ---------------------------- رسم البلاط ---------------------------- */
function mk(fn) { const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'); x.scale(2, 2); x.imageSmoothingEnabled = false; fn(x); return c; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = k < 0 ? 0 : 255, a = Math.abs(k); r = Math.round(r + (f - r) * a); g = Math.round(g + (f - g) * a); b = Math.round(b + (f - b) * a); return `rgb(${r},${g},${b})`; }
function buildTiles(th) {
  TC = {};
  TC.g1 = mk(x => { x.fillStyle = th.ground; x.fillRect(0, 0, 16, 16); x.fillStyle = th.top; x.fillRect(0, 0, 16, 5); x.fillStyle = shade(th.top, -0.25); x.fillRect(0, 5, 16, 1); for (let i = 0; i < 4; i++) x.fillRect(i * 4 + 1, 5, 2, 2); x.fillStyle = shade(th.ground, -0.3); x.fillRect(3, 10, 3, 2); x.fillRect(11, 8, 3, 2); x.fillStyle = shade(th.top, 0.35); x.fillRect(0, 0, 16, 1); });
  TC.g2 = mk(x => { x.fillStyle = th.ground; x.fillRect(0, 0, 16, 16); x.fillStyle = shade(th.ground, -0.3); x.fillRect(3, 3, 3, 2); x.fillRect(10, 9, 3, 2); x.fillRect(1, 12, 2, 2); x.fillStyle = shade(th.ground, 0.25); x.fillRect(8, 2, 2, 1); x.fillRect(4, 8, 2, 1); });
  TC.B = mk(x => { x.fillStyle = th.brick; x.fillRect(0, 0, 16, 16); x.fillStyle = '#000'; x.globalAlpha = 0.55; x.fillRect(0, 0, 16, 1); x.fillRect(0, 5, 16, 1); x.fillRect(0, 10, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(7, 0, 1, 5); x.fillRect(3, 5, 1, 5); x.fillRect(11, 5, 1, 5); x.fillRect(7, 10, 1, 5); x.globalAlpha = 0.3; x.fillStyle = '#fff'; x.fillRect(0, 1, 16, 1); x.globalAlpha = 1; });
  TC.q = [0, 1].map(f => mk(x => { x.fillStyle = f ? '#d89000' : '#f8b800'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#803800'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16); x.fillStyle = '#fff'; x.fillRect(1, 1, 14, 1); x.fillStyle = '#803800'; x.fillRect(2, 2, 1, 1); x.fillRect(13, 2, 1, 1); x.fillRect(2, 13, 1, 1); x.fillRect(13, 13, 1, 1); x.fillStyle = '#fff'; x.font = 'bold 12px monospace'; x.textAlign = 'center'; x.fillText('?', 8.5, 12.5); x.fillStyle = '#803800'; x.fillText('?', 8, 12); }));
  TC['!'] = mk(x => { x.fillStyle = '#8a6a48'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5a4028'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16); x.fillRect(2, 2, 2, 2); x.fillRect(12, 2, 2, 2); x.fillRect(2, 12, 2, 2); x.fillRect(12, 12, 2, 2); });
  TC.H = mk(x => { x.fillStyle = shade(th.ground === '#c84c0c' ? '#a0703c' : th.ground, 0.15); x.fillRect(0, 0, 16, 16); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 0, 2, 16); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 14, 16, 2); x.fillRect(14, 0, 2, 16); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(4, 4, 8, 8); });
  const pipe = (lip, left) => mk(x => { const off = lip ? 0 : (left ? 1 : 0), w = lip ? 16 : 15; x.fillStyle = '#20a020'; x.fillRect(off, 0, w, 16); x.fillStyle = '#80f070'; x.fillRect(left ? off + 2 : off + 9, 0, 3, 16); x.fillStyle = '#106010'; x.fillRect(left ? off : off + w - 2, 0, 2, 16); if (lip) { x.fillStyle = '#000'; x.globalAlpha = .6; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.globalAlpha = 1; } });
  TC.l = pipe(true, true); TC.r = pipe(true, false); TC.L = pipe(false, true); TC.R = pipe(false, false);
  TC.D = mk(x => { x.fillStyle = '#2a2a38'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5a5a70'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1); x.fillStyle = '#111'; x.fillRect(7, 0, 2, 16); x.fillStyle = '#700'; x.fillRect(3, 4, 2, 2); x.fillRect(11, 12, 2, 2); });
  TC.S = mk(x => { x.fillStyle = '#e0e0f0'; for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(i * 8, 16); x.lineTo(i * 8 + 4, 5); x.lineTo(i * 8 + 8, 16); x.fill(); } x.fillStyle = '#888'; x.fillRect(0, 14, 16, 2); });
  TC.lava = [0, 1, 2, 3].map(f => mk(x => { x.fillStyle = '#e03000'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#ff9000'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 2 + Math.round(Math.sin((i + f * 4) / 3) * 2), 4, 3); x.fillStyle = '#ffe060'; x.fillRect((f * 4 + 2) % 14, 8, 2, 2); }));
}

/* ---------------------------- رسم الكائنات ---------------------------- */
const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function txt(s, x, y, size, color, align = 'center', font = 'Tahoma, Arial, sans-serif', stroke) {
  ctx.font = `bold ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function drawHero(x, y, big, face, anim, air, inv) {
  if (inv > 0 && (tick >> 2) & 1) return;
  ctx.save(); ctx.translate(Math.floor(x + 6), Math.floor(y)); ctx.scale(face, 1);
  const h = big ? 28 : 14, hd = big ? 11 : 8, lg = big ? 6 : 4, capH = big ? 4 : 3;
  const f = (anim >> 3) & 1, torso = h - hd - lg;
  // أرجل
  if (air) { rect(-6, h - lg, 5, lg, '#603010'); rect(2, h - lg - 1, 5, lg, '#603010'); rect(-4, h - lg - 3, 3, 3, '#2048d0'); rect(2, h - lg - 4, 3, 3, '#2048d0'); }
  else if (anim > 0 && f) { rect(-3, h - lg, 5, lg, '#603010'); rect(-1, h - lg - 2, 3, 2, '#2048d0'); rect(-2, h - lg - 3, 6, 2, '#2048d0'); }
  else { rect(-5, h - lg, 5, lg, '#603010'); rect(1, h - lg, 5, lg, '#603010'); }
  // جسم
  rect(-5, hd, 10, torso, '#2048d0');
  rect(-5, hd, 10, Math.max(2, torso * 0.4), '#fff');
  rect(-3, hd + 1, 2, Math.max(2, torso - 1), '#2048d0'); rect(1, hd + 1, 2, Math.max(2, torso - 1), '#2048d0');
  rect(-1, hd + torso * 0.45, 2, 2, '#f8d030');
  // ذراع
  const sw = air ? -2 : (f ? 1 : -1);
  rect(3 + sw, hd + 1, 3, Math.max(3, torso * 0.5), '#fff'); rect(3 + sw + 1, hd + 1 + Math.max(3, torso * 0.5), 3, 2, '#f8c090');
  // رأس
  rect(-5, 0, 10, capH, '#f08000'); rect(-5, 0, 10, 1, '#ffb040'); rect(0, capH - 1, 8, 2, '#c05800');
  rect(-4, capH, 9, hd - capH, '#f8c090'); rect(-5, capH, 2, hd - capH, '#502810');
  rect(2, capH + 1, 2, 2, '#000'); rect(1, capH + 3 + (big ? 1 : 0), 4, 1, '#a04020');
  rect(-2, 1, 3, 2, '#fff'); rect(-1, 1, 1, 1, '#f08000');
  ctx.restore();
}
function shape(rows, cx, by, color) { ctx.fillStyle = color; for (let i = 0; i < rows.length; i++) ctx.fillRect(cx - rows[i], by - (rows.length - i), rows[i] * 2, 1); }
function drawEnemy(e) {
  if (e.rm) return;
  const f = (e.age >> 3) & 1;
  ctx.save(); ctx.translate(Math.floor(e.x), Math.floor(e.y));
  if (e.dead) { ctx.translate(e.w / 2, e.h / 2); ctx.scale(1, -1); ctx.translate(-e.w / 2, -e.h / 2); }
  if (e.t === 'blob') {
    if (e.squash) { rect(0, 9, 14, 5, '#7a2f9e'); rect(2, 10, 3, 2, '#fff'); rect(9, 10, 3, 2, '#fff'); }
    else {
      shape([3, 5, 6, 7, 7, 7, 7, 7, 7, 6], 7, 12, '#9b40c8'); shape([2, 3, 4], 7, 4, '#c27ae8');
      rect(1, 4, 5, 4, '#fff'); rect(8, 4, 5, 4, '#fff'); rect(3, 5, 2, 3, '#000'); rect(9, 5, 2, 3, '#000');
      rect(1, 3, 6, 1, '#300'); rect(7, 3, 6, 1, '#300');
      rect(f ? 1 : 3, 12, 5, 2, '#402060'); rect(f ? 8 : 6, 12, 5, 2, '#402060');
    }
  } else if (e.t === 'snail') {
    if (e.state === 'walk') {
      ctx.save(); if (e.vx > 0) { ctx.translate(14, 0); ctx.scale(-1, 1); }
      rect(0, 5, 5, 5, '#f8d070'); rect(1, 3, 3, 3, '#f8d070'); rect(1, 3, 1, 1, '#000'); rect(-1, 0, 1, 4, '#f8d070'); rect(3, 0, 1, 4, '#f8d070');
      rect(0, 10, 14, 4, '#f8d070'); shape([3, 5, 6, 7, 7, 7, 7, 6], 9, 12, '#e05020'); shape([1, 3, 3, 1], 9, 9, '#f8b050'); rect(f ? 9 : 8, 7, 1, 3, '#802000');
      ctx.restore();
    } else { shape([3, 5, 6, 6, 6, 6, 6], 7, 14, e.state === 'slide' && (tick >> 1) & 1 ? '#f88050' : '#e05020'); rect(3, 9, 8, 2, '#f8b050'); rect(5, 7, 4, 2, '#f8b050'); rect(1, 12, 12, 2, '#f8d070'); }
  } else if (e.t === 'spiny') {
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(i * 3.5 + 1, 6); ctx.lineTo(i * 3.5 + 3, 0); ctx.lineTo(i * 3.5 + 5, 6); ctx.fill(); }
    shape([4, 6, 7, 7, 7, 7, 7], 7, 11, '#d01818'); rect(2, 6, 3, 3, '#fff'); rect(9, 6, 3, 3, '#fff'); rect(3, 7, 1, 2, '#000'); rect(10, 7, 1, 2, '#000');
    rect(f ? 1 : 3, 11, 4, 2, '#802000'); rect(f ? 9 : 7, 11, 4, 2, '#802000');
  } else if (e.t === 'bat') {
    const w = f ? 3 : -1; rect(4, 2, 6, 6, '#402860'); rect(4, 0, 2, 2, '#402860'); rect(8, 0, 2, 2, '#402860');
    ctx.fillStyle = '#6a3a98'; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(-4, 2 + w); ctx.lineTo(0, 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(18, 2 + w); ctx.lineTo(14, 8); ctx.fill();
    rect(5, 3, 1, 2, '#ff4040'); rect(8, 3, 1, 2, '#ff4040'); rect(6, 6, 2, 1, '#fff');
  } else if (e.t === 'boss') {
    if (e.inv > 0 && (e.inv >> 2) & 1) ctx.globalAlpha = 0.35;
    ctx.save(); if (e.face > 0) { ctx.translate(30, 0); ctx.scale(-1, 1); }
    shape([7, 11, 13, 14, 15, 15, 15, 15, 15, 15, 14, 14, 13, 13, 12, 12, 12, 12, 12, 12], 15, 30, '#4a8a50');
    rect(4, 2, 4, 6, '#e8e8b0'); rect(22, 2, 4, 6, '#e8e8b0'); rect(9, 0, 12, 3, '#f8c800'); rect(9, 0, 2, 5, '#f8c800'); rect(14, 0, 2, 5, '#f8c800'); rect(19, 0, 2, 5, '#f8c800');
    rect(5, 9, 8, 6, '#fff'); rect(17, 9, 8, 6, '#fff'); rect(6, 10, 4, 5, '#c00'); rect(18, 10, 4, 5, '#c00');
    rect(4, 8, 10, 2, '#100'); rect(16, 8, 10, 2, '#100');
    rect(8, 19, 14, 3, '#180'); rect(9, 19, 2, 2, '#fff'); rect(13, 19, 2, 2, '#fff'); rect(17, 19, 2, 2, '#fff');
    rect(f ? 2 : 4, 26, 9, 4, '#2a5a30'); rect(f ? 19 : 17, 26, 9, 4, '#2a5a30');
    ctx.restore();
  }
  ctx.restore();
}
function drawItem(it) {
  ctx.save(); ctx.translate(Math.floor(it.x), Math.floor(it.y));
  const life = it.t === 'life';
  shape([3, 5, 6, 7, 7, 7, 7], 7, 9, life ? '#20b040' : '#e02020'); rect(3, 3, 3, 3, '#fff'); rect(9, 2, 3, 3, '#fff'); rect(6, 5, 3, 2, '#fff');
  rect(3, 9, 8, 5, '#f8e0b0'); rect(5, 10, 1, 2, '#000'); rect(9, 10, 1, 2, '#000');
  ctx.restore();
}
function drawCoin(x, y) {
  const w = Math.abs(Math.sin((tick + x) / 8)) * 5 + 1;
  ctx.fillStyle = '#f8b800'; ctx.fillRect(x + 8 - w, y + 2, w * 2, 12);
  ctx.fillStyle = '#fff3a0'; ctx.fillRect(x + 8 - w + 1, y + 3, Math.max(1, w * 0.5), 9);
  ctx.fillStyle = '#a06000'; ctx.fillRect(x + 8 - w, y + 2, w * 2, 1); ctx.fillRect(x + 8 - w, y + 13, w * 2, 1);
}

function drawTiles() {
  const t0 = Math.floor(cam / T), t1 = Math.min(L.W - 1, t0 + Math.ceil(VW / T) + 1);
  const bmap = {}; for (const b of bumps) bmap[b.tx + ',' + b.ty] = -Math.sin(b.t / 9 * Math.PI) * 6;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = t0; tx <= t1; tx++) {
    const c = L.g[ty][tx], x = tx * T, y = ty * T;
    if (c === '.') { if (L.lava && ty >= 12) ctx.drawImage(TC.lava[((tick >> 3) + tx) & 3], x, y, T, T); continue; }
    if (c === 'o') { drawCoin(x, y); continue; }
    if (c === '#') { ctx.drawImage(tile(tx, ty - 1) === '#' ? TC.g2 : TC.g1, x, y, T, T); continue; }
    if (c === 'F') { rect(x + 7, y, 2, T, '#e8e8e8'); if (L.g[ty - 1][tx] !== 'F') { ctx.fillStyle = '#20d060'; ctx.beginPath(); ctx.arc(x + 8, y - 1, 3, 0, 7); ctx.fill(); const fy = y + 2 + Math.min(1, (P && P.flag ? (P.y / (12 * T)) : 0)) * 90; ctx.fillStyle = '#20d060'; ctx.beginPath(); ctx.moveTo(x + 7, fy); ctx.lineTo(x - 9, fy + 5); ctx.lineTo(x + 7, fy + 10); ctx.fill(); rect(x - 5, fy + 3, 3, 3, '#fff'); } continue; }
    if (c === 'K') { const on = cpX === tx; rect(x + 7, y - 4, 2, T + 4, '#ccc'); ctx.fillStyle = on ? '#30e0ff' : '#888'; ctx.beginPath(); ctx.moveTo(x + 9, y - 4); ctx.lineTo(x + 17, y); ctx.lineTo(x + 9, y + 4); ctx.fill(); continue; }
    const dy = bmap[tx + ',' + ty] || 0;
    const img = c === '?' ? TC.q[(tick >> 4) & 1] : TC[c];
    if (img) ctx.drawImage(img, x, y + dy, T, T);
  }
  // القلعة
  const cx = (L.W - 9) * T;
  rect(cx, 12 * T - 64, 64, 64, '#8a7a9a'); for (let i = 0; i < 4; i++) rect(cx + i * 16, 12 * T - 72, 10, 8, '#8a7a9a');
  rect(cx + 24, 12 * T - 26, 16, 26, '#1a1020'); rect(cx + 24, 12 * T - 30, 16, 6, '#1a1020');
  rect(cx + 8, 12 * T - 48, 8, 10, '#1a1020'); rect(cx + 48, 12 * T - 48, 8, 10, '#1a1020');
  rect(cx + 30, 12 * T - 96, 2, 24, '#ddd'); rect(cx + 32, 12 * T - 96, 12, 8, '#e03030');
}

/* ---------------------------- الخلفيات ---------------------------- */
const skyCache = {};
function skyGrad(th) { const k = th.name; if (!skyCache[k]) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); skyCache[k] = g; } return skyCache[k]; }
function cloud(x, y, s) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, 7); ctx.arc(x + 10 * s, y - 4 * s, 10 * s, 0, 7); ctx.arc(x + 22 * s, y, 8 * s, 0, 7); ctx.rect(x, y, 22 * s, 8 * s); ctx.fill(); }
function drawBackground(th, cx) {
  ctx.fillStyle = skyGrad(th); ctx.fillRect(0, 0, VW, VH);
  const m = th.mode;
  if (m === 'night' || m === 'castle' || m === 'cave') {
    ctx.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const x = ((i * 67) % 300 - cx * 0.05 + 300) % 300 - 20, y = (i * 43) % 150; ctx.globalAlpha = 0.4 + ((i + (tick >> 4)) % 3) * 0.2; ctx.fillRect(x, y, 1, 1); } ctx.globalAlpha = 1;
    if (m === 'night') { ctx.fillStyle = '#f8f0c0'; ctx.beginPath(); ctx.arc(200, 40, 16, 0, 7); ctx.fill(); ctx.fillStyle = th.sky[0]; ctx.beginPath(); ctx.arc(207, 36, 14, 0, 7); ctx.fill(); }
  }
  if (m === 'day' || m === 'snow' || m === 'sky') for (let i = 0; i < 6; i++) cloud(((i * 130 - cx * 0.25 + 1000) % 780) - 60, 30 + (i * 37) % 60, 0.8 + (i % 3) * 0.3);
  if (m === 'lava') { ctx.fillStyle = 'rgba(255,120,0,.25)'; ctx.fillRect(0, VH - 90, VW, 90); }
  if (th.hills) {
    for (let i = 0; i < 6; i++) { const x = ((i * 110 - cx * 0.3 + 1000) % 660) - 100, hh = 40 + (i % 3) * 18; ctx.fillStyle = th.hills; ctx.beginPath(); ctx.ellipse(x, 12 * T, 60 + (i % 2) * 20, hh, 0, Math.PI, 0); ctx.fill(); }
  }
  if (m === 'cave' || m === 'castle') {
    ctx.fillStyle = m === 'cave' ? '#0c1440' : '#241a34';
    for (let i = 0; i < 12; i++) { const x = ((i * 47 - cx * 0.5 + 1000) % 564) - 30, h = 20 + (i * 13) % 34; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 14, 0); ctx.lineTo(x + 7, h); ctx.fill(); }
    if (m === 'castle') { ctx.fillStyle = '#1a1226'; for (let i = 0; i < 8; i++) { const x = ((i * 90 - cx * 0.35 + 1000) % 720) - 40; ctx.fillRect(x, 60, 22, 130); ctx.fillRect(x - 3, 54, 28, 8); ctx.fillStyle = '#ffb030'; ctx.fillRect(x + 8, 80, 5, 8); ctx.fillStyle = '#1a1226'; } }
  }
  if (m === 'snow') { ctx.fillStyle = '#fff'; for (const s of snow) { s.y += s.s; s.x += Math.sin((s.y + s.x) / 20) * 0.3; if (s.y > VH) { s.y = -2; } ctx.fillRect(s.x, s.y, 2, 2); } }
}

/* ---------------------------- الواجهة ---------------------------- */
function drawHUD() {
  const cols = [[28, 'النقاط', String(score).padStart(6, '0')], [78, 'العملات', '× ' + String(coins).padStart(2, '0')], [128, 'المرحلة', (Math.floor(levelIdx / NS) + 1) + '-' + (levelIdx % NS + 1)], [178, 'الوقت', String(time)], [226, 'الأرواح', '× ' + lives]];
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, VW, 26);
  for (const [x, l, v] of cols) { txt(l, x, 10, 8, '#ffd76a'); txt(v, x, 22, 10, '#fff', 'center', 'monospace'); }
}
function overlayText(a, b, sub) {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, VW, VH);
  txt(a, VW / 2, 100, 22, '#ffd76a', 'center', undefined, '#000'); if (b) txt(b, VW / 2, 124, 12, '#fff'); if (sub) txt(sub, VW / 2, 150, 9, '#bbb');
}
function drawTitleBG() {
  drawBackground(THEMES[0], tick * 0.6);
  if (!TC.g1 || L === null) buildTiles(THEMES[0]);
  for (let x = -1; x < 18; x++) { ctx.drawImage(TC.g1, x * T - ((tick * 0.6) % T), 12 * T, T, T); ctx.drawImage(TC.g2, x * T - ((tick * 0.6) % T), 13 * T, T, T); }
}
function drawTitle() {
  drawTitleBG();
  const bob = Math.sin(tick / 20) * 3;
  txt('مغامرة', VW / 2, 52 + bob, 34, '#ffd200', 'center', undefined, '#7a2a00');
  txt('زاكي', VW / 2, 88 + bob, 40, '#ff5a2a', 'center', undefined, '#5a1000');
  txt('ZAKI ADVENTURE  •  ' + NLEV + ' مرحلة', VW / 2, 106, 9, '#fff', 'center', 'monospace', '#000');
  drawHero(22, 12 * T - 14, false, 1, tick, false, 0);
  drawHero(VW - 34, 12 * T - 28, true, -1, tick, false, 0);
  drawMenu(); txt('أفضل نتيجة: ' + prog.best, VW - 6, 12, 8, '#fff', 'right', undefined, '#000');
}
function layoutMenu(items) { const h = 17, gap = 3, top = 112; items.forEach((it, i) => { it.x = 58; it.w = 140; it.h = h; it.y = top + i * (h + gap); }); }
function setMenu(items) { layoutMenu(items); menu = { items, sel: 0 }; }
function drawMenu() {
  menu.items.forEach((it, i) => {
    const s = i === menu.sel;
    ctx.fillStyle = s ? '#ffd76a' : 'rgba(0,0,0,.55)'; ctx.fillRect(it.x, it.y, it.w, it.h);
    ctx.strokeStyle = '#000'; ctx.strokeRect(it.x + .5, it.y + .5, it.w - 1, it.h - 1);
    txt(typeof it.label === 'function' ? it.label() : it.label, it.x + it.w / 2, it.y + 13, 10, s ? '#301800' : '#fff');
  });
}
function titleMenu() {
  const items = [];
  if (prog.unlocked > 0) items.push({ label: 'متابعة (مرحلة ' + (Math.floor(prog.unlocked / NS) + 1) + '-' + (prog.unlocked % NS + 1) + ')', fn: () => { selW = Math.floor(prog.unlocked / NS); selS = prog.unlocked % NS; newGame(prog.unlocked); } });
  items.push({ label: 'لعبة جديدة', fn: () => newGame(0) });
  items.push({ label: 'اختيار المرحلة', fn: () => { state = 'select'; selW = Math.floor(prog.unlocked / NS); selS = prog.unlocked % NS; } });
  items.push({ label: () => muted ? 'الصوت: مغلق 🔇' : 'الصوت: مفتوح 🔊', fn: toggleMute });
  items.push({ label: 'شارك اللعبة 📤', fn: shareGame });
  setMenu(items);
}
function shareGame() {
  const url = CFG.shareUrl || (location.protocol.startsWith('http') ? location.href : ''), text = 'العب مغامرة زاكي — ' + NLEV + ' مرحلة من المرح الكلاسيكي!';
  if (window.AndroidBridge && AndroidBridge.share) AndroidBridge.share((text + ' ' + url).trim());
  else if (navigator.share) navigator.share({ title: 'مغامرة زاكي', text, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('تم نسخ الرابط!')).catch(() => prompt('انسخ الرابط:', url));
  else prompt('انسخ الرابط:', url);
}

/* ---------------------------- شاشة اختيار المرحلة ---------------------------- */
const WC = { x0: 12, y0: 40, w: 36, h: 32, gx: 4, gy: 4 };
const wRect = i => { const k = i % PAGE; return { x: WC.x0 + (k % 6) * (WC.w + WC.gx), y: WC.y0 + Math.floor(k / 6) * (WC.h + WC.gy), w: WC.w, h: WC.h }; };
const pgPrev = { x: 4, y: 6, w: 40, h: 26 }, pgNext = { x: VW - 44, y: 6, w: 40, h: 26 };
const selPage = () => Math.floor(selW / PAGE);
const sRect = i => ({ x: 14 + i * 60, y: 140, w: 54, h: 36 });
const playBtn = { x: 68, y: 190, w: 120, h: 24 };
const inR = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function drawSelect() {
  const th = THEMES[selW % 8]; drawBackground(th, tick * 0.5);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, VW, VH);
  txt('اختر المرحلة', VW / 2, 22, 16, '#ffd76a', 'center', undefined, '#000');
  txt('◀', 24, 26, 16, selPage() > 0 ? '#fff' : '#666'); txt('▶', VW - 24, 26, 16, selPage() < NW / PAGE - 1 ? '#fff' : '#666');
  txt((selPage() + 1) + '/' + (NW / PAGE), VW - 24, 38, 8, '#ccc');
  for (let i = selPage() * PAGE; i < Math.min(NW, selPage() * PAGE + PAGE); i++) {
    const r = wRect(i), lock = i * NS > prog.unlocked, s = i === selW, t2 = THEMES[i % 8];
    ctx.fillStyle = lock ? '#333' : t2.sky[0]; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = lock ? '#222' : t2.top; ctx.fillRect(r.x, r.y + r.h - 8, r.w, 8);
    ctx.lineWidth = s ? 3 : 1; ctx.strokeStyle = s ? '#ffd76a' : '#000'; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
    txt(lock ? '🔒' : String(i + 1), r.x + r.w / 2, r.y + 20, lock ? 12 : 16, '#fff', 'center', undefined, '#000');
  }
  txt('العالم ' + (selW + 1) + ': ' + worldName(selW), VW / 2, 132, 11, '#fff', 'center', undefined, '#000');
  for (let i = 0; i < NS; i++) {
    const r = sRect(i), idx = selW * NS + i, lock = idx > prog.unlocked, s = i === selS;
    ctx.fillStyle = lock ? '#333' : (i === NS - 1 ? '#803030' : '#2a5aa0'); ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = s ? 3 : 1; ctx.strokeStyle = s ? '#ffd76a' : '#000'; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
    txt(lock ? '🔒' : (selW + 1) + '-' + (i + 1), r.x + r.w / 2, r.y + 17, 12, '#fff'); txt(i === NS - 1 ? 'القلعة 👑' : 'مرحلة', r.x + r.w / 2, r.y + 31, 8, '#ddd');
  }
  const ok = selW * NS + selS <= prog.unlocked;
  ctx.fillStyle = ok ? '#28b040' : '#444'; ctx.fillRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h); ctx.strokeStyle = '#000'; ctx.strokeRect(playBtn.x + .5, playBtn.y + .5, playBtn.w - 1, playBtn.h - 1);
  txt('ابدأ ▶', VW / 2, playBtn.y + 17, 12, '#fff'); txt('رجوع (Esc)', VW - 34, VH - 5, 8, '#ccc');
}
function selectStep() {
  if (hit.has('left')) { selW = clamp(selW - 1, 0, NW - 1); sfx('select'); }
  if (hit.has('right')) { selW = clamp(selW + 1, 0, NW - 1); sfx('select'); }
  if (hit.has('up')) { selS = clamp(selS - 1, 0, NS - 1); sfx('select'); }
  if (hit.has('down')) { selS = clamp(selS + 1, 0, NS - 1); sfx('select'); }
  if (hit.has('start') || hit.has('jump')) startSelected();
  if (hit.has('pause')) { state = 'title'; titleMenu(); }
}
function startSelected() { const idx = selW * NS + selS; if (idx <= prog.unlocked) newGame(idx); else sfx('bump'); }

function tap(x, y) {
  if (state === 'title') { menu.items.forEach((it, i) => { if (inR(x, y, it)) { menu.sel = i; sfx('select'); it.fn(); if (state === 'title') layoutMenu(menu.items); } }); }
  else if (state === 'select') {
    for (let i = selPage() * PAGE; i < Math.min(NW, selPage() * PAGE + PAGE); i++) if (inR(x, y, wRect(i))) { selW = i; sfx('select'); }
    if (inR(x, y, pgPrev)) { selW = clamp(selW - PAGE, 0, NW - 1); sfx('select'); }
    if (inR(x, y, pgNext)) { selW = clamp(selW + PAGE, 0, NW - 1); sfx('select'); }
    for (let i = 0; i < NS; i++) if (inR(x, y, sRect(i))) { if (selS === i) startSelected(); selS = i; sfx('select'); }
    if (inR(x, y, playBtn)) startSelected();
    if (x > VW - 70 && y > VH - 16) { state = 'title'; titleMenu(); }
  }
  else if (state === 'paused') state = 'play';
  else if (state === 'gameover' && gameoverT < 200) { state = 'title'; titleMenu(); }
  else if (state === 'end') { state = 'title'; titleMenu(); }
  else if (state === 'clear') hit.add('start');
}
function menuStep() {
  if (hit.has('up')) { menu.sel = (menu.sel + menu.items.length - 1) % menu.items.length; sfx('select'); }
  if (hit.has('down')) { menu.sel = (menu.sel + 1) % menu.items.length; sfx('select'); }
  if (hit.has('start') || hit.has('jump')) { const it = menu.items[menu.sel]; if (it) { it.fn(); if (state === 'title') layoutMenu(menu.items); } }
  if (hit.has('mute')) toggleMute();
}

/* ---------------------------- الرسم الرئيسي ---------------------------- */
function drawGame() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 0.6, (Math.random() - 0.5) * shake * 0.6);
  drawBackground(L.theme, cam);
  ctx.save(); ctx.translate(-Math.floor(cam), 0);
  drawTiles();
  for (const it of items) drawItem(it);
  for (const e of ents) if (e.act || e.dead) drawEnemy(e); else if (e.x < cam + VW + 40) drawEnemy(e);
  drawHero(P.x, P.y, P.big, P.face, P.anim, !P.onG && !P.flag, P.inv);
  for (const p of parts) rect(p.x, p.y, 8, 8, p.c);
  for (const p of pops) {
    if (p.coin) { const yy = p.y - Math.sin(p.t / 40 * Math.PI) * 30; rect(p.x - 2, yy, 4, 8, '#f8b800'); }
    else txt(p.txt, p.x, p.y - p.t * 0.6, 8, '#fff', 'center', 'monospace', '#000');
  }
  ctx.restore(); ctx.restore();
  drawHUD();
  if (L.boss) { const b = ents.find(e => e.t === 'boss'); if (b && b.act && !b.dead) { rect(70, 30, 116, 8, '#000'); rect(72, 32, 112 * b.hp / b.max, 4, '#e03030'); txt('الزعيم', VW / 2, 46, 8, '#fff', 'center', undefined, '#000'); } }
}
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false; ctx.direction = 'rtl';
  if (state === 'title') { drawTitle(); return; }
  if (state === 'select') { drawSelect(); return; }
  if (!L) return;
  drawGame();
  if (state === 'intro') {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    txt('المرحلة ' + (Math.floor(levelIdx / NS) + 1) + '-' + (levelIdx % NS + 1), VW / 2, 84, 22, '#ffd76a');
    txt(L.boss ? 'قلعة الزعيم 👑' : worldName(Math.floor(levelIdx / NS)), VW / 2, 110, 14, '#fff');
    drawHero(VW / 2 - 24, 128, false, 1, 0, false, 0); txt('× ' + lives, VW / 2 + 12, 144, 14, '#fff', 'left', 'monospace');
    if (cpX !== null) txt('✔ نقطة الحفظ', VW / 2, 176, 9, '#30e0ff');
  }
  if (state === 'paused') overlayText('إيقاف مؤقت', 'اضغط P أو المس الشاشة للمتابعة', 'الأسهم/WASD: حركة • Space/Z: قفز • Shift/X: ركض');
  if (state === 'clear') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 60, VW, 90);
    txt(L.boss ? 'هزمت الزعيم! 🏆' : 'أنهيت المرحلة!', VW / 2, 96, 20, '#ffd76a', 'center', undefined, '#000');
    txt('نقاط الوقت: ' + time + ' × 50', VW / 2, 120, 11, '#fff'); txt('المجموع: ' + score, VW / 2, 138, 12, '#fff');
  }
  if (state === 'gameover') { overlayText('انتهت اللعبة', 'النتيجة: ' + score, 'المس الشاشة أو Enter للعودة'); }
  if (state === 'end') {
    drawTitleBG(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, VW, VH);
    txt('🎉 مبروك! 🎉', VW / 2, 70, 26, '#ffd76a', 'center', undefined, '#000'); txt('أنهيت كل المراحل ال' + NLEV + '!', VW / 2, 100, 14, '#fff'); txt('النتيجة النهائية: ' + score, VW / 2, 124, 14, '#fff');
    txt('شكراً للعبك مغامرة زاكي', VW / 2, 150, 11, '#ccc'); drawHero(VW / 2 - 6, 12 * T - 14, false, 1, tick, false, 0);
  }
}

function step() {
  switch (state) {
    case 'title': tick++; menuStep(); break;
    case 'select': tick++; selectStep(); break;
    case 'intro': if (--introT <= 0) { state = 'play'; startMusic(Math.floor(levelIdx / NS)); } break;
    case 'play': playStep(); break;
    case 'paused': if (hit.has('pause') || hit.has('start')) state = 'play'; break;
    case 'clear': clearStep(); break;
    case 'gameover': gameoverT--; if (gameoverT <= 0 || hit.has('start')) { state = 'title'; titleMenu(); } break;
    case 'end': tick++; if (hit.has('start')) { state = 'title'; titleMenu(); } break;
  }
}
let lastT = 0, acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  acc += Math.min(100, t - lastT); lastT = t;
  while (acc >= 16.667) { step(); hit.clear(); acc -= 16.667; }
  render();
}

/* ---------------------------- الأرباح والتذييل ---------------------------- */
function initMonetization() {
  const ad = CFG.adsense || {};
  if (ad.client && ad.slot) {
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ad.client);
    document.head.appendChild(s);
    const ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.cssText = 'display:block;height:60px';
    ins.dataset.adClient = ad.client; ins.dataset.adSlot = ad.slot; ins.dataset.adFormat = 'horizontal'; ins.dataset.fullWidthResponsive = 'true';
    document.getElementById('ad').appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
  const foot = document.getElementById('foot');
  if (CFG.supportUrl) { const a = document.createElement('a'); a.href = CFG.supportUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = CFG.supportText || 'ادعمنا'; foot.appendChild(a); }
}

// زر الرجوع في تطبيق أندرويد + إيقاف مؤقت عند مغادرة الصفحة
window.__zakiBack = () => {
  if (state === 'play') { state = 'paused'; return true; }
  if (state === 'paused') { state = 'play'; return true; }
  if (state === 'select') { state = 'title'; titleMenu(); return true; }
  if (state === 'gameover' || state === 'end') { state = 'title'; titleMenu(); return true; }
  return false;
};
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') state = 'paused'; });

// للاختبار الآلي فقط
window.__zaki = { step() { step(); hit.clear(); }, genLevel, get state() { return state; }, get P() { return P; }, get L() { return L; }, get score() { return score; }, get levelIdx() { return levelIdx; }, newGame, down, hit, get ents() { return ents; }, NLEV, get time() { return time; } };

initMonetization(); titleMenu();
requestAnimationFrame(frame);
})();
