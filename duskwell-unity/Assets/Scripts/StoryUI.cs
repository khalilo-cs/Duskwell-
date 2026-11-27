// What is shown over the world: the title, the told story (painted panels that drift slowly, the words under them), talks with
// the people (their painted portrait, their name, their words, the shop), the cards that name an area or a lord as it rises,
// short notes, the soul vessel and the geo. Arabic first, English under it.
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  enum Mode { Title, Scene, Talk, Play, Menu }
  Mode mode = Mode.Title;
  Font font, titleFont, useFont; Texture2D flourish, shadeTex; Texture2D frameTex, vesselTex, vesselFull, geoTex, shardTex, blackTex;
  Story.Panel[] scene; int sceneI; float sceneT; System.Action sceneDone; Texture2D scenePrev;
  class Choice { public string[] label; public System.Action act; }
  string[] talkName; Texture2D talkPic; List<string[]> talkLines; int talkI; float talkT, talkWait; System.Action talkDone; List<Choice> choices; Rect talkUv = new Rect(0, 0, 1, 1);
  string[] cardTitle, cardName, cardLine; float cardT, cardLife; bool cardBig; string[] toast; float toastT;
  readonly Dictionary<string, List<string>> wrapCache = new Dictionary<string, List<string>>();

  void InitUi() {
    font = Resources.Load<Font>("font/cairo"); titleFont = Resources.Load<Font>("font/title"); if (titleFont == null) titleFont = font; flourish = Tex("ui/flourish"); shadeTex = Tex("ui/mist"); blackTex = new Texture2D(1, 1); blackTex.SetPixel(0, 0, Color.black); blackTex.Apply();
    frameTex = Tex("ui/frame"); vesselTex = Tex("ui/vessel"); vesselFull = Tex("ui/vessel_full"); geoTex = Tex("ui/geo"); shardTex = Tex("ui/shard");
    mode = Mode.Title; PlayMusic("legend");
  }
  bool Tapped() { return Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.Z) || Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.Space); }
  void UiInput() {
    if (mode == Mode.Scene) {
      sceneT += Time.deltaTime;
      if ((Tapped() && sceneT > 0.7f) || sceneT > 8.5f) NextPanel();
    } else if (mode == Mode.Talk) {
      talkT += Time.deltaTime;
      if (talkT > talkWait + 0.35f && Tapped() && (choices == null || talkI < talkLines.Count - 1)) NextLine();
    }
  }
  // ---------------------------------------------------------------- the told story
  void StartScene(Story.Panel[] panels, string music, System.Action done) {
    scene = panels; sceneI = 0; sceneT = 0; sceneDone = done; scenePrev = null; mode = Mode.Scene; PlayMusic(music);
  }
  void NextPanel() {
    scenePrev = PanelTex(scene[sceneI]); sceneI++; sceneT = 0;
    if (sceneI >= scene.Length) { mode = Mode.Play; RestoreMusic(); var d = sceneDone; sceneDone = null; if (d != null) d(); }
  }
  Texture2D PanelTex(Story.Panel p) { var t = Tex(p.pic); if (t == null) t = Tex("bg/" + (p.pic.Contains("e") ? "throne" : "town")); return t; }
  void DrawCover(Texture2D t, float zoom, float panX, float alpha) {
    if (t == null) return;
    float s = Mathf.Max(Screen.width / (float)t.width, Screen.height / (float)t.height) * zoom, w = t.width * s, h = t.height * s;
    GUI.color = new Color(1, 1, 1, alpha); GUI.DrawTexture(new Rect((Screen.width - w) / 2 + panX * (w - Screen.width) / 2, (Screen.height - h) / 2, w, h), t); GUI.color = Color.white;
  }
  // ---------------------------------------------------------------- talks
  void StartTalk(string[] name, Texture2D pic, List<string[]> lines, List<Choice> ch, System.Action done, float wait) {
    talkName = name; talkPic = pic; talkLines = lines; talkI = 0; talkT = 0; talkWait = wait; choices = ch; talkDone = done; mode = Mode.Talk;
    talkUv = pic != null && pic.name.StartsWith("npc_") ? new Rect(0, 0, 0.5f, 1) : new Rect(0, 0, 1, 1);
  }
  void NextLine() {
    talkI++; talkT = 0; talkWait = 0;
    if (talkI >= talkLines.Count) { mode = Mode.Play; var d = talkDone; talkDone = null; if (d != null) d(); }
  }
  void TalkTo(Prop p) {
    var n = (NpcData)p.data; Story.Person who; if (!Story.People.TryGetValue(n.type, out who)) return;
    int s = Seals(), stage = s == 0 ? 0 : s <= 6 ? 1 : s < 12 ? 2 : 3; var says = who.says[Mathf.Min(stage, who.says.Length - 1)];
    var lines = new List<string[]>(says);
    List<Choice> ch = null; System.Action done = null;
    if (n.type == "merchant") {
      int price = 200 + (maxHp - 5) * 150;
      ch = new List<Choice> {
        new Choice { label = new[] { maxHp < 9 ? "قناعٌ إضافي — " + price + " جيو" : "نفدت الأقنعة", maxHp < 9 ? "An extra mask — " + price + " geo" : "Masks sold out" }, act = () => {
          if (maxHp >= 9) return; if (geo < price) { Toast(new[] { "لا يكفي الجيو.", "Not enough geo." }); return; }
          geo -= price; maxHp++; hp = maxHp; PlayerPrefs.SetInt("maxhp", maxHp); PlayerPrefs.SetInt("geo", geo); PlayerPrefs.Save(); Play("w_geo_0", 0.8f); Toast(new[] { "صار لك قناعٌ جديد.", "You gained a mask." }); } },
        new Choice { label = new[] { "وداعاً", "Farewell" }, act = null } };
      lines.Add(new[] { "ماذا تشتري؟", "What will you buy?" });
    } else if (n.type == "wizard") {
      int sl = Seals(); string teach = sl >= 8 && !Has("star") ? "star" : sl >= 4 && !Has("cry") ? "cry" : null;
      if (teach != null) {
        var pw = Story.Power[teach]; lines.Add(new[] { "اقترب… سأعلّمك ما تعلّمته من النجوم.", "Come closer... I will teach you what the stars taught me." });
        done = () => { PlayerPrefs.SetInt("abil_" + teach, 1); PlayerPrefs.Save(); Play("w_ability_1", 0.9f); StartTalk(new[] { pw[0].Split('|')[0], pw[1].Split('|')[0] }, Tex("ui/power_" + teach), new List<string[]> { new[] { pw[0].Split('|')[1], pw[1].Split('|')[1] } }, null, null, 0.4f); };
      } else if (sl < 4) lines.Add(new[] { "عُد إليّ ومعك أربع شظايا، وسأعلّمك صرخة الغسق.", "Come back with four shards, and I will teach you the Dusk Cry." });
    } else if (n.type == "trader") {
      string ar0 = room.area; string[] an; Story.Area.TryGetValue(ar0, out an); string nm = an != null ? an[0].Split('|')[0] : ar0;
      ch = new List<Choice> {
        new Choice { label = new[] { PlayerPrefs.GetInt("map_" + ar0, 0) == 1 ? "اشتريت خريطة " + nm : "خريطة " + nm + " — 120 جيو", "Map of the area — 120 geo" }, act = () => {
          if (PlayerPrefs.GetInt("map_" + ar0, 0) == 1) return; if (geo < 120) { Toast(new[] { "لا يكفي الجيو.", "Not enough geo." }); return; }
          geo -= 120; PlayerPrefs.SetInt("geo", geo); PlayerPrefs.SetInt("map_" + ar0, 1); PlayerPrefs.Save(); Play("w_geo_0", 0.8f); Toast(new[] { "صارت خريطة " + nm + " معك. افتحها من القائمة.", "The area's map is yours. Open it from the menu." }); } },
        new Choice { label = new[] { "وداعاً", "Farewell" }, act = null } };
      lines.Add(new[] { "رسمتُ هذه الأنحاء بيدي. أتريد خريطتها؟", "I drew these parts by hand. Do you want their map?" });
    } else if (n.type == "smith") {
      ch = SmithChoices(); lines.Add(new[] { "ماذا نصنع بنصلك؟", "What shall we make of your blade?" });
    }
    PlayVoice("npc_" + (n.type == "merchant" || n.type == "smith" || n.type == "elder" || n.type == "outfitter" || n.type == "wizard" || n.type == "trader" ? n.type : "merchant") + "_0");
    StartTalk(who.name, Tex("npc/npc_" + n.type + (n.type == "trader" && !string.IsNullOrEmpty(n.shop) ? "_" + n.shop : "")) ?? Tex("npc/npc_" + n.type), lines, ch, done, 0.2f);
  }
  // ---------------------------------------------------------------- cards and notes
  void Card(string[] title, string[] name, string[] line, float life, bool big) { cardTitle = title; cardName = name; cardLine = line; cardT = 0; cardLife = life; cardBig = big; }
  void Toast(string[] t) { toast = t; toastT = 0; }

  // ---------------------------------------------------------------- text
  GUIStyle Style(float size, Color c, TextAnchor al) { var st = new GUIStyle(); st.font = useFont != null ? useFont : font; st.fontSize = Mathf.Max(8, (int)size); st.normal.textColor = c; st.alignment = al; st.richText = false; return st; }
  float Say(Rect r, string s, float size, Color c, TextAnchor al, float alpha = 1) {
    if (string.IsNullOrEmpty(s)) return 0;
    bool ar = Ar.IsArabic(s); if (ar && al == TextAnchor.UpperLeft) al = TextAnchor.UpperRight;
    var st = Style(size, new Color(c.r, c.g, c.b, c.a * alpha), al); var sh = Style(size, new Color(0, 0, 0, 0.75f * alpha), al);
    string key = s + "|" + (int)size + "|" + (int)r.width + (useFont == titleFont ? "t" : ""); List<string> lines;
    if (!wrapCache.TryGetValue(key, out lines)) { lines = Ar.Wrap(s, st, r.width); if (wrapCache.Count > 400) wrapCache.Clear(); wrapCache[key] = lines; }
    float lh = size * 1.5f;
    for (int i = 0; i < lines.Count; i++) {
      var lr = new Rect(r.x, r.y + i * lh, r.width, lh);
      GUI.Label(new Rect(lr.x + size * 0.08f, lr.y + size * 0.08f, lr.width, lr.height), lines[i], sh); GUI.Label(lr, lines[i], st);
    }
    return lines.Count * lh;
  }
  float Both(Rect r, string[] t, float size, Color c, TextAnchor al, float alpha = 1) {
    if (t == null) return 0;
    float h = Say(r, t[0], size, c, al, alpha);
    if (t.Length > 1 && t[1] != t[0]) h += Say(new Rect(r.x, r.y + h + size * 0.1f, r.width, r.height), t[1], size * 0.62f, new Color(c.r * 0.8f, c.g * 0.85f, c.b * 0.95f, c.a * 0.85f), al == TextAnchor.UpperRight ? TextAnchor.UpperLeft : al, alpha) + size * 0.1f;
    return h;
  }

  // a title in the title type (an elegant serif), between two painted flourishes when asked
  float Title(Rect r, string[] t, float size, Color c, TextAnchor al, float alpha, bool above, bool below) {
    float y = r.y, fw = Mathf.Min(r.width, size * 9), fh = fw * 0.22f;
    float fx = al == TextAnchor.UpperCenter ? r.center.x - fw / 2 : al == TextAnchor.UpperRight ? r.xMax - fw : r.x;
    if (above && flourish != null) { GUI.color = new Color(1, 1, 1, alpha); GUI.DrawTexture(new Rect(fx, y, fw, fh), flourish); GUI.color = Color.white; y += fh * 0.85f; }
    useFont = titleFont; float h = Say(new Rect(r.x, y, r.width, r.height), t[0], size, c, al, alpha); useFont = null; y += h;
    if (t.Length > 1 && t[1] != t[0]) { useFont = titleFont; y += Say(new Rect(r.x, y - size * 0.15f, r.width, r.height), t[1].ToUpper(), size * 0.42f, new Color(c.r * 0.85f, c.g * 0.85f, c.b * 0.9f, c.a), al == TextAnchor.UpperRight ? TextAnchor.UpperRight : al, alpha * 0.85f); useFont = null; }
    if (below && flourish != null) { GUI.color = new Color(1, 1, 1, alpha); GUI.DrawTextureWithTexCoords(new Rect(fx, y, fw, fh), flourish, new Rect(0, 1, 1, -1)); GUI.color = Color.white; y += fh; }
    return y - r.y;
  }
  // ---------------------------------------------------------------- the whole screen: the title and the told story
  bool DrawFull() {
    float H = Screen.height, W = Screen.width;
    if (DrawMenu(W, H)) return true;
    if (mode == Mode.Title) {
      DrawCover(Tex("bg/title"), 1.04f + 0.03f * Mathf.Sin(Time.time * 0.15f), Mathf.Sin(Time.time * 0.1f) * 0.3f, 1);
      var bn = Tex("story/banner"); if (bn != null) { float bw = W * 0.62f, bh = bw * bn.height / bn.width; GUI.DrawTexture(new Rect((W - bw) / 2, H * 0.1f, bw, bh), bn); }
      bool has = PlayerPrefs.HasKey("room") && PlayerPrefs.GetInt("prologue", 0) == 1;
      float y0 = H * 0.6f, bh2 = H * 0.09f;
      if (has && MenuWord(new Rect(W * 0.3f, y0, W * 0.4f, bh2), "متابعة الرحلة")) { mode = Mode.Play; RestoreMusic(); }
      if (MenuWord(new Rect(W * 0.3f, y0 + (has ? bh2 * 1.1f : 0), W * 0.4f, bh2), "رحلة جديدة")) NewJourney();
      return true;
    }
    if (mode == Mode.Scene && scene != null && sceneI < scene.Length) {
      GUI.DrawTexture(new Rect(0, 0, W, H), blackTex);
      var p = scene[sceneI]; float k = Mathf.Clamp01(sceneT / 1.2f);
      if (scenePrev != null && k < 1) DrawCover(scenePrev, 1.14f, 0.2f, 1 - k);
      DrawCover(PanelTex(p), 1.04f + sceneT * 0.012f, -0.25f + sceneT * 0.05f, k);
      GUI.color = new Color(0, 0, 0, 0.92f); GUI.DrawTexture(new Rect(0, 0, W, H * 0.08f), blackTex); GUI.DrawTexture(new Rect(0, H * 0.74f, W, H * 0.26f), blackTex); GUI.color = Color.white;
      float a = Mathf.Clamp01((sceneT - 0.5f) / 1.0f);
      Both(new Rect(W * 0.08f, H * 0.765f, W * 0.84f, H * 0.22f), new[] { p.ar, p.en }, H * 0.045f, new Color(0.96f, 0.93f, 0.86f, 1), TextAnchor.UpperCenter, a);
      if (Button(new Rect(W * 0.84f, H * 0.012f, W * 0.14f, H * 0.06f), new[] { "تخطٍّ", "Skip" }, 0.6f)) { sceneI = scene.Length - 1; NextPanel(); }
      return true;
    }
    return false;
  }
  // a word of the title menu: the title type, a diamond on each side when the finger or the mouse is over it
  bool MenuWord(Rect r, string w) {
    bool over = r.Contains(Event.current.mousePosition);
    useFont = titleFont; Say(new Rect(r.x, r.y + r.height * 0.12f, r.width, r.height), over ? "◆   " + w + "   ◆" : w, r.height * 0.5f, new Color(1, 0.98f, 0.94f, 1), TextAnchor.UpperCenter); useFont = null;
    return GUI.Button(r, GUIContent.none, GUIStyle.none);
  }
  bool Button(Rect r, string[] label, float k = 1) {
    var tb = btnBase; if (frameTex != null) { GUI.color = new Color(1, 1, 1, 0.9f); GUI.DrawTexture(r, frameTex); GUI.color = Color.white; }
    else if (tb != null) { GUI.color = new Color(1, 1, 1, 0.55f); GUI.DrawTexture(new Rect(r.x + r.width / 2 - r.height / 2, r.y, r.height, r.height), tb); GUI.color = Color.white; }
    Say(new Rect(r.x, r.y + r.height * 0.18f, r.width, r.height), label[0], r.height * 0.42f * k, new Color(1, 0.95f, 0.82f, 1), TextAnchor.UpperCenter);
    return GUI.Button(r, GUIContent.none, GUIStyle.none);
  }
  void NewJourney() {
    PlayerPrefs.DeleteAll(); PlayerPrefs.SetInt("prologue", 1); PlayerPrefs.Save();
    maxHp = 5; hp = 5; geo = 0; blade = 0; ore = 0; kills = 0; soul = 0; lastArea = "";
    Enter(startRoom, startX, startY);
    StartScene(Story.Prologue, "overture", () => Toast(new[] { "تحدّث مع الشيخ أوراد في القرية (▲).", "Speak with Elder Awrad in the village (▲)." }));
  }

  // ---------------------------------------------------------------- over the world: talks, cards, notes, the soul, the geo, more buttons
  void DrawOver() {
    float H = Screen.height, W = Screen.width, hs = H * 0.07f;
    // the soul vessel and the geo
    if (vesselTex != null) {
      var vr = new Rect(W * 0.03f - hs * 0.1f, H * 0.03f - hs * 0.25f, hs * 1.6f, hs * 1.6f); GUI.DrawTexture(vr, vesselTex);
      if (vesselFull != null) { float k = soul / 99f; GUI.DrawTextureWithTexCoords(new Rect(vr.x, vr.y + vr.height * (1 - k), vr.width, vr.height * k), vesselFull, new Rect(0, 0, 1, k)); }
    }
    if (geoTex != null) GUI.DrawTexture(new Rect(W * 0.03f + hs * 1.9f, H * 0.03f + hs * 1.15f, hs * 0.7f, hs * 0.7f), geoTex);
    Say(new Rect(W * 0.03f + hs * 2.7f, H * 0.03f + hs * 1.12f, W * 0.3f, hs), geo.ToString(), hs * 0.55f, new Color(1, 0.95f, 0.8f, 1), TextAnchor.UpperLeft);
    // the extra buttons: talk / rest / read, soul, dive
    if (mode == Mode.Play && btnBase != null) {
      GUI.color = new Color(1, 1, 1, 0.75f);
      if (near != null) { GUI.DrawTexture(BtnUp, btnBase); Say(new Rect(BtnUp.x, BtnUp.y + BtnUp.height * 0.18f, BtnUp.width, BtnUp.height), "▲", BtnUp.height * 0.4f, Color.white, TextAnchor.UpperCenter); }
      GUI.color = new Color(1, 1, 1, soul >= 33 ? 0.8f : 0.4f); GUI.DrawTexture(BtnSoul, vesselTex != null ? vesselTex : btnBase);
      if (Has("dive")) { GUI.color = new Color(1, 1, 1, 0.75f); GUI.DrawTexture(BtnDive, btnBase); Say(new Rect(BtnDive.x, BtnDive.y + BtnDive.height * 0.18f, BtnDive.width, BtnDive.height), "▼", BtnDive.height * 0.4f, Color.white, TextAnchor.UpperCenter); }
      GUI.color = Color.white;
      if (near != null) {                                                          // what the ▲ does here, over the thing
        var sp = cam.WorldToScreenPoint(new Vector3(near.x, -(near.y - 120), 0));
        string[] what = near.kind == "npc" ? new[] { "تحدّث", "Talk" } : near.kind == "bench" ? new[] { "استرح", "Rest" } : new[] { "اقرأ", "Read" };
        Say(new Rect(sp.x - W * 0.1f, H - sp.y, W * 0.2f, hs), "▲ " + what[0], hs * 0.45f, new Color(1, 0.93f, 0.75f, 1), TextAnchor.UpperCenter);
      }
    }
    if (mode == Mode.Play && btnBase != null) {                                   // the pause screen: bag and map
      var mr = new Rect(W - hs * 1.7f, H * 0.03f, hs * 1.3f, hs * 1.3f); GUI.color = new Color(1, 1, 1, 0.8f); GUI.DrawTexture(mr, btnBase); GUI.color = Color.white;
      Say(new Rect(mr.x, mr.y + mr.height * 0.15f, mr.width, mr.height), "☰", mr.height * 0.45f, Color.white, TextAnchor.UpperCenter);
      if (GUI.Button(mr, GUIContent.none, GUIStyle.none)) OpenMenu();
    }
    // the lord's name over its bar
    if (bossNow != null && bossNow.hp > 0 && mode == Mode.Play) {
      string[] nm = bossNow.champ ? new[] { "حارس التعويذة", "Charm Warden" } : Story.Lords.ContainsKey(bossNow.d.type) ? Story.Lords[bossNow.d.type].name : null;
      if (nm != null) Say(new Rect(W * 0.25f, H * 0.075f, W * 0.5f, hs), nm[0], hs * 0.42f, new Color(1, 0.9f, 0.85f, 1), TextAnchor.UpperCenter);
    }
    // a card: an area as it is entered, a lord as it rises
    if (cardName != null) {
      cardT += Time.deltaTime; float a = Mathf.Clamp01(cardT / 0.6f) * Mathf.Clamp01((cardLife - cardT) / 0.8f);
      if (cardT > cardLife) cardName = null;
      else {
        if (cardTitle != null) {                                                  // a lord rises: its title small, its name large, low on the screen
          float y = H * 0.66f; var r = new Rect(W * 0.04f, y, W * 0.92f, H);
          useFont = titleFont; y += Say(new Rect(r.x, y, r.width, H), cardTitle[0], H * 0.045f, new Color(0.9f, 0.9f, 0.92f, 1), TextAnchor.UpperRight, a);
          y += Say(new Rect(r.x, y - H * 0.02f, r.width, H), cardName[0], H * 0.11f, new Color(1, 1, 1, 1), TextAnchor.UpperRight, a);
          if (cardName.Length > 1) y += Say(new Rect(r.x, y - H * 0.03f, r.width, H), cardName[1].ToUpper(), H * 0.04f, new Color(0.85f, 0.85f, 0.9f, 1), TextAnchor.UpperRight, a * 0.85f); useFont = null;
          if (cardLine != null) Both(new Rect(W * 0.1f, H * 0.12f, W * 0.8f, H), cardLine, H * 0.036f, new Color(0.92f, 0.9f, 0.88f, 1), TextAnchor.UpperCenter, a);
        } else if (cardBig) {                                                     // an area: its name between two flourishes, a line under it
          float y = H * 0.12f + Title(new Rect(W * 0.1f, H * 0.12f, W * 0.8f, H), cardName, H * 0.085f, new Color(1, 1, 1, 1), TextAnchor.UpperCenter, a, true, true);
          if (cardLine != null) Both(new Rect(W * 0.15f, y + H * 0.01f, W * 0.7f, H * 0.2f), cardLine, H * 0.032f, new Color(0.85f, 0.85f, 0.88f, 1), TextAnchor.UpperCenter, a);
        } else {
          float y = H * 0.13f + Title(new Rect(W * 0.1f, H * 0.13f, W * 0.8f, H), cardName, H * 0.05f, new Color(1, 0.95f, 0.9f, 1), TextAnchor.UpperCenter, a, false, false);
          if (cardLine != null) Both(new Rect(W * 0.15f, y, W * 0.7f, H * 0.2f), cardLine, H * 0.036f, new Color(0.92f, 0.9f, 0.88f, 1), TextAnchor.UpperCenter, a);
        }
      }
    }
    if (toast != null) {
      toastT += Time.deltaTime; float a = Mathf.Clamp01(toastT / 0.3f) * Mathf.Clamp01((3.2f - toastT) / 0.6f);
      if (toastT > 3.2f) toast = null;
      else { if (flourish != null) { GUI.color = new Color(1, 1, 1, a * 0.8f); GUI.DrawTexture(new Rect(W * 0.38f, H * 0.36f, W * 0.24f, W * 0.24f * 0.22f), flourish); GUI.color = Color.white; } Both(new Rect(W * 0.15f, H * 0.42f, W * 0.7f, H * 0.2f), toast, H * 0.038f, new Color(1, 0.97f, 0.92f, 1), TextAnchor.UpperCenter, a); }
    }
    if (deadT > 0) { GUI.color = new Color(0, 0, 0, Mathf.Clamp01((1.6f - deadT) / 1.2f)); GUI.DrawTexture(new Rect(0, 0, W, H), blackTex); GUI.color = Color.white; }
    if (mode == Mode.Talk) DrawTalk(W, H);
  }
  void DrawTalk(float W, float H) {
    if (shadeTex != null) GUI.DrawTexture(new Rect(0, H * 0.45f, W, H * 0.55f), shadeTex);   // a painted darkness rising from below, under talks and notes
    float ph = H * 0.5f;
    if (talkPic != null) { float pw = ph * talkPic.width * talkUv.width / talkPic.height; GUI.color = new Color(1, 1, 1, 0.85f); GUI.DrawTextureWithTexCoords(new Rect(W * 0.985f - pw, H - ph, pw, ph), talkPic, talkUv); GUI.color = Color.white; }
    float a = Mathf.Clamp01(talkT / 0.4f), cx = W * 0.14f, cw = W * 0.62f;
    float y = H * 0.56f + Title(new Rect(cx, H * 0.56f, cw, H), new[] { talkName[0] }, H * 0.04f, new Color(0.95f, 0.88f, 0.7f, 1), TextAnchor.UpperCenter, 1, true, false);
    if (talkI < talkLines.Count) y += Both(new Rect(cx, y + H * 0.01f, cw, H), talkLines[talkI], H * 0.042f, new Color(0.97f, 0.96f, 0.94f, 1), TextAnchor.UpperCenter, a) + H * 0.01f;
    if (flourish != null) { GUI.DrawTextureWithTexCoords(new Rect(cx + cw / 2 - H * 0.18f, y, H * 0.36f, H * 0.08f), flourish, new Rect(0, 1, 1, -1)); }
    if (choices != null && talkI == talkLines.Count - 1) {
      float bh = H * 0.07f, by = H * 0.2f;
      for (int i = 0; i < choices.Count; i++) {
        var c = choices[i]; var r = new Rect(W * 0.2f, by + i * bh * 1.2f, W * 0.6f, bh);
        useFont = titleFont; Say(new Rect(r.x, r.y + bh * 0.12f, r.width, bh), "◆  " + c.label[0] + "  ◆", bh * 0.5f, new Color(1, 0.97f, 0.9f, 1), TextAnchor.UpperCenter); useFont = null;
        if (GUI.Button(r, GUIContent.none, GUIStyle.none)) { var act = c.act; if (act != null) act(); else { choices = null; NextLine(); } return; }
      }
    } else if (talkT > talkWait + 0.35f) Say(new Rect(cx, y + H * 0.07f, cw, H * 0.05f), "▼", H * 0.028f, new Color(1, 1, 1, 0.5f + 0.5f * Mathf.Sin(Time.time * 5)), TextAnchor.UpperCenter);
  }
}
