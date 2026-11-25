// Arabic on screen. Unity's plain text neither joins Arabic letters nor runs them right to left, so every line is joined here
// (each letter takes its first, middle, last or lone form, lam and alef become one) and turned to be read from the right; long
// texts are broken into lines by their width first, so the words keep their order. The font (Resources/font/cairo) carries
// the joined forms.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

public static class Ar {
  // letter: lone, last, first, middle (0 when the letter has no such form)
  static readonly Dictionary<int, int[]> F = new Dictionary<int, int[]> {
    {0x0621,new[]{0xFE80,0,0,0}}, {0x0622,new[]{0xFE81,0xFE82,0,0}}, {0x0623,new[]{0xFE83,0xFE84,0,0}}, {0x0624,new[]{0xFE85,0xFE86,0,0}},
    {0x0625,new[]{0xFE87,0xFE88,0,0}}, {0x0626,new[]{0xFE89,0xFE8A,0xFE8B,0xFE8C}}, {0x0627,new[]{0xFE8D,0xFE8E,0,0}}, {0x0628,new[]{0xFE8F,0xFE90,0xFE91,0xFE92}},
    {0x0629,new[]{0xFE93,0xFE94,0,0}}, {0x062A,new[]{0xFE95,0xFE96,0xFE97,0xFE98}}, {0x062B,new[]{0xFE99,0xFE9A,0xFE9B,0xFE9C}}, {0x062C,new[]{0xFE9D,0xFE9E,0xFE9F,0xFEA0}},
    {0x062D,new[]{0xFEA1,0xFEA2,0xFEA3,0xFEA4}}, {0x062E,new[]{0xFEA5,0xFEA6,0xFEA7,0xFEA8}}, {0x062F,new[]{0xFEA9,0xFEAA,0,0}}, {0x0630,new[]{0xFEAB,0xFEAC,0,0}},
    {0x0631,new[]{0xFEAD,0xFEAE,0,0}}, {0x0632,new[]{0xFEAF,0xFEB0,0,0}}, {0x0633,new[]{0xFEB1,0xFEB2,0xFEB3,0xFEB4}}, {0x0634,new[]{0xFEB5,0xFEB6,0xFEB7,0xFEB8}},
    {0x0635,new[]{0xFEB9,0xFEBA,0xFEBB,0xFEBC}}, {0x0636,new[]{0xFEBD,0xFEBE,0xFEBF,0xFEC0}}, {0x0637,new[]{0xFEC1,0xFEC2,0xFEC3,0xFEC4}}, {0x0638,new[]{0xFEC5,0xFEC6,0xFEC7,0xFEC8}},
    {0x0639,new[]{0xFEC9,0xFECA,0xFECB,0xFECC}}, {0x063A,new[]{0xFECD,0xFECE,0xFECF,0xFED0}}, {0x0641,new[]{0xFED1,0xFED2,0xFED3,0xFED4}}, {0x0642,new[]{0xFED5,0xFED6,0xFED7,0xFED8}},
    {0x0643,new[]{0xFED9,0xFEDA,0xFEDB,0xFEDC}}, {0x0644,new[]{0xFEDD,0xFEDE,0xFEDF,0xFEE0}}, {0x0645,new[]{0xFEE1,0xFEE2,0xFEE3,0xFEE4}}, {0x0646,new[]{0xFEE5,0xFEE6,0xFEE7,0xFEE8}},
    {0x0647,new[]{0xFEE9,0xFEEA,0xFEEB,0xFEEC}}, {0x0648,new[]{0xFEED,0xFEEE,0,0}}, {0x0649,new[]{0xFEEF,0xFEF0,0,0}}, {0x064A,new[]{0xFEF1,0xFEF2,0xFEF3,0xFEF4}},
  };
  // lam + alef: lone and last forms, by the alef
  static readonly Dictionary<int, int[]> LA = new Dictionary<int, int[]> { {0x0622,new[]{0xFEF5,0xFEF6}}, {0x0623,new[]{0xFEF7,0xFEF8}}, {0x0625,new[]{0xFEF9,0xFEFA}}, {0x0627,new[]{0xFEFB,0xFEFC}} };
  static bool Joins(int c) { int[] f; return F.TryGetValue(c, out f) && f[2] != 0; }           // can join the letter after it
  static bool Letter(int c) { return F.ContainsKey(c); }
  static bool Mark(int c) { return (c >= 0x064B && c <= 0x065F) || c == 0x0670 || c == 0x0640; }
  public static bool IsArabic(string s) { foreach (char c in s) if (c >= 0x0600 && c <= 0x06FF) return true; return false; }

  // joins the letters of one line (logical order) and returns it in the order it is drawn, left to right
  public static string Line(string s) {
    if (!IsArabic(s)) return s;
    var cs = new List<int>(); foreach (char c in s) if (!Mark(c)) cs.Add(c);
    var outp = new List<int>();
    for (int i = 0; i < cs.Count; i++) {
      int c = cs[i];
      if (!Letter(c)) { outp.Add(c); continue; }
      int prev = i > 0 ? cs[i - 1] : 0, next = i + 1 < cs.Count ? cs[i + 1] : 0;
      bool fromPrev = Joins(prev);
      if (c == 0x0644 && LA.ContainsKey(next)) { outp.Add(LA[next][fromPrev ? 1 : 0]); i++; continue; }
      bool toNext = Joins(c) && Letter(next);
      var f = F[c]; int g = fromPrev && toNext ? f[3] : fromPrev ? f[1] : toNext ? f[2] : f[0];
      outp.Add(g != 0 ? g : f[0]);
    }
    // right to left: the whole line turned, but runs of digits and Latin letters keep their own order
    var res = new StringBuilder(); int k = outp.Count - 1;
    while (k >= 0) {
      if (Ltr(outp[k])) { int e = k; while (k >= 0 && (Ltr(outp[k]) || (outp[k] == ' ' && k > 0 && Ltr(outp[k - 1])))) k--; for (int j = k + 1; j <= e; j++) res.Append((char)outp[j]); }
      else { res.Append((char)Mirror(outp[k])); k--; }
    }
    return res.ToString();
  }
  static bool Ltr(int c) { return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == ':'; }
  static int Mirror(int c) { switch (c) { case '(': return ')'; case ')': return '('; case '«': return '»'; case '»': return '«'; case '[': return ']'; case ']': return '['; default: return c; } }

  // breaks a text into lines no wider than w with this style (words in their own order), each ready to draw
  public static List<string> Wrap(string s, GUIStyle st, float w) {
    var lines = new List<string>(); bool ar = IsArabic(s);
    foreach (var para in s.Split('\n')) {
      var words = para.Split(' '); var cur = "";
      foreach (var wd in words) {
        string tryS = cur.Length == 0 ? wd : cur + " " + wd;
        if (cur.Length > 0 && st.CalcSize(new GUIContent(ar ? Line(tryS) : tryS)).x > w) { lines.Add(ar ? Line(cur) : cur); cur = wd; }
        else cur = tryS;
      }
      lines.Add(ar ? Line(cur) : cur);
    }
    return lines;
  }
}
