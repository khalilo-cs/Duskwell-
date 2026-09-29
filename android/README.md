# تطبيق أندرويد — مغامرة زاكي

التطبيق غلاف بسيط (WebView) يحمّل ملفات اللعبة من مجلد `../game` ويعمل بلا إنترنت.

## تثبيت الـAPK الجاهز
1. حمّل `zaki-adventure.apk` إلى هاتفك.
2. افتحه، وإن ظهر تنبيه فعّل «السماح بالتثبيت من هذا المصدر».
3. الحد الأدنى: Android 8.0 (API 26).

## إعادة البناء
المتطلبات: JDK 17+ و Android SDK (platforms;android-34 و build-tools;34.0.0) و Gradle 8.9+.
```
export ANDROID_HOME=~/android-sdk
cd android && gradle :app:assembleRelease
# الناتج: app/build/outputs/apk/release/app-release.apk
```

## ملاحظات مهمة
- **التوقيع:** الملف `sideload.keystore` مفتاح للتثبيت المباشر فقط (كلمة السر `zakigame`)، وهو علني في المستودع. **لا ترفع بهذا المفتاح إلى Google Play.** أنشئ مفتاحك الخاص واحفظه بسرية:
  `keytool -genkeypair -keystore my.keystore -alias zaki -keyalg RSA -keysize 2048 -validity 36500`
  ثم عدّل `signingConfigs` في `app/build.gradle`. ولـPlay Store الأفضل إخراج AAB: `gradle :app:bundleRelease`.
- **الأرباح داخل التطبيق:** إعلانات AdSense لا تعمل داخل تطبيقات أندرويد. استخدم Google AdMob (يحتاج إضافة مكتبة الإعلانات ورقم تطبيقك). ويعمل AdSense في نسخة الويب فقط.
- بعد كل تعديل على `game/` أعد البناء ليُنسخ الجديد تلقائياً إلى التطبيق.
