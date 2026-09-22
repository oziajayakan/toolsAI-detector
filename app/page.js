'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  FileCheck,
  Zap,
  Activity,
  Compass,
  Award,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

// Circular Radial Gauge Component with Smooth SVG stroke-dashoffset
function RadialGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 20;
    const totalSteps = duration / stepTime;
    const stepIncrement = score / totalSteps;

    const timer = setInterval(() => {
      start += stepIncrement;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference;

  let strokeColor = '#10b981';
  let glowColor = 'rgba(16, 185, 129, 0.5)';
  if (score >= 70) {
    strokeColor = '#ef4444';
    glowColor = 'rgba(239, 68, 68, 0.6)';
  } else if (score >= 35) {
    strokeColor = '#f59e0b';
    glowColor = 'rgba(245, 158, 11, 0.6)';
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 10px ${glowColor})`
          }}
        />
      </svg>
      {/* Center Score Value */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '2.8rem', fontWeight: '800', color: strokeColor, lineHeight: '1', letterSpacing: '-0.03em' }}>
          {animatedScore}%
        </span>
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
          AI Probability
        </span>
      </div>
    </div>
  );
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
  const [filterHighlight, setFilterHighlight] = useState('all'); // 'all' | 'ai' | 'mixed' | 'human'
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
      const chunks = splitTextIntoSmartChunks(inputText, 450);
      let totalAiScore = 0;
      let allSentences = [];
      let aggregatedSummaries = [];
      let metricsCollect = { burstiness: 'Sedang', perplexity: 'Sedang', formality: 'Semi-Formal' };

      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          setProgressStatus(`🔍 Memindai fragmen data (${i + 1}/${chunks.length})...`);
        } else {
          setProgressStatus('⚡ Menghubungi neural engine OpenRouter...');
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

      // Pesta Confetti jika teks 100% Manusia!
      if (finalAiScore < 25) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setResult({
        aiScore: finalAiScore,
        humanScore: finalHumanScore,
        modelUsed: activeModelId,
        chunksProcessed: chunks.length,
        verdict: finalAiScore > 70 
          ? 'Didominasi Mesin AI' 
          : finalAiScore > 35 
          ? 'Campuran AI & Manusia' 
          : 'Tulen Tulisan Manusia',
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

  const getStatusBadge = (score) => {
    if (score >= 70) {
      return {
        label: 'Terdeteksi Pola AI',
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.4)',
        icon: <AlertTriangle size={15} />
      };
    }
    if (score >= 35) {
      return {
        label: 'Sintaks Campuran',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.4)',
        icon: <HelpCircle size={15} />
      };
    }
    return {
      label: 'Organik Manusia',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#34d399',
      border: 'rgba(16, 185, 129, 0.4)',
      icon: <CheckCircle2 size={15} />
    };
  };

  const filteredSentences = result?.sentenceBreakdown?.filter(item => {
    if (filterHighlight === 'all') return true;
    return item.classification === filterHighlight;
  }) || [];

  return (
    <>
      {/* Background Animated Atmosphere Orbs */}
      <div className="bg-ambient-orb-1" />
      <div className="bg-ambient-orb-2" />
      <div className="bg-ambient-orb-3" />
      <div className="cyber-grid" />

      <main style={{ maxWidth: '1320px', margin: '0 auto', padding: '36px 20px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        
        {/* Header Section */}
        <header style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.18))', 
                border: '1px solid rgba(99, 102, 241, 0.4)',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                color: '#c7d2fe',
                marginBottom: '12px',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
              }}>
                <Zap size={14} color="#38bdf8" />
                <span>Next-Gen Deep Syntactic Analyzer</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.15' }}>
                AI Sentinel <span className="neon-gradient-text">Detector Pro</span>
              </h1>
            </div>

            {/* Futuristic Model Selector Glass Card */}
            <div className="glass-panel-futuristic" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>
                  <Cpu size={16} />
                  <span>Neural Model Core:</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Active
                </span>
              </div>
              
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '9px 12px',
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
                  placeholder="Ketik OpenRouter Model ID (misal: anthropic/claude-3.5-sonnet)"
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#f8fafc',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              )}
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '800px', lineHeight: '1.6' }}>
            Deteksi kedalaman teks dengan pemindaian sintaks linguistik (*Perplexity & Burstiness*), dukungan upload file <strong>DOCX & PDF</strong>, serta pemrosesan dokumen panjang tanpa batas.
          </p>
        </header>

        {/* Workspace Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: result ? 'repeat(auto-fit, minmax(420px, 1fr))' : '1fr', gap: '28px', alignItems: 'start' }}>
          
          {/* Left Panel: Input & Scanline Terminal */}
          <section className="glass-panel-futuristic scanline-container" style={{ padding: '26px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Visual Laser Beam while scanning */}
            {loading && <div className="scanline-beam" />}

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#38bdf8" /> Input Dokumen / Konten Teks
              </span>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".docx,.pdf,.txt" 
                  style={{ display: 'none' }} 
                />
                <button 
                  type="button" 
                  className="btn-cyber-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Upload dokumen Word atau PDF"
                >
                  {uploadingFile ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} color="#38bdf8" />}
                  <span>{uploadingFile ? 'Mengekstrak...' : 'Upload Dokumen (.pdf / .docx)'}</span>
                </button>

                <button 
                  type="button" 
                  className="btn-cyber-secondary" 
                  onClick={() => loadSample('ai')}
                  title="Isi contoh teks buatan ChatGPT"
                >
                  Contoh AI
                </button>
                <button 
                  type="button" 
                  className="btn-cyber-secondary" 
                  onClick={() => loadSample('human')}
                  title="Isi contoh tulisan manusia"
                >
                  Contoh Manusia
                </button>
              </div>
            </div>

            {/* File Upload Alert Card */}
            {uploadedFile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.15))',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '0.85rem',
                color: '#67e8f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={18} />
                  <span>File Siap: <strong>{uploadedFile.name}</strong> ({uploadedFile.size})</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setUploadedFile(null); setInputText(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                  title="Hapus file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* Textarea */}
            <div style={{ position: 'relative', flexGrow: 1, minHeight: '320px' }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik, tempel teks artikel/esai berapapun panjangnya, atau upload dokumen di atas untuk menganalisis probabilitas AI..."
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '300px',
                  background: 'rgba(8, 12, 22, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '18px',
                  color: '#f8fafc',
                  fontSize: '1rem',
                  lineHeight: '1.7',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(56, 189, 248, 0.7)';
                  e.target.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Stats Bar & Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
                  {wordCount.toLocaleString()} Kata
                </span>
                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
                  {charCount.toLocaleString()} Karakter
                </span>
                {wordCount > 450 && (
                  <span style={{ color: '#38bdf8', fontWeight: '600' }}>
                    ⚡ Auto-Chunk (~{Math.ceil(wordCount / 450)} batch)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-cyber-secondary"
                  onClick={handleCopy}
                  disabled={!inputText}
                  title="Salin teks"
                >
                  <Copy size={16} />
                  <span>{copyFeedback ? 'Tersalin!' : 'Salin'}</span>
                </button>
                {inputText && (
                  <button 
                    type="button" 
                    className="btn-cyber-secondary" 
                    onClick={() => { setInputText(''); setUploadedFile(null); setResult(null); setError(''); }}
                    title="Kosongkan teks"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn-cyber-primary"
                  onClick={handleAnalyze}
                  disabled={loading || !inputText.trim()}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>{progressStatus || 'Memindai Teks...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Pindai Konten</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                marginTop: '18px',
                padding: '14px 18px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                color: '#fca5a5',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertTriangle size={20} />
                <span>{error}</span>
              </div>
            )}
          </section>

          {/* Right Panel: Results & Animated Visualizer */}
          {result && (
            <section className="glass-panel-futuristic" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Radial Meter Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.6))',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: '20px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}>
                {/* SVG Gauge */}
                <RadialGauge score={result.aiScore} />

                {/* Verdict Badge & Status */}
                <div style={{ textAlign: 'center', minWidth: '200px' }}>
                  {(() => {
                    const badge = getStatusBadge(result.aiScore);
                    return (
                      <div className="pulse-badge" style={{
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        marginBottom: '10px',
                        boxShadow: `0 0 15px ${badge.bg}`
                      }}>
                        {badge.label}
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: '800', letterSpacing: '-0.01em' }}>
                    {result.verdict}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                    Model: <code style={{ color: '#38bdf8' }}>{result.modelUsed}</code>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#10b981', fontWeight: '700' }}>
                    Skor Manusia: {result.humanScore}%
                  </div>
                </div>
              </div>

              {/* Linguistic Metrics Display */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {result.chunksProcessed > 1 && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bagian Diproses</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', marginTop: '4px' }}>{result.chunksProcessed} Chunks</div>
                  </div>
                )}
                {result.metrics && (
                  <>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variasi Ritme</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', marginTop: '4px' }}>{result.metrics.burstiness}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prediktabilitas</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#818cf8', marginTop: '4px' }}>{result.metrics.perplexity}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gaya Bahasa</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#c084fc', marginTop: '4px' }}>{result.metrics.formality}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Syntactic Analysis Summary */}
              <div style={{
                background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08), rgba(99, 102, 241, 0.04))',
                borderLeft: '4px solid #06b6d4',
                padding: '14px 18px',
                borderRadius: '0 12px 12px 0',
                fontSize: '0.94rem',
                lineHeight: '1.65',
                color: '#e2e8f0'
              }}>
                <strong style={{ color: '#38bdf8' }}>Evaluasi Sintaks: </strong>{result.summary}
              </div>

              {/* Sentence Highlights with Filter Tabs */}
              {result.sentenceBreakdown && result.sentenceBreakdown.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color="#38bdf8" /> Sorotan Kalimat ({result.sentenceBreakdown.length})
                    </span>

                    {/* Filter buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setFilterHighlight('all')}
                        style={{
                          background: filterHighlight === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          color: '#f8fafc',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterHighlight('ai')}
                        style={{
                          background: filterHighlight === 'ai' ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#f87171',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🔴 AI
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterHighlight('mixed')}
                        style={{
                          background: filterHighlight === 'mixed' ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🟡 Campuran
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterHighlight('human')}
                        style={{
                          background: filterHighlight === 'human' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '6px',
                          color: '#34d399',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🟢 Manusia
                      </button>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(8, 12, 22, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '18px',
                    lineHeight: '1.9',
                    fontSize: '0.96rem',
                    maxHeight: '360px',
                    overflowY: 'auto'
                  }}>
                    {filteredSentences.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>
                        Tidak ada kalimat pada filter ini.
                      </div>
                    ) : (
                      filteredSentences.map((item, idx) => {
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
                      })
                    )}
                  </div>
                </div>
              )}

            </section>
          )}

        </div>

        {/* Footer */}
        <footer style={{ marginTop: '60px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <p>
            Wes iki 100% <strong>Gratis</strong>. cocote batin dijogo yo lek
          </p>
        </footer>
      </main>
    </>
  );
}
