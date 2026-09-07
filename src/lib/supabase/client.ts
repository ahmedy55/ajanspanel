import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_PANEL_URL = 'https://rkhbflecouhdxylihbyq.supabase.co';
const DEFAULT_PANEL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGJmbGVjb3VoZHh5bGloYnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk0NjMsImV4cCI6MjEwNDEwNTQ2M30.ipr_CxpcpnbrC6dZLgqEg0l_178KXDuApihnUYpV8b0';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_URL || DEFAULT_PANEL_URL,
    process.env.NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY || DEFAULT_PANEL_ANON
  );
}
