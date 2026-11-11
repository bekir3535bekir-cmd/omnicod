# STÜDYOM — App Store ve Google Play yayın rehberi

Bu belge mağaza yayını için gereken her şeyi tek yerde toplar: anahtar kurulumu, derleme, mağaza
metinleri ve gizlilik formlarının cevapları. Uygulama kimliği her iki mağazada: `com.gesblabs.studyom`.

> **Açık karar — uygulama içi satın alma:** Standart ve Pro planları dijital abonelik. Apple (3.1.1) ve
> Google Play, uygulama içinde açılan dijital içerik için kendi ödeme sistemlerini ister; kullanıcıyı web
> sitesine yönlendirmek reddedilme sebebidir. Gönderimden önce karar verilmeli: (a) mağaza sürümüne
> uygulama içi satın alma eklemek, ya da (b) telefon sürümünden fiyat ve "web'den yükselt" notunu tamamen
> kaldırmak. Şu an telefonda `NativeUpgradeNote` ("…masaüstü programından veya web sitemizden
> yükseltebilirsiniz") görünüyor.

---

## 1. Anahtarlar (bir kez, sen yaparsın)

Anahtarları kimseye gönderme; doğrudan GitHub'a eklenir:
**github.com/bekir3535bekir-cmd/omnicod → Settings → Secrets and variables → Actions → New repository secret**

### Apple (TestFlight yüklemesi için)

1. **Ekip kimliği:** developer.apple.com → Account → Membership → *Team ID* (10 karakter).
   Secret adı: `APPLE_TEAM_ID`
2. **API anahtarı:** App Store Connect → Users and Access → Integrations → App Store Connect API →
   Team Keys → (+). Rol: **App Manager**. `.p8` dosyası **yalnızca bir kez** indirilebilir, sakla.
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

**Bu sürümde yenilikler:** İlk sürüm.

| Alan | Değer |
|---|---|
| Kategori | Apple: Business (ikinci: Productivity) · Play: Business |
| Yaş sınırı | 4+ (Apple) · Everyone (Play) — şiddet, kumar, kullanıcılar arası açık sohbet yok |
| Gizlilik politikası | https://gesblabs.com/gizlilik |
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

- **Data Not Collected:** Location, Health, Browsing History, Search History, Diagnostics, Usage Data.
- Konuşma tanıma (Sesli Randevu) Apple'ın sistem servisini kullanır; STÜDYOM ses kaydı saklamaz.

### Google Play — Data safety

- Veri toplanıyor mu: **Evet** · Üçüncü taraflarla paylaşılıyor mu: **Hayır**
- Aktarımda şifreli: **Evet** (HTTPS) · Kullanıcı silme isteyebilir: **Evet** (uygulama içi + web adresi)
- Toplanan türler (hepsi *App functionality*, *Account management*):
  Personal info → Name, Email address, Phone number · Photos and videos → Photos ·
  Financial info → Other financial info · App activity → Other user-generated content · App info → yok
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

---

## 6. Ekran görüntüleri

| Mağaza | Boyut |
|---|---|
| Apple iPhone 6.9" | 1320 × 2868 (en az 3) |
| Apple iPad 13" (iPad desteklendiği için zorunlu) | 2064 × 2752 (en az 3) |
| Play telefon | 1080 × 1920 veya üstü, 9:16 (en az 2) |
| Play öne çıkan görsel | 1024 × 500 |

Ekran görüntülerinde gerçek müşteri bilgisi kullanılmamalı; deneme hesabındaki örnek verilerle alınmalı.
