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
  Texture2D btnBase, btnJump;

  void Awake() {
    Application.targetFrameRate = 60; QualitySettings.vSyncCount = 1; Screen.sleepTimeout = SleepTimeout.NeverSleep;
    var world = JsonUtility.FromJson<WorldData>(Resources.Load<TextAsset>("world").text);
    foreach (var r in world.rooms) rooms[r.id] = r;
    var camGo = new GameObject("Camera"); cam = camGo.AddComponent<Camera>(); camGo.tag = "MainCamera";
    cam.orthographic = true; cam.orthographicSize = 270; cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black;
    camGo.transform.position = new Vector3(0, 0, -100);
    var skyGo = new GameObject("Sky"); skyGo.transform.SetParent(camGo.transform, false); skyGo.transform.localPosition = new Vector3(0, 0, 90);
    sky = skyGo.AddComponent<SpriteRenderer>(); sky.sortingOrder = -100; spriteMat = sky.sharedMaterial;
    var heroGo = new GameObject("Hero"); hero = heroGo.AddComponent<SpriteRenderer>(); hero.sortingOrder = 10;
    var tex = Resources.Load<Texture2D>("hero"); var hd = JsonUtility.FromJson<HeroData>(Resources.Load<TextAsset>("hero").text);
    foreach (var a in hd.anims) {
      var list = new Sprite[a.f.Length];
      for (int i = 0; i < list.Length; i++) { var f = a.f[i]; list[i] = Sprite.Create(tex, new Rect(f.x, tex.height - f.y - f.h, f.w, f.h), new Vector2(f.ax / f.w, 1 - f.ay / f.h), 1); }
      anims[a.name] = list;
    }
    btnBase = Resources.Load<Texture2D>("btn/base"); btnJump = Resources.Load<Texture2D>("btn/jump");
    Enter(world.start.room, world.start.x, world.start.y);
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
    Layer("Rock", v, uv, col, tri, fill, 0); Layer("Edges", v2, uv2, col2, tri2, Texture2D.whiteTexture, 1);
    var bg = Resources.Load<Texture2D>("bg/" + room.bg); if (bg == null) bg = Resources.Load<Texture2D>("bg/" + room.theme);
    if (bg != null) {
      sky.sprite = Sprite.Create(bg, new Rect(0, 0, bg.width, bg.height), new Vector2(0.5f, 0.5f), 1);
      float s = Mathf.Max(560f / bg.height, 560f * cam.aspect / bg.width); sky.transform.localScale = new Vector3(s, s, 1);
    }
    x = feetX - PW / 2; y = feetY - PH; vx = 0; vy = 0; spawnX = feetX; spawnY = feetY; armed = false;
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
  void ReadInput() {
    inX = 0; bool held = Input.GetKey(KeyCode.Z) || Input.GetKey(KeyCode.Space);
    if (Input.GetKey(KeyCode.LeftArrow)) inX -= 1; if (Input.GetKey(KeyCode.RightArrow)) inX += 1;
    for (int i = 0; i < Input.touchCount; i++) {
      var p = Input.GetTouch(i).position; var q = new Vector2(p.x, Screen.height - p.y);
      if (BtnLeft.Contains(q)) inX = -1; else if (BtnRight.Contains(q)) inX = 1; else if (q.x > Screen.width * 0.5f) held = true;
    }
    if (held && !jumpWas) jumpBuf = 0.12f;
    jumpWas = held; jumpHeld = held;
  }
  void OnGUI() {
    if (btnBase == null) return;
    var old = GUI.color; GUI.color = new Color(1, 1, 1, 0.75f);
    GUI.DrawTexture(BtnLeft, btnBase); GUI.DrawTexture(BtnRight, btnBase); GUI.DrawTexture(BtnJump, btnJump != null ? btnJump : btnBase);
    var st = new GUIStyle(GUI.skin.label); st.alignment = TextAnchor.MiddleCenter; st.fontSize = (int)(Screen.height * 0.08f);
    GUI.Label(BtnLeft, "◀", st); GUI.Label(BtnRight, "▶", st);
    st.alignment = TextAnchor.UpperLeft; st.fontSize = (int)(Screen.height * 0.05f); GUI.color = new Color(1, 0.35f, 0.35f, 1);
    GUI.Label(new Rect(Screen.width * 0.03f, Screen.height * 0.03f, Screen.width, Screen.height * 0.1f), new string('♥', Mathf.Max(0, hp)), st);
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
    vx = Approach(vx, inX * RUN, (inX == 0 ? 4200 : 3600) * dt * (ground ? 1 : 0.85f));
    if (inX != 0) face = inX > 0 ? 1 : -1;
    vy = Mathf.Min(vy + GRAV * (vy > 0 ? FALL_MULT : 1) * dt, MAXFALL);
    coyote = ground ? 0.1f : coyote - dt; jumpBuf -= dt;
    if (jumpBuf > 0 && coyote > 0) { vy = -JUMP; jumping = true; coyote = 0; jumpBuf = 0; ground = false; }
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
    Doors();
  }
  void Hurt() {
    if (hurtT > 0 && y <= room.h * TILE + 200) return;
    hp--; hurtT = 1.2f; if (hp <= 0) hp = 5;
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
    animT += Time.deltaTime;
    string a = !ground ? "jump" : Mathf.Abs(vx) > 20 ? "run" : "idle";
    Sprite[] fr; if (!anims.TryGetValue(a, out fr)) fr = anims["idle"];
    int idx = a == "jump" ? Mathf.Clamp((int)((vy + 500) / 1000f * fr.Length), 0, fr.Length - 1) : (int)(animT * (a == "run" ? 14 : 6)) % fr.Length;
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
