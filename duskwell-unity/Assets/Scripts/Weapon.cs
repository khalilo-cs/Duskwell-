// One blade only, the Ember Blade, and it grows slowly and at a price. Each of its five stages is forged by the smith Qarn,
// and he forges it only when everything it asks is there: pale ember ore (one from each charm warden and each road lord, thirteen
// in all, ten needed), geo, shards of the Lantern won back, creatures put down, and for the last two stages the road lords beaten.
// Each stage strikes harder, reaches further, swings quicker and burns brighter; the last gathers more soul. Its pictures are
// painted (Resources/blade). Also the shade: who falls leaves the geo with a shadow of themselves, where they fell; beat it to take
// the geo back; fall again first and it is lost.
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  public class Stage { public string[] name, desc; public int dmg, reach, ore, geo, seals, kills, roads; public float cd; public Color arc; }
  static readonly Stage[] BLADE = {
    new Stage { name = new[] { "نصل الجذوة البالي", "The Worn Ember Blade" }, desc = new[] { "نصلٌ قديم خرج معك من البئر. حدّه مثلوم، لكنه يعرفك.", "An old blade that came up the well with you. Its edge is notched, but it knows you." }, dmg = 5, reach = 0, cd = 0.42f, arc = Color.white },
    new Stage { name = new[] { "النصل المشحوذ", "The Honed Blade" }, desc = new[] { "شحذه قَرن على حجر الجذوة. يقطع أعمق.", "Qarn honed it on ember ore. It cuts deeper." }, dmg = 8, reach = 6, cd = 0.4f, ore = 1, geo = 300, seals = 1, kills = 0, roads = 0, arc = new Color(1, 0.97f, 0.9f) },
    new Stage { name = new[] { "النصل المسقي", "The Tempered Blade" }, desc = new[] { "سُقي في ماء القنوات الغارقة. أطول وأثبت.", "Quenched in the drowned channels. Longer, and steadier." }, dmg = 11, reach = 12, cd = 0.38f, ore = 2, geo = 800, seals = 4, kills = 60, roads = 0, arc = new Color(0.85f, 0.95f, 1) },
    new Stage { name = new[] { "نصل الجمر", "The Ember-Forged Blade" }, desc = new[] { "صُهر من جديد في نار أعماق الجمر. يتوهّج حدّه ويضرب أسرع.", "Forged again in Cinderdeep's fire. Its edge glows, and it strikes quicker." }, dmg = 15, reach = 20, cd = 0.35f, ore = 3, geo = 1600, seals = 8, kills = 150, roads = 2, arc = new Color(1, 0.72f, 0.45f) },
    new Stage { name = new[] { "نصل الغسق", "The Dusk Blade" }, desc = new[] { "ضوءٌ ليس نهاراً ولا ليلاً. كل ضربةٍ منه تجمع روحاً أكثر.", "A light neither day nor night. Every blow gathers more soul." }, dmg = 20, reach = 28, cd = 0.32f, ore = 4, geo = 3000, seals = 12, kills = 300, roads = 4, arc = new Color(1, 0.8f, 1) },
  };
  static readonly string[] ROADS = { "thunderhoof", "duelist", "bonewright", "stargazer" };
  int blade, ore, kills;
  int Roads() { int n = 0; foreach (var r in ROADS) if (Beaten(r)) n++; return n; }
  int Reach() { return BLADE[blade].reach; }
  float AtkCD() { return BLADE[blade].cd; }
  void InitBlade() { blade = Mathf.Clamp(PlayerPrefs.GetInt("blade", 0), 0, BLADE.Length - 1); ore = PlayerPrefs.GetInt("ore", 0); kills = PlayerPrefs.GetInt("kills", 0); }
  void GainOre(string[] why) {
    ore++; PlayerPrefs.SetInt("ore", ore); PlayerPrefs.Save(); Play("w_geo_2", 0.9f);
    StartTalk(new[] { "حجر الجذوة الشاحب", "Pale Ember Ore" }, Tex("ui/ore"), new List<string[]> { new[] { why[0] + " معك الآن " + ore + " من حجر الجذوة. الحدّاد قَرن يحتاجه لتطوير نصلك.", why[1] + " You now carry " + ore + " pale ember ore. Qarn the smith needs it to grow your blade." } }, null, null, 0.5f);
  }
  // what the next stage still lacks, each line with ✓ or ✗
  List<string[]> NeedLines(Stage s, out bool all) {
    var l = new List<string[]>(); bool every = true; int seals = Seals(), roads = Roads();
    System.Action<bool, string, string> add = (ok, a, e) => { if (!ok) every = false; l.Add(new[] { (ok ? "✓ " : "✗ ") + a, (ok ? "✓ " : "✗ ") + e }); };
    add(ore >= s.ore, "حجر الجذوة: " + ore + " / " + s.ore, "Ember ore: " + ore + " / " + s.ore);
    add(geo >= s.geo, "الجيو: " + geo + " / " + s.geo, "Geo: " + geo + " / " + s.geo);
    add(seals >= s.seals, "شظايا القنديل: " + seals + " / " + s.seals, "Lantern shards: " + seals + " / " + s.seals);
    if (s.kills > 0) add(kills >= s.kills, "مخلوقات هزمتها: " + kills + " / " + s.kills, "Creatures beaten: " + kills + " / " + s.kills);
    if (s.roads > 0) add(roads >= s.roads, "حرّاس الطرق: " + roads + " / " + s.roads, "Road lords: " + roads + " / " + s.roads);
    all = every; return l;
  }
  // the smith's offer: forge the next stage, or tell what is missing
  List<Choice> SmithChoices() {
    var ch = new List<Choice>();
    if (blade >= BLADE.Length - 1) { ch.Add(new Choice { label = new[] { "نصلك بلغ غايته", "Your blade is complete" }, act = null }); return ch; }
    var next = BLADE[blade + 1];
    ch.Add(new Choice { label = new[] { "اصهر: " + next.name[0], "Forge: " + next.name[1] }, act = () => {
      bool all; var need = NeedLines(next, out all);
      if (!all) {
        need.Insert(0, new[] { "ليس بعد. هذا ما ينقصنا:", "Not yet. This is what we lack:" });
        StartTalk(new[] { "الحدّاد قَرن", "Qarn the Smith" }, Tex("npc/npc_smith"), need, null, null, 0.3f); return;
      }
      ore -= next.ore; geo -= next.geo; blade++;
      PlayerPrefs.SetInt("ore", ore); PlayerPrefs.SetInt("geo", geo); PlayerPrefs.SetInt("blade", blade); PlayerPrefs.Save();
      Play("w_slam_0", 0.9f); Blow(0.1f, 8);
      StartScene(new[] { new Story.Panel("story/forge", "ضرب قَرن الحديد حتى غنّى… «" + next.name[0] + "». " + next.desc[0], "Qarn struck the iron until it sang... '" + next.name[1] + "'. " + next.desc[1]) }, "forge", () =>
      {
        var said = new List<string[]> { new[] { "ضرر " + next.dmg + " · مدى +" + next.reach + " · سرعة أعلى", "Damage " + next.dmg + " · reach +" + next.reach + " · quicker" } };
        var learned = ArtLearned(blade); if (learned != null) said.Add(learned);            // a new art of the blade (Arts.cs)
        StartTalk(next.name, Tex("blade/blade_" + blade), said, null, null, 0.4f);
      });
    } });
    ch.Add(new Choice { label = new[] { "ماذا يحتاج نصلي؟", "What does my blade need?" }, act = () => {
      bool all; var need = NeedLines(next, out all); need.Insert(0, new[] { "لـ«" + next.name[0] + "» نحتاج:", "For '" + next.name[1] + "' we need:" });
      StartTalk(new[] { "الحدّاد قَرن", "Qarn the Smith" }, Tex("blade/blade_" + (blade + 1)), need, null, null, 0.3f);
    } });
    ch.Add(new Choice { label = new[] { "وداعاً", "Farewell" }, act = null });
    return ch;
  }

  // ---------------------------------------------------------------- the shade
  void LeaveShade() {
    if (geo <= 0) return;
    PlayerPrefs.SetString("shade_room", room.id); PlayerPrefs.SetFloat("shade_x", x + PW / 2); PlayerPrefs.SetFloat("shade_y", y + PH / 2); PlayerPrefs.SetInt("shade_geo", geo);
    geo = 0; PlayerPrefs.SetInt("geo", 0); PlayerPrefs.Save();
  }
  void SpawnShade() {
    if (PlayerPrefs.GetString("shade_room", "") != room.id || PlayerPrefs.GetInt("shade_geo", 0) <= 0) return;
    Sprite[] fr; if (!anims.TryGetValue("idle", out fr)) return;
    var d = new CreatureData { type = "shade", w = PW, h = PH, hp = 20 + blade * 8, fw = 0, fh = 0, ppu = 1 };
    var go = new GameObject("Shade"); go.transform.SetParent(roomGo.transform, false);
    var f = new Foe { d = d, fr = fr, sr = go.AddComponent<SpriteRenderer>(), hp = d.hp, maxHp = d.hp, x = PlayerPrefs.GetFloat("shade_x") - PW / 2, y = PlayerPrefs.GetFloat("shade_y") - PH / 2, mode = 1 };
    f.homeY = f.y; f.px = f.x; f.py = f.y; f.sr.sortingOrder = 9; foes.Add(f);
  }
  void ShadeDown() {
    int g = PlayerPrefs.GetInt("shade_geo", 0); geo += g; PlayerPrefs.SetInt("geo", geo); PlayerPrefs.DeleteKey("shade_room"); PlayerPrefs.SetInt("shade_geo", 0); PlayerPrefs.Save();
    Toast(new[] { "استعدتَ " + g + " جيو من ظلّك.", "You took back " + g + " geo from your shade." }); Play("w_heal_1", 0.8f);
  }
}
