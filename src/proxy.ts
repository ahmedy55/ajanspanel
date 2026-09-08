// src/proxy.ts
// Auth guard: tüm (dashboard) route'larını korur (Next.js 16 proxy convention)
// MFA tamamlanmamışsa /login/mfa'ya yönlendirir
// Session: Supabase cookie-based SSR auth

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/login/mfa', '/api/auth'];


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public path'leri geç
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY!,
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

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session max-age kontrolü: 2 saat
  const sessionAge = Date.now() - new Date(user.last_sign_in_at ?? 0).getTime();
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
