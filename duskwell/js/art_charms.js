'use strict';
// Drawing of the charms: a round medallion with a glyph. Used by the charm screen, the shop, the
// pickups in the world and the banner shown when one is found. The glyphs are drawn in a unit box
// (-1..1), scaled to the medallion, in the same dark ink and pale light as the rest of the game.
Art.drawCharm = function (g, id, x, y, r, o) {
  o = o || {};
  const def = Charms.DEFS[id]; if (!def) return;
  const c = def.color, dim = o.dim;
  g.save(); g.translate(x, y);
  if (o.glow) glow(g, 0, 0, r * 2.4, c, 0.25);
  // the medallion: ink rim, dark bowl, a thin ring of the charm's colour
  ellipse(g, 0, 0, r, r); fs(g, dim ? '#161b27' : '#0d1322', INK, Math.max(2, r * 0.16));
  g.strokeStyle = dim ? 'rgba(150,165,190,0.45)' : rgba(c, o.worn ? 1 : 0.8); g.lineWidth = Math.max(1.2, r * (o.worn ? 0.12 : 0.08));
  ellipse(g, 0, 0, r * 0.84, r * 0.84); g.stroke();
  g.save(); g.scale(r * 0.52, r * 0.52); g.lineWidth = 0.16; g.lineJoin = 'round'; g.lineCap = 'round';
  const fill = dim ? '#6d7a8c' : c, ink = INK, lw = 0.16;
  const shape = (pts, f) => { poly(g, pts); fs(g, f || fill, ink, lw); };
  switch (id) {
    case 'reach':      // a long blade
      shape([0, -1, 0.22, 0.4, -0.22, 0.4]); shape([-0.55, 0.4, 0.55, 0.4, 0.55, 0.58, -0.55, 0.58]); shape([-0.1, 0.58, 0.1, 0.58, 0.1, 1, -0.1, 1]);
      break;
    case 'swift':      // speed lines ending in an arrow
      for (const yy of [-0.5, 0, 0.5]) { poly(g, [-1, yy - 0.08, 0.1, yy - 0.04, 0.1, yy + 0.04, -1, yy + 0.08]); fs(g, fill, ink, 0.08); }
      shape([1, 0, 0.35, -0.5, 0.35, 0.5]);
      break;
    case 'siphon':     // a drop of soul
      g.beginPath(); g.moveTo(0, -1); g.bezierCurveTo(0.2, -0.5, 0.78, -0.05, 0.78, 0.35); g.arc(0, 0.35, 0.78, 0, Math.PI); g.bezierCurveTo(-0.78, -0.05, -0.2, -0.5, 0, -1); g.closePath(); fs(g, fill, ink, lw);
      g.fillStyle = 'rgba(255,255,255,0.7)'; ellipse(g, -0.28, 0.2, 0.12, 0.24, 0.4); g.fill();
      break;
    case 'focus':      // gathering rings
      ellipse(g, 0, 0, 0.9, 0.9); g.strokeStyle = fill; g.lineWidth = 0.2; g.stroke();
      ellipse(g, 0, 0, 0.5, 0.5); g.stroke(); ellipse(g, 0, 0, 0.18, 0.18); fs(g, fill, ink, 0.06);
      break;
    case 'deep':       // a diamond sunk in a ring
      ellipse(g, 0, 0, 0.92, 0.92); g.strokeStyle = fill; g.lineWidth = 0.2; g.stroke();
      shape([0, -0.62, 0.62, 0, 0, 0.62, -0.62, 0]);
      g.fillStyle = 'rgba(255,255,255,0.55)'; poly(g, [0, -0.4, 0.22, 0, 0, 0.1, -0.22, 0]); g.fill();
      break;
    case 'thorn': {    // a burst of thorns
      const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.34 : 1; pts.push(Math.cos(a) * rr, Math.sin(a) * rr); }
      shape(pts);
      break;
    }
    case 'boots':      // a boot with wind behind it
      shape([-0.3, -0.95, 0.35, -0.95, 0.35, 0.1, 0.95, 0.4, 0.95, 0.85, -0.3, 0.85]);
      g.strokeStyle = fill; g.lineWidth = 0.1; for (const yy of [-0.3, 0.1, 0.5]) { g.beginPath(); g.moveTo(-0.95, yy); g.lineTo(-0.5, yy); g.stroke(); }
      break;
    case 'dashmaster': // two chevrons
      for (const dx of [-0.5, 0.35]) shape([dx - 0.4, -0.75, dx + 0.3, 0, dx - 0.4, 0.75, dx - 0.05, 0.75, dx + 0.65, 0, dx - 0.05, -0.75]);
      break;
    case 'mage':       // a four-point star
      shape([0, -1, 0.26, -0.26, 1, 0, 0.26, 0.26, 0, 1, -0.26, 0.26, -1, 0, -0.26, -0.26]);
      break;
    case 'spirit':     // a heart that echoes
      g.beginPath(); g.moveTo(0, 0.9); g.bezierCurveTo(-1.15, 0.1, -0.7, -0.85, 0, -0.35); g.bezierCurveTo(0.7, -0.85, 1.15, 0.1, 0, 0.9); g.closePath(); fs(g, fill, ink, lw);
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-0.55, -0.12); g.lineTo(-0.3, -0.3); g.stroke();
      break;
    case 'magnet':     // a horseshoe magnet
      g.lineCap = 'butt';
      g.strokeStyle = ink; g.lineWidth = 0.62; g.beginPath(); g.moveTo(-0.55, 0.9); g.lineTo(-0.55, 0.05); g.arc(0, 0.05, 0.55, Math.PI, 0); g.lineTo(0.55, 0.9); g.stroke();
      g.strokeStyle = fill; g.lineWidth = 0.4; g.stroke();
      g.strokeStyle = dim ? '#aab4c4' : '#ffffff'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(-0.55, 0.9); g.lineTo(-0.55, 0.62); g.moveTo(0.55, 0.9); g.lineTo(0.55, 0.62); g.stroke();
      break;
    case 'thrift':     // a leaf: the soul is spared
      g.beginPath(); g.moveTo(-0.85, 0.85); g.bezierCurveTo(-1, -0.4, 0.2, -1, 0.95, -0.9); g.bezierCurveTo(1, 0.1, 0.3, 0.95, -0.85, 0.85); g.closePath(); fs(g, fill, ink, lw);
      g.strokeStyle = ink; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-0.85, 0.85); g.lineTo(0.35, -0.35); g.stroke();
      break;
    case 'fury':       // a flame
      g.beginPath(); g.moveTo(0.05, -1); g.bezierCurveTo(0.95, -0.15, 0.95, 0.95, 0, 0.95); g.bezierCurveTo(-0.95, 0.95, -0.75, 0.1, -0.3, -0.25); g.bezierCurveTo(-0.28, 0.2, -0.1, 0.3, 0, 0.05); g.bezierCurveTo(0.2, -0.3, -0.1, -0.6, 0.05, -1); g.closePath(); fs(g, fill, ink, lw);
      g.fillStyle = 'rgba(255,240,200,0.85)'; ellipse(g, 0.05, 0.55, 0.28, 0.34); g.fill();
      break;
    case 'soles':      // a boot sole with cleats
      shape([-0.95, 0.15, 0.95, 0.15, 0.95, 0.55, -0.95, 0.55]);
      for (const x of [-0.7, -0.25, 0.2, 0.65]) shape([x - 0.16, 0.55, x + 0.16, 0.55, x, 1.0], dim ? '#aab4c4' : '#ffffff');
      shape([-0.55, -0.9, 0.35, -0.9, 0.35, 0.15, -0.55, 0.15]);
      break;
    case 'wick':       // a flame in a ring of light
      ellipse(g, 0, 0.1, 0.92, 0.92); g.strokeStyle = fill; g.lineWidth = 0.1; g.stroke();
      g.beginPath(); g.moveTo(0, -0.8); g.bezierCurveTo(0.6, -0.1, 0.55, 0.7, 0, 0.7); g.bezierCurveTo(-0.55, 0.7, -0.5, -0.1, 0, -0.8); g.closePath(); fs(g, fill, ink, lw);
      g.fillStyle = 'rgba(255,255,255,0.85)'; ellipse(g, 0, 0.3, 0.2, 0.28); g.fill();
      break;
    case 'cinder':     // a blade edge wreathed in flame
      shape([-0.13, -0.05, 0.13, -0.05, 0.1, 0.7, 0, 0.98, -0.1, 0.7]); shape([-0.5, 0.7, 0.5, 0.7, 0.5, 0.86, -0.5, 0.86]);
      g.beginPath(); g.moveTo(0, -1); g.bezierCurveTo(0.5, -0.6, 0.5, -0.2, 0.12, -0.05); g.lineTo(-0.12, -0.05); g.bezierCurveTo(-0.5, -0.25, -0.35, -0.6, 0, -1); g.closePath(); fs(g, fill, ink, lw);
      g.fillStyle = 'rgba(255,255,255,0.8)'; ellipse(g, 0, -0.32, 0.1, 0.22); g.fill();
      break;
    case 'gale':       // a spiral of wind
      g.strokeStyle = fill; g.lineWidth = 0.2; g.lineCap = 'round';
      g.beginPath(); g.arc(0.05, 0, 0.78, Math.PI * 0.9, Math.PI * 2.05); g.stroke();
      g.beginPath(); g.arc(0.05, 0.02, 0.46, Math.PI * 1.1, Math.PI * 2.4); g.stroke();
      g.beginPath(); g.arc(0.05, 0.02, 0.16, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.85, 0.5); g.lineTo(-0.3, 0.5); g.stroke();
      break;
    case 'echo':       // a blade and its ghosts: nested crescents
      g.strokeStyle = fill; g.lineCap = 'round';
      for (const [r, a, w] of [[0.34, 1.2, 0.2], [0.6, 1.1, 0.17], [0.86, 1.0, 0.14]]) { g.lineWidth = w; g.beginPath(); g.arc(-0.5, 0, r + 0.2, -a, a); g.stroke(); }
      shape([-0.62, -0.1, -0.1, -0.1, 0, 0, -0.1, 0.1, -0.62, 0.1]);
      break;
    case 'shell':      // a ward shield
      g.beginPath(); g.moveTo(0, -0.98); g.lineTo(0.88, -0.6); g.bezierCurveTo(0.88, 0.4, 0.42, 0.82, 0, 1); g.bezierCurveTo(-0.42, 0.82, -0.88, 0.4, -0.88, -0.6); g.closePath(); fs(g, fill, ink, lw);
      g.strokeStyle = 'rgba(30,24,16,0.6)'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(0, -0.7); g.lineTo(0, 0.75); g.moveTo(-0.6, -0.15); g.lineTo(0.6, -0.15); g.stroke();
      break;
  }
  g.restore();
  g.restore();
};
