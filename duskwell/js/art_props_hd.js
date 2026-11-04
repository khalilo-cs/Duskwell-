'use strict';
// Painted props in place of the old shapes drawn in code: the village houses, street lamps and well, the stone pillars of the
// crossroads and of the palace, and the cogs and chimneys of the foundry (art/props_hd/<name>.webp, cut by tools/paint/floors.py,
// listed in PROPS_HD). An object whose picture has not loaded (or does not exist) is drawn as before.
(() => {
  const list = typeof PROPS_HD !== 'undefined' ? PROPS_HD : {};
  const imgs = {};
  for (const n of Object.keys(list)) { const im = new Image(); im.src = 'art/props_hd/' + n + '.webp'; imgs[n] = im; }
  const ok = n => !!imgs[n] && imgs[n].complete && imgs[n].naturalWidth > 0;
  // draw picture n with its bottom centre at (cx, by), h px tall (or w px wide when h is null)
  function put(g, n, cx, by, w, h, alpha) {
    const im = imgs[n], k = h != null ? h / im.naturalHeight : w / im.naturalWidth, dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    g.save(); if (alpha != null) g.globalAlpha *= alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(im, cx - dw / 2, by - dh, dw, dh); g.restore();
    return [dw, dh];
  }
  const oldDecor = Art.drawDecor;
  Art.drawDecor = function (g, d, t, th) {
    const px = d.x * TILE, py = d.y * TILE + TILE;
    if (d.type === 'house') {
      const n = Math.floor(d.x) % 2 === 0 ? 'prop_house_a' : 'prop_house_b', alt = n === 'prop_house_a' ? 'prop_house_b' : 'prop_house_a';
      const use = ok(n) ? n : ok(alt) ? alt : null;
      if (use) {
        const w = d.w * TILE;
        put(g, use, px + w / 2, py + 2, w + 30, null);
        if (Math.floor(d.x) % 2 === 0) bloom(g, px + w / 2, py - d.h * TILE * 0.55, 80, '#ffb050', 0.12);
        return;
      }
    } else if (d.type === 'lamp' && ok('prop_lamp')) {
      const fl = 0.85 + 0.15 * Math.sin(t * 7 + d.x);
      const [w, h] = put(g, 'prop_lamp', px + 16, py + 2, null, 128);
      bloom(g, px + 16 + 0.22 * w, py + 2 - 0.76 * h, 120 * fl, th.glow, 0.34);            // the lantern hangs from the hook on the right
      return;
    } else if (d.type === 'well' && ok('prop_well')) {
      const w = d.w * TILE;
      put(g, 'prop_well', px + w / 2, py + 4, w + 64, null);
      const gr = g.createLinearGradient(0, py, 0, py + 140); gr.addColorStop(0, 'rgba(140,200,255,0.25)'); gr.addColorStop(1, 'rgba(140,200,255,0)');
      g.fillStyle = gr; g.fillRect(px, py, w, 140);
      return;
    } else if (d.type === 'pillar') {
      const n = th && th.name === 'throne' ? 'prop_pillar_throne' : 'prop_pillar_cave';
      if (ok(n)) { put(g, n, px + 16, py + 4, null, d.h * TILE + 8, 0.92); return; }
    }
    oldDecor(g, d, t, th);
  };
  const oldGear = Art.drawGear;
  Art.drawGear = function (g, d, t, th) {
    if (!ok('prop_gear')) return oldGear(g, d, t, th);
    const x = d.x * TILE + 16, y = d.y * TILE + 16, r = (d.r || 3) * TILE + 12, dir = d.dir || 1, im = imgs.prop_gear;
    g.save(); g.translate(x, y); g.rotate(t * 0.25 * dir * (90 / r)); g.globalAlpha *= d.a || 0.75;
    g.imageSmoothingEnabled = true; g.drawImage(im, -r, -r, 2 * r, 2 * r);
    g.restore();
  };
  const oldChimney = Art.drawChimney;
  Art.drawChimney = function (g, d, t, th) {
    if (!ok('prop_chimney')) return oldChimney(g, d, t, th);
    const x = d.x * TILE, base = d.y * TILE + TILE, h = (d.h || 8) * TILE;
    const [w] = put(g, 'prop_chimney', x + 23, base + 4, null, h + 8, 0.95);
    const k = 0.6 + 0.4 * Math.sin(t * 2 + d.x);
    bloom(g, x + 23, base - h + 10, 60 * k + w * 0.2, th.glow, 0.2);
  };
  Art.propsHd = { ok, names: Object.keys(list) };
})();
