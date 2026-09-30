import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE, isComplete } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { PlanBadge, UsageBadge } from "../common/ProGate";
import { canAddAppointment, getTrialInfo } from "../../services/plan";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession, getAuthUser } from "../../services/storage";

// ─── GÜNÜN FOTOĞRAF ÇEKİM TEKNİKLERİ KOLEKSİYONU ────────────────────────
export const PHOTO_TECHNIQUES = [
  {
    category: "Işık & Dış Çekim",
    icon: "🌅",
    title: "Altın Saatte Gelinlik Ters Işığı (Rim Light)",
    tip: "Güneşi çiftin tam arkasına alarak saç ve tül hatlarını parlatın. Yüzdeki sert gölgeleri yumuşatmak için önden 1/64 güçte HSS dolgu flaşı veya gümüş reflektör kullanın.",
    tag: "Dış Çekim"
  },
  {
    category: "Pozlama & Detay",
    icon: "👰",
    title: "Gelinlik Dokusunu Kurtarma (Zebra %95)",
    tip: "Gelinliğin beyaz dantel detaylarının patlamaması için vizörde Zebra uyarısını %95'e ayarlayın. Çizgiler belirdiğinde pozlamayı -0.3 veya -0.7 EV düşürün; RAW işlerken dokular kusursuz kalır.",
    tag: "Gelinlik"
  },
  {
    category: "Stüdyo Işığı",
    icon: "💡",
    title: "Klasik Rembrandt Portre Işığı",
    tip: "Ana ışığı (Key light) modelin 45° sağına ve 45° yukarıya yerleştirin. Modelin gölgede kalan yanağında burun gölgesiyle birleşen karakteristik üçgen ışık formu oluşturun.",
    tag: "Stüdyo"
  },
  {
    category: "Netleme & Hız",
    icon: "🎯",
    title: "Göz Takibi (Eye-AF) ve Düğün Yürüyüşü",
    tip: "Gelin ve damat size doğru yürürken AF-C (Sürekli Netleme) ve Geniş Alan Göz AF moduna geçin. Enstantaneyi en az 1/500s tutarak hareket fluğunu tamamen engelleyin.",
    tag: "Netleme"
  },
  {
    category: "Lens & Perspektif",
    icon: "🔍",
    title: "85mm ile Arka Plan Sıkıştırma",
    tip: "Dış çekimlerde 85mm f/1.4 veya f/1.8 lens kullanarak arka plandaki kalabalık veya karmaşık manzarayı yumuşacık bir bokeh ile eritin ve yüz hatlarını en doğal oranlarıyla yansıtın.",
    tag: "Ekipman"
  },
  {
    category: "Doğal Pozlama",
    icon: "💬",
    title: "Poz Vermeyen Çiftler İçin Dinamik Komutlar",
    tip: "'Kameraya bakın ve gülün' demek yerine 'Birbirinize en komik anınızı fısıldayın' veya 'Yavaşça el ele bana doğru yürüyün' deyin. Spontane kahkahalar her zaman en samimi albüm kareleridir.",
    tag: "Pozlama"
  },
  {
    category: "Renk & Atmosfer",
    icon: "🌆",
    title: "Mavi Saat (Blue Hour) ve Çift Renk Kontrastı",
    tip: "Güneş battıktan sonraki 20-30 dakikalık mavi saatte gökyüzü derin bir laciverte bürünür. Çifti arkadan sıcak bir LED (3200K) ile aydınlatarak müthiş bir turuncu-mavi renk kontrastı yakalayın.",
    tag: "Işık"
  },
  {
    category: "Grup Çekimi",
    icon: "👥",
    title: "Kalabalık Aile Çekimlerinde Diyafram Kuralı",
    tip: "İki veya daha fazla sıra halinde dizilen aile çekimlerinde asla f/1.8 - f/2.8 ile çekim yapmayın. Tüm sıraların jilet gibi net çıkması için diyaframı en az f/5.6 - f/8 aralığına getirin.",
    tag: "Grup"
  },
  {
    category: "Detay & Aksesuar",
    icon: "💍",
    title: "Alyans ve Makro Çekimlerinde Yansıma Hilesi",
    tip: "Yüzükleri davetiye veya buket üzerine yerleştirirken cep telefonu ekranını ayna gibi altına koyun. Çift yansıma ve 1:1 makro lens ile katalog kalitesinde detay kareleri elde edin.",
    tag: "Detay"
  },
  {
    category: "Işık Şekillendirici",
    icon: "☂️",
    title: "Kadifemsi Cilt Dokusu İçin Derin Parabolik Softbox",
    tip: "Stüdyo portrelerinde 120cm veya 150cm derin parabolik softbox kullanarak gölge geçişlerini kadifemsi yapın. Işık kaynağını modele ne kadar yaklaştırırsanız ışık o kadar yumuşak düşer.",
    tag: "Stüdyo"
  },
  {
    category: "Göz Işığı",
    icon: "👁️",
    title: "Catchlight (Gözdeki Yaşam Parıltısı)",
    tip: "Portrelerde bakışların canlı görünmesi için modelin göz bebeklerinde ışık yansıması (catchlight) olmalıdır. Softbox'ı modelin saat 10 veya saat 2 yönüne yerleştirip aşağı hafif eğimli açın.",
    tag: "Portre"
  },
  {
    category: "Sert Güneş",
    icon: "☀️",
    title: "Öğle Güneşi İçin Yarı Saydam Difüzör Kurtarıcısı",
    tip: "Öğle saatinde çekim yapmak zorundaysanız çifti ağaç gölgesine alın veya üzerlerine yarı saydam 5-in-1 difüzör tutarak göz altlarındaki sert 'rakun gölgelerini' tamamen yok edin.",
    tag: "Dış Çekim"
  },
  {
    category: "Enstantane & Tül",
    icon: "💨",
    title: "Uçuşan Gelin Tülü Dinamik Pozu",
    tip: "Yardımcınız tülü havaya bırakıp kadrajdan hızla kaçarken seri çekim modunda (H+) en az 1/1000s enstantane ile çekin. Tülün havada asılı kaldığı o büyüleyici anı dondurun.",
    tag: "Aksiyon"
  },
  {
    category: "Kompozisyon",
    icon: "📐",
    title: "Negatif Alan (Negative Space) ile Sinematik Duruş",
    tip: "Modeli kadrajın sağ veya sol 1/3 çizgisine yerleştirin, kadrajın geri kalanını gökyüzü, deniz veya sade bir mimariye bırakın. Albüm kapakları için ideal minimalist bir etki yaratır.",
    tag: "Kompozisyon"
  },
  {
    category: "Flaş Senkronizasyonu",
    icon: "⚡",
    title: "HSS (Yüksek Hızlı Senkronizasyon) ve f/1.4",
    tip: "Açık havada güneş altında arka planı f/1.4 ile eritirken 1/4000s enstantanede çekim yapmak için flaşınızda ve tetikleyicinizde HSS modunu mutlaka aktif edin.",
    tag: "Flaş"
  },
  {
    category: "Duygu & An",
    icon: "🥹",
    title: "İlk Görüşme (First Look) Gizli Çekimi",
    tip: "Damat gelini ilk kez gelinlikle gördüğü anı çekerken 70-200mm telezoom ile uzakta kalın. Müdahale etmeyin; saf duyguyu, gözyaşını ve sarılmayı doğal akışında kaydedin.",
    tag: "Duygu"
  },
  {
    category: "Beyaz Dengesi (WB)",
    icon: "🎨",
    title: "Altın Saat ve Gün Batımında Manuel Kelvin",
    tip: "Otomatik Beyaz Ayarı (AWB) gün batımının sıcak altın tonlarını soğutmaya çalışır. Gün batımının sıcaklığını korumak için Kelvin değerini manuel olarak 5600K - 6500K arasına sabitleyin.",
    tag: "Renk"
  },
  {
    category: "Poz & Vücut",
    icon: "💃",
    title: "İnce ve Zarif Duruş İçin 'S' Eğrisi Kuralı",
    tip: "Modelin kameraya tam düz bakmasını engelleyin. Ağırlığı arka bacağa verdirtin, omuzları hafif çapraz tutun ve bir eli bel kıvrımına yerleştirerek doğal 'S' formu oluşturun.",
    tag: "Pozlama"
  },
  {
    category: "Yedeklilik & Güvenlik",
    icon: "🛡️",
    title: "Çift Kart Yuvasına Eşzamanlı Yedekleme",
    tip: "Düğün günlerinde hafıza kartı arızası riskini sıfıra indirmek için makinenizi mutlaka Dual Slot 'Simultaneous Recording' (Eşzamanlı İkiz Kayıt) modunda tutun.",
    tag: "Güvenlik"
  },
  {
    category: "Stüdyo Arka Planı",
    icon: "🎭",
    title: "Modeli Fonda Yüzdürme (Işık Ayrımı)",
    tip: "Modeli arka fon kağıdından en az 2 metre öne alın. Arka fona ayrı bir saç/fon spotu vererek modelin silüetini fondan jilet gibi ayırıp 3 boyutlu derinlik kazandırın.",
    tag: "Stüdyo"
  }
];

// Günün indeksini belirleme (Yılın günü)
const getDayOfYear = (d = new Date()) => {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// Zamana duyarlı karşılama belirleme
const getGreetingInfo = (hour) => {
  if (hour >= 5 && hour < 12) {
    return {
      text: "Günaydın",
      icon: "☀️",
      sub: "Bugün stüdyoda ve dış çekimlerde harika kareler yakalama zamanı!"
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      text: "İyi Günler",
      icon: "🌤️",
      sub: "Günün randevuları, çekim akışı ve teslimatları kontrolün altında."
    };
  }
  if (hour >= 18 && hour < 23) {
    return {
      text: "İyi Akşamlar",
      icon: "🌆",
      sub: "Günün yorgunluğunu geride bırakırken kurgu ve teslimat listeni gözden geçir."
    };
  }
  return {
    text: "İyi Geceler",
    icon: "🌙",
    sub: "Gece mesaisinde misin? Günün çekimlerini yedeklemeyi unutma!"
  };
};

const PREP_ITEMS = [
  { id: "batarya", label: "Kamera & Flaş bataryaları şarjda", icon: "🔋" },
  { id: "hafiza", label: "Hafıza kartları boşaltılıp yedeklendi", icon: "💾" },
  { id: "lens", label: "Lensler ve kamera sensörü temizlendi", icon: "🔍" },
  { id: "flas", label: "Godox tetikleyici ve tepe flaş pilleri dolu", icon: "⚡" },
  { id: "detay", label: "Çekim konumu ve çift istekleri incelendi", icon: "📝" },
];

const PreparationCard = ({ apt, isTmr, storageKey, onGoAltinSaat, onGoPoz, onMarkReady }) => {
  const [checkedMap, setCheckedMap] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });

  const toggle = (id) => {
    setCheckedMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  const doneCount = PREP_ITEMS.filter(it => checkedMap[it.id]).length;
  const isAllDone = doneCount === PREP_ITEMS.length || !!apt.equipmentReady;

  return (
    <div style={{
      marginBottom: 20,
      borderRadius: 18,
      padding: "16px 18px",
      background: isAllDone
        ? "linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(255,255,255,0.02) 100%)"
        : "linear-gradient(135deg, rgba(255, 140, 0, 0.12) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1.5px solid ${isAllDone ? "rgba(76, 175, 80, 0.4)" : "rgba(255, 140, 0, 0.4)"}`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>{isAllDone ? "✅" : "🎒"}</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: isAllDone ? T.greenL : T.orangeL
            }}>
              {isTmr ? "Yarın Çekim Var" : "Bugün Çekim Var"} • Ekipman Kontrolü
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 4 }}>
            {apt.clientName} ({apt.type || "Çekim"})
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
            Saat: {apt.time || "14:00"} • {apt.location || "Mekan"} {apt.staffName ? `• Görevli: ${apt.staffName}` : ""}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: isAllDone ? T.greenL : T.orangeL,
          background: "rgba(255,255,255,0.06)",
          padding: "4px 8px",
          borderRadius: 8
        }}>
          {isAllDone ? "Tümü Hazır" : `${doneCount} / ${PREP_ITEMS.length} Hazır`}
        </div>
      </div>

      {/* Progress line */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, margin: "10px 0 14px", overflow: "hidden" }}>
        <div style={{
          width: isAllDone ? "100%" : `${(doneCount / PREP_ITEMS.length) * 100}%`,
          height: "100%",
          background: isAllDone ? T.greenL : T.orangeL,
          transition: "width 0.3s ease"
        }} />
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PREP_ITEMS.map(it => {
          const checked = !!checkedMap[it.id] || !!apt.equipmentReady;
          return (
            <div
              key={it.id}
              onClick={() => toggle(it.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                background: checked ? "rgba(76, 175, 80, 0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${checked ? "rgba(76, 175, 80, 0.25)" : "rgba(255,255,255,0.06)"}`,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                border: `1.5px solid ${checked ? T.greenL : T.text3}`,
                background: checked ? T.greenL : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#000",
                fontWeight: "bold",
                flexShrink: 0
              }}>
                {checked ? "✓" : ""}
              </div>
              <span style={{ fontSize: 15 }}>{it.icon}</span>
              <span style={{
                fontSize: 12,
                color: checked ? T.text3 : T.text,
                textDecoration: checked ? "line-through" : "none"
              }}>
                {it.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Personel Onayla & Bildir Butonu */}
      <button
        onClick={() => onMarkReady && onMarkReady(apt)}
        style={{
          width: "100%",
          marginTop: 14,
          padding: "12px",
          borderRadius: 12,
          background: isAllDone ? "linear-gradient(135deg, #16a34a, #15803d)" : `linear-gradient(135deg, ${T.gold}, ${T.goldD})`,
          border: "none",
          color: isAllDone ? "#ffffff" : "#0A0A0B",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: isAllDone ? "0 4px 16px rgba(22, 163, 74, 0.3)" : `0 4px 16px ${T.gold}33`
        }}
      >
        <span>{isAllDone ? "✅" : "📢"}</span>
        {isAllDone ? "Ekipmanlar Hazırlandı & Stüdyoya Bildirildi" : "Ekipmanları Hazırladım & Stüdyoya Bildir"}
      </button>

      {/* Hızlı butonlar */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={onGoAltinSaat}
          style={{
            flex: 1,
            background: "rgba(232, 197, 71, 0.12)",
            border: "1px solid rgba(232, 197, 71, 0.3)",
            color: T.goldL,
            borderRadius: 10,
            padding: "8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          🌅 Altın Saat
        </button>
        <button
          onClick={onGoPoz}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: T.text2,
            borderRadius: 10,
            padding: "8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          📸 Poz Rehberi
        </button>
      </div>
    </div>
  );
};

export const Dashboard = ({ data, setData, setActive, role, plan }) => {
  const isAdmin = role === "admin";
  const now     = new Date();

  // Karşılama ve kullanıcı bilgisi
  const authUser = getAuthUser();
  const userName = authUser?.name || authUser?.studio || (isAdmin ? (SIRKET?.ad || "Stüdyo Yöneticisi") : "Personel");
  const greeting = getGreetingInfo(now.getHours());

  // Günün Çekim Tekniği (Sayfanın en altında stüdyo rehberi olarak gösterilir)
  const dayOfYear = getDayOfYear(now);
  const [tipOffset, setTipOffset] = useState(0);
  const currentTipIdx = Math.abs(dayOfYear + tipOffset) % PHOTO_TECHNIQUES.length;
  const currentTip = PHOTO_TECHNIQUES[currentTipIdx];

  // Ekipman hazırla & bildirim tetikle fonksiyonu
  const handleMarkEquipmentReady = (apt) => {
    const readyBy = apt.staffName || (isAdmin ? "Yönetici" : "Personel");
    const readyAt = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const updatedApt = {
      ...apt,
      equipmentReady: true,
      equipmentReadyBy: readyBy,
      equipmentReadyAt: readyAt
    };
    if (setData) {
      setData(p => ({
        ...p,
        appointments: p.appointments.map(a => a.id === apt.id ? updatedApt : a)
      }));
    }
    try {
      const storageKey = `studyo_prep_${apt.id}`;
      const fullMap = PREP_ITEMS.reduce((acc, it) => ({ ...acc, [it.id]: true }), {});
      localStorage.setItem(storageKey, JSON.stringify(fullMap));
    } catch(e) {}
    sb.upsert("appointments", toDB.appointments(updatedApt)).catch(()=>{});
  };

  // Müşteri ödemelerinden eksik incomes'ları birleştir
  const existingIds = new Set(data.incomes.map(i=>i.id));
  const missingFromClients = data.clients.flatMap(c=>
    (c.payments||[]).filter(p=>p.type==="Ödeme Alındı" && !existingIds.has(p.id))
      .map(p=>({ id:p.id, clientName:c.name, amount:p.amount, type:"Ödeme", method:"Nakit", date:p.date||todayStr(), note:p.note||"", category:c.type||"Düğün" }))
  );
  const allIncomes = [...data.incomes, ...missingFromClients];
  const mIncome = allIncomes.filter(i=>monthOf(i.date)===now.getMonth()&&yearOf(i.date)===now.getFullYear()).reduce((a,i)=>a+i.amount,0);
  const mExpense= data.expenses.filter(e=>monthOf(e.date)===now.getMonth()&&yearOf(e.date)===now.getFullYear()).reduce((a,e)=>a+e.amount,0);
  const totalDebt = data.clients.filter(c=>c.paid<c.totalAmount).reduce((a,c)=>a+(c.totalAmount-c.paid),0);
  const upcoming  = [...data.appointments].filter(a=>a.status==="onaylı"&&daysLeft(a.date)>=0).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,5);
  const activeRem = data.reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.triggerDate)-new Date(b.triggerDate)).slice(0,3);

  const pendingDelivery = data.clients.filter(c => {
    const p = c.process || {};
    return (!p.album || !p.digital) && c.status !== "iptal";
  });

  const todayIso = new Date().toISOString().split("T")[0];
  const tmrDate = new Date(); tmrDate.setDate(tmrDate.getDate() + 1);
  const tmrIso = tmrDate.toISOString().split("T")[0];
  const upcomingShooting = data.appointments.find(a => (a.date === todayIso || a.date === tmrIso) && a.status !== "iptal");
  const isTmr = upcomingShooting?.date === tmrIso;
  const storageKey = upcomingShooting ? `studyo_prep_${upcomingShooting.id}` : "";

  return (
    <div className="fade-in">
      {/* Üst Karşılama Başlığı (Sade & Profesyonel) */}
      <div style={{
        padding: "18px 20px 16px",
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20 }}>{greeting.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: "-0.2px" }}>
                {greeting.text}, <span style={{ color: T.goldL }}>{userName}</span>
              </span>
            </div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {plan === "pro" && (
              <div onClick={() => setActive("planyonetimi")} style={{ cursor: "pointer" }}>
                <PlanBadge plan={plan}/>
              </div>
            )}
            <Pill label={isAdmin ? "Stüdyo Yönetimi" : "Ekip / Fotoğrafçı"} color={isAdmin ? T.goldL : T.blueL}/>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ─── EKİPMAN BİLDİRİMİ / KONTROLÜ ALANI ─── */}
        {upcomingShooting && (
          <div>
            {!isAdmin ? (
              /* Personel Girişi: Detaylı Ekipman Kontrol Kartı ve Onayla Butonu */
              <PreparationCard 
                apt={upcomingShooting} 
                isTmr={isTmr} 
                storageKey={storageKey}
                onGoAltinSaat={() => setActive("altinsaat")}
                onGoPoz={() => setActive("pozrehberi")}
                onMarkReady={handleMarkEquipmentReady}
              />
            ) : (
              /* Yönetici Girişi: Sade Bildirim Bannerı (Ayşe ekipmanları hazırladı veya hazırlık bekleniyor) */
              upcomingShooting.equipmentReady ? (
                <div style={{
                  marginBottom: 18,
                  borderRadius: 14,
                  padding: "13px 16px",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.03) 100%)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(34, 197, 94, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0
                  }}>
                    ✅
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                      {upcomingShooting.equipmentReadyBy || upcomingShooting.staffName || "Personel"} ekipmanları hazırladı
                    </div>
                    <div style={{ fontSize: 11.5, color: T.text2, marginTop: 2 }}>
                      {upcomingShooting.clientName} ({upcomingShooting.type || "Çekim"}) • {isTmr ? "Yarın" : "Bugün"} {upcomingShooting.time || "14:00"}
                      {upcomingShooting.equipmentReadyAt ? ` • Saat ${upcomingShooting.equipmentReadyAt}` : ""}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#4ade80",
                    background: "rgba(34, 197, 94, 0.18)",
                    padding: "4px 8px",
                    borderRadius: 6,
                    letterSpacing: "0.5px"
                  }}>
                    HAZIR
                  </span>
                </div>
              ) : (
                <div style={{
                  marginBottom: 18,
                  borderRadius: 14,
                  padding: "13px 16px",
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(245, 158, 11, 0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0
                  }}>
                    🎒
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
                      {upcomingShooting.staffName ? `${upcomingShooting.staffName} ekipman hazırlığı bekleniyor` : "Ekipman kontrolü bekleniyor"}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.text2, marginTop: 2 }}>
                      {upcomingShooting.clientName} ({upcomingShooting.type || "Çekim"}) • {isTmr ? "Yarın" : "Bugün"} {upcomingShooting.time || "14:00"} {upcomingShooting.location ? `• ${upcomingShooting.location}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkEquipmentReady(upcomingShooting)}
                    title="Ekipman hazır olarak onayla"
                    style={{
                      background: "rgba(245, 158, 11, 0.18)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      color: "#fbbf24",
                      borderRadius: 8,
                      padding: "6px 11px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0
                    }}
                  >
                    Onayla
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* ─── YÖNETİCİ PERFORMANS & FİNANS METRİKLERİ ─── */}
        {isAdmin && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <Card glow style={{ padding: 14 }}>
              <div style={{ fontSize: 10.5, color: T.text3, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
                Bu Ay Ciro
              </div>
              <div style={{ ...NUM_FONT, fontSize: 22, fontWeight: 700, color: T.greenL }}>
                {fmtShort(mIncome)}
              </div>
              <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                {mExpense > 0 ? `${fmtShort(mExpense)} gider` : "Kayıtlı gider yok"}
              </div>
            </Card>

            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 10.5, color: T.text3, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
                Bekleyen Tahsilat
              </div>
              <div style={{ ...NUM_FONT, fontSize: 22, fontWeight: 700, color: totalDebt > 0 ? T.orangeL : T.text3 }}>
                {fmtShort(totalDebt)}
              </div>
              <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                {data.clients.filter(c => c.paid < c.totalAmount).length} müşteride bakiye
              </div>
            </Card>

            <Card onClick={() => setActive("musteriler")} style={{ padding: 14, cursor: "pointer" }}>
              <div style={{ fontSize: 10.5, color: T.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                Bekleyen Teslim
              </div>
              <div style={{ ...NUM_FONT, fontSize: 22, fontWeight: 700, color: T.blueL }}>
                {pendingDelivery.length}
              </div>
              <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                albüm / dijital teslim
              </div>
            </Card>

            <Card onClick={() => setActive("ajanda")} style={{ padding: 14, cursor: "pointer" }}>
              <div style={{ fontSize: 10.5, color: T.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                Yaklaşan Çekim
              </div>
              <div style={{ ...NUM_FONT, fontSize: 22, fontWeight: 700, color: T.goldL }}>
                {upcoming.length}
              </div>
              <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                onaylı randevu
              </div>
            </Card>
          </div>
        )}

        {/* ─── HIZLI STÜDYO ARAÇLARI (Sade ve Doğal) ─── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8,
          marginBottom: 20
        }}>
          {[
            { id: "altinsaat", icon: "🌅", label: "Altın Saat" },
            { id: "pozrehberi", icon: "📸", label: "Poz Rehberi" },
            { id: "kartvizit", icon: "📇", label: "QR Kart" },
            { id: "sesliasistan", icon: "🎙️", label: "Sesli Not" },
          ].map(tool => (
            <div
              key={tool.id}
              onClick={() => setActive(tool.id)}
              style={{
                borderRadius: 14,
                padding: "12px 4px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{tool.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{tool.label}</div>
            </div>
          ))}
        </div>

        {/* ─── YAKLAŞAN ÇEKİMLER AKIŞI ─── */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Yaklaşan Çekimler</span>
            <button
              onClick={() => setActive("ajanda")}
              style={{ fontSize: 12, color: T.goldL, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
            >
              Ajandaya Git →
            </button>
          </div>

          {upcoming.length === 0 ? (
            <Card style={{ padding: 22, textAlign: "center" }}>
              <Ic n="calendar" s={26} c={T.text3} style={{ margin: "0 auto 10px" }}/>
              <div style={{ fontSize: 13, color: T.text3 }}>Yaklaşan randevu bulunmuyor</div>
              <GoldButton label="Yeni Randevu Ekle" onClick={() => setActive("ajanda")} icon="plus" sm style={{ margin: "12px auto 0" }}/>
            </Card>
          ) : upcoming.map(a => {
            const d = daysLeft(a.date);
            const urgent = d <= 1;
            return (
              <Card
                key={a.id}
                onClick={() => setActive("ajanda")}
                style={{
                  marginBottom: 10,
                  display: "flex",
                  gap: 12,
                  alignItems: "stretch",
                  padding: 13,
                  cursor: "pointer",
                  borderColor: urgent ? T.orange + "44" : T.border
                }}
              >
                <div style={{
                  background: urgent ? T.orange + "1A" : "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: "8px 10px",
                  textAlign: "center",
                  minWidth: 50,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: urgent ? T.orangeL : T.goldL, lineHeight: 1 }}>
                    {new Date(a.date + "T12:00:00").getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 3 }}>
                    {MN[new Date(a.date + "T12:00:00").getMonth()].slice(0,3)}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{a.clientName}</div>
                  <div style={{ fontSize: 12, color: T.text2, marginBottom: 4 }}>
                    {a.type || "Çekim"} • {a.time || "14:00"}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: T.text3 }}>
                    {a.location && <span>📍 {a.location}</span>}
                    {a.staffName && (
                      <span style={{ color: T.goldL, fontWeight: 600 }}>
                        👤 {a.staffName}
                      </span>
                    )}
                    {a.equipmentReady && <span style={{ color: "#4ade80", fontWeight: 700 }}>• Ekipman Hazır ✅</span>}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
                  <Pill label={d === 0 ? "Bugün!" : d === 1 ? "Yarın" : `${d} gün`} color={d <= 1 ? T.redL : d <= 7 ? T.orangeL : T.text3}/>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ─── HATIRLATICILAR ─── */}
        {activeRem.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Hatırlatıcılar</span>
              <button
                onClick={() => setActive("hatirlatici")}
                style={{ fontSize: 12, color: T.goldL, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
              >
                Tümü →
              </button>
            </div>
            {activeRem.map(r => (
              <Card key={r.id} style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center", padding: 12 }}>
                <div style={{ background: T.orange + "1A", borderRadius: 10, padding: 8 }}>
                  <Ic n="bell" s={16} c={T.orangeL}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: T.text3 }}>{fmtDate(r.triggerDate)} • saat {r.triggerTime}</div>
                </div>
                <Pill label={`${r.daysBefore > 0 ? r.daysBefore + " gün önce" : "Bugün"}`} color={T.text3}/>
              </Card>
            ))}
          </div>
        )}

        {/* ─── HIZLI İŞLEMLER ─── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>Hızlı İşlemler</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { l: "Yeni Randevu", i: "calendar", s: "ajanda",   c: T.gold,    adminOnly: false },
              { l: "Takvim",      i: "calendar", s: "takvim",   c: T.blue,    adminOnly: false },
              { l: "Gelir / Gider", i: "money",  s: "muhasebe", c: T.green,   adminOnly: true },
              { l: "Sözleşmeler",  i: "doc",     s: "sozlesmeler", c: T.orange, adminOnly: false },
              { l: "Hatırlatıcı",  i: "bell",    s: "hatirlatici", c: T.redL,   adminOnly: false },
              { l: "Raporlar",     i: "chart",   s: "raporlar",  c: T.text2,  adminOnly: true },
            ].filter(q => !q.adminOnly || isAdmin).map(q => (
              <Card key={q.l} onClick={() => setActive(q.s)} style={{ padding: "14px 10px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{ background: q.c + "1A", borderRadius: 12, padding: 10 }}>
                  <Ic n={q.i} s={18} c={q.c}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>{q.l}</span>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── EN ALTA ALINAN: FOTOĞRAF ÇEKİM TEKNİKLERİ & STÜDYO REHBERİ ─── */}
        <div style={{
          marginBottom: 32,
          borderRadius: 18,
          padding: "16px 18px",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
          border: `1px solid ${T.border}`,
          position: "relative"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{currentTip.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.goldL, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Çekim İpucu & Teknik
              </span>
              <span style={{ fontSize: 10, color: T.text3, background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 6 }}>
                {currentTip.category}
              </span>
            </div>

            <button
              onClick={() => setTipOffset(prev => prev + 1)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: T.text2,
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <span>Başka İpucu</span>
              <span>🎲</span>
            </button>
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 5 }}>
            {currentTip.title}
          </div>

          <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.55 }}>
            {currentTip.tip}
          </div>

          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10.5,
            color: T.text3
          }}>
            <span>💡 Profesyonel Çekim Rehberi</span>
            <span>{currentTipIdx + 1} / {PHOTO_TECHNIQUES.length}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
