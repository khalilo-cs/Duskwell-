'use strict';
// The owner's effect frames (art/fx/fx.webp, cut by tools/sprites/cut_fx.py): Moon Rend's crescent growing as it flies, the Dusk Rush's
// slashes, the Soul Nova's rings and spikes, the dive's burst of spikes and the Comet Heart's golden trail. Each draws in place of the
// older code-drawn effect once the atlas is loaded (the functions return false until then, and the old drawing runs).
const FxArt = (() => {
  const img = new Image(); img.src = 'art/fx/fx.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  const maxOf = (k, i) => Math.max(...FX_FRAMES[k].map(f => f[i]));
  // frame n of strip k, its anchor (ax, ay in 0..1 of the frame) at (x, y), scaled by s, mirrored by dir
  function frame(g, k, n, x, y, s, dir, ax, ay, alpha) {
    const fr = FX_FRAMES[k][Math.max(0, Math.min(FX_FRAMES[k].length - 1, n))], w = fr[2] * s, h = fr[3] * s;
    g.save(); g.translate(x, y); if (dir < 0) g.scale(-1, 1); if (alpha != null && alpha < 1) g.globalAlpha *= alpha;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, fr[0], fr[1], fr[2], fr[3], -w * ax, -h * ay, w, h);
    g.restore();
  }
  return {
    ready,
    // the crescent of Moon Rend: grows from a sliver to a full moon while it flies, its bright edge leading
    moon(g, p) {
      if (!ready()) return false;
      const dir = sign(p.vx) || 1, n = FX_FRAMES.moon.length, i = Math.min(n - 1, Math.floor((p.t || 0) * 16)), s = p.r * 2.7 / maxOf('moon', 3);
      bloom(g, p.x, p.y, p.r * 2.6, '#cfe0ff', 0.4);
      frame(g, 'moon', i, p.x + dir * p.r * 0.9, p.y, s, dir, 1, 0.5);
      return true;
    },
    // the slashes of the Dusk Rush behind and ahead of the hero
    rush(g, p) {
      if (!ready()) return false;
      const f = p.face, n = FX_FRAMES.rush.length, i = Math.min(n - 1, Math.floor((1 - p.rushT / Gear.RUSH_TIME) * n + 0.2));
      bloom(g, p.cx + f * 20, p.cy - 2, 60, '#8fe8ff', 0.4);
      frame(g, 'rush', i, p.cx + f * 70, p.cy - 4, 0.95, f, 1, 0.5);
      return true;
    },
    // the Soul Nova's rings and spikes, standing on the same centre as the blast
    nova(g, f, k) {
      if (!ready()) return false;
      const n = FX_FRAMES.nova.length, i = Math.min(n - 1, Math.floor(k * n)), s = (f.R * 2.1) / maxOf('nova', 2);
      frame(g, 'nova', i, f.x, f.y + f.R * 0.12, s, 1, 0.5, 0.62, 1 - Math.max(0, k - 0.8) * 4);
      return true;
    },
    // the dive's landing: spikes of light out of the floor
    dive(g, f, k) {
      if (!ready()) return false;
      const n = FX_FRAMES.dive.length, i = Math.min(n - 1, Math.floor(k * n)), s = 190 / maxOf('dive', 2);
      frame(g, 'dive', i, f.x, f.y + 4, s, 1, 0.5, 1, 1);
      return true;
    },
    // the Comet Heart's trail behind the blazing hero
    comet(g, p, t) {
      if (!ready()) return false;
      const d = p.sd.dir, n = FX_FRAMES.comet.length, i = 3 + Math.floor(t * 18) % (n - 4);
      frame(g, 'comet', i, p.cx + d * 30, p.cy - 2, 0.9, d, 1, 0.5);
      return true;
    },
  };
})();
