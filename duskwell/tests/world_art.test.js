// The owner's drawings of the world's objects and machinery (js/art_world_hd.js): every room draws with them, and the moving
// parts behave: a stalactite leaves rubble, a geo cache is a chest that opens when taken, a broken wall drops its pieces, a mushroom
// squashes under a landing, a shrine wakes when its station is lit.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof WorldArt !== 'undefined' && WorldArt.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  const go = (id, x, y) => ev(([id, x, y]) => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    enterRoom(id, { pos: { x, y } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; G.fx = [];
    P.invuln = 1e9; P.hp = P.maxHp = 5; P.dead = false; P.sitting = null; DW.step(2);
  }, [id, x, y]);

  let r = await ev(() => {
    const W = 2048, bad = Object.entries(WORLD_RECTS).filter(([n, q]) => q[0] < 0 || q[1] < 0 || q[0] + q[2] > W || q[2] < 4 || q[3] < 4).map(e => e[0]);
    return { n: Object.keys(WORLD_RECTS).length, bad };
  });
  ok('the atlas holds every piece (objects, machinery, gates, hazards)', r.n >= 35 && r.bad.length === 0, r);

  // every room draws, with every object and machine in it, without an error
  r = await ev(() => {
    const { G, P, enterRoom, WORLD } = DW; let n = 0;
    for (const id of Object.keys(WORLD.rooms)) {
      enterRoom(id, { pos: { x: 100, y: 100 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; DW.step(1);
      const L = G.level;
      for (let cy = 0; cy < L.ph; cy += 540) for (let cx = 0; cx < L.pw; cx += 960) { G.cam.x = cx; G.cam.y = cy; DW.draw(); }
      n++;
    }
    return n;
  });
  ok('every room draws with the drawings (' + r + ' rooms)', r >= 77 && errors.length === 0, errors.slice(0, 3));

  // a stalactite falls and leaves a heap of rubble that fades
  await go('fd2', 300, 300);
  r = await ev(() => {
    const { G } = DW; const d = G.mech.drips[0]; d.drop();
    let n = 0; while (d.state === 'fall' && n++ < 300) DW.step(1);
    const fx = G.fx.find(f => f.type === 'drip'); DW.draw();
    const had = !!fx; DW.step(120);
    return { state: d.state, had, gone: !G.fx.some(f => f.type === 'drip') };
  });
  ok('a fallen stalactite leaves rubble, which fades', r.state !== 'fall' && r.had && r.gone, r);

  // a geo cache is a chest; taken, it opens
  await go('cx2', 100, 600);
  r = await ev(() => {
    const { G, P } = DW; const c = G.items.find(i => i.kind === 'cache'); DW.draw();
    const gy = c._gy; P.x = c.x - P.w / 2; P.y = c.y - P.h / 2; DW.step(3);
    return { gy, open: G.fx.some(f => f.type === 'chest'), taken: !G.items.includes(c) };
  });
  ok('a geo cache is a chest on the floor, and it opens when taken', r.gy > 0 && r.open && r.taken, r);

  // a breakable wall drops its pieces
  r = await ev(() => {
    const { G } = DW; const L = G.level; let t = null;
    for (let y = 0; y < L.h && !t; y++) for (let x = 0; x < L.w; x++) if (L.get(x, y) === T_BREAK) { t = [x, y]; break; }
    G.cam.x = Math.max(0, t[0] * 32 - 480); DW.draw();
    G.breakTile(t[0], t[1]); DW.draw();
    return { bit: G.fx.some(f => f.type === 'wallbit'), air: L.get(t[0], t[1]) === T_AIR };
  });
  ok('a struck wall breaks into pieces of its drawing', r.bit && r.air, r);

  // a mushroom squashes under a landing
  r = await ev(() => {
    const { G, P, enterRoom } = DW;
    for (const id of Object.keys(DW.WORLD.rooms)) {
      enterRoom(id, { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; P.invuln = 1e9; DW.step(1);
      const L = G.level;
      for (let y = 1; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.get(x, y) === T_BOUNCE && L.get(x, y - 1) === T_AIR && L.get(x, y - 2) === T_AIR) {
        G.bounceAt = null; P.x = x * 32 + 16 - P.w / 2; P.y = y * 32 - P.h - 40; P.vx = 0; P.vy = 300;
        for (let i = 0; i < 40 && !G.bounceAt; i++) DW.step(1);
        DW.draw();
        return { room: id, bounced: !!G.bounceAt, up: P.vy < 0 };
      }
    }
    return null;
  });
  ok('landing on a mushroom bounces and squashes it', r && r.bounced && r.up, r);

  // a station's shrine wakes when it is lit
  await go('cx2', 100, 600);
  r = await ev(() => {
    const { G } = DW; const st = G.stations[0]; G.cam.x = Math.max(0, st.px - 480); DW.draw();
    const before = st._lit; G.flags['station_' + st.room] = true; DW.step(1); DW.draw();
    return { before, after: st._lit, woke: st._litT > -1 };
  });
  ok('a station\'s shrine is dark until lit, then wakes', r.before === false && r.after === true && r.woke, r);

  await go('fd1', 600, 400);
  await ev(() => { const { G } = DW; const s = G.mech.saws[0]; G.cam.x = Math.max(0, Math.min(G.level.pw - 960, s.x - 480)); G.cam.y = Math.max(0, Math.min(G.level.ph - 540, s.y - 270)); });
  await page.screenshot({ path: shot('world_art.png') });
  ok('no page errors', errors.length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
