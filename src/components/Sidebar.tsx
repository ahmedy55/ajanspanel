'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY!
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/organizations', label: 'Organizasyonlar',   icon: '🏢' },
  { href: '/licenses',      label: 'Lisans Yönetimi',   icon: '🎫' },
  { href: '/users',         label: 'Admin Kullanıcılar', icon: '👥' },
  { href: '/audit',         label: 'Audit Log',          icon: '📋' },
  { href: '/products',      label: 'Ürünler',            icon: '📦' },
];

export default function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await getSupabaseClient().auth.signOut();
    router.push('/login');
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minHeight: '100vh',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            flexShrink: 0,
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Ajans Paneli
            </div>
            <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 500, marginTop: '1px' }}>
              Süper Yönetim
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{
          fontSize: '0.62rem', fontWeight: 700, color: '#334155',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '8px 10px 4px',
        }}>
          YÖNETİM
        </div>
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--sidebar-text)',
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          id="signout-btn"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '9px 12px',
            background: 'transparent', border: 'none',
            borderRadius: '10px', cursor: 'pointer',
            color: '#475569', fontSize: '0.875rem', fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
        >
          <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>🚪</span>
          <span>{signingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}</span>
        </button>
      </div>
    </aside>
  );
}
