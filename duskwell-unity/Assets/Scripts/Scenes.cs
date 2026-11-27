// The painted scenes of the journey, besides the prologue and the ending:
//   each area, the first time the hero walks into it: its painting (Resources/story/a_<area>) with its words, then its card
//   each shard's memory, when its lord falls: a painting of the memory (Resources/story/m_<lord>)
//   the first fall: the shade left behind (Resources/story/shade)
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
}
