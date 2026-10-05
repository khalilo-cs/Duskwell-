// The map: every room placed once and without overlaps, doors lined up, drawings made from the rooms' own tiles, signs, the
// three views (room / area / world), and the colours of the areas (they turn into rgb() strings once the painted palettes load).
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  // ---- the layout
  let r = await ev(() => {
    const L = MapView.layout(), W = WORLD.rooms, ids = WORLD.order, out = { n: Object.keys(L.pos).length, overlaps: [], aligned: 0, pairs: 0, off: [] };
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (MapView.hits(L.pos[ids[i]], W[ids[i]], L.pos[ids[j]], W[ids[j]])) out.overlaps.push(ids[i] + '/' + ids[j]);
    for (const id of ids) for (const d of W[id].doors) {
      const B = W[d.to]; if (!B || B.area !== W[id].area || id > d.to) continue;
      const bd = MapView.backDoor(id, d), a = L.pos[id], b = L.pos[d.to]; out.pairs++;
      if (Math.abs(a.x + d.x + d.w / 2 - (b.x + bd.x + bd.w / 2)) + Math.abs(a.y + d.y + d.h / 2 - (b.y + bd.y + bd.h / 2)) <= 3) out.aligned++; else out.off.push(id + '>' + d.to);
    }
    out.fit = L.fit; out.w = L.w; out.h = L.h; out.areas = Object.keys(L.areas).length;
    // blocks of different areas do not overlap
    const A = Object.values(L.areas); out.blockClash = 0;
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if (A[i].x < A[j].x + A[j].w && A[j].x < A[i].x + A[i].w && A[i].y < A[j].y + A[j].h && A[j].y < A[i].y + A[i].h) out.blockClash++;
    return out;
  });
  ok('every one of the 117 rooms has a place on the map', r.n === 117, r.n);
  ok('no two rooms overlap', r.overlaps.length === 0, r.overlaps);
  ok('the blocks of the fifteen areas do not overlap', r.areas === 15 && r.blockClash === 0, r);
  ok('the doors of rooms in one area are lined up with the doors they open into (all but a few)', r.pairs > 80 && r.aligned / r.pairs >= 0.94, { pairs: r.pairs, aligned: r.aligned, off: r.off });
  ok('the whole world is packed to be seen at over 0.6 pixel to the tile, and is not a thin strip', r.fit >= 0.6 && r.w / r.h < 3.2, { fit: r.fit, w: r.w, h: r.h });
  // ---- the drawings of the rooms
  r = await ev(() => {
    const out = {}, c1 = MapView.mini('cx2', 1), c2 = MapView.mini('cx2', 2), c4 = MapView.mini('cx2', 4), d = WORLD.rooms.cx2;
    out.sizes = [c1.width, c1.height, c2.width, c4.height].join(); out.want = [d.w, d.h, d.w * 2, d.h * 4].join();
    out.cached = MapView.mini('cx2', 4) === c4;
    // a floor tile shows lighter than the empty air above it
    const g = c4.getContext('2d'); let floorY = -1, x = Math.floor(d.w / 2);
    for (let y = 2; y < d.h - 2; y++) if (d.t[y * d.w + x] === T_AIR && d.t[(y + 1) * d.w + x] === T_SOLID) { floorY = y + 1; break; }
    const air = g.getImageData(x * 4 + 2, (floorY - 3) * 4 + 2, 1, 1).data, top = g.getImageData(x * 4 + 2, floorY * 4, 1, 1).data;
    out.floor = { floorY, air: Array.from(air), top: Array.from(top) };
    // spikes show red, acid green or orange, a plate shows pale
    const find = (kind) => { for (const id of WORLD.order) { const R = WORLD.rooms[id]; for (let i = 0; i < R.t.length; i++) if (R.t[i] === kind) return { id, x: i % R.w, y: Math.floor(i / R.w) }; } return null; };
    out.kinds = {};
    for (const [name, kind] of [['spikes', T_HAZARD], ['acid', T_ACID], ['plate', T_ONEWAY], ['breakable', T_BREAK], ['bounce', T_BOUNCE]]) {
      const at = find(kind); if (!at) { out.kinds[name] = 'none'; continue; }
      const m = MapView.mini(at.id, 4).getContext('2d').getImageData(at.x * 4, at.y * 4, 4, 4).data; let best = 0, bi = 0;
      for (let i = 0; i < 16; i++) { const lum = m[i * 4] + m[i * 4 + 1] + m[i * 4 + 2]; if (lum > best) { best = lum; bi = i; } }
      out.kinds[name] = [m[bi * 4], m[bi * 4 + 1], m[bi * 4 + 2]];
    }
    return out;
  });
  ok('the picture of a room is its tile size times 1, 2 or 4, and is kept', r.sizes === r.want && r.cached, r);
  ok('the floor shows lighter than the air over it', r.floor.floorY > 0 && r.floor.top[0] + r.floor.top[1] + r.floor.top[2] > r.floor.air[0] + r.floor.air[1] + r.floor.air[2] + 150, r.floor);
  const K = r.kinds;
  ok('spikes are red, acid is bright, plates are pale, breakable walls are cream, bounce caps are green', K.spikes[0] > 200 && K.spikes[1] < 130 && K.acid[0] + K.acid[1] > 300 && K.plate[2] > 200 && K.breakable[0] > 200 && K.breakable[1] > 180 && K.bounce[1] > 220, K);
  // ---- the colours: an ember room's frame is the ember colour (not black) once the area colours are rgb() strings
  r = await ev(() => {
    const { G } = DW; for (const id of Object.keys(G.visited)) delete G.visited[id];
    DW.enterRoom('em3', { pos: { x: 300, y: 300 } }); G.visited.em2 = G.visited.em3 = G.visited.em4 = true; G.state = 'map'; G.mapView = { mode: 1, px: 0, py: 0 }; G.areaBanner = null; G.fadeA = 0; G.trans = null; DW.step(2); DW.draw();
    const v = MapView.view(G.mapView), p = MapView.layout().pos.em4, R = WORLD.rooms.em4, c = document.querySelector('canvas'), k = c.width / VW;
    const X = x => 24 + (VW - 48) / 2 + (x - v.fx) * v.s, Y = y => 76 + 388 / 2 + (y - v.fy) * v.s;
    const g = c.getContext('2d'), px = Math.round(X(p.x + R.w / 2)), py = Math.round(Y(p.y));
    let best = null; for (let dy = -2; dy <= 2; dy++) { const d = g.getImageData(px * k, (py + dy) * k, 1, 1).data; if (!best || d[0] - d[2] > best[0] - best[2]) best = Array.from(d); }
    return { color: AREA_COLORS.ember, px: best };
  });
  ok('the frame of an ember room is orange', r.px[0] > 170 && r.px[0] > r.px[2] + 60, r);
  // ---- the three views, and Enter steps through them
  r = await ev(() => { DW.G.mapView = null; DW.step(1); return DW.G.mapView; });
  ok('the map opens on this room', r && r.mode === 0, r);
  const sc = [];
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Enter'); await ev(() => DW.step(2)); sc.push(await ev(() => ({ m: DW.G.mapView.mode, s: MapView.view(DW.G.mapView).s }))); }
  ok('Z (Enter) goes room, area, world and round again; the world is the smallest', sc.map(q => q.m).join() === '1,2,0' && sc[1].s < sc[0].s && sc[0].s < 3.01, sc);
  await ev(() => { DW.G.mapView = { mode: 0, px: 0, py: 0 }; });
  await page.keyboard.down('ArrowRight'); await ev(() => DW.step(30)); await page.keyboard.up('ArrowRight'); await ev(() => DW.step(2));
  r = await ev(() => ({ px: DW.G.mapView.px })); ok('the arrows move the view in the room and area views', r.px > 10, r);
  await ev(() => { DW.G.mapView = { mode: 2, px: 0, py: 0 }; });
  await page.keyboard.down('ArrowRight'); await ev(() => DW.step(30)); await page.keyboard.up('ArrowRight'); await ev(() => DW.step(2));
  r = await ev(() => ({ px: DW.G.mapView.px })); ok('the world view stays put', r.px === 0, r);
  await page.keyboard.press('Escape'); await ev(() => DW.step(2));
  r = await ev(() => ({ state: DW.G.state, view: DW.G.mapView })); ok('Esc closes the map', r.state === 'play' && r.view === null, r);
  // ---- everything draws: nothing seen but this room, some seen, everything seen; in both languages and all three views
  r = await ev(() => {
    const { G } = DW, out = [], sets = { one: () => { for (const k of Object.keys(G.visited)) delete G.visited[k]; G.visited.cx2 = true; }, half: () => { WORLD.order.forEach((id, i) => { G.visited[id] = i % 2 === 0; }); G.visited.cx2 = true; }, all: () => WORLD.order.forEach(id => { G.visited[id] = true; }) };
    DW.enterRoom('cx2', { pos: { x: 200, y: 300 } }); G.trans = null; G.fadeA = 0; G.areaBanner = null;
    for (const [name, f] of Object.entries(sets)) for (const lang of ['ar', 'en']) for (const mode of [0, 1, 2]) {
      f(); setLang(lang); G.state = 'map'; G.mapView = { mode, px: 0, py: 0 };
      try { DW.draw(); } catch (e) { out.push(name + lang + mode + ':' + e.message); }
    }
    setLang('ar'); G.state = 'play'; return out;
  });
  ok('the map draws in 18 ways without an error', r.length === 0, r);
  r = await ev(() => {
    // each other area, as the place you stand in: every room at the world scale and the area scale
    const { G } = DW, out = [];
    for (const id of WORLD.order) G.visited[id] = true;
    for (const room of ['town', 'fd1', 'os5', 'lo7', 'ht2', 'wd7', 'sc5', 'mv3', 'fr8']) { DW.enterRoom(room, { pos: { x: 100, y: 100 } }); G.trans = null; G.fadeA = 0; G.state = 'map'; for (const mode of [0, 1, 2]) { G.mapView = { mode, px: 0, py: 0 }; try { DW.draw(); } catch (e) { out.push(room + mode + ':' + e.message); } } }
    G.state = 'play'; return out;
  });
  ok('it draws from nine other rooms in the three views', r.length === 0, r);
  // ---- the pictures for the stories: the map as the player sees it
  await ev(() => { const { G } = DW; for (const id of WORLD.order) G.visited[id] = true; G.flags.station_cx2 = true; G.flags.station_cx4 = true; G.flags.boss_guardian = true; DW.enterRoom('cx2', { pos: { x: 300, y: 300 } }); G.trans = null; G.fadeA = 0; G.areaBanner = null; G.state = 'map'; G.mapView = { mode: 2, px: 0, py: 0 }; });
  await page.screenshot({ path: shot('map_world.png') });
  await ev(() => { DW.G.mapView = { mode: 1, px: 0, py: 0 }; }); await page.screenshot({ path: shot('map_area.png') });
  await ev(() => { DW.G.mapView = { mode: 0, px: 0, py: 0 }; }); await page.screenshot({ path: shot('map_room.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
