using UnityEngine;

// A ground wave sent out by a slam. Travels along the floor, hurts on touch, and breaks on a wall.
// Prefab: sprite + trigger collider + this script (+ a Kinematic Rigidbody2D for reliable triggers).
[RequireComponent(typeof(Collider2D))]
public class Shockwave : MonoBehaviour
{
    public float speed = 10f;
    public float lifetime = 1.6f;
    public int damage = 1;
    public LayerMask wallMask;
    [Tooltip("Look-ahead distance for walls; the wave breaks when one is this close.")]
    public float wallCheckDistance = 0.4f;

    int dir = 1;
    float age;

    void Reset() { GetComponent<Collider2D>().isTrigger = true; }

    public void Launch(int direction, float waveSpeed)
    {
        dir = direction >= 0 ? 1 : -1;
        speed = waveSpeed;
        Vector3 s = transform.localScale;
        s.x = Mathf.Abs(s.x) * dir;
        transform.localScale = s;
    }

    void Update()
    {
        age += Time.deltaTime;
        transform.position += new Vector3(dir * speed * Time.deltaTime, 0f, 0f);
        bool wall = Physics2D.Raycast(transform.position, new Vector2(dir, 0f), wallCheckDistance, wallMask).collider != null;
        if (age >= lifetime || wall) Destroy(gameObject);
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        IDamageable target = other.GetComponentInParent<IDamageable>();
        if (target != null) target.TakeDamage(damage, transform.position);
    }
}
