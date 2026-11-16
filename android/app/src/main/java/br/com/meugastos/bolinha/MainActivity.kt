package br.com.meugastos.bolinha

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Teste da bolinha (etapa 1 do plano em docs/plano-android-bolinha.md).
 * Só faz duas coisas: liga uma bolinha por cima dos outros apps e, a cada toque nela, salva o print da tela
 * na galeria (pasta Pictures/Meus Gastos). Serve para ver se a Uber, a 99 e o inDrive deixam tirar print.
 */
class MainActivity : Activity() {

    private val pedeCaptura = 7
    private lateinit var estado: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val d = resources.displayMetrics.density
        val coluna = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((20 * d).toInt(), (28 * d).toInt(), (20 * d).toInt(), (28 * d).toInt())
            setBackgroundColor(Color.parseColor("#F2F5FA"))
        }
        fun texto(t: String, tam: Float, negrito: Boolean = false) = TextView(this).apply {
            text = t; textSize = tam; setTextColor(Color.parseColor("#0B2545"))
            if (negrito) typeface = Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, (12 * d).toInt())
        }
        fun botao(t: String, acao: () -> Unit) = Button(this).apply {
            text = t; isAllCaps = false; textSize = 17f
            setOnClickListener { acao() }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (56 * d).toInt()).apply { bottomMargin = (10 * d).toInt() }
        }
        coluna.addView(texto("Meus Gastos: teste da bolinha", 24f, true))
        coluna.addView(texto(
            "1. Toque em Permitir a bolinha e ligue a opção para o Meus Gastos.\n" +
            "2. Toque em Ligar a bolinha. Quando o Android perguntar, escolha \"Tela inteira\" e toque em Iniciar.\n" +
            "3. Abra a Uber, a 99 e o inDrive na tela de ganhos e toque na bolinha em cada um.\n" +
            "4. Veja na galeria, pasta Meus Gastos, se o print saiu normal ou preto. Mande os prints para o Claude.\n\n" +
            "Toque e segure a bolinha para desligar. Nenhum print sai do aparelho.", 16f))
        coluna.addView(botao("Permitir a bolinha") { pedeSobreposicao() })
        coluna.addView(botao("Ligar a bolinha") { ligar() })
        coluna.addView(botao("Abrir o Meus Gastos") { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://meugastos.com.br/"))) })
        estado = texto("", 15f).apply { gravity = Gravity.START }
        coluna.addView(estado)
        setContentView(ScrollView(this).apply { addView(coluna) })
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 3)
        }
    }

    override fun onResume() {
        super.onResume()
        estado.text = if (Settings.canDrawOverlays(this)) "Bolinha permitida." else "A bolinha ainda não foi permitida."
    }

    private fun pedeSobreposicao() {
        if (Settings.canDrawOverlays(this)) { Toast.makeText(this, "Já está permitido.", Toast.LENGTH_SHORT).show(); return }
        startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
    }

    private fun ligar() {
        if (!Settings.canDrawOverlays(this)) { pedeSobreposicao(); return }
        val mpm = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        @Suppress("DEPRECATION")
        startActivityForResult(mpm.createScreenCaptureIntent(), pedeCaptura)
    }

    @Deprecated("Activity simples, sem AndroidX")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != pedeCaptura) return
        if (resultCode != RESULT_OK || data == null) { estado.text = "A captura de tela não foi permitida. Toque em Ligar a bolinha de novo."; return }
        val i = Intent(this, BolinhaService::class.java).putExtra("codigo", resultCode).putExtra("dados", data)
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i) else startService(i)
        estado.text = "Bolinha ligada. Abra a Uber, a 99 ou o inDrive e toque nela."
        moveTaskToBack(true)
    }
}
