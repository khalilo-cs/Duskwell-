// What the rooms hold besides rock and creatures, and the puzzles they make: walls that give way under the blade (often hiding
// a secret), levers that open far gates, floors that crumble under the feet and come back, cracked floors only a dive breaks,
// the Throne's gate that opens only to the twelve shards; the people to talk to, benches to rest and keep the journey on,
// old tablets to read, chests, mask seeds, charms and the powers the lords guard. Also the hero's soul: the blade gathers it,
// it heals a wound or is thrown as an orb. Every picture is a painted one (Resources/npc, props, items, proj, story, ui).
using System.Collections.Generic;
using UnityEngine;

public class Prop { public string kind, id; public SpriteRenderer sr; public Sprite[] fr; public float x, y, t, bob; public int i; public object data; public bool on; }

public partial class Game {
  int[] cur; float startX, startY; string startRoom;
  readonly List<Prop> props = new List<Prop>(); readonly Dictionary<int, SpriteRenderer> tileSr = new Dictionary<int, SpriteRenderer>();
  readonly Dictionary<string, Texture2D> tex = new Dictionary<string, Texture2D>(); readonly Dictionary<string, string[]> texts = new Dictionary<string, string[]>();
  readonly Dictionary<int, float> crumbling = new Dictionary<int, float>();
  int maxHp = 5, geo; float soul, healT, orbCD, deadT, sdashT, sdashCharge; bool diving, upWas, soulWas, diveWas; float soulHeld; int swing;
  bool upTouch, soulTouch, diveTouch; Prop near; string lastArea = "";

  Texture2D Tex(string n) { Texture2D t; if (!tex.TryGetValue(n, out t)) { t = Resources.Load<Texture2D>(n); tex[n] = t; } return t; }
  Sprite[] Strip(string n, int count, Vector2 pivot, float ppu) {
    var t = Tex(n); if (t == null) return null; var fr = new Sprite[count]; int fw = t.width / count;
    for (int i = 0; i < count; i++) fr[i] = Sprite.Create(t, new Rect(i * fw, 0, fw, t.height), pivot, ppu, 0, SpriteMeshType.FullRect);
    return fr;
  }
  bool Has(string a) { return PlayerPrefs.GetInt("abil_" + a, 0) == 1; }
  bool Charmed(string c) { return PlayerPrefs.GetInt("charm_" + c, 0) == 1 && PlayerPrefs.GetInt("charm_on_" + c, 0) == 1; }    // found, and worn
  bool Got(string id) { return PlayerPrefs.GetInt("got_" + id, 0) == 1; }
  int NailDmg() { return BLADE[blade].dmg + (Charmed("fury") && hp == 1 ? 4 : 0); }
  float HurtTime() { return Charmed("shell") ? 1.8f : 1.2f; }
  void GainSoul() { soul = Mathf.Min(99, soul + (Charmed("spirit") ? 17 : 11) + (blade >= 4 ? 5 : 0)); }
  static bool Dynamic(int t) { return t == 4 || t == 5 || t == 7 || t == 9; }
  string[] Txt(string key) { string[] v; return texts.TryGetValue(key, out v) ? v : null; }

  void InitMore() {
    var td = JsonUtility.FromJson<TextData>(Resources.Load<TextAsset>("texts").text);
    for (int i = 0; i < td.keys.Length; i++) texts[td.keys[i]] = new[] { td.ar[i], td.en[i] };
    maxHp = Mathf.Clamp(PlayerPrefs.GetInt("maxhp", 5), 5, 9); geo = PlayerPrefs.GetInt("geo", 0); InitBlade();
    InitUi();
  }
  // ---------------------------------------------------------------- the tiles of the room as they are now
  void SetRoom(RoomData r) {
    room = r; cur = new int[r.w * r.h]; for (int i = 0; i < cur.Length; i++) cur[i] = r.t[i] - '0';
    crumbling.Clear(); ApplyState();
  }
  void SetRect(int rx, int ry, int w, int h, int v) { for (int j = ry; j < ry + h; j++) for (int i = rx; i < rx + w; i++) if (i >= 0 && j >= 0 && i < room.w && j < room.h) cur[j * room.w + i] = v; }
  void ApplyState() {
    for (int i = 0; i < cur.Length; i++) if ((cur[i] == 4 || cur[i] == 7) && PlayerPrefs.GetInt("brk_" + room.id + "_" + i, 0) == 1) cur[i] = 0;
    if (room.levers != null) foreach (var l in room.levers) if (l.gates != null) foreach (var g in l.gates) SetRect(g.x, g.y, g.w, g.h, PlayerPrefs.GetInt("lever_" + l.id, 0) == 1 ? 0 : 5);
    if (room.seal != null && room.seal.need > 0) SetRect(room.seal.x, room.seal.y, room.seal.w, room.seal.h, Seals() >= room.seal.need ? 0 : 5);
    if (room.arena != null && !string.IsNullOrEmpty(room.arena.boss) && room.arena.gates != null)
      foreach (var g in room.arena.gates) SetRect(g.x, g.y, g.w, g.h, !Beaten(room.arena.boss) && g.close == "always" ? 5 : 0);
  }
  // the tiles that change are each a painted piece of their own: a wall that breaks, a gate, a cracked or crumbling floor
  void RefreshTiles() {
    if (roomGo == null || cur == null) return;
    for (int i = 0; i < cur.Length; i++) if (Dynamic(cur[i]) && !tileSr.ContainsKey(i)) MakeTile(i);
    foreach (var kv in tileSr) { int v = cur[kv.Key]; kv.Value.enabled = Dynamic(v); if (Dynamic(v)) kv.Value.sprite = TileSprite(v); }
  }
  Sprite TileSprite(int v) {
    string n = v == 5 ? (room.theme == "throne" ? "props/gate_title" : "props/gate_town") : "props/break_" + room.theme;
    var t = Tex(n); if (t == null) t = Tex(v == 5 ? "props/gate_town" : "props/break_cave"); if (t == null) return null;
    string key = "tile:" + n; Sprite[] s; if (!anims.TryGetValue(key, out s)) { s = new[] { Sprite.Create(t, new Rect(0, 0, t.width, t.height), new Vector2(0, 1), t.width / 32f, 0, SpriteMeshType.FullRect) }; anims[key] = s; }
    return s[0];
  }
  void MakeTile(int i) {
    var go = new GameObject("Tile"); go.transform.SetParent(roomGo.transform, false);
    var sr = go.AddComponent<SpriteRenderer>(); sr.sortingOrder = -4000; go.transform.position = new Vector3((i % room.w) * TILE, -(i / room.w) * TILE, 0);
    tileSr[i] = sr;
  }
  void TileLook() {
    foreach (var kv in tileSr) {
      if (!kv.Value.enabled) continue; int v = cur[kv.Key];
      float sh = 0; float ct; if (crumbling.TryGetValue(kv.Key, out ct) && ct > 0) sh = Mathf.Sin(Time.time * 60) * 1.5f;
      kv.Value.color = v == 9 ? new Color(0.8f, 0.68f, 0.55f, 1) : v == 7 ? new Color(0.75f, 0.75f, 0.85f, 1) : Color.white;
      kv.Value.transform.position = new Vector3((kv.Key % room.w) * TILE + sh, -(kv.Key / room.w) * TILE, 0);
    }
  }

  // ---------------------------------------------------------------- what stands in the room
  void EnterMore(string id) {
    foreach (var p in props) if (p.sr != null) Destroy(p.sr.gameObject); props.Clear(); tileSr.Clear();
    foreach (var s in shots) if (s.sr != null) Destroy(s.sr.gameObject); shots.Clear();
    fightOn = false; RefreshTiles();
    if (room.npcs != null) foreach (var n in room.npcs) {
      string k = "npc/npc_" + n.type + (n.type == "trader" && !string.IsNullOrEmpty(n.shop) ? "_" + n.shop : "");
      if (Tex(k) == null) k = "npc/npc_" + n.type;
      AddProp("npc", n.type, k, 2, new Vector2(0.5f, 8f / 300), 2, (n.x + 0.5f) * TILE, (n.y + 1) * TILE, n);
    }
    if (room.benches != null) foreach (var b in room.benches) AddProp("bench", "", "props/bench", 1, new Vector2(0.5f, 10f / 160), 2, (b.x + 0.5f) * TILE, (b.y + 1) * TILE, b);
    if (room.signs != null) foreach (var s in room.signs) AddProp("sign", s.key, "props/sign", 1, new Vector2(0.5f, 10f / 220), 2.2f, (s.x + 0.5f) * TILE, (s.y + 1) * TILE, s);
    if (room.levers != null) foreach (var l in room.levers) { var p = AddProp("lever", l.id, "props/lever", 2, new Vector2(0.5f, 10f / 160), 2, (l.x + 0.5f) * TILE, (l.y + 1) * TILE, l); if (p != null) p.on = PlayerPrefs.GetInt("lever_" + l.id, 0) == 1; }
    if (room.items != null) foreach (var it in room.items) if (!Got(it.id)) SpawnItem(it);
    SpawnShade(); MarkSeen();
    if (room.area != lastArea) { lastArea = room.area; string[] a; if (Story.Area.TryGetValue(room.area, out a)) Card(null, new[] { a[0].Split('|')[0], a[1].Split('|')[0] }, new[] { a[0].Split('|')[1], a[1].Split('|')[1] }, 4.2f, true); }
  }
  Prop AddProp(string kind, string id, string pic, int frames, Vector2 pivot, float ppu, float px, float py, object data) {
    var fr = Strip(pic, frames, pivot, ppu); if (fr == null) return null;
    var go = new GameObject(kind); go.transform.SetParent(roomGo.transform, false);
    var p = new Prop { kind = kind, id = id, sr = go.AddComponent<SpriteRenderer>(), fr = fr, x = px, y = py, data = data, bob = Random.value * 6 };
    p.sr.sprite = fr[0]; p.sr.sortingOrder = kind == "npc" ? 4 : kind == "item" ? 7 : 2; go.transform.position = new Vector3(px, -py, 0); props.Add(p); return p;
  }
  void SpawnItem(ItemData it) {
    float px = (it.x + 0.5f) * TILE, py = (it.y + 1) * TILE;
    Prop p = null;
    if (it.kind == "cache") p = AddProp("item", it.id, "props/chest", 1, new Vector2(0.5f, 10f / 160), 2, px, py, it);
    else if (it.kind == "seed" || it.kind == "fang") p = AddProp("item", it.id, "props/item_seed", 4, new Vector2(0.5f, 0.5f), 2, px, py - 24, it);
    else if (it.kind == "ability") p = AddProp("item", it.id, "props/item_ability", 4, new Vector2(0.5f, 0.5f), 2, px, py - 26, it);
    else if (it.kind == "charm") p = AddProp("item", it.id, "props/charm_" + it.name, 1, new Vector2(0.5f, 0.5f), 3, px, py - 24, it);
    if (p != null) p.i = it.kind == "cache" ? 0 : 1;
  }

  // ---------------------------------------------------------------- input beyond moving, jumping, striking and dashing
  Rect BtnUp { get { var r = BtnRight; r.y -= r.height * 1.2f; r.x -= r.width * 0.62f; return r; } }
  Rect BtnSoul { get { var r = BtnAtk; r.y -= r.height * 1.15f; return r; } }
  Rect BtnDive { get { var r = BtnAtk; r.x -= r.width * 1.2f; return r; } }
  void ReadMore(bool dashHeld) {
    upTouch = soulTouch = diveTouch = false; if (Input.touchCount == 0 && !Input.GetKey(KeyCode.F) && !Input.GetKey(KeyCode.A)) { if (!soulWas) { swiping = false; swipeDy = 0; } }
    for (int i = 0; i < Input.touchCount; i++) {
      var tp = Input.GetTouch(i).position; var q = new Vector2(tp.x, Screen.height - tp.y);
      if (BtnUp.Contains(q)) upTouch = true; else if (BtnSoul.Contains(q)) { soulTouch = true; if (!swiping) { swiping = true; swipeY0 = q.y; } swipeDy = swipeY0 - q.y; } else if (Has("dive") && BtnDive.Contains(q)) diveTouch = true;
    }
    bool up = Input.GetKey(KeyCode.UpArrow) || upTouch, sl = Input.GetKey(KeyCode.F) || Input.GetKey(KeyCode.A) || soulTouch, dv = Input.GetKey(KeyCode.DownArrow) && Input.GetKey(KeyCode.X) || diveTouch;
    if (up && !upWas && near != null) Interact(near);
    upWas = up;
    // soul: a quick press throws an orb, a held press heals
    if (sl) { soulHeld += Time.deltaTime; if (soulHeld > 0.25f && soul >= 33 && hp < maxHp && ground) { healT += Time.deltaTime; inX = 0; if (healT >= (Charmed("focus") ? 0.55f : 0.9f)) { healT = 0; soul -= 33; hp++; Play("w_heal_" + Random.Range(0, 2), 0.7f); Dust(x + PW / 2, y + PH / 2, 6, 60); } } }
    else { if (soulWas && soulHeld < 0.25f && soul >= 33 && orbCD <= 0) CastSpell(); soulHeld = 0; healT = 0; }
    soulWas = sl;
    if (dv && !diveWas && !ground && Has("dive") && !diving) { diving = true; vy = 1100; dashT = 0; Play("nail_down", 0.6f); }
    diveWas = dv;
    // the crystal heart: hold the dash on the ground, then let go
    if (Has("superdash") && dashHeld && ground && sdashT <= 0) sdashCharge += Time.deltaTime;
    else { if (sdashCharge > 0.55f) { sdashT = 1.6f; Play("w_ability_0", 0.7f); Blow(0.05f, 5); } sdashCharge = 0; }
  }
  float swipeY0, swipeDy; bool swiping;
  void CastSpell() {
    bool up = Input.GetKey(KeyCode.UpArrow) || swipeDy > 40, down = Input.GetKey(KeyCode.DownArrow) || swipeDy < -40;
    soul -= 33; orbCD = 0.4f; struck.Clear();
    if (up && Has("cry")) {                                                      // the dusk cry: a pillar of light above
      for (int k = -1; k <= 1; k++) { var p = Fire("pillar", x + PW / 2 + k * 34, y + PH, 0, 0, 0.45f); if (p != null) { p.mine = true; p.h = 260; } }
      Blow(0.05f, 6); Play("w_roar_" + Random.Range(0, 3), 0.5f); Play("w_ability_1", 0.8f); return;
    }
    if (down && Has("star") && !ground) { diving = true; starFall = true; vy = 1300; Play("w_ability_0", 0.8f); return; }   // the star fall: down like a falling star
    var s = Fire("orb", x + PW / 2 + face * 20, y + PH / 2, face * 720, 0, 1.4f); if (s != null) s.mine = true; Play("w_ability_" + Random.Range(0, 2), 0.6f);
  }
  bool starFall;
  void Interact(Prop p) {
    if (p.kind == "npc") TalkTo(p);
    else if (p.kind == "bench") {
      hp = maxHp; PlayerPrefs.SetString("bench_room", room.id); PlayerPrefs.SetFloat("bench_x", p.x); PlayerPrefs.SetFloat("bench_y", p.y); PlayerPrefs.SetInt("hp", hp); PlayerPrefs.Save();
      spawnX = p.x; spawnY = p.y; Play("w_bench_0", 0.7f); Toast(new[] { "استرحتَ على المقعد. حُفظت رحلتك.", "You rest on the bench. Your journey is kept." });
    } else if (p.kind == "sign") {
      string[] t = p.id == "sign_controls" ? Story.Controls : Txt(p.id); if (t == null) return;
      StartTalk(new[] { "لوحة قديمة", "An Old Tablet" }, Tex("props/sign"), new List<string[]> { t }, null, null, 0);
    }
  }

  // ---------------------------------------------------------------- each step: the blade on the world, items, crumbling floors, the dive, death
  void NailWorld(float hx, float hy, float hw, float hh) {
    if (atkT < 0.175f) return;                                                   // once, as the swing starts
    swing++;
    int x0 = Mathf.FloorToInt(hx / TILE), x1 = Mathf.FloorToInt((hx + hw) / TILE), y0 = Mathf.FloorToInt(hy / TILE), y1 = Mathf.FloorToInt((hy + hh) / TILE);
    bool broke = false;
    for (int ty = y0; ty <= y1; ty++) for (int tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) continue; int i = ty * room.w + tx;
      if (cur[i] != 4) continue;
      int hits = PlayerPrefs.GetInt("brkh_" + room.id + "_" + i, 0) + 1;
      if (hits >= 3) { BreakWall(tx, ty); broke = true; } else { PlayerPrefs.SetInt("brkh_" + room.id + "_" + i, hits); Play("w_hit_" + Random.Range(0, 4), 0.5f); Dust((tx + 0.5f) * TILE, (ty + 0.5f) * TILE, 2, 90); Blow(0.03f, 2); }
    }
    if (broke) { RefreshTiles(); Play("w_break_" + Random.Range(0, 3), 0.9f); Blow(0.06f, 6); }
    foreach (var p in props) if (p.kind == "lever" && !p.on && hx < p.x + 20 && hx + hw > p.x - 20 && hy < p.y && hy + hh > p.y - 70) {
      p.on = true; var l = (LeverData)p.data; PlayerPrefs.SetInt("lever_" + l.id, 1); PlayerPrefs.Save();
      if (l.gates != null) foreach (var g in l.gates) { SetRect(g.x, g.y, g.w, g.h, 0); Dust((g.x + g.w / 2f) * TILE, (g.y + g.h / 2f) * TILE, 8, 140); }
      RefreshTiles(); Play("w_slam_0", 0.7f); Blow(0.05f, 6); Toast(new[] { "انفتح بابٌ في مكانٍ ما…", "A gate opened somewhere..." });
    }
  }
  void BreakWall(int tx, int ty) {
    // the whole wall gives way, every breakable tile that touches it
    var todo = new Stack<int>(); todo.Push(ty * room.w + tx);
    while (todo.Count > 0) {
      int i = todo.Pop(); if (cur[i] != 4 && cur[i] != 7) continue; cur[i] = 0; PlayerPrefs.SetInt("brk_" + room.id + "_" + i, 1);
      Dust((i % room.w + 0.5f) * TILE, (i / room.w + 0.5f) * TILE, 3, 160);
      int cx = i % room.w, cy = i / room.w;
      if (cx > 0) todo.Push(i - 1); if (cx < room.w - 1) todo.Push(i + 1); if (cy > 0) todo.Push(i - room.w); if (cy < room.h - 1) todo.Push(i + room.w);
    }
    PlayerPrefs.Save();
  }
  void StepMore(float dt) {
    orbCD -= dt;
    StepShots(dt); StepArena(); StepWardens();
    // the crystal heart flight
    if (sdashT > 0) { sdashT -= dt; vx = face * 950; vy = 0; if (BoxHits(x + face * 3, y) || jumpBuf > 0) { sdashT = 0; vx = 0; Blow(0.05f, 6); Dust(x + PW / 2, y + PH / 2, 6, 160); } }
    // the dive: down hard; it breaks a cracked floor and strikes what is near where it lands
    if (diving) {
      vy = 1100;
      if (ground) {
        diving = false; Blow(0.07f, 9); Dust(x + PW / 2, y + PH, 10, 200); Play("w_slam_" + Random.Range(0, 3), 0.8f);
        if (starFall) { starFall = false; Blow(0.12f, 14); foreach (int sd in new[] { -1, 1 }) { var w = Fire("shock", x + PW / 2 + sd * 20, y + PH, sd * 520, 0, 1.2f); if (w != null) w.mine = true; } }
        int ty = Mathf.FloorToInt((y + PH + 4) / TILE);
        for (int tx = Mathf.FloorToInt(x / TILE) - 1; tx <= Mathf.FloorToInt((x + PW) / TILE) + 1; tx++) if (Tile(tx, ty) == 7) { BreakWall(tx, ty); RefreshTiles(); }
        foreach (var f in foes) if (f.mode != 3 && Mathf.Abs(f.x + f.d.w / 2 - (x + PW / 2)) < 90 && Mathf.Abs(f.y + f.d.h - (y + PH)) < 60) { f.hp -= 10; f.flash = 0.15f; if (f.hp <= 0) { f.mode = 3; f.st = f.boss ? 1.2f : 0.3f; OnFoeDown(f); } }
      }
    }
    // crumbling floors: they shake under the feet, fall away, and come back
    if (ground) {
      int ty = Mathf.FloorToInt((y + PH + 2) / TILE);
      for (int tx = Mathf.FloorToInt(x / TILE); tx <= Mathf.FloorToInt((x + PW - 0.01f) / TILE); tx++) { int i = ty * room.w + tx; if (i >= 0 && i < cur.Length && cur[i] == 9 && !crumbling.ContainsKey(i)) crumbling[i] = 0.45f; }
    }
    var keys = new List<int>(crumbling.Keys);
    foreach (var i in keys) {
      float t = crumbling[i] - dt; crumbling[i] = t;
      if (t <= 0 && t > -dt * 1.5f && cur[i] == 9) { cur[i] = 0; RefreshTiles(); Dust((i % room.w + 0.5f) * TILE, (i / room.w + 0.5f) * TILE, 3, 80); Play("w_break_" + Random.Range(0, 3), 0.4f); }
      if (t < -3) { int tx = i % room.w, ty2 = i / room.w; bool inside = x < (tx + 1) * TILE && x + PW > tx * TILE && y < (ty2 + 1) * TILE && y + PH > ty2 * TILE; if (!inside) { cur[i] = 9; crumbling.Remove(i); RefreshTiles(); } }
    }
    // items: taken by walking into them
    for (int k = props.Count - 1; k >= 0; k--) {
      var p = props[k]; if (p.kind != "item") continue;
      if (Mathf.Abs(p.x - (x + PW / 2)) > 30 || Mathf.Abs(p.y - (y + PH / 2)) > 50) continue;
      var it = (ItemData)p.data;
      if (it.kind == "charm" && !string.IsNullOrEmpty(it.guard) && PlayerPrefs.GetInt("champ_" + it.id, 0) == 0) continue;
      Take(it); Destroy(p.sr.gameObject); props.RemoveAt(k);
    }
    // what the hero stands near, to talk, rest or read
    near = null; float best = 70;
    foreach (var p in props) if (p.kind == "npc" || p.kind == "bench" || p.kind == "sign") { float d = Mathf.Abs(p.x - (x + PW / 2)); if (d < best && Mathf.Abs(p.y - (y + PH)) < 60) { best = d; near = p; } }
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) Respawn(); }
  }
  void Take(ItemData it) {
    PlayerPrefs.SetInt("got_" + it.id, 1);
    if (it.kind == "cache") { geo += it.amount > 0 ? it.amount : 50; Play("w_geo_" + Random.Range(0, 4), 0.8f); Toast(new[] { "كنزٌ مخبّأ: +" + (it.amount > 0 ? it.amount : 50) + " جيو", "A hidden cache: +" + (it.amount > 0 ? it.amount : 50) + " geo" }); }
    else if (it.kind == "seed" || it.kind == "fang") { maxHp = Mathf.Min(9, maxHp + 1); hp = maxHp; PlayerPrefs.SetInt("maxhp", maxHp); Play("w_heal_0", 0.8f); Toast(new[] { "بذرة القناع: صار لك قناعٌ جديد.", "A mask seed: you gained a mask." }); }
    else if (it.kind == "ability") {
      PlayerPrefs.SetInt("abil_" + it.name, 1); Play("w_ability_1", 0.9f); Blow(0.1f, 6);
      string[] pw; if (Story.Power.TryGetValue(it.name, out pw)) StartTalk(new[] { pw[0].Split('|')[0], pw[1].Split('|')[0] }, Tex("props/item_ability"), new List<string[]> { new[] { pw[0].Split('|')[1], pw[1].Split('|')[1] } }, null, null, 0.4f);
    } else if (it.kind == "charm") {
      PlayerPrefs.SetInt("charm_" + it.name, 1); Play("w_ability_0", 0.9f);
      int cost; if (COST.TryGetValue(it.name, out cost) && NotchesUsed() + cost <= Notches()) PlayerPrefs.SetInt("charm_on_" + it.name, 1);   // worn at once if the notches allow
      string[] c; if (Story.Charm.TryGetValue(it.name, out c)) StartTalk(new[] { c[0].Split('|')[0], c[1].Split('|')[0] }, Tex("props/charm_" + it.name), new List<string[]> { new[] { c[0].Split('|')[1], c[1].Split('|')[1] } }, null, null, 0.4f);
    }
    PlayerPrefs.SetInt("geo", geo); PlayerPrefs.Save();
  }
  // a wound from a creature, a shot or a lord
  void Wound(float fromX) {
    if (hurtT > 0 || deadT > 0) return;
    Blow(0.08f, 6); Play("hero_hurt0", 0.6f); hp--; hurtT = HurtTime(); healT = 0; diving = false; sdashT = 0;
    vx = (x + PW / 2 < fromX ? -1 : 1) * 320; vy = -380; Thorns();
    if (hp <= 0) Die();
  }
  void Thorns() { if (!Charmed("thorn")) return; foreach (var f in foes) if (f.mode != 3 && Mathf.Abs(f.x + f.d.w / 2 - (x + PW / 2)) < 110 && Mathf.Abs(f.y + f.d.h / 2 - (y + PH / 2)) < 90) { f.hp -= 10; f.flash = 0.15f; if (f.hp <= 0) { f.mode = 3; f.st = 0.3f; OnFoeDown(f); } } }
  void Die() {
    if (deadT > 0) return; LeaveShade(); deadT = 1.6f; hp = 0; vx = 0; vy = 0; Play("hero_die", 0.8f); Blow(0.2f, 10); Dust(x + PW / 2, y + PH / 2, 14, 180);
  }
  void Respawn() {
    hp = maxHp; soul = 0; fightOn = false; bossNow = null;
    string br = PlayerPrefs.GetString("bench_room", "");
    if (br != "" && rooms.ContainsKey(br)) Enter(br, PlayerPrefs.GetFloat("bench_x"), PlayerPrefs.GetFloat("bench_y"));
    else Enter(startRoom, startX, startY);
    Toast(new[] { "سقطتَ في الظلام… وظلّك ينتظر حيث سقطت ومعه الجيو. اهزمه لتستعيده.", "You fell into the dark... your shade waits where you fell, holding your geo. Beat it to take it back." });
  }
  void UpdateMore(float rx, float ry) {
    float t = Time.time;
    foreach (var p in props) {
      p.t += Time.deltaTime; float bx = p.x, by = p.y;
      if (p.kind == "npc") { p.sr.sprite = p.fr[(int)(p.t / 2.2f + p.bob) % p.fr.Length]; p.sr.flipX = rx + PW / 2 < p.x; float br = 1 + 0.012f * Mathf.Sin(t * 2.2f + p.bob); p.sr.transform.localScale = new Vector3(1, br, 1); }
      else if (p.kind == "lever") p.sr.sprite = p.fr[p.on ? 1 : 0];
      else if (p.kind == "item" && p.i == 1) { by += Mathf.Sin(t * 2.4f + p.bob) * 5; if (p.fr.Length > 1) p.sr.sprite = p.fr[(int)(t * 8) % p.fr.Length]; }
      p.sr.transform.position = new Vector3(bx, -by, 0);
      p.sr.color = p == near ? new Color(1.15f, 1.1f, 0.95f, 1) : Color.white;
    }
    DrawShots(); TileLook();
  }
}
