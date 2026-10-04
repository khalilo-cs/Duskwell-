'use strict';
// Floors for every area except the crystal one, painted in code. Each area has its own seamless rock
// texture, a top edge (moss, snow, crust ...), a fringe under overhangs, side edges and ledges for the
// one-way plates. Hooked in through Art.tileHooks like art_tiles.js.
const FloorTiles = (() => {
  const T = TILE, S = 128;                       // S: size of one texture, two tiles wide
  const INK = '#030508';
  // look of each area: rock colours (light, dark), highlight, texture, top edge, fringe, ledge
  const STYLE = {
    town:     { rock: ['#4d2e1e', '#27150f'], hi: '#f0a060', tex: 'cobble',   cap: 'litter', fringe: 'roots',  ledge: 'wood' },
    cave:     { rock: ['#2c3d54', '#111b2a'], hi: '#8fb4de', tex: 'strata',   cap: 'wet',    fringe: 'drip',   ledge: 'stone' },
    moss:     { rock: ['#24523f', '#0b241e'], hi: '#7fe8b8', tex: 'mossy',    cap: 'moss',   fringe: 'vines',  ledge: 'wood' },
    spore:    { rock: ['#573417', '#251409'], hi: '#ffb870', tex: 'earth',    cap: 'spore',  fringe: 'roots',  ledge: 'wood' },
    aqueduct: { rock: ['#1f5260', '#0a232a'], hi: '#8fe0ff', tex: 'bricks',   cap: 'algae',  fringe: 'drip',   ledge: 'stone' },
    webbed:   { rock: ['#3f3252', '#150f20'], hi: '#b8a8d8', tex: 'bark',     cap: 'web',    fringe: 'web',    ledge: 'wood' },
    foundry:  { rock: ['#63392a', '#27130d'], hi: '#ffb27a', tex: 'plates',   cap: 'steel',  fringe: 'hot',    ledge: 'iron' },
    throne:   { rock: ['#2b3249', '#0d111d'], hi: '#c6d6f4', tex: 'marble',   cap: 'gold',   fringe: 'none',   ledge: 'stone' },
    frost:    { rock: ['#4a6f92', '#1b3147'], hi: '#e6f8ff', tex: 'ice',      cap: 'snow',   fringe: 'icicle', ledge: 'ice' },
    ember:    { rock: ['#3e262a', '#150b0d'], hi: '#ff7a3a', tex: 'lava',     cap: 'crust',  fringe: 'hot',    ledge: 'iron' },
    storm:    { rock: ['#33415f', '#101626'], hi: '#c4d4ff', tex: 'slate',    cap: 'wet',    fringe: 'drip',   ledge: 'stone' },
    mirror:   { rock: ['#2f2646', '#0b0713'], hi: '#ece4ff', tex: 'glass',    cap: 'bevel',  fringe: 'none',   ledge: 'glass' },
    bone:     { rock: ['#54452f', '#1b140e'], hi: '#f2e8d0', tex: 'bone',     cap: 'bones',  fringe: 'ribs',   ledge: 'bone' },
    lunar:    { rock: ['#3d4675', '#131936'], hi: '#dfe6ff', tex: 'regolith', cap: 'dust',   fringe: 'none',   ledge: 'glass' },
  };
  // what the last room laid (read by the tests)
  const stats = { renders: 0, tops: 0, fringes: 0, ledges: 0, theme: '' };

  // ---------------------------------------------------------------- small helpers
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // seeded random: rnd() in 0..1, rnd(a) in 0..a, rnd(a, b) in a..b
  const rng = seed => { const r = mulberry32(seed); return (a, b) => (b === undefined ? (a === undefined ? r() : r() * a) : a + r() * (b - a)); };
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const smooth = t => t * t * (3 - 2 * t);
  // a hex colour made lighter (k > 1) or darker (k < 1)
  const shade = (c, k) => { const a = hex(c); return 'rgb(' + clamp(a[0] * k | 0, 0, 255) + ',' + clamp(a[1] * k | 0, 0, 255) + ',' + clamp(a[2] * k | 0, 0, 255) + ')'; };
  // smooth noise over a w x h grid from lattices of the given cell sizes (px) and weights
  function field(w, h, cells, amps, seed) {
    const out = new Float32Array(w * h);
    cells.forEach((cell, o) => {
      const nx = Math.ceil(w / cell) + 2, ny = Math.ceil(h / cell) + 2, lat = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) lat[j * nx + i] = hash2(i, j, seed + o * 17);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = smooth(fx - ix), ty = smooth(fy - iy);
        const a = lat[iy * nx + ix], b = lat[iy * nx + ix + 1], c = lat[(iy + 1) * nx + ix], d = lat[(iy + 1) * nx + ix + 1], top = a + (b - a) * tx;
        out[y * w + x] += amps[o] * (top + ((c + (d - c) * tx) - top) * ty);
      }
    });
    return out;
  }
  // the colour of the rock over a whole room (a quarter of its size), so that the blocks of texture never show their joints
  function baseColour(L, st, seed) {
    const w = Math.ceil(L.pw / 4), h = Math.ceil(L.ph / 4), c = canvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h);
    const lo = hex(st.rock[1]), hi = hex(st.rock[0]), hl = hex(st.hi), n = field(w, h, [16, 8, 4], [0.55, 0.3, 0.15], seed);
    for (let i = 0; i < w * h; i++) {
      const v = n[i];
      let col = lerpC(lo, hi, smooth(clamp((v - 0.25) * 1.6, 0, 1)));
      if (v > 0.72) col = lerpC(col, hl, (v - 0.72) * 0.55);
      id.data[i * 4] = col[0]; id.data[i * 4 + 1] = col[1]; id.data[i * 4 + 2] = col[2]; id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  // draw a feature at its place and at the wrapped places, so the texture stays seamless
  function wrapped(g, x, y, r, fn) {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      if (x + dx + r < 0 || x + dx - r > S || y + dy + r < 0 || y + dy - r > S) continue;
      g.save(); g.translate(dx, dy); fn(); g.restore();
    }
  }
  // an irregular rounded shape around (x, y); k is how ragged it is
  function blob(g, x, y, rx, ry, rnd, k) {
    const n = 9, rot = rnd(0, 6.28); g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + i / n * 6.2832, r = 1 - (k === undefined ? 0.28 : k) * rnd();
      const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  // ---------------------------------------------------------------- the rock textures
  // stones set side by side with dark joints
  function stones(g, st, rnd, n, rmin, rmax) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) {
      const x = rnd(S), y = rnd(S), r = rnd(rmin, rmax);
      wrapped(g, x, y, r, () => {
        blob(g, x, y, r, r * 0.8, rnd); g.fillStyle = shade(st.rock[0], 0.8 + rnd(0.5)); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r * 0.78, 3.5, 4.9); g.stroke();
      });
    }
  }
  // jagged cracks
  function cracks(g, rnd, n, col, w) {
    g.strokeStyle = col; g.lineWidth = w || 1.4; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      let x = rnd(S), y = rnd(S), a = rnd(0, 6.28); const len = rnd(14, 36), pts = [[x, y]];
      for (let k = 0; k < 5; k++) { a += rnd(-0.8, 0.8); x += Math.cos(a) * len / 5; y += Math.sin(a) * len / 5; pts.push([x, y]); }
      wrapped(g, pts[0][0], pts[0][1], 40, () => { g.beginPath(); pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); });
    }
  }
  const specks = (g, rnd, n, col, size) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const s = rnd(size * 0.4, size); g.fillRect(rnd(S), rnd(S), s, s); } };

  const TEX = {
    // round cobbles
    cobble(g, st, rnd) { stones(g, st, rnd, 22, 9, 16); specks(g, rnd, 40, 'rgba(255,200,150,0.12)', 2); },
    // sediment bands with cracks
    strata(g, st, rnd) {
      for (let i = 0; i < 9; i++) {
        const y0 = i * S / 9 + rnd(-4, 4), th = rnd(5, 11), ph = rnd(0, 6.28), am = rnd(1.5, 4);
        g.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.2)'; g.beginPath();
        for (let x = 0; x <= S; x += 4) g.lineTo(x, y0 + Math.sin(x / S * 6.2832 * 2 + ph) * am);
        for (let x = S; x >= 0; x -= 4) g.lineTo(x, y0 + th + Math.sin(x / S * 6.2832 * 2 + ph) * am);
        g.fill();
      }
      cracks(g, rnd, 9, 'rgba(0,0,0,0.5)'); cracks(g, rnd, 4, 'rgba(160,200,255,0.18)', 1);
    },
    // cobbles under moss
    mossy(g, st, rnd) {
      stones(g, st, rnd, 18, 10, 17);
      for (let i = 0; i < 16; i++) {
        const x = rnd(S), y = rnd(S), r = rnd(6, 13);
        wrapped(g, x, y, r, () => { blob(g, x, y, r, r * 0.7, rnd, 0.4); g.fillStyle = 'rgba(70,170,110,' + rnd(0.3, 0.55) + ')'; g.fill(); g.fillStyle = 'rgba(170,255,200,0.2)'; g.fillRect(x - r * 0.4, y - r * 0.5, r * 0.5, 2); });
      }
    },
    // soil with small stones, roots and a few glowing grains
    earth(g, st, rnd) {
      specks(g, rnd, 90, 'rgba(0,0,0,0.3)', 4); specks(g, rnd, 60, 'rgba(255,190,120,0.16)', 3);
      for (let i = 0; i < 14; i++) { const x = rnd(S), y = rnd(S), r = rnd(3, 7); wrapped(g, x, y, r, () => { blob(g, x, y, r, r * 0.8, rnd); g.fillStyle = shade('#8a6a44', 0.6 + rnd(0.5)); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.stroke(); }); }
      g.strokeStyle = 'rgba(30,15,6,0.55)'; g.lineWidth = 2.4; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const x = rnd(S), y = rnd(S); wrapped(g, x, y, 40, () => { g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 14, y + 6, x + 10, y + 22, x + 26, y + 30); g.stroke(); }); }
      for (let i = 0; i < 5; i++) { const x = rnd(S), y = rnd(S); g.fillStyle = i % 2 ? 'rgba(255,150,70,0.8)' : 'rgba(120,230,210,0.7)'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
    },
    // masonry: three courses of three bricks
    bricks(g, st, rnd) {
      const bh = S / 6, bw = S / 3;
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, S, S);
      for (let r = 0; r < 6; r++) for (let c = -1; c < 4; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh, k = rnd();
        g.fillStyle = shade(st.rock[0], 0.75 + k * 0.5); g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 1.5, y + 1.5, bw - 3, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1.5, y + bh - 5, bw - 3, 3);
        if (k > 0.8) { g.fillStyle = 'rgba(60,170,150,0.28)'; g.fillRect(x + 4, y + 4, rnd(8, 22), bh - 9); }
      }
      cracks(g, rnd, 5, 'rgba(0,0,0,0.5)');
    },
    // wood grain
    bark(g, st, rnd) {
      for (let i = 0; i < 24; i++) {
        const x = rnd(S), amp = rnd(2, 6), ph = rnd(6.28), dark = i % 3 !== 0;
        g.strokeStyle = dark ? 'rgba(0,0,0,' + rnd(0.25, 0.5) + ')' : 'rgba(200,180,240,' + rnd(0.07, 0.14) + ')'; g.lineWidth = rnd(1.5, 4); g.beginPath();
        for (let y = 0; y <= S; y += 4) { const xx = x + Math.sin(y / S * 6.2832 + ph) * amp; if (y) g.lineTo(xx, y); else g.moveTo(xx, y); }
        g.stroke();
      }
      for (let i = 0; i < 4; i++) { const x = rnd(S), y = rnd(S); wrapped(g, x, y, 14, () => { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(x, y, 5, 9, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(200,180,240,0.25)'; g.lineWidth = 1.5; g.stroke(); }); }
    },
    // riveted iron plates, rusted at the seams
    plates(g, st, rnd) {
      const pw = S / 2, ph = S / 3;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        const x = c * pw, y = r * ph + (c ? ph / 2 : 0), k = rnd();
        for (const oy of [0, -S]) {
          g.fillStyle = shade(st.rock[0], 0.8 + k * 0.45); g.fillRect(x + 1, y + 1 + oy, pw - 2, ph - 2);
          g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 1, y + 1 + oy, pw - 2, 2.5);
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 1, y + ph - 4 + oy, pw - 2, 3);
          g.fillStyle = 'rgba(255,200,150,0.5)'; for (const [rx, ry] of [[6, 6], [pw - 7, 6], [6, ph - 8], [pw - 7, ph - 8]]) { g.beginPath(); g.arc(x + rx, y + ry + oy, 1.7, 0, 7); g.fill(); }
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.5)'; for (let c = 0; c < 2; c++) g.fillRect(c * pw - 1, 0, 2, S);
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(210,100,40,' + rnd(0.1, 0.22) + ')'; blob(g, rnd(S), rnd(S), rnd(5, 12), rnd(3, 8), rnd); g.fill(); }
    },
    // polished dark marble with silver and gold veins
    marble(g, st, rnd) {
      const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, 'rgba(255,255,255,0.1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 7; i++) {
        const x = rnd(S), y = rnd(S), gold = i % 4 === 0; g.strokeStyle = gold ? 'rgba(255,226,168,0.4)' : 'rgba(200,215,245,0.25)'; g.lineWidth = gold ? 1.2 : rnd(1, 2.4); g.lineCap = 'round';
        wrapped(g, x, y, 60, () => { g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + rnd(-30, 30), y + 20, x + rnd(-30, 30), y + 40, x + rnd(-20, 20), y + rnd(50, 70)); g.stroke(); });
      }
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.strokeRect(0, 0, S, S); g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke();
    },
    // frozen rock with pale facets and scratches
    ice(g, st, rnd) {
      for (let i = 0; i < 18; i++) {
        const x = rnd(S), y = rnd(S), r = rnd(8, 20), a = rnd(6.28);
        wrapped(g, x, y, r, () => { g.beginPath(); for (let k = 0; k < 3; k++) { const aa = a + k * 2.1 + rnd(-0.4, 0.4); g.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r); } g.closePath(); g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '210,240,255' : '20,50,90') + ',' + rnd(0.1, 0.22) + ')'; g.fill(); });
      }
      cracks(g, rnd, 10, 'rgba(235,250,255,0.35)', 1.2); cracks(g, rnd, 4, 'rgba(0,20,50,0.4)', 1.4);
      specks(g, rnd, 24, 'rgba(255,255,255,0.4)', 2);
    },
    // cooled basalt: dark slabs with thin glowing seams between them
    lava(g, st, rnd) {
      for (let i = 0; i < 15; i++) {
        const x = rnd(S), y = rnd(S), r = rnd(15, 24);
        wrapped(g, x, y, r, () => {
          blob(g, x, y, r, r * 0.85, rnd, 0.16); g.fillStyle = shade('#3a2428', 0.5 + rnd(0.6)); g.fill();
          g.shadowColor = '#ff5a14'; g.shadowBlur = 5; g.strokeStyle = 'rgba(255,110,40,0.55)'; g.lineWidth = 1.4; g.stroke(); g.shadowBlur = 0;
          g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x - r * 0.5, y - r * 0.55, r, 2.5);
        });
      }
      cracks(g, rnd, 7, 'rgba(0,0,0,0.45)');
      g.shadowColor = '#ff5a14'; g.shadowBlur = 6; cracks(g, rnd, 3, 'rgba(255,120,40,0.7)', 1.3); g.shadowBlur = 0;
    },
    // layered slabs of wet slate
    slate(g, st, rnd) {
      for (let i = 0; i < 7; i++) {
        const y = i * 18.3 + rnd(-2, 2), x = rnd(S), w = rnd(50, 90);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, S, 2.6);
        wrapped(g, x, y, w, () => { g.fillStyle = 'rgba(200,215,255,' + rnd(0.05, 0.12) + ')'; g.fillRect(x, y + 2.6, w, 5); });
      }
      g.strokeStyle = 'rgba(190,210,255,0.1)'; g.lineWidth = 1; for (let i = 0; i < 30; i++) { const x = rnd(S), y = rnd(S); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + rnd(10, 26)); g.stroke(); }
      cracks(g, rnd, 8, 'rgba(0,0,0,0.5)');
    },
    // obsidian: dark glass with long bright shards
    glass(g, st, rnd) {
      for (let i = 0; i < 22; i++) {
        const x = rnd(S), y = rnd(S), len = rnd(18, 48), a = rnd(-0.5, 0.5) + (i % 2 ? 1.2 : 0), w = rnd(3, 9);
        wrapped(g, x, y, len, () => {
          g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(len, -w / 2); g.lineTo(len * 0.8, w / 2); g.closePath();
          g.fillStyle = 'rgba(' + (i % 3 ? '170,150,230' : '236,228,255') + ',' + rnd(0.08, 0.24) + ')'; g.fill(); g.restore();
        });
      }
      cracks(g, rnd, 8, 'rgba(236,228,255,0.3)', 1); cracks(g, rnd, 5, 'rgba(0,0,0,0.5)');
    },
    // a wall of old bones
    bone(g, st, rnd) {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 11; i++) {
        const x = rnd(S), y = rnd(S), a = rnd(6.28), k = rnd(), col = shade('#e8dcc0', 0.6 + rnd(0.35));
        wrapped(g, x, y, 50, () => {
          g.save(); g.translate(x, y); g.rotate(a); g.lineCap = 'round';
          if (k < 0.5) {                                        // a long bone: shaft and two knobs
            const L = rnd(38, 58); g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
            g.strokeStyle = col; g.lineWidth = 7; g.stroke();
            for (const e of [-1, 1]) for (const o of [-4, 4]) { g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(e * L / 2, o, 5, 0, 7); g.fill(); g.stroke(); }
          } else if (k < 0.75) {                                // a rib
            g.strokeStyle = INK; g.lineWidth = 11; g.beginPath(); g.arc(0, 0, rnd(20, 32), 3.6, 5.8); g.stroke(); g.strokeStyle = col; g.lineWidth = 6; g.stroke();
          } else {                                              // a skull
            const r = rnd(13, 17); g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
            g.fillStyle = INK; g.beginPath(); g.arc(-r * 0.4, -1, r * 0.25, 0, 7); g.arc(r * 0.4, -1, r * 0.25, 0, 7); g.fill(); g.fillRect(-r * 0.4, r * 0.35, r * 0.8, 3);
          }
          g.restore();
        });
      }
      g.fillStyle = 'rgba(8,5,2,0.4)'; g.fillRect(0, 0, S, S);
    },
    // pale dust with craters
    regolith(g, st, rnd) {
      specks(g, rnd, 120, 'rgba(255,255,255,0.13)', 2); specks(g, rnd, 70, 'rgba(0,0,10,0.22)', 3);
      for (let i = 0; i < 9; i++) {
        const x = rnd(S), y = rnd(S), r = rnd(7, 18);
        wrapped(g, x, y, r, () => {
          g.fillStyle = 'rgba(5,8,30,0.35)'; g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, 7); g.fill();
          g.strokeStyle = 'rgba(235,240,255,0.32)'; g.lineWidth = 1.8; g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 3.5, 6.0); g.stroke();
          g.strokeStyle = 'rgba(0,0,15,0.4)'; g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0.3, 2.9); g.stroke();
        });
      }
      cracks(g, rnd, 4, 'rgba(0,0,20,0.35)', 1.2);
    },
  };

  // one texture: only the details of the area, on a transparent ground
  function makeTexture(name, variant) {
    const st = STYLE[name], c = canvas(S, S), seed = 1000 + variant * 97 + name.length * 13 + name.charCodeAt(0);
    TEX[st.tex](c.getContext('2d'), st, rng(seed + 5), variant);
    return c;
  }
  // textures of each area, three variants (made when first needed)
  const CACHE = {};
  const textures = name => CACHE[name] || (CACHE[name] = [0, 1, 2].map(v => makeTexture(name, v)));

  // ---------------------------------------------------------------- the rock of a room
  function solid(g, L, th, isS, seed) {
    const name = L.def.theme, st = STYLE[name], tex = textures(name);
    stats.renders++; stats.theme = name; stats.tops = stats.fringes = stats.ledges = 0;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const edge = hex(st.hi), base = baseColour(L, st, seed);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      g.drawImage(base, x * T / 4, y * T / 4, T / 4, T / 4, x * T - 0.25, y * T - 0.25, T + 0.5, T + 0.5);
      const bx = x >> 1, by = y >> 1, k = Math.min(2, Math.floor(hash2(bx, by, seed + 31) * 3)), fx = hash2(bx, by, seed + 57) < 0.5, fy = hash2(bx, by, seed + 58) < 0.5;
      const qx = (x & 1) ^ (fx ? 1 : 0), qy = (y & 1) ^ (fy ? 1 : 0), px = x * T, py = y * T;
      g.save(); g.translate(px + (fx ? T : 0), py + (fy ? T : 0)); g.scale(fx ? -1 : 1, fy ? -1 : 1);
      g.drawImage(tex[k], qx * S / 2, qy * S / 2, S / 2, S / 2, -0.25, -0.25, T + 0.5, T + 0.5);
      g.restore();
      let air = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!isS(x + i, y + j)) air++;
      const a = 0.4 * (1 - clamp(air / 10, 0, 1));                  // deep rock lies darker, the rock at an edge keeps its colour
      if (a > 0.01) { g.fillStyle = 'rgba(2,3,10,' + a.toFixed(3) + ')'; g.fillRect(px, py, T, T); }
    }
    // the sides and undersides: ink on the edge, a thin light line inside it
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID) continue;
      const px = x * T, py = y * T, eT = !isS(x, y - 1), eB = !isS(x, y + 1), eL = !isS(x - 1, y), eR = !isS(x + 1, y), y0 = py + (eT ? 6 : 0);
      for (const [on, ex, dir] of [[eL, px, 1], [eR, px + T, -1]]) {
        if (!on) continue;
        g.fillStyle = INK; g.fillRect(dir > 0 ? ex - 2.5 : ex - 1.5, y0, 4, py + T - y0);
        g.fillStyle = 'rgba(' + edge[0] + ',' + edge[1] + ',' + edge[2] + ',0.34)'; g.fillRect(dir > 0 ? ex + 1.5 : ex - 3.1, y0, 1.6, py + T - y0);
      }
      if (eB) { g.fillStyle = INK; g.fillRect(px, py + T - 2.5, T, 4); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px, py + T - 9, T, 6.5); }
    }
    // fringes under overhangs
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID || isS(x, y + 1)) continue;
      let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y + 1)) x1++;
      FRINGE[st.fringe](g, x * T, (x1 + 1) * T, (y + 1) * T, st, seed + x * 7 + y); stats.fringes++;
      x = x1;
    }
    // tops: the edge of every free-standing floor
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_SOLID || isS(x, y - 1)) continue;
      let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_SOLID && !isS(x1 + 1, y - 1)) x1++;
      CAP[st.cap](g, x * T, (x1 + 1) * T, y * T, st, seed + x * 11 + y * 3, th, !isS(x - 1, y), !isS(x1 + 1, y)); stats.tops++;
      x = x1;
    }
    // slippery ice keeps its glaze
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.get(x, y) === T_SOLID && L.isIce(x, y)) {
      g.fillStyle = 'rgba(190,235,255,0.4)'; g.fillRect(x * T, y * T, T, T);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x * T + 3, y * T + 4); g.lineTo(x * T + T - 8, y * T + 4); g.stroke();
    }
    return true;
  }

  // ---------------------------------------------------------------- tops
  // wavy lower edge along a run, `h` px deep
  function strip(g, x0, x1, y, h, col, seed, bump, capL, capR) {
    const r = rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(x0 - (capL ? 2 : 0), y - 1);
    g.lineTo(x1 + (capR ? 2 : 0), y - 1);
    for (let x = x1; x >= x0; x -= 6) g.lineTo(x, y + h + Math.sin(x * 0.45 + seed) * bump + r(-bump, bump) * 0.6);
    g.closePath(); g.fill();
  }
  // blades of grass or fuzz standing up from the edge
  const blades = (g, x0, x1, y, cols, hmin, hmax, step, seed, w) => {
    const r = rng(seed); g.lineCap = 'round';
    for (let x = x0 + 2; x < x1 - 1; x += step * r(0.6, 1.5)) {
      g.strokeStyle = cols[Math.floor(r() * cols.length)]; g.lineWidth = w || 2; const h = r(hmin, hmax), lean = r(-4, 4);
      g.beginPath(); g.moveTo(x, y + 1); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke();
    }
  };
  // each top: (g, x0, x1, y, style, seed, theme, endLeft, endRight)
  const CAP = {
    // earth with fallen leaves
    litter(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 8, '#5a3318', seed, 2.5, cl, cr); strip(g, x0, x1, y, 4, '#7a4524', seed + 1, 1.5, cl, cr);
      const r = rng(seed), cols = (th && th.leaf) || ['#e8742a', '#c9471e', '#f4a640', '#9e2f18'];
      for (let x = x0 + 3; x < x1; x += r(5, 10)) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.ellipse(x, y + r(-1, 3), r(3, 5.5), r(1.4, 2.6), r(-0.6, 0.6), 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(255,200,140,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y + 4.5); g.lineTo(x1, y + 4.5); g.stroke();
    },
    // damp stone: a light lip with wet sheen and puddles
    wet(g, x0, x1, y, st, seed, th, cl, cr) {
      const hi = hex(st.hi), c = hi[0] + ',' + hi[1] + ',' + hi[2]; strip(g, x0, x1, y, 5, 'rgba(' + c + ',0.22)', seed, 1.2, cl, cr);
      g.strokeStyle = 'rgba(' + c + ',0.75)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x0, y + 1); g.lineTo(x1, y + 1); g.stroke();
      const r = rng(seed); for (let x = x0 + 6; x < x1 - 6; x += 38 * r(0.8, 1.6)) { g.fillStyle = 'rgba(' + c + ',0.3)'; g.beginPath(); g.ellipse(x, y + 1, r(7, 14), 2.2, 0, Math.PI, 0); g.fill(); }
    },
    // moss cushions and grass
    moss(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 10, '#1f6e50', seed, 3, cl, cr); strip(g, x0, x1, y, 5, '#35a070', seed + 3, 2, cl, cr);
      const r = rng(seed);
      for (let x = x0 + 4; x < x1 - 2; x += r(9, 17)) { g.fillStyle = r() < 0.5 ? '#3fae78' : '#2a8a60'; g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y + 2, r(5, 9), Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(170,255,210,0.35)'; g.beginPath(); g.arc(x - 2, y, 3, Math.PI, 0); g.fill(); }
      blades(g, x0, x1, y, ['#3fae78', '#8ff0b8', '#2a8a60'], 6, 16, 7, seed + 9);
      if (r() < 0.2 + (x1 - x0) / 400) { const mx = x0 + r(6, x1 - x0 - 6); g.fillStyle = 'rgba(200,255,240,0.25)'; g.beginPath(); g.arc(mx, y - 8, 12, 0, 7); g.fill(); g.fillStyle = '#e6fff6'; g.beginPath(); g.arc(mx, y - 7, 3.5, Math.PI, 0); g.fill(); g.fillRect(mx - 0.8, y - 7, 1.6, 7); }
    },
    // mycelium fuzz with little caps
    spore(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 8, '#6a4220', seed, 2.5, cl, cr); strip(g, x0, x1, y, 4, '#9a6a34', seed + 1, 1.5, cl, cr);
      blades(g, x0, x1, y, ['#d8a040', '#eadfc4', '#c8742a'], 3, 8, 5, seed + 2, 1.6);
      const r = rng(seed + 7);
      for (let x = x0 + 6; x < x1 - 6; x += r(26, 60)) {
        const h = r(6, 16), rc = r(3.5, 7); g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x, y - h); g.stroke(); g.strokeStyle = '#eadfc4'; g.lineWidth = 1.6; g.stroke();
        g.fillStyle = r() < 0.4 ? '#ff8a4a' : '#d8a040'; g.strokeStyle = INK; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y - h, rc, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      }
    },
    // slime and algae on wet masonry
    algae(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 7, '#1d6a60', seed, 2.5, cl, cr); strip(g, x0, x1, y, 3.5, '#4fb0a0', seed + 1, 1.4, cl, cr);
      g.strokeStyle = 'rgba(210,250,255,0.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y + 0.5); g.lineTo(x1, y + 0.5); g.stroke();
      const r = rng(seed); for (let x = x0 + 5; x < x1 - 5; x += r(16, 34)) { g.fillStyle = 'rgba(60,170,150,0.7)'; g.beginPath(); g.ellipse(x, y + 8 + r(0, 5), 2, r(3, 7), 0, 0, 7); g.fill(); }
    },
    // a dark ledge hung with webs
    web(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 7, '#2a2038', seed, 2, cl, cr); strip(g, x0, x1, y, 3, '#4a3c60', seed + 1, 1.2, cl, cr);
      const r = rng(seed); g.strokeStyle = 'rgba(232,226,250,0.5)'; g.lineWidth = 1; g.lineCap = 'round';
      for (let x = x0; x < x1 - 8; x += r(18, 40)) { const w = r(14, 30); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - r(8, 18), x + w, y); g.stroke(); g.beginPath(); g.moveTo(x + w / 2, y - 4); g.lineTo(x + w / 2, y + 2); g.stroke(); }
    },
    // an iron plate edge with rivets
    steel(g, x0, x1, y, st, seed, th, cl, cr) {
      const xa = x0 - (cl ? 2 : 0), wd = x1 - x0 + (cl ? 2 : 0) + (cr ? 2 : 0);
      const gr = g.createLinearGradient(0, y - 2, 0, y + 9); gr.addColorStop(0, '#caa088'); gr.addColorStop(0.3, '#7a5240'); gr.addColorStop(1, '#3a2218');
      g.fillStyle = gr; g.fillRect(xa, y - 2, wd, 11); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(xa, y - 2, wd, 11);
      g.fillStyle = 'rgba(255,230,200,0.7)'; for (let x = x0 + 6; x < x1 - 3; x += 14) { g.beginPath(); g.arc(x, y + 4, 1.7, 0, 7); g.fill(); }
      const r = rng(seed);
      if (r() < 0.3 && x1 - x0 > 60) { const px = x0 + r(10, x1 - x0 - 30); g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, y - 6); g.lineTo(px + 26, y - 6); g.stroke(); g.strokeStyle = '#7a5240'; g.lineWidth = 5; g.stroke(); }
    },
    // marble edge with a gold inlay
    gold(g, x0, x1, y) {
      g.fillStyle = 'rgba(220,232,255,0.28)'; g.fillRect(x0, y, x1 - x0, 5);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x0, y, x1 - x0, 1.6);
      g.strokeStyle = 'rgba(255,226,168,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y + 8.5); g.lineTo(x1, y + 8.5); g.stroke();
      for (let x = x0 + 10; x < x1 - 10; x += 32) { g.fillStyle = 'rgba(255,226,168,0.8)'; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 3, y + 8.5); g.lineTo(x, y + 11); g.lineTo(x - 3, y + 8.5); g.closePath(); g.fill(); }
    },
    // heaped snow
    snow(g, x0, x1, y, st, seed, th, cl, cr) {
      const r = rng(seed), a = x0 - (cl ? 3 : 0), b = x1 + (cr ? 3 : 0);
      g.fillStyle = '#bcdcf0'; g.beginPath(); g.moveTo(a, y + 3); for (let x = x0; x <= x1; x += 4) g.lineTo(x, y - 6 + 7 * Math.sin(x * 0.2 + seed) + r(-1.5, 1.5)); g.lineTo(b, y + 3); for (let x = x1; x >= x0; x -= 6) g.lineTo(x, y + 12 + r(-2, 2)); g.closePath(); g.fill();
      g.fillStyle = '#f4fbff'; g.beginPath(); g.moveTo(a, y + 1); for (let x = x0; x <= x1; x += 4) g.lineTo(x, y - 7 + 7 * Math.sin(x * 0.2 + seed) + r(-1.5, 1.5)); g.lineTo(b, y + 1); for (let x = x1; x >= x0; x -= 6) g.lineTo(x, y + 8 + r(-1.5, 1.5)); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,80,120,0.45)'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)'; for (let x = x0 + 6; x < x1; x += r(14, 28)) g.fillRect(x, y - 6 + r(0, 8), 1.8, 1.8);
    },
    // a black crust split by glowing cracks
    crust(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 8, '#1c0f10', seed, 3, cl, cr); strip(g, x0, x1, y, 4, '#3a1f1c', seed + 1, 2, cl, cr);
      const r = rng(seed); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let x = x0 + 4; x < x1 - 8; x += r(14, 30)) {
        g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + r(3, 8), y + r(3, 6)); g.lineTo(x + r(7, 14), y + r(1, 5));
        g.strokeStyle = 'rgba(255,100,30,0.9)'; g.lineWidth = 2.2; g.shadowColor = '#ff6a1a'; g.shadowBlur = 8; g.stroke(); g.shadowBlur = 0; g.strokeStyle = '#ffd080'; g.lineWidth = 0.9; g.stroke();
      }
      g.fillStyle = 'rgba(255,170,70,0.9)'; for (let i = 0; i < (x1 - x0) / 28; i++) g.fillRect(x0 + r(0, x1 - x0), y - r(1, 7), 1.6, 1.6);
    },
    // polished edge: a bevel of silver light
    bevel(g, x0, x1, y, st, seed, th, cl, cr) {
      const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, 'rgba(236,228,255,0.6)'); gr.addColorStop(1, 'rgba(236,228,255,0)'); g.fillStyle = gr; g.fillRect(x0, y, x1 - x0, 8);
      g.fillStyle = '#f6f2ff'; g.fillRect(x0 - (cl ? 1 : 0), y, x1 - x0 + (cl ? 1 : 0) + (cr ? 1 : 0), 1.8);
      const r = rng(seed); g.fillStyle = 'rgba(255,255,255,0.8)'; for (let x = x0 + 8; x < x1 - 8; x += r(22, 50)) { g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x, y + 3); g.lineTo(x + 8, y); g.fill(); }
    },
    // bones lying along the edge
    bones(g, x0, x1, y, st, seed, th, cl, cr) {
      strip(g, x0, x1, y, 6, '#6a5a40', seed, 2, cl, cr);
      const r = rng(seed); g.lineCap = 'round';
      for (let x = x0 + 4; x < x1 - 4; x += r(7, 13)) {
        const L = r(5, 11), a = r(-0.5, 0.5); g.strokeStyle = INK; g.lineWidth = 4.4; g.beginPath(); g.moveTo(x - L * Math.cos(a), y - 1 - L * Math.sin(a)); g.lineTo(x + L * Math.cos(a), y - 1 + L * Math.sin(a)); g.stroke();
        g.strokeStyle = shade('#efe4c8', 0.7 + r(0.35)); g.lineWidth = 2.4; g.stroke();
      }
      g.strokeStyle = 'rgba(255,245,220,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y + 1); g.lineTo(x1, y + 1); g.stroke();
    },
    // a pale dust ridge
    dust(g, x0, x1, y, st, seed, th, cl, cr) {
      const r = rng(seed); strip(g, x0, x1, y, 7, '#8a96d0', seed, 2.5, cl, cr); strip(g, x0, x1, y, 3.5, '#c8d0f4', seed + 1, 1.6, cl, cr);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x0, y - 0.5, x1 - x0, 1.4);
      for (let x = x0 + 5; x < x1 - 4; x += r(10, 22)) { g.fillStyle = 'rgba(70,80,140,0.7)'; g.beginPath(); g.ellipse(x, y + 1, r(1.6, 3.4), r(1, 2), 0, Math.PI, 0); g.fill(); }
    },
  };

  // ---------------------------------------------------------------- fringes under overhangs
  // a row of points hanging from the lower edge (drips, icicles, tips of bone)
  const spikeRun = (g, x0, x1, yb, seed, fill, tip, hmin, hmax, wmin, wmax, hl) => {
    const r = rng(seed);
    for (let x = x0 + 2; x < x1 - 2; x += r(wmin, wmax)) {
      const w = r(wmin, wmax) * 0.7, h = r(hmin, hmax); g.beginPath(); g.moveTo(x - w, yb - 2); g.lineTo(x + r(-2, 2), yb + h); g.lineTo(x + w, yb - 2); g.closePath();
      g.fillStyle = fill; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
      if (hl) { g.fillStyle = hl; g.beginPath(); g.moveTo(x - w * 0.5, yb); g.lineTo(x - 1, yb + h * 0.8); g.lineTo(x - w * 0.1, yb); g.fill(); }
      if (tip) { g.fillStyle = tip; g.beginPath(); g.arc(x, yb + h - 1, 1.8, 0, 7); g.fill(); }
    }
  };
  const FRINGE = {
    none() {},
    drip(g, x0, x1, yb, st, seed) { spikeRun(g, x0, x1, yb, seed, shade(st.rock[0], 0.8), null, 5, 16, 8, 16, 'rgba(255,255,255,0.1)'); },
    icicle(g, x0, x1, yb, st, seed) { spikeRun(g, x0, x1, yb, seed, '#cfeaf8', null, 8, 26, 7, 13, 'rgba(255,255,255,0.7)'); },
    hot(g, x0, x1, yb, st, seed) { spikeRun(g, x0, x1, yb, seed, shade(st.rock[0], 0.7), '#ff9a40', 4, 13, 9, 17, null); },
    ribs(g, x0, x1, yb, st, seed) { spikeRun(g, x0, x1, yb, seed, '#d8ccb0', null, 4, 11, 8, 15, 'rgba(255,255,255,0.35)'); },
    roots(g, x0, x1, yb, st, seed) {
      const r = rng(seed); g.lineCap = 'round';
      for (let x = x0 + 4; x < x1 - 2; x += r(8, 18)) { const h = r(6, 22); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x, yb - 1); g.quadraticCurveTo(x + r(-6, 6), yb + h * 0.5, x + r(-5, 5), yb + h); g.stroke(); g.strokeStyle = '#6a4222'; g.lineWidth = 2; g.stroke(); }
    },
    vines(g, x0, x1, yb, st, seed) {
      const r = rng(seed); g.lineCap = 'round';
      for (let x = x0 + 4; x < x1 - 2; x += r(9, 20)) {
        const h = r(8, 34); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x, yb - 1); g.quadraticCurveTo(x + r(-5, 5), yb + h * 0.5, x + r(-4, 4), yb + h); g.stroke(); g.strokeStyle = '#2f8a62'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#8ff0b8'; g.beginPath(); g.ellipse(x + r(-3, 3), yb + h * 0.7, 2.6, 1.6, 0.6, 0, 7); g.fill();
      }
    },
    web(g, x0, x1, yb, st, seed) {
      const r = rng(seed); g.strokeStyle = 'rgba(230,224,250,0.5)'; g.lineWidth = 1; g.lineCap = 'round';
      for (let x = x0 + 6; x < x1 - 6; x += r(14, 34)) { const h = r(14, 40); g.beginPath(); g.moveTo(x - 9, yb); g.lineTo(x, yb + h); g.lineTo(x + 10, yb); g.moveTo(x - 4, yb + h * 0.5); g.lineTo(x + 5, yb + h * 0.5); g.stroke(); }
    },
  };

  // ---------------------------------------------------------------- one-way ledges
  function plats(g, L) {
    const name = L.def.theme, st = STYLE[name];
    g.imageSmoothingEnabled = true;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_ONEWAY) continue;
      let x1 = x; while (x1 + 1 < L.w && L.get(x1 + 1, y) === T_ONEWAY) x1++;
      ledge(g, x * T, (x1 + 1) * T, y * T, st, name, x * 13 + y); stats.ledges++;
      x = x1;
    }
    return true;
  }
  // one run of ledge: slab, light top, brackets underneath, a detail of the area
  function ledge(g, x0, x1, y, st, name, seed) {
    const kind = st.ledge, r = rng(seed + 5), w = x1 - x0;
    const body = { wood: ['#7a5432', '#3c2616'], stone: [shade(st.rock[0], 1.25), shade(st.rock[1], 1.0)], iron: ['#8a6450', '#2c1810'], ice: ['#cfeaf8', '#6a9ac0'], glass: ['#4a3c68', '#16101f'], bone: ['#efe4c8', '#9a8a68'] }[kind];
    // brackets under the slab
    for (let x = x0 + 5; x < x1 - 6; x += 32) {
      g.fillStyle = body[1]; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y + 8); g.lineTo(x + 4, y + 8); g.lineTo(x + 1, y + 17 + r(0, 4)); g.lineTo(x - 1, y + 17 + r(0, 4)); g.closePath(); g.fill(); g.stroke();
    }
    const gr = g.createLinearGradient(0, y - 1, 0, y + 9); gr.addColorStop(0, body[0]); gr.addColorStop(1, body[1]);
    g.fillStyle = gr; g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.roundRect(x0 - 2, y - 1, w + 4, 10, 3); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x0 + 1, y, w - 2, 1.8);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 + 1, y + 6, w - 2, 2.2);
    if (kind === 'wood') { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; for (let x = x0 + 16; x < x1 - 6; x += 16 + r(0, 8)) { g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x, y + 8); g.stroke(); } }
    else if (kind === 'iron') { g.fillStyle = 'rgba(255,225,190,0.7)'; for (let x = x0 + 6; x < x1 - 3; x += 14) { g.beginPath(); g.arc(x, y + 4, 1.5, 0, 7); g.fill(); } }
    else if (kind === 'stone') { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; for (let x = x0 + 24; x < x1 - 8; x += 24 + r(0, 12)) { g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x - 2, y + 8); g.stroke(); } }
    else if (kind === 'ice') { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let x = x0 + 6; x < x1 - 4; x += 20) g.fillRect(x, y + 2, 7, 1.4); spikeRun(g, x0 + 4, x1 - 4, y + 8, seed, '#cfeaf8', null, 4, 11, 9, 16, 'rgba(255,255,255,0.6)'); }
    else if (kind === 'glass') { g.fillStyle = 'rgba(236,228,255,0.7)'; for (let x = x0 + 8; x < x1 - 8; x += 28) { g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + 8, y + 1); g.lineTo(x + 3, y + 5); g.fill(); } }
    else if (kind === 'bone') { g.fillStyle = INK; for (let x = x0 + 4; x < x1 - 4; x += 11) { g.beginPath(); g.arc(x, y + 4, 1.4, 0, 7); g.fill(); } }
    if (name === 'moss') blades(g, x0 + 2, x1 - 2, y, ['#3fae78', '#8ff0b8'], 4, 9, 9, seed);
    if (name === 'ember') { g.fillStyle = 'rgba(255,120,40,0.9)'; g.fillRect(x0 + 3, y + 8.5, w - 6, 1.6); }
    if (name === 'frost') { g.fillStyle = '#f4fbff'; g.beginPath(); g.moveTo(x0, y); for (let x = x0; x <= x1; x += 5) g.lineTo(x, y - 3 - 2 * Math.sin(x * 0.4 + seed)); g.lineTo(x1, y); g.fill(); }
  }

  // register for every area that has no tileset of its own
  const hook = { ready: () => true, solid, plats };
  for (const n of Object.keys(STYLE)) if (!Art.tileHooks[n]) Art.tileHooks[n] = hook;
  return { STYLE, stats, textures, themes: Object.keys(STYLE) };
})();
