using UnityEngine;

// A rest point: press Up inside the trigger to sit. Sitting heals fully, refills soul and saves.
// Any movement, jump or attack stands the player up again.
//
// Setup: trigger collider around the bench, a child "sitPoint" where the player's feet go,
// an optional prompt object (for example a small "Rest" label) and the room's camera bounds.
[RequireComponent(typeof(Collider2D))]
public class Bench : MonoBehaviour
{
    [Tooltip("Unique and stable: the save file stores it to find this bench again.")]
    public string benchId = "bench_town";
    public Transform sitPoint;
    public GameObject prompt;
    [Tooltip("Room bounds handed to the camera when the player respawns here.")]
    public BoxCollider2D roomBounds;
    public string interactAxis = "Vertical";

    public Vector3 SitPosition => sitPoint != null ? sitPoint.position : transform.position;
    public bool IsOccupied { get; private set; }

    // Benches register by id so the game manager can find one again after its scene reloads.
    static readonly System.Collections.Generic.Dictionary<string, Bench> registry = new System.Collections.Generic.Dictionary<string, Bench>();
    public static Bench Find(string id) { Bench b; return id != null && registry.TryGetValue(id, out b) ? b : null; }
    void OnEnable() { registry[benchId] = this; }
    void OnDisable() { Bench b; if (registry.TryGetValue(benchId, out b) && b == this) registry.Remove(benchId); }

    PlayerController2D playerInRange;
    bool upWasHeld = true;          // require a fresh press after entering

    void Reset() { GetComponent<Collider2D>().isTrigger = true; }

    void Start() { if (prompt != null) prompt.SetActive(false); }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        playerInRange = other.GetComponentInParent<PlayerController2D>();
        upWasHeld = true;
    }

    void OnTriggerExit2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        if (!IsOccupied) playerInRange = null;
        if (prompt != null) prompt.SetActive(false);
    }

    void Update()
    {
        if (playerInRange == null) return;
        bool upHeld = Input.GetAxisRaw(interactAxis) > 0.5f;
        bool upPressed = upHeld && !upWasHeld;
        upWasHeld = upHeld;

        if (!IsOccupied)
        {
            if (prompt != null) prompt.SetActive(playerInRange.IsGrounded);
            if (upPressed && playerInRange.IsGrounded) Sit();
            return;
        }

        // stand up on any other input
        bool leave = Mathf.Abs(Input.GetAxisRaw("Horizontal")) > 0.5f || Input.GetButtonDown("Jump")
                  || Input.GetAxisRaw(interactAxis) < -0.5f;
        if (leave) StandUp();
    }

    void Sit()
    {
        IsOccupied = true;
        if (prompt != null) prompt.SetActive(false);
        playerInRange.transform.position = SitPosition;
        playerInRange.MovementLocked = true;
        if (GameManager.Instance != null) GameManager.Instance.RestAt(this);
    }

    void StandUp()
    {
        IsOccupied = false;
        if (playerInRange != null) playerInRange.MovementLocked = false;
    }
}
