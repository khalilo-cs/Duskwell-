const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = f => page.evaluate(f);
  const spots = await ev(() => {
    const out = [];
    for (const id of DW.WORLD.order) for (const it of DW.WORLD.rooms[id].items) if (it.kind === 'charm') out.push({ room: id, id: it.id, charm: it.charm, x: it.x, y: it.y });
    return out;
  });
  ok('8 charms lie in the world', spots.length === 8, spots.length);
  for (const sp of spots) {
    const r = await page.evaluate(sp => {
      const { G, P, Charms, enterRoom } = DW; Charms.reset(); G.flags = {};
      enterRoom(sp.room, { pos: { x: sp.x * 32 + 16, y: (sp.y + 1) * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
      G.enemies = []; G.projs = [];
      const L = G.level, below = L.def.at(sp.x, sp.y + 1), here = L.def.at(sp.x, sp.y);
      const it = G.items.find(i => i.id === sp.id);
      P.invuln = 1e9;
      P.place(sp.x * 32 + 16, (sp.y + 1) * 32, 1); DW.step(3);
      return { has: !!it, here, below, state: G.state, owned: Charms.ownedList(), banner: G.banner && G.banner.title, flag: !!G.flags[sp.id] };
    }, sp);
    ok(sp.room + ' ' + sp.charm + ': placed in air, collected on touch', r.has && r.here === 0 && (r.below === 1 || r.below === 2) && r.owned.join() === sp.charm && r.state === 'banner' && r.flag, r);
  }
  // guardians drop a charm after the reward
  for (const [room, charm, flag, x, y] of [['mg3', 'siphon', 'boss_weaver', 23, 17], ['aq4', 'thrift', 'boss_drowned', 25, 19], ['wd4', 'deep', 'boss_brood', 25, 19]]) {
    const r = await page.evaluate(([room, charm, flag, x, y]) => {
      const { G, P, Charms, enterRoom } = DW; Charms.reset(); G.flags = {};
      enterRoom(room, { pos: { x: 4 * 32, y: 18 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
      const out = {}; out.before = G.items.map(i => i.id);
      G.arena.state = 'fight'; G.onBossDeath({ cx: 20 * 32, cy: 10 * 32, geo: 0 });
      out.after = G.items.map(i => i.id); out.flagWon = !!G.flags[flag];
      // leave without taking them, come back: both are still there
      enterRoom(room, { pos: { x: 4 * 32, y: 18 * 32 } }); G.state = 'play';
      out.again = G.items.map(i => i.id);
      const L = G.level; out.here = L.def.at(x, y); out.below = L.def.at(x, y + 1);
      P.invuln = 1e9; P.place(x * 32 + 16, (y + 1) * 32, 1); DW.step(3);
      out.owned = Charms.ownedList();
      return out;
    }, [room, charm, flag, x, y]);
    ok(room + ': guardian drops ' + charm + ' beside its reward, kept after leaving', r.before.length === 0 && r.after.length === 2 && r.again.length === 2 && r.owned.join() === charm && r.here === 0, r);
  }
  // pickup art and banner screenshot
  await ev(() => { const { G, P, Charms, enterRoom } = DW; Charms.reset(); G.flags = {}; enterRoom('cx2', { pos: { x: 8 * 32, y: 15 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.hp = 5; DW.step(20); });
  await page.waitForTimeout(250); await page.screenshot({ path: shot('charm_pickup.png') });
  await ev(() => { const { P } = DW; P.place(4 * 32 + 16, 15 * 32, 1); DW.step(3); DW.G.banner.t = 2; });
  await page.waitForTimeout(250); await page.screenshot({ path: shot('charm_banner.png') });
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
