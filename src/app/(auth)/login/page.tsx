'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextPath, setNextPath] = useState('/organizations');

  useEffect(() => {
    const task=setTimeout(()=>{
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'invalid_credentials') setError('E-posta veya şifre hatalı.');
      else if (err === 'unauthorized') setError('Bu kullanıcı platform yöneticisi yetkisine sahip değil.');
      else if (err === 'missing_fields') setError('Lütfen e-posta ve şifrenizi girin.');
      else if (params.get('reason') === 'session_expired') setError('⏰ Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');

      setNextPath(params.get('next') ?? '/organizations');
    }
    },0);
    return ()=>clearTimeout(task);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, next: nextPath }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Giriş yapılamadı.');
        setLoading(false);
        return;
      }

      // Başarılı giriş
      window.location.href = data.redirect || nextPath || '/organizations';
    } catch {
      // JS fetch hata verirse standart HTML formu submit ettir (fallback)
      const form = e.currentTarget;
      form.submit();
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{
        width: '440px',
        maxWidth: '90vw',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '24px',
            boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
          }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.025em' }}>
            Ajans Paneli
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '6px' }}>
            Yönetici girişi — Yalnızca yetkili personel
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

        <form
          action="/api/auth/login"
          method="POST"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <input type="hidden" name="next" value={nextPath} />

          <div>
            <label htmlFor="email" style={{
              display: 'block', fontSize: '0.72rem', fontWeight: 700,
              color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
            }}>
              E-POSTA ADRESİ
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ajans.com"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#fff',
                fontSize: '0.875rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block', fontSize: '0.72rem', fontWeight: 700,
              color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
            }}>
              ŞİFRE
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#fff',
                fontSize: '0.875rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px', padding: '13px',
              background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
            }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '24px',
          fontSize: '0.78rem', color: '#475569',
        }}>
          🔒 Bu panel yalnızca yetkili ajans personeline açıktır.
        </p>
      </div>
    </div>
  );
}
