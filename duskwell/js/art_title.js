'use strict';
// Title screen picture: the banner (art/title/banner.webp) shown so the logo and the wanderer are both in view,
// drifting slowly, with the moon's glow breathing. The menu stands on the dark ground below it.
const TitleArt = (() => {
  const img = new Image(); let failed = false, since = 0;
  img.onerror = () => { failed = true; };
  img.onload = () => { since = performance.now(); };
  img.src = 'art/title/banner.webp';
  // screen fill, picture scale, left edge cut, how far it is raised, picture height
  const NIGHT = '#05080f', S = 0.68, X0 = 190, Y0 = -18, H = 684;     // the screen fill, the picture's scale, where its left edge is cut, how far it is raised, its height (px of the file)
  const ready = () => img.complete && img.naturalWidth > 0;
  // where things are on the screen (the menu and the texts are placed from these)
  const LAYOUT = { logoBottom: 338, moon: [563, 100] };
  // draw the title picture; false if it failed to load (the old title is drawn then)
  function draw(g, t) {
    if (failed) return false;
    g.fillStyle = NIGHT; g.fillRect(0, 0, VW, VH);
    if (!ready()) return true;
    const a = clamp((performance.now() - since) / 700, 0, 1), x = X0 + Math.sin(t * 0.12) * 26;
    g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, x / S, 0, VW / S, H, 0, Y0, VW, H * S);
    g.restore();
    const gr = g.createLinearGradient(0, 372, 0, 452); gr.addColorStop(0, 'rgba(5,8,15,0)'); gr.addColorStop(1, 'rgba(5,8,15,1)');          // the picture's foot dissolves into the night
    g.fillStyle = gr; g.fillRect(0, 372, VW, 80);
    glow(g, LAYOUT.moon[0] - (x - X0), LAYOUT.moon[1], 240, '#ffd9a0', (0.07 + 0.035 * Math.sin(t * 0.9)) * a);     // the moon breathes (it moves with the picture)
    // the ground the menu stands on: the hills of the older screen in the night colour, so the picture's foot is not a straight edge
    g.fillStyle = '#060a18'; g.beginPath(); g.moveTo(0, VH); g.lineTo(0, 452);
    for (let i = 0; i <= VW; i += 30) g.lineTo(i, 452 + Math.sin(i * 0.02 + 2) * 8);
    g.lineTo(VW, VH); g.fill();
    return true;
  }
  return { draw, ready, LAYOUT, failed: () => failed };
})();
