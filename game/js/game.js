/* ===== الشاشات وواجهة اللعب والحلقة الرئيسية ===== */
(() => {
'use strict';
const Z = window.Z, W = Z.world, D = Z.draw, A = Z.art, AU = Z.audio, T = Z.T, VW = Z.VW, VH = Z.VH, F = Z.fx, clamp = Z.clamp;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let SC = 3;
function resize() { const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect(); SC = clamp(Math.round((r.width || 900) * dpr / VW), 2, 4); cv.width = VW * SC; cv.height = VH * SC; }
addEventListener('resize', resize); resize();
Z.SC = () => SC;

let state = 'title', tick = 0, stateT = 0, sel = 0, selW = 0, selS = 0, selH = 0, introT = 0, results = null, resT = 0, pauseSel = 0, overT = 0, toast = null, lastState = '';
const P = Z.prog;
const NS = Z.NS, NW = Z.NW, NLEV = Z.NLEV;
const idxOf = (w, s) => w * NS + s;
const unlocked = idx => idx <= P.unlocked;
const isConfirm = () => Z.hit.has('start') || (Z.hit.has('jump') && !Z.hit.has('up'));
const isBack = () => Z.hit.has('pause');
const say = (s, t) => { toast = { s, t: t || 120 }; };

/* ---------------- تهيئة الخلفية للقوائم ---------------- */
const menuBG = {};
function bgFor(w) { const th = Z.themeFor(w), k = th.name; if (!menuBG[k]) { const cur = A.buildBG; A.buildTiles(th); A.buildBG(th); menuBG[k] = { th }; } return th; }
let bgTheme = null;
function useTheme(w) { const th = Z.themeFor(w); if (bgTheme !== th.name) { A.buildTiles(th); A.buildBG(th); Z.weather.setup(th); bgTheme = th.name; } return th; }
const fakeL = (() => { const g = []; for (let y = 0; y < 14; y++) g.push(new Array(80).fill(y >= 11 ? '#' : '.')); return { W: 80, H: 14, g, gemMap: new Map(), cpOn: new Set(), springT: new Map(), theme: null, deco: [], hasWater: false }; })();
function drawMenuScene(c, w, speed) {
  const th = useTheme(w), cam = { x: tick * (speed || 0.7), y: 230 - 100 };
  A.drawSky(c, th, { x: cam.x, y: 230 }, tick); A.drawBG(c, th, { x: cam.x, y: 230 }, tick);
  const gx = -((cam.x) % T);
  c.save(); c.translate(gx, 0);
  // شريط أرض بسيط
  for (let x = -1; x < 22; x++) for (let y = 0; y < 3; y++) { const key = y === 0 ? 'g1' : 'g0'; const img = A.tileImg && A.tileImg(y === 0 ? 1 : 0); if (img) c.drawImage(img, x * T, VH - 44 + y * T, T, T); }
  c.restore();
  Z.weather.update(); Z.weather.draw(c, th);
}

/* ---------------- شعار ---------------- */
function logo(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.textAlign = 'center';
  const bob = Math.sin(tick / 30) * 1.5; c.translate(0, bob);
  c.font = `900 30px ${D.FONT}`; c.lineJoin = 'round';
  c.lineWidth = 7; c.strokeStyle = '#3a0f00'; c.strokeText('مغامرة زاكي', 0, 0);
  c.lineWidth = 3.5; c.strokeStyle = '#ffffff'; c.strokeText('مغامرة زاكي', 0, 0);
  c.fillStyle = D.lg(c, 0, -26, 0, 4, [[0, '#fff27a'], [.5, '#ffb800'], [1, '#ff6a00']]); c.fillText('مغامرة زاكي', 0, 0);
  c.restore();
}

/* ---------------- القوائم ---------------- */
let menuItems = [];
function titleItems() {
  const items = [];
  const cont = P.unlocked > 0 || Object.keys(P.gems).length;
  items.push({ label: cont ? `▶ متابعة  (${Math.floor(Math.min(P.unlocked, NLEV - 1) / NS) + 1}-${Math.min(P.unlocked, NLEV - 1) % NS + 1})` : '▶ ابدأ المغامرة', fn: () => { const i = Math.min(P.unlocked, NLEV - 1); selW = Math.floor(i / NS); selS = i % NS; startRun(i); } });
  items.push({ label: 'اختيار المرحلة', fn: () => { const i = Math.min(P.unlocked, NLEV - 1); selW = Math.floor(i / NS); selS = i % NS; go('select'); } });
  items.push({ label: 'الشخصيات', fn: () => { selH = P.hero; go('heroes'); } });
  items.push({ label: 'الإعدادات', fn: () => go('settings') });
  items.push({ label: 'شارك اللعبة 📤', fn: shareGame });
  return items;
}
function go(s) { state = s; sel = 0; stateT = 0; if (s === 'title') { menuItems = titleItems(); AU.music({ bpm: 108, root: 57, scale: 'pent', leadWave: 'triangle', seed: 5 }); } if (s === 'settings') sel = 0; AU.sfx('select'); }
function layout(items, x, y, w, h, gap) { items.forEach((it, i) => { it.x = x; it.y = y + i * (h + gap); it.w = w; it.h = h; }); }
function drawItems(c, items, selIdx) {
  items.forEach((it, i) => {
    const k = clamp((stateT - i * 3) / 12, 0, 1), e = 1 - Math.pow(1 - k, 3);
    if (e <= 0.01) return;
    c.save(); c.globalAlpha = e; c.translate(it.x + it.w / 2, it.y + it.h / 2); c.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); c.translate(-(it.x + it.w / 2), -(it.y + it.h / 2) + (1 - e) * 8);
    D.button(c, it.x, it.y, it.w, it.h, typeof it.label === 'function' ? it.label() : it.label, i === selIdx, { lock: it.lock });
    c.restore();
  });
}
function iris(c, cx, cy, r) { c.save(); c.beginPath(); c.rect(0, 0, VW, VH); c.arc(clamp(cx, 0, VW), clamp(cy, 0, VH), Math.max(0.1, r), 0, 7); c.fillStyle = '#06061a'; c.fill('evenodd'); c.restore(); }
const inR = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function navItems(items) {
  if (Z.hit.has('up') && !Z.hit.has('jump')) { } // تنقل
  if (Z.hit.has('up')) { sel = (sel + items.length - 1) % items.length; AU.sfx('select'); }
  if (Z.hit.has('down')) { sel = (sel + 1) % items.length; AU.sfx('select'); }
  if (isConfirm()) { const it = items[sel]; if (it) { AU.sfx('confirm'); it.fn(); } }
}

/* ---------------- بدء اللعب ---------------- */
function startRun(idx) { W.S.lives = 5; W.S.score = 0; W.S.coins = 0; P.lastRun = idx; startLevel(idx, false); }
function startLevel(idx, keepCp) { W.load(idx, keepCp); state = 'intro'; introT = 110; AU.stopMusic(); Z.hit.clear(); }
function restartLevel(fresh) { startLevel(W.idx, !fresh); }
function finishLevel() {
  const idx = W.idx, got = W.gemMask, prev = P.gems[idx] || 0, cnt = m => (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0);
  const newG = cnt(got & ~prev); P.gems[idx] = prev | got;
  const timeBonus = W.time * 10, hits = W.stats.hits; W.S.score += timeBonus;
  const stars = 1 + (cnt(got) === 3 ? 1 : 0) + (hits === 0 ? 1 : 0); P.medals[idx] = Math.max(P.medals[idx] || 0, stars);
  P.unlocked = Math.max(P.unlocked, Math.min(NLEV - 1, idx + 1)); P.best = Math.max(P.best, W.S.score); Z.save();
  results = { idx, gems: cnt(got), newG, time: W.time, timeBonus, kills: W.stats.kills, coins: W.stats.coins, score: W.S.score, stars, hits, last: idx >= NLEV - 1 };
  resT = 0; state = 'results'; AU.sfx('win'); try { Z.CFG.onLevelEnd && Z.CFG.onLevelEnd(idx + 1); } catch (e) {}
  if (results.last) { state = 'results'; }
}

/* ---------------- الخطوة الرئيسية ---------------- */
function step() {
  tick++; stateT++;
  switch (state) {
    case 'title': { layout(menuItems, VW / 2 - 70, 92, 140, 15, 3); navItems(menuItems); break; }
    case 'select': selectStep(); break;
    case 'heroes': heroStep(); break;
    case 'settings': settingsStep(); break;
    case 'intro': if (--introT <= 0) { state = 'play'; W.irisIn = 40; AU.music(W.th.music); } if (Z.hit.has('start') || Z.hit.has('jump')) introT = Math.min(introT, 8); break;
    case 'play':
      if (isBack()) { state = 'paused'; pauseSel = 0; AU.pause(); AU.sfx('select'); break; }
      W.step();
      if (W.phase === 'dead') { W.S.lives--; if (W.S.lives <= 0) { state = 'over'; overT = 0; AU.stopMusic(); P.best = Math.max(P.best, W.S.score); Z.save(); } else { restartLevel(false); } }
      else if (W.phase === 'done') finishLevel();
      break;
    case 'paused': pauseStep(); break;
    case 'results': resT++; resultsStep(); break;
    case 'over': overT++; if (isConfirm() && overT > 30) { W.S.lives = 3; W.S.score = Math.floor(W.S.score / 2); startLevel(W.idx, false); } if (isBack()) go('title'); break;
  }
  if (toast && --toast.t <= 0) toast = null;
}

/* ---------- اختيار المرحلة ---------- */
const WCARD = { x: 40, y: 46, w: 240, h: 86 };
const nodeRect = i => ({ x: 44 + i * 58, y: 90, w: 52, h: 38 });
function selectStep() {
  if (Z.hit.has('left')) { selW = (selW + NW - 1) % NW; AU.sfx('select'); } if (Z.hit.has('right')) { selW = (selW + 1) % NW; AU.sfx('select'); }
  if (Z.hit.has('down')) { selS = Math.min(NS - 1, selS + 1); AU.sfx('select'); } if (Z.hit.has('up')) { selS = Math.max(0, selS - 1); AU.sfx('select'); }
  if (isConfirm()) playSelected(); if (isBack()) go('title');
}
function playSelected() { const i = idxOf(selW, selS); if (unlocked(i)) { AU.sfx('confirm'); startRun(i); } else { AU.sfx('back'); say('أنهِ المراحل السابقة أولاً 🔒'); } }
function drawSelect(c) {
  drawMenuScene(c, selW, 0.5);
  c.fillStyle = 'rgba(8,8,30,.45)'; c.fillRect(0, 0, VW, VH);
  const th = Z.themeFor(selW);
  D.text(c, 'اختر المرحلة', VW / 2, 20, 15, '#fff', 'center', '#20112e', 3);
  const tg = Z.gemsTotal(); D.panel(c, 8, 6, 62, 16, 8); D.gem(c, 18, 14, 11, '#39e6ff'); D.text(c, tg + ' / ' + NLEV * 3, 44, 18, 9, '#fff');
  // بطاقة العالم
  D.panel(c, 28, 30, VW - 56, 108, 12, 'rgba(10,10,40,.62)');
  D.text(c, 'العالم ' + (selW + 1), VW / 2, 46, 9, '#ffd86a'); D.text(c, th.name, VW / 2, 62, 15, '#fff', 'center', '#20112e', 3);
  const wl = idxOf(selW, 0) > P.unlocked;
  D.text(c, '◀', 40, 62, 18, '#fff'); D.text(c, '▶', VW - 40, 62, 18, '#fff');
  for (let s = 0; s < NS; s++) {
    const i = idxOf(selW, s), r = nodeRect(s), lock = !unlocked(i), boss = s === NS - 1, sl = s === selS;
    c.save(); if (sl) { c.shadowColor = '#ffd86a'; c.shadowBlur = 12; }
    D.fillRR(c, r.x, r.y, r.w, r.h, 8, lock ? 'rgba(50,50,60,.85)' : boss ? D.lg(c, 0, r.y, 0, r.y + r.h, [[0, '#c04a4a'], [1, '#6a1a2a']]) : D.lg(c, 0, r.y, 0, r.y + r.h, [[0, '#4a7ae0'], [1, '#22388a']]), sl ? '#fff7c8' : 'rgba(255,255,255,.35)', sl ? 2 : 1); c.restore();
    if (lock) D.text(c, '🔒', r.x + r.w / 2, r.y + 19, 12, '#ccc');
    else { D.text(c, (selW + 1) + '-' + (s + 1), r.x + r.w / 2, r.y + 16, 12, '#fff'); if (boss) D.text(c, '👑', r.x + r.w / 2, r.y + 12 - 10, 9, '#ffd86a', 'center'); }
    const gm = Z.gemsOf(i); for (let g = 0; g < 3; g++) D.gem(c, r.x + 10 + g * 16, r.y + 30, 9, ['#39e6ff', '#ff5ad8', '#7dff5a'][g], false), (g >= gm || lock) && (c.fillStyle = 'rgba(20,20,40,.7)', c.beginPath(), c.arc(r.x + 10 + g * 16, r.y + 30, 4.6, 0, 6.3), c.fill());
    const md = P.medals[i] || 0; if (md && !lock) for (let k = 0; k < md; k++) D.star(c, r.x + r.w - 8 - k * 0, r.y + 0, 0, '#ffd86a', null);
  }
  const i = idxOf(selW, selS), ok = unlocked(i);
  D.text(c, (selS === NS - 1 ? 'قلعة الزعيم' : 'مرحلة ' + (selS + 1)) + (ok ? '' : ' — مقفلة'), VW / 2, 146, 10, '#fff', 'center', '#20112e', 2);
  D.button(c, VW / 2 - 60, 152, 120, 20, ok ? 'ابدأ ▶' : '🔒 مقفلة', ok, { lock: !ok });
  D.text(c, 'رجوع', 34, 168, 9, '#ddd');
  if (toast) toastDraw(c);
}
function selectTap(x, y) {
  if (x < 60 && y > 36 && y < 80) { selW = (selW + NW - 1) % NW; AU.sfx('select'); return; } if (x > VW - 60 && y > 36 && y < 80) { selW = (selW + 1) % NW; AU.sfx('select'); return; }
  for (let s = 0; s < NS; s++) if (inR(x, y, nodeRect(s))) { if (selS === s) playSelected(); else { selS = s; AU.sfx('select'); } return; }
  if (inR(x, y, { x: VW / 2 - 60, y: 152, w: 120, h: 20 })) playSelected();
  if (x < 70 && y > 156) go('title');
}

/* ---------- الشخصيات ---------- */
function heroStep() {
  if (Z.hit.has('left')) { selH = (selH + 2) % 3; AU.sfx('select'); } if (Z.hit.has('right')) { selH = (selH + 1) % 3; AU.sfx('select'); }
  if (isConfirm()) chooseHero(selH); if (isBack()) go('title');
}
function chooseHero(i) { if (Z.heroUnlocked(i)) { P.hero = i; Z.save(); AU.sfx('confirm'); say('تم اختيار ' + Z.HEROES[i].name + ' ✔'); } else { AU.sfx('back'); say('اجمع ' + Z.HEROES[i].need + ' جوهرة لفتحها 💎'); } }
const heroCard = i => ({ x: 20 + i * 100, y: 32, w: 92, h: 122 });
function drawHeroes(c) {
  drawMenuScene(c, 0, 0.4); c.fillStyle = 'rgba(8,8,30,.5)'; c.fillRect(0, 0, VW, VH);
  D.text(c, 'اختر شخصيتك', VW / 2, 22, 15, '#fff', 'center', '#20112e', 3);
  const tg = Z.gemsTotal(); D.panel(c, 8, 6, 62, 16, 8); D.gem(c, 18, 14, 11, '#39e6ff'); D.text(c, tg + ' / ' + NLEV * 3, 44, 18, 9, '#fff');
  Z.HEROES.forEach((h, i) => {
    const r = heroCard(i), lock = !Z.heroUnlocked(i), sl = i === selH; c.save(); if (sl) { c.shadowColor = '#ffd86a'; c.shadowBlur = 14; }
    D.fillRR(c, r.x, r.y, r.w, r.h, 12, 'rgba(14,14,50,.78)', sl ? '#ffe27a' : 'rgba(255,255,255,.3)', sl ? 2.2 : 1); c.restore();
    c.save(); c.translate(r.x + r.w / 2, r.y + 66); c.scale(2.1, 2.1); if (lock) c.filter = 'brightness(0.25)';
    A.drawHero(c, { x: -5, y: -16, w: 10, h: 16, hero: i, face: 1, st: sl ? 'run' : 'idle', anim: tick * 0.6, vx: 1, vy: 0, onG: true, sx: 1, sy: 1, inv: 0, hp: 3 }, tick); c.restore();
    if (lock) { D.text(c, '🔒', r.x + r.w / 2, r.y + 52, 16, '#fff'); }
    D.text(c, h.name, r.x + r.w / 2, r.y + 16, 12, lock ? '#999' : '#fff');
    ['سرعة', 'قفز', 'قوة'].forEach((lb, k) => { D.text(c, lb, r.x + r.w - 6, r.y + 83 + k * 9, 6.5, '#bcd', 'right'); for (let n = 0; n < 5; n++) D.fillRR(c, r.x + 6 + n * 9, r.y + 79 + k * 9, 7, 4, 2, n < h.stat[k] ? '#ffd86a' : 'rgba(255,255,255,.18)'); });
    D.text(c, P.hero === i ? '✔ مُختارة' : lock ? h.need + ' 💎' : 'اضغط للاختيار', r.x + r.w / 2, r.y + 114, 7.5, P.hero === i ? '#7dff9a' : '#dde');
  });
  D.text(c, Z.HEROES[selH].desc, VW / 2, 167, 9, '#fff', 'center', '#20112e', 2); D.text(c, 'رجوع', 30, 174, 9, '#ddd');
  if (toast) toastDraw(c);
}
function heroTap(x, y) { for (let i = 0; i < 3; i++) if (inR(x, y, heroCard(i))) { if (selH === i) chooseHero(i); else { selH = i; AU.sfx('select'); } return; } if (x < 70 && y > 160) go('title'); }

/* ---------- الإعدادات ---------- */
const settingsItems = () => [
  { label: () => 'الموسيقى: ' + (P.music ? 'مفعّلة 🔊' : 'مغلقة 🔇'), fn: () => { AU.setMusic(!P.music); if (P.music) AU.music({ bpm: 108, root: 57, scale: 'pent', leadWave: 'triangle', seed: 5 }); } },
  { label: () => 'المؤثرات: ' + (P.sfx ? 'مفعّلة 🔊' : 'مغلقة 🔇'), fn: () => { AU.setSfx(!P.sfx); AU.sfx('coin'); } },
  { label: () => 'الاهتزاز: ' + (P.vib ? 'مفعّل 📳' : 'مغلق'), fn: () => { P.vib = !P.vib; Z.save(); Z.vibrate(30); } },
  { label: () => resetArm ? '⚠ اضغط مرة أخرى لمسح كل التقدم' : 'مسح التقدم', fn: () => { if (!resetArm) { resetArm = true; return; } P.unlocked = 0; P.best = 0; P.gems = {}; P.medals = {}; P.hero = 0; Z.save(); resetArm = false; say('تم مسح التقدم'); menuItems = titleItems(); } },
  { label: 'رجوع', fn: () => { resetArm = false; go('title'); } },
];
let resetArm = false, sItems = settingsItems();
function settingsStep() { layout(sItems, VW / 2 - 90, 44, 180, 18, 6); navItems(sItems); if (isBack()) go('title'); }
function drawSettings(c) {
  drawMenuScene(c, 2, 0.3); c.fillStyle = 'rgba(8,8,30,.55)'; c.fillRect(0, 0, VW, VH);
  D.text(c, 'الإعدادات', VW / 2, 28, 16, '#fff', 'center', '#20112e', 3); drawItems(c, sItems, sel);
  D.text(c, 'سياسة الخصوصية: privacy.html', VW / 2, 172, 7, 'rgba(255,255,255,.55)');
  if (toast) toastDraw(c);
}

/* ---------- الإيقاف المؤقت ---------- */
const pauseItems = () => [
  { label: '▶ متابعة', fn: () => { state = 'play'; AU.resume(); } },
  { label: '⟲ إعادة المرحلة', fn: () => { W.S.lives = Math.max(1, W.S.lives); startLevel(W.idx, false); } },
  { label: () => (P.music ? '🔊 الموسيقى: تشغيل' : '🔇 الموسيقى: إيقاف'), fn: () => { AU.setMusic(!P.music); } },
  { label: 'القائمة الرئيسية', fn: () => { go('title'); } },
];
let pItems = pauseItems();
function pauseStep() { layout(pItems, VW / 2 - 70, 60, 140, 18, 6); if (isBack()) { state = 'play'; AU.resume(); return; } navItems(pItems); }

/* ---------- النتائج ---------- */
let rItems = [];
function resultsStep() {
  const r = results; rItems = [];
  rItems.push({ label: r.last ? 'القائمة الرئيسية' : 'المرحلة التالية ▶', fn: () => { if (r.last) go('title'); else startLevel(r.idx + 1, false); } });
  rItems.push({ label: '⟲ إعادة', fn: () => startLevel(r.idx, false) });
  rItems.push({ label: 'اختيار المرحلة', fn: () => { selW = Math.floor(r.idx / NS); selS = r.idx % NS; go('select'); } });
  layout(rItems, VW / 2 - 60, 133, 120, 13, 3);
  if (resT > 70) navItems(rItems);
}
function drawResults(c) {
  W.draw(c, SC); c.fillStyle = 'rgba(8,8,32,.72)'; c.fillRect(0, 0, VW, VH);
  const r = results, boss = W.L.boss;
  D.text(c, r.last ? '🏆 أنهيت اللعبة! 🏆' : boss ? '👑 هزمت الزعيم!' : 'أنهيت المرحلة!', VW / 2, 24, 17, '#ffd86a', 'center', '#3a1a00', 3.5);
  D.text(c, Z.worldName(W.L.w) + '  ' + (W.L.w + 1) + '-' + (W.L.s + 1), VW / 2, 40, 8.5, '#dde');
  // النجوم
  for (let i = 0; i < 3; i++) { const on = i < r.stars && resT > 16 + i * 12; c.save(); c.translate(VW / 2 + (i - 1) * 30, 54); const sc = on ? 1 + Math.max(0, 1 - (resT - 16 - i * 12) / 10) * 0.6 : 1; c.scale(sc, sc); D.star(c, 0, 0, 12, on ? D.lg(c, 0, -13, 0, 13, [[0, '#fff58a'], [1, '#ffb000']]) : 'rgba(255,255,255,.15)', on ? '#7a4a00' : 'rgba(255,255,255,.3)', 0); c.restore(); }
  const rows = [['💎 الجواهر', r.gems + ' / 3' + (r.newG ? '  (+' + r.newG + ' جديدة)' : '')], ['⏱ مكافأة الوقت', '+' + r.timeBonus], ['⚔ الأعداء', '' + r.kills], ['🪙 العملات', '' + r.coins], ['النتيجة', '' + r.score]];
  rows.forEach((rw, i) => { if (resT > 30 + i * 8) { D.text(c, rw[0], VW / 2 + 84, 78 + i * 9.5, 8.5, '#dde', 'right'); D.text(c, rw[1], VW / 2 - 84, 78 + i * 9.5, 8.5, i === 4 ? '#ffd86a' : '#fff', 'left'); } });
  if (r.hits === 0 && resT > 60) D.text(c, '✨ بدون إصابات!', VW / 2, 129, 8, '#7dff9a');
  if (resT > 70) drawItems(c, rItems, sel);
  if (r.last && resT > 40) D.text(c, 'مبروك! شكراً للعبك مغامرة زاكي', VW / 2, 22 + 6, 8, '#ffd86a');
}

/* ---------------- الرسم ---------------- */
function toastDraw(c) { c.globalAlpha = Math.min(1, toast.t / 20); D.panel(c, VW / 2 - 92, 148, 184, 16, 8, 'rgba(10,10,40,.85)'); D.text(c, toast.s, VW / 2, 159, 8.5, '#fff'); c.globalAlpha = 1; }

function heartsRow(c, x, y, p) {
  for (let i = 0; i < p.maxhp; i++) { const full = i < p.hp, pulse = full && p.hp === 1 && (tick >> 3) & 1; D.heart(c, x + i * 13 + 6, y + 6, pulse ? 13 : 11.5, full ? '#ff3a5a' : 'rgba(40,20,50,.75)', full ? '#5a0a1a' : 'rgba(255,255,255,.3)'); }
}
function drawHUD(c) {
  const p = W.P, L = W.L;
  D.panel(c, 3, 3, 12 + p.maxhp * 13 + 2, 17, 8); heartsRow(c, 6, 4, p);
  // قوى
  let px = 6; const pw = [[p.fireP, '🔥'], [p.feather, '🪶'], [p.star > 0 ? 1 : 0, '⭐']];
  pw.forEach(pv => { if (pv[0]) { D.panel(c, px, 22, 16, 13, 6, 'rgba(10,10,40,.7)'); D.text(c, pv[1], px + 8, 32, 9, '#fff'); px += 18; } });
  if (p.star > 0) { D.fillRR(c, 6, 37, 34, 3, 1.5, 'rgba(255,255,255,.2)'); D.fillRR(c, 6, 37, 34 * p.star / 600, 3, 1.5, '#ffe066'); }
  // يمين: عملات، جواهر، نتيجة، وقت
  D.panel(c, VW - 92, 3, 89, 30, 8);
  D.coin(c, VW - 84, 11, 4.4 + (W.coinPulse > 0 ? W.coinPulse * 0.28 : 0), tick / 10); D.text(c, '' + W.S.coins, VW - 76, 14, 9.5, '#fff', 'left');
  D.text(c, '♥ ' + W.S.lives, VW - 44, 14, 9, '#ff8aa0', 'left');
  const gm = W.gemMask; for (let i = 0; i < 3; i++) { D.gem(c, VW - 84 + i * 12, 23, 9, ['#39e6ff', '#ff5ad8', '#7dff5a'][i], false); if (!(gm & (1 << i))) { c.fillStyle = 'rgba(15,15,35,.75)'; c.beginPath(); c.arc(VW - 84 + i * 12, 23, 4.4, 0, 6.3); c.fill(); } }
  D.text(c, '⏱' + W.time, VW - 44, 26, 8.5, W.time < 60 ? '#ff7a7a' : '#fff', 'left');
  D.text(c, String(W.S.score).padStart(7, '0'), VW - 6, 44, 8.5, '#fff', 'right', '#20112e', 2);
  // شريط التقدم + اسم المرحلة
  const pr = clamp(p.x / (L.W * T), 0, 1); D.fillRR(c, VW / 2 - 40, 3, 80, 4, 2, 'rgba(0,0,0,.4)'); D.fillRR(c, VW / 2 - 40, 3, 80 * pr, 4, 2, '#ffd86a'); D.circ(c, VW / 2 - 40 + 80 * pr, 5, 3, '#fff', '#a06a00', 0.7);
  D.text(c, (L.w + 1) + '-' + (L.s + 1), VW / 2, 17, 8, 'rgba(255,255,255,.85)', 'center', '#20112e', 2);
  if (W.hint) { const a = Math.min(1, W.hint.t / 15); c.globalAlpha = a; const wd = Math.min(280, 40 + W.hint.text.length * 5.6); D.panel(c, VW / 2 - wd / 2, VH - 40, wd, 17, 8.5, 'rgba(10,10,40,.82)'); D.text(c, W.hint.text, VW / 2, VH - 28, 8.8, '#fff'); c.globalAlpha = 1; }
  if (W.boss && !W.boss.dead && W.boss.state !== 'sleep') { const b = W.boss; D.panel(c, VW / 2 - 70, VH - 22, 140, 16, 8); D.fillRR(c, VW / 2 - 66, VH - 14, 132, 6, 3, 'rgba(255,255,255,.15)'); D.fillRR(c, VW / 2 - 66, VH - 14, 132 * clamp(b.hp / b.max, 0, 1), 6, 3, b.enraged ? '#ff4a2a' : '#ff9a30'); D.text(c, '👑 ' + (W.BOSSNAME[b.kind] || 'الزعيم'), VW / 2, VH - 17, 7.5, '#fff'); }
  // عملات تطير إلى العدّاد
  if (W.flyList) for (const f of W.flyList) { const k = f.t / 26, e = k * k; D.coin(c, Z.lerp(f.x0, VW - 84, e), Z.lerp(f.y0, 11, e), 4.6 - 1.6 * k, f.t * 0.5); }
}
function drawIntro(c) {
  c.fillStyle = '#0a0a20'; c.fillRect(0, 0, VW, VH);
  const th = W.th, k = clamp(1 - introT / 110, 0, 1);
  c.globalAlpha = Math.min(1, k * 4, introT / 14);
  D.text(c, 'العالم ' + (W.L.w + 1) + ' - المرحلة ' + (W.L.s + 1), VW / 2, 68, 12, '#ffd86a');
  D.text(c, W.L.boss ? '👑 ' + th.name + ' — قلعة الزعيم' : th.name, VW / 2, 92, 19, '#fff', 'center', '#20112e', 3.5);
  c.save(); c.translate(VW / 2 - 6, 130); c.scale(1.6, 1.6); A.drawHero(c, { x: -5, y: -16, w: 10, h: 16, hero: P.hero, face: 1, st: 'run', anim: tick * 0.6, vx: 1, vy: 0, onG: true, sx: 1, sy: 1, inv: 0, hp: 3 }, tick); c.restore();
  D.text(c, '× ' + W.S.lives, VW / 2 + 24, 130, 12, '#fff', 'left');
  if (W.cp) D.text(c, '✔ نقطة الحفظ', VW / 2, 156, 8, '#8ff');
  c.globalAlpha = 1;
}
function drawTitle(c) {
  drawMenuScene(c, 0, 0.8);
  // بطل يجري
  c.save(); c.translate(64, VH - 44); c.scale(2.4, 2.4); A.drawHero(c, { x: -5, y: -16, w: 10, h: 16, hero: P.hero, face: 1, st: 'run', anim: tick * 0.7, vx: 2, vy: 0, onG: true, sx: 1, sy: 1, inv: 0, hp: 3 }, tick); c.restore();
  c.save(); c.translate(VW - 60, VH - 44); c.scale(-2.4, 2.4); A.drawHero(c, { x: -5, y: -16, w: 10, h: 16, hero: (P.hero + 1) % 3, face: 1, st: 'idle', anim: 0, vx: 0, vy: 0, onG: true, sx: 1, sy: 1, inv: 0, hp: 3 }, tick); c.restore();
  logo(c, VW / 2, 46, 1.4);
  D.text(c, 'ZAKI ADVENTURE', VW / 2, 58, 7.5, 'rgba(255,255,255,.85)', 'center', '#20112e', 2);
  drawItems(c, menuItems, sel);
  D.text(c, 'أفضل نتيجة: ' + P.best, VW - 6, 10, 8, '#fff', 'right', '#20112e', 2);
  D.gem(c, 12, 8, 10, '#39e6ff'); D.text(c, '' + Z.gemsTotal(), 22, 11, 8, '#fff', 'left', '#20112e', 2);
  if (toast) toastDraw(c);
}
function drawOver(c) {
  W.draw(c, SC); c.fillStyle = 'rgba(20,0,10,.75)'; c.fillRect(0, 0, VW, VH);
  D.text(c, 'انتهت المحاولات', VW / 2, 70, 22, '#ff8a8a', 'center', '#3a0010', 4); D.text(c, 'النتيجة: ' + W.S.score, VW / 2, 92, 11, '#fff');
  D.button(c, VW / 2 - 70, 108, 140, 18, 'حاول مجدداً ⟲', true); D.text(c, 'اضغط ابدأ للمتابعة بـ 3 أرواح  •  Esc للقائمة', VW / 2, 142, 7.5, '#ddd');
}
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = true; ctx.direction = 'rtl';
  ctx.clearRect(0, 0, VW, VH);
  switch (state) {
    case 'title': drawTitle(ctx); break;
    case 'select': drawSelect(ctx); break;
    case 'heroes': drawHeroes(ctx); break;
    case 'settings': drawSettings(ctx); break;
    case 'intro': drawIntro(ctx); break;
    case 'play': {
      W.draw(ctx, SC); drawHUD(ctx); if (W.bossIntro > 0 && W.boss) { W.bossIntro--; }
      const P2 = W.P, sx2 = P2.x + 5 - W.cam.x, sy2 = P2.y + 8 - W.cam.y;
      if (W.irisIn > 0) { W.irisIn--; const k = 1 - W.irisIn / 40, e = 1 - Math.pow(1 - k, 2); iris(ctx, sx2, sy2, e * 380 + 6); }
      else if (W.phase === 'dying' && P2.deadT > 25) { const k = Math.min(1, (P2.deadT - 25) / 55); iris(ctx, sx2, Math.min(VH - 24, sy2), (1 - k) * 380 + 6); }
      break; }
    case 'paused': W.draw(ctx, SC); drawHUD(ctx); ctx.fillStyle = 'rgba(8,8,30,.6)'; ctx.fillRect(0, 0, VW, VH); D.text(ctx, 'إيقاف مؤقت', VW / 2, 44, 16, '#fff', 'center', '#20112e', 3); drawItems(ctx, pItems, pauseSel = sel); if (!pItems[0].x) layout(pItems, VW / 2 - 70, 60, 140, 18, 6); break;
    case 'results': drawResults(ctx); break;
    case 'over': drawOver(ctx); break;
  }
  if (state !== lastState) { lastState = state; }
}

/* ---------------- النقر على الشاشة ---------------- */
cv.addEventListener('pointerdown', e => {
  AU.init(); const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
  switch (state) {
    case 'title': menuItems.forEach((it, i) => { if (inR(x, y, it)) { sel = i; AU.sfx('confirm'); it.fn(); } }); break;
    case 'select': selectTap(x, y); break;
    case 'heroes': heroTap(x, y); break;
    case 'settings': sItems.forEach((it, i) => { if (inR(x, y, it)) { sel = i; AU.sfx('confirm'); it.fn(); } }); break;
    case 'paused': { let hit = false; pItems.forEach((it, i) => { if (inR(x, y, it)) { hit = true; sel = i; AU.sfx('confirm'); it.fn(); } }); if (!hit) { state = 'play'; AU.resume(); } break; }
    case 'results': if (resT > 70) rItems.forEach((it, i) => { if (inR(x, y, it)) { sel = i; AU.sfx('confirm'); it.fn(); } }); break;
    case 'over': if (overT > 30) { W.S.lives = 3; W.S.score = Math.floor(W.S.score / 2); startLevel(W.idx, false); } break;
    case 'intro': introT = Math.min(introT, 8); break;
  }
});

/* ---------------- الحلقة ---------------- */
let last = 0, acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  acc += Math.min(100, t - last); last = t;
  while (acc >= 16.667) { step(); Z.hit.clear(); acc -= 16.667; }
  render();
}
Z.onBlur = () => { if (state === 'play') { state = 'paused'; sel = 0; AU.pause(); } };
window.__zakiBack = () => {
  if (state === 'play') { state = 'paused'; sel = 0; AU.pause(); return true; }
  if (state === 'paused') { state = 'play'; AU.resume(); return true; }
  if (['select', 'heroes', 'settings', 'over'].includes(state)) { go('title'); return true; }
  if (state === 'results') { go('title'); return true; }
  return false;
};

/* ---------------- الأرباح والمشاركة ---------------- */
function shareGame() {
  const url = Z.CFG.shareUrl || (location.protocol.startsWith('http') ? location.href : ''), text = 'العب مغامرة زاكي — ' + NLEV + ' مرحلة من المرح والمغامرة!';
  if (window.AndroidBridge && AndroidBridge.share) AndroidBridge.share((text + ' ' + url).trim());
  else if (navigator.share) navigator.share({ title: 'مغامرة زاكي', text, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say('تم نسخ الرابط!')).catch(() => {});
}
function initMonetization() {
  const ad = Z.CFG.adsense || {};
  if (ad.client && ad.slot) {
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ad.client); document.head.appendChild(s);
    const ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.cssText = 'display:block;height:60px'; ins.dataset.adClient = ad.client; ins.dataset.adSlot = ad.slot; ins.dataset.adFormat = 'horizontal'; ins.dataset.fullWidthResponsive = 'true';
    document.getElementById('ad').appendChild(ins); try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
  const foot = document.getElementById('foot');
  if (Z.CFG.privacyUrl) { const a = document.createElement('a'); a.href = Z.CFG.privacyUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'سياسة الخصوصية'; a.style.marginInlineEnd = '12px'; foot.appendChild(a); }
  if (Z.CFG.supportUrl) { const a = document.createElement('a'); a.href = Z.CFG.supportUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = Z.CFG.supportText || 'ادعمنا'; foot.appendChild(a); }
}

// للاختبار الآلي
Z.test = { get state() { return state; }, setState(s) { state = s; }, startRun, startLevel, step: () => { step(); Z.hit.clear(); }, render, get results() { return results; }, finishLevel, go };
initMonetization(); menuItems = titleItems(); requestAnimationFrame(frame);
})();
