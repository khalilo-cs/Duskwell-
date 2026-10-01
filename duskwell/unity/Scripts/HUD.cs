using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

// Masks along the top-left and the soul vessel beside them.
//
// Setup (Screen Space - Overlay Canvas):
//   maskContainer  - an empty RectTransform with a Horizontal Layout Group
//   maskPrefab     - an Image with the full-mask sprite
//   soulFill       - an Image (Type: Filled, Vertical, origin Bottom) inside the vessel frame
//   soulVessel     - the vessel's RectTransform, pulsed when a heal is affordable
public class HUD : MonoBehaviour
{
    public PlayerHealth health;
    public PlayerSoul soul;

    [Header("Masks")]
    public RectTransform maskContainer;
    public Image maskPrefab;
    public Sprite fullMask;
    public Sprite emptyMask;
    [Tooltip("Seconds a lost mask stays enlarged and white before it goes dark.")]
    public float breakFlashTime = 0.25f;

    [Header("Soul")]
    public Image soulFill;
    public RectTransform soulVessel;
    [Tooltip("Pulse size when enough soul for a heal is stored.")]
    public float readyPulse = 0.06f;
    [Tooltip("How fast the liquid level catches up, per second.")]
    public float fillSpeed = 3f;

    readonly List<Image> masks = new List<Image>();
    float shownFill;
    float breakTimer;
    int brokenIndex = -1;

    void OnEnable()
    {
        if (health != null) { health.Damaged += OnHealthChanged; health.Healed += OnHealthChanged; }
    }

    void OnDisable()
    {
        if (health != null) { health.Damaged -= OnHealthChanged; health.Healed -= OnHealthChanged; }
    }

    void Start() { Rebuild(); }

    // Creates one icon per max mask; call again after a mask upgrade.
    public void Rebuild()
    {
        foreach (Image m in masks) if (m != null) Destroy(m.gameObject);
        masks.Clear();
        if (health == null || maskPrefab == null || maskContainer == null) return;
        for (int i = 0; i < health.maxMasks; i++) masks.Add(Instantiate(maskPrefab, maskContainer));
        Refresh();
    }

    void OnHealthChanged(int remaining)
    {
        if (masks.Count != health.maxMasks) { Rebuild(); return; }
        if (remaining < CountFull()) { brokenIndex = remaining; breakTimer = breakFlashTime; }
        Refresh();
    }

    int CountFull()
    {
        int n = 0;
        foreach (Image m in masks) if (m.sprite == fullMask) n++;
        return n;
    }

    void Refresh()
    {
        for (int i = 0; i < masks.Count; i++)
        {
            bool flashing = breakTimer > 0f && i == brokenIndex;     // keep the breaking mask lit until its flash ends
            masks[i].sprite = i < health.CurrentMasks || flashing ? fullMask : emptyMask;
            masks[i].rectTransform.localScale = Vector3.one;
            masks[i].color = Color.white;
        }
    }

    void Update()
    {
        // the mask that just broke flashes large for a moment
        if (breakTimer > 0f && brokenIndex >= 0 && brokenIndex < masks.Count)
        {
            breakTimer -= Time.unscaledDeltaTime;
            float k = Mathf.Clamp01(breakTimer / breakFlashTime);
            masks[brokenIndex].rectTransform.localScale = Vector3.one * (1f + 0.4f * k);
            if (breakTimer <= 0f) Refresh();
        }

        if (soul == null || soulFill == null) return;
        float target = soul.maxSoul > 0 ? (float)soul.CurrentSoul / soul.maxSoul : 0f;
        shownFill = Mathf.MoveTowards(shownFill, target, fillSpeed * Time.unscaledDeltaTime);
        soulFill.fillAmount = shownFill;

        if (soulVessel != null)
        {
            bool ready = soul.CurrentSoul >= soul.focusCost;
            float pulse = ready ? 1f + readyPulse * Mathf.Sin(Time.unscaledTime * 6f) : 1f;
            if (soul.IsFocusing) pulse += 0.08f * soul.FocusProgress;
            soulVessel.localScale = Vector3.one * pulse;
        }
    }
}
