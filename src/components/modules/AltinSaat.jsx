import React, { useState, useMemo } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { Card, Pill, PageHeader, GoldButton } from "../common";
import { fmtDate } from "../../utils/helpers";

// Türkiye şehirleri koordinatları
export const TURKEY_CITIES = [
  { name: "İstanbul", lat: 41.0082, lon: 28.9784 },
  { name: "İzmir", lat: 38.4237, lon: 27.1428 },
  { name: "Ankara", lat: 39.9334, lon: 32.8597 },
  { name: "Kocaeli / Gebze", lat: 40.8027, lon: 29.4307 },
  { name: "Bursa", lat: 40.1885, lon: 29.0610 },
  { name: "Antalya", lat: 36.8969, lon: 30.7133 },
  { name: "Muğla / Bodrum", lat: 37.0344, lon: 27.4305 },
  { name: "Nevşehir / Kapadokya", lat: 38.6247, lon: 34.7142 },
  { name: "Trabzon", lat: 41.0027, lon: 39.7168 },
  { name: "Adana", lat: 37.0000, lon: 35.3213 },
  { name: "Gaziantep", lat: 37.0662, lon: 37.3833 },
  { name: "Eskişehir", lat: 39.7767, lon: 30.5206 }
];

// Güneş hesaplama algoritması (SunCalc approx)
export const calculateSunTimes = (date, lat, lon) => {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - startOfYear) / (1000 * 60 * 60 * 24));

  // Güneş deklinasyonu
  const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
  
  // Güneş öğle vakti (solar noon) saat olarak (Türkiye UTC+3)
  const timeZoneOffset = 3;
  const solarNoon = 12 + (45 - lon) / 15; // 45° doğu meridyeni baz alınır (UTC+3)

  // Saat açısı (hour angle)
  const radLat = (lat * Math.PI) / 180;
  const radDec = (declination * Math.PI) / 180;
  
  // Standart gün doğumu/batımı açısı (-0.83°)
  const cosH0 = (Math.sin((-0.83 * Math.PI) / 180) - Math.sin(radLat) * Math.sin(radDec)) / (Math.cos(radLat) * Math.cos(radDec));
  const clampedCosH0 = Math.max(-1, Math.min(1, cosH0));
  const H0 = (Math.acos(clampedCosH0) * 180) / Math.PI / 15;

  // Altın saat açısı (+6° ufuk üstü)
  const cosHGolden = (Math.sin((6 * Math.PI) / 180) - Math.sin(radLat) * Math.sin(radDec)) / (Math.cos(radLat) * Math.cos(radDec));
  const clampedCosHGolden = Math.max(-1, Math.min(1, cosHGolden));
  const HGolden = (Math.acos(clampedCosHGolden) * 180) / Math.PI / 15;

  // Mavi saat açısı (-6° ufuk altı)
  const cosHBlue = (Math.sin((-6 * Math.PI) / 180) - Math.sin(radLat) * Math.sin(radDec)) / (Math.cos(radLat) * Math.cos(radDec));
  const clampedCosHBlue = Math.max(-1, Math.min(1, cosHBlue));
  const HBlue = (Math.acos(clampedCosHBlue) * 180) / Math.PI / 15;

  const toTimeStr = (decimalHours) => {
    let h = Math.floor(decimalHours);
    let m = Math.round((decimalHours - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    h = (h + 24) % 24;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const sunrise = solarNoon - H0;
  const sunset = solarNoon + H0;
  const goldenEveningStart = solarNoon + HGolden;
  const blueHourEveningEnd = solarNoon + HBlue;
  const goldenMorningEnd = solarNoon - HGolden;

  return {
    dawn: toTimeStr(solarNoon - HBlue),
    sunrise: toTimeStr(sunrise),
    goldenMorning: `${toTimeStr(sunrise)} - ${toTimeStr(goldenMorningEnd)}`,
    solarNoon: toTimeStr(solarNoon),
    goldenEvening: `${toTimeStr(goldenEveningStart)} - ${toTimeStr(sunset)}`,
    sunset: toTimeStr(sunset),
    blueHour: `${toTimeStr(sunset)} - ${toTimeStr(blueHourEveningEnd)}`,
    goldenStartHours: goldenEveningStart,
    sunsetHours: sunset
  };
};

export const AltinSaat = ({ appointments = [], onSelectAppointment }) => {
  const [selectedCity, setSelectedCity] = useState(TURKEY_CITIES[3]); // Kocaeli varsayılan
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Güneş zamanları
  const sunTimes = useMemo(() => {
    return calculateSunTimes(selectedDate, selectedCity.lat, selectedCity.lon);
  }, [selectedDate, selectedCity]);

  // Canlı geri sayım / durum
  const now = new Date();
  const currentHours = now.getHours() + now.getMinutes() / 60;
  const isToday = selectedDate === now.toISOString().split("T")[0];

  let statusText = "Çekim tarihine göre altın saat planlandı";
  let statusColor = T.goldL;
  if (isToday) {
    if (currentHours < sunTimes.goldenStartHours) {
      const diffMins = Math.round((sunTimes.goldenStartHours - currentHours) * 60);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      statusText = `Akşam altın saatine ${h > 0 ? h + " saat " : ""}${m} dakika kaldı! 🌅`;
      statusColor = T.goldL;
    } else if (currentHours <= sunTimes.sunsetHours) {
      statusText = `ŞU ANDA ALTIN SAATTESİNİZ! En iyi kareleri şimdi yakalayın! ✨📸`;
      statusColor = T.greenL;
    } else {
      statusText = `Bugünkü altın saat bitti. Mavi saat ve gece çekim moduna geçildi 🌙`;
      statusColor = T.blueL;
    }
  }

  // Yaklaşan dış çekim randevuları
  const outdoorApts = appointments.filter(a => 
    (a.type || "").toLowerCase().includes("dış") || 
    (a.type || "").toLowerCase().includes("dis") || 
    (a.type || "").toLowerCase().includes("düğün")
  ).slice(0, 4);

  return (
    <div className="fade-in" style={{ padding: "0 20px 40px" }}>
      <PageHeader 
        title="Altın Saat & Işık Sihirbazı" 
        sub="Dış mekan çekimlerinde mükemmel ters ışık ve gün batımı dakikaları" 
      />

      {/* Şehir ve Tarih Seçimi */}
      <Card glow style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>
              📍 ÇEKİM ŞEHRİ
            </label>
            <select
              value={selectedCity.name}
              onChange={(e) => {
                const found = TURKEY_CITIES.find(c => c.name === e.target.value);
                if (found) setSelectedCity(found);
              }}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                outline: "none"
              }}
            >
              {TURKEY_CITIES.map(c => (
                <option key={c.name} value={c.name} style={{ background: "#111", color: "#fff" }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: T.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>
              📅 ÇEKİM TARİHİ
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${T.border}`,
                color: T.text,
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: 13,
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Canlı Durum Bandı */}
        <div style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${statusColor}33`,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <span style={{ fontSize: 18 }}>⏱️</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: statusColor }}>
            {statusText}
          </span>
        </div>
      </Card>

      {/* Ana Altın Saat Kartı (Liquid Glass Highlight) */}
      <div style={{
        marginBottom: 20,
        borderRadius: 24,
        padding: "20px 20px 22px",
        background: "linear-gradient(135deg, rgba(232, 197, 71, 0.14) 0%, rgba(255, 140, 0, 0.05) 50%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1.5px solid rgba(232, 197, 71, 0.35)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow rim */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(232, 197, 71, 0.8), transparent)"
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🌅</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", color: T.goldL, textTransform: "uppercase" }}>
                GÜN BATIMI & EN İYİ IŞIK
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 2 }}>
                Akşam Altın Saati (Golden Hour)
              </div>
            </div>
          </div>
          <Pill label="Önerilen Aralık" color={T.goldL} />
        </div>

        <div style={{
          fontSize: 32,
          fontWeight: 800,
          color: T.goldL,
          fontFamily: "'Playfair Display', serif",
          letterSpacing: "1px",
          margin: "12px 0 6px"
        }}>
          {sunTimes.goldenEvening}
        </div>

        <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.5, marginTop: 6 }}>
          Bu aralıkta güneş açısı ufka 6° yaklaşır. Saç ve tül detaylarında altın yaldızlı ters ışık (rim light) elde etmek için çiftinizi bu saatte hazır tutun.
        </div>
      </div>

      {/* Günlük Işık Takvimi Zaman Çizelgesi */}
      <Card style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text3, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 14 }}>
          ☀️ Günlük Işık Evreleri
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "🌄", label: "Sabah Altın Saati", val: sunTimes.goldenMorning, note: "Erken sabah dış çekimleri için yumuşak ışık", col: T.goldL },
            { icon: "☀️", label: "Öğle Zirve Güneşi", val: sunTimes.solarNoon, note: "Sert gölgeler! Difüzör veya ağaç gölgesi önerilir", col: T.orangeL },
            { icon: "🌇", label: "Gün Batımı", val: sunTimes.sunset, note: "Güneşin ufukta kaybolduğu son silüet anı", col: T.goldL },
            { icon: "🌌", label: "Mavi Saat (Blue Hour)", val: sunTimes.blueHour, note: "Gökyüzü laciverte bürünür, sıcak LED ile harika kontrast", col: T.blueL }
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{item.note}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.col, fontFamily: "monospace" }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Yaklaşan Dış Çekimler Hızlı Seçim */}
      {outdoorApts.length > 0 && (
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text3, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>
            📋 Ajandadaki Dış Çekimlerin Altın Saatleri
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {outdoorApts.map(apt => (
              <div
                key={apt.id}
                onClick={() => setSelectedDate(apt.date)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: selectedDate === apt.date ? "rgba(232, 197, 71, 0.12)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selectedDate === apt.date ? T.gold + "55" : "rgba(255,255,255,0.06)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{apt.clientName}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{fmtDate(apt.date)} • {apt.location || "Mekan belirtilmedi"}</div>
                </div>
                <div style={{ fontSize: 11, color: T.goldL, fontWeight: 600 }}>
                  Hesapla →
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
