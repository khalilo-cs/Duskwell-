// The air of each area, in painted motes drawn by the first version's painters (Resources/life): snow sifting down the frost
// peaks, embers rising from Cinderdeep, spores drifting in the Sporewood, sparks of light in the crystal and lunar halls, dust in
// the caves and the village, pale glints in the mirror city, ash in the ossuary. They drift across the view on their own wind and
// sway, nearer ones larger and brighter, so every hall has depth and weather of its own.
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  class Mote { public SpriteRenderer sr; public float x, y, vx, vy, size, ph, depth; }
  readonly List<Mote> motes = new List<Mote>(); string moteTheme = "";
  // area: picture, how many, fall speed (negative rises), sideways wind, colour, size
  static readonly Dictionary<string, object[]> AIR = new Dictionary<string, object[]> {
    { "frost", new object[] { "star", 46, 38f, 14f, new Color(0.92f, 0.97f, 1f, 0.85f), 9f } },
    { "ember", new object[] { "spore", 40, -34f, 8f, new Color(1f, 0.6f, 0.3f, 0.9f), 8f } },
    { "spore", new object[] { "spore", 34, 8f, 10f, new Color(0.9f, 1f, 0.6f, 0.75f), 10f } },
    { "crystal", new object[] { "star", 30, -6f, 4f, new Color(1f, 0.8f, 1f, 0.8f), 8f } },
    { "lunar", new object[] { "star", 30, -4f, 3f, new Color(0.85f, 0.92f, 1f, 0.8f), 8f } },
    { "mirror", new object[] { "star", 24, 3f, 6f, new Color(0.9f, 0.85f, 1f, 0.7f), 7f } },
    { "bone", new object[] { "glow", 26, 12f, 6f, new Color(0.85f, 0.8f, 0.7f, 0.55f), 9f } },
    { "storm", new object[] { "glow", 30, 70f, 40f, new Color(0.8f, 0.85f, 1f, 0.45f), 6f } },
    { "moss", new object[] { "glow", 28, -5f, 5f, new Color(0.75f, 1f, 0.6f, 0.7f), 8f } },
    { "aqueduct", new object[] { "glow", 26, -8f, 3f, new Color(0.6f, 1f, 0.95f, 0.65f), 8f } },
    { "webbed", new object[] { "glow", 22, 6f, 4f, new Color(0.85f, 0.8f, 0.9f, 0.5f), 7f } },
    { "foundry", new object[] { "spore", 26, -22f, 10f, new Color(1f, 0.7f, 0.4f, 0.75f), 7f } },
    { "throne", new object[] { "glow", 24, 5f, 3f, new Color(0.85f, 0.8f, 1f, 0.55f), 8f } },
    { "cave", new object[] { "glow", 20, 6f, 4f, new Color(0.85f, 0.85f, 0.9f, 0.45f), 7f } },
    { "town", new object[] { "glow", 22, 3f, 6f, new Color(1f, 0.9f, 0.6f, 0.6f), 7f } },
  };
  // depth: slow banks of fog in the area's own colour, dark shapes of plants in front of the view that pass quicker than the world
  // (painted plants of the area, turned to silhouettes), and shafts of light falling from above
  class Depth { public SpriteRenderer sr; public float bx, by, k, size, ph; public int kind; }
  readonly List<Depth> depth = new List<Depth>(); string depthRoom = "";
  static readonly Dictionary<string, Color> FOG = new Dictionary<string, Color> {
    { "town", new Color(1f, 0.85f, 0.6f) }, { "cave", new Color(0.55f, 0.7f, 0.95f) }, { "moss", new Color(0.5f, 0.9f, 0.6f) }, { "spore", new Color(0.85f, 0.95f, 0.5f) },
    { "aqueduct", new Color(0.4f, 0.9f, 0.85f) }, { "webbed", new Color(0.7f, 0.65f, 0.85f) }, { "foundry", new Color(1f, 0.6f, 0.35f) }, { "throne", new Color(0.7f, 0.65f, 1f) },
    { "frost", new Color(0.75f, 0.9f, 1f) }, { "ember", new Color(1f, 0.45f, 0.3f) }, { "storm", new Color(0.6f, 0.7f, 1f) }, { "mirror", new Color(0.8f, 0.75f, 1f) },
    { "bone", new Color(0.9f, 0.85f, 0.7f) }, { "lunar", new Color(0.7f, 0.8f, 1f) }, { "crystal", new Color(1f, 0.6f, 0.9f) },
  };
  void StepDepth(float camX, float camY) {
    float hw = 270 * cam.aspect, hh = 270, t = Time.time;
    if (depthRoom != room.id) {
      depthRoom = room.id; foreach (var l in depth) if (l.sr != null) Destroy(l.sr.gameObject); depth.Clear();
      var puff = puffSprite; Color fc; if (!FOG.TryGetValue(room.theme, out fc)) fc = new Color(0.7f, 0.75f, 0.9f);
      float W = room.w * TILE, H = room.h * TILE;
      if (puff != null) for (int i = 0; i < 8; i++) {                         // fog banks
        var go = new GameObject("Fog"); go.transform.SetParent(transform, false); var l = new Depth { sr = go.AddComponent<SpriteRenderer>(), bx = Hash(i, W, 3) * W, by = H * (0.35f + 0.6f * Hash(i, H, 7)), k = 0, size = 420 + Hash(i, 2, 9) * 520, ph = i * 1.3f, kind = 0 };
        l.sr.sprite = puff; l.sr.sortingOrder = i < 6 ? 1 : 41; l.sr.color = new Color(fc.r, fc.g, fc.b, i < 6 ? 0.10f : 0.05f); depth.Add(l);
      }
      var rays = Tex("ui/rays");
      if (rays != null) { var rs = Sprite.Create(rays, new Rect(0, 0, rays.width, rays.height), new Vector2(0.5f, 1), rays.height / 700f, 0, SpriteMeshType.FullRect);
        for (int i = 0; i < 3; i++) { var go = new GameObject("Rays"); go.transform.SetParent(transform, false); var l = new Depth { sr = go.AddComponent<SpriteRenderer>(), bx = W * (0.2f + 0.3f * i) + Hash(i, W, 5) * 120, by = 0, k = 0, size = 1, ph = i * 2.1f, kind = 1 };
          l.sr.sprite = rs; l.sr.sortingOrder = -100; l.sr.color = new Color(Mathf.Lerp(1, fc.r, 0.4f), Mathf.Lerp(1, fc.g, 0.4f), Mathf.Lerp(1, fc.b, 0.4f), 0.22f); depth.Add(l); } }
      LifeTheme lt; if (lifeOf.TryGetValue(room.theme, out lt) && lt.plant != null && lt.plant.Length > 0)    // plants in front, as dark shapes
        for (int i = 0; i < 9; i++) {
          var fr = LifeSprites(lt.plant[i % lt.plant.Length]); if (fr == null) continue;
          var go = new GameObject("Front"); go.transform.SetParent(transform, false);
          var l = new Depth { sr = go.AddComponent<SpriteRenderer>(), bx = (i + Hash(i, 4, 4)) / 9f * (W + hw * 2) - hw, by = 0, k = 1.35f, size = 150 + Hash(i, 8, 1) * 170, ph = i, kind = 2 };
          l.sr.sprite = fr[0]; l.sr.sortingOrder = 45; l.sr.color = new Color(0.02f, 0.02f, 0.035f, 0.96f); l.sr.flipX = i % 2 == 1; depth.Add(l);
        }
    }
    foreach (var l in depth) {
      if (l.kind == 0) { float s = l.size * (1 + 0.08f * Mathf.Sin(t * 0.2f + l.ph)); l.sr.transform.position = new Vector3(l.bx + Mathf.Sin(t * 0.05f + l.ph) * 140, -l.by, 0); l.sr.transform.localScale = new Vector3(s * 1.8f, s, 1); }
      else if (l.kind == 1) { l.sr.transform.position = new Vector3(l.bx, 40, 0); l.sr.transform.rotation = Quaternion.Euler(0, 0, -12 + Mathf.Sin(t * 0.15f + l.ph) * 3); var c = l.sr.color; c.a = 0.16f + 0.08f * Mathf.Sin(t * 0.4f + l.ph); l.sr.color = c; }
      else { float sx = camX + (l.bx - camX) * l.k; l.sr.transform.position = new Vector3(sx, -(camY + hh + 30), 0); l.sr.transform.localScale = new Vector3(l.size, l.size * 1.25f, 1); l.sr.transform.rotation = Quaternion.Euler(0, 0, Mathf.Sin(t * 0.7f + l.ph) * 3); }
    }
  }
  void StepAir(float camX, float camY) {
    StepDepth(camX, camY);
    float hw = 270 * cam.aspect, hh = 270;
    if (room.theme != moteTheme) {                                               // a new area: its own air
      moteTheme = room.theme; foreach (var m in motes) if (m.sr != null) Destroy(m.sr.gameObject); motes.Clear();
      object[] a; if (!AIR.TryGetValue(room.theme, out a)) return;
      var fr = LifeSprites((string)a[0]); if (fr == null) return;
      for (int i = 0; i < (int)a[1]; i++) {
        var go = new GameObject("Mote"); go.transform.SetParent(transform, false);
        var m = new Mote { sr = go.AddComponent<SpriteRenderer>(), depth = 0.4f + Random.value * 0.9f, ph = Random.value * 6.3f };
        m.x = camX + Random.Range(-hw, hw); m.y = camY + Random.Range(-hh, hh); m.sr.sprite = fr[i % fr.Length];
        m.sr.sortingOrder = m.depth > 1 ? 30 : -3000; m.size = (float)a[5] * m.depth; m.sr.color = (Color)a[4] * new Color(1, 1, 1, Mathf.Clamp01(0.35f + m.depth * 0.5f));
        motes.Add(m);
      }
    }
    object[] cfg; if (!AIR.TryGetValue(moteTheme, out cfg)) return;
    float fall = (float)cfg[2], wind = (float)cfg[3], dt = Time.deltaTime, t = Time.time;
    foreach (var m in motes) {
      m.x += (wind * m.depth + Mathf.Sin(t * 0.8f + m.ph) * 10) * dt; m.y += (fall * m.depth + Mathf.Cos(t * 0.6f + m.ph) * 4) * dt;
      // a mote that leaves the view comes back on the other side
      if (m.x < camX - hw - 20) m.x += hw * 2 + 40; else if (m.x > camX + hw + 20) m.x -= hw * 2 + 40;
      if (m.y < camY - hh - 20) m.y += hh * 2 + 40; else if (m.y > camY + hh + 20) m.y -= hh * 2 + 40;
      m.sr.transform.position = new Vector3(m.x, -m.y, 0); float s = m.size * (0.85f + 0.15f * Mathf.Sin(t * 2 + m.ph)); m.sr.transform.localScale = new Vector3(s, s, 1);
    }
  }
}
