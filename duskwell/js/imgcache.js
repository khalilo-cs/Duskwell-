'use strict';
// Small pieces instead of whole sheets. The game's pictures lie on big sheets, and a phone must hand a whole sheet to its
// graphics chip to draw one small piece of it; a frame touches more sheets than the chip's store holds, so they are handed over
// again and again: that is the stutter. Here every piece that is drawn in two different frames is cut out once (the sheet is
// unpacked away from the game's thread) and kept as a small picture of its own, and drawn from that from then on. Nothing about
// the picture changes. Pieces not drawn for a while are let go past a budget and cut again when needed.
(() => {
  const C = typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype;
  if (!C || typeof createImageBitmap !== 'function' || typeof fetch !== 'function' || location.protocol === 'file:') return;
  const draw = C.drawImage, PIECES = 110e6, MAX_PIECE = 1.2e6;
  const sheets = new WeakMap(), all = new Set();
  let frame = 0, bytes = 0, loading = 0, passed = 0, passedShow = 0; const queue = [];
  function sheetOf(im) {
    const A = { im, pieces: new Map(), full: null, state: 0, wait: [], used: 0 };       // state: 0 none, 1 unpacking, 2 unpacked, -1 cannot
    sheets.set(im, A); all.add(A);
    im.addEventListener('load', () => { for (const p of A.pieces.values()) if (p.b) { p.b.close(); bytes -= p.n; } A.pieces.clear(); if (A.full) A.full.close(); A.full = null; A.state = 0; A.wait = []; });
    return A;
  }
  function next() { while (loading < 2 && queue.length) load(queue.shift()); }
  function load(A) {
    loading++;
    fetch(A.im.currentSrc || A.im.src).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => createImageBitmap(b))
      .then(f => { loading--; A.full = f; A.state = 2; cut(A); next(); }, () => { loading--; A.state = -1; A.wait = []; next(); });
  }
  function cut(A) {
    const list = A.wait; A.wait = []; A.used = frame;
    for (const p of list) createImageBitmap(A.full, p.x, p.y, p.w, p.h).then(b => { p.b = b; p.n = p.w * p.h * 4; bytes += p.n; }, () => { p.bad = true; });
  }
  C.drawImage = function (im, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (arguments.length < 9 || !(im instanceof HTMLImageElement) || !(sw > 0) || !(sh > 0)) return draw.apply(this, arguments);
    const W = im.naturalWidth, H = im.naturalHeight, x = Math.floor(sx), y = Math.floor(sy), w = Math.ceil(sx + sw) - x, h = Math.ceil(sy + sh) - y;
    if (!W || x < 0 || y < 0 || x + w > W || y + h > H || w * h > MAX_PIECE || w * h * 2 > W * H) return draw.apply(this, arguments);
    const A = sheets.get(im) || sheetOf(im);
    if (A.state < 0) return draw.apply(this, arguments);
    const key = ((x * 8192 + y) * 8192 + w) * 8192 + h;
    let p = A.pieces.get(key);
    if (p && p.b) { p.used = frame; return draw.call(this, p.b, sx - x, sy - y, sw, sh, dx, dy, dw, dh); }
    if (!p) A.pieces.set(key, p = { b: null, seen: frame, asked: false, used: frame, x, y, w, h, n: 0 });
    else if (!p.asked && !p.bad && p.seen !== frame) {
      p.asked = true; A.wait.push(p);
      if (A.state === 2) cut(A); else if (A.state === 0) { A.state = 1; queue.push(A); next(); }
    }
    passed++;
    if (A.full) { A.used = frame; return draw.call(this, A.full, sx, sy, sw, sh, dx, dy, dw, dh); }
    return draw.apply(this, arguments);
  };
  const tick = () => {
    requestAnimationFrame(tick); frame++; passedShow = passed; passed = 0;
    if (frame % 30) return;
    for (const A of all) {
      if (A.full && !A.wait.length && frame - A.used > 240) { A.full.close(); A.full = null; A.state = 0; }   // the unpacked sheet is let go when no piece has been asked of it for a while
      if (frame % 600 === 0) for (const [k, p] of A.pieces) if (!p.b && !p.asked && frame - p.seen > 600) A.pieces.delete(k);
    }
    if (bytes > PIECES) {
      const old = []; for (const A of all) for (const [k, p] of A.pieces) if (p.b && frame - p.used > 300) old.push([p.used, A, k, p]);
      old.sort((a, b) => a[0] - b[0]);
      for (const [, A, k, p] of old) { if (bytes < PIECES * 0.8) break; p.b.close(); bytes -= p.n; A.pieces.delete(k); }
    }
  };
  requestAnimationFrame(tick);
  window.ImgCache = { stats: () => { let n = 0; for (const A of all) for (const p of A.pieces.values()) if (p.b) n++; return { kept: n, mb: Math.round(bytes / 1e6), waiting: passedShow }; } };
})();
