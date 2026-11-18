# STÜDYOM — App Store ve Google Play yayın rehberi

Bu belge mağaza yayını için gereken her şeyi tek yerde toplar: anahtar kurulumu, derleme, mağaza
metinleri ve gizlilik formlarının cevapları. Uygulama kimliği her iki mağazada: `com.gesblabs.studyom`.

> **Ödeme:** Telefon uygulamalarında Standart ve Pro planları **uygulama içi abonelik** olarak satılır
> (Apple 3.1.1 / Google Play Billing). Altyapı: RevenueCat → Supabase `revenuecat-webhook` fonksiyonu →
> `studios.plan`. Kurulum: aşağıdaki **7. bölüm**. Masaüstü/web tarafında satış şimdilik elle (plan
> veritabanından verilir); telefonda alınan abonelik masaüstünde de otomatik açılır.

---

## 1. Anahtarlar (bir kez, sen yaparsın)

Anahtarları kimseye gönderme; doğrudan GitHub'a eklenir:
**github.com/bekir3535bekir-cmd/omnicod → Settings → Secrets and variables → Actions → New repository secret**

### Apple (TestFlight yüklemesi için)

1. **Ekip kimliği:** developer.apple.com → Account → Membership → *Team ID* (10 karakter).
   Secret adı: `APPLE_TEAM_ID`
2. **API anahtarı:** App Store Connect → Users and Access → Integrations → App Store Connect API →
   Team Keys → (+). Rol: **Admin** (otomatik imzalamanın dağıtım sertifikası oluşturabilmesi için). `.p8` dosyası **yalnızca bir kez** indirilebilir, sakla.
   - Key ID → `ASC_KEY_ID`
   - Issuer ID (sayfanın üstünde) → `ASC_ISSUER_ID`
   - `.p8` dosyasının içeriği (Not Defteri ile aç, tamamını kopyala; BEGIN/END satırları dahil) → `ASC_API_KEY_P8`
3. **Uygulama kaydı:** App Store Connect → Apps → (+) New App → iOS, ad "STÜDYOM", dil Türkçe,
   bundle ID `com.gesblabs.studyom` (listede yoksa önce developer.apple.com → Identifiers'dan oluştur), SKU `studyom`.

### Android (Google Play paketi için)

1. **Yükleme anahtarı** (PowerShell; şifreleri sen seç ve sakla — kaybedersen Play'den sıfırlatmak gerekir):
   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore C:\Users\root\studyom-upload.jks -alias studyom -keyalg RSA -keysize 4096 -validity 10000
   ```
2. **base64'e çevir:**
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\root\studyom-upload.jks")) | Set-Clipboard
   ```
   Panodaki metin → `ANDROID_KEYSTORE_BASE64`
3. `ANDROID_KEYSTORE_PASSWORD` (anahtar deposu şifresi), `ANDROID_KEY_ALIAS` (`studyom`),
   `ANDROID_KEY_PASSWORD` (anahtar şifresi).
4. **Play Console:** Create app → "STÜDYOM", Türkçe, App, Free. **Play App Signing**'i açık bırak
   (Google son imzayı kendisi yapar; bizim anahtar yalnızca yükleme anahtarıdır).

`.jks` dosyasını ve `.p8` dosyasını depoya koyma; yedeğini güvenli bir yerde tut.

---

## 2. Derleme ve yükleme

İki yayın derlemesi **elle başlatılır** ve ancak PR main'e birleştikten sonra Actions sekmesinde görünür
(GitHub, elle başlatılan derlemeleri varsayılan daldan okur).

| Mağaza | Nasıl | Sonuç |
|---|---|---|
| iOS | Actions → **Release iOS (TestFlight)** → Run workflow → sürüm (örn. `1.0.0`) | Derleme doğrudan App Store Connect'e yüklenir, birkaç dakika sonra TestFlight'ta görünür |
| Android | Actions → **Release Android (Google Play)** → Run workflow → sürüm | İş bitince "Artifacts" altında `.aab` indirilir → Play Console → Testing → Internal testing → Create release → yükle |

- Derleme numarası her çalıştırmada otomatik artar (mağazalar her yüklemede daha büyük numara ister).
- Secrets eksikse derleme ilk adımda hangi adın eksik olduğunu yazarak durur.
- Her PR'da imzasız iOS derlemesi ve Android AAB derlemesi otomatik kontrol edilir.

---

## 3. Mağaza metinleri

**Ad:** STÜDYOM
**Alt başlık (Apple, ≤30):** Fotoğraf stüdyosu yönetimi
**Kısa açıklama (Play, ≤80):** Randevu, müşteri, ödeme ve sözleşme takibi; fotoğraf stüdyoları için.
**Anahtar kelimeler (Apple, ≤100, virgülle):**
`fotoğrafçı,stüdyo,randevu,düğün,müşteri,ajanda,sözleşme,ödeme,albüm,çekim,takvim,muhasebe`
**Tanıtım metni (Apple, ≤170):** Çekimlerinize odaklanın; randevular, müşteriler, ödemeler ve sözleşmeler tek yerde. Telefondan ve bilgisayardan aynı hesapla.

**Açıklama:**

> STÜDYOM, fotoğraf stüdyoları ve düğün fotoğrafçıları için hazırlanmış bir iş yönetimi uygulamasıdır.
> Randevularınızı, müşterilerinizi, ödemelerinizi ve sözleşmelerinizi tek yerden yönetin; telefonda ve
> bilgisayarda aynı hesapla aynı verileri görün.
>
> **Ajanda ve takvim** — Düğün, nişan ve stüdyo çekimlerini planlayın; görevli personeli atayın,
> müşteriye WhatsApp ile hatırlatma gönderin.
>
> **Müşteriler** — Her müşterinin paketi, ödemeleri, kalan bakiyesi ve albüm/dijital teslim süreci tek kartta.
>
> **Muhasebe** — Gelir ve giderlerinizi kaydedin, aylık net kârınızı ve tahmini vergilerinizi görün.
>
> **Teklif ve sözleşme** — Paketlerinizden müşteriye özel teklif hazırlayın, sözleşmeyi yazdırın veya PDF kaydedin.
>
> **Müşteri portalı** — Müşterileriniz albüm fotoğraflarını kendi telefonlarından seçer, seçimleri size gelir.
>
> **Ekip** — Personelinize kendi girişini verin; her çalışan yalnızca kendi görevlerini görür.
>
> **Çekim araçları** — Altın saat hesaplayıcı, poz rehberi, dijital QR kartvizit ve sesli randevu ekleme.
>
> Verileriniz şifreli bağlantıyla saklanır; dilediğinizde tüm kayıtlarınızı Excel olarak indirebilir,
> hesabınızı uygulama içinden silebilirsiniz.
>
> **Planlar ve abonelik** — Basic ücretsizdir. Yeni hesaplar 1 ay boyunca tüm Pro özelliklerini ücretsiz
> kullanır. Standart ve Pro aylık, otomatik yenilenen aboneliklerdir; ücret satın alma onayıyla mağaza
> hesabınızdan alınır ve dönem bitiminden en az 24 saat önce iptal edilmezse yenilenir. Aboneliğinizi
> mağaza hesap ayarlarından yönetebilir veya iptal edebilirsiniz.
> Kullanım Koşulları: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
> Gizlilik: https://gesblabs.com/gizlilik

**Bu sürümde yenilikler:** İlk sürüm.

| Alan | Değer |
|---|---|
| Kategori | Apple: Business (ikinci: Productivity) · Play: Business |
| Yaş sınırı | 4+ (Apple) · Everyone (Play) — şiddet, kumar, kullanıcılar arası açık sohbet yok |
| Gizlilik politikası | https://gesblabs.com/gizlilik |
| Kullanım koşulları (EULA) | Apple'ın standart sözleşmesi: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ |
| Destek adresi | https://gesblabs.com/studyom (e-posta: destek@gesblabs.com) |
| Hesap silme (Play zorunlu) | https://gesblabs.com/gizlilik#hesap-silme — uygulama içinde de var: Ayarlar → Hesabımı Sil |

---

## 4. Gizlilik formları

Uygulamada analitik, reklam veya izleme kodu yok. Veriler Supabase'de (stüdyonun kendi hesabına bağlı)
tutulur ve yalnızca uygulamanın çalışması için kullanılır.

### Apple — App Privacy

- **Tracking:** No
- **Data Linked to You** (hepsi yalnızca *App Functionality* amacıyla):

| Kategori | Tür | Neden |
|---|---|---|
| Contact Info | Name, Email Address, Phone Number | Hesap; stüdyonun girdiği müşteri bilgileri |
| User Content | Photos or Videos | Müşteri portalı ve portföy galerisi |
| User Content | Other User Content | Notlar, sözleşmeler, teklifler, mesajlar |
| Financial Info | Other Financial Info | Ödeme ve gelir/gider kayıtları (kart bilgisi alınmaz) |
| Identifiers | User ID | Hesap kimliği |
| Purchases | Purchase History | Abonelik durumu (RevenueCat üzerinden; kart bilgisi Apple'da kalır) |

- **Data Not Collected:** Location, Health, Browsing History, Search History, Diagnostics, Usage Data.
- Konuşma tanıma (Sesli Randevu) Apple'ın sistem servisini kullanır; STÜDYOM ses kaydı saklamaz.

### Google Play — Data safety

- Veri toplanıyor mu: **Evet** · Üçüncü taraflarla paylaşılıyor mu: **Hayır**
- Aktarımda şifreli: **Evet** (HTTPS) · Kullanıcı silme isteyebilir: **Evet** (uygulama içi + web adresi)
- Toplanan türler (hepsi *App functionality*, *Account management*):
  Personal info → Name, Email address, Phone number · Photos and videos → Photos ·
  Financial info → Other financial info, **Purchase history** · App activity → Other user-generated content · App info → yok
- Abonelik doğrulaması RevenueCat (hizmet sağlayıcı, bizim adımıza işler) ile yapılır; Play kurallarına
  göre bu "paylaşım" sayılmaz.
- Mikrofon: Sesli randevu için, isteğe bağlı; ses saklanmaz.

---

## 5. App Review notları (Apple)

Apple incelemesi için **çalışan bir deneme hesabı** gerekir (App Store Connect → App Review Information):

- Uygulama içinden bir stüdyo hesabı aç (ör. ayrı bir e-posta ile "İnceleme Stüdyosu"), içine birkaç örnek
  müşteri ve randevu ekle; e-posta ve şifreyi yalnızca bu forma yaz.
- Not alanına (İngilizce):
  > STÜDYOM is a business management app for photography studios. Sign in with the demo account above.
  > The microphone is used only by the optional "Sesli Randevu" (voice appointment) feature to transcribe
  > speech; no audio is stored. Accounts can be deleted in-app: Devamı → Ayarlar → Hesabımı Sil.
  > Subscriptions (Standart, Pro) are offered in Devamı → plan card → "Planlar". New accounts start with a
  > 1-month free trial of all Pro features; purchase buttons are shown on the Standart and Pro cards.

---

## 6. Ekran görüntüleri

| Mağaza | Boyut |
|---|---|
| Apple iPhone 6.9" | 1320 × 2868 (en az 3) |
| Apple iPad 13" (iPad desteklendiği için zorunlu) | 2064 × 2752 (en az 3) |
| Play telefon | 1080 × 1920 veya üstü, 9:16 (en az 2) |
| Play öne çıkan görsel | 1024 × 500 |

Ekran görüntülerinde gerçek müşteri bilgisi kullanılmamalı; deneme hesabındaki örnek verilerle alınmalı.

---

## 7. Uygulama içi abonelik kurulumu (sen yaparsın, bir kez)

Sıra önemli. Özellikle Google, uygulama paketi (AAB) yüklenmeden abonelik ürünü açtırmaz.

### 7.1 Sözleşmeler (ödeme alabilmek için zorunlu)
- **Apple:** App Store Connect → Business → **Paid Apps** sözleşmesini kabul et, banka hesabı ve vergi
  formunu (Türkiye için W-8BEN) doldur. Bu bitmeden abonelikler test bile edilemez.
- **Google:** Play Console → Setup → **Payments profile** (satıcı hesabı) oluştur.

### 7.2 Mağaza ürünleri (adlar birebir aynı olmalı)
| Ürün kimliği | Plan | Süre | Fiyat (TR) |
|---|---|---|---|
| `studyom_standart_aylik` | Standart | 1 ay, otomatik yenilenir | 599,99 ₺ |
| `studyom_pro_aylik` | Pro | 1 ay, otomatik yenilenir | 999,99 ₺ |

- **Apple:** Uygulama → Monetization → **Subscriptions** → grup oluştur ("STÜDYOM Planları") → iki
  abonelik ekle. Grup içi sıralama: **Pro üstte (seviye 1), Standart altta (seviye 2)**. Her birine
  Türkçe görünen ad/açıklama ve inceleme için Planlar ekranının bir görüntüsünü ekle.
  Ardından Users and Access → Integrations → **In-App Purchase** → anahtar oluştur (`.p8`, bir kez
  iner) — bu RevenueCat'e yüklenecek.
- **Google:** (önce bir AAB'yi Internal testing'e yükle) Monetize → Products → **Subscriptions** →
  iki ürün; her birine `aylik` adlı aylık, otomatik yenilenen temel plan (base plan) ekle ve etkinleştir.

### 7.3 RevenueCat (app.revenuecat.com — hesabı sen açarsın, ücretsiz)
1. Proje: **STÜDYOM**.
2. **App Store** uygulaması ekle: bundle `com.gesblabs.studyom`, In-App Purchase anahtarı (`.p8`, Key ID, Issuer ID).
3. **Play Store** uygulaması ekle: paket `com.gesblabs.studyom`, servis hesabı JSON'u (RevenueCat'in
   "Google Play service credentials" adımlarını izle).
4. **Entitlements:** kimlikleri tam olarak `standart` ve `pro` olan iki yetki.
5. **Products:** iki mağazadaki ürünleri içe aktar; `studyom_standart_aylik` → `standart`,
   `studyom_pro_aylik` → `pro` yetkisine bağla.
6. **Offerings:** `default` (current) teklifine iki paket ekle (Standart ve Pro ürünleri).
7. **API keys:** herkese açık anahtarları (`appl_…`, `goog_…`) GitHub'a **Variables** olarak ekle
   (bunlar gizli değil, uygulamaya gömülür): github.com/bekir3535bekir-cmd/omnicod → Settings →
   Secrets and variables → Actions → **Variables** sekmesi → `RC_APPLE_KEY`, `RC_GOOGLE_KEY`.
   Tanımlı değilse yayın derlemesi bunu söyleyerek durur.

### 7.4 Supabase webhook (planı sunucuya yazar)
1. Rastgele bir parola üret (PowerShell; panoya kopyalar, kimseye gönderme):
   ```powershell
   $b = New-Object byte[] 36; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b) | Set-Clipboard
   ```
2. Supabase → proje `uyzuibdcopknklztpmzx` → **Edge Functions** → Secrets:
   - `RC_WEBHOOK_AUTH` = az önce üretilen parola
   - `RC_SECRET_KEY` = RevenueCat → Project settings → API keys → **Secret key** (`sk_…`)
3. Edge Functions → **Deploy a new function** → Via editor → ad `revenuecat-webhook` → depodaki
   `supabase/functions/revenuecat-webhook/index.ts` içeriğini yapıştır → Deploy. Fonksiyon ayarlarında
   **Verify JWT: kapalı** (kimliği parolayla kendisi doğrular).
4. RevenueCat → Integrations → **Webhooks** → URL:
   `https://uyzuibdcopknklztpmzx.supabase.co/functions/v1/revenuecat-webhook` ·
   Authorization header: aynı parola → **Send test event** → 200 dönmeli.

### 7.5 Deneme satın alması (gerçek para çekilmez)
- **Apple:** TestFlight'tan kurulan uygulamada satın almalar otomatik deneme (sandbox) modundadır.
- **Google:** Play Console → Setup → **License testing** → kendi Gmail'ini ekle; Internal testing
  sürümünde alınan abonelikler ücretlendirilmez.
- Kontrol: satın almadan sonra Supabase → Table editor → `studios` → ilgili stüdyonun `plan` alanı
  `pro`/`standart` olmalı; masaüstü programında da plan açılmalı.
