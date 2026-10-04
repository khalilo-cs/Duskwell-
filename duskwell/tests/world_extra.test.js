// The extra rooms that widen the areas (js/world_extra.js): each can be crossed in both directions, and its cache reached,
// with the abilities the hero has at that point (the explorer drives the real physics, see explore.js).
const { open } = require('./lib');
const { install, run } = require('./explore');
const SETS = { none: {}, D: { dash: true }, DW: { dash: true, wall: true }, DWD: { dash: true, wall: true, double: true } };
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await install(page);
  const rooms = await page.evaluate(() => DW.WORLD.order.filter(id => DW.WORLD.rooms[id].need).map(id => { const r = DW.WORLD.rooms[id]; return { id, need: r.need, w: r.w, doors: r.doors.map(d => d.id), to: r.doors.map(d => d.to), items: r.items.map(i => i.id), enemies: r.enemies.length }; }));
  ok('40 extra rooms widen the areas', rooms.length === 40, rooms.length);
  const only = process.argv[2];
  for (const r of rooms) {
    if (only && only !== r.id) continue;
    const ab = SETS[r.need], t0 = Date.now(), [d0, d1] = r.doors;
    const a = await run(page, r.id, ab, { door: d0 }, { breakAll: true });
    const b = await run(page, r.id, ab, { door: d1 }, { breakAll: true });
    const cache = r.items.filter(i => a.items.includes(i) || b.items.includes(i));
    ok(r.id + ' (' + r.need + '): crossed both ways' + (r.items.length ? ', cache reached' : ''), a.doors.includes(d1) && b.doors.includes(d0) && cache.length === r.items.length, { w: r.w, enemies: r.enemies, fwd: a.doors, back: b.doors, items: cache, ms: Date.now() - t0 });
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
