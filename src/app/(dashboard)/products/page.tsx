import { PRODUCT_LIST } from '@/lib/supabase/products';

export default function ProductsPage() {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          Her ürün bağımsız bir Supabase projesine bağlıdır. Organizasyonlar sayfasında ürün seçerek yönetebilirsiniz.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {PRODUCT_LIST.map(product => (
          <div key={product.id} className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '52px', height: '52px',
                background: product.status === 'active'
                  ? 'linear-gradient(135deg, var(--primary-500), var(--accent-500))'
                  : 'var(--gray-100)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}>
                {product.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-800)' }}>
                  {product.name}
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                  borderRadius: '999px',
                  background: product.status === 'active' ? 'var(--success-50)' : 'var(--gray-100)',
                  color: product.status === 'active' ? 'var(--success-700)' : 'var(--gray-500)',
                }}>
                  {product.status === 'active' ? 'Aktif' : 'Yakında'}
                </span>
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'var(--gray-50)', borderRadius: '10px',
              fontSize: '0.8rem', color: 'var(--gray-500)',
              fontFamily: 'monospace',
            }}>
              {product.id === 'audipro' ? process.env.NEXT_PUBLIC_AUDIPRO_DISPLAY_URL ?? 'audipro.supabase.co' : '— yapılandırılmadı —'}
            </div>

            {product.status === 'active' ? (
              <a href={`/organizations?product=${product.id}`} style={{
                display: 'block', marginTop: '16px', padding: '10px',
                background: 'var(--primary-50)', color: 'var(--primary-700)',
                border: '1px solid var(--primary-100)', borderRadius: '10px',
                textAlign: 'center', fontWeight: 600, fontSize: '0.875rem',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                Organizasyonları Yönet →
              </a>
            ) : (
              <div style={{
                marginTop: '16px', padding: '10px',
                background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: '10px',
                textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem',
              }}>
                Henüz yapılandırılmadı
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
