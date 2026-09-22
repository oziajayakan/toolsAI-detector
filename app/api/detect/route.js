import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanAndParseJSON(rawContent) {
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
  return JSON.parse(cleanJson);
}

// Analisis langsung via Google Gemini API resmi (1M+ token context, sangat cepat & kuota besar)
async function analyzeWithGemini(trimmedText, systemPrompt, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');

  // Menggunakan gemini-2.5-flash / gemini-1.5-flash dengan jutaan token konteks
  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastErr = null;

  for (const gemModel of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Analisis teks berikut:\n\n"""\n${trimmedText}\n"""` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        lastErr = new Error(`Gemini Error (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastErr = new Error('Gemini mengembalikan teks kosong');
        continue;
      }

      const parsed = cleanAndParseJSON(rawText);
      return { data: parsed, modelUsed: `google/${gemModel}` };
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr || new Error('Gagal memproses dengan Google Gemini');
}

export async function POST(request) {
  try {
    const { 
      text, 
      model: requestedModel,
      userOpenRouterKey,
      userGeminiKey 
    } = await request.json();

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
  "verdict": "<satu dari: 'Didominasi Mesin AI' | 'Campuran AI & Manusia' | 'Tulen Tulisan Manusia'>",
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

    const isGeminiSelected = requestedModel && requestedModel.startsWith('gemini');

    // Jika user memilih Gemini atau mode prioritas Gemini
    if (isGeminiSelected) {
      try {
        const { data: geminiData, modelUsed } = await analyzeWithGemini(trimmedText, systemPrompt, userGeminiKey);
        const aiScore = Math.min(100, Math.max(0, Math.round(geminiData.aiScore ?? 50)));
        return NextResponse.json({
          success: true,
          data: {
            aiScore,
            humanScore: 100 - aiScore,
            modelUsed,
            verdict: geminiData.verdict || (aiScore > 70 ? 'Didominasi Mesin AI' : aiScore > 35 ? 'Campuran AI & Manusia' : 'Tulen Tulisan Manusia'),
            summary: geminiData.summary || 'Analisis selesai dievaluasi.',
            metrics: geminiData.metrics || { burstiness: 'Sedang', perplexity: 'Sedang', formality: 'Semi-Formal' },
            sentenceBreakdown: Array.isArray(geminiData.sentenceBreakdown) ? geminiData.sentenceBreakdown : []
          }
        });
      } catch (gemErr) {
        console.warn('Gemini request direct error:', gemErr.message);
        // Fallback lanjut ke OpenRouter jika memungkinkan
      }
    }

    // Jika memilih OpenRouter atau fallback
    const openRouterApiKey = userOpenRouterKey || process.env.OPENROUTER_API_KEY;
    const model = requestedModel?.trim() || process.env.OPENROUTER_MODEL || 'inclusionai/ling-3.0-flash-vl:free';

    const activeFreeFallbacks = [
      model,
      'inclusionai/ling-3.0-flash-vl:free',
      'inclusionai/ling-3.0-flash-fin:free',
      'inclusionai/ling-3.0-flash-sante:free',
      'nex-agi/nex-n2.5-pro:free',
      'qwen/qwen3.8-27b:free'
    ].filter((m, idx, arr) => Boolean(m) && !m.startsWith('gemini') && arr.indexOf(m) === idx);

    let lastError = null;
    let successfulData = null;
    let actualModelUsed = model;

    if (openRouterApiKey) {
      for (const currentModel of activeFreeFallbacks) {
        try {
          const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
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
            lastError = `(${openRouterResponse.status}): ${errorText}`;
            if (openRouterResponse.status === 429 || openRouterResponse.status >= 500) {
              continue;
            } else {
              break;
            }
          }

          const data = await openRouterResponse.json();
          const rawContent = data.choices?.[0]?.message?.content;
          if (!rawContent) continue;

          const parsed = cleanAndParseJSON(rawContent);
          successfulData = parsed;
          actualModelUsed = currentModel;
          break;
        } catch (reqErr) {
          lastError = reqErr.message;
          continue;
        }
      }
    }

    // Jika OpenRouter gagal atau terkena 429 token limit, otomatis fallback ke Gemini AI resmi
    if (!successfulData && (process.env.GEMINI_API_KEY || userGeminiKey)) {
      try {
        console.log('OpenRouter limit reached, attempting automatic fallback to Google Gemini...');
        const { data: geminiFallback, modelUsed: fallbackModel } = await analyzeWithGemini(trimmedText, systemPrompt, userGeminiKey);
        successfulData = geminiFallback;
        actualModelUsed = `${fallbackModel} (Auto-Fallback)`;
      } catch (gemFallbackErr) {
        console.error('Gemini fallback failed:', gemFallbackErr);
      }
    }

    // Jika SEMUA token limit habis
    if (!successfulData) {
      return NextResponse.json(
        { 
          isTokenExhausted: true,
          error: "token limit kami sudah habis silahkan tunggu besok lagi, atau anda bisa mengganti token openrouter & gemini nya",
          detail: lastError
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
        verdict: successfulData.verdict || (aiScore > 70 ? 'Didominasi Mesin AI' : aiScore > 35 ? 'Campuran AI & Manusia' : 'Tulen Tulisan Manusia'),
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
