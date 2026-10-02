'use strict';
// Charms: small relics the Wanderer wears on the cloak. Each one costs notches. The notches grow
// with the seals of the guardians and with the merchant. Wearing more than the notches allow
// "overcharms" the Wanderer: every wound then costs double. Charms can be changed only while
// resting on a bench. The effects themselves are read by the Player and the Geo pickups through
// Charms.has(id); this file holds the list, the notch rules and the save data.
const Charms = (() => {
  const BASE_NOTCHES = 3;
  const DEFS = {
    reach:      { cost: 1, color: '#cfe6ff', ar: 'نصل طويل', en: 'Long Edge', dAr: 'ضربتك تمتد أبعد بثلث.', dEn: 'Your strike reaches a third further.' },
    swift:      { cost: 2, color: '#bfe8ff', ar: 'ضربة الريح', en: 'Gale Strike', dAr: 'تضرب أسرع بكثير.', dEn: 'You strike much faster.' },
    siphon:     { cost: 2, color: '#a9d4ff', ar: 'ماصّة الروح', en: 'Soul Siphon', dAr: 'كل ضربة تملأ روحاً أكثر.', dEn: 'Every strike gathers more soul.' },
    focus:      { cost: 3, color: '#ffe9a0', ar: 'تركيز سريع', en: 'Swift Focus', dAr: 'تشفي جراحك أسرع.', dEn: 'You heal much faster.' },
    deep:       { cost: 4, color: '#ffd070', ar: 'تركيز عميق', en: 'Deep Focus', dAr: 'الشفاء أبطأ لكنه يشفي قناعين دفعة واحدة.', dEn: 'Healing is slower but mends two masks at once.' },
    thorn:      { cost: 1, color: '#b6ef6a', ar: 'عباءة الشوك', en: 'Thorn Mantle', dAr: 'عندما تُصاب تنفجر الأشواك وتؤذي من حولك.', dEn: 'When you are hurt, thorns burst out and wound those around you.' },
    boots:      { cost: 1, color: '#9dff9a', ar: 'حذاء الريح', en: 'Wind Boots', dAr: 'تجري أسرع.', dEn: 'You run faster.' },
    dashmaster: { cost: 2, color: '#ff9c5a', ar: 'سيّد الاندفاع', en: 'Dash Master', dAr: 'تندفع من جديد بعد وقت أقصر.', dEn: 'You can dash again much sooner.' },
    mage:       { cost: 3, color: '#c8a8ff', ar: 'حجر الساحر', en: 'Mage Stone', dAr: 'تعاويذك تؤذي أكثر بنسبة أربعين بالمئة.', dEn: 'Your spells hurt forty percent more.' },
    spirit:     { cost: 1, color: '#ff9bd6', ar: 'صدى الألم', en: 'Pain Echo', dAr: 'جروحك تملأ روحك.', dEn: 'Your wounds gather soul.' },
    magnet:     { cost: 1, color: '#ffe9a0', ar: 'مغناطيس الجيو', en: 'Geo Magnet', dAr: 'ينجذب الجيو إليك من بعيد.', dEn: 'Geo drifts toward you from afar.' },
    thrift:     { cost: 2, color: '#8fe0ff', ar: 'اقتصاد الروح', en: 'Soul Thrift', dAr: 'التعاويذ والشفاء يكلّفون روحاً أقل.', dEn: 'Spells and healing cost less soul.' },
    fury:       { cost: 2, color: '#ff6a5a', ar: 'غضب الأخير', en: 'Last Fury', dAr: 'حين يبقى لك قناع واحد تصير ضربتك أقوى بكثير.', dEn: 'With a single mask left, your strike hits far harder.' },
    soles:      { cost: 1, color: '#bfe8ff', ar: 'نعل المسامير', en: 'Spiked Soles', dAr: 'تثبت قدماك على الجليد فلا تنزلق.', dEn: 'Your feet grip the ice: no more sliding.' },
    wick:       { cost: 1, color: '#ffd890', ar: 'فتيل الفانوس', en: 'Lantern Wick', dAr: 'يتسع ضوء فانوسك فترى أبعد في العتمة.', dEn: 'Your lantern burns wider: you see further in the dark.' },
    cinder:     { cost: 2, color: '#ff8a4a', ar: 'نصل الجمر', en: 'Cinder Edge', dAr: 'ضرباتك تترك حرقاً يؤذي العدو بعد لحظة.', dEn: 'Your strikes leave a burn that wounds the enemy a moment later.' },
    shell:      { cost: 2, color: '#d8c8a0', ar: 'درع الصدفة', en: 'Shell Ward', dAr: 'بعد الراحة على المقعد تصدّ أول إصابة.', dEn: 'After resting on a bench, it turns aside the first wound.' },
  };
  const ORDER = Object.keys(DEFS);

  let owned = {}, worn = [], shell = false;

  const name = id => DEFS[id][LANG.cur === 'ar' ? 'ar' : 'en'];
  const desc = id => DEFS[id][LANG.cur === 'ar' ? 'dAr' : 'dEn'];
  const has = id => worn.indexOf(id) >= 0;
  const used = () => worn.reduce((s, id) => s + DEFS[id].cost, 0);
  // three to begin with, one more for every two guardians' seals, and up to two from the merchant
  const notches = () => BASE_NOTCHES + Math.floor(sealCount() / 2) + (G.flags.buy_notch1 ? 1 : 0) + (G.flags.buy_notch2 ? 1 : 0);
  const over = () => used() > notches();
  const ownedList = () => ORDER.filter(id => owned[id]);

  function give(id) {
    if (!DEFS[id] || owned[id]) return false;
    owned[id] = true; return true;
  }
  // Wear or remove a charm. Returns 'on', 'over' (worn, but now overcharmed), 'off', 'full' (already
  // overcharmed, so nothing more fits) or 'none' (not owned).
  function toggle(id) {
    if (!owned[id]) return 'none';
    const i = worn.indexOf(id);
    if (i >= 0) { worn.splice(i, 1); return 'off'; }
    if (used() > notches()) return 'full';
    worn.push(id);
    return used() > notches() ? 'over' : 'on';
  }

  // Shell Ward: armed by resting, spent by the next wound.
  function rest() { shell = has('shell'); }
  function absorb() {
    if (!shell || !has('shell')) return false;
    shell = false; return true;
  }

  function reset() { owned = {}; worn = []; shell = false; }
  function save() { return { o: ORDER.filter(id => owned[id]), w: worn.slice() }; }
  function load(d) {
    reset();
    if (!d) return;
    for (const id of d.o || []) if (DEFS[id]) owned[id] = true;
    for (const id of d.w || []) if (owned[id] && worn.indexOf(id) < 0) worn.push(id);
  }

  return { DEFS, ORDER, name, desc, has, used, notches, over, ownedList, give, toggle, rest, absorb, reset, save, load, shellUp: () => shell && has('shell') };
})();
