'use strict';
// Filters made once. A canvas filter (brightness, hue, saturation, a light blur...) is worked out again on every drawImage, and on
// phones that is slow: the Elder's robes, the basalt creatures of Cinderdeep, the dim set pieces and the soul vessel were all
// filtered anew every frame or every time a room was laid. Here, when a picture (never a canvas, which may change) is drawn
// with a filter, the filtered piece is made once, kept, and drawn plainly from then on; it looks the same. A piece drawn much
// smaller than it is painted is kept at a half, a quarter... of its size. The kept pieces are forgotten oldest first past a budget.
(() => {
  const C = typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype;
  if (!C || !('filter' in C)) return;
  const draw = C.drawImage, BUDGET = 9e6;                // pixels kept at most
  const kept = new Map(); let used = 0;
  const ids = new WeakMap(); let nextId = 1;
  const idOf = im => { let v = ids.get(im); if (!v) { v = nextId++; ids.set(im, v); } return v; };
  function baked(im, sx, sy, sw, sh, filter, lvl) {
    const key = idOf(im) + '|' + sx + ',' + sy + ',' + sw + ',' + sh + '|' + filter + '|' + lvl;
    let e = kept.get(key);
    if (e) { kept.delete(key); kept.set(key, e); return e; }            // most recently used last
    const m = /blur\(([\d.]+)px\)/.exec(filter), k = 1 / lvl, pad = m ? Math.ceil(parseFloat(m[1]) * 2 * k) + 1 : 0;
    const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
    const c = document.createElement('canvas'); c.width = w + 2 * pad; c.height = h + 2 * pad;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.filter = m ? filter.replace(/blur\(([\d.]+)px\)/, (s, v) => 'blur(' + (parseFloat(v) * k) + 'px)') : filter;
    draw.call(g, im, sx, sy, sw, sh, pad, pad, w, h);
    e = { c, pad, k }; kept.set(key, e); used += c.width * c.height;
    for (const [k2, v] of kept) { if (used <= BUDGET) break; kept.delete(k2); used -= v.c.width * v.c.height; }
    return e;
  }
  C.drawImage = function (im) {
    const f = this.filter;
    if (!f || f === 'none' || !(im instanceof HTMLImageElement) || !im.complete || !im.naturalWidth || /url\(|drop-shadow/.test(f)) return draw.apply(this, arguments);
    let sx = 0, sy = 0, sw = im.naturalWidth, sh = im.naturalHeight, dx, dy, dw, dh;
    const n = arguments.length;
    if (n >= 9) { sx = arguments[1]; sy = arguments[2]; sw = arguments[3]; sh = arguments[4]; dx = arguments[5]; dy = arguments[6]; dw = arguments[7]; dh = arguments[8]; }
    else if (n >= 5) { dx = arguments[1]; dy = arguments[2]; dw = arguments[3]; dh = arguments[4]; }
    else { dx = arguments[1]; dy = arguments[2]; dw = sw; dh = sh; }
    if (!(sw > 0 && sh > 0)) return draw.apply(this, arguments);
    // how much smaller it is drawn than painted (with the transform), in halvings: 1, 2, 4
    const t = this.getTransform(), sc = Math.hypot(t.a, t.b) * Math.abs(dw) / sw;
    const lvl = sc < 0.3 ? 4 : sc < 0.6 ? 2 : 1;
    const e = baked(im, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), f, lvl);
    const px = dw / sw * e.pad / e.k, py = dh / sh * e.pad / e.k;
    this.filter = 'none';
    try { draw.call(this, e.c, 0, 0, e.c.width, e.c.height, dx - px, dy - py, dw + 2 * px, dh + 2 * py); }
    finally { this.filter = f; }
  };
})();
