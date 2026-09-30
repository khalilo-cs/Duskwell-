package com.zakiadventure.game;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {
    private WebView web;
    private InterstitialAd interstitial;
    private final AtomicBoolean adsStarted = new AtomicBoolean(false);

    /** جسر بسيط لمشاركة اللعبة من داخل الصفحة */
    private class Bridge {
        @JavascriptInterface
        public void share(String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, null));
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null) v.vibrate(android.os.VibrationEffect.createOneShot(Math.max(10, Math.min(ms, 300)), android.os.VibrationEffect.DEFAULT_AMPLITUDE));
            } catch (Exception ignored) {}
        }

        /** تُستدعى من اللعبة بعد إنهاء كل مرحلة؛ نعرض إعلاناً بينياً كل 3 مراحل */
        @JavascriptInterface
        public void levelEnd(int level) {
            if (level % 3 == 0) runOnUiThread(MainActivity.this::showInterstitial);
        }
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0B0B1E"));
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.loadUrl("file:///android_asset/www/index.html");
        hideSystemUi();
        setupConsentAndAds();
    }

    /** نافذة الموافقة (UMP) أولاً، ثم تهيئة الإعلانات فقط إذا سُمح بها */
    private void setupConsentAndAds() {
        final ConsentInformation ci = UserMessagingPlatform.getConsentInformation(this);
        ci.requestConsentInfoUpdate(this, new ConsentRequestParameters.Builder().build(),
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(this, err -> { if (ci.canRequestAds()) startAds(); }),
            err -> { if (ci.canRequestAds()) startAds(); });
        if (ci.canRequestAds()) startAds();
    }

    private void startAds() {
        if (!adsStarted.compareAndSet(false, true)) return;
        MobileAds.initialize(this, status -> loadInterstitial());
    }

    private void loadInterstitial() {
        InterstitialAd.load(this, BuildConfig.ADMOB_INTERSTITIAL_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) { interstitial = ad; }
            @Override public void onAdFailedToLoad(LoadAdError e) { interstitial = null; }
        });
    }

    private void showInterstitial() {
        if (interstitial == null) return;
        interstitial.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { interstitial = null; hideSystemUi(); loadInterstitial(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError e) { interstitial = null; loadInterstitial(); }
        });
        interstitial.show(this);
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    public void onBackPressed() {
        // زر الرجوع: الصفحة تقرر (إيقاف مؤقت/رجوع للقائمة) وإلا نخرج
        web.evaluateJavascript("(window.__zakiBack&&window.__zakiBack())?'1':'0'", v -> {
            if (v == null || !v.contains("1")) finish();
        });
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); hideSystemUi(); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
