// What is shown over the world: the title, the told story (painted panels that drift slowly, the words under them), talks with
// the people (their painted portrait, their name, their words, the shop), the cards that name an area or a lord as it rises,
// short notes, the soul vessel and the geo. Arabic first, English under it.
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  enum Mode { Title, Scene, Talk, Play }
  Mode mode = Mode.Title;
  Font font; Texture2D frameTex, vesselTex, vesselFull, geoTex, shardTex, blackTex;
  Story.Panel[] scene; int sceneI; float sceneT; System.Action sceneDone; Texture2D scenePrev;
  class Choice { public string[] label; public System.Action act; }
  string[] talkName; Texture2D talkPic; List<string[]> talkLines; int talkI; float talkT, talkWait; System.Action talkDone; List<Choice> choices; Rect talkUv = new Rect(0, 0, 1, 1);
  string[] cardTitle, cardName, cardLine; float cardT, cardLife; bool cardBig; string[] toast; float toastT;
  readonly Dictionary<string, List<string>> wrapCache = new Dictionary<string, List<string>>();

  void InitUi() {
    font = Resources.Load<Font>("font/cairo"); blackTex = new Texture2D(1, 1); blackTex.SetPixel(0, 0, Color.black); blackTex.Apply();
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
    List<Choice> ch = null;
    if (n.type == "merchant") {
      int price = 200 + (maxHp - 5) * 150;
      ch = new List<Choice> {
        new Choice { label = new[] { maxHp < 9 ? "قناعٌ إضافي — " + price + " جيو" : "نفدت الأقنعة", maxHp < 9 ? "An extra mask — " + price + " geo" : "Masks sold out" }, act = () => {
          if (maxHp >= 9) return; if (geo < price) { Toast(new[] { "لا يكفي الجيو.", "Not enough geo." }); return; }
          geo -= price; maxHp++; hp = maxHp; PlayerPrefs.SetInt("maxhp", maxHp); PlayerPrefs.SetInt("geo", geo); PlayerPrefs.Save(); Play("w_geo_0", 0.8f); Toast(new[] { "صار لك قناعٌ جديد.", "You gained a mask." }); } },
        new Choice { label = new[] { "وداعاً", "Farewell" }, act = null } };
      lines.Add(new[] { "ماذا تشتري؟", "What will you buy?" });
    } else if (n.type == "smith") {
      int price = 300 * (nail + 1);
      ch = new List<Choice> {
        new Choice { label = new[] { nail < 3 ? "اشحذ النصل — " + price + " جيو" : "نصلك في أقصى حدّته", nail < 3 ? "Sharpen the blade — " + price + " geo" : "Your blade is at its keenest" }, act = () => {
          if (nail >= 3) return; if (geo < price) { Toast(new[] { "لا يكفي الجيو.", "Not enough geo." }); return; }
          geo -= price; nail++; PlayerPrefs.SetInt("nail", nail); PlayerPrefs.SetInt("geo", geo); PlayerPrefs.Save(); Play("w_slam_0", 0.7f); Toast(new[] { "صار نصلك أحدّ.", "Your blade is keener." }); } },
        new Choice { label = new[] { "وداعاً", "Farewell" }, act = null } };
      lines.Add(new[] { "أتريد أن أشحذه لك؟", "Shall I sharpen it for you?" });
    }
    PlayVoice("npc_" + (n.type == "merchant" || n.type == "smith" || n.type == "elder" || n.type == "outfitter" || n.type == "wizard" || n.type == "trader" ? n.type : "merchant") + "_0");
    StartTalk(who.name, Tex("npc/npc_" + n.type + (n.type == "trader" && !string.IsNullOrEmpty(n.shop) ? "_" + n.shop : "")) ?? Tex("npc/npc_" + n.type), lines, ch, null, 0.2f);
  }
  // ---------------------------------------------------------------- cards and notes
  void Card(string[] title, string[] name, string[] line, float life, bool big) { cardTitle = title; cardName = name; cardLine = line; cardT = 0; cardLife = life; cardBig = big; }
  void Toast(string[] t) { toast = t; toastT = 0; }

  // ---------------------------------------------------------------- text
  GUIStyle Style(float size, Color c, TextAnchor al) { var st = new GUIStyle(); st.font = font; st.fontSize = Mathf.Max(8, (int)size); st.normal.textColor = c; st.alignment = al; st.richText = false; return st; }
  float Say(Rect r, string s, float size, Color c, TextAnchor al, float alpha = 1) {
    if (string.IsNullOrEmpty(s)) return 0;
    bool ar = Ar.IsArabic(s); if (ar && al == TextAnchor.UpperLeft) al = TextAnchor.UpperRight;
    var st = Style(size, new Color(c.r, c.g, c.b, c.a * alpha), al); var sh = Style(size, new Color(0, 0, 0, 0.75f * alpha), al);
    string key = s + "|" + (int)size + "|" + (int)r.width; List<string> lines;
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

  // ---------------------------------------------------------------- the whole screen: the title and the told story
  bool DrawFull() {
    float H = Screen.height, W = Screen.width;
    if (mode == Mode.Title) {
      DrawCover(Tex("bg/title"), 1.04f + 0.03f * Mathf.Sin(Time.time * 0.15f), Mathf.Sin(Time.time * 0.1f) * 0.3f, 1);
      var bn = Tex("story/banner"); if (bn != null) { float bw = W * 0.62f, bh = bw * bn.height / bn.width; GUI.DrawTexture(new Rect((W - bw) / 2, H * 0.1f, bw, bh), bn); }
      bool has = PlayerPrefs.HasKey("room") && PlayerPrefs.GetInt("prologue", 0) == 1;
      float y0 = H * 0.6f, bh2 = H * 0.09f;
      if (has && Button(new Rect(W * 0.3f, y0, W * 0.4f, bh2), new[] { "متابعة الرحلة", "Continue" })) { mode = Mode.Play; RestoreMusic(); }
      if (Button(new Rect(W * 0.3f, y0 + (has ? bh2 * 1.25f : 0), W * 0.4f, bh2), new[] { "رحلة جديدة", "New Journey" })) NewJourney();
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
  bool Button(Rect r, string[] label, float k = 1) {
    var tb = btnBase; if (frameTex != null) { GUI.color = new Color(1, 1, 1, 0.9f); GUI.DrawTexture(r, frameTex); GUI.color = Color.white; }
    else if (tb != null) { GUI.color = new Color(1, 1, 1, 0.55f); GUI.DrawTexture(new Rect(r.x + r.width / 2 - r.height / 2, r.y, r.height, r.height), tb); GUI.color = Color.white; }
    Say(new Rect(r.x, r.y + r.height * 0.18f, r.width, r.height), label[0], r.height * 0.42f * k, new Color(1, 0.95f, 0.82f, 1), TextAnchor.UpperCenter);
    return GUI.Button(r, GUIContent.none, GUIStyle.none);
  }
  void NewJourney() {
    PlayerPrefs.DeleteAll(); PlayerPrefs.SetInt("prologue", 1); PlayerPrefs.Save();
    maxHp = 5; hp = 5; geo = 0; nail = 0; soul = 0; lastArea = "";
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
        float y = cardBig ? H * 0.22f : H * 0.62f;
        if (cardTitle != null) y += Say(new Rect(0, y, W, hs), cardTitle[0], H * 0.035f, new Color(0.85f, 0.88f, 0.95f, 1), TextAnchor.UpperCenter, a);
        y += Both(new Rect(W * 0.1f, y, W * 0.8f, H * 0.2f), cardName, H * 0.085f, new Color(1, 0.96f, 0.88f, 1), TextAnchor.UpperCenter, a);
        if (cardLine != null) Both(new Rect(W * 0.15f, y + H * 0.01f, W * 0.7f, H * 0.2f), cardLine, H * 0.036f, new Color(0.9f, 0.86f, 0.8f, 1), TextAnchor.UpperCenter, a);
      }
    }
    if (toast != null) {
      toastT += Time.deltaTime; float a = Mathf.Clamp01(toastT / 0.3f) * Mathf.Clamp01((3.2f - toastT) / 0.6f);
      if (toastT > 3.2f) toast = null; else Both(new Rect(W * 0.15f, H * 0.42f, W * 0.7f, H * 0.2f), toast, H * 0.04f, new Color(1, 0.95f, 0.85f, 1), TextAnchor.UpperCenter, a);
    }
    if (deadT > 0) { GUI.color = new Color(0, 0, 0, Mathf.Clamp01((1.6f - deadT) / 1.2f)); GUI.DrawTexture(new Rect(0, 0, W, H), blackTex); GUI.color = Color.white; }
    if (mode == Mode.Talk) DrawTalk(W, H);
  }
  void DrawTalk(float W, float H) {
    var box = new Rect(W * 0.05f, H * 0.6f, W * 0.9f, H * 0.36f);
    GUI.color = new Color(0, 0, 0, 0.55f); GUI.DrawTexture(box, blackTex); GUI.color = Color.white;
    if (frameTex != null) GUI.DrawTexture(new Rect(box.x - box.width * 0.02f, box.y - box.height * 0.08f, box.width * 1.04f, box.height * 1.16f), frameTex);
    float ph = box.height * 1.25f;
    if (talkPic != null) { float pw = ph * talkPic.width * talkUv.width / talkPic.height; GUI.DrawTextureWithTexCoords(new Rect(box.xMax - pw * 0.9f, box.yMax - ph, pw, ph), talkPic, talkUv); }
    var tr = new Rect(box.x + box.width * 0.05f, box.y + box.height * 0.1f, box.width * 0.68f, box.height);
    float y = Both(new Rect(tr.x, tr.y, tr.width, H), talkName, H * 0.045f, new Color(1, 0.84f, 0.55f, 1), TextAnchor.UpperRight);
    float a = Mathf.Clamp01(talkT / 0.4f);
    if (talkI < talkLines.Count) Both(new Rect(tr.x, tr.y + y + H * 0.01f, tr.width, H), talkLines[talkI], H * 0.042f, new Color(0.97f, 0.95f, 0.9f, 1), TextAnchor.UpperRight, a);
    if (choices != null && talkI == talkLines.Count - 1) {
      float bh = H * 0.075f, by = box.y - (bh * 1.15f) * choices.Count;
      for (int i = 0; i < choices.Count; i++) {
        var c = choices[i];
        if (Button(new Rect(W * 0.08f, by + i * bh * 1.15f, W * 0.42f, bh), c.label, 0.9f)) { var act = c.act; if (act != null) act(); else { choices = null; NextLine(); } return; }
      }
    } else if (talkT > talkWait + 0.35f) Say(new Rect(box.x, box.yMax - H * 0.06f, box.width * 0.72f, H * 0.05f), "▼", H * 0.03f, new Color(1, 0.9f, 0.7f, 0.5f + 0.5f * Mathf.Sin(Time.time * 5)), TextAnchor.UpperCenter);
  }
}
