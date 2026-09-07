import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/authAdmin';
import { createPanelAdminClient } from '@/lib/supabase/panel';
import type { User } from '@supabase/supabase-js';

// GET: platform_admins listesi ve kullanıcı detayları
export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  try {
    const adminClient = createPanelAdminClient();
    
    // platform_admins tablosunu çek
    const { data: admins, error: adminErr } = await adminClient
      .from('platform_admins')
      .select('user_id, created_at')
      .order('created_at', { ascending: false });

    if (adminErr) {
      return NextResponse.json({ success: false, error: adminErr.message }, { status: 500 });
    }

    // Supabase Auth kullanıcı listesinden e-postaları eşleştir
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    
    const userMap = new Map<string, User>((users || []).map((u: User) => [u.id, u]));

    const adminList = (admins || []).map((a: { user_id: string; created_at: string }) => {
      const authUser = userMap.get(a.user_id);
      return {
        id: a.user_id,
        user_id: a.user_id,
        email: authUser?.email || 'Bilinmiyor',
        created_at: a.created_at,
        last_sign_in: authUser?.last_sign_in_at || null,
      };
    });

    return NextResponse.json({ success: true, admins: adminList });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST: Yeni platform admini davet et / ekle
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  try {
    const { email, password } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'E-posta zorunludur.' }, { status: 400 });
    }

    const adminClient = createPanelAdminClient();

    // Kullanıcı var mı kontrol et veya oluştur
    let userId: string;
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existing = (users || []).find((u: User) => u.email?.toLowerCase() === email.trim().toLowerCase());

    if (existing) {
      userId = existing.id;
    } else {
      if (!password || password.length < 8) {
        return NextResponse.json({ success: false, error: 'Yeni kullanıcı için en az 8 karakterli şifre gereklidir.' }, { status: 400 });
      }
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });
      if (createErr || !newUser.user) {
        return NextResponse.json({ success: false, error: createErr?.message || 'Kullanıcı oluşturulamadı.' }, { status: 400 });
      }
      userId = newUser.user.id;
    }

    // platform_admins'e ekle
    const { error: insertErr } = await adminClient
      .from('platform_admins')
      .upsert({ user_id: userId });

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Admin başarıyla yetkilendirildi.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE: Platform admin yetkisini kaldır
export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });

  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: 'Kullanıcı ID zorunludur.' }, { status: 400 });

    if (userId === admin.id) {
      return NextResponse.json({ success: false, error: 'Kendi admin yetkinizi kaldıramazsınız.' }, { status: 400 });
    }

    const adminClient = createPanelAdminClient();
    const { error } = await adminClient
      .from('platform_admins')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Admin yetkisi kaldırıldı.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
