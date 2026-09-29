import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { Card, Pill, PageHeader } from "../common";

export const POSE_LIST = [
  {
    id: "p1",
    category: "Romantik Çift",
    title: "Alın Alına ve Kapalı Gözler",
    tag: "Klasik & Duygusal",
    lens: "85mm f/1.4",
    shutter: "1/500s",
    iso: "100",
    instruction: "'Gözlerinizi yavaşça kapatın, alınlarınızı birbirine değdirin ve sanki dünyada sadece ikiniz varmış gibi derin bir nefes alın.'",
    tip: "Güneşi çiftin tam arkasına alarak saç tellerinin altın sarısı parlamasını sağlayın. Yüzleri gölgede kalırsa gümüş reflektörle yumuşak ışık verin.",
    silhouette: "💑"
  },
  {
    id: "p2",
    category: "Romantik Çift",
    title: "Arkadan Sarılma ve Fısıltı",
    tag: "Samimi & Spontane",
    lens: "50mm f/1.8",
    shutter: "1/640s",
    iso: "100",
    instruction: "'Damat bey, gelinin arkasından sarılın ve kulağına onu ilk gördüğünüz gün ne hissettiğinizi fısıldayın.'",
    tip: "Fısıltı anındaki o tatlı gülümsemeyi ve gelinin başını geriye atışını seri çekimle (Burst) yakalayın.",
    silhouette: "🫂"
  },
  {
    id: "p3",
    category: "Gelinlik & Tül",
    title: "Rüzgarda Uçuşan Gelin Tülü",
    tag: "Dinamik & Masalsı",
    lens: "35mm f/1.4",
    shutter: "1/1250s",
    iso: "160",
    instruction: "'Gelin hanım siz sabit durup kameraya zarifçe bakın, yardımcımız tülü havaya bırakıp hızla kadrajdan kaçacak.'",
    tip: "Enstantaneyi en az 1/1000s tutun. Geniş açı ile çekerek gökyüzünün ve mekanın derinliğini tülle birleştirin.",
    silhouette: "👰"
  },
  {
    id: "p4",
    category: "Doğal & Yürüyüş",
    title: "El Ele Kameraya Doğru Yürüyüş",
    tag: "Hareketli & Neşeli",
    lens: "85mm f/1.8",
    shutter: "1/800s",
    iso: "100",
    instruction: "'Birbirinizin elini tutun, bana doğru yavaşça adımlayın ve birbirinize bakarak en sevdiğiniz tatil anısını konuşun.'",
    tip: "AF-C (Sürekli Netleme) ve Geniş Alan Göz AF kullanın. Kamera seviyenizi hafifçe bel hizasına indirerek çifti daha görkemli gösterin.",
    silhouette: "🚶‍♂️🚶‍♀️"
  },
  {
    id: "p5",
    category: "Damat Tekli",
    title: "Ceket İlikleme ve Saat Bakışı",
    tag: "Karizmatik & Centilmen",
    lens: "50mm f/1.4",
    shutter: "1/400s",
    iso: "100",
    instruction: "'Damat bey, tek elinizle ceketinizin düğmesini iliklerken diğer elinizle saatinize bakın veya hafifçe kol düğmenizi düzeltin.'",
    tip: "Modeli ışığa 45 derece açıyla yerleştirin. Yüzün bir tarafında hafif gölge bırakarak erkeksi yüz hatlarını ve çene çizgisini belirginleştirin.",
    silhouette: "🤵"
  },
  {
    id: "p6",
    category: "Romantik Çift",
    title: "Gelin Kucakta & Dönüş Pozu",
    tag: "Coşkulu & Aşk Dolu",
    lens: "35mm f/2.0",
    shutter: "1/1000s",
    iso: "200",
    instruction: "'Damat bey gelini belinden kavrayıp hafifçe kaldırın ve kendi etrafınızda yarım tur dönün!'",
    tip: "Gelinliğin eteklerinin havada süzüldüğü anı kaçırmamak için yüksek hızlı seri çekim modunda olun.",
    silhouette: "💃🕺"
  },
  {
    id: "p7",
    category: "Gelinlik & Tül",
    title: "Gelin Buketi ve Omuz Üstü Bakış",
    tag: "Zarif & Estetik",
    lens: "85mm f/1.4",
    shutter: "1/500s",
    iso: "100",
    instruction: "'Gelin hanım arkanızı hafif dönün, buketi göğüs hizanızda tutarak omzunuzun üzerinden kameraya tatlı bir bakış atın.'",
    tip: "Omuzları hafif düşürmesini söyleyin. 'S' kıvrımı vererek bel oyuntusunu ve gelinlik sırt detaylarını ön plana çıkarın.",
    silhouette: "💐"
  },
  {
    id: "p8",
    category: "Grup & Nedime",
    title: "Sağdıçlar ile Şampanya Kutlaması",
    tag: "Eğlenceli & Canlı",
    lens: "24mm f/2.8",
    shutter: "1/1600s",
    iso: "250",
    instruction: "'Damat ortada, sağdıçlar etrafında! 3 diyince hep birlikte bağırarak şampanyayı patlatıyoruz!'",
    tip: "Damla damla patlayan köpükleri dondurmak için en az 1/1600s enstantane şarttır. Flaş kullanıyorsanız HSS moduna geçin.",
    silhouette: "🍾"
  },
  {
    id: "p9",
    category: "Detay & Yüzük",
    title: "Alyans ve Davetiye Üzeri Yansıma",
    tag: "Katalog Detayı",
    lens: "90mm ya da 105mm Makro",
    shutter: "1/250s",
    iso: "100",
    instruction: "Durgun masa çekimi. Yüzükleri buketin veya davetiyenin üzerine dikey konumlandırın.",
    tip: "Telefonun siyah ekranını yüzüklerin altına ayna gibi koyun. Diyaframı f/8 veya f/11 yaparak her iki yüzüğü de jilet gibi netleyin.",
    silhouette: "💍"
  },
  {
    id: "p10",
    category: "Damat Tekli",
    title: "Ceket Omuzda & Rahat Duruş",
    tag: "Modern & Cool",
    lens: "85mm f/1.8",
    shutter: "1/640s",
    iso: "100",
    instruction: "'Ceketi tek omzunuza atın, diğer elinizi pantolon cebine koyun ve uzaklara doğru tebessüm edin.'",
    tip: "Arka planı tamamen f/1.8 ile eriterek damadı manzaradan koparın.",
    silhouette: "🕶️"
  }
];

const CATEGORIES = ["Tümü", "Romantik Çift", "Damat Tekli", "Gelinlik & Tül", "Doğal & Yürüyüş", "Grup & Nedime", "Detay & Yüzük"];

export const PozRehberi = () => {
  const [activeCat, setActiveCat] = useState("Tümü");
  const [selectedPose, setSelectedPose] = useState(null);

  const filtered = activeCat === "Tümü" 
    ? POSE_LIST 
    : POSE_LIST.filter(p => p.category === activeCat);

  return (
    <div className="fade-in" style={{ padding: "0 20px 40px" }}>
      <PageHeader 
        title="Poz Rehberi & Moodboard" 
        sub="Dış çekim ve stüdyoda ilham veren profesyonel pozlar ve çifte komut rehberi" 
      />

      {/* Kategori Filtresi */}
      <div style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 14,
        marginBottom: 16,
        scrollbarWidth: "none"
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor: "pointer",
              background: activeCat === cat ? "linear-gradient(135deg, " + T.gold + ", " + T.goldD + ")" : "rgba(255,255,255,0.05)",
              color: activeCat === cat ? "#000" : T.text2,
              border: `1px solid ${activeCat === cat ? T.gold : "rgba(255,255,255,0.08)"}`,
              transition: "all 0.2s ease"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Poz Kartları Izgarası */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        {filtered.map(pose => (
          <div
            key={pose.id}
            onClick={() => setSelectedPose(pose)}
            style={{
              borderRadius: 20,
              padding: "16px 18px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>{pose.silhouette}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{pose.title}</div>
                  <div style={{ fontSize: 11, color: T.goldL, marginTop: 2, fontWeight: 600 }}>{pose.tag} • {pose.category}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, color: T.text3, background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 8 }}>
                Çifte Göster 📱
              </span>
            </div>

            {/* Çifte söylenecek komut */}
            <div style={{
              background: "rgba(232, 197, 71, 0.08)",
              border: "1px solid rgba(232, 197, 71, 0.2)",
              borderRadius: 12,
              padding: "10px 12px",
              margin: "10px 0",
              fontSize: 12.5,
              color: T.text,
              fontStyle: "italic",
              lineHeight: 1.45
            }}>
              🗣️ {pose.instruction}
            </div>

            {/* Kamera Ayarları ve Püf Noktası */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: T.text3, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: T.goldL, fontWeight: 600 }}>📷 {pose.lens}</span>
                <span>⏱️ {pose.shutter}</span>
              </div>
              <span style={{ color: T.text2 }}>İpuçları →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Büyük Görsel / Çifte Gösterme Modalı (Full-Screen Moodboard Card) */}
      {selectedPose && (
        <div 
          onClick={() => setSelectedPose(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 390,
              borderRadius: 28,
              padding: "24px 22px",
              background: "linear-gradient(135deg, rgba(30,30,35,0.95), rgba(15,15,20,0.98))",
              border: `1.5px solid ${T.gold}55`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.2)",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {selectedPose.silhouette}
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>
              {selectedPose.title}
            </div>

            <div style={{ fontSize: 12, color: T.goldL, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>
              {selectedPose.category} • {selectedPose.tag}
            </div>

            <div style={{
              background: "rgba(232, 197, 71, 0.12)",
              border: `1px solid ${T.gold}44`,
              borderRadius: 16,
              padding: "14px 16px",
              fontSize: 14,
              color: T.text,
              lineHeight: 1.5,
              marginBottom: 16,
              textAlign: "left"
            }}>
              <div style={{ fontSize: 11, color: T.goldL, fontWeight: 700, marginBottom: 4 }}>
                🗣️ ÇİFTE SÖYLENECEK YÖNLENDİRME:
              </div>
              {selectedPose.instruction}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 12,
              color: T.text2,
              lineHeight: 1.5,
              textAlign: "left",
              marginBottom: 18
            }}>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, marginBottom: 4 }}>
                💡 FOTOĞRAFÇIYA IŞIK & AÇI TAVSİYESİ:
              </div>
              {selectedPose.tip}
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-around",
              padding: "10px 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12,
              color: T.text3,
              marginBottom: 16
            }}>
              <div>Lens: <strong style={{ color: T.text }}>{selectedPose.lens}</strong></div>
              <div>Enstantane: <strong style={{ color: T.text }}>{selectedPose.shutter}</strong></div>
              <div>ISO: <strong style={{ color: T.text }}>{selectedPose.iso}</strong></div>
            </div>

            <button
              onClick={() => setSelectedPose(null)}
              style={{
                width: "100%",
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldD})`,
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
                padding: "12px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer"
              }}
            >
              Tamam, Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
