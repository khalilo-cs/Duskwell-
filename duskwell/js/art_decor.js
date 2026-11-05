'use strict';
// Furnishings of the areas (js/decor_meta.js, made by tools/paint/decor.py): every room of an area that has its painted set gets
// lanterns, banners, cages and chandeliers hung from its ceilings, and candles, urns, rubble, braziers, pillars, arches, shrines,
// fences, ruins, tombs, statues and totems standing on its floors, chosen and placed from the room's own shape (the same every
// time), away from doors, benches, stations, signs and people. They are laid with the rock, behind everything that moves.
const Decor = (() => {
  const T = TILE, meta = typeof DECOR !== 'undefined' ? DECOR : {};
  const imgs = {};
  for (const t of Object.keys(meta)) { const im = new Image(); im.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; }; im.src = 'art/decor/' + t + '.webp'; imgs[t] = im; }
  const has = t => !!meta[t] && imgs[t] && imgs[t].complete && imgs[t].naturalWidth > 0;
  const HANG = ['lantern', 'banner', 'cage', 'chandelier', 'lantern', 'banner'];
  const SMALL = ['candles', 'urn', 'rubble', 'brazier', 'candles', 'rubble'];
  const BIG = ['pillar', 'arch', 'shrine', 'fence', 'ruin', 'tomb', 'statue', 'totem'];
  const H = { lantern: 2.2, banner: 3.2, cage: 2.6, chandelier: 2.2, candles: 1.1, urn: 1.6, rubble: 1.1, brazier: 1.8,
              pillar: 5, arch: 4.5, shrine: 2.6, fence: 1.6, ruin: 3, tomb: 2.2, statue: 4, totem: 3.6 };     // height in tiles
  const stats = { placed: 0 };
  function spots(L) {
    if (L._decor) return L._decor;
    const d = L.def || {}, busy = [].concat(d.doors || [], d.benches || [], d.stations || [], d.signs || [], d.npcs || [], d.items || []);
    const near = (x, y, r) => busy.some(q => Math.abs((q.x || 0) - x) < r && Math.abs((q.y || 0) - y) < 6);
    const S = (x, y) => L.get(x, y) === T_SOLID, A = (x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h && L.get(x, y) === T_AIR;
    const out = [], used = [];
    const free = (x, r) => !used.some(u => Math.abs(u - x) < r);
    let k = 0;
    // on the floors
    for (let y = 2; y < L.h - 1; y++) for (let x = 2; x < L.w - 2; x++) {
      if (!S(x, y + 1) || !A(x, y) || !A(x - 1, y) || !A(x + 1, y) || !S(x - 1, y + 1) || !S(x + 1, y + 1)) continue;
      let up = 0; while (A(x, y - up) && up < 9) up++;
      if (up < 3 || near(x, y, 4) || !free(x, 5)) continue;
      const v = hash2(x, y, 77); if (v > 0.33) continue;
      const big = up >= 6 && v < 0.14, list = big ? BIG : SMALL, n = list[(hash2(x, y, 5) * list.length) | 0];
      out.push({ n, x: x * T + T / 2, y: (y + 1) * T + 3, h: H[n] * T, back: big }); used.push(x); k++;
    }
    // under the ceilings
    for (let y = 1; y < L.h - 4; y++) for (let x = 2; x < L.w - 2; x++) {
      if (!S(x, y - 1) || !A(x, y)) continue;
      let dn = 0; while (A(x, y + dn) && dn < 9) dn++;
      if (dn < 6 || near(x, y + dn, 3) || !free(x, 4)) continue;
      if (hash2(x, y, 91) > 0.18) continue;
      const n = HANG[(hash2(x, y, 13) * HANG.length) | 0];
      out.push({ n, x: x * T + T / 2, y: y * T - 2, h: H[n] * T, hang: true }); used.push(x);
    }
    return (L._decor = out);
  }
  function lay(g, L, th) {
    const t = L.def && L.def.theme; if (!has(t)) return;
    const im = imgs[t], m = meta[t];
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const s of spots(L)) {
      const r = m[s.n]; if (!r) continue;
      const h = s.h, w = h * r[2] / r[3];
      g.globalAlpha = s.back ? 0.82 : 1;
      if (s.back) g.filter = 'brightness(0.72)';
      g.drawImage(im, r[0], r[1], r[2], r[3], s.x - w / 2, s.hang ? s.y : s.y - h, w, h);
      g.filter = 'none';
      stats.placed++;
    }
    g.restore();
  }
  for (const t of Object.keys(meta)) {
    const h = Art.tileHooks[t]; if (!h) continue;
    const old = h.scenery;
    h.scenery = (g, L, th, isS, seed) => { lay(g, L, th); if (old) old(g, L, th, isS, seed); };
  }
  return { has, stats, spots };
})();
// the things to pick up, painted: a shard of a life gem, a relic of a power, a fang, a pouch
(() => {
  const old = Art.drawItem;
  const PIC = { seed: 'it_life', ability: 'it_relic', fang: 'it_fang', vessel: 'it_vessel', key: 'it_key', scroll: 'it_scroll', idol: 'it_idol' };
  Art.drawItem = function (g, it, t) {
    const n = PIC[it.kind] || (it.kind !== 'charm' && it.kind !== 'cache' ? 'it_pouch' : null);
    if (!n || typeof UiArt === 'undefined' || !UiArt.has(n)) return old(g, it, t);
    const y = it.y + Math.sin(t * 2.5) * 5, glow = { it_life: '#ff5a6a', it_relic: '#e6f3ff', it_vessel: '#9fe0ff' }[n] || '#ffe9a0';
    bloom(g, it.x, y, it.kind === 'ability' ? 100 : 60, glow, 0.32 + 0.12 * Math.sin(t * 3));
    UiArt.draw(g, n, it.x, y, it.kind === 'ability' ? 46 : 36);
  };
})();
// pools of lava, acid and quicksilver painted (art/ui liq_*), slowly flowing; menu icons painted (art/ui mi_*)
(() => {
  const oldAcid = Art.drawAcid;
  Art.drawAcid = function (g, x, y, surface, t, th) {
    const n = th && th.name === 'ember' ? 'liq_lava' : th && th.name === 'mirror' ? 'liq_mercury' : 'liq_acid';
    if (typeof UiArt === 'undefined' || !UiArt.has(n)) return oldAcid(g, x, y, surface, t, th);
    const r = UiArt.R[n], px = x * TILE, py = y * TILE, s = 40, top = surface ? 7 : 0;
    const ox = ((x * s + t * 9) % (r[2] - s) + (r[2] - s)) % (r[2] - s), oy = ((y * s) % (r[3] - s) + (r[3] - s)) % (r[3] - s);
    g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = 0.95;
    UiArt.part(g, n, ox, oy, s, s, px - 0.3, py + top, TILE + 0.6, TILE - top + 0.3);
    if (surface) {
      g.globalAlpha = 0.85; g.beginPath(); g.moveTo(px, py + 9);
      for (let i = 0; i <= 4; i++) g.lineTo(px + i * 8, py + 7 + Math.sin(t * 2.4 + (x * 4 + i) * 0.8) * 2);
      g.lineTo(px + TILE, py + 11); g.lineTo(px, py + 11); g.closePath();
      g.fillStyle = n === 'liq_lava' ? 'rgba(255,225,140,0.9)' : n === 'liq_mercury' ? 'rgba(245,240,255,0.85)' : 'rgba(200,255,160,0.8)'; g.fill();
      bloom(g, px + 16, py + 8, 40, n === 'liq_lava' ? '#ff7a30' : n === 'liq_mercury' ? '#e8e0ff' : '#9dff6a', 0.2);
    }
    g.restore();
  };
  const PIC = { play: 'mi_play', sword: 'mi_sword', globe: 'mi_globe', map: 'mi_map', charm: 'mi_charm', shield: 'mi_shield', book: 'mi_book',
    note: 'mi_note', speaker: 'mi_speaker', mask: 'mi_hood', sun: 'mi_sun', frame: 'mi_frame', door: 'mi_door', yes: 'mi_yes', no: 'mi_no' };
  let done = false;
  const icons = () => {                                    // the menu icons exist once game.js has run
    if (done || typeof MENU_ICONS === 'undefined') return; done = true;
    for (const k of Object.keys(PIC)) {
      const old = MENU_ICONS[k]; if (!old) continue;
      MENU_ICONS[k] = g => { if (typeof UiArt !== 'undefined' && UiArt.has(PIC[k])) { g.save(); g.shadowBlur = 0; UiArt.draw(g, PIC[k], 0, 0, 26); g.restore(); } else old(g); };
    }
  };
  window.addEventListener('load', icons); setTimeout(icons, 0);
})();
// the weapons' swings, painted (art/ui sw_*): the mark grows out of the blade, flares and fades; up and down strikes turn it
(() => {
  const SW = { nail: 'sw_nail', lance: 'sw_lance', rapier: 'sw_rapier', fangs: 'sw_fangs', scythe: 'sw_scythe', cleaver: 'sw_cleaver', bonesaw: 'sw_bonesaw' };
  const SIZE = { nail: 92, lance: 110, rapier: 96, fangs: 64, scythe: 130, cleaver: 104, bonesaw: 100 };
  function swing(g, p, id, pr) {
    // four painted frames of the swing (starting, growing, full, breaking up) when they are there, the single picture if not
    const fi = Math.min(3, Math.floor(pr * 4)), fn = 'wf_' + id + '_' + fi;
    const n = typeof UiArt !== 'undefined' && UiArt.has(fn) ? fn : SW[id]; if (typeof UiArt === 'undefined' || !UiArt.has(n)) return false;
    const r = UiArt.R[n], f = p.face, vert = p.atkDir !== 'side', up = p.atkDir === 'up';
    const framed = n.startsWith('wf_'), grow = framed ? 1 : 0.55 + 0.6 * Math.min(1, pr * 1.6), a = framed ? (pr < 0.8 ? 1 : (1 - pr) * 5) : pr < 0.55 ? 1 : Math.max(0, 1 - (pr - 0.55) / 0.45);
    const L = SIZE[id] * (p.reachK ? p.reachK() : 1) * grow, H = L * r[3] / r[2];
    g.save(); g.globalAlpha = a; g.translate(p.cx, p.cy - 4);
    if (vert) g.rotate(up ? -Math.PI / 2 : Math.PI / 2); else if (f < 0) g.scale(-1, 1);
    if (p.atkAlt < 0) g.scale(1, -1);
    g.globalCompositeOperation = 'lighter';
    UiArt.draw(g, n, 14 + L / 2, 0, H, { w: L });
    g.restore();
    const sp = 'wf_spark_' + Math.min(3, Math.floor(Math.max(0, pr - 0.3) * 6));
    if (pr > 0.3 && pr < 0.95) UiArt.draw(g, UiArt.has(sp) ? sp : 'sw_spark', p.cx + (vert ? 0 : f * (14 + L)), p.cy - 4 + (vert ? (up ? -1 : 1) * (14 + L) : 0), 34, { alpha: 0.8 });
    return true;
  }
  const oldFx = Art.swingFx;
  if (oldFx) Art.swingFx = function (g, p, t) {
    const id = Gear.weapon(), w = Gear.w(), pr = 1 - clamp(p.atkT / Math.max(0.05, Math.min(0.16, w.cd * 0.6)), 0, 1);
    if (!swing(g, p, id, pr)) return oldFx(g, p, t);
  };
  if (typeof drawSlash === 'function') {
    const oldSlash = drawSlash;
    drawSlash = function (g, p, fx, fy, k) { if (!swing(g, p, 'nail', 1 - clamp(p.atkT / 0.16, 0, 1))) oldSlash(g, p, fx, fy, k); };
  }
})();
// the air of the areas, painted: snowflakes, leaves, embers, bubbles, motes and rain drawn from the painted wisps (art/ui fx_*),
// tinted in the colour of the area; they move exactly as before
(() => {
  const old = Art.drawAmbient; if (!old) return;
  const NOOP = new Proxy(function () {}, { get: () => NOOP, set: () => true, apply: () => NOOP });
  Art.drawAmbient = function (g, dt, theme, camX, camY, t) {
    if (typeof UiArt === 'undefined' || !UiArt.has('fx_puff')) return old(g, dt, theme, camX, camY, t);
    old(NOOP, dt, theme, camX, camY, t);                     // only the moving
    const th = THEMES[theme] || {}, hot = theme === 'foundry' || theme === 'ember';
    const kind = theme === 'frost' ? ['fx_puff', '#ffffff'] : theme === 'storm' ? ['fx_drop', '#cfe0ff'] : hot ? ['wf_spark_1', '#ffb070']
      : theme === 'town' ? ['fx_fleck', '#ff9a50'] : (theme === 'moss' || theme === 'aqueduct') ? ['fx_drop', '#bff8ee'] : ['wf_spark_1', th.part || '#cfe0ff'];
    const c = UiArt.tint(UiArt.has(kind[0]) ? kind[0] : 'fx_puff', kind[1]); if (!c) return;
    g.save();
    for (const m of Art.motes) {
      const a = (0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + m.p))) * m.z, s = (theme === 'storm' ? 10 : theme === 'frost' ? 6 : 7) * (0.6 + m.s * 0.35) * m.z + 2;
      g.globalAlpha = Math.min(0.9, a + 0.1); g.globalCompositeOperation = hot || theme === 'cave' || theme === 'crystal' ? 'lighter' : 'source-over';
      g.save(); g.translate(m.x, m.y); g.rotate(theme === 'storm' ? 0.35 : m.rot);
      g.drawImage(c, -s / 2, -s / 2, s, theme === 'storm' ? s * 2.2 : s); g.restore();
    }
    g.restore();
  };
})();
// the people, painted (art/ui npc_*): two poses each, breathing between them; they turn toward the hero
(() => {
  Art.npcPic = function (n, t) {
    if (typeof UiArt === 'undefined') return null;
    const kind = n.type === 'trader' && n.shop && UiArt.has('npc_trader_' + n.shop) ? 'trader_' + n.shop : n.type;
    const pose = Math.sin(t * 1.4 + (n.px || 0) * 0.01) > 0.55 ? '_b' : '_a';
    const name = UiArt.has('npc_' + kind + pose) ? 'npc_' + kind + pose : UiArt.has('npc_' + kind) ? 'npc_' + kind : UiArt.has('npc_' + kind + '_a') ? 'npc_' + kind + '_a' : null;
    return name;
  };
  let installed = false;
  const install = () => { if (installed) return; installed = true;            // after art_npcs.js, which sets its own drawing
  const old = Art.drawNPC;
  Art.drawNPC = function (g, n, t) {
    const pic = Art.npcPic(n, t); if (!pic) return old(g, n, t);
    const P0 = typeof DW !== 'undefined' && DW.P, face = P0 && P0.cx < n.px ? -1 : 1, h = n.type === 'merchant' ? 92 : 104;
    const breathe = 1 + 0.012 * Math.sin(t * 2.2 + n.px);
    g.save(); g.translate(n.px, n.py); g.scale(face, breathe); UiArt.draw(g, pic, 0, -h / 2, h); g.restore();
  };
  };
  window.addEventListener('load', install); setTimeout(install, 0);
})();
// living rooms: painted moths, butterflies, fireflies, bats and spores flutter about, beetles and rats scurry along the floors
// (and run from the hero), grass, ferns, reeds and vines sway; which live where depends on the area
const Life = (() => {
  const T = TILE, AIR = { town: ['fly', 'fly', 'glow'], cave: ['glow', 'bat'], moss: ['fly', 'glow', 'glow'], spore: ['spore', 'spore', 'glow'],
    aqueduct: ['glow', 'moth'], webbed: ['moth', 'moth'], foundry: ['bat'], throne: ['moth', 'bat'], frost: ['bat'], ember: ['spore'],
    storm: ['bat'], mirror: ['moth', 'glow'], bone: ['bat', 'moth'], lunar: ['moth', 'glow'], crystal: ['glow', 'bat'] };
  const GROUND = { frost: 'rat', storm: 'beetle', lunar: 'beetle', mirror: 'beetle', ember: 'beetle', town: 'beetle', cave: 'rat', moss: 'beetle', spore: 'beetle', aqueduct: 'rat', webbed: 'beetle', foundry: 'rat', throne: 'rat', bone: 'rat', crystal: 'beetle' };
  const PLANT = { town: ['grass', 'fern', 'grass'], moss: ['fern', 'grass', 'vine', 'fern'], spore: ['fern', 'grass'], aqueduct: ['reed', 'grass', 'reed'], cave: ['grass', 'fern'], webbed: ['vine', 'grass'], crystal: ['grass', 'fern'], throne: ['vine'], bone: ['grass'], lunar: ['grass', 'fern'], foundry: ['grass'], mirror: ['vine'], storm: ['grass', 'reed'], frost: ['reed'], ember: ['grass'] };
  const FRAMES = { moth: 4, fly: 4, beetle: 4, rat: 4, glow: 2, fish: 2, bat: 2, spore: 2, grass: 2, fern: 2, reed: 2, vine: 2 };
  let room = null, folk = [], plants = [], last = 0;
  const ok = n => typeof UiArt !== 'undefined' && UiArt.has(n);
  function setup(L) {
    room = L; folk = []; plants = [];
    const th = L.def && L.def.theme, air = AIR[th] || ['glow'], gr = GROUND[th], pl = PLANT[th] || [];
    const S = (x, y) => L.get(x, y) === T_SOLID, A = (x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h && L.get(x, y) === T_AIR;
    const floors = [];
    for (let y = 2; y < L.h - 1; y++) for (let x = 1; x < L.w - 1; x++) if (S(x, y + 1) && A(x, y) && A(x, y - 1)) floors.push([x, y]);
    const pick = (a, i) => a[Math.floor(hash2(i, L.w, 17) * a.length) % a.length];
    const nAir = Math.min(34, 8 + Math.floor(L.w * L.h / 110));
    for (let i = 0; i < nAir && floors.length; i++) { const f = pick(floors, i * 3 + 1); folk.push({ k: pick(air, i), x: f[0] * T, y: (f[1] - 2 - hash2(i, 3, 5) * 3) * T, vx: 0, vy: 0, ph: i * 1.7, air: true }); }
    if (gr) for (let i = 0; i < Math.min(14, 2 + Math.floor(floors.length / 18)); i++) { const f = pick(floors, i * 7 + 5); folk.push({ k: gr, x: f[0] * T + 16, y: (f[1] + 1) * T, vx: (hash2(i, 9, 2) < 0.5 ? -1 : 1) * 22, ph: i, air: false }); }
    if (pl.length) for (const [x, y] of floors) if (hash2(x, y, 33) < 0.42) plants.push({ k: pick(pl, x + y), x: x * T + 16, y: (y + 1) * T + 2, ph: hash2(x, y, 4) * 6, s: 0.8 + hash2(x, y, 8) * 0.6 });
  }
  function frame(k, t, rate) { const n = FRAMES[k] || 2; return 'lf_' + k + '_' + (Math.floor(t * rate) % n); }
  function draw(g, t) {
    const L = typeof G !== 'undefined' && G.level; if (!L || !ok('lf_moth_0')) return;
    if (L !== room) setup(L);
    const dt = Math.min(0.05, Math.max(0, t - last)); last = t;
    const px = P.cx, py = P.cy;
    // the plants first, swaying in the air of the room
    for (const p of plants) {
      const sw = Math.sin(t * 1.6 + p.ph) * 0.08 + (Math.abs(px - p.x) < 28 && Math.abs(py - p.y) < 50 ? Math.sign(p.x - px) * 0.25 : 0);
      g.save(); g.translate(p.x, p.y); g.transform(1, 0, sw, 1, 0, 0);
      UiArt.draw(g, frame(p.k, t + p.ph, 1.2), 0, -19 * p.s, 40 * p.s); g.restore();
    }
    for (const c of folk) {
      if (c.air) {                                                    // wander, drift away from the hero
        const ax = Math.sin(t * 0.7 + c.ph) * 30 + (Math.abs(c.x - px) < 90 && Math.abs(c.y - py) < 90 ? Math.sign(c.x - px) * 120 : 0), ay = Math.cos(t * 0.9 + c.ph * 1.3) * 22;
        c.vx += (ax - c.vx) * dt * 2; c.vy += (ay - c.vy) * dt * 2; c.x += c.vx * dt; c.y += c.vy * dt;
        if (!(L.get(Math.floor(c.x / T), Math.floor(c.y / T)) === T_AIR)) { c.vx = -c.vx; c.vy = -c.vy; c.x += c.vx * dt * 3; c.y += c.vy * dt * 3; }
        const h = c.k === 'bat' ? 28 : c.k === 'glow' || c.k === 'spore' ? 14 : 22;
        if (c.k === 'glow' || c.k === 'spore') bloom(g, c.x, c.y, 18, c.k === 'glow' ? '#7dffd8' : '#ffb070', 0.35 + 0.2 * Math.sin(t * 4 + c.ph));
        g.save(); g.translate(c.x, c.y); if (c.vx < 0) g.scale(-1, 1); UiArt.draw(g, frame(c.k, t + c.ph, c.k === 'bat' ? 9 : 12), 0, 0, h); g.restore();
      } else {                                                        // scurry along the floor, turn at its ends, run from the hero
        const near = Math.abs(c.x - px) < 110 && Math.abs(c.y - py) < 60, sp = near ? 80 : 22;
        if (near) c.vx = Math.sign(c.x - px || 1) * sp; else c.vx = Math.sign(c.vx || 1) * sp;
        const nx = c.x + c.vx * dt, tx = Math.floor((nx + Math.sign(c.vx) * 8) / T), ty = Math.floor((c.y - 4) / T);
        if (L.get(tx, ty) !== T_AIR || L.get(tx, ty + 1) !== T_SOLID) c.vx = -c.vx; else c.x = nx;
        g.save(); g.translate(c.x, c.y); if (c.vx < 0) g.scale(-1, 1); UiArt.draw(g, frame(c.k, t * (Math.abs(c.vx) / 22) + c.ph, 8), 0, -8, c.k === 'rat' ? 18 : 14); g.restore();
      }
    }
  }
  // drawn in the world, in front of the rock and the machinery
  const old = Art.mechFront;
  Art.mechFront = function (g, t, th) { const r = old.apply(this, arguments); try { draw(g, t); } catch (e) { /* the scenery must never stop the game */ } return r; };
  return { draw };
})();
// the creatures far behind (jellyfish, lumaflies, bubbles), painted: the jellyfish is the painted jelly, small and pale with
// distance; the lights are the painted fireflies and spores; the bubbles the painted droplets
(() => {
  if (typeof drawCritters !== 'function') return;
  const old = drawCritters;
  drawCritters = function (g, th, camX, camY, t) {
    if (!['moss', 'cave', 'aqueduct', 'spore'].includes(th.name) || typeof UiArt === 'undefined' || !UiArt.has('lf_glow_0')) return old(g, th, camX, camY, t);
    for (const c of th.critters) {
      const x = ((c.x - camX * c.par + Math.sin(t * 0.2 + c.p) * 40) % LAYER_PERIOD + LAYER_PERIOD) % LAYER_PERIOD - 200;
      if (x < -80 || x > VW + 80) continue;
      const y = c.y - camY * c.par * VERTICAL_PARALLAX + Math.sin(t * 0.6 + c.p) * 14;
      if (th.name === 'cave' || th.name === 'spore') {
        if (!c.jelly) continue;
        const n = th.name === 'spore' ? 'lf_spore_' : 'lf_glow_';
        bloom(g, x, y, 30, th.glow, 0.35 + 0.2 * Math.sin(t * 3 + c.p));
        UiArt.draw(g, n + (Math.floor(t * 3 + c.p) % 2), x, y, 12, { alpha: 0.85 });
      } else if (c.jelly) {
        g.save(); g.globalAlpha = 0.45 + 0.1 * Math.sin(t + c.p); g.filter = 'blur(0.6px) brightness(0.85)';
        bloom(g, x, y, c.r * 2.2, '#ffb070', 0.15);
        Art.drawCreature(g, 'jelly', false, x, y + c.r * 0.8, 0.35 + c.r / 60, 1, {});
        g.restore();
      } else {
        const tint = UiArt.tint('fx_drop', '#c8fff0'); if (!tint) continue;
        g.save(); g.globalAlpha = 0.35; const s = c.r * 1.1 + 4; g.drawImage(tint, x - s / 2, y - s / 2, s, s); g.restore();
      }
    }
  };
})();
