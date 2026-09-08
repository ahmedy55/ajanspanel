import { createPanelClient, createPanelAdminClient } from '@/lib/supabase/panel';

export async function getAuthenticatedAdmin() {
  try {
    const supabase = await createPanelClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || !aal || (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2')) return null;
    const { data, error: adminError } = await createPanelAdminClient()
      .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    return !adminError && data ? user : null;
  } catch { return null; }
}
