// src/lib/apiSecurity.ts
// Port from AudiPro — Rate limiting + Zod validation

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export function checkRateLimit(request: NextRequest, options: RateLimitOptions = {}): NextResponse | null {
  if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
    const origin=request.headers.get('origin');
    if ((origin && origin!==request.nextUrl.origin) || request.headers.get('sec-fetch-site')==='cross-site') return NextResponse.json({error:'Geçersiz istek kaynağı.'},{status:403});
  }
  const windowMs    = options.windowMs    ?? 60_000;
  const maxRequests = options.maxRequests ?? 20;

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  const now      = Date.now();
  const existing = rateLimitStore.get(ip);

  if (existing) {
    const elapsed = now - existing.firstRequestAt;
    if (elapsed < windowMs) {
      existing.count++;
      if (existing.count > maxRequests) {
        const retryAfterSecs = Math.ceil((windowMs - elapsed) / 1000);
        return NextResponse.json(
          { success: false, error: `Çok fazla istek. ${retryAfterSecs} saniye sonra tekrar deneyin.` },
          { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
        );
      }
    } else {
      rateLimitStore.set(ip, { count: 1, firstRequestAt: now });
    }
  } else {
    rateLimitStore.set(ip, { count: 1, firstRequestAt: now });
  }

  if (rateLimitStore.size > 5_000) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.firstRequestAt > windowMs) rateLimitStore.delete(key);
    }
  }

  return null;
}

export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { data: null, error: NextResponse.json({ success: false, error: 'Geçersiz JSON.' }, { status: 400 }) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    return { data: null, error: NextResponse.json({ success: false, error: 'Geçersiz veri.', details }, { status: 400 }) };
  }

  return { data: result.data, error: null };
}

// Şemalar
export const UpdateLicenseSchema = z.object({
  productId:           z.enum(['audipro', 'product2', 'product3']),
  orgId:               z.string().uuid(),
  plan_type:           z.enum(['trial', 'free', 'basic', 'pro', 'enterprise']),
  subscription_status: z.enum(['active', 'suspended', 'cancelled']),
  max_users:           z.number().int().min(1).max(1000),
  max_branches:        z.number().int().min(1).max(100),
});

export const CreateOrgSchema = z.object({
  productId:     z.enum(['audipro', 'product2', 'product3']),
  name:          z.string().min(2).max(200),
  plan_type:     z.enum(['trial', 'free', 'basic', 'pro', 'enterprise']),
  max_users:     z.number().int().min(1).max(1000),
  max_branches:  z.number().int().min(1).max(100),
  adminEmail:    z.string().trim().email(),
  adminPassword: z.string().min(12).max(128),
});

export type UpdateLicenseInput = z.infer<typeof UpdateLicenseSchema>;
export type CreateOrgInput     = z.infer<typeof CreateOrgSchema>;
