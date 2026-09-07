'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const DEFAULT_PANEL_URL = 'https://rkhbflecouhdxylihbyq.supabase.co';
const DEFAULT_PANEL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGJmbGVjb3VoZHh5bGloYnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk0NjMsImV4cCI6MjEwNDEwNTQ2M30.ipr_CxpcpnbrC6dZLgqEg0l_178KXDuApihnUYpV8b0';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL || DEFAULT_PANEL_URL,
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY || DEFAULT_PANEL_ANON
  );
}

export default function MfaPage() {
  const router = useRouter();
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = getSupabaseClient();

    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      if (!totpFactor) {
        router.push('/organizations');
        return;
      }

      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeErr || !challengeData) {
        setError('MFA challenge başlatılamadı.');
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId:    totpFactor.id,
        challengeId: challengeData.id,
        code:        code.replace(/\s/g, ''),
      });

      if (verifyErr) {
        setError('Kod hatalı veya süresi dolmuş. Tekrar deneyin.');
        return;
      }

      router.push('/organizations');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    }}>
      <div style={{
        width: '420px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.4s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '24px',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}>
            🔐
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            İki Faktörlü Doğrulama
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '8px' }}>
            Google Authenticator&apos;daki 6 haneli kodu girin
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            color: '#f87171', fontSize: '0.84rem', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block', fontSize: '0.72rem', fontWeight: 700,
              color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
            }}>
              DOĞRULAMA KODU
            </label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]*"
              maxLength={7}
              required
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="000 000"
              style={{
                width: '100%', padding: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: '#fff',
                fontSize: '1.5rem', fontWeight: 700,
                letterSpacing: '0.3em', textAlign: 'center', outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            id="mfa-verify-btn"
            type="submit"
            disabled={loading || code.replace(/\s/g, '').length < 6}
            style={{
              marginTop: '8px', padding: '13px',
              background: (loading || code.replace(/\s/g, '').length < 6)
                ? 'rgba(99,102,241,0.4)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontWeight: 700, fontSize: '0.95rem',
              cursor: (loading || code.replace(/\s/g, '').length < 6) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Doğrulanıyor...' : 'Doğrula →'}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          style={{
            display: 'block', width: '100%', marginTop: '16px',
            background: 'none', border: 'none', color: '#475569',
            fontSize: '0.84rem', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Farklı hesapla giriş yap
        </button>
      </div>
    </div>
  );
}
