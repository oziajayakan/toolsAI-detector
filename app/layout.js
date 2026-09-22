import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'AI Detector - Analisis Konten AI vs Manusia',
  description: 'Deteksi probabilitas teks AI menggunakan model OpenRouter Ling 3.0 Flash dengan akurasi tinggi dan visualisasi interaktif.',
  keywords: ['AI Detector', 'Deteksi AI', 'OpenRouter', 'Ling 3.0 Flash', 'Humanizer', 'Next.js Vercel'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Adsterra Popunder Script */}
        <Script
          src="https://pl31465123.profitableratecpmnetwork.com/5b/82/bd/5b82bd8e6bd9ab2daf7c225b9b23b017.js"
          strategy="afterInteractive"
        />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
