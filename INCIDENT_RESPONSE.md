# Olay Müdahale Planı — Ajans Paneli

**Versiyon:** 1.0  
**Son Güncelleme:** 2026-09

---

## Senaryo: Panel Güvenlik İhlali Şüphesi

Aşağıdaki durumlardan biri gerçekleşirse bu planı uygulayın:
- Yetkisiz bir admin girişi tespit edildi
- Audit log'da açıklanamayan işlemler görüldü
- `ALERT_WEBHOOK_URL` üzerinden anomali uyarısı geldi
- Herhangi bir Supabase service_role key'in sızdığına dair şüphe

---

## Müdahale Adımları (Sırayla)

### 1. Tüm Oturumları Sonlandır (< 5 dakika)

Supabase Dashboard → Authentication → Users → her admin kullanıcı için **"Sign out all sessions"**

Veya kod ile:
```bash
# Supabase Management API ile tüm oturumları sonlandır
curl -X DELETE \
  https://api.supabase.com/v1/projects/{PANEL_PROJECT_ID}/auth/users/{USER_ID}/sessions \
  -H "Authorization: Bearer {SUPABASE_MANAGEMENT_TOKEN}"
```

### 2. Service Role Key'leri Rotate Et (< 15 dakika)

**Her ürün için ayrı ayrı yapılmalı:**

1. Supabase Dashboard → Settings → API → "Roll API Keys"
2. Yeni key'leri Vercel Environment Variables'a gir:
   - `PANEL_SUPABASE_SERVICE_ROLE_KEY`
   - `AUDIPRO_SUPABASE_SERVICE_ROLE_KEY`
   - `PRODUCT2_SUPABASE_SERVICE_ROLE_KEY`
   - `PRODUCT3_SUPABASE_SERVICE_ROLE_KEY`
3. Vercel'de "Redeploy" tetikle (değişkenler aktif olsun)

> ⚠️ Eski key'leri rotate etmeden yalnızca değişken güncellemesi yetmez.

### 3. Audit Log'dan Sızıntı Kapsamını Belirle (< 1 saat)

Panelin audit log tablosundan şunları sorgulayın:

```sql
-- Son 24 saatte yapılan tüm işlemler
SELECT * FROM admin_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Şüpheli IP'den gelen işlemler
SELECT * FROM admin_audit_log
WHERE ip_address = 'ŞÜPHELI_IP'
ORDER BY created_at DESC;

-- Hangi organizasyonlara erişildi?
SELECT DISTINCT target_org_id, product_id, COUNT(*)
FROM admin_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY target_org_id, product_id;
```

Etkilenen organizasyonları listeleyin → bir sonraki adım için gerekli.

### 4. Etkilenen Firmalara Bildirim (KVKK Gereği)

> ⚠️ Bu adım için hukuki danışmana başvurun.

KVKK Madde 12 gereğince:
- Kişisel veri ihlali **72 saat içinde** Kişisel Verileri Koruma Kurulu'na bildirilmeli
- Etkilenen kişiler (hastalar dahil) **gecikmeksizin** bilgilendirilmeli
- İhlal kaydı tutulmalı

Bildirim için gereken bilgiler (audit log'dan çıkarılacak):
- İhlal tarihi ve saati
- Erişilen organizasyonlar
- Erişilen verinin türü ve tahmini kapsamı
- Alınan önlemler

### 5. Post-Mortem Raporu

İhlal çözüme kavuştuktan sonra:
- İhlalin nasıl gerçekleştiğini belgele
- Hangi önleyici tedbirlerin eksik kaldığını analiz et
- Bu planı güncelle

---

## Önleyici Kontroller

Her ay şunları kontrol edin:
- [ ] MFA tüm admin hesaplarında aktif mi?
- [ ] Session süresi hâlâ 2 saat ile sınırlı mı?
- [ ] `npm audit` temiz mi?
- [ ] Audit log'da açıklanamayan giriş var mı?
- [ ] Eski/ayrılmış personelin erişimi iptal edildi mi?

---

## Acil İletişim

| Rol | Yapılacak |
|---|---|
| Teknik sorumlu | Key rotation + deployment |
| KVKK sorumlusu | Kurul bildirimi + firma bildirim metinleri |
| Hukuki danışman | Bildirim içeriği onayı |
