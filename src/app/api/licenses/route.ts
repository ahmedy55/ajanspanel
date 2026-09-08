// src/app/api/licenses/route.ts
// PATCH: Lisans/plan güncelle

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateBody, UpdateLicenseSchema } from '@/lib/apiSecurity';
import { adminUpdateLicense } from '@/lib/rpc/organizations';
import { logAdminAction, checkAnomalyAndAlert } from '@/lib/audit';

import { getAuthenticatedAdmin } from '@/lib/authAdmin';

export async function PATCH(request: NextRequest) {
  const rateLimitErr = checkRateLimit(request, { maxRequests: 20 });
  if (rateLimitErr) return rateLimitErr;

  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  const { data: body, error: validationErr } = await validateBody(request, UpdateLicenseSchema);
  if (validationErr) return validationErr;

  try {
    await adminUpdateLicense(body.productId, body.orgId, {
      plan_type:           body.plan_type,
      subscription_status: body.subscription_status,
      max_users:           body.max_users,
      max_branches:        body.max_branches,
    });

    await logAdminAction({
      adminUserId: admin.id,
      action:      'update_license',
      targetOrgId: body.orgId,
      targetTable: 'organizations',
      productId:   body.productId,
      ipAddress:   request.headers.get('x-forwarded-for'),
      metadata: {
        plan_type:           body.plan_type,
        subscription_status: body.subscription_status,
        max_users:           body.max_users,
        max_branches:        body.max_branches,
      },
    });

    // Anomali kontrolü
    await checkAnomalyAndAlert(admin.id, body.orgId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
