using UnityEngine;

// Soul economy: nail hits on enemies fill the vessel; holding Focus on the ground spends soul to heal.
//
// Setup: on the player next to PlayerCombat and PlayerHealth. Map a "Focus" button (or keep Fire2).
[RequireComponent(typeof(PlayerCombat), typeof(PlayerHealth), typeof(PlayerController2D))]
public class PlayerSoul : MonoBehaviour
{
    [Header("Vessel")]
    public int maxSoul = 99;
    [Tooltip("Soul gained per nail hit on an enemy (hazards give none). 11 per hit = 3 hits per heal.")]
    public int soulPerHit = 11;

    [Header("Focus (heal)")]
    public string focusButton = "Fire2";
    [Tooltip("Soul spent per mask restored.")]
    public int focusCost = 33;
    [Tooltip("Seconds of holding still to restore one mask.")]
    public float focusTime = 0.9f;
    [Tooltip("Stick input above this cancels the focus.")]
    public float moveCancelThreshold = 0.2f;

    public int CurrentSoul { get; private set; }
    public bool IsFocusing { get; private set; }
    public float FocusProgress => IsFocusing ? focusTimer / focusTime : 0f;

    public event System.Action<int> SoulChanged;
    public event System.Action FocusStarted;
    public event System.Action FocusCancelled;
    public event System.Action Focused;          // one mask restored

    PlayerCombat combat;
    PlayerHealth health;
    PlayerController2D controller;
    float focusTimer;

    void Awake()
    {
        combat = GetComponent<PlayerCombat>();
        health = GetComponent<PlayerHealth>();
        controller = GetComponent<PlayerController2D>();
    }

    void OnEnable()
    {
        combat.HitLanded += OnHitLanded;
        health.Damaged += OnDamaged;
    }

    void OnDisable()
    {
        combat.HitLanded -= OnHitLanded;
        health.Damaged -= OnDamaged;
        StopFocus(false);
    }

    void OnHitLanded(HitInfo hit, Collider2D target)
    {
        if (target.GetComponentInParent<IHittable>() == null) return;   // spikes give no soul
        AddSoul(soulPerHit);
    }

    void OnDamaged(int remaining) { StopFocus(true); }

    public void AddSoul(int amount)
    {
        int next = Mathf.Clamp(CurrentSoul + amount, 0, maxSoul);
        if (next == CurrentSoul) return;
        CurrentSoul = next;
        if (SoulChanged != null) SoulChanged(CurrentSoul);
    }

    void Update()
    {
        bool wants = Input.GetButton(focusButton);
        bool still = Mathf.Abs(Input.GetAxisRaw("Horizontal")) < moveCancelThreshold;
        bool canFocus = wants && still && controller.IsGrounded && !health.IsDead
                        && CurrentSoul >= focusCost && health.CurrentMasks < health.maxMasks && !combat.IsAttacking;

        if (!canFocus) { if (IsFocusing) StopFocus(true); return; }

        if (!IsFocusing)
        {
            IsFocusing = true;
            focusTimer = 0f;
            controller.MovementLocked = true;
            if (FocusStarted != null) FocusStarted();
        }

        focusTimer += Time.deltaTime;
        if (focusTimer >= focusTime)
        {
            focusTimer = 0f;                       // keep holding to heal the next mask
            AddSoul(-focusCost);
            health.Heal(1);
            if (Focused != null) Focused();
            if (health.CurrentMasks >= health.maxMasks || CurrentSoul < focusCost) StopFocus(false);
        }
    }

    void StopFocus(bool notify)
    {
        if (!IsFocusing) return;
        IsFocusing = false;
        focusTimer = 0f;
        if (controller != null) controller.MovementLocked = false;
        if (notify && FocusCancelled != null) FocusCancelled();
    }
}
