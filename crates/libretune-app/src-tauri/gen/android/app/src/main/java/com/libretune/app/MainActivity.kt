package com.libretune.app

import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Draws the WebView, scaled down, into a JPEG for the page switcher's cards.
 * The page calls snapshot() and gets the picture back through
 * window.__metroSnapshotDone(token, dataUrl) - asynchronously, because the
 * call arrives on a binder thread and drawing must happen on the UI thread;
 * blocking the page while the WebView draws itself could deadlock. An empty
 * dataUrl means no picture (the page keeps its icon card).
 */
private class SnapshotBridge(private val webView: WebView) {
  @JavascriptInterface
  fun snapshot(token: String, maxWidth: Int) {
    webView.post {
      val url = try {
        capture(maxWidth)
      } catch (e: Throwable) {
        ""
      }
      webView.evaluateJavascript(
        "window.__metroSnapshotDone && window.__metroSnapshotDone(${JSONObject.quote(token)}, ${JSONObject.quote(url)})",
        null,
      )
    }
  }

  private fun capture(maxWidth: Int): String {
    val w = webView.width
    val h = webView.height
    if (w <= 0 || h <= 0) return ""
    val scale = minOf(1f, maxWidth.coerceAtLeast(64).toFloat() / w)
    val bmp = Bitmap.createBitmap(
      (w * scale).toInt().coerceAtLeast(1),
      (h * scale).toInt().coerceAtLeast(1),
      Bitmap.Config.ARGB_8888,
    )
    try {
      val canvas = Canvas(bmp)
      canvas.scale(scale, scale)
      canvas.translate(-webView.scrollX.toFloat(), -webView.scrollY.toFloat())
      webView.draw(canvas)
      val out = ByteArrayOutputStream()
      bmp.compress(Bitmap.CompressFormat.JPEG, 72, out)
      return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    } finally {
      bmp.recycle()
    }
  }
}

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    // Truly fullscreen: draw into the camera cutout too, in either
    // orientation. Padding for it left a black bar along that edge; the
    // notch covering a sliver of the page is the lesser evil (owner's call).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }
    hideSystemBars()
    // The status/navigation bars are hidden (zero insets), but keep the page
    // clear of them if they are ever shown for good, and of the on-screen
    // keyboard, which would otherwise cover the field being typed into.
    ViewCompat.setOnApplyWindowInsetsListener(findViewById<View>(android.R.id.content)) { v, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
      WindowInsetsCompat.CONSUMED
    }
  }

  // Fullscreen: every pixel goes to tables and gauges. A swipe from the edge
  // shows the bars briefly, over the app, without resizing it.
  private fun hideSystemBars() {
    WindowCompat.getInsetsController(window, window.decorView).apply {
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      hide(WindowInsetsCompat.Type.systemBars())
    }
  }

  // Dialogs, the USB permission prompt and the folder picker can bring the
  // bars back; hide them again whenever the app regains focus.
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) hideSystemBars()
  }

  override fun onWebViewCreate(webView: WebView) {
    // The Windows Phone build is laid out for the phone. index.html sets the
    // viewport width (the "display density" setting divides it), so the wide
    // viewport must be honoured; pinch-zoom stays off, as in a native app.
    webView.settings.useWideViewPort = true
    webView.settings.loadWithOverviewMode = true
    webView.settings.builtInZoomControls = false
    webView.settings.displayZoomControls = false

    // Screenshots of open pages for the "open pages" switcher (metro/snapshots.ts).
    webView.addJavascriptInterface(SnapshotBridge(webView), "LibreTuneNative")

    // Back first walks the page's own history - a fullscreen dashboard pushes
    // an entry, so Back leaves fullscreen (utils/dashboardFullscreen.ts).
    // By default Back with no page history finishes the activity, and Tauri
    // exits the process with it - dropping any live ECU connection or unsaved
    // tune on one stray press. Send the app to the background instead, like
    // Home. Registered after Wry's own callback, so it takes precedence.
    //
    // The page is asked first (window.__metroBack, src/metro/nav.ts): the
    // WebView's own goBack() skips history entries added without a tap, such
    // as the page a swipe opened, and Back then left the app instead of the
    // page. The page's own history.back() does not skip them.
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        webView.evaluateJavascript("(window.__metroBack ? window.__metroBack() : false)") { handled ->
          if (handled == "true") return@evaluateJavascript
          if (webView.canGoBack()) webView.goBack() else moveTaskToBack(true)
        }
      }
    })
  }
}
