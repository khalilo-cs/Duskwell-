// Rougher rooms: the extras of every room are decided from its id alone, stay clear of what is already there, leave three free
// tiles over every spike strip, skip the halls and the rooms with their own physics, and grow with the setting (none on Easy,
// the first set on Normal, both on Hard, with wider strips). Entering a room really lays them.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);

  // ---- the plan
  let r = await ev(() => {
    const rooms = Object.keys(WORLD.rooms), out = { rooms: rooms.length, strips: 0, strips2: 0, blades: 0, foes: 0, foes2: 0, bad: [], same: true, skipBad: [] };
    for (const id of rooms) {
      const d = WORLD.rooms[id], p = Hard.plan(id), again = JSON.stringify(Hard.plan(id));
      const sk = d.arena || d.winds.length || d.gravs.length || d.area === 'hushvale' || d.theme === 'town';
      if (sk && (p.spikes.length || p.saws.length || p.drips.length || p.foes.length)) out.skipBad.push(id);
      for (const s of p.spikes) {
        s.lv === 1 ? out.strips++ : out.strips2++;
        for (let i = 0; i < 3; i++) {                                           // the widest the strip gets on Hard
          const x = s.x + i, v = d.t[s.y * d.w + x];
          if (v !== T_AIR) out.bad.push([id, 'not air', x, s.y]);
          if (d.t[(s.y + 1) * d.w + x] !== T_SOLID) out.bad.push([id, 'no rock under', x, s.y]);
          for (let j = 1; j <= 3; j++) if (d.t[(s.y - j) * d.w + x] !== T_AIR) out.bad.push([id, 'low ceiling', x, s.y]);
        }
        const near = [].concat(d.items, d.benches, d.stations, d.signs, d.npcs).some(q => Math.abs(q.x - s.x) < 3 && Math.abs(q.y - s.y) < 4);
        const door = d.doors.some(q => s.x + 3 > q.x - 3 && s.x < q.x + q.w + 3 && s.y > q.y - 4 && s.y < q.y + q.h + 4);
        if (near) out.bad.push([id, 'near a thing', s.x, s.y]); if (door) out.bad.push([id, 'near a door', s.x, s.y]);
      }
      for (const b of p.saws) { out.blades++; if (b.to - b.x < 4) out.bad.push([id, 'short rail']); for (let x = b.x; x <= b.to; x++) if (d.t[b.y * d.w + x] !== T_AIR && d.t[b.y * d.w + x] !== T_HAZARD) out.bad.push([id, 'rail in rock', x, b.y]); }
      for (const f of p.foes) { f.lv === 1 ? out.foes++ : out.foes2++; if (!ENEMY_TYPES[f.type]) out.bad.push([id, 'type', f.type]); if (d.t[f.y * d.w + f.x] !== T_AIR) out.bad.push([id, 'foe in rock', f.x, f.y]); }
      if (again !== JSON.stringify(Hard.plan(id))) out.same = false;
    }
    return out;
  });
  ok('about a hundred rooms are looked at, and a good share of them get strips, blades and creatures', r.rooms >= 117 && r.strips >= 25 && r.strips2 >= 5 && r.blades >= 3 && r.foes >= 40 && r.foes2 >= 15, r);
  ok('every strip lies on air over rock with three free tiles above, clear of doors, benches, pickups and people', r.bad.length === 0, r.bad.slice(0, 6));
  ok('halls, wind rooms, gravity rooms and the village get nothing', r.skipBad.length === 0, r.skipBad);

  // ---- the setting
  const enter = (id, mode) => ev(([id, mode]) => {
    const { G, P, enterRoom } = DW; Diff.setMode(mode); G.flags = {}; enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null;
    const L = G.level, d = WORLD.rooms[id]; let spikes = 0, base = 0;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { if (L.get(x, y) === T_HAZARD) spikes++; if (d.t[y * d.w + x] === T_HAZARD) base++; }
    return { spikes: spikes - base, foes: G.enemies.length - d.enemies.length, saws: G.mech.saws.length - d.mech.filter(m => m.type === 'saw').length, drips: G.mech.drips.length - d.mech.filter(m => m.type === 'drip').length };
  }, [id, mode]);
  const pick = await ev(() => {
    let best = null;
    for (const id of Object.keys(WORLD.rooms)) { const p = Hard.plan(id); if (p.saws.length && p.spikes.length > 1 && p.foes.length > 1 && (!best || p.saws.length + p.spikes.length > best.n)) best = { id, n: p.saws.length + p.spikes.length }; }
    return best && best.id;
  });
  ok('a room with the lot was found for the check', !!pick, pick);
  const e = await enter(pick, 'easy'), n = await enter(pick, 'normal'), h = await enter(pick, 'hard');
  ok('Easy: nothing is added', e.spikes === 0 && e.foes === 0 && e.saws === 0 && e.drips === 0, e);
  ok('Normal: the first strips and a creature are added, no blades', n.spikes > 0 && n.foes === 1 && n.saws === 0, n);
  ok('Hard: more strips (and wider ones), more creatures, and the blades', h.spikes > n.spikes && h.foes > n.foes && h.saws >= 1, [n, h]);
  const strip = await ev(([id]) => { const p = Hard.plan(id); const s = p.spikes.find(s => s.lv === 1); const out = {}; for (const m of ['normal', 'hard']) { Diff.setMode(m); DW.enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); const L = DW.G.level; let w = 0; while (L.get(s.x + w, s.y) === T_HAZARD) w++; out[m] = w; } return out; }, [pick]);
  ok('a strip is two tiles wide on Normal and three on Hard', strip.normal === 2 && strip.hard === 3, strip);

  // ---- the same room is the same each visit, and the spikes hurt
  r = await ev(([id]) => {
    const { G, P, enterRoom } = DW; Diff.setMode('normal'); const sig = () => { const L = G.level; let h = 0; for (let i = 0; i < L.t.length; i++) h = (h * 31 + L.t[i]) % 1000003; return h + ':' + G.enemies.map(e => e.kind + Math.round(e.x)).join(','); };
    enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); const a = sig(); enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); const b = sig();
    const s = Hard.plan(id).spikes[0]; G.state = 'play'; G.trans = null; G.fadeA = 0; P.invuln = 0; P.hp = P.maxHp = 5; P.dead = false; P.place((s.x + 0.5) * TILE + 16, (s.y + 1) * TILE, 1); P.hurtT = 0; DW.step(3);
    return { same: a === b, hp: P.hp, hurt: P.hp < 5 || P.hurtT > 0 || P.invuln > 0 };
  }, [pick]);
  ok('a room is laid the same way on every visit', r.same, r);
  ok('and standing on a new strip hurts', r.hurt, r);
  await ev(() => { Diff.setMode('normal'); });

  // ---- a look
  await ev(([id]) => { const { G, P } = DW; Diff.setMode('hard'); DW.enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; const s = Hard.plan(id).spikes[0]; P.place((s.x - 5) * TILE, (s.y + 1) * TILE, 1); P.invuln = 1e9; DW.step(30); DW.draw(); }, [pick]);
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('rough_room.png') });
  await ev(() => { Diff.setMode('normal'); });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
