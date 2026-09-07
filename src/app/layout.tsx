// src/app/layout.tsx — Root layout
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ajans Paneli',
  description: 'SaaS ürünleri için merkezi yönetim paneli',
  robots: 'noindex, nofollow', // Admin paneli arama motorlarına kapalı
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
