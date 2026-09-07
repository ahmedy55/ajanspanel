// src/app/api/organizations/route.ts
// GET: Organizasyon listesi
// POST: Yeni organizasyon oluştur

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateBody, CreateOrgSchema } from '@/lib/apiSecurity';
import { adminListOrganizations, adminCreateOrganization } from '@/lib/rpc/organizations';
import { createPanelClient } from '@/lib/supabase/panel';
import { logAdminAction } from '@/lib/audit';
import type { ProductId } from '@/lib/supabase/products';

import { getAuthenticatedAdmin } from '@/lib/authAdmin';

export async function GET(request: NextRequest) {
  const rateLimitErr = checkRateLimit(request, { maxRequests: 30 });
  if (rateLimitErr) return rateLimitErr;

  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  const productId = request.nextUrl.searchParams.get('productId') as ProductId ?? 'audipro';

  try {
    const organizations = await adminListOrganizations(productId);

    await logAdminAction({
      adminUserId: admin.id,
      action:      'list_organizations',
      productId,
      ipAddress:   request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, organizations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitErr = checkRateLimit(request, { maxRequests: 5 });
  if (rateLimitErr) return rateLimitErr;

  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  const { data: body, error: validationErr } = await validateBody(request, CreateOrgSchema);
  if (validationErr) return validationErr;

  try {
    const result = await adminCreateOrganization(body.productId, {
      name:          body.name,
      plan_type:     body.plan_type,
      max_users:     body.max_users,
      max_branches:  body.max_branches,
      adminEmail:    body.adminEmail || undefined,
      adminPassword: body.adminPassword || undefined,
    });

    await logAdminAction({
      adminUserId: admin.id,
      action:      'create_organization',
      targetOrgId: result.org.id,
      targetTable: 'organizations',
      productId:   body.productId,
      ipAddress:   request.headers.get('x-forwarded-for'),
      metadata:    { name: body.name, plan_type: body.plan_type, adminEmail: body.adminEmail },
    });

    return NextResponse.json({
      success: true,
      organization: result.org,
      adminCredentials: result.adminCredentials,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
