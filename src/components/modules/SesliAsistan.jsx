import React, { useState, useEffect } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { Card, Pill, PageHeader, GoldButton, Field } from "../common";
import { uid, todayStr } from "../../utils/helpers";
import { sb, toDB } from "../../services/supabase";
import { canAddClient, canAddAppointment } from "../../services/plan";

const MONTH_NAMES = {
  ocak: "01", subat: "02", şubat: "02", mart: "03", nisan: "04", mayis: "05", mayıs: "05",
  haziran: "06", temmuz: "07", agustos: "08", ağustos: "08", eylul: "09", eylül: "09",
  ekim: "10", kasim: "11", kasım: "11", aralik: "12", aralık: "12"
};

// Metin akıllı ayrıştırma fonksiyonu
export const parseVoiceCommand = (text) => {
  const lower = (text || "").toLocaleLowerCase("tr-TR").trim();
  const year = new Date().getFullYear();
  // Tarih ifadesi (örn: "15 temmuz", "24 ağustos 2027") — tür ve isim tespitinden önce metinden çıkarılır
  const dateMatch = lower.match(/(\d{1,2})\s*(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)(?:\s+(\d{4}))?/i);
  const body = dateMatch ? lower.replace(dateMatch[0], " ") : lower;

  // Çekim Türü
  let type = "Dış Çekim";
  if (body.includes("düğün") || body.includes("dugun")) type = "Düğün";
  else if (body.includes("nişan") || body.includes("nisan")) type = "Nişan";
  else if (body.includes("kına") || body.includes("kina")) type = "Kına";
  else if (body.includes("sünnet") || body.includes("sunnet")) type = "Sünnet";
  else if (body.includes("save the date")) type = "Save The Date";
  else if (body.includes("stüdyo") || body.includes("studyo")) type = "Stüdyo Portre";

  // Saat (örn: 14:00, saat 16, saat 17 30)
  let time = "15:00";
  const timeRegex = /(?:saat\s*)?(\d{1,2})[:.](\d{2})|saat\s*(\d{1,2})/i;
  const timeMatch = lower.match(timeRegex);
  if (timeMatch) {
    if (timeMatch[1] && timeMatch[2]) {
      time = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
    } else if (timeMatch[3]) {
      time = `${timeMatch[3].padStart(2, "0")}:00`;
    }
  }

  // Tarih (örn: 15 temmuz, 24 ağustos 2026, yarın)
  let date = todayStr();
  if (lower.includes("yarın") || lower.includes("yarin")) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    date = `${tmr.getFullYear()}-${String(tmr.getMonth()+1).padStart(2,"0")}-${String(tmr.getDate()).padStart(2,"0")}`;
  } else if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = MONTH_NAMES[dateMatch[2]] || "01";
    let y = dateMatch[3] ? Number(dateMatch[3]) : year;
    // Yıl söylenmediyse ve tarih geçmişte kaldıysa gelecek yılı kastediyordur
    if (!dateMatch[3] && `${y}-${month}-${day}` < todayStr()) y += 1;
    date = `${y}-${month}-${day}`;
  }

  // Tutar ve Kapora (örn: "15 bin lira", "kapora 3 bin", "kaporası 2000")
  // Söylenmeyen tutar 0 kalır — varsayılan rakam uydurulmaz
  const toNum = (n, bin) => parseInt(n, 10) * (bin ? 1000 : 1);
  let totalAmount = 0;
  let deposit = 0;

  const depositMatch = lower.match(/kapora(?:s[ıi])?\s*(\d+)\s*(bin)?/);
  if (depositMatch) deposit = toNum(depositMatch[1], depositMatch[2]);

  // Toplam tutar: kapora ifadesi dışındaki ilk "X (bin) lira/tl"
  const rest = depositMatch ? lower.replace(depositMatch[0], " ") : lower;
  const amountMatch = rest.match(/(\d+)\s*(bin)?\s*(?:lira|tl|₺)/);
  if (amountMatch) totalAmount = toNum(amountMatch[1], amountMatch[2]);

  // İsim tespiti (örn: "Ayşe ve Burak çiftine", "Zeynep Kaya için")
  let clientName = "Yeni Müşteri";
  const nameMatch = body.match(/([a-zçğıöşüA-ZÇĞİÖŞÜ\s&'’]+?)(?:\s+çiftine|\s+için|\s+dış|\s+düğün|\s+nişan|\s+kına|\s+sünnet|\s+randevusu)/i);
  if (nameMatch && nameMatch[1].trim().length > 2) {
    const raw = nameMatch[1].trim();
    // Fazlalık kelimeleri temizle
    const cleaned = raw
      .replace(/(?:^|\s)['’]?(?:da|de|ta|te)(?=\s|$)/gi, " ")   // "16:00'da" ekinden kalan
      .replace(/\b(?:ekle|yeni|randevu|saat|lira|tl)\b|\d+/gi, " ")
      .replace(/['’]/g, "")
      .replace(/\s+/g, " ").trim();
    if (cleaned.length > 2) {
      clientName = cleaned.split(" ")
        .map(w => w === "ve" ? w : w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
        .join(" ");
    }
  }

  return { clientName, date, time, type, totalAmount, deposit };
};

export const SesliAsistan = ({ data, setData, setActive }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Web Speech Recognition
  const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Tarayıcınız ses tanımayı desteklemiyor. Aşağıdaki metin kutusuna konuşur gibi yazabilirsiniz!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "tr-TR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListening(true);
        setSavedSuccess(false);
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        const result = parseVoiceCommand(text);
        setParsed(result);
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } catch (e) {
      setListening(false);
    }
  };

  const handleManualParse = (text) => {
    setTranscript(text);
    const result = parseVoiceCommand(text);
    setParsed(result);
  };

  // Randevuyu ve müşteriyi kaydet
  const handleSave = () => {
    if (!parsed) return;
    const exists = data.clients.some(c => c.name.toLowerCase() === parsed.clientName.toLowerCase());
    if ((!exists && !canAddClient(data).allowed) || !canAddAppointment(data).allowed) {
      alert("Plan limitine ulaşıldı. Devam etmek için Pro'ya geçebilirsiniz.");
      if (setActive) setActive("planyonetimi");
      return;
    }

    const newClientId = uid();
    const newAptId = uid();
    const depositId = uid();

    const newClient = {
      id: newClientId,
      name: parsed.clientName,
      phone: "",
      email: "",
      type: parsed.type,
      package: data.packages?.[0]?.name || "",
      status: "aktif",
      notes: `Sesli komutla eklendi: "${transcript}"`,
      totalAmount: parsed.totalAmount,
      paid: parsed.deposit,
      date: parsed.date,
      createdAt: todayStr(),
      process: {},
      payments: parsed.deposit > 0 ? [{
        id: depositId,
        amount: parsed.deposit,
        type: "Ödeme Alındı",
        method: "Nakit",
        date: todayStr(),
        note: "Sesli asistan ile alınan kapora"
      }] : []
    };

    const newAppointment = {
      id: newAptId,
      clientId: newClientId,
      clientName: parsed.clientName,
      date: parsed.date,
      time: parsed.time,
      type: parsed.type,
      status: "onaylı",
      location: "Stüdyo / Dış Mekan",
      package: newClient.package,
      totalAmount: parsed.totalAmount,
      kapora: parsed.deposit,
      reminderDays: 3,
      notes: `Sesli komutla eklendi: "${transcript}"`
    };

    const depositIncome = parsed.deposit > 0 ? {
      id: depositId,
      clientName: parsed.clientName,
      amount: parsed.deposit,
      type: "Kapora",
      method: "Nakit",
      date: todayStr(),
      note: "Kapora ödemesi",
      category: parsed.type
    } : null;

    setData(prev => ({
      ...prev,
      clients: [newClient, ...prev.clients],
      appointments: [newAppointment, ...prev.appointments],
      incomes: depositIncome ? [depositIncome, ...prev.incomes] : prev.incomes
    }));
    sb.upsert("clients", toDB.clients(newClient)).catch(() => {});
    sb.upsert("appointments", toDB.appointments(newAppointment)).catch(() => {});
    if (depositIncome) sb.upsert("incomes", toDB.incomes(depositIncome)).catch(() => {});

    setSavedSuccess(true);
    setTimeout(() => {
      if (setActive) setActive("ajanda");
    }, 1200);
  };

  return (
    <div className="fade-in" style={{ padding: "0 20px 40px" }}>
      <PageHeader 
        title="Sesli Hızlı Randevu Asistanı" 
        sub="Yoldayken veya çekimdeyken konuşarak tek tıkla ajandaya randevu ekleyin" 
      />

      {/* Mikrofon ve Dinleme Kartı */}
      <div style={{
        borderRadius: 24,
        padding: "28px 20px",
        background: listening 
          ? "linear-gradient(135deg, rgba(232, 71, 71, 0.15) 0%, rgba(255,255,255,0.02) 100%)"
          : "linear-gradient(135deg, rgba(232, 197, 71, 0.1) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1.5px solid ${listening ? T.redL + "77" : T.gold + "44"}`,
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        textAlign: "center",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Pulsing Mic Button */}
        <button
          onClick={startListening}
          disabled={listening}
          style={{
            width: 80,
            height: 80,
            borderRadius: 99,
            background: listening ? "linear-gradient(135deg, #e53935, #b71c1c)" : `linear-gradient(135deg, ${T.gold}, ${T.goldD})`,
            border: "none",
            color: "#000",
            fontSize: 32,
            cursor: "pointer",
            boxShadow: listening ? "0 0 30px rgba(229, 57, 53, 0.6)" : `0 0 25px ${T.gold}55`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            animation: listening ? "pulse 1s infinite alternate" : "none"
          }}
        >
          {listening ? "🎙️" : "🎤"}
        </button>

        <div style={{ fontSize: 16, fontWeight: 700, color: listening ? T.redL : T.text, marginTop: 16 }}>
          {listening ? "Sizi dinliyorum, konuşun..." : "Konuşmak İçin Dokunun"}
        </div>

        <div style={{ fontSize: 12.5, color: T.text3, marginTop: 6, lineHeight: 1.5 }}>
          Örnek: <em>"15 Temmuz saat 16:00'da Ayşe ve Burak dış çekim 15 bin lira kapora 3 bin lira"</em>
        </div>

        {/* Metin elle giriş alternatifi */}
        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Veya buraya konuşur gibi yazın..."
            value={transcript}
            onChange={(e) => handleManualParse(e.target.value)}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${T.border}`,
              color: T.text,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              outline: "none"
            }}
          />
          <button
            onClick={() => handleManualParse(transcript)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: `1px solid ${T.border}`,
              color: T.text,
              borderRadius: 12,
              padding: "0 16px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            Ayrıştır
          </button>
        </div>
      </div>

      {/* Ayrıştırılan Randevu Kartı & Onay */}
      {parsed && (
        <Card glow style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.goldL, textTransform: "uppercase" }}>
              ✨ Algılanan Randevu Bilgileri
            </div>
            <Pill label={parsed.type} color={T.goldL} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: T.text3 }}>MÜŞTERİ / ÇİFT</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 2 }}>{parsed.clientName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.text3 }}>TARİH & SAAT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginTop: 2 }}>{parsed.date} • {parsed.time}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.text3 }}>TOPLAM TUTAR</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.greenL, marginTop: 2 }}>{parsed.totalAmount.toLocaleString("tr-TR")}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.text3 }}>ALINAN KAPORA</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.goldL, marginTop: 2 }}>{parsed.deposit.toLocaleString("tr-TR")}</div>
            </div>
          </div>

          {savedSuccess ? (
            <div style={{
              background: "rgba(76, 175, 80, 0.15)",
              border: "1px solid #4CAF50",
              color: "#4CAF50",
              borderRadius: 12,
              padding: "12px",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14
            }}>
              🎉 Randevu Ajandaya Başarıyla Eklendi!
            </div>
          ) : (
            <GoldButton full onClick={handleSave} label="✅ Onayla ve Ajandaya Ekle"/>
          )}
        </Card>
      )}
    </div>
  );
};
