'use strict';
// The title screen's picture: the owner's Duskwell banner (art/title/banner.webp, made from art/source/title_hd/title_banner.png by
// tools/sprites/prep_title.py), the moonlit kingdom with the wanderer on the rock and the logo in front of the moon. The picture is
// wider than the screen (three to one), so it is shown at a size where the wanderer, on the left, and the whole logo, in the middle,
// are both in view, and it drifts a little from side to side; the moon's light breathes behind the logo. Below it the night
// colour takes over (the picture's own bottom dissolves into it), which is where the menu stands. Until the picture is loaded the
// screen stays dark and the picture fades in; if it cannot be loaded at all, the older title screen is used.
const TitleArt = (() => {
  const img = new Image(); let failed = false, since = 0;
  img.onerror = () => { failed = true; };
  img.onload = () => { since = performance.now(); };
  img.src = 'art/title/banner.webp';
  const NIGHT = '#05080f', S = 0.68, X0 = 190, Y0 = -18, H = 684;     // the screen fill, the picture's scale, where its left edge is cut, how far it is raised, its height (px of the file)
  const ready = () => img.complete && img.naturalWidth > 0;
  // where things are on the screen (the menu and the texts are placed from these)
  const LAYOUT = { logoBottom: 338, moon: [563, 100] };
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
