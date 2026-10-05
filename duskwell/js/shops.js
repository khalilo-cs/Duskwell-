'use strict';
// The shops and the equipment screen. Every shop is a list of items; the NPC that stands in a room
// says which list it opens (Level npc(type, x, y, shop)). An item is a plain upgrade (apply()), a
// charm, or a piece of equipment (gear: [kind, id]) that goes to Gear. Some items stay locked until
// a condition holds (req), and the lock text says what it is.
const sx = (ar, en) => (LANG.cur === 'ar' ? ar : en);

// conditions that keep an item locked, with the text that says why
const needDash = { req: () => !!P.ab.dash, lock: ['يحتاج اندفاع الظل', 'Needs the Shadow Dash'] };
const needSeals = n => ({ req: () => sealCount() >= n, lock: ['يحتاج ' + n + ' أختام من الحرّاس', 'Needs ' + n + ' guardian seals'] });
const needBoss = (flag, ar, en) => ({ req: () => !!G.flags[flag], lock: ['يحتاج هزيمة ' + ar, 'Defeat ' + en + ' first'] });

// items of the general merchant: upgrades and a few charms
const SHOP_ITEMS = [
  { id: 'buy_mask', name: 'itemMask', desc: 'itemMaskD', price: 350, icon: 'mask', apply() { P.maxHp++; P.hp = P.maxHp; } },
  { id: 'buy_nail', name: 'itemNail', desc: 'itemNailD', price: 300, icon: 'nail', apply() { P.nail += 4; } },
  { id: 'buy_nail2', name: 'itemNail2', desc: 'itemNailD', price: 800, icon: 'nail', needs: 'buy_nail', apply() { P.nail += 4; } },
  { id: 'buy_nail3', name: 'itemNail3', desc: 'itemNailD', price: 1600, icon: 'nail', needs: 'buy_nail2', apply() { P.nail += 4; } },
  { id: 'buy_soul', name: 'itemSoul', desc: 'itemSoulD', price: 320, icon: 'soul', apply() { P.soulGain = 17; } },
  { id: 'buy_notch1', name: 'itemNotch', desc: 'itemNotchD', price: 600, icon: 'notch', apply() { /* the notch count reads this flag */ } },
  { id: 'buy_notch2', name: 'itemNotch', desc: 'itemNotchD', price: 1100, icon: 'notch', needs: 'buy_notch1', apply() { /* the notch count reads this flag */ } },
  { id: 'buy_wail', name: 'itemWail', desc: 'itemWailD', price: 900, icon: 'soul', apply() { P.ab.wail = true; G.banner = { title: tr('abil_wail'), desc: tr('abil_wail_d'), t: 0 }; G.state = 'banner'; } },
  { id: 'buy_reach', charm: 'reach', price: 500, ...needSeals(1), apply() { Charms.give('reach'); } },
  { id: 'buy_boots', charm: 'boots', price: 450, ...needSeals(1), apply() { Charms.give('boots'); } },
  { id: 'buy_magnet', charm: 'magnet', price: 400, ...needSeals(2), apply() { Charms.give('magnet'); } },
  // things that can be bought again and again: they do nothing, and are refused, when there is nothing to mend
  { id: 'vial', name: 'itemVial', desc: 'itemVialD', price: 120, icon: 'vial', repeat: true, useless: () => P.hp >= P.maxHp, apply() { P.hp = Math.min(P.maxHp, P.hp + 1); } },
  { id: 'flask', name: 'itemFlask', desc: 'itemFlaskD', price: 90, icon: 'soul', repeat: true, useless: () => P.soul >= P.maxSoul, apply() { P.soul = Math.min(P.maxSoul, P.soul + Diff.soulMax / 3); } },
];
const shopItem = id => SHOP_ITEMS.find(it => it.id === id);
// the wizard's upgrades: the effect is read from the flag (Player.spellDmg, Player.spellCost), so a saved game keeps it
const WIZARD_ITEMS = [
  shopItem('buy_wail'), shopItem('buy_soul'),
  { id: 'buy_ink', name: 'itemInk', desc: 'itemInkD', price: 700, icon: 'soul', ...needSeals(2), apply() { /* Player.spellDmg reads this flag */ } },
  { id: 'buy_rune', name: 'itemRune', desc: 'itemRuneD', price: 950, icon: 'soul', ...needSeals(4), apply() { /* Player.spellCost reads this flag */ } },
  shopItem('flask'), shopItem('vial'),
];
// shop entry for a weapon, cloak or art
const gearItem = (kind, id, price, extra) => Object.assign({ id: kind + '_' + id, gear: [kind, id], price }, extra || {});
// shop id -> title, greeting, npc and items
const SHOPS = {
  general: { title: ['التاجر الغريب', 'The Strange Merchant'], greet: 'merchant', npc: 'merchant', items: SHOP_ITEMS },
  wizard: {
    title: ['الساحر', 'The Sorcerer'], npc: 'wizard', greet: 'wizardHi', items: WIZARD_ITEMS,
  },
  smith: {
    title: ['الحدّاد', 'The Smith'], npc: 'smith',
    greet: ['الحدّاد: النصل الجيد يغني عن ألف تعويذة. وإن أردتَ فنون النصل فأنا أعلّمها.', 'Smith: A good blade is worth a thousand spells. And if you want the arts of the nail, I teach them.'],
    items: [gearItem('weapon', 'duskblade', 380), gearItem('weapon', 'lance', 520),
      gearItem('art', 'rush', 400, needDash), gearItem('art', 'rend', 300), gearItem('art', 'nova', 900, needSeals(2))],
  },
  outfitter: {
    title: ['الخيّاطة', 'The Outfitter'], npc: 'outfitter',
    greet: ['الخيّاطة: العباءة تحميك أكثر مما يظن الناس. اختر ما يناسب دربك.', 'Outfitter: A cloak protects more than folk think. Choose one that suits your road.'],
    items: [gearItem('cloak', 'ironhide', 500), gearItem('cloak', 'windweave', 600)],
  },
  frost: {
    title: ['تاجر الصقيع', 'The Frost Trader'], npc: 'trader',
    greet: ['التاجر الجوّال: وصلتُ قبل الثلج ولن أرحل قبل أن أبيع. عندي ما يحتمله البرد.', 'Wandering trader: I came before the snow and I am not leaving before I have sold. Mine is gear the cold cannot beat.'],
    items: [gearItem('weapon', 'fangs', 640), gearItem('cloak', 'frostfur', 700)],
  },
  ember: {
    title: ['تاجر الجمر', 'The Ember Trader'], npc: 'trader',
    greet: ['التاجر الجوّال: الحرارة هنا تذيب الجيب والفولاذ. أما ما أبيعه فقد صُنع ليبقى.', 'Wandering trader: The heat melts purses and steel alike. What I sell was made to last.'],
    items: [gearItem('weapon', 'cleaver', 1100), gearItem('cloak', 'emberweave', 950)],
  },
  storm: {
    title: ['تاجر العاصفة', 'The Storm Trader'], npc: 'trader',
    greet: ['التاجر الجوّال: الريح تحمل بضاعتي إليك قبل أن تطلبها. اشترِ قبل أن تحملها بعيداً.', 'Wandering trader: The wind carries my wares to you before you ask. Buy before it carries them off.'],
    items: [gearItem('weapon', 'scythe', 1700), gearItem('cloak', 'soulveil', 850)],
  },
  mirror: {
    title: ['تاجر المرايا', 'The Mirror Trader'], npc: 'trader',
    greet: ['التاجر الجوّال: في كل مرآة نسخة منّي تبيع بسعر أقل... لكنها لا تُعطي شيئاً.', 'Wandering trader: In every mirror there is a copy of me selling cheaper... but it never hands anything over.'],
    items: [gearItem('cloak', 'duskmantle', 2400, needBoss('boss_twin', 'توأم الجوّال', "the Wanderer's Twin"))],
  },
};

SHOPS.ossuary = {
  title: ['تاجر المقبرة', 'The Ossuary Trader'], npc: 'trader',
  greet: ['التاجر الجوّال: بين العظام لا يسأل أحد من أين جاءت البضاعة. اشترِ وارحل قبل أن تنهض الكومة.', 'Wandering trader: Among the bones nobody asks where the goods came from. Buy, and leave before the heap rises.'],
  items: [gearItem('weapon', 'bonesaw', 1500), gearItem('cloak', 'boneward', 900)],
};
SHOPS.lunar = {
  title: ['تاجر المرصد', 'The Observatory Trader'], npc: 'trader',
  greet: ['التاجر الجوّال: النجوم تُسعّر ما أبيع. وهذا النصل أغلاها: سيف رصدوه قبل أن يصنعوه.', 'Wandering trader: The stars set my prices. This blade is the dearest: a sword they foresaw before it was forged.'],
  items: [gearItem('weapon', 'rapier', 2400)],
};

// lookups for the shop that is open
const shopDef = () => SHOPS[G.shopId] || SHOPS.general;
const shopList = () => shopDef().items.filter(it => !it.needs || G.flags[it.needs]);
const shopTitle = () => sx(...shopDef().title);
const shopGreet = def => (typeof def.greet === 'string' ? tr(def.greet) : sx(...def.greet));
const shopName = it => (it.charm ? Charms.name(it.charm) : it.gear ? Gear.name(...it.gear) : tr(it.name));
const shopDesc = it => (it.charm ? Charms.desc(it.charm) : it.gear ? Gear.desc(...it.gear) : tr(it.desc));
const shopSold = it => (it.repeat ? false : it.gear ? Gear.owns(...it.gear) : !!G.flags[it.id]);
const shopLocked = it => !!(it.req && !it.req());
const lockText = it => sx(...it.lock);

// what an item costs: its price, a tenth less for the one the Ledger's Word (a quest) made a friend of the merchants
const shopPrice = it => (Quests.priceK() === 1 ? it.price : Math.max(1, Math.round(it.price * Quests.priceK())));
// give the item (gear is equipped at once) and apply it
function buyItem(it) {
  if (it.gear) {
    const [kind, id] = it.gear;
    Gear.give(kind, id);
    if (kind === 'art') { G.banner = { title: Gear.name(kind, id), desc: Gear.desc(kind, id), t: 0, move: id }; Coach.learned(id); G.state = 'banner'; }
    else { Gear.equip(kind, id); G.toastMsg(sx('جُهّز: ', 'Equipped: ') + Gear.name(kind, id), 2); }
    Sound.play('equip');
  } else { if (!it.repeat) G.flags[it.id] = true; it.apply(); G.toastMsg(shopName(it), 1.8); }
}
// shop input: move, scroll, buy, leave
function updateShop() {
  const list = shopList(), n = list.length + 1, VIS = 4;
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'play'; Input.consume('pause'); return; }
  if (menuNav(n)) {
    if (G.menuSel === n - 1) { G.state = 'play'; return; }
    const it = list[G.menuSel];
    if (shopSold(it)) { Sound.play('hit'); return; }
    if (shopLocked(it)) { Sound.play('hurt'); G.toastMsg(lockText(it), 2.2); return; }
    if (it.useless && it.useless()) { Sound.play('hit'); G.toastMsg(tr('noNeed'), 1.6); return; }          // nothing to mend: keep the geo
    if (P.geo < shopPrice(it)) { Sound.play('hurt'); G.toastMsg(tr('noGeo'), 1.5); return; }
    P.geo -= shopPrice(it); buyItem(it); Sound.play(it.gear ? 'buy' : 'ability');
  }
  G.menuSel = Math.min(G.menuSel, n - 1);
  if (G.menuSel < G.shopTop) G.shopTop = G.menuSel;
  if (G.menuSel >= G.shopTop + VIS) G.shopTop = G.menuSel - VIS + 1;
}

// small pictures for the shop rows that are not charms or gear
function shopIcon(g, kind, x, y) {
  g.save(); g.translate(x, y);
  if (kind === 'mask') drawMaskIcon(g, 0, 0, true, 0);
  else if (kind === 'nail') { poly(g, [0, -16, 5, 8, -5, 8]); fs(g, '#e6eef7', INK, 2.5); poly(g, [-10, 8, 10, 8, 10, 12, -10, 12]); fs(g, '#8a96a8', INK, 2); }
  else if (kind === 'soul') { g.beginPath(); g.moveTo(0, -15); g.bezierCurveTo(4, -7, 12, -2, 12, 4); g.arc(0, 4, 12, 0, Math.PI); g.bezierCurveTo(-12, -2, -4, -7, 0, -15); g.closePath(); fs(g, '#cfe8ff', INK, 2.5); }
  else if (kind === 'vial') { g.beginPath(); g.moveTo(-4, -16); g.lineTo(4, -16); g.lineTo(4, -8); g.bezierCurveTo(12, -2, 12, 10, 0, 13); g.bezierCurveTo(-12, 10, -12, -2, -4, -8); g.closePath(); fs(g, '#7fe3d9', INK, 2.5); g.fillStyle = '#d9ecf0'; g.fillRect(-5, -19, 10, 4); g.fillStyle = 'rgba(255,255,255,0.55)'; ellipse(g, -3.5, 2, 2, 5); g.fill(); }
  else if (kind === 'notch') { ellipse(g, 0, 0, 13, 13); fs(g, '#0d1322', INK, 3); g.strokeStyle = '#7fe3d9'; g.lineWidth = 2.5; ellipse(g, 0, 0, 9, 9); g.stroke(); g.fillStyle = '#7fe3d9'; ellipse(g, 0, 0, 3.5, 3.5); g.fill(); }
  g.restore();
}
// icon of a piece of gear, dimmed when it cannot be had
function gearIcon(g, gear, x, y, size, t, dim) {
  g.save(); if (dim) g.globalAlpha = 0.45;
  if (gear[0] === 'weapon') Art.weaponIcon(g, gear[1], x, y, size, t);
  else if (gear[0] === 'cloak') Art.cloakIcon(g, gear[1], x, y + 2, size, t);
  else Art.artIcon(g, gear[1], x, y, size, t);
  g.restore();
}
// the box under the list: the whole description, the numbers, and how it compares to what is worn
function drawGearDetail(g, kind, id, y0, h, extra) {
  drawPanel(g, 160, y0, VW - 320, h);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(20, '700'); g.fillStyle = '#ffe9a0'; g.fillText(Gear.name(kind, id), VW / 2, y0 + 24);
  g.font = font(16, '500'); g.fillStyle = '#dfe9f6';
  wrapText(g, Gear.desc(kind, id), VW - 380).slice(0, 2).forEach((l, i) => g.fillText(l, VW / 2, y0 + 50 + i * 21));
  const st = Gear.stats(kind, id);
  setDir(g); g.font = font(15, '600'); g.fillStyle = '#9fe0d8'; if (st) g.fillText(st, VW / 2, y0 + 98);
  if (extra) { g.fillStyle = '#9db5d6'; g.fillText(extra, VW / 2, y0 + 120); }
}
// shop screen: list with a scroll, the selected item and its price
function drawShop(g) {
  const list = shopList(), VIS = 4, ROW = 56, Y0 = 126, t = G.t, n = list.length + 1;
  g.fillStyle = 'rgba(0,0,0,0.62)'; g.fillRect(0, 0, VW, VH);
  drawPanel(g, 130, 26, VW - 260, 488);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(30, '700'); textShadow(g, shopTitle(), VW / 2, 62, '#eef5ff');
  g.font = font(22, '700'); g.textAlign = 'right'; g.direction = 'ltr';
  g.fillStyle = '#ffe9a0'; g.fillText(P.geo + '  ' + tr('geo'), VW - 170, 62);
  for (let i = G.shopTop; i < Math.min(n, G.shopTop + VIS); i++) {
    const y = Y0 + (i - G.shopTop) * ROW, on = G.menuSel === i;
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(160, y - 26, VW - 320, 52); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(160.5, y - 25.5, VW - 321, 51); }
    if (i === list.length) {
      setDir(g); g.textAlign = 'center'; g.font = font(24, '700'); g.fillStyle = on ? '#ffffff' : 'rgba(190,205,225,0.8)'; g.fillText(tr('leave'), VW / 2, y);
      continue;
    }
    const it = list[i], sold = shopSold(it), lock = !sold && shopLocked(it);
    if (it.charm) Art.drawCharm(g, it.charm, 202, y, 21, { dim: sold || lock });
    else if (it.gear) gearIcon(g, it.gear, 202, y, 22, t, sold || lock);
    else shopIcon(g, it.icon, 202, y);
    setDir(g); g.textAlign = 'center'; g.font = font(22, '700'); g.fillStyle = sold || lock ? '#6d7a8c' : '#eef5ff'; g.fillText(shopName(it), VW / 2, y - 8);
    g.font = font(14, '500'); g.fillStyle = lock ? '#d8a070' : '#9db5d6';
    const sub = lock ? lockText(it) : it.gear ? Gear.stats(...it.gear) || Gear.desc(...it.gear) : shopDesc(it);
    if (it.gear && !lock) g.direction = 'ltr';
    g.fillText(sub, VW / 2, y + 15);
    setDir(g); g.textAlign = 'right'; g.direction = 'ltr'; g.font = font(21, '700');
    g.fillStyle = sold ? '#6d7a8c' : lock ? '#6d7a8c' : (P.geo >= shopPrice(it) ? '#ffe9a0' : '#c77');
    g.fillText(sold ? tr('soldout') : shopPrice(it) + ' ' + tr('price'), VW - 180, y);
  }
  g.fillStyle = 'rgba(230,240,255,0.55)';
  if (G.shopTop > 0) { g.beginPath(); g.moveTo(VW / 2 - 8, 104); g.lineTo(VW / 2 + 8, 104); g.lineTo(VW / 2, 95); g.fill(); }
  if (G.shopTop + VIS < n) { g.beginPath(); g.moveTo(VW / 2 - 8, Y0 + VIS * ROW - 18); g.lineTo(VW / 2 + 8, Y0 + VIS * ROW - 18); g.lineTo(VW / 2, Y0 + VIS * ROW - 9); g.fill(); }
  // detail of the selected item
  const sel = list[G.menuSel];
  if (sel) {
    if (sel.gear) {
      const [kind, id] = sel.gear, cur = kind === 'weapon' ? Gear.weapon() : kind === 'cloak' ? Gear.cloak() : null;
      drawGearDetail(g, kind, id, 364, 144, cur && cur !== id && !shopSold(sel) ? sx('المجهّز الآن: ', 'Equipped now: ') + Gear.name(kind, cur) : '');
    } else {
      drawPanel(g, 160, 364, VW - 320, 144);
      setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(20, '700'); g.fillStyle = '#ffe9a0'; g.fillText(shopName(sel), VW / 2, 388);
      g.font = font(16, '500'); g.fillStyle = '#dfe9f6'; wrapText(g, shopDesc(sel), VW - 380).slice(0, 3).forEach((l, i) => g.fillText(l, VW / 2, 420 + i * 22));
    }
  }
}

// ---------------------------------------------------------------- the equipment screen (pause menu)
const GEAR_TABS = ['weapon', 'cloak', 'art'];
const gearTabName = k => ({ weapon: sx('الأسلحة', 'Blades'), cloak: sx('العباءات', 'Cloaks'), art: sx('فنون النصل', 'Nail arts') }[k]);
// rows of the current tab (arts are all listed, the rest only when owned)
function gearRows() {
  const kind = GEAR_TABS[G.gearTab];
  return Gear.ORDER[kind].filter(id => kind === 'art' || Gear.owns(kind, id)).map(id => ({ kind, id }));
}
// equipment screen input
function updateGear(dt) {
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'pause'; Input.consume('pause'); Input.consume('map'); Sound.play('select'); return; }
  G.gearT = (G.gearT || 0) + dt;
  if (Input.pressed('left')) { G.gearTab = (G.gearTab + 2) % 3; G.gearSel = 0; Sound.play('select'); }
  if (Input.pressed('right')) { G.gearTab = (G.gearTab + 1) % 3; G.gearSel = 0; Sound.play('select'); }
  const rows2 = gearRows(), n2 = rows2.length;
  if (!n2) return;
  G.gearSel = clamp(G.gearSel, 0, n2 - 1);
  if (Input.pressed('up')) { G.gearSel = (G.gearSel + n2 - 1) % n2; Sound.play('select'); }
  if (Input.pressed('down')) { G.gearSel = (G.gearSel + 1) % n2; Sound.play('select'); }
  if (Input.pressed('confirm')) {
    const r = rows2[G.gearSel];
    if (r.kind !== 'art' && Gear.equip(r.kind, r.id)) { Sound.play('equip'); G.toastMsg(sx('جُهّز: ', 'Equipped: ') + Gear.name(r.kind, r.id), 1.4); }
  }
}
function drawGear(g) {
  g.fillStyle = 'rgba(3,5,10,0.96)'; g.fillRect(0, 0, VW, VH);
  const t = G.t, ar = LANG.cur === 'ar';
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, sx('المعدات', 'Equipment'), VW / 2, 34, '#eef5ff');
  // left: the Wanderer as equipped, large
  drawPanel(g, 40, 70, 290, 440);
  g.save(); g.beginPath(); g.rect(46, 76, 278, 428); g.clip();
  const bg = g.createRadialGradient(185, 330, 10, 185, 330, 240); bg.addColorStop(0, 'rgba(70,90,130,0.55)'); bg.addColorStop(1, 'rgba(8,12,22,0.1)'); g.fillStyle = bg; g.fillRect(46, 76, 278, 428);
  g.fillStyle = 'rgba(0,0,0,0.4)'; ellipse(g, 185, 392, 70, 10); g.fill();
  Art.drawHeroPreview(g, 185, 392, 3.6, t);
  g.restore();
  setDir(g); g.textAlign = 'center'; g.font = font(15, '600'); g.fillStyle = '#c8d6ec';
  g.fillText(sx('ضرر الضربة: ', 'Strike damage: ') + P.nailDamage() + '   ' + sx('ضربات في الثانية: ', 'Strikes/s: ') + (1 / P.strikeGap()).toFixed(1), 185, 450);
  g.fillText(sx('الجري: ', 'Run: ') + Math.round(100 * Gear.speedK()) + '%   ' + sx('التحصين بعد الإصابة: ', 'Grace after a wound: ') + (1.4 * Gear.hurtK()).toFixed(1) + sx(' ث', ' s'), 185, 476);
  // right: tabs and the list
  const kind = GEAR_TABS[G.gearTab], rows = gearRows();
  const tw = 190;
  GEAR_TABS.forEach((k, i) => {
    const x = 350 + i * (tw + 8), on = i === G.gearTab;
    g.fillStyle = on ? 'rgba(230,240,255,0.18)' : 'rgba(10,16,28,0.8)'; g.fillRect(x, 70, tw, 34);
    g.strokeStyle = on ? 'rgba(230,240,255,0.85)' : 'rgba(150,170,200,0.3)'; g.lineWidth = on ? 2 : 1; g.strokeRect(x + 0.5, 70.5, tw - 1, 33);
    setDir(g); g.textAlign = 'center'; g.font = font(17, '700'); g.fillStyle = on ? '#ffffff' : '#8a9ab4'; g.fillText(gearTabName(k), x + tw / 2, 88);
  });
  drawPanel(g, 350, 110, 570, 266);
  const VIS = 4, ROW = 60, top = clamp(G.gearSel - VIS + 1, 0, Math.max(0, rows.length - VIS));
  for (let i = top; i < Math.min(rows.length, top + VIS); i++) {
    const r = rows[i], y = 142 + (i - top) * ROW, on = i === G.gearSel, owned = r.kind === 'art' ? Gear.hasArt(r.id) : true;
    const worn = r.kind === 'weapon' ? Gear.weapon() === r.id : r.kind === 'cloak' ? Gear.cloak() === r.id : false;
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(366, y - 28, 538, 56); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(366.5, y - 27.5, 537, 55); }
    gearIcon(g, [r.kind, r.id], 404, y, 24, t, !owned);
    setDir(g); g.textAlign = 'left'; g.direction = ar ? 'rtl' : 'ltr';
    g.textAlign = ar ? 'right' : 'left';
    const tx = ar ? 892 : 440;
    g.font = font(21, '700'); g.fillStyle = owned ? '#eef5ff' : '#6d7a8c'; g.fillText(owned ? Gear.name(r.kind, r.id) : '؟؟؟  ' + Gear.name(r.kind, r.id), tx, y - 9);
    g.font = font(14, '500'); g.fillStyle = '#9db5d6'; g.direction = 'ltr';
    const sub = r.kind === 'art' ? (owned ? sx('تعلّمتَه', 'Learned') : sx('يعلّمه الحدّاد', 'Taught by the smith')) : Gear.stats(r.kind, r.id) || Gear.desc(r.kind, r.id);
    g.direction = ar && r.kind === 'art' ? 'rtl' : 'ltr'; g.fillText(sub, tx, y + 14);
    if (worn) { g.textAlign = ar ? 'left' : 'right'; setDir(g); g.font = font(15, '700'); g.fillStyle = '#9ff0a8'; g.fillText('✓ ' + sx('مجهّز', 'Equipped'), ar ? 452 : 888, y); }
  }
  g.fillStyle = 'rgba(230,240,255,0.55)';
  if (top > 0) { g.beginPath(); g.moveTo(VW / 2 + 150, 118); g.lineTo(VW / 2 + 166, 118); g.lineTo(VW / 2 + 158, 110); g.fill(); }
  if (top + VIS < rows.length) { g.beginPath(); g.moveTo(VW / 2 + 150, 370); g.lineTo(VW / 2 + 166, 370); g.lineTo(VW / 2 + 158, 378); g.fill(); }
  // the selected one in words
  const sel = rows[G.gearSel];
  drawPanel(g, 350, 384, 570, 126);
  setDir(g); g.textAlign = 'center';
  if (sel) {
    const owned = sel.kind === 'art' ? Gear.hasArt(sel.id) : true;
    g.font = font(20, '700'); g.fillStyle = '#ffe9a0'; g.fillText(Gear.name(sel.kind, sel.id), 635, 410);
    g.font = font(16, '500'); g.fillStyle = '#dfe9f6'; wrapText(g, Gear.desc(sel.kind, sel.id), 520).slice(0, 3).forEach((l, i) => g.fillText(l, 635, 440 + i * 22));
    if (sel.kind === 'art' && owned) {
      g.font = font(14, '600'); g.fillStyle = '#9fe0d8'; setDir(g);
      g.fillText({ rend: sx('اضغط X مطوّلاً ثم اتركه', 'Hold X, then release'), rush: sx('C ثم X وأنت مندفع', 'C, then X while dashing'), nova: sx('X + F معاً (66 روح)', 'X + F together (66 soul)') }[sel.id], 635, 494);
    }
  } else { g.font = font(18, '500'); g.fillStyle = '#6d7a8c'; g.fillText(sx('لا شيء هنا بعد', 'Nothing here yet'), 635, 450); }
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.direction = ar ? 'rtl' : 'ltr';
  g.fillText(sx('← → تبويب    ↑ ↓ اختيار    Z تجهيز    Esc رجوع', '← → tab    ↑ ↓ select    Z equip    Esc back'), VW / 2, VH - 16);
}
