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
[Serializable] public class CreatureData { public string type; public int fw, fh; public float w, h, hp, ppu; }
[Serializable] public class ArenaData { public string room, boss; public int x, y; }
[Serializable] public class BossList { public CreatureData[] list; public ArenaData[] arenas; }
[Serializable] public class DrawList { public string[] src; public int[] dim; public float[] d; }
[Serializable] public class CreatureList { public CreatureData[] list; }
// a creature of the room: walkers pace their ledge and turn at its ends, flyers drift toward the hero, hanging things stay
public class Foe { public CreatureData d; public Sprite[] fr; public SpriteRenderer sr; public float x, y, px, py, vx, vy, hp, maxHp, flash, t, homeY, st; public int face = 1; public int mode, act, count; public bool boss; }
public class Puff { public SpriteRenderer sr; public float t, life, vx, vy, size; public bool ghost; }
[Serializable] public class LifeTheme { public string theme, ground; public string[] air, plant; }
[Serializable] public class LifeData { public LifeTheme[] themes; }
// a small living thing of the room: a plant that sways (0), something that flutters (1), something that scurries (2)
public class Live { public SpriteRenderer sr; public Sprite[] fr; public float x, y, vx, vy, ph, size; public int kind; }

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
  // what makes it feel alive: places between two steps are blended for the picture (smooth on any screen), a blow stops time for
  // an instant and shakes the view, the blade leaves its painted arc, dust rises at a landing and where a creature falls
  float x0, y0, stopT, shakeT, shakeAmp, shakeX, shakeY; bool wasGround; SpriteRenderer slash; Sprite[] slashFr; Sprite puffSprite;
  readonly List<Puff> puffs = new List<Puff>(); readonly Dictionary<string, ArenaData> arenas = new Dictionary<string, ArenaData>();
  Texture2D barFrame, barFill; Foe bossNow;
  readonly Dictionary<string, LifeTheme> lifeOf = new Dictionary<string, LifeTheme>(); readonly Dictionary<string, Sprite[]> lifeFr = new Dictionary<string, Sprite[]>();
  readonly List<Live> lives = new List<Live>(); float ghostT;
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
      for (int i = 0; i < list.Length; i++) { var f = a.f[i]; list[i] = Sprite.Create(tex, new Rect(f.x, tex.height - f.y - f.h, f.w, f.h), new Vector2(f.ax / f.w, 1 - f.ay / f.h), 1, 0, SpriteMeshType.FullRect); }
      anims[a.name] = list;
    }
    btnBase = Resources.Load<Texture2D>("btn/base"); btnJump = Resources.Load<Texture2D>("btn/jump"); btnAtk = Resources.Load<Texture2D>("btn/attack");
    heartFull = Resources.Load<Texture2D>("ui/life_full"); heartEmpty = Resources.Load<Texture2D>("ui/life_empty");
    foreach (var c in JsonUtility.FromJson<CreatureList>(Resources.Load<TextAsset>("creatures").text).list) kinds[c.type] = c;
    btnDash = Resources.Load<Texture2D>("btn/dash"); barFrame = Resources.Load<Texture2D>("fx/bar_frame"); barFill = Resources.Load<Texture2D>("fx/bar_fill");
    var bl = JsonUtility.FromJson<BossList>(Resources.Load<TextAsset>("bosses").text);
    foreach (var c in bl.list) kinds["boss_" + c.type] = c; foreach (var a in bl.arenas) arenas[a.room] = a;
    slashFr = new Sprite[4]; for (int i = 0; i < 4; i++) { var st = Resources.Load<Texture2D>("fx/wf_nail_" + i); if (st != null) slashFr[i] = Sprite.Create(st, new Rect(0, 0, st.width, st.height), new Vector2(0.2f, 0.5f), st.height / 96f, 0, SpriteMeshType.FullRect); }
    foreach (var lt in JsonUtility.FromJson<LifeData>(Resources.Load<TextAsset>("life").text).themes) lifeOf[lt.theme] = lt;
    // the edges of the view fall into shadow
    var vt = new Texture2D(128, 128, TextureFormat.RGBA32, false); var vp = new Color[128 * 128];
    for (int vy2 = 0; vy2 < 128; vy2++) for (int vx2 = 0; vx2 < 128; vx2++) { float dd = Mathf.Sqrt((vx2 - 63.5f) * (vx2 - 63.5f) + (vy2 - 63.5f) * (vy2 - 63.5f)) / 63.5f; vp[vy2 * 128 + vx2] = new Color(0, 0, 0, Mathf.SmoothStep(0, 0.62f, (dd - 0.55f) / 0.6f)); }
    vt.SetPixels(vp); vt.Apply();
    var vg = new GameObject("Vignette"); vg.transform.SetParent(camGo.transform, false); vg.transform.localPosition = new Vector3(0, 0, 10);
    var vr = vg.AddComponent<SpriteRenderer>(); vr.sprite = Sprite.Create(vt, new Rect(0, 0, 128, 128), new Vector2(0.5f, 0.5f), 128, 0, SpriteMeshType.FullRect); vr.sortingOrder = 50; vg.transform.localScale = new Vector3(540 * cam.aspect * 1.25f, 540 * 1.25f, 1);
    var sg = new GameObject("Slash"); slash = sg.AddComponent<SpriteRenderer>(); slash.sortingOrder = 11; slash.enabled = false;
    var pt = Resources.Load<Texture2D>("fx/fx_puff"); if (pt != null) puffSprite = Sprite.Create(pt, new Rect(0, 0, pt.width, pt.height), new Vector2(0.5f, 0.5f), pt.height, 0, SpriteMeshType.FullRect);
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
      sky.sprite = Sprite.Create(bg, new Rect(0, 0, bg.width, bg.height), new Vector2(0.5f, 0.5f), 1, 0, SpriteMeshType.FullRect);
      float s = Mathf.Max(560f / bg.height, 560f * cam.aspect / bg.width) * 1.15f; sky.transform.localScale = new Vector3(s, s, 1);
    }
    x = feetX - PW / 2; y = feetY - PH; vx = 0; vy = 0; spawnX = feetX; spawnY = feetY; armed = false;
    fade = 1;
    PlayerPrefs.SetString("room", id); PlayerPrefs.SetFloat("fx", feetX); PlayerPrefs.SetFloat("fy", feetY); PlayerPrefs.SetInt("hp", hp); PlayerPrefs.Save();
    string tr; if (!TRACK.TryGetValue(room.theme, out tr)) tr = room.theme;
    if (tr != track) {                                                     // each area its own piece and its own air
      track = tr; var mc = Resources.Load<AudioClip>("music/" + tr); if (mc != null) { music.clip = mc; music.Play(); }
      var ac = Resources.Load<AudioClip>("amb/" + room.theme); if (ac != null) { amb.clip = ac; amb.Play(); } else amb.Stop();
    }
    foes.Clear(); bossNow = null; x0 = x; y0 = y; foreach (var pf in puffs) if (pf.sr != null) Destroy(pf.sr.gameObject); puffs.Clear();
    Populate();
    ArenaData ar; if (arenas.TryGetValue(id, out ar) && PlayerPrefs.GetInt("beat_" + ar.boss, 0) == 0) {            // the lord of this hall, if not yet beaten
      var bd = kinds["boss_" + ar.boss]; var bt = Resources.Load<Texture2D>("bosses/" + ar.boss);
      if (bt != null) {
        var bf = new Sprite[4]; for (int i = 0; i < 4; i++) bf[i] = Sprite.Create(bt, new Rect(i * bd.fw, 0, bd.fw, bd.fh), new Vector2(0.5f, 0), bd.ppu, 0, SpriteMeshType.FullRect);
        var bgo = new GameObject("Boss " + ar.boss); bgo.transform.SetParent(roomGo.transform, false);
        var b = new Foe { d = bd, fr = bf, sr = bgo.AddComponent<SpriteRenderer>(), hp = bd.hp, maxHp = bd.hp, x = (ar.x + 0.5f) * TILE - bd.w / 2, y = (ar.y + 1) * TILE - bd.h, mode = 4, boss = true, st = 1.5f };
        b.sr.sortingOrder = 6; b.px = b.x; b.py = b.y; foes.Add(b); bossNow = b;
      }
    }
    foreach (var e in room.enemies) {
      CreatureData d; if (!kinds.TryGetValue(e.type, out d)) continue;
      Sprite[] fr; if (!kindFrames.TryGetValue(e.type, out fr)) {
        var ct = Resources.Load<Texture2D>("creatures/" + e.type); if (ct == null) continue;
        fr = new Sprite[4]; for (int i = 0; i < 4; i++) fr[i] = Sprite.Create(ct, new Rect(i * d.fw, 0, d.fw, d.fh), new Vector2(0.5f, 0), d.ppu > 0 ? d.ppu : 2, 0, SpriteMeshType.FullRect);
        kindFrames[e.type] = fr;
      }
      var go = new GameObject(e.type); go.transform.SetParent(roomGo.transform, false);
      var f = new Foe { d = d, fr = fr, sr = go.AddComponent<SpriteRenderer>(), hp = d.hp, x = (e.x + 0.5f) * TILE - d.w / 2, y = (e.y + 1) * TILE - d.h };
      f.sr.sortingOrder = 5; f.homeY = f.y; f.px = f.x; f.py = f.y; f.maxHp = d.hp; f.mode = STILL.Contains(" " + e.type + " ") ? 2 : FLYERS.Contains(" " + e.type + " ") ? 1 : 0; f.vx = 40; f.t = e.x;
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
  // the life of the room, laid the same way on every visit: plants on its floors, things that flutter above them and things
  // that scurry along them, each area its own (Resources/life.json)
  static float Hash(float a, float b, float c) { float v = Mathf.Sin(a * 127.1f + b * 311.7f + c * 74.7f) * 43758.547f; return v - Mathf.Floor(v); }
  Sprite[] LifeSprites(string k) {
    Sprite[] fr; if (lifeFr.TryGetValue(k, out fr)) return fr;
    var t = Resources.Load<Texture2D>("life/" + k); if (t == null) { lifeFr[k] = null; return null; }
    fr = new Sprite[2]; for (int i = 0; i < 2; i++) fr[i] = Sprite.Create(t, new Rect(i * t.width / 2, 0, t.width / 2, t.height), new Vector2(0.5f, 0), t.height, 0, SpriteMeshType.FullRect);
    lifeFr[k] = fr; return fr;
  }
  void AddLive(string k, int kind, float px, float py, float size, float ph) {
    var fr = LifeSprites(k); if (fr == null) return;
    var go = new GameObject(k); go.transform.SetParent(roomGo.transform, false);
    var l = new Live { sr = go.AddComponent<SpriteRenderer>(), fr = fr, x = px, y = py, size = size, ph = ph, kind = kind, vx = kind == 2 ? (ph > 3 ? 22 : -22) : 0 };
    l.sr.sortingOrder = kind == 0 ? 3 : 8; lives.Add(l);
  }
  void Populate() {
    lives.Clear(); LifeTheme lt; if (!lifeOf.TryGetValue(room.theme, out lt)) return;
    var cells = new List<Vector2Int>();
    for (int ty = 2; ty < room.h - 1; ty++) for (int tx = 1; tx < room.w - 1; tx++) if (Solid(Tile(tx, ty + 1)) && Tile(tx, ty) == 0 && Tile(tx, ty - 1) == 0) cells.Add(new Vector2Int(tx, ty));
    if (cells.Count == 0) return;
    int plants = 0;
    if (lt.plant != null && lt.plant.Length > 0) foreach (var c in cells) {
      if (plants >= 180 || Hash(c.x, c.y, 33) >= 0.42f) continue; plants++;
      AddLive(lt.plant[(int)(Hash(c.x, c.y, 5) * lt.plant.Length) % lt.plant.Length], 0, c.x * TILE + 16, (c.y + 1) * TILE + 2, 40 * (0.8f + Hash(c.x, c.y, 8) * 0.6f), Hash(c.x, c.y, 4) * 6);
    }
    int nAir = Mathf.Min(22, 8 + room.w * room.h / 160);
    if (lt.air != null && lt.air.Length > 0) for (int i = 0; i < nAir; i++) {
      var c = cells[(int)(Hash(i, room.w, 17) * cells.Count) % cells.Count]; string k = lt.air[(int)(Hash(i, 3, 9) * lt.air.Length) % lt.air.Length];
      AddLive(k, 1, c.x * TILE, (c.y - 2 - Hash(i, 3, 5) * 3) * TILE, k == "bat" || k == "crow" ? 28 : k == "glow" || k == "spore" ? 14 : 22, i * 1.7f);
    }
    if (!string.IsNullOrEmpty(lt.ground)) for (int i = 0; i < Mathf.Min(14, 2 + cells.Count / 18); i++) {
      var c = cells[(int)(Hash(i, room.h, 71) * cells.Count) % cells.Count]; AddLive(lt.ground, 2, c.x * TILE + 16, (c.y + 1) * TILE, 14, Hash(i, 9, 2) * 6);
    }
  }
  void StepLife(float dt, float hx, float hy) {
    float t = Time.time;
    foreach (var l in lives) {
      float rot = 0;
      if (l.kind == 0) rot = Mathf.Sin(t * 1.6f + l.ph) * 5 + (Mathf.Abs(hx - l.x) < 28 && Mathf.Abs(hy - l.y) < 50 ? Mathf.Sign(l.x - hx) * -14 : 0);      // sways, and bends away as the hero passes
      else if (l.kind == 1) {                                                // wanders, and drifts away from the hero
        float ax = Mathf.Sin(t * 0.7f + l.ph) * 30 + (Mathf.Abs(l.x - hx) < 90 && Mathf.Abs(l.y - hy) < 90 ? Mathf.Sign(l.x - hx) * 120 : 0), ay = Mathf.Cos(t * 0.9f + l.ph * 1.3f) * 22;
        l.vx += (ax - l.vx) * dt * 2; l.vy += (ay - l.vy) * dt * 2; float nx = l.x + l.vx * dt, ny = l.y + l.vy * dt;
        if (SolidAt(nx, ny)) { l.vx = -l.vx; l.vy = -l.vy; } else { l.x = nx; l.y = ny; }
      } else {                                                               // scurries along its floor, turns at its ends, runs from the hero
        bool near = Mathf.Abs(l.x - hx) < 110 && Mathf.Abs(l.y - hy) < 60; float sp = near ? 80 : 22;
        l.vx = near ? Mathf.Sign(l.x - hx == 0 ? 1 : l.x - hx) * sp : Mathf.Sign(l.vx == 0 ? 1 : l.vx) * sp;
        float nx = l.x + l.vx * dt, ex = nx + Mathf.Sign(l.vx) * 8;
        if (SolidAt(ex, l.y - 4) || !SolidAt(ex, l.y + 4)) l.vx = -l.vx; else l.x = nx;
      }
      l.sr.sprite = l.fr[(int)((t + l.ph) * (l.kind == 0 ? 1.2f : l.kind == 1 ? 10 : 8)) % 2]; l.sr.flipX = l.vx < 0;
      l.sr.transform.position = new Vector3(l.x, -l.y - (l.kind == 1 ? -l.size / 2 : 0), 0); l.sr.transform.localScale = new Vector3(l.size, l.size, 1);
      l.sr.transform.rotation = Quaternion.Euler(0, 0, rot);
    }
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
    if (bossNow != null && bossNow.hp > 0 && barFrame != null && barFill != null) {
      GUI.color = Color.white; float bw = Screen.width * 0.5f, bh = bw * barFrame.height / barFrame.width, bx = (Screen.width - bw) / 2, by = Screen.height * 0.02f;
      float k = Mathf.Clamp01(bossNow.hp / bossNow.maxHp), ix = bx + bw * 0.085f, iw = bw * 0.83f, ih = bh * 0.2f;
      GUI.DrawTextureWithTexCoords(new Rect(ix, by + bh / 2 - ih / 2, iw * k, ih), barFill, new Rect(0, 0, k, 1)); GUI.DrawTexture(new Rect(bx, by, bw, bh), barFrame);
    }
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
  void Dust(float px, float py, int n, float speed) {
    if (puffSprite == null) return;
    for (int i = 0; i < n; i++) {
      var go = new GameObject("Puff"); var p = new Puff { sr = go.AddComponent<SpriteRenderer>(), life = 0.35f + UnityEngine.Random.value * 0.25f, size = 14 + UnityEngine.Random.value * 16 };
      p.sr.sprite = puffSprite; p.sr.sortingOrder = 9; p.vx = (UnityEngine.Random.value - 0.5f) * speed * 2; p.vy = -UnityEngine.Random.value * speed * 0.6f;
      go.transform.position = new Vector3(px, -py, 0); puffs.Add(p);
    }
  }
  void Blow(float stop, float amp) { stopT = Mathf.Max(stopT, stop); shakeT = 0.18f; shakeAmp = Mathf.Max(shakeAmp, amp); }
  // a lord of a hall: comes for the hero, rears back, lunges; every third time it leaps; below half its strength it is quicker
  void StepBoss(Foe f, float dt) {
    float hdx = x + PW / 2 - (f.x + f.d.w / 2); float quick = f.hp < f.maxHp * 0.5f ? 0.7f : 1; f.st -= dt;
    f.vy = Mathf.Min(f.vy + GRAV * dt, MAXFALL);
    float ny = f.y + f.vy * dt; bool on = false;
    if (f.vy >= 0 && (SolidAt(f.x + f.d.w / 2, ny + f.d.h) || SolidAt(f.x + 4, ny + f.d.h) || SolidAt(f.x + f.d.w - 4, ny + f.d.h))) { ny = Mathf.Floor((ny + f.d.h) / TILE) * TILE - f.d.h; if (f.vy > 500) { Blow(0, 7); Dust(f.x + f.d.w / 2, ny + f.d.h, 8, 160); } f.vy = 0; on = true; }
    f.y = ny;
    if (f.act == 0) {                                                        // comes closer
      f.face = hdx > 0 ? 1 : -1; f.vx = Mathf.Abs(hdx) > 150 ? f.face * 75 / quick : 0;
      if (f.st <= 0 && Mathf.Abs(hdx) < 380 && on) { f.act = 1; f.st = 0.55f * quick; f.vx = 0; }
    } else if (f.act == 1) { if (f.st <= 0) { f.count++; if (f.count % 3 == 0) { f.act = 3; f.vy = -760; f.vx = Mathf.Clamp(hdx * 1.3f, -420, 420); f.st = 2; } else { f.act = 2; f.st = 0.38f; f.vx = f.face * 460 / quick; } Play("nail_down", 0.5f); } }
    else if (f.act == 2) { if (f.st <= 0) { f.act = 0; f.st = 0.9f * quick; f.vx = 0; } }
    else if (f.act == 3) { if (on && f.vy == 0 && f.st < 1.8f) { f.act = 0; f.st = 1.0f * quick; f.vx = 0; } }
    float nx = f.x + f.vx * dt;
    if (!SolidAt(f.vx > 0 ? nx + f.d.w : nx, f.y + f.d.h - 8) && !SolidAt(f.vx > 0 ? nx + f.d.w : nx, f.y + 8)) f.x = nx; else f.vx = 0;
  }
  bool SolidAt(float px, float py) { return Solid(Tile(Mathf.FloorToInt(px / TILE), Mathf.FloorToInt(py / TILE))); }
  void StepFoes(float dt) {
    atkT -= dt; atkCD -= dt;
    float hx = face > 0 ? x + PW : x + PW - 64 - PW, hy = y - 4, hw = 64, hh = PH + 8;      // the blade's reach in front of the hero
    for (int i = foes.Count - 1; i >= 0; i--) {
      var f = foes[i]; f.t += dt; f.flash -= dt; f.px = f.x; f.py = f.y;
      if (f.mode == 3) { f.st -= dt; if (f.st <= 0) { Destroy(f.sr.gameObject); foes.RemoveAt(i); } continue; }      // falling apart: drawn fading in Update
      if (f.mode == 4) StepBoss(f, dt);
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
        struck.Add(f); f.hp -= 5; f.flash = 0.15f; if (f.mode < 2) f.x += face * 14; vx = -face * 150;
        Blow(f.boss ? 0.05f : 0.035f, f.boss ? 4 : 2.5f); Dust(f.x + f.d.w / 2, f.y + f.d.h / 2, 3, 120);
        if (f.hp <= 0) {
          Dust(f.x + f.d.w / 2, f.y + f.d.h / 2, f.boss ? 24 : 8, f.boss ? 260 : 170); Blow(f.boss ? 0.25f : 0.07f, f.boss ? 12 : 5);
          if (f.boss) { PlayerPrefs.SetInt("beat_" + f.d.type.Replace("boss_", ""), 1); PlayerPrefs.Save(); bossNow = null; }
          f.mode = 3; f.st = f.boss ? 1.2f : 0.3f; continue;
        }
      } else if (touch && hurtT <= 0) { Blow(0.08f, 6); Play("hero_hurt0", 0.6f); hp--; hurtT = 1.2f; vx = (x + PW / 2 < f.x + f.d.w / 2 ? -1 : 1) * 320; vy = -380; if (hp <= 0) { hp = 5; x = spawnX - PW / 2; y = spawnY - PH; vx = vy = 0; } }
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
    if (stopT > 0) { stopT -= Time.unscaledDeltaTime; acc = Mathf.Min(acc, STEP * 0.99f); }
    while (acc >= STEP) { x0 = x; y0 = y; wasGround = ground; float fall = vy; StepHero(STEP); acc -= STEP; if (ground && !wasGround && fall > 420) Dust(x + PW / 2, y + PH, 5, 110); }
    float al = Mathf.Clamp01(acc / STEP), rx = Mathf.Lerp(x0, x, al), ry = Mathf.Lerp(y0, y, al);
    if (Mathf.Abs(x - x0) > 200 || Mathf.Abs(y - y0) > 200) { rx = x; ry = y; }
    // creatures: blended places, a breath, a flash when struck, a swell and a fade when they fall apart
    foreach (var f in foes) {
      float fx = Mathf.Lerp(f.px, f.x, al), fy = Mathf.Lerp(f.py, f.y, al), br = 1 + 0.02f * Mathf.Sin(f.t * 3);
      int frame = f.boss ? (f.act == 1 ? 1 : f.act == 2 ? 2 : f.act == 3 ? 3 : 0) : (int)(f.t * 6) % 4;
      f.sr.sprite = f.fr[frame]; f.sr.flipX = f.face < 0;
      float dk = f.mode == 3 ? Mathf.Clamp01(f.st / (f.boss ? 1.2f : 0.3f)) : 1;
      f.sr.color = f.flash > 0 ? new Color(1, 0.55f, 0.55f, 1) : new Color(1, 1, 1, dk);
      f.sr.transform.position = new Vector3(fx + f.d.w / 2, -(fy + f.d.h), 0); f.sr.transform.localScale = new Vector3(1 + (1 - dk) * 0.3f, br + (1 - dk) * 0.3f, 1);
    }
    for (int i = puffs.Count - 1; i >= 0; i--) {
      var pf = puffs[i]; pf.t += Time.deltaTime; float pk = pf.t / pf.life;
      if (pk >= 1) { Destroy(pf.sr.gameObject); puffs.RemoveAt(i); continue; }
      if (pf.ghost) { pf.sr.color = new Color(0.6f, 0.82f, 1, 0.45f * (1 - pk)); continue; }
      pf.sr.transform.position += new Vector3(pf.vx, -pf.vy, 0) * Time.deltaTime; float sz = pf.size * (0.6f + pk);
      pf.sr.transform.localScale = new Vector3(sz, sz, 1); pf.sr.color = new Color(0.85f, 0.88f, 0.95f, 0.6f * (1 - pk));
    }
    // the picture
    animT += Time.deltaTime; fade -= Time.deltaTime * 3;
    string a = dashT > 0 ? "dash" : atkT > 0 ? "slash1" : !ground && wallCoy > 0.1f ? "wall" : !ground ? "jump" : Mathf.Abs(vx) > 20 ? "run" : "idle";
    Sprite[] fr; if (!anims.TryGetValue(a, out fr)) fr = anims["idle"];
    int idx = a == "slash1" ? Mathf.Clamp((int)((0.2f - atkT) / 0.2f * fr.Length), 0, fr.Length - 1) : a == "jump" ? Mathf.Clamp((int)((vy + 500) / 1000f * fr.Length), 0, fr.Length - 1) : (int)(animT * (a == "run" ? 14 : 6)) % fr.Length;
    hero.sprite = fr[idx]; hero.flipX = face < 0;
    float land = ground && !wasGround ? 0.9f : 1;
    hero.transform.position = new Vector3(rx + PW / 2, -(ry + PH), 0); hero.transform.localScale = new Vector3(HERO_SCALE / land, HERO_SCALE * land, 1);
    StepLife(Time.deltaTime, rx + PW / 2, ry + PH);
    ghostT -= Time.deltaTime;
    if (dashT > 0 && ghostT <= 0) {                                            // a dash leaves pale shapes of the hero behind it
      ghostT = 0.035f; var gg = new GameObject("Ghost"); var gp = new Puff { sr = gg.AddComponent<SpriteRenderer>(), life = 0.22f, ghost = true };
      gp.sr.sprite = hero.sprite; gp.sr.flipX = hero.flipX; gp.sr.sortingOrder = 9; gg.transform.position = hero.transform.position; gg.transform.localScale = new Vector3(HERO_SCALE, HERO_SCALE, 1); puffs.Add(gp);
    }
    slash.enabled = atkT > 0 && slashFr[0] != null;
    if (slash.enabled) { slash.sprite = slashFr[Mathf.Clamp((int)((0.2f - atkT) / 0.2f * 4), 0, 3)]; slash.flipX = face < 0; slash.transform.position = new Vector3(rx + PW / 2 + face * 10, -(ry + PH / 2), 0); }
    hero.color = hurtT > 0 && (int)(hurtT * 16) % 2 == 0 ? new Color(1, 1, 1, 0.45f) : Color.white;
    // the camera follows, kept inside the room
    float hw = 270 * cam.aspect, W = room.w * TILE, H = room.h * TILE;
    float tx2 = W <= hw * 2 ? W / 2 : Mathf.Clamp(rx + PW / 2 + face * 40, hw, W - hw), ty2 = H <= 540 ? H / 2 : Mathf.Clamp(ry + PH / 2 - 40, 270, H - 270);
    var p = cam.transform.position; float k = 1 - Mathf.Exp(-8 * Time.deltaTime);
    if (Mathf.Abs(p.x - tx2) > 600 || Mathf.Abs(-p.y - ty2) > 400) k = 1;
    p = new Vector3(Mathf.Lerp(p.x - shakeX, tx2, k), Mathf.Lerp(p.y - shakeY, -ty2, k), -100);
    shakeT -= Time.deltaTime; if (shakeT > 0) { shakeX = (UnityEngine.Random.value - 0.5f) * 2 * shakeAmp * shakeT / 0.18f; shakeY = (UnityEngine.Random.value - 0.5f) * 2 * shakeAmp * shakeT / 0.18f; } else { shakeX = shakeY = shakeAmp = 0; }
    cam.transform.position = p + new Vector3(shakeX, shakeY, 0);
    // the far picture drifts a little against the view
    sky.transform.localPosition = new Vector3(-(p.x - W / 2) * 0.05f, (-p.y - H / 2) * 0.05f, 90);
  }
}
