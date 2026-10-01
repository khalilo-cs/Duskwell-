using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.SceneManagement;

// =====================================================================================
// PlayerController.cs — بطل «أرض الغسق» في Unity (ملف واحد مستقل)
//
// البنية تتبع مشروع DanielDFY / Hollow-Knight-Imitation، لكن الكود مكتوب من جديد:
//   • الحركة بسرعة Rigidbody2D مباشرة، والقيم الافتراضية هي قيم المشروع نفسه:
//     moveSpeed 5، jumpSpeed 7، قفزتان، climbJumpForce (8,10)، fallSpeed 5،
//     sprintSpeed 10 لمدة 0.15 ثانية وانتظار 0.4، وبين الضربات 0.3 ثانية.
//   • لمس الأرض: CircleCast للأسفل على طبقة المنصات (نصف قطر 0.2 ومسافة 0.5).
//   • التشبث بالجدار: اصطدام بجسم وسمه "Wall" في الهواء يوقف الجاذبية ويُنزلق ببطء.
//   • الضربة: CircleCastAll باتجاه الضربة (فوق / أمام / تحت في الهواء)، ثم ارتداد.
//   • أسماء معاملات الـ Animator هي نفسها في المشروع (IsGround, IsRun, IsClimb ...)،
//     فيعمل الـ Animator Controller الخاص بالمشروع كما هو.
//
// إضافات للإحساس الاحترافي (يمكن إطفاؤها كلها من الـ Inspector):
//   زمن الذئب (coyote)، تخزين القفز، جاذبية أثقل في السقوط، سقف لسرعة السقوط،
//   توقّف لحظي عند الضرب (Hit Stop)، اهتزاز الشاشة، جزيئات، أصوات، وأحداث UnityEvent.
//
// الصور: هذا الملف لا يحمل صوراً. ضع رسومك أنت في:
//   Assets/Resources/Hero/<اسم الحالة>/1.png, 2.png, ...   (إطار لكل ملف، مرتبة بالرقم)
// أسماء المجلدات الافتراضية: Idle, Run, Turn, Jump, DoubleJump, Fall, Land, WallCling,
// WallJump, Dash, AttackForward, AttackUp, AttackDown, Hurt, Dead — وتقابل في المشروع
// الأصلي: 待机، 行走، 转向، 一段跳/上升، 二段跳، 一段跳/空中循环، 一段跳/落地، 爬墙/附着،
// 爬墙/爬墙跳跃، 冲刺، 攻击/左右攻击، 攻击/向上攻击، 攻击/向下攻击، 受伤.
// صور المشروع الأصلي مأخوذة من لعبة Hollow Knight وحقوقها لشركة Team Cherry، فلا تُستعمل في لعبة تُنشر.
//
// التصميم المرسوم للبطل (لمن يرسم الإطارات):
//   • القناع: عظم أبيض بظلّ أزرق خفيف من الأسفل، وشرخ رفيع فوق العين الأمامية يتوهج
//     بلون فيروزي خافت، وعينان سوداوان عميقتان في كل منهما لمعة صغيرة، ورمشة كل ~4 ثوانٍ.
//   • القرنان: منحنيان للخلف وللخارج، بخط ظل داخلي على طولهما.
//   • العباءة: كحلي داكن متدرج إلى الأسود، بنسيج قماشي مائل، وطيّات عمودية، وبطانة
//     فيروزية داكنة تظهر عند الحافة الممزقة، وإضاءة خفيفة على الحافة الأمامية.
//   • الوشاح: فيروزي منسوج بخطوط مائلة، وطرفاه يرفرفان خلفه وأطرافهما مفتّتة.
//   • السيف: نصل طويل نحيل فضي بخط مجرى في وسطه ونقوش معينات محفورة على طوله،
//     وواقٍ هلالي عاجي، ومقبض ملفوف بحبل فيروزي، وكُرة عاجية في الطرف.
//     يُحمل على الظهر مائلاً، ويُسحب عند الضربة مع قوس أبيض.
// =====================================================================================

// حالات البطل؛ كل حالة لها مجموعة إطارات وصوت ومعامل Animator
public enum HeroState { Idle, Run, Turn, Jump, DoubleJump, Fall, Land, WallCling, WallJump, Dash, AttackForward, AttackUp, AttackDown, Hurt, Dead }

// أي شيء يُضرب بالسيف يستطيع تنفيذ هذه الواجهة (أعداء، أذرع، صناديق ...)
public interface INailTarget { void OnNailHit(int damage, Vector2 direction); }

// مقطع إطارات لحالة واحدة: يُحمَّل من Resources/<spriteRoot>/<folder>
[Serializable]
public class HeroClip
{
    public HeroState state;
    public string folder;
    [Tooltip("إطارات في الثانية")] public float fps = 12f;
    public bool loop = true;
    [NonSerialized] public Sprite[] frames;
    public HeroClip(HeroState s, string f, float rate, bool repeat) { state = s; folder = f; fps = rate; loop = repeat; }
}

[RequireComponent(typeof(Rigidbody2D), typeof(BoxCollider2D), typeof(SpriteRenderer))]
public class PlayerController : MonoBehaviour
{
    // ------------------------------------------------------------------ الصحة
    [Header("الصحة")]
    public int maxHealth = 5;
    public int health = 5;

    // ------------------------------------------------------------------ الحركة
    [Header("الحركة (القيم الافتراضية من مشروع DanielDFY)")]
    [Tooltip("سرعة المشي الأفقية بوحدة/ثانية")] public float moveSpeed = 5f;
    [Tooltip("سرعة الانطلاق في القفزة؛ الارتفاع ≈ v² / (2 × 9.81 × gravityScale)")] public float jumpSpeed = 7f;
    [Tooltip("عدد القفزات قبل لمس الأرض (2 = قفزة مزدوجة)")] public int maxJumps = 2;
    [Tooltip("دفعة القفز من الجدار: x بعيداً عن الجدار و y للأعلى")] public Vector2 climbJumpForce = new Vector2(8f, 10f);
    [Tooltip("عند ترك زر القفز أثناء الصعود تصبح السرعة العمودية -fallSpeed (سلوك المشروع)")] public float fallSpeed = 5f;
    [Tooltip("سرعة الاندفاع")] public float sprintSpeed = 10f;
    [Tooltip("مدة الاندفاع بالثواني")] public float sprintTime = 0.15f;
    [Tooltip("انتظار بعد الاندفاع قبل التالي")] public float sprintInterval = 0.4f;
    [Tooltip("سرعة الانزلاق على الجدار")] public float wallSlideSpeed = 2f;
    [Tooltip("مدة إيقاف التحكم بعد القفز من الجدار")] public float climbJumpLock = 0.2f;
    [Tooltip("الجاذبية الأساسية للجسم")] public float baseGravityScale = 1f;

    [Header("إحساس احترافي (اجعلها 0 أو 1 لسلوك المشروع الأصلي تماماً)")]
    [Tooltip("ثوانٍ بعد مغادرة الحافة يبقى فيها القفز مسموحاً")] public float coyoteTime = 0.1f;
    [Tooltip("ثوانٍ يُحفظ فيها ضغط القفز قبل لمس الأرض")] public float jumpBufferTime = 0.12f;
    [Tooltip("مضاعف الجاذبية أثناء السقوط (1 = بلا تغيير)")] public float fallGravityMultiplier = 1.5f;
    [Tooltip("أقصى سرعة سقوط")] public float maxFallSpeed = 14f;

    // ------------------------------------------------------------------ القتال
    [Header("القتال")]
    public int nailDamage = 1;
    [Tooltip("الزمن بين ضربتين")] public float attackInterval = 0.3f;
    [Tooltip("مدة وضعية الضربة في الرسوم")] public float attackPoseTime = 0.18f;
    [Tooltip("نصف قطر دائرة الضربة")] public float attackRadius = 0.6f;
    [Tooltip("مدى الضربة")] public float attackDistance = 1.5f;
    [Tooltip("ما يمكن ضربه؛ إن تُرك فارغاً: Enemy + Trap + Switch + Projectile")] public LayerMask hittableLayers;
    public Vector2 attackUpRecoil = new Vector2(0f, -1f);
    public Vector2 attackForwardRecoil = new Vector2(-1f, 0f);
    [Tooltip("الارتداد عند الضرب للأسفل (Pogo)")] public Vector2 attackDownRecoil = new Vector2(0f, 4f);
    [Tooltip("كائنات قوس الضربة (تُفعَّل لحظة الضرب)")] public GameObject attackUpEffect, attackForwardEffect, attackDownEffect;
    public float attackEffectLifeTime = 0.08f;

    [Header("الإحساس عند الضرب: توقف لحظي واهتزاز")]
    public float hitStopOnHit = 0.06f;
    public float shakeOnHit = 0.12f, shakeOnHitTime = 0.12f;
    public float hitStopOnPogo = 0.04f;
    public float shakeOnPogo = 0.08f, shakeOnPogoTime = 0.1f;
    public float hitStopOnHurt = 0.14f;
    public float shakeOnHurt = 0.3f, shakeOnHurtTime = 0.35f;
    [Tooltip("اهتزاز صغير عند هبوط من سقوط سريع")] public float shakeOnHardLanding = 0.05f;

    // ------------------------------------------------------------------ الضرر والموت
    [Header("الضرر والموت")]
    public Color invulnerableColor = new Color(1f, 1f, 1f, 0.7f);
    [Tooltip("ارتداد الإصابة (x بعيداً عن مصدر الضرر)")] public Vector2 hurtRecoil = new Vector2(2f, 2f);
    public float hurtTime = 0.5f;
    public float hurtRecoverTime = 1f;
    public Vector2 deathRecoil = new Vector2(3f, 2f);
    public float deathDelay = 1.5f;
    [Tooltip("طبقة الحصانة المؤقتة كما في المشروع")] public string invulnerableLayer = "PlayerInvulnerable";

    // ------------------------------------------------------------------ التحسس
    [Header("التحسس")]
    [Tooltip("طبقات الأرض؛ إن تُركت فارغة تُستعمل طبقة Platform")] public LayerMask groundLayers;
    public float groundCheckRadius = 0.2f;
    public float groundCheckDistance = 0.5f;
    public string wallTag = "Wall";
    [Tooltip("رسوم المشروع الأصلي تنظر لليسار؛ أطفئه إن كانت رسومك تنظر لليمين")] public bool spriteFacesLeft = true;

    // ------------------------------------------------------------------ الإدخال
    [Header("الأزرار")]
    public KeyCode jumpKey = KeyCode.Space, jumpKeyAlt = KeyCode.Z;
    public KeyCode attackKey = KeyCode.J, attackKeyAlt = KeyCode.X;
    public KeyCode dashKey = KeyCode.K, dashKeyAlt = KeyCode.C;

    // ------------------------------------------------------------------ الرسوم
    [Header("الإطارات (Sprite Sheets)")]
    [Tooltip("شغّل الإطارات من Resources مباشرة؛ أطفئه إن كان الـ Animator Controller يتولى الرسوم")] public bool useSpriteSheets = true;
    public string spriteRoot = "Hero";
    public HeroClip[] clips = {
        new HeroClip(HeroState.Idle, "Idle", 8f, true),
        new HeroClip(HeroState.Run, "Run", 14f, true),
        new HeroClip(HeroState.Turn, "Turn", 20f, false),
        new HeroClip(HeroState.Jump, "Jump", 16f, false),
        new HeroClip(HeroState.DoubleJump, "DoubleJump", 18f, false),
        new HeroClip(HeroState.Fall, "Fall", 10f, true),
        new HeroClip(HeroState.Land, "Land", 20f, false),
        new HeroClip(HeroState.WallCling, "WallCling", 10f, true),
        new HeroClip(HeroState.WallJump, "WallJump", 16f, false),
        new HeroClip(HeroState.Dash, "Dash", 24f, false),
        new HeroClip(HeroState.AttackForward, "AttackForward", 26f, false),
        new HeroClip(HeroState.AttackUp, "AttackUp", 26f, false),
        new HeroClip(HeroState.AttackDown, "AttackDown", 26f, false),
        new HeroClip(HeroState.Hurt, "Hurt", 14f, false),
        new HeroClip(HeroState.Dead, "Dead", 10f, false),
    };

    // ------------------------------------------------------------------ المؤثرات
    [Header("الجزيئات (اسحبها هنا أو ضع Prefabs في Resources/<spriteRoot>/FX)")]
    public ParticleSystem dashParticles;
    public ParticleSystem landDust;
    public ParticleSystem wallDust;
    [Tooltip("شرارة تُنسخ عند نقطة الضرب")] public GameObject hitSparkPrefab;
    [Tooltip("ريشة/غبار يُنسخ عند القفزة المزدوجة")] public GameObject doubleJumpPuffPrefab;

    // ------------------------------------------------------------------ الصوت
    [Header("الأصوات (اتركها فارغة للصمت)")]
    public AudioClip sfxJump, sfxDoubleJump, sfxLand, sfxDash, sfxSlash, sfxSlashHit, sfxPogo, sfxWallCling, sfxWallJump, sfxHurt, sfxDeath, sfxFootstep;
    [Range(0f, 0.3f)] public float pitchJitter = 0.06f;
    [Tooltip("الزمن بين خطوتين أثناء الجري")] public float footstepInterval = 0.28f;

    [Header("أحداث يمكن ربطها من الـ Inspector")]
    public UnityEvent onJump, onDoubleJump, onLand, onDash, onSlash, onHit, onPogo, onWallCling, onHurt, onDeath;

    // ------------------------------------------------------------------ الحالة الداخلية
    Rigidbody2D body;
    BoxCollider2D box;
    SpriteRenderer sprite;
    Animator animator;
    AudioSource audioSource;
    readonly HashSet<string> animatorParams = new HashSet<string>();
    readonly Dictionary<HeroState, HeroClip> clipByState = new Dictionary<HeroState, HeroClip>();

    public HeroState State { get; private set; } = HeroState.Idle;
    public bool IsGrounded { get; private set; }
    public bool IsClimbing { get; private set; }
    public int Facing { get; private set; } = 1;          // 1 يمين، -1 يسار

    bool inputEnabled = true;
    bool attackReady = true;
    bool dashReady = true;
    bool airDashAvailable = true;
    bool dashing;
    bool dead;
    int jumpsLeft;
    int wallDir;                                          // جهة الجدار الملاصق: 1 يمين، -1 يسار
    bool lastJumpWasDouble;
    float coyoteTimer, jumpBufferTimer, turnTimer, landTimer, attackPoseTimer, wallJumpTimer, hurtTimer, footstepTimer, invulnTimer;
    HeroState attackPose = HeroState.AttackForward;
    float lastAirVelocityY;
    int playerLayer;

    // مشغّل الإطارات
    HeroClip currentClip;
    float clipTime;

    // ================================================================== الإعداد
    void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        box = GetComponent<BoxCollider2D>();
        sprite = GetComponent<SpriteRenderer>();
        animator = GetComponent<Animator>();
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null) audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;

        body.gravityScale = baseGravityScale;
        body.freezeRotation = true;
        body.interpolation = RigidbodyInterpolation2D.Interpolate;
        body.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
        playerLayer = gameObject.layer;

        if (groundLayers.value == 0) groundLayers = LayerMask.GetMask("Platform");
        if (hittableLayers.value == 0) hittableLayers = LayerMask.GetMask("Enemy", "Trap", "Switch", "Projectile");

        // نسجّل أسماء معاملات الـ Animator الموجودة فعلاً حتى لا نكتب في معامل غير موجود
        if (animator != null && animator.runtimeAnimatorController != null)
            foreach (AnimatorControllerParameter p in animator.parameters) animatorParams.Add(p.name);

        LoadSpriteSheets();
        LoadEffects();
        foreach (GameObject fx in new[] { attackUpEffect, attackForwardEffect, attackDownEffect }) if (fx != null) fx.SetActive(false);

        health = Mathf.Clamp(health, 1, maxHealth);
        jumpsLeft = maxJumps;
        Face(1);
    }

    // يحمّل إطارات كل حالة من Resources/<spriteRoot>/<folder> ويرتّبها بالرقم في اسم الملف
    void LoadSpriteSheets()
    {
        clipByState.Clear();
        foreach (HeroClip c in clips)
        {
            c.frames = Resources.LoadAll<Sprite>(spriteRoot + "/" + c.folder);
            Array.Sort(c.frames, (a, b) => FrameNumber(a.name).CompareTo(FrameNumber(b.name)));
            clipByState[c.state] = c;
            if (useSpriteSheets && c.frames.Length == 0)
                Debug.LogWarning("PlayerController: لا توجد إطارات في Resources/" + spriteRoot + "/" + c.folder);
        }
    }

    // "12" من "frame_12" أو "12": أول رقم في الاسم، وإلا 0
    static int FrameNumber(string name)
    {
        int value = 0; bool found = false;
        foreach (char ch in name)
        {
            if (ch >= '0' && ch <= '9') { value = value * 10 + (ch - '0'); found = true; }
            else if (found) break;
        }
        return value;
    }

    // الجزيئات غير المسحوبة في الـ Inspector تُحمَّل من Resources/<spriteRoot>/FX
    void LoadEffects()
    {
        string fx = spriteRoot + "/FX/";
        if (dashParticles == null) dashParticles = SpawnParticle(fx + "DashTrail");
        if (landDust == null) landDust = SpawnParticle(fx + "LandDust");
        if (wallDust == null) wallDust = SpawnParticle(fx + "WallDust");
        if (hitSparkPrefab == null) hitSparkPrefab = Resources.Load<GameObject>(fx + "HitSpark");
        if (doubleJumpPuffPrefab == null) doubleJumpPuffPrefab = Resources.Load<GameObject>(fx + "DoubleJumpPuff");
    }

    ParticleSystem SpawnParticle(string path)
    {
        GameObject prefab = Resources.Load<GameObject>(path);
        if (prefab == null) return null;
        GameObject go = Instantiate(prefab, transform);
        go.transform.localPosition = Vector3.zero;
        return go.GetComponent<ParticleSystem>();
    }

    // ================================================================== الحلقة
    void Update()
    {
        float dt = Time.deltaTime;
        TickTimers(dt);
        UpdateGround();

        if (!dead && inputEnabled)
        {
            Move();
            JumpControl();
            FallControl();
            DashControl();
            AttackControl();
        }
        UpdateState();
        AnimateSprites(dt);
    }

    void FixedUpdate()
    {
        if (dead || dashing || IsClimbing) return;
        // جاذبية أثقل أثناء السقوط تزيل الإحساس بالطفو، مع سقف لسرعة السقوط
        body.gravityScale = body.velocity.y < 0f ? baseGravityScale * fallGravityMultiplier : baseGravityScale;
        if (body.velocity.y < -maxFallSpeed) body.velocity = new Vector2(body.velocity.x, -maxFallSpeed);
    }

    void TickTimers(float dt)
    {
        coyoteTimer -= dt; jumpBufferTimer -= dt; turnTimer -= dt; landTimer -= dt;
        attackPoseTimer -= dt; wallJumpTimer -= dt; hurtTimer -= dt; footstepTimer -= dt; invulnTimer -= dt;
    }

    // ================================================================== الأرض
    void UpdateGround()
    {
        bool was = IsGrounded;
        RaycastHit2D hit = Physics2D.CircleCast(body.position, groundCheckRadius, Vector2.down, groundCheckDistance, groundLayers);
        IsGrounded = hit.collider != null && body.velocity.y <= 0.01f;

        if (IsGrounded)
        {
            coyoteTimer = coyoteTime;
            jumpsLeft = maxJumps;
            airDashAvailable = true;
            lastJumpWasDouble = false;
            if (IsClimbing) ExitClimb();
            if (!was) OnLanded();
        }
        else
        {
            if (was && jumpsLeft == maxJumps) jumpsLeft = maxJumps - 1;   // مشى عن الحافة: تبقى القفزة الهوائية فقط
            lastAirVelocityY = body.velocity.y;
        }
        SetBool("IsGround", IsGrounded);
        SetBool("IsDown", !IsGrounded && body.velocity.y < 0f);
    }

    void OnLanded()
    {
        landTimer = 0.1f;
        SetBool("IsJump", false);
        ResetTrigger("IsJumpFirst"); ResetTrigger("IsJumpSecond");
        PlaySfx(sfxLand, 0.8f);
        if (landDust != null) landDust.Play();
        if (lastAirVelocityY < -maxFallSpeed * 0.8f) HeroFeel.Shake(shakeOnHardLanding, 0.12f);
        onLand.Invoke();
    }

    // ================================================================== الحركة الأفقية
    void Move()
    {
        if (dashing) return;
        float x = Input.GetAxisRaw("Horizontal");
        if (IsClimbing)
        {
            // على الجدار: الابتعاد عنه يفلتك، والضغط نحوه يبقيك متشبثاً
            if (x != 0f && Mathf.Sign(x) != wallDir) ExitClimb();
            else return;
        }
        body.velocity = new Vector2(x * moveSpeed, body.velocity.y);

        int dir = x > 0.01f ? 1 : x < -0.01f ? -1 : 0;
        if (dir != 0 && dir != Facing)
        {
            Face(dir);
            if (IsGrounded) { turnTimer = 0.1f; SetTrigger("IsRotate"); }
        }
        if (dir == 0) { SetTrigger("stopTrigger"); ResetTrigger("IsRotate"); }
        else ResetTrigger("stopTrigger");
        SetBool("IsRun", dir != 0 && IsGrounded);

        if (dir != 0 && IsGrounded && footstepTimer <= 0f) { PlaySfx(sfxFootstep, 0.35f); footstepTimer = footstepInterval; }
    }

    void Face(int dir)
    {
        Facing = dir;
        Vector3 s = transform.localScale;
        float mag = Mathf.Abs(s.x) < 0.0001f ? 1f : Mathf.Abs(s.x);
        s.x = (spriteFacesLeft ? -dir : dir) * mag;
        transform.localScale = s;
    }

    // ================================================================== القفز
    bool JumpPressed() { return Input.GetKeyDown(jumpKey) || Input.GetKeyDown(jumpKeyAlt) || Input.GetButtonDown("Jump"); }
    bool JumpReleased() { return Input.GetKeyUp(jumpKey) || Input.GetKeyUp(jumpKeyAlt) || Input.GetButtonUp("Jump"); }

    void JumpControl()
    {
        if (JumpPressed()) jumpBufferTimer = jumpBufferTime;
        if (jumpBufferTimer <= 0f || dashing) return;

        if (IsClimbing) { ClimbJump(); jumpBufferTimer = 0f; }
        else if (IsGrounded || coyoteTimer > 0f) { Jump(false); jumpBufferTimer = 0f; }
        else if (jumpsLeft > 0 && JumpPressed()) { Jump(true); jumpBufferTimer = 0f; }   // القفزة الهوائية لا تُخزَّن
    }

    void Jump(bool airJump)
    {
        body.velocity = new Vector2(body.velocity.x, jumpSpeed);
        coyoteTimer = 0f;
        jumpsLeft = Mathf.Max(0, (airJump ? jumpsLeft : maxJumps) - 1);
        lastJumpWasDouble = airJump;
        SetBool("IsJump", true);
        if (airJump)
        {
            SetTrigger("IsJumpSecond");
            PlaySfx(sfxDoubleJump, 0.9f);
            if (doubleJumpPuffPrefab != null) Destroy(Instantiate(doubleJumpPuffPrefab, transform.position, Quaternion.identity), 1.5f);
            onDoubleJump.Invoke();
        }
        else
        {
            SetTrigger("IsJumpFirst");
            PlaySfx(sfxJump, 0.8f);
            onJump.Invoke();
        }
    }

    // ترك الزر أثناء الصعود يقطع القفزة: هذا ما يعطي القفزة المتغيرة الطول
    void FallControl()
    {
        if (IsClimbing || !JumpReleased()) return;
        if (body.velocity.y > 0f) body.velocity = new Vector2(body.velocity.x, -fallSpeed);
    }

    // ================================================================== الجدار
    void OnCollisionEnter2D(Collision2D collision) { TryCling(collision); }
    void OnCollisionStay2D(Collision2D collision) { if (!IsClimbing) TryCling(collision); }

    void TryCling(Collision2D collision)
    {
        if (dead || IsGrounded || dashing || wallJumpTimer > 0f || !collision.collider.CompareTag(wallTag)) return;
        if (collision.contactCount == 0) return;
        Vector2 normal = collision.GetContact(0).normal;
        if (Mathf.Abs(normal.x) < 0.5f) return;                      // سقف أو أرضية، لا جدار
        EnterClimb(normal.x > 0f ? -1 : 1);
    }

    void OnCollisionExit2D(Collision2D collision)
    {
        if (IsClimbing && collision.collider.CompareTag(wallTag)) ExitClimb();
    }

    void EnterClimb(int side)
    {
        IsClimbing = true;
        wallDir = side;
        body.gravityScale = 0f;
        body.velocity = new Vector2(0f, -wallSlideSpeed);
        jumpsLeft = 1;                                               // قفزة واحدة متبقية بعد التشبث (كالمشروع)
        airDashAvailable = true;
        Face(-side);                                                 // ينظر بعيداً عن الجدار
        SetBool("IsClimb", true);
        PlaySfx(sfxWallCling, 0.6f);
        if (wallDust != null) wallDust.Play();
        onWallCling.Invoke();
    }

    void ExitClimb()
    {
        IsClimbing = false;
        body.gravityScale = baseGravityScale;
        SetBool("IsClimb", false);
        if (wallDust != null) wallDust.Stop();
    }

    void ClimbJump()
    {
        int away = -wallDir;
        ExitClimb();
        body.velocity = Vector2.zero;
        body.AddForce(new Vector2(away * climbJumpForce.x, climbJumpForce.y), ForceMode2D.Impulse);
        Face(away);
        wallJumpTimer = climbJumpLock;
        SetTrigger("IsClimbJump"); SetTrigger("IsJumpFirst"); SetBool("IsJump", true);
        PlaySfx(sfxWallJump, 0.85f);
        StartCoroutine(LockInput(climbJumpLock));
    }

    IEnumerator LockInput(float seconds)
    {
        inputEnabled = false;
        yield return new WaitForSeconds(seconds);
        if (!dead && hurtTimer <= 0f) inputEnabled = true;
        ResetTrigger("IsClimbJump");
    }

    // ================================================================== الاندفاع
    void DashControl()
    {
        bool pressed = Input.GetKeyDown(dashKey) || Input.GetKeyDown(dashKeyAlt) || Input.GetButtonDown("Fire3");
        if (!pressed || !dashReady || dashing) return;
        if (!IsGrounded && !IsClimbing && !airDashAvailable) return;
        StartCoroutine(Dash());
    }

    IEnumerator Dash()
    {
        // من الجدار يندفع بعيداً عنه، وإلا في اتجاه النظر
        int dir = IsClimbing ? -wallDir : Facing;
        if (IsClimbing) ExitClimb();
        if (!IsGrounded) airDashAvailable = false;
        Face(dir);
        dashing = true; dashReady = false; inputEnabled = false;
        body.gravityScale = 0f;
        body.velocity = new Vector2(dir * sprintSpeed, 0f);
        SetTrigger("IsSprint");
        PlaySfx(sfxDash, 0.9f);
        if (dashParticles != null) dashParticles.Play();
        onDash.Invoke();

        float t = 0f;
        while (t < sprintTime && !dead)
        {
            body.velocity = new Vector2(dir * sprintSpeed, 0f);       // يبقى أفقياً تماماً طوال الاندفاع
            t += Time.deltaTime;
            yield return null;
        }
        dashing = false;
        body.gravityScale = baseGravityScale;
        body.velocity = new Vector2(dir * moveSpeed, 0f);
        if (dashParticles != null) dashParticles.Stop();
        if (!dead && hurtTimer <= 0f) inputEnabled = true;

        yield return new WaitForSeconds(sprintInterval);
        dashReady = true;
    }

    // ================================================================== الضربة
    void AttackControl()
    {
        bool pressed = Input.GetKeyDown(attackKey) || Input.GetKeyDown(attackKeyAlt) || Input.GetButtonDown("Fire1");
        if (!pressed || !attackReady || IsClimbing || dashing) return;

        float y = Input.GetAxisRaw("Vertical");
        if (y > 0.3f) Attack(HeroState.AttackUp, Vector2.up, attackUpRecoil, attackUpEffect, "IsAttackUp");
        else if (y < -0.3f && !IsGrounded) Attack(HeroState.AttackDown, Vector2.down, attackDownRecoil, attackDownEffect, "IsAttackDown");
        else
        {
            Vector2 recoil = new Vector2(Facing * attackForwardRecoil.x, attackForwardRecoil.y);    // للخلف عكس النظر
            Attack(HeroState.AttackForward, new Vector2(Facing, 0f), recoil, attackForwardEffect, "IsAttack");
        }
    }

    void Attack(HeroState pose, Vector2 dir, Vector2 recoil, GameObject effect, string trigger)
    {
        attackPose = pose;
        attackPoseTimer = attackPoseTime;
        SetTrigger(trigger);
        PlaySfx(sfxSlash, 0.85f);
        onSlash.Invoke();
        StartCoroutine(AttackRoutine(dir, recoil, effect, pose == HeroState.AttackDown));
    }

    IEnumerator AttackRoutine(Vector2 dir, Vector2 recoil, GameObject effect, bool downward)
    {
        attackReady = false;
        if (effect != null) effect.SetActive(true);

        RaycastHit2D[] hits = Physics2D.CircleCastAll(body.position, attackRadius, dir, attackDistance, hittableLayers);
        bool landed = false, pogo = false;
        foreach (RaycastHit2D h in hits)
        {
            GameObject obj = h.collider.gameObject;
            if (obj == gameObject) continue;
            string layer = LayerMask.LayerToName(obj.layer);
            landed = true;
            SpawnSpark(h.point);

            INailTarget target = obj.GetComponentInParent<INailTarget>();
            if (target != null) target.OnNailHit(nailDamage, dir);
            else if (layer == "Enemy") obj.SendMessage("hurt", nailDamage, SendMessageOptions.DontRequireReceiver);   // أعداء المشروع الأصلي
            else if (layer == "Switch") obj.SendMessage("turnOn", SendMessageOptions.DontRequireReceiver);             // أذرع المشروع الأصلي
            else if (layer == "Projectile") Destroy(obj);

            if (downward && (layer == "Enemy" || layer == "Trap" || layer == "Projectile")) pogo = true;
        }

        if (landed)
        {
            body.velocity = recoil;                                   // ارتداد كما في المشروع
            if (pogo)
            {
                // الارتداد عن عدو أو فخ يعيد القفزة الهوائية والاندفاع
                jumpsLeft = Mathf.Max(jumpsLeft, 1);
                airDashAvailable = true;
                HeroFeel.HitStop(hitStopOnPogo);
                HeroFeel.Shake(shakeOnPogo, shakeOnPogoTime);
                PlaySfx(sfxPogo, 0.9f);
                onPogo.Invoke();
            }
            else
            {
                HeroFeel.HitStop(hitStopOnHit);
                HeroFeel.Shake(shakeOnHit, shakeOnHitTime);
            }
            PlaySfx(sfxSlashHit, 0.9f);
            onHit.Invoke();
        }

        yield return new WaitForSeconds(attackEffectLifeTime);
        if (effect != null) effect.SetActive(false);
        yield return new WaitForSeconds(Mathf.Max(0f, attackInterval - attackEffectLifeTime));
        attackReady = true;
    }

    void SpawnSpark(Vector2 at)
    {
        if (hitSparkPrefab == null) return;
        Vector3 p = at == Vector2.zero ? transform.position : new Vector3(at.x, at.y, transform.position.z);
        Destroy(Instantiate(hitSparkPrefab, p, Quaternion.identity), 1f);
    }

    // ================================================================== الضرر
    // اسم المشروع الأصلي، لتعمل فخاخه وأعداؤه كما هي
    public void hurt(int damage) { TakeDamage(damage, (Vector2)transform.position - new Vector2(Facing, 0f)); }

    public void TakeDamage(int amount, Vector2 sourcePosition)
    {
        if (dead || invulnTimer > 0f) return;                         // ما زال في الحصانة المؤقتة
        invulnTimer = hurtTime + hurtRecoverTime;

        health = Mathf.Max(0, health - amount);
        if (health == 0) { Die(sourcePosition); return; }

        int layer = LayerMask.NameToLayer(invulnerableLayer);
        if (layer >= 0) gameObject.layer = layer;
        hurtTimer = hurtTime;
        if (IsClimbing) ExitClimb();
        SetTrigger("IsHurt");
        sprite.color = invulnerableColor;

        float away = Mathf.Sign(transform.position.x - sourcePosition.x);
        if (away == 0f) away = -Facing;
        body.velocity = Vector2.zero;
        body.AddForce(new Vector2(away * hurtRecoil.x, hurtRecoil.y), ForceMode2D.Impulse);

        HeroFeel.HitStop(hitStopOnHurt);
        HeroFeel.Shake(shakeOnHurt, shakeOnHurtTime);
        PlaySfx(sfxHurt, 1f);
        onHurt.Invoke();
        StartCoroutine(RecoverFromHurt());
    }

    IEnumerator RecoverFromHurt()
    {
        inputEnabled = false;
        yield return new WaitForSeconds(hurtTime);
        if (!dead) inputEnabled = true;
        // وميض أثناء الحصانة
        float t = 0f;
        while (t < hurtRecoverTime && !dead)
        {
            sprite.color = Mathf.Repeat(t, 0.16f) < 0.08f ? invulnerableColor : Color.white;
            t += Time.deltaTime;
            yield return null;
        }
        sprite.color = Color.white;
        gameObject.layer = playerLayer;
    }

    void Die(Vector2 sourcePosition)
    {
        dead = true; inputEnabled = false; dashing = false;
        if (IsClimbing) ExitClimb();
        SetTrigger("IsDead");
        sprite.color = invulnerableColor;
        float away = Mathf.Sign(transform.position.x - sourcePosition.x);
        if (away == 0f) away = -Facing;
        body.gravityScale = baseGravityScale;
        body.velocity = Vector2.zero;
        body.AddForce(new Vector2(away * deathRecoil.x, deathRecoil.y), ForceMode2D.Impulse);
        HeroFeel.HitStop(hitStopOnHurt * 1.5f);
        HeroFeel.Shake(shakeOnHurt * 1.4f, shakeOnHurtTime * 1.5f);
        PlaySfx(sfxDeath, 1f);
        onDeath.Invoke();
        StartCoroutine(DeathRoutine());
    }

    IEnumerator DeathRoutine()
    {
        yield return new WaitForSeconds(deathDelay);
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    // ================================================================== الحالة والرسوم
    void UpdateState()
    {
        HeroState next;
        float vy = body.velocity.y;
        if (dead) next = HeroState.Dead;
        else if (hurtTimer > 0f) next = HeroState.Hurt;
        else if (attackPoseTimer > 0f) next = attackPose;
        else if (dashing) next = HeroState.Dash;
        else if (IsClimbing) next = HeroState.WallCling;
        else if (wallJumpTimer > 0f) next = HeroState.WallJump;
        else if (!IsGrounded) next = vy > 0.05f ? (lastJumpWasDouble ? HeroState.DoubleJump : HeroState.Jump) : HeroState.Fall;
        else if (landTimer > 0f) next = HeroState.Land;
        else if (turnTimer > 0f) next = HeroState.Turn;
        else if (Mathf.Abs(body.velocity.x) > 0.1f) next = HeroState.Run;
        else next = HeroState.Idle;
        State = next;
    }

    void AnimateSprites(float dt)
    {
        if (!useSpriteSheets) return;
        HeroClip clip;
        if (!clipByState.TryGetValue(State, out clip) || clip.frames == null || clip.frames.Length == 0)
        {
            // لا إطارات لهذه الحالة: نستعير الأقرب ليبقى البطل مرسوماً
            HeroState fallback = State == HeroState.DoubleJump ? HeroState.Jump : State == HeroState.WallJump ? HeroState.Jump : State == HeroState.Land || State == HeroState.Turn ? HeroState.Idle : HeroState.Idle;
            if (!clipByState.TryGetValue(fallback, out clip) || clip.frames == null || clip.frames.Length == 0) return;
        }
        if (clip != currentClip) { currentClip = clip; clipTime = 0f; }
        else clipTime += dt;
        int frame = Mathf.FloorToInt(clipTime * clip.fps);
        frame = clip.loop ? frame % clip.frames.Length : Mathf.Min(frame, clip.frames.Length - 1);
        sprite.sprite = clip.frames[frame];
    }

    // ================================================================== أدوات
    void PlaySfx(AudioClip clip, float volume)
    {
        if (clip == null || audioSource == null) return;
        audioSource.pitch = 1f + UnityEngine.Random.Range(-pitchJitter, pitchJitter);
        audioSource.PlayOneShot(clip, volume);
    }

    void SetBool(string name, bool value) { if (animatorParams.Contains(name)) animator.SetBool(name, value); }
    void SetTrigger(string name) { if (animatorParams.Contains(name)) animator.SetTrigger(name); }
    void ResetTrigger(string name) { if (animatorParams.Contains(name)) animator.ResetTrigger(name); }

    // تُستدعى من Animation Events إن كان الـ Animator يتولى الرسوم
    public void AnimEvent_Footstep() { PlaySfx(sfxFootstep, 0.35f); }
    public void AnimEvent_Slash() { PlaySfx(sfxSlash, 0.85f); }

    // رسم دائرة الضربة ودائرة الأرض في المحرر
    void OnDrawGizmosSelected()
    {
        Vector3 p = transform.position;
        Gizmos.color = Color.green;
        Gizmos.DrawWireSphere(p + Vector3.down * groundCheckDistance, groundCheckRadius);
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(p + new Vector3(Facing * attackDistance, 0f, 0f), attackRadius);
        Gizmos.DrawWireSphere(p + Vector3.up * attackDistance, attackRadius);
        Gizmos.DrawWireSphere(p + Vector3.down * attackDistance, attackRadius);
    }
}

// =====================================================================================
// HeroFeel — اهتزاز الشاشة والتوقف اللحظي، بلا أي إعداد في المشهد
//   HeroFeel.Shake(0.12f, 0.12f)  يهز الكاميرا الرئيسية بسعة 0.12 وحدة لمدة 0.12 ثانية
//   HeroFeel.HitStop(0.06f)       يجمّد الزمن 0.06 ثانية حقيقية ثم يعيده كما كان
// يعمل بعد سكربت متابعة الكاميرا (ترتيب تنفيذ متأخر) فيضيف الاهتزاز فوق موضعها.
// =====================================================================================
public static class HeroFeel
{
    static HeroFeelRunner runner;

    static HeroFeelRunner Runner
    {
        get
        {
            if (runner == null)
            {
                GameObject go = new GameObject("HeroFeel");
                UnityEngine.Object.DontDestroyOnLoad(go);
                runner = go.AddComponent<HeroFeelRunner>();
            }
            return runner;
        }
    }

    public static void Shake(float amplitude, float duration)
    {
        if (amplitude <= 0f || duration <= 0f) return;
        Runner.AddShake(amplitude, duration);
    }

    public static void HitStop(float seconds)
    {
        if (seconds <= 0f) return;
        Runner.Freeze(seconds);
    }
}

[DefaultExecutionOrder(10000)]
public class HeroFeelRunner : MonoBehaviour
{
    float shakeAmp, shakeTime, shakeDuration;
    Vector3 basePos, lastApplied;
    bool hasBase;
    float freezeUntil;
    float savedScale = 1f;
    bool frozen;

    public void AddShake(float amplitude, float duration)
    {
        // الاهتزاز الأقوى يحل محل الأضعف؛ الأضعف لا يقطع الأقوى
        float remaining = shakeDuration > 0f ? shakeAmp * (shakeTime / shakeDuration) : 0f;
        if (amplitude < remaining) return;
        shakeAmp = amplitude; shakeDuration = shakeTime = duration;
    }

    public void Freeze(float seconds)
    {
        float until = Time.realtimeSinceStartup + seconds;
        if (!frozen) { savedScale = Time.timeScale > 0f ? Time.timeScale : 1f; frozen = true; }
        if (until > freezeUntil) freezeUntil = until;
        Time.timeScale = 0f;
    }

    void Update()
    {
        // يعتمد على الزمن الحقيقي، فلا يعلق اللعب مجمداً أبداً
        if (frozen && Time.realtimeSinceStartup >= freezeUntil) { Time.timeScale = savedScale; frozen = false; }
    }

    void LateUpdate()
    {
        Camera cam = Camera.main;
        if (cam == null) return;
        Transform t = cam.transform;
        // إن حرّك سكربت آخر الكاميرا هذا الإطار نأخذ موضعها الجديد أساساً
        if (!hasBase || t.position != lastApplied) { basePos = t.position; hasBase = true; }
        Vector3 offset = Vector3.zero;
        if (shakeTime > 0f)
        {
            shakeTime -= Time.unscaledDeltaTime;                    // يستمر الاهتزاز حتى أثناء التجميد
            float k = Mathf.Clamp01(shakeTime / shakeDuration);
            Vector2 r = UnityEngine.Random.insideUnitCircle * shakeAmp * k;
            offset = new Vector3(r.x, r.y, 0f);
        }
        t.position = basePos + offset;
        lastApplied = t.position;
    }
}
