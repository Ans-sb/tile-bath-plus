package com.jajaego.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long LOGO_ENTER_DURATION_MS = 480L;
    private static final long LOGO_SETTLE_DURATION_MS = 180L;
    private static final long SPLASH_EXIT_DURATION_MS = 220L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showAnimatedSplash();
    }

    private void showAnimatedSplash() {
        ViewGroup content = findViewById(android.R.id.content);
        if (content == null) {
            return;
        }

        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(Color.WHITE);
        overlay.setClickable(true);
        overlay.setImportantForAccessibility(FrameLayout.IMPORTANT_FOR_ACCESSIBILITY_NO);

        ImageView wordmark = new ImageView(this);
        wordmark.setImageResource(R.drawable.splash_wordmark);
        wordmark.setAdjustViewBounds(true);
        wordmark.setScaleType(ImageView.ScaleType.FIT_CENTER);
        wordmark.setAlpha(0f);
        wordmark.setScaleX(0.94f);
        wordmark.setScaleY(0.94f);
        wordmark.setTranslationX(-dp(22));

        int logoWidth = Math.round(getResources().getDisplayMetrics().widthPixels * 0.68f);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(
            logoWidth,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        );
        overlay.addView(wordmark, logoParams);
        content.addView(overlay, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        wordmark.animate()
            .alpha(1f)
            .translationX(0f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(LOGO_ENTER_DURATION_MS)
            .setInterpolator(new DecelerateInterpolator(1.8f))
            .withEndAction(() -> wordmark.animate()
                .scaleX(1.025f)
                .scaleY(1.025f)
                .setDuration(LOGO_SETTLE_DURATION_MS)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> overlay.animate()
                    .alpha(0f)
                    .setDuration(SPLASH_EXIT_DURATION_MS)
                    .setInterpolator(new DecelerateInterpolator())
                    .setListener(new AnimatorListenerAdapter() {
                        @Override
                        public void onAnimationEnd(Animator animation) {
                            content.removeView(overlay);
                        }
                    })
                    .start())
                .start())
            .start();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
