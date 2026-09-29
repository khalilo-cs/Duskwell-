// إعدادات اللعبة والأرباح — عدّل هذا الملف فقط.
window.GAME_CONFIG = {
  // رابط اللعبة عند المشاركة (اتركه فارغاً ليستخدم رابط الصفحة الحالي)
  shareUrl: 'https://khalilo-cs.github.io/-/game/',

  // ===== الأرباح عبر إعلانات Google AdSense =====
  // بعد قبول موقعك في AdSense ضع هنا رقم الناشر ورقم وحدة الإعلان.
  // ملاحظة: اتركهما فارغين إلى أن يتم قبول حسابك، فلن تظهر أي إعلانات.
  adsense: {
    client: '',   // مثال: 'ca-pub-1234567890123456'
    slot: ''      // مثال: '1234567890'
  },

  // ===== رابط دعم اللاعبين (اختياري): Ko-fi / Patreon / PayPal.me / Buy Me a Coffee =====
  supportUrl: '',
  supportText: 'ادعم صانع اللعبة ☕',

  // دالة اختيارية تُستدعى بعد إنهاء كل مرحلة (مثلاً لعرض إعلان بيني من GameDistribution/Poki SDK)
  onLevelEnd: function (levelNumber) {}
};
