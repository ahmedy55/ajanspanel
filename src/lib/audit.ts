// src/lib/audit.ts
// Her admin işlemini panel DB'sine loglar — append-only

import { createPanelAdminClient } from '@/lib/supabase/panel';

export interface AuditActionParams {
  adminUserId: string;
  action: string;
  targetOrgId?: string;
  targetTable?: string;
  productId?: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction(params: AuditActionParams): Promise<void> {
  try {
    const client = createPanelAdminClient();
    const { error } = await client.from('admin_audit_log').insert([{
      admin_user_id: params.adminUserId,
      action:         params.action,
      target_org_id:  params.targetOrgId ?? null,
      target_table:   params.targetTable ?? null,
      product_id:     params.productId ?? null,
      ip_address:     params.ipAddress ?? null,
      metadata:       params.metadata ?? {},
      created_at:     new Date().toISOString(),
    }]);
    if(error) console.error('[audit] Insert failed',error.code);
    // Silently fails — audit log hatası asla kullanıcıya yansımamalı
  } catch {
    console.error('[audit] Log yazılamadı');
  }
}

/** Basit anomali kontrolü: 5 dk içinde 10+ farklı org erişimi */
export async function checkAnomalyAndAlert(
  adminUserId: string,
  targetOrgId: string
): Promise<void> {
  try {
    const client = createPanelAdminClient();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data } = await client
      .from('admin_audit_log')
      .select('target_org_id')
      .eq('admin_user_id', adminUserId)
      .gte('created_at', fiveMinutesAgo)
      .not('target_org_id', 'is', null);

    if (!data) return;

    const uniqueOrgs = new Set(data.map((r: { target_org_id: string }) => r.target_org_id));
    if (uniqueOrgs.size >= 10) {
      await sendAnomalyAlert(adminUserId, `5 dakikada ${uniqueOrgs.size} farklı organizasyona erişim`);
    }
  } catch {
    // Sessizce başarısız ol
  }
}

async function sendAnomalyAlert(adminUserId: string, reason: string): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Ajans Panel Anomali Uyarısı*\nAdmin: ${adminUserId}\nSebep: ${reason}\nZaman: ${new Date().toISOString()}`,
      }),
    });
  } catch {
    // Webhook hatası sessizce geçilir
  }
}
