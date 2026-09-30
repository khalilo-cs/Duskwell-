#!/usr/bin/env bash
# يبني ملف AAB جاهزاً للرفع إلى Google Play بمفتاحك الخاص ومعرّفات AdMob الحقيقية.
# الاستخدام:
#   ADMOB_APP_ID=ca-app-pub-XXXX~YYYY ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXX/ZZZZ ./make-play-release.sh
# (بدون المعرّفات تُستخدم معرّفات الاختبار — لا ترفع ذلك لمتجر Play للنشر الفعلي)
set -euo pipefail
cd "$(dirname "$0")"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
KS="${KS:-$HOME/zaki-release.keystore}"
ALIAS="${KEY_ALIAS:-zaki}"
if [ ! -f "$KS" ]; then
  echo ">> لا يوجد مفتاح توقيع. سيتم إنشاؤه الآن في: $KS"
  echo ">> احفظه مع كلمة السر في مكان آمن — بدونه لن تستطيع تحديث اللعبة أبداً!"
  keytool -genkeypair -v -keystore "$KS" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 36500
fi
read -r -s -p "كلمة سر المفتاح: " PASS; echo
gradle :app:bundleRelease \
  -PplayKeystore="$KS" -PplayStorePass="$PASS" -PplayKeyAlias="$ALIAS" -PplayKeyPass="$PASS" \
  ${ADMOB_APP_ID:+-PadmobAppId="$ADMOB_APP_ID"} ${ADMOB_INTERSTITIAL_ID:+-PadmobInterstitialId="$ADMOB_INTERSTITIAL_ID"}
echo ">> الملف الجاهز للرفع: $(pwd)/app/build/outputs/bundle/release/app-release.aab"
