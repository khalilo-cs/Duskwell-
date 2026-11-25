// The fights: the lords of the halls wake when the hero walks in (the hall's gates shut behind them), each has its own great
// move besides its lunge and its leap (the heavy ones shake the floor and send waves along it, the casters throw rings of
// light, the swift ones cut across the hall, the sky-dwellers bring pillars of light down where the hero stands), they grow
// quicker below half their strength and rage at the end. The charm wardens (the middle lords) guard the charms and fight
// the same way. Their shots are the painted shots of the first version (Resources/proj).
using System.Collections.Generic;
using UnityEngine;

public class Shot { public SpriteRenderer sr; public Sprite[] fr; public string kind; public float x, y, vx, vy, grav, life, t, tele, w, h; public int dmg = 1; public bool mine; }

public partial class Game {
  readonly List<Shot> shots = new List<Shot>(); readonly Dictionary<string, Sprite[]> shotFr = new Dictionary<string, Sprite[]>();
  ArenaData pendingArena; bool fightOn; Foe champWatch; readonly Dictionary<string, Sprite[]> champFr = new Dictionary<string, Sprite[]>();
  static readonly Dictionary<string, string> FAMILY = new Dictionary<string, string> {
    { "guardian", "quake" }, { "colossus", "quake" }, { "king", "quake" }, { "thunderhoof", "quake" }, { "marrow", "quake" }, { "regent", "quake" }, { "bonewright", "quake" },
    { "weaver", "ring" }, { "wraith", "ring" }, { "queen", "ring" }, { "spore", "ring" }, { "brood", "ring" },
    { "duelist", "cut" }, { "twin", "cut" }, { "roc", "pillar" }, { "stargazer", "pillar" }, { "drowned", "pillar" },
  };
  bool FightOn() { return fightOn; }

  Sprite[] ShotSprites(string k) {
    Sprite[] fr; if (shotFr.TryGetValue(k, out fr)) return fr;
    var t = Resources.Load<Texture2D>("proj/proj_" + k); if (t == null) { shotFr[k] = null; return null; }
    int n = 4, fw = t.width / n; fr = new Sprite[n];
    Vector2 piv = k == "shock" ? new Vector2(0.5f, 20f / 120) : k == "pillar" ? new Vector2(0.5f, 10f / 280) : new Vector2(0.5f, 0.5f);
    for (int i = 0; i < n; i++) fr[i] = Sprite.Create(t, new Rect(i * fw, 0, fw, t.height), piv, 1, 0, SpriteMeshType.FullRect);
    shotFr[k] = fr; return fr;
  }
  Shot Fire(string kind, float px, float py, float vx, float vy, float life, float tele = 0, float grav = 0) {
    var fr = ShotSprites(kind); if (fr == null) return null;
    var go = new GameObject("Shot " + kind); go.transform.SetParent(roomGo.transform, false);
    var s = new Shot { sr = go.AddComponent<SpriteRenderer>(), fr = fr, kind = kind, x = px, y = py, vx = vx, vy = vy, life = life, tele = tele, grav = grav };
    s.w = kind == "shock" ? 40 : kind == "pillar" ? 40 : kind == "rock" ? 30 : 22; s.h = kind == "shock" ? 34 : kind == "pillar" ? 220 : kind == "rock" ? 30 : 22;
    s.sr.sortingOrder = 12; s.sr.sprite = fr[0]; s.sr.flipX = vx < 0; go.transform.position = new Vector3(px, -py, 0); shots.Add(s); return s;
  }
  void StepShots(float dt) {
    for (int i = shots.Count - 1; i >= 0; i--) {
      var s = shots[i]; s.t += dt; s.life -= dt;
      if (s.tele > 0) { s.tele -= dt; if (s.tele <= 0 && s.kind == "pillar") { Play("w_slam_" + Random.Range(0, 3), 0.5f); Blow(0, 4); } }
      else { s.vy += s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
      bool gone = s.life <= 0;
      if (!gone && s.kind == "rock" && s.tele <= 0 && SolidAt(s.x, s.y + 14)) { gone = true; Dust(s.x, s.y + 10, 4, 120); Play("w_break_" + Random.Range(0, 3), 0.35f); }
      if (!gone && s.kind == "orb" && SolidAt(s.x, s.y)) gone = true;
      if (!gone && s.tele <= 0) {
        float bx = s.x - s.w / 2, by = s.kind == "pillar" || s.kind == "shock" ? s.y - s.h : s.y - s.h / 2;
        if (s.mine) {
          foreach (var f in foes) if (f.mode != 3 && f.hp > 0 && bx < f.x + f.d.w && bx + s.w > f.x && by < f.y + f.d.h && by + s.h > f.y && !struck.Contains(f)) {
            f.hp -= Mathf.RoundToInt(15 * (Charmed("mage") ? 1.5f : 1)); f.flash = 0.15f; struck.Add(f); Play("w_hit_" + Random.Range(0, 4), 0.6f); Dust(f.x + f.d.w / 2, f.y + f.d.h / 2, 4, 140);
            if (f.hp <= 0) { f.mode = 3; f.st = f.boss ? 1.2f : 0.3f; OnFoeDown(f); }
          }
        } else if (hurtT <= 0 && deadT <= 0 && x < bx + s.w && x + PW > bx && y < by + s.h && y + PH > by) Wound(s.x);
      }
      if (gone) { Destroy(s.sr.gameObject); shots.RemoveAt(i); continue; }
    }
  }
  void DrawShots() {
    foreach (var s in shots) {
      s.sr.sprite = s.fr[(int)(s.t * 12) % s.fr.Length];
      s.sr.transform.position = new Vector3(s.x, -s.y, 0);
      s.sr.color = s.tele > 0 ? new Color(1, 1, 1, 0.25f + 0.2f * Mathf.Sin(s.t * 30)) : Color.white;
      if (s.kind == "pillar") s.sr.transform.localScale = new Vector3(1, s.tele > 0 ? 0.25f : 1, 1);
    }
  }

  // ---------------------------------------------------------------- the hall: the lord wakes as the hero walks in
  void StepArena() {
    if (pendingArena == null || room.arena == null || string.IsNullOrEmpty(room.arena.boss)) return;
    if (x + PW / 2 < room.arena.trigger * TILE) return;
    var ar = pendingArena; pendingArena = null;
    var b = SpawnBoss(ar); if (b == null) return;
    b.y = Mathf.Max(TILE * 2, b.y - 260); b.vy = 0; b.act = 0; b.st = 1.6f;                   // it drops into its hall
    fightOn = true; SetGates(true);
    Story.Lord lord; if (Story.Lords.TryGetValue(ar.boss, out lord)) Card(lord.title, lord.name, lord.rise, 3.6f, true);
    PlayVoice("boss_" + ar.boss + "_0"); Play("w_roar_" + Random.Range(0, 3), 0.9f); Blow(0.1f, 9);
    PlayMusic(ar.boss == "king" ? "king" : Story.Seals.Length > 0 && System.Array.IndexOf(Story.Seals, ar.boss) >= 0 ? "boss" : "boss_march");
  }
  void SetGates(bool shut) {
    if (room.arena == null || room.arena.gates == null) return;
    foreach (var g in room.arena.gates) SetRect(g.x, g.y, g.w, g.h, shut || g.close == "always" && !Beaten(room.arena.boss) ? 5 : 0);
    if (Beaten(room.arena.boss)) foreach (var g in room.arena.gates) SetRect(g.x, g.y, g.w, g.h, 0);
    RefreshTiles();
  }
  bool Beaten(string boss) { return PlayerPrefs.GetInt("beat_" + boss, 0) == 1; }
  void PlayVoice(string n) { AudioClip c; if (!clips.TryGetValue("v:" + n, out c)) { c = Resources.Load<AudioClip>("voice/" + n); clips["v:" + n] = c; } if (c != null) sfx.PlayOneShot(c, 0.95f); }
  void PlayMusic(string tr) { var mc = Resources.Load<AudioClip>("music/" + tr); if (mc != null && music.clip != mc) { music.clip = mc; music.Play(); track = tr; } }

  // a lord or a warden: its own great move every few attacks, quicker when hurt, raging at the end
  void StepLord(Foe f, float dt) {
    float k = f.hp / f.maxHp;
    if (f.boss && !f.half && k < 0.5f) {
      f.half = true; Story.Lord lord; if (Story.Lords.TryGetValue(f.d.type.Replace("boss_", ""), out lord)) Card(null, lord.name, lord.half, 2.6f, false);
      PlayVoice("boss_" + f.d.type.Replace("boss_", "") + "_1"); Play("w_roar_" + Random.Range(0, 3), 0.9f); Blow(0.12f, 10); ClearShots();
    }
    if (!f.enraged && k < 0.22f) { f.enraged = true; Blow(0.08f, 8); Play("w_roar_" + Random.Range(0, 3), 0.8f); }
    if (f.act >= 5) { Special(f, dt); return; }
    int before = f.count;
    StepBoss(f, dt);
    if (f.count != before && f.act == 2 || f.count != before && f.act == 3) {
      int every = f.enraged ? 2 : f.half ? 3 : 4;
      if (f.count % every == 0) {                                                    // instead of this lunge: its great move
        string fam; if (!FAMILY.TryGetValue(f.d.type.Replace("boss_", ""), out fam)) fam = f.champ ? "quake" : "ring";
        f.act = fam == "quake" ? 5 : fam == "ring" ? 6 : fam == "cut" ? 7 : 8; f.vx = 0; f.tele = 0.7f; f.special = 0; f.st = 0;
        f.vy = Mathf.Max(0, f.vy);
        Play("w_roar_" + Random.Range(0, 3), 0.6f);
      }
    }
  }
  void Special(Foe f, float dt) {
    f.vy = Mathf.Min(f.vy + GRAV * dt, MAXFALL);
    float ny = f.y + f.vy * dt;
    if (f.vy >= 0 && SolidAt(f.x + f.d.w / 2, ny + f.d.h)) { ny = Mathf.Floor((ny + f.d.h) / TILE) * TILE - f.d.h; f.vy = 0; }
    f.y = ny;
    float cx = f.x + f.d.w / 2, feet = f.y + f.d.h, hx = x + PW / 2; float quick = f.half ? 0.75f : 1;
    if (f.tele > 0) { f.tele -= dt; f.face = hx > cx ? 1 : -1; if (f.tele <= 0) f.st = 0; return; }
    f.st -= dt; if (f.st > 0) return;
    switch (f.act) {
      case 5:                                                                        // the floor shakes: waves both ways, stones from above
        Fire("shock", cx - 20, feet, -380, 0, 1.8f); Fire("shock", cx + 20, feet, 380, 0, 1.8f);
        for (int i = 0; i < (f.enraged ? 5 : 3); i++) Fire("rock", Mathf.Clamp(hx + Random.Range(-220f, 220f), TILE * 2, room.w * TILE - TILE * 2), TILE * 2.5f, 0, 0, 4, 0.6f + i * 0.12f, 1500);
        Blow(0.08f, 12); Dust(cx, feet, 12, 220); Play("w_slam_" + Random.Range(0, 3), 0.9f);
        f.act = 0; f.st = 1.2f * quick; break;
      case 6:                                                                        // a ring of light thrown from its heart
        int n = f.enraged ? 12 : 9; float a0 = f.special * 0.3f;
        for (int i = 0; i < n; i++) { float a = a0 + i * Mathf.PI * 2 / n; Fire("orb", cx, f.y + f.d.h / 2, Mathf.Cos(a) * 260, Mathf.Sin(a) * 260, 3.2f); }
        Play("w_ability_" + Random.Range(0, 2), 0.6f); f.special++;
        if (f.special >= 3) { f.act = 0; f.st = 1.1f * quick; } else f.st = 0.55f; break;
      case 7:                                                                        // three cuts across the hall
        if (f.special % 2 == 0) { f.face = hx > cx ? 1 : -1; f.vx = f.face * 980; f.st = 0.3f; Play("w_slash_" + Random.Range(0, 4), 0.7f); Ghost(f); }
        else { f.vx = 0; Fire("shock", cx, feet, f.face * 320, 0, 0.9f); f.st = 0.28f * quick; }
        f.special++; if (f.special >= 6) { f.act = 0; f.st = 1.0f * quick; f.vx = 0; } break;
      case 8:                                                                        // pillars of light where the hero stands, step after step
        Fire("pillar", Mathf.Clamp(hx, TILE * 2, room.w * TILE - TILE * 2), FloorBelow(hx, y + PH), 0, 0, 1.1f, 0.6f);
        f.special++; f.st = 0.42f;
        if (f.special >= (f.enraged ? 7 : 5)) { f.act = 0; f.st = 1.1f * quick; } break;
    }
    if (f.act == 7) { float nx = f.x + f.vx * dt; if (!SolidAt(f.vx > 0 ? nx + f.d.w : nx, f.y + f.d.h - 8)) f.x = nx; else f.vx = 0; }
  }
  float FloorBelow(float px, float py) { int ty = Mathf.FloorToInt(py / TILE); for (int j = ty; j < room.h; j++) if (Solid(Tile(Mathf.FloorToInt(px / TILE), j))) return j * TILE; return py; }
  void Ghost(Foe f) {
    var go = new GameObject("Ghost"); var p = new Puff { sr = go.AddComponent<SpriteRenderer>(), life = 0.3f, ghost = true };
    p.sr.sprite = f.sr.sprite; p.sr.flipX = f.sr.flipX; p.sr.sortingOrder = 5; go.transform.position = f.sr.transform.position; go.transform.localScale = f.sr.transform.localScale; puffs.Add(p);
  }
  void ClearShots() { foreach (var s in shots) if (!s.mine) Destroy(s.sr.gameObject); shots.RemoveAll(s => !s.mine); }

  // how a creature looks this frame: springs (it gives under a blow, stretches and squashes), a warden's gold, a lord's rage
  void FoeLook(Foe f, float dk) {
    float dt = Time.deltaTime;
    f.svx += (-260 * (f.sx - 1) - 18 * f.svx) * dt; f.sx += f.svx * dt; f.svy += (-260 * (f.sy - 1) - 18 * f.svy) * dt; f.sy += f.svy * dt;
    float crouch = (f.act == 1 || f.tele > 0) && f.mode == 4 ? 0.92f : 1;
    float big = f.champ ? 1.5f : 1, s = f.sr.transform.localScale.y;
    f.sr.transform.localScale = new Vector3(big * Mathf.Clamp(f.sx, 0.7f, 1.3f) * (2 - crouch), big * s * Mathf.Clamp(f.sy, 0.7f, 1.3f) * crouch, 1);
    if (f.flash > 0) f.sr.color = new Color(1, 0.6f, 0.6f, 1);
    else if (f.tele > 0) f.sr.color = new Color(1, 1, 0.75f + 0.25f * Mathf.Sin(Time.time * 40), dk);
    else if (f.enraged) f.sr.color = new Color(1, 0.72f + 0.18f * Mathf.Sin(Time.time * 7), 0.7f, dk);
    else if (f.champ) f.sr.color = new Color(1, 0.9f, 0.62f, dk);
  }

  // ---------------------------------------------------------------- the charm wardens: they wake when the hero comes near a guarded charm
  void StepWardens() {
    if (room.items == null) return;
    foreach (var it in room.items) {
      if (it.kind != "charm" || string.IsNullOrEmpty(it.guard) || Got(it.id) || PlayerPrefs.GetInt("champ_" + it.id, 0) == 1) continue;
      if (foes.Exists(f => f.guardOf == it.id)) continue;
      float ix = (it.x + 0.5f) * TILE; if (Mathf.Abs(x + PW / 2 - ix) > 7 * TILE || Mathf.Abs(y + PH - (it.y + 1) * TILE) > 6 * TILE) continue;
      CreatureData d; if (!kinds.TryGetValue(it.guard, out d)) continue;
      var big = new CreatureData { type = d.type, fw = d.fw, fh = d.fh, w = d.w * 1.5f, h = d.h * 1.5f, hp = d.hp * 6, ppu = d.ppu };
      Sprite[] fr; if (!kindFrames.TryGetValue(d.type, out fr)) { var ct = Resources.Load<Texture2D>("creatures/" + d.type); if (ct == null) continue; fr = new Sprite[4]; for (int i = 0; i < 4; i++) fr[i] = Sprite.Create(ct, new Rect(i * d.fw, 0, d.fw, d.fh), new Vector2(0.5f, 0), d.ppu > 0 ? d.ppu : 2, 0, SpriteMeshType.FullRect); kindFrames[d.type] = fr; }
      for (int n = 0; n < Mathf.Max(1, it.guards); n++) {
        var go = new GameObject("Warden"); go.transform.SetParent(roomGo.transform, false);
        float wx = ix + (n == 0 ? -2.5f : 2.5f) * TILE, wy = (it.y + 1) * TILE - big.h - 30; if (SolidAt(wx, wy + big.h / 2) || SolidAt(wx - big.w / 2, wy + 4) || SolidAt(wx + big.w / 2, wy + 4)) wx = ix;
        var f = new Foe { d = big, fr = fr, sr = go.AddComponent<SpriteRenderer>(), hp = big.hp, maxHp = big.hp, x = wx - big.w / 2, y = wy, mode = 4, champ = true, st = 1.4f, guardOf = it.id };
        f.sr.sortingOrder = 6; f.px = f.x; f.py = f.y; foes.Add(f); bossNow = f;
      }
      Card(new[] { "حارس التعويذة", "Charm Warden" }, Story.Charm.ContainsKey(it.name) ? new[] { Story.Charm[it.name][0].Split('|')[0], Story.Charm[it.name][1].Split('|')[0] } : new[] { "تعويذة", "Charm" },
        new[] { "لن تلمس ما أحرسه.", "You will not touch what I guard." }, 2.6f, true);
      Play("w_roar_" + Random.Range(0, 3), 0.8f); Blow(0.08f, 8); PlayMusic("boss_bone");
    }
  }

  // a creature, a warden or a lord falls
  void OnFoeDown(Foe f) {
    int g = f.boss ? 120 : f.champ ? 60 : Random.Range(2, 7); geo += g; PlayerPrefs.SetInt("geo", geo);
    Play(f.boss ? "w_bossDie_" + Random.Range(0, 2) : "w_enemyDie_" + Random.Range(0, 3), 0.8f);
    if (f.champ) {
      if (!foes.Exists(o => o != f && o.guardOf == f.guardOf && o.mode != 3)) { PlayerPrefs.SetInt("champ_" + f.guardOf, 1); bossNow = null; Toast(new[] { "سقط الحارس. التعويذة لك.", "The warden falls. The charm is yours." }); RestoreMusic(); }
      PlayerPrefs.Save(); return;
    }
    if (!f.boss) { PlayerPrefs.Save(); return; }
    string key = f.d.type.Replace("boss_", ""); PlayerPrefs.SetInt("beat_" + key, 1); PlayerPrefs.Save();
    bossNow = null; fightOn = false; ClearShots(); SetGates(false); ApplyState(); RefreshTiles();
    PlayVoice("boss_" + key + "_2");
    Story.Lord lord; Story.Lords.TryGetValue(key, out lord);
    bool seal = System.Array.IndexOf(Story.Seals, key) >= 0;
    var ri = room.arena != null ? room.arena.reward : null;
    if (ri != null && !string.IsNullOrEmpty(ri.id) && !Got(ri.id)) SpawnItem(new ItemData { id = ri.id, kind = ri.kind, name = ri.name, amount = ri.amount, x = ri.x, y = ri.y });
    System.Action after = () => {
      if (room.arena != null && room.arena.ending) { StartScene(Story.Ending, "ending", () => { mode = Mode.Title; }); return; }
      RestoreMusic();
    };
    string[] mem = seal && Story.Memory.ContainsKey(key) ? Story.Memory[key] : Story.RoadLord;
    int seals = Seals();
    var lines = new List<string[]>();
    if (lord != null) lines.Add(lord.fall);
    lines.Add(mem);
    if (seal) lines.Add(new[] { "استعدتَ شظيةً من القنديل. الشظايا: " + seals + " من 12", "You took back a shard of the lantern. Shards: " + seals + " of 12" });
    StartTalk(new[] { "ذكرى", "A Memory" }, shardTex, lines, null, after, 1.6f);
  }
  int Seals() { int n = 0; foreach (var s in Story.Seals) if (Beaten(s)) n++; return n; }
  void RestoreMusic() { string tr; if (!TRACK.TryGetValue(room.theme, out tr)) tr = room.theme; PlayMusic(tr); }
}
