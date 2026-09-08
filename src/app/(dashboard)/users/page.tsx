'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
}

export default function UsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  function showToast(type: 'success'|'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins);
      } else {
        showToast('error', data.error || 'Admin listesi yüklenemedi.');
      }
    } catch {
      showToast('error', 'Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const task=setTimeout(()=>{void fetchAdmins();},0); return ()=>clearTimeout(task); }, [fetchAdmins]);

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Yeni admin başarıyla eklendi.');
        setShowAdd(false);
        setNewEmail('');
        setNewPassword('');
        fetchAdmins();
      } else {
        showToast('error', data.error || 'Eklenemedi.');
      }
    } catch {
      showToast('error', 'Bağlantı hatası.');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemoveAdmin(userId: string, email: string) {
    if (!confirm(`${email} kullanıcısının admin yetkisini kaldırmak istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Admin yetkisi kaldırıldı.');
        fetchAdmins();
      } else {
        showToast('error', data.error || 'Yetki kaldırılamadı.');
      }
    } catch {
      showToast('error', 'Bağlantı hatası.');
    }
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', padding: '14px 20px', borderRadius: '12px',
          fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Admin Kullanıcılar
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
            Ajans paneline erişim yetkisine sahip yetkili yöneticiler
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}
        >
          + Yeni Admin Yetkilendir
        </button>
      </div>

      {/* Admin List Table */}
      <div style={{
        background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>E-POSTA</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>YETKİ</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>YETKİLENDİRİLME TARİHİ</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SON GİRİŞ</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>İŞLEM</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Yükleniyor...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Yetkili admin bulunamadı.
                </td>
              </tr>
            ) : (
              admins.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8rem',
                      }}>
                        {a.email[0]?.toUpperCase()}
                      </div>
                      {a.email}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      background: '#eff6ff', color: '#2563eb', padding: '4px 10px',
                      borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      Platform Admin
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(a.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b' }}>
                    {a.last_sign_in ? new Date(a.last_sign_in).toLocaleString('tr-TR') : 'Henüz giriş yapmadı'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRemoveAdmin(a.user_id, a.email)}
                      style={{
                        background: 'none', border: '1px solid #fee2e2', color: '#ef4444',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Yetkiyi Kaldır
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Yeni Admin Ekle */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', width: '420px', borderRadius: '20px',
            padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Yeni Admin Yetkilendir
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '24px' }}>
              Platform yönetimi için yeni bir yönetici yetkilendirin.
            </p>

            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  E-POSTA ADRESİ
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin2@ajans.com"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  ŞİFRE (Yeni kullanıcı ise)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="En az 8 karakter"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    color: '#64748b', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#fff', fontWeight: 700, cursor: addLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addLoading ? 'Ekleniyor...' : 'Yetkilendir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
