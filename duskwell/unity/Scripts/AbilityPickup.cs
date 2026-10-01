using UnityEngine;

public enum Ability { Dash, WallJump, DoubleJump }

// A glowing relic that grants an ability once. Its flag is saved, so it never reappears.
// Bosses can hold one inactive and switch it on when defeated (see BossArena).
[RequireComponent(typeof(Collider2D))]
public class AbilityPickup : MonoBehaviour
{
    public Ability ability = Ability.Dash;
    [Tooltip("World flag saved when collected, e.g. ability_dash.")]
    public string flagId = "ability_dash";

    // UI listens to this to show the ability's name and controls.
    public static event System.Action<Ability> Collected;

    void Reset() { GetComponent<Collider2D>().isTrigger = true; }

    void Start()
    {
        if (GameManager.Instance != null && GameManager.Instance.HasFlag(flagId)) Destroy(gameObject);
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        Grant(ability, other.gameObject);
        if (GameManager.Instance != null) GameManager.Instance.SetFlag(flagId);
        if (Collected != null) Collected(ability);
        Destroy(gameObject);
    }

    public static void Grant(Ability a, GameObject player)
    {
        switch (a)
        {
            case Ability.Dash:
                PlayerDash dash = player.GetComponentInParent<PlayerDash>();
                if (dash != null) dash.unlocked = true;
                break;
            case Ability.WallJump:
                PlayerWallJump wall = player.GetComponentInParent<PlayerWallJump>();
                if (wall != null) wall.unlocked = true;
                break;
            case Ability.DoubleJump:
                PlayerController2D c = player.GetComponentInParent<PlayerController2D>();
                if (c != null) c.hasDoubleJump = true;
                break;
        }
    }
}
