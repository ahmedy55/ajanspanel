-- =========================================================================
-- Panel Supabase Projesi — Migration 001: Admin Audit Log
-- Bu SQL ajans paneline özel Supabase projesinde çalıştırılır.
-- =========================================================================

-- ════════════════════════════════════════════════════════════
-- 1. Platform Admins Tablosu
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id)
);

-- ════════════════════════════════════════════════════════════
-- 2. Admin Audit Log Tablosu (APPEND-ONLY)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   uuid        NOT NULL,
  action          text        NOT NULL,
  target_org_id   text,
  target_table    text,
  product_id      text,
  ip_address      text,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);

-- ════════════════════════════════════════════════════════════
-- 3. RLS Politikaları
-- ════════════════════════════════════════════════════════════
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- platform_admins: sadece kendi kaydını görebilir
CREATE POLICY "admins_select_own" ON platform_admins
  FOR SELECT USING (user_id = auth.uid());

-- audit_log: platform admin'ler görebilir
CREATE POLICY "audit_select_admins" ON admin_audit_log
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM platform_admins)
  );

-- audit_log: INSERT sadece service_role yapabilir (client'tan doğrudan insert YASAK)
-- DELETE ve UPDATE hiç kimse yapamaz — append-only garanti
CREATE POLICY "audit_insert_service_only" ON admin_audit_log
  FOR INSERT WITH CHECK (false); -- client'tan insert engellenir, sadece service_role

-- ════════════════════════════════════════════════════════════
-- 4. Service Role Yetkileri
-- ════════════════════════════════════════════════════════════
-- service_role her şeyi yapabilir (RLS bypass eder)
-- DELETE ve UPDATE için ekstra koruma: trigger ile engelle

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log kayıtları değiştirilemez veya silinemez.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_audit_update
  BEFORE UPDATE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER no_audit_delete
  BEFORE DELETE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
