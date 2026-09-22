import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { text, model: requestedModel } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Teks tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.split(/\s+/).length < 5) {
      return NextResponse.json(
        { error: 'Teks terlalu pendek untuk dianalisis. Minimal 5 kata.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = requestedModel?.trim() || process.env.OPENROUTER_MODEL || 'inclusionai/ling-3.0-flash-vl:free';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY belum dikonfigurasi di server/Vercel.' },
        { status: 500 }
      );
    }

    const systemPrompt = `Anda adalah sistem pakar analisis teks dan detektor konten AI (AI vs Human Text Classifier) multibahasa yang sangat objektif dan teliti.
Tugas Anda adalah memeriksa apakah teks yang diberikan dibuat/dihasilkan oleh AI (seperti ChatGPT, Claude, Llama, dll.) atau ditulis secara organik oleh manusia.

Karakteristik Teks AI:
- Penggunaan pola kalimat seragam, transisi berulang ("Selain itu", "Penting untuk dicatat", "Sebagai kesimpulan", "Di era modern").
- Struktur sintaks terlalu rapi, minim variasi ritme/panjang kalimat (low burstiness).
- Pilihan kata generik, netral, sangat terprediksi (low perplexity).
- Kurangnya opini subjektif mentah, idiosinkrasi khas manusia, atau nuansa kasual alami.

Karakteristik Teks Manusia:
- Variasi acak dalam panjang kalimat (kadang sangat pendek, kadang panjang berirama).
- Pilihan kata alami, idiom kontekstual, atau ketidaksempurnaan gaya tutur.
- Emosi dan perspektif personal yang natural.

PENTING: Output Anda HARUS berformat JSON murni TANPA markdown wrapper (jangan gunakan \`\`\`json atau \`\`\`), dengan skema:
{
  "aiScore": <angka bulat 0 sampai 100 yang menyatakan kemungkinan teks dibuat AI>,
  "humanScore": <angka bulat 0 sampai 100, hasil 100 - aiScore>,
  "verdict": "<satu dari: 'Sangat Mungkin Dibuat AI' | 'Kemungkinan Campuran AI & Manusia' | 'Sangat Mungkin Ditulis Manusia'>",
  "summary": "<penjelasan ringkas 2-3 kalimat mengenai pola bahasa dan gaya penulisan>",
  "metrics": {
    "burstiness": "<'Rendah (Pola Seragam)' | 'Sedang' | 'Tinggi (Variatif & Dinamis)'>",
    "perplexity": "<'Rendah (Sangat Terprediksi)' | 'Sedang' | 'Tinggi (Kaya Kosakata)'>",
    "formality": "<'Sangat Formal' | 'Semi-Formal' | 'Kasual / Kolokial'>"
  },
  "sentenceBreakdown": [
    {
      "sentence": "<teks kalimat>",
      "classification": "<'ai' | 'mixed' | 'human'>",
      "probabilityAi": <angka 0-100>,
      "reason": "<alasan singkat>"
    }
  ]
}`;

    // Ambil model gratis aktif dari OpenRouter API secara dinamis atau gunakan daftar terverifikasi
    const activeFreeFallbacks = [
      model,
      'inclusionai/ling-3.0-flash-vl:free',
      'inclusionai/ling-3.0-flash-fin:free',
      'inclusionai/ling-3.0-flash-sante:free',
      'nex-agi/nex-n2.5-pro:free',
      'nex-agi/nex-n2.5-mini:free',
      'qwen/qwen3.8-27b:free',
      'liquid/lfm-2.5-2.6b:free',
      'nvidia/nemotron-3.5-lightning:free'
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    let lastError = null;
    let successfulData = null;
    let actualModelUsed = model;

    for (const currentModel of activeFreeFallbacks) {
      try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vercel.app',
            'X-Title': 'AI Detector Tool'
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analisis teks berikut:\n\n"""\n${trimmedText}\n"""` }
            ],
            temperature: 0.1,
            max_tokens: 3000
          })
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          console.warn(`Model ${currentModel} error (${openRouterResponse.status}): ${errorText}`);
          lastError = `(${openRouterResponse.status}): ${errorText}`;
          
          // Jika rate-limited (429) atau 5xx, coba model berikutnya di daftar fallback
          if (openRouterResponse.status === 429 || openRouterResponse.status >= 500) {
            continue;
          } else {
            // Jika error auth atau invalid request, hentikan loop
            break;
          }
        }

        const data = await openRouterResponse.json();
        const rawContent = data.choices?.[0]?.message?.content;

        if (!rawContent) {
          lastError = `Model ${currentModel} mengembalikan konten kosong.`;
          continue;
        }

        let cleanJson = rawContent.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.slice(7);
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.slice(3);
        }
        if (cleanJson.endsWith('```')) {
          cleanJson = cleanJson.slice(0, -3);
        }
        cleanJson = cleanJson.trim();

        try {
          const parsed = JSON.parse(cleanJson);
          successfulData = parsed;
          actualModelUsed = currentModel;
          break; // Berhasil, keluar dari loop
        } catch (parseErr) {
          console.warn(`Gagal parse JSON dari model ${currentModel}:`, rawContent);
          lastError = 'Format respons model tidak sesuai skema JSON.';
          continue;
        }
      } catch (reqErr) {
        lastError = reqErr.message;
        continue;
      }
    }

    if (!successfulData) {
      return NextResponse.json(
        { 
          error: `Semua model OpenRouter sedang sibuk atau terkena rate limit. Detail: ${lastError}` 
        },
        { status: 429 }
      );
    }

    const aiScore = Math.min(100, Math.max(0, Math.round(successfulData.aiScore ?? 50)));
    const humanScore = 100 - aiScore;
    
    return NextResponse.json({
      success: true,
      data: {
        aiScore,
        humanScore,
        modelUsed: actualModelUsed,
        verdict: successfulData.verdict || (aiScore > 70 ? 'Sangat Mungkin Dibuat AI' : aiScore > 35 ? 'Kemungkinan Campuran AI & Manusia' : 'Sangat Mungkin Ditulis Manusia'),
        summary: successfulData.summary || 'Analisis selesai dievaluasi.',
        metrics: successfulData.metrics || {
          burstiness: 'Sedang',
          perplexity: 'Sedang',
          formality: 'Semi-Formal'
        },
        sentenceBreakdown: Array.isArray(successfulData.sentenceBreakdown) ? successfulData.sentenceBreakdown : []
      }
    });

  } catch (error) {
    console.error('Server error in /api/detect:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal pada server.' },
      { status: 500 }
    );
  }
}
