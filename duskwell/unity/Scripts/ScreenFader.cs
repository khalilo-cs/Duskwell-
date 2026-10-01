using System.Collections;
using UnityEngine;

// Full-screen black fade. Put it on a UI Image that covers the Canvas, with a CanvasGroup.
// Runs on unscaled time so it still works during slow motion or hit stop.
[RequireComponent(typeof(CanvasGroup))]
public class ScreenFader : MonoBehaviour
{
    public float defaultDuration = 0.35f;
    CanvasGroup group;

    public bool IsBlack => group != null && group.alpha >= 0.999f;

    void Awake()
    {
        group = GetComponent<CanvasGroup>();
        group.alpha = 0f;
        group.blocksRaycasts = false;
    }

    public IEnumerator FadeOut(float duration = -1f) { return Fade(1f, duration < 0f ? defaultDuration : duration); }
    public IEnumerator FadeIn(float duration = -1f) { return Fade(0f, duration < 0f ? defaultDuration : duration); }

    IEnumerator Fade(float target, float duration)
    {
        float start = group.alpha, t = 0f;
        group.blocksRaycasts = true;
        while (t < duration)
        {
            t += Time.unscaledDeltaTime;
            group.alpha = Mathf.Lerp(start, target, t / duration);
            yield return null;
        }
        group.alpha = target;
        group.blocksRaycasts = target > 0.5f;
    }
}
