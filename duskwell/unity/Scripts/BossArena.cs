using UnityEngine;

// The room around a boss. Walking in seals the gates and wakes the boss; winning saves a flag,
// opens the gates and reveals the reward. Dying mid-fight puts everything back as it was.
// After the boss is beaten the room stays open and quiet on every later visit.
//
// Setup: a trigger collider a few tiles inside the arena entrance (so the gate can close
// behind the player), gate objects that are solid when active, and an inactive reward
// (usually an AbilityPickup).
[RequireComponent(typeof(Collider2D))]
public class BossArena : MonoBehaviour
{
    public StoneGuardianBoss boss;
    [Tooltip("World flag saved when the boss falls, e.g. boss_guardian.")]
    public string bossFlag = "boss_guardian";
    public GameObject[] gates;
    public GameObject reward;

    PlayerHealth playerHealth;
    bool fighting;

    bool Beaten => GameManager.Instance != null && GameManager.Instance.HasFlag(bossFlag);

    void Reset() { GetComponent<Collider2D>().isTrigger = true; }

    void Start()
    {
        SetGates(false);
        if (reward != null) reward.SetActive(Beaten);           // a collected pickup removes itself
        if (boss != null)
        {
            if (Beaten) boss.gameObject.SetActive(false);
            boss.Defeated += OnBossDefeated;
        }
        GameObject p = GameObject.FindGameObjectWithTag("Player");
        if (p != null) playerHealth = p.GetComponentInParent<PlayerHealth>();
        if (playerHealth != null) playerHealth.Died += OnPlayerDied;
    }

    void OnDestroy()
    {
        if (boss != null) boss.Defeated -= OnBossDefeated;
        if (playerHealth != null) playerHealth.Died -= OnPlayerDied;
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (fighting || Beaten || boss == null || !other.CompareTag("Player")) return;
        fighting = true;
        SetGates(true);
        boss.Activate(other.transform);
    }

    void OnBossDefeated()
    {
        fighting = false;
        if (GameManager.Instance != null) GameManager.Instance.SetFlag(bossFlag);
        SetGates(false);
        if (reward != null) reward.SetActive(true);
        if (boss != null) boss.gameObject.SetActive(false);
    }

    void OnPlayerDied()
    {
        if (!fighting) return;
        fighting = false;
        SetGates(false);
        if (boss != null) boss.ResetBoss();
    }

    void SetGates(bool closed)
    {
        if (gates == null) return;
        foreach (GameObject g in gates) if (g != null) g.SetActive(closed);
    }
}
