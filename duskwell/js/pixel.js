'use strict';
// Pixel-art sprites (from the artist's Aseprite files, see tools/sprites) drawn with real-time 3D
// lighting. When a sheet loads, every frame gets a height map from its silhouette (a pixel stands
// out more the further it is from the edge) and a normal map from that height. Each draw then
// shades every pixel with the scene's lights: a soft key light from the front, Lambert diffuse and
// a specular glint from every nearby lamp, lantern or spell, and a cool rim light from behind. The
// lit frame is scaled up with crisp nearest-neighbour pixels. Contact shadows sit under the feet.
const Pixel = (() => {
  const SCALE = 3;
  const sheets = {};
  let lights = [], ambient = [0.5, 0.52, 0.6];
  let work = null, wg = null;                 // scratch canvas a frame is lit into
  let flat = false, shadowG = null;           // Lumen mode: no lighting here, shadows go to another context

  // ---------------------------------------------------------------- loading and normal maps
  function load(name, meta) {
    const s = { meta, ready: false, frames: [], tinted: {} };
    sheets[name] = s;
    const im = new Image();
    im.onload = () => {
      const [cw, ch] = meta.cell, n = Math.round(im.width / cw);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      try {
        for (let i = 0; i < n; i++) s.frames.push(analyse(g.getImageData(i * cw, 0, cw, ch), cw, ch));
        s.img = im; s.ready = true;
      } catch (e) { s.frames = []; }          // pixels unreadable: the game keeps its inked drawings
    };
    im.src = meta.src;
    return s;
  }
  // height from distance to the silhouette edge (a rounded dome), normals from its slope,
  // shininess from brightness: the pale mask gleams, the cloak stays matte
  function analyse(img, w, h) {
    const d = img.data, n = w * h, dist = new Float32Array(n), MAXD = 4;
    for (let i = 0; i < n; i++) dist[i] = d[i * 4 + 3] > 0 ? MAXD : 0;
    for (let pass = 0; pass < MAXD; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!dist[i]) continue;
        const nb = Math.min(x > 0 ? dist[i - 1] : 0, x < w - 1 ? dist[i + 1] : 0, y > 0 ? dist[i - w] : 0, y < h - 1 ? dist[i + w] : 0);
        dist[i] = Math.min(dist[i], nb + 1);
      }
    }
    const height = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = dist[i] / MAXD; height[i] = dist[i] ? (1 - (1 - t) * (1 - t)) * 3 : 0; }
    // a 3x3 blur of the height map turns the stair-stepped dome into smooth slopes
    const sm = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { sum += height[yy * w + xx]; c++; } }
      sm[y * w + x] = sum / c;
    }
    const px = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!d[i * 4 + 3]) continue;
      const hl = x > 0 ? sm[i - 1] : 0, hr = x < w - 1 ? sm[i + 1] : 0, hu = y > 0 ? sm[i - w] : 0, hd = y < h - 1 ? sm[i + w] : 0;
      let nx = (hl - hr) * 0.7, ny = (hu - hd) * 0.7, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      px.push({ x, y, r, g, b, a: d[i * 4 + 3] / 255, nx, ny, nz, spec: lum > 0.75 ? 0.75 : lum > 0.45 ? 0.3 : 0.08 });
    }
    return { w, h, px };
  }

  // ---------------------------------------------------------------- scene lights (world space)
  function hexRGB(c) { if (!c) return [1, 0.95, 0.85]; const v = parseInt(c.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; }
  function setScene(list, camX, camY, theme) {
    lights = list.map(l => ({ x: l.x + camX, y: l.y + camY, r: l.r, a: l.a, c: hexRGB(l.c) }));
    const th = THEMES[theme] || THEMES.cave;
    const f = hexRGB(th.fog);
    ambient = [0.42 + f[0] * 0.14, 0.44 + f[1] * 0.14, 0.5 + f[2] * 0.14];
  }

  // ---------------------------------------------------------------- drawing
  // fx, fy: the feet centre in world space. o: { face, scale, sx, sy, flash, alpha, rot, extraLights }
  function draw(g, name, frame, fx, fy, o) {
    const s = sheets[name]; if (!s || !s.ready) return false;
    o = o || {};
    const F = s.frames[frame % s.frames.length], m = s.meta, k = o.scale || SCALE, face = o.face || 1;
    if (flat) {                                   // Lumen lights everything on screen: draw the plain pixels
      const [cw, ch] = m.cell;
      g.save(); g.imageSmoothingEnabled = false;
      if (o.alpha != null) g.globalAlpha *= o.alpha;
      g.translate(fx, fy); if (o.rot) g.rotate(o.rot);
      g.scale(face * k * (o.sx || 1), k * (o.sy || 1));
      g.drawImage(s.img, (frame % s.frames.length) * cw, 0, cw, ch, -m.mid, -m.feet, cw, ch);
      g.restore();
      if (o.flash > 0) silhouette(g, name, frame, fx, fy, { tint: '#ffffff', alpha: Math.min(1, o.flash), face, scale: k, sx: o.sx, sy: o.sy });
      return true;
    }
    if (!work || work.width < F.w || work.height < F.h) { work = document.createElement('canvas'); work.width = 64; work.height = 64; wg = work.getContext('2d'); }
    const img = wg.createImageData(F.w, F.h), out = img.data;
    // the strongest few lights at this sprite
    const near = [];
    for (const l of lights.concat(o.extraLights || [])) {
      const dd = Math.hypot(l.x - fx, l.y - (fy - 20));
      if (dd < l.r * 1.4) near.push({ l, w: l.a * (1 - dd / (l.r * 1.4)) });
    }
    near.sort((a, b) => b.w - a.w); near.length = Math.min(near.length, 4);
    const flash = Math.max(0, Math.min(1, o.flash || 0));
    for (const p of F.px) {
      // pixel position in world space, and its normal turned with the facing
      const nx = p.nx * face, wx = fx + (p.x - m.mid + 0.5) * k * face, wy = fy + (p.y - m.feet + 0.5) * k;
      // key light from the front and above keeps the form readable in the dark
      const key = Math.max(0, -0.35 * nx - 0.55 * p.ny + 0.76 * p.nz) * 0.5;
      let r = ambient[0] + key, gg = ambient[1] + key, b = ambient[2] + key, sr = 0, sg = 0, sb = 0;
      for (const { l } of near) {
        let lx = l.x - wx, ly = l.y - wy; const lz = 70, dl = Math.hypot(lx, ly, lz);
        const att = l.a * Math.max(0, 1 - Math.hypot(lx, ly) / l.r);
        if (att <= 0) continue;
        lx /= dl; ly /= dl; const lzn = lz / dl;
        const ndl = Math.max(0, nx * lx + p.ny * ly + p.nz * lzn);
        r += l.c[0] * ndl * att * 1.1; gg += l.c[1] * ndl * att * 1.1; b += l.c[2] * ndl * att * 1.1;
        // Blinn-Phong glint toward the viewer
        const hx = lx, hy = ly, hz = lzn + 1, hl = Math.hypot(hx, hy, hz);
        const sp = Math.pow(Math.max(0, (nx * hx + p.ny * hy + p.nz * hz) / hl), 18) * p.spec * att * 1.6;
        sr += l.c[0] * sp; sg += l.c[1] * sp; sb += l.c[2] * sp;
      }
      // cool rim light from behind the character, on the edges that face away from the viewer
      const rim = Math.pow(1 - p.nz, 1.5) * Math.max(0, -nx * face * 0.7 - p.ny * 0.5) * 0.9;
      let cr = p.r * r + sr + rim * 0.55, cg = p.g * gg + sg + rim * 0.7, cb = p.b * b + sb + rim * 0.95;
      if (flash) { cr += (1 - cr) * flash; cg += (1 - cg) * flash; cb += (1 - cb) * flash; }
      const i = (p.y * F.w + p.x) * 4;
      out[i] = Math.min(255, cr * 255); out[i + 1] = Math.min(255, cg * 255); out[i + 2] = Math.min(255, cb * 255); out[i + 3] = p.a * 255;
    }
    wg.clearRect(0, 0, work.width, work.height);
    wg.putImageData(img, 0, 0);
    g.save();
    g.imageSmoothingEnabled = false;
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.translate(fx, fy);
    if (o.rot) g.rotate(o.rot);
    g.scale(face * k * (o.sx || 1), k * (o.sy || 1));
    g.drawImage(work, 0, 0, F.w, F.h, -m.mid, -m.feet, F.w, F.h);
    g.restore();
    return true;
  }

  // a flat coloured silhouette (dash ghosts, the shade)
  function silhouette(g, name, frame, fx, fy, o) {
    const s = sheets[name]; if (!s || !s.ready) return false;
    const key = frame + '|' + o.tint, m = s.meta, k = o.scale || SCALE;
    let c = s.tinted[key];
    if (!c) {
      const [cw, ch] = m.cell;
      c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const cg = c.getContext('2d');
      cg.drawImage(s.img, (frame % s.frames.length) * cw, 0, cw, ch, 0, 0, cw, ch);
      cg.globalCompositeOperation = 'source-in'; cg.fillStyle = o.tint; cg.fillRect(0, 0, cw, ch);
      s.tinted[key] = c;
    }
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    g.translate(fx, fy); g.scale((o.face || 1) * k * (o.sx || 1), k * (o.sy || 1));
    g.drawImage(c, -m.mid, -m.feet);
    g.restore();
    return true;
  }

  // soft contact shadow on the ground under a body; fades and shrinks as it rises
  function shadow(g, cx, feetY, w) {
    const L = G.level; if (!L) return;
    if (shadowG) g = shadowG;                     // under Lumen the shadow belongs to the scene layer, below the creatures
    const tx = Math.floor(cx / TILE);
    let ty = Math.floor((feetY + 2) / TILE), lift = 0;
    while (ty < L.h && !L.ground(tx, ty) && lift < 8) { ty++; lift++; }
    if (lift >= 8) return;
    const gy = ty * TILE, h = gy - feetY, k = Math.max(0, 1 - h / 220);
    if (k <= 0) return;
    const rw = w * (0.55 + 0.45 * k);
    const gr = g.createRadialGradient(cx, gy, 1, cx, gy, rw);
    gr.addColorStop(0, 'rgba(0,0,0,' + 0.5 * k + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(cx, gy); g.scale(1, 0.22); g.translate(-cx, -gy);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, gy, rw, 0, 7); g.fill(); g.restore();
  }

  function frameOf(name, anim, t) {
    const s = sheets[name]; if (!s) return 0;
    const f = s.meta.anims[anim] || s.meta.anims.idle, fps = (s.meta.fps && s.meta.fps[anim]) || 8;
    return f[Math.floor(t * fps) % f.length];
  }

  for (const k in SPRITE_META) load(k, SPRITE_META[k]);
  return { setFlat(on, g) { flat = !!on; shadowG = on ? g : null; }, draw, silhouette, shadow, setScene, frameOf, ready: n => !!(sheets[n] && sheets[n].ready), meta: n => sheets[n] && sheets[n].meta, SCALE };
})();
