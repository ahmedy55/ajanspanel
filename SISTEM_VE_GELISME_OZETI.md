# AudiPro & Ajans Paneli — Sistem Mimarisi, Yapılan Düzeltmeler ve Süreç Özeti

Bu doküman, **AudiPro (İşitme Merkezi Yönetim Sistemi)** ve **Ajans Paneli (SaaS SuperAdmin)** projelerinin mimari yapısını, süreç boyunca karşılaşılan ve çözülen kritik sorunları ve incelenmesi gereken güvenlik/izolasyon noktalarını özetlemektedir.

---

## 1. Projeler ve Canlı Ortam Bilgileri

| Proje | Açıklama | GitHub Deposu | Canlı Bağlantı |
|---|---|---|---|
| **AudiPro (İşitme Merkezi)** | İşitme merkezlerinin hasta, randevu, cihaz, SGK, kasa ve teknik servis takibi yaptığı ana SaaS istemcisi | [github.com/ahmedy55/isitme-merkezi](https://github.com/ahmedy55/isitme-merkezi) | [isitme-merkezi.vercel.app](https://isitme-merkezi.vercel.app) |
| **Ajans Paneli** | Yeni firma açma, lisanslama, superadmin yetkileri ve firma yönetimini sağlayan ajans yönetim paneli | [github.com/ahmedy55/ajanspanel](https://github.com/ahmedy55/ajanspanel) | [ajans-panel-six.vercel.app](https://ajans-panel-six.vercel.app) |

---

## 2. Süreç Boyunca Karşılaşılan ve Çözülen Sorunlar

### 1) Yetkisiz Erişim (404) ve Admin Kullanıcılar Sorunu
- **Sorun:** SuperAdmin kullanıcısı ile giriş yapıldığında lisans ve admin kullanıcılar sayfalarında yetkisiz erişim / 404 hatası veriyordu.
- **Çözüm:** Ajans paneli middleware ve rol yetkilendirmesi güncellendi, admin yetkileri doğrulandı.

### 2) Yeni Organizasyon Oluşturma & RPC Bağlantısı
- **Sorun:** Ajans Paneli'nden yeni firma eklerken veritabanı hata veriyordu.
- **Çözüm:** Supabase Service Role anahtarları entegre edildi, organizasyon, ana şube ve ilk yönetici kullanıcısını atomik oluşturan `admin_create_organization` ve `adminCreateOrganization` RPC akışları düzeltildi.

### 3) Yeni Firma Yöneticisine Giriş Bilgileri Verme
- **Sorun:** Oluşturulan firmanın hangi kullanıcı adı/şifre ile sisteme gireceği ve e-posta onay engeline takılması sorunu vardı.
- **Çözüm:** Firma oluşturma modalına yönetici e-posta ve şifre belirleme alanları eklendi. Supabase Auth API üzerinden `email_confirm: true` ile otomatik onaylı hesap açılması sağlandı.

### 4) "Klinik Seçin" Ekranı ve Veri İzolasyonu (Farklı Firmaların Aynı Veriyi Görmesi)
- **Sorun:** Farklı bir firmayla (ör. Muğla İşitme) giriş yapıldığında ya başka firmanın kliniği listeleniyor ya da tüm firmalar aynı hastaları/kasayı görüyordu (cross-tenant veri sızıntısı riski).
- **Çözüm:** 
  - Login anında kullanıcının `app_metadata` ve `memberships` tablosundaki `organization_id` ve `branch_id` bilgileri JWT token'a mühürlendi.
  - Şube seçimi API'si (`/api/select-org`) yalnızca kullanıcının gerçekte üyesi olduğu organizasyonları getirecek şekilde sınırlandırıldı.
  - PostgreSQL tarafında RLS (Row Level Security) kuralları `organization_id = auth.jwt() -> 'app_metadata' ->> 'organization_id'` esasına göre sıkılaştırıldı.

### 5) Giriş Sonrası Sol Menülerin Kaybolması
- **Sorun:** Yeni açılan firmayla (ör. Muğla) giriş yapıldığında sol tarafta sadece Dashboard, SaaS Master Panel ve Destek menüleri görünüyor, diğer 18 operasyonel menü (Hastalar, Randevular, SGK, Kasa vb.) görünmüyordu.
- **Çözüm:**
  - `Sidebar.tsx` menüleri `Firma Yöneticisi` rolüne göre filtreliyordu. Ajans Paneli'nin yeni oluşturduğu kayıtlara `admin` rolü yazdığı tespit edildi.
  - Hem Ajans Paneli'nin varsayılan rol ataması `['Firma Yöneticisi']` yapıldı hem de `Sidebar.tsx` içerisinde `admin` rolü `Firma Yöneticisi` ile eşdeğer tam yetkili kabul edildi.
  - Mevcut kayıtlar Supabase üzerinde güncellendi ve her iki proje Vercel'e yeniden derlenerek canlıya alındı.

---

## 3. Güncel Çok Kiracılılık (Multi-Tenancy) ve Yetki Modeli

### Veri Tabanı İzolasyonu
- Her operasyonel tabloda (`patients`, `appointments`, `devices`, `cash_register`, `branches` vb.) `organization_id` ve `branch_id` bulunur.
- RLS politikaları, sorgulayan kullanıcının oturumundaki `organization_id` dışında hiçbir veriyi getirmeyecek şekilde ayarlanmıştır.

### Kullanıcı Rolleri
1. **Firma Yöneticisi:**
   - Firmanın tüm şubelerini, konsolide cirosunu, tüm personelini ve ayarlarını yönetebilir.
2. **Şube Yöneticisi:**
   - Yalnızca kendisine atanan `branch_id` verilerine erişir.
3. **Odyolog & Sekreter:**
   - Şubenin operasyonel hasta ve randevu süreçlerini yürütür; finansal kısıtlamalara tabidir.
4. **Ajans SuperAdmin (SaaS Sahibi):**
   - AudiPro sisteminde operasyonel veri tutmaz; Ajans Paneli üzerinden firmaları açar, dondurur, kapatır veya lisans paketlerini düzenler.

---

## 4. Çevre Değişkenleri Şablonu (.env.example)

### AudiPro (.env.example)
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

### Ajans Paneli (.env.example)
```env
NEXT_PUBLIC_PANEL_SUPABASE_URL=https://[YOUR_PANEL_ID].supabase.co
NEXT_PUBLIC_PANEL_SUPABASE_ANON_KEY=eyJh...
PANEL_SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Müşteri Veritabanına Erişim (AudiPro Supabase)
AUDIPRO_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
AUDIPRO_SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

---

## 5. Dış İncelemede (Code Review) Odaklanılması İstenen Başlıklar

1. **Sunucu Tarafı Yetki Doğrulaması:** 
   - İstemci (Next.js client-side) filtrelemesine ek olarak, tüm Next.js API route'ları ve server action'larında `organization_id` doğrulanıyor mu?
2. **Şube Düzeyinde Veri İzolasyonu:**
   - `branch_id` filtrelemesi şube çalışanları için bypass edilebilir mi?
3. **RPC Güvenliği:**
   - Supabase `admin_create_organization` ve kullanıcı oluşturma RPC fonksiyonlarının `SECURITY DEFINER` yetkileri sadece ajans superadmin yetkilisiyle mi çalışıyor?
