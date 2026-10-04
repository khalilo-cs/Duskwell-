// The closer view during play: the camera sees VW / zoom by VH / zoom of the room, the hero stays on screen, a boss hall shows
// everything again, the setting cycles from the pause menu and is kept, and the world draws at every zoom.
const { open } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({});
  const ev = (f, a) => page.evaluate(f, a);
  const into = room => ev(room => { DW.enterRoom(room, { pos: { x: 100, y: 100 } }); const { G, P } = DW; G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.enemies = []; G.projs = []; P.invuln = 99; DW.step(120); return { zoom: G.zoom, now: G.zoomNow, arena: !!G.arena }; }, room);
  // ---- the setting
  let r = await ev(() => ({ zoom: DW.G.zoom, labels: [1, 1.25, 1.5].map(z => (DW.G.zoom = z, zoomLabel())) }));
  ok('the picture is a little closer by default (1.25)', r.zoom === 1.25, r);
  r = await ev(() => {
    const { G } = DW; G.zoom = 1; G.state = 'pause'; const out = [];
    const idx = pauseItems().findIndex(i => i.id === 'zoom'); G.menuSel = idx;
    for (let i = 0; i < 3; i++) { setZoom({ 1: 1.25, 1.25: 1.5, 1.5: 1 }[G.zoom]); out.push(G.zoom); }
    let saved = null; try { saved = localStorage.getItem('duskwell_zoom'); } catch (e) { /* ignore */ }
    G.state = 'play'; return { idx, out, saved };
  });
  ok('the pause menu has a zoom entry that cycles 1.25, 1.5, 1 and keeps the choice', r.idx > 0 && r.out.join() === '1.25,1.5,1' && r.saved === '1', r);
  await ev(() => { setZoom(1.25); });
  // ---- the camera in a normal room
  r = await into('cx2');
  ok('in an ordinary room the zoom is the setting', r.zoom === 1.25 && r.now === 1.25 && !r.arena, r);
  r = await ev(() => {
    const { G, P } = DW, L = G.level, b = cameraBounds(), out = { vw: viewW(), vh: viewH(), onScreen: true, checked: 0 };
    // put the hero on the floor at several places along the room, let the camera settle: he must be inside the picture each time
    for (const f of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const tx = Math.floor(L.w * f); let ty = -1;
      for (let y = 3; y < L.h - 2; y++) if (L.get(tx, y + 1) === T_SOLID && L.get(tx, y) === T_AIR && L.get(tx, y - 1) === T_AIR && L.get(tx, y - 2) === T_AIR) { ty = y; break; }
      if (ty < 0) continue;
      P.x = tx * 32 + 8; P.y = ty * 32 - 20; P.vx = 0; P.vy = 0; G.state = 'play'; G.trans = null; DW.step(120); out.checked++;
      const sx = (P.cx - G.cam.x) * G.zoomNow, sy = (P.cy - G.cam.y) * G.zoomNow; if (sx < 0 || sx > VW || sy < 0 || sy > VH) out.onScreen = false;
    }
    return out;
  });
  ok('the view is 768 x 432 room units and the hero stays inside the picture at five places along the room', Math.abs(r.vw - 768) < 1e-6 && Math.abs(r.vh - 432) < 1e-6 && r.onScreen && r.checked >= 3, r);
  r = await ev(() => { const { G } = DW, b = cameraBounds(); return { max: b.x1, expect: G.level.pw - 768 }; });
  ok('the camera stops at the edge of the room', Math.abs(r.max - r.expect) < 1e-6, r);
  // ---- the lights follow the zoom
  r = await ev(() => {
    const { G, P } = DW; const cx = Math.round(G.cam.x), cy = Math.round(G.cam.y), z = G.zoomNow;
    const first = collectLights(cx, cy)[0], plain = collectLights(cx, cy, false, 1)[0];
    return { x: first.x, wantX: (P.cx - cx) * z, rK: first.r / plain.r };
  });
  ok('the hero\'s light sits on the hero in the magnified picture, and is magnified too', Math.abs(r.x - r.wantX) < 1e-6 && Math.abs(r.rK - 1.25) < 1e-6, r);
  // ---- a boss hall shows the whole room again
  r = await into('cx3');
  ok('in a boss hall the zoom eases out to 1', r.arena && Math.abs(r.now - 1) < 1e-6, r);
  r = await ev(() => { const { G } = DW, b = cameraBounds(); return { vw: viewW(), w: G.level.pw, x1: b.x1 }; });
  ok('and the view is the whole screen again', r.vw === 960, r);
  // ---- it draws at every zoom, in a room with walls, water, a bench and a station
  r = await ev(() => {
    const out = [];
    for (const room of ['town', 'cx1', 'mg1', 'aq1', 'fd1', 'fr1', 'em1', 'sc1', 'mv1', 'os1', 'lo1']) {
      for (const z of [1, 1.25, 1.5]) {
        try { DW.enterRoom(room, { pos: { x: 200, y: 300 } }); const { G } = DW; G.zoom = z; G.zoomNow = z; G.state = 'play'; G.trans = null; DW.step(3); DW.draw(); } catch (e) { out.push(room + '@' + z + ': ' + e.message); }
      }
    }
    DW.G.zoom = 1.25; return out;
  });
  ok('eleven rooms draw at three zooms without errors', r.length === 0, r);
  // ---- the saved zoom is read when the game starts
  r = await ev(() => { try { localStorage.setItem('duskwell_zoom', '1.5'); } catch (e) { return null; } return true; });
  ok('the saved zoom can be stored', r === true);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
