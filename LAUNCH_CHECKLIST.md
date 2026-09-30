# قائمة الإطلاق — كل ما بقي عليك (حوالي 30 دقيقة + مراجعة Google)

الحسابات التالية يجب أن تنشئها **أنت** بحساب Google الخاص بك (تتطلب هويتك وبيانات دفع/ضرائب وموافقة على الشروط). كل شيء آخر جاهز في المستودع.

## 1) تفعيل موقع الويب (دقيقتان)
GitHub ← المستودع ← Settings ← Pages ← Source: **GitHub Actions**. بعد دقائق تعمل اللعبة على:
`https://khalilo-cs.github.io/-/game/` وملف التثبيت على `.../game/zaki-adventure.apk`.

## 2) أرباح الويب: Google AdSense
1. https://adsense.google.com ← سجّل بموقعك (يفضل نطاق خاص بك).
2. بعد القبول: ضع `client` و`slot` في `game/config.js`، وأضف ملف `ads.txt` في جذر الموقع (تعطيك AdSense سطره).
3. صفحة الخصوصية جاهزة: `game/privacy.html` (ضع بريدك مكان `[ضع بريد التواصل هنا]`).

## 3) أرباح التطبيق: Google AdMob
1. https://admob.google.com ← أنشئ حساباً ← Add app ← Android ← اسم الحزمة: `com.zakiadventure.game`.
2. أنشئ وحدة إعلان **Interstitial** وانسخ: معرّف التطبيق `ca-app-pub-XXXX~YYYY` ومعرّف الوحدة `ca-app-pub-XXXX/ZZZZ`.
3. اربط الحساب ببيانات الدفع والضرائب. (النسخة الحالية تستخدم معرّفات اختبار من Google ولا تربح شيئاً.)
4. اضبط نافذة الموافقة (GDPR) من AdMob ← Privacy & messaging.

## 4) النشر في Google Play (رسوم لمرة واحدة 25$)
1. https://play.google.com/console ← أنشئ حساب مطوّر وأكمل التحقق من الهوية.
2. على جهاز فيه JDK و Android SDK نفّذ من مجلد `android/`:
   ```
   ADMOB_APP_ID=ca-app-pub-XXXX~YYYY ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXX/ZZZZ ./make-play-release.sh
   ```
   سينشئ مفتاح التوقيع الخاص بك (**احفظ نسخة منه وكلمة السر — بدونهما لا يمكنك تحديث اللعبة**) ويخرج `app-release.aab`.
3. Play Console ← Create app ← ارفع الـAAB وأدخل نص وصور المتجر من `android/store/`.
4. أكمل: سياسة الخصوصية (الرابط أعلاه)، Data safety (الإعلانات: نعم، Advertising ID)، Content rating، Target audience (13+ أو 18+)، إعلان أن التطبيق يحتوي إعلانات.
5. الحسابات الشخصية الجديدة تحتاج اختباراً مغلقاً بـ12 مختبراً لمدة 14 يوماً قبل النشر العام (شرط Google).

## 5) للمشاركة على السوشيال
ضع الرابط `https://khalilo-cs.github.io/-/game/` في الوصف، وشارك فيديو قصير للعب. زر «شارك اللعبة» داخل اللعبة جاهز.
