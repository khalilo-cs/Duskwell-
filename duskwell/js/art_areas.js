'use strict';
// What was cut from the concept sheets besides the backdrop layers (tools/paint/import_layers.py): the picture of every area
// (behind the map, in the ending), its Sky strip (behind the name when you arrive), the four colours of its palette (the
// accent of its banner and its map outline, a tint in its fog) and the silhouettes of its props, set on the floors of its rooms.
const AreaArt = (() => {
  // the theme that paints each area
  const THEME_OF = { hushvale: 'town', crossroads: 'cave', mossgrove: 'moss', spore: 'spore', aqueduct: 'aqueduct', crystal: 'crystal', webbed: 'webbed', rustworks: 'foundry',
    throne: 'throne', frost: 'frost', ember: 'ember', stormcrest: 'storm', mirror: 'mirror', ossuary: 'bone', lunar: 'lunar' };
  const imgs = new Map();
  const load = name => {
    if (!imgs.has(name)) { const im = new Image(); im.src = 'art/areas/' + name + '.webp'; imgs.set(name, im); }
    return imgs.get(name);
  };
  const ok = im => !!im && im.complete && im.naturalWidth > 0;
  // the picture or the strip of a theme once it has loaded, else null
  const picture = theme => { const im = load(theme); return ok(im) ? im : null; };
  const strip = theme => { const im = load(theme + '_strip'); return ok(im) ? im : null; };
  // draw an image so that it covers the box (like CSS cover), at an alpha
  function cover(g, im, x, y, w, h, alpha) {
    const k = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / k, sh = h / k;
    g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h); g.restore();
  }
  // the palette of a theme: [light, accent, dark, deep], hex strings
  const palette = theme => (typeof AREA_PALETTE !== 'undefined' && AREA_PALETTE[theme]) || null;
  // the accent colour of an area, from its palette
  const accent = area => { const p = palette(THEME_OF[area]); return p ? p[1] : null; };

  // ---------------------------------------------------------------- props on the floors
  const atlas = new Image();
  atlas.onload = () => { if (typeof G !== 'undefined') G.tileCanvas = null; };         // lay the rooms again, now with the props
  atlas.src = 'art/props/props.webp';
  const propsReady = () => typeof PROP_RECTS !== 'undefined' && atlas.complete && atlas.naturalWidth > 0;
  const stats = { renders: 0, placed: 0, theme: '' };
  // props of the room's area standing on the floors, clear of doors, benches, pickups and each other
  function scenery(g, L, th, isS, seed) {
    if (!propsReady()) return;
    const rects = PROP_RECTS[L.def.theme]; if (!rects || !rects.length) return;
    stats.renders++; stats.placed = 0; stats.theme = L.def.theme;
    const T = TILE, def = L.def, keep = [], used = [];
    for (const d of def.doors || []) keep.push([d.x - 3, d.y - 2, d.w + 6, d.h + 4]);
    for (const q of [].concat(def.benches || [], def.stations || [], def.signs || [], def.npcs || [], def.items || [], def.mech || [])) keep.push([q.x - 3, q.y - 5, 7, 7]);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const want = Math.max(1, Math.floor(L.w / 9));          // about one prop in nine tiles of width; a second and third look if the first finds too few places
    for (const thr of [0.11, 0.3, 0.7]) for (let y = 3; y < L.h - 1 && stats.placed < want; y++) for (let x = 3; x < L.w - 3 && stats.placed < want; x++) {
      if (L.get(x, y) !== T_SOLID || isS(x, y - 1) || hash2(x, y, seed + 300) > thr) continue;
      const r = rects[Math.floor(hash2(x, y, seed + 301) * rects.length)];
      let s = 0.58; while (r[3] * s > 150 || r[2] * s > 190) s *= 0.9;
      const w = r[2] * s, h = r[3] * s, fw = Math.ceil(w / T), x0 = x - Math.floor(fw / 2), free = Math.ceil(Math.min(h, 100) / T) + 1;
      let fits = x0 >= 1 && x0 + fw < L.w - 1;
      for (let i = 0; fits && i < fw; i++) {
        if (L.get(x0 + i, y) !== T_SOLID || isS(x0 + i, y - 1)) fits = false;
        for (let j = 1; fits && j <= free; j++) if (L.get(x0 + i, y - j) !== T_AIR) fits = false;
      }
      if (fits && keep.some(k => x0 < k[0] + k[2] && x0 + fw > k[0] && y > k[1] && y - free < k[1] + k[3])) fits = false;
      if (fits && used.some(u => x0 < u[1] + 1 && x0 + fw > u[0] - 1 && Math.abs(y - u[2]) < 3)) fits = false;
      if (!fits) continue;
      used.push([x0, x0 + fw, y]); stats.placed++;
      const flip = hash2(x, y, seed + 302) < 0.5, cx = (x0 + fw / 2) * T, by = y * T + 3;
      g.save(); g.translate(cx, by);
      if (flip) g.scale(-1, 1);
      g.filter = 'brightness(0.6) saturate(0.95)'; g.globalAlpha = 0.9;
      g.drawImage(atlas, r[0], r[1], r[2], r[3], -w / 2, -h, w, h);
      g.restore();
    }
    g.restore();
  }
  // the tile hooks lay the props after the rock: wrap the hooks that have scenery of their own
  const seen = new Set();
  for (const k of Object.keys(Art.tileHooks)) {
    const h = Art.tileHooks[k]; if (seen.has(h)) continue; seen.add(h);
    const old = h.scenery;
    h.scenery = old ? (g, L, th, isS, seed) => { old(g, L, th, isS, seed); scenery(g, L, th, isS, seed); } : scenery;
  }

  // ---------------------------------------------------------------- the palettes tint the fog and the banners
  for (const area of Object.keys(THEME_OF)) {
    const th = THEMES[THEME_OF[area]], p = palette(THEME_OF[area]);
    if (th && p) { th.pal = p; th.fog = mix(th.fog, p[1], 0.22); }
  }
  // the accent of an area's banner and map outline comes from its palette, kept light enough to read on the dark
  function applyColors(colors) {
    for (const area of Object.keys(THEME_OF)) {
      const a = accent(area); if (!a) continue;
      const c = hexToRgb(a), lum = c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1;
      colors[area] = lum < 120 ? mix(a, '#ffffff', 0.45) : a;
    }
  }

  return { applyColors, THEME_OF, picture, strip, cover, palette, accent, scenery, stats, propsReady, preload: () => { for (const t of Object.values(THEME_OF)) { load(t); load(t + '_strip'); } load('townb'); } };
})();
