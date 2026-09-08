-- =========================================================================
-- AudiPro SaaS — Migration 004: Admin Panel RPC Fonksiyonları
-- Bu SQL AudiPro'nun Supabase projesinde çalıştırılır.
-- Ajans panelinin AudiPro verilerine güvenli, dar yetkili erişimi için.
-- =========================================================================

-- ════════════════════════════════════════════════════════════
-- 1. Tüm Organizasyonları Listele (Sadece admin'e gerekli kolonlar)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_list_organizations()
RETURNS TABLE(
  id                   uuid,
  name                 text,
  slug                 text,
  plan_type            text,
  subscription_status  text,
  max_users            int,
  max_branches         int,
  created_at           timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  -- Sadece bu kolonları döner. Hasta verileri, finansal veriler vb. tablolara hiç dokunmaz.
  RETURN QUERY
    SELECT
      o.id,
      o.name,
      o.slug,
      o.plan_type,
      o.subscription_status,
      o.max_users,
      o.max_branches,
      o.created_at
    FROM organizations o
    ORDER BY o.created_at DESC;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 2. Lisans / Plan Güncelle (Sadece belirtilen kolonları değiştirir)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_update_license(
  p_org_id              uuid,
  p_plan_type           text,
  p_subscription_status text,
  p_max_users           int,
  p_max_branches        int
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  -- Sadece lisans bilgilerini günceller.
  -- Firma adı, slug, hasta verileri gibi alanlara dokunmaz.
  UPDATE organizations
  SET
    plan_type            = p_plan_type,
    subscription_status  = p_subscription_status,
    max_users            = p_max_users,
    max_branches         = p_max_branches,
    updated_at           = NOW()
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organizasyon bulunamadı: %', p_org_id;
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 3. Organizasyon Kullanım İstatistikleri
--    (Sayısal özet — gerçek veriye dokunmaz)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_get_org_stats(p_org_id uuid)
RETURNS TABLE(
  patient_count              bigint,
  user_count                 bigint,
  branch_count               bigint,
  appointment_count_last30   bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM patients      WHERE organization_id = p_org_id)::bigint,
    (SELECT COUNT(*) FROM memberships   WHERE organization_id = p_org_id AND status = 'active')::bigint,
    (SELECT COUNT(*) FROM branches      WHERE organization_id = p_org_id AND status = 'active')::bigint,
    (SELECT COUNT(*) FROM appointments
      WHERE organization_id = p_org_id
        AND created_at >= NOW() - INTERVAL '30 days')::bigint;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 4. Organizasyon Kullanıcı Listesi (Üyelik bilgileri)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_list_org_users(p_org_id uuid)
RETURNS TABLE(
  user_id    uuid,
  email      text,
  first_name text,
  last_name  text,
  roles      text[],
  status     text,
  joined_at  timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  RETURN QUERY
    SELECT
      m.user_id,
      m.email,
      p.first_name,
      p.last_name,
      m.roles,
      m.status,
      m.joined_at
    FROM memberships m
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.organization_id = p_org_id
    ORDER BY m.joined_at DESC;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 5. Yetki Kısıtlamaları — Kritik Güvenlik Adımı
--    Bu fonksiyonları yalnızca service_role çağırabilir.
--    Public erişim tamamen kapatılır.
-- ════════════════════════════════════════════════════════════
REVOKE ALL ON FUNCTION admin_list_organizations()              FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_update_license(uuid,text,text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_org_stats(uuid)               FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_org_users(uuid)              FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_list_organizations()              TO service_role;
GRANT EXECUTE ON FUNCTION admin_update_license(uuid,text,text,int,int) TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_org_stats(uuid)               TO service_role;
GRANT EXECUTE ON FUNCTION admin_list_org_users(uuid)              TO service_role;

CREATE OR REPLACE FUNCTION public.admin_create_organization(p_name text,p_plan_type text,p_max_users int,p_max_branches int,p_user_id uuid,p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.organizations; b uuid; BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 IF length(trim(p_name))<2 OR p_max_users<1 OR p_max_branches<1 THEN RAISE EXCEPTION 'Invalid provisioning parameters'; END IF;
 IF EXISTS(SELECT 1 FROM public.memberships WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'User already provisioned'; END IF;
 INSERT INTO public.organizations(name,slug,plan_type,subscription_status,max_users,max_branches)
 VALUES(trim(p_name),'org-'||gen_random_uuid()::text,p_plan_type,'active',p_max_users,p_max_branches) RETURNING * INTO o;
 INSERT INTO public.branches(organization_id,name,status) VALUES(o.id,'Merkez Şube','active') RETURNING id INTO b;
 INSERT INTO public.profiles(id,first_name,last_name) VALUES(p_user_id,p_name,'Yöneticisi') ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.memberships(user_id,organization_id,branch_id,roles,status,email,first_name,last_name)
 VALUES(p_user_id,o.id,b,ARRAY['Firma Yöneticisi'],'active',p_email,p_name,'Yöneticisi');
 RETURN jsonb_build_object('org',to_jsonb(o),'branch_id',b);
END $$;
REVOKE ALL ON FUNCTION public.admin_create_organization(text,text,int,int,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_organization(text,text,int,int,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION admin_list_organizations(),admin_update_license(uuid,text,text,int,int),admin_get_org_stats(uuid),admin_list_org_users(uuid) FROM anon,authenticated;
