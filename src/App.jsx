import React, { useState, useEffect, useRef } from "react";
import { T, DARK_THEME, LIGHT_THEME, SAPPHIRE_THEME, THEME_PALETTES, migrateThemeKey, setGlobalTheme, makeCSS } from "./constants/theme";
import { Ic } from "./constants/icons";
import { fmt, fmtDate, todayStr, uid } from "./utils/helpers";
import { INIT } from "./constants/initialData";
import { sb, fromDB, toDB, IS_DEV, IS_CLOUD } from "./services/supabase";
import { getAuthSession, onAuthChange, fetchMyStudio, signOut, fetchProofData, fetchStaffData, consumeAuthLink } from "./services/auth";
import { initNotifications, showSystemNotification } from "./services/notify";
import { getModules, DESKTOP_GROUPS, STAFF_SCREENS } from "./constants/modules";
import { CloudAuth } from "./components/modules/CloudAuth";
import { getSession, getClientId, getStaffId, saveSession, clearSession, getLocalData, saveLocalData, getStudioInfo, getStudioProfile, getCurrentStudio, setCurrentStudio, clearCloudSession } from "./services/storage";
import { getPlan, planHasFeature, requiredPlanFor } from "./services/plan";
import { Logo, BottomSheet, FirstVisitTip } from "./components/common";
import { ProGate, LockBadge } from "./components/common/ProGate";

// Modules
import { Dashboard } from "./components/modules/Dashboard";
import { Ajanda } from "./components/modules/Ajanda";
import { Musteriler } from "./components/modules/Musteriler";
import { Muhasebe } from "./components/modules/Muhasebe";
import { MoreMenu } from "./components/modules/MoreMenu";
import { Sablonlar } from "./components/modules/Sablonlar";
import { Paketler } from "./components/modules/Paketler";
import { Sozlesmeler } from "./components/modules/Sozlesmeler";
import { Mesajlar } from "./components/modules/Mesajlar";
import { Hatirlaticilar } from "./components/modules/Hatirlaticilar";
import { Takvim } from "./components/modules/Takvim";
import { Ekip } from "./components/modules/Ekip";
import { Galeri } from "./components/modules/Galeri";
import { Teklif } from "./components/modules/Teklif";
import { Portal } from "./components/modules/Portal";
import { Raporlar } from "./components/modules/Raporlar";
import { PlanYonetimi } from "./components/modules/PlanYonetimi";
import { AltinSaat } from "./components/modules/AltinSaat";
import { PozRehberi } from "./components/modules/PozRehberi";
import { DijitalKartvizit } from "./components/modules/DijitalKartvizit";
import { SesliAsistan } from "./components/modules/SesliAsistan";
import { HizliNot, HizliArama, GeceModu, IsAsistani, NotDefteri, MusteriPortali, LoginScreen } from "./components/modules/AppModals";

// Bulutta yeni stüdyo boş başlar (demo personel eklenmez)
const EMPTY_CLOUD = { ...INIT, clients: [], team: [], notifications: [], deletedClients: [] };

export default function App() {
  const [data, setData]       = useState(() => {
    const local = getLocalData();
    if (IS_CLOUD) return local || EMPTY_CLOUD;
    if (!local) return INIT;
    if (!local.team || local.team.length === 0) {
      return { ...local, team: INIT.team };
    }
    return local;
  });
  const [active, setActive]   = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("active") || "dashboard";
    } catch(e) { return "dashboard"; }
  });
  const [plan, setPlanState]  = useState(() => getPlan());
  const [themeKey, setThemeKeyState] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("theme")) return migrateThemeKey(p.get("theme"));
      return migrateThemeKey(localStorage.getItem("studyom_theme_key"));
    } catch(e) { return "sapphire"; }
  });
  const setThemeKey = (key) => {
    setThemeKeyState(key);
    try { localStorage.setItem("studyom_theme_key", key); } catch(e) {}
  };
  const [loading, setLoading]     = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [dbReady, setDbReady] = useState(!IS_CLOUD);
  const [role, setRole] = useState(() => {
    try {
      // Not: ?role= parametresi bilerek desteklenmiyor (girişi atlatıyordu)
      const p = new URLSearchParams(window.location.search);
      if (p.get("proof") || p.get("portal")) return "musteri";
    } catch(e) {}
    if (IS_CLOUD) return getCurrentStudio()?.role || null;
    return getSession();
  });
  // Bulut oturum durumu: checking → signedOut / noStudio / ready
  const [cloudPhase, setCloudPhase] = useState(() => {
    if (!IS_CLOUD) return "local";
    try { const q = new URLSearchParams(window.location.search); if (q.get("proof") || q.get("portal")) return "customer"; } catch(e) {}
    return "checking";
  });
  const [authNotice, setAuthNotice] = useState("");   // ör. süresi dolmuş şifre sıfırlama linki
  const [skipStaffPick, setSkipStaffPick] = useState(false);
  const [showGece, setShowGece] = useState(false);

  // Veri değişikliklerini anında yerel depolamaya kaydet
  useEffect(() => {
    if (dbReady) {
      saveLocalData(data);
    }
  }, [data, dbReady]);

  useEffect(() => {
    const checkGece = () => {
      const now = new Date();
      const h = now.getHours();
      // Türkiye local tarihi için
      const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const key = "geses_gece_" + localDate;
      if((h >= 23 || h < 1) && !localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setShowGece(true);
      }
    };
    checkGece(); // Uygulama açılınca bir kez kontrol et
    const interval = setInterval(checkGece, 60000); // Her dakika kontrol et
    return () => clearInterval(interval);
  }, []);

  // Müşteriye özel doğrudan seçim linki kontrolü (?proof=CLIENT_ID veya ?portal=CLIENT_ID)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const proofId = urlParams.get("proof") || urlParams.get("portal");
      if (proofId) {
        setRole("musteri");
        setMusteriClientId(proofId);
      }
      const act = urlParams.get("active");
      if (act) {
        setActive(act);
      }
    } catch(e) {}
  }, []);

  const [musteriClientId, setMusteriClientId] = useState(() => getClientId());
  const [pendingClientId, setPendingClientId] = useState(null); // Takvim'den müşteri kartı açmak için
  const [staffId, setStaffId] = useState(() => getStaffId());
  const [showBildirim, setShowBildirim] = useState(false);
  // Geniş ekranda (masaüstü uygulaması / bilgisayar tarayıcısı) masaüstü düzeni kullanılır
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("desktop", isDesktop);
  }, [isDesktop]);
  // Giriş yapan personelin bildirimleri
  const notifTarget = role === "admin" ? "admin" : (role === "personel" && staffId ? String(staffId) : null);
  const myNotifications = notifTarget
    ? (data.notifications || []).filter(n => String(n.teamId) === notifTarget).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    : [];
  const hasInbox = !!notifTarget;
  const myUnread = myNotifications.filter(n => !n.read);
  const markRead = (ids) => {
    const changed = (data.notifications || []).filter(n => ids.includes(n.id) && !n.read).map(n => ({ ...n, read: true }));
    if (!changed.length) return;
    setData(p => ({ ...p, notifications: (p.notifications || []).map(n => changed.find(c => c.id === n.id) || n) }));
    changed.forEach(n => sb.upsert("notifications", toDB.notifications(n)).catch(() => {}));
  };

  // Sistem bildirimi (telefon / Windows): tıklanınca uygulama öne gelir ve Ajanda açılır
  useEffect(() => {
    if (!notifTarget) return;
    initNotifications(screen => { setShowBildirim(false); setActive(screen || "ajanda"); });
  }, [notifTarget]);
  useEffect(() => {
    if (!notifTarget || !dbReady) return;
    let shown = [];
    try { shown = JSON.parse(localStorage.getItem("studyom_os_notified") || "[]"); } catch (e) {}
    const fresh = myUnread.filter(n => !shown.includes(n.id));
    fresh.forEach(n => showSystemNotification({ id: n.id, title: "STÜDYOM — " + n.title, body: n.body, screen: "ajanda" }));
    if (fresh.length) {
      try { localStorage.setItem("studyom_os_notified", JSON.stringify([...shown, ...fresh.map(n => n.id)].slice(-300))); } catch (e) {}
    }
  }, [notifTarget, dbReady, myUnread.length]);
  // Giriş yapan hesabın stüdyosunu uygula (rol, personel kaydı, plan, firma bilgileri, önbellek)
  const applyStudio = (s) => {
    setCurrentStudio(s);
    setRole(s.role);
    setStaffId(s.team_id || null);
    setPlanState(getPlan());
    if (cloudPhase !== "ready") {
      // İlk açılış: önce bu stüdyonun önbelleği gösterilir, ardından sunucudan güncel veri yüklenir
      setData(getLocalData() || EMPTY_CLOUD);
      setDbReady(false);
      setCloudPhase("ready");
    }
  };
  const goSignedOut = () => {
    clearCloudSession();
    setRole(null); setStaffId(null); setSkipStaffPick(false);
    setData(EMPTY_CLOUD); setDbReady(false);
    setCloudPhase("signedOut");
  };
  useEffect(() => {
    if (!IS_CLOUD || cloudPhase === "customer") return;
    let alive = true;
    (async () => {
      // E-postadaki şifre sıfırlama linkiyle gelindiyse önce yeni şifre belirletilir
      const link = await consumeAuthLink().catch(() => null);
      if (!alive) return;
      if (link?.type === "recovery") { setCloudPhase("recovery"); return; }
      if (link?.error) setAuthNotice(link.error);
      const session = await getAuthSession();
      if (!alive) return;
      if (!session) { goSignedOut(); return; }
      try {
        const s = await fetchMyStudio();
        if (!alive) return;
        if (!s) { setCloudPhase("noStudio"); return; }
        applyStudio(s);
      } catch (e) {
        // İnternet yoksa son bilinen stüdyoyla aç (veriler önbellekten)
        const cached = getCurrentStudio();
        if (cached) applyStudio(cached); else goSignedOut();
      }
    })();
    const off = onAuthChange(session => { if (alive && !session) goSignedOut(); });
    return () => { alive = false; off(); };
  }, []);

  const handleLogin = (r, clientId, loginStaffId) => {
    saveSession(r, clientId, loginStaffId);
    setRole(r);
    if(clientId) setMusteriClientId(clientId);
    setStaffId(loginStaffId || null);
  };
  const handleLogout = () => {
    if (IS_CLOUD) { signOut(); goSignedOut(); return; }
    clearSession(); setRole(null); setStaffId(null);
  };

  // Uygulama açılınca Supabase'den yükle (IS_DEV iken yerel veriyi koru!)
  useEffect(() => {
    if (IS_CLOUD && cloudPhase !== "ready") return;
    const load = async () => {
      if (IS_DEV) {
        const local = getLocalData();
        if (local) {
          if (!local.team || local.team.length === 0) {
            local.team = INIT.team;
          }
          setData(local);
        }
        setDbReady(true);
        setLoading(false);
        return;
      }

      if (IS_CLOUD && role !== "admin") {
        try {
          const [sd, messages, notifications] = await Promise.all([fetchStaffData(), sb.get("messages"), sb.get("notifications")]);
          setData({
            ...EMPTY_CLOUD,
            incomes: [], expenses: [], reminders: [], contracts: [], gallery: [], quotes: [], notes: [],
            clients:       (sd?.clients || []).map(fromDB.clients),
            appointments:  (sd?.appointments || []).map(fromDB.appointments),
            packages:      (sd?.packages || []).map(fromDB.packages),
            team:          (sd?.team || []).map(fromDB.team),
            shifts:        (sd?.shifts || []).map(fromDB.shifts),
            locations:     (sd?.locations || []).map(fromDB.locations),
            messages:      (messages || []).map(fromDB.messages),
            notifications: (notifications || []).map(fromDB.notifications),
          });
        } catch (e) {
          // İnternet yoksa önbellekteki veriyle devam edilir
          console.warn("Personel verisi alınamadı:", e?.message || e);
        }
        setDbReady(true);
        setLoading(false);
        return;
      }

      try {
        const [clients, appointments, packages, incomes, expenses, reminders,
               contracts, team, shifts, gallery, quotes, messages, locations, notes, notifications] = await Promise.all([
          sb.get("clients"), sb.get("appointments"), sb.get("packages"),
          sb.get("incomes"), sb.get("expenses"), sb.get("reminders"),
          sb.get("contracts"), sb.get("team"), sb.get("shifts"),
          sb.get("gallery"), sb.get("quotes"), sb.get("messages"), sb.get("locations"), sb.get("notes"), sb.get("notifications"),
        ]);

        if (!clients && !appointments) {
          // Sunucuya ulaşılamadı: önbellekteki veriyle devam et
          setDbReady(true);
          return;
        }

        const loadedClients  = (clients||[]).map(fromDB.clients);
        const loadedIncomes  = (incomes||[]).map(fromDB.incomes);

        // Müşteri ödemelerinden kayıp incomes'ları tamamla
        const existingIds2 = new Set(loadedIncomes.map(i=>i.id));
        const missingIncomes = loadedClients.flatMap(c=>
          (c.payments||[]).filter(p=>p.type==="Ödeme Alındı" && !existingIds2.has(p.id))
            .map(p=>({ id:p.id, clientName:c.name, amount:p.amount, type:"Ödeme", method:"Nakit", date:p.date||todayStr(), note:p.note||"", category:c.type||"Düğün" }))
        );

        const local = getLocalData();
        // Bulutta sunucu tek doğru kaynaktır; boşsa boş gösterilir (başka verilere düşülmez)
        const baseClients = IS_CLOUD ? loadedClients : ((loadedClients && loadedClients.length > 0) ? loadedClients : (local?.clients || INIT.clients));

        setData({
          clients:        baseClients,
          appointments:   (appointments||[]).map(fromDB.appointments),
          packages:       (packages||[]).length > 0 ? (packages||[]).map(fromDB.packages) : (IS_CLOUD && role !== "admin" ? [] : INIT.packages),
          incomes:        [...loadedIncomes, ...missingIncomes],
          expenses:       (expenses||[]).map(fromDB.expenses),
          reminders:      (reminders||[]).map(fromDB.reminders),
          contracts:      (contracts||[]).map(fromDB.contracts),
          messages:       (messages||[]).map(fromDB.messages),
          deletedClients: local?.deletedClients || [],
          team:           (team||[]).map(fromDB.team),
          shifts:         (shifts||[]).map(fromDB.shifts),
          gallery:        (gallery||[]).map(fromDB.gallery),
          quotes:         (quotes||[]).map(fromDB.quotes),
          locations:      (locations||[]).map(fromDB.locations),
          notes:          (notes||[]).map(fromDB.notes),
          notifications:  (notifications||[]).map(fromDB.notifications),
        });
        setDbReady(true);
      } catch(e) {
        console.error("Supabase yüklenemedi:", e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Diğer cihazlardaki değişiklikleri al (20 sn'de bir)
    if (!IS_DEV) {
      const pollInterval = setInterval(() => {
        if(!window._gesesSaving) load();
      }, 20000);
      return () => clearInterval(pollInterval);
    }
  }, [cloudPhase]);

  // Geçmiş tarihli randevuları otomatik tamamlandı yap
  useEffect(() => {
    if(!dbReady || (IS_CLOUD && role !== "admin")) return;
    const today = todayStr();
    const toComplete = data.appointments.filter(a =>
      a.date && a.date < today && a.status === "onaylı"
    );
    if(toComplete.length === 0) return;
    setData(p => ({
      ...p,
      appointments: p.appointments.map(a =>
        a.date && a.date < today && a.status === "onaylı"
          ? {...a, status:"tamamlandı"}
          : a
      )
    }));
    toComplete.forEach(a => {
      sb.upsert("appointments", toDB.appointments({...a, status:"tamamlandı"})).catch(()=>{});
    });
  }, [dbReady]);
  const isSyncingRef = useRef(false);
  const syncTimerRef = useRef(null);
  useEffect(() => {
    if(!dbReady || !IS_CLOUD) return;

    const sync = async () => {
      if(isSyncingRef.current) return;
      isSyncingRef.current = true;
      window._gesesSaving  = true;

      const tables  = role === "admin"
        ? ["clients","appointments","packages","incomes","expenses","reminders","contracts","team","shifts","gallery","quotes","messages","locations","notes","notifications"]
        : ["messages","notifications"];

      for(const table of tables) {
        const rows   = data[table] || [];
        const toDBFn = toDB[table];
        if(!toDBFn || !rows.length) continue;
        try { await sb.upsertMany(table, rows.map(toDBFn)); } catch(e) {
          console.error(`Kayıt hatası [${table}]:`, e);
        }
      }

      isSyncingRef.current = false;
      window._gesesSaving  = false;
    };

    // Flag'i hemen koy — polling 1200ms beklerken ezmesin
    window._gesesSaving = true;
    if(syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(sync, 1200);
    return () => {
      if(syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [data, dbReady]);

  // Bulut müşteri portalı: giriş yapmadan yalnızca kendi müşteri numarasının verisi alınır
  const [proof, setProof] = useState({ loading: false, data: null, error: false });
  useEffect(() => {
    if (!IS_CLOUD || role !== "musteri" || !musteriClientId) return;
    let alive = true;
    setProof({ loading: true, data: null, error: false });
    fetchProofData(musteriClientId).then(r => {
      if (!alive) return;
      if (!r || !r.client) { setProof({ loading: false, data: null, error: true }); return; }
      setProof({ loading: false, error: false, data: {
        ...EMPTY_CLOUD,
        clients: [fromDB.clients(r.client)],
        appointments: (r.appointments || []).map(fromDB.appointments),
        gallery: (r.gallery || []).map(fromDB.gallery),
      }});
    }).catch(() => alive && setProof({ loading: false, data: null, error: true }));
    return () => { alive = false; };
  }, [role, musteriClientId]);

  // Update global T on theme change
  const currentTheme = THEME_PALETTES[themeKey] || SAPPHIRE_THEME;
  // Üst çubuğun ortasında gösterilen stüdyo adı
  const studioName = (getStudioProfile()?.studio || getCurrentStudio()?.name || "").trim();
  setGlobalTheme(currentTheme);

  const Splash = ({ text }) => (
    <>
      <style>{makeCSS(T)}</style>
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
        <Logo/>
        <div style={{ fontSize:13, color:T.text3 }}>{text}</div>
      </div>
    </>
  );

  // ── Bulut: giriş / stüdyo kurulumu ──
  if (IS_CLOUD && role !== "musteri") {
    if (cloudPhase === "checking") return <Splash text="Oturum kontrol ediliyor..."/>;
    if (cloudPhase === "signedOut" || cloudPhase === "noStudio" || cloudPhase === "recovery") return (
      <>
      <style>{makeCSS(T)}</style>
      <CloudAuth key={cloudPhase} stage={cloudPhase} notice={authNotice} onReady={s => s ? applyStudio(s) : null}
        onCustomer={id => { setMusteriClientId(id); setRole("musteri"); setCloudPhase("customer"); }}
        onLogout={goSignedOut}/>
      </>
    );
    if (cloudPhase === "ready" && role === "personel" && !staffId && !skipStaffPick && dbReady && (data.team||[]).length > 0) return (
      <CloudAuth stage="pickStaff" team={data.team} onReady={s => s ? applyStudio(s) : setSkipStaffPick(true)} onLogout={goSignedOut}/>
    );
  }

  if(!role) return (
    <>
      <style>{makeCSS(T)}</style>
      <LoginScreen onLogin={handleLogin} data={data.clients} team={data.team}/>
    </>
  );

  if(role === "musteri") {
    const leavePortal = () => {
      clearSession(); setRole(null); setMusteriClientId(null);
      if (IS_CLOUD) { try { window.history.replaceState(null, "", window.location.pathname); } catch(e) {} goSignedOut(); }
    };
    if (IS_CLOUD && (proof.loading || (!proof.data && !proof.error))) return <Splash text="Yükleniyor..."/>;
    if (IS_CLOUD && proof.error) return (
      <>
        <style>{makeCSS(T)}</style>
        <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:24, textAlign:"center" }}>
          <Logo/>
          <div style={{ fontSize:17, fontWeight:700, color:T.text }}>Bu link geçersiz</div>
          <div style={{ fontSize:13, color:T.text3, lineHeight:1.6 }}>Link süresi dolmuş veya hatalı olabilir.<br/>Lütfen stüdyonuzdan yeni bir link isteyin.</div>
          <button onClick={leavePortal} style={{ marginTop:8, background:T.card2, border:`1px solid ${T.border}`, color:T.text2, borderRadius:12, padding:"10px 18px" }}>Giriş ekranına dön</button>
        </div>
      </>
    );
    return (
      <>
        <style>{makeCSS(T)}</style>
        <MusteriPortali data={IS_CLOUD ? proof.data : data} clientId={musteriClientId} onLogout={leavePortal}/>
      </>
    );
  }

  if (IS_CLOUD && !dbReady && !(data.clients||[]).length) return <Splash text="Veriler yükleniyor..."/>;

  if(loadError && !loading) return (
    <>
      <style>{makeCSS(T)}</style>
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:16, padding:24 }}>
        <Logo/>
        <div style={{ fontSize:18, fontWeight:700, color:T.redL, textAlign:"center" }}>Bağlantı Hatası</div>
        <div style={{ fontSize:13, color:T.text3, textAlign:"center", lineHeight:1.7 }}>
          Supabase'e bağlanılamadı.<br/>İnternet bağlantını kontrol et ve yenile.
        </div>
        <button onClick={()=>{ setLoadError(false); setLoading(true); window.location.reload(); }}
          style={{ background:T.gold, border:"none", borderRadius:14, padding:"14px 28px",
            fontSize:15, fontWeight:700, color: T.onAccent, marginTop:8 }}>
          Yenile
        </button>
      </div>
    </>
  );

  if(loading) return (
    <>
      <style>{makeCSS(T)}</style>
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:20 }}>
        <Logo/>
        <div style={{ display:"flex", gap:6 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width:8, height:8, borderRadius:99, background:T.gold,
              animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
          ))}
        </div>
        <div style={{ fontSize:13, color:T.text3 }}>Veriler yükleniyor...</div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    </>
  );

  const isAdminRole = role === "admin";
  // Personel: yalnızca Ana Sayfa, Ajanda, Müşteriler, Mesajlar ve Ayarlar
  const NAV = isAdminRole ? [
    {id:"dashboard", icon:"home",     label:"Ana Sayfa"},
    {id:"ajanda",    icon:"calendar", label:"Ajanda"},
    {id:"muhasebe",  icon:"money",    label:"Muhasebe"},
    {id:"more",      icon:"more",     label:"Devamı"},
  ] : [
    {id:"dashboard",  icon:"home",     label:"Ana Sayfa"},
    {id:"ajanda",     icon:"calendar", label:"Ajanda"},
    {id:"musteriler", icon:"users",    label:"Müşteriler"},
    {id:"mesajlar",   icon:"msg",      label:"Mesajlar"},
    {id:"more",       icon:"settings", label:"Ayarlar"},
  ];
  const subScreens = ["musteriler","notdefteri","paketler","sozlesmeler","mesajlar","hatirlatici","ekip","galeri","raporlar","sablonlar","takvim","teklif","portal","isasistani","planyonetimi","altinsaat","pozrehberi","kartvizit","sesliasistan"];
  const isSubScreen = subScreens.includes(active) && !NAV.some(n => n.id === active);

  // Onay bekleyen randevular takvim, hatırlatma, rapor vb. ekranlarda sayılmaz (yalnızca Ajanda'da listelenir)
  const pendingApts = (data.appointments || []).filter(a => a.approval === "bekliyor");
  const viewData = pendingApts.length ? { ...data, appointments: data.appointments.filter(a => a.approval !== "bekliyor") } : data;
  const pendingBanner = isAdminRole && pendingApts.length > 0 && (
    <div style={{ padding:"0 20px", marginTop:12 }}>
      <button onClick={()=>setActive("ajanda")}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:12, textAlign:"left", cursor:"pointer",
          background:T.orange+"1A", border:`1px solid ${T.orange}55`, borderRadius:14, padding:"12px 14px" }}>
        <span style={{ fontSize:20 }}>⏳</span>
        <span style={{ flex:1 }}>
          <span style={{ display:"block", fontSize:14, fontWeight:700, color:T.text }}>{pendingApts.length} randevu onayınızı bekliyor</span>
          <span style={{ display:"block", fontSize:12, color:T.text3, marginTop:2 }}>Personelin eklediği randevular siz onaylayınca sisteme eklenir</span>
        </span>
        <span style={{ fontSize:12, fontWeight:700, color:T.orangeL }}>İncele →</span>
      </button>
    </div>
  );
  const home = <>{pendingBanner}<Dashboard data={viewData} setData={setData} setActive={setActive} role={role} plan={plan} staffId={staffId}/></>;
  const adminOnly = (el) => role === "admin" ? el : home;
  // Planda olmayan özellik: kilit kartı (ne olduğu ve hangi planda açıldığı gösterilir)
  const gated = (id, el) => planHasFeature(plan, id) ? el : <ProGate feature={id} onUpgrade={()=>setActive("planyonetimi")}/>;

  const ALL_SCREENS = {
    dashboard:    home,
    ajanda:       gated("ajanda",      <Ajanda data={data} setData={setData} role={role} plan={plan} setActive={setActive} staffId={staffId}/>),
    musteriler:   gated("musteriler",  <Musteriler data={viewData} setData={setData} role={role} plan={plan} setActive={setActive} initialClientId={pendingClientId} onConsumeInitialClientId={()=>setPendingClientId(null)}/>),
    muhasebe:     adminOnly(gated("muhasebe",    <Muhasebe data={viewData} setData={setData} role={role}/>)),
    more:         <MoreMenu data={data} setActive={setActive} themeKey={themeKey} setThemeKey={setThemeKey} darkMode={currentTheme.isDark} role={role} plan={plan} onLogout={handleLogout}/>,
    takvim:       gated("takvim",      <Takvim data={viewData} setActive={setActive} setDetailClientId={setPendingClientId}/>),
    paketler:     adminOnly(gated("paketler",    <Paketler data={viewData} setData={setData} role={role}/>)),
    sablonlar:    gated("sablonlar",   <Sablonlar data={viewData}/>),
    sozlesmeler:  adminOnly(gated("sozlesmeler", <Sozlesmeler data={viewData} setData={setData} role={role}/>)),
    mesajlar:     gated("mesajlar",    <Mesajlar data={viewData} setData={setData} role={role}/>),
    hatirlatici:  gated("hatirlatici", <Hatirlaticilar data={viewData} setData={setData} role={role}/>),
    ekip:         gated("ekip",        <Ekip data={viewData} setData={setData} role={role} plan={plan} setActive={setActive}/>),
    galeri:       gated("galeri",      <Galeri data={viewData} setData={setData} role={role}/>),
    raporlar:     adminOnly(gated("raporlar",    <Raporlar data={viewData}/>)),
    teklif:       adminOnly(gated("teklif",      <Teklif data={viewData} setData={setData} role={role}/>)),
    portal:       adminOnly(gated("portal",      <Portal data={viewData} setData={setData}/>)),
    isasistani:   adminOnly(gated("isasistani",  <IsAsistani data={viewData} setData={setData} role={role}/>)),
    notdefteri:   adminOnly(gated("notdefteri",  <NotDefteri data={viewData} setData={setData} role={role}/>)),
    planyonetimi: adminOnly(<PlanYonetimi data={viewData} plan={plan} setPlanState={setPlanState} setActive={setActive}/>),
    altinsaat:    gated("altinsaat",   <AltinSaat appointments={viewData.appointments}/>),
    pozrehberi:   gated("pozrehberi",  <PozRehberi/>),
    kartvizit:    gated("kartvizit",   <DijitalKartvizit role={role}/>),
    sesliasistan: gated("sesliasistan",<SesliAsistan data={viewData} setData={setData} setActive={setActive}/>),
  };
  // Personel yalnızca kendisine açık ekranları görür; diğerleri Ana Sayfa'ya döner
  const SCREENS = isAdminRole ? ALL_SCREENS
    : Object.fromEntries(Object.entries(ALL_SCREENS).map(([k, v]) => [k, STAFF_SCREENS.includes(k) ? v : home]));

  const CSS = makeCSS(T);

  // Bildirim penceresi, hızlı not/arama düğmeleri ve gece modu — telefon ve masaüstü düzeninde ortak
  const overlays = (
    <>
        {/* Floating Buttons - sadece ana ekranlarda */}
        {!["more","login","notdefteri"].includes(active) && (
          <>
            {showBildirim && (
              <BottomSheet title="Bildirimler" onClose={()=>{ setShowBildirim(false); markRead(myUnread.map(n=>n.id)); }}>
                {isAdminRole && (
                  <button onClick={()=>{ setShowBildirim(false); markRead(myUnread.map(n=>n.id)); setActive("hatirlatici"); }}
                    style={{ width:"100%", marginBottom:12, background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 14px",
                      display:"flex", alignItems:"center", gap:10, cursor:"pointer", color:T.text2, fontSize:13, fontWeight:600 }}>
                    <Ic n="bell" s={15} c={T.orangeL}/> Hatırlatıcılar
                    <span style={{ marginLeft:"auto", color:T.text3 }}>{data.reminders.filter(r=>!r.done).length} açık →</span>
                  </button>
                )}
                {myNotifications.length === 0 ? (
                  <div style={{ textAlign:"center", color:T.text3, fontSize:13, padding:"20px 0" }}>Henüz bildirim yok</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {myNotifications.map(n => (
                      <div role="button" tabIndex={0} key={n.id} onClick={()=>{ markRead([n.id]); setShowBildirim(false); setActive("ajanda"); }}
                        style={{ background: n.read ? T.card2 : T.gold+"14", border:`1px solid ${n.read ? T.border : T.gold+"55"}`,
                          borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {!n.read && <span style={{ width:8, height:8, borderRadius:99, background:T.red, flexShrink:0 }}/>}
                          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{n.title}</div>
                        </div>
                        <div style={{ fontSize:12.5, color:T.text2, marginTop:4 }}>{n.body}</div>
                        <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}) : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </BottomSheet>
            )}
            {isAdminRole && <HizliNot data={data} setData={setData}/>}
            <HizliArama data={viewData} setActive={setActive}/>
          </>
        )}

        {/* Gece Modu Özeti */}
        {showGece && isAdminRole && (
          <GeceModu data={viewData} onClose={()=>setShowGece(false)}/>
        )}
    </>
  );

  if (isDesktop) {
    const isAdmin = role === "admin";
    const MODULES = getModules();
    const DESKTOP_MENU = isAdmin
      ? DESKTOP_GROUPS.map(g => ({ group: g.group, items: g.items.map(id => ({ id, ...MODULES[id] })) }))
      : [{ group: "Menü", items: STAFF_SCREENS.filter(id => id !== "more").map(id => ({ id, ...MODULES[id] })) }];
    const staffMember = role === "personel" ? (data.team||[]).find(m => String(m.id) === String(staffId)) : null;
    const who = isAdmin ? (getStudioInfo().ad || "Yönetici") : (staffMember?.name || "Personel");
    const sideBg = T.flat ? T.surface : currentTheme.isDark ? "rgba(255,255,255,0.025)" : "#FFFFFF";
    const NavBtn = ({ item }) => {
      const on = active === item.id;
      const locked = isAdmin && item.id !== "more" && !planHasFeature(plan, item.id);
      const col = item.color || T.text2;
      // Düz tema: tek renk ikon, seçili satır hafif gri zemin (renkli ikon kutusu yok)
      if (T.flat) return (
        <button onClick={()=>setActive(item.id)}
          style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 10px", borderRadius:8,
            background: on ? T.card2 : "transparent", border:"none",
            color: on ? T.text : T.text2, fontSize:13.5, fontWeight: on ? 600 : 500, cursor:"pointer", textAlign:"left" }}>
          <Ic n={item.icon} s={16} c={on ? T.text : T.text3}/>
          <span style={{ flex:1, minWidth:0, opacity: locked ? 0.55 : 1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>
          {locked && <LockBadge plan={requiredPlanFor(item.id)}/>}
        </button>
      );
      return (
        <button onClick={()=>setActive(item.id)}
          style={{ display:"flex", alignItems:"center", gap:11, width:"100%", padding:"7px 12px", borderRadius:10,
            background: on ? T.gold+"1F" : "transparent", border:`1px solid ${on ? T.gold+"55" : "transparent"}`,
            color: on ? T.goldL : T.text2, fontSize:13.5, fontWeight: on ? 700 : 500, cursor:"pointer", textAlign:"left" }}>
          <span style={{ display:"flex", flexShrink:0, width:28, height:28, borderRadius:8, alignItems:"center", justifyContent:"center",
            background: col + (on ? "33" : "1A") }}><Ic n={item.icon} s={15} c={col}/></span>
          <span style={{ flex:1, minWidth:0, opacity: locked ? 0.6 : 1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>
          {locked && <LockBadge plan={requiredPlanFor(item.id)}/>}
        </button>
      );
    };
    return (
      <>
        <style>{CSS}</style>
        <div style={{ display:"flex", minHeight:"100vh", background:T.bg }}>
          {/* Sol menü */}
          <aside style={{ width:272, flexShrink:0, position:"sticky", top:0, height:"100vh", overflow:"hidden",
            background:sideBg, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"18px 14px" }}>
            <div style={{ padding:"2px 6px 18px" }}><Logo compact/></div>
            <nav className="side-nav" style={{ flex:1, minHeight:0, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, paddingRight:2 }}>
              {DESKTOP_MENU.map(g => {
                const items = g.items;
                if (!items.length) return null;
                return (
                  <div key={g.group}>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:T.text3, padding:"0 12px 6px", ...(T.flat ? { fontWeight:500, letterSpacing:0.4, fontSize:11 } : {}) }}>{g.group}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {items.map(i => <NavBtn key={i.id} item={i}/>)}
                    </div>
                  </div>
                );
              })}
            </nav>
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:12, display:"flex", flexDirection:"column", gap:4 }}>
              <NavBtn item={{ id:"more", icon:"settings", label: isAdmin ? "Ayarlar & Diğer" : "Ayarlar", color:T.text2 }}/>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px" }}>
                <div style={{ width:32, height:32, borderRadius:99, background:T.gold+"22", color:T.goldL, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>
                  {who.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{who}</div>
                  <div style={{ fontSize:11, color:T.text3 }}>{isAdmin ? "Admin" : "Personel"}</div>
                </div>
                <button onClick={handleLogout} title="Çıkış Yap"
                  style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, padding:"5px 8px", color:T.redL, fontSize:11.5, fontWeight:600, cursor:"pointer" }}>
                  Çıkış
                </button>
              </div>
            </div>
          </aside>

          {/* İçerik */}
          <main style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
            <header style={{ position:"sticky", top:0, zIndex:90, display:"flex", alignItems:"center", gap:12, padding:"14px 32px",
              background: T.flat ? T.bg : currentTheme.isDark ? "rgba(10,10,14,0.8)" : "rgba(255,255,255,0.88)", backdropFilter: T.flat ? "none" : "blur(20px)",
              borderBottom:`1px solid ${T.border}` }}>
              <div style={{ flex:1, minWidth:0, fontSize:13, color:T.text3, fontWeight:500 }}>{new Date().toLocaleDateString("tr-TR",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
              {studioName && <div style={{ fontSize:15, fontWeight:600, color:T.text, letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"40%" }}>{studioName}</div>}
              <div style={{ flex:1, display:"flex", justifyContent:"flex-end", gap:8 }}>
                <button onClick={()=> hasInbox ? setShowBildirim(true) : setActive("hatirlatici")} title="Bildirimler" aria-label="Bildirimler"
                  style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:38, height:38,
                    display:"flex", alignItems:"center", justifyContent:"center", position:"relative", cursor:"pointer" }}>
                  <Ic n="bell" s={17} c={T.gold}/>
                  {hasInbox && myUnread.length>0 ? ((
                    <div style={{ position:"absolute", top:-4, right:-4, minWidth:18, height:18, borderRadius:99, padding:"0 5px",
                      background:T.red, color:"#fff", fontSize:10.5, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{myUnread.length}</div>
                  )) : data.reminders.filter(r=>!r.done).length>0 && (
                    <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:99, background:T.orangeL }}/>
                  )}
                </button>
              </div>
            </header>
            <div style={{ flex:1, width:"100%", maxWidth:1180, margin:"0 auto", padding:"24px 16px 48px" }}>
              {(active === "dashboard" || planHasFeature(plan, active)) && <FirstVisitTip id={active}/>}
              {SCREENS[active]||SCREENS.dashboard}
            </div>
          </main>
        </div>
        {overlays}
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:T.bg, paddingTop:"calc(56px + env(safe-area-inset-top))", paddingBottom:"calc(84px + env(safe-area-inset-bottom))", maxWidth:430, margin:"0 auto", position:"relative" }}>
        {/* Top bar (Apple Liquid Glass) */}
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100,
          background: T.flat ? T.bg : currentTheme.isDark ? "rgba(10, 10, 14, 0.75)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter:"blur(24px) saturate(190%)",
          WebkitBackdropFilter:"blur(24px) saturate(190%)",
          borderBottom: currentTheme.isDark ? `1px solid rgba(255, 255, 255, 0.08)` : `1px solid ${T.border}`,
          boxShadow: currentTheme.isDark ? "0 4px 20px rgba(0,0,0,0.35)" : "0 4px 20px rgba(15,23,42,0.08)",
          maxWidth:430, margin:"0 auto", paddingTop:"env(safe-area-inset-top)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px max(16px, env(safe-area-inset-right)) 10px max(16px, env(safe-area-inset-left))", position:"relative" }}>
            {isSubScreen && (
              <button onClick={()=>setActive("more")} aria-label="Geri"
                style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, borderRadius:99, width:40, height:40,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="back" s={16} c={T.text2}/>
              </button>
            )}
            <Logo compact showText={!studioName}/>
            {studioName && <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", maxWidth:"55%", fontSize:15, fontWeight:600, color:T.text,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", pointerEvents:"none" }}>{studioName}</div>}
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=> hasInbox ? setShowBildirim(true) : setActive("hatirlatici")} aria-label="Bildirimler"
                style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, borderRadius:99, width:44, height:44,
                  display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                <Ic n="bell" s={16} c={T.gold}/>
                {hasInbox && myUnread.length>0 ? ((
                  <div style={{ position:"absolute", top:-4, right:-4, minWidth:18, height:18, borderRadius:99, padding:"0 5px",
                    background:T.red, color:"#fff", fontSize:10.5, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center",
                    border:`2px solid ${T.surface}` }}>{myUnread.length}</div>
                )) : data.reminders.filter(r=>!r.done).length>0 && (
                  <div style={{ position:"absolute", top:5, right:5, width:8, height:8, borderRadius:99,
                    background:T.orangeL, border:`2px solid ${T.surface}` }}/>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Screen */}
        {(active === "dashboard" || planHasFeature(plan, active)) && <FirstVisitTip id={active}/>}
        {SCREENS[active]||SCREENS.dashboard}

        {overlays}

        {/* Bottom Nav (Apple Liquid Glass Dock) */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:100,
          background: T.flat ? T.surface : currentTheme.isDark ? "rgba(12, 12, 16, 0.78)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter:"blur(32px) saturate(200%)",
          WebkitBackdropFilter:"blur(32px) saturate(200%)",
          borderTop: currentTheme.isDark ? `1px solid rgba(255, 255, 255, 0.09)` : `1px solid ${T.border}`,
          boxShadow: currentTheme.isDark ? "0 -12px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)" : "0 -8px 24px rgba(15,23,42,0.08)",
          maxWidth:430, margin:"0 auto", paddingBottom:"max(16px, env(safe-area-inset-bottom))" }}>
          <div style={{ display:"flex", padding:"4px 8px 0" }}>
            {NAV.map(n=>{
              const isOn = active===n.id||(n.id==="more"&&isSubScreen);
              return (
                <button key={n.id} onClick={()=>setActive(n.id)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                    gap:4, padding:"8px 0 6px", background:isOn&&!T.flat?"rgba(255,255,255,0.06)":"transparent",
                    borderRadius:16, border:isOn&&!T.flat?"1px solid rgba(255,255,255,0.1)":"1px solid transparent",
                    boxShadow:isOn&&!T.flat?"inset 0 1px 0 rgba(255,255,255,0.18)":"none",
                    position:"relative", cursor:"pointer", transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)" }}>
                  <Ic n={n.icon} s={20} c={isOn?(T.flat?T.text:T.goldL):T.text3}/>
                  <span style={{ fontSize:11, fontWeight:isOn?700:500, color:isOn?(T.flat?T.text:T.goldL):T.text3, letterSpacing:"0.2px" }}>{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
