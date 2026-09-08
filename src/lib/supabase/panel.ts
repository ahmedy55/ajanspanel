// src/lib/supabase/panel.ts
// Panel'in kendi Supabase projesi — audit_log, platform_admins

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';


/** Panel DB — kullanıcı oturumunu okur (SSR için) */
export async function createPanelClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component'ten çağrılıyorsa ignore */ }
        },
      },
    }
  );
}

/** Panel DB — service_role ile tam yetki (SADECE API route'larında kullan) */
export function createPanelAdminClient() {
  if (!process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL || !process.env.PANEL_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Panel sunucu yapılandırması eksik.');
  return createClient(
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL!,
    process.env.PANEL_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
