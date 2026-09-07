// src/app/api/audit/route.ts
// GET: Audit log listesi

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/apiSecurity';
import { createPanelAdminClient } from '@/lib/supabase/panel';
import { logAdminAction } from '@/lib/audit';
import { getAuthenticatedAdmin } from '@/lib/authAdmin';

export async function GET(request: NextRequest) {
  const rateLimitErr = checkRateLimit(request, { maxRequests: 20 });
  if (rateLimitErr) return rateLimitErr;

  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const limit  = Math.min(parseInt(params.get('limit')  ?? '50'),  200);
  const offset = parseInt(params.get('offset') ?? '0');

  try {
    const adminClient = createPanelAdminClient();
    const { data, error, count } = await adminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Bu görüntüleme eylemini de logla
    await logAdminAction({
      adminUserId: admin.id,
      action:      'view_audit_log',
      ipAddress:   request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, logs: data, total: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
