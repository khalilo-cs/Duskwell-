'use strict';
// Projectiles and explosions from art/fx/proj.webp (8 rows of 8 frames: ice, rock, void, acid, fire, bolt, bone,
// meteor). A dying shot leaves its ending frames behind (G.fx 'projfx'). Colours the art lacks are made by
// turning its hue. Shots without art here keep the old drawing.
const ProjArt = (() => {
  const img = new Image();
  img.src = 'art/fx/proj.webp';
  const ready = () => typeof PROJ_FRAMES !== 'undefined' && img.complete && img.naturalWidth > 0;
  // how often each frame was drawn (read by the tests)
  const seen = {};                                               // how often each frame was drawn (the tests read it)
  // mean hue, lightness and saturation of each row, to turn it toward another colour
  const HUE = { ice: 196, void: 269, acid: 75, fire: 21, bolt: 209, bone: 32, meteor: 23, rock: 32 };
  const LUM = { ice: 0.51, void: 0.36, acid: 0.38, fire: 0.44, bolt: 0.61, bone: 0.49, meteor: 0.49, rock: 0.53 };
  const SAT = { ice: 0.55, void: 0.5, acid: 0.55, fire: 0.6, bolt: 0.55, bone: 0.3, meteor: 0.55, rock: 0.3 };

  // ---------------------------------------------------------------- colours: a frame turned toward another hue (and made paler or darker)
  function rgb(c) { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function toHsl(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0;
    if (d > 1e-6) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2; let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  // how a row has to be changed to look like colour c: [hue turn, saturation factor, lightness factor], or null when it already does
  const plans = {};
  function plan(row, c) {
    const key = row + c; if (key in plans) return plans[key];
    const t = rgb(c); let out = null;
    if (t) {
      const chroma = Math.max(...t) - Math.min(...t), hsl = toHsl(t[0], t[1], t[2]);
      const dh = ((hsl[0] - HUE[row] + 540) % 360) - 180;
      const turn = chroma < 0.1 ? 0 : dh;                                                                      // (a grey has no hue to turn to)
      if (chroma < 0.3 || Math.abs(dh) > 28) out = [turn, clamp(chroma / SAT[row] * 0.9, 0.12, 1.25), clamp(Math.sqrt(hsl[2] / LUM[row]), 0.85, 1.4)];       // a pale colour drains the colour and lightens the picture
    }
    return (plans[key] = out);
  }
  // re-coloured frames, cached
  const variants = {};
  function variant(row, i, c) {
    const p = plan(row, c); if (!p) return null;
    const key = row + i + c; if (key in variants) return variants[key];
    const f = PROJ_FRAMES[row][i], cv = document.createElement('canvas'); cv.width = f[2]; cv.height = f[3];
    const x = cv.getContext('2d'); x.drawImage(img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    let d; try { d = x.getImageData(0, 0, f[2], f[3]); } catch (e) { return (variants[key] = null); }      // a page opened from disk cannot read its pixels: the drawing as it is
    const a = d.data;
    for (let q = 0; q < a.length; q += 4) {
      if (!a[q + 3]) continue;
      const h = toHsl(a[q] / 255, a[q + 1] / 255, a[q + 2] / 255), o = fromHsl((h[0] + p[0] + 360) % 360, clamp(h[1] * p[1], 0, 1), clamp(h[2] * p[2], 0, 0.97));
      a[q] = o[0]; a[q + 1] = o[1]; a[q + 2] = o[2];
    }
    x.putImageData(d, 0, 0);
    return (variants[key] = cv);
  }

  // ---------------------------------------------------------------- one frame of a row, its anchor at (x, y), k screen px per atlas px
  // o.dir: the way the thing travels (the drawing travels to the right, or at o.base radians below it); o.tint: a colour to turn it to
  function put(g, row, i, x, y, k, o) {
    const f = PROJ_FRAMES[row] && PROJ_FRAMES[row][i]; if (!f) return false;
    o = o || {};
    const v = o.tint ? variant(row, i, o.tint) : null, src = v || img, sx = v ? 0 : f[0], sy = v ? 0 : f[1];
    const kx = k * (o.kx || 1), ky = k * (o.ky || 1);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.translate(x, y);
    if (o.dir != null) { const flip = Math.cos(o.dir) < 0, base = o.base || 0; g.rotate(flip ? o.dir - (Math.PI - base) : o.dir - base); if (flip) g.scale(-1, 1); }
    g.drawImage(src, sx, sy, f[2], f[3], -f[4] * kx, -f[5] * ky, f[2] * kx, f[3] * ky);
    g.restore();
    const n = row + ':' + i; seen[n] = (seen[n] || 0) + 1;
    return true;
  }

  // ---------------------------------------------------------------- what is drawn for each shot
  const heading = p => p.rot != null ? p.rot : Math.atan2(p.vy || 0, p.vx || 1);
  // which palette (and so which row) a shot uses
  const isIce = p => p.pal && (p.pal === (typeof ICE !== 'undefined' ? ICE : null) || p.pal === (typeof GLASS !== 'undefined' ? GLASS : null));
  const isBone = p => p.boss && p.pal && p.pal === (typeof BONEP !== 'undefined' ? BONEP : null);       // (the skull bat's teeth are drawn from its own sheet)
  const isSlag = p => p.pal && !p.pal.spike;
  // flight frames; a shot forms for the first moments
  const FLY = [2, 3, 4, 3];
  const flight = t => t < 0.05 ? 0 : t < 0.1 ? 1 : FLY[Math.floor(t * 14) % FLY.length];       // forming, then the full shard pulsing

  // draw the shot if this file has art for it, false otherwise
  function drawShot(g, p, t) {
    const k = p.kind;
    if (k === 'shard' && (isIce(p) || isBone(p))) {
      const bone = isBone(p), a = heading(p), len = p.r * (bone ? 9 : 8.2), row = bone ? 'bone' : 'ice';
      const i = flight(p.t);
      const kk = len / (bone ? 100 : 104), tip = bone ? 0 : p.r;
      bloom(g, p.x, p.y, p.r * 3.6, isIce(p) ? p.pal.glow : '#efe6d0', bone ? 0.2 : 0.4);
      return put(g, row, i, p.x + Math.cos(a) * tip, p.y + Math.sin(a) * tip, kk, { dir: a, tint: p.pal === (typeof GLASS !== 'undefined' ? GLASS : 0) ? '#c8b8ff' : null });
    }
    if (k === 'orb') {
      const i = p.t < 0.07 ? 0 : p.t < 0.14 ? 1 : 1 + (Math.floor(p.t * 9) % 2);
      bloom(g, p.x, p.y, p.r * 3.4, p.color, 0.4);
      return put(g, 'void', i, p.x, p.y, p.r * 2.5 / 50, { tint: p.color });
    }
    if (k === 'rock') {
      if (p.pal && p.pal.spike) return false;                                  // an icicle: the older drawing
      if (p.t < p.tele) {                                                      // the warning: a column of light where it will fall, and the rock shaking where it hangs
        const a = 0.25 + 0.35 * Math.abs(Math.sin(p.t * 14)), rgb = p.pal ? p.pal.rgb : '200,205,215';
        const gr = g.createLinearGradient(0, p.y0, 0, G.floorY); gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(1, 'rgba(' + rgb + ',' + a + ')');
        g.fillStyle = gr; g.fillRect(p.x - 16, p.y0, 32, G.floorY - p.y0);
        if (p.pal) return put(g, 'meteor', 3, p.x + Math.sin(p.t * 60) * 1.5, p.y, p.r * 2.4 / 60, { dir: Math.PI / 2, base: 0.47 });
        return put(g, 'rock', 0, p.x + Math.sin(p.t * 60) * 1.5, p.y + p.r, p.r * 2.6 / 46, { alpha: 0.9 });
      }
      if (p.pal) { bloom(g, p.x, p.y, p.r * 2.6, p.pal.glow, 0.4); return put(g, 'meteor', 1 + (Math.floor(p.t * 12) % 3), p.x, p.y, p.r * 2.4 / 60, { dir: Math.atan2(p.vy, p.vx || 0.01), base: 0.47 }); }
      return put(g, 'rock', Math.floor(p.t * 12) % 2, p.x, p.y + p.r, p.r * 2.6 / 46);
    }
    if (k === 'glob' && p.color === '#ffb070') {                               // a boss's lava
      const a = heading(p);
      bloom(g, p.x, p.y, p.r * 3.4, '#ff7a2a', 0.35);
      return put(g, 'fire', 1 + (Math.floor(p.t * 14) % 3), p.x, p.y, p.r * 3.4 / 56, { dir: a });
    }
    if (k === 'bomb' && p.blastR) {                                            // a boss's bomb: a ball of fire (the imp's keeps its drawing from the creature sheet)
      const a = heading(p);
      bloom(g, p.x, p.y, 40, p.color, 0.3 + 0.15 * Math.sin(p.t * 22));
      return put(g, 'fire', 1 + (Math.floor(p.t * 14) % 3), p.x, p.y, p.r * 3.4 / 56, { dir: a, tint: p.color });
    }
    if (k === 'blast') {                                                       // an explosion: the drawn one, wide as the ring it replaces, fading as the smoke clears
      const u = clamp(p.t / 0.45, 0, 1), i = 4 + Math.min(3, Math.floor(u * 4)), fade = u > 0.8 ? (1 - u) / 0.2 : 1;
      bloom(g, p.x, p.y, p.r * 1.6, p.color, 0.5 * (1 - u));
      return put(g, 'fire', i, p.x, p.y, p.r * 2.1 / 134, { tint: p.color, alpha: fade });
    }
    if (k === 'pillar' && p.t >= p.tele) {                                     // lightning: the base as drawn, the column above it stretched to the height of the pillar
      const u = clamp((p.t - p.tele) / p.dur, 0, 0.999), i = Math.floor(u * 8), f = PROJ_FRAMES.bolt[i];
      const kk = p.bw * 2 / 104, split = f[3] * 0.4, tint = p.color, fl = p.ph - (f[3] - split) * kk;
      const v = variant('bolt', i, tint), src = v || img, sx = v ? 0 : f[0], sy = v ? 0 : f[1];
      bloom(g, p.x, p.y - p.ph * 0.4, 70, tint, 0.3 * (1 - u));
      g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const ax = f[4] * kk;
      if (fl > 0) g.drawImage(src, sx, sy, f[2], split, p.x - ax, p.y - p.ph, f[2] * kk, fl);                                      // the top, stretched
      g.drawImage(src, sx, sy + split, f[2], f[3] - split, p.x - ax, p.y - p.ph + Math.max(0, fl), f[2] * kk, (f[3] - split) * kk);   // the foot, as drawn
      g.restore();
      const n = 'bolt:' + i; seen[n] = (seen[n] || 0) + 1;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the endings
  const groundY = (x, y) => { const L = G.level; let yy = y; for (let i = 0; i < 24 && L.solidAtPx(x, yy); i++) yy -= 2; return yy; };
  // add an ending effect
  function fx(spec) { G.fx.push(Object.assign({ type: 'projfx', t: 0, k: 1, life: 0.3 }, spec)); }
  // a shot died: leave its ending frames (dissolve, burst, dust, splash)
  function onDead(p) {
    if (!ready() || p.friendly) return;
    const k = p.kind, a = heading(p), old = p.life <= 0;
    if (k === 'shard' && (isIce(p) || isBone(p))) {
      const bone = isBone(p), tip = bone ? 0 : p.r;
      fx({ row: bone ? 'bone' : 'ice', frames: [5, 6, 7], x: p.x + Math.cos(a) * tip, y: p.y + Math.sin(a) * tip, k: p.r * (bone ? 9 : 8.2) / (bone ? 100 : 104), dir: a, tint: p.pal === (typeof GLASS !== 'undefined' ? GLASS : 0) ? '#c8b8ff' : null, life: 0.3 });
    } else if (k === 'orb') {
      fx({ row: 'void', frames: old ? [5, 6, 7] : [3, 4, 5, 6, 7], x: p.x, y: p.y, k: p.r * 8 / 118, tint: p.color, life: old ? 0.3 : 0.5 });
    } else if (k === 'rock' && !(p.pal && p.pal.spike) && p.t >= p.tele) {
      const gy = groundY(p.x, p.y + p.r);
      if (p.pal) fx({ row: 'meteor', frames: [4, 5, 6, 7], x: p.x, y: gy - 6, k: p.r * 5 / 112, life: 0.5 });
      else fx({ row: 'rock', frames: [2, 3, 4, 5, 6, 7], x: p.x, y: gy, k: p.r * 2.6 / 46, life: 0.7 });
    } else if (k === 'glob' && !old) {
      const lava = p.color === '#ffb070';
      fx({ row: 'acid', frames: [1, 2, 3, 4, 5, 6, 7], x: p.x, y: groundY(p.x, p.y + p.r * 0.6), k: p.r * 8.5 / 94, tint: lava ? '#ff8a3a' : null, life: 0.7 });
    }
  }
  // draw an ending effect
  function drawFx(g, f) {
    if (!ready()) return;
    const n = f.frames.length, i = f.frames[Math.min(n - 1, Math.floor(f.t / f.life * n))], u = f.t / f.life;
    put(g, f.row, i, f.x, f.y, f.k, { dir: f.dir, base: f.base, tint: f.tint, alpha: u > 0.7 ? (1 - u) / 0.3 : 1 });
  }

  // ---------------------------------------------------------------- the hooks
  const oldProj = Art.drawProj, oldFx = Art.drawFx;
  Art.drawProj = function (g, p, t) { if (ready() && drawShot(g, p, t)) return; return oldProj(g, p, t); };
  Art.drawFx = function (g, f) { if (f.type === 'projfx') return drawFx(g, f); return oldFx(g, f); };
  return { ready, put, onDead, seen, variants, FRAMES: () => PROJ_FRAMES };
})();
