'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_org_id: string | null;
  product_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  list_organizations:  'Firma Listesi Görüntülendi',
  create_organization: 'Yeni Firma Oluşturuldu',
  update_license:      'Lisans Güncellendi',
  view_audit_log:      'Audit Log Görüntülendi',
};

export default function AuditPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit?limit=${LIMIT}&offset=${page * LIMIT}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
          setTotal(data.total ?? 0);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [page]);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px',
          background: 'var(--warning-50)', border: '1px solid var(--warning-100)',
          borderRadius: '10px', fontSize: '0.82rem', color: 'var(--warning-700)', fontWeight: 600,
          marginBottom: '16px',
        }}>
          🔒 Bu kayıtlar değiştirilemez veya silinemez (append-only)
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Toplam <strong>{total}</strong> kayıt
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
              ← Önceki
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.82rem', color: 'var(--gray-500)', padding: '0 8px' }}>
              Sayfa {page + 1}
            </span>
            <button className="btn-secondary" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)} style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
              Sonraki →
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Admin</th>
              <th>İşlem</th>
              <th>Ürün</th>
              <th>Hedef Org</th>
              <th>IP Adresi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-400)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <div className="spinner" /> Yükleniyor...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-400)' }}>
                  Henüz kayıt yok.
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-500)', fontSize: '0.8rem' }}>
                  {new Date(log.created_at).toLocaleString('tr-TR')}
                </td>
                <td>
                  <code style={{ fontSize: '0.75rem', color: 'var(--gray-600)', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>
                    {log.admin_user_id.slice(0, 8)}…
                  </code>
                </td>
                <td>
                  <span style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                    background: log.action.includes('create') ? 'var(--success-50)' :
                                log.action.includes('update') ? 'var(--warning-50)' : 'var(--primary-50)',
                    color: log.action.includes('create') ? 'var(--success-700)' :
                           log.action.includes('update') ? 'var(--warning-700)' : 'var(--primary-700)',
                  }}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                  {log.product_id ?? '—'}
                </td>
                <td>
                  {log.target_org_id ? (
                    <code style={{ fontSize: '0.75rem', color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>
                      {log.target_org_id.slice(0, 8)}…
                    </code>
                  ) : '—'}
                </td>
                <td style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                  {log.ip_address ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
