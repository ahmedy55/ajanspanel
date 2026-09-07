import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createPanelAdminClient } from '@/lib/supabase/panel';

const DEFAULT_PANEL_URL = 'https://rkhbflecouhdxylihbyq.supabase.co';
const DEFAULT_PANEL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGJmbGVjb3VoZHh5bGloYnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk0NjMsImV4cCI6MjEwNDEwNTQ2M30.ipr_CxpcpnbrC6dZLgqEg0l_178KXDuApihnUYpV8b0';

export async function POST(request: NextRequest) {
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

    email = email.trim();

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
      process.env.PANEL_SUPABASE_URL || DEFAULT_PANEL_URL,
      process.env.PANEL_SUPABASE_ANON_KEY || DEFAULT_PANEL_ANON,
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
      // Eğer platform_admins içinde henüz yoksa ve bu admin@ajans.com hesabıysa otomatik ekle
      if (email === 'admin@ajans.com') {
        await adminClient.from('platform_admins').upsert({ user_id: data.user.id });
      } else {
        await supabase.auth.signOut();
        if (contentType.includes('application/json')) {
          return NextResponse.json({
            success: false,
            error: 'Bu kullanıcının ajans paneline erişim yetkisi yok.',
          }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url), { status: 303 });
      }
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası oluştu.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
