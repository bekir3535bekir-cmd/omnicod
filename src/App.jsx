import React, { useState, useEffect, useRef } from "react";
import { T, DARK_THEME, LIGHT_THEME, setGlobalTheme, makeCSS } from "./constants/theme";
import { Ic } from "./constants/icons";
import { fmt, fmtDate, todayStr, uid } from "./utils/helpers";
import { INIT } from "./constants/initialData";
import { sb, fromDB, toDB } from "./services/supabase";
import { getSession, getClientId, saveSession, clearSession } from "./services/storage";
import { getPlan, isProFeature } from "./services/plan";
import { Logo } from "./components/common";
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
import { HizliNot, HizliArama, GeceModu, IsAsistani, NotDefteri, MusteriPortali, LoginScreen } from "./components/modules/AppModals";

export default function App() {
  const [data, setData]       = useState(INIT);
  const [active, setActive]   = useState("dashboard");
  const [plan, setPlanState]  = useState(() => getPlan());
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [role, setRole] = useState(() => getSession());
  const [showGece, setShowGece] = useState(false);

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

  const [musteriClientId, setMusteriClientId] = useState(() => getClientId());
  const [pendingClientId, setPendingClientId] = useState(null); // Takvim'den müşteri kartı açmak için
  const handleLogin = (r, clientId) => {
    saveSession(r);
    setRole(r);
    if(clientId) setMusteriClientId(clientId);
  };
  const handleLogout = () => { clearSession(); setRole(null); };

  // Uygulama açılınca Supabase'den yükle
  useEffect(() => {
    const load = async () => {
      try {
        const [clients, appointments, packages, incomes, expenses, reminders,
               contracts, team, shifts, gallery, quotes, messages, locations, notes] = await Promise.all([
          sb.get("clients"), sb.get("appointments"), sb.get("packages"),
          sb.get("incomes"), sb.get("expenses"), sb.get("reminders"),
          sb.get("contracts"), sb.get("team"), sb.get("shifts"),
          sb.get("gallery"), sb.get("quotes"), sb.get("messages"), sb.get("locations"), sb.get("notes"),
        ]);

        const loadedClients  = (clients||[]).map(fromDB.clients);
        const loadedIncomes  = (incomes||[]).map(fromDB.incomes);

        // Müşteri ödemelerinden kayıp incomes'ları tamamla
        const existingIds2 = new Set(loadedIncomes.map(i=>i.id));
        const missingIncomes = loadedClients.flatMap(c=>
          (c.payments||[]).filter(p=>p.type==="Ödeme Alındı" && !existingIds2.has(p.id))
            .map(p=>({ id:p.id, clientName:c.name, amount:p.amount, type:"Ödeme", method:"Nakit", date:p.date||todayStr(), note:p.note||"", category:c.type||"Düğün" }))
        );

        // Dev mode fallback
        const useInit = !clients && (!loadedClients || loadedClients.length === 0);
        setData({
          clients:        useInit ? INIT.clients : loadedClients,
          appointments:   (appointments||[]).map(fromDB.appointments),
          packages:       (packages||[]).length > 0 ? (packages||[]).map(fromDB.packages) : INIT.packages,
          incomes:        [...loadedIncomes, ...missingIncomes],
          expenses:       (expenses||[]).map(fromDB.expenses),
          reminders:      (reminders||[]).map(fromDB.reminders),
          contracts:      (contracts||[]).map(fromDB.contracts),
          messages:       (messages||[]).map(fromDB.messages),
          deletedClients: [],
          team:           (team||[]).map(fromDB.team),
          shifts:         (shifts||[]).map(fromDB.shifts),
          gallery:        (gallery||[]).map(fromDB.gallery),
          quotes:         (quotes||[]).map(fromDB.quotes),
          locations:      (locations||[]).map(fromDB.locations),
          notes:          (notes||[]).map(fromDB.notes),
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

    // Realtime polling: her 30 saniyede Supabase'den güncel veriyi çek
    // isSaving flag ile kaydetme sırasında çakışmayı önle
    const pollInterval = setInterval(() => {
      if(!window._gesesSaving) load();
    }, 30000);
    return () => clearInterval(pollInterval);
  }, []);

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
    if(!dbReady) return;

    const sync = async () => {
      if(isSyncingRef.current) return;
      isSyncingRef.current = true;
      window._gesesSaving  = true;

      const tables   = ["clients","appointments","packages","incomes","expenses","reminders","contracts","team","shifts","gallery","quotes","messages","locations","notes"];
      const dataKeys = ["clients","appointments","packages","incomes","expenses","reminders","contracts","team","shifts","gallery","quotes","messages","locations","notes"];

      for(let i=0; i<tables.length; i++) {
        const table  = tables[i];
        const rows   = data[dataKeys[i]] || [];
        const toDBFn = toDB[table];
        if(!toDBFn) continue;
        for(const row of rows) {
          try { await sb.upsert(table, toDBFn(row)); } catch(e) {
            console.error(`Upsert hatası [${table}]:`, e);
          }
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

  // Update global T on theme change
  const currentTheme = darkMode ? DARK_THEME : LIGHT_THEME; setGlobalTheme(currentTheme);

  if(!role) return (
    <>
      <style>{makeCSS(T)}</style>
      <LoginScreen onLogin={handleLogin} data={data.clients}/>
    </>
  );

  if(role === "musteri") return (
    <>
      <style>{makeCSS(T)}</style>
      <MusteriPortali data={data} clientId={musteriClientId}
        onLogout={()=>{ clearSession(); setRole(null); setMusteriClientId(null); }}/>
    </>
  );

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
  const subScreens = ["musteriler","notdefteri","paketler","sozlesmeler","mesajlar","hatirlatici","ekip","galeri","raporlar","sablonlar","takvim","teklif","portal","isasistani","planyonetimi"];
  const isSubScreen = subScreens.includes(active);

  const isFullAccess = plan === "pro" || plan === "trial";

  const SCREENS = {
    dashboard:   <Dashboard     data={data} setActive={setActive} role={role} plan={plan}/>,
    ajanda:      <Ajanda        data={data} setData={setData} role={role} plan={plan} setActive={setActive}/>,
    musteriler:  <Musteriler    data={data} setData={setData} role={role} plan={plan} setActive={setActive} initialClientId={pendingClientId} onConsumeInitialClientId={()=>setPendingClientId(null)}/>,
    muhasebe:    role==="admin" ? <Muhasebe data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>,
    more:        <MoreMenu      setActive={setActive} darkMode={darkMode} setDarkMode={setDarkMode} role={role} plan={plan} onLogout={handleLogout}/>,
    takvim:      <Takvim        data={data} setActive={setActive} setDetailClientId={setPendingClientId}/>,
    paketler:    role==="admin" ? <Paketler data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>,
    sablonlar:   <Sablonlar     data={data}/>,
    sozlesmeler: !isFullAccess ? <ProGate proOnly featureLabel="Sözleşmeler" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Sozlesmeler data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    mesajlar:    <Mesajlar      data={data} setData={setData} role={role}/>,
    hatirlatici: <Hatirlaticilar data={data} setData={setData} role={role}/>,
    ekip:        <Ekip          data={data} setData={setData} role={role} plan={plan} setActive={setActive}/>,
    galeri:      !isFullAccess ? <ProGate proOnly featureLabel="Portföy Galerisi" onUpgrade={()=>setActive("planyonetimi")}/> : <Galeri data={data} setData={setData} role={role}/>,
    raporlar:    !isFullAccess ? <ProGate proOnly featureLabel="Raporlar & Analitik" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Raporlar data={data}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    teklif:      !isFullAccess ? <ProGate proOnly featureLabel="Fiyat Teklifi" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Teklif data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    portal:      !isFullAccess ? <ProGate proOnly featureLabel="Müşteri Portali" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <Portal data={data}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    isasistani:  !isFullAccess ? <ProGate proOnly featureLabel="İş Asistanı" onUpgrade={()=>setActive("planyonetimi")}/> : (role==="admin" ? <IsAsistani data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>),
    notdefteri:  role==="admin" ? <NotDefteri data={data} setData={setData} role={role}/> : <Dashboard data={data} setActive={setActive} role={role} plan={plan}/>,
    planyonetimi: <PlanYonetimi data={data} plan={plan} setPlanState={setPlanState} setActive={setActive}/>,
  };

  const CSS = makeCSS(T);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:T.bg, paddingTop:56, paddingBottom:84, maxWidth:430, margin:"0 auto", position:"relative" }}>
        {/* Top bar */}
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:T.surface,
          borderBottom:`1px solid ${T.border}`, maxWidth:430, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px" }}>
            {isSubScreen && (
              <button onClick={()=>setActive("more")}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:34, height:34,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="back" s={16} c={T.text2}/>
              </button>
            )}
            <Logo compact/>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=>setActive("hatirlatici")}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:34, height:34,
                  display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                <Ic n="bell" s={16} c={T.gold}/>
                {data.reminders.filter(r=>!r.done).length>0 && (
                  <div style={{ position:"absolute", top:5, right:5, width:8, height:8, borderRadius:99,
                    background:T.orangeL, border:`2px solid ${T.surface}` }}/>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Screen */}
        {SCREENS[active]||SCREENS.dashboard}

        {/* Floating Buttons - sadece ana ekranlarda */}
        {!["more","login","notdefteri"].includes(active) && (
          <>
            <HizliNot data={data} setData={setData}/>
            <HizliArama data={data} setActive={setActive}/>
          </>
        )}

        {/* Gece Modu Özeti */}
        {showGece && role && (
          <GeceModu data={data} onClose={()=>setShowGece(false)}/>
        )}

        {/* Bottom Nav */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:100, background:T.surface,
          borderTop:`1px solid ${T.border}`, maxWidth:430, margin:"0 auto", paddingBottom:16 }}>
          <div style={{ display:"flex" }}>
            {NAV.map(n=>{
              const isOn = active===n.id||(n.id==="more"&&isSubScreen);
              return (
                <button key={n.id} onClick={()=>setActive(n.id)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                    gap:4, padding:"10px 0 6px", background:"transparent", position:"relative", border:"none", cursor:"pointer" }}>
                  {isOn && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                    width:26, height:3, borderRadius:99, background:T.gold }}/>}
                  <Ic n={n.icon} s={21} c={isOn?T.goldL:T.text3}/>
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
