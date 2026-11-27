// The pause screen, three pages under a painted ornament: the map, the bag and the charms.
//   The map: every room walked into, drawn from its own shape (its open air filled in its area's colour, its rock edges lit), the
//   rooms laid where they lie in the world; an area whose map was bought from a wayfarer shows its other rooms faintly; benches,
//   people, lords and charms are marked with their painted pictures, with a key beside; the area names over them; a tap brings it
//   close around the hero and back.
//   The bag: the blade and its stage, the masks and the soul, the powers and the spells (painted icons, the ones not yet found
//   dark), the shards and the ore; a tap on any shows what it is; the geo and how much of the world is done.
//   The charms: worn ones above, the notches below them, all the charms in a row; a tap shows a charm, a second puts it on or
//   takes it off, at a bench only, while the notches allow.
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  int menuTab; bool mapNear; float menuT; WorldData world; string pick = ""; readonly Dictionary<string, Texture2D> roomMaps = new Dictionary<string, Texture2D>();
  static readonly Dictionary<string, Color> AREA_COL = new Dictionary<string, Color> {
    { "hushvale", new Color(0.95f, 0.82f, 0.55f) }, { "crossroads", new Color(0.62f, 0.72f, 0.86f) }, { "mossgrove", new Color(0.62f, 0.85f, 0.55f) },
    { "crystal", new Color(0.92f, 0.62f, 0.86f) }, { "throne", new Color(0.78f, 0.72f, 0.95f) }, { "spore", new Color(0.85f, 0.88f, 0.45f) },
    { "aqueduct", new Color(0.45f, 0.85f, 0.82f) }, { "webbed", new Color(0.72f, 0.66f, 0.78f) }, { "rustworks", new Color(0.88f, 0.6f, 0.42f) },
    { "frost", new Color(0.72f, 0.9f, 1f) }, { "ember", new Color(1f, 0.55f, 0.4f) }, { "stormcrest", new Color(0.58f, 0.66f, 0.92f) },
    { "mirror", new Color(0.82f, 0.76f, 1f) }, { "ossuary", new Color(0.9f, 0.85f, 0.72f) }, { "lunar", new Color(0.78f, 0.86f, 0.98f) },
  };
  static readonly Dictionary<string, int> COST = new Dictionary<string, int> { { "thorn", 1 }, { "swift", 2 }, { "focus", 2 }, { "spirit", 1 }, { "shell", 2 }, { "dashmaster", 2 }, { "mage", 3 }, { "fury", 1 }, { "soles", 2 } };
  int Notches() { return Mathf.Min(7, 3 + Seals() / 3); }
  int NotchesUsed() { int n = 0; foreach (var kv in COST) if (Charmed(kv.Key)) n += kv.Value; return n; }
  bool Owned(string c) { return PlayerPrefs.GetInt("charm_" + c, 0) == 1; }
  bool MenuKey() { return Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Tab) || Input.GetKeyDown(KeyCode.I); }
  void OpenMenu() { mode = Mode.Menu; menuT = 0; pick = ""; Play("w_bench_0", 0.3f); }
  void MarkSeen() { PlayerPrefs.SetInt("seen_" + room.id, 1); }
  bool AtBench() { return near != null && near.kind == "bench"; }

  bool DrawMenu(float W, float H) {
    if (mode != Mode.Menu) return false;
    menuT += Time.deltaTime; if (Input.GetKeyDown(KeyCode.LeftArrow)) { menuTab = (menuTab + 3) % 4; pick = ""; } if (Input.GetKeyDown(KeyCode.RightArrow)) { menuTab = (menuTab + 1) % 4; pick = ""; }
    GUI.DrawTexture(new Rect(0, 0, W, H), blackTex);
    var mbg = Tex("ui/menu_bg"); if (mbg != null) { GUI.color = new Color(1, 1, 1, 0.85f); GUI.DrawTexture(new Rect(0, 0, W, H), mbg, ScaleMode.ScaleAndCrop); GUI.color = Color.white; }   // a painted dark of the deep
    var orn = Tex("ui/ornament"); if (orn != null) { GUI.color = new Color(1, 1, 1, 0.9f); GUI.DrawTexture(new Rect(W * 0.03f, H * 0.03f, W * 0.94f, H * 0.94f), orn); GUI.color = Color.white; }
    string[][] names = { new[] { "الخريطة", "Map" }, new[] { "الحقيبة", "Inventory" }, new[] { "التمائم", "Charms" }, new[] { "دفتر الصيّاد", "Hunter's Journal" } };
    Both(new Rect(0, H * 0.05f, W, H * 0.1f), names[menuTab], H * 0.05f, new Color(0.95f, 0.95f, 0.95f, 1), TextAnchor.UpperCenter);
    // the neighbouring pages, at the sides like a book's
    if (TextButton(new Rect(W * 0.05f, H * 0.06f, W * 0.2f, H * 0.07f), "◀ " + names[(menuTab + 3) % 4][0])) { menuTab = (menuTab + 3) % 4; pick = ""; mapNear = false; }
    if (TextButton(new Rect(W * 0.75f, H * 0.06f, W * 0.2f, H * 0.07f), names[(menuTab + 1) % 4][0] + " ▶")) { menuTab = (menuTab + 1) % 4; pick = ""; mapNear = false; }
    if (TextButton(new Rect(W * 0.42f, H * 0.9f, W * 0.16f, H * 0.07f), "✕ متابعة")) { mode = Mode.Play; return true; }
    if (menuTab == 0) DrawMap(W, H); else if (menuTab == 1) DrawBag(W, H); else if (menuTab == 2) DrawCharms(W, H); else DrawJournal(W, H);
    return true;
  }
  bool TextButton(Rect r, string label) {
    Say(new Rect(r.x, r.y + r.height * 0.15f, r.width, r.height), label, r.height * 0.42f, new Color(0.9f, 0.9f, 0.92f, 1), TextAnchor.UpperCenter);
    return GUI.Button(r, GUIContent.none, GUIStyle.none);
  }
  // an icon to tap; the picked one has a ring of light
  bool Icon(Rect r, Texture2D t, bool have, string id, Rect uv = default(Rect)) {
    if (t == null) return false;
    if (pick == id) { GUI.color = new Color(1, 0.95f, 0.8f, 0.35f); if (vesselFull != null) GUI.DrawTexture(new Rect(r.x - r.width * 0.25f, r.y - r.height * 0.25f, r.width * 1.5f, r.height * 1.5f), Tex("fx/fx_puff")); }
    GUI.color = have ? Color.white : new Color(0.16f, 0.16f, 0.2f, 0.9f);
    if (uv.width > 0) GUI.DrawTextureWithTexCoords(r, t, uv); else GUI.DrawTexture(r, t);
    GUI.color = Color.white;
    if (GUI.Button(r, GUIContent.none, GUIStyle.none)) { pick = pick == id ? "" : id; return true; }
    return false;
  }
  void Describe(float W, float H, string[] title, string[] text) {
    var r = new Rect(W * 0.64f, H * 0.2f, W * 0.3f, H * 0.6f);
    float y = Both(r, title, H * 0.042f, new Color(1, 0.95f, 0.85f, 1), TextAnchor.UpperCenter);
    Both(new Rect(r.x, r.y + y + H * 0.02f, r.width, r.height), text, H * 0.03f, new Color(0.88f, 0.88f, 0.9f, 1), TextAnchor.UpperRight);
  }

  // ---------------------------------------------------------------- the map
  // a room on the map: its open air washed in the area's colour with the painted ink of the map (Resources/ui/mapink, read
  // where the room lies on the whole map, so neighbouring rooms share one wash), and its walls traced in a lighter line
  Texture2D mapInk;
  Texture2D RoomMap(RoomData r) {
    Texture2D t; if (roomMaps.TryGetValue(r.id, out t)) return t;
    Color c; if (!AREA_COL.TryGetValue(r.area, out c)) c = new Color(0.8f, 0.8f, 0.8f);
    if (mapInk == null) mapInk = Tex("ui/mapink");
    const int S = 3; int w = r.w * S, h = r.h * S; float mw = Mathf.Max(1, world.mapW), mh = Mathf.Max(1, world.mapH);
    t = new Texture2D(w, h, TextureFormat.RGBA32, false); t.filterMode = FilterMode.Bilinear; t.wrapMode = TextureWrapMode.Clamp;
    var px = new Color[w * h];
    System.Func<int, int, bool> solid = (i, j) => i < 0 || j < 0 || i >= r.w || j >= r.h || Solid(r.t[j * r.w + i] - '0');
    for (int sj = 0; sj < h; sj++) for (int si = 0; si < w; si++) {
      int i = si / S, j = sj / S, fx = si % S, fy = sj % S; Color o = new Color(0, 0, 0, 0);
      if (!solid(i, j)) {
        bool edge = (fx == 0 && solid(i - 1, j)) || (fx == S - 1 && solid(i + 1, j)) || (fy == 0 && solid(i, j - 1)) || (fy == S - 1 && solid(i, j + 1));
        float ink = 0.6f;
        if (mapInk != null) { var p = mapInk.GetPixelBilinear((r.mx + si / (float)S) / mw * 3f % 1f, 1 - (r.my + sj / (float)S) / mh * 2f % 1f); ink = (p.r + p.g + p.b) / 3f; }
        o = edge ? new Color(Mathf.Min(1, c.r * 1.2f + 0.15f), Mathf.Min(1, c.g * 1.2f + 0.15f), Mathf.Min(1, c.b * 1.2f + 0.15f), 0.75f + 0.25f * ink)
                 : new Color(c.r * (0.2f + 0.5f * ink), c.g * (0.2f + 0.5f * ink), c.b * (0.2f + 0.5f * ink), 0.82f);
      }
      px[(h - 1 - sj) * w + si] = o;
    }
    t.SetPixels(px); t.Apply(); roomMaps[r.id] = t; return t;
  }
  void DrawMap(float W, float H) {
    if (world == null || world.mapW <= 0) return;
    var inner = new Rect(W * 0.08f, H * 0.15f, W * 0.68f, H * 0.72f);
    float s = Mathf.Min(inner.width / world.mapW, inner.height / world.mapH), zoom = mapNear ? 4.5f : 1f, ox, oy;
    if (mapNear) { ox = inner.width / 2 - (room.mx + room.w / 2f) * s * zoom; oy = inner.height / 2 - (room.my + room.h / 2f) * s * zoom; }
    else { ox = (inner.width - world.mapW * s) / 2; oy = (inner.height - world.mapH * s) / 2; }
    var sheet = Tex("ui/mapsheet"); if (sheet != null) { GUI.color = new Color(1, 1, 1, 0.75f); GUI.DrawTexture(new Rect(inner.x - W * 0.02f, inner.y - H * 0.02f, inner.width + W * 0.04f, inner.height + H * 0.04f), sheet, ScaleMode.ScaleAndCrop); GUI.color = Color.white; }   // the painted sheet the map is drawn on
    GUI.BeginGroup(inner);
    var areaBox = new Dictionary<string, Rect>(); float k = s * zoom;
    foreach (var r in world.rooms) {
      bool seen = PlayerPrefs.GetInt("seen_" + r.id, 0) == 1, bought = PlayerPrefs.GetInt("map_" + r.area, 0) == 1;
      if (!seen && !bought) continue;
      var rr = new Rect(ox + r.mx * k, oy + r.my * k, r.w * k, r.h * k);
      GUI.color = r == room ? Color.white : seen ? new Color(1, 1, 1, 0.9f) : new Color(1, 1, 1, 0.35f);
      GUI.DrawTexture(rr, RoomMap(r)); GUI.color = Color.white;
      Rect ab; areaBox[r.area] = areaBox.TryGetValue(r.area, out ab) ? Rect.MinMaxRect(Mathf.Min(ab.xMin, rr.xMin), Mathf.Min(ab.yMin, rr.yMin), Mathf.Max(ab.xMax, rr.xMax), Mathf.Max(ab.yMax, rr.yMax)) : rr;
      if (!seen) continue;
      float m = Mathf.Clamp(k * 3.2f, 9, 30);
      if (r.benches != null) foreach (var b in r.benches) MapMark(Tex("props/bench"), ox + (r.mx + b.x) * k, oy + (r.my + b.y) * k, m * 1.3f, m);
      if (r.npcs != null) foreach (var n in r.npcs) { var nt = Tex("npc/npc_" + n.type); if (nt != null) GUI.DrawTextureWithTexCoords(new Rect(ox + (r.mx + n.x) * k - m / 2, oy + (r.my + n.y) * k - m, m, m * 1.2f), nt, new Rect(0, 0, 0.5f, 1)); }
      if (r.arena != null && !string.IsNullOrEmpty(r.arena.boss) && shardTex != null) { GUI.color = Beaten(r.arena.boss) ? new Color(0.4f, 0.4f, 0.45f, 0.7f) : Color.white; MapMark(shardTex, rr.center.x, rr.center.y, m * 1.1f, m * 1.3f); GUI.color = Color.white; }
      if (r.items != null) foreach (var it in r.items) if (it.kind == "charm" && !Got(it.id)) MapMark(Tex("props/charm_" + it.name), ox + (r.mx + it.x) * k, oy + (r.my + it.y) * k, m, m);
    }
    // the hero
    float hx = ox + (room.mx + (x + PW / 2) / TILE) * k, hy = oy + (room.my + (y + PH / 2) / TILE) * k, hk = 14 + 3 * Mathf.Sin(Time.time * 5);
    var heroIcon = Tex("ui/ember"); if (heroIcon == null) heroIcon = shardTex; if (heroIcon != null) GUI.DrawTexture(new Rect(hx - hk, hy - hk, hk * 2, hk * 2), heroIcon);
    foreach (var kv in areaBox) { string[] a; Color c; if (Story.Area.TryGetValue(kv.Key, out a) && AREA_COL.TryGetValue(kv.Key, out c)) Say(new Rect(kv.Value.center.x - 120, kv.Value.yMin - H * 0.03f, 240, H * 0.04f), a[0].Split('|')[0], H * (mapNear ? 0.032f : 0.022f), c, TextAnchor.UpperCenter); }
    GUI.EndGroup();
    if (GUI.Button(inner, GUIContent.none, GUIStyle.none)) mapNear = !mapNear;
    // the key
    float ky = H * 0.2f, kx = W * 0.79f, ks = H * 0.05f;
    System.Action<Texture2D, string, Rect> key = (t, label, uv) => { if (t != null) { if (uv.width > 0) GUI.DrawTextureWithTexCoords(new Rect(kx + W * 0.13f, ky, ks, ks), t, uv); else GUI.DrawTexture(new Rect(kx + W * 0.13f, ky, ks, ks), t); } Say(new Rect(kx, ky + ks * 0.1f, W * 0.125f, ks), label, H * 0.028f, new Color(0.9f, 0.9f, 0.92f, 1), TextAnchor.UpperRight); ky += ks * 1.3f; };
    key(Tex("props/bench"), "مقعد", default(Rect)); key(Tex("npc/npc_merchant"), "تاجر", new Rect(0, 0, 0.5f, 1)); key(Tex("npc/npc_smith"), "الحدّاد", new Rect(0, 0, 0.5f, 1));
    key(Tex("npc/npc_wizard"), "العرّافة", new Rect(0, 0, 0.5f, 1)); key(Tex("npc/npc_trader"), "رحّالة (يبيع الخرائط)", new Rect(0, 0, 0.5f, 1)); key(shardTex, "قاعة زعيم", default(Rect));
    key(Tex("props/charm_thorn"), "تعويذة", default(Rect)); key(Tex("ui/ember"), "أنت هنا", default(Rect));
    Say(new Rect(inner.x, inner.yMax + H * 0.005f, inner.width, H * 0.04f), mapNear ? "اضغط لرؤية العالم كله" : "اضغط على الخريطة للاقتراب", H * 0.024f, new Color(0.6f, 0.6f, 0.66f, 1), TextAnchor.UpperCenter);
  }
  void MapMark(Texture2D t, float cx, float cy, float w, float h) { if (t != null) GUI.DrawTexture(new Rect(cx - w / 2, cy - h, w, h), t); }

  // ---------------------------------------------------------------- the bag
  static readonly string[] POWERS = { "dash", "wall", "double", "dive", "superdash", "cry", "star" };
  void DrawBag(float W, float H) {
    float hs = H * 0.065f;
    // the blade, the masks, the soul
    var bt = Tex("blade/blade_" + blade); var br = new Rect(W * 0.08f, H * 0.17f, W * 0.2f, H * 0.42f);
    if (bt != null) { float s = Mathf.Min(br.width / bt.width, br.height / bt.height); var r = new Rect(br.center.x - bt.width * s / 2, br.center.y - bt.height * s / 2, bt.width * s, bt.height * s); Icon(r, bt, true, "blade"); }
    Say(new Rect(br.x - W * 0.02f, br.yMax, br.width + W * 0.04f, H), BLADE[blade].name[0], H * 0.03f, new Color(1, 0.85f, 0.6f, 1), TextAnchor.UpperCenter);
    for (int i = 0; i < maxHp; i++) if (heartFull != null) GUI.DrawTexture(new Rect(W * 0.08f + i * hs * 0.8f, H * 0.68f, hs * 0.75f, hs * 0.75f), i < hp ? heartFull : heartEmpty);
    if (vesselFull != null) Icon(new Rect(W * 0.08f, H * 0.76f, hs * 1.3f, hs * 1.3f), vesselFull, true, "soul");
    // the powers and spells
    float gx = W * 0.32f, gy = H * 0.18f, gs = H * 0.1f;
    for (int i = 0; i < POWERS.Length; i++) Icon(new Rect(gx + (i % 4) * gs * 1.25f, gy + (i / 4) * gs * 1.25f, gs, gs), Tex("ui/power_" + POWERS[i]), Has(POWERS[i]), "p:" + POWERS[i]);
    // the shards and the ore
    float sy = gy + gs * 2.7f;
    Icon(new Rect(gx, sy, gs, gs), shardTex, Seals() > 0, "shards"); Say(new Rect(gx + gs * 0.5f, sy + gs * 0.55f, gs, gs), Seals() + "", H * 0.04f, Color.white, TextAnchor.UpperLeft);
    Icon(new Rect(gx + gs * 1.25f, sy, gs, gs), Tex("ui/ore"), ore > 0, "ore"); Say(new Rect(gx + gs * 1.75f, sy + gs * 0.55f, gs, gs), ore + "", H * 0.04f, Color.white, TextAnchor.UpperLeft);
    Icon(new Rect(gx + gs * 2.5f, sy, gs, gs), heartFull, true, "masks"); Say(new Rect(gx + gs * 3f, sy + gs * 0.55f, gs, gs), maxHp + "", H * 0.04f, Color.white, TextAnchor.UpperLeft);
    // the geo and how much is done
    if (geoTex != null) GUI.DrawTexture(new Rect(gx, H * 0.78f, hs, hs), geoTex);
    Say(new Rect(gx + hs * 1.2f, H * 0.785f, W * 0.2f, hs), geo.ToString(), H * 0.05f, Color.white, TextAnchor.UpperLeft);
    Say(new Rect(W * 0.64f, H * 0.82f, W * 0.3f, hs), "اكتمال الرحلة " + Completion() + "%", H * 0.03f, new Color(0.85f, 0.85f, 0.9f, 1), TextAnchor.UpperCenter);
    // what the picked thing is
    if (pick == "blade") { bool all; var need = blade < BLADE.Length - 1 ? NeedLines(BLADE[blade + 1], out all) : new List<string[]>(); var t = BLADE[blade].desc[0] + "\nالضرر " + BLADE[blade].dmg + " · المدى +" + BLADE[blade].reach; if (need.Count > 0) { t += "\n\nللمرحلة التالية «" + BLADE[blade + 1].name[0] + "»:"; foreach (var n in need) t += "\n" + n[0]; } Describe(W, H, BLADE[blade].name, new[] { t, t }); }
    else if (pick == "soul") Describe(W, H, new[] { "وعاء الروح", "Soul Vessel" }, new[] { "يمتلئ بالروح كلما ضربت. اضغط زر الروح لتطلق كرة، أو اضغط مطوّلاً لتشفى.", "Fills as you strike. Press soul to throw an orb, hold to heal." });
    else if (pick.StartsWith("p:")) { string p = pick.Substring(2); string[] pw; if (Story.Power.TryGetValue(p, out pw)) { var a = pw[0].Split('|'); var e = pw[1].Split('|'); Describe(W, H, Has(p) ? new[] { a[0], e[0] } : new[] { "؟؟؟", "???" }, Has(p) ? new[] { a[1], e[1] } : new[] { "قدرةٌ لم تجدها بعد.", "A power not yet found." }); } }
    else if (pick == "shards") Describe(W, H, new[] { "شظايا القنديل", "Lantern Shards" }, new[] { "استعدتَ " + Seals() + " من 12. باب العرش لا يُفتح إلا لها كاملة.", "You took back " + Seals() + " of 12. The throne's gate opens only to all of them." });
    else if (pick == "ore") Describe(W, H, new[] { "حجر الجذوة الشاحب", "Pale Ember Ore" }, new[] { "معك " + ore + ". يتركه حرّاس التعويذات وحرّاس الطرق. الحدّاد قَرن يصهر به نصلك.", "You carry " + ore + ". Charm wardens and road lords leave it. Qarn forges your blade with it." });
    else if (pick == "masks") Describe(W, H, new[] { "الأقنعة", "Masks" }, new[] { "لك " + maxHp + " أقنعة. بذور القناع والتاجر مِرزا يزيدانها.", "You have " + maxHp + " masks. Mask seeds and Mirza the merchant add more." });
  }
  int Completion() {
    int seen = 0; foreach (var r in world.rooms) if (PlayerPrefs.GetInt("seen_" + r.id, 0) == 1) seen++;
    int ch = 0; foreach (var kv in COST) if (Owned(kv.Key)) ch++;
    int pw = 0; foreach (var p in POWERS) if (Has(p)) pw++;
    float k = 0.4f * seen / world.rooms.Length + 0.3f * Seals() / 12f + 0.1f * ch / 9f + 0.1f * pw / POWERS.Length + 0.1f * blade / (BLADE.Length - 1f);
    return Mathf.RoundToInt(k * 100);
  }

  // ---------------------------------------------------------------- the charms
  void DrawCharms(float W, float H) {
    float cs = H * 0.11f, x0 = W * 0.08f;
    Say(new Rect(x0, H * 0.16f, W * 0.5f, H), "المرتداة", H * 0.034f, new Color(0.9f, 0.9f, 0.92f, 1), TextAnchor.UpperLeft);
    int i = 0; foreach (var kv in COST) if (Charmed(kv.Key)) { Icon(new Rect(x0 + i * cs * 1.15f, H * 0.22f, cs, cs), Tex("props/charm_" + kv.Key), true, "c:" + kv.Key); i++; }
    Say(new Rect(x0, H * 0.36f, W * 0.5f, H), "الفتحات " + NotchesUsed() + " / " + Notches(), H * 0.03f, new Color(0.9f, 0.9f, 0.92f, 1), TextAnchor.UpperLeft);
    var nt = Tex("ui/notch") ?? vesselFull; for (int n = 0; n < Notches(); n++) if (nt != null) { GUI.color = n < NotchesUsed() ? Color.white : new Color(0.35f, 0.35f, 0.4f, 0.8f); GUI.DrawTexture(new Rect(x0 + n * H * 0.05f, H * 0.41f, H * 0.04f, H * 0.04f), nt); GUI.color = Color.white; }
    i = 0; foreach (var kv in COST) { Icon(new Rect(x0 + (i % 5) * cs * 1.15f, H * 0.5f + (i / 5) * cs * 1.2f, cs, cs), Tex("props/charm_" + kv.Key), Owned(kv.Key), "c:" + kv.Key); i++; }
    if (pick.StartsWith("c:")) {
      string c = pick.Substring(2); string[] d; Story.Charm.TryGetValue(c, out d);
      if (!Owned(c)) { Describe(W, H, new[] { "؟؟؟", "???" }, new[] { "تعويذةٌ لم تجدها بعد. يحرس كلَّ تعويذةٍ حارس.", "A charm not yet found. A warden guards each one." }); return; }
      var a = d[0].Split('|'); var e = d[1].Split('|');
      Describe(W, H, new[] { a[0], e[0] }, new[] { a[1] + "\n\nالكلفة: " + COST[c] + " فتحات", e[1] + "\n\nCost: " + COST[c] + " notches" });
      bool on = Charmed(c); var br = new Rect(W * 0.66f, H * 0.68f, W * 0.26f, H * 0.08f);
      if (Button(br, on ? new[] { "اخلع", "Take off" } : new[] { "ارتدِ", "Wear" })) {
        if (!AtBench()) Toast(new[] { "تُبدَّل التعويذات على المقعد فقط.", "Charms are changed on a bench only." });
        else if (!on && NotchesUsed() + COST[c] > Notches()) Toast(new[] { "لا تكفي الفتحات.", "Not enough notches." });
        else { PlayerPrefs.SetInt("charm_on_" + c, on ? 0 : 1); PlayerPrefs.Save(); Play("w_geo_1", 0.7f); }
      }
    } else Say(new Rect(W * 0.64f, H * 0.3f, W * 0.3f, H), "اضغط على تعويذة لتعرفها.\nتُرتدى وتُخلع على المقعد.", H * 0.03f, new Color(0.7f, 0.7f, 0.76f, 1), TextAnchor.UpperCenter);
  }
}
