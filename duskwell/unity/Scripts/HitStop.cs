using UnityEngine;

// One shared hit-stop clock. Combat and damage both ask for a freeze; the longest request wins,
// and time scale is restored exactly once, so overlapping hits never leave the game frozen.
public class HitStop : MonoBehaviour
{
    static HitStop instance;
    float resumeAt;          // unscaled time when the freeze ends
    float savedScale = 1f;
    bool frozen;

    public static void Freeze(float seconds)
    {
        if (seconds <= 0f) return;
        if (instance == null)
        {
            GameObject go = new GameObject("HitStop");
            DontDestroyOnLoad(go);
            instance = go.AddComponent<HitStop>();
        }
        instance.Begin(seconds);
    }

    void Begin(float seconds)
    {
        if (!frozen)
        {
            savedScale = Time.timeScale > 0f ? Time.timeScale : 1f;
            frozen = true;
        }
        resumeAt = Mathf.Max(resumeAt, Time.unscaledTime + seconds);
        Time.timeScale = 0f;
    }

    void Update()
    {
        if (frozen && Time.unscaledTime >= resumeAt)
        {
            Time.timeScale = savedScale;
            frozen = false;
        }
    }
}
