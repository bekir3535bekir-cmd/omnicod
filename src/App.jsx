import React, { useState, useEffect, useRef } from "react";
import { T, DARK_THEME, LIGHT_THEME, SAPPHIRE_THEME, EMERALD_THEME, NORDIC_LIGHT, THEME_PALETTES, setGlobalTheme, makeCSS } from "./constants/theme";
import { Ic } from "./constants/icons";
import { fmt, fmtDate, todayStr, uid } from "./utils/helpers";
import { INIT } from "./constants/initialData";
import { sb, fromDB, toDB, IS_DEV, IS_CLOUD } from "./services/supabase";
import { getAuthSession, onAuthChange, fetchMyStudio, signOut, fetchProofData } from "./services/auth";
import { CloudAuth } from "./components/modules/CloudAuth";
import { getSession, getClientId, getStaffId, saveSession, clearSession, getLocalData, saveLocalData, getStudioInfo, getCurrentStudio, setCurrentStudio, clearCloudSession } from "./services/storage";
import { getPlan, isProFeature } from "./services/plan";
import { Logo, BottomSheet } from "./components/common";
import { ProGate } from "./components/common/ProGate";

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
      if (p.get("theme")) return p.get("theme");
      return localStorage.getItem("studyom_theme_key") || "sapphire";
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
  const myNotifications = (role === "personel" && staffId)
    ? (data.notifications || []).filter(n => n.teamId === staffId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    : [];
  const myUnread = myNotifications.filter(n => !n.read);
  const markRead = (ids) => {
    const changed = (data.notifications || []).filter(n => ids.includes(n.id) && !n.read).map(n => ({ ...n, read: true }));
    if (!changed.length) return;
    setData(p => ({ ...p, notifications: (p.notifications || []).map(n => changed.find(c => c.id === n.id) || n) }));
    changed.forEach(n => sb.upsert("notifications", toDB.notifications(n)).catch(() => {}));
  };

  // Yeni görev bildirimi: uygulama açıkken sistem bildirimi göster (masaüstü / tarayıcı)
  useEffect(() => {
    if (role !== "personel" || !staffId || typeof Notification === "undefined") return;
    if (Notification.permission === "default") { Notification.requestPermission().catch(() => {}); return; }
    if (Notification.permission !== "granted") return;
    let shown = [];
    try { shown = JSON.parse(localStorage.getItem("studyom_os_notified") || "[]"); } catch (e) {}
    const fresh = myUnread.filter(n => !shown.includes(n.id));
    fresh.forEach(n => { try { new Notification("STÜDYOM — " + n.title, { body: n.body, icon: "favicon.png" }); } catch (e) {} });
    if (fresh.length) {
      try { localStorage.setItem("studyom_os_notified", JSON.stringify([...shown, ...fresh.map(n => n.id)].slice(-300))); } catch (e) {}
    }
  }, [role, staffId, myUnread.length]);
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

    // Diğer cihazlardaki değişiklikleri al (30 sn'de bir)
    if (!IS_DEV) {
      const pollInterval = setInterval(() => {
        if(!window._gesesSaving) load();
      }, 30000);
      return () => clearInterval(pollInterval);
    }
  }, [cloudPhase]);

  // Geçmiş tarihli randevuları otomatik tamamlandı yap
  useEffect(() => {
    if(!dbReady) return;
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

      const FINANCE = ["incomes","expenses","contracts","quotes"];
      const tables  = ["clients","appointments","packages","incomes","expenses","reminders","contracts","team","shifts","gallery","quotes","messages","locations","notes","notifications"]
        .filter(tb => role === "admin" || !FINANCE.includes(tb));

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
    if (cloudPhase === "signedOut" || cloudPhase === "noStudio") return (
      <CloudAuth key={cloudPhase} stage={cloudPhase} onReady={s => s ? applyStudio(s) : null}
        onCustomer={id => { setMusteriClientId(id); setRole("musteri"); setCloudPhase("customer"); }}
        onLogout={goSignedOut}/>
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
        <div style={{ fontSize:40 }}>⚠️</div>
        <div style={{ fontSize:18, fontWeight:700, color:T.redL, textAlign:"center" }}>Bağlantı Hatası</div>
        <div style={{ fontSize:13, color:T.text3, textAlign:"center", lineHeight:1.7 }}>
          Supabase'e bağlanılamadı.<br/>İnternet bağlantını kontrol et ve yenile.
        </div>
        <button onClick={()=>{ setLoadError(false); setLoading(true); window.location.reload(); }}
          style={{ background:T.gold, border:"none", borderRadius:14, padding:"14px 28px",
            fontSize:15, fontWeight:700, color:T.bg, marginTop:8 }}>
          🔄 Yenile
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

  const NAV = [
    {id:"dashboard", icon:"home",     label:"Ana Sayfa"},
    {id:"ajanda",    icon:"calendar", label:"Ajanda"},
    {id:"muhasebe",  icon:"money",    label:"Muhasebe"},
    {id:"more",      icon:"more",     label:"Devamı"},
  ];
  const subScreens = ["musteriler","notdefteri","paketler","sozlesmeler","mesajlar","hatirlatici","ekip","galeri","raporlar","sablonlar","takvim","teklif","portal","isasistani","planyonetimi","altinsaat","pozrehberi","kartvizit","sesliasistan"];
  const isSubScreen = subScreens.includes(active);

  const isFullAccess = plan === "pro" || plan === "trial";

  const SCREENS = {
    dashboard:   <Dashboard     data={data} setData={setData} setActive={setActive} role={role} plan={plan}/>,
    ajanda:      <Ajanda        data={data} setData={setData} role={role} plan={plan} setActive={setActive}/>,
    musteriler:  <Musteriler    data={data} setData={setData} role={role} plan={plan} setActive={setActive} initialClientId={pendingClientId} onConsumeInitialClientId={()=>setPendingClientId(null)}/>,
    muhasebe:    role==="admin" ? <Muhasebe data={data} setData={setData} role={role}/> : <Dashboard data={data} setData={setData} setActive={setActive} role={role} plan={plan}/>,
    more:        <MoreMenu      setActive={setActive} themeKey={themeKey} setThemeKey={setThemeKey} darkMode={currentTheme.isDark} role={role} plan={plan} onLogout={handleLogout}/>,
    takvim:      <Takvim        data={data} setActive={setActive} setDetailClientId={setPendingClientId}/>,
    paketler:    role==="admin" ? <Paketler data={data} setData={setData} role={role}/> : <Dashboard data={data} setData={setData} setActive={setActive} role={role} plan={plan}/>,
    sablonlar:   <Sablonlar     data={data}/>,
    sozlesmeler: !isFullAccess ? <ProGate proOnly featureLabel="Sözleşmeler" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Sozlesmeler data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    mesajlar:    <Mesajlar      data={data} setData={setData} role={role}/>,
    hatirlatici: <Hatirlaticilar data={data} setData={setData} role={role}/>,
    ekip:        <Ekip          data={data} setData={setData} role={role} plan={plan} setActive={setActive}/>,
    galeri:      !isFullAccess ? <ProGate proOnly featureLabel="Portföy Galerisi" onUpgrade={()=>setActive("planyonetimi")}/> : <Galeri data={data} setData={setData} role={role}/>,
    raporlar:    !isFullAccess ? <ProGate proOnly featureLabel="Raporlar & Analitik" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Raporlar data={data}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    teklif:      !isFullAccess ? <ProGate proOnly featureLabel="Fiyat Teklifi" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Teklif data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    portal:      !isFullAccess ? <ProGate proOnly featureLabel="Müşteri Portali" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Portal data={data} setData={setData}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    isasistani:  !isFullAccess ? <ProGate proOnly featureLabel="İş Asistanı" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <IsAsistani data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    notdefteri:  role==="admin" ? <NotDefteri data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>,
    planyonetimi: role==="admin" ? <PlanYonetimi data={data} plan={plan} setPlanState={setPlanState} setActive={setActive}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>,
    altinsaat:   <AltinSaat appointments={data.appointments}/>,
    pozrehberi:  <PozRehberi/>,
    kartvizit:   <DijitalKartvizit role={role}/>,
    sesliasistan: <SesliAsistan data={data} setData={setData} setActive={setActive}/>,
  };

  const CSS = makeCSS(T);

  // Bildirim penceresi, hızlı not/arama düğmeleri ve gece modu — telefon ve masaüstü düzeninde ortak
  const overlays = (
    <>
        {/* Floating Buttons - sadece ana ekranlarda */}
        {!["more","login","notdefteri"].includes(active) && (
          <>
            {showBildirim && (
              <BottomSheet title="Bildirimlerim" onClose={()=>{ setShowBildirim(false); markRead(myUnread.map(n=>n.id)); }}>
                {myNotifications.length === 0 ? (
                  <div style={{ textAlign:"center", color:T.text3, fontSize:13, padding:"20px 0" }}>Henüz bildirim yok</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {myNotifications.map(n => (
                      <div key={n.id} onClick={()=>{ markRead([n.id]); setShowBildirim(false); setActive("ajanda"); }}
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
            <HizliNot data={data} setData={setData}/>
            <HizliArama data={data} setActive={setActive}/>
          </>
        )}

        {/* Gece Modu Özeti */}
        {showGece && role && (
          <GeceModu data={data} onClose={()=>setShowGece(false)}/>
        )}
    </>
  );

  if (isDesktop) {
    const isAdmin = role === "admin";
    const DESKTOP_MENU = [
      { group: "Genel", items: [
        { id:"dashboard", icon:"home", label:"Ana Sayfa" },
        { id:"ajanda", icon:"calendar", label:"Ajanda" },
        { id:"takvim", icon:"calendar", label:"Takvim" },
        { id:"musteriler", icon:"users", label:"Müşteriler" },
        { id:"hatirlatici", icon:"bell", label:"Hatırlatıcılar" },
      ]},
      { group: "Finans", items: [
        { id:"muhasebe", icon:"money", label:"Muhasebe", admin:true },
        { id:"teklif", icon:"doc", label:"Fiyat Teklifi", admin:true },
        { id:"sozlesmeler", icon:"doc", label:"Sözleşmeler", admin:true },
        { id:"paketler", icon:"box", label:"Paketler & Fiyatlar", admin:true },
        { id:"raporlar", icon:"chart", label:"Raporlar", admin:true },
      ]},
      { group: "Müşteri İletişimi", items: [
        { id:"mesajlar", icon:"msg", label:"Mesajlar" },
        { id:"sablonlar", icon:"copy", label:"Hazır Şablonlar" },
        { id:"portal", icon:"eye", label:"Müşteri Portalı", admin:true },
        { id:"galeri", icon:"camera", label:"Portföy Galerisi" },
      ]},
      { group: "Ekip & Araçlar", items: [
        { id:"ekip", icon:"team", label:"Ekip & Shift" },
        { id:"isasistani", icon:"warn", label:"İş Asistanı", admin:true },
        { id:"notdefteri", icon:"notebook", label:"Not Defteri", admin:true },
        { id:"altinsaat", icon:"clock", label:"Altın Saat & Işık" },
        { id:"pozrehberi", icon:"camera", label:"Poz Rehberi" },
        { id:"kartvizit", icon:"copy", label:"Dijital Kartvizit" },
        { id:"sesliasistan", icon:"msg", label:"Sesli Asistan" },
      ]},
    ];
    const staffMember = role === "personel" ? (data.team||[]).find(m => m.id === staffId) : null;
    const who = isAdmin ? (getStudioInfo().ad || "Yönetici") : (staffMember?.name || "Personel");
    const sideBg = currentTheme.isDark ? "rgba(255,255,255,0.025)" : "#FFFFFF";
    const NavBtn = ({ item }) => {
      const on = active === item.id;
      return (
        <button onClick={()=>setActive(item.id)}
          style={{ display:"flex", alignItems:"center", gap:11, width:"100%", padding:"7px 12px", borderRadius:10,
            background: on ? T.gold+"1F" : "transparent", border:`1px solid ${on ? T.gold+"55" : "transparent"}`,
            color: on ? T.goldL : T.text2, fontSize:13.5, fontWeight: on ? 700 : 500, cursor:"pointer", textAlign:"left" }}>
          <Ic n={item.icon} s={17} c={on ? T.goldL : T.text3}/>
          <span>{item.label}</span>
        </button>
      );
    };
    return (
      <>
        <style>{CSS}</style>
        <div style={{ display:"flex", minHeight:"100vh", background:T.bg }}>
          {/* Sol menü */}
          <aside style={{ width:252, flexShrink:0, position:"sticky", top:0, height:"100vh", overflow:"hidden",
            background:sideBg, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"18px 14px" }}>
            <div style={{ padding:"2px 6px 18px" }}><Logo compact/></div>
            <nav className="side-nav" style={{ flex:1, minHeight:0, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, paddingRight:2 }}>
              {DESKTOP_MENU.map(g => {
                const items = g.items.filter(i => !i.admin || isAdmin);
                if (!items.length) return null;
                return (
                  <div key={g.group}>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:T.text3, padding:"0 12px 6px" }}>{g.group}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {items.map(i => <NavBtn key={i.id} item={i}/>)}
                    </div>
                  </div>
                );
              })}
            </nav>
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:12, display:"flex", flexDirection:"column", gap:4 }}>
              <NavBtn item={{ id:"more", icon:"settings", label:"Ayarlar & Diğer" }}/>
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
              background: currentTheme.isDark ? "rgba(10,10,14,0.8)" : "rgba(255,255,255,0.88)", backdropFilter:"blur(20px)",
              borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontSize:13, color:T.text3, fontWeight:500 }}>{new Date().toLocaleDateString("tr-TR",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                <button onClick={()=> role==="personel" && staffId ? setShowBildirim(true) : setActive("hatirlatici")} title="Bildirimler"
                  style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:38, height:38,
                    display:"flex", alignItems:"center", justifyContent:"center", position:"relative", cursor:"pointer" }}>
                  <Ic n="bell" s={17} c={T.gold}/>
                  {role==="personel" && staffId ? (myUnread.length>0 && (
                    <div style={{ position:"absolute", top:-4, right:-4, minWidth:18, height:18, borderRadius:99, padding:"0 5px",
                      background:T.red, color:"#fff", fontSize:10.5, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{myUnread.length}</div>
                  )) : data.reminders.filter(r=>!r.done).length>0 && (
                    <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:99, background:T.orangeL }}/>
                  )}
                </button>
              </div>
            </header>
            <div style={{ flex:1, width:"100%", maxWidth:1180, margin:"0 auto", padding:"24px 16px 48px" }}>
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
      <div style={{ minHeight:"100vh", background:T.bg, paddingTop:56, paddingBottom:84, maxWidth:430, margin:"0 auto", position:"relative" }}>
        {/* Top bar (Apple Liquid Glass) */}
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100,
          background: currentTheme.isDark ? "rgba(10, 10, 14, 0.75)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter:"blur(24px) saturate(190%)",
          WebkitBackdropFilter:"blur(24px) saturate(190%)",
          borderBottom: currentTheme.isDark ? `1px solid rgba(255, 255, 255, 0.08)` : `1px solid ${T.border}`,
          boxShadow: currentTheme.isDark ? "0 4px 20px rgba(0,0,0,0.35)" : "0 4px 20px rgba(15,23,42,0.08)",
          maxWidth:430, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px" }}>
            {isSubScreen && (
              <button onClick={()=>setActive("more")}
                style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, borderRadius:99, width:34, height:34,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="back" s={16} c={T.text2}/>
              </button>
            )}
            <Logo compact/>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=> role==="personel" && staffId ? setShowBildirim(true) : setActive("hatirlatici")}
                style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, borderRadius:99, width:34, height:34,
                  display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                <Ic n="bell" s={16} c={T.gold}/>
                {role==="personel" && staffId ? (myUnread.length>0 && (
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
        {SCREENS[active]||SCREENS.dashboard}

        {overlays}

        {/* Bottom Nav (Apple Liquid Glass Dock) */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:100,
          background: currentTheme.isDark ? "rgba(12, 12, 16, 0.78)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter:"blur(32px) saturate(200%)",
          WebkitBackdropFilter:"blur(32px) saturate(200%)",
          borderTop: currentTheme.isDark ? `1px solid rgba(255, 255, 255, 0.09)` : `1px solid ${T.border}`,
          boxShadow: currentTheme.isDark ? "0 -12px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)" : "0 -8px 24px rgba(15,23,42,0.08)",
          maxWidth:430, margin:"0 auto", paddingBottom:16 }}>
          <div style={{ display:"flex", padding:"4px 8px 0" }}>
            {NAV.map(n=>{
              const isOn = active===n.id||(n.id==="more"&&isSubScreen);
              return (
                <button key={n.id} onClick={()=>setActive(n.id)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                    gap:4, padding:"8px 0 6px", background:isOn?"rgba(255,255,255,0.06)":"transparent",
                    borderRadius:16, border:isOn?"1px solid rgba(255,255,255,0.1)":"1px solid transparent",
                    boxShadow:isOn?"inset 0 1px 0 rgba(255,255,255,0.18)":"none",
                    position:"relative", cursor:"pointer", transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)" }}>
                  <Ic n={n.icon} s={20} c={isOn?T.goldL:T.text3}/>
                  <span style={{ fontSize:11, fontWeight:isOn?700:500, color:isOn?T.goldL:T.text3, letterSpacing:"0.2px" }}>{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
