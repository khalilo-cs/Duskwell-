// Travel between benches: every bench the hero has rested on is remembered. Sitting on a bench, open the map: the benches
// rested on glow, and a tap on one calls the great lantern moth, who carries the hero over the dark to it (a painted scene,
// Resources/story/travel), healed and kept there as on any bench.
using UnityEngine;

public partial class Game {
  string BenchKey(string roomId, float px) { return "benchv_" + roomId + "_" + Mathf.RoundToInt(px); }
  void RestedOn(float px) { PlayerPrefs.SetInt(BenchKey(room.id, px), 1); }
  bool Rested(string roomId, float px) { return PlayerPrefs.GetInt(BenchKey(roomId, px), 0) == 1; }
  // a bench on the map that can be travelled to: it glows, and a tap goes there
  void TravelMark(RoomData r, PosData b, float cx, float cy, float m) {
    if (!AtBench()) return;
    float bx = (b.x + 0.5f) * TILE, by = (b.y + 1) * TILE;
    if (!Rested(r.id, bx) || r == room && near != null && Mathf.Abs(near.x - bx) < 2) return;
    var puff = Tex("fx/fx_puff"); float g = m * (1.6f + 0.25f * Mathf.Sin(Time.time * 4));
    if (puff != null) { GUI.color = new Color(1, 0.85f, 0.55f, 0.55f); GUI.DrawTexture(new Rect(cx - g, cy - m * 0.5f - g, g * 2, g * 2), puff); GUI.color = Color.white; }
    if (GUI.Button(new Rect(cx - m * 1.2f, cy - m * 1.8f, m * 2.4f, m * 2.4f), GUIContent.none, GUIStyle.none)) TravelTo(r, bx, by);
  }
  void TravelTo(RoomData r, float bx, float by) {
    string[] a; string where = Story.Area.TryGetValue(r.area, out a) ? a[0].Split('|')[0] : "";
    string whereEn = Story.Area.TryGetValue(r.area, out a) && a.Length > 1 ? a[1].Split('|')[0] : "";
    mode = Mode.Play; pick = ""; mapNear = false; Play("w_bench_0", 0.7f);
    StartScene(new[] { new Story.Panel("story/travel",
      "أشعلتَ قنديل المقعد، فجاءت فراشة القنديل العظيمة من الظلام. حملتك فوق الهاويات والأنهار الساكنة… إلى " + where + ".",
      "You lit the bench's lantern, and the great lantern moth came out of the dark. It carried you over chasms and still rivers... to " + whereEn + ".") }, "rest", () => {
        Enter(r.id, bx, by); hp = maxHp; spawnX = bx; spawnY = by;
        PlayerPrefs.SetString("bench_room", r.id); PlayerPrefs.SetFloat("bench_x", bx); PlayerPrefs.SetFloat("bench_y", by); PlayerPrefs.SetInt("hp", hp); PlayerPrefs.Save();
      });
  }
}
