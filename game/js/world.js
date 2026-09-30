/* ===== عالم اللعب: الفيزياء، اللاعب، الكتل، المنصات، الكاميرا ===== */
(() => {
'use strict';
const Z = window.Z, T = Z.T, VW = Z.VW, VH = Z.VH, F = Z.fx, A = Z.art, AU = Z.audio, TAU = Math.PI * 2;
const W = Z.world = { S: { lives: 5, score: 0, coins: 0 }, phase: 'idle' };
const clamp = Z.clamp;

/* ---------------- الاستعلام عن البلاط ---------------- */
const tileAt = (tx, ty) => { const L = W.L; if (tx < 0 || tx >= L.W) return '#'; if (ty < 0 || ty >= L.H) return '.'; return L.g[ty][tx]; };
W.tileAt = tileAt;
const solidAt = (tx, ty) => Z.SOLID.has(tileAt(tx, ty));
W.solidAt = solidAt;
const liquid = ch => ch === 'W' || ch === 'w';

/* حركة الأجسام مع التصادم (لاعب/أعداء/عناصر) */
function moveX(e, dx) {
  e.x += dx; e.blockedX = 0;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (solidAt(tx, ty)) { if (dx > 0) { e.x = tx * T - e.w; e.blockedX = 1; } else if (dx < 0) { e.x = (tx + 1) * T; e.blockedX = -1; } e.hitTile = [tx, ty]; return; }
  }
}
function moveY(e, dy) {
  const prevBottom = e.y + e.h; e.y += dy; e.onG = false; e.bumpTile = null; e.ground = null;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T), y0 = Math.floor(e.y / T);
  if (dy >= 0) {
    const by = e.y + e.h; let row;
    if (dy > 0) row = Math.floor((by - 0.01) / T);
    else { const r = by / T; if (Math.abs(r - Math.round(r)) > 0.001) return; row = Math.round(r); }
    for (let tx = x0; tx <= x1; tx++) {
      const ch = tileAt(tx, row);
      const oneWay = ch === 'T' && prevBottom <= row * T + 0.5 && !e.dropT;
      if (Z.SOLID.has(ch) || oneWay) { e.y = row * T - e.h; e.onG = true; e.ground = ch; e.groundTx = tx; e.groundTy = row; e.vy = 0; return; }
    }
  } else {
    let best = -1, bd = 1e9;
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, y0)) { const dd = Math.abs(tx * T + T / 2 - (e.x + e.w / 2)); if (dd < bd) { bd = dd; best = tx; } }
    if (best >= 0) { e.y = (y0 + 1) * T; e.vy = 0; e.bumpTile = [best, y0]; }
  }
}
W.moveX = moveX; W.moveY = moveY;

/* ---------------- تحميل المرحلة ---------------- */
W.load = (idx, keepCp) => {
  const L = W.L = Z.genLevel(Math.floor(idx / 4), idx % 4);
  W.idx = idx; W.th = L.theme;
  L.hasWater = false; L.g.forEach(r => { if (!L.hasWater && (r.includes('W') || r.includes('w'))) L.hasWater = true; });
  L.cpOn = new Set(); L.springT = new Map(); L.arenaLocked = false;
  if (!keepCp) W.cp = null;
  if (W.cp) L.cpOn.add(W.cp.tx);
  A.buildTiles(W.th); A.buildBG(W.th); Z.weather.setup(W.th); F.clear();
  W.tick = 0; W.hitstop = 0; W.shake = 0; W.bumps = new Map(); W.crumbling = new Map(); W.respawnQ = []; W.plats = L.plats.map(p => Object.assign({ x: p.x0, y: p.y0, dx: 0, dy: 0, dir: 1, h: 6 }, p, p.k === 'v' ? { x: p.x0, y: p.y1, dir: -1 } : {}));
  W.items = []; W.fires = []; W.pops = []; W.flyList = []; W.coinPulse = 0; W.irisIn = 0;
  W.time = L.time; W.timeAcc = 0; W.lvCoins = 0; W.kills = 0; W.combo = 0;
  if (!keepCp) { W.gemMask = 0; W.stats = { hits: 0, kills: 0, coins: 0 }; }
  W.hintIdx = 0; W.hint = null; W.hintT = 0; W.phase = 'play'; W.bossName = null;
  W.P = newPlayer(Z.prog.hero);
  W.spawnEnemies(L);
  const c = W.cam = { x: 0, y: 0 };
  W.updateCam(true);
  Z.prog.plays++;
};
const gemCount = m => (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0);
W.gemCount = () => gemCount(W.gemMask);

function newPlayer(hero) {
  const L = W.L, h = Z.HEROES[hero];
  const p = { x: L.start.x * T, y: L.start.y * T - 16, w: 10, h: 16, vx: 0, vy: 0, face: 1, onG: true, st: 'idle', anim: 0, sx: 1, sy: 1, inv: 0, hero, hp: h.hp, maxhp: h.hp, dead: false, deadT: 0,
    coyote: 0, jbuf: 0, airJumps: 1, dashCd: 0, dashT: 0, dashDir: 1, dashAir: false, pound: 0, poundGo: false, wallDir: 0, wallLock: 0, crouch: false, slide: false, swim: false,
    fireCd: 0, fireP: 0, feather: 0, star: 0, springBoost: false, hurtT: 0, safeX: 0, safeY: 0, flag: 0, djT: 0, jumpCut: false, dropT: 0, plat: null, splashCd: 0, kick: 0 };
  if (W.cp) { p.x = W.cp.tx * T + 3; p.y = W.cp.ty * T - 16; }
  p.safeX = p.x; p.safeY = p.y; p.face = 1;
  return p;
}
W.newPlayerHp = () => { const p = W.P; p.hp = p.maxhp; };

/* ---------------- الكتل ---------------- */
function breakTile(tx, ty, quiet) {
  const L = W.L, ch = tileAt(tx, ty); if (ch !== 'B' && ch !== 'X') return false;
  L.g[ty][tx] = '.'; if (!quiet) AU.sfx('brick'); W.S.score += 50; F.debris(tx * T, ty * T, ch === 'X' ? '#8a6a48' : W.th.brick);
  F.burst(tx * T + 8, ty * T + 8, 6, ['#fff', '#ffe08a'], 1.5, 2);
  killAbove(tx, ty); return true;
}
W.breakTile = breakTile;
function killAbove(tx, ty) { for (const e of W.ents) if (!e.dead && e.act && e.gnd && e.x + e.w > tx * T && e.x < tx * T + T && Math.abs(e.y + e.h - ty * T) < 6) W.killEnemy(e, 100, 0, true); }
function bumpBlock(tx, ty, by) {
  const L = W.L, ch = tileAt(tx, ty), p = W.P;
  if (ch === '?') {
    L.g[ty][tx] = '!'; W.bumps.set(tx + ',' + ty, 1);
    const cont = L.q.get(tx + ',' + ty) || 'coin';
    if (cont === 'coin') { W.giveCoin(tx * T + 8, ty * T - 2, true); AU.sfx('coin'); }
    else { W.items.push({ t: cont, x: tx * T + 2, y: ty * T, w: 12, h: 12, vx: cont === 'fire' || cont === 'feather' ? 0 : 0.8, vy: 0, emerge: 16, sy: ty * T, onG: false }); AU.sfx('bump'); F.burst(tx * T + 8, ty * T, 5, ['#fff2a0'], 1.2, 2); }
    killAbove(tx, ty);
  } else if (ch === 'B') {
    if (by === 'pound' || by === 'dash' || by === 'fire' || (by === 'head' && Z.HEROES[p.hero].id === 2)) breakTile(tx, ty);
    else { W.bumps.set(tx + ',' + ty, 1); AU.sfx('bump'); killAbove(tx, ty); }
  } else if (ch === 'X') { if (by === 'pound' || by === 'dash' || by === 'fire') breakTile(tx, ty); else AU.sfx('bump'); }
  else AU.sfx('bump');
}
W.bumpBlock = bumpBlock;
W.giveCoin = (x, y, pop) => {
  W.S.coins++; W.lvCoins++; W.stats.coins++; W.S.score += 50;
  if (W.flyList) W.flyList.push({ x0: x - W.cam.x, y0: y - W.cam.y, t: 0 });
  if (pop) W.pops.push({ x, y, t: 0, k: 'coin' });
  F.sparkle(x, y, ['#ffe066', '#fff']);
  if (W.S.coins >= 100) { W.S.coins -= 100; W.oneUp(x, y - 8); }
};
W.oneUp = (x, y) => { W.S.lives++; AU.sfx('life'); W.pops.push({ x, y, t: 0, k: 'txt', s: '+1 ♥' }); };
W.popText = (x, y, s, col) => W.pops.push({ x, y, t: 0, k: 'txt', s, col });

/* ---------------- اللاعب ---------------- */
const canStand = p => { for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) if (solidAt(tx, Math.floor((p.y - 6.01) / T))) return false; return true; };
function setCrouch(p, on) { if (on === p.crouch) return; if (on) { p.y += 6; p.h = 10; } else { p.y -= 6; p.h = 16; } p.crouch = on; }
const inWater = p => liquid(tileAt(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h * 0.4) / T)));
const wallCheck = (p, d) => { const x = d > 0 ? p.x + p.w + 0.6 : p.x - 0.6, ty0 = Math.floor((p.y + 3) / T), ty1 = Math.floor((p.y + p.h - 3) / T); for (let ty = ty0; ty <= ty1; ty++) { const ch = tileAt(Math.floor(x / T), ty); if (Z.SOLID.has(ch) && ch !== 'Q' && ch !== 'I') return true; } return false; };

W.hurtPlayer = (fromX, dmg) => {
  const p = W.P; if (p.inv > 0 || p.dead || p.star || p.flag) return false;
  p.hp -= (dmg || 1); W.stats.hits++; p.fireP = 0; p.feather = 0; p.inv = 100; p.hurtT = 16; p.dashT = 0; p.pound = 0; p.poundGo = false;
  const dir = fromX == null ? -p.face : (p.x + p.w / 2 < fromX ? -1 : 1);
  p.vx = dir * 2.4; p.vy = -4.4; W.shake = 8; W.hitstop = 5; AU.sfx('hurt'); Z.vibrate(45);
  F.burst(p.x + 5, p.y + 8, 8, ['#fff', '#ffd86a', '#ff8a6a'], 2.4, 2.4);
  if (p.hp <= 0) W.killPlayer();
  return true;
};
W.killPlayer = () => {
  const p = W.P; if (p.dead) return; p.dead = true; p.deadT = 0; p.vy = -7; p.vx = 0; p.hp = 0; W.phase = 'dying';
  AU.pause(); AU.sfx('die'); Z.vibrate(120); W.shake = 10;
};
W.hazardHit = () => { // أشواك/حمم/هاوية: يخسر قلباً ويعود لآخر مكان آمن
  const p = W.P; if (p.dead || p.flag) return;
  if (p.inv > 0 && p.y < W.L.H * T) return;
  p.hp--; W.stats.hits++; AU.sfx('hurt'); Z.vibrate(60); W.shake = 8; F.burst(p.x + 5, p.y + 8, 10, ['#ff9a30', '#ffd23a', '#fff'], 2.6, 2.4);
  if (p.hp <= 0) { W.killPlayer(); return; }
  p.x = p.safeX; p.y = p.safeY; p.vx = 0; p.vy = 0; p.inv = 130; p.dashT = 0; p.pound = 0; p.poundGo = false; p.hurtT = 0; W.cam.x = clamp(p.x - VW / 2, 0, W.L.W * T - VW); W.cam.y = clamp(p.y - VH * 0.55, 0, W.L.H * T - VH);
};
W.heal = n => { const p = W.P; if (p.hp < p.maxhp) { p.hp = Math.min(p.maxhp, p.hp + n); F.burst(p.x + 5, p.y + 6, 8, ['#ff5a7a', '#fff'], 1.6, 2.4); W.popText(p.x + 5, p.y - 4, '+♥', '#ff6a8a'); return true; } return false; };
W.givePower = k => {
  const p = W.P; AU.sfx(k === 'star' ? 'star' : 'power');
  if (k === 'fire') p.fireP = 1; else if (k === 'feather') p.feather = 1; else if (k === 'star') p.star = 600;
  else if (k === 'mush') { if (!W.heal(1)) { W.S.score += 500; W.popText(p.x + 5, p.y - 4, '500'); } }
  W.S.score += 1000; F.ring(p.x + 5, p.y + 8, 'rgba(255,255,255,.8)', 3, 2, 20);
};
function shockwave(p, bigger) {
  const cx = p.x + p.w / 2, r = bigger ? 5 : 3, ty = Math.floor((p.y + p.h + 1) / T);
  AU.sfx('pound'); W.shake = bigger ? 14 : 9; F.ring(cx, p.y + p.h, 'rgba(255,255,255,.9)', 3, 2.6, 20); F.ring(cx, p.y + p.h, 'rgba(255,220,140,.8)', 2, 1.8, 26);
  for (let i = 0; i < 12; i++) F.add({ x: cx + Z.rnd(-r * 8, r * 8), y: p.y + p.h, vx: Z.rnd(-1.5, 1.5), vy: Z.rnd(-2.6, -0.5), g: 0.1, size: Z.rnd(1.5, 3), color: 'rgba(240,225,200,.8)', life: 26, drag: 0.96 });
  for (let dx = -Math.floor(r / 1.5); dx <= Math.floor(r / 1.5); dx++) { const tx = Math.floor(cx / T) + dx; for (const yy of [ty, ty + 1]) { const ch = tileAt(tx, yy); if (ch === 'B' || ch === 'X') breakTile(tx, yy); } }
  W.shockEnemies(cx, p.y + p.h, r * T);
}

W.updatePlayer = () => {
  const p = W.P, L = W.L, hero = Z.HEROES[p.hero], gm = L.lowGrav ? 0.78 : 1, T_ = W.tick;
  if (p.dead) { p.deadT++; p.deadRot = (p.deadRot || 0) + 0.15; if (p.deadT > 24) { p.vy = Math.min(p.vy + 0.36, 9); p.y += p.vy; } if (p.deadT > 100) W.phase = 'dead'; return; }
  if (p.flag) return flagStep(p);
  if (Z.pressed('down') && !p.onG) p._dnPress = true;
  const left = Z.isDown('left'), right = Z.isDown('right'), down = Z.isDown('down'), jumpDown = Z.isDown('jump');
  let dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (p.hurtT > 0) { p.hurtT--; dir = 0; }
  if (p.inv > 0) p.inv--; if (p.dashCd > 0) p.dashCd--; if (p.fireCd > 0) p.fireCd--; if (p.wallLock > 0) p.wallLock--; if (p.dropT > 0) p.dropT--; if (p.djT > 0) p.djT--;
  if (p.star > 0) { p.star--; if (p.star % 4 === 0) F.sparkle(p.x + 5, p.y + 8, ['#fff58a', '#8ff', '#f8f']); if (p.star === 120) AU.sfx('cp'); }
  const wasSwim = p.swim; p.swim = inWater(p);
  if (p.swim && !wasSwim) { AU.sfx('splash'); for (let i = 0; i < 10; i++) F.add({ x: p.x + 5 + Z.rnd(-4, 4), y: p.y + 6, vx: Z.rnd(-1, 1), vy: Z.rnd(-3, -1), g: 0.16, size: 1.6, color: 'rgba(200,240,255,.9)', life: 24 }); p.airJumps = 1; p.pound = 0; p.poundGo = false; p.vy *= 0.4; }
  if (!p.swim && wasSwim && p.vy < 0) { AU.sfx('splash'); }
  const speed = 2.0 * hero.speed * (p.star ? 1.22 : 1);

  // انحناء / انزلاق
  if (p.onG && !p.swim && !p.dashT && p.hurtT <= 0) {
    if (down && !p.crouch) { setCrouch(p, true); if (Math.abs(p.vx) > 1.3) { p.slide = true; AU.sfx('whoosh'); } }
    else if (!down && p.crouch && canStand(p)) { setCrouch(p, false); p.slide = false; }
  } else if (p.crouch && !down && canStand(p)) { setCrouch(p, false); p.slide = false; }
  if (p.slide && (Math.abs(p.vx) < 0.7 || !p.onG)) p.slide = false;

  // اندفاع
  const dashPress = Z.pressed('dash') || (Z.pressed('fire') && !p.fireP);
  if (dashPress && p.dashCd <= 0 && !p.dashT && !p.pound && p.hurtT <= 0 && !p.swim && (p.onG || !p.dashAir)) {
    if (p.crouch && canStand(p)) setCrouch(p, false);
    p.dashT = 11; p.dashDir = dir || p.face; p.face = p.dashDir; p.dashCd = 30; if (!p.onG) p.dashAir = true; p.vy = 0; p.slide = false; AU.sfx('dash'); p.springBoost = false;
    F.ring(p.x + 5, p.y + 8, 'rgba(255,255,255,.7)', 2, 1.4, 12);
  }
  // نار
  if (Z.pressed('fire') && p.fireP && p.fireCd <= 0 && W.fires.length < 3) { p.fireCd = 16; AU.sfx('fire'); W.fires.push({ x: p.x + (p.face > 0 ? p.w : -4), y: p.y + 5, vx: p.face * 4.4, vy: 0.6, w: 6, h: 6, b: 0, life: 110 }); p.kick = 6; }

  if (p.dashT > 0) {
    p.dashT--; p.vx = p.dashDir * 5.4; p.vy = 0;
    if (p.dashT % 2 === 0) F.add({ x: p.x + 5 - p.dashDir * 3, y: p.y + 8 + Z.rnd(-4, 4), vx: -p.dashDir * 0.6, vy: 0, size: 3.6, tex: 'spark', tint: 'white', rot: p.dashDir > 0 ? 0 : Math.PI, color: 'rgba(255,255,255,.6)', life: 12 });
    // كسر الطوب أمامه
    const ax = Math.floor((p.dashDir > 0 ? p.x + p.w + 8 : p.x - 8) / T);
    for (let ty = Math.floor((p.y + 2) / T); ty <= Math.floor((p.y + p.h - 2) / T); ty++) { const ch = tileAt(ax, ty); if (ch === 'B' || ch === 'X') { breakTile(ax, ty); p.dashT = Math.max(2, p.dashT - 2); } }
  } else {
    // ضربة أرضية
    if (p._dnPress && !p.onG && !p.swim && !p.pound && !p.poundGo && p.hurtT <= 0 && !p.dashT) { p.pound = 8; p.vx *= 0.15; p.vy = 0; AU.sfx('poundstart'); p.crouch && setCrouch(p, false); }
    p._dnPress = false;
    if (p.pound > 0) { p.pound--; p.vy = 0; p.vx *= 0.8; if (p.pound === 0) { p.poundGo = true; p.vy = 9.5; } }
    else if (!p.poundGo) {
      // حركة أفقية
      const isIce = p.onG && p.ground === 'I', crouched = p.crouch && !p.slide;
      let acc = p.swim ? 0.09 : p.onG ? (isIce ? 0.035 : 0.19) : 0.12, fr = p.swim ? 0.04 : p.onG ? (isIce ? 0.012 : p.slide ? 0.028 : 0.2) : 0.012;
      if (p.wallLock > 0) acc *= 0.3;
      const maxv = p.swim ? 1.6 : crouched ? 0.7 : speed;
      if (dir && !crouched) {
        if (p.wallLock <= 0) p.face = dir;
        const skid = Z.sign(p.vx) === -dir && p.vx !== 0;
        if (skid && p.onG && Math.abs(p.vx) > 1.2 && T_ % 3 === 0) F.dust(p.x + 5, p.y + p.h, 1, -dir);
        if (Math.abs(p.vx) < maxv || skid) p.vx += dir * acc * (skid ? 2.2 : 1); else p.vx -= Z.sign(p.vx) * Math.min(Math.abs(p.vx) - maxv, 0.06);
      } else if (p.onG || p.swim) { if (Math.abs(p.vx) <= fr) p.vx = 0; else p.vx -= Z.sign(p.vx) * fr; }
      else { if (Math.abs(p.vx) <= fr) p.vx = 0; else p.vx -= Z.sign(p.vx) * fr; }
      if (p.swim) p.vx *= 0.985;
    }
    // القفز
    if (Z.pressed('jump')) p.jbuf = 7;
    if (p.onG) { p.coyote = 6; p.airJumps = 1; p.dashAir = false; p.springBoost = false; } else if (p.coyote > 0) p.coyote--;
    // كشف الجدار
    p.wallDir = 0;
    if (!p.onG && !p.swim && !p.poundGo && p.pound <= 0 && p.hurtT <= 0 && p.vy > -1) { if (dir > 0 && wallCheck(p, 1)) p.wallDir = 1; else if (dir < 0 && wallCheck(p, -1)) p.wallDir = -1; }
    if (p.jbuf > 0 && p.hurtT <= 0) {
      if (p.swim) {
        const surf = liquid(tileAt(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + 2) / T))) && !liquid(tileAt(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y - 6) / T)));
        p.vy = surf ? -6.6 : -2.7; p.jbuf = 0; AU.sfx(surf ? 'jump' : 'select'); F.add({ x: p.x + 5, y: p.y + 14, vx: 0, vy: -0.6, size: 1.6, color: 'rgba(255,255,255,.7)', life: 22, shrink: false });
      } else if (p.wallDir) {
        p.vy = -7.0; p.vx = -p.wallDir * 3.3; p.face = -p.wallDir; p.wallLock = 12; p.jbuf = 0; p.airJumps = 1; p.dashAir = false; p.jumpCut = false; AU.sfx('wjump'); p.sx = 0.85; p.sy = 1.2;
        for (let i = 0; i < 5; i++) F.dust(p.x + (p.wallDir > 0 ? p.w : 0), p.y + 8, 1, -p.wallDir);
      } else if (p.coyote > 0) {
        p.vy = -7.7 * hero.jump * (L.lowGrav ? 0.92 : 1); p.onG = false; p.coyote = 0; p.jbuf = 0; p.jumpCut = false; AU.sfx('jump'); p.sx = 0.8; p.sy = 1.25; F.dust(p.x + 5, p.y + p.h, 5, 0); if (p.slide) p.slide = false; p.springBoost = false;
      }
    }
    if (Z.pressed('jump') && !p.onG && !p.swim && !p.wallDir && p.coyote <= 0 && p.airJumps > 0 && p.jbuf > 0 && p.hurtT <= 0 && !p.poundGo) {
      p.vy = -7.0; p.airJumps--; p.jbuf = 0; p.djT = 14; AU.sfx('djump'); p.sx = 0.85; p.sy = 1.2; p.springBoost = false;
      F.ring(p.x + 5, p.y + p.h, 'rgba(255,255,255,.85)', 2, 1.8, 16); for (let i = 0; i < 6; i++) F.add({ x: p.x + 5 + Z.rnd(-4, 4), y: p.y + p.h, vx: Z.rnd(-1, 1), vy: Z.rnd(0, 0.8), size: 1.6, color: 'rgba(255,255,255,.7)', life: 16 });
    }
    // الجاذبية
    let g;
    if (p.swim) g = 0.1; else if (p.poundGo) g = 0.2; else { g = (p.vy < 0 && (jumpDown || p.springBoost) ? 0.38 : 0.6) * gm; }
    if (p.jbuf > 0) p.jbuf--;
    if (p.vy < 0 && !jumpDown && !p.springBoost && !p.swim && !p.poundGo) p.jumpCut = true;
    p.vy += g;
    const glide = (p.feather || hero.id === 1) && jumpDown && !p.onG && !p.swim && p.vy > 0.5 && !p.poundGo && p.pound <= 0 && !p.wallDir;
    p.gliding = glide; if (glide) { p.vy = Math.min(p.vy, 1.15); if (T_ % 5 === 0) F.add({ x: p.x + 5, y: p.y + 4, vx: -p.face * 0.3, vy: 0.2, size: 1.4, color: 'rgba(255,220,240,.7)', life: 16 }); }
    if (p.wallDir && p.vy > 1.4) { p.vy = 1.4; if (T_ % 4 === 0) F.dust(p.x + (p.wallDir > 0 ? p.w : 0), p.y + 6, 1, 0); }
    p.vy = clamp(p.vy, p.swim ? -3.2 : -12, p.swim ? 1.5 : p.poundGo ? 9.5 : 8.2);
  }

  // منصة متحركة: النقل
  if (p.plat) { const pl = p.plat; moveX(p, pl.dx); p.y = pl.y - p.h; }
  const wasG = p.onG, vyBefore = p.vy;
  // الحركة والتصادم
  moveX(p, p.vx); if (p.blockedX) { if (p.dashT > 0) { const ht = p.hitTile; if (ht && (tileAt(ht[0], ht[1]) === 'B' || tileAt(ht[0], ht[1]) === 'X')) breakTile(ht[0], ht[1]); p.dashT = 0; p.vx = 0; W.shake = 4; AU.sfx('bump'); } else p.vx = 0; }
  // أرض متحركة: حزام ناقل
  if (p.onG && (p.ground === 'C' || p.ground === 'c')) moveX(p, p.ground === 'C' ? 0.7 : -0.7);
  if (p.dropT > 0) { /* يسمح بالسقوط عبر المنصات */ }
  moveY(p, p.vy);
  landOnPlatforms(p, vyBefore);
  if (p.bumpTile) { const [bx, by] = p.bumpTile; bumpBlock(bx, by, 'head'); if (p.star) breakTile(bx, by); p.jumpCut = true; }
  if (p.onG && !wasG) {
    p.sx = 1.25; p.sy = 0.75; if (vyBefore > 2) { F.dust(p.x + 5, p.y + p.h, Math.min(8, Math.floor(vyBefore)), 0); if (vyBefore > 5) AU.sfx('bump'); } p.combo = 0; W.combo = 0; p.jumpCut = false; p.springBoost = false; p.gliding = false;
    if (p.poundGo) { p.poundGo = false; shockwave(p, hero.id === 2); p.vy = -3.2; p.onG = false; p.sx = 1.4; p.sy = 0.6; }
  }
  if (p.poundGo && p.blockedX) {}
  p.sx += (1 - p.sx) * 0.22; p.sy += (1 - p.sy) * 0.22;
  // نزول من منصة أحادية الاتجاه
  if (p.onG && p.ground === 'T' && down && Z.pressed('jump')) { p.dropT = 10; p.y += 1.2; p.onG = false; p.jbuf = 0; p.coyote = 0; }
  // موقع آمن
  if (p.onG && !p.plat && (p.ground === '#' || p.ground === 'I') && T_ % 8 === 0 && p.inv <= 0) {
    const tx = Math.floor((p.x + p.w / 2) / T), ty = Math.floor((p.y + p.h + 1) / T);
    if (solidAt(tx - 1, ty) && solidAt(tx + 1, ty) && tileAt(tx, ty - 1) !== 'S' && tileAt(tx + 1, ty - 1) !== 'S' && tileAt(tx - 1, ty - 1) !== 'S') { p.safeX = p.x; p.safeY = p.y; }
  }
  // سقوط في الهاوية
  if (p.y > L.H * T + 10) { W.hazardHit(); return; }

  // تفاعل مع البلاط المتراكب
  const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 0.01) / T), y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = tileAt(tx, ty);
    if (ch === 'G') { const k = L.gemMap.get(tx + ',' + ty) || 0; L.g[ty][tx] = '.'; W.gemMask |= (1 << k); W.S.score += 1000; AU.sfx('gem'); F.burst(tx * T + 8, ty * T + 8, 22, ['#39e6ff', '#ff5ad8', '#7dff5a', '#fff'], 3, 3); F.ring(tx * T + 8, ty * T + 8, 'rgba(255,255,255,.9)', 3, 2, 24); W.popText(tx * T + 8, ty * T, '💎 ' + gemCount(W.gemMask) + '/3', '#8ff'); W.hint = { text: 'جوهرة! ' + gemCount(W.gemMask) + ' من 3', t: 120 }; }
    else if (ch === 'F' && !W.bossLocked()) { startFlag(p, ty); return; }
    else if (ch === 'K') { if (!L.cpOn.has(tx)) { L.cpOn.add(tx); W.cp = { tx, ty: ty + 1 }; AU.sfx('cp'); W.popText(tx * T + 8, ty * T - 6, 'نقطة حفظ ✔', '#8ff'); F.burst(tx * T + 8, ty * T, 12, ['#8ff', '#fff'], 2, 2); W.hint = { text: 'تم حفظ التقدم', t: 90 }; } }
    else if (ch === 'S') { const r = { x: tx * T + 2, y: ty * T + 6, w: 12, h: 10 }; if (Z.overlap(p, r)) { if (p.dashT || p.star) {} else W.hazardHit(); } }
    else if (ch === 'V') { W.hazardHit(); }
    else if (ch === 'P') { const cy = ty * T + 8; if (p.vy >= 0 && p.y + p.h >= cy && p.y + p.h <= ty * T + 16 + 4) { p.vy = -12; p.springBoost = true; p.airJumps = 1; p.dashAir = false; p.jumpCut = false; L.springT.set(tx + ',' + ty, 10); AU.sfx('spring'); p.sx = 0.75; p.sy = 1.3; p.poundGo = false; F.ring(tx * T + 8, ty * T + 10, 'rgba(255,255,255,.8)', 2, 1.4, 14); p.onG = false; } }
  }
  // مغناطيس العملات: يجمع كل عملة قريبة من اللاعب
  const mcx = p.x + p.w / 2, mcy = p.y + p.h / 2, MR = 32;
  for (let ty = Math.floor((mcy - MR) / T); ty <= Math.floor((mcy + MR) / T); ty++)
    for (let tx = Math.floor((mcx - MR) / T); tx <= Math.floor((mcx + MR) / T); tx++)
      if (tileAt(tx, ty) === 'o') { const dx = tx * T + 8 - mcx, dy = ty * T + 8 - mcy; if (dx * dx + dy * dy < MR * MR) { L.g[ty][tx] = '.'; W.giveCoin(tx * T + 8, ty * T + 4); AU.sfx('coin'); } }
  // بلاطات تحت القدمين (الهشّة)
  if (p.onG && p.ground === 'Q') { const k = p.groundTx + ',' + p.groundTy; if (!W.crumbling.has(k)) { W.crumbling.set(k, 34); AU.sfx('crumble'); } }
  // حالة الرسم
  if (p.hurtT > 0) p.st = 'hurt'; else if (p.poundGo || p.pound > 0) p.st = 'pound'; else if (p.dashT > 0) p.st = 'dash'; else if (p.swim) p.st = 'swim';
  else if (p.wallDir && !p.onG) p.st = 'wall'; else if (p.slide) p.st = 'slide'; else if (p.crouch) p.st = 'crouch'; else if (!p.onG) p.st = p.gliding ? 'glide' : (p.djT > 0 ? 'djump' : 'jump');
  else if (Math.abs(p.vx) > 0.25) { p.st = (dir && Z.sign(p.vx) === -dir && Math.abs(p.vx) > 1) ? 'skid' : 'run'; } else p.st = 'idle';
  p.anim += Math.abs(p.vx) * 0.9 + (p.st === 'swim' ? 1.2 : 0.2);
  if (p.onG && Math.abs(p.vx) > 1.5 && !p.slide && T_ % 8 === 0) F.dust(p.x + 5 - p.face * 4, p.y + p.h, 1, -p.face);
  // إرشادات
  hintStep(p);
};
function hintStep(p) {
  const L = W.L;
  if (W.hint && W.hint.t > 0) W.hint.t--; else if (W.hint) W.hint = null;
  const h = L.hints[W.hintIdx]; if (h && p.x / T > h.x) { W.hint = { text: h.text, t: 260 }; W.hintIdx++; }
}
function landOnPlatforms(p, vy) {
  p.plat = null; if (p.dropT > 0) return;
  for (const pl of W.plats) {
    if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1) {
      const bottom = p.y + p.h, prevB = bottom - vy, prevTop = pl.y - pl.dy;
      if (vy >= 0 && prevB <= prevTop + 3 && bottom >= pl.y - 1 && bottom <= pl.y + Math.max(8, vy + 4)) { p.y = pl.y - p.h; p.vy = 0; p.onG = true; p.ground = 'plat'; p.plat = pl; return; }
    }
  }
}
function startFlag(p, ty) {
  p.flag = 1; p.vx = 0; p.vy = 0; W.phase = 'goal'; AU.pause(); AU.sfx('flag'); W.flagY = p.y; p.crouch && setCrouch(p, false);
  const h = Math.max(1, Math.round((W.L.gy * T - p.y) / T)); const bonus = Z.clamp(h, 1, 9) * 200; W.S.score += bonus; W.popText(p.x + 5, p.y - 6, '+' + bonus, '#ffe066');
  F.burst(p.x + 5, p.y + 8, 20, ['#ffe066', '#fff', '#3ae070'], 3, 3);
}
function flagStep(p) {
  const L = W.L; p.anim++;
  if (p.flag === 1) { p.x = L.fx * T - 3; p.face = 1; p.y += 1.8; p.st = 'idle'; p.vx = 0; if (solidAt(Math.floor((p.x + 5) / T), Math.floor((p.y + p.h) / T))) { p.y = Math.floor((p.y + p.h) / T) * T - p.h; p.flag = 2; p.face = 1; p.x = L.fx * T + 4; W.goalT = 0; } }
  else { p.vy = Math.min(p.vy + 0.5, 6); moveX(p, 1.2); moveY(p, p.vy); p.st = 'run'; p.face = 1; p.anim += 1.4; W.goalT = (W.goalT || 0) + 1; if (p.x >= (L.W - 8) * T + 8 || W.goalT > 200) { W.phase = 'done'; } }
}

/* ---------------- الكاميرا ---------------- */
W.updateCam = snap => {
  const p = W.P, L = W.L, cam = W.cam; if (!p) return;
  let tx = p.x + p.w / 2 - VW / 2 + p.face * 22 + Z.clamp(p.vx * 6, -20, 20), ty = p.y + p.h - VH * 0.68;
  if (L.arenaLocked && L.arena) tx = L.arena.l * T;
  tx = clamp(tx, 0, L.W * T - VW); ty = clamp(ty, 0, L.H * T - VH);
  if (p.dead) { tx = cam.x; ty = cam.y; }
  const ky = p.vy > 4 ? 0.22 : 0.1;
  if (snap) { cam.x = tx; cam.y = ty; } else { cam.x += (tx - cam.x) * (L.arenaLocked ? 0.2 : 0.12); cam.y += (ty - cam.y) * ky; }
  cam.x = clamp(cam.x, 0, L.W * T - VW); cam.y = clamp(cam.y, 0, L.H * T - VH);
};
W.bossLocked = () => !!(W.L.arena && !W.L.bossDead);

/* ---------------- الخطوة الرئيسية ---------------- */
W.step = () => {
  const L = W.L; if (!L) return;
  if (W.hitstop > 0) { W.hitstop--; return; }
  W.tick++;
  // منصات
  for (const pl of W.plats) {
    const ox = pl.x, oy = pl.y;
    if (pl.wait > 0) { pl.wait--; pl.dx = 0; pl.dy = 0; continue; }
    if (pl.k === 'h') { pl.x += pl.dir * pl.speed; if (pl.x >= pl.x1) { pl.x = pl.x1; pl.dir = -1; pl.wait = 40; } if (pl.x <= pl.x0) { pl.x = pl.x0; pl.dir = 1; pl.wait = 40; } }
    else { pl.y += pl.dir * pl.speed; if (pl.y <= pl.y0) { pl.y = pl.y0; pl.dir = 1; pl.wait = 50; } if (pl.y >= pl.y1) { pl.y = pl.y1; pl.dir = -1; pl.wait = 50; } }
    pl.dx = pl.x - ox; pl.dy = pl.y - oy;
  }
  for (const [k, v] of W.bumps) { if (v >= 9) W.bumps.delete(k); else W.bumps.set(k, v + 1); }
  for (const [k, v] of L.springT) { if (v <= 0) L.springT.delete(k); else L.springT.set(k, v - 1); }
  for (const [k, v] of W.crumbling) {
    if (v <= 0) { const [tx, ty] = k.split(',').map(Number); if (L.g[ty][tx] === 'Q') { L.g[ty][tx] = '.'; F.debris(tx * T, ty * T, '#a08a60'); W.respawnQ.push({ tx, ty, t: 180 }); } W.crumbling.delete(k); }
    else W.crumbling.set(k, v - 1);
  }
  for (let i = W.respawnQ.length - 1; i >= 0; i--) { const r = W.respawnQ[i]; if (--r.t <= 0) { const P = W.P; const rect = { x: r.tx * T, y: r.ty * T, w: T, h: T }; if (!Z.overlap(P, rect)) { L.g[r.ty][r.tx] = 'Q'; W.respawnQ.splice(i, 1); } else r.t = 10; } }
  W.updatePlayer();
  if (W.P.dead) { F.update(); W.updateCam(); return; }
  if (W.phase === 'play' || W.phase === 'goal') { W.updateEnemies(); W.updateItems(); }
  // نار اللاعب
  for (let i = W.fires.length - 1; i >= 0; i--) {
    const f = W.fires[i]; f.life--; f.vy += 0.28; moveX(f, f.vx); if (f.blockedX) { const [tx, ty] = f.hitTile; const ch = tileAt(tx, ty); if (ch === 'X' || ch === 'B') breakTile(tx, ty); f.life = 0; F.burst(f.x + 3, f.y + 3, 5, ['#ffb030', '#fff'], 1.6, 2); }
    moveY(f, f.vy); if (f.onG) { f.vy = -3.2; f.b++; if (f.b > 3) f.life = 0; }
    if (f.y > L.H * T) f.life = 0;
    if (W.fireHit(f)) f.life = 0;
    if (f.life <= 0) { W.fires.splice(i, 1); F.burst(f.x + 3, f.y + 3, 4, ['#ff9a30'], 1.2, 1.8); }
    else if (W.tick % 2 === 0) F.add({ x: f.x + 3, y: f.y + 3, vx: 0, vy: 0, size: 2, color: 'rgba(255,150,40,.6)', life: 10 });
  }
  for (const pp of W.pops) pp.t++; W.pops = W.pops.filter(pp => pp.t < 46);
  if (W.flyList) { for (const f of W.flyList) f.t++; W.flyList = W.flyList.filter(f => { if (f.t >= 26) { W.coinPulse = 8; return false; } return true; }); }
  if (W.coinPulse > 0) W.coinPulse--;
  F.update(); Z.weather.update();
  if (W.shake > 0) W.shake -= 0.6;
  // الزمن
  if (W.phase === 'play' && !W.P.dead && ++W.timeAcc >= 45) { W.timeAcc = 0; if (--W.time <= 0) { W.time = 0; W.killPlayer(); } else if (W.time === 60) { W.hint = { text: 'الوقت ينفد!', t: 100 }; AU.sfx('cp'); } }
  // قفل الحلبة
  const P = W.P;
  if (L.arena && !L.arenaLocked && !L.bossDead && P.x > (L.arena.l + 3) * T) { W.lockArena(); }
  W.updateCam();
};
W.lockArena = () => {
  const L = W.L, a = L.arena; L.arenaLocked = true;
  for (let y = a.gy - 13; y < a.gy; y++) if (L.g[y][a.entry] === '.') L.g[y][a.entry] = 'D';
  AU.sfx('boss'); W.shake = 14; W.bossIntro = 140; F.burst(a.entry * T + 8, (a.gy - 6) * T, 20, ['#aaa', '#fff'], 2, 3);
  AU.music({ bpm: W.th.music.bpm + 24, root: W.th.music.root - 5, scale: 'minor', leadWave: 'sawtooth', seed: 900 + W.idx, boss: true });
};
W.openArena = () => {
  const L = W.L, a = L.arena; L.bossDead = true; L.arenaLocked = false;
  for (let y = a.gy - 13; y < a.gy; y++) { if (L.g[y][a.gate] === 'D') { L.g[y][a.gate] = '.'; F.burst(a.gate * T + 8, y * T + 8, 3, ['#aaa'], 1.4, 2); } if (L.g[y][a.entry] === 'D') L.g[y][a.entry] = '.'; }
  AU.sfx('life'); W.hint = { text: 'البوابة مفتوحة! تقدّم نحو العلم', t: 200 };
};

/* ---------------- الإضاءة (كهوف/ليل) ---------------- */
let lightCv = null, lightC = null;
function drawLight(c, th, cam) {
  const dark = th.dark; if (!dark) return;
  if (!lightCv) { lightCv = document.createElement('canvas'); lightCv.width = VW; lightCv.height = VH; lightC = lightCv.getContext('2d'); }
  const l = lightC; l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, VW, VH); l.fillStyle = `rgba(2,3,16,${0.30 + dark * 0.42})`; l.fillRect(0, 0, VW, VH);
  l.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { const g = l.createRadialGradient(x, y, r * 0.15, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.fillRect(x - r, y - r, r * 2, r * 2); };
  const p = W.P; hole(p.x + 5 - cam.x, p.y + 8 - cam.y, 96 + (p.star ? 30 : 0), 1);
  for (const d of W.L.deco) { if (d.t === 'torch' || d.t === 'lantern' || d.t === 'crystal' || d.t === 'mushroom' || d.t === 'lavaplant') { const x = d.x * T + 8 - cam.x, y = d.y * T - 12 - cam.y; if (x > -50 && x < VW + 50 && y > -50 && y < VH + 50) hole(x, y, d.t === 'torch' ? 56 : 34, 0.95); } }
  for (const f of W.fires) hole(f.x - cam.x, f.y - cam.y, 30, 0.9);
  for (const it of W.items) hole(it.x - cam.x + 6, it.y - cam.y + 6, 22, 0.8);
  c.drawImage(lightCv, 0, 0);
  l.globalCompositeOperation = 'source-over';
}

/* ---------------- الرسم ---------------- */
W.draw = (c, SC) => {
  const L = W.L, th = W.th, p = W.P, cam = W.cam, t = W.tick;
  A.drawSky(c, th, cam, t); A.drawBG(c, th, cam, t);
  c.save();
  let sx = 0, sy = 0; if (W.shake > 0) { sx = (Math.random() - 0.5) * W.shake; sy = (Math.random() - 0.5) * W.shake; }
  const cx = Math.round((cam.x + sx) * SC) / SC, cy = Math.round((cam.y + sy) * SC) / SC;
  c.translate(-cx, -cy);
  const view = { x: cx, y: cy };
  A.drawDeco(c, L, view, t);
  W.drawEnemies(c, t, 'behind');
  A.drawTiles(c, L, view, t, W.bumps, W.crumbling);
  for (const pl of W.plats) if (pl.x + pl.w > cx - 8 && pl.x < cx + VW + 8) A.drawPlat(c, pl, t, th);
  for (const it of W.items) A.drawItem(c, it, t);
  W.drawEnemies(c, t, 'front');
  // أثر الاندفاع
  if (p.dashT > 0) { for (let i = 1; i <= 3; i++) { c.globalAlpha = 0.28 - i * 0.06; A.drawHero(c, Object.assign({}, p, { x: p.x - p.dashDir * i * 6, inv: 0 }), t); } c.globalAlpha = 1; }
  A.drawHero(c, p, t);
  for (const f of W.fires) A.drawFire(c, f, t);
  A.drawWater(c, L, view, t);
  F.draw(c);
  for (const pp of W.pops) {
    if (pp.k === 'coin') { const k = pp.t / 46; D2.coin(c, pp.x, pp.y - Math.sin(k * Math.PI) * 26, 4.5, pp.t * 0.4); }
    else { c.globalAlpha = Math.min(1, (46 - pp.t) / 20); D2.text(c, pp.s, pp.x, pp.y - pp.t * 0.5, 7, pp.col || '#fff', 'center', '#20112e', 2); c.globalAlpha = 1; }
  }
  c.restore();
  drawLight(c, th, { x: cx, y: cy });
  Z.weather.draw(c, th);
};
const D2 = Z.draw;
})();
