using UnityEngine;

// A rock shaken loose from the ceiling: shows a warning first, then falls and shatters on the floor.
// Prefab: rock sprite + trigger collider + this script; "warningMarker" is a child (a faint red
// column or a dust puff) that the script moves down to the floor and shows during the warning.
[RequireComponent(typeof(Collider2D))]
public class FallingRock : MonoBehaviour
{
    [Tooltip("Seconds of warning before the rock drops. Readable warnings make the fight fair.")]
    public float warningTime = 0.7f;
    public GameObject warningMarker;
    public float gravity = 30f;
    public float maxFallSpeed = 25f;
    public int damage = 1;
    public LayerMask groundMask;
    [Tooltip("Distance from the rock's centre to its bottom.")]
    public float radius = 0.5f;
    public GameObject breakEffect;

    float timer;
    float vy;
    bool falling;

    void Reset() { GetComponent<Collider2D>().isTrigger = true; }

    // Extra delay lets a boss drop a staggered line of rocks from one call.
    public void Init(float extraDelay) { timer = -extraDelay; }

    void Start()
    {
        if (warningMarker == null) return;
        RaycastHit2D floor = Physics2D.Raycast(transform.position, Vector2.down, 50f, groundMask);
        if (floor.collider != null) warningMarker.transform.position = floor.point;
        warningMarker.SetActive(true);
    }

    void Update()
    {
        timer += Time.deltaTime;
        if (!falling)
        {
            if (timer < warningTime) return;
            falling = true;
            if (warningMarker != null) warningMarker.SetActive(false);
        }
        vy = Mathf.Max(vy - gravity * Time.deltaTime, -maxFallSpeed);
        float step = vy * Time.deltaTime;
        if (Physics2D.Raycast(transform.position, Vector2.down, radius - step, groundMask).collider != null) { Break(); return; }
        transform.position += new Vector3(0f, step, 0f);
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (!falling || !other.CompareTag("Player")) return;
        IDamageable target = other.GetComponentInParent<IDamageable>();
        if (target != null) target.TakeDamage(damage, transform.position);
        Break();
    }

    void Break()
    {
        if (breakEffect != null) Instantiate(breakEffect, transform.position, Quaternion.identity);
        Destroy(gameObject);
    }
}
