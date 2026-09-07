'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OrgRow } from '@/lib/rpc/organizations';
import type { ProductId } from '@/lib/supabase/products';
import { PRODUCT_LIST } from '@/lib/supabase/products';

const STATUS_LABELS: Record<string, string> = {
  active:    'Aktif',
  trial:     'Deneme',
  suspended: 'Askıya Alındı',
  cancelled: 'İptal',
};
const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', free: 'Free', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
};

export default function OrganizationsPage() {
  const [productId,  setProductId]  = useState<ProductId>('audipro');
  const [orgs,       setOrgs]       = useState<OrgRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg,    setEditOrg]    = useState<OrgRow | null>(null);

  // Create form
  const [newName,          setNewName]          = useState('');
  const [newPlan,          setNewPlan]          = useState('pro');
  const [newMaxUsers,      setNewMaxUsers]      = useState(5);
  const [newMaxBranches,   setNewMaxBranches]   = useState(2);
  const [newAdminEmail,    setNewAdminEmail]    = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [createLoading,    setCreateLoading]    = useState(false);

  // Created credentials modal
  const [createdInfo, setCreatedInfo] = useState<{
    orgName: string;
    email: string;
    password?: string;
    loginUrl: string;
  } | null>(null);

  // Edit form
  const [editPlan,        setEditPlan]        = useState('pro');
  const [editStatus,      setEditStatus]      = useState('active');
  const [editMaxUsers,    setEditMaxUsers]    = useState(5);
  const [editMaxBranches, setEditMaxBranches] = useState(2);
  const [editLoading,     setEditLoading]     = useState(false);

  const [toast, setToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  function showToast(type: 'success'|'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations?productId=${productId}`);
      const data = await res.json();
      if (data.success) setOrgs(data.organizations);
      else showToast('error', data.error ?? 'Veri yüklenemedi.');
    } catch {
      showToast('error', 'Sunucu bağlantısı kurulamadı.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          name: newName,
          plan_type: newPlan,
          max_users: newMaxUsers,
          max_branches: newMaxBranches,
          adminEmail: newAdminEmail.trim() || undefined,
          adminPassword: newAdminPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `"${newName}" başarıyla oluşturuldu.`);
        setShowCreate(false);

        // Eğer kullanıcı bilgisi girildiyse bilgi kutusunu aç
        if (newAdminEmail) {
          setCreatedInfo({
            orgName: newName,
            email: newAdminEmail.trim(),
            password: newAdminPassword,
            loginUrl: 'https://isitme-merkezi.vercel.app',
          });
        }

        setNewName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        fetchOrgs();
      } else {
        showToast('error', data.error ?? 'Oluşturulamadı.');
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrg) return;
    setEditLoading(true);
    try {
      const res = await fetch('/api/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId, orgId: editOrg.id,
          plan_type: editPlan, subscription_status: editStatus,
          max_users: editMaxUsers, max_branches: editMaxBranches,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Lisans güncellendi.');
        setEditOrg(null);
        fetchOrgs();
      } else {
        showToast('error', data.error ?? 'Güncellenemedi.');
      }
    } finally {
      setEditLoading(false);
    }
  }

  function openEdit(org: OrgRow) {
    setEditOrg(org);
    setEditPlan(org.plan_type || org.plan);
    setEditStatus(org.subscription_status);
    setEditMaxUsers(org.max_users);
    setEditMaxBranches(org.max_branches);
  }

  const filtered = orgs.filter(o => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.subscription_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:      orgs.length,
    active:     orgs.filter(o => o.subscription_status === 'active').length,
    trial:      orgs.filter(o => (o.plan_type === 'trial' || o.subscription_status === 'trial')).length,
    suspended:  orgs.filter(o => o.subscription_status === 'suspended').length,
  };

  return (
    <div className="page-container">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 2000,
          padding: '14px 20px',
          background: toast.type === 'success' ? 'var(--success-600)' : 'var(--error-600)',
          color: '#fff', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'slideIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Organizasyonlar</h1>
          <p className="page-subtitle">Tüm müşteri firmalarını yönetin</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Ürün Değiştirici */}
          <select
            className="form-input"
            style={{ width: 'auto', fontWeight: 600 }}
            value={productId}
            onChange={e => setProductId(e.target.value as ProductId)}
          >
            {PRODUCT_LIST.map(p => (
              <option key={p.id} value={p.id} disabled={p.status === 'coming_soon'}>
                {p.icon} {p.name} {p.status === 'coming_soon' ? '(Yakında)' : ''}
              </option>
            ))}
          </select>

          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Yeni Firma
          </button>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="stat-card">
          <div className="stat-label">TOPLAM FİRMA</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AKTİF ABONELİK</div>
          <div className="stat-value" style={{ color: 'var(--success-600)' }}>{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DENEME SÜRÜMÜ</div>
          <div className="stat-value" style={{ color: 'var(--warning-600)' }}>{stats.trial}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ASKIYA ALINMIŞ</div>
          <div className="stat-value" style={{ color: 'var(--error-600)' }}>{stats.suspended}</div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          className="form-input"
          style={{ maxWidth: '320px' }}
          placeholder="Firma adı veya slug ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-input"
          style={{ maxWidth: '180px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="trial">Deneme</option>
          <option value="suspended">Askıya Alındı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>FİRMA / SLUG</th>
              <th>PLAN</th>
              <th>DURUM</th>
              <th>KULLANICI LİMİTİ</th>
              <th>ŞUBE LİMİTİ</th>
              <th>KAYIT TARİHİ</th>
              <th style={{ textAlign: 'right' }}>İŞLEM</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Yükleniyor...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Henüz organizasyon yok.</td></tr>
            ) : (
              filtered.map(org => {
                const planKey = org.plan_type || org.plan;
                return (
                  <tr key={org.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{org.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>/{org.slug}</div>
                    </td>
                    <td>
                      <span className={`badge badge-plan-${planKey}`}>
                        {PLAN_LABELS[planKey] ?? planKey}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${org.subscription_status}`}>
                        {STATUS_LABELS[org.subscription_status] ?? org.subscription_status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-700)', fontWeight: 500 }}>
                      {org.active_user_count ?? 0} / {org.max_users}
                    </td>
                    <td style={{ color: 'var(--gray-700)', fontWeight: 500 }}>
                      {org.active_branch_count ?? 0} / {org.max_branches}
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.84rem' }}>
                      {org.created_at ? new Date(org.created_at).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(org)}>
                        Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-800)', marginBottom: '8px' }}>
              Yeni Organizasyon Oluştur
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--gray-500)', marginBottom: '20px' }}>
              Müşteri firmayı tanımlayın ve dilerse ilk yönetici hesabını anında oluşturun.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">FİRMA ADI</label>
                <input
                  required
                  className="form-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="örn. Samsun İşitme Merkezi"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">PLAN TİPİ</label>
                  <select className="form-input" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                    <option value="trial">Trial (Deneme)</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">ŞUBE LİMİTİ</label>
                  <input type="number" min={1} required className="form-input" value={newMaxBranches} onChange={e => setNewMaxBranches(+e.target.value)} />
                </div>
              </div>

              <div>
                <label className="form-label">KULLANICI LİMİTİ</label>
                <input type="number" min={1} required className="form-input" value={newMaxUsers} onChange={e => setNewMaxUsers(+e.target.value)} />
              </div>

              {/* Kurucu Yetkili Bilgileri */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '4px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af', marginBottom: '4px' }}>
                  🔑 İlk Yönetici Giriş Hesabı (Opsiyonel)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>
                  Firmanın sisteme ilk kez giriş yapacağı yönetici hesabı ve şifresi
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>YÖNETİCİ E-POSTA</label>
                    <input
                      type="email"
                      className="form-input"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      placeholder="yonetici@firma.com"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>GİRİŞ ŞİFRESİ</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      placeholder="örn. Firma2026!Secure"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>Vazgeç</button>
                <button type="submit" className="btn-primary" disabled={createLoading} style={{ flex: 1, justifyContent: 'center' }}>
                  {createLoading ? 'Oluşturuluyor...' : 'Kaydet ve Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CREDENTIALS MODAL */}
      {createdInfo && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px', textAlign: 'left' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎉</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Firma Başarıyla Oluşturuldu!
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Müşterinize iletebileceğiniz giriş bilgileri hazırlandı.
              </p>
            </div>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '12px', padding: '16px', marginBottom: '20px',
              fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e293b',
              lineHeight: '1.6',
            }}>
              <div><strong>Firma:</strong> {createdInfo.orgName}</div>
              <div><strong>Giriş Linki:</strong> {createdInfo.loginUrl}</div>
              <div><strong>E-Posta:</strong> {createdInfo.email}</div>
              <div><strong>Şifre:</strong> {createdInfo.password || '—'}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  const text = `Firma: ${createdInfo.orgName}\nGiriş: ${createdInfo.loginUrl}\nE-Posta: ${createdInfo.email}\nŞifre: ${createdInfo.password}`;
                  navigator.clipboard.writeText(text);
                  showToast('success', 'Giriş bilgileri panoya kopyalandı!');
                }}
              >
                📋 Bilgileri Kopyala
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setCreatedInfo(null)}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOrg && (
        <div className="modal-overlay" onClick={() => setEditOrg(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '6px' }}>
              Lisans Düzenle
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--gray-500)', marginBottom: '20px' }}>{editOrg.name}</p>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Plan Tipi</label>
                  <select className="form-input" value={editPlan} onChange={e => setEditPlan(e.target.value)}>
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Durum</label>
                  <select className="form-input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="active">Aktif</option>
                    <option value="suspended">Askıya Al</option>
                    <option value="cancelled">İptal Et</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Kullanıcı Limiti</label>
                  <input type="number" min={1} required className="form-input" value={editMaxUsers} onChange={e => setEditMaxUsers(+e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Şube Limiti</label>
                  <input type="number" min={1} required className="form-input" value={editMaxBranches} onChange={e => setEditMaxBranches(+e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditOrg(null)} style={{ flex: 1 }}>Vazgeç</button>
                <button type="submit" className="btn-primary" disabled={editLoading} style={{ flex: 1, justifyContent: 'center' }}>
                  {editLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
