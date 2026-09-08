'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OrgRow } from '@/lib/rpc/organizations';
import type { ProductId } from '@/lib/supabase/products';
import { PRODUCT_LIST } from '@/lib/supabase/products';

const PLAN_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  free:       { bg: '#f1f5f9', color: '#475569', label: 'Free' },
  basic:      { bg: '#eff6ff', color: '#2563eb', label: 'Basic' },
  pro:        { bg: '#fdf4ff', color: '#c026d3', label: 'Pro' },
  enterprise: { bg: '#fef3c7', color: '#d97706', label: 'Enterprise' },
};

const STATUS_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: '#ecfdf5', color: '#059669', label: 'Aktif' },
  trial:     { bg: '#eff6ff', color: '#2563eb', label: 'Deneme' },
  suspended: { bg: '#fef2f2', color: '#dc2626', label: 'Askıda' },
  cancelled: { bg: '#f8fafc', color: '#94a3b8', label: 'İptal' },
};

export default function LicensesPage() {
  const [productId, setProductId] = useState<ProductId>('audipro');
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOrg, setEditOrg] = useState<OrgRow | null>(null);

  // Edit form state
  const [editPlan, setEditPlan] = useState('pro');
  const [editStatus, setEditStatus] = useState('active');
  const [editMaxUsers, setEditMaxUsers] = useState(5);
  const [editMaxBranches, setEditMaxBranches] = useState(2);
  const [saving, setSaving] = useState(false);

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
      if (data.success) {
        setOrgs(data.organizations);
      } else {
        showToast('error', data.error || 'Veri yüklenemedi.');
      }
    } catch {
      showToast('error', 'Sunucu bağlantısı kurulamadı.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { const task=setTimeout(()=>{void fetchOrgs();},0); return ()=>clearTimeout(task); }, [fetchOrgs]);

  function openEditModal(org: OrgRow) {
    setEditOrg(org);
    setEditPlan(org.plan);
    setEditStatus(org.subscription_status);
    setEditMaxUsers(org.max_users);
    setEditMaxBranches(org.max_branches);
  }

  async function handleSaveLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrg) return;
    setSaving(true);

    try {
      const res = await fetch('/api/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orgId: editOrg.id,
          plan: editPlan,
          subscriptionStatus: editStatus,
          maxUsers: editMaxUsers,
          maxBranches: editMaxBranches,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', `${editOrg.name} lisansı başarıyla güncellendi.`);
        setEditOrg(null);
        fetchOrgs();
      } else {
        showToast('error', data.error || 'Güncelleme başarısız.');
      }
    } catch {
      showToast('error', 'Bağlantı hatası.');
    } finally {
      setSaving(false);
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
            Lisans Yönetimi
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
            Müşteri firmaların abonelik paketleri, kotaları ve lisans durumları
          </p>
        </div>

        {/* Ürün Seçici */}
        <div style={{ display: 'flex', gap: '8px', background: '#fff', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          {PRODUCT_LIST.map(p => (
            <button
              key={p.id}
              onClick={() => setProductId(p.id)}
              disabled={p.status === 'coming_soon'}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '0.84rem', cursor: p.status === 'coming_soon' ? 'not-allowed' : 'pointer',
                background: productId === p.id ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
                color: productId === p.id ? '#fff' : p.status === 'coming_soon' ? '#cbd5e1' : '#64748b',
                transition: 'all 0.2s',
              }}
            >
              {p.icon} {p.name} {p.status === 'coming_soon' ? '(Yakında)' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Table */}
      <div style={{
        background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>FİRMA</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PAKET</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>DURUM</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>KULLANICI KOTASI</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ŞUBE KOTASI</th>
              <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>İŞLEM</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Lisanslar yükleniyor...
                </td>
              </tr>
            ) : orgs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Bu ürüne ait organizasyon bulunamadı.
                </td>
              </tr>
            ) : (
              orgs.map(org => {
                const planBadge = PLAN_BADGES[org.plan] ?? { bg: '#f1f5f9', color: '#475569', label: org.plan };
                const statusBadge = STATUS_BADGES[org.subscription_status] ?? { bg: '#f1f5f9', color: '#475569', label: org.subscription_status };
                return (
                  <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{org.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>ID: {org.id.slice(0, 8)}...</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: planBadge.bg, color: planBadge.color,
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
                      }}>
                        {planBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: statusBadge.bg, color: statusBadge.color,
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
                      }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 600 }}>
                      {org.active_user_count ?? 0} / <span style={{ color: '#0f172a' }}>{org.max_users}</span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 600 }}>
                      {org.active_branch_count ?? 0} / <span style={{ color: '#0f172a' }}>{org.max_branches}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => openEditModal(org)}
                        style={{
                          background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px',
                          padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        Lisansı Düzenle ✏️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editOrg && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', width: '460px', borderRadius: '20px',
            padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Lisansı Güncelle
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '24px' }}>
              {editOrg.name} firmasının abonelik ve kota parametreleri
            </p>

            <form onSubmit={handleSaveLicense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    PAKET / PLAN
                  </label>
                  <select
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    DURUM
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  >
                    <option value="active">Aktif</option>
                    <option value="trial">Deneme</option>
                    <option value="suspended">Askıya Al</option>
                    <option value="cancelled">İptal Et</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    MAX KULLANICI LİMİTİ
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={editMaxUsers}
                    onChange={e => setEditMaxUsers(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    MAX ŞUBE LİMİTİ
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editMaxBranches}
                    onChange={e => setEditMaxBranches(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditOrg(null)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    color: '#64748b', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
