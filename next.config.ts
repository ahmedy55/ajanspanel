import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── Güvenlik Header'ları ──────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking koruması
          { key: 'X-Frame-Options', value: 'DENY' },
          // XSS koruması
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS: 1 yıl, subdomain'ler dahil
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Permissions policy (kamera, mikrofon vb. yasak)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // Admin paneli arama motorlarına kapalı
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },

  // ── TypeScript ────────────────────────────────────────────────────
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
