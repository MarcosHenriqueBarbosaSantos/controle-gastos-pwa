package br.com.meugastos.bolinha

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ContentValues
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

/** A bolinha por cima dos outros apps. Cada toque salva o print da tela na galeria; tocar e segurar desliga. */
class BolinhaService : Service() {

    private var projecao: MediaProjection? = null
    private var tela: VirtualDisplay? = null
    private var leitor: ImageReader? = null
    private var bolinha: View? = null
    private val mao = Handler(Looper.getMainLooper())
    private lateinit var janelas: WindowManager

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        aviso()   // no Android 14, o serviço precisa estar em primeiro plano antes de pegar a captura
        val codigo = intent?.getIntExtra("codigo", 0) ?: 0
        @Suppress("DEPRECATION")
        val dados: Intent? = intent?.getParcelableExtra("dados")
        if (dados == null || projecao != null) return START_NOT_STICKY
        val mpm = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projecao = mpm.getMediaProjection(codigo, dados)
        projecao?.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() { mao.post { desligar() } }
        }, mao)
        preparaCaptura()
        mostraBolinha()
        return START_NOT_STICKY
    }

    private fun aviso() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel("bolinha", "Bolinha do Meus Gastos", NotificationManager.IMPORTANCE_LOW))
        val n = Notification.Builder(this, "bolinha")
            .setContentTitle("Bolinha do Meus Gastos ligada")
            .setContentText("Toque na bolinha para tirar o print. Toque e segure para desligar.")
            .setSmallIcon(R.drawable.ic_bolinha)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION) else startForeground(1, n)
    }

    private fun medidas(): DisplayMetrics {
        val m = DisplayMetrics()
        janelas = getSystemService(WINDOW_SERVICE) as WindowManager
        if (Build.VERSION.SDK_INT >= 30) {
            val b = janelas.currentWindowMetrics.bounds
            m.widthPixels = b.width(); m.heightPixels = b.height(); m.densityDpi = resources.displayMetrics.densityDpi
        } else {
            @Suppress("DEPRECATION")
            janelas.defaultDisplay.getRealMetrics(m)
        }
        return m
    }

    private fun preparaCaptura() {
        val m = medidas()
        leitor = ImageReader.newInstance(m.widthPixels, m.heightPixels, PixelFormat.RGBA_8888, 2)
        tela = projecao?.createVirtualDisplay("meus-gastos-print", m.widthPixels, m.heightPixels, m.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, leitor?.surface, null, mao)
    }

    private fun mostraBolinha() {
        val d = resources.displayMetrics.density
        val tam = (60 * d).toInt()
        val b = TextView(this).apply {
            text = "MG"; setTextColor(Color.WHITE); textSize = 16f; gravity = Gravity.CENTER
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor("#1F5FBF")); setStroke((3 * d).toInt(), Color.WHITE) }
            elevation = 8 * d
        }
        val p = WindowManager.LayoutParams(tam, tam,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START; x = 0; y = (200 * d).toInt() }
        var x0 = 0; var y0 = 0; var tx = 0f; var ty = 0f; var moveu = false
        val segurar = Runnable { desligar() }
        b.setOnTouchListener { v, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> { x0 = p.x; y0 = p.y; tx = e.rawX; ty = e.rawY; moveu = false; mao.postDelayed(segurar, 1200) }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - tx; val dy = e.rawY - ty
                    if (abs(dx) > 12 * d || abs(dy) > 12 * d) { moveu = true; mao.removeCallbacks(segurar) }
                    if (moveu) { p.x = x0 + dx.toInt(); p.y = y0 + dy.toInt(); janelas.updateViewLayout(v, p) }
                }
                MotionEvent.ACTION_UP -> { mao.removeCallbacks(segurar); if (!moveu) tiraPrint() }
            }
            true
        }
        janelas.addView(b, p)
        bolinha = b
    }

    /** Esconde a bolinha, espera a tela redesenhar, pega a imagem mais nova e salva na galeria. */
    private fun tiraPrint() {
        val b = bolinha ?: return
        b.visibility = View.INVISIBLE
        leitor?.acquireLatestImage()?.close()   // descarta uma imagem antiga que ainda tenha a bolinha
        mao.postDelayed({
            val img = leitor?.acquireLatestImage()
            b.visibility = View.VISIBLE
            if (img == null) { Toast.makeText(this, "Não consegui pegar a tela. Tente de novo.", Toast.LENGTH_SHORT).show(); return@postDelayed }
            try {
                val plano = img.planes[0]
                val passo = plano.pixelStride; val linha = plano.rowStride; val sobra = linha - passo * img.width
                val cheio = Bitmap.createBitmap(img.width + sobra / passo, img.height, Bitmap.Config.ARGB_8888)
                cheio.copyPixelsFromBuffer(plano.buffer)
                val bmp = Bitmap.createBitmap(cheio, 0, 0, img.width, img.height)
                salva(bmp)
                Toast.makeText(this, "Print salvo na galeria (Meus Gastos).", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Não consegui salvar o print: ${e.message}", Toast.LENGTH_LONG).show()
            } finally { img.close() }
        }, 350)
    }

    private fun salva(bmp: Bitmap) {
        val nome = "meus-gastos-" + SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date()) + ".png"
        val v = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, nome)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Meus Gastos")
        }
        val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v) ?: throw IllegalStateException("sem lugar na galeria")
        contentResolver.openOutputStream(uri)?.use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun desligar() {
        bolinha?.let { try { janelas.removeView(it) } catch (_: Exception) {} }
        bolinha = null
        tela?.release(); tela = null
        leitor?.close(); leitor = null
        projecao?.stop(); projecao = null
        Toast.makeText(this, "Bolinha desligada.", Toast.LENGTH_SHORT).show()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        if (bolinha != null || projecao != null) desligar()
        super.onDestroy()
    }
}
