'use strict';
// Arabic / English strings. Default language is Arabic; toggle with L on the title screen.
const LANG = { cur: 'ar' };
try { const l = localStorage.getItem('duskwell_lang'); if (l === 'en' || l === 'ar') LANG.cur = l; } catch (e) { /* storage blocked */ }

const STR = {
  ar: {
    title: 'أرض الغسق', subtitle: 'مملكة سقط نورها في الأعماق',
    press: 'اضغط Z أو Enter للبدء', cont: 'متابعة', newgame: 'لعبة جديدة', lang: 'English',
    confirmNew: 'سيُحذف التقدم المحفوظ. متأكد؟', yes: 'نعم', no: 'لا',
    pause: 'إيقاف مؤقت', resume: 'متابعة', map: 'الخريطة', sound: 'الصوت', on: 'يعمل', off: 'متوقف', quit: 'العودة للقائمة',
    controls: 'الأزرار', ctl: '← → حركة   Z قفز   X ضربة   C اندفاع   F كرة روح (اضغط) / شفاء (اضغط مطولاً)   ↑ جلوس وتفاعل   Tab خريطة',
    geo: 'جيو', soul: 'الروح', youDied: 'سقطتَ في الظلام', shadowHere: 'ظلّك ينتظر حيث سقطت',
    saved: 'تم الحفظ', rest: 'استرح', talk: 'تحدّث', read: 'اقرأ', buy: 'شراء', soldout: 'نفد', price: 'جيو',
    shopTitle: 'التاجر الغريب', leave: 'مغادرة', noGeo: 'لا يكفي الجيو',
    itemMask: 'قناع إضافي', itemNail: 'نصل مشحوذ', itemSoul: 'قلب الروح',
    itemMaskD: 'يزيد صحتك القصوى بواحد', itemNailD: 'ضربتك تؤذي أكثر', itemSoulD: 'كل ضربة تملأ روحاً أكثر',
    shadowKilled: 'استعدتَ الجيو من ظلّك',
    abil_dash: 'اندفاع الظل', abil_dash_d: 'اضغط C لتنطلق بسرعة. يمكنك الاندفاع في الهواء مرة واحدة.',
    abil_wall: 'مخلب الجدار', abil_wall_d: 'التصق بالجدران واقفز عنها بالضغط على Z.',
    abil_double: 'أجنحة الغسق', abil_double_d: 'اضغط Z مرة ثانية في الهواء للقفز قفزة إضافية.',
    seed: 'بذرة القناع', seed_d: 'صحتك القصوى زادت بواحد.',
    cache: 'كنز مخبّأ', cache_d: 'وجدتَ كمية من الجيو.',
    area_hushvale: 'وادي الهمس', area_crossroads: 'مفترق الأعماق', area_mossgrove: 'بستان الطحلب',
    area_crystal: 'أبراج البلّور', area_throne: 'العرش المجوّف',
    boss_guardian: 'الحارس الحجري', boss_weaver: 'حائكة الأشواك', boss_wraith: 'شبح البلّور', boss_king: 'الملك المجوّف',
    endTitle: 'انتهت الرحلة', endText: 'خمد صدى العرش المجوّف، وعاد للمملكة بصيص نور.',
    endStats: 'الوقت', deaths: 'مرات السقوط', masks: 'الأقنعة', thanks: 'شكراً للعب. اضغط Z للعودة إلى القائمة.',
    sign_controls: 'لافتة: ← → للحركة، Z للقفز (اضغط مطولاً لقفزة أعلى)، X للضرب (مع ↑ أو ↓ لتغيير الاتجاه)، F كرة روح، واضغط F مطولاً للشفاء. ↑ عند المقعد للجلوس والحفظ. البئر في أقصى اليمين.',
    elder1: 'الشيخ: كان نور المملكة يسكن الأعماق قبل أن ينطفئ. نزل الملك المجوّف يبحث عنه فلم يعد.',
    elder2: 'الشيخ: اضرب الأعداء لتجمع الروح، ثم استعملها لتشفي جراحك. وإذا سقطتَ فسيحرس ظلّك ما معك من جيو.',
    elder3: 'الشيخ: حراسٌ أربعة يسدّون الطريق إلى العرش. كلٌّ منهم يحفظ قوة تحتاجها. انزل البئر وابدأ.',
    merchant: 'التاجر: هل معك جيو؟ عندي ما يساعدك في العتمة.',
    trap: 'تحذير: أنت في ساحة معركة. لا مفرّ حتى النهاية.',
  },
  en: {
    title: 'DUSKWELL', subtitle: 'A kingdom whose light fell into the deep',
    press: 'Press Z or Enter to begin', cont: 'Continue', newgame: 'New Game', lang: 'العربية',
    confirmNew: 'Saved progress will be erased. Sure?', yes: 'Yes', no: 'No',
    pause: 'Paused', resume: 'Resume', map: 'Map', sound: 'Sound', on: 'On', off: 'Off', quit: 'Back to Title',
    controls: 'Controls', ctl: 'Arrows move   Z jump   X strike   C dash   F soul bolt (tap) / heal (hold)   Up: sit / interact   Tab map',
    geo: 'Geo', soul: 'Soul', youDied: 'You fell into the dark', shadowHere: 'Your shade waits where you fell',
    saved: 'Saved', rest: 'Rest', talk: 'Talk', read: 'Read', buy: 'Buy', soldout: 'Sold out', price: 'Geo',
    shopTitle: 'The Odd Merchant', leave: 'Leave', noGeo: 'Not enough Geo',
    itemMask: 'Extra Mask', itemNail: 'Honed Nail', itemSoul: 'Soul Heart',
    itemMaskD: 'Raises max health by one', itemNailD: 'Your strike hurts more', itemSoulD: 'Each strike gathers more soul',
    shadowKilled: 'You took your Geo back from your shade',
    abil_dash: 'Shadow Dash', abil_dash_d: 'Press C to surge forward. You can dash once in mid-air.',
    abil_wall: 'Wall Claw', abil_wall_d: 'Cling to walls and leap off them with Z.',
    abil_double: 'Dusk Wings', abil_double_d: 'Press Z again in mid-air for an extra jump.',
    seed: 'Mask Seed', seed_d: 'Your maximum health rose by one.',
    cache: 'Hidden Cache', cache_d: 'You found a stash of Geo.',
    area_hushvale: 'Hushvale', area_crossroads: 'Sunken Crossroads', area_mossgrove: 'Mossgrove',
    area_crystal: 'Crystal Spires', area_throne: 'The Hollow Throne',
    boss_guardian: 'Stone Guardian', boss_weaver: 'Thornweaver', boss_wraith: 'Crystal Wraith', boss_king: 'The Hollow King',
    endTitle: 'The Journey Ends', endText: 'The echo of the Hollow Throne fades, and a glimmer of light returns to the kingdom.',
    endStats: 'Time', deaths: 'Falls', masks: 'Masks', thanks: 'Thanks for playing. Press Z to return to the title.',
    sign_controls: 'Sign: Arrows move, Z jumps (hold for height), X strikes (with Up or Down to aim), F casts a soul bolt, hold F to heal. Press Up at a bench to rest and save. The well is at the far right.',
    elder1: 'Elder: The kingdom\'s light lived in the deep until it went out. The Hollow King descended to find it and never returned.',
    elder2: 'Elder: Strike foes to gather soul, then spend it to mend your wounds. If you fall, your shade will guard your Geo.',
    elder3: 'Elder: Four guardians bar the road to the throne. Each keeps a power you will need. Go down the well.',
    merchant: 'Merchant: Got any Geo? I have things that help in the dark.',
    trap: 'Warning: this is a battle arena. There is no way out until the end.',
  },
};
function tr(k) { return (STR[LANG.cur] && STR[LANG.cur][k]) || STR.en[k] || k; }
function setLang(l) { LANG.cur = l; try { localStorage.setItem('duskwell_lang', l); } catch (e) { /* ignore */ } if (window.refreshTouchLabels) window.refreshTouchLabels(); }
const FONT_AR = '"Cairo","Noto Naskh Arabic","Segoe UI",Tahoma,sans-serif';
const FONT_EN = '"Cinzel","Trajan Pro","Palatino Linotype",Georgia,serif';
function font(px, weight) { return (weight || '700') + ' ' + px + 'px ' + (LANG.cur === 'ar' ? FONT_AR : FONT_EN); }
