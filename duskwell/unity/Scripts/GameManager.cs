using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Owns the run: death sequence, respawn at the last bench, saving and loading, world flags.
//
// Setup: one GameManager in the scene. Drag in the player's components, the ScreenFader,
// the CameraFollow2D and every Bench (so a save can find its bench again). "startBench" is
// where a new game begins.
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Player")]
    public PlayerHealth playerHealth;
    public PlayerController2D playerController;
    public PlayerSoul playerSoul;

    [Header("World")]
    public CameraFollow2D cameraFollow;
    public ScreenFader fader;
    public Bench startBench;
    public Bench[] benches;

    [Header("Death sequence")]
    [Tooltip("Real seconds of slow motion right after the killing blow.")]
    public float deathSlowMotionTime = 0.8f;
    [Range(0.05f, 1f)] public float deathTimeScale = 0.3f;
    [Tooltip("Real seconds the screen stays black before respawning.")]
    public float blackHoldTime = 0.5f;

    public int Deaths { get; private set; }
    public float PlayTime { get; private set; }
    public Bench CurrentBench { get; private set; }

    readonly HashSet<string> flags = new HashSet<string>();
    bool busy;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
    }

    void OnEnable() { if (playerHealth != null) playerHealth.Died += OnPlayerDied; }
    void OnDisable() { if (playerHealth != null) playerHealth.Died -= OnPlayerDied; }

    void Start()
    {
        CurrentBench = startBench;
        SaveData data = SaveSystem.Load();
        if (data != null) Apply(data);
        if (CurrentBench != null) PlaceAtBench(CurrentBench);
    }

    void Update() { PlayTime += Time.unscaledDeltaTime; }

    // ---------------- flags ----------------
    public bool HasFlag(string id) => flags.Contains(id);
    public void SetFlag(string id) { flags.Add(id); }

    // ---------------- benches ----------------
    public void RestAt(Bench bench)
    {
        CurrentBench = bench;
        playerHealth.Heal(playerHealth.maxMasks);
        if (playerSoul != null) playerSoul.AddSoul(playerSoul.maxSoul);
        SaveSystem.Save(Capture());
    }

    SaveData Capture()
    {
        SaveData d = new SaveData
        {
            benchId = CurrentBench != null ? CurrentBench.benchId : "",
            maxMasks = playerHealth.maxMasks,
            hasDoubleJump = playerController.hasDoubleJump,
            deaths = Deaths,
            playTime = PlayTime,
            flags = new List<string>(flags)
        };
        if (CurrentBench != null) { d.benchX = CurrentBench.SitPosition.x; d.benchY = CurrentBench.SitPosition.y; }
        return d;
    }

    void Apply(SaveData d)
    {
        playerHealth.maxMasks = d.maxMasks;
        playerController.hasDoubleJump = d.hasDoubleJump;
        Deaths = d.deaths;
        PlayTime = d.playTime;
        flags.Clear();
        foreach (string f in d.flags) flags.Add(f);
        if (benches != null)
            foreach (Bench b in benches)
                if (b != null && b.benchId == d.benchId) CurrentBench = b;
    }

    void PlaceAtBench(Bench bench)
    {
        playerHealth.RespawnAt(bench.SitPosition);
        if (cameraFollow != null && bench.roomBounds != null) cameraFollow.SetBounds(bench.roomBounds.bounds, true);
    }

    // ---------------- death ----------------
    void OnPlayerDied()
    {
        if (!busy) StartCoroutine(DeathSequence());
    }

    IEnumerator DeathSequence()
    {
        busy = true;
        Deaths++;
        HitStop.Cancel();
        Time.timeScale = deathTimeScale;                       // the killing blow lingers
        yield return new WaitForSecondsRealtime(deathSlowMotionTime);
        if (fader != null) yield return fader.FadeOut();
        Time.timeScale = 1f;
        if (CurrentBench != null) PlaceAtBench(CurrentBench);
        yield return new WaitForSecondsRealtime(blackHoldTime);
        if (fader != null) yield return fader.FadeIn();
        busy = false;
    }

    public void NewGame()
    {
        SaveSystem.Delete();
        flags.Clear();
        Deaths = 0;
        PlayTime = 0f;
        CurrentBench = startBench;
        if (CurrentBench != null) PlaceAtBench(CurrentBench);
    }
}
