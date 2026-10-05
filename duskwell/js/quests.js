'use strict';
// Side quests of the merchants, the travelling traders and the wizards. A person who has work for the hero says so with a gold ! over
// his head; the dialog then offers it (accept, shop, or not now). A quest is a list of steps, done one after the other:
//   collect  things lying in rooms (world_quests.js puts them there, and they are only there while the quest asks for them)
//   kill     so many creatures, of a kind or in an area
//   visit    enter these rooms (after taking the quest)
//   deliver  speak to this person (the words he answers with are in the step)
//   boss     a guardian beaten (the flag it sets)
// and then back to the one who gave it (a gold ? over his head). The state of every quest is in G.flags.qs, so it is saved with the game.
// A reward is geo and sometimes a perk (a flag, read by the shops, the geo that falls, the lantern fare and the spells).
const QT = (ar, en) => ({ ar, en });
const qtx = o => (o && typeof o === 'object' && !Array.isArray(o) ? o[LANG.cur === 'ar' ? 'ar' : 'en'] : o);
const qlines = o => { const v = qtx(o); return Array.isArray(v) ? v : [v]; };

const QUESTS = [
  // ---------------------------------------------------------------- the merchants and the traders
  { id: 'm1', giver: ['town', 'merchant'], title: QT('الحقائب المفقودة', 'The Lost Packs'),
    offer: QT(['التاجر الغريب: انقلبت عربتي في مفترق الأعماق وتناثرت حقائبي بين الممرات.', 'أحضر لي ثلاثاً منها وأدفع لك أجر التعب.'],
      ['Strange Merchant: My cart overturned in the Sunken Crossroads and my packs scattered along the passages.', 'Bring me three of them and I will pay you for the trouble.']),
    remind: QT('التاجر: ثلاث حقائب في ممرات المفترق. أسرع قبل أن تسبقك الوحوش.', 'Merchant: Three packs in the Crossroads\' passages. Hurry before the beasts get there first.'),
    done: QT('التاجر: كلها سليمة! خذ أجرك، وزدتُ عليه لأنك لم تفتح واحدة منها.', 'Merchant: All whole! Take your pay, and a little more because you opened none of them.'),
    steps: [{ t: 'collect', ids: ['qi_m1_a', 'qi_m1_b', 'qi_m1_c'], goal: QT('اجمع الحقائب الثلاث من ممرات مفترق الأعماق', 'Gather the three packs from the Crossroads\' passages') }],
    reward: { geo: 180 } },
  { id: 'm2', giver: ['town', 'merchant'], need: () => Quests.isDone('m1'), title: QT('كلمة الدفتر', 'The Ledger\'s Word'),
    offer: QT(['التاجر الغريب: بيني وبين تاجر بستان الطحلب دَين قديم نسيناه كلانا.', 'احمل إليه هذا الدفتر المختوم وعُد بجوابه، وسأخفّض لك أسعاري ما دمتَ حيّاً.'],
      ['Strange Merchant: There is an old debt between me and the Mossgrove trader, forgotten by us both.', 'Carry this sealed ledger to him and bring back his answer, and I will lower my prices for you as long as you live.']),
    remind: QT('التاجر: الدفتر لا يمشي وحده. اذهب إلى تاجر بستان الطحلب.', 'Merchant: The ledger will not walk by itself. Go to the Mossgrove trader.'),
    done: QT('التاجر: ضحك؟ لقد ضحك! إذن أُغلق الدفتر. من الآن أحسم عُشر الأسعار عندي وعند كل من يعرف اسمي.', 'Merchant: He laughed? Then the book is closed. From now on I take a tenth off every price, here and with all who know my name.'),
    steps: [{ t: 'deliver', to: ['mg2', 'merchant'], goal: QT('اذهب بالدفتر إلى تاجر بستان الطحلب', 'Take the ledger to the Mossgrove trader'),
      say: QT('تاجر البستان: دفتر شريكي القديم... فليكن، الدَّين مسدَّد. قل له إن الطحلب لا ينسى ولا يطالب. وخذ هذا الجواب.', 'Mossgrove Trader: My old partner\'s ledger... so be it, the debt is paid. Tell him moss forgets nothing and demands nothing. Take this reply.') }],
    reward: { geo: 100, perk: 'haggle' } },
  { id: 'm3', giver: ['mg2', 'merchant'], title: QT('الطحلب الجائع', 'The Hungry Moss'),
    offer: QT(['تاجر البستان: وحوش الطحلب تأكل بضاعتي قبل أن تصل إلى الزبائن.', 'اقتل عشرة منها هنا في البستان وأدفع لك بسخاء.'],
      ['Mossgrove Trader: The moss beasts eat my wares before they reach a customer.', 'Kill ten of them here in the grove and I will pay generously.']),
    remind: QT('تاجر البستان: ما زالوا يأكلون. كم بقي لك؟', 'Mossgrove Trader: They are still eating. How many have you left?'),
    done: QT('تاجر البستان: أخيراً سكتت أسنانهم! هذا ما وعدتك به.', 'Mossgrove Trader: At last their teeth are quiet! Here is what I promised.'),
    steps: [{ t: 'kill', area: 'mossgrove', n: 10, goal: QT('اقتل عشرة وحوش في بستان الطحلب', 'Kill ten creatures in the Mossgrove') }],
    reward: { geo: 220 } },
  { id: 'm4', giver: ['fr6', 'trader'], title: QT('دروب التجّار', 'The Traders\' Road'),
    offer: QT(['التاجر الجوّال: بيني وبين إخوتي الثلاثة عهد: كلٌّ يكتب إلى الآخر مع كل فصل.', 'خذ رسالتي إلى أخي في أعماق الجمر، وهو يدلّك على الباقين. وفي الآخر أجزل لك العطاء.'],
      ['Wandering Trader: My three brothers and I keep a pact: each writes to the next with every season.', 'Take my letter to my brother in Cinderdeep and he will point you to the rest. At the end I will reward you well.']),
    remind: QT('التاجر الجوّال: الرسائل لا تمشي وحدها. أين وصلتَ؟', 'Wandering Trader: Letters do not walk by themselves. Where have you got to?'),
    done: QT('التاجر الجوّال: الأربعة بخير؟ إذن اشتريتَ لنفسك صديقاً بين التجّار. خذ هذا، وسيترك لك كل شيء جيواً أكثر من الآن.', 'Wandering Trader: All four are well? Then you have bought yourself a friend among traders. Take this, and everything will leave you more geo from now on.'),
    steps: [
      { t: 'deliver', to: ['em6', 'trader'], goal: QT('اذهب بالرسالة إلى التاجر في أعماق الجمر', 'Take the letter to the trader in Cinderdeep'),
        say: QT('التاجر الجوّال: رسالة من أخي المتجمّد؟ أما زال يلبس الفرو في هذا الحر؟ خذ جوابي إلى أخينا عند العاصفة.', 'Wandering Trader: A letter from my frozen brother? Does he still wear furs in this heat? Take my answer to our brother at the storm.') },
      { t: 'deliver', to: ['sc6', 'trader'], goal: QT('اذهب إلى التاجر في ذرى العاصفة', 'Go to the trader in the Stormcrest'),
        say: QT('التاجر الجوّال: الريح أخبرتني بقدومك قبل أن تصل. هذه كلمتي لأخينا الأخير في قبو المرايا.', 'Wandering Trader: The wind told me you were coming before you arrived. Here is my word for our last brother in the Mirror Vault.') },
      { t: 'deliver', to: ['mv6', 'trader'], goal: QT('اذهب إلى التاجر في قبو المرايا', 'Go to the trader in the Mirror Vault'),
        say: QT('التاجر الجوّال: أخيراً! قل لأخينا المتجمّد إن الأربعة بخير، وإن عهدنا باقٍ ما بقي الغسق.', 'Wandering Trader: At last! Tell our frozen brother that all four are well, and that our pact lasts as long as the dusk.') }],
    reward: { geo: 500, perk: 'purse' } },
  { id: 'm5', giver: ['wd1', 'merchant'], title: QT('خيط الحرير', 'The Silk Spool'),
    offer: QT(['تاجر الأعماق المنسوجة: أحتاج خيطاً من حرير العناكب كي أخيط به عباءاتي.', 'هناك بكرة قديمة في أحد الممرات، واقتل ستة عناكب كي لا تعود إليها.'],
      ['Webbed Depths Trader: I need spider silk to sew my cloaks.', 'An old spool lies in one of the passages; and kill six spiders so they do not come back for it.']),
    remind: QT('تاجر الأعماق المنسوجة: البكرة والعناكب. لا شيء بغيرهما.', 'Webbed Depths Trader: The spool and the spiders. Nothing less.'),
    done: QT('تاجر الأعماق المنسوجة: ممتاز! سيدفئ هذا الخيط أكتاف زبائني. وهذا أجرك.', 'Webbed Depths Trader: Excellent! This thread will keep my customers\' shoulders warm. And here is your pay.'),
    steps: [{ t: 'collect', ids: ['qi_m5_a'], goal: QT('جد بكرة الحرير في ممرات الأعماق المنسوجة', 'Find the silk spool in the Webbed Depths\' passages') },
      { t: 'kill', area: 'webbed', kind: 'spider', n: 6, goal: QT('اقتل ستة عناكب في الأعماق المنسوجة', 'Kill six spiders in the Webbed Depths') }],
    reward: { geo: 260 } },
  { id: 'm6', giver: ['os3', 'merchant'], title: QT('العظام البيضاء', 'The White Bones'),
    offer: QT(['تاجر المقبرة: الموتى هنا لا يشترون شيئاً، لكن عظامهم تُباع بثمن جيد عند الحدّادين.', 'اجلب لي قطعتين نقيّتين من ممرات المقبرة، ولا تسألني لمن.'],
      ['Ossuary Trader: The dead here buy nothing, but their bones sell well to smiths.', 'Bring me two clean pieces from the Ossuary\'s passages, and do not ask me for whom.']),
    remind: QT('تاجر المقبرة: عظمتان. نقيّتان. لا أطلب أكثر من ذلك.', 'Ossuary Trader: Two bones. Clean ones. I ask no more than that.'),
    done: QT('تاجر المقبرة: جميلة... هذا أجرك، ونسِ أنك رأيتني.', 'Ossuary Trader: Lovely... here is your pay, and forget you ever saw me.'),
    steps: [{ t: 'collect', ids: ['qi_m6_a', 'qi_m6_b'], goal: QT('اجمع عظمتين نقيّتين من المقبرة العظمية', 'Gather two clean bones from the Ossuary') }],
    reward: { geo: 320 } },
  { id: 'm7', giver: ['lo3', 'merchant'], title: QT('عدسات المرصد', 'Lenses of the Observatory'),
    offer: QT(['تاجر المرصد: النجوم هنا تُرى بالعدسات، وعدساتي سُرقت أو تكسّرت مع السنين.', 'ابحث عن عدستين سليمتين في أروقة المرصد وأصلح بهما تجارتي.'],
      ['Observatory Trader: Stars are seen here through lenses, and mine were stolen or broken with the years.', 'Find two sound lenses in the Observatory\'s halls and I will mend my trade with them.']),
    remind: QT('تاجر المرصد: عدستان فقط. ولا تنظر فيهما طويلاً.', 'Observatory Trader: Just two lenses. And do not look through them for long.'),
    done: QT('تاجر المرصد: أرى الآن! كل شيء أوضح... حتى فقري. خذ أجرك.', 'Observatory Trader: I can see now! Everything is clearer... even my poverty. Take your pay.'),
    steps: [{ t: 'collect', ids: ['qi_m7_a', 'qi_m7_b'], goal: QT('ابحث عن عدستين في مرصد القمر', 'Find two lenses in the Lunar Observatory') }],
    reward: { geo: 420 } },
  // ---------------------------------------------------------------- the wizards
  { id: 'w1', giver: ['cx3', 'wizard'], title: QT('نُسغ الجذور', 'Sap of the Roots'),
    offer: QT(['الساحر: حبري ينفد. أحتاج ثلاث قوارير من نُسغ مضيء يتجمّع عند جذور بستان الطحلب.', 'أحضرها وأزيدك قوةً في تعاويذك.'],
      ['Sorcerer: My ink is running out. I need three flasks of glowing sap that gathers at the roots of the Mossgrove.', 'Bring them and I will add power to your spells.']),
    remind: QT('الساحر: ثلاث قوارير. إن كسرتَ واحدة فالبستان عامر بالنُسغ.', 'Sorcerer: Three flasks. If you break one, the grove is full of sap.'),
    done: QT('الساحر: يتوهّج كما ينبغي! خذ أجرك، ومن الآن تضرب تعاويذك أقوى بعُشر.', 'Sorcerer: It glows as it should! Take your pay, and from now on your spells strike a tenth harder.'),
    steps: [{ t: 'collect', ids: ['qi_w1_a', 'qi_w1_b', 'qi_w1_c'], goal: QT('اجمع ثلاث قوارير نُسغ مضيء من بستان الطحلب', 'Gather three flasks of glowing sap from the Mossgrove') }],
    reward: { geo: 200, perk: 'ink' } },
  { id: 'w2', giver: ['sp4', 'wizard'], title: QT('الرسالة المسحورة', 'The Enchanted Scroll'),
    offer: QT(['ساحر الأبواغ: لي زميل في القناة الغارقة يحفظ ما يتذكّره الماء، وأنا أحفظ ما تنساه الفطريات.', 'خذ إليه هذا اللفاف، وعُد بما يردّ به.'],
      ['Spore Sorcerer: I have a colleague in the Drowned Channel who keeps what water remembers, while I keep what fungi forget.', 'Take him this scroll and bring back what he answers.']),
    remind: QT('ساحر الأبواغ: اللفاف لا يحب الانتظار. إنه يهمس.', 'Spore Sorcerer: The scroll hates waiting. It whispers.'),
    done: QT('ساحر الأبواغ: الماء لا يغفر؟ كنتُ أظنه يتذكّر فقط. شكراً، وخذ أجرك.', 'Spore Sorcerer: Water does not forgive? I thought it only remembered. Thank you, and take your pay.'),
    steps: [{ t: 'deliver', to: ['aq4', 'wizard'], goal: QT('اذهب باللفاف إلى ساحر القناة الغارقة', 'Take the scroll to the sorcerer of the Sunken Aqueduct'),
      say: QT('ساحر القناة: لفاف من ساحر الأبواغ؟ ما زال يكتب بحبر الفطر... قل له: الماء يتذكّر ولا يغفر.', 'Aqueduct Sorcerer: A scroll from the Spore sorcerer? He still writes in mushroom ink... Tell him: water remembers and does not forgive.') }],
    reward: { geo: 280 } },
  { id: 'w3', giver: ['aq4', 'wizard'], need: () => Quests.isDone('w2'), title: QT('ما يتذكّره الماء', 'What the Water Remembers'),
    offer: QT(['ساحر القناة: الماء يتذكّر من يعبره، والوحوش هنا تتغذّى على هذه الذاكرة.', 'اقتل ثمانية منها في القناة فيصفو الماء، وأعلّمك طريقاً أقصر بين الفوانيس.'],
      ['Aqueduct Sorcerer: Water remembers who crosses it, and the beasts here feed on that memory.', 'Kill eight of them in the Aqueduct and the water will clear, and I will teach you a shorter way between the lanterns.']),
    remind: QT('ساحر القناة: الماء ما زال عكراً.', 'Aqueduct Sorcerer: The water is still murky.'),
    done: QT('ساحر القناة: صفا الماء! وها هو الطريق: أجرة الفوانيس صارت عشرة جيو فقط.', 'Aqueduct Sorcerer: The water has cleared! And here is the way: lantern fares are now only ten geo.'),
    steps: [{ t: 'kill', area: 'aqueduct', n: 8, goal: QT('اقتل ثمانية وحوش في القناة الغارقة', 'Kill eight creatures in the Sunken Aqueduct') }],
    reward: { geo: 150, perk: 'wick' } },
  { id: 'w4', giver: ['fr8', 'wizard'], title: QT('شظايا النجوم', 'Star Shards'),
    offer: QT(['ساحر الصقيع: حين يسقط نجم على الجليد يترك شظايا تحتفظ بضوئه.', 'ابحث لي عن ثلاث منها في قمم الصقيع، فهي وقودي في هذا البرد.'],
      ['Frost Sorcerer: When a star falls on the ice it leaves shards that keep its light.', 'Find me three of them in the Frost Peaks; they are my fuel in this cold.']),
    remind: QT('ساحر الصقيع: ثلاث شظايا. تتوهّج إن اقتربتَ منها.', 'Frost Sorcerer: Three shards. They glow when you come near.'),
    done: QT('ساحر الصقيع: دفءٌ حقيقي أخيراً. خذ أجرك.', 'Frost Sorcerer: Real warmth at last. Take your pay.'),
    steps: [{ t: 'collect', ids: ['qi_w4_a', 'qi_w4_b', 'qi_w4_c'], goal: QT('اجمع ثلاث شظايا نجوم من قمم الصقيع', 'Gather three star shards from the Frost Peaks') }],
    reward: { geo: 380 } },
  { id: 'w5', giver: ['mv4', 'wizard'], title: QT('ثلاث مرايا', 'Three Mirrors'),
    offer: QT(['ساحر المرايا: هذه الأروقة مرايا تكذب بإتقان. لأعرف أيّها الصادقة، أحتاج عيناً غير عيني.', 'انظر في ثلاث قاعات من القبو وعُد وأخبرني ماذا رأيت.'],
      ['Mirror Sorcerer: These halls are mirrors that lie with skill. To know which one tells the truth, I need an eye other than mine.', 'Look into three halls of the Vault and come back and tell me what you saw.']),
    remind: QT('ساحر المرايا: القاعات الثلاث. لا تثق بأول انعكاس.', 'Mirror Sorcerer: The three halls. Trust not the first reflection.'),
    done: QT('ساحر المرايا: اثنتان من الكذب وواحدة من الصدق... كما توقعتُ. أجرك، والصدق مجاناً.', 'Mirror Sorcerer: Two of lies and one of truth... as I expected. Your pay, and the truth for free.'),
    steps: [{ t: 'visit', rooms: ['mv2', 'mv3', 'mv5'], goal: QT('ادخل ثلاث قاعات من قبو المرايا', 'Enter three halls of the Mirror Vault') }],
    reward: { geo: 420 } },
  { id: 'w6', giver: ['lo4', 'wizard'], need: () => ['w1', 'w2', 'w3', 'w4', 'w5'].filter(Quests.isDone).length >= 3, title: QT('السؤال الأخير', 'The Last Question'),
    offer: QT(['ساحر المرصد: سألتُ النجوم كل سؤال إلا سؤالاً واحداً: من يُطفئها؟', 'وصيّ الكسوف وحده يعرف. اهزمه وأخبرني بما رأيتَ في عينيه.'],
      ['Observatory Sorcerer: I have asked the stars every question but one: who puts them out?', 'Only the Eclipse Regent knows. Defeat him and tell me what you saw in his eyes.']),
    remind: QT('ساحر المرصد: الوصيّ ما زال يحرس السؤال.', 'Observatory Sorcerer: The Regent still guards the question.'),
    done: QT('ساحر المرصد: عيناه كانتا نجمتين مطفأتين... الآن أفهم. خذ هذا، فقد اشتريتَ إجابة.', 'Observatory Sorcerer: His eyes were two dead stars... Now I understand. Take this, you have earned an answer.'),
    steps: [{ t: 'boss', flag: 'boss_regent', goal: QT('اهزم وصيّ الكسوف', 'Defeat the Eclipse Regent') }],
    reward: { geo: 800 } },
];

const PERKS = {
  haggle: QT('كل الأسعار أقل بعُشر', 'Every price a tenth lower'),
  purse: QT('الوحوش تُسقط جيواً أكثر بنحو السُّبع', 'Fallen creatures leave about a seventh more geo'),
  ink: QT('التعاويذ أقوى بعُشر', 'Spells a tenth stronger'),
  wick: QT('أجرة الفوانيس عشرة جيو', 'Lantern fare of ten geo'),
};
const NPC_NAMES = { merchant: QT('التاجر الغريب', 'The Strange Merchant'), trader: QT('التاجر الجوّال', 'The Wandering Trader'), wizard: QT('الساحر', 'The Sorcerer') };

const Quests = (() => {
  const Q = () => { const f = G.flags || (G.flags = {}); return f.qs || (f.qs = {}); };
  const st = id => Q()[id] || null;
  const by = id => QUESTS.find(q => q.id === id);
  const isDone = id => !!(st(id) && st(id).s === 2);
  const isOn = q => !!(st(q.id) && st(q.id).s === 1);
  const stepOf = q => (isOn(q) ? q.steps[st(q.id).k] || null : null);
  const ready = q => isOn(q) && st(q.id).k >= q.steps.length;
  const endOf = q => q.end || q.giver;
  const areaOf = room => (WORLD.rooms[room] ? tr('area_' + WORLD.rooms[room].area) : '');
  const where = pair => sx(NPC_NAMES[pair[1]].ar + ' — ' + areaOf(pair[0]), NPC_NAMES[pair[1]].en + ' — ' + areaOf(pair[0]));
  const money = r => (r.geo ? r.geo + sx(' جيو', ' geo') : '') + (r.geo && r.perk ? ' + ' : '') + (r.perk ? qtx(PERKS[r.perk]) : '');
  const rewardText = q => money(q.reward);
  const say = text => G.toastMsg(text, 2.8);

  // how far the current step is, as [done, of]
  function count(q) {
    const s = st(q.id), sp = stepOf(q); if (!sp) return null;
    if (sp.t === 'collect') return [Object.keys(s.got || {}).length, sp.ids.length];
    if (sp.t === 'kill') return [s.n || 0, sp.n];
    if (sp.t === 'visit') return [Object.keys(s.vis || {}).length, sp.rooms.length];
    return null;
  }
  // the words of what to do now
  function goal(q) {
    if (isDone(q.id)) return sx('مكتملة', 'Done');
    if (ready(q)) return sx('عُد إلى ', 'Return to ') + where(endOf(q));
    const sp = stepOf(q), c = count(q);
    return qtx(sp.goal) + (c ? '  (' + c[0] + ' / ' + c[1] + ')' : '');
  }

  // ---- changes of state
  function syncItems() {
    if (!G.level || !G.items) return;
    for (const it of G.level.def.items) if (it.kind === 'quest' && !G.flags[it.id] && itemActive(it) && !G.items.some(i => i.id === it.id)) G.items.push(new Item(it));
  }
  function autoStep(q) {                                  // a step that is already true when it comes up
    const sp = stepOf(q); if (!sp) return;
    if (sp.t === 'boss' && G.flags[sp.flag]) advance(q, true);
  }
  function advance(q, quiet) {
    const s = st(q.id); s.k++; s.n = 0; s.got = {}; s.vis = {};
    syncItems(); autoStep(q);
    if (!quiet) say(sx('المهمة: ', 'Quest: ') + goal(q));
  }
  function accept(q) {
    Q()[q.id] = { s: 1, k: 0, n: 0, got: {}, vis: {} };
    Sound.play('equip'); say(sx('بدأت مهمة: ', 'Quest started: ') + qtx(q.title));
    autoStep(q); syncItems();
  }
  function finish(q) {
    st(q.id).s = 2;
    const r = q.reward;
    if (r.geo) { P.geo += r.geo; G.geoPulse = 1; }
    if (r.perk) G.flags['perk_' + r.perk] = true;
    Sound.play('ability'); G.ring(P.cx, P.cy, '#ffd86b', 1); G.burst(P.cx, P.cy - 10, 18, { color: '#ffe9a0', speed: 220, life: 0.7, size: 3, grav: -60 });
    say(sx('اكتملت المهمة: ', 'Quest complete: ') + qtx(q.title));
  }

  // ---- what happens in the game
  function killed(e) {
    if (!e || e.isBoss || e.dummy) return;
    const area = e.area || (G.level && G.level.def.area);
    for (const q of QUESTS) {
      const sp = stepOf(q); if (!sp || sp.t !== 'kill') continue;
      if (sp.area && sp.area !== area) continue;
      if (sp.kind && sp.kind !== e.kind) continue;
      const s = st(q.id); s.n = (s.n || 0) + 1;
      if (s.n >= sp.n) advance(q); else G.toastMsg(sx('المهمة: ', 'Quest: ') + qtx(sp.goal) + '  (' + s.n + ' / ' + sp.n + ')', 1.3);
    }
  }
  function collected(def) {
    for (const q of QUESTS) {
      const sp = stepOf(q); if (!sp || sp.t !== 'collect' || !sp.ids.includes(def.id)) continue;
      const s = st(q.id); s.got = s.got || {}; if (s.got[def.id]) continue;
      s.got[def.id] = true;
      if (Object.keys(s.got).length >= sp.ids.length) advance(q); else G.toastMsg(sx('المهمة: ', 'Quest: ') + qtx(sp.goal) + '  (' + Object.keys(s.got).length + ' / ' + sp.ids.length + ')', 1.8);
    }
  }
  function entered(room) {
    for (const q of QUESTS) {
      const sp = stepOf(q); if (!sp || sp.t !== 'visit' || !sp.rooms.includes(room)) continue;
      const s = st(q.id); s.vis = s.vis || {}; if (s.vis[room]) continue;
      s.vis[room] = true;
      if (Object.keys(s.vis).length >= sp.rooms.length) advance(q); else G.toastMsg(sx('المهمة: ', 'Quest: ') + qtx(sp.goal) + '  (' + Object.keys(s.vis).length + ' / ' + sp.rooms.length + ')', 1.8);
    }
    syncItems();
  }
  let poll = 0;
  function update(dt) {
    poll -= dt; if (poll > 0) return; poll = 0.5;
    for (const q of QUESTS) { const sp = stepOf(q); if (sp && sp.t === 'boss' && G.flags[sp.flag]) advance(q); }
  }
  // does this thing of a room belong to the step a quest is on?
  function itemActive(def) {
    for (const q of QUESTS) { const sp = stepOf(q); if (sp && sp.t === 'collect' && sp.ids.includes(def.id) && !(st(q.id).got || {})[def.id]) return true; }
    return false;
  }

  // ---- talking
  const dlg = (lines, choices) => ({ lines, i: 0, t: 0, choices, sel: 0 });
  const bye = () => ({ label: sx('إغلاق', 'Close'), fn() { /* the dialog is already closed */ } });
  const shopOf = n => ({ label: sx('المتجر', 'Shop'), fn() { G.dialog = shopDialog(n); G.state = 'dialog'; } });
  // what the person in front of the hero says about the quests, or null when it has nothing to do with them
  function talk(n) {
    const room = G.level.id;
    for (const q of QUESTS) {                                          // a letter for him, or the work done: first
      const sp = stepOf(q);
      if (sp && sp.t === 'deliver' && sp.to[0] === room && sp.to[1] === n.type) { advance(q, true); return dlg([qtx(sp.say)], [shopOf(n), { label: sx('حسناً', 'Alright'), fn() { say(sx('المهمة: ', 'Quest: ') + goal(q)); } }]); }
      if (ready(q) && endOf(q)[0] === room && endOf(q)[1] === n.type) {
        finish(q); return dlg([qtx(q.done), sx('نلتَ: ', 'You received: ') + rewardText(q)], [shopOf(n), bye()]);
      }
    }
    for (const q of QUESTS) {
      if (q.giver[0] !== room || q.giver[1] !== n.type) continue;
      if (isOn(q)) return dlg([qtx(q.remind), sx('المهمة: ', 'Quest: ') + goal(q)], [shopOf(n), bye()]);
    }
    for (const q of QUESTS) {
      if (q.giver[0] !== room || q.giver[1] !== n.type || st(q.id) || (q.need && !q.need())) continue;
      return dlg(qlines(q.offer).concat([sx('المهمة: ', 'Quest: ') + qtx(q.steps[0].goal) + '   ·   ' + sx('الجائزة: ', 'Reward: ') + rewardText(q)]),
        [{ label: sx('أقبل المهمة', 'Accept'), fn() { accept(q); } }, shopOf(n), { label: sx('ليس الآن', 'Not now'), fn() {} }]);
    }
    return null;
  }
  // '!' over one who has work, '?' over one waiting for the hero (the work is done, or the hero has a letter for him)
  function mark(room, type) {
    for (const q of QUESTS) {
      const sp = stepOf(q);
      if (sp && sp.t === 'deliver' && sp.to[0] === room && sp.to[1] === type) return '?';
      if (ready(q) && endOf(q)[0] === room && endOf(q)[1] === type) return '?';
    }
    for (const q of QUESTS) if (q.giver[0] === room && q.giver[1] === type && !st(q.id) && (!q.need || q.need())) return '!';
    return null;
  }
  // where the quests in hand point, for the map: [{ room, x, y }] in tiles
  function pins() {
    const out = [];
    for (const q of QUESTS) {
      if (!isOn(q)) continue;
      const sp = stepOf(q), s = st(q.id), npcAt = pair => { const R = WORLD.rooms[pair[0]], n = R && R.npcs.find(m => m.type === pair[1]); if (n) out.push({ room: pair[0], x: n.x, y: n.y - 2 }); };
      if (!sp) npcAt(endOf(q));
      else if (sp.t === 'collect') { for (const id of sp.ids) if (!(s.got || {})[id]) for (const room of Object.keys(WORLD.rooms)) { const it = WORLD.rooms[room].items.find(i => i.id === id); if (it) out.push({ room, x: it.x, y: it.y }); } }
      else if (sp.t === 'visit') { for (const room of sp.rooms) if (!(s.vis || {})[room]) out.push({ room, x: WORLD.rooms[room].w / 2, y: WORLD.rooms[room].h / 2 }); }
      else if (sp.t === 'deliver') npcAt(sp.to);
    }
    return out;
  }
  return {
    QUESTS, by, state: st, isDone, isOn, stepOf, ready, goal, count, where, rewardText, accept, advance, finish, killed, collected, entered, update, itemActive, syncItems, talk, mark, pins,
    active: () => QUESTS.filter(isOn), finished: () => QUESTS.filter(q => isDone(q.id)),
    // the quests to list in the log: the ones in hand first, then the ones done
    logList: () => QUESTS.filter(isOn).concat(QUESTS.filter(q => isDone(q.id))),
    // the perks
    perk: name => !!G.flags['perk_' + name],
    priceK: () => (G.flags.perk_haggle ? 0.9 : 1),
    geoK: () => (G.flags.perk_purse ? 1.15 : 1),
    fare: () => (G.flags.perk_wick ? 10 : 25),
    spellK: () => (G.flags.perk_ink ? 1.1 : 1),
  };
})();

// ---------------------------------------------------------------- the marks over the people, and the things themselves
function drawQuestMarks(g, t) {
  for (const n of G.npcs) {
    const m = Quests.mark(G.level.id, n.type); if (!m) continue;
    const y = n.py - 132 + Math.sin(t * 3 + n.px) * 4;
    bloom(g, n.px, y, 34, '#ffd86b', 0.35);
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.font = '800 34px ' + (LANG.cur === 'ar' ? FONT_AR : FONT_EN);
    g.lineWidth = 5; g.strokeStyle = 'rgba(30,18,0,0.9)'; g.strokeText(m, n.px, y); g.fillStyle = m === '!' ? '#ffd24a' : '#fff2b0'; g.fillText(m, n.px, y);
    g.restore();
  }
}
// the things of the quests: a pack, a flask, a shard, a bone, a lens, a spool, each with a gold glow
(function wrapItemArt() {
  const prev = Art.drawItem;
  Art.drawItem = function (g, it, t) {
    if (it.kind !== 'quest') return prev(g, it, t);
    const x = it.x, y = it.y - 6 + Math.sin(t * 2.5 + x) * 4, icon = it.def.icon;
    bloom(g, x, y, 70, '#ffd86b', 0.3 + 0.1 * Math.sin(t * 4));
    g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
    const ink = (w) => { g.lineWidth = w || 2.6; g.strokeStyle = INK; };
    if (icon === 'pack') {                                    // a satchel with a strap and a buckle
      g.beginPath(); g.moveTo(-14, 10); g.lineTo(-12, -6); g.quadraticCurveTo(0, -14, 12, -6); g.lineTo(14, 10); g.closePath(); g.fillStyle = '#8a5a34'; g.fill(); ink(); g.stroke();
      g.fillStyle = '#6a4024'; g.fillRect(-13, -3, 26, 7); ink(1.8); g.strokeRect(-13, -3, 26, 7);
      g.fillStyle = '#e8c870'; g.fillRect(-3, -4, 6, 9); ink(1.6); g.strokeRect(-3, -4, 6, 9);
      g.strokeStyle = '#5a3418'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-10, -9); g.quadraticCurveTo(0, -24, 10, -9); g.stroke();
    } else if (icon === 'flask') {                            // a round flask of glowing sap
      g.beginPath(); g.arc(0, 4, 11, 0, 7); g.fillStyle = 'rgba(190,255,200,0.35)'; g.fill(); ink(); g.stroke();
      g.beginPath(); g.arc(0, 6, 8, 0.1, Math.PI - 0.1); g.fillStyle = '#8cff9a'; g.fill();
      g.fillStyle = 'rgba(190,255,200,0.5)'; g.fillRect(-4, -14, 8, 10); ink(1.8); g.strokeRect(-4, -14, 8, 10);
      g.fillStyle = '#8a5a34'; g.fillRect(-5, -17, 10, 4); ink(1.6); g.strokeRect(-5, -17, 10, 4);
    } else if (icon === 'shard') {                            // a shard of a fallen star
      poly(g, [0, -18, 6, -4, 14, 0, 6, 5, 2, 16, -4, 6, -13, 2, -5, -5]); g.fillStyle = '#cfeaff'; g.fill(); ink(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)'; poly(g, [0, -14, 3, -4, 0, 0, -3, -4]); g.fill();
    } else if (icon === 'bone') {                             // a long clean bone
      g.beginPath(); g.moveTo(-14, -4); g.arc(-15, -6, 4, Math.PI * 0.6, Math.PI * 2.2); g.arc(-15, 3, 4, Math.PI * 1.7, Math.PI * 1.4, true); g.lineTo(13, 3); g.arc(15, 4, 4, Math.PI * 1.2, Math.PI * 0.8, true); g.arc(15, -5, 4, Math.PI * 0.2, Math.PI * 1.7); g.closePath();
      g.fillStyle = '#efe6d0'; g.fill(); ink(); g.stroke();
    } else if (icon === 'lens') {                             // a lens in a brass ring
      g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fillStyle = 'rgba(200,225,255,0.55)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#c9a050'; g.stroke(); ink(1.4); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.arc(-3, -3, 7, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
    } else {                                                  // a spool of thread
      g.fillStyle = '#8a5a34'; g.fillRect(-12, -14, 24, 5); g.fillRect(-12, 9, 24, 5); ink(1.8); g.strokeRect(-12, -14, 24, 5); g.strokeRect(-12, 9, 24, 5);
      g.fillStyle = '#e8e4f0'; g.fillRect(-9, -9, 18, 18); ink(1.8); g.strokeRect(-9, -9, 18, 18);
      g.strokeStyle = 'rgba(120,110,150,0.8)'; g.lineWidth = 1.2; g.beginPath(); for (let k = -6; k <= 6; k += 3) { g.moveTo(-9, k); g.lineTo(9, k + 2); } g.stroke();
    }
    g.restore();
  };
})();

// ---------------------------------------------------------------- the log (pause menu)
function updateQuests(dt) {
  G.questsT = (G.questsT || 0) + dt;
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'pause'; Input.consume('pause'); Input.consume('map'); Sound.play('select'); return; }
  const n = Quests.logList().length; if (!n) return;
  G.questSel = clamp(G.questSel || 0, 0, n - 1);
  if (Input.pressed('up')) { G.questSel = (G.questSel + n - 1) % n; Sound.play('select'); }
  if (Input.pressed('down')) { G.questSel = (G.questSel + 1) % n; Sound.play('select'); }
}
function drawQuests(g) {
  g.fillStyle = 'rgba(3,5,10,0.97)'; g.fillRect(0, 0, VW, VH);
  const ar = LANG.cur === 'ar', list = Quests.logList(), t = G.questsT || 0;
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, sx('المهام', 'Quests'), VW / 2, 34, '#eef5ff');
  const nDone = Quests.finished().length;
  g.font = font(15, '600'); g.fillStyle = '#9db5d6'; g.fillText(sx('مكتملة ', 'Done ') + nDone + ' / ' + QUESTS.length, VW / 2, 60);
  if (!list.length) {
    drawPanel(g, 140, 100, VW - 280, 360);
    g.font = font(22, '600'); g.fillStyle = '#d6e4f5';
    wrapText(g, sx('لا مهام بعد. تحدّث مع التجّار والسحرة في الدروب؛ من عنده عمل لك فوق رأسه علامة ذهبية !', 'No quests yet. Talk to the merchants, traders and sorcerers on the roads; whoever has work for you has a gold ! over his head.'), VW - 360).forEach((l, i) => g.fillText(l, VW / 2, 250 + i * 34));
    return;
  }
  const sel = clamp(G.questSel || 0, 0, list.length - 1), q = list[sel], VIS = 6, ROW = 66, top = clamp(sel - VIS + 1, 0, Math.max(0, list.length - VIS));
  drawPanel(g, 40, 76, 330, 434);
  for (let i = top; i < Math.min(list.length, top + VIS); i++) {
    const r = list[i], y = 76 + 14 + (i - top) * ROW + ROW / 2 - 4, on = i === sel, done = Quests.isDone(r.id);
    (G.menuHits || (G.menuHits = [])).push({ x: 52, y: y - ROW / 2 + 2, w: 306, h: ROW - 4, fn: () => { if (G.questSel !== i) { G.questSel = i; Sound.play('select'); } } });
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(52, y - ROW / 2 + 2, 306, ROW - 4); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(52.5, y - ROW / 2 + 2.5, 305, ROW - 5); }
    g.beginPath(); g.arc(ar ? 340 : 82, y, 12, 0, 7); g.fillStyle = done ? '#2e6a3c' : '#6a4a10'; g.fill(); g.lineWidth = 2; g.strokeStyle = done ? '#9ff0a8' : '#ffd24a'; g.stroke();
    g.fillStyle = done ? '#9ff0a8' : '#ffd24a'; g.font = font(16, '800'); g.textAlign = 'center'; g.direction = 'ltr'; g.fillText(done ? '✓' : '!', ar ? 340 : 82, y + 1);
    g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr'; const tx = ar ? 318 : 106;
    g.font = font(18, '700'); g.fillStyle = done ? '#9db5d6' : '#eef5ff'; g.fillText(qtx(r.title), tx, y - 11);
    const c = Quests.count(r); g.font = font(13, '600'); g.fillStyle = done ? '#7fb08a' : '#c9a86a';
    if (c && !done && !Quests.ready(r)) g.direction = 'ltr';                           // numbers read left to right even in Arabic
    g.fillText(done ? sx('مكتملة', 'Done') : Quests.ready(r) ? sx('عُد إلى صاحبها', 'Return to the giver') : (c ? c[0] + ' / ' + c[1] : sx('في الطريق', 'Under way')), tx, y + 12);
  }
  // the one chosen
  drawPanel(g, 390, 76, 530, 434);
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(26, '700'); g.fillStyle = '#ffe9a0'; g.fillText(qtx(q.title), 655, 112);
  g.font = font(14, '600'); g.fillStyle = '#9fe0d8'; g.fillText(sx('من: ', 'From: ') + Quests.where(q.giver), 655, 142);
  g.font = font(15, '500'); g.fillStyle = '#c3d2ea';
  wrapText(g, qlines(q.offer).join(' '), 490).slice(0, 4).forEach((l, i) => g.fillText(l, 655, 178 + i * 22));
  // the steps, ticked as they are done
  const s = Quests.state(q.id), k = s.k, items = q.steps.map(sp => qtx(sp.goal)).concat([sx('عُد إلى ', 'Return to ') + Quests.where(q.end || q.giver)]);
  g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr'; const sx0 = ar ? 892 : 420;
  let y = 290;
  items.forEach((txt, i) => {
    const doneStep = s.s === 2 || i < k, now = s.s === 1 && i === k, c = now && i < q.steps.length ? Quests.count(q) : null;
    g.font = font(16, now ? '700' : '500'); g.fillStyle = doneStep ? '#7fb08a' : now ? '#ffffff' : '#7d8aa0';
    g.fillText((doneStep ? '✓  ' : now ? '●  ' : '○  ') + txt + (c ? '  (' + c[0] + ' / ' + c[1] + ')' : ''), sx0, y);
    y += 30;
  });
  setDir(g); g.textAlign = 'center';
  g.font = font(16, '700'); g.fillStyle = s.s === 2 ? '#7fb08a' : '#e0c27a'; g.fillText((s.s === 2 ? sx('نلتَ: ', 'Received: ') : sx('الجائزة: ', 'Reward: ')) + Quests.rewardText(q), 655, 478);
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(sx('↑ ↓ اختيار    Esc رجوع', '↑ ↓ select    Esc back'), VW / 2, VH - 16);
}
