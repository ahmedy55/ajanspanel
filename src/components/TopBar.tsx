'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/organizations': { title: 'Organizasyonlar',      subtitle: 'Tüm müşteri firmalarını yönetin' },
  '/licenses':      { title: 'Lisans Yönetimi',      subtitle: 'Plan ve abonelik yönetimi' },
  '/users':         { title: 'Admin Kullanıcılar',   subtitle: 'Ajans personeli erişim yönetimi' },
  '/audit':         { title: 'Audit Log',             subtitle: 'Tüm yönetici işlemlerinin kaydı' },
  '/products':      { title: 'SaaS Ürünler',         subtitle: 'Yönetilen ürün portföyü' },
};

export default function TopBar() {
  const pathname = usePathname();

  // En yakın eşleşen path başlığını bul
  const matchKey = Object.keys(PAGE_TITLES).find(k =>
    pathname === k || pathname.startsWith(k + '/')
  );
  const page = matchKey ? PAGE_TITLES[matchKey] : { title: 'Ajans Paneli', subtitle: '' };

  return (
    <header style={{
      height: '56px',
      background: 'white',
      borderBottom: '1px solid var(--surface-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
        <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}>Ajans Paneli</span>
        <span style={{ color: 'var(--gray-300)' }}>/</span>
        <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>{page.title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Security badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px',
          background: 'var(--success-50)',
          border: '1px solid var(--success-100)',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--success-700)',
        }}>
          <span>🔒</span>
          <span>Güvenli Bağlantı</span>
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 500 }}>
          {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
