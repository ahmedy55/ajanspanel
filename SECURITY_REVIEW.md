# İnceleme teslimi — Ajans paneli

Bu kopya canlıya yayınlanmamıştır. Kaynakta bulunan sabit service-role anahtarı kaldırılmıştır. Eski anahtar canlıda iptal edilip yenilenmeden risk kapanmış sayılmaz; Git geçmişi ve eski deployment'lar da incelenmelidir.

- Node 22, `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- `.env.example` yeni ve tutarlı değişken adlarını gösterir. Panel ile AudiPro URL/anahtar çiftlerini karıştırmayın.
- `supabase/migrations/001_panel_schema.sql` yalnızca **panel veritabanına** aittir.
- `supabase/audipro/008_agency_rpc.sql` yalnızca **AudiPro veritabanına** aittir. AudiPro teslimindeki 008 ile aynıdır; iki kez kurmayın. AudiPro 007–010 güvenlik/işlem migration zincirini staging üzerinde doğrulayın.
- İlk superadmin kaydı güvenilir sunucu/DB yöneticisi tarafından açıkça hazırlanmalıdır. E-posta adresine bağlı otomatik yükseltme kaldırılmıştır.
- API'ler `getUser()` ile doğrulanmış kullanıcı ve panel DB'deki `platform_admins` kaydını kontrol eder. Kayıtlı MFA faktörü varsa AAL2 zorunludur. MFA kaydı olmayan hesaplarda zorunlu kayıt ekranı bu teslimin kapsamında uygulanmamıştır.
- Test bağımlılıklarında Vitest 4 ve Vite 7 kullanılır. npm 10'un isteğe bağlı peer döngüsü hatası nedeniyle `.npmrc` içinde `legacy-peer-deps=true` vardır; kilit dosyası ve testler birlikte doğrulanmıştır.

Firma oluşturma API'si ilk yöneticiyi zorunlu ister. Organizasyon/ilk şube/profil/üyelik tek SQL transaction'ındadır; Auth hesabı ayrı bir API ile oluşturulur. SQL hatası kesin değilse otomatik silme yapılmaz; yöneticinin kullanıcı kimliğiyle sonucu kontrol etmesi gerekir. İki ürüne ait veritabanları arasında dağıtık transaction yoktur. Panel audit yazma hataları loglanır, iş sonucu geri alınmaz.
