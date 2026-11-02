// ════════════════════════════════════════════════
// İLK ZİYARET İPUÇLARI — bir ekran ilk kez açıldığında üstte gösterilen kısa tanıtım
// "Anladım" denince o ekranda bir daha çıkmaz; Ayarlar'dan yeniden açılabilir.
// ════════════════════════════════════════════════

export const TIPS = {
  dashboard: {
    title: "STÜDYOM'a hoş geldiniz",
    text: "Ana sayfa, günün özetini gösterir.",
    points: [
      "Bu ayki ciro, bekleyen tahsilat ve teslimler, sıradaki çekimler burada.",
      "Kartlara dokunarak ilgili ekrana geçebilirsiniz.",
      "Sağ alttaki kalemle hızlı not alır, büyüteçle her şeyi ararsınız.",
    ],
  },
  ajanda: {
    title: "Ajanda",
    text: "Düğün ve çekim randevularınızı buradan yönetirsiniz.",
    points: [
      "\"Randevu Ekle\" ile tarih, saat, yer ve görevli personeli girin.",
      "Randevudan müşteriye WhatsApp ile hatırlatma gönderebilirsiniz.",
    ],
  },
  takvim: {
    title: "Takvim",
    text: "Bütün randevularınızı ay ay görürsünüz.",
    points: [
      "Bir güne dokunarak o günün çekimlerini açın.",
      "Dolu ve boş günleri bir bakışta görüp yeni rezervasyonu planlayın.",
    ],
  },
  musteriler: {
    title: "Müşteriler",
    text: "Her müşterinin paketi, ödemeleri ve teslim süreci tek kartta.",
    points: [
      "\"Ekle\" ile müşteri ve etkinlik bilgilerini girin.",
      "Aldığınız ödemeleri müşteri kartından kaydedin; kalan bakiye kendiliğinden hesaplanır.",
      "Albüm ve dijital teslim durumunu kart üzerinden takip edin.",
    ],
  },
  hatirlatici: {
    title: "Hatırlatıcılar",
    text: "Unutulmaması gereken her iş için tarihli hatırlatma kurun.",
    points: [
      "Randevu, ödeme günü veya genel bir iş için hatırlatıcı ekleyin.",
      "Bekleyen hatırlatmalar üstteki zil simgesinde işaretlenir.",
      "İşi bitirdiğinizde hatırlatmayı tamamlandı olarak işaretleyin.",
    ],
  },
  mesajlar: {
    title: "Mesajlar",
    text: "Müşterilerinizle yazışmalarınız burada toplanır.",
    points: [
      "Bir müşteri seçip mesaj yazın.",
      "Sık gönderdiğiniz mesajlar için Hazır Şablonlar'ı kullanın.",
    ],
  },
  muhasebe: {
    title: "Muhasebe",
    text: "Gelir, gider ve kasanızı takip edersiniz.",
    points: [
      "Müşteri ödemeleri gelir olarak buraya da yansır.",
      "Giderlerinizi ekleyin, aylık net kârınızı görün.",
      "Vergi sekmesinde tahmini KDV ve gelir vergisi hesaplanır.",
    ],
  },
  teklif: {
    title: "Fiyat Teklifi",
    text: "Müşteriye özel teklif hazırlayıp gönderirsiniz.",
    points: [
      "Paket ve ek hizmetleri seçin; toplam tutar kendiliğinden hesaplanır.",
      "Hazırladığınız teklifi WhatsApp ile müşteriye iletin.",
    ],
  },
  sozlesmeler: {
    title: "Sözleşmeler",
    text: "Müşteri sözleşmelerinizi hazırlar ve yazdırırsınız.",
    points: [
      "Müşteri ve paket bilgileri sözleşmeye kendiliğinden eklenir.",
      "Sözleşmeyi yazdırabilir veya PDF olarak kaydedebilirsiniz.",
    ],
  },
  paketler: {
    title: "Paketler & Fiyatlar",
    text: "Sunduğunuz hizmet paketlerini ve fiyatlarını tanımlarsınız.",
    points: [
      "Burada tanımladığınız paketler müşteri ve teklif ekranlarında seçilir.",
    ],
  },
  raporlar: {
    title: "Raporlar",
    text: "İşinizin gidişatını rakamlarla görürsünüz.",
    points: [
      "Aylık ve yıllık ciro, yoğun sezonlar ve müşterilerin sizi nereden bulduğu.",
    ],
  },
  sablonlar: {
    title: "Hazır Şablonlar",
    text: "Sık gönderdiğiniz mesajları bir kez yazın, sonra tek dokunuşla kullanın.",
    points: [
      "Randevu onayı, ödeme hatırlatması, teslim bildirimi gibi şablonlar oluşturun.",
    ],
  },
  portal: {
    title: "Müşteri Portalı",
    text: "Müşterileriniz albüm fotoğraflarını kendileri seçer.",
    points: [
      "Müşterinin fotoğraflarını yükleyin ve bağlantıyı gönderin.",
      "Müşteri; stüdyo kodu, adı ve telefonunun son 4 hanesiyle girer.",
      "Yaptığı seçimleri buradan görürsünüz.",
    ],
  },
  galeri: {
    title: "Portföy Galerisi",
    text: "Çalışmalarınızı kategorilere ayırarak saklarsınız.",
    points: [
      "Müşteri adaylarına örnek gösterirken kullanın.",
    ],
  },
  ekip: {
    title: "Ekip & Shift",
    text: "Personelinizi ve görev dağılımını yönetirsiniz.",
    points: [
      "Personel ekleyin; her biri kendi telefon numarası ve şifresiyle girer.",
      "Çekimlere görevli atayın; personel kendi görevlerini kendi ekranında görür.",
    ],
  },
  isasistani: {
    title: "İş Asistanı",
    text: "Gözden kaçabilecek işleri sizin için bulur.",
    points: [
      "Geciken ödemeleri, teslimleri ve eksik kayıtları listeler.",
    ],
  },
  notdefteri: {
    title: "Not Defteri",
    text: "Aklınıza gelenleri etiketleyerek not alırsınız.",
    points: [
      "Sağ alttaki kalem simgesiyle her ekrandan hızlıca not ekleyebilirsiniz.",
    ],
  },
  altinsaat: {
    title: "Altın Saat & Işık",
    text: "Dış çekim için en iyi ışık saatlerini hesaplar.",
    points: [
      "Gün doğumu, gün batımı, altın saat ve mavi saati gösterir.",
    ],
  },
  pozrehberi: {
    title: "Poz Rehberi",
    text: "Çekimde kullanabileceğiniz poz önerileri ve çiftlere verebileceğiniz komutlar.",
    points: [],
  },
  kartvizit: {
    title: "Dijital Kartvizit",
    text: "QR kodlu kartvizitinizi gösterirsiniz.",
    points: [
      "Düğünde tanıştığınız kişiler QR kodu okutup bilgilerinizi rehberine kaydeder.",
    ],
  },
  sesliasistan: {
    title: "Sesli Randevu",
    text: "Konuşarak randevu ve not eklersiniz.",
    points: [
      "Mikrofon simgesine basıp konuşun; söyledikleriniz kayda dönüşür.",
    ],
  },
};

const KEY = "studyom_tip_seen_";

export const isTipSeen = (id) => {
  try { return localStorage.getItem(KEY + id) === "1"; } catch (e) { return true; }
};
export const markTipSeen = (id) => {
  try { localStorage.setItem(KEY + id, "1"); } catch (e) {}
};
// Ayarlar → "İpuçlarını yeniden göster"
export const resetTips = () => {
  try { Object.keys(TIPS).forEach(id => localStorage.removeItem(KEY + id)); } catch (e) {}
};
