// The hunter's journal: every creature and every lord of the land, in their painted pictures, with what is known of them.
// A creature is written in the first time it is beaten and its entry is complete after ten; a lord is complete when beaten.
// Unbeaten ones stay dark shapes. The texts are in Resources/journal.json.
using UnityEngine;

public partial class Game {
  [System.Serializable] public class JEntry { public string k, area; public bool boss; public string[] ar, en; }
  [System.Serializable] public class JList { public JEntry[] list; }
  JEntry[] journal; const int JNEED = 10;
  JEntry[] Journal() {
    if (journal == null) { var ta = Resources.Load<TextAsset>("journal"); journal = ta != null ? JsonUtility.FromJson<JList>(ta.text).list : new JEntry[0]; }
    return journal;
  }
  int Slain(JEntry e) { return e.boss ? (Beaten(e.k) ? 1 : 0) : PlayerPrefs.GetInt("kt_" + e.k, 0); }
  bool Full(JEntry e) { return e.boss ? Beaten(e.k) : Slain(e) >= JNEED; }
  // a creature put down: counted, and the journal says so the first time and when its entry is complete
  void Hunted(string type) {
    int n = PlayerPrefs.GetInt("kt_" + type, 0) + 1; PlayerPrefs.SetInt("kt_" + type, n);
    if (n != 1 && n != JNEED) return;
    foreach (var e in Journal()) if (e.k == type) {
      Toast(n == 1 ? new[] { "دُوّن في دفتر الصيّاد: " + e.ar[0], "Written in the Hunter's Journal: " + e.en[0] } : new[] { "اكتمل في الدفتر: " + e.ar[0], "Journal entry complete: " + e.en[0] });
      break;
    }
  }
  // the creature's first painted frame, fitted into a box and standing on its floor
  void JPicture(Rect r, JEntry e) {
    CreatureData d; if (!kinds.TryGetValue(e.boss ? "boss_" + e.k : e.k, out d) || d.fw <= 0 || d.fh <= 0) return;
    var t = Tex((e.boss ? "bosses/" : "creatures/") + e.k); if (t == null) return;
    float a = d.fw / (float)d.fh, w = r.width, h = w / a; if (h > r.height) { h = r.height; w = h * a; }
    GUI.DrawTextureWithTexCoords(new Rect(r.center.x - w / 2, r.yMax - h, w, h), t, new Rect(0, 0, d.fw / (float)t.width, d.fh / (float)t.height));
  }
  void DrawJournal(float W, float H) {
    var J = Journal(); if (J.Length == 0) return;
    int cols = 9, rows = Mathf.CeilToInt(J.Length / (float)cols), known = 0, full = 0;
    var area = new Rect(W * 0.07f, H * 0.17f, W * 0.54f, H * 0.66f); float c = Mathf.Min(area.width / cols, area.height / rows);
    var puff = Tex("fx/fx_puff");
    for (int i = 0; i < J.Length; i++) {
      var e = J[i]; int n = Slain(e); bool done = Full(e); if (n > 0) known++; if (done) full++;
      var r = new Rect(area.x + (i % cols) * c, area.y + (i / cols) * c, c * 0.9f, c * 0.9f);
      if (pick == "j:" + e.k && puff != null) { GUI.color = new Color(1, 0.95f, 0.8f, 0.35f); GUI.DrawTexture(new Rect(r.x - r.width * 0.2f, r.y - r.height * 0.2f, r.width * 1.4f, r.height * 1.4f), puff); }
      GUI.color = n == 0 ? new Color(0.04f, 0.04f, 0.07f, 0.85f) : done ? Color.white : new Color(0.75f, 0.75f, 0.8f, 1);
      JPicture(r, e); GUI.color = Color.white;
      if (GUI.Button(r, GUIContent.none, GUIStyle.none)) pick = pick == "j:" + e.k ? "" : "j:" + e.k;
    }
    Both(new Rect(area.x, area.yMax + H * 0.005f, area.width, H * 0.05f), new[] { "دُوّن " + known + " من " + J.Length + " · اكتمل " + full, "Written " + known + " of " + J.Length + " · complete " + full }, H * 0.026f, new Color(0.85f, 0.85f, 0.9f, 1), TextAnchor.UpperCenter);
    JEntry p = null; foreach (var e in J) if ("j:" + e.k == pick) p = e;
    if (p == null) { Both(new Rect(W * 0.64f, H * 0.42f, W * 0.3f, H * 0.3f), new[] { "اختر مخلوقاً لتقرأ عنه", "Pick a creature to read of it" }, H * 0.03f, new Color(0.7f, 0.7f, 0.76f, 1), TextAnchor.UpperCenter); return; }
    int k = Slain(p); var pr = new Rect(W * 0.67f, H * 0.16f, W * 0.24f, H * 0.27f);
    GUI.color = k == 0 ? new Color(0.04f, 0.04f, 0.07f, 0.9f) : Color.white; JPicture(pr, p); GUI.color = Color.white;
    var tr = new Rect(W * 0.64f, H * 0.45f, W * 0.3f, H * 0.4f);
    if (k == 0) { Both(tr, new[] { "؟؟؟", "???" }, H * 0.04f, new Color(0.8f, 0.8f, 0.85f, 1), TextAnchor.UpperCenter); return; }
    float y = Both(tr, new[] { p.ar[0], p.en[0] }, H * 0.04f, Full(p) ? new Color(1, 0.9f, 0.65f, 1) : new Color(1, 0.96f, 0.88f, 1), TextAnchor.UpperCenter);
    string[] count = p.boss ? new[] { "سيّدٌ هزمته", "A lord you have beaten" } : new[] { "هزمت " + k + " / " + JNEED, "Beaten " + k + " / " + JNEED };
    y += Both(new Rect(tr.x, tr.y + y, tr.width, tr.height), count, H * 0.026f, new Color(0.75f, 0.78f, 0.85f, 1), TextAnchor.UpperCenter);
    y += H * 0.015f + Both(new Rect(tr.x, tr.y + y + H * 0.015f, tr.width, tr.height), new[] { p.ar[1], p.en[1] }, H * 0.027f, new Color(0.88f, 0.88f, 0.9f, 1), TextAnchor.UpperRight);
    if (!p.boss) return;
    // a lord beaten: its memory can be called back from a bench (Dream.cs)
    if (DreamWon(p.k)) y += Both(new Rect(tr.x, tr.y + y + H * 0.01f, tr.width, H * 0.05f), new[] { "✦ انتصرتَ عليه في الذكرى", "✦ Beaten again in memory" }, H * 0.025f, new Color(1, 0.85f, 0.55f, 1), TextAnchor.UpperCenter) + H * 0.01f;
    var br = new Rect(tr.x, Mathf.Min(tr.y + y + H * 0.02f, H * 0.84f), tr.width, H * 0.055f);
    if (!AtBench()) { Both(br, new[] { "اجلس على مقعد لتستدعي ذكرى المعركة", "Sit on a bench to call back the battle" }, H * 0.024f, new Color(0.6f, 0.6f, 0.66f, 1), TextAnchor.UpperCenter); return; }
    if (TextButton(br, "◆  استدعِ ذكرى المعركة  ◆")) StartDream(p.k);
  }
}
