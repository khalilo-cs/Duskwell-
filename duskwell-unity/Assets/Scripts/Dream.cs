// Memories of battle: sitting on a bench, the hunter's journal can call back any lord already beaten. The hero sleeps and
// fights it again in its own hall, as a memory: nothing is lost on falling there, no shade is left and no geo taken, and
// the hero wakes on the bench either way. A lord beaten again in memory is marked in the journal. The scene of the sleep is
// painted (Resources/story/dream).
using System.Collections.Generic;
using UnityEngine;

public partial class Game {
  string dreamBoss = "";
  bool Dreaming() { return dreamBoss != ""; }
  bool DreamWon(string boss) { return PlayerPrefs.GetInt("dream_" + boss, 0) == 1; }
  // where the hero can stand in the lord's hall, past the line that wakes the lord
  bool DreamSpot(RoomData r, ArenaData ar, out float fx, out float fy) {
    fx = fy = 0; int trig = r.arena != null ? r.arena.trigger : 0;
    System.Func<int, int, bool> solid = (i, j) => i < 0 || j < 0 || i >= r.w || j >= r.h || Solid(r.t[j * r.w + i] - '0');
    foreach (int off in new[] { -6, -8, -5, -10, 6, 8, -12, 10, -4, 4 }) {
      int c = ar.x + off; if (c <= trig) continue;
      for (int row = ar.y; row <= Mathf.Min(r.h - 2, ar.y + 6); row++)
        if (!solid(c, row) && !solid(c, row - 1) && !solid(c, row - 2) && solid(c, row + 1)) { fx = (c + 0.5f) * TILE; fy = (row + 1) * TILE; return true; }
    }
    return false;
  }
  void StartDream(string boss) {
    ArenaData ar = null; foreach (var kv in arenas) if (kv.Value.boss == boss) ar = kv.Value;
    if (ar == null || !rooms.ContainsKey(ar.room)) return;
    float fx, fy; if (!DreamSpot(rooms[ar.room], ar, out fx, out fy)) { Toast(new[] { "هذه الذكرى بعيدة جداً الآن.", "This memory is too far away now." }); return; }
    Story.Lord lord; Story.Lords.TryGetValue(boss, out lord);
    string nm = lord != null ? lord.name[0] : boss, nmEn = lord != null && lord.name.Length > 1 ? lord.name[1] : boss;
    mode = Mode.Play; pick = ""; Play("w_bench_0", 0.6f);
    StartScene(new[] { new Story.Panel("story/dream",
      "أغمضتَ عينيك على المقعد، فحملك القنديل إلى ذكرى معركةٍ مضت… " + nm + " ينتظرك هناك كما كان.",
      "You closed your eyes on the bench, and the lantern carried you into the memory of a battle long past... " + nmEn + " waits there as it was.") }, "rest", () => {
        dreamBoss = boss; hp = maxHp; soul = 0; Enter(ar.room, fx, fy);
      });
  }
  // the lord falls again in the memory: marked, and the hero wakes
  void DreamDown(string boss) {
    PlayerPrefs.SetInt("dream_" + boss, 1); PlayerPrefs.Save();
    bossNow = null; fightOn = false; ClearShots(); SetGates(false); PlayVoice("boss_" + boss + "_2");
    StartTalk(new[] { "ذكرى", "A Memory" }, shardTex, new List<string[]> { new[] { "انتصرتَ في الذكرى. سُجّل ذلك في دفتر الصيّاد.", "You won in the memory. It is written in the hunter's journal." } }, null, Wake, 1.4f);
  }
  void Wake() {
    dreamBoss = ""; hp = maxHp; soul = 0; fightOn = false; bossNow = null; deadT = 0;
    string br = PlayerPrefs.GetString("bench_room", "");
    if (br != "" && rooms.ContainsKey(br)) Enter(br, PlayerPrefs.GetFloat("bench_x"), PlayerPrefs.GetFloat("bench_y")); else Enter(startRoom, startX, startY);
    RestoreMusic(); Toast(new[] { "استيقظتَ على المقعد.", "You wake on the bench." });
  }
}
