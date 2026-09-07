// src/proxy.ts
// Auth guard: tüm (dashboard) route'larını korur (Next.js 16 proxy convention)
// MFA tamamlanmamışsa /login/mfa'ya yönlendirir
// Session: Supabase cookie-based SSR auth

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/login/mfa', '/api/auth'];

const DEFAULT_PANEL_URL = 'https://rkhbflecouhdxylihbyq.supabase.co';
const DEFAULT_PANEL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGJmbGVjb3VoZHh5bGloYnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk0NjMsImV4cCI6MjEwNDEwNTQ2M30.ipr_CxpcpnbrC6dZLgqEg0l_178KXDuApihnUYpV8b0';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public path'leri geç
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.PANEL_SUPABASE_URL || DEFAULT_PANEL_URL,
    process.env.PANEL_SUPABASE_ANON_KEY || DEFAULT_PANEL_ANON,
    {
      cookies: {
        getAll()    { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session max-age kontrolü: 2 saat
  const sessionAge = Date.now() - new Date(session.user.last_sign_in_at ?? 0).getTime();
  const TWO_HOURS  = 2 * 60 * 60 * 1000;
  if (sessionAge > TWO_HOURS) {
    await supabase.auth.signOut();
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }

  // MFA kontrolü: Sadece kullanıcı bir MFA TOTP faktörü kaydettiyse AAL2 zorunlu kılınır
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (mfaData?.nextLevel === 'aal2' && mfaData?.currentLevel !== 'aal2' && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login/mfa', request.url));
  }

  return response;
}

export const proxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
