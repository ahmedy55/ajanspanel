import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/apiSecurity';
import { createPanelAdminClient } from '@/lib/supabase/panel';


export async function POST(request: NextRequest) {
  const rateError = checkRateLimit(request, { maxRequests: 10 });
  if (rateError) return rateError;
  try {
    let email = '';
    let password = '';
    let nextPath = '/organizations';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email || '';
      password = body.password || '';
      if (body.next) nextPath = body.next;
    } else {
      const formData = await request.formData();
      email = (formData.get('email') as string) || '';
      password = (formData.get('password') as string) || '';
      const next = formData.get('next') as string;
      if (next) nextPath = next;
    }

    if (typeof email !== 'string' || typeof password !== 'string') return NextResponse.json({ error: 'Geçersiz giriş.' }, { status: 400 });
    email = email.trim();
    if (typeof nextPath !== 'string' || !/^\/(?![\/\\])/.test(nextPath) || nextPath.includes('\\')) nextPath = '/organizations';

    if (!email || !password) {
      if (contentType.includes('application/json')) {
        return NextResponse.json({ success: false, error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
      }
      return NextResponse.redirect(new URL('/login?error=missing_fields', request.url), { status: 303 });
    }

    // Yönlendirme URL'i
    const redirectUrl = new URL(nextPath, request.url);
    const response = contentType.includes('application/json')
      ? NextResponse.json({ success: true, redirect: nextPath })
      : NextResponse.redirect(redirectUrl, { status: 303 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      if (contentType.includes('application/json')) {
        return NextResponse.json({
          success: false,
          error: error?.message || 'E-posta veya şifre hatalı.',
        }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url), { status: 303 });
    }

    // platform_admins yetki kontrolü (RLS bypass için service_role ile)
    const adminClient = createPanelAdminClient();
    const { data: adminData } = await adminClient
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!adminData) {
      await supabase.auth.signOut();
      return NextResponse.json({ success: false, error: 'Bu kullanıcının ajans paneline erişim yetkisi yok.' }, { status: 403 });
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası oluştu.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
