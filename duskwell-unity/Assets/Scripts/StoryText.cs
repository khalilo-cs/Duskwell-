// The story of Duskwell: what is told, by whom and when. Every text is Arabic first, then English.
//   The kingdom lived in an endless dusk, kept by the Lantern at the bottom of the Great Well. The King feared the night and made
//   the Lantern burn as a day that would never end; it burst into twelve shards, twelve guardians swallowed them and were twisted
//   by their light, and the kingdom went hollow. Ages later the last ember of the Lantern wakes at the well in Hushvale: the hero.
//   Each seal (a shard) that is won back gives a memory, and the memories tell what the Elder kept silent: he was the Lantern's
//   keeper and gave the King the key; and the ember was not made to live but to go back. Twelve seals open the Throne; the
//   Hollow King falls; the ember enters the Lantern, which burns again, not as day nor night, but as dusk.
using System.Collections.Generic;

public static class Story {
  public class Panel { public string pic, ar, en; public Panel(string p, string a, string e) { pic = p; ar = a; en = e; } }
  static string[] T(string a, string e) { return new[] { a, e }; }

  public static readonly Panel[] Prologue = {
    new Panel("story/p1", "قبل أن يُولد النهار، كانت أرضُ الغسق تحيا بين ضوءٍ وظلّ، يحرسها قنديلٌ في قاع البئر العظيمة.", "Before day was born, Duskwell lived between light and shadow, kept by a lantern at the bottom of the Great Well."),
    new Panel("story/p2", "لكنّ الملكَ خاف الليل. أراد للقنديل أن يشتعل نهاراً لا يغيب.", "But the King feared the night. He wanted the lantern to burn as a day that never ends."),
    new Panel("story/p3", "فاشتعل القنديلُ أكثر مما يحتمل، وتشظّى اثنتي عشرة شظية… ابتلعها اثنا عشر حارساً، فتلوّثت أرواحهم بنوره.", "It burned brighter than it could bear and broke into twelve shards... twelve guardians swallowed them, and the light poisoned their souls."),
    new Panel("story/p4", "وانطفأت المملكة. صار أهلُها قشوراً فارغة تهيم في الظلام، لا تذكر أسماءها.", "The kingdom went dark. Its people became hollow husks wandering the dark, remembering no names."),
    new Panel("story/p5", "وبعد دهر، عند فوهة البئر في وادي الهمس، تحرّكت جذوةٌ صغيرة… آخرُ ما بقي من نار القنديل.", "Ages later, at the mouth of the well in Hushvale, a small ember stirred... the last spark of the lantern's fire."),
    new Panel("bg/townb", "تلك الجذوة… هي أنت.", "That ember... is you."),
  };
  public static readonly Panel[] Ending = {
    new Panel("story/e1", "سقط الملك المجوّف… وفي يده الأخيرة شظيةٌ ثالثة عشرة: قلبه.", "The Hollow King fell... and in his last hand lay a thirteenth shard: his heart."),
    new Panel("story/e2", "وفي قاع البئر، كان القنديل المكسور ينتظر.", "At the bottom of the well, the broken lantern waited."),
    new Panel("story/e2", "وضعتَ الشظايا واحدةً واحدة… ثم دخلتَ أنت.", "You set the shards in one by one... and then you stepped in yourself."),
    new Panel("story/e3", "اشتعل القنديل. لا نهاراً قاسياً، ولا ليلاً أبدياً… بل غسقاً دافئاً.", "The lantern lit. Not a cruel day, nor an endless night... but a warm dusk."),
    new Panel("story/e4", "في وادي الهمس، جلس الشيخ أوراد عند البئر طويلاً… ثم ابتسم.", "In Hushvale, Elder Awrad sat by the well for a long time... and then he smiled."),
    new Panel("bg/title", "أرضُ الغسق تتنفّس من جديد.", "Duskwell breathes again."),
  };

  // each area: its name and a line about it, shown as the hero first walks in
  public static readonly Dictionary<string, string[]> Area = new Dictionary<string, string[]> {
    { "hushvale", T("وادي الهمس|آخر قريةٍ بقي فيها دفء… وبئرٌ لا يُرى قاعها.", "Hushvale|The last village with any warmth left... and a well without a bottom.") },
    { "crossroads", T("مفترق الأعماق|طرقٌ قديمة تتشابك تحت الأرض، كانت يوماً شرايين المملكة.", "Sunken Crossroads|Old roads knot beneath the earth; once they were the kingdom's veins.") },
    { "mossgrove", T("بستان الطحلب|حيث نما الطحلب على أحلام النائمين.", "Mossgrove|Where the moss grew over the dreams of sleepers.") },
    { "crystal", T("أبراج البلّور|البلّور يحفظ كل ضوءٍ سقط فيه… وكل صرخة.", "Crystal Spires|The crystal keeps every light that fell into it... and every scream.") },
    { "throne", T("العرش المجوّف|قاعاتٌ بُنيت لملكٍ أراد أن يهزم الليل.", "The Hollow Throne|Halls built for a king who wished to defeat the night.") },
    { "spore", T("غابة الأبواغ|هواءٌ ثقيل بالأبواغ، وحياةٌ لا تعرف متى تموت.", "Sporewood|Air thick with spores, and life that does not know when to die.") },
    { "aqueduct", T("القنوات الغارقة|قنواتٌ حملت الماء إلى القصر… ثم حملت الغرقى.", "Drowned Aqueduct|Channels that carried water to the palace... and then carried the drowned.") },
    { "webbed", T("الأعماق المنسوجة|خيوطٌ تمتدّ في الظلام، وشيءٌ ينتظر أن تهتزّ.", "Webbed Depths|Threads stretch in the dark, and something waits for them to tremble.") },
    { "rustworks", T("مصانع الصدأ|آلاتٌ صدئة ما زالت تدور، لا تذكر لمن تعمل.", "The Rustworks|Rusted machines still turning, not remembering whom they serve.") },
    { "frost", T("قمم الصقيع|حين انطفأ القنديل، كان الصقيعُ أول من دخل.", "Frostpeak|When the lantern died, the frost was the first to come in.") },
    { "ember", T("أعماق الجمر|هنا سقطت أحرّ الشظايا، والأرض ما زالت تحترق.", "Cinderdeep|Here the hottest shards fell, and the ground still burns.") },
    { "stormcrest", T("ذرى العاصفة|قممٌ تسكنها العواصف، والرعد فيها يحفظ الأسماء.", "Stormcrest|Peaks where the storms live, and the thunder remembers names.") },
    { "mirror", T("مدينة المرايا|كلُّ انعكاسٍ هنا يكذب قليلاً.", "Mirror City|Every reflection here lies a little.") },
    { "ossuary", T("المقبرة العظمية|عظامُ الأجداد مرصوفةٌ في الجدران… وبعضها ما زال يتحرّك.", "The Ossuary|The bones of the ancestors line the walls... and some still move.") },
    { "lunar", T("المرصد القمري|آخر مكانٍ يرى القمر. هنا يحكم الكسوف.", "Lunar Observatory|The last place that sees the moon. Here the eclipse rules.") },
  };

  // the lords: name, title, and what they say as they rise, at half their strength and as they fall
  public class Lord { public string[] name, title, rise, half, fall; }
  static Lord L(string na, string ne, string ta, string te, string ra, string re, string ha, string he, string fa, string fe) {
    return new Lord { name = T(na, ne), title = T(ta, te), rise = T(ra, re), half = T(ha, he), fall = T(fa, fe) };
  }
  public static readonly Dictionary<string, Lord> Lords = new Dictionary<string, Lord> {
    { "guardian", L("الحارس الحجري", "Stone Guardian", "حامل الشظية الأولى", "Bearer of the First Shard", "من يوقظ الحجر؟ عُد من حيث جئت.", "Who wakes the stone? Go back the way you came.", "الحجر لا يُكسر بهذه السهولة.", "Stone does not break so easily.", "سقط الحارس… فاعبر.", "The guardian falls... pass, then.") },
    { "weaver", L("حائكة الأشواك", "Thornweaver", "سيّدة الخيوط في بستان الطحلب", "Mistress of the Threads", "دخلتَ شبكتي، ولن تخرج منها.", "You walked into my web. You will not walk out.", "كل خيطٍ تقطعه أنسج غيره.", "Every thread you cut, I weave again.", "انقطع… آخر الخيوط.", "The last thread... breaks.") },
    { "wraith", L("شبح البلّور", "Crystal Wraith", "ذاكرة الأبراج", "Memory of the Spires", "البلّور يتذكّر كل من مات هنا.", "The crystal remembers all who died here.", "انظر إلى انعكاسك… إنه يرتجف.", "Look at your reflection... it trembles.", "أعدني… إلى الضوء.", "Return me... to the light.") },
    { "king", L("الملك المجوّف", "The Hollow King", "من خاف الليل فأطفأ كل شيء", "Who feared the night and put out everything", "ركعتْ لي الممالك. وستركع أنت.", "Kingdoms knelt before me. So will you.", "التاج أثقل من أن تنتزعه.", "The crown is too heavy for you to take.", "العرش… فارغ من جديد.", "The throne... is empty again.") },
    { "spore", L("أمّ الأبواغ", "Spore Mother", "التي لا تعرف الموت", "She Who Knows No Death", "تنفّس عميقاً، يا صغيري.", "Breathe deep, little one.", "أبنائي ينبتون من كل جرح.", "My children grow from every wound.", "تتناثر البذور… ولا تموت.", "The spores scatter... they never die.") },
    { "drowned", L("الغريق", "The Drowned One", "حارس القنوات الغارقة", "Keeper of the Sunken Channels", "الماء أخذ كل شيء. والآن يأخذك.", "The water took everything. Now it takes you.", "اغرق معي.", "Drown with me.", "أخيراً… أطفو.", "At last... I float.") },
    { "brood", L("أمّ الحضنة", "Brood Mother", "قلب العشّ المنسوج", "Heart of the Woven Nest", "لا تدُس على صغاري.", "Do not tread on my young.", "اخرجوا يا أولادي، كلوا!", "Come out, my children, feast!", "العشّ… صامت.", "The nest... falls silent.") },
    { "queen", L("ملكة الصقيع", "Frost Queen", "التي جمّدت قلبها كي لا يتألم", "Who froze her heart so it would not ache", "في مملكتي يتجمّد كل شيء.", "In my realm, everything freezes.", "سيتوقّف قلبك من البرد.", "Your heart will stop from the cold.", "يذوب… الشتاء.", "The winter... melts.") },
    { "colossus", L("عملاق الجمر", "Ember Colossus", "الجمر الذي لا ينطفئ", "The Ember That Never Dies", "أنا الجمر الذي لا ينطفئ!", "I am the ember that never dies!", "احترق!", "Burn!", "رماد… كله رماد.", "Ash... all of it ash.") },
    { "thunderhoof", L("حافر الرعد", "Thunderhoof", "سيّد الطريق إلى الذرى", "Lord of the Road to the Peaks", "أسمع خطاك من بعيد، أيها الضئيل.", "I hear your steps from afar, little one.", "الرعد لا يرحم!", "The thunder shows no mercy!", "سكتت العاصفة.", "The storm is quiet.") },
    { "roc", L("طائر الرُّخ", "The Roc", "ملك السماء المحبوسة", "King of the Caged Sky", "السماء لي وحدي!", "The sky is mine alone!", "سأحملك وأسقطك!", "I will carry you up and let you fall!", "تتكسّر الأجنحة…", "The wings... break.") },
    { "duelist", L("المبارز المرآوي", "Mirror Duelist", "سيف المدينة الأخير", "The City's Last Blade", "ارفع سلاحك. لنرَ من الأسرع.", "Raise your blade. Let us see who is faster.", "حركة جيدة… لكنها لا تكفي.", "A fine move... but not enough.", "هُزمت… بشرف.", "Beaten... with honour.") },
    { "twin", L("التوأم الظلّ", "The Shadow Twin", "أنت، بلا رحمة", "You, Without Mercy", "أنا أنت… لكن بلا رحمة.", "I am you... without mercy.", "كل ضربةٍ منك أعرفها.", "I know every blow you strike.", "ظلّك… يتلاشى.", "Your shadow... fades.") },
    { "bonewright", L("نحّات العظام", "Bonewright", "صانع التماثيل الحيّة", "Maker of the Living Statues", "عظامك ستكون تحفتي القادمة.", "Your bones will be my next masterpiece.", "أنحت… وأنحت!", "I carve... and carve!", "انكسر الإزميل.", "The chisel... breaks.") },
    { "marrow", L("سيّد النخاع", "Marrow Lord", "ملك المقبرة", "Lord of the Ossuary", "أنا ملك هذه المقبرة!", "I am the lord of this ossuary!", "النخاع يناديني!", "The marrow calls to me!", "عودوا… إلى التراب.", "Return... to the dust.") },
    { "stargazer", L("راصد النجوم", "Stargazer", "قارئ النهايات", "Reader of Endings", "النجوم كتبت نهايتك.", "The stars have written your end.", "انظر إلى السماء تسقط!", "Watch the sky fall!", "انطفأت… النجوم.", "The stars... go out.") },
    { "regent", L("وصيّ الكسوف", "Eclipse Regent", "حارس الشظية الأخيرة", "Keeper of the Last Shard", "حين يغيب القمر، يحكم الظلام.", "When the moon is gone, darkness rules.", "الكسوف قد بدأ!", "The eclipse has begun!", "يعود… الضوء.", "The light... returns.") },
  };
  // the twelve who swallowed a shard, in the order of the seals; the others guard roads, not shards
  public static readonly string[] Seals = { "guardian", "spore", "weaver", "drowned", "wraith", "brood", "queen", "colossus", "roc", "twin", "marrow", "regent" };
  // what each seal brings back: a memory, and the memories tell the truth one piece at a time
  public static readonly Dictionary<string, string[]> Memory = new Dictionary<string, string[]> {
    { "guardian", T("«احرس هذه الشظية يا حارس الحجر، حتى يعود من يستحقها.» …صوتٌ عجوزٌ تعرفه.", "'Guard this shard, stone keeper, until one worthy returns.' ...an old voice you know.") },
    { "spore", T("رأيتَ الملك صبيّاً يبكي في الظلام، يخاف أن ينطفئ كل شيء.", "You saw the King as a boy, weeping in the dark, afraid that everything would go out.") },
    { "weaver", T("خيطٌ ذهبيّ يربطك بالقنديل… لم ينقطع قط.", "A golden thread binds you to the lantern... it never broke.") },
    { "drowned", T("«القنديل لا يُشعَل بالقوة، بل بنارٍ تقبل أن تذوب فيه.»", "'The lantern is not lit by force, but by a fire willing to melt into it.'") },
    { "wraith", T("في البلّور رأيتَ وجهك… كان شعلةً صغيرة.", "In the crystal you saw your face... it was a small flame.") },
    { "brood", T("الشيخ أوراد كان حارسَ القنديل. هو من سلّم الملكَ مفتاح البئر.", "Elder Awrad was the lantern's keeper. It was he who gave the King the key to the Well.") },
    { "queen", T("«سامحني يا مولاي… ما كان ينبغي أن أطيعك.» — أوراد", "'Forgive me, my lord... I should never have obeyed you.' — Awrad") },
    { "colossus", T("حين انفجر القنديل، طارت منه جذوةٌ واحدة إلى الأعلى… إلى الوادي.", "When the lantern burst, a single ember flew upward... to the valley.") },
    { "roc", T("الجذوة لم تُخلَق لتعيش. خُلِقت لتعود.", "The ember was not made to live. It was made to return.") },
    { "twin", T("ظلّك يهمس: «إن أشعلتَ القنديل، فلن تبقى أنت.»", "Your shadow whispers: 'If you light the lantern, you will not remain.'") },
    { "marrow", T("الملك ما زال حيّاً على عرشه… مجوّفاً، يحمل الظلام كي لا ينتشر.", "The King still lives on his throne... hollow, holding the dark so it will not spread.") },
    { "regent", T("اثنتا عشرة شظية. البابُ إلى العرش يُفتح… والقنديل ينتظر جذوته.", "Twelve shards. The way to the throne opens... and the lantern awaits its ember.") },
  };
  public static readonly string[] RoadLord = T("لم يكن يحمل شظية… كان يحرس الطريق فقط. ومع ذلك، صار الطريق أخفّ.", "It carried no shard... it only guarded the road. Still, the road feels lighter.");

  // the people of the kingdom: name, and what they say before the first seal, with a few seals, with many, and with all twelve
  public class Person { public string[] name; public string[][][] says; }
  static Person P(string na, string ne, params string[][][] s) { return new Person { name = T(na, ne), says = s }; }
  static string[][] S(params string[] ae) { var l = new List<string[]>(); for (int i = 0; i + 1 < ae.Length; i += 2) l.Add(T(ae[i], ae[i + 1])); return l.ToArray(); }
  public static readonly Dictionary<string, Person> People = new Dictionary<string, Person> {
    { "elder", P("الشيخ أوراد", "Elder Awrad",
      S("استيقظتَ أخيراً، أيتها الجذوة الصغيرة.", "You are awake at last, little ember.",
        "انطفأ قنديل المملكة منذ دهر، وتناثرت شظاياه في اثني عشر حارساً.", "The kingdom's lantern died ages ago, and its shards are scattered among twelve guardians.",
        "انزل في البئر. استعِد الشظايا… وأعد النور. الطريق طويل، فلا تنطفئ.", "Go down the well. Take back the shards... and bring back the light. The road is long; do not go out."),
      S("أشعر بالشظايا معك… النور يعود إلى الوادي قليلاً قليلاً.", "I feel the shards with you... the light returns to the valley, little by little.",
        "استرح على المقعد متى تعبت. الظلام صبور، فكن أصبر منه.", "Rest on the bench when you tire. The dark is patient; be more patient still."),
      S("رأيتَ الذكريات، أليس كذلك؟ نعم… أنا من سلّم الملك مفتاح البئر.", "You have seen the memories, haven't you? Yes... it was I who gave the King the key to the Well.",
        "كنتُ أظنّ أن النهار الدائم رحمة. كنتُ مخطئاً.", "I thought an endless day would be a mercy. I was wrong.",
        "أكمل يا صغيري. لا أطلب منك أن تسامحني.", "Go on, little one. I do not ask you to forgive me."),
      S("اثنتا عشرة شظية… باب العرش مفتوحٌ الآن.", "Twelve shards... the throne's gate stands open now.",
        "حين تصل إلى القنديل، ستعرف ما عليك فعله. أنا آسف أن الأمر لا بدّ أن يكون هكذا.", "When you reach the lantern, you will know what to do. I am sorry it must be so.")) },
    { "merchant", P("التاجر مِرزا", "Mirza the Merchant",
      S("تعال، تعال! بضاعةٌ من أعماقٍ لم يعد منها أحد!", "Come, come! Goods from depths no one came back from!", "اجمع الجيو من القشور الساقطة… وعُد إليّ!", "Gather the geo the husks drop... and come back to me!"),
      S("شظايا في جيبك؟ لا تبعها لي… أمزح، أمزح!", "Shards in your pocket? Don't sell them to me... I jest, I jest!"),
      S("حتى التاجر يعرف متى يصمت… الأعماق تتغيّر يا صديقي.", "Even a merchant knows when to be quiet... the depths are changing, friend."),
      S("إن عدتَ، سأعطيك كل شيءٍ مجاناً. إن عدت…", "If you come back, everything is free. If you come back...")) },
    { "smith", P("الحدّاد قَرن", "Qarn the Smith",
      S("النصلُ الجيد يحتاج ناراً صادقة… وأنت نارٌ صغيرة، لكنها صادقة.", "A good blade needs an honest fire... and you are a small fire, but an honest one.", "اضرب بقوة. القشور لا تشعر بالألم.", "Strike hard. The husks feel no pain."),
      S("سمعتُ أن الحارس الحجري سقط. نصلك أقوى مما ظننت.", "I hear the Stone Guardian fell. Your blade is stronger than I thought."),
      S("سبكتُ سيفاً للملك ذات يوم. لم يرفعه أبداً… كان يخاف من ظلّه.", "I forged a sword for the King once. He never raised it... he was afraid of his own shadow."),
      S("اذهب. ودَع النار تفعل ما خُلِقت له.", "Go. And let the fire do what it was made for.")) },
    { "outfitter", P("الخيّاطة نُسيبة", "Nusayba the Seamstress",
      S("عباءتك ممزّقة… لكنها تليق بك. خِطتها منذ زمن، قبل أن تُولد حتى.", "Your cloak is torn... but it suits you. I sewed it long ago, before you were even born.", "أعرف، أعرف… كلامٌ غريب.", "I know, I know... strange words."),
      S("الريح في الأعماق تقطع القماش، فلا تتوقّف عن الحركة.", "The wind in the depths cuts cloth; keep moving."),
      S("كنتُ أخيط ثياب القصر. الملك كان يرتجف دائماً من البرد.", "I sewed for the palace. The King was always shivering with cold."),
      S("اترك لي العباءة حين ترحل… سأحفظها.", "Leave me the cloak when you go... I will keep it.")) },
    { "wizard", P("العرّافة سَراب", "Sarab the Seer",
      S("النجوم أخبرتني بقدومك، أيتها الجذوة.", "The stars told me you would come, little ember.", "اثنتا عشرة شظية، واثنا عشر قلباً مكسوراً. احذر أن تكسر قلبك أنت.", "Twelve shards, twelve broken hearts. Take care not to break your own."),
      S("في كل ذكرى تستعيدها، جزءٌ منك يتذكّر.", "With every memory you take back, a part of you remembers."),
      S("النهاية مكتوبة… لكن معناها لم يُكتب بعد.", "The ending is written... but its meaning is not."),
      S("حين تشتعل، سنرى الغسق من جديد. لا نهاراً ولا ليلاً. غسقاً.", "When you burn, we will see the dusk again. Not day, not night. Dusk.")) },
    { "trader", P("الرحّالة", "The Wayfarer",
      S("الطرق خطرة يا رفيق. خذ حذرك، فالحرّاس هنا لا ينامون.", "The roads are dangerous, friend. Take care; the guardians here never sleep."),
      S("رأيتُ النور يعود إلى بعض الكهوف. أهذا من فعلك؟", "I have seen light return to some caves. Is that your doing?"),
      S("الناس يتحدّثون عن جذوةٍ تمشي في الأعماق… لعلّها أنت.", "People speak of an ember walking the depths... perhaps it is you."),
      S("لعلّنا نلتقي في الطريق مجدّداً… تحت غسقٍ جديد.", "Perhaps we meet on the road again... under a new dusk.")) },
  };

  // the hero's powers, as they are found
  public static readonly Dictionary<string, string[]> Power = new Dictionary<string, string[]> {
    { "dash", T("اندفاع الظل|اضغط زر الاندفاع لتنطلق بسرعة، ومرّةً في الهواء.", "Shade Dash|Press dash to shoot forward, once in the air too.") },
    { "wall", T("مخلب الجدار|التصق بالجدران وانزلق عليها، واقفز عنها.", "Mantis Grip|Cling to walls, slide down them, and leap off.") },
    { "double", T("أجنحة الغسق|اقفز مرةً ثانية في الهواء.", "Dusk Wings|Jump a second time in the air.") },
    { "dive", T("الانقضاض|في الهواء: اضغط زر الانقضاض لتهوي بقوة وتكسر الأرض المشقوقة.", "Dive|In the air, press dive to plunge and break cracked floors.") },
    { "superdash", T("قلب البلّور|اضغط زر الاندفاع مطوّلاً ثم أفلته لتنطلق كالسهم عبر الهاوية.", "Crystal Heart|Hold dash, then let go to fly like an arrow across the chasm.") },
  };
  public static readonly Dictionary<string, string[]> Charm = new Dictionary<string, string[]> {
    { "thorn", T("شوكة الألم|حين تُجرح، تنفجر الأشواك حولك.", "Thorns of Agony|When hurt, thorns burst around you.") },
    { "swift", T("خطوة الريح|تجري أسرع.", "Windstep|You run faster.") },
    { "focus", T("قلب السكون|تشفى أسرع.", "Quiet Heart|You heal faster.") },
    { "spirit", T("ظمأ الروح|كل ضربةٍ تملأ روحاً أكثر.", "Soul Thirst|Every blow gathers more soul.") },
    { "shell", T("قوقعة الصبر|تبقى محمياً بعد الجرح وقتاً أطول.", "Patient Shell|You stay safe longer after a wound.") },
    { "dashmaster", T("سيّد الاندفاع|تندفع أكثر وأسرع.", "Dashmaster|You dash more often.") },
    { "mage", T("عين الساحر|كرة الروح تؤذي أكثر.", "Mage's Eye|Your soul orb strikes harder.") },
    { "fury", T("غضب الساقط|حين يبقى لك قناعٌ واحد، يشتدّ نصلك.", "Fury of the Fallen|With one mask left, your blade grows fierce.") },
    { "soles", T("نعال الجمر|الأشواك والحمض لا تؤذيك.", "Ember Soles|Spikes and acid do you no harm.") },
  };
  public static readonly string[] Controls = T("لوحة قديمة: ◀ ▶ للحركة، القفز في يمين الشاشة، والسيف بزرّه. ▲ قرب الناس والمقاعد واللوحات للتحدّث والراحة والقراءة. الضربة تملأ الروح، والروح تشفي جراحك.",
    "An old tablet: ◀ ▶ to move, jump on the right of the screen, and the blade on its button. ▲ near people, benches and tablets to talk, rest and read. Blows gather soul, and soul heals wounds.");
}
