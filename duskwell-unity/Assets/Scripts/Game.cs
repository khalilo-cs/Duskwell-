// Duskwell in Unity, stage one: every room of the world (Resources/world.json, exported from the first version), the hero's
// movement with the same numbers, doors between rooms, hazards, the camera, painted backgrounds and rock, touch and keys.
// Everything is built from code when the game starts, so the project needs no hand-made scene. One unit is one pixel of the
// first version; y grows upward here, so a pixel row py is drawn at -py.
using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable] public class DoorData { public string id; public int x, y, w, h; public string to, toDoor; }
[Serializable] public class EnemyData { public string type; public int x, y; }
[Serializable] public class RoomData { public string id; public int w, h; public string theme, bg, area, t; public DoorData[] doors; public EnemyData[] enemies; }
[Serializable] public class StartData { public string room; public float x, y; }
[Serializable] public class WorldData { public StartData start; public RoomData[] rooms; }
[Serializable] public class FrameData { public float x, y, w, h, ax, ay; }
[Serializable] public class AnimData { public string name; public FrameData[] f; }
[Serializable] public class HeroData { public AnimData[] anims; }
[Serializable] public class CreatureData { public string type; public int fw, fh; public float w, h, hp; }
[Serializable] public class DrawList { public string[] src; public int[] dim; public float[] d; }
[Serializable] public class CreatureList { public CreatureData[] list; }
// a creature of the room: walkers pace their ledge and turn at its ends, flyers drift toward the hero, hanging things stay
public class Foe { public CreatureData d; public Sprite[] fr; public SpriteRenderer sr; public float x, y, vx, vy, hp, flash, t, homeY; public int face = 1; public int mode; }

public class Game : MonoBehaviour {
  const int TILE = 32; const float STEP = 1f / 60f;
  const float GRAV = 2200, MAXFALL = 900, FALL_MULT = 1.25f, RUN = 250, JUMP = 700;
  const float PW = 22, PH = 38, HERO_SCALE = 0.58f;

  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
  static void Boot() { var go = new GameObject("Game"); go.AddComponent<Game>(); DontDestroyOnLoad(go); }

  readonly Dictionary<string, RoomData> rooms = new Dictionary<string, RoomData>();
  readonly Dictionary<string, Sprite[]> anims = new Dictionary<string, Sprite[]>();
  RoomData room; Camera cam; Material spriteMat; GameObject roomGo; SpriteRenderer sky, hero;
  // the hero, in pixels of the room (x, y is the top-left of the body; y grows downward as in the first version)
  float x, y, vx, vy, coyote, jumpBuf, animT, acc, hurtT; int face = 1, hp = 5; bool ground, jumping, armed;
  float spawnX, spawnY; bool jumpHeld, jumpWas; float inX;
  Texture2D btnBase, btnJump, btnAtk, heartFull, heartEmpty;
  readonly Dictionary<string, CreatureData> kinds = new Dictionary<string, CreatureData>();
  readonly Dictionary<string, Sprite[]> kindFrames = new Dictionary<string, Sprite[]>();
  readonly List<Foe> foes = new List<Foe>();
  AudioSource music, amb, sfx; string track = ""; readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
  float dashT, dashCD, lockX, wallCoy, fade = 1; bool airDash, airJump, dashWas, dashTouch; int wallDir; Texture2D btnDash;
  static readonly Dictionary<string, string> TRACK = new Dictionary<string, string> { { "town", "hushvale" }, { "cave", "adventure" }, { "webbed", "abyss" }, { "bone", "ossuary" } };
  float atkT, atkCD; bool atkWas, atkHeldTouch; readonly HashSet<Foe> struck = new HashSet<Foe>();
  const string FLYERS = " flyer diver moth jelly skullbat veil orrery frostwisp stormkite ", STILL = " icicle censer shard dummy ";

  void Awake() {
    Application.targetFrameRate = 60; QualitySettings.vSyncCount = 1; Screen.sleepTimeout = SleepTimeout.NeverSleep;
    var world = JsonUtility.FromJson<WorldData>(Resources.Load<TextAsset>("world").text);
    foreach (var r in world.rooms) rooms[r.id] = r;
    var camGo = new GameObject("Camera"); cam = camGo.AddComponent<Camera>(); camGo.tag = "MainCamera";
    cam.orthographic = true; cam.orthographicSize = 270; cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black;
    camGo.transform.position = new Vector3(0, 0, -100);
    var skyGo = new GameObject("Sky"); skyGo.transform.SetParent(camGo.transform, false); skyGo.transform.localPosition = new Vector3(0, 0, 90);
    sky = skyGo.AddComponent<SpriteRenderer>(); sky.sortingOrder = -10000; spriteMat = sky.sharedMaterial;
    var heroGo = new GameObject("Hero"); hero = heroGo.AddComponent<SpriteRenderer>(); hero.sortingOrder = 10;
    var tex = Resources.Load<Texture2D>("hero"); var hd = JsonUtility.FromJson<HeroData>(Resources.Load<TextAsset>("hero").text);
    foreach (var a in hd.anims) {
      var list = new Sprite[a.f.Length];
      for (int i = 0; i < list.Length; i++) { var f = a.f[i]; list[i] = Sprite.Create(tex, new Rect(f.x, tex.height - f.y - f.h, f.w, f.h), new Vector2(f.ax / f.w, 1 - f.ay / f.h), 1); }
      anims[a.name] = list;
    }
    btnBase = Resources.Load<Texture2D>("btn/base"); btnJump = Resources.Load<Texture2D>("btn/jump"); btnAtk = Resources.Load<Texture2D>("btn/attack");
    heartFull = Resources.Load<Texture2D>("ui/life_full"); heartEmpty = Resources.Load<Texture2D>("ui/life_empty");
    foreach (var c in JsonUtility.FromJson<CreatureList>(Resources.Load<TextAsset>("creatures").text).list) kinds[c.type] = c;
    btnDash = Resources.Load<Texture2D>("btn/dash");
    music = gameObject.AddComponent<AudioSource>(); music.loop = true; music.volume = 0.5f;
    amb = gameObject.AddComponent<AudioSource>(); amb.loop = true; amb.volume = 0.3f;
    sfx = gameObject.AddComponent<AudioSource>();
    // the game goes on from the room last entered
    string saved = PlayerPrefs.GetString("room", "");
    if (saved != "" && rooms.ContainsKey(saved)) { hp = Mathf.Clamp(PlayerPrefs.GetInt("hp", 5), 1, 5); Enter(saved, PlayerPrefs.GetFloat("fx", world.start.x), PlayerPrefs.GetFloat("fy", world.start.y)); }
    else Enter(world.start.room, world.start.x, world.start.y);
  }

  void Play(string name, float vol) {
    AudioClip c; if (!clips.TryGetValue(name, out c)) { c = Resources.Load<AudioClip>("sfx/" + name); clips[name] = c; }
    if (c != null) sfx.PlayOneShot(c, vol);
  }
  // ---------------------------------------------------------------- the room
  int Tile(int tx, int ty) { if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) return ty >= room.h ? 0 : 1; return room.t[ty * room.w + tx] - '0'; }
  static bool Solid(int v) { return v == 1 || v == 4 || v == 5 || v == 7 || v == 9 || v == 6; }

  void Enter(string id, float feetX, float feetY) {
    room = rooms[id];
    if (roomGo != null) Destroy(roomGo);
    roomGo = new GameObject("Room " + id);
    var fill = Resources.Load<Texture2D>("floors/" + room.theme); if (fill != null) fill.wrapMode = TextureWrapMode.Repeat;
    var v = new List<Vector3>(); var uv = new List<Vector2>(); var col = new List<Color>(); var tri = new List<int>();
    var v2 = new List<Vector3>(); var uv2 = new List<Vector2>(); var col2 = new List<Color>(); var tri2 = new List<int>();
    for (int ty = 0; ty < room.h; ty++) for (int tx = 0; tx < room.w; tx++) {
      int t = Tile(tx, ty); float px = tx * TILE, py = ty * TILE;
      if (Solid(t)) {
        int air = 0; for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) if (!Solid(Tile(tx + i, ty + j))) air++;
        float k = 0.5f + 0.5f * Mathf.Clamp01(air / 10f);                       // rock deep inside is darker
        Quad(v, uv, col, tri, px, py, TILE, TILE, new Color(k, k, k, 1), 512);
        if (!Solid(Tile(tx, ty - 1))) Quad(v2, uv2, col2, tri2, px, py, TILE, 4, new Color(1, 1, 1, 0.28f), 0);   // a lit edge on top
      } else if (t == 2) Quad(v, uv, col, tri, px, py, TILE, 10, new Color(1.2f, 1.2f, 1.2f, 1), 512);
      else if (t == 3) for (int s = 0; s < 3; s++) Spike(v2, uv2, col2, tri2, px + s * TILE / 3f, py + TILE, TILE / 3f, 22, new Color(0.85f, 0.88f, 0.95f, 1));
      else if (t == 8) Quad(v2, uv2, col2, tri2, px, py + 8, TILE, TILE - 8, new Color(0.45f, 0.9f, 0.5f, 0.75f), 0);
    }
    Layer("Rock", v, uv, col, tri, fill, -6000);
    if (!Painted(id)) Layer("Edges", v2, uv2, col2, tri2, Texture2D.whiteTexture, -5999);
    var bg = Resources.Load<Texture2D>("bg/" + room.bg); if (bg == null) bg = Resources.Load<Texture2D>("bg/" + room.theme);
    if (bg != null) {
      sky.sprite = Sprite.Create(bg, new Rect(0, 0, bg.width, bg.height), new Vector2(0.5f, 0.5f), 1);
      float s = Mathf.Max(560f / bg.height, 560f * cam.aspect / bg.width); sky.transform.localScale = new Vector3(s, s, 1);
    }
    x = feetX - PW / 2; y = feetY - PH; vx = 0; vy = 0; spawnX = feetX; spawnY = feetY; armed = false;
    fade = 1;
    PlayerPrefs.SetString("room", id); PlayerPrefs.SetFloat("fx", feetX); PlayerPrefs.SetFloat("fy", feetY); PlayerPrefs.SetInt("hp", hp); PlayerPrefs.Save();
    string tr; if (!TRACK.TryGetValue(room.theme, out tr)) tr = room.theme;
    if (tr != track) {                                                     // each area its own piece and its own air
      track = tr; var mc = Resources.Load<AudioClip>("music/" + tr); if (mc != null) { music.clip = mc; music.Play(); }
      var ac = Resources.Load<AudioClip>("amb/" + room.theme); if (ac != null) { amb.clip = ac; amb.Play(); } else amb.Stop();
    }
    foes.Clear();
    foreach (var e in room.enemies) {
      CreatureData d; if (!kinds.TryGetValue(e.type, out d)) continue;
      Sprite[] fr; if (!kindFrames.TryGetValue(e.type, out fr)) {
        var ct = Resources.Load<Texture2D>("creatures/" + e.type); if (ct == null) continue;
        fr = new Sprite[4]; for (int i = 0; i < 4; i++) fr[i] = Sprite.Create(ct, new Rect(i * d.fw, 0, d.fw, d.fh), new Vector2(0.5f, 0), 2);
        kindFrames[e.type] = fr;
      }
      var go = new GameObject(e.type); go.transform.SetParent(roomGo.transform, false);
      var f = new Foe { d = d, fr = fr, sr = go.AddComponent<SpriteRenderer>(), hp = d.hp, x = (e.x + 0.5f) * TILE - d.w / 2, y = (e.y + 1) * TILE - d.h };
      f.sr.sortingOrder = 5; f.homeY = f.y; f.mode = STILL.Contains(" " + e.type + " ") ? 2 : FLYERS.Contains(" " + e.type + " ") ? 1 : 0; f.vx = 40; f.t = e.x;
      foes.Add(f);
    }
  }
  // the room as it was painted in the first version: every piece laid there (rock edges, ledges, spikes, furnishings, hills,
  // arches) is listed in Resources/draws/<room>.json with its sheet, its place and its turn, and laid here the same way and in
  // the same order; pieces of one sheet that follow one another share a mesh
  bool Painted(string id) {
    var ta = Resources.Load<TextAsset>("draws/" + id); if (ta == null) return false;
    var L = JsonUtility.FromJson<DrawList>(ta.text); if (L == null || L.d == null || L.d.Length == 0) return false;
    var v = new List<Vector3>(); var uv = new List<Vector2>(); var col = new List<Color>(); var tri = new List<int>();
    int cur = -1, run = 0; float[] d = L.d;
    for (int i = 0; i + 16 < d.Length + 1 && i + 16 < d.Length; i += 17) {
      int si = (int)d[i];
      if (si != cur) { Flush(L, cur, run++, v, uv, col, tri); cur = si; }
      float W = L.dim[si * 2], H = L.dim[si * 2 + 1], sx = d[i + 1], sy = d[i + 2], sw = d[i + 3], sh = d[i + 4], dx = d[i + 5], dy = d[i + 6], dw = d[i + 7], dh = d[i + 8];
      float a = d[i + 9], b = d[i + 10], c = d[i + 11], e = d[i + 12], tx = d[i + 13], ty = d[i + 14], k = d[i + 16]; var cl = new Color(k, k, k, d[i + 15]);
      int n = v.Count;
      for (int q = 0; q < 4; q++) {
        float px = dx + (q == 1 || q == 2 ? dw : 0), py = dy + (q >= 2 ? dh : 0);
        v.Add(new Vector3(a * px + c * py + tx, -(b * px + e * py + ty)));
        uv.Add(new Vector2((sx + (q == 1 || q == 2 ? sw : 0)) / W, 1 - (sy + (q >= 2 ? sh : 0)) / H)); col.Add(cl);
      }
      tri.Add(n); tri.Add(n + 1); tri.Add(n + 2); tri.Add(n); tri.Add(n + 2); tri.Add(n + 3);
    }
    Flush(L, cur, run, v, uv, col, tri);
    return true;
  }
  readonly Dictionary<string, Texture2D> sheets = new Dictionary<string, Texture2D>();
  void Flush(DrawList L, int si, int run, List<Vector3> v, List<Vector2> uv, List<Color> col, List<int> tri) {
    if (si >= 0 && v.Count > 0) {
      Texture2D t; if (!sheets.TryGetValue(L.src[si], out t)) { t = Resources.Load<Texture2D>("atlas/" + L.src[si]); sheets[L.src[si]] = t; }
      if (t != null) Layer("Painted " + L.src[si], v, uv, col, tri, t, -5000 + run);
    }
    v.Clear(); uv.Clear(); col.Clear(); tri.Clear();
  }
  void Layer(string name, List<Vector3> v, List<Vector2> uv, List<Color> col, List<int> tri, Texture2D tex, int order) {
    var go = new GameObject(name); go.transform.SetParent(roomGo.transform, false);
    var m = new Mesh(); m.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32; m.SetVertices(v); m.SetUVs(0, uv); m.SetColors(col); m.SetTriangles(tri, 0);
    go.AddComponent<MeshFilter>().sharedMesh = m; var r = go.AddComponent<MeshRenderer>();
    var mat = new Material(spriteMat); mat.mainTexture = tex; r.sharedMaterial = mat; r.sortingOrder = order;
  }
  static void Quad(List<Vector3> v, List<Vector2> uv, List<Color> col, List<int> tri, float px, float py, float w, float h, Color c, float texSize) {
    int n = v.Count;
    v.Add(new Vector3(px, -py)); v.Add(new Vector3(px + w, -py)); v.Add(new Vector3(px + w, -py - h)); v.Add(new Vector3(px, -py - h));
    if (texSize > 0) { uv.Add(new Vector2(px / texSize, -py / texSize)); uv.Add(new Vector2((px + w) / texSize, -py / texSize)); uv.Add(new Vector2((px + w) / texSize, (-py - h) / texSize)); uv.Add(new Vector2(px / texSize, (-py - h) / texSize)); }
    else { uv.Add(Vector2.zero); uv.Add(Vector2.zero); uv.Add(Vector2.zero); uv.Add(Vector2.zero); }
    for (int i = 0; i < 4; i++) col.Add(c);
    tri.Add(n); tri.Add(n + 1); tri.Add(n + 2); tri.Add(n); tri.Add(n + 2); tri.Add(n + 3);
  }
  static void Spike(List<Vector3> v, List<Vector2> uv, List<Color> col, List<int> tri, float px, float baseY, float w, float h, Color c) {
    int n = v.Count;
    v.Add(new Vector3(px, -baseY)); v.Add(new Vector3(px + w / 2, -baseY + h)); v.Add(new Vector3(px + w, -baseY));
    for (int i = 0; i < 3; i++) { uv.Add(Vector2.zero); col.Add(c); }
    tri.Add(n); tri.Add(n + 1); tri.Add(n + 2);
  }

  // ---------------------------------------------------------------- input: keys, and three touch buttons
  Rect BtnLeft { get { float s = Screen.height * 0.2f; return new Rect(Screen.width * 0.03f, Screen.height - s * 1.25f, s, s); } }
  Rect BtnRight { get { var r = BtnLeft; r.x += r.width * 1.25f; return r; } }
  Rect BtnJump { get { float s = Screen.height * 0.22f; return new Rect(Screen.width * 0.97f - s, Screen.height - s * 1.25f, s, s); } }
  Rect BtnAtk { get { var r = BtnJump; r.x -= r.width * 1.2f; return r; } }
  Rect BtnDash { get { var r = BtnJump; r.y -= r.height * 1.15f; return r; } }
  void ReadInput() {
    inX = 0; atkHeldTouch = false; dashTouch = false; bool held = Input.GetKey(KeyCode.Z) || Input.GetKey(KeyCode.Space);
    if (Input.GetKey(KeyCode.LeftArrow)) inX -= 1; if (Input.GetKey(KeyCode.RightArrow)) inX += 1;
    for (int i = 0; i < Input.touchCount; i++) {
      var p = Input.GetTouch(i).position; var q = new Vector2(p.x, Screen.height - p.y);
      if (BtnLeft.Contains(q)) inX = -1; else if (BtnRight.Contains(q)) inX = 1; else if (BtnAtk.Contains(q)) atkHeldTouch = true; else if (BtnDash.Contains(q)) dashTouch = true; else if (q.x > Screen.width * 0.5f) held = true;
    }
    bool atk = Input.GetKey(KeyCode.X) || atkHeldTouch;
    if (atk && !atkWas && atkCD <= 0) { atkT = 0.2f; atkCD = 0.42f; struck.Clear(); Play("nail_side", 0.7f); }
    bool dash = Input.GetKey(KeyCode.C) || dashTouch;
    if (dash && !dashWas && dashCD <= 0 && (ground || airDash)) { dashT = 0.18f; dashCD = 0.5f; if (!ground) airDash = false; vy = 0; }
    dashWas = dash;
    atkWas = atk;
    if (held && !jumpWas) jumpBuf = 0.12f;
    jumpWas = held; jumpHeld = held;
  }
  void OnGUI() {
    if (btnBase == null) return;
    var old = GUI.color; GUI.color = new Color(1, 1, 1, 0.75f);
    GUI.DrawTexture(BtnLeft, btnBase); GUI.DrawTexture(BtnRight, btnBase); GUI.DrawTexture(BtnJump, btnJump != null ? btnJump : btnBase); GUI.DrawTexture(BtnAtk, btnAtk != null ? btnAtk : btnBase); GUI.DrawTexture(BtnDash, btnDash != null ? btnDash : btnBase);
    var st = new GUIStyle(GUI.skin.label); st.alignment = TextAnchor.MiddleCenter; st.fontSize = (int)(Screen.height * 0.08f);
    GUI.Label(BtnLeft, "◀", st); GUI.Label(BtnRight, "▶", st);
    GUI.color = Color.white; float hs = Screen.height * 0.07f;
    for (int i = 0; i < 5; i++) { var ht = i < hp ? heartFull : heartEmpty; if (ht != null) GUI.DrawTexture(new Rect(Screen.width * 0.03f + i * hs * 1.1f, Screen.height * 0.03f, hs, hs), ht); }
    if (fade > 0) { GUI.color = new Color(0, 0, 0, Mathf.Clamp01(fade)); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture); }   // a room opens out of the dark
    GUI.color = old;
  }

  // ---------------------------------------------------------------- the hero
  static float Approach(float a, float b, float d) { return a < b ? Mathf.Min(a + d, b) : Mathf.Max(a - d, b); }
  bool BoxHits(float bx, float by) {
    int x0 = Mathf.FloorToInt(bx / TILE), x1 = Mathf.FloorToInt((bx + PW - 0.01f) / TILE), y0 = Mathf.FloorToInt(by / TILE), y1 = Mathf.FloorToInt((by + PH - 0.01f) / TILE);
    for (int ty = y0; ty <= y1; ty++) for (int tx = x0; tx <= x1; tx++) if (Solid(Tile(tx, ty))) return true;
    return false;
  }
  void StepHero(float dt) {
    dashT -= dt; dashCD -= dt; lockX -= dt; wallCoy -= dt;
    if (ground) { airDash = true; airJump = true; }
    if (dashT > 0) { vx = face * 690; vy = 0; }                              // a dash: straight, weightless
    else {
      if (lockX <= 0) { vx = Approach(vx, inX * RUN, (inX == 0 ? 4200 : 3600) * dt * (ground ? 1 : 0.85f)); if (inX != 0) face = inX > 0 ? 1 : -1; }
      vy = Mathf.Min(vy + GRAV * (vy > 0 ? FALL_MULT : 1) * dt, MAXFALL);
      // a wall held to while falling is slid down slowly, and can be jumped from
      int wd = 0; if (!ground && inX != 0 && BoxHits(x + inX * 2, y)) wd = (int)inX;
      if (wd != 0) { wallDir = wd; wallCoy = 0.12f; airDash = true; airJump = true; if (vy > 70) vy = 70; }
    }
    coyote = ground ? 0.1f : coyote - dt; jumpBuf -= dt;
    if (jumpBuf > 0 && dashT <= 0) {
      if (coyote > 0) { vy = -JUMP; jumping = true; coyote = 0; jumpBuf = 0; ground = false; Play("hero_jump", 0.25f); }
      else if (wallCoy > 0) { vy = -650; vx = -wallDir * 310; face = -wallDir; lockX = 0.13f; jumping = true; jumpBuf = 0; wallCoy = 0; }
      else if (airJump) { vy = -630; airJump = false; jumping = true; jumpBuf = 0; }
    }
    if (jumping && !jumpHeld && vy < -260) vy = -260;                        // letting go cuts the rise
    if (vy >= 0) jumping = false;
    // sideways
    float nx = x + vx * dt;
    if (BoxHits(nx, y)) { nx = vx > 0 ? Mathf.Floor((nx + PW) / TILE) * TILE - PW : Mathf.Floor(nx / TILE + 1) * TILE; vx = 0; if (BoxHits(nx, y)) nx = x; }
    x = nx;
    // up and down
    float bottom0 = y + PH, ny = y + vy * dt; ground = false;
    if (vy < 0) { if (BoxHits(x, ny)) { ny = Mathf.Floor(ny / TILE + 1) * TILE; vy = 0; } }
    else {
      int ty = Mathf.FloorToInt((ny + PH) / TILE), x0 = Mathf.FloorToInt(x / TILE), x1 = Mathf.FloorToInt((x + PW - 0.01f) / TILE);
      for (int tx = x0; tx <= x1; tx++) {
        int t = Tile(tx, ty);
        if (Solid(t) || (t == 2 && bottom0 <= ty * TILE + 0.5f)) {
          ny = ty * TILE - PH; ground = true;
          if (t == 6) { vy = -980; ground = false; jumping = false; } else vy = 0;       // a springing cap
          break;
        }
      }
    }
    y = ny;
    // spikes and acid: a wound, and back to where the room was entered
    hurtT -= dt;
    int cx = Mathf.FloorToInt((x + PW / 2) / TILE), cy = Mathf.FloorToInt((y + PH - 4) / TILE), tt = Tile(cx, cy);
    if (tt == 3 || tt == 8 || y > room.h * TILE + 200) Hurt();
    StepFoes(dt);
    Doors();
  }
  bool SolidAt(float px, float py) { return Solid(Tile(Mathf.FloorToInt(px / TILE), Mathf.FloorToInt(py / TILE))); }
  void StepFoes(float dt) {
    atkT -= dt; atkCD -= dt;
    float hx = face > 0 ? x + PW : x + PW - 64 - PW, hy = y - 4, hw = 64, hh = PH + 8;      // the blade's reach in front of the hero
    for (int i = foes.Count - 1; i >= 0; i--) {
      var f = foes[i]; f.t += dt; f.flash -= dt;
      if (f.mode == 0) {                                                       // a walker: gravity, its ledge, a turn at a wall or an edge
        f.vy = Mathf.Min(f.vy + GRAV * dt, MAXFALL);
        float ny = f.y + f.vy * dt; bool on = false;
        if (SolidAt(f.x + f.d.w / 2, ny + f.d.h)) { ny = Mathf.Floor((ny + f.d.h) / TILE) * TILE - f.d.h; f.vy = 0; on = true; }
        f.y = ny;
        if (on) {
          // one that sees the hero on its own ledge comes for them, faster
          float hdx = x + PW / 2 - (f.x + f.d.w / 2); bool sees = Mathf.Abs(hdx) < 280 && Mathf.Abs(y + PH - (f.y + f.d.h)) < 48;
          f.vx = sees && Mathf.Abs(hdx) > 12 ? Mathf.Sign(hdx) * 85 : Mathf.Sign(f.vx == 0 ? 1 : f.vx) * 40;
          float ahead = f.vx > 0 ? f.x + f.d.w + 2 : f.x - 2;
          if (SolidAt(ahead, f.y + f.d.h - 4) || !SolidAt(ahead, f.y + f.d.h + 4)) { if (!sees) f.vx = -f.vx; } else f.x += f.vx * dt;
        }
        if (Mathf.Abs(f.vx) > 1) f.face = f.vx > 0 ? 1 : -1;
        if (f.y > room.h * TILE + 300) { Destroy(f.sr.gameObject); foes.RemoveAt(i); continue; }
      } else if (f.mode == 1) {                                                // a flyer: bobs, and drifts toward the hero when near
        float dx = x + PW / 2 - (f.x + f.d.w / 2), dy = y + PH / 2 - (f.y + f.d.h / 2); bool near = Mathf.Abs(dx) < 320 && Mathf.Abs(dy) < 220;
        f.vx = Approach(f.vx, near ? Mathf.Sign(dx) * 70 : 0, 160 * dt); f.vy = Approach(f.vy, near ? Mathf.Sign(dy) * 50 : (f.homeY - f.y), 160 * dt);
        float nx = f.x + f.vx * dt, ny = f.y + f.vy * dt + Mathf.Sin(f.t * 3) * 0.4f;
        if (!SolidAt(nx + f.d.w / 2, f.y + f.d.h / 2)) f.x = nx; else f.vx = 0;
        if (!SolidAt(f.x + f.d.w / 2, ny + f.d.h / 2)) f.y = ny; else f.vy = 0;
        if (Mathf.Abs(f.vx) > 5) f.face = f.vx > 0 ? 1 : -1;
      }
      bool touch = x < f.x + f.d.w && x + PW > f.x && y < f.y + f.d.h && y + PH > f.y;
      if (atkT > 0 && !struck.Contains(f) && hx < f.x + f.d.w && hx + hw > f.x && hy < f.y + f.d.h && hy + hh > f.y) {
        Play("nail_hit", 0.7f); Play(f.d.type + (f.hp <= 5 ? "_die" : "_hurt"), 0.6f);
        struck.Add(f); f.hp -= 5; f.flash = 0.15f; if (f.mode != 2) f.x += face * 14; vx = -face * 150;
        if (f.hp <= 0) { Destroy(f.sr.gameObject); foes.RemoveAt(i); continue; }
      } else if (touch && hurtT <= 0) { Play("hero_hurt0", 0.6f); hp--; hurtT = 1.2f; vx = (x + PW / 2 < f.x + f.d.w / 2 ? -1 : 1) * 320; vy = -380; if (hp <= 0) { hp = 5; x = spawnX - PW / 2; y = spawnY - PH; vx = vy = 0; } }
      f.sr.sprite = f.fr[(int)(f.t * 6) % 4]; f.sr.flipX = f.face < 0;
      f.sr.color = f.flash > 0 ? new Color(1, 0.55f, 0.55f, 1) : Color.white;
      f.sr.transform.position = new Vector3(f.x + f.d.w / 2, -(f.y + f.d.h), 0);
    }
  }
  void Hurt() {
    if (hurtT > 0 && y <= room.h * TILE + 200) return;
    Play("hero_hurt1", 0.6f); hp--; hurtT = 1.2f; if (hp <= 0) hp = 5;
    x = spawnX - PW / 2; y = spawnY - PH; vx = vy = 0;
  }
  void Doors() {
    bool inside = false;
    foreach (var d in room.doors) {
      if (x + PW <= d.x * TILE || x >= (d.x + d.w) * TILE || y + PH <= d.y * TILE || y >= (d.y + d.h) * TILE) continue;
      inside = true; if (!armed || string.IsNullOrEmpty(d.to) || !rooms.ContainsKey(d.to)) continue;
      var to = rooms[d.to]; DoorData e = null;
      foreach (var q in to.doors) if (q.id == d.toDoor) e = q;
      if (e == null) continue;
      float fx, fy; room = to;
      if (e.h > 1 || e.w == 1) { fx = (e.x == 0 ? e.x + 2.5f : e.x - 1.5f) * TILE; fy = (e.y + e.h) * TILE; }
      else if (e.y == 0) { fx = (e.x + e.w / 2f) * TILE; fy = (e.y + 3) * TILE; }
      else {                                                                   // up through a floor: the nearest ground beside the opening
        fx = (e.x + e.w / 2f) * TILE; fy = e.y * TILE; bool found = false;
        for (int k = 1; k < 8 && !found; k++) foreach (int sx in new[] { e.x - k, e.x + e.w - 1 + k }) {
          if (found) break;
          for (int r = e.y; r > e.y - 8; r--) if (Solid(Tile(sx, r)) && !Solid(Tile(sx, r - 1)) && !Solid(Tile(sx, r - 2))) { fx = (sx + 0.5f) * TILE; fy = r * TILE; found = true; break; }
        }
      }
      Enter(to.id, fx, fy); return;
    }
    if (!inside) armed = true;
  }

  void Update() {
    ReadInput();
    acc += Mathf.Min(Time.deltaTime, 0.1f);
    while (acc >= STEP) { StepHero(STEP); acc -= STEP; }
    // the picture
    animT += Time.deltaTime; fade -= Time.deltaTime * 3;
    string a = dashT > 0 ? "dash" : atkT > 0 ? "slash1" : !ground && wallCoy > 0.1f ? "wall" : !ground ? "jump" : Mathf.Abs(vx) > 20 ? "run" : "idle";
    Sprite[] fr; if (!anims.TryGetValue(a, out fr)) fr = anims["idle"];
    int idx = a == "slash1" ? Mathf.Clamp((int)((0.2f - atkT) / 0.2f * fr.Length), 0, fr.Length - 1) : a == "jump" ? Mathf.Clamp((int)((vy + 500) / 1000f * fr.Length), 0, fr.Length - 1) : (int)(animT * (a == "run" ? 14 : 6)) % fr.Length;
    hero.sprite = fr[idx]; hero.flipX = face < 0;
    hero.transform.position = new Vector3(x + PW / 2, -(y + PH), 0); hero.transform.localScale = new Vector3(HERO_SCALE, HERO_SCALE, 1);
    hero.color = hurtT > 0 && (int)(hurtT * 16) % 2 == 0 ? new Color(1, 1, 1, 0.45f) : Color.white;
    // the camera follows, kept inside the room
    float hw = 270 * cam.aspect, W = room.w * TILE, H = room.h * TILE;
    float tx2 = W <= hw * 2 ? W / 2 : Mathf.Clamp(x + PW / 2 + face * 40, hw, W - hw), ty2 = H <= 540 ? H / 2 : Mathf.Clamp(y + PH / 2 - 40, 270, H - 270);
    var p = cam.transform.position; float k = 1 - Mathf.Exp(-8 * Time.deltaTime);
    if (Mathf.Abs(p.x - tx2) > 600 || Mathf.Abs(-p.y - ty2) > 400) k = 1;
    cam.transform.position = new Vector3(Mathf.Lerp(p.x, tx2, k), Mathf.Lerp(p.y, -ty2, k), -100);
  }
}
