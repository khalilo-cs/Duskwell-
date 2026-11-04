// The detailed boss poses painted one at a time: every boss with a sheet in art/bosses/hq is drawn from it (idle, wind-up, strike,
// second attack, hurt, death), fights in its arena with those poses, and still falls when beaten.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => Object.keys(BOSS_HQ).every(k => BOSS_POSES[k] === BOSS_HQ[k]), null, { timeout: 30000 });
  let r = await ev(() => { const o = {}; for (const k of Object.keys(BOSS_HQ)) { const c = BossPoses.CFG[k]; o[k] = BOSS_HQ[k].length === 6 && BOSS_HQ[k].every(p => p[2] > 60 && p[3] > 60 && p[4] === k) && c.wind === 1 && c.death === 5 && c.face === 1; } return o; });
  ok('every boss with a detailed sheet has its six poses', Object.keys(r).length > 0 && Object.values(r).every(Boolean), r);
  r = await ev(() => {
    const out = {}, { G, P, enterRoom, Charms } = DW;
    for (const key of Object.keys(BOSS_HQ)) {
      const id = WORLD.order.find(rid => (WORLD.rooms[rid].arena || {}).boss === key); if (!id) { out[key] = 'no arena'; continue; }
      const d = WORLD.rooms[id]; Charms.reset(); G.flags = {};
      enterRoom(id, { door: d.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
      P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; DW.step(5); P.x = (d.arena.trigger + (d.arena.triggerDir < 0 ? -3 : 2)) * 32; DW.step(1);
      for (let i = 0; i < 500 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
      const b = G.boss; if (!b) { out[key] = 'no boss'; continue; }
      const seen = new Set();
      for (let i = 0; i < 400; i++) { DW.step(1); if (i % 5) continue; DW.draw(); if (b._pr) seen.add(b._pr.pose); }
      const gone = () => !!b.dead || b.state === 'dying' || G.flags['boss_' + key] === true;
      for (let i = 0; i < 300; i++) { if (!gone() && i % 20 === 0) { b.invul = false; b.iframes = 0; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side'); } DW.step(1); if (i % 5) continue; DW.draw(); if (b._pr) seen.add(b._pr.pose); }
      out[key] = { poses: [...seen].sort(), dead: gone() };
    }
    return out;
  });
  ok('each boss fights with its detailed poses and can be beaten', Object.values(r).every(v => v && v.poses && v.poses.includes(0) && v.poses.some(p => p > 0) && v.dead), r);
  const first = await ev(() => Object.keys(BOSS_HQ)[0]);
  await ev(key => { const { G, P, enterRoom } = DW; const id = WORLD.order.find(rid => (WORLD.rooms[rid].arena || {}).boss === key), d = WORLD.rooms[id]; G.flags = {};
    enterRoom(id, { door: d.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; DW.step(5); P.x = (d.arena.trigger + (d.arena.triggerDir < 0 ? -3 : 2)) * 32;
    for (let i = 0; i < 500 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1); DW.step(30); snapCamera(); DW.draw(); }, first);
  await page.waitForTimeout(150); await page.screenshot({ path: shot('boss_hq_' + first + '.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
