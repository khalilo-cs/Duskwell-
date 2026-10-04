'use strict';
// The town's Elder drawn from art/npc/wizard.webp: faces the hero, breathes, crystal and lantern glow, and the torn
// cloak is drawn in strips with a travelling wave. The old Elder is used until the picture loads.
const ElderArt = (() => {
  const img = new Image(); img.src = 'art/npc/wizard.webp';
  // state.off turns the picture off (the tests use it)
  const state = { off: false };
  const ready = () => !state.off && typeof WIZARD !== 'undefined' && img.complete && img.naturalWidth > 0;
  const H = 108;                                                  // his height on the screen, hat and staff included (the hero is about 64)
  // draw at the npc's feet: facing the hero, breathing, glows, cloak strips with a wave
  function draw(g, n, t) {
    if (!ready()) return false;
    const W = WIZARD, k = H / W.h, face = G.player && G.player.cx > n.px ? 1 : -1;            // the drawing looks left
    const br = Math.sin(t * 1.7 + n.px * 0.01), talk = G.state === 'dialog' ? 1 : 0;
    groundD(g, 46);
    g.save(); g.scale(-face, 1); g.scale(1 + br * 0.003, 1 + br * 0.01);                       // breathing, about his feet
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const ox = -W.feet[0] * k, oy = -W.feet[1] * k, split = W.tailX;
    g.drawImage(img, 0, 0, split, W.h, ox, oy, split * k, W.h * k);                             // the figure, up to where the cloak trails off
    const sw = 3, span = W.w - split;
    for (let sx = split; sx < W.w; sx += sw) {                                                   // the cloak, strip by strip
      const u = (sx - split) / span, amp = 3.6 * u * u, w = Math.min(sw, W.w - sx);
      const dy = (Math.sin(t * 1.7 - sx * 0.045 + n.px) + 0.45 * Math.sin(t * 3.1 - sx * 0.08)) * amp;
      g.drawImage(img, sx, 0, w, W.h, ox + sx * k, oy + dy, w * k + 0.5, W.h * k);
    }
    const cx = ox + W.crystal[0] * k, cy = oy + W.crystal[1] * k, lx = ox + W.lantern[0] * k, ly = oy + W.lantern[1] * k;
    bloom(g, cx, cy, 30 * (1 + 0.12 * Math.sin(t * 2.4) + 0.2 * talk), '#ffb347', 0.5 + 0.12 * talk);        // the staff's crystal
    bloom(g, lx, ly, 22, '#ffd890', 0.3 * (0.8 + 0.2 * Math.sin(t * 7 + n.px) + 0.1 * Math.sin(t * 13)));     // the lantern on his pack
    g.restore();
    return true;
  }
  return { ready, draw, state };
})();
(function () {
  const old = NPC_ART.elder;
  NPC_ART.elder = function (g, n, t, bob) { if (!ElderArt.draw(g, n, t)) old(g, n, t, bob); };
})();
