// The arts of the blade, learned as the one blade grows: hold the strike to gather it (the hero glows), then let go.
//   the Great Slash (with the Honed Blade): a wide, heavy cut in front
//   the Dash Slash (with the Tempered Blade): let go while dashing, and the hero cuts through what is ahead
//   the Cyclone (with the Ember-Forged Blade): let go in the air, and the blade spins round the hero as they fall slowly
// The cut is the painted slash of the blade (Resources/fx/wf_nail_*), larger and in the blade's colour.
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  float artHold, artT, artTick, artLen; string art = ""; bool artReady; SpriteRenderer artSr;
  readonly HashSet<Foe> artStruck = new HashSet<Foe>();
  const float ART_CHARGE = 0.75f;
  bool Knows(string a) { return a == "greatslash" ? blade >= 1 : a == "dashslash" ? blade >= 2 : a == "cyclone" ? blade >= 3 : false; }
  static readonly string[] ARTS = { "greatslash", "dashslash", "cyclone" };
  // the strike held: gathering, and the art let go when it is released
  void StepArtInput(bool atk) {
    if (artT > 0 || deadT > 0 || !Knows("greatslash")) { artHold = 0; artReady = false; return; }
    if (atk) {
      artHold += Time.deltaTime;
      if (!artReady && artHold >= ART_CHARGE) { artReady = true; Play("w_ability_1", 0.45f); Dust(x + PW / 2, y + PH / 2, 6, 80); }
    } else { if (artReady) StartArt(); artHold = 0; artReady = false; }
  }
  void StartArt() {
    if ((dashT > 0 || sdashT > 0) && Knows("dashslash")) { art = "dash"; artLen = 0.3f; dashT = Mathf.Max(dashT, 0.24f); }
    else if (!ground && Knows("cyclone")) { art = "cyclone"; artLen = 0.9f; }
    else { art = "great"; artLen = 0.32f; }
    artT = artLen; artTick = 0; artStruck.Clear();
    Play("nail_side", 0.9f); Play("w_slam_0", 0.45f); Blow(0.03f, 4);
  }
  Color ArtGlow() { return artReady ? Color.Lerp(Color.white, new Color(1, 0.86f, 0.62f), 0.5f + 0.5f * Mathf.Sin(Time.time * 22)) : Color.white; }
  void StepArt(float dt) {
    if (artSr == null) { var go = new GameObject("Art"); artSr = go.AddComponent<SpriteRenderer>(); artSr.sortingOrder = 12; }
    if (artT <= 0 || slashFr == null || slashFr[0] == null) { artSr.enabled = false; return; }
    artT -= dt; artTick -= dt; float k = 1 - artT / artLen; float reach = Reach();
    Rect r; int dmg;
    if (art == "great") { r = new Rect(face > 0 ? x + PW : x - 150 - reach * 1.6f, y - 34, 150 + reach * 1.6f, PH + 68); dmg = Mathf.RoundToInt(NailDmg() * 2.5f); }
    else if (art == "dash") { r = new Rect(face > 0 ? x + PW - 24 : x - 112, y - 12, 136, PH + 24); dmg = NailDmg() * 2; }
    else { r = new Rect(x - 112, y - 56, PW + 224, PH + 112); dmg = NailDmg(); if (artTick <= 0) { artTick = 0.13f; artStruck.Clear(); } vy = Mathf.Min(vy, 140); }
    for (int i = foes.Count - 1; i >= 0; i--) {
      var f = foes[i]; if (f.mode == 3 || artStruck.Contains(f)) continue;
      if (!(r.x < f.x + f.d.w && r.xMax > f.x && r.y < f.y + f.d.h && r.yMax > f.y)) continue;
      artStruck.Add(f); f.hp -= dmg; f.flash = 0.15f; f.svx -= 4; f.svy += 3; GainSoul(); Play("nail_hit", 0.8f); Play(f.d.type + (f.hp <= 0 ? "_die" : "_hurt"), 0.6f);
      Blow(0.045f, f.boss ? 5 : 3.5f); Dust(f.x + f.d.w / 2, f.y + f.d.h / 2, 5, 160);
      if (f.mode < 2 && !f.champ && art != "cyclone") f.x += face * 22;
      if (f.hp <= 0) {
        Dust(f.x + f.d.w / 2, f.y + f.d.h / 2, f.boss ? 24 : 8, f.boss ? 260 : 170); Blow(f.boss ? 0.25f : 0.08f, f.boss ? 12 : 6);
        OnFoeDown(f); f.mode = 3; f.st = f.boss ? 1.2f : 0.3f;
      }
    }
    // the painted cut, larger, in the blade's colour
    artSr.enabled = true; var c = BLADE[blade].arc; float s = 1 + blade * 0.09f;
    artSr.sprite = slashFr[Mathf.Clamp((int)(k * 4) % 4, 0, 3)];
    if (art == "great") { artSr.flipX = face < 0; artSr.transform.position = new Vector3(x + PW / 2 + face * (14 + reach), -(y + PH / 2), 0); artSr.transform.rotation = Quaternion.identity; artSr.transform.localScale = new Vector3(2.1f * s, 2.1f * s, 1); }
    else if (art == "dash") { artSr.flipX = face < 0; artSr.transform.position = new Vector3(x + PW / 2 + face * 20, -(y + PH / 2), 0); artSr.transform.rotation = Quaternion.identity; artSr.transform.localScale = new Vector3(1.9f * s, 1.2f * s, 1); }
    else { artSr.flipX = false; artSr.transform.position = new Vector3(x + PW / 2, -(y + PH / 2), 0); artSr.transform.rotation = Quaternion.Euler(0, 0, -k * 1500); artSr.transform.localScale = new Vector3(1.7f * s, 1.7f * s, 1); }
    artSr.color = new Color(c.r, c.g, c.b, Mathf.Clamp01(artT / artLen * 2.2f));
  }
  // what the smith says of the art the new blade knows
  string[] ArtLearned(int stage) {
    if (stage == 1) return new[] { "النصل يعرف الآن «الضربة العظمى»: اضغط زر الضرب مطوّلاً حتى يتوهّج البطل، ثم أفلته.", "The blade now knows the Great Slash: hold strike until you glow, then let go." };
    if (stage == 2) return new[] { "النصل يعرف الآن «ضربة الاندفاع»: اجمع الضربة ثم أفلتها وأنت تندفع.", "The blade now knows the Dash Slash: gather the strike, then let go while dashing." };
    if (stage == 3) return new[] { "النصل يعرف الآن «الإعصار»: اجمع الضربة ثم أفلتها في الهواء فيدور النصل حولك.", "The blade now knows the Cyclone: gather the strike, then let go in the air and the blade spins round you." };
    return null;
  }
}
