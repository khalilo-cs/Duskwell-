using UnityEngine;
using UnityEngine.UI;

// Static relay so a boss in a loaded scene can drive UI that lives on the persistent canvas.
public static class BossEvents
{
    public static event System.Action<string, int, int> Started;   // name, health, max
    public static event System.Action<int, int> HealthChanged;       // health, max
    public static event System.Action Ended;

    public static void RaiseStarted(string name, int health, int max) { if (Started != null) Started(name, health, max); }
    public static void RaiseHealth(int health, int max) { if (HealthChanged != null) HealthChanged(health, max); }
    public static void RaiseEnded() { if (Ended != null) Ended(); }
}

// Boss name and health at the bottom of the screen. A pale "lag" bar trails the real one,
// so every chunk of damage reads clearly.
//
// Setup: a panel (root) with a name Text, a Filled horizontal Image for health,
// and an optional second Filled Image behind it for the lag.
public class BossHealthBar : MonoBehaviour
{
    public GameObject root;
    public Text nameLabel;
    public Image fill;
    public Image lagFill;
    [Tooltip("Seconds before the lag bar starts catching up.")]
    public float lagDelay = 0.4f;
    public float lagSpeed = 0.8f;

    float target = 1f, lag = 1f, lagTimer;

    void OnEnable()
    {
        BossEvents.Started += OnStarted;
        BossEvents.HealthChanged += OnHealth;
        BossEvents.Ended += OnEnded;
        if (root != null) root.SetActive(false);
    }

    void OnDisable()
    {
        BossEvents.Started -= OnStarted;
        BossEvents.HealthChanged -= OnHealth;
        BossEvents.Ended -= OnEnded;
    }

    void OnStarted(string bossName, int health, int max)
    {
        if (root != null) root.SetActive(true);
        if (nameLabel != null) nameLabel.text = bossName;
        target = lag = max > 0 ? (float)health / max : 1f;
        Draw();
    }

    void OnHealth(int health, int max)
    {
        target = max > 0 ? (float)health / max : 0f;
        lagTimer = lagDelay;
        Draw();
    }

    void OnEnded() { if (root != null) root.SetActive(false); }

    void Update()
    {
        if (lag <= target) return;
        lagTimer -= Time.unscaledDeltaTime;
        if (lagTimer <= 0f) { lag = Mathf.MoveTowards(lag, target, lagSpeed * Time.unscaledDeltaTime); Draw(); }
    }

    void Draw()
    {
        if (fill != null) fill.fillAmount = target;
        if (lagFill != null) lagFill.fillAmount = Mathf.Max(lag, target);
    }
}
