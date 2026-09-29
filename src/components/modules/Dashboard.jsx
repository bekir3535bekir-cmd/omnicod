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

const PreparationCard = ({ apt, isTmr, storageKey, onGoAltinSaat, onGoPoz }) => {
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
  const isAllDone = doneCount === PREP_ITEMS.length;

  return (
    <div style={{
      marginBottom: 20,
      borderRadius: 22,
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
            <span style={{ fontSize: 16 }}>{isAllDone ? "🎉" : "🎒"}</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: isAllDone ? T.greenL : T.orangeL
            }}>
              {isTmr ? "Yarın Çekim Var!" : "Bugün Çekim Var!"} • Ekipman Kontrolü
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 4 }}>
            {apt.clientName} ({apt.type || "Çekim"})
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
            Saat: {apt.time || "14:00"} • {apt.location || "Mekan"}
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
          {doneCount} / {PREP_ITEMS.length} Hazır
        </div>
      </div>

      {/* Progress line */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, margin: "10px 0 14px", overflow: "hidden" }}>
        <div style={{
          width: `${(doneCount / PREP_ITEMS.length) * 100}%`,
          height: "100%",
          background: isAllDone ? T.greenL : T.orangeL,
          transition: "width 0.3s ease"
        }} />
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PREP_ITEMS.map(it => {
          const checked = !!checkedMap[it.id];
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

      {/* Hızlı butonlar */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
          🌅 Altın Saati Gör
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

export const Dashboard = ({ data, setActive, role, plan }) => {
  const isAdmin = role === "admin";
  const now     = new Date();

  // Karşılama ve kullanıcı bilgisi
  const authUser = getAuthUser();
  const userName = authUser?.name || authUser?.studio || (isAdmin ? (SIRKET?.ad || "Stüdyo Yöneticisi") : "Fotoğrafçı");
  const greeting = getGreetingInfo(now.getHours());

  // Günün Çekim Tekniği (Her gün otomatik değişir, butonla da gezilebilir)
  const dayOfYear = getDayOfYear(now);
  const [tipOffset, setTipOffset] = useState(0);
  const currentTipIdx = Math.abs(dayOfYear + tipOffset) % PHOTO_TECHNIQUES.length;
  const currentTip = PHOTO_TECHNIQUES[currentTipIdx];

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
  const upcoming  = [...data.appointments].filter(a=>a.status==="onaylı"&&daysLeft(a.date)>=0).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,4);
  const activeRem = data.reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.triggerDate)-new Date(b.triggerDate)).slice(0,3);
  const hasData   = data.clients.length>0||data.appointments.length>0;

  return (
    <div className="fade-in">
      {/* Zamana Duyarlı Karşılama (Hero Header - Apple Liquid Glass) */}
      <div style={{
        padding: "18px 20px 18px",
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 20,
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22 }}>{greeting.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>
                {greeting.text}, <span style={{ color: T.goldL }}>{userName}</span>
              </span>
            </div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 5, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>{now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ color: T.text2 }}>{greeting.sub}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {plan === "pro" && (
              <div onClick={() => setActive("planyonetimi")} style={{ cursor: "pointer" }}>
                <PlanBadge plan={plan}/>
              </div>
            )}
            <Pill label={isAdmin ? "Yönetici" : "Personel"} color={isAdmin ? T.goldL : T.blueL}/>
          </div>
        </div>
      </div>

      <div style={{ padding:"0 20px" }}>

        {/* Günün Fotoğraf Çekim Tekniği (Apple Liquid Glass) */}
        <div style={{
          marginBottom: 20,
          borderRadius: 22,
          padding: "16px 18px",
          background: "linear-gradient(135deg, rgba(232, 197, 71, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(232, 197, 71, 0.25)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Top specular glow rim */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "10%",
            right: "10%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(232, 197, 71, 0.65), transparent)"
          }} />

          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18 }}>{currentTip.icon}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: T.goldL,
                background: "rgba(232, 197, 71, 0.12)",
                padding: "3px 8px",
                borderRadius: 8,
                border: "1px solid rgba(232, 197, 71, 0.22)"
              }}>
                Günün Çekim Tekniği
              </span>
              <span style={{
                fontSize: 10,
                color: T.text3,
                background: "rgba(255,255,255,0.05)",
                padding: "3px 8px",
                borderRadius: 8
              }}>
                {currentTip.category}
              </span>
            </div>

            <button
              onClick={() => setTipOffset(prev => prev + 1)}
              title="Başka bir çekim tekniği gör"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: T.text2,
                borderRadius: 12,
                padding: "4px 10px",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = T.text2; }}
            >
              <span>Başka İpucu</span>
              <span style={{ fontSize: 12 }}>🎲</span>
            </button>
          </div>

          {/* Title */}
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.text,
            marginBottom: 6,
            lineHeight: 1.35
          }}>
            {currentTip.title}
          </div>

          {/* Tip content */}
          <div style={{
            fontSize: 12.5,
            color: T.text2,
            lineHeight: 1.55,
            letterSpacing: "-0.1px"
          }}>
            {currentTip.tip}
          </div>

          {/* Footer note */}
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10.5,
            color: T.text3
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span>💡</span> Her gün yeni bir stüdyo ve çekim tavsiyesi
            </span>
            <span style={{ opacity: 0.7, fontWeight: 600 }}>
              {currentTipIdx + 1} / {PHOTO_TECHNIQUES.length}
            </span>
          </div>
        </div>

        {/* Hızlı Stüdyo Araçları (4 Sihirbaz) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8,
          marginBottom: 20
        }}>
          {[
            { id: "altinsaat", icon: "🌅", label: "Altın Saat", color: T.goldL },
            { id: "pozrehberi", icon: "📸", label: "Poz Rehberi", color: "#E5A93C" },
            { id: "kartvizit", icon: "📇", label: "QR Kart", color: T.blueL },
            { id: "sesliasistan", icon: "🎙️", label: "Sesli Not", color: "#C94C9F" },
          ].map(tool => (
            <div
              key={tool.id}
              onClick={() => setActive(tool.id)}
              style={{
                borderRadius: 16,
                padding: "12px 4px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.09)",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{tool.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{tool.label}</div>
            </div>
          ))}
        </div>

        {/* Çekim Öncesi Ekipman & Batarya Bildirim / Kontrol Kartı */}
        {(() => {
          const todayIso = new Date().toISOString().split("T")[0];
          const tmrDate = new Date(); tmrDate.setDate(tmrDate.getDate() + 1);
          const tmrIso = tmrDate.toISOString().split("T")[0];
          const upcomingShooting = data.appointments.find(a => (a.date === todayIso || a.date === tmrIso) && a.status !== "iptal");
          
          if (!upcomingShooting) return null;

          const isTmr = upcomingShooting.date === tmrIso;
          const storageKey = `studyo_prep_${upcomingShooting.id}`;
          
          return (
            <PreparationCard 
              apt={upcomingShooting} 
              isTmr={isTmr} 
              storageKey={storageKey}
              onGoAltinSaat={() => setActive("altinsaat")}
              onGoPoz={() => setActive("pozrehberi")}
            />
          );
        })()}

        {/* Finance cards - sadece admin */}
        {isAdmin && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
            <Card glow style={{ padding:16 }}>
              <div style={{ fontSize:11, color:T.text3, fontWeight:500, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 }}>Bu Ay Gelir</div>
              <div style={{ ...NUM_FONT, fontSize:24, fontWeight:700, color:T.greenL }}>{fmtShort(mIncome)}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>{mExpense>0?`${fmtShort(mExpense)} gider`:"Henüz gider yok"}</div>
            </Card>
            <Card style={{ padding:16 }}>
              <div style={{ fontSize:11, color:T.text3, fontWeight:500, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 }}>Bekleyen Tahsilat</div>
              <div style={{ ...NUM_FONT, fontSize:24, fontWeight:700, color:totalDebt>0?T.orangeL:T.text3 }}>{fmtShort(totalDebt)}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>{data.clients.filter(c=>c.paid<c.totalAmount).length} müşteride bekliyor</div>
            </Card>
          </div>
        )}
        {/* BUGÜN NE YAPMALIYIM */}
        {isAdmin && (() => {
          const todayStr2 = new Date().toISOString().split("T")[0];
          const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate()+1);
          const tomorrowStr = tomorrowDate.toISOString().split("T")[0];
          const todayApts = data.appointments.filter(a=>a.date===todayStr2&&a.status!=="iptal");
          const tmrApts   = data.appointments.filter(a=>a.date===tomorrowStr&&a.status!=="iptal");
          const overdueP  = data.clients.filter(c=>{
            const p=(c.payments||[]).find(pp=>pp.type==="Ödeme Sözü"&&pp.promiseDate&&pp.promiseDate<todayStr2);
            return !!p;
          });
          const lateDelivery = data.clients.filter(c=>{
            if(isComplete(c)) return false;
            const apt = data.appointments.find(a=>a.clientName===c.name);
            return apt&&apt.date&&apt.date<todayStr2&&!(c.process||{}).done;
          });
          const tasks = [
            ...todayApts.map(a=>({ icon:"📷", text:`Bugün çekim: ${a.clientName}`, color:T.blueL, urgent:true })),
            ...overdueP.map(c=>({ icon:"💸", text:`Geciken ödeme: ${c.name}`, color:T.redL, urgent:true })),
            ...lateDelivery.slice(0,2).map(c=>({ icon:"📦", text:`Teslim gecikiyor: ${c.name}`, color:T.orangeL, urgent:false })),
            ...tmrApts.map(a=>({ icon:"🗓", text:`Yarın çekim: ${a.clientName}`, color:T.text2, urgent:false })),
          ];
          if(tasks.length===0) return (
            <div style={{ background:T.green+"1A", border:`1px solid ${T.green}33`,
              borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.greenL, marginBottom:4 }}>
                🎯 Bugün ne yapmalıyım?
              </div>
              <div style={{ fontSize:13, color:T.text2 }}>🎉 Bugün için bekleyen iş yok, harika!</div>
            </div>
          );
          return (
            <div style={{ background:T.card, border:`1px solid ${T.gold}33`,
              borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.goldL, marginBottom:12 }}>
                🎯 Bugün ne yapmalıyım?
              </div>
              {tasks.map((t,i)=>(
                <div key={i} style={{ display:"flex", gap:10, alignItems:"center",
                  marginBottom:8, opacity:1 }}>
                  <span style={{ fontSize:16 }}>{t.icon}</span>
                  <span style={{ fontSize:13, color:t.color, fontWeight:t.urgent?600:400 }}>
                    {t.text}
                  </span>
                  {t.urgent && <span style={{ fontSize:10, background:T.red+"22",
                    color:T.redL, borderRadius:6, padding:"2px 6px", marginLeft:"auto",
                    flexShrink:0, fontWeight:700 }}>ACİL</span>}
                </div>
              ))}
            </div>
          );
        })()}

        {/* GELİR TAHMİNİ */}
        {isAdmin && (() => {
          const now2 = new Date();
          const thisMonth = now2.getMonth();
          const thisYear  = now2.getFullYear();
          const nextMonth = (thisMonth+1)%12;
          const nextYear  = nextMonth===0 ? thisYear+1 : thisYear;

          const existingIds2 = new Set(data.incomes.map(i=>i.id));
          const allInc = [...data.incomes, ...data.clients.flatMap(c=>
            (c.payments||[]).filter(p=>p.type==="Ödeme Alındı"&&!existingIds2.has(p.id))
              .map(p=>({ amount:p.amount, date:p.date||todayStr() }))
          )];

          const thisMonthReal = allInc.filter(i=>monthOf(i.date)===thisMonth&&yearOf(i.date)===thisYear)
            .reduce((s,i)=>s+Number(i.amount||0),0);

          // Söz verilen ödemeler bu ay ve gelecek ay
          const promises = data.clients.flatMap(c=>(c.payments||[]).filter(p=>p.type==="Ödeme Sözü"&&!p.paid));
          const thisMonthProm = promises.filter(p=>p.promiseDate&&monthOf(p.promiseDate)===thisMonth&&yearOf(p.promiseDate)===thisYear)
            .reduce((s,p)=>s+Number(p.amount||0),0);
          const nextMonthProm = promises.filter(p=>p.promiseDate&&monthOf(p.promiseDate)===nextMonth&&yearOf(p.promiseDate)===nextYear)
            .reduce((s,p)=>s+Number(p.amount||0),0);

          const MN2=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
          return (
            <div style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
                📈 Gelir Tahmini
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ background:T.card2, borderRadius:12, padding:12 }}>
                  <div style={{ fontSize:10, color:T.text3, marginBottom:4 }}>
                    {MN2[thisMonth]} Gerçekleşen
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:T.greenL }}>
                    {fmtShort(thisMonthReal)}
                  </div>
                  {thisMonthProm>0 && <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>
                    +{fmtShort(thisMonthProm)} söz var
                  </div>}
                </div>
                <div style={{ background:T.card2, borderRadius:12, padding:12 }}>
                  <div style={{ fontSize:10, color:T.text3, marginBottom:4 }}>
                    {MN2[nextMonth]} Beklenen
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:nextMonthProm>0?T.blueL:T.text3 }}>
                    {nextMonthProm>0 ? fmtShort(nextMonthProm) : "—"}
                  </div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>
                    {nextMonthProm>0 ? "verilmiş söz" : "kayıtlı söz yok"}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bekleyen teslimler */}
        {(() => {
          const pendingDelivery = data.clients.filter(c=>{
            const p=c.process||{};
            return (!p.album||!p.digital) && c.status!=="iptal";
          });
          const pendingPayment = data.clients.filter(c=>c.totalAmount>0&&c.paid<c.totalAmount);
          if(pendingDelivery.length===0&&pendingPayment.length===0) return null;
          return (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
              <Card onClick={()=>setActive("musteriler")} style={{ padding:14, cursor:"pointer" }}>
                <div style={{ fontSize:10, color:T.text3, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Bekleyen Teslim</div>
                <div style={{ fontFamily:"Playfair Display", fontSize:26, fontWeight:700, color:T.blueL }}>{pendingDelivery.length}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>müşteri bekliyor</div>
              </Card>
              <Card onClick={()=>setActive("musteriler")} style={{ padding:14, cursor:"pointer" }}>
                <div style={{ fontSize:10, color:T.text3, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Bekleyen Ödeme</div>
                <div style={{ fontFamily:"Playfair Display", fontSize:26, fontWeight:700, color:T.orangeL }}>{pendingPayment.length}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>müşteri</div>
              </Card>
            </div>
          );
        })()}

        {/* Upcoming */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ fontFamily:"Playfair Display", fontSize:18, color:T.text, fontWeight:500 }}>Yaklaşan Çekimler</span>
            <button onClick={()=>setActive("ajanda")} style={{ fontSize:12, color:T.gold, fontWeight:500 }}>Tümünü Gör →</button>
          </div>
          {upcoming.length === 0 ? (
            <Card style={{ padding:24, textAlign:"center" }}>
              <Ic n="calendar" s={28} c={T.text3} style={{ margin:"0 auto 12px" }}/>
              <div style={{ fontSize:14, color:T.text3 }}>Yaklaşan randevu bulunmuyor</div>
              <GoldButton label="Randevu Ekle" onClick={()=>setActive("ajanda")} icon="plus" sm style={{ margin:"14px auto 0" }}/>
            </Card>
          ) : upcoming.map(a => {
            const d = daysLeft(a.date);
            const urgent = d<=2;
            return (
              <Card key={a.id} style={{ marginBottom:10, display:"flex", gap:14, alignItems:"stretch", padding:14,
                borderColor: urgent?T.orange+"44":T.border }}>
                <div style={{ background:urgent?T.orange+"1A":T.goldGlow, borderRadius:12, padding:"10px 12px",
                  textAlign:"center", minWidth:52, display:"flex", flexDirection:"column", justifyContent:"center" }}>
                  <div style={{ fontFamily:"Playfair Display", fontSize:22, fontWeight:700, color:urgent?T.orangeL:T.goldL, lineHeight:1 }}>
                    {new Date(a.date+"T12:00:00").getDate()}
                  </div>
                  <div style={{ fontSize:10, color:T.text3, marginTop:3 }}>
                    {MN[new Date(a.date+"T12:00:00").getMonth()].slice(0,3)}
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{a.clientName}</div>
                  <div style={{ fontSize:12, color:T.text2, marginBottom:6 }}>{a.package} · {a.time}</div>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <Ic n="pin" s={12} c={T.text3}/>
                    <span style={{ fontSize:12, color:T.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.location||"Konum belirtilmedi"}</span>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", justifyContent:"space-between" }}>
                  <Pill label={d===0?"Bugün!":d===1?"Yarın":`${d} gün`} color={d<=1?T.redL:d<=7?T.orangeL:T.text3}/>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Reminders */}
        {activeRem.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontFamily:"Playfair Display", fontSize:18, color:T.text, fontWeight:500 }}>Hatırlatıcılar</span>
              <button onClick={()=>setActive("hatirlatici")} style={{ fontSize:12, color:T.gold, fontWeight:500 }}>Tümü →</button>
            </div>
            {activeRem.map(r => (
              <Card key={r.id} style={{ marginBottom:8, display:"flex", gap:12, alignItems:"center", padding:14 }}>
                <div style={{ background:T.orange+"1A", borderRadius:10, padding:9 }}>
                  <Ic n="bell" s={16} c={T.orangeL}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{r.title}</div>
                  <div style={{ fontSize:12, color:T.text3 }}>{fmtDate(r.triggerDate)} saat {r.triggerTime}</div>
                </div>
                <Pill label={`${r.daysBefore>0?r.daysBefore+" gün önce":"Gün kendisi"}`} color={T.text3}/>
              </Card>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"Playfair Display", fontSize:18, color:T.text, fontWeight:500, marginBottom:14 }}>Hızlı Erişim</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[
              {l:"Yeni Randevu",i:"calendar",s:"ajanda",   c:T.gold,    adminOnly:false},
              {l:"Takvim",      i:"calendar",s:"takvim",     c:T.blue,   adminOnly:false},
              {l:"Gelir Ekle",  i:"money",   s:"muhasebe", c:T.green,   adminOnly:true},
              {l:"Sözleşme",   i:"doc",      s:"sozlesmeler",c:T.orange, adminOnly:false},
              {l:"Hatırlatıcı",i:"bell",     s:"hatirlatici",c:T.redL,  adminOnly:false},
              {l:"Raporlar",   i:"chart",    s:"raporlar", c:T.text2,   adminOnly:true},
            ].filter(q => !q.adminOnly || isAdmin).map(q => (
              <Card key={q.l} onClick={()=>setActive(q.s)} style={{ padding:"16px 12px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                <div style={{ background:q.c+"1A", borderRadius:12, padding:12 }}>
                  <Ic n={q.i} s={20} c={q.c}/>
                </div>
                <span style={{ fontSize:12, fontWeight:500, color:T.text2, lineHeight:1.3 }}>{q.l}</span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════
// HAVA DURUMU KARTI
// ════════════════════════════════════════════════
const WeatherCard = ({ date, location="" }) => {
  const [wd, setWd] = useState(null);
  const dLeft = daysLeft(date);

  useEffect(()=>{
    if(!date || dLeft < 0) { setWd(null); return; }

    const load = async (lat=37.7648, lon=30.5566) => {
      try {
        if(dLeft <= 14) {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max&timezone=Europe/Istanbul&start_date=${date}&end_date=${date}`);
          const d = await r.json();
          const wc   = d?.daily?.weathercode?.[0];
          const tmax = Math.round(d?.daily?.temperature_2m_max?.[0]||15);
          const tmin = Math.round(d?.daily?.temperature_2m_min?.[0]||8);
          const rain = d?.daily?.precipitation_probability_max?.[0]||0;
          const wind = Math.round(d?.daily?.windspeed_10m_max?.[0]||0);
          const uv   = Math.round(d?.daily?.uv_index_max?.[0]||0);
          const icon = wc<=1?"☀️":wc<=3?"⛅":wc<=48?"🌥":wc<=67?"🌧":wc<=77?"❄️":"⛈";
          setWd({ icon, tmax, tmin, rain, wind, uv, type:"tahmin" });
        } else {
          const mo = new Date(date+"T12:00:00").getMonth()+1;
          const clim=[{m:1,t:6,tl:2,r:10},{m:2,t:7,tl:2,r:9},{m:3,t:10,tl:4,r:8},{m:4,t:14,tl:7,r:7},
            {m:5,t:19,tl:11,r:5},{m:6,t:24,tl:15,r:2},{m:7,t:27,tl:18,r:1},{m:8,t:27,tl:18,r:1},
            {m:9,t:23,tl:14,r:3},{m:10,t:17,tl:9,r:6},{m:11,t:12,tl:6,r:9},{m:12,t:8,tl:3,r:11}];
          const avg = clim.find(c=>c.m===mo)||{t:15,tl:8,r:5};
          const icon = avg.r<3?"☀️":avg.r<6?"⛅":"🌧";
          setWd({ icon, tmax:avg.t, tmin:avg.tl, rain:avg.r*10, wind:0, uv:0, type:"istatistik" });
        }
      } catch(e) { setWd(null); }
    };

    // Konum bazlı koordinat
    if(location && location.trim().length > 2) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location+", Türkiye")}&format=json&limit=1`)
        .then(r=>r.json())
        .then(d=>{ if(d?.[0]) load(d[0].lat, d[0].lon); else load(); })
        .catch(()=>load());
    } else {
      load();
    }
  },[date, location]);

  if(!wd) return null;

  const isBad  = wd.rain > 60;
  const isWind = wd.wind > 40;
  const warn   = isBad || isWind;

  return (
    <div style={{ marginTop:8, background:warn?T.orange+"1A":wd.rain<20?T.green+"1A":T.blue+"1A",
      border:`1px solid ${warn?T.orange:wd.rain<20?T.green:T.blue}33`,
      borderRadius:12, padding:"10px 14px" }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <span style={{ fontSize:22 }}>{wd.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>
            {wd.tmax}°C / {wd.tmin}°C
            <span style={{ fontSize:11, color:T.text3, fontWeight:400, marginLeft:8 }}>
              💧{wd.rain}% {wd.wind>0?`💨${wd.wind}km/h`:""}
            </span>
          </div>
          <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>
            {wd.type==="tahmin"
              ? `${dLeft===0?"Bugün":dLeft===1?"Yarın":dLeft+" gün sonra"} — gerçek tahmin${location?` (${location.slice(0,20)})`:" (Isparta)"}`
              : `Geçmiş yıl ortalaması${location?` (${location.slice(0,20)})`:" (Isparta)"}`}
          </div>
        </div>
        {warn && (
          <div style={{ background:T.orange+"22", borderRadius:8, padding:"4px 8px",
            fontSize:10, fontWeight:700, color:T.orangeL, flexShrink:0 }}>
            {isBad?"🌧 DİKKAT":""}{isWind?"💨 RÜZGAR":""}
          </div>
        )}
      </div>
      {warn && (
        <div style={{ marginTop:8, fontSize:11, color:T.orangeL, fontWeight:500 }}>
          ⚠️ {isBad?"Yağmur riski yüksek — dış çekim için yedek plan hazırlayın!":""}
          {isWind?" Kuvvetli rüzgar — ekipman güvenliğine dikkat!":""}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// AJANDA
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// ÇEKİM GÜNÜ MODU
// ════════════════════════════════════════════════
const CEKIM_CHECKLIST = [
  { id:"kamera",   label:"Kamera(lar) hazır",        icon:"📷" },
  { id:"batarya",  label:"Bataryalar şarjlı",         icon:"🔋" },
  { id:"hafiza",   label:"Hafıza kartları boş",       icon:"💾" },
  { id:"lens",     label:"Lensler temiz",             icon:"🔍" },
  { id:"flash",    label:"Flaş / ışık ekipmanı",      icon:"💡" },
  { id:"tripod",   label:"Tripod / Stabilizer",       icon:"🎬" },
  { id:"sozlesme", label:"Sözleşme imzalandı",        icon:"📝" },
  { id:"musteri",  label:"Müşteri bilgilendirildi",   icon:"✅" },
];

const CekimGunuModu = ({ apt, data, onClose, onComplete }) => {
  const [checks,    setChecks]    = useState({});
  const [elapsed,   setElapsed]   = useState(0);
  const [running,   setRunning]   = useState(false);
  const [note,      setNote]      = useState("");
  const [tab,       setTab]       = useState("hazirlik");
  const timerRef = useRef(null);

  const client = data.clients.find(c=>c.name===apt.clientName);
  const pkgColor = data.packages.find(p=>p.name===apt.package)?.color || T.gold;

  useEffect(() => {
    if(running) {
      timerRef.current = setInterval(()=>setElapsed(e=>e+1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return ()=>clearInterval(timerRef.current);
  }, [running]);

  const formatTime = s => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return h>0
      ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const checkedCount = CEKIM_CHECKLIST.filter(c=>checks[c.id]).length;
  const allChecked = checkedCount === CEKIM_CHECKLIST.length;

  return (
    <div style={{ position:"fixed", inset:0, background:T.bg, zIndex:300,
      display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"52px 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onClose}
          style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99,
            width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Ic n="back" s={16} c={T.text2}/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"Playfair Display", fontSize:18, fontWeight:600, color:T.goldL }}>
            📸 Çekim Günü Modu
          </div>
          <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{apt.clientName} — {fmtDate(apt.date)}</div>
        </div>
        <Pill label={apt.package} color={pkgColor}/>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
        {[["hazirlik","✅ Hazırlık"],["kronometre","⏱ Süre"],["notlar","📝 Notlar"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"12px 4px",
            fontSize:12, fontWeight:tab===id?700:400,
            color:tab===id?T.goldL:T.text3,
            borderBottom:tab===id?`2px solid ${T.gold}`:"2px solid transparent",
            background:"transparent" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 120px" }}>

        {/* Hazırlık Checklist */}
        {tab==="hazirlik" && <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:13, color:T.text3 }}>Çekim öncesi kontrol listesi</div>
            <div style={{ fontSize:12, fontWeight:700, color:checkedCount===CEKIM_CHECKLIST.length?T.greenL:T.text3 }}>
              {checkedCount}/{CEKIM_CHECKLIST.length}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background:T.card2, borderRadius:99, height:6, marginBottom:20 }}>
            <div style={{ height:"100%", borderRadius:99, background:allChecked?T.green:T.gold,
              width:`${(checkedCount/CEKIM_CHECKLIST.length)*100}%`, transition:"width 0.3s" }}/>
          </div>
          {CEKIM_CHECKLIST.map(c=>(
            <button key={c.id} onClick={()=>setChecks(p=>({...p,[c.id]:!p[c.id]}))}
              style={{ width:"100%", background:checks[c.id]?T.green+"1A":T.card,
                border:`1px solid ${checks[c.id]?T.green+"44":T.border}`,
                borderRadius:14, padding:"14px 16px", marginBottom:8,
                display:"flex", alignItems:"center", gap:14, textAlign:"left" }}>
              <div style={{ width:28, height:28, borderRadius:99, flexShrink:0,
                background:checks[c.id]?T.green:"transparent",
                border:`2px solid ${checks[c.id]?T.green:T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, transition:"all 0.2s" }}>
                {checks[c.id] ? "✓" : ""}
              </div>
              <span style={{ fontSize:14, fontWeight:500 }}>{c.icon} {c.label}</span>
            </button>
          ))}
          {/* Müşteri bilgileri */}
          {client && (
            <div style={{ marginTop:16, background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:14 }}>
              <div style={{ fontSize:12, color:T.text3, marginBottom:10 }}>📞 Müşteri Bilgileri</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{client.name}</div>
              {client.phone && (
                <button onClick={()=>window.open(`tel:${client.phone}`)}
                  style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`,
                    borderRadius:10, padding:"8px 14px", fontSize:13, color:T.blueL, fontWeight:600 }}>
                  📞 {client.phone}
                </button>
              )}
              {apt.location && <div style={{ fontSize:12, color:T.text3, marginTop:8 }}>📍 {apt.location}</div>}
            </div>
          )}
        </>}

        {/* Kronometre */}
        {tab==="kronometre" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:20 }}>
            <div style={{ fontSize:72, fontWeight:700, fontFamily:"DM Sans",
              color:running?T.goldL:T.text2, letterSpacing:2, marginBottom:8,
              textShadow:running?`0 0 40px ${T.gold}66`:"none", transition:"all 0.3s" }}>
              {formatTime(elapsed)}
            </div>
            <div style={{ fontSize:13, color:T.text3, marginBottom:40 }}>
              {running ? "⏱ Çekim devam ediyor..." : elapsed>0 ? "⏸ Duraklatıldı" : "Kronometreyi başlat"}
            </div>
            <div style={{ display:"flex", gap:16 }}>
              <button onClick={()=>setRunning(r=>!r)}
                style={{ background:running?T.orange+"22":`linear-gradient(135deg,${T.goldL},${T.goldD})`,
                  border:`1.5px solid ${running?T.orange:T.gold}`,
                  borderRadius:99, width:80, height:80, fontSize:28,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:running?T.orangeL:T.bg, boxShadow:running?"none":`0 8px 24px ${T.gold}44` }}>
                {running ? "⏸" : "▶"}
              </button>
              {elapsed > 0 && (
                <button onClick={()=>{ setRunning(false); setElapsed(0); }}
                  style={{ background:T.card2, border:`1px solid ${T.border}`,
                    borderRadius:99, width:56, height:56, fontSize:20,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                  ↺
                </button>
              )}
            </div>
            {elapsed > 0 && (
              <div style={{ marginTop:32, background:T.card, border:`1px solid ${T.border}`,
                borderRadius:14, padding:16, width:"100%", textAlign:"center" }}>
                <div style={{ fontSize:12, color:T.text3, marginBottom:4 }}>Toplam çekim süresi</div>
                <div style={{ fontSize:22, fontWeight:700, color:T.goldL }}>{formatTime(elapsed)}</div>
              </div>
            )}
          </div>
        )}

        {/* Notlar */}
        {tab==="notlar" && (
          <div>
            <div style={{ fontSize:13, color:T.text3, marginBottom:12 }}>Çekim sırasında not al</div>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Özel anlar, müşteri istekleri, teknik notlar..."
              rows={10}
              style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
                padding:"14px 16px", color:T.text, fontSize:14, resize:"none",
                outline:"none", lineHeight:1.7, width:"100%" }}/>
            <div style={{ fontSize:11, color:T.text3, marginTop:8, textAlign:"right" }}>
              {note.length} karakter
            </div>
          </div>
        )}
      </div>

      {/* Bottom - Çekim Tamamla */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 20px 36px",
        background:T.surface, borderTop:`1px solid ${T.border}` }}>
        <button onClick={onComplete}
          style={{ width:"100%", background:`linear-gradient(135deg,${T.green},${T.green}CC)`,
            border:"none", borderRadius:16, padding:"16px",
            fontSize:16, fontWeight:700, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            boxShadow:`0 8px 24px ${T.green}44` }}>
          ✅ Çekim Tamamlandı
        </button>
      </div>
    </div>
  );
};
