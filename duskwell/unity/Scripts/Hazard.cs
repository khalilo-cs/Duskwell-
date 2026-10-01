using UnityEngine;

// Spikes, thorns, acid. A trigger collider that costs a mask and returns the player to safe ground.
// Tag the object "Hazard" so a downward nail strike bounces off it (see PlayerCombat).
[RequireComponent(typeof(Collider2D))]
public class Hazard : MonoBehaviour
{
    void Reset()
    {
        GetComponent<Collider2D>().isTrigger = true;
    }

    void OnTriggerEnter2D(Collider2D other) { Hurt(other); }
    void OnTriggerStay2D(Collider2D other) { Hurt(other); }

    void Hurt(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        PlayerHealth health = other.GetComponentInParent<PlayerHealth>();
        if (health != null) health.HazardHit();     // ignored while already respawning
    }
}
