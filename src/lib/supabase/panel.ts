// src/lib/supabase/panel.ts
// Panel'in kendi Supabase projesi — audit_log, platform_admins

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_PANEL_URL = 'https://rkhbflecouhdxylihbyq.supabase.co';
const DEFAULT_PANEL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGJmbGVjb3VoZHh5bGloYnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk0NjMsImV4cCI6MjEwNDEwNTQ2M30.ipr_CxpcpnbrC6dZLgqEg0l_178KXDuApihnUYpV8b0';
const DEFAULT_PANEL_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGJmbGVjb3VoZHh5bGloYnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODUyOTQ2MywiZXhwIjoyMTA0MTA1NDYzfQ.kCG5Ay7RjfhqJ3txoDQlHGTbNMjkdifImGQ5tQcW5cQ';

/** Panel DB — kullanıcı oturumunu okur (SSR için) */
export async function createPanelClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.PANEL_SUPABASE_URL || DEFAULT_PANEL_URL,
    process.env.PANEL_SUPABASE_ANON_KEY || DEFAULT_PANEL_ANON,
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
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.PANEL_SUPABASE_URL || DEFAULT_PANEL_URL,
    process.env.PANEL_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_PANEL_SERVICE,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
