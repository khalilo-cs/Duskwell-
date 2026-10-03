'use strict';
// The owner's icons (art/icons/icons.webp, cut by tools/sprites/cut_icons.py): the weapons and cloaks of the equipment screen and the
// shops, the 21 charm medallions, the health masks, the soul orb, the geo, the bench and the lantern of the travel stations.
// Each is drawn as it was drawn; where an icon is missing the older code-drawn version takes over, so nothing disappears.
const IconArt = (() => {
  const img = new Image(); img.src = 'art/icons/icons.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  // draws icon `name` centred at (x, y); `h` is the height on screen (the width follows the picture's proportions)
  function draw(g, name, x, y, h, o) {
    const r = ICON_RECTS[name]; if (!r || !ready()) return false;
    o = o || {}; const w = h * r[2] / r[3];
    g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha; if (o.filter) g.filter = o.filter;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, r[0], r[1], r[2], r[3], x - w / 2 + (o.dx || 0), (o.bottom ? y - h : y - h / 2) + (o.dy || 0), w, h);
    g.restore(); return true;
  }
  return { ready, draw, has: n => !!ICON_RECTS[n] };
})();

(function () {
  const oldWeapon = Art.weaponIcon, oldCloak = Art.cloakIcon, oldCharm = Art.drawCharm, oldBench = Art.drawBench, oldStation = Art.drawStation;
  Art.weaponIcon = function (g, id, x, y, size, t) {
    if (!IconArt.draw(g, 'weapon_' + id, x, y, size * 2.5)) oldWeapon(g, id, x, y, size, t);
  };
  Art.cloakIcon = function (g, id, x, y, size, t) {
    if (!IconArt.draw(g, 'cloak_' + id, x, y, size * 2.3)) oldCloak(g, id, x, y, size, t);
  };
  // a charm medallion: dim when it cannot be had, a coloured ring when worn, a glow when found
  Art.drawCharm = function (g, id, x, y, r, o) {
    o = o || {};
    if (!IconArt.has('charm_' + id) || !IconArt.ready() || !Charms.DEFS[id]) return oldCharm(g, id, x, y, r, o);
    const c = Charms.DEFS[id].color;
    g.save();
    if (o.glow) glow(g, x, y, r * 2.4, c, 0.3);
    if (o.worn) { g.strokeStyle = rgba(c, 0.95); g.lineWidth = Math.max(1.5, r * 0.12); g.beginPath(); g.arc(x, y, r * 1.12, 0, 7); g.stroke(); }
    IconArt.draw(g, 'charm_' + id, x, y, r * 2.28, o.dim ? { filter: 'grayscale(0.85) brightness(0.55)', alpha: 0.75 } : null);
    g.restore();
  };
  Art.drawBench = function (g, b, t, resting) {
    if (!IconArt.ready()) return oldBench(g, b, t, resting);
    const x = b.px, y = b.py;
    bloom(g, x, y - 40, 80, '#ffe2a8', resting ? 0.4 : 0.2);
    IconArt.draw(g, 'bench', x, y + 1, 50, { bottom: true });
    if (resting) bloom(g, x, y - 44, 38, '#cfe8ff', 0.3 + 0.1 * Math.sin(t * 6));
  };
  Art.drawStation = function (g, st, t, lit) {
    if (!IconArt.ready()) return oldStation(g, st, t, lit);
    const x = st.px, y = st.py, fl = 0.85 + 0.15 * Math.sin(t * 7 + x);
    if (lit) bloom(g, x + 22, y - 84, 190, '#ffd98a', 0.5 * fl);
    g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 96); g.quadraticCurveTo(x, y - 112, x + 22, y - 112); g.stroke();
    g.strokeStyle = '#3d3a4a'; g.lineWidth = 3.5; g.stroke();
    g.fillStyle = '#2a2833'; g.fillRect(x - 11, y - 8, 22, 8); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(x - 11, y - 8, 22, 8);
    IconArt.draw(g, lit ? 'lantern_on' : 'lantern_off', x + 22, y - 110, 66, { bottom: false, dy: 33 });
  };
})();
