import { createPanelClient, createPanelAdminClient } from '@/lib/supabase/panel';

export async function getAuthenticatedAdmin() {
  try {
    const supabase = await createPanelClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Service role ile RLS engeli olmadan platform_admins kontrolü
    const adminClient = createPanelAdminClient();
    const { data } = await adminClient
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!data) {
      // Eğer admin@ajans.com ise otomatik ekle
      if (session.user.email === 'admin@ajans.com') {
        await adminClient.from('platform_admins').upsert({ user_id: session.user.id });
        return session.user;
      }
      return null;
    }

    return session.user;
  } catch (err) {
    console.error('getAuthenticatedAdmin error:', err);
    return null;
  }
}
