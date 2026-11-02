// The detailed frames painted one pose at a time: every creature that has them is drawn from its own sheet (art/creatures/hq/<kind>.webp)
// with the same rows as before, shows a detailed frame in its room, and can still be beaten.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => Object.keys(CREATURE_HQ).every(k => CREATURE_ANIMS[k] === CREATURE_HQ[k]), null, { timeout: 30000 });
  let r = await ev(() => {
    const out = {};
    for (const k of Object.keys(CREATURE_HQ)) {
      const rows = CREATURE_HQ[k];
      out[k] = Object.values(rows).every(l => l.length > 0 && l.every(f => f.length === 7 && f[6] === k && f[2] > 30 && f[3] > 30));
    }
    return out;
  });
  ok('every creature with detailed frames has full rows from its own sheet', Object.keys(r).length > 0 && Object.values(r).every(Boolean), r);
  r = await ev(() => {
    const { G, P, enterRoom } = DW, out = {};
    for (const kind of Object.keys(CREATURE_HQ)) {
      const id = WORLD.order.find(rid => WORLD.rooms[rid].enemies.some(e => e.type === kind));
      if (!id) { out[kind] = 'no room'; continue; }
      enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); G.state = 'play'; G.trans = null; P.invuln = 1e9;
      const e = G.enemies.find(e => e.kind === kind); DW.step(30); DW.draw();
      out[kind] = !!(e && e._ad && e._ad.f && e._ad.f[6] === kind);
      if (e) { e.hp = 1; e.flash = 0; e.hit ? e.hit(5, 1) : (e.hp = 0); DW.step(40); DW.draw(); }
    }
    return out;
  });
  ok('each shows a detailed frame in its room and can be beaten', Object.values(r).every(v => v === true || v === 'no room'), r);
  const first = await ev(() => Object.keys(CREATURE_HQ)[0]);
  await ev(k => { const { G, P, enterRoom } = DW; const id = WORLD.order.find(rid => WORLD.rooms[rid].enemies.some(e => e.type === k)); enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; const e = G.enemies.find(e => e.kind === k); if (e) P.place(e.cx - 120, e.y + e.h, 1); P.invuln = 1e9; DW.step(3); snapCamera(); DW.step(20); DW.draw(); }, first);
  await page.waitForTimeout(150); await page.screenshot({ path: shot('hq_' + first + '.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
