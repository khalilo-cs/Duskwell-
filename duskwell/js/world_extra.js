'use strict';
// Extra rooms that widen every area. Each one is a recipe of floor pieces and sits between two rooms that already
// touch: it takes over their door link, and the map positions of everything behind it move over to make room.
// Pieces, left to right (the number is the width in tiles):
//   F flat floor        P pit of spikes        G gap crossed on plates       L pool of acid crossed on plates
//   H hill of steps     A arena with plates    T tower of ledges up to a cache   I ice floor
(function build() {
  const H_ROOM = 22, GY = 18;                              // every extra room is 22 tiles tall with its floor at row 18
  // colour of the lanterns in each area
  const LIGHT = { town: '#ffc27a', cave: '#8fd8ff', moss: '#9dffd8', crystal: '#ff9bd6', spore: '#ffb070', aqueduct: '#8fe0ff', webbed: '#c8a8ff', foundry: '#ff9a50',
    throne: '#ffe2a8', frost: '#cfeeff', ember: '#ff8a3a', storm: '#a8c0ff', mirror: '#d8c8ff', bone: '#bfe8d0', lunar: '#e8ecff' };

  // ---- the pieces: each adds its terrain at x (width w) and lists where things can stand or lie ----
  const PIECES = {
    F(b, x, w, c) { c.ground.push({ x0: x, x1: x + w, y: GY - 1 }); },
    P(b, x, w, c) { b.air(x, GY, w, H_ROOM - GY).hazard(x, H_ROOM - 1, w, 1); c.gaps.push({ x, w }); },
    // a gap crossed on plates: about every five tiles a plate, three wide, now level with the floor and now one above it
    G(b, x, w, c) {
      b.air(x, GY, w, H_ROOM - GY).hazard(x, H_ROOM - 1, w, 1);
      plates(b, x, w); c.gaps.push({ x, w });
    },
    L(b, x, w, c) {
      b.air(x, GY, w, H_ROOM - GY).acid(x, GY + 1, w, H_ROOM - GY - 1);
      plates(b, x, w); c.gaps.push({ x, w });
    },
    // steps up and down, never more than three tiles high
    H(b, x, w, c) {
      const k = Math.min(3, Math.floor((w - 2) / 4));
      for (let i = 0; i < k; i++) { b.solid(x + 2 * i, GY - i - 1, 2, i + 1); b.solid(x + w - 2 * (i + 1), GY - i - 1, 2, i + 1); }
      b.solid(x + 2 * k, GY - k, w - 4 * k, k);
      c.ground.push({ x0: x + 2 * k, x1: x + w - 2 * k, y: GY - k - 1 });
    },
    // flat ground with a plate high on each side
    A(b, x, w, c) {
      b.plat(x + 2, GY - 4, 4).plat(x + w - 6, GY - 4, 4);
      c.ground.push({ x0: x, x1: x + w, y: GY - 1 });
      c.ledges.push({ x: x + w - 5, y: GY - 5 });
    },
    // a tower of plates on the left, up to a ledge with a cache
    T(b, x, w, c) {
      b.plat(x + 1, GY - 2, 3).plat(x + w - 4, GY - 4, 3).plat(x + 1, GY - 6, 3);
      c.ground.push({ x0: x, x1: x + w, y: GY - 1 });
      c.ledges.push({ x: x + 2, y: GY - 7, top: true });
    },
    I(b, x, w, c) { b.ice(x, GY, w, 1); c.ground.push({ x0: x, x1: x + w, y: GY - 1 }); },
  };
  // plates over a gap of w tiles: gaps between neighbours never exceed three tiles
  function plates(b, x, w) {
    const k = Math.max(1, Math.ceil((w - 3) / 6)), free = w - 3 * k, seg = free / (k + 1);
    let px = x;
    for (let j = 0; j < k; j++) {
      px = Math.round(x + seg * (j + 1) + 3 * j);
      b.plat(px, GY - (j % 2), 3);
    }
  }

  // ---- the map: the new room goes next to A on the side where B lies and everything behind B moves over to make room;
  // when that would make rooms overlap, the room takes the nearest free spot instead and nothing moves ----
  const rectOf = r => ({ x0: r.map.x, y0: r.map.y, x1: r.map.x + Math.ceil(r.w / 8), y1: r.map.y + Math.ceil(r.h / 8) });
  const clash = (a, b) => a.x0 < b.x1 - 0.01 && a.x1 > b.x0 + 0.01 && a.y0 < b.y1 - 0.01 && a.y1 > b.y0 + 0.01;
  const overlaps = () => { const rs = Object.keys(WORLD.rooms).map(id => rectOf(WORLD.rooms[id])); let n = 0; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (clash(rs[i], rs[j])) n++; return n; };
  function placeOnMap(N, A, B, da, mw, w) {
    const east = B.map.x === A.map.x ? da.x !== 0 : B.map.x > A.map.x, dx = east ? mw : -mw;
    const ideal = { x: A.map.x + (east ? Math.ceil(A.w / 8) : -mw), y: A.map.y + Math.round((da.y - (GY - 3)) / 8) };
    // everything behind B (the rooms reached through B without passing the new room)
    const seen = new Set([B.id]), q = [B.id];
    while (q.length) for (const d of WORLD.rooms[q.shift()].doors) if (d.to !== N.id && !seen.has(d.to) && WORLD.rooms[d.to] && d.to !== A.id) { seen.add(d.to); q.push(d.to); }
    delete WORLD.rooms[N.id];
    const before = overlaps();
    WORLD.rooms[N.id] = N;
    // first try: shift
    N.map = ideal; for (const id of seen) WORLD.rooms[id].map.x += dx;
    if (overlaps() <= before) return;
    for (const id of seen) WORLD.rooms[id].map.x -= dx;
    // second try: the nearest free spot to the middle between A and B
    const mid = { x: (A.map.x + B.map.x) / 2, y: (A.map.y + B.map.y) / 2 };
    let best = null;
    for (let r = 0; r < 40 && !best; r++) for (let ox = -r; ox <= r && !best; ox++) for (let oy = -r; oy <= r && !best; oy++) {
      if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
      N.map = { x: Math.round(mid.x) + ox, y: Math.round(mid.y) + oy };
      if (overlaps() <= before) best = N.map;
    }
    if (!best) N.map = ideal;
  }

  // ---- put a room between two doors ----
  // spec: id, area, theme, between: [roomA, doorA, roomB, doorB], pieces, ground / air / ceil: lists of enemy types,
  // n: [ground, air, ceiling] counts, cache: geo in the cache, seed
  function extra(spec) {
    const [aId, aDoor, bId, bDoor] = spec.between, A = WORLD.rooms[aId], B = WORLD.rooms[bId];
    const da = A.doors.find(d => d.id === aDoor), db = B.doors.find(d => d.id === bDoor);
    const pieces = spec.pieces.split(' ').map(s => ({ kind: s[0], w: +s.slice(1) }));
    const w = 2 + pieces.reduce((s, p) => s + p.w, 0);
    const westSide = da.x === 0;                              // A's door is on its west wall: the new room lies west of A
    const toA = westSide ? 'e' : 'w', toB = westSide ? 'w' : 'e';
    const mw = Math.ceil(w / 8);
    const N = room(spec.id, w, H_ROOM, { area: spec.area, theme: spec.theme, map: { x: 0, y: 0 } });
    placeOnMap(N, A, B, da, mw, w);
    N.need = spec.need;                                       // the abilities the tests give the hero to cross it (none, D, DW, DWD)
    N.solid(0, GY, w, H_ROOM - GY);
    // the pieces
    const c = { ground: [], ledges: [], gaps: [] }, rnd = mulberry32(spec.seed || w * 131 + spec.id.length * 17);
    let x = 1;
    for (const p of pieces) { PIECES[p.kind](N, x, p.w, c); x += p.w; }
    // the Observatory: a field of weak gravity over every gap
    if (spec.theme === 'lunar') for (const g of c.gaps) N.grav(g.x - 3, 0, g.w + 6, H_ROOM - 1);
    // doors, linked both ways
    N.door(toA, toA === 'w' ? 0 : w - 1, GY - 3, 1, 3, aId, aDoor).door(toB, toB === 'w' ? 0 : w - 1, GY - 3, 1, 3, bId, bDoor);
    da.to = spec.id; da.toDoor = toA; db.to = spec.id; db.toDoor = toB;
    // enemies: walkers on the pieces' floors (away from the doors), flyers over the room, hangers from the ceiling
    const [ng, na, nc] = spec.n || [3, 1, 0], floors = c.ground.filter(g => g.x1 - g.x0 >= 4);
    const pick = list => list[Math.floor(rnd() * list.length)];
    for (let i = 0; i < ng && floors.length; i++) {
      const f = floors[i % floors.length], fx = Math.max(f.x0 + 1, 6), tx = Math.min(f.x1 - 2, w - 7);
      if (tx < fx) continue;
      N.enemy(pick(spec.ground), fx + Math.floor(rnd() * (tx - fx + 1)), f.y);
    }
    for (let i = 0; i < na; i++) N.enemy(pick(spec.air), 8 + Math.floor(rnd() * (w - 16)), GY - 5 - Math.floor(rnd() * 4));
    for (let i = 0; i < nc; i++) N.enemy(pick(spec.ceil), 6 + Math.floor(rnd() * (w - 12)), 1, spec.ceil[0] === 'censer' ? { len: 6 + Math.floor(rnd() * 5) } : undefined);
    // a cache on the highest ledge there is
    const top = c.ledges.find(l => l.top) || c.ledges[0];
    if (top && spec.cache) N.item('cache_' + spec.id, top.x, top.y, 'cache', { amount: spec.cache });
    // a bench on the widest floor, for the rooms that have one
    if (spec.bench) { const f = floors.slice().sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0]; if (f) N.bench(Math.floor((f.x0 + f.x1) / 2), f.y); }
    // a lantern every dozen tiles
    for (let lx = 9; lx < w - 6; lx += 14) N.decor('light', lx, GY - 5, { r: 190, c: LIGHT[spec.theme] || '#cfe0ff' });

    return N;
  }

  // ===================== the extra rooms =====================
  // ----- Hushvale: the roads out of the town
  extra({ id: 'tw1', area: 'hushvale', theme: 'town', between: ['town', 'east', 'fr1', 'w'], pieces: 'F10 P3 F8 H12 F8', ground: ['crawler', 'husk'], air: ['flyer'], n: [3, 1, 0], need: 'none', cache: 60, seed: 11 });
  extra({ id: 'tw2', area: 'hushvale', theme: 'town', between: ['town', 'west', 'em1', 'e'], pieces: 'F10 H12 G9 F8', ground: ['crawler', 'husk'], air: ['flyer'], n: [3, 1, 0], need: 'none', cache: 60, seed: 12 });
  // ----- the Sunken Crossroads
  extra({ id: 'cx6', area: 'crossroads', theme: 'cave', between: ['cx1', 'r', 'cx2', 'l'], pieces: 'F8 P3 F8 H12 F6 T10 F6', ground: ['crawler', 'husk'], air: ['flyer'], n: [4, 1, 0], need: 'none', cache: 80, seed: 21 });
  extra({ id: 'cx7', area: 'crossroads', theme: 'cave', between: ['cx2', 'r', 'cx3', 'l'], pieces: 'F8 G10 F6 A12 P3 F8', ground: ['crawler', 'husk', 'ram'], air: ['flyer', 'diver'], n: [5, 2, 0], need: 'none', cache: 100, seed: 22 });
  // ----- Mossgrove
  extra({ id: 'mg6', area: 'mossgrove', theme: 'moss', between: ['mg1', 'r', 'mg2', 'l'], pieces: 'F8 G10 F6 H12 F6 T10 F6', ground: ['hopper', 'spitter', 'crawler'], air: ['flyer', 'jelly'], n: [5, 2, 0], need: 'D', cache: 110, seed: 31 });
  extra({ id: 'mg7', area: 'mossgrove', theme: 'moss', between: ['mg2', 'r', 'mg3', 'l'], pieces: 'F8 L9 F6 A12 P6 F8', ground: ['hopper', 'spitter', 'husk'], air: ['jelly', 'flyer'], n: [5, 2, 0], need: 'D', cache: 120, seed: 32 });
  // ----- the Crystal Spires
  extra({ id: 'cs5', area: 'crystal', theme: 'crystal', between: ['cs1', 'r', 'cs2', 'l'], pieces: 'F8 G12 F6 H12 F6 T10 F6', ground: ['crawler', 'shard', 'husk'], air: ['flyer'], n: [5, 3, 0], need: 'DW', cache: 130, seed: 41 });
  extra({ id: 'cs6', area: 'crystal', theme: 'crystal', between: ['cs2', 'r', 'cs3', 'l'], pieces: 'F8 P6 F6 A12 G10 F8', ground: ['shard', 'crawler'], air: ['flyer'], n: [5, 3, 0], need: 'DW', cache: 140, seed: 42 });
  // ----- the road to the Throne
  extra({ id: 'ht4', area: 'throne', theme: 'throne', between: ['ht1', 'r', 'ht3', 'l'], pieces: 'F8 G12 F6 A12 P8 F6 T10 F6', ground: ['sentinel', 'shard', 'husk'], air: ['flyer'], n: [6, 3, 0], need: 'DWD', cache: 180, seed: 51 });
  // ----- the Spore Hollows
  extra({ id: 'sp5', area: 'spore', theme: 'spore', between: ['sp1', 'e', 'sp2', 'w'], pieces: 'F8 P6 F6 H12 F6 A12 F6', ground: ['shroom', 'husk'], air: ['diver', 'jelly'], n: [5, 2, 0], need: 'DW', cache: 120, seed: 61 });
  extra({ id: 'sp6', area: 'spore', theme: 'spore', between: ['sp2', 'e', 'sp3', 'w'], pieces: 'F8 G10 F6 T10 F6 L9 F6', ground: ['shroom', 'husk'], air: ['diver', 'jelly'], n: [5, 3, 0], need: 'DW', cache: 130, seed: 62 });
  // ----- the Aqueduct
  extra({ id: 'aq5', area: 'aqueduct', theme: 'aqueduct', between: ['aq1', 'w', 'aq2', 'e'], pieces: 'F8 L10 F6 H12 F6 T10 F6', ground: ['crawler', 'sentinel', 'spitter'], air: ['jelly', 'diver'], n: [5, 3, 0], need: 'DW', cache: 130, seed: 71 });
  extra({ id: 'aq6', area: 'aqueduct', theme: 'aqueduct', between: ['aq2', 'w', 'aq3', 'e'], pieces: 'F8 G12 F6 A12 L9 F6', ground: ['sentinel', 'husk', 'spitter'], air: ['jelly', 'diver'], n: [5, 3, 0], need: 'DW', cache: 140, seed: 72 });
  // ----- the Webbed Depths
  extra({ id: 'wd5', area: 'webbed', theme: 'webbed', between: ['wd1', 'w', 'wd2', 'e'], pieces: 'F8 P6 F6 H12 F6 A12 F6', ground: ['spider', 'crawler', 'husk'], air: ['diver'], n: [6, 2, 0], need: 'DW', cache: 130, seed: 81 });
  extra({ id: 'wd6', area: 'webbed', theme: 'webbed', between: ['wd2', 'w', 'wd3', 'e'], pieces: 'F8 G12 F6 T10 F6 P6 F6', ground: ['spider', 'crawler'], air: ['diver'], n: [6, 3, 0], need: 'DW', cache: 140, seed: 82 });
  // ----- the Rustworks
  extra({ id: 'fd4', area: 'rustworks', theme: 'foundry', between: ['fd1', 'w', 'fd2', 'e'], pieces: 'F8 G12 F6 A12 P6 F8', ground: ['crawler'], air: ['flyer'], n: [4, 3, 0], need: 'DW', cache: 150, seed: 91 });
  // ----- Rimecrest
  extra({ id: 'fr9', area: 'frost', theme: 'frost', between: ['fr1', 'e', 'fr2', 'w'], pieces: 'F8 I10 F6 H12 F6 T10 F6', ground: ['slime', 'mole', 'ram'], air: ['moth', 'veil'], ceil: ['icicle'], n: [5, 2, 3], need: 'DW', cache: 140, seed: 101 });
  extra({ id: 'fr10', area: 'frost', theme: 'frost', between: ['fr3', 'e', 'fr4', 'w'], pieces: 'F8 G12 I8 A12 P6 F8', ground: ['slime', 'mole', 'chainman'], air: ['moth', 'veil'], ceil: ['icicle'], n: [5, 3, 3], need: 'DW', cache: 150, seed: 102 });
  // ----- Cinderdeep
  extra({ id: 'em9', area: 'ember', theme: 'ember', between: ['em1', 'w', 'em2', 'e'], pieces: 'F8 L10 F6 H12 F6 T10 F6', ground: ['imp', 'lavaworm', 'chainman'], air: ['moth'], ceil: ['icicle'], n: [5, 2, 2], need: 'DW', cache: 140, seed: 111 });
  extra({ id: 'em10', area: 'ember', theme: 'ember', between: ['em3', 'w', 'em4', 'e'], pieces: 'F8 G12 F6 A12 L9 F6', ground: ['imp', 'roller', 'chainman'], air: ['moth'], ceil: ['icicle'], n: [5, 3, 2], need: 'DW', cache: 150, seed: 112 });
  // ----- Stormcrest
  extra({ id: 'sc8', area: 'stormcrest', theme: 'storm', between: ['sc1', 'e', 'sc2', 'w'], pieces: 'F8 G12 F6 H12 F6 T10 F6', ground: ['ram', 'warden'], air: ['flyer', 'diver', 'moth'], n: [4, 4, 0], need: 'DWD', cache: 150, seed: 121 });
  extra({ id: 'sc9', area: 'stormcrest', theme: 'storm', between: ['sc3', 'e', 'sc4', 'w'], pieces: 'F8 P8 F6 A12 G12 F6', ground: ['ram', 'warden'], air: ['flyer', 'diver', 'moth'], n: [4, 4, 0], need: 'DWD', cache: 160, seed: 122 });
  // ----- the Mirror Vault
  extra({ id: 'mv8', area: 'mirror', theme: 'mirror', between: ['mv1', 'w', 'mv2', 'e'], pieces: 'F8 G12 F6 H12 F6 T10 F6', ground: ['warden', 'ram'], air: ['veil', 'flyer'], n: [4, 4, 0], need: 'DWD', cache: 160, seed: 131 });
  extra({ id: 'mv9', area: 'mirror', theme: 'mirror', between: ['mv3', 'w', 'mv4', 'e'], pieces: 'F8 P8 F6 A12 G12 F6', ground: ['warden', 'ram'], air: ['veil', 'flyer'], n: [4, 4, 0], need: 'DWD', cache: 170, seed: 132 });
  // ----- the Ossuary
  extra({ id: 'os8', area: 'ossuary', theme: 'bone', between: ['os1', 'w', 'os2', 'e'], pieces: 'F8 P8 F6 H12 F6 A12 F6', ground: ['heap'], air: ['skullbat'], ceil: ['censer'], n: [4, 3, 2], need: 'DWD', cache: 160, seed: 141 });
  extra({ id: 'os9', area: 'ossuary', theme: 'bone', between: ['os3', 'w', 'os4', 'e'], pieces: 'F8 L9 F6 T10 F6 G12 F6', ground: ['heap'], air: ['skullbat'], ceil: ['censer'], n: [4, 3, 3], need: 'DWD', cache: 170, seed: 142 });
  // ----- the Lunar Observatory
  extra({ id: 'lo8', area: 'lunar', theme: 'lunar', between: ['lo1', 'e', 'lo2', 'w'], pieces: 'F8 G12 F6 H12 F6 T10 F6', ground: ['lunarhare', 'lensling'], air: ['orrery'], n: [4, 3, 0], need: 'DWD', cache: 170, seed: 151 });
  extra({ id: 'lo9', area: 'lunar', theme: 'lunar', between: ['lo3', 'e', 'lo4', 'w'], pieces: 'F8 P8 F6 A12 G12 F6', ground: ['lunarhare', 'lensling'], air: ['orrery'], n: [4, 3, 0], need: 'DWD', cache: 180, seed: 152 });
  // ===================== a third room for most areas, with a bench =====================
  extra({ id: 'cx8', area: 'crossroads', theme: 'cave', between: ['cx4', 'e', 'sp1', 'w'], pieces: 'F8 G12 F6 A12 P6 F6 T10 F6', ground: ['crawler', 'husk', 'ram', 'sentinel'], air: ['flyer', 'diver'], n: [6, 2, 0], need: 'DW', cache: 110, bench: true, seed: 23 });
  extra({ id: 'mg8', area: 'mossgrove', theme: 'moss', between: ['mg2', 'w', 'mg4', 'e'], pieces: 'F8 L9 F6 H12 F6 A12 P6 F6', ground: ['hopper', 'spitter', 'crawler', 'husk'], air: ['flyer', 'jelly'], n: [6, 3, 0], need: 'DW', cache: 130, bench: true, seed: 33 });
  extra({ id: 'cs7', area: 'crystal', theme: 'crystal', between: ['cs1', 'w', 'cs4', 'e'], pieces: 'F8 G12 F6 H12 F6 A12 P6 F6', ground: ['crawler', 'shard', 'husk'], air: ['flyer'], n: [6, 3, 0], need: 'DW', cache: 140, bench: true, seed: 43 });
  extra({ id: 'sp7', area: 'spore', theme: 'spore', between: ['sp3', 'e', 'sp4', 'w'], pieces: 'F8 L9 F6 A12 G12 F6 T10 F6', ground: ['shroom', 'husk'], air: ['diver', 'jelly'], n: [6, 3, 0], need: 'DW', cache: 140, bench: true, seed: 63 });
  extra({ id: 'aq7', area: 'aqueduct', theme: 'aqueduct', between: ['aq3', 'w', 'aq4', 'e'], pieces: 'F8 G12 F6 H12 L9 F6 A12 F6', ground: ['sentinel', 'husk', 'spitter', 'crawler'], air: ['jelly', 'diver'], n: [6, 3, 0], need: 'DW', cache: 150, bench: true, seed: 73 });
  extra({ id: 'wd7', area: 'webbed', theme: 'webbed', between: ['wd3', 'w', 'wd4', 'e'], pieces: 'F8 P6 F6 A12 G12 F6 T10 F6', ground: ['spider', 'crawler', 'husk'], air: ['diver'], n: [7, 3, 0], need: 'DW', cache: 150, bench: true, seed: 83 });
  extra({ id: 'fr11', area: 'frost', theme: 'frost', between: ['fr6', 'e', 'fr7', 'w'], pieces: 'F8 I10 F6 A12 G12 I8 F6 T10 F6', ground: ['slime', 'mole', 'ram', 'chainman'], air: ['moth', 'veil'], ceil: ['icicle'], n: [6, 3, 4], need: 'DW', cache: 160, bench: true, seed: 103 });
  extra({ id: 'em11', area: 'ember', theme: 'ember', between: ['em6', 'w', 'em7', 'e'], pieces: 'F8 L10 F6 A12 G12 F6 H12 F6', ground: ['imp', 'roller', 'chainman', 'lavaworm'], air: ['moth'], ceil: ['icicle'], n: [6, 3, 3], need: 'DW', cache: 160, bench: true, seed: 113 });
  extra({ id: 'sc10', area: 'stormcrest', theme: 'storm', between: ['sc5', 'e', 'sc6', 'w'], pieces: 'F8 G12 F6 A12 P8 F6 T10 F6', ground: ['ram', 'warden'], air: ['flyer', 'diver', 'moth'], n: [5, 5, 0], need: 'DWD', cache: 170, bench: true, seed: 123 });
  extra({ id: 'mv10', area: 'mirror', theme: 'mirror', between: ['mv5', 'w', 'mv6', 'e'], pieces: 'F8 P8 F6 H12 G12 F6 A12 F6', ground: ['warden', 'ram'], air: ['veil', 'flyer'], n: [5, 5, 0], need: 'DWD', cache: 180, bench: true, seed: 133 });
  extra({ id: 'os10', area: 'ossuary', theme: 'bone', between: ['os5', 'w', 'os6', 'e'], pieces: 'F8 L9 F6 A12 P8 F6 T10 F6', ground: ['heap'], air: ['skullbat'], ceil: ['censer'], n: [5, 4, 3], need: 'DWD', cache: 180, bench: true, seed: 143 });
  extra({ id: 'lo10', area: 'lunar', theme: 'lunar', between: ['lo5', 'e', 'lo6', 'w'], pieces: 'F8 G12 F6 A12 P8 F6 T10 F6', ground: ['lunarhare', 'lensling'], air: ['orrery'], n: [5, 4, 0], need: 'DWD', cache: 190, bench: true, seed: 153 });
})();
