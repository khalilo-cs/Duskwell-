// The mossy stone tile sheet: all 117 pieces are cut into the atlas and every one of them is used by the rooms of four areas (Mossgrove,
// Sporewood, the Aqueduct, Cinderdeep). What is laid in a room: rock blocks, ground tops, hanging moss, arches, plates, standing and
// hanging things, spikes; none of it on a door, a bench or a pickup, every standing thing on rock with free air above, every hanging thing
// under rock with free air below, the same each time, and the other areas are left as they were.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => MossTiles.ready(), null, { timeout: 20000 });

  // ---- the atlas
  let r = await ev(() => new Promise(res => {
    const probe = new Image(); probe.src = 'art/tiles/moss.webp';
    const go = () => {
      const W = probe.naturalWidth, H = probe.naturalHeight, names = Object.keys(MOSS_TILES), bad = [], groups = {};
      for (const n of names) { const p = MOSS_TILES[n]; if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > W || p[1] + p[3] > H || p[2] < 6 || p[3] < 6) bad.push(n); const g = n.split('_')[0]; groups[g] = (groups[g] || 0) + 1; }
      res({ W, H, n: names.length, bad, groups, caps: Object.keys(MOSS_CAP).length, topsWithCap: names.filter(n => /^top_\d/.test(n)).every(n => MOSS_CAP[n] > 0.1 && MOSS_CAP[n] < 0.6) });
    };
    probe.complete ? go() : probe.onload = go;
  }));
  ok('117 pieces of the sheet are in the atlas, all inside the picture', r.n === 117 && r.bad.length === 0, r);
  ok('they are the sheet\'s groups: 7 blocks, 6 tiles, 14 plates, 11 ground tops, 16 spike pieces, 11 water and 4 lava tiles, 5 hangings', r.groups.fill === 7 && r.groups.tile === 6 && r.groups.isl === 14 && r.groups.top === 11 && r.groups.spike === 16 && r.groups.water === 11 && r.groups.lava === 4 && r.groups.hang === 5, r.groups);
  ok('every ground top and plate has the line where its stone begins', r.topsWithCap && r.caps >= 24, r.caps);
  r = await ev(() => { const u = MossTiles.used(); return { missing: Object.keys(MOSS_TILES).filter(n => !u.has(n)), extra: [...u].filter(n => !MOSS_TILES[n]) }; });
  ok('every piece is used by some area, and nothing named is missing from the atlas', r.missing.length === 0 && r.extra.length === 0, r);

  // ---- the hooks
  r = await ev(() => ({ moss: ['moss', 'spore', 'aqueduct', 'ember'].map(n => Art.tileHooks[n].solid === Art.tileHooks.moss.solid && MossTiles.has(THEMES[n])), crystal: Art.tileHooks.crystal !== Art.tileHooks.moss, others: ['cave', 'frost', 'storm', 'mirror', 'bone', 'lunar', 'webbed', 'foundry', 'throne', 'town'].filter(n => Art.tileHooks[n] && Art.tileHooks[n].solid === Art.tileHooks.moss.solid) }));
  ok('Mossgrove, Sporewood, the Aqueduct and Cinderdeep are laid from the sheet, Crystal Spires and every other area are not', r.moss.every(Boolean) && r.crystal && r.others.length === 0, r);

  // ---- every room of the four areas
  r = await ev(() => {
    const { G, enterRoom } = DW; const T = TILE, out = { rooms: 0, bad: [], seen: {}, tot: { fills: 0, tops: 0, fringes: 0, props: 0, hangs: 0, arches: 0, plates: 0, accents: 0, vines: 0 }, same: true, themes: {} };
    for (const id of WORLD.order) {
      const d = WORLD.rooms[id]; if (!MossTiles.THEMES[d.theme]) continue;
      out.rooms++; out.themes[d.theme] = (out.themes[d.theme] || 0) + 1;
      const run = () => { G.flags = {}; enterRoom(id, { door: d.doors[0].id }); G.state = 'play'; G.trans = null; DW.step(1); DW.draw(); const s = MossTiles.stats; return JSON.stringify([s.props, s.hangs, s.fills, s.tops, s.arches]); };
      const a = run(), b = run(); if (a !== b) out.same = false;
      const s = MossTiles.stats, L = G.level; let solid = 0; for (let i = 0; i < L.t.length; i++) if (L.t[i] === T_SOLID) solid++;
      if (s.fills !== solid) out.bad.push([id, 'fills', s.fills, solid]);
      for (const k of Object.keys(out.tot)) out.tot[k] += Array.isArray(s[k]) ? s[k].length : s[k];
      const keep = []; for (const dd of d.doors) keep.push([dd.x - 2, dd.y - 1, dd.w + 4, dd.h + 2]);
      for (const q of [].concat(d.benches, d.stations, d.signs, d.npcs, d.items, d.mech)) keep.push([q.x - 3, q.y - 4, 7, 6]);
      for (const p of s.props) {
        out.seen[p.name] = 1;
        for (let i = 0; i < p.fw; i++) { if (L.get(p.x0 + i, p.y) !== T_SOLID) out.bad.push([id, 'floor', p.name]); for (let j = 1; j <= p.nh; j++) if (L.get(p.x0 + i, p.y - j) !== T_AIR) out.bad.push([id, 'air', p.name]); }
        for (const q of keep) if (p.x0 < q[0] + q[2] && p.x0 + p.fw > q[0] && p.y - p.nh < q[1] + q[3] && p.y > q[1]) out.bad.push([id, 'keep-out', p.name]);
      }
      for (const p of s.hangs) {
        out.seen[p.name] = 1;
        for (let i = 0; i < p.fw; i++) { if (L.get(p.x0 + i, p.y) !== T_SOLID) out.bad.push([id, 'ceiling', p.name]); for (let j = 1; j <= p.nh; j++) if (L.get(p.x0 + i, p.y + j) !== T_AIR) out.bad.push([id, 'hang-air', p.name]); }
      }
    }
    return out;
  });
  ok('all ' + r.rooms + ' rooms of the four areas are laid without a throw: a block for every tile of rock, ground tops, hanging moss, arches, plates, things', r.rooms >= 30 && r.bad.length === 0 && r.tot.fills > 5000 && r.tot.tops > 100 && r.tot.fringes > 100 && r.tot.arches > 20 && r.tot.plates > 100 && r.tot.props > 60 && r.tot.hangs > 40, [r.rooms, r.themes, r.tot, r.bad.slice(0, 5)]);
  ok('standing things are on rock with free air above, hanging things under rock with free air below, none on a door, bench or pickup', r.bad.length === 0, r.bad.slice(0, 5));
  ok('a room is laid the same way on every visit', r.same);
  ok('many different things stand and hang in the rooms (' + Object.keys(r.seen).length + ' kinds seen)', Object.keys(r.seen).length >= 25, Object.keys(r.seen));

  // ---- spikes, cracks
  r = await ev(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 80; const g = c.getContext('2d'); Guard.track(g); const out = {};
    const px = () => { const d = g.getImageData(0, 0, 200, 80).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; };
    for (const n of ['moss', 'spore', 'aqueduct', 'ember', 'crystal', 'cave']) { g.clearRect(0, 0, 200, 80); for (let i = 0; i < 6; i++) drawSpikes(g, THEMES[n], 8 + i * 32, 20, 0.5); out[n] = px(); }
    g.clearRect(0, 0, 200, 80); Art.drawCrack(g, 1, 1, THEMES.moss, 1); out.crack = px();
    return out;
  });
  ok('spikes are drawn from the sheet in the four areas (and still in the others), cracked rock too', Object.values(r).every(v => v > 300), r);

  // ---- pictures of the four areas
  for (const [id, name] of [['mg1', 'moss'], ['sp2', 'spore'], ['aq1', 'aqueduct'], ['em1', 'ember']]) {
    await ev(id => { const { G, P, enterRoom } = DW; G.flags = {}; enterRoom(id, { door: WORLD.rooms[id].doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; P.invuln = 1e9; DW.step(3); snapCamera(); DW.step(20); DW.draw(); }, id);
    await page.waitForTimeout(120);
    await page.screenshot({ path: shot('moss_' + name + '.png') });
  }
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
