'use strict';
// Lumen: the WebGL lighting pass. The game still draws with the 2D canvas, but into two layers:
//   scene  everything that does not move much (painted sky, tiles, props, items), opaque
//   ents   enemies, bosses and the hero, with transparency
// Lumen then lights them in one fragment shader, per pixel:
//   * rock gets a normal map baked once per room from its tiles (a rounded relief that catches light),
//   * every creature gets normals from the soft shape of its own silhouette (alpha blurred into a dome),
//   * point lights give diffuse, a glint and, for creatures, a cool rim light,
//   * the strongest lights cast shadows: the terrain really blocks them (a short ray march through the
//     tile mask), so a lantern behind a pillar leaves the far side dark,
//   * then bloom, light shafts, a chromatic kick when the hero is hurt and heat haze in the foundry.
// If WebGL2 is missing or fails, usable() is false and the old 2D lighting is used instead.
const Lumen = (() => {
  const MAXL = 24, SHADOWED = 4, HALF = 0.5;
  let canvas = null, gl = null, ok = false, quality = 2, mode = 'auto';     // quality: 0 off, 1 lit, 2 lit + shadows
  let sceneC = null, sceneG = null, entC = null, entG = null, W = 0, H = 0, S = 1;
  const P = {}, T = {}, F = {};                                // programs, textures, framebuffers
  let quad = null, room = { level: null, dirty: false, pw: 1, ph: 1 };
  try { const q = localStorage.getItem('duskwell_gfx'); if (q === '0' || q === '1' || q === '2') { mode = +q; quality = +q; } } catch (e) { /* ignore */ }
  let slow = 0, frames = 0;

  // ------------------------------------------------------------------ shaders
  const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  // a separable blur of the creatures' alpha: it becomes a soft dome whose slope is the creature's normal
  const FRAG_HEIGHT = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uDir; uniform int uMode;
in vec2 vUv; out vec4 o;
float src(vec2 uv) { vec4 c = texture(uTex, uv); return uMode == 0 ? smoothstep(0.55, 0.95, c.a) : c.r; }
void main() {
  float s = 0.0, ws = 0.0;
  for (int i = -7; i <= 7; i++) { float w = exp(-float(i * i) / 22.0); s += w * src(vUv + uDir * float(i)); ws += w; }
  o = vec4(vec3(s / ws), 1.0);
}`;

  const FRAG_LIGHT = `#version 300 es
precision highp float;
uniform sampler2D uScene, uEnt, uHeight, uNorm;
uniform vec2 uLog, uCam, uRoom, uTexel;
uniform int uNL, uNS;
uniform vec4 uL[${MAXL}];
uniform vec3 uLC[${MAXL}];
uniform float uDark, uSpec, uShadow, uTime, uCaustic;
uniform vec3 uTint;
in vec2 vUv; out vec4 o;

vec4 normAt(vec2 wp) {
  vec2 n = wp / uRoom;
  if (n.x < 0.0 || n.y < 0.0 || n.x > 1.0 || n.y > 1.0) return vec4(0.5, 0.5, 1.0, 0.0);
  return texture(uNorm, n);
}
float solidAt(vec2 wp) { return smoothstep(0.78, 0.95, normAt(wp).a); }

// how much of the light reaches p: a short march through the tile mask
float lightReach(vec2 p, vec2 lp) {
  float occ = 0.0;
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));     // dither: no visible banding
  for (int s = 1; s <= 12; s++) {
    float t = (float(s) + jit - 0.5) / 13.0;
    vec2 q = mix(p, lp, t);
    if (distance(q, lp) < 26.0) continue;
    occ += solidAt(q + uCam);
  }
  return 1.0 - clamp(occ * 0.5, 0.0, 1.0);
}

// nStr: how much the normal matters (0 = flat, as the old darkness map); shadowed: terrain blocks the light
vec3 shade(vec3 albedo, vec3 N, vec2 p, float nStr, float specK, bool shadowed) {
  float cut = 0.0; vec3 tint = vec3(0.0), spec = vec3(0.0);
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uNL) break;
    vec4 L = uL[i]; vec2 d = L.xy - p; float dist = length(d) / L.z;
    if (dist >= 1.0) continue;
    float f = dist < 0.45 ? mix(1.0, 0.62, dist / 0.45) : mix(0.62, 0.0, (dist - 0.45) / 0.55);
    float w = L.w * f, sh = 1.0;
    if (shadowed && uShadow > 0.5 && i < uNS && w > 0.03) sh = lightReach(p, L.xy);
    vec3 L3 = normalize(vec3(d, 55.0));
    float lam = mix(1.0, clamp(dot(N, L3), 0.0, 1.0) * 1.55 + 0.1, nStr);
    cut += w * lam * sh;
    tint += uLC[i] * w * lam * sh;
    vec3 Hh = normalize(L3 + vec3(0.0, 0.0, 1.0));
    spec += uLC[i] * pow(max(dot(N, Hh), 0.0), 20.0) * w * sh;
  }
  float b = (1.0 - uDark) + uDark * clamp(cut, 0.0, 1.25);
  return albedo * b + albedo * tint * 0.38 + spec * specK;
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uLog;                // logical screen pixels, y down
  vec4 sc = texture(uScene, vUv), en = texture(uEnt, vUv);
  vec2 wp = p + uCam;
  // ---- the scene: rock has a baked relief, everything else is flat
  vec4 nm = normAt(wp);
  float rock = smoothstep(0.3, 0.9, nm.a);
  vec3 Nr = normalize(nm.rgb * 2.0 - 1.0);
  float ao = mix(1.0, mix(0.6, 1.0, Nr.z), rock);
  vec3 col = shade(sc.rgb * ao, mix(vec3(0.0, 0.0, 1.0), Nr, rock), p, 0.95 * rock, uSpec * rock, nm.a < 0.6);
  if (uCaustic > 0.0) {                                       // light wobbling through water: drifting bright threads
    float v = sin(wp.x * 0.045 + uTime * 0.8 + sin(wp.y * 0.03 + uTime * 0.5) * 2.0) * sin(wp.y * 0.05 - uTime * 0.6 + sin(wp.x * 0.025 + uTime * 0.4) * 2.0);
    col += uTint * smoothstep(0.55, 0.95, v) * 0.16 * clamp(dot(col, vec3(1.0)) * 2.2, 0.0, 1.0) * uCaustic;
  }
  // ---- creatures: normals from the slope of the blurred silhouette
  if (en.a > 0.01) {
    vec2 e = uTexel * 2.2;
    float hl = texture(uHeight, vUv - vec2(e.x, 0.0)).r, hr = texture(uHeight, vUv + vec2(e.x, 0.0)).r;
    float hu = texture(uHeight, vUv + vec2(0.0, e.y)).r, hd = texture(uHeight, vUv - vec2(0.0, e.y)).r;
    vec3 Ne = normalize(vec3((hl - hr) * 5.5, (hu - hd) * 5.5, 1.0));       // screen y points down; v points up
    // luminance gives a little fine relief on top of the dome
    float lum = dot(en.rgb, vec3(0.3, 0.59, 0.11));
    vec3 lit = shade(en.rgb, Ne, p, 0.8, 0.55 * smoothstep(0.35, 0.9, lum) + 0.08, true);
    float rim = pow(1.0 - Ne.z, 2.2);
    lit += rim * (uTint * 0.9 + 0.12) * 0.55 * en.rgb + rim * uTint * 0.18;
    // a creature in the dark is not quite invisible: keep a floor of the albedo
    lit = max(lit, en.rgb * 0.16);
    col = mix(col, lit, en.a);
  }
  o = vec4(col, 1.0);
}`;

  const FRAG_BRIGHT = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uThr;
in vec2 vUv; out vec4 o;
void main() { vec3 c = texture(uTex, vUv).rgb; vec3 b = max(c - uThr, 0.0) * 1.7; o = vec4(b, 1.0); }`;

  const FRAG_BLUR = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uDir;
in vec2 vUv; out vec4 o;
void main() {
  vec3 s = vec3(0.0); float ws = 0.0;
  for (int i = -8; i <= 8; i++) { float w = exp(-float(i * i) / 24.0); s += w * texture(uTex, vUv + uDir * float(i)).rgb; ws += w; }
  o = vec4(s / ws, 1.0);
}`;

  const FRAG_FINAL = `#version 300 es
precision highp float;
uniform sampler2D uLit, uBloom;
uniform vec2 uLog;
uniform float uBloomK, uAberr, uHaze, uTime;
uniform vec4 uShaft;
in vec2 vUv; out vec4 o;
void main() {
  vec2 uv = vUv;
  if (uHaze > 0.0) { uv.x += sin(uv.y * 46.0 + uTime * 3.2) * 0.0011 * uHaze * smoothstep(0.1, 0.9, 1.0 - uv.y); uv.y += cos(uv.x * 28.0 + uTime * 1.6) * 0.0006 * uHaze; }
  vec3 c;
  if (uAberr > 0.0) { vec2 dir = (uv - 0.5) * uAberr; c = vec3(texture(uLit, uv + dir).r, texture(uLit, uv).g, texture(uLit, uv - dir).b); }
  else c = texture(uLit, uv).rgb;
  vec3 bl = texture(uBloom, uv).rgb;
  if (uShaft.w > 0.0) {                                      // light shafts: bright things smeared toward the light
    vec2 sp = vec2(uShaft.x / uLog.x, 1.0 - uShaft.y / uLog.y); vec3 acc = vec3(0.0);
    for (int i = 0; i < 20; i++) acc += texture(uBloom, mix(uv, sp, float(i) / 20.0 * 0.7)).rgb;
    bl += acc / 20.0 * uShaft.w;
  }
  c += bl * uBloomK;
  c = mix(c, 0.85 + (c - 0.85) / (1.0 + (c - 0.85) * 2.2), step(0.85, c));       // soft shoulder instead of a hard clip
  o = vec4(c, 1.0);
}`;

  // ------------------------------------------------------------------ plumbing
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(frag, names) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n);
    return { p, u };
  }
  function texture(filter) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function target(w, h) {
    const t = texture(gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f, w, h };
  }
  function init() {
    // opened straight from disk the painted backgrounds taint the canvas, and WebGL may not read it
    if (location.protocol === 'file:') return false;
    try {
      canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 36;
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      if (!gl) return false;
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); ok = false; });
      P.height = program(FRAG_HEIGHT, ['uTex', 'uDir', 'uMode']);
      P.light = program(FRAG_LIGHT, ['uScene', 'uEnt', 'uHeight', 'uNorm', 'uLog', 'uCam', 'uRoom', 'uTexel', 'uNL', 'uNS', 'uL', 'uLC', 'uDark', 'uSpec', 'uShadow', 'uTime', 'uTint', 'uCaustic']);
      P.bright = program(FRAG_BRIGHT, ['uTex', 'uThr']);
      P.blur = program(FRAG_BLUR, ['uTex', 'uDir']);
      P.final = program(FRAG_FINAL, ['uLit', 'uBloom', 'uLog', 'uBloomK', 'uAberr', 'uHaze', 'uTime', 'uShaft']);
      quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      T.scene = texture(gl.LINEAR); T.ent = texture(gl.LINEAR);
      T.norm = texture(gl.LINEAR);                                  // until a room is baked: no rock anywhere
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 255, 0]));
      sceneC = document.createElement('canvas'); entC = document.createElement('canvas');
      sceneG = sceneC.getContext('2d', { alpha: false }); entG = entC.getContext('2d');
      ok = true;
    } catch (e) { console.error('Lumen: ' + e.message); ok = false; }
    return ok;
  }

  // the render size follows the screen (up to 1.5x), so the 2D layers and the GL canvas match
  function resize(k) {
    const s = clamp(k, 1, 1.5), w = Math.ceil(VW * s), h = Math.ceil(VH * s);
    if (w === W && h === H) return;
    W = w; H = h; S = s;
    for (const k2 of Object.keys(F)) { gl.deleteTexture(F[k2].t); gl.deleteFramebuffer(F[k2].f); delete F[k2]; }
    sceneC.width = entC.width = canvas.width = w; sceneC.height = entC.height = canvas.height = h;
    const hw = Math.ceil(w * HALF), hh = Math.ceil(h * HALF), qw = Math.ceil(w / 4), qh = Math.ceil(h / 4);
    F.hA = target(hw, hh); F.hB = target(hw, hh); F.lit = target(w, h); F.bA = target(qw, qh); F.bB = target(qw, qh); F.bC = target(qw, qh);
  }

  // ------------------------------------------------------------------ the rock's relief, baked once per room
  function bakeRoom(L) {
    if (!ok || (room.level === L && !room.dirty)) return;
    const cell = 2, w = Math.ceil(L.pw / cell), h = Math.ceil(L.ph / cell), n = w * h;
    const solid = new Uint8Array(n), thin = new Uint8Array(n), D = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const tx = Math.floor(x * cell / TILE), ty = Math.floor(y * cell / TILE), v = L.get(tx, ty);
      if (v === T_SOLID || v === T_BREAK || v === T_GATE || v === T_CRACK) solid[y * w + x] = 1;
      else if (v === T_ONEWAY && (y * cell) % TILE < 10) thin[y * w + x] = 1;
    }
    // distance to the nearest air cell, inside the rock (a two-pass chamfer)
    const INF = 1e4;
    for (let i = 0; i < n; i++) D[i] = solid[i] ? INF : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!D[i]) continue;
      let d = D[i];
      if (x > 0) d = Math.min(d, D[i - 1] + 1); if (y > 0) d = Math.min(d, D[i - w] + 1);
      if (x > 0 && y > 0) d = Math.min(d, D[i - w - 1] + 1.41); if (x < w - 1 && y > 0) d = Math.min(d, D[i - w + 1] + 1.41);
      D[i] = d;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; if (!D[i]) continue;
      let d = D[i];
      if (x < w - 1) d = Math.min(d, D[i + 1] + 1); if (y < h - 1) d = Math.min(d, D[i + w] + 1);
      if (x < w - 1 && y < h - 1) d = Math.min(d, D[i + w + 1] + 1.41); if (x > 0 && y < h - 1) d = Math.min(d, D[i + w - 1] + 1.41);
      D[i] = d;
    }
    // a rounded dome (steep at the rim, flat inside) with a little grain
    const hgt = new Float32Array(n), DEPTH = 9, noise = (x, y) => hash2(Math.floor(x / 5), Math.floor(y / 5), 31) * 0.8 + hash2(Math.floor(x / 2), Math.floor(y / 2), 17) * 0.4;
    for (let i = 0; i < n; i++) {
      if (solid[i]) { const t = Math.min(D[i], DEPTH) / DEPTH; hgt[i] = (1 - (1 - t) * (1 - t)) * 5.5 + noise(i % w, (i / w) | 0) * 0.5; }
      else if (thin[i]) hgt[i] = 1.2;
    }
    // a light blur, then Sobel slopes -> normals
    const sm = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += hgt[yy * w + xx]; c++; } }
      sm[y * w + x] = s / c;
    }
    const px = new Uint8Array(n * 4), K = 1.15;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, g = (xx, yy) => sm[Math.min(h - 1, Math.max(0, yy)) * w + Math.min(w - 1, Math.max(0, xx))];
      const dx = (g(x + 1, y - 1) + 2 * g(x + 1, y) + g(x + 1, y + 1)) - (g(x - 1, y - 1) + 2 * g(x - 1, y) + g(x - 1, y + 1));
      const dy = (g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1)) - (g(x - 1, y - 1) + 2 * g(x, y - 1) + g(x + 1, y - 1));
      let nx = -dx * K * 0.25, ny = -dy * K * 0.25, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      px[i * 4] = Math.round((nx * 0.5 + 0.5) * 255); px[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255); px[i * 4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      px[i * 4 + 3] = solid[i] ? 255 : thin[i] ? 128 : 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, T.norm);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    room = { level: L, dirty: false, pw: L.pw, ph: L.ph };
  }

  // ------------------------------------------------------------------ drawing
  function bindTex(unit, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); }
  function pass(prog, fbo, w, h) {
    gl.useProgram(prog.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo ? fbo.f : null); gl.viewport(0, 0, w, h);
    return prog.u;
  }
  function upload(t, src) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }

  // o: { lights: [{x,y,r,a,c}] (screen space), cx, cy, dark, tint:[r,g,b], spec, time, aberr, haze, shaft:{x,y,k} }
  function render(o) {
    try { return renderNow(o); } catch (e) { console.error('Lumen: ' + e.message); ok = false; return null; }      // fall back to the 2D lighting for good
  }
  function renderNow(o) {
    const lights = o.lights.filter(l => l.x > -l.r && l.y > -l.r && l.x < VW + l.r && l.y < VH + l.r && l.a > 0).sort((a, b) => b.a * b.r - a.a * a.r).slice(0, MAXL);
    const Lu = new Float32Array(MAXL * 4), Lc = new Float32Array(MAXL * 3);
    lights.forEach((l, i) => { Lu.set([l.x, l.y, l.r, l.a], i * 4); Lc.set(l.c ? hexToRgb(l.c).map(v => v / 255) : [1, 0.95, 0.85], i * 3); });
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    upload(T.scene, sceneC); upload(T.ent, entC);
    const hw = F.hA.w, hh = F.hA.h;
    // 1) the creatures' silhouette as a soft dome (horizontal, then vertical)
    let u = pass(P.height, F.hA, hw, hh); bindTex(0, T.ent); gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uMode, 0); gl.uniform2f(u.uDir, 1.6 / hw, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    u = pass(P.height, F.hB, hw, hh); bindTex(0, F.hA.t); gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uMode, 1); gl.uniform2f(u.uDir, 0, 1.6 / hh); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // 2) lighting
    u = pass(P.light, F.lit, W, H);
    bindTex(0, T.scene); gl.uniform1i(u.uScene, 0); bindTex(1, T.ent); gl.uniform1i(u.uEnt, 1);
    bindTex(2, F.hB.t); gl.uniform1i(u.uHeight, 2); bindTex(3, T.norm); gl.uniform1i(u.uNorm, 3);
    gl.uniform2f(u.uLog, VW, VH); gl.uniform2f(u.uCam, o.cx, o.cy); gl.uniform2f(u.uRoom, room.pw, room.ph); gl.uniform2f(u.uTexel, 1 / hw, 1 / hh);
    gl.uniform1i(u.uNL, lights.length); gl.uniform1i(u.uNS, SHADOWED); gl.uniform4fv(u.uL, Lu); gl.uniform3fv(u.uLC, Lc);
    gl.uniform1f(u.uDark, o.dark); gl.uniform1f(u.uSpec, o.spec); gl.uniform1f(u.uShadow, quality >= 2 ? 1 : 0); gl.uniform1f(u.uTime, o.time); gl.uniform1f(u.uCaustic, o.caustic || 0);
    gl.uniform3f(u.uTint, o.tint[0], o.tint[1], o.tint[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // 3) bloom: bright parts, blurred at quarter size
    const qw = F.bA.w, qh = F.bA.h;
    u = pass(P.bright, F.bA, qw, qh); bindTex(0, F.lit.t); gl.uniform1i(u.uTex, 0); gl.uniform1f(u.uThr, 0.62); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    u = pass(P.blur, F.bB, qw, qh); bindTex(0, F.bA.t); gl.uniform1i(u.uTex, 0); gl.uniform2f(u.uDir, 1.5 / qw, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    u = pass(P.blur, F.bC, qw, qh); bindTex(0, F.bB.t); gl.uniform1i(u.uTex, 0); gl.uniform2f(u.uDir, 0, 1.5 / qh); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // 4) the final image
    u = pass(P.final, null, W, H);
    bindTex(0, F.lit.t); gl.uniform1i(u.uLit, 0); bindTex(1, F.bC.t); gl.uniform1i(u.uBloom, 1);
    gl.uniform2f(u.uLog, VW, VH); gl.uniform1f(u.uBloomK, 0.5); gl.uniform1f(u.uAberr, o.aberr || 0); gl.uniform1f(u.uHaze, o.haze || 0); gl.uniform1f(u.uTime, o.time);
    const sh = o.shaft; gl.uniform4f(u.uShaft, sh ? sh.x : 0, sh ? sh.y : 0, 0, sh ? sh.k : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return canvas;
  }

  return {
    init,
    usable: () => ok && quality > 0,
    ready: () => ok,
    quality: () => quality,
    mode: () => mode,
    // 'auto' starts high and steps down if the game runs slowly; 0, 1 and 2 pin a level (0 = the old 2D lighting)
    setMode(m) { mode = m; quality = m === 'auto' ? 2 : m; slow = frames = 0; try { localStorage.setItem('duskwell_gfx', String(m)); } catch (e) { /* ignore */ } },
    setQuality(q) { mode = q; quality = q; },
    // called every frame with the time since the last one; in auto mode, 90 slow frames in a row lower the quality
    adapt(dtMs) {
      if (mode !== 'auto' || !ok || quality === 0 || dtMs > 250) return;
      slow = dtMs > 25 ? slow + 1 : Math.max(0, slow - 1); frames++;
      if (slow > 90 && frames > 120) { quality--; slow = frames = 0; }
    },
    // sizes the layers and returns their 2D contexts, already scaled to logical coordinates and cleared
    begin(k) {
      resize(k);
      sceneG.setTransform(S, 0, 0, S, 0, 0); entG.setTransform(1, 0, 0, 1, 0, 0); entG.clearRect(0, 0, W, H); entG.setTransform(S, 0, 0, S, 0, 0);
      return { sg: sceneG, eg: entG };
    },
    bakeRoom, render, layers: () => [sceneC, entC],
    invalidate() { room.dirty = true; },        // a wall broke or a gate moved: bake the relief again
  };
})();
