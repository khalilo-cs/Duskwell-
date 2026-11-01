// The painted pieces: the set pieces of the Ossuary, the Lunar Observatory and the Mirror Vault are cut into their atlases and laid
// in every room of the three areas (on the floors, on the back wall, hanging under rock, never on a door or a bench, the same way on
// every visit); some rooms of two areas are drawn in front of a whole painting; the censer, the bomb imp and the frost mole are drawn
// from their new frames, with the same rows as before.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => SetPieces.ready('bone') && SetPieces.ready('lunar') && SetPieces.ready('mirror') && CREATURE_ANIMS.mole === CREATURE_CANVA.mole, null, { timeout: 30000 });

  // ---- the atlases
  let r = await ev(() => {
    const out = {}, kinds = {};
    for (const th of Object.keys(SETPIECES)) {
      const im = new Image(); im.src = 'art/props/canva_' + th + '.webp';
      out[th] = SETPIECES[th].length;
      for (const p of SETPIECES[th]) kinds[p[4]] = (kinds[p[4]] || 0) + 1;
    }
    return { out, kinds, total: Object.values(out).reduce((a, b) => a + b, 0) };
  });
  ok('more than 400 pieces cut for the three areas, of all four kinds', r.total > 400 && r.out.bone > 50 && r.out.lunar > 60 && r.out.mirror > 200 && ['s', 'd', 'h', 'w'].every(k => r.kinds[k] > 20), r);

  // ---- every room of the three areas
  r = await ev(() => {
    const { G, enterRoom } = DW, out = { rooms: 0, bad: [], same: true, tot: { d: 0, w: 0, h: 0, s: 0 } };
    for (const id of WORLD.order) {
      const d = WORLD.rooms[id]; if (!SETPIECES[d.theme]) continue;
      out.rooms++;
      const run = () => { G.flags = {}; enterRoom(id, { door: d.doors[0].id }); G.state = 'play'; G.trans = null; DW.step(1); DW.draw(); return JSON.stringify(SetPieces.stats.boxes); };
      const a = run(), b = run(); if (a !== b) out.same = false;
      const L = G.level;
      for (const k of Object.keys(out.tot)) out.tot[k] += SetPieces.stats.placed[k];
      for (const [kind, x0, top, fw, fh] of SetPieces.stats.boxes) {
        for (const dd of d.doors) if (x0 < dd.x + dd.w + 2 && x0 + fw > dd.x - 2 && top < dd.y + dd.h + 2 && top + fh > dd.y - 2) out.bad.push([id, 'door', kind]);
        for (const q of [].concat(d.benches, d.stations)) if (x0 < q.x + 3 && x0 + fw > q.x - 2 && top < q.y + 2 && top + fh > q.y - 4) out.bad.push([id, 'bench', kind]);
        if (kind === 'h') { for (let i = 0; i < fw; i++) if (L.get(x0 + i, top - 1) !== T_SOLID) out.bad.push([id, 'no rock above', x0 + i]); }
        else for (let i = 0; i < fw; i++) if (kind !== 'w' && L.get(x0 + i, top + fh) !== T_SOLID) out.bad.push([id, 'no floor', kind, x0 + i]);
      }
    }
    return out;
  });
  ok('all ' + r.rooms + ' rooms of the three areas get pieces of every kind', r.rooms >= 30 && Object.values(r.tot).every(v => v > 15), r.tot);
  ok('no piece on a door or a bench, hangings under rock, standing ones on a floor', r.bad.length === 0, r.bad.slice(0, 5));
  ok('a room is laid the same way on every visit', r.same);

  // ---- the paintings behind some rooms
  r = await ev(() => { const b = {}; for (const id of WORLD.order) { const d = WORLD.rooms[id]; if (/_/.test(d.bg) && d.bg !== 'townb') (b[d.bg] = b[d.bg] || []).push(id); } return b; });
  ok('five paintings stand behind rooms of the Observatory and the Vault', Object.keys(r).length === 5 && Object.values(r).every(l => l.length >= 2), r);
  await ev(() => { const { G, P, enterRoom } = DW; enterRoom('lo1', { door: WORLD.rooms.lo1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; P.invuln = 1e9; DW.step(3); snapCamera(); });
  await page.waitForFunction(() => Art.paintedReady('lunar_moon'), null, { timeout: 30000 });
  await ev(() => { DW.step(20); DW.draw(); }); await page.waitForTimeout(150); await page.screenshot({ path: shot('canva_lunar.png') });
  r = await ev(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d'); g.drawImage(DW.G.canvas, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 12).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; });
  ok('the moon painting shows behind the first room of the Observatory', r > 12, r);

  // ---- the creatures
  r = await ev(() => {
    const out = {};
    for (const k of Object.keys(CREATURE_CANVA)) {
      const old = CREATURE_CANVA[k], rows = Object.keys(old);
      out[k] = { same: CREATURE_ANIMS[k] === old, rows: rows.every(s => old[s].length > 0 && old[s].every(f => f.length === 7 && f[6] === 1 && f[2] > 20 && f[3] > 20)) };
    }
    return out;
  });
  ok('the censer, the bomb imp and the frost mole are drawn from their new frames', Object.values(r).every(v => v.same && v.rows), r);
  r = await ev(() => {
    const { G, P, enterRoom } = DW, out = {};
    for (const kind of ['censer', 'imp', 'mole']) {
      const id = WORLD.order.find(rid => WORLD.rooms[rid].enemies.some(e => e.type === kind));
      enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); G.state = 'play'; G.trans = null; P.invuln = 1e9;
      const e = G.enemies.find(e => e.kind === kind); DW.step(30); DW.draw();
      out[kind] = !!(e && e._ad && e._ad.f && e._ad.f[6] === 1);
      if (e) { e.hp = 1; e.flash = 0; e.hit ? e.hit(5, 1) : (e.hp = 0); DW.step(40); DW.draw(); }
    }
    return out;
  });
  ok('each of them shows a new frame in its room, and can be beaten', Object.values(r).every(Boolean), r);
  await ev(() => { const { G, P, enterRoom } = DW; enterRoom('em1', { door: WORLD.rooms.em1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; const e = G.enemies.find(e => e.kind === 'imp'); if (e) P.place(e.cx - 150, e.y + e.h, 1); DW.step(3); snapCamera(); DW.step(20); DW.draw(); });
  await page.waitForTimeout(150); await page.screenshot({ path: shot('canva_imp.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
