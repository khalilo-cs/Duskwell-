/* ===== الأعداء والزعماء والقذائف والعناصر ===== */
(() => {
'use strict';
const Z = window.Z, T = Z.T, VW = Z.VW, VH = Z.VH, F = Z.fx, A = Z.art, AU = Z.audio, W = Z.world, clamp = Z.clamp;
const overlap = Z.overlap;
const SP = { blob: [14, 13], snail: [14, 13], spiny: [14, 11], frog: [12, 10], bat: [12, 10], ghost: [12, 14], thrower: [11, 16], charger: [18, 14], piranha: [12, 16], fish: [14, 10], fireball: [8, 10], bullet: [13, 9], crusher: [30, 32], cannon: [16, 16], proj: [8, 8] };
const BOSSDIM = { golem: [26, 42], charger: [40, 28], flyer: [28, 28], thrower: [32, 42], ghost: [26, 34], fire: [40, 30], king: [26, 50] };
const BOSSNAME = { golem: 'حارس الصخور', charger: 'ملك الثيران', flyer: 'سيّد الخفافيش', thrower: 'الوحش العملاق', ghost: 'ملكة الأشباح', fire: 'تنّين النار', king: 'الملك المظلم' };
W.BOSSNAME = BOSSNAME;
const THROWKIND = { jungle: 'coconut', snow: 'snowball', castle: 'bone', ruins: 'bone', ocean: 'coconut' };

W.spawnEnemies = L => {
  W.ents = []; W.boss = null;
  for (const s of L.spawns) {
    const e = { t: s.t, vx: 0, vy: 0, face: -1, age: Z.rndi(0, 60), state: 'walk', onG: false, act: false, dead: false, turn: Math.random() < 0.6 };
    const d = SP[s.t];
    if (s.t === 'boss') { const dm = BOSSDIM[s.kind]; e.w = dm[0]; e.h = dm[1]; e.kind = s.kind; e.tier = s.tier; e.max = e.hp = 4 + Math.floor(s.tier / 3); e.inv = 0; e.state = 'sleep'; e.timer = 0; e.x = s.x * T; e.y = s.y * T - e.h; e.face = -1; W.boss = e; }
    else {
      e.w = d[0]; e.h = d[1];
      if (s.t === 'bat' || s.t === 'ghost') { e.x = s.x * T + 8 - e.w / 2; e.y = s.y * T - e.h / 2; e.by = e.y; e.bx = e.x; e.state = 'fly'; e.cd = 60; }
      else if (s.t === 'piranha') { e.x = s.x * T - e.w / 2; e.baseY = s.y * T; e.y = e.baseY; e.ext = 0; e.state = 'hid'; e.timer = Z.rndi(20, 80); }
      else if (s.t === 'cannon') { e.x = s.x * T; e.y = s.y * T; e.dir = s.dir; e.timer = 60 + (s.delay || 0); }
      else if (s.t === 'crusher') { e.x = s.x * T + 1; e.y = s.y0 * T; e.y0 = s.y0 * T; e.y1 = s.y1 * T; e.state = 'up'; e.timer = s.ph || 0; }
      else if (s.t === 'fish') { e.x = s.x * T + 1; e.y = s.y * T + 3; e.hx = e.x; e.hy = e.y; e.rx = (s.r || 4) * T; e.vx = 0.6; e.state = 'swim'; }
      else if (s.t === 'fireball') { e.x = s.x * T + 4; e.baseY = s.y * T; e.y = e.baseY + 30; e.h = 10; e.jh = s.h; e.timer = Z.rndi(20, 120); e.state = 'sleep'; }
      else { e.x = s.x * T + (T - e.w) / 2; e.y = s.y * T - e.h; e.vx = -(s.t === 'snail' ? 0.4 : 0.5); e.hx = e.x; e.face = -1; if (s.t === 'frog') { e.state = 'idle'; e.timer = Z.rndi(30, 80); e.vx = 0; } if (s.t === 'charger') { e.vx = -0.35; e.state = 'walk'; } if (s.t === 'thrower') { e.vx = -0.3; e.timer = Z.rndi(50, 110); } }
    }
    W.ents.push(e);
  }
};

const addProj = (kind, x, y, vx, vy, opt) => { const e = Object.assign({ t: 'proj', kind, x: x - 4, y: y - 4, w: 8, h: 8, vx, vy, g: 0, age: 0, act: true, life: 240, dead: false }, opt || {}); W.ents.push(e); return e; };
const near = (e, r) => Math.abs(e.x + e.w / 2 - (W.P.x + W.P.w / 2)) < r;

W.killEnemy = (e, pts, vx, silent) => {
  if (e.dead || e.rm) return; if (e.t === 'boss' || e.t === 'crusher' || e.t === 'cannon') return;
  e.dead = true; e.vy = -4; e.vx = vx || (W.P.x < e.x ? 1.5 : -1.5); W.kills++; W.stats.kills++;
  W.S.score += pts; W.popText(e.x + e.w / 2, e.y, '' + pts); if (!silent) AU.sfx('stomp');
  F.burst(e.x + e.w / 2, e.y + e.h / 2, 8, ['#fff', '#ffd86a', '#ff9a6a'], 2.2, 2.4);
  if (Math.random() < 0.05) W.items.push({ t: 'heart', x: e.x, y: e.y, w: 12, h: 12, vx: 0, vy: -3, emerge: 0, onG: false });
};
const stompPts = () => { W.combo++; return [100, 200, 400, 800, 1000, 2000][Math.min(W.combo - 1, 5)]; };

function hitBoss(e, dmg) {
  if (e.inv > 0 || e.dead || e.state === 'sleep') return false;
  e.hp -= dmg; e.inv = 60; W.shake = 10; W.hitstop = 6; AU.sfx('bosshit'); W.S.score += 500; W.popText(e.x + e.w / 2, e.y - 4, '' + 500);
  F.burst(e.x + e.w / 2, e.y + e.h / 2, 16, ['#fff', '#ffd86a', '#ff8a4a'], 3, 3); F.ring(e.x + e.w / 2, e.y + e.h / 2, 'rgba(255,255,255,.9)', 4, 2.4, 20);
  if (!e.enraged && e.hp <= e.max / 2) { e.enraged = true; AU.sfx('boss'); W.hint = { text: 'الزعيم غاضب!', t: 100 }; }
  if (e.hp <= 0) { e.dead = true; e.state = 'die'; e.timer = 100; e.vx = 0; e.vy = 0; W.S.score += 5000; AU.sfx('bossdie'); AU.stopMusic(); W.shake = 30; W.popText(e.x + e.w / 2, e.y - 14, '+5000', '#ffe066');
    for (const o of W.ents) if (o.t === 'proj' || o.t === 'bat') { if (o.t === 'proj') o.rm = true; } }
  return true;
}

/* ---------------- تحديث ---------------- */
W.updateEnemies = () => {
  const P = W.P, cam = W.cam, L = W.L;
  for (const e of W.ents) {
    if (e.rm) continue;
    if (e.t === 'boss') { updateBoss(e); continue; }
    if (e.dead) { e.vy += 0.35; e.y += e.vy; e.x += e.vx * 0.4; if (e.y > L.H * T + 60) e.rm = true; continue; }
    if (e.squash) { if (--e.squash <= 0) e.rm = true; continue; }
    if (!e.act) { if (e.x > cam.x - 50 && e.x < cam.x + VW + 50 && e.y > cam.y - 80 && e.y < cam.y + VH + 80) e.act = true; else continue; }
    e.age++; if (e.flash > 0) e.flash--; if (e.dropT > 0) e.dropT--;
    updateEnt(e);
  }
  W.ents = W.ents.filter(e => !e.rm);
  // اصطدامات مع اللاعب
  for (const e of W.ents) contact(e);
  // ارتداد اللاعب من العدو الأقرب
};

function walker(e) {
  const P = W.P;
  e.vy = Math.min(e.vy + 0.4, 6.5);
  const before = e.x;
  if (e.turn && e.onG && e.state !== 'slide' && e.state !== 'charge') { const ahead = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / T), fy = Math.floor((e.y + e.h + 2) / T); if (!W.solidAt(ahead, fy) && W.tileAt(ahead, fy) !== 'T') { e.vx = -e.vx; e.face = e.vx < 0 ? -1 : 1; } }
  W.moveX(e, e.vx); if (e.blockedX) { e.vx = -e.vx; e.face = e.vx < 0 ? -1 : 1; if (e.state === 'slide') { AU.sfx('bump'); const [tx, ty] = e.hitTile || []; if (tx !== undefined && (W.tileAt(tx, ty) === 'B')) W.breakTile(tx, ty); } if (e.state === 'charge') { e.state = 'stun'; e.timer = 60; e.vx = 0; W.shake = 4; AU.sfx('bump'); } }
  W.moveY(e, e.vy); e.gnd = e.onG;
  if (e.y > W.L.H * T + 40) e.rm = true;
}
function updateEnt(e) {
  const P = W.P, L = W.L;
  switch (e.t) {
    case 'blob': case 'spiny': walker(e); break;
    case 'snail':
      if (e.state === 'shell') { e.vx = 0; if (e.kickT > 0) e.kickT--; } else if (e.state === 'slide') { if (e.kickT > 0) e.kickT--; }
      walker(e);
      if (e.state === 'slide') for (const o of W.ents) if (o !== e && !o.dead && !o.squash && o.act && o.t !== 'boss' && o.t !== 'crusher' && o.t !== 'cannon' && o.t !== 'proj' && overlap(e, o)) W.killEnemy(o, 500, e.vx > 0 ? 2 : -2);
      break;
    case 'frog': {
      e.vy = Math.min(e.vy + 0.4, 6.5); e.face = P.x < e.x ? -1 : 1;
      if (e.onG) { e.vx = 0; e.crouch = e.timer < 10; if (--e.timer <= 0 && near(e, 170)) { e.vy = -5.6; e.vx = e.face * 1.4; e.timer = Z.rndi(60, 110); AU.sfx('jump'); } else if (e.timer <= 0) e.timer = 30; }
      W.moveX(e, e.vx); if (e.blockedX) e.vx = 0; W.moveY(e, e.vy); e.gnd = e.onG; if (e.y > L.H * T + 40) e.rm = true; break; }
    case 'bat': {
      const dx = P.x - e.x, dy = P.y - e.y; e.face = dx < 0 ? -1 : 1;
      if (e.state === 'fly') { e.x += Math.sign(dx) * 0.35 * (Math.abs(dx) < 200 ? 1 : 0); e.y = e.by + Math.sin(e.age / 20) * 12; if (--e.cd <= 0 && Math.abs(dx) < 110 && dy > 10 && dy < 120) { e.state = 'aim'; e.cd = 14; e.tx = P.x; e.ty = P.y; } }
      else if (e.state === 'aim') { e.x += Math.sin(e.age) * 0.6; if (--e.cd <= 0) { e.state = 'dive'; e.cd = 46; const a = Math.atan2(e.ty - e.y, e.tx - e.x); e.vx = Math.cos(a) * 2.6; e.vy = Math.sin(a) * 2.6; } }
      else if (e.state === 'dive') { e.x += e.vx; e.y += e.vy; if (--e.cd <= 0) { e.state = 'rise'; } }
      else if (e.state === 'rise') { e.y += (e.by - e.y) * 0.05; e.x += (e.bx - e.x) * 0.02; if (Math.abs(e.by - e.y) < 3) { e.state = 'fly'; e.cd = 110; } }
      break; }
    case 'ghost': {
      const dx = P.x - e.x, dy = P.y - e.y; e.face = dx < 0 ? -1 : 1;
      e.shy = (P.face > 0 && e.x > P.x) || (P.face < 0 && e.x < P.x);
      if (!e.shy) { const d = Math.hypot(dx, dy) || 1; if (d < 220) { e.x += dx / d * 0.7; e.by += dy / d * 0.5; } }
      e.y = e.by + Math.sin(e.age / 16) * 3; break; }
    case 'thrower': {
      e.vy = Math.min(e.vy + 0.4, 6.5); e.face = P.x < e.x ? -1 : 1;
      if (e.state === 'walk') { e.vx = Math.sin(e.age / 90) * 0.35; if (--e.timer <= 0 && near(e, 190)) { e.state = 'wind'; e.timer = 26; e.vx = 0; } else if (e.timer < -200) e.timer = 60; }
      else if (e.state === 'wind') { e.vx = 0; if (--e.timer <= 0) { const dx = (P.x + 5) - (e.x + e.w / 2), k = THROWKIND[W.th.key] || 'bone', sp = clamp(dx / 55, -1.8, 1.8); addProj(k, e.x + e.w / 2 + e.face * 3, e.y + 2, sp, -4.6, { g: 0.19, life: 180 }); AU.sfx('whoosh'); e.state = 'walk'; e.timer = Z.rndi(90, 140); } }
      W.moveX(e, e.vx); W.moveY(e, e.vy); e.gnd = e.onG; if (e.y > L.H * T + 40) e.rm = true; break; }
    case 'charger': {
      e.vy = Math.min(e.vy + 0.4, 6.5);
      if (e.state === 'walk') { if (e.turn && e.onG) { const ahead = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / T), fy = Math.floor((e.y + e.h + 2) / T); if (!W.solidAt(ahead, fy)) { e.vx = -e.vx; e.face = e.vx < 0 ? -1 : 1; } }
        const dx = P.x - e.x; if (near(e, 100) && Math.abs(P.y - e.y) < 26 && Math.sign(dx) === e.face) { e.state = 'warn'; e.timer = 22; e.vx = 0; } }
      else if (e.state === 'warn') { if (--e.timer <= 0) { e.state = 'charge'; e.timer = 90; e.vx = e.face * 3.3; AU.sfx('whoosh'); } if (e.age % 4 === 0) F.dust(e.x + e.w / 2, e.y + e.h, 1, -e.face); }
      else if (e.state === 'charge') { if (e.age % 3 === 0) F.dust(e.x + e.w / 2, e.y + e.h, 2, -e.face); if (--e.timer <= 0) { e.state = 'walk'; e.vx = -e.face * 0.35; } }
      else if (e.state === 'stun') { if (--e.timer <= 0) { e.state = 'walk'; e.vx = -e.face * 0.35; e.face = e.vx < 0 ? -1 : 1; } }
      W.moveX(e, e.vx); if (e.blockedX) { if (e.state === 'charge') { e.state = 'stun'; e.timer = 60; e.vx = 0; W.shake = 4; AU.sfx('bump'); } else { e.vx = -e.vx; e.face = e.vx < 0 ? -1 : 1; } }
      W.moveY(e, e.vy); e.gnd = e.onG; if (e.y > L.H * T + 40) e.rm = true; break; }
    case 'piranha': {
      const p = W.P;
      if (e.state === 'hid') { if (--e.timer <= 0 && !near(e, 26)) { e.state = 'rise'; } else if (e.timer <= 0) e.timer = 20; }
      else if (e.state === 'rise') { e.ext += 0.05; if (e.ext >= 1) { e.ext = 1; e.state = 'up'; e.timer = 70; } }
      else if (e.state === 'up') { if (--e.timer <= 0) e.state = 'fall'; }
      else if (e.state === 'fall') { e.ext -= 0.05; if (e.ext <= 0) { e.ext = 0; e.state = 'hid'; e.timer = 70; } }
      e.y = e.baseY - 16 * e.ext + 1; break; }
    case 'fish': {
      const P_ = W.P, wx = Math.floor((e.x + e.w / 2 + e.vx * 6) / T), wy = Math.floor((e.y + e.h / 2) / T);
      const inw = P_.swim && Math.abs(P_.x - e.x) < 90 && Math.abs(P_.y - e.y) < 60;
      const sp = inw ? 1.0 : 0.6; if (inw) { e.vx = Math.sign(P_.x - e.x) * sp || e.vx; e.y += Math.sign(P_.y - e.y) * 0.4; } else { e.y = e.hy + Math.sin(e.age / 24) * 5; if (e.x > e.hx + e.rx) e.vx = -sp; if (e.x < e.hx - e.rx) e.vx = sp; }
      e.face = e.vx < 0 ? -1 : 1; const nx = e.x + e.vx; if (W.solidAt(Math.floor((nx + (e.vx > 0 ? e.w : 0)) / T), wy) || !(['W', 'w'].includes(W.tileAt(wx, wy)))) e.vx = -e.vx; else e.x = nx;
      if (e.age % 40 === 0) F.add({ x: e.x + e.w / 2, y: e.y, vx: 0, vy: -0.4, size: 1.2, color: 'rgba(255,255,255,.6)', life: 30, shrink: false }); break; }
    case 'fireball': {
      if (e.state === 'sleep') { if (--e.timer <= 0) { e.state = 'up'; e.vy = -Math.sqrt(2 * 0.25 * e.jh * T); AU.sfx('fire'); } e.y = e.baseY + 30; }
      else { e.vy += 0.25; e.y += e.vy; if (e.age % 3 === 0) F.add({ x: e.x + 4, y: e.y + 5, vx: 0, vy: 0.3, size: 2.4, color: 'rgba(255,150,40,.7)', life: 14 }); if (e.vy > 0 && e.y > e.baseY + 22) { e.state = 'sleep'; e.timer = Z.rndi(50, 130); e.y = e.baseY + 30; } }
      break; }
    case 'bullet': e.x += e.vx; e.face = e.vx < 0 ? -1 : 1; if (--e.life <= 0 || W.solidAt(Math.floor((e.x + (e.vx > 0 ? e.w : 0)) / T), Math.floor((e.y + e.h / 2) / T))) { e.rm = true; F.burst(e.x + 6, e.y + 4, 8, ['#ffd23a', '#fff', '#888'], 2, 2); } if (e.age % 3 === 0) F.add({ x: e.x + (e.vx < 0 ? e.w : 0), y: e.y + 4, vx: 0, vy: 0, size: 2.2, color: 'rgba(255,190,80,.6)', life: 12 }); break;
    case 'cannon': {
      if (e.recoil > 0) e.recoil -= 0.5; if (e.flash > 0) e.flash--;
      const onScreen = e.x > W.cam.x - 10 && e.x < W.cam.x + VW + 10;
      if (--e.timer <= 0) { e.timer = 150; if (onScreen) { AU.sfx('cannon'); e.recoil = 3; e.flash = 6; const b = { t: 'bullet', x: e.x + 8 + e.dir * 12 - 6.5, y: e.y + 4, w: 13, h: 9, vx: e.dir * 1.7, vy: 0, dirx: e.dir, age: 0, act: true, life: 400, dead: false, face: e.dir }; W.ents.push(b); F.burst(e.x + 8 + e.dir * 12, e.y + 8, 6, ['#fff', '#aaa', '#ffb030'], 1.6, 2); } }
      break; }
    case 'crusher': {
      const px = P.x + P.w / 2, cx = e.x + e.w / 2;
      if (e.state === 'up') { e.y = e.y0; if (--e.timer <= 0 && Math.abs(px - cx) < 24 && P.y > e.y0 && !P.dead) { e.state = 'warn'; e.timer = 18; } }
      else if (e.state === 'warn') { if (--e.timer <= 0) { e.state = 'slam'; e.vy = 0; } }
      else if (e.state === 'slam') { e.vy = Math.min(e.vy + 0.7, 9); e.y += e.vy; if (e.y >= e.y1) { e.y = e.y1; e.state = 'hold'; e.timer = 36; AU.sfx('crush'); W.shake = 7; F.dust(cx, e.y + e.h, 8, 0); F.burst(cx, e.y + e.h, 8, ['#aaa', '#ddd'], 2, 3); } }
      else if (e.state === 'hold') { if (--e.timer <= 0) e.state = 'rise'; }
      else if (e.state === 'rise') { e.y -= 1.1; if (e.y <= e.y0) { e.y = e.y0; e.state = 'up'; e.timer = 40; } }
      break; }
    case 'proj': {
      e.vy += e.g || 0; e.x += e.vx; e.y += e.vy; e.age++; e.life--;
      const k = e.kind, cx = e.x + e.w / 2, cy = e.y + e.h / 2, tx = Math.floor(cx / T), ty = Math.floor(cy / T);
      if (k === 'orb') { const dx = P.x + 5 - cx, dy = P.y + 8 - cy, d = Math.hypot(dx, dy) || 1; e.vx += dx / d * 0.04; e.vy += dy / d * 0.04; const s = Math.hypot(e.vx, e.vy); if (s > 1.5) { e.vx *= 1.5 / s; e.vy *= 1.5 / s; } if (e.age % 3 === 0) F.add({ x: cx, y: cy, vx: 0, vy: 0, size: 2.4, color: 'rgba(190,110,255,.6)', life: 14 }); }
      if (k === 'wave') { if (e.age % 4 === 0) F.dust(cx, e.y + e.h, 1, 0); const ahead = W.solidAt(Math.floor((cx + Math.sign(e.vx) * 6) / T), ty); if (ahead) e.life = 0; }
      if (k === 'flame') { if (e.age % 2 === 0) F.add({ x: cx, y: cy, vx: Z.rnd(-.2, .2), vy: Z.rnd(-.5, 0), size: 3, color: 'rgba(255,170,50,.7)', life: 12 }); if (W.solidAt(tx, ty)) e.life = 0; }
      if (k === 'bomb') { if (W.solidAt(tx, Math.floor((e.y + e.h) / T)) || e.life <= 0) { e.life = 0; F.explode(cx, cy, 20); AU.sfx('crush'); W.shake = 6; const P2 = W.P; if (Math.hypot(P2.x + 5 - cx, P2.y + 8 - cy) < 24) W.hurtPlayer(cx); } }
      if (k === 'icicle') { if (W.solidAt(tx, Math.floor((e.y + e.h) / T))) { e.life = 0; F.burst(cx, e.y + e.h, 6, ['#d8f6ff', '#fff'], 2, 2); AU.sfx('brick'); } }
      if (k === 'spark') { if (e.age % 3 === 0) F.add({ x: cx, y: cy, vx: 0, vy: 0, size: 2, color: 'rgba(255,240,140,.6)', life: 12 }); }
      if ((k === 'snowball' || k === 'coconut' || k === 'bone') && (W.solidAt(tx, ty))) { e.life = 0; F.burst(cx, cy, 5, k === 'snowball' ? ['#fff', '#cde'] : ['#a07040', '#ddd'], 1.6, 2); }
      if (e.life <= 0 || e.y > W.L.H * T + 30) e.rm = true; break; }
  }
}

/* ---------------- التلامس مع اللاعب ---------------- */
const HARM_ONLY = { spiny: 1, piranha: 1, fireball: 1, crusher: 1, proj: 1, fish: 1 };
function hb(e) { return e.t === 'piranha' ? { x: e.x + 1, y: e.y, w: e.w - 2, h: e.h * e.ext } : e.t === 'spiny' ? { x: e.x, y: e.y - 2, w: e.w, h: e.h + 2 } : e; }
function contact(e) {
  const P = W.P; if (e.dead || e.squash || P.dead || P.flag || !e.act || e.rm || e.t === 'cannon' || e.t === 'boss') return;
  if (e.t === 'piranha' && e.ext < 0.45) return;
  const r = hb(e); if (!(P.x < r.x + r.w && P.x + P.w > r.x && P.y < r.y + r.h && P.y + P.h > r.y)) return;
  const attacking = P.dashT > 0 || P.star > 0 || (P.slide && (e.t === 'blob' || e.t === 'snail' || e.t === 'frog')) || (P.poundGo && P.vy > 3);
  // القذائف
  if (e.t === 'proj') { if (P.dashT > 0 && (e.kind === 'snowball' || e.kind === 'coconut' || e.kind === 'bone')) { e.rm = true; F.burst(e.x, e.y, 6, ['#fff'], 2, 2); return; } W.hurtPlayer(e.x + 4); if (!P.inv) {} e.rm = e.kind !== 'wave' && e.kind !== 'flame' ? true : e.rm; return; }
  if (e.t === 'snail' && e.state === 'shell' && !(e.kickT > 0)) {
    const dir = P.x + P.w / 2 < e.x + e.w / 2 ? 1 : -1, fromTop = P.vy > 0 && P.y + P.h - P.vy <= e.y + 6;
    e.state = 'slide'; e.vx = dir * 3.8; e.kickT = 12; e.face = dir; AU.sfx('kick'); W.S.score += 400; W.popText(e.x + 7, e.y, '400'); if (fromTop) { P.vy = -4.5; P.y = e.y - P.h; } return;
  }
  if (e.t === 'snail' && e.state === 'shell') return;
  if (e.t === 'snail' && e.state === 'slide' && e.kickT > 0) return;
  if (attacking && e.t !== 'crusher') { W.killEnemy(e, 200 * (W.combo + 1)); W.combo = Math.min(W.combo + 1, 5); if (P.poundGo) {} return; }
  if (e.t === 'crusher') { W.hurtPlayer(e.x + e.w / 2); return; }
  const fromAbove = P.vy > 0.2 && P.y + P.h - P.vy <= r.y + 7 && !HARM_ONLY[e.t];
  if (e.t === 'charger' && e.state === 'charge') { W.hurtPlayer(e.x + e.w / 2); return; }
  if (fromAbove) { stomp(e); return; }
  if (e.t === 'charger' && e.state === 'stun') return;
  W.hurtPlayer(e.x + e.w / 2);
}
function stomp(e) {
  const P = W.P, pts = stompPts(); AU.sfx('stomp'); F.burst(e.x + e.w / 2, e.y, 5, ['#fff', '#ffe6a0'], 1.6, 2);
  P.vy = Z.isDown('jump') ? -7.6 : -5; P.y = e.y - P.h; P.airJumps = 1; P.dashAir = false; P.jumpCut = false; P.springBoost = false; P.poundGo = false; P.sx = 0.85; P.sy = 1.2; W.hitstop = 2;
  switch (e.t) {
    case 'blob': e.squash = 22; W.S.score += pts; W.popText(e.x + 7, e.y, '' + pts); W.kills++; W.stats.kills++; break;
    case 'snail':
      if (e.state === 'walk') { e.state = 'shell'; e.vx = 0; e.h = 12; e.y += 1; W.S.score += pts; W.popText(e.x + 7, e.y, '' + pts); e.kickT = 10; }
      else if (e.state === 'slide') { e.state = 'shell'; e.vx = 0; e.kickT = 10; W.S.score += pts; }
      break;
    default: W.killEnemy(e, pts, 0, true);
  }
}
W.fireHit = f => {
  for (const e of W.ents) {
    if (e.dead || e.squash || !e.act || e.rm) continue;
    if (e.t === 'boss') { if (e.state !== 'sleep' && e.state !== 'die' && overlap(f, e)) { hitBoss(e, 1); return true; } continue; }
    if (e.t === 'cannon' || e.t === 'crusher') { if (overlap(f, e)) return true; continue; }
    if (e.t === 'proj') { if ((e.kind === 'orb' || e.kind === 'snowball' || e.kind === 'coconut' || e.kind === 'bone' || e.kind === 'bomb') && overlap(f, e)) { e.rm = true; F.burst(e.x, e.y, 6, ['#fff', '#ffb030'], 1.6, 2); return true; } continue; }
    if (overlap(f, hb(e))) { W.killEnemy(e, 200); return true; }
  }
  return false;
};
W.shockEnemies = (cx, cy, r) => {
  for (const e of W.ents) {
    if (e.dead || e.squash || !e.act || e.rm) continue;
    const ex = e.x + e.w / 2, close = Math.abs(ex - cx) < r && Math.abs(e.y + e.h - cy) < 26;
    if (!close) continue;
    if (e.t === 'boss') { if (e.onG !== false && e.state !== 'sleep') hitBoss(e, 1); continue; }
    if (e.t === 'crusher' || e.t === 'cannon' || e.t === 'piranha') continue;
    if (e.t === 'proj') { e.rm = true; continue; }
    if (e.t === 'snail' && e.state === 'walk') { e.state = 'shell'; e.vx = 0; e.h = 12; e.kickT = 10; continue; }
    W.killEnemy(e, 200);
  }
};

/* ---------------- الزعماء ---------------- */
function updateBoss(e) {
  const P = W.P, L = W.L, ar = L.arena, al = ar.l * T + 6, rt = ar.r * T - 6 - e.w, gy = ar.gy * T;
  e.age++; if (e.inv > 0) e.inv--; if (e.tele > 0) e.tele--;
  if (e.state === 'sleep') { if (L.arenaLocked && W.bossIntro <= 0) { e.state = 'idle'; e.timer = 50; W.bossName = BOSSNAME[e.kind]; W.hint = { text: '⚔ ' + BOSSNAME[e.kind], t: 120 }; } else { W.bossIntro = Math.max(0, (W.bossIntro || 0) - 1); e.act = false; return; } }
  e.act = true;
  if (e.state === 'die') {
    e.timer--; if (e.timer % 6 === 0) { F.explode(e.x + Z.rnd(0, e.w), e.y + Z.rnd(0, e.h), 12); AU.sfx('crush'); }
    e.y -= 0.05; W.shake = 5;
    if (e.timer <= 0) { e.rm = true; W.boss = null; W.openArena(); AU.sfx('win'); for (let i = 0; i < 14; i++) { const x = e.x + e.w / 2 - 40 + i * 6; W.L.g[Math.floor((e.y + e.h - 10) / T) - (i % 3)][Math.floor(x / T)] = 'o'; } W.items.push({ t: 'mush', x: e.x + e.w / 2 - 6, y: e.y, w: 12, h: 12, vx: 0.6, vy: -3, emerge: 0, onG: false }); AU.music(Object.assign({}, W.th.music, { drums: true })); }
    return;
  }
  const px = P.x + P.w / 2, ex = e.x + e.w / 2; const dir = px < ex ? -1 : 1;
  const en = e.enraged ? 1.35 : 1;
  const ground = () => { e.vy = Math.min(e.vy + 0.42, 7.5); W.moveX(e, e.vx); e.x = clamp(e.x, al, rt); W.moveY(e, e.vy); };
  const waves = (big) => { AU.sfx('pound'); W.shake = 10; F.ring(ex, e.y + e.h, 'rgba(255,255,255,.9)', 3, 2.6, 20); const y = e.y + e.h - 14; addProj('wave', ex - 20, y + 4, -1.9 * en, 0, { w: 10, h: 14, life: 160, t: 'proj' }); addProj('wave', ex + 20, y + 4, 1.9 * en, 0, { w: 10, h: 14, life: 160 }); if (big) { addProj('wave', ex - 20, y + 4, -1.2, 0, { w: 10, h: 14, life: 200 }); addProj('wave', ex + 20, y + 4, 1.2, 0, { w: 10, h: 14, life: 200 }); } if (P.onG && Math.abs(px - ex) < 40) { /* الضربة تؤثر بالموجات فقط */ } };
  const jumpAt = (vy, vx) => { e.vy = vy; e.vx = vx; e.onG = false; AU.sfx('kick'); };
  e.harmless = false; e.armor = false;
  switch (e.kind) {
    case 'golem': case 'king': {
      if (e.state === 'idle') { e.face = dir; e.vx = dir * 0.5 * en; e.timer--; if (e.timer <= 0) { if (e.kind === 'king' && Math.random() < 0.5) { e.state = Math.random() < 0.5 ? 'tele' : 'burst'; e.timer = 30; e.vx = 0; } else { e.state = 'air'; jumpAt(-8.4, clamp((px - ex) / 42, -2.4, 2.4)); } } }
      else if (e.state === 'air') { e.face = dir; if (e.onG && e.vy >= 0 && e.age > 6) { e.state = 'slam'; e.timer = 26; e.vx = 0; waves(e.enraged); } }
      else if (e.state === 'slam') { e.vx = 0; if (--e.timer <= 0) { e.state = 'idle'; e.timer = Z.rndi(50, 80) / en; } }
      else if (e.state === 'tele') { if (--e.timer === 15) { e.tele = 30; } if (e.timer <= 0) { e.x = clamp(al + Z.rnd(0, rt - al), al, rt); e.y = gy - e.h - (Math.random() < 0.5 ? 0 : 3 * T); e.vy = 0; e.state = 'shoot'; e.timer = 50; AU.sfx('ghost'); } }
      else if (e.state === 'shoot') { e.vx = 0; e.face = dir; if (e.timer % 14 === 0 && e.timer > 0) addProj('orb', ex, e.y + 10, dir * 0.6, -0.3, { life: 260 }); if (--e.timer <= 0) { e.state = 'idle'; e.timer = 60; } }
      else if (e.state === 'burst') { e.vx = 0; if (--e.timer <= 0) { AU.sfx('cannon'); for (let i = 0; i < (e.enraged ? 12 : 8); i++) { const a = i / (e.enraged ? 12 : 8) * Math.PI * 2 + e.age * 0.1; addProj('spark', ex, e.y + 14, Math.cos(a) * 1.5, Math.sin(a) * 1.5, { life: 150 }); } e.state = 'idle'; e.timer = 70; } }
      if (e.state === 'tele' || e.state === 'shoot') { if (e.state === 'shoot') { e.vy = 0; } } else ground();
      if (e.state === 'shoot' || e.state === 'tele') { e.y = Math.min(e.y, gy - e.h); }
      break; }
    case 'charger': {
      e.tail = e.state === 'idle' && e.timer < 20;
      if (e.state === 'idle') { e.face = dir; e.vx = dir * 0.6; if (--e.timer <= 0) { e.state = 'warn'; e.timer = e.enraged ? 22 : 40; e.vx = 0; } }
      else if (e.state === 'warn') { e.face = dir; e.vx = 0; e.armor = true; if (e.age % 4 === 0) F.dust(e.x + (dir > 0 ? 0 : e.w), e.y + e.h, 2, -dir); if (--e.timer <= 0) { e.state = 'charge'; e.vx = dir * 4.4 * (e.enraged ? 1.15 : 1); AU.sfx('whoosh'); } }
      else if (e.state === 'charge') { e.armor = true; if (e.age % 3 === 0) F.dust(e.x + e.w / 2, e.y + e.h, 2, -Math.sign(e.vx)); if (e.blockedX || (e.x <= al + 1 && e.vx < 0) || (e.x >= rt - 1 && e.vx > 0)) { e.state = 'stun'; e.timer = 100; e.vx = 0; W.shake = 12; AU.sfx('boss'); for (let i = 0; i < 6; i++) F.burst(e.x + e.w / 2, e.y + 4, 4, ['#ffe066', '#fff'], 2, 2.6); } }
      else if (e.state === 'stun') { e.vx = 0; e.harmless = true; if (e.age % 10 === 0) F.sparkle(e.x + e.w / 2, e.y - 4, ['#ffe066', '#fff']); if (--e.timer <= 0) { e.state = 'idle'; e.timer = 40; } }
      ground(); break; }
    case 'flyer': {
      const hy = gy - 9 * T, lowY = gy - e.h - 8;
      e.face = dir;
      if (e.state === 'idle') { e.state = 'hover'; e.timer = 200; e.bombs = 0; e.hoverY = hy; e.x = clamp(e.x, al, rt); }
      if (e.state === 'hover') { e.y += (hy + Math.sin(e.age / 24) * 10 - e.y) * 0.06; e.x += clamp(px - ex, -1.6, 1.6) * 0.5; e.x = clamp(e.x, al, rt); if (e.age % Math.floor(70 / en) === 0) { addProj('bomb', ex, e.y + 22, 0, 0, { g: 0.12, life: 260 }); e.bombs++; } if (--e.timer <= 0) { e.state = 'aim'; e.timer = 26; e.tx = px; } }
      else if (e.state === 'aim') { e.x += Math.sin(e.age * 1.4) * 0.8; e.armor = true; if (--e.timer <= 0) { e.state = 'dive'; e.timer = 50; } }
      else if (e.state === 'dive') { e.armor = true; e.x += clamp(e.tx - ex, -3.2, 3.2) * 0.6; e.y += 5.4; if (e.y >= lowY) { e.y = lowY; e.state = 'tired'; e.timer = 110; W.shake = 8; AU.sfx('crush'); F.dust(ex, gy, 8, 0); if (e.enraged) { for (const s of [-1, 1]) W.ents.push(Object.assign(mkBat(ex + s * 60, gy - 60))); } } }
      else if (e.state === 'tired') { e.harmless = false; if (e.age % 10 === 0) F.sparkle(ex, e.y - 4, ['#ffe066']); if (--e.timer <= 0) { e.state = 'rise'; } }
      else if (e.state === 'rise') { e.y -= 2.4; if (e.y <= hy) { e.state = 'hover'; e.timer = Math.floor(190 / en); } }
      break; }
    case 'thrower': {
      if (e.state === 'idle') { e.face = dir; e.vx = Math.sin(e.age / 60) * 0.4; e.timer--; if (e.timer <= 0) { e.count = (e.count || 0) + 1; if (e.count % 4 === 0) { e.state = 'air'; jumpAt(-8.6, clamp((px - ex) / 40, -2.4, 2.4)); } else { e.state = 'wind'; e.timer = 26; e.vx = 0; } } }
      else if (e.state === 'wind') { e.face = dir; e.vx = 0; if (--e.timer <= 0) { const k = W.th.key === 'snow' ? 'snowball' : 'coconut'; for (let i = 0; i < (e.enraged ? 2 : 1); i++) addProj(k, ex + dir * 12, e.y + 4, clamp((px - ex) / 52, -2.2, 2.2) + i * 0.7 * dir, -5 - i * 0.4, { g: 0.19, life: 200 }); AU.sfx('whoosh'); e.state = 'idle'; e.timer = Z.rndi(60, 90) / en; } }
      else if (e.state === 'air') { if (e.onG && e.vy >= 0 && e.age > 6) { e.state = 'slam'; e.timer = 30; e.vx = 0; waves(true); for (let i = 0; i < 4; i++) addProj('icicle', al + Z.rnd(10, rt - al), L.arena.gy * T - 13 * T + 4, 0, 2.6, { w: 6, h: 14, life: 200, g: 0.02 }); } }
      else if (e.state === 'slam') { e.vx = 0; if (--e.timer <= 0) { e.state = 'idle'; e.timer = 70; } }
      ground(); break; }
    case 'ghost': {
      if (e.state === 'idle') { e.state = 'fade'; e.timer = 26; }
      if (e.state === 'fade') { e.tele = 2; e.harmless = true; if (--e.timer <= 0) { e.x = clamp(al + Z.rnd(0, rt - al), al, rt); e.y = gy - e.h - [0, 0, 3 * T, 4 * T][Z.rndi(0, 3)]; e.state = 'appear'; e.timer = 24; AU.sfx('ghost'); } }
      else if (e.state === 'appear') { e.tele = 2; e.harmless = true; if (--e.timer <= 0) { e.state = 'shoot'; e.timer = 44; } }
      else if (e.state === 'shoot') { e.face = dir; if (e.timer % 14 === 0 && e.timer > 0) addProj('orb', ex, e.y + 10, dir * 0.6, -0.2, { life: 300 }); if (--e.timer <= 0) { e.state = 'wait'; e.timer = Math.floor(90 / en); } }
      else if (e.state === 'wait') { e.face = dir; e.y += Math.sin(e.age / 10) * 0.3; if (--e.timer <= 0) { e.state = 'fade'; e.timer = 22; } }
      break; }
    case 'fire': {
      if (e.state === 'idle') { e.face = dir; e.vx = dir * 0.55 * en; if (--e.timer <= 0) { const r = Math.random(); if (r < 0.6) { e.state = 'windup'; e.timer = 26; e.vx = 0; } else { e.state = 'air'; jumpAt(-8, clamp((px - ex) / 42, -2.2, 2.2)); } } }
      else if (e.state === 'windup') { e.face = dir; e.vx = 0; e.armor = true; if (--e.timer <= 0) { e.state = 'breath'; e.timer = e.enraged ? 70 : 52; AU.sfx('fire'); } }
      else if (e.state === 'breath') { e.vx = 0; if (e.timer % 3 === 0) addProj('flame', ex + e.face * 24, e.y + e.h - 14, e.face * 3.3, 0, { w: 9, h: 9, life: 60 }); if (--e.timer <= 0) { e.state = 'idle'; e.timer = Z.rndi(50, 80) / en; } }
      else if (e.state === 'air') { if (e.onG && e.vy >= 0 && e.age > 6) { e.state = 'slam'; e.timer = 20; e.vx = 0; waves(false); } }
      else if (e.state === 'slam') { e.vx = 0; if (--e.timer <= 0) { e.state = 'idle'; e.timer = 50; } }
      ground(); break; }
  }
  // تلامس مع اللاعب
  if (!P.dead && !P.flag && overlap(P, e) && !e.harmless) {
    const fromAbove = P.vy > 0.2 && P.y + P.h - P.vy <= e.y + Math.min(18, e.h * 0.45);
    const attacking = P.dashT > 0 || P.star > 0 || (P.poundGo && P.vy > 3);
    if (attacking && e.inv <= 0) { hitBoss(e, 1); P.vx = -P.face * 2; P.dashT = 0; P.vy = -4; }
    else if (fromAbove) { if (e.armor || e.inv > 0) { P.vy = -6; P.y = e.y - P.h; AU.sfx('bump'); } else { if (hitBoss(e, 1)) { P.vy = -8.2; P.y = e.y - P.h; P.airJumps = 1; P.dashAir = false; P.poundGo = false; } } }
    else W.hurtPlayer(ex);
  }
}
function mkBat(x, y) { return { t: 'bat', x: x - 6, y: y - 5, w: 12, h: 10, vx: 0, vy: 0, face: -1, age: 0, state: 'fly', by: y - 5, bx: x - 6, cd: 30, act: true, dead: false }; }

/* ---------------- العناصر ---------------- */
W.updateItems = () => {
  const P = W.P;
  for (const it of W.items) {
    if (it.emerge > 0) { it.emerge -= 0.5; it.y = it.sy - (16 - it.emerge); continue; }
    if (it.t === 'fire' || it.t === 'feather') { it.vy = Math.min(it.vy + 0.3, 5); W.moveY(it, it.vy); }
    else { it.vy = Math.min(it.vy + 0.33, 6); if (it.t === 'star') { W.moveX(it, it.vx); if (it.blockedX) it.vx = -it.vx; W.moveY(it, it.vy); if (it.onG) it.vy = -5.4; } else { W.moveX(it, it.vx); if (it.blockedX) it.vx = -it.vx; W.moveY(it, it.vy); } }
    if (it.y > W.L.H * T + 20) it.rm = true;
    if (!P.dead && overlap(P, it)) {
      it.rm = true;
      if (it.t === 'life') W.oneUp(it.x, it.y);
      else if (it.t === 'heart') { W.heal(1); }
      else W.givePower(it.t);
    }
  }
  W.items = W.items.filter(i => !i.rm);
};

/* ---------------- الرسم ---------------- */
W.drawEnemies = (c, t, pass) => {
  const th = W.th, cam = W.cam;
  for (const e of W.ents) {
    if (e.rm) continue;
    const back = e.t === 'piranha' || e.t === 'fireball';
    if ((pass === 'behind') !== back) continue;
    if (e.x + e.w < cam.x - 60 || e.x > cam.x + VW + 60 || e.y + e.h < cam.y - 90 || e.y > cam.y + VH + 90) continue;
    if (e.t === 'boss') { if (e.state === 'sleep') continue; A.drawBoss(c, e, t, th); if (e.state === 'stun') { for (let i = 0; i < 3; i++) { const a = e.age * 0.15 + i * 2.1; D_star(c, e.x + e.w / 2 + Math.cos(a) * 12, e.y - 6 + Math.sin(a) * 3, 3); } } continue; }
    A.drawEnemy(c, e, t, th);
  }
};
function D_star(c, x, y, r) { Z.draw.star(c, x, y, r, '#ffe066', '#a06a00', 0); }
})();
