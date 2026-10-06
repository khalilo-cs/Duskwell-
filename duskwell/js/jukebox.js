'use strict';
// The Jukebox (pause menu, Music): every piece of the score in one list, with its name, where it plays and how long it lasts. Confirm
// plays the chosen one (and again stops it), Left and Right set the music volume, C the volume of the effects, and F turns the combat pulse (see audio.js) on or off. The bars
// are the music itself, measured as it plays. The pieces the areas no longer use are here too, so none is lost.
// [file, Arabic name, English name, where (Arabic), where (English)]
const JUKEBOX = [
  ['legend', 'الأسطورة', 'Legend', 'شاشة العنوان', 'The title screen'],
  ['hushvale', 'وادي الهمس', 'Hushvale', 'القرية', 'The village'],
  ['adventure', 'دروب المفترق', 'Roads of the Crossroads', 'مفترق الأعماق', 'The Sunken Crossroads'],
  ['moss', 'بستان الطحلب', 'Mossgrove', 'بستان الطحلب', 'The Mossgrove'],
  ['spore', 'كهوف الأبواغ', 'Spore Hollows', 'كهوف الأبواغ', 'The Spore Hollows'],
  ['crystal', 'أبراج البلّور', 'Crystal Spires', 'أبراج البلّور', 'The Crystal Spires'],
  ['abyss', 'الهاوية', 'The Abyss', 'الأعماق المنسوجة', 'The Webbed Depths'],
  ['aqueduct', 'القناة الغارقة', 'Sunken Aqueduct', 'القناة الغارقة', 'The Sunken Aqueduct'],
  ['foundry', 'ورشة الصدأ', 'The Rust Works', 'ورشة الصدأ', 'The Rust Works'],
  ['frost', 'قمم الصقيع', 'Frost Peaks', 'قمم الصقيع', 'The Frost Peaks'],
  ['ember', 'أعماق الجمر', 'Cinderdeep', 'أعماق الجمر', 'Cinderdeep'],
  ['storm', 'ذرى العاصفة', 'Stormcrest', 'ذرى العاصفة', 'Stormcrest'],
  ['mirror', 'قبو المرايا', 'Mirror Vault', 'قبو المرايا', 'The Mirror Vault'],
  ['ossuary', 'المقبرة العظمية', 'The Ossuary', 'المقبرة العظمية', 'The Ossuary'],
  ['lunar', 'مرصد القمر', 'Lunar Observatory', 'مرصد القمر', 'The Lunar Observatory'],
  ['throne', 'قاعة العرش', 'The Throne', 'قاعة العرش', 'The Throne Hall'],
  ['boss', 'المعركة', 'The Fight', 'الزعماء الأوائل', 'The first guardians'],
  ['boss_march', 'زحف الدرع', 'March of Armour', 'الحارس والمبارز والتوأم وعدّاء الرعد والعقاب', 'The Guardian, the Duelist, the Twin, the Thunderhoof and the Roc'],
  ['boss_abyss', 'سيّد الهاوية', 'Lord of the Abyss', 'الحاضنة والحائكة والغريق والطيف والعملاق والملكة', 'The Brood Mother, the Weaver, the Drowned, the Wraith, the Colossus and the Queen'],
  ['boss_bone', 'نحّات العظام', 'The Bonewright', 'نحّات العظام وطاغية النخاع', 'The Bonewright and the Marrow Tyrant'],
  ['boss_moon', 'قمر الكسوف', 'Eclipse Moon', 'الراصد ووصيّ الكسوف', 'The Stargazer and the Eclipse Regent'],
  ['king', 'الملك المجوّف', 'The Hollow King', 'الملك المجوّف', 'The Hollow King'],
  ['ending', 'الفجر', 'Dawn', 'النهاية', 'The ending'],
  ['fiddler', 'الكمان', 'The Fiddler', 'عند التاجر الغريب', 'At the Strange Merchant'],
  ['wizard', 'رقصة الساحر', 'The Sorcerer\'s Dance', 'عند الساحر', 'At the sorcerer'],
  ['forge', 'المسبك', 'The Forge', 'عند الحدّاد والخيّاطة', 'At the smith and the outfitter'],
  ['road', 'الدرب', 'The Road', 'عند التجّار الجوّالين', 'At the travelling traders'],
  ['rest', 'الاستراحة', 'Rest', 'في القوائم', 'In the menus'],
  ['overture', 'الافتتاحية', 'Overture', 'العنوان سابقاً', 'The title piece before'],
  ['crossroads', 'مفترق الأعماق (القديمة)', 'Crossroads (the earlier piece)', 'مفترق الأعماق سابقاً', 'The Crossroads before'],
  ['webbed', 'الأعماق المنسوجة (القديمة)', 'Webbed Depths (the earlier piece)', 'الأعماق المنسوجة سابقاً', 'The Webbed Depths before'],
];

const jukeName = e => (LANG.cur === 'ar' ? e[1] : e[2]);
const jukeWhere = e => (LANG.cur === 'ar' ? e[3] : e[4]);
const jukeLength = id => { const m = Sound.trackInfo(id); if (!m) return ''; const s = Math.round(m.loop); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

function playJuke(i) {
  const id = JUKEBOX[i][0];
  G.jukePlay = G.jukePlay === id ? null : id; Sound.play('select');
}
function updateJuke(dt) {
  G.jukeT = (G.jukeT || 0) + dt;
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.jukePlay = null; G.state = 'pause'; Input.consume('pause'); Input.consume('map'); Sound.play('select'); return; }
  const n = JUKEBOX.length; G.jukeSel = clamp(G.jukeSel || 0, 0, n - 1);
  if (Input.pressed('up')) { G.jukeSel = (G.jukeSel + n - 1) % n; Sound.play('select'); }
  if (Input.pressed('down')) { G.jukeSel = (G.jukeSel + 1) % n; Sound.play('select'); }
  if (Input.pressed('confirm')) playJuke(G.jukeSel);
  if (Input.pressed('left') || Input.pressed('right')) Sound.cycle('music');
  if (Input.pressed('dash')) Sound.cycle('sfx');
  if (Input.pressed('cast')) Sound.setPulse(!Sound.pulseOn());
}
function drawJuke(g) {
  g.fillStyle = 'rgba(3,5,10,0.97)'; g.fillRect(0, 0, VW, VH);
  const ar = LANG.cur === 'ar', t = G.jukeT || 0, n = JUKEBOX.length, sel = clamp(G.jukeSel || 0, 0, n - 1), e = JUKEBOX[sel];
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, sx('الموسيقى', 'Music'), VW / 2, 34, '#eef5ff');
  // the list
  const VIS = 8, ROW = 52, top = clamp(sel - 3, 0, Math.max(0, n - VIS));
  drawPanel(g, 40, 70, 390, 440);
  for (let i = top; i < Math.min(n, top + VIS); i++) {
    const r = JUKEBOX[i], y = 70 + 16 + (i - top) * ROW + ROW / 2 - 2, on = i === sel, now = G.jukePlay === r[0];
    (G.menuHits || (G.menuHits = [])).push({ x: 52, y: y - ROW / 2 + 2, w: 366, h: ROW - 4, fn: () => { if (G.jukeSel === i) playJuke(i); else { G.jukeSel = i; Sound.play('select'); } } });
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(52, y - ROW / 2 + 2, 366, ROW - 4); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(52.5, y - ROW / 2 + 2.5, 365, ROW - 5); }
    g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr'; g.textBaseline = 'middle';
    const tx = ar ? 386 : 96;
    g.font = font(18, '700'); g.fillStyle = now ? '#ffe9a0' : '#eef5ff'; g.fillText(jukeName(r), tx, y - 9);
    g.font = font(12, '500'); g.fillStyle = '#9db5d6'; g.fillText(jukeWhere(r).length > 38 ? jukeWhere(r).slice(0, 36) + '…' : jukeWhere(r), tx, y + 12);
    g.fillStyle = now ? '#ffd24a' : 'rgba(150,170,200,0.5)'; g.textAlign = 'center'; g.direction = 'ltr'; g.font = font(14, '700');
    g.fillText(now ? '♪' : String(i + 1), ar ? 66 : 74, y);
  }
  g.fillStyle = 'rgba(230,240,255,0.5)';
  if (top > 0) { g.beginPath(); g.moveTo(235, 82); g.lineTo(251, 82); g.lineTo(243, 74); g.fill(); }
  if (top + VIS < n) { g.beginPath(); g.moveTo(235, 502); g.lineTo(251, 502); g.lineTo(243, 510); g.fill(); }
  // the one chosen: its name, where it plays, how long it is, and the bars of the music as it sounds
  drawPanel(g, 450, 70, 470, 440);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(28, '700'); g.fillStyle = '#ffe9a0'; g.fillText(jukeName(e), 685, 108);
  g.font = font(15, '500'); g.fillStyle = '#c3d2ea'; wrapText(g, jukeWhere(e), 420).slice(0, 2).forEach((l, i) => g.fillText(l, 685, 144 + i * 20));
  g.font = font(15, '600'); g.fillStyle = '#9fe0d8'; g.fillText(sx('المدة ', 'Length ') + jukeLength(e[0]) + (G.jukePlay === e[0] ? '    ' + sx('يُعزف الآن', 'Playing now') : ''), 685, 196);
  // the bars
  const bars = 28, bx = 480, bw = 410 / bars, by = 330, bh = 110, spec = G.jukePlay === e[0] ? Sound.spectrum(bars) : null;
  g.fillStyle = 'rgba(6,10,20,0.85)'; g.fillRect(470, 220, 430, 140);
  for (let i = 0; i < bars; i++) {
    const v = spec ? spec[i] : 0.04 + 0.03 * Math.sin(t * 2 + i * 0.5), h = Math.max(3, v * bh), c = spec ? 'hsl(' + (40 - v * 30) + ',90%,' + (45 + v * 25) + '%)' : 'rgba(150,170,200,0.35)';
    g.fillStyle = c; g.fillRect(bx + i * bw + 1, by - h + 20, bw - 2, h);
  }
  // the buttons
  const lv = Sound.levels();
  chip(g, 470, 372, 205, 32, sx('الموسيقى: ', 'Music: ') + Math.round(lv.music * 100) + '%', false, () => { Sound.cycle('music'); });
  chip(g, 695, 372, 205, 32, sx('المؤثرات: ', 'Effects: ') + Math.round(lv.sfx * 100) + '%', false, () => { Sound.cycle('sfx'); Sound.play('hit'); });
  chip(g, 470, 412, 430, 32, sx('طبقة القتال: ', 'Combat pulse: ') + (Sound.pulseOn() ? sx('تعمل', 'on') : sx('متوقفة', 'off')), Sound.pulseOn(), () => { Sound.setPulse(!Sound.pulseOn()); Sound.play('select'); });
  chip(g, 470, 452, 430, 44, G.jukePlay === e[0] ? sx('■  إيقاف', '■  Stop') : sx('▶  تشغيل', '▶  Play'), G.jukePlay === e[0], () => playJuke(G.jukeSel));
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(sx('↑ ↓ اختيار    Z تشغيل    ← → الموسيقى    C المؤثرات    F طبقة القتال    Esc رجوع', '↑ ↓ choose    Z play    ← → music    C effects    F combat pulse    Esc back'), VW / 2, VH - 16);
}
