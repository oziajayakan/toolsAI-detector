'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Trash2,
  ArrowRight,
  HelpCircle,
  FileText,
  Upload,
  Cpu,
  Layers,
  FileCheck
} from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'inclusionai/ling-3.0-flash-vl:free', name: 'Ling 3.0 Flash VL (Free - Default)', badge: 'Default' },
  { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin (Free)', badge: 'Free' },
  { id: 'nex-agi/nex-n2.5-pro:free', name: 'Nex N2.5 Pro (Free)', badge: 'Free' },
  { id: 'qwen/qwen3.8-27b:free', name: 'Qwen 3.8 27B (Free)', badge: 'Free' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nvidia Nemotron 3.5 Lightning (Free)', badge: 'Free' },
  { id: 'custom', name: '⚙️ Gunakan Custom Model ID...', badge: 'Manual' }
];

const SAMPLE_TEXTS = {
  ai: `Kecerdasan Buatan (AI) telah mengalami perkembangan yang sangat pesat dalam beberapa dekade terakhir. Teknologi ini memiliki potensi besar untuk mengubah berbagai sektor kehidupan manusia, mulai dari kesehatan, pendidikan, hingga industri manufaktur. Selain itu, pemanfaatan algoritma pembelajaran mesin memungkinkan otomatisasi tugas-tugas yang sebelumnya membutuhkan ketelitian tinggi. Sebagai kesimpulan, penting bagi masyarakat global untuk merangkul inovasi ini secara bijak demi kemaslahatan bersama.`,
  human: `Tadi siang pas lagi nongkrong di warkop deket kantor, gue sempet kepikiran gimana cepetnya teknologi sekarang. Rasanya baru kemarin pake hape polifonik, eh sekarang ngetik apapun dijawab sama robot. Tapi jujur, kadang berasa agak ngeri juga sih kalau semua hal serba otomatis, vibe interaksi manusianya jadi rada ilang.`
};

// Fungsi membagi paragraf tanpa batas menjadi chunk per 400 - 600 kata
function splitTextIntoSmartChunks(fullText, maxWordsPerChunk = 450) {
  const paragraphs = fullText.split(/\n+/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = [];
  let currentCount = 0;

  for (const para of paragraphs) {
    const wordsInPara = para.trim().split(/\s+/).length;
    if (currentCount + wordsInPara > maxWordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentCount = wordsInPara;
    } else {
      currentChunk.push(para);
      currentCount += wordsInPara;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }
  return chunks.length > 0 ? chunks : [fullText];
}

export default function HomePage() {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('inclusionai/ling-3.0-flash-vl:free');
  const [customModel, setCustomModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const fileInputRef = useRef(null);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;
  const activeModelId = selectedModel === 'custom' ? customModel.trim() : selectedModel;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengekstrak file.');
      }

      setInputText(data.text);
      setUploadedFile({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
      setResult(null);
    } catch (err) {
      setError(err.message || 'Gagal mengunggah dan membaca file.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Harap masukkan teks atau unggah dokumen terlebih dahulu.');
      return;
    }
    if (wordCount < 5) {
      setError('Teks terlalu pendek. Masukkan minimal 5 kata.');
      return;
    }
    if (!activeModelId) {
      setError('Harap pilih model AI atau masukkan Model ID kustom.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Chunking teks jika sangat panjang (Unlimited paragraphs support)
      const chunks = splitTextIntoSmartChunks(inputText, 450);

      let totalAiScore = 0;
      let allSentences = [];
      let aggregatedSummaries = [];
      let metricsCollect = { burstiness: 'Sedang', perplexity: 'Sedang', formality: 'Semi-Formal' };

      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          setProgressStatus(`Menganalisis bagian ${i + 1} dari ${chunks.length}...`);
        } else {
          setProgressStatus('Menganalisis teks dengan OpenRouter...');
        }

        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunks[i],
            model: activeModelId
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Gagal menganalisis bagian ${i + 1}.`);
        }

        const chunkData = json.data;
        totalAiScore += chunkData.aiScore;
        if (chunkData.summary) aggregatedSummaries.push(chunkData.summary);
        if (chunkData.sentenceBreakdown) {
          allSentences = allSentences.concat(chunkData.sentenceBreakdown);
        }
        if (chunkData.metrics) {
          metricsCollect = chunkData.metrics;
        }
      }

      const finalAiScore = Math.round(totalAiScore / chunks.length);
      const finalHumanScore = 100 - finalAiScore;

      setResult({
        aiScore: finalAiScore,
        humanScore: finalHumanScore,
        modelUsed: activeModelId,
        chunksProcessed: chunks.length,
        verdict: finalAiScore > 70
          ? 'Sangat Mungkin Dibuat AI'
          : finalAiScore > 35
            ? 'Kemungkinan Campuran AI & Manusia'
            : 'Sangat Mungkin Ditulis Manusia',
        summary: aggregatedSummaries.join(' ') || 'Analisis selesai dievaluasi.',
        metrics: metricsCollect,
        sentenceBreakdown: allSentences
      });

    } catch (err) {
      setError(err.message || 'Gagal menghubungi server detektor.');
    } finally {
      setLoading(false);
      setProgressStatus('');
    }
  };

  const handleCopy = () => {
    if (!inputText) return;
    navigator.clipboard.writeText(inputText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const loadSample = (type) => {
    setInputText(SAMPLE_TEXTS[type]);
    setUploadedFile(null);
    setError('');
    setResult(null);
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 35) return '#f59e0b';
    return '#10b981';
  };

  const getStatusBadge = (score) => {
    if (score >= 70) {
      return {
        label: 'Terdeteksi AI',
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.3)',
        icon: <AlertTriangle size={16} />
      };
    }
    if (score >= 35) {
      return {
        label: 'Campuran AI & Manusia',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: <HelpCircle size={16} />
      };
    }
    return {
      label: 'Konten Asli Manusia',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#34d399',
      border: 'rgba(16, 185, 129, 0.3)',
      icon: <CheckCircle2 size={16} />
    };
  };

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px', minHeight: '100vh' }}>

      {/* Top Header & Model Switcher Bar */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              marginBottom: '10px'
            }}>
              <Sparkles size={14} />
              <span>Multi-Model AI Detector (Vercel Ready)</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
              AI Content <span className="gradient-text">Detector Pro</span>
            </h1>
          </div>

          {/* Model Switcher Box */}
          <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#38bdf8', fontWeight: '600' }}>
              <Cpu size={16} />
              <span>Pilih Model AI OpenRouter:</span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: '#1a2234',
                color: '#f3f4f6',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {selectedModel === 'custom' && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Contoh: anthropic/claude-3.5-sonnet"
                style={{
                  background: '#0f172a',
                  color: '#f3f4f6',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            )}
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '750px' }}>
          Dukungan <strong>upload file DOCX & PDF</strong>, analisis teks <strong>tanpa limit panjang</strong> (auto-chunking), dan ganti model AI OpenRouter secara dinamis.
        </p>
      </header>

      {/* Main Grid: Input / Upload & Result */}
      <div style={{ display: 'grid', gridTemplateColumns: result ? 'repeat(auto-fit, minmax(380px, 1fr))' : '1fr', gap: '24px' }}>

        {/* Left Column: Input Box & File Upload */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>

          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={18} color="#38bdf8" /> Input Dokumen / Paragraf
            </span>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* File upload input hidden */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".docx,.pdf,.txt"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                title="Unggah file DOCX, PDF, atau TXT"
              >
                {uploadingFile ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                <span>{uploadingFile ? 'Membaca File...' : 'Upload Dokumen (.docx / .pdf)'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadSample('ai')}
                title="Coba contoh teks AI"
              >
                Sample AI
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadSample('human')}
                title="Coba contoh teks Manusia"
              >
                Sample Manusia
              </button>
            </div>
          </div>

          {/* Uploaded File Indicator Banner */}
          {uploadedFile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '0.85rem',
              color: '#67e8f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={16} />
                <span>File terunggah: <strong>{uploadedFile.name}</strong> ({uploadedFile.size})</span>
              </div>
              <button
                type="button"
                onClick={() => { setUploadedFile(null); setInputText(''); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {/* Main Textarea */}
          <div style={{ position: 'relative', flexGrow: 1, minHeight: '300px' }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik, tempel teks berapapun panjangnya, atau seret file PDF/DOCX ke sini..."
              style={{
                width: '100%',
                height: '100%',
                minHeight: '280px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: 'var(--text-main)',
                fontSize: '0.98rem',
                lineHeight: '1.65',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.6)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          {/* Word / Char Counter & Action Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{wordCount.toLocaleString()} Kata</span> • <span>{charCount.toLocaleString()} Karakter</span>
              {wordCount > 500 && (
                <span style={{ color: '#38bdf8', marginLeft: '8px' }}>
                  (Otomatis dipecah ~{Math.ceil(wordCount / 450)} bagian tanpa limit)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCopy}
                disabled={!inputText}
              >
                <Copy size={16} />
                {copyFeedback ? 'Tersalin!' : 'Salin'}
              </button>
              {inputText && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setInputText(''); setUploadedFile(null); setResult(null); setError(''); }}
                  title="Bersihkan teks"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={loading || !inputText.trim()}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{progressStatus || 'Menganalisis...'}</span>
                  </>
                ) : (
                  <>
                    <span>Deteksi AI</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Right Column: Analysis Result */}
        {result && (
          <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Score Overview Box */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Radial Meter / Big Score */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '3.2rem',
                  fontWeight: '800',
                  color: getScoreColor(result.aiScore),
                  lineHeight: '1'
                }}>
                  {result.aiScore}%
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Probabilitas AI
                </div>
              </div>

              {/* Verdict & Badge */}
              <div style={{ textAlign: 'center', minWidth: '180px' }}>
                {(() => {
                  const badge = getStatusBadge(result.aiScore);
                  return (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: '6px 14px',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      {badge.icon}
                      {badge.label}
                    </div>
                  );
                })()}
                <div style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: '500' }}>
                  {result.verdict}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  Model: {result.modelUsed}
                </div>
              </div>

              {/* Human Score */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '2.4rem',
                  fontWeight: '700',
                  color: '#10b981',
                  lineHeight: '1'
                }}>
                  {result.humanScore}%
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Skor Manusia
                </div>
              </div>
            </div>

            {/* Chunk & Metric Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
              {result.chunksProcessed > 1 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bagian Diproses</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#38bdf8', marginTop: '2px' }}>{result.chunksProcessed} Chunks</div>
                </div>
              )}
              {result.metrics && (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variasi Ritme</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#38bdf8', marginTop: '2px' }}>{result.metrics.burstiness}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prediktabilitas</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#818cf8', marginTop: '2px' }}>{result.metrics.perplexity}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gaya Bahasa</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#c084fc', marginTop: '2px' }}>{result.metrics.formality}</div>
                  </div>
                </>
              )}
            </div>

            {/* Summary Text */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderLeft: '3px solid #06b6d4',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.92rem',
              lineHeight: '1.6',
              color: '#cbd5e1'
            }}>
              <strong>Evaluasi Pola: </strong>{result.summary}
            </div>

            {/* Sentence Breakdown & Highlighting */}
            {result.sentenceBreakdown && result.sentenceBreakdown.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="#38bdf8" /> Sorotan Kalimat ({result.sentenceBreakdown.length})
                  </span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> AI
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Campuran
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Manusia
                    </span>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '16px',
                  lineHeight: '1.85',
                  fontSize: '0.95rem',
                  maxHeight: '360px',
                  overflowY: 'auto'
                }}>
                  {result.sentenceBreakdown.map((item, idx) => {
                    const cls = item.classification === 'ai'
                      ? 'hl-ai'
                      : item.classification === 'mixed'
                        ? 'hl-mixed'
                        : 'hl-human';

                    return (
                      <span
                        key={idx}
                        className={cls}
                        title={`[${item.classification?.toUpperCase() || 'INFO'}] Probabilitas AI: ${item.probabilityAi || 0}% - ${item.reason || ''}`}
                        style={{ marginRight: '6px', cursor: 'help' }}
                      >
                        {item.sentence}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

          </section>
        )}

      </div>

      {/* Footer */}
      <footer style={{ marginTop: '50px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>
          Wes iki 100% <strong>Gratis</strong>. cocote batin dijogo yo lek
        </p>
      </footer>
    </main>
  );
}
