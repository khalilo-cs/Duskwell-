// The painted scenes of the journey, besides the prologue and the ending:
//   each area, the first time the hero walks into it: its painting (Resources/story/a_<area>) with its words, then its card
//   each shard's memory, when its lord falls: a painting of the memory (Resources/story/m_<lord>)
//   the first fall: the shade left behind (Resources/story/shade)
//   each power, when it is found or taught: its painting (Resources/story/w_<power>)
//   the first meeting with each of the people: their painting (Resources/story/n_<who>)
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  bool AreaScene(string area, string theme, string[] name, string[] line) {
    if (mode != Mode.Play || Dreaming() || PlayerPrefs.GetInt("ascene_" + area, 0) == 1 || Tex("story/a_" + area) == null) return false;
    PlayerPrefs.SetInt("ascene_" + area, 1); PlayerPrefs.Save();
    StartScene(new[] { new Story.Panel("story/a_" + area, name[0] + "… " + line[0], name[1] + "... " + line[1]) }, null, () => Card(null, name, line, 4.2f, true));
    return true;
  }
  bool MemoryScene(string key, string[] mem, List<string[]> fall, string[] shardLine, System.Action after) {
    if (Tex("story/m_" + key) == null) return false;
    System.Action show = () => StartScene(new[] { new Story.Panel("story/m_" + key, mem[0], mem[1]) }, "legend", () => { Toast(shardLine); if (after != null) after(); });
    if (fall.Count > 0) StartTalk(new[] { "ذكرى", "A Memory" }, shardTex, fall, null, show, 1.6f); else show();
    return true;
  }
  // the first fall of all: what the shade is, told once over its painting
  bool ShadeScene() {
    if (PlayerPrefs.GetInt("shade_told", 0) == 1 || PlayerPrefs.GetInt("shade_geo", 0) <= 0 || Tex("story/shade") == null) return false;
    PlayerPrefs.SetInt("shade_told", 1); PlayerPrefs.Save();
    StartScene(new[] { new Story.Panel("story/shade",
      "سقطتَ… لكنّ الجذوة لا تنطفئ بسهولة. عدتَ إلى آخر مقعدٍ استرحت عليه، وبقي ظلّك حيث سقطت، يقبض على كل ما جمعت من جيو. ارجع إليه واهزمه لتستعيده.",
      "You fell... but an ember does not go out so easily. You woke at the last bench you rested on, and your shade stayed where you fell, clutching all the geo you gathered. Go back and beat it to take it back.") }, null, null);
    return true;
  }
  void PowerScene(string power, System.Action then) {
    string[] pw;
    if (!Story.Power.TryGetValue(power, out pw) || Tex("story/w_" + power) == null) { if (then != null) then(); return; }
    StartScene(new[] { new Story.Panel("story/w_" + power, pw[0].Split('|')[0] + "… " + pw[0].Split('|')[1], pw[1].Split('|')[0] + "... " + pw[1].Split('|')[1]) }, "legend", then);
  }
  static readonly Dictionary<string, string[]> MEET = new Dictionary<string, string[]> {
    { "elder", new[] { "عند فوهة البئر في وادي الهمس جلس شيخٌ عجوز يحرس نوراً لم يعد موجوداً… الشيخ أوراد.", "By the mouth of the well in Hushvale sat an old man, keeping watch over a light that is no more... Elder Awrad." } },
    { "merchant", new[] { "تحت مظلّةٍ مرقّعة، بين الصناديق والفوانيس الصغيرة، يبتسم تاجرٌ لكل من يحمل جيو… مِرزا.", "Under a patched awning, among crates and little lanterns, a merchant smiles at anyone carrying geo... Mirza." } },
    { "smith", new[] { "في ورشةٍ لا تنطفئ نارها، يضرب حدّادٌ ضخم الحديد كأنه يحادثه… قَرن.", "In a forge whose fire never dies, a huge smith strikes the iron as if talking to it... Qarn." } },
    { "wizard", new[] { "بين الشموع والنجوم المرسومة على الأرض، امرأةٌ تقرأ ما لم يحدث بعد… العرّافة سَراب.", "Among candles and stars drawn on the floor, a woman reads what has not happened yet... Sarab the Seer." } },
    { "trader", new[] { "رحّالةٌ يحمل على ظهره أكواماً من الخرائط الملفوفة، يعرف كل طريقٍ تحت الأرض… ويبيعه.", "A wayfarer with stacks of rolled maps on their back, who knows every road beneath the earth... and sells it." } },
  };
  bool MeetScene(string who, System.Action then) {
    string[] line;
    if (PlayerPrefs.GetInt("met_" + who, 0) == 1 || !MEET.TryGetValue(who, out line) || Tex("story/n_" + who) == null) return false;
    PlayerPrefs.SetInt("met_" + who, 1); PlayerPrefs.Save();
    StartScene(new[] { new Story.Panel("story/n_" + who, line[0], line[1]) }, null, then);
    return true;
  }
}
