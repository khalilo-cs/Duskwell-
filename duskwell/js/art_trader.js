'use strict';
// Travelling trader drawn from art/npc/trader.webp. The teal cloth is re-coloured for each shop;
// the figure faces the hero, breathes and keeps a lantern glow.
const TraderArt = (() => {
  const img = new Image(); img.src = 'art/npc/trader.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  // the teal cloth (hue about 190) becomes the shop's colour: [target hue, saturation x, lightness x]; everything else (mask, bronze, lantern, leather) is left alone
  const TINT = { frost: [205, 0.5, 1.3], ember: [16, 1.25, 0.95], storm: [238, 1.0, 1.0], mirror: [200, 0.15, 1.35], ossuary: [38, 0.45, 1.1], lunar: [268, 1.05, 0.95] };
  // colour of the lantern glow per shop
  const LAMP = { frost: '#bfe8ff', ember: '#ff9a50', storm: '#cfe0ff', mirror: '#e8f0ff', ossuary: '#9fe8c0', lunar: '#e8ecff' };
  // re-coloured copies of the figure, one per shop
  const cache = {};
  // colour conversion helpers for the tint
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, sa = 0;
    if (d > 0) { sa = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, sa, l];
  }
  function rgb(h, sa, l) {
    const c = (1 - Math.abs(2 * l - 1)) * sa, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2; let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  // the figure with its teal cloth turned to the shop's colour
  function tinted(shop) {
    const T = TINT[shop]; if (!T) return img;
    if (cache[shop]) return cache[shop];
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    let d; try { d = c.getImageData(0, 0, cv.width, cv.height); } catch (e) { return (cache[shop] = img); }          // a file:// page cannot read its own pictures: untinted then
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      const [h, sa, l] = hsl(px[i], px[i + 1], px[i + 2]);
      if (h < 150 || h > 225 || sa < 0.18) continue;                                    // only the teal cloth
      const [r, g, b] = rgb((h - 190 + T[0] + 360) % 360, Math.min(1, sa * T[1]), Math.min(0.95, l * T[2]));
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
    c.putImageData(d, 0, 0);
    return (cache[shop] = cv);
  }
  const H = 84;                                       // how tall the figure stands in the game
  // draw at the npc's feet, facing the hero, breathing, with the lantern glow
  function draw(g, n, t) {
    if (!ready()) return false;
    const src = tinted(n.shop), s = H / img.naturalHeight, w = img.naturalWidth * s;
    const face = G.player && G.player.cx > n.px ? 1 : -1;                              // the drawing looks left
    const br = Math.sin(t * 1.8 + n.px * 0.01), sway = Math.sin(t * 1.1 + n.px) * 0.012;
    groundD(g, 34);
    g.save(); g.scale(-face, 1); g.rotate(sway); g.scale(1 + br * 0.004, 1 + br * 0.012);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, -w * 0.52, -H, w, H);
    g.restore();
    // the lantern's glow (at the drawing's upper left, which turns with the figure)
    const lx = -face * (-w * 0.52 + w * 0.07) * -1, ly = -H * 0.68, fl = 0.8 + 0.2 * Math.sin(t * 7 + n.px) + 0.1 * Math.sin(t * 13);
    bloom(g, (-face) * (-w * 0.52 + w * 0.07), ly, 46, LAMP[n.shop] || '#ffd890', 0.4 * fl);
    return true;
  }
  return { ready, draw };
})();
(function () {
  const old = NPC_ART.trader;
  NPC_ART.trader = function (g, n, t, bob) { if (!TraderArt.draw(g, n, t)) old(g, n, t, bob); };
})();
