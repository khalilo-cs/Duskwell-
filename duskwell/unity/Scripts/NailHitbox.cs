using UnityEngine;

// One nail hitbox (side, up or down). Lives on a child of the player with a trigger collider.
// It is enabled only for PlayerCombat.activeTime and forwards everything it touches.
[RequireComponent(typeof(Collider2D))]
public class NailHitbox : MonoBehaviour
{
    PlayerCombat owner;
    Collider2D box;

    public void Init(PlayerCombat combat)
    {
        owner = combat;
        box = GetComponent<Collider2D>();
        box.isTrigger = true;
        box.enabled = false;
    }

    public void SetActive(bool on)
    {
        if (box != null) box.enabled = on;
    }

    // Enter catches new contacts; Stay catches targets already overlapping when the box turns on.
    // PlayerCombat ignores repeats within one swing, so both are safe.
    void OnTriggerEnter2D(Collider2D other) { if (owner != null) owner.OnNailContact(other); }
    void OnTriggerStay2D(Collider2D other) { if (owner != null) owner.OnNailContact(other); }
}
