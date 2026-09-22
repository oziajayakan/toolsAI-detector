import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

// Gunakan dynamic require untuk pdf-parse demi kompatibilitas bundler Next.js
const getPdfParse = async () => {
  const mod = await import('pdf-parse');
  return mod.default || mod;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    const filename = file.name || '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    if (filename.endsWith('.pdf')) {
      const pdfParser = await getPdfParse();
      const data = await pdfParser(buffer);
      extractedText = data.text || '';
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (filename.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Harap upload .docx, .pdf, atau .txt' },
        { status: 400 }
      );
    }

    // Bersihkan karakter non-printable berlebihan
    extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Gagal mengekstrak teks atau dokumen dalam keadaan kosong.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      filename,
      text: extractedText,
      wordCount: extractedText.split(/\s+/).length
    });

  } catch (err) {
    console.error('File extraction error:', err);
    return NextResponse.json(
      { error: `Gagal membaca file: ${err.message}` },
      { status: 500 }
    );
  }
}
