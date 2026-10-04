'use strict';
// Equipment: the weapon in the hand, the cloak and the nail arts. Bought from the smith, the
// outfitter and the traders; the player reads the numbers through Gear.*. Saved with the game.
const Gear = (() => {
  // dmg: multiplies the nail's damage; reach: multiplies the strike's length; cd: seconds between
  // strikes; h: height of the strike box; kb: knockback dealt; soul: extra soul per hit
  const WEAPONS = {
    nail:      { color: '#e6eef7', dmg: 1,    reach: 1,    cd: 0.34, h: 52, kb: 1,   soul: 0, ar: 'مسمار الغسق', en: 'Dusk Nail',     dAr: 'نصلك الأول. متوازن في كل شيء.', dEn: 'Your first blade. Balanced in everything.' },
    duskblade: { color: '#9ad0ff', dmg: 1.15, reach: 1.12, cd: 0.30, h: 54, kb: 1,   soul: 0, ar: 'نصل الغسق', en: 'Duskblade',       dAr: 'أخفّ وأحدّ من المسمار وأبعد قليلاً.', dEn: 'Lighter and keener than the nail, and reaches a little further.' },
    lance:     { color: '#bfe8d8', dmg: 0.95, reach: 1.5,  cd: 0.36, h: 36, kb: 0.8, soul: 0, ar: 'رمح الريح', en: 'Gale Lance',      dAr: 'طويل ونحيل: يطعن من بعيد ويصيب خطاً ضيقاً.', dEn: 'Long and lean: it stabs from afar along a narrow line.' },
    fangs:     { color: '#d8c8ff', dmg: 0.6,  reach: 0.78, cd: 0.17, h: 50, kb: 0.6, soul: 3, ar: 'نابا التوأم', en: 'Twin Fangs',    dAr: 'ضربات خاطفة تملأ الروح، لكنها قصيرة المدى.', dEn: 'Lightning strikes that gather soul, but at short range.' },
    cleaver:   { color: '#ff9a50', dmg: 1.9,  reach: 1.15, cd: 0.60, h: 66, kb: 1.7, soul: 0, ar: 'ساطور الجمر', en: 'Ember Cleaver', dAr: 'ثقيل وبطيء، وكل ضربة تهزّ العدو وتطرحه بعيداً.', dEn: 'Heavy and slow; every blow rocks the foe and throws it back.' },
    scythe:    { color: '#cfe0ff', dmg: 1.35, reach: 1.38, cd: 0.40, h: 74, kb: 1.1, soul: 4, ar: 'منجل القمر', en: 'Moon Scythe',     dAr: 'قوس واسع يلتقط الأعداء مجتمعين ويملأ الروح.', dEn: 'A wide arc that catches foes in crowds and gathers soul.' },
    rapier:    { color: '#ffe9a0', dmg: 1.3,  reach: 1.3,  cd: 0.22, h: 40, kb: 0.7, soul: 2, ar: 'سيف النجوم', en: 'Star Rapier',      dAr: 'نصل المرصد: سريع وطويل وقاتل، غالٍ على من يحمله.', dEn: "The Observatory's blade: quick, long and deadly." },
    bonesaw:   { color: '#e8dcc0', dmg: 1.6,  reach: 1.05, cd: 0.42, h: 58, kb: 1.3, soul: 0, ar: 'منشار العظام', en: 'Bone Saw',     dAr: 'أسنانه تنهش، فكل ضربة تترك على العدو نزفاً.', dEn: 'Its teeth bite: each strike leaves the foe bleeding.' },
  };
  // speed: run speed; hurtK: how long you stay unhurtable after a wound; kbK: knockback taken; dashK: dash cooldown;
  // soul: soul gathered; focus: time to heal; dmg: damage dealt; ice: grips ice; dashHit: damages what it dashes through;
  // frost: stuns the foes around when you are wounded
  const CLOAKS = {
    drifter:    { color: '#26304a', trim: '#36cfc2', ar: 'عباءة الهائم', en: "Drifter's Cloak", dAr: 'عباءتك القديمة. لا شيء فيها سوى الدفء.', dEn: 'Your old cloak. Nothing but warmth.' },
    ironhide:   { color: '#7a8296', trim: '#c8d0e0', speed: 0.94, hurtK: 1.5, kbK: 0.55, ar: 'عباءة الحديد', en: 'Ironhide Cloak', dAr: 'صفائح الحديد: تبقى محصّناً أطول بعد الإصابة ولا تُقذف بعيداً، لكنك أبطأ.', dEn: 'Iron plates: you stay untouchable longer after a wound and are thrown less, but you move slower.' },
    windweave:  { color: '#2f6f78', trim: '#9ffff0', speed: 1.1, dashK: 0.75, ar: 'عباءة النسيم', en: 'Windweave', dAr: 'نسيج خفيف: تجري أسرع وتندفع من جديد بعد وقت أقصر.', dEn: 'A light weave: you run faster and can dash again sooner.' },
    soulveil:   { color: '#4a3a78', trim: '#cfa8ff', soul: 1.4, focus: 0.88, ar: 'حجاب الأرواح', en: 'Soulveil', dAr: 'يجمع الروح بنهم: كل ضربة تملأ أكثر ويكتمل الشفاء أسرع.', dEn: 'It drinks soul hungrily: each blow gathers more, and healing finishes sooner.' },
    emberweave: { color: '#6a2a1c', trim: '#ff9a50', dashHit: true, ar: 'عباءة الجمر', en: 'Embercloak', dAr: 'جمر في الأطراف: اندفاعك يحرق كل ما تمرّ من خلاله.', dEn: 'Embers at the hem: your dash scorches everything you pass through.' },
    frostfur:   { color: '#cfe0f4', trim: '#ffffff', ice: true, frost: true, ar: 'فرو الصقيع', en: 'Frostfur', dAr: 'لا تنزلق على الجليد، وإذا جُرحتَ جمّد البرد من حولك لحظة.', dEn: 'You never slip on ice, and when you are wounded the cold freezes those around you for a moment.' },
    duskmantle: { color: '#1a1030', trim: '#ffd890', dmg: 1.1, speed: 1.06, hurtK: 1.25, soul: 1.15, ar: 'رداء الغسق', en: 'Duskmantle', dAr: 'رداء الملوك الساقطين: يزيد ضربتك وسرعتك وتحصينك وروحك قليلاً.', dEn: 'The cloak of fallen kings: a little more damage, speed, grace and soul.' },
    boneward:   { color: '#d8cfba', trim: '#6a5a44', hurtK: 1.2, kbK: 0.7, soul: 1.1, ar: 'درع العظام', en: 'Boneward', dAr: 'عظام الموتى على كتفيك: تحصين أطول وارتداد أقل وروح أكثر.', dEn: 'The dead on your shoulders: longer grace, less recoil, a little more soul.' },
  };
  // the arts of the nail
  const ARTS = {
    rend: { color: '#d8e8ff', ar: 'تمزيق القمر', en: 'Moon Rend', dAr: 'اضغط الضربة مطوّلاً حتى يلمع النصل ثم اتركها: هلال قمري هائل يخترق الأعداء كلهم.', dEn: 'Hold the strike until the blade gleams, then let go: a vast moon crescent cuts through every foe.' },
    rush: { color: '#ffc070', ar: 'اندفاع الغسق', en: 'Dusk Rush', dAr: 'اضغط الضربة وأنت مندفع: تشقّ طريقك بنصلك مرات متتالية وأنت محصّن.', dEn: 'Strike while dashing: you carve through foes again and again, untouchable all the while.' },
    nova: { color: '#9cf0ff', ar: 'نجم الروح', en: 'Soul Nova', dAr: 'بروح ممتلئة (66) اضغط الضربة والتعويذة معاً: انفجار يمحو ما حولك ويبدّد كل المقذوفات.', dEn: 'With 66 soul, press strike and spell together: a blast that tears everything near and wipes every projectile away.' },
  };
  // soul cost of Soul Nova, charge time of Moon Rend, length of Dusk Rush (seconds)
  const NOVA_COST = 66, REND_CHARGE = 0.62, RUSH_TIME = 0.3;

  // own: what has been bought, cur: what is equipped
  let own = { w: { nail: true }, c: { drifter: true }, a: {} }, cur = { w: 'nail', c: 'drifter' };
  // helpers to look things up by kind (weapon / cloak / art)
  const lang = () => (LANG.cur === 'ar' ? 'ar' : 'en');
  const TABLE = { weapon: WEAPONS, cloak: CLOAKS, art: ARTS };
  const KEY = { weapon: 'w', cloak: 'c', art: 'a' };

  // text and data of an item for the current language
  const def = (kind, id) => TABLE[kind][id];
  const name = (kind, id) => TABLE[kind][id][lang()];
  const desc = (kind, id) => TABLE[kind][id][lang() === 'ar' ? 'dAr' : 'dEn'];
  const owns = (kind, id) => !!own[KEY[kind]][id];
  // add an item to what is owned
  const give = (kind, id) => {
    if (!TABLE[kind][id] || own[KEY[kind]][id]) return false;
    own[KEY[kind]][id] = true; return true;
  };
  // put on an owned weapon or cloak (arts are not equipped)
  const equip = (kind, id) => {
    if (kind === 'art' || !owns(kind, id)) return false;
    cur[KEY[kind]] = id; return true;
  };
  const ownedList = kind => Object.keys(TABLE[kind]).filter(id => owns(kind, id));

  // the equipped weapon and cloak; k() reads a cloak multiplier, 1 when it has none
  const wep = () => WEAPONS[cur.w];
  const clk = () => CLOAKS[cur.c];
  const k = (o, f) => (o[f] === undefined ? 1 : o[f]);

  // new game: back to the nail and the drifter's cloak
  function reset() { own = { w: { nail: true }, c: { drifter: true }, a: {} }; cur = { w: 'nail', c: 'drifter' }; }
  // save file data
  const save = () => ({ w: Object.keys(own.w), c: Object.keys(own.c), a: Object.keys(own.a), cw: cur.w, cc: cur.c });
  function load(d) {
    reset();
    if (!d) return;
    for (const id of d.w || []) if (WEAPONS[id]) own.w[id] = true;
    for (const id of d.c || []) if (CLOAKS[id]) own.c[id] = true;
    for (const id of d.a || []) if (ARTS[id]) own.a[id] = true;
    if (own.w[d.cw]) cur.w = d.cw;
    if (own.c[d.cc]) cur.c = d.cc;
  }

  // public api
  return {
    WEAPONS, CLOAKS, ARTS, NOVA_COST, REND_CHARGE, RUSH_TIME, ORDER: { weapon: Object.keys(WEAPONS), cloak: Object.keys(CLOAKS), art: Object.keys(ARTS) },
    def, name, desc, owns, give, equip, ownedList, reset, save, load,
    weapon: () => cur.w, cloak: () => cur.c, w: wep, c: clk,
    hasArt: id => !!own.a[id],
    // a line of numbers for the shop and the equipment screen
    stats(kind, id) {
      const d = def(kind, id), ar = lang() === 'ar', x = v => '×' + v.toFixed(2);
      if (kind === 'weapon') return [(ar ? 'الضرر ' : 'Damage ') + x(d.dmg), (ar ? 'المدى ' : 'Reach ') + x(d.reach), (ar ? 'السرعة ' : 'Speed ') + x(0.34 / d.cd)].concat(d.soul ? [(ar ? 'روح ' : 'Soul ') + '+' + d.soul] : []).join('   ');
      if (kind !== 'cloak') return '';
      const out = [];
      if (d.speed) out.push((ar ? 'الجري ' : 'Run ') + x(d.speed));
      if (d.dashK) out.push((ar ? 'الاندفاع ' : 'Dash wait ') + x(d.dashK));
      if (d.hurtK) out.push((ar ? 'التحصين ' : 'Grace ') + x(d.hurtK));
      if (d.kbK) out.push((ar ? 'الارتداد ' : 'Recoil ') + x(d.kbK));
      if (d.soul) out.push((ar ? 'الروح ' : 'Soul ') + x(d.soul));
      if (d.focus) out.push((ar ? 'الشفاء ' : 'Heal time ') + x(d.focus));
      if (d.dmg) out.push((ar ? 'الضرر ' : 'Damage ') + x(d.dmg));
      return out.join('   ');
    },
    // ---- numbers read by the Player ----
    dmgK: () => wep().dmg * k(clk(), 'dmg'),
    reachK: () => wep().reach,
    atkCD: () => wep().cd,
    boxH: () => wep().h,
    kbK: () => wep().kb,
    soulBonus: () => wep().soul,
    speedK: () => k(clk(), 'speed'),
    hurtK: () => k(clk(), 'hurtK'),
    takenKbK: () => k(clk(), 'kbK'),
    dashK: () => k(clk(), 'dashK'),
    soulK: () => k(clk(), 'soul'),
    focusK: () => k(clk(), 'focus'),
    iceGrip: () => !!clk().ice,
    dashHit: () => !!clk().dashHit,
    frost: () => !!clk().frost,
    bleeds: () => cur.w === 'bonesaw',
  };
})();
