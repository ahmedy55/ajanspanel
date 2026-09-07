// src/lib/rpc/organizations.ts
// AudiPro organizasyon RPC sarmalayıcıları (tip-güvenli)
// Tüm fonksiyonlar SADECE server-side API route'larından çağrılır.

import { createProductAdminClient, ProductId } from '@/lib/supabase/products';

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_type: string;
  subscription_status: string;
  max_users: number;
  max_branches: number;
  created_at: string;
  active_user_count?: number;
  active_branch_count?: number;
}

export interface OrgStats {
  patient_count: number;
  user_count: number;
  branch_count: number;
  appointment_count_last30: number;
}

export interface OrgUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  status: string;
  joined_at: string;
}

/** Tüm organizasyonları listele */
export async function adminListOrganizations(productId: ProductId): Promise<OrgRow[]> {
  const client = createProductAdminClient(productId);
  
  // Önce RPC fonksiyonunu dene
  const { data, error } = await client.rpc('admin_list_organizations');
  if (!error && data) {
    return data as OrgRow[];
  }

  // RPC yoksa veya hata verdiyse service_role ile doğrudan organizations tablosunu oku
  console.warn('admin_list_organizations RPC fallback triggered:', error?.message);
  const { data: tableData, error: tableErr } = await client
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (tableErr) {
    throw new Error(`Organizasyonlar alınamadı: ${tableErr.message}`);
  }

  return (tableData || []).map((o: any) => ({
    id: o.id,
    name: o.name,
    slug: o.slug || o.name?.toLowerCase().replace(/\s+/g, '-'),
    plan: o.plan || o.plan_type || 'pro',
    plan_type: o.plan_type || o.plan || 'pro',
    subscription_status: o.subscription_status || (o.is_active ? 'active' : 'suspended'),
    max_users: o.max_users || 5,
    max_branches: o.max_branches || 2,
    created_at: o.created_at,
    active_user_count: o.active_user_count || 0,
    active_branch_count: o.active_branch_count || 0,
  }));
}

/** Organizasyon lisans/plan güncelle */
export async function adminUpdateLicense(
  productId: ProductId,
  orgId: string,
  params: {
    plan_type: string;
    subscription_status: string;
    max_users: number;
    max_branches: number;
  }
): Promise<void> {
  const client = createProductAdminClient(productId);
  const { error } = await client.rpc('admin_update_license', {
    p_org_id: orgId,
    p_plan_type: params.plan_type,
    p_subscription_status: params.subscription_status,
    p_max_users: params.max_users,
    p_max_branches: params.max_branches,
  });
  if (error) throw new Error(`admin_update_license hatası: ${error.message}`);
}

/** Organizasyon kullanım istatistiklerini getir */
export async function adminGetOrgStats(
  productId: ProductId,
  orgId: string
): Promise<OrgStats> {
  const client = createProductAdminClient(productId);
  const { data, error } = await client.rpc('admin_get_org_stats', { p_org_id: orgId });
  if (error) throw new Error(`admin_get_org_stats hatası: ${error.message}`);
  return (data as OrgStats) ?? { patient_count: 0, user_count: 0, branch_count: 0, appointment_count_last30: 0 };
}

/** Organizasyon kullanıcılarını listele */
export async function adminListOrgUsers(
  productId: ProductId,
  orgId: string
): Promise<OrgUser[]> {
  const client = createProductAdminClient(productId);
  const { data, error } = await client.rpc('admin_list_org_users', { p_org_id: orgId });
  if (error) throw new Error(`admin_list_org_users hatası: ${error.message}`);
  return (data as OrgUser[]) ?? [];
}

export interface CreatedOrgResult {
  org: OrgRow;
  adminCredentials?: {
    email: string;
    userId: string;
    branchId: string;
  };
}

/** Yeni organizasyon oluştur (ve opsiyonel olarak ilk şube ve admin kullanıcısını aç) */
export async function adminCreateOrganization(
  productId: ProductId,
  params: {
    name: string;
    plan_type: string;
    max_users: number;
    max_branches: number;
    adminEmail?: string;
    adminPassword?: string;
  }
): Promise<CreatedOrgResult> {
  const client = createProductAdminClient(productId);
  let slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!slug) slug = 'org-' + Date.now();

  // AudiPro DB'de plan_type IN ('trial', 'basic', 'pro', 'enterprise')
  const validPlanType = params.plan_type === 'free' ? 'trial' : params.plan_type;

  // AudiPro DB'de subscription_status IN ('active', 'suspended', 'cancelled')
  const insertPayload = {
    name: params.name,
    slug,
    plan_type: validPlanType,
    subscription_status: 'active',
    max_users: params.max_users,
    max_branches: params.max_branches,
  };

  const { data: orgData, error: orgError } = await client
    .from('organizations')
    .insert([insertPayload])
    .select()
    .single();

  if (orgError || !orgData) throw new Error(`Organizasyon oluşturulamadı: ${orgError?.message}`);

  const org = orgData as OrgRow;
  let adminCredentials: { email: string; userId: string; branchId: string } | undefined;

  // Eğer adminEmail sağlandıysa ilk şubeyi ve admin kullanıcısını aç
  if (params.adminEmail && params.adminPassword) {
    try {
      // 1. İlk şube (Merkez Şube) oluştur
      const { data: branchData, error: branchErr } = await client
        .from('branches')
        .insert([{
          organization_id: org.id,
          name: 'Merkez Şube',
          status: 'active',
        }])
        .select()
        .single();

      const branchId = branchData?.id;

      // 2. AudiPro Auth kullanıcısını oluştur (app_metadata içine organization_id vererek doğrudan o firmaya bağla)
      const { data: userData, error: userErr } = await client.auth.admin.createUser({
        email: params.adminEmail.trim(),
        password: params.adminPassword,
        email_confirm: true,
        app_metadata: {
          organization_id: org.id,
        },
      });

      if (userErr || !userData.user) {
        console.error('Kullanıcı auth hesabı oluşturulamadı:', userErr);
      } else {
        const userId = userData.user.id;

        // 3. Profiles tablosuna ekle
        await client.from('profiles').upsert({
          id: userId,
          first_name: params.name,
          last_name: 'Yöneticisi',
        });

        // 4. Memberships tablosuna bağla
        await client.from('memberships').insert([{
          user_id: userId,
          organization_id: org.id,
          roles: ['Firma Yöneticisi'],
          branch_id: branchId,
          status: 'active',
          email: params.adminEmail.trim(),
          first_name: params.name,
          last_name: 'Yöneticisi',
        }]);

        adminCredentials = {
          email: params.adminEmail.trim(),
          userId,
          branchId: branchId || '',
        };
      }
    } catch (createErr) {
      console.error('Admin hesabı veya şube oluşturulurken hata:', createErr);
    }
  }

  return { org, adminCredentials };
}
