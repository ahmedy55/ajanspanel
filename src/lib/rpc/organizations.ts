import 'server-only';
// src/lib/rpc/organizations.ts
// AudiPro organizasyon RPC sarmalayıcıları (tip-güvenli)
// Tüm fonksiyonlar SADECE server-side API route'larından çağrılır.

import { createProductAdminClient } from '@/lib/supabase/productAdmin';
import type { ProductId } from '@/lib/supabase/products';

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

  return (tableData || []).map((o) => ({
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
    p_plan_type: params.plan_type === 'free' ? 'trial' : params.plan_type,
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
  warning?: string;
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
  if (!params.adminEmail || !params.adminPassword) throw new Error('İlk firma yöneticisi zorunludur.');
  const { data, error } = await client.auth.admin.createUser({
    email: params.adminEmail.trim().toLowerCase(), password: params.adminPassword, email_confirm: true,
  });
  if (error || !data.user) throw new Error('Yönetici hesabı oluşturulamadı.');
  const userId = data.user.id;
  const { data: created, error: provisionError } = await client.rpc('admin_create_organization', {
    p_name: params.name, p_plan_type: params.plan_type === 'free' ? 'trial' : params.plan_type,
    p_max_users: params.max_users, p_max_branches: params.max_branches,
    p_user_id: userId, p_email: params.adminEmail.trim().toLowerCase(),
  });
  if (provisionError || !created) {
    // Transport errors may arrive after a COMMIT. Never delete the Auth user in that case.
    if (!provisionError?.code || !/^(22|23|P0)/.test(provisionError.code)) {
      throw new Error('Firma oluşturma sonucu belirsiz; yeniden denemeden üyelik ve Auth hesabını kontrol edin: '+userId);
    }
    const { error: cleanupError } = await client.auth.admin.deleteUser(userId);
    if (cleanupError) throw new Error('Firma oluşturulamadı; sahipsiz Auth hesabı için yönetici temizliği gerekiyor: ' + userId);
    throw new Error('Firma oluşturulamadı; veritabanı işlemi geri alındı.');
  }
  // Metadata is a context hint. RLS always checks the live membership.
  const { error: metadataError } = await client.auth.admin.updateUserById(userId, {
    app_metadata: { organization_id: created.org.id, branch_id: created.branch_id, roles: ['Firma Yöneticisi'] },
  });
  if (metadataError) {
    // Provisioning committed: do not delete its user or invite the caller to retry creation.
    return { org: created.org, adminCredentials: { email: params.adminEmail, userId, branchId: created.branch_id }, warning: 'Firma oluşturuldu. Kullanıcı girişte firma seçmelidir.' };
  }
  return { org: created.org, adminCredentials: { email: params.adminEmail, userId, branchId: created.branch_id } };
}
