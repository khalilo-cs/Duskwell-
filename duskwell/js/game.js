'use strict';
// Game state, rooms, camera, menus, HUD and the main loop.
const STEP = 1 / 60;
const SAVE_KEY = 'duskwell_save_v1';
const AREA_COLORS = { hushvale: '#ffd98a', crossroads: '#9cc4ff', mossgrove: '#9dff9a', crystal: '#ff9bd6', throne: '#e6f0ff', spore: '#ffb070', aqueduct: '#8fe0ff', webbed: '#c8a8ff', rustworks: '#ff9c5a' };

const G = {
  state: 'title', canvas: null, g: null, k: 1, time: 0, deaths: 0, t: 0,
  level: null, player: new Player(), enemies: [], projs: [], geos: [], items: [], parts: [], fx: [],
  benches: [], npcs: [], signs: [], gates: [], cam: { x: 0, y: 0 }, camV: { x: 0, y: 0 }, shakeT: 0, shakeA: 0, hitstopT: 0, slowmo: 0, flash: 0,
  flags: {}, visited: {}, shade: null, bench: null, arena: null, boss: null, bossBarShow: false, floorY: 0,
  fadeA: 0, trans: null, afterTrans: 'play', doorLock: false, dialog: null, shop: null, banner: null, toast: null,
  areaBanner: null, menuSel: 0, menu: 'main', confirmNew: false, mapPulse: 0, tileCanvas: null, tileScale: 0, tileRoom: '',
  geoPulse: 0, ending: null, deathText: 0, lastArea: '', charmSel: 0, charmNote: null, shopTop: 0, stations: [], look: 0, lookT: 0, lookDir: 0,
};
const P = G.player;

// ---------------------------------------------------------------- effects API used by entities
G.burst = function (x, y, n, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 900) break;
    const a = rand(0, Math.PI * 2), sp = (o.speed || 120) * rand(0.3, 1);
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.vy || 0), life: (o.life || 0.5) * rand(0.6, 1), t: 0, size: (o.size || 3) * rand(0.6, 1.2), color: o.color || '#fff', grav: o.grav == null ? 300 : o.grav });
  }
};
G.shake = function (a, t) { if (a >= G.shakeA || G.shakeT <= 0) { G.shakeA = a; } G.shakeT = Math.max(G.shakeT, t); };
G.hitstop = function (t) { G.hitstopT = Math.max(G.hitstopT, t); };
G.ring = function (x, y, color, flat) { G.fx.push({ type: 'ring', x, y, t: 0, life: 0.5, color, flat }); };
G.slashFx = function (x, y, dir) { G.fx.push({ type: 'slash', x, y, dir: dir || 1, t: 0, life: 0.16 }); };
G.dropGeo = function (x, y, total) {
  let n = 0;
  while (total >= 25 && n < 12) { G.geos.push(new Geo(x - 6, y - 6, 25)); total -= 25; n++; }
  while (total >= 5 && n < 16) { G.geos.push(new Geo(x - 4, y - 4, 5)); total -= 5; n++; }
  while (total > 0 && n < 20) { G.geos.push(new Geo(x - 3, y - 3, 1)); total--; n++; }
};
G.clearHostile = function () { G.projs = G.projs.filter(p => p.friendly); };
G.breakTile = function (tx, ty) {
  const L = G.level;
  L.set(tx, ty, T_AIR); G.flags['brk_' + L.id + '_' + tx + '_' + ty] = true;
  Sound.play('break'); G.shake(3, 0.12);
  G.burst(tx * TILE + 16, ty * TILE + 16, 12, { color: '#8d97a3', speed: 180, life: 0.6, size: 4 });
};
// cracked floors collapse as a whole connected piece
G.breakCrack = function (tx, ty) {
  const L = G.level, stack = [[tx, ty]];
  let n = 0;
  while (stack.length && n < 400) {
    const [x, y] = stack.pop();
    if (L.get(x, y) !== T_CRACK) continue;
    L.set(x, y, T_AIR); G.flags['brk_' + L.id + '_' + x + '_' + y] = true; n++;
    G.burst(x * TILE + 16, y * TILE + 16, 5, { color: '#9aa4b0', speed: 200, life: 0.7, size: 4 });
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  Sound.play('break'); G.shake(8, 0.3);
};
function sealCount() { return SEAL_FLAGS.filter(f => G.flags[f]).length; }
G.toastMsg = function (text, dur) { G.toast = { text, t: 0, dur: dur || 2.2 }; };

// ---------------------------------------------------------------- saving
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, room: G.bench.room, maxHp: P.maxHp, ab: P.ab, geo: P.geo, nail: P.nail, soulGain: P.soulGain, flags: G.flags,
      shade: G.shade, visited: G.visited, time: G.time, deaths: G.deaths, charms: Charms.save(),
    }));
  } catch (e) { /* storage may be blocked */ }
}
function readSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 && WORLD.rooms[s.room] ? s : null; } catch (e) { return null; }
}
G.hasSave = readSave() !== null;

// ---------------------------------------------------------------- rooms
function enterRoom(id, spawn) {
  const def = WORLD.rooms[id];
  const L = new Level(def);
  G.level = L;
  G.enemies = []; G.projs = []; G.geos = []; G.items = []; G.fx = []; G.parts = [];
  G.benches = def.benches.map(b => ({ x: b.x, y: b.y, px: b.x * TILE + 16, py: (b.y + 1) * TILE, room: id }));
  G.npcs = def.npcs.map(n => ({ type: n.type, px: n.x * TILE + 16, py: (n.y + 1) * TILE }));
  G.stations = def.stations.map(t => ({ px: t.x * TILE + 16, py: (t.y + 1) * TILE, room: id }));
  G.signs = def.signs.map(s => ({ text: s.text, px: s.x * TILE + 16, py: (s.y + 1) * TILE }));
  G.gates = []; G.arena = null; G.boss = null; G.bossBarShow = false; G.doorLock = true;
  // persistent changes
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const v = L.get(x, y); if ((v === T_BREAK || v === T_CRACK) && G.flags['brk_' + id + '_' + x + '_' + y]) L.set(x, y, T_AIR); }
  for (const e of def.enemies) { const en = new ENEMY_TYPES[e.type](e); en.kind = e.type; G.enemies.push(en); }
  for (const it of def.items) if (!G.flags[it.id]) G.items.push(new Item(it));
  Mech.init(def);
  if (G.shade && G.shade.room === id) {
    const s = new ShadeEnemy({ x: 0, y: 0 }, G.shade.geo); s.kind = 'shade';
    s.x = G.shade.x - s.w / 2; s.y = G.shade.y - s.h / 2; s.home = { x: G.shade.x, y: G.shade.y };
    G.enemies.push(s);
  }
  if (def.arena) {
    const a = def.arena;
    G.arena = { def: a, state: G.flags[a.flag] ? 'won' : 'idle' };
    if (G.arena.state === 'idle') { for (const gt of a.gates) if (gt.close === 'always') closeGate(gt, true); }
    else for (const r of [a.reward, a.reward2]) if (r && !G.flags[r.id]) G.items.push(new Item(r));
    let fy = a.spawn.y; while (fy < L.h - 1 && !L.solid(a.spawn.x, fy)) fy++;
    G.floorY = fy * TILE;
  }
  if (def.sealGate && sealCount() < def.sealGate.need) closeGate(def.sealGate, true);
  // player placement
  if (spawn.bench) {
    const b = G.benches.find(b => b.room === id) || G.benches[0];
    P.place(b.px, b.py, 1); P.sit(b); G.bench = { room: id };
  } else if (spawn.door) {
    const d = def.doors.find(d => d.id === spawn.door);
    const cx = (d.x + d.w / 2) * TILE;
    let fx, fy, face = 1, vy = 0;
    if (d.x === 0) { fx = 2.5 * TILE; fy = (d.y + d.h) * TILE; face = 1; }
    else if (d.x + d.w === L.w) { fx = L.pw - 2.5 * TILE; fy = (d.y + d.h) * TILE; face = -1; }
    else if (d.y === 0) { fx = cx; fy = (d.y + d.h + 2.5) * TILE; face = pick([-1, 1]); }
    else { fx = cx; fy = d.y * TILE; vy = -900; }
    const keep = { hp: P.hp, soul: P.soul };
    P.place(fx, fy, face); P.vy = vy; P.hp = keep.hp; P.soul = keep.soul;
  } else if (spawn.station && G.stations.length) {
    P.place(G.stations[0].px, G.stations[0].py, 1);
  } else if (spawn.pos) {
    P.place(spawn.pos.x, spawn.pos.y, 1);
  }
  G.visited[id] = true;
  Sound.setTheme(def.theme); Sound.boss(false); syncAbilityButtons();
  // painted backdrops for this area, then for the areas behind its doors so they are ready in time
  Art.loadPainted(def.theme);
  for (const d of def.doors) { const n = WORLD.rooms[d.to]; if (n && n.theme !== def.theme) Art.loadPainted(n.theme); }
  Art.loadPainted(def.theme);
  if (def.arena && !G.flags[def.arena.flag]) Sound.prefetch(def.arena.boss === 'king');
  Art.ambientInit();
  snapCamera();
  if (def.area !== G.lastArea) { G.areaBanner = { key: 'area_' + def.area, t: 0, color: AREA_COLORS[def.area] }; G.lastArea = def.area; }
  G.tileCanvas = null;
}
function closeGate(gt, silent) {
  const L = G.level;
  for (let y = gt.y; y < gt.y + gt.h; y++) for (let x = gt.x; x < gt.x + gt.w; x++) { L.set(x, y, T_GATE); G.gates.push({ x, y }); }
  if (!silent) { Sound.play('door'); G.shake(6, 0.4); G.burst((gt.x + gt.w / 2) * TILE, (gt.y + gt.h / 2) * TILE, 14, { color: '#8d97a3', speed: 160, life: 0.6, size: 4 }); }
}
function openGates() {
  const L = G.level;
  for (const gt of G.gates) { L.set(gt.x, gt.y, T_AIR); G.burst(gt.x * TILE + 16, gt.y * TILE + 16, 8, { color: '#8d97a3', speed: 160, life: 0.6, size: 4 }); }
  G.gates = []; Sound.play('door');
}
function snapCamera() {
  const c = cameraTarget(); G.cam.x = c.x; G.cam.y = c.y; G.camV = { x: 0, y: 0 };
}
// Camera bounds of the current room; a room smaller than the view is centred.
function cameraBounds() {
  const L = G.level;
  const cxw = L.pw <= VW ? -(VW - L.pw) / 2 : null, cyh = L.ph <= VH ? -(VH - L.ph) / 2 : null;
  return { x0: cxw ?? 0, x1: cxw ?? L.pw - VW, y0: cyh ?? 0, y1: cyh ?? L.ph - VH };
}
function cameraTarget() {
  const b = cameraBounds();
  return { x: clamp(P.cx - VW / 2 + P.face * 36, b.x0, b.x1), y: clamp(P.cy - VH / 2 - 24 + G.look, b.y0, b.y1) };
}

G.fadeTo = function (fn, out, hold, inn) {
  if (G.state === 'trans') return;
  G.trans = { t: 0, out: out == null ? 0.25 : out, hold: hold || 0, inn: inn == null ? 0.3 : inn, fn, done: false };
  G.afterTrans = 'play'; G.state = 'trans';
};
G.respawnFade = function (x, y) {
  G.fadeTo(() => {
    P.x = x - P.w / 2; P.y = y - P.h; P.vx = 0; P.vy = 0; P.invuln = 1.4; P.hurtT = 0; snapCamera();
  }, 0.2, 0.05, 0.25);
};
G.onPlayerDeath = function () {
  G.slowmo = 1.2; G.shake(10, 0.6); G.flash = 0.5;
  G.burst(P.cx, P.cy, 30, { color: '#e9f3ff', speed: 260, life: 0.9, size: 4 });
  G.state = 'dying'; G.dyingT = 0;
  Sound.boss(false);
};
G.shadeRecovered = function (amount) { G.shade = null; G.toastMsg(tr('shadowKilled') + '  +' + amount, 3); Sound.play('heal'); };
G.collectItem = function (it) {
  const d = it.def;
  if (d.kind === 'cache') {
    P.geo += d.amount; G.flags[d.id] = true; Sound.play('geo'); G.burst(it.x, it.y, 18, { color: '#ffe9a0', speed: 200, life: 0.7, size: 3 });
    G.toastMsg(tr('cache_d') + '  +' + d.amount, 3); return;
  }
  G.flags[d.id] = true;
  if (d.kind === 'seed') { P.maxHp++; P.hp = P.maxHp; G.banner = { title: tr('seed'), desc: tr('seed_d'), t: 0 }; }
  else if (d.kind === 'fang') { P.nail += 3; G.banner = { title: tr('fang'), desc: tr('fang_d'), t: 0, big: true }; }
  else if (d.kind === 'charm') {
    Charms.give(d.charm);
    G.banner = { title: Charms.name(d.charm), desc: Charms.desc(d.charm) + '  ' + tr('charm_found_d'), t: 0, charm: d.charm };
  }
  else if (d.kind === 'ability') {
    P.ab[d.ability] = true;
    G.banner = { title: tr('abil_' + d.ability), desc: tr('abil_' + d.ability + '_d'), t: 0, big: true };
  }
  syncAbilityButtons();
  Sound.play('ability'); G.ring(it.x, it.y, '#ffffff'); G.flash = 0.6;
  G.burst(it.x, it.y, 30, { color: '#e6f3ff', speed: 240, life: 1, size: 3, grav: -60 });
  G.state = 'banner';
};
G.onBossDying = function (b) { G.bossBarShow = true; };
G.onBossDeath = function (b) {
  const a = G.arena; if (!a) return;
  a.state = 'won'; G.flags[a.def.flag] = true; G.boss = null; G.bossBarShow = false;
  for (const e of G.enemies) if (e.kind === 'brood_child') e.dead = true;
  G.dropGeo(b.cx, b.cy, b.geo); G.flash = 0.8; Sound.boss(false);
  G.burst(b.cx, b.cy, 50, { color: '#ffffff', speed: 360, life: 1.2, size: 4, grav: -30 });
  openGates();
  for (const r of [a.def.reward, a.def.reward2]) if (r) G.items.push(new Item(r));
  if (a.def.ending) { G.ending = { t: 0 }; G.fadeTo(() => { G.state = 'ending'; G.afterTrans = 'ending'; Sound.setTheme('title'); }, 2.2, 0.4, 1.5); saveGame(); }
};

function startGame(useSave) {
  Object.assign(P, new Player());
  G.look = 0; G.lookT = 0; G.lookDir = 0;
  G.flags = {}; G.visited = {}; G.shade = null; G.time = 0; G.deaths = 0; G.lastArea = ''; G.ending = null; Charms.reset();
  let room = WORLD.startRoom, spawn = { pos: { x: WORLD.startPos.x * TILE + 16, y: (WORLD.startPos.y + 1) * TILE } };
  const s = useSave ? readSave() : null;
  if (s) {
    P.maxHp = s.maxHp; P.hp = s.maxHp; P.ab = Object.assign(P.ab, s.ab); P.geo = s.geo; P.nail = s.nail; P.soulGain = s.soulGain;
    G.flags = s.flags || {}; G.shade = s.shade; G.visited = s.visited || {}; G.time = s.time || 0; G.deaths = s.deaths || 0; Charms.load(s.charms);
    room = s.room; spawn = { bench: true };
  } else {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    G.bench = { room: 'town' };
  }
  enterRoom(room, spawn);
  G.afterTrans = 'play';
}

// ---------------------------------------------------------------- interaction
function nearest(list, px, range) {
  let best = null, bd = range;
  for (const o of list) { const d = Math.abs(o.px - P.cx); if (d < bd && Math.abs(o.py - (P.y + P.h)) < 60) { best = o; bd = d; } }
  return best;
}
function interact() {
  const b = nearest(G.benches, P.cx, 54);
  if (b) { P.sit(b); G.bench = { room: G.level.id }; Sound.play('bench'); saveGame(); G.hasSave = true; G.toastMsg(tr('saved'), 1.6); G.burst(b.px, b.py - 40, 16, { color: '#cfe6ff', speed: 90, life: 0.9, size: 3, grav: -90 }); return true; }
  const stn = nearest(G.stations, P.cx, 54);
  if (stn) {
    if (!stationLit(stn.room)) {
      G.flags['station_' + stn.room] = true; Sound.play('bench'); G.toastMsg(tr('stationLit'), 2.2);
      G.burst(stn.px, stn.py - 70, 18, { color: '#ffd98a', speed: 110, life: 0.9, size: 3, grav: -100 }); G.ring(stn.px, stn.py - 70, '#ffd98a', 0.4);
      return true;
    }
    if (!stationList().length) { G.toastMsg(tr('stationNone'), 2.6); return true; }
    G.state = 'travel'; G.menuSel = 0; Sound.play('select'); return true;
  }
  const n = nearest(G.npcs, P.cx, 70);
  if (n) {
    if (n.type === 'elder') G.dialog = { lines: [tr('elder1'), tr('elder2'), tr('elder3')], i: 0, t: 0 };
    else G.dialog = { lines: [tr('merchant')], i: 0, t: 0, shop: true };
    G.state = 'dialog'; Sound.play('select'); return true;
  }
  const s = nearest(G.signs, P.cx, 54);
  if (s) {
    const text = s.text === 'seal_gate' ? tr('seal_gate') + '  ' + sealCount() + ' / ' + SEAL_FLAGS.length : tr(s.text);
    G.dialog = { lines: [text], i: 0, t: 0 }; G.state = 'dialog'; Sound.play('select'); return true;
  }
  return false;
}
// ---------------------------------------------------------------- lantern stations (fast travel)
const STATION_FARE = 25;
const stationLit = room => room === 'town' || !!G.flags['station_' + room];
function stationList() {
  return WORLD.order.filter(id => WORLD.rooms[id].stations.length && stationLit(id) && id !== G.level.id)
    .map(id => ({ id, name: tr('area_' + WORLD.rooms[id].area), color: AREA_COLORS[WORLD.rooms[id].area] }));
}
function updateTravel() {
  const list = stationList(), n = list.length + 1;
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'play'; Input.consume('pause'); Input.consume('map'); return; }
  if (menuNav(n)) {
    if (G.menuSel === n - 1) { G.state = 'play'; return; }
    if (P.geo < STATION_FARE) { Sound.play('hurt'); G.toastMsg(tr('noGeo'), 1.5); return; }
    const dest = list[G.menuSel].id;
    P.geo -= STATION_FARE; Sound.play('confirm');
    G.fadeTo(() => enterRoom(dest, { station: true }), 0.5, 0.2, 0.5);
  }
  G.menuSel = Math.min(G.menuSel, n - 1);
}

const SHOP_ITEMS = [
  { id: 'buy_mask', name: 'itemMask', desc: 'itemMaskD', price: 150, icon: 'mask', apply() { P.maxHp++; P.hp = P.maxHp; } },
  { id: 'buy_nail', name: 'itemNail', desc: 'itemNailD', price: 250, icon: 'nail', apply() { P.nail += 4; } },
  { id: 'buy_nail2', name: 'itemNail2', desc: 'itemNailD', price: 700, icon: 'nail', needs: 'buy_nail', apply() { P.nail += 4; } },
  { id: 'buy_nail3', name: 'itemNail3', desc: 'itemNailD', price: 1400, icon: 'nail', needs: 'buy_nail2', apply() { P.nail += 4; } },
  { id: 'buy_soul', name: 'itemSoul', desc: 'itemSoulD', price: 180, icon: 'soul', apply() { P.soulGain = 17; } },
  { id: 'buy_notch1', name: 'itemNotch', desc: 'itemNotchD', price: 300, icon: 'notch', apply() { /* the notch count reads this flag */ } },
  { id: 'buy_notch2', name: 'itemNotch', desc: 'itemNotchD', price: 550, icon: 'notch', needs: 'buy_notch1', apply() { /* the notch count reads this flag */ } },
  { id: 'buy_wail', name: 'itemWail', desc: 'itemWailD', price: 500, icon: 'soul', apply() { P.ab.wail = true; G.banner = { title: tr('abil_wail'), desc: tr('abil_wail_d'), t: 0 }; G.state = 'banner'; } },
  { id: 'buy_reach', charm: 'reach', price: 120, apply() { Charms.give('reach'); } },
  { id: 'buy_boots', charm: 'boots', price: 100, apply() { Charms.give('boots'); } },
  { id: 'buy_magnet', charm: 'magnet', price: 90, apply() { Charms.give('magnet'); } },
];
const shopList = () => SHOP_ITEMS.filter(it => !it.needs || G.flags[it.needs]);
const shopName = it => (it.charm ? Charms.name(it.charm) : tr(it.name));
const shopDesc = it => (it.charm ? Charms.desc(it.charm) : tr(it.desc));

// ---------------------------------------------------------------- update
function updateParticles(dt) {
  for (const p of G.parts) { p.t += dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; }
  G.parts = G.parts.filter(p => p.t < p.life);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.life);
}

function updatePlay(dt) {
  const L = G.level;
  if (Input.pressed('pause')) { G.state = 'pause'; G.menu = 'pause'; G.menuSel = 0; Input.consume('pause'); return; }
  if (Input.pressed('map')) { G.state = 'map'; Input.consume('map'); Sound.play('select'); return; }
  G.time += dt;
  Mech.update(dt);
  P.update(dt);
  if (G.state !== 'play') return;           // hurt() may have changed it
  // a cracked soul vessel: while the shade still holds your Geo, only two thirds of the soul can be kept
  P.maxSoul = G.shade ? 66 : 99; if (P.soul > P.maxSoul) P.soul = P.maxSoul;
  // looking up or down: hold the key while standing still and the camera drifts that way
  const still = P.onGround && !P.sitting && Input.axisX() === 0 && P.atkT <= 0 && P.hurtT <= 0 && !P.diving && !P.sd && !P.wailT;
  const iy = still ? Input.axisY() : 0;
  if (iy !== 0 && iy === G.lookDir) G.lookT += dt; else { G.lookDir = iy; G.lookT = 0; }
  G.look = lerp(G.look, G.lookT > 0.55 ? G.lookDir * 130 : 0, 1 - Math.exp(-dt * 5));
  if (Input.pressed('up') && !P.sitting && P.onGround && P.hurtT <= 0 && P.atkT <= 0) interact();
  if (Input.pressed('mute')) Sound.toggle();

  for (const e of G.enemies) e.update(dt);
  for (const p of G.projs) p.update(dt);
  for (const c of G.geos) c.update(dt);
  for (const it of G.items) it.update(dt);
  G.enemies = G.enemies.filter(e => !e.dead); G.projs = G.projs.filter(p => !p.dead);
  G.geos = G.geos.filter(c => !c.dead); G.items = G.items.filter(i => !i.dead);

  // contact damage
  if (!P.dead) {
    const hb = P.hurtbox();
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || e.dmg <= 0) continue;
      if (e.isBoss && (e.state === 'intro' || e.state === 'dying')) continue;
      if (e.alpha !== undefined && e.alpha < 0.6) continue;
      if (overlap(hb, e.body())) P.hurt(e.dmg, e.cx);
    }
  }

  // arena trigger
  const a = G.arena;
  if (a && a.state === 'idle' && ((a.def.triggerDir || 1) > 0 ? P.cx > a.def.trigger * TILE : P.cx < a.def.trigger * TILE) && P.onGround) {
    a.state = 'fight';
    for (const gt of a.def.gates) if (gt.close === 'start') closeGate(gt);
    const B = BOSS_TYPES[a.def.boss];
    const boss = new B({ x: a.def.spawn.x, y: a.def.spawn.y });
    G.enemies.push(boss); G.boss = boss;
    Sound.boss(true, a.def.boss === 'king');
  }

  // doors
  if (G.doorLock) {
    let inside = false;
    for (const d of L.def.doors) if (P.cx > d.x * TILE && P.cx < (d.x + d.w) * TILE && P.cy > d.y * TILE && P.cy < (d.y + d.h) * TILE) inside = true;
    if (!inside) G.doorLock = false;
  } else if (!P.dead) {
    for (const d of L.def.doors) {
      if (P.cx > d.x * TILE && P.cx < (d.x + d.w) * TILE && P.cy > d.y * TILE && P.cy < (d.y + d.h) * TILE) {
        if (L.get(d.x, d.y) === T_GATE) continue;
        const target = { room: d.to, door: d.toDoor };
        G.fadeTo(() => enterRoom(target.room, { door: target.door }), 0.22, 0.05, 0.28);
        break;
      }
    }
  }
  // keep inside the room
  if (P.x < 0) { P.x = 0; P.vx = Math.max(0, P.vx); }
  if (P.x + P.w > L.pw) { P.x = L.pw - P.w; P.vx = Math.min(0, P.vx); }
  if (P.y > L.ph + 200) { P.spikeHurt(); }

  // camera: SmoothDamp toward the target, then clamp to the room bounds
  const c = cameraTarget();
  [G.cam.x, G.camV.x] = smoothDamp(G.cam.x, c.x, G.camV.x, 0.16, dt);
  [G.cam.y, G.camV.y] = smoothDamp(G.cam.y, c.y, G.camV.y, P.vy > 400 ? 0.1 : 0.24, dt);
  const b = cameraBounds();
  G.cam.x = clamp(G.cam.x, b.x0, b.x1); G.cam.y = clamp(G.cam.y, b.y0, b.y1);
}

function updateTrans(dt) {
  const tr_ = G.trans; tr_.t += dt;
  if (tr_.t < tr_.out) G.fadeA = tr_.t / tr_.out;
  else {
    if (!tr_.done) { tr_.done = true; G.fadeA = 1; tr_.fn(); }
    const u = tr_.t - tr_.out - tr_.hold;
    if (u < 0) G.fadeA = 1;
    else if (u < tr_.inn) G.fadeA = 1 - u / tr_.inn;
    else { G.fadeA = 0; G.trans = null; if (G.state === 'trans') G.state = G.afterTrans || 'play'; }
  }
}

function updateDying(dt) {
  G.dyingT += dt;
  if (G.dyingT > 1.3 && !G.trans) {
    G.fadeTo(() => {
      G.deaths++;
      const dropGeo = P.geo;
      G.shade = dropGeo > 0 ? { room: G.level.id, x: clamp(P.cx, 40, G.level.pw - 40), y: clamp(P.cy, 40, G.level.ph - 60), geo: dropGeo } : (G.shade && G.shade.room ? G.shade : null);
      if (dropGeo > 0) P.geo = 0;
      P.hp = P.maxHp; P.soul = 0; P.dead = false;
      enterRoom(G.bench.room, { bench: true });
      G.deathText = 3;
      G.afterTrans = 'play';
    }, 0.6, 0.6, 0.6);
  }
}

function menuNav(n) {
  if (Input.pressed('up')) { G.menuSel = (G.menuSel + n - 1) % n; Sound.play('select'); }
  if (Input.pressed('down')) { G.menuSel = (G.menuSel + 1) % n; Sound.play('select'); }
  return Input.pressed('confirm');
}

function updateTitle() {
  const items = titleItems();
  if (G.confirmNew) {
    if (Input.pressed('left') || Input.pressed('right') || Input.pressed('up') || Input.pressed('down')) { G.menuSel ^= 1; Sound.play('select'); }
    if (Input.pressed('confirm')) { Sound.play('confirm'); if (G.menuSel === 0) { G.confirmNew = false; G.fadeTo(() => startGame(false), 0.5, 0.2, 0.6); } else G.confirmNew = false; G.menuSel = 0; }
    if (Input.pressed('pause')) { G.confirmNew = false; G.menuSel = 0; }
    return;
  }
  if (menuNav(items.length)) {
    Sound.play('confirm');
    const it = items[G.menuSel].id;
    if (it === 'cont') G.fadeTo(() => startGame(true), 0.5, 0.2, 0.6);
    else if (it === 'new') { if (G.hasSave) { G.confirmNew = true; G.menuSel = 1; } else G.fadeTo(() => startGame(false), 0.5, 0.2, 0.6); }
    else if (it === 'lang') { setLang(LANG.cur === 'ar' ? 'en' : 'ar'); }
  }
}
function titleItems() {
  const a = [];
  if (G.hasSave) a.push({ id: 'cont', label: tr('cont') });
  a.push({ id: 'new', label: tr('newgame') });
  a.push({ id: 'lang', label: tr('lang') });
  return a;
}
function pauseItems() {
  return [{ id: 'resume', label: tr('resume') }, { id: 'map', label: tr('map') }, { id: 'charms', label: tr('charms') },
    { id: 'sound', label: tr('sound') + ': ' + (Sound.isOn() ? tr('on') : tr('off')) },
    { id: 'lang', label: tr('lang') }, { id: 'look', label: (LANG.cur === 'ar' ? 'شكل البطل: ' : 'Hero look: ') + HeroStyle.label() }, { id: 'skins', label: LANG.cur === 'ar' ? 'صورك الخاصة' : 'Your images' }, { id: 'quit', label: tr('quit') }];
}
function updatePause() {
  const items = pauseItems();
  if (Skins.isOpen()) return;
  if (Input.pressed('pause')) { G.state = 'play'; Input.consume('pause'); return; }
  if (menuNav(items.length)) {
    Sound.play('confirm');
    const id = items[G.menuSel].id;
    if (id === 'resume') G.state = 'play';
    else if (id === 'map') G.state = 'map';
    else if (id === 'charms') { G.state = 'charms'; G.charmSel = 0; G.charmNote = null; }
    else if (id === 'sound') Sound.toggle();
    else if (id === 'lang') setLang(LANG.cur === 'ar' ? 'en' : 'ar');
    else if (id === 'skins') Skins.open();
    else if (id === 'look') HeroStyle.next();
    else if (id === 'quit') { G.fadeTo(() => { G.state = 'title'; G.afterTrans = 'title'; G.menuSel = 0; Sound.boss(false); Sound.setTheme('title'); G.hasSave = readSave() !== null; }, 0.4, 0.1, 0.4); }
  }
}

function updateDialog(dt) {
  const d = G.dialog; d.t += dt;
  if (Input.pressed('confirm') || Input.pressed('attack') || Input.pressed('up')) {
    Sound.play('select');
    if (d.i < d.lines.length - 1) { d.i++; d.t = 0; }
    else if (d.shop) { G.dialog = null; G.state = 'shop'; G.menuSel = 0; }
    else { G.dialog = null; G.state = 'play'; }
  }
}
function updateShop() {
  const list = shopList(), n = list.length + 1, VIS = 6;
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'play'; Input.consume('pause'); return; }
  if (menuNav(n)) {
    if (G.menuSel === n - 1) { G.state = 'play'; return; }
    const it = list[G.menuSel];
    if (G.flags[it.id]) { Sound.play('hit'); return; }
    if (P.geo < it.price) { Sound.play('hurt'); G.toastMsg(tr('noGeo'), 1.5); return; }
    P.geo -= it.price; G.flags[it.id] = true; it.apply(); Sound.play('ability');
    G.toastMsg(shopName(it), 1.8);
  }
  G.menuSel = Math.min(G.menuSel, n - 1);
  if (G.menuSel < G.shopTop) G.shopTop = G.menuSel;
  if (G.menuSel >= G.shopTop + VIS) G.shopTop = G.menuSel - VIS + 1;
}

// ---------------------------------------------------------------- the charm screen
const CHARM_COLS = 7;
function updateCharms(dt) {
  const list = Charms.ownedList(), n = list.length;
  if (G.charmNote) { G.charmNote.t += dt; if (G.charmNote.t > 3) G.charmNote = null; }
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'pause'; Input.consume('pause'); Input.consume('map'); Sound.play('select'); return; }
  if (!n) return;
  G.charmSel = clamp(G.charmSel, 0, n - 1);
  const move = d => { G.charmSel = clamp(G.charmSel + d, 0, n - 1); Sound.play('select'); };
  if (Input.pressed('left')) move(-1);
  if (Input.pressed('right')) move(1);
  if (Input.pressed('up')) move(-CHARM_COLS);
  if (Input.pressed('down')) move(CHARM_COLS);
  if (Input.pressed('confirm')) {
    if (!P.sitting) { Sound.play('hurt'); G.charmNote = { text: tr('charmsBench'), t: 0, bad: true }; return; }
    const r = Charms.toggle(list[G.charmSel]);
    if (r === 'full') { Sound.play('hurt'); G.charmNote = { text: tr('charmsFull'), t: 0, bad: true }; }
    else {
      Sound.play(r === 'off' ? 'select' : 'confirm');
      G.charmNote = r === 'over' ? { text: tr('overcharm'), t: 0, bad: true } : null;
    }
  }
}
function updateBanner(dt) {
  const b = G.banner; b.t += dt;
  if (b.t > 1.4 && (Input.pressed('confirm') || Input.pressed('attack')) || b.t > 7) { G.banner = null; G.state = 'play'; }
}

function update(dt) {
  G.t += dt;
  if (G.toast) { G.toast.t += dt; if (G.toast.t > G.toast.dur) G.toast = null; }
  if (G.areaBanner) { G.areaBanner.t += dt; if (G.areaBanner.t > 3.6) G.areaBanner = null; }
  if (G.deathText > 0) G.deathText -= dt;
  G.flash = Math.max(0, G.flash - dt * 1.8);
  G.geoPulse = Math.max(0, G.geoPulse - dt * 3);
  if (G.shakeT > 0) G.shakeT -= dt;
  switch (G.state) {
    case 'title': updateTitle(); break;
    case 'trans': updateTrans(dt); break;
    case 'pause': updatePause(); break;
    case 'map': if (Input.pressed('map') || Input.pressed('pause') || Input.pressed('confirm') || Input.pressed('attack')) { G.state = 'play'; Input.consume('map'); Input.consume('pause'); } break;
    case 'dialog': updateDialog(dt); updateParticles(dt); break;
    case 'shop': updateShop(); break;
    case 'charms': updateCharms(dt); break;
    case 'travel': updateTravel(); break;
    case 'banner': updateBanner(dt); updateParticles(dt); for (const it of G.items) it.t += dt; break;
    case 'ending': G.ending.t += dt; if (G.ending.t > 4 && Input.pressed('confirm')) { G.fadeTo(() => { G.state = 'title'; G.afterTrans = 'title'; G.hasSave = readSave() !== null; G.menuSel = 0; Sound.setTheme('title'); }, 0.6, 0.2, 0.6); } break;
    case 'dying': {
      let d = dt; if (G.slowmo > 0) { G.slowmo -= dt; d = dt * 0.35; }
      updateDying(dt); updateParticles(d); break;
    }
    case 'play': {
      if (G.hitstopT > 0) { G.hitstopT -= dt; break; }
      let d = dt;
      if (G.slowmo > 0) { G.slowmo -= dt; d = dt * 0.35; }
      updatePlay(d); updateParticles(d);
      break;
    }
  }
  if (G.state === 'trans' && G.trans) { /* keep particles alive during fades */ updateParticles(dt * 0.3); }
}

// ---------------------------------------------------------------- drawing
function wrapText(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function textShadow(g, s, x, y, color, blur) { g.save(); g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = blur || 6; g.fillStyle = color || '#fff'; g.fillText(s, x, y); g.restore(); }
function setDir(g) { g.direction = LANG.cur === 'ar' ? 'rtl' : 'ltr'; }

function drawMaskIcon(g, x, y, full, pulse) {
  g.save(); g.translate(x, y);
  const s = 1 + pulse * 0.25;
  g.scale(s, s);
  poly(g, [-11, -12, 11, -12, 13, 2, 0, 15, -13, 2]);
  if (full) { fs(g, '#f3f8fb', INK, 2.5); g.fillStyle = INK; ellipse(g, -4.5, -2, 2, 3.4); g.fill(); ellipse(g, 4.5, -2, 2, 3.4); g.fill(); }
  else { fs(g, 'rgba(10,14,22,0.6)', 'rgba(200,215,235,0.55)', 2); }
  g.restore();
}
function drawHUD(g) {
  // soul orb
  const ox = 52, oy = 54, r = 30, soul = P.soul / 99;
  g.save();
  glow(g, ox, oy, 60, '#cfe8ff', P.soul >= P.spellCost() ? 0.25 + 0.15 * Math.sin(G.t * 5) : 0.08);
  g.beginPath(); g.arc(ox, oy, r, 0, 7); g.fillStyle = 'rgba(8,12,22,0.75)'; g.fill();
  g.save(); g.beginPath(); g.arc(ox, oy, r - 2, 0, 7); g.clip();
  const ly = oy + r - 2 * (r - 2) * soul;
  g.fillStyle = P.soul >= P.spellCost() ? '#e4f4ff' : '#9bb8d6';
  g.beginPath(); g.moveTo(ox - r, oy + r);
  for (let x = -r; x <= r; x += 4) g.lineTo(ox + x, ly + Math.sin(G.t * 4 + x * 0.25) * 2);
  g.lineTo(ox + r, oy + r); g.closePath(); g.fill();
  if (P.maxSoul < 99) {            // the cracked top third
    const cy = oy + r - 2 * (r - 2) * (P.maxSoul / 99);
    g.fillStyle = 'rgba(6,8,14,0.82)'; g.fillRect(ox - r, oy - r, 2 * r, cy - (oy - r));
    g.strokeStyle = 'rgba(160,175,200,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox - r + 3, cy); g.lineTo(ox - 8, cy + 3); g.lineTo(ox + 2, cy - 2); g.lineTo(ox + r - 3, cy + 2); g.stroke();
  }
  g.restore();
  g.lineWidth = 3; g.strokeStyle = '#e9f1f8'; g.beginPath(); g.arc(ox, oy, r, 0, 7); g.stroke();
  g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.arc(ox, oy, r + 2, 0, 7); g.stroke();
  g.restore();
  // masks
  for (let i = 0; i < P.maxHp; i++) drawMaskIcon(g, 108 + i * 32, 50, i < P.hp, (P.invuln > 1.1 || (P.focusT === 0 && G.flash > 0.2)) ? 0.2 : 0);
  // geo
  const gx = 100, gy = 88, gp = G.geoPulse;
  poly(g, [gx, gy - 8 - gp * 2, gx + 8, gy, gx, gy + 8 + gp * 2, gx - 8, gy]); fs(g, '#ffe9a0', INK, 2);
  g.font = font(22, '700'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.direction = 'ltr';
  textShadow(g, String(P.geo), gx + 16, gy + 1, gp > 0 ? '#fff6c8' : '#ffe9a0');
  // boss bar
  const b = G.boss;
  if (b && b.state !== 'intro' && G.bossBarShow) {
    const w = 520, x = (VW - w) / 2, y = VH - 44, k = clamp(b.hp / b.maxHp, 0, 1);
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 6, y - 8, w + 12, 18);
    g.fillStyle = '#1a2230'; g.fillRect(x, y - 3, w, 8);
    g.fillStyle = b.flash > 0 ? '#ffffff' : '#e6eef7'; g.fillRect(x, y - 3, w * k, 8);
    g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(x - 6, y - 8, w + 12, 18);
    setDir(g); g.textAlign = 'center'; g.font = font(20, '700'); textShadow(g, tr('boss_' + b.bossKey), VW / 2, y - 22, '#f2f7ff');
  }
  if (b && b.state === 'intro') {
    const k = clamp((2.4 - b.introT) / 0.7, 0, 1) * clamp(b.introT / 0.6, 0, 1);
    g.save(); g.globalAlpha = k; setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(50, '700'); textShadow(g, tr('boss_' + b.bossKey), VW / 2, VH / 2 - 10, '#f4f8ff', 14);
    g.fillStyle = 'rgba(230,240,255,0.6)'; g.fillRect(VW / 2 - 180, VH / 2 + 28, 360, 2); g.restore();
  }
  // area banner
  const ab = G.areaBanner;
  if (ab) {
    const k = clamp(ab.t / 0.8, 0, 1) * clamp((3.6 - ab.t) / 0.8, 0, 1);
    g.save(); g.globalAlpha = k; setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(40, '700'); textShadow(g, tr(ab.key), VW / 2, 118, ab.color || '#fff', 12);
    g.fillStyle = rgba(ab.color || '#ffffff', 0.6); g.fillRect(VW / 2 - 110 * k, 146, 220 * k, 2);
    g.restore();
  }
  // toast
  if (G.toast) {
    const k = clamp(G.toast.t / 0.2, 0, 1) * clamp((G.toast.dur - G.toast.t) / 0.4, 0, 1);
    g.save(); g.globalAlpha = k; setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(22, '600');
    const w = g.measureText(G.toast.text).width + 40;
    g.fillStyle = 'rgba(6,9,16,0.75)'; g.fillRect(VW / 2 - w / 2, VH - 120, w, 38);
    g.strokeStyle = 'rgba(230,240,255,0.4)'; g.strokeRect(VW / 2 - w / 2, VH - 120, w, 38);
    g.fillStyle = '#eef5ff'; g.fillText(G.toast.text, VW / 2, VH - 100); g.restore();
  }
  if (G.deathText > 0) {
    g.save(); g.globalAlpha = clamp(G.deathText, 0, 1); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(26, '600');
    textShadow(g, tr('youDied'), VW / 2, 150, '#dfe8f3', 10);
    if (G.shade) { g.font = font(20, '600'); textShadow(g, tr('shadowHere'), VW / 2, 184, '#9db5d6', 8); }
    g.restore();
  }
  // interaction hint
  if (G.state === 'play' && !P.sitting) {
    const ns = nearest(G.stations, P.cx, 54);
    const t = nearest(G.benches, P.cx, 54) ? 'rest' : ns ? (stationLit(ns.room) ? 'travel' : 'light') : nearest(G.npcs, P.cx, 70) ? 'talk' : nearest(G.signs, P.cx, 54) ? 'read' : null;
    if (t) {
      const sx = P.cx - G.cam.x, sy = P.y - G.cam.y - 30;
      g.save(); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(18, '700');
      g.fillStyle = 'rgba(6,9,16,0.75)'; const tw = g.measureText('↑  ' + tr(t)).width + 22; g.fillRect(sx - tw / 2, sy - 14 + Math.sin(G.t * 4) * 2, tw, 28);
      g.fillStyle = '#eef5ff'; g.fillText('↑  ' + tr(t), sx, sy + Math.sin(G.t * 4) * 2); g.restore();
    }
  }
}

function drawPanel(g, x, y, w, h) {
  g.fillStyle = 'rgba(5,8,15,0.88)'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(220,232,250,0.75)'; g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.strokeStyle = 'rgba(220,232,250,0.25)'; g.strokeRect(x + 6.5, y + 6.5, w - 13, h - 13);
}
function drawMenu(g, items, sel, y0, step) {
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(28, '600');
  items.forEach((it, i) => {
    const y = y0 + i * (step || 50), on = i === sel;
    if (on) {
      const w = g.measureText(it.label).width;
      g.fillStyle = 'rgba(230,240,255,0.9)';
      g.beginPath(); g.moveTo(VW / 2 - w / 2 - 40, y); g.lineTo(VW / 2 - w / 2 - 26, y - 6); g.lineTo(VW / 2 - w / 2 - 26, y + 6); g.fill();
      g.beginPath(); g.moveTo(VW / 2 + w / 2 + 40, y); g.lineTo(VW / 2 + w / 2 + 26, y - 6); g.lineTo(VW / 2 + w / 2 + 26, y + 6); g.fill();
    }
    textShadow(g, it.label, VW / 2, y, on ? '#ffffff' : 'rgba(190,205,225,0.7)', on ? 14 : 4);
  });
}

function drawWorld(g) {
  const L = G.level, th = THEMES[L.def.theme], t = G.t;
  Art.drawBackground(g, L, G.cam.x, G.cam.y, t);
  let sx = 0, sy = 0;
  if (G.shakeT > 0) { const a = G.shakeA * Math.min(1, G.shakeT * 3); sx = rand(-a, a); sy = rand(-a, a); }
  const cx = Math.round(G.cam.x + sx), cy = Math.round(G.cam.y + sy);
  g.save(); g.translate(-cx, -cy);
  for (const d of L.def.deco) {
    if (d.type === 'pillar' || d.type === 'house') Art.drawDecor(g, d, t, th);
    else if (d.type === 'gear') Art.drawGear(g, d, t, th);
    else if (d.type === 'chimney') Art.drawChimney(g, d, t, th);
  }
  // tile layer
  Art.mechBack(g, t);
  const s = Math.min(G.k, 1.5);
  if (!G.tileCanvas || G.tileScale !== s || G.tileRoom !== L.id) { G.tileCanvas = Art.renderLevel(L, s); G.tileScale = s; G.tileRoom = L.id; }
  const vx = clamp(cx, 0, L.pw), vy = clamp(cy, 0, L.ph), vw = Math.min(VW, L.pw - vx), vh = Math.min(VH, L.ph - vy);
  if (vw > 0 && vh > 0) g.drawImage(G.tileCanvas, vx * s, vy * s, vw * s, vh * s, vx, vy, vw, vh);
  for (const d of L.def.deco) if (d.type === 'lamp' || d.type === 'well') Art.drawDecor(g, d, t, th);
    else if (d.type === 'seals') Art.drawSeals(g, d, t, SEAL_FLAGS.map(f => !!G.flags[f]));
  // breakable walls and gates
  const x0 = Math.max(0, Math.floor(cx / TILE)), x1 = Math.min(L.w - 1, Math.floor((cx + VW) / TILE)), y0 = Math.max(0, Math.floor(cy / TILE)), y1 = Math.min(L.h - 1, Math.floor((cy + VH) / TILE));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = L.get(x, y);
    if (v === T_BREAK) Art.drawBreak(g, x, y, th, t); else if (v === T_GATE) Art.drawGate(g, x, y, th, t);
    else if (v === T_CRACK) Art.drawCrack(g, x, y, th, t);
    else if (v === T_ACID) Art.drawAcid(g, x, y, L.get(x, y - 1) !== T_ACID, t);
  }
  Art.mechFront(g, t, th);
  for (const b of G.benches) Art.drawBench(g, b, t, P.sitting === b);
  for (const n of G.npcs) Art.drawNPC(g, n, t);
  for (const s2 of G.stations) Art.drawStation(g, s2, t, stationLit(s2.room));
  for (const s2 of G.signs) Art.drawSign(g, s2, t);
  for (const it of G.items) Art.drawItem(g, it, t);
  for (const c of G.geos) Art.drawGeo(g, c, t);
  Pixel.setScene(collectLights(cx, cy, true), cx, cy, L.def.theme);       // lights for the 3D-lit pixel sprites
  for (const e of G.enemies) {
    const skin = Skins.get(e.isBoss ? 'boss_' + e.bossKey : e.kind);      // a picture chosen in "Your images"
    if (skin) Skins.draw(g, skin, e.body(), e.face || 1, e.flash, e.isBoss ? 1.15 : 1.7);
    else if (e.isBoss) { if (Art.boss[e.bossKey]) Art.boss[e.bossKey](g, e, t); }
    else if (Art.enemy[e.kind]) Art.enemy[e.kind](g, e, t);
  }
  Art.drawPlayer(g, P, t);
  if (P.wailT > 0) Art.drawWail(g, P, t);
  if (Charms.shellUp() && !P.dead) {
    bloom(g, P.cx, P.cy, 52, '#e8dcb8', 0.18);
    g.strokeStyle = 'rgba(232,220,184,' + (0.45 + 0.2 * Math.sin(t * 5)) + ')'; g.lineWidth = 2; ellipse(g, P.cx, P.cy, 24, 33); g.stroke();
  }
  for (const p of G.projs) Art.drawProj(g, p, t);
  for (const f of G.fx) Art.drawFx(g, f);
  for (const p of G.parts) {
    const a = 1 - p.t / p.life; g.globalAlpha = a; g.fillStyle = p.color;
    g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;
  g.restore();
  Art.drawLighting(g, G.k, L.def.theme, collectLights(cx, cy));
  Art.drawFog(g, L.def.theme, G.cam.x, G.cam.y, t);
  Art.drawForeground(g, L.def.theme, G.cam.x, G.cam.y, t);
  Art.drawAmbient(g, STEP, L.def.theme, G.cam.x, G.cam.y, t);
  const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  if (G.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + Math.min(0.75, G.flash) + ')'; g.fillRect(0, 0, VW, VH); }
  if (P.hp === 1 && P.hp < P.maxHp && G.state === 'play') { const a = 0.08 + 0.05 * Math.sin(G.t * 6); g.fillStyle = 'rgba(140,0,20,' + a + ')'; g.fillRect(0, 0, VW, VH); }
}

// light sources in screen space for the darkness map
function collectLights(cx, cy, skipPlayer) {
  const L = G.level, th = THEMES[L.def.theme], out = [];
  const add = (x, y, r, a, c) => out.push({ x: x - cx, y: y - cy, r, a, c });
  if (!P.dead && !skipPlayer) add(P.cx, P.cy - 6, P.focusT > 0 ? 300 : 250, 1, '#cfe8ff');
  if (P.wailT > 0) add(P.cx, (P.wailTop + P.y) / 2, 320, 1, '#dff3ff');
  for (const d of L.def.deco) {
    if (d.type === 'lamp') add(d.x * TILE + 16, d.y * TILE - 70, 280, 0.95, th.glow);
    else if (d.type === 'light') add(d.x * TILE + 16, d.y * TILE + 16, d.r || 220, d.a || 0.8, d.c || th.glow);
  }
  for (const b of G.benches) add(b.px, b.py - 40, 200, 0.85, '#ffe2a8');
  for (const n of G.npcs) add(n.px, n.py - 40, 170, 0.8, '#ffd98a');
  for (const s of G.stations) if (stationLit(s.room)) add(s.px, s.py - 70, 230, 0.9, '#ffd98a');
  for (const it of G.items) add(it.x, it.y, 190, 0.9, '#e6f3ff');
  for (const c of G.geos) add(c.x, c.y, 50, 0.5, null);
  for (const p of G.projs) {
    if (p.kind === 'beam' || p.kind === 'pillar') { if (p.t >= p.tele) add(p.x, p.kind === 'beam' ? cy + VH / 2 : p.y - 100, 260, 0.9, p.color); }
    else add(p.x, p.y, p.friendly ? 190 : 110, p.friendly ? 1 : 0.75, p.color);
  }
  for (const e of G.enemies) {
    if (e.isBoss) add(e.cx, e.cy, e.bossKey === 'wraith' || e.bossKey === 'king' ? 300 : 230, 0.7, e.blood);
    else if (e.glowR) add(e.cx, e.cy, e.glowR, 0.7, e.blood);
  }
  for (const d of L.def.doors) add((d.x + d.w / 2) * TILE, (d.y + d.h / 2) * TILE, 170, 0.55, th.fog);
  Mech.lights(add, th);
  return out;
}

function drawMap(g) {
  g.fillStyle = 'rgba(3,5,10,0.94)'; g.fillRect(0, 0, VW, VH);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(34, '700'); textShadow(g, tr('map'), VW / 2, 44, '#eef5ff');
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const ids = WORLD.order.filter(id => G.visited[id]);
  const all = ids.length ? ids : [G.level.id];
  for (const id of WORLD.order) { const m = WORLD.rooms[id].map, d = WORLD.rooms[id]; minX = Math.min(minX, m.x); minY = Math.min(minY, m.y); maxX = Math.max(maxX, m.x + Math.ceil(d.w / 8)); maxY = Math.max(maxY, m.y + Math.ceil(d.h / 8)); }
  const u = Math.min((VW - 120) / (maxX - minX), (VH - 130) / (maxY - minY), 16);
  const ox = (VW - (maxX - minX) * u) / 2 - minX * u, oy = 90 + ((VH - 130) - (maxY - minY) * u) / 2 - minY * u;
  for (const id of WORLD.order) {
    if (!G.visited[id]) continue;
    const d = WORLD.rooms[id], m = d.map, w = Math.ceil(d.w / 8) * u, h = Math.ceil(d.h / 8) * u, x = ox + m.x * u, y = oy + m.y * u;
    const col = AREA_COLORS[d.area];
    g.fillStyle = rgba(col, 0.22); g.fillRect(x, y, w, h);
    g.strokeStyle = rgba(col, 0.9); g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    for (const b of d.benches) { g.fillStyle = '#ffffff'; g.fillRect(x + b.x / d.w * w - 2, y + b.y / d.h * h - 2, 5, 5); }
    for (const sn of d.stations) { const mx = x + sn.x / d.w * w, my = y + sn.y / d.h * h; poly(g, [mx, my - 5, mx + 4, my, mx, my + 5, mx - 4, my]); fs(g, stationLit(id) ? '#ffd98a' : '#4a4030', null); }
    for (const dr of d.doors) { g.fillStyle = col; g.fillRect(x + dr.x / d.w * w - 2, y + dr.y / d.h * h - 2, 4 + dr.w / d.w * w, 4 + dr.h / d.h * h); }
    if (id === G.level.id) {
      const px = x + clamp(P.cx / G.level.pw, 0, 1) * w, py = y + clamp(P.cy / G.level.ph, 0, 1) * h;
      g.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(G.t * 6)) + ')'; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill();
    }
  }
  g.font = font(20, '600'); g.fillStyle = '#9db5d6';
  g.fillText(tr('area_' + G.level.def.area), VW / 2, VH - 26);
}

function drawTitle(g) {
  const t = G.t;
  Art.loadPainted('title');
  // painted moonlit kingdom drifting slowly past; the procedural version stands in until it loads
  const painted = Art.drawTitleBackdrop(g, 260 + t * 14, t);
  if (!painted) {
    const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#04060e'); sky.addColorStop(0.6, '#10183a'); sky.addColorStop(1, '#2a2552');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    g.fillStyle = 'rgba(255,240,205,0.9)'; g.beginPath(); g.arc(VW * 0.74, 140, 52, 0, 7); g.fill();
    glow(g, VW * 0.74, 140, 200, '#ffe9b0', 0.25);
  }
  for (let i = 0; i < 70; i++) { const x = hash2(i, 1, 7) * VW, y = hash2(i, 2, 7) * VH * 0.65; g.fillStyle = 'rgba(255,255,255,' + ((painted ? 0.1 : 0.2) + 0.6 * Math.abs(Math.sin(t + i)) * (painted ? 0.5 : 1)) + ')'; g.fillRect(x, y, 2, 2); }
  // silhouette hills and kingdom
  if (!painted) {
    g.fillStyle = '#0a0f24';
    g.beginPath(); g.moveTo(0, VH); g.lineTo(0, 400);
    for (let x = 0; x <= VW; x += 40) g.lineTo(x, 390 + Math.sin(x * 0.011) * 30 + Math.sin(x * 0.031) * 12);
    g.lineTo(VW, VH); g.fill();
  }
  g.fillStyle = '#060a18';
  g.beginPath(); g.moveTo(0, VH); g.lineTo(0, 470);
  for (let x = 0; x <= VW; x += 30) g.lineTo(x, 455 + Math.sin(x * 0.02 + 2) * 22);
  g.lineTo(VW, VH); g.fill();
  // tower ruins
  if (!painted) for (const [x, h] of [[600, 180], [660, 120], [720, 210], [800, 140]]) {
    g.fillStyle = '#080c1c'; g.fillRect(x, 420 - h, 34, h + 40); g.beginPath(); g.moveTo(x - 4, 420 - h); g.lineTo(x + 17, 420 - h - 36); g.lineTo(x + 38, 420 - h); g.fill();
    g.fillStyle = 'rgba(255,214,130,0.6)'; g.fillRect(x + 12, 420 - h + 30, 8, 12);
  }
  // the wanderer on the hill
  glow(g, 300, 400, 150, '#9cc4ff', 0.16);
  if (HeroStyle.pixel()) {
    Pixel.setScene([{ x: 760, y: 150, r: 1100, a: 1, c: '#ffe9b0' }, { x: 120, y: 420, r: 500, a: 0.5, c: '#7aa0ff' }], 0, 0, 'title');
    Pixel.shadow(g, 300, 458, 60);
    Pixel.draw(g, HeroStyle.sheet(), Pixel.frameOf(HeroStyle.sheet(), 'idle', t), 300, 458, { face: 1, scale: 8 });
  } else wanderer(g, 300, 458, 1, { t, vx: 0, vy: 0, scale: 2.1 }, 1, null);
  Art.drawAmbient(g, STEP, 'town', 0, 0, t);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(LANG.cur === 'ar' ? 92 : 78, '700');
  g.save(); g.shadowColor = 'rgba(180,200,255,0.7)'; g.shadowBlur = 30; g.fillStyle = '#f2f6ff'; g.fillText(tr('title'), VW / 2, 120); g.restore();
  g.font = font(22, '600'); g.fillStyle = 'rgba(200,215,240,0.8)'; g.fillText(tr('subtitle'), VW / 2, 180);
  g.fillStyle = 'rgba(220,232,250,0.5)'; g.fillRect(VW / 2 - 150, 206, 300, 2);
  if (G.confirmNew) {
    drawPanel(g, VW / 2 - 250, 240, 500, 170);
    g.font = font(24, '600'); g.fillStyle = '#eef5ff'; g.fillText(tr('confirmNew'), VW / 2, 282);
    drawMenu(g, [{ label: tr('yes') }, { label: tr('no') }], G.menuSel, 340, 46);
  } else drawMenu(g, titleItems(), G.menuSel, 272, 52);
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.55)'; g.fillText(tr('ctl'), VW / 2, VH - 22);
}

function drawDialog(g) {
  const d = G.dialog, a = clamp(d.t / 0.25, 0, 1);
  g.save(); g.globalAlpha = a; drawPanel(g, 70, 360, VW - 140, 150);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(22, '600');
  const lines = wrapText(g, d.lines[d.i], VW - 220);
  lines.forEach((l, i) => { g.fillStyle = '#eef5ff'; g.fillText(l, VW / 2, 435 - (lines.length - 1) * 16 + i * 32); });
  g.fillStyle = 'rgba(230,240,255,0.7)'; g.beginPath(); const by = 492 + Math.sin(G.t * 5) * 2; g.moveTo(VW / 2 - 8, by - 6); g.lineTo(VW / 2 + 8, by - 6); g.lineTo(VW / 2, by + 3); g.fill();
  g.restore();
}
// small pictures for the shop rows that are not charms
function shopIcon(g, kind, x, y) {
  g.save(); g.translate(x, y);
  if (kind === 'mask') drawMaskIcon(g, 0, 0, true, 0);
  else if (kind === 'nail') { poly(g, [0, -16, 5, 8, -5, 8]); fs(g, '#e6eef7', INK, 2.5); poly(g, [-10, 8, 10, 8, 10, 12, -10, 12]); fs(g, '#8a96a8', INK, 2); }
  else if (kind === 'soul') { g.beginPath(); g.moveTo(0, -15); g.bezierCurveTo(4, -7, 12, -2, 12, 4); g.arc(0, 4, 12, 0, Math.PI); g.bezierCurveTo(-12, -2, -4, -7, 0, -15); g.closePath(); fs(g, '#cfe8ff', INK, 2.5); }
  else if (kind === 'notch') { ellipse(g, 0, 0, 13, 13); fs(g, '#0d1322', INK, 3); g.strokeStyle = '#7fe3d9'; g.lineWidth = 2.5; ellipse(g, 0, 0, 9, 9); g.stroke(); g.fillStyle = '#7fe3d9'; ellipse(g, 0, 0, 3.5, 3.5); g.fill(); }
  g.restore();
}
function drawShop(g) {
  const list = shopList(), VIS = 6, ROW = 58, Y0 = 138;
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, VW, VH);
  drawPanel(g, 130, 30, VW - 260, 480);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, tr('shopTitle'), VW / 2, 72, '#eef5ff');
  g.font = font(22, '700'); g.textAlign = 'right'; g.direction = 'ltr';
  g.fillStyle = '#ffe9a0'; g.fillText(P.geo + '  ' + tr('geo'), VW - 170, 72);
  for (let i = G.shopTop; i < Math.min(list.length + 1, G.shopTop + VIS); i++) {
    const y = Y0 + (i - G.shopTop) * ROW, on = G.menuSel === i;
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(160, y - 28, VW - 320, 56); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(160.5, y - 27.5, VW - 321, 55); }
    if (i === list.length) {
      setDir(g); g.textAlign = 'center'; g.font = font(24, '700'); g.fillStyle = on ? '#ffffff' : 'rgba(190,205,225,0.8)'; g.fillText(tr('leave'), VW / 2, y);
      continue;
    }
    const it = list[i], sold = G.flags[it.id];
    if (it.charm) Art.drawCharm(g, it.charm, 202, y, 21, { dim: sold });
    else shopIcon(g, it.icon, 202, y);
    setDir(g); g.textAlign = 'center'; g.font = font(23, '700'); g.fillStyle = sold ? '#6d7a8c' : '#eef5ff'; g.fillText(shopName(it), VW / 2, y - 9);
    g.font = font(15, '500'); g.fillStyle = '#9db5d6'; g.fillText(shopDesc(it), VW / 2, y + 15);
    g.textAlign = 'right'; g.direction = 'ltr'; g.font = font(21, '700'); g.fillStyle = sold ? '#6d7a8c' : (P.geo >= it.price ? '#ffe9a0' : '#c77'); g.fillText(sold ? tr('soldout') : it.price + ' ' + tr('price'), VW - 180, y);
  }
  g.fillStyle = 'rgba(230,240,255,0.55)';
  if (G.shopTop > 0) { g.beginPath(); g.moveTo(VW / 2 - 8, 112); g.lineTo(VW / 2 + 8, 112); g.lineTo(VW / 2, 102); g.fill(); }
  if (G.shopTop + VIS < list.length + 1) { g.beginPath(); g.moveTo(VW / 2 - 8, 488); g.lineTo(VW / 2 + 8, 488); g.lineTo(VW / 2, 498); g.fill(); }
}

function drawCharms(g) {
  g.fillStyle = 'rgba(3,5,10,0.95)'; g.fillRect(0, 0, VW, VH);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(34, '700'); textShadow(g, tr('charms'), VW / 2, 40, '#eef5ff');
  // the notches: filled for what is worn, red beyond the limit
  const total = Charms.notches(), used = Charms.used(), shown = Math.max(total, used), sx = VW / 2 - (shown - 1) * 15;
  for (let i = 0; i < shown; i++) {
    const x = sx + i * 30, y = 86, bad = i >= total;
    ellipse(g, x, y, 10, 10); fs(g, i < used ? (bad ? '#d24a4a' : '#7fe3d9') : '#0d1322', bad ? '#ff8a8a' : '#9fb4cf', 2.5);
  }
  g.font = font(16, '600'); g.fillStyle = Charms.over() ? '#ff8a8a' : '#9db5d6'; g.direction = 'ltr'; g.fillText(tr('notches') + ': ' + used + ' / ' + total, VW / 2, 112);
  setDir(g);
  const list = Charms.ownedList();
  if (!list.length) {
    g.font = font(22, '600'); g.fillStyle = '#9db5d6'; g.fillText(tr('noCharms'), VW / 2, 250);
  }
  const CW = 104, x0 = (VW - CHARM_COLS * CW) / 2 + CW / 2;
  list.forEach((id, i) => {
    const cx = x0 + (i % CHARM_COLS) * CW, cy = 168 + Math.floor(i / CHARM_COLS) * 100, on = i === G.charmSel, worn = Charms.has(id);
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(cx - 46, cy - 42, 92, 88); g.strokeStyle = 'rgba(230,240,255,0.8)'; g.lineWidth = 1.5; g.strokeRect(cx - 45.5, cy - 41.5, 91, 87); }
    if (worn) bloom(g, cx, cy - 4, 52, Charms.DEFS[id].color, 0.28);
    Art.drawCharm(g, id, cx, cy - 4, 28, { worn });
    for (let k = 0; k < Charms.DEFS[id].cost; k++) { ellipse(g, cx + (k - (Charms.DEFS[id].cost - 1) / 2) * 12, cy + 34, 4, 4); fs(g, worn ? '#7fe3d9' : '#2a3550', '#9fb4cf', 1.5); }
  });
  if (list.length) {
    const id = list[clamp(G.charmSel, 0, list.length - 1)], d = Charms.DEFS[id];
    drawPanel(g, 80, 352, VW - 160, 160);
    setDir(g); g.textAlign = 'center'; g.font = font(28, '700'); textShadow(g, Charms.name(id), VW / 2, 384, d.color);
    g.font = font(18, '500'); g.fillStyle = '#9db5d6'; g.fillText(tr('cost') + ': ' + d.cost + (Charms.has(id) ? '   ·   ' + tr('worn') : ''), VW / 2, 414);
    g.font = font(20, '600'); g.fillStyle = '#e1ecf8';
    wrapText(g, Charms.desc(id), VW - 260).forEach((l, k) => g.fillText(l, VW / 2, 446 + k * 26));
    const note = G.charmNote;
    g.font = font(17, '600');
    if (note) { g.fillStyle = note.bad ? '#ff9a8a' : '#9db5d6'; g.fillText(note.text, VW / 2, 494); }
    else { g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(P.sitting ? tr('charmsHint') : tr('charmsBench'), VW / 2, 494); }
  }
}
function drawTravel(g) {
  const list = stationList();
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, VW, VH);
  drawPanel(g, 200, 70, VW - 400, 400);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, tr('stationTitle'), VW / 2, 112, '#ffe9b0');
  g.font = font(20, '700'); g.textAlign = 'right'; g.direction = 'ltr'; g.fillStyle = '#ffe9a0'; g.fillText(P.geo + '  ' + tr('geo'), VW - 240, 112);
  g.font = font(17, '500'); g.textAlign = 'center'; setDir(g); g.fillStyle = '#9db5d6'; g.fillText(tr('stationFare') + ': ' + STATION_FARE + ' ' + tr('price'), VW / 2, 146);
  list.forEach((it, i) => {
    const y = 196 + i * 48, on = G.menuSel === i;
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(230, y - 22, VW - 460, 44); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(230.5, y - 21.5, VW - 461, 43); }
    poly(g, [262, y - 8, 270, y, 262, y + 8, 254, y]); fs(g, it.color, INK, 2);
    setDir(g); g.textAlign = 'center'; g.font = font(24, '700'); g.fillStyle = on ? '#ffffff' : 'rgba(210,222,240,0.85)'; g.fillText(it.name, VW / 2, y);
  });
  drawMenu(g, [{ label: tr('leave') }], G.menuSel - list.length, 196 + list.length * 48 + 18, 48);
}
function drawBanner(g) {
  const b = G.banner, k = clamp(b.t / 0.5, 0, 1);
  g.fillStyle = 'rgba(0,0,0,' + 0.55 * k + ')'; g.fillRect(0, 0, VW, VH);
  g.save(); g.globalAlpha = k; setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  glow(g, VW / 2, 230, 240, '#dff0ff', 0.25);
  if (b.charm) Art.drawCharm(g, b.charm, VW / 2, 124, 46, { glow: true, worn: true });
  g.font = font(54, '700'); textShadow(g, b.title, VW / 2, 206, '#f4f9ff', 16);
  g.fillStyle = 'rgba(230,240,255,0.7)'; g.fillRect(VW / 2 - 160, 240, 320, 2);
  g.font = font(24, '600'); const lines = wrapText(g, b.desc, 620);
  lines.forEach((l, i) => { g.fillStyle = '#d6e4f5'; g.fillText(l, VW / 2, 290 + i * 34); });
  if (b.t > 1.4) { g.font = font(18, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText('Z', VW / 2, 420); }
  g.restore();
}
function drawEnding(g) {
  const t = G.ending.t;
  g.fillStyle = '#04060c'; g.fillRect(0, 0, VW, VH);
  glow(g, VW / 2, 150, 300, '#dbe9ff', 0.22 * clamp(t / 3, 0, 1));
  Art.drawAmbient(g, STEP, 'throne', 0, 0, G.t);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = clamp(t / 1.5, 0, 1);
  g.font = font(60, '700'); textShadow(g, tr('endTitle'), VW / 2, 120, '#f4f8ff', 20);
  g.font = font(24, '600'); g.fillStyle = '#d6e4f5';
  wrapText(g, tr('endText'), 640).forEach((l, i) => g.fillText(l, VW / 2, 200 + i * 36));
  g.globalAlpha = clamp((t - 1.5) / 1.5, 0, 1);
  const mm = Math.floor(G.time / 60), ss = Math.floor(G.time % 60);
  g.font = font(22, '600'); g.fillStyle = '#9db5d6';
  g.fillText(tr('endStats') + ': ' + mm + ':' + String(ss).padStart(2, '0') + '     ' + tr('deaths') + ': ' + G.deaths + '     ' + tr('masks') + ': ' + P.maxHp, VW / 2, 330);
  g.globalAlpha = clamp((t - 4) / 1, 0, 1); g.font = font(20, '500'); g.fillStyle = 'rgba(200,215,240,0.7)'; g.fillText(tr('thanks'), VW / 2, 440);
  g.globalAlpha = 1;
}

function draw() {
  const g = G.g;
  g.setTransform(G.k, 0, 0, G.k, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, VW, VH);
  g.lineJoin = 'round';
  switch (G.state) {
    case 'title': drawTitle(g); break;
    case 'ending': drawEnding(g); break;
    default:
      if (G.level) {
        drawWorld(g); drawHUD(g);
        if (G.state === 'map') drawMap(g);
        if (G.state === 'pause') { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, VW, VH); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(40, '700'); textShadow(g, tr('pause'), VW / 2, 110, '#eef5ff'); drawMenu(g, pauseItems(), G.menuSel, 168, 44); g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(tr('ctl'), VW / 2, VH - 24); }
        if (G.state === 'dialog') drawDialog(g);
        if (G.state === 'shop') drawShop(g);
        if (G.state === 'charms') drawCharms(g);
        if (G.state === 'travel') drawTravel(g);
        if (G.state === 'banner') drawBanner(g);
      }
  }
  if (G.fadeA > 0) { g.fillStyle = 'rgba(0,0,0,' + G.fadeA + ')'; g.fillRect(0, 0, VW, VH); }
}

// ---------------------------------------------------------------- boot
function resize() {
  const c = G.canvas, r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(320, Math.round(r.width * dpr)); c.height = Math.round(c.width * 9 / 16);
  G.k = c.width / VW; G.tileCanvas = null;
}
function boot() {
  G.canvas = document.getElementById('c'); G.g = G.canvas.getContext('2d');
  Input.init(); resize(); window.addEventListener('resize', resize); refreshTouchLabels();
  const wake = () => Sound.init();
  // tapping the picture focuses it for the keyboard and works as "confirm" on menus
  G.canvas.addEventListener('pointerdown', () => {
    try { G.canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    if (G.state === 'title' || G.state === 'ending' || G.state === 'dialog' || G.state === 'banner') window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })), window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }));
  });
  window.addEventListener('keydown', wake); window.addEventListener('pointerdown', wake);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') { G.state = 'pause'; G.menu = 'pause'; G.menuSel = 0; } });
  Art.ambientInit();
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    Input.poll();
    let guard = 0;
    if (G.manual) { acc = 0; draw(); return; }
    while (acc >= STEP && guard++ < 6) { update(STEP); acc -= STEP; Input.endStep(); }
    if (guard >= 6) acc = 0;
    draw();
  }
  requestAnimationFrame(frame);
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => { /* canvas text uses fallbacks until web fonts arrive, which is fine */ });
}
// the Comet Heart button only appears once the ability is found
function syncAbilityButtons() {
  const b = document.querySelector('[data-act=superdash]');
  if (b) b.hidden = !P.ab.superdash;
}
function refreshTouchLabels() {
  const caps = { cast: ['روح', 'Soul'], dash: ['اندفاع', 'Dash'], attack: ['ضرب', 'Strike'], jump: ['قفز', 'Jump'], superdash: ['شهاب', 'Comet'] };
  document.querySelectorAll('[data-cap]').forEach(el => { el.textContent = caps[el.dataset.cap][LANG.cur === 'ar' ? 0 : 1]; });
}
window.refreshTouchLabels = refreshTouchLabels;
window.DW = { G, P, Charms, enterRoom, startGame, WORLD, Input, step(n) { for (let i = 0; i < n; i++) { update(STEP); Input.endStep(); } } };
window.addEventListener('DOMContentLoaded', boot);
