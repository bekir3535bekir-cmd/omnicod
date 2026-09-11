import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, LEGACY_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE, LEGACY_MASTER_CODE, isComplete } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession, getAuthUser, saveAuthUser, generateVerificationCode, verifyEmailCode } from "../../services/storage";
import { resetTrial } from "../../services/plan";


export const HizliNot = ({ data, setData }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag,  setTag]  = useState("genel");
  const TAGS = [
    { id:"genel",   emoji:"📌" },
    { id:"cekim",   emoji:"📷" },
    { id:"fikir",   emoji:"💡" },
    { id:"kisisel", emoji:"🌿" },
  ];
  const save = () => {
    if(!text.trim()) return;
    const note = {
      id: Date.now().toString(),
      text: text.trim(),
      tag,
      date: todayStr(),
      time: new Date().toTimeString().slice(0,5),
      starred: false,
    };
    // Başa ekle → NotDefteri ile tutarlı sıralama
    setData(p=>({ ...p, notes: [note, ...(p.notes||[])] }));
    // Direkt Supabase'e yaz
    sb.upsert("notes", { id:String(note.id), text:note.text||"", tag:note.tag||"genel",
      date:note.date||"", time:note.time||"00:00", starred:false }).catch(()=>{});
    setText(""); setTag("genel"); setOpen(false);
  };
  return (
    <>
      {/* Floating buton */}
      <button onClick={()=>setOpen(true)}
        style={{ position:"fixed", bottom:90, right:"max(16px, calc(50% - 200px))", zIndex:80,
          width:50, height:50, borderRadius:99,
          background:`linear-gradient(135deg,${T.gold},${T.goldD})`,
          border:"none", boxShadow:`0 4px 20px ${T.gold}50`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
        📝
      </button>
      {open && (
        <BottomSheet title="Hızlı Not" onClose={()=>setOpen(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontSize:13, color:T.text3 }}>
              📓 Not Defteri'ne kaydedilecek
            </div>
            {/* Etiket seçimi */}
            <div style={{ display:"flex", gap:8 }}>
              {TAGS.map(t=>(
                <button key={t.id} onClick={()=>setTag(t.id)}
                  style={{ flex:1, background:tag===t.id?T.gold+"33":"transparent",
                    border:`1px solid ${tag===t.id?T.gold:T.border}`,
                    borderRadius:10, padding:"8px 4px", fontSize:18 }}>
                  {t.emoji}
                </button>
              ))}
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder="Aklına gelen her şeyi yaz..."
              autoFocus rows={5}
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:14,
                padding:"14px 16px", color:T.text, fontSize:14, resize:"none",
                outline:"none", lineHeight:1.6 }}/>
            <GoldButton label="Not Defteri'ne Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}
    </>
  );
};

// ════════════════════════════════════════════════
// HIZLI ARAMA (Global Floating)
// ════════════════════════════════════════════════

export const HizliArama = ({ data, setActive }) => {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const results = q.length < 2 ? [] : [
    ...data.clients.map(c=>({ type:"Müşteri", icon:"👤", label:c.name,
      sub:`${c.phone||""} • ${c.type||""} • ${fmtDate(c.date)}`,
      action:()=>setActive("musteriler") })),
    ...data.appointments.map(a=>({ type:"Randevu", icon:"📅", label:a.clientName,
      sub:`${fmtDate(a.date)} • ${a.location||""} • ${a.status}`,
      action:()=>setActive("ajanda") })),
    ...(data.reminders||[]).map(r=>({ type:"Not/Hatırlatıcı", icon:"🔔", label:r.text||r.title||"",
      sub:fmtDate(r.date), action:()=>setActive("hatirlatici") })),
  ].filter(r => r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)).slice(0,10);

  return (
    <>
      <button onClick={()=>setOpen(true)}
        style={{ position:"fixed", bottom:148, right:"max(16px, calc(50% - 200px))", zIndex:80,
          width:50, height:50, borderRadius:99,
          background:T.card2, border:`1px solid ${T.border}`,
          boxShadow:`0 4px 16px rgba(0,0,0,0.3)`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
        🔍
      </button>
      {open && (
        <BottomSheet title="Hızlı Arama" onClose={()=>{ setOpen(false); setQuery(""); }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Müşteri, randevu, not ara..."
              autoFocus
              style={{ background:T.card2, border:`1px solid ${T.gold}44`, borderRadius:14,
                padding:"14px 16px", color:T.text, fontSize:15, outline:"none" }}/>
            {q.length >= 2 && results.length === 0 && (
              <div style={{ textAlign:"center", padding:20, color:T.text3, fontSize:13 }}>
                Sonuç bulunamadı
              </div>
            )}
            {results.map((r,i)=>(
              <button key={i} onClick={()=>{ r.action(); setOpen(false); setQuery(""); }}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:14,
                  padding:"12px 14px", display:"flex", gap:12, alignItems:"center", textAlign:"left" }}>
                <div style={{ fontSize:22, flexShrink:0 }}>{r.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{r.label}</div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:2, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.sub}</div>
                </div>
                <div style={{ fontSize:10, color:T.text3, background:T.card3, borderRadius:6,
                  padding:"3px 7px", flexShrink:0 }}>{r.type}</div>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </>
  );
};

// ════════════════════════════════════════════════
// GECE MODU ÖZETİ
// ════════════════════════════════════════════════

export const GeceModu = ({ data, onClose }) => {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const todayStr2 = now.toISOString().split("T")[0];

  const todayPayments = data.incomes.filter(i=>i.date===todayStr2);
  const todayTotal = todayPayments.reduce((s,i)=>s+Number(i.amount||0),0);
  const tomorrowApts = data.appointments.filter(a=>a.date===tomorrowStr&&a.status!=="iptal");
  const overdueDeliveries = data.clients.filter(c=>{
    if(isComplete(c)) return false;
    const apt = data.appointments.find(a=>a.clientName===c.name);
    if(!apt||!apt.date) return false;
    return apt.date < todayStr2;
  }).length;
  const pendingPayments = data.clients.filter(c=>c.totalAmount>0&&c.paid<c.totalAmount&&!isComplete(c)).length;

  return (
    <BottomSheet title="🌙 Gece Özeti" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ textAlign:"center", padding:"8px 0 4px" }}>
          <div style={{ fontFamily:"Playfair Display", fontSize:18, color:T.goldL, marginBottom:4 }}>
            İyi Geceler 🌙
          </div>
          <div style={{ fontSize:12, color:T.text3 }}>Bugünün özeti</div>
        </div>

        {/* Bugün alınan ödemeler */}
        <div style={{ background:T.green+"1A", border:`1px solid ${T.green}33`,
          borderRadius:14, padding:16, display:"flex", gap:14, alignItems:"center" }}>
          <div style={{ fontSize:28 }}>💰</div>
          <div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:2 }}>Bugün alınan ödemeler</div>
            <div style={{ fontSize:20, fontWeight:700, color:T.greenL }}>{fmt(todayTotal)}</div>
            <div style={{ fontSize:11, color:T.text3 }}>{todayPayments.length} işlem</div>
          </div>
        </div>

        {/* Yarın çekimler */}
        <div style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`,
          borderRadius:14, padding:16 }}>
          <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>📷 Yarın çekim</div>
          {tomorrowApts.length === 0 ? (
            <div style={{ fontSize:13, color:T.text2 }}>Yarın çekim yok, dinlenebilirsin ✅</div>
          ) : tomorrowApts.map(a=>(
            <div key={a.id} style={{ fontSize:13, fontWeight:600, color:T.blueL, marginBottom:4 }}>
              📸 {a.clientName} — {a.location||"Lokasyon belirtilmemiş"}
            </div>
          ))}
        </div>

        {/* Uyarılar */}
        {(overdueDeliveries > 0 || pendingPayments > 0) && (
          <div style={{ background:T.orange+"1A", border:`1px solid ${T.orange}33`,
            borderRadius:14, padding:16 }}>
            <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>⚠️ Dikkat</div>
            {overdueDeliveries > 0 && (
              <div style={{ fontSize:13, color:T.orangeL, marginBottom:4 }}>
                🕐 {overdueDeliveries} müşteri teslimatı gecikiyor
              </div>
            )}
            {pendingPayments > 0 && (
              <div style={{ fontSize:13, color:T.orangeL }}>
                💸 {pendingPayments} müşterinin ödemesi eksik
              </div>
            )}
          </div>
        )}

        <button onClick={onClose}
          style={{ background:`linear-gradient(135deg,${T.gold},${T.goldD})`,
            border:"none", borderRadius:14, padding:16,
            fontSize:15, fontWeight:700, color:"#0A0A0B" }}>
          Tamam, iyi geceler! 🌙
        </button>
      </div>
    </BottomSheet>
  );
};

// ════════════════════════════════════════════════
// İŞ ASİSTANI PANELİ
// ════════════════════════════════════════════════

export const IsAsistani = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const [tab, setTab] = useState("ozet");
  const [savedReports, setSavedReports] = useState([]);
  const [alarms, setAlarms] = useState(() => {
    try { return JSON.parse(localStorage.getItem("geses_alarms")||"[]"); } catch{ return []; }
  });
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [aForm, setAForm] = useState({ label:"", days:"3", target:"odeme", active:true });

  // Kayıtlı raporları Supabase'den yükle
  useEffect(() => {
    sb.get("weekly_reports").then(rows => {
      if(rows && rows.length > 0)
        setSavedReports([...rows].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));
    }).catch(()=>{});
  }, []);

  const saveAlarm = () => {
    if(!aForm.label.trim()) return;
    const updated = [...alarms, { ...aForm, id: Date.now().toString() }];
    setAlarms(updated);
    localStorage.setItem("geses_alarms", JSON.stringify(updated));
    setShowAddAlarm(false);
    setAForm({ label:"", days:"3", target:"odeme", active:true });
  };
  const deleteAlarm = id => { const u=alarms.filter(a=>a.id!==id); setAlarms(u); localStorage.setItem("geses_alarms",JSON.stringify(u)); };
  const toggleAlarm = id => { const u=alarms.map(a=>a.id===id?{...a,active:!a.active}:a); setAlarms(u); localStorage.setItem("geses_alarms",JSON.stringify(u)); };

  const now      = new Date();
  const today    = now.toISOString().split("T")[0];
  const dayOfWeek = now.getDay(); // 0=Pazar
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() + mondayOffset); weekStart.setHours(0,0,0,0);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
  const nextWeekStart = new Date(weekStart); nextWeekStart.setDate(weekStart.getDate() + 7);
  const nextWeekEnd   = new Date(weekEnd);   nextWeekEnd.setDate(weekEnd.getDate() + 7);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd   = new Date(weekStart); lastWeekEnd.setDate(weekStart.getDate() - 1); lastWeekEnd.setHours(23,59,59,999);

  const inRange = (dateStr, start, end) => {
    if(!dateStr) return false;
    const d = new Date(dateStr+"T12:00:00");
    return d >= start && d <= end;
  };

  // Bu haftaki randevular
  const thisWeekApts  = data.appointments.filter(a=>inRange(a.date, weekStart, weekEnd)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  // Gelecek haftaki randevular
  const nextWeekApts  = data.appointments.filter(a=>inRange(a.date, nextWeekStart, nextWeekEnd)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  // Geçen haftaki randevular (PDF için)
  const lastWeekApts  = data.appointments.filter(a=>inRange(a.date, lastWeekStart, lastWeekEnd));

  // Bu hafta gelirleri
  const weekIncome = data.incomes.filter(i=>inRange(i.date, weekStart, weekEnd)).reduce((s,i)=>s+i.amount,0);
  const lastWeekIncome = data.incomes.filter(i=>inRange(i.date, lastWeekStart, lastWeekEnd)).reduce((s,i)=>s+i.amount,0);

  // Geciken ödemeler
  const overduePayments = data.clients.filter(c => {
    if(isComplete(c)) return false;
    return (c.payments||[]).some(p=>p.type==="Ödeme Sözü"&&p.promiseDate&&p.promiseDate<today&&!p.paid);
  });

  // Geciken teslimler
  const overdueDeliveries = data.clients.filter(c => {
    if(isComplete(c)) return false;
    const apt = data.appointments.find(a=>a.clientName===c.name);
    return apt?.date && apt.date < today && !(c.process||{}).done;
  });

  // Arşive hazır
  const archiveSuggestions = data.clients.filter(c => isComplete(c) && c.status !== "arşiv");

  // Bekleyen ödemeler (alınmamış)
  const pendingPayments = data.clients.filter(c=>c.totalAmount>0&&c.paid<c.totalAmount&&c.status!=="iptal");

  // Akıllı öneriler
  const suggestions = [];
  if(thisWeekApts.length > 0) {
    thisWeekApts.forEach(a => {
      const client = data.clients.find(c=>c.name===a.clientName);
      const debt = client ? client.totalAmount - client.paid : 0;
      if(debt > 0) suggestions.push({ type:"warn", text:`${a.clientName} — ${fmtDate(a.date)} çekimi için ${fmt(debt)} kalan ödeme var`, action:"odeme" });
      if(!a.location) suggestions.push({ type:"info", text:`${a.clientName} — ${fmtDate(a.date)} çekiminin konumu girilmemiş`, action:"konum" });
    });
  }
  overduePayments.slice(0,3).forEach(c => {
    const pending = (c.payments||[]).find(p=>p.type==="Ödeme Sözü"&&p.promiseDate&&p.promiseDate<today);
    suggestions.push({ type:"alert", text:`${c.name} — ${fmtDate(pending?.promiseDate)} tarihli ${fmt(pending?.amount||0)} ödeme gecikmiş`, phone: c.phone });
  });
  if(archiveSuggestions.length > 0) suggestions.push({ type:"archive", text:`${archiveSuggestions.length} müşteri tüm süreçleri tamamladı, arşive taşıyabilirsin` });
  if(nextWeekApts.length > 0) suggestions.push({ type:"info", text:`Gelecek hafta ${nextWeekApts.length} çekim var, hazırlıklarını başlat` });

  // Tutarlılık kontrolü — sahipsiz (orphan) randevular
  const orphanApts = data.appointments.filter(a =>
    !data.clients.some(c => c.id===a.clientId || c.name===a.clientName)
  );
  if(orphanApts.length > 0) {
    suggestions.push({ type:"alert", text:`⚠️ ${orphanApts.length} randevunun bağlı müşterisi bulunamadı (silinmiş olabilir): ${orphanApts.slice(0,3).map(a=>a.clientName).join(", ")}${orphanApts.length>3?"...":""}` });
  }

  // Yapılacaklar
  const todos = [];
  overdueDeliveries.forEach(c => {
    const doneCount = PROCESS_STEPS.filter(s=>(c.process||{})[s.id]).length;
    todos.push({ label:`${c.name} teslimatını tamamla`, sub:`${doneCount}/${PROCESS_STEPS.length} adım`, urgent:true });
  });
  thisWeekApts.forEach(a => {
    todos.push({ label:`${a.clientName} çekimine hazırlan`, sub:fmtDate(a.date), urgent: daysLeft(a.date)<=2 });
  });
  pendingPayments.slice(0,3).forEach(c => {
    todos.push({ label:`${c.name} kalan ödemeyi takip et`, sub:fmt(c.totalAmount-c.paid), urgent:false });
  });

  // PDF Raporu oluştur
  const generatePDF = () => {
    const lastWeekLabel = `${lastWeekStart.toLocaleDateString("tr-TR",{day:"numeric",month:"long"})} – ${lastWeekEnd.toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}`;
    const thisWeekLabel = `${weekStart.toLocaleDateString("tr-TR",{day:"numeric",month:"long"})} – ${weekEnd.toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}`;

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>
<title>OmniCod — Haftalık Rapor</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; color:#1a1a1a; padding:32px; max-width:700px; margin:0 auto; }
  h1 { font-size:24px; color:#B8953F; margin-bottom:4px; }
  .sub { font-size:12px; color:#888; margin-bottom:28px; }
  h2 { font-size:15px; font-weight:700; color:#333; border-bottom:2px solid #B8953F; padding-bottom:6px; margin:24px 0 12px; }
  .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:13px; }
  .row .label { color:#555; }
  .row .val { font-weight:700; }
  .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:700; margin-left:6px; }
  .green { color:#2E7D4F; } .orange { color:#C4813A; } .red { color:#C94444; }
  .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px; }
  .stat { background:#f9f6ef; border-radius:10px; padding:12px; text-align:center; }
  .stat .num { font-size:26px; font-weight:700; color:#B8953F; }
  .stat .lbl { font-size:11px; color:#888; margin-top:2px; }
  .apt-card { background:#f9f6ef; border-radius:8px; padding:10px 14px; margin-bottom:6px; }
  .apt-card .name { font-size:13px; font-weight:700; }
  .apt-card .meta { font-size:11px; color:#888; margin-top:2px; }
  @media print { body { padding:20px; } }
</style></head><body>
<h1>OmniCod</h1>
<div class="sub">Haftalık Rapor — ${now.toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric",weekday:"long"})}</div>

<h2>📊 Geçen Hafta Özeti</h2>
<div class="sub" style="margin-bottom:10px">${lastWeekLabel}</div>
<div class="stat-grid">
  <div class="stat"><div class="num">${lastWeekApts.length}</div><div class="lbl">Çekim</div></div>
  <div class="stat"><div class="num">${lastWeekIncome>0?((lastWeekIncome/1000).toFixed(1)+"B ₺"):"0 ₺"}</div><div class="lbl">Gelir</div></div>
</div>
${lastWeekApts.length > 0 ? `
<div style="margin-top:12px">
${lastWeekApts.map(a=>`
<div class="apt-card">
  <div class="name">${a.clientName}</div>
  <div class="meta">${fmtDate(a.date)} • ${a.type} • ${a.package}</div>
</div>`).join("")}
</div>` : `<div style="color:#888;font-size:13px;padding:8px 0">Geçen hafta çekim bulunmuyor.</div>`}

<h2>📅 Bu Hafta</h2>
<div class="sub" style="margin-bottom:10px">${thisWeekLabel}</div>
<div class="stat-grid">
  <div class="stat"><div class="num">${thisWeekApts.length}</div><div class="lbl">Planlanan Çekim</div></div>
  <div class="stat"><div class="num">${weekIncome>0?((weekIncome/1000).toFixed(1)+"B ₺"):"0 ₺"}</div><div class="lbl">Bu Hafta Gelir</div></div>
</div>
${thisWeekApts.length > 0 ? `
<div style="margin-top:12px">
${thisWeekApts.map(a=>{
  const client = data.clients.find(c=>c.name===a.clientName);
  const debt = client ? client.totalAmount - client.paid : 0;
  return `<div class="apt-card">
    <div class="name">${a.clientName} ${debt>0?`<span class="badge orange">⏳ ${(debt/1000).toFixed(0)}K₺ kalan</span>`:''}</div>
    <div class="meta">${fmtDate(a.date)}${a.time?" • "+a.time:""} • ${a.type} • ${a.package}${a.location?" • "+a.location:""}</div>
  </div>`;
}).join("")}
</div>` : `<div style="color:#888;font-size:13px;padding:8px 0">Bu hafta planlanmış çekim yok.</div>`}

${overduePayments.length > 0 ? `
<h2>💸 Geciken Ödemeler</h2>
${overduePayments.map(c=>{
  const p = (c.payments||[]).find(x=>x.type==="Ödeme Sözü"&&x.promiseDate&&x.promiseDate<today);
  return `<div class="row"><span class="label">${c.name}</span><span class="val red">${fmt(p?.amount||0)} — Söz: ${fmtDate(p?.promiseDate)}</span></div>`;
}).join("")}` : ""}

${pendingPayments.length > 0 ? `
<h2>💰 Bekleyen Ödemeler</h2>
${pendingPayments.slice(0,5).map(c=>`
<div class="row"><span class="label">${c.name}</span><span class="val orange">${fmt(c.totalAmount-c.paid)}</span></div>`).join("")}` : ""}

<div style="margin-top:40px;font-size:11px;color:#bbb;text-align:center;border-top:1px solid #eee;padding-top:16px">
  OmniCod • Otomatik Haftalık Rapor • ${now.toLocaleDateString("tr-TR")}
</div>
</body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 500);

    // Supabase'e kaydet
    const report = {
      id: `${weekStart.toISOString().split("T")[0]}_${Date.now()}`,
      week_start: weekStart.toISOString().split("T")[0],
      week_end:   weekEnd.toISOString().split("T")[0],
      week_label: thisWeekLabel,
      created_at: now.toISOString().split("T")[0],
      appointments_count: thisWeekApts.length,
      income:             weekIncome,
      overdue_payments:   overduePayments.length,
      overdue_deliveries: overdueDeliveries.length,
      appointments_data:  thisWeekApts.map(a=>({name:a.clientName,date:a.date,type:a.type,package:a.package,location:a.location||""})),
      pending_payments_data: pendingPayments.slice(0,10).map(c=>({name:c.name,amount:c.totalAmount-c.paid})),
      suggestions_data:   suggestions.map(s=>({type:s.type,text:s.text})),
    };
    sb.upsert("weekly_reports", report).then(()=>{
      setSavedReports(prev => {
        const updated = [report, ...prev.filter(r=>r.id!==report.id)];
        return updated;
      });
    }).catch(e=>console.error("Rapor kaydedilemedi:", e));
  };

  const TABS = [{id:"ozet",label:"📊 Özet"},{id:"yaklasan",label:"📅 Yaklaşan"},{id:"yapilacak",label:"✅ Yapılacak"},{id:"oneriler",label:"💡 Öneriler"},{id:"gecmis",label:"📁 Geçmiş"}];

  return (
    <div className="fade-in">
      <div style={{ padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, paddingBottom:16, marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:"Playfair Display", fontSize:24, fontWeight:600, color:T.goldL }}>🛠 İş Asistanı</h1>
          <p style={{ fontSize:12, color:T.text3, marginTop:4 }}>{now.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <button onClick={generatePDF}
          style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:12,
            padding:"9px 14px", fontSize:12, fontWeight:700, color:T.goldL,
            display:"flex", alignItems:"center", gap:6 }}>
          <Ic n="doc" s={14} c={T.goldL}/>
          PDF Rapor
        </button>
      </div>

      {/* Tab seçici */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", padding:"0 20px 14px" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ background:tab===t.id?T.gold:"transparent",
              color:tab===t.id?T.bg:T.text2, border:`1px solid ${tab===t.id?T.gold:T.border}`,
              borderRadius:99, padding:"7px 14px", fontSize:12, fontWeight:600,
              whiteSpace:"nowrap", flexShrink:0 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"0 20px 100px" }}>

        {/* ── ÖZET ── */}
        {tab==="ozet" && <>
          {/* Stat kartlar */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { icon:"📅", label:"Bu Hafta Çekim",   value:thisWeekApts.length,    color:T.goldL },
              { icon:"💰", label:"Bu Hafta Gelir",   value:fmtShort(weekIncome),   color:T.greenL },
              { icon:"💸", label:"Geciken Ödeme",    value:overduePayments.length, color:T.redL },
              { icon:"📦", label:"Geciken Teslim",   value:overdueDeliveries.length,color:T.orangeL },
            ].map(s=>(
              <div key={s.label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14 }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:"DM Sans" }}>{s.value}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bu hafta özet */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
              Bu Hafta — {weekStart.toLocaleDateString("tr-TR",{day:"numeric",month:"short"})} / {weekEnd.toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"})}
            </div>
            {thisWeekApts.length === 0
              ? <div style={{ fontSize:13, color:T.text3 }}>Bu hafta planlanmış çekim yok.</div>
              : thisWeekApts.map(a=>{
                  const d = daysLeft(a.date);
                  const client = data.clients.find(c=>c.name===a.clientName);
                  const debt = client ? client.totalAmount - client.paid : 0;
                  return (
                    <div key={a.id} style={{ display:"flex", gap:12, alignItems:"center",
                      borderBottom:`1px solid ${T.border}`, paddingBottom:10, marginBottom:10 }}>
                      <div style={{ background:T.goldGlow, borderRadius:10, padding:"8px 10px", textAlign:"center", minWidth:44, flexShrink:0 }}>
                        <div style={{ fontFamily:"Playfair Display", fontSize:18, fontWeight:700, color:T.goldL, lineHeight:1 }}>
                          {new Date(a.date+"T12:00:00").getDate()}
                        </div>
                        <div style={{ fontSize:9, color:T.text3, marginTop:2 }}>
                          {MN[new Date(a.date+"T12:00:00").getMonth()].slice(0,3)}
                        </div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{a.clientName}</div>
                        <div style={{ fontSize:11, color:T.text3 }}>{a.type} • {a.package}</div>
                        {a.location && <div style={{ fontSize:11, color:T.text3 }}>📍 {a.location}</div>}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        <Pill label={d===0?"Bugün!":d===1?"Yarın!":d<=0?"Geçti":`${d} gün`} color={d<=0?T.text3:d<=1?T.redL:d<=3?T.orangeL:T.text3}/>
                        {debt > 0 && <div style={{ fontSize:10, color:T.orangeL, fontWeight:600 }}>⏳ {fmtShort(debt)}</div>}
                      </div>
                    </div>
                  );
              })
            }
          </div>

          {/* Gelecek hafta önizleme */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
              Gelecek Hafta — {nextWeekApts.length} çekim
            </div>
            {nextWeekApts.length === 0
              ? <div style={{ fontSize:13, color:T.text3 }}>Gelecek hafta randevu yok.</div>
              : nextWeekApts.map(a=>(
                <div key={a.id} style={{ display:"flex", justifyContent:"space-between",
                  borderBottom:`1px solid ${T.border}`, paddingBottom:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{a.clientName}</div>
                    <div style={{ fontSize:11, color:T.text3 }}>{fmtDate(a.date)} • {a.type}</div>
                  </div>
                  <Pill label={a.package} color={data.packages.find(p=>p.name===a.package)?.color||T.gold}/>
                </div>
              ))
            }
          </div>

          {/* Geciken Ödemeler */}
          {overduePayments.length > 0 && (
            <div style={{ background:T.card, border:`1px solid ${T.red}33`, borderRadius:16, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.redL, marginBottom:12 }}>💸 Geciken Ödemeler ({overduePayments.length})</div>
              {overduePayments.map(c=>{
                const pending = (c.payments||[]).find(p=>p.type==="Ödeme Sözü"&&p.promiseDate&&p.promiseDate<today);
                const ph = (c.phone||"").replace(/\D/g,"").replace(/^0/,"");
                return (
                  <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    borderBottom:`1px solid ${T.border}`, paddingBottom:8, marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:T.redL }}>Söz: {fmtDate(pending?.promiseDate)} — {fmt(pending?.amount||0)}</div>
                    </div>
                    {ph && <button onClick={()=>window.open(`https://wa.me/90${ph}?text=${encodeURIComponent(`Merhaba ${c.name.split(" ")[0]} 👋\nÖdeme hatırlatması için ulaştık.\nOmniCod 📸`)}`, "_blank")}
                      style={{ background:"#25D36622", border:"1px solid #25D36644", borderRadius:10,
                        padding:"6px 10px", fontSize:11, fontWeight:700, color:"#25D366", flexShrink:0 }}>WA 💬</button>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Arşive hazır */}
          {archiveSuggestions.length > 0 && (
            <div style={{ background:T.card, border:`1px solid ${T.green}33`, borderRadius:16, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.greenL, marginBottom:8 }}>🗂 Arşive Hazır ({archiveSuggestions.length})</div>
              <div style={{ fontSize:12, color:T.text3, marginBottom:10 }}>Tüm süreçleri tamamlanan müşteriler</div>
              {archiveSuggestions.slice(0,3).map(c=>(
                <div key={c.id} style={{ fontSize:12, color:T.text2, marginBottom:4 }}>✅ {c.name}</div>
              ))}
              <button onClick={()=>setData(p=>({...p, clients:p.clients.map(c=>archiveSuggestions.find(ac=>ac.id===c.id)?{...c,status:"arşiv",archivedAt:todayStr()}:c)}))}
                style={{ marginTop:10, width:"100%", background:T.green+"22", border:`1px solid ${T.green}44`,
                  borderRadius:12, padding:10, fontSize:12, fontWeight:700, color:T.greenL }}>
                🗂 Hepsini Arşive Taşı
              </button>
            </div>
          )}
        </>}

        {/* ── YAKLAŞAN ── */}
        {tab==="yaklasan" && <>
          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>📅 Bu Hafta ({thisWeekApts.length})</div>
          {thisWeekApts.length === 0
            ? <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:20, textAlign:"center", color:T.text3, fontSize:13, marginBottom:16 }}>Bu hafta çekim yok</div>
            : thisWeekApts.map(a=>{
              const d = daysLeft(a.date);
              const client = data.clients.find(c=>c.name===a.clientName);
              const debt = client ? client.totalAmount - client.paid : 0;
              return (
                <div key={a.id} style={{ background:T.card, border:`1px solid ${d<=1?T.red+"44":T.border}`,
                  borderRadius:14, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{a.clientName}</div>
                    <Pill label={d===0?"Bugün!":d===1?"Yarın!":d<0?"Geçti":`${d} gün`} color={d<=0?T.text3:d<=1?T.redL:d<=3?T.orangeL:T.blueL}/>
                  </div>
                  {[["📅 Tarih",fmtDate(a.date)],["⏰ Saat",a.time||"—"],["📍 Konum",a.location||"—"],["📦 Paket",a.package],["🎯 Tür",a.type]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex", gap:8, fontSize:12, color:T.text3, marginBottom:3 }}>
                      <span style={{ minWidth:70 }}>{l}</span>
                      <span style={{ color:T.text2, fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                  {debt > 0 && (
                    <div style={{ marginTop:8, background:T.orange+"1A", border:`1px solid ${T.orange}33`,
                      borderRadius:8, padding:"6px 10px", fontSize:11, color:T.orangeL, fontWeight:600 }}>
                      ⏳ {fmt(debt)} kalan ödeme
                    </div>
                  )}
                </div>
              );
            })
          }

          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12, marginTop:8 }}>📅 Gelecek Hafta ({nextWeekApts.length})</div>
          {nextWeekApts.length === 0
            ? <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:20, textAlign:"center", color:T.text3, fontSize:13 }}>Gelecek hafta çekim yok</div>
            : nextWeekApts.map(a=>(
              <div key={a.id} style={{ background:T.card, border:`1px solid ${T.border}`,
                borderRadius:14, padding:14, marginBottom:10 }}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>{a.clientName}</div>
                <div style={{ fontSize:12, color:T.text3 }}>📅 {fmtDate(a.date)} • {a.type} • {a.package}</div>
                {a.location && <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>📍 {a.location}</div>}
              </div>
            ))
          }
        </>}

        {/* ── YAPILACAKLAR ── */}
        {tab==="yapilacak" && <>
          {todos.length === 0
            ? <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:24, textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🎉</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.greenL }}>Her şey tamam!</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>Yapılacak işin yok, iyi iş!</div>
              </div>
            : todos.map((t,i)=>(
              <div key={i} style={{ background:T.card, border:`1px solid ${t.urgent?T.red+"44":T.border}`,
                borderRadius:14, padding:14, marginBottom:8, display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ background:t.urgent?T.red+"1A":T.card2, borderRadius:10, width:36, height:36, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  {t.urgent?"🔴":"🟡"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:t.urgent?T.text:T.text2 }}>{t.label}</div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{t.sub}</div>
                </div>
                {t.urgent && <Pill label="Acil" color={T.redL}/>}
              </div>
            ))
          }
        </>}

        {/* ── ÖNERİLER ── */}
        {tab==="oneriler" && <>
          {suggestions.length === 0
            ? <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:24, textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✨</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Öneri yok</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>Her şey yolunda görünüyor!</div>
              </div>
            : suggestions.map((s,i)=>{
              const iconMap = { warn:"⚠️", info:"💡", alert:"🔴", archive:"🗂" };
              const colorMap = { warn:T.orangeL, info:T.blueL, alert:T.redL, archive:T.greenL };
              const borderMap = { warn:T.orange+"44", info:T.blue+"44", alert:T.red+"44", archive:T.green+"44" };
              return (
                <div key={i} style={{ background:T.card, border:`1px solid ${borderMap[s.type]||T.border}`,
                  borderRadius:14, padding:14, marginBottom:8, display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{iconMap[s.type]||"💡"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:colorMap[s.type]||T.text2, lineHeight:1.5 }}>{s.text}</div>
                    {s.phone && (
                      <button onClick={()=>window.open(`https://wa.me/90${s.phone.replace(/\D/g,"").replace(/^0/,"")}?text=${encodeURIComponent("Merhaba! OmniCod'dan arıyoruz.")}`, "_blank")}
                        style={{ marginTop:8, background:"#25D36622", border:"1px solid #25D36644",
                          borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, color:"#25D366" }}>
                        WA ile Ara 💬
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          }

          {/* Özel Alarmlar */}
          <div style={{ marginTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>🔔 Özel Alarmlar</div>
              <button onClick={()=>setShowAddAlarm(true)}
                style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`,
                  borderRadius:10, padding:"5px 12px", fontSize:12, fontWeight:700, color:T.goldL }}>
                + Ekle
              </button>
            </div>
            {alarms.length === 0
              ? <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
                  padding:14, textAlign:"center", color:T.text3, fontSize:12 }}>
                  Henüz alarm yok. Kendi kuralını oluştur!
                </div>
              : alarms.map(a=>(
                <div key={a.id} style={{ background:T.card, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:12, marginBottom:8, display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:a.active?T.text:T.text3 }}>{a.label}</div>
                    <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{a.days} gün önce • {a.target==="odeme"?"Ödeme":"Çekim"}</div>
                  </div>
                  <button onClick={()=>toggleAlarm(a.id)}
                    style={{ background:a.active?T.green+"22":T.card2, border:`1px solid ${a.active?T.green+"44":T.border}`,
                      borderRadius:99, padding:"4px 10px", fontSize:11, fontWeight:700, color:a.active?T.greenL:T.text3 }}>
                    {a.active?"Açık":"Kapalı"}
                  </button>
                  <button onClick={()=>deleteAlarm(a.id)}
                    style={{ background:T.red+"1A", borderRadius:8, padding:"6px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Ic n="trash" s={13} c={T.redL}/>
                  </button>
                </div>
              ))
            }
          </div>
        </>}

        {/* ── GEÇMİŞ RAPORLAR ── */}
        {tab==="gecmis" && <>
          {savedReports.length === 0
            ? <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:24, textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📁</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Kayıtlı rapor yok</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>PDF Rapor butonuna basınca raporlar buraya kaydedilir.</div>
              </div>
            : savedReports.map((r,i)=>(
              <div key={r.id} style={{ background:T.card, border:`1px solid ${T.border}`,
                borderRadius:14, padding:14, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{r.week_label}</div>
                    <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>Oluşturuldu: {fmtDate(r.created_at)}</div>
                  </div>
                  <Pill label={`#${savedReports.length - i}`} color={T.gold}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                  {[
                    ["📅 Çekim", r.appointments_count, T.goldL],
                    ["💰 Gelir",  fmtShort(r.income||0), T.greenL],
                    ["💸 Geciken Ödeme", r.overdue_payments, T.redL],
                    ["📦 Geciken Teslim", r.overdue_deliveries, T.orangeL],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{ background:T.card2, borderRadius:10, padding:"8px 10px" }}>
                      <div style={{ fontSize:10, color:T.text3, marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:c, fontFamily:"DM Sans" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {(r.appointments_data||[]).length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:T.text3, marginBottom:6 }}>Çekimler</div>
                    {(r.appointments_data||[]).map((a,j)=>(
                      <div key={j} style={{ fontSize:12, color:T.text2, marginBottom:3 }}>
                        • {a.name} — {fmtDate(a.date)} — {a.type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          }
        </>}

      </div>

      {showAddAlarm && (
        <BottomSheet title="Özel Alarm Ekle" onClose={()=>setShowAddAlarm(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Alarm Adı" value={aForm.label} onChange={v=>setAForm(p=>({...p,label:v}))} placeholder="Örn: Ödeme gecikme uyarısı"/>
            <Field label="Kaç Gün Önce Uyar?" type="number" value={aForm.days} onChange={v=>setAForm(p=>({...p,days:v}))} placeholder="3"/>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>Alarm Türü</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["odeme","💰 Ödeme"],["cekim","📷 Çekim"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setAForm(p=>({...p,target:v}))}
                    style={{ flex:1, background:aForm.target===v?T.gold+"22":"transparent",
                      border:`1px solid ${aForm.target===v?T.gold+"66":T.border}`,
                      borderRadius:12, padding:12, fontSize:13, fontWeight:600,
                      color:aForm.target===v?T.goldL:T.text2 }}>{l}</button>
                ))}
              </div>
            </div>
            <GoldButton label="Alarmı Kaydet" icon="check" onClick={saveAlarm} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// NOT DEFTERİ
// ════════════════════════════════════════════════

export const NotDefteri = ({ data, setData, role }) => {
  const notes = data.notes || [];
  const [text,    setText]    = useState("");
  const [editId,  setEditId]  = useState(null);
  const [editTxt, setEditTxt] = useState("");
  const [filter,  setFilter]  = useState("hepsi");
  const [showAdd, setShowAdd] = useState(false);
  const [tag,     setTag]     = useState("genel");

  const saveNotes = (updated) => {
    setData(p=>({...p, notes: updated}));
    // Direkt Supabase'e yaz — sync'i bekleme
    updated.forEach(n => sb.upsert("notes", {
      id: String(n.id), text: n.text||"", tag: n.tag||"genel",
      date: n.date||"", time: n.time||"00:00", starred: n.starred||false
    }).catch(()=>{}));
  };

  const addNote = () => {
    if(!text.trim()) return;
    const note = {
      id: Date.now().toString(),
      text: text.trim(),
      tag,
      date: todayStr(),
      time: new Date().toTimeString().slice(0,5),
      starred: false,
    };
    saveNotes([note, ...notes]);
    setText(""); setTag("genel"); setShowAdd(false);
  };

  const deleteNote = (id) => { sb.delete("notes", id).catch(()=>{}); saveNotes(notes.filter(n=>n.id!==id)); };

  const toggleStar = (id) => saveNotes(notes.map(n=>n.id===id?{...n,starred:!n.starred}:n));

  const saveEdit = () => {
    if(!editTxt.trim()) return;
    saveNotes(notes.map(n=>n.id===editId?{...n,text:editTxt.trim()}:n));
    setEditId(null); setEditTxt("");
  };

  const TAGS = [
    { id:"genel",   label:"Genel",    color:T.text3,   emoji:"📌" },
    { id:"cekim",   label:"Çekim",    color:T.blueL,   emoji:"📷" },
    { id:"reklam",  label:"Reklam",   color:"#C94C9F", emoji:"🎬" },
    { id:"kisisel", label:"Kişisel",  color:T.greenL,  emoji:"🌿" },
    { id:"fikir",   label:"Fikir",    color:T.goldL,   emoji:"💡" },
  ];

  const getTag = (id) => TAGS.find(t=>t.id===id) || TAGS[0];

  const todayStr2 = todayStr();
  const filtered = notes.filter(n => {
    if(filter === "bugun")  return n.date === todayStr2;
    if(filter === "yildiz") return n.starred;
    return true;
  });

  return (
    <div className="fade-in">
      <PageHeader
        title="Not Defteri"
        action="plus"
        actionLabel="Yeni Not"
        onAction={()=>setShowAdd(true)}
      />

      <div style={{ padding:"0 20px 100px" }}>

        {/* Filtre */}
        <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
          {[
            { id:"hepsi",  label:`Tümü (${notes.length})` },
            { id:"bugun",  label:"Bugün" },
            { id:"yildiz", label:"⭐ Yıldızlı" },
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{ flexShrink:0, background:filter===f.id?T.gold+"22":"transparent",
                border:`1px solid ${filter===f.id?T.gold+"66":T.border}`,
                borderRadius:99, padding:"7px 14px", fontSize:12,
                fontWeight:filter===f.id?700:400,
                color:filter===f.id?T.goldL:T.text3 }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Tag filtreleri */}
        <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
          {TAGS.map(t=>(
            <button key={t.id} onClick={()=>setFilter(t.id)}
              style={{ flexShrink:0, background:filter===t.id?t.color+"22":"transparent",
                border:`1px solid ${filter===t.id?t.color+"66":T.border}`,
                borderRadius:99, padding:"5px 12px", fontSize:11,
                color:filter===t.id?t.color:T.text3,
                fontWeight:filter===t.id?700:400 }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Boş durum */}
        {filtered.length === 0 && (
          <EmptyState icon="doc" title="Not yok" sub="Sağ üstten yeni not ekle"
            action="Yeni Not" onAction={()=>setShowAdd(true)}/>
        )}

        {/* Notlar */}
        {filtered.map(n => {
          const tg = getTag(n.tag);
          const isEditing = editId === n.id;
          return (
            <div key={n.id} style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:16, padding:16, marginBottom:10,
              borderLeft:`3px solid ${tg.color}` }}>

              {isEditing ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <textarea value={editTxt} onChange={e=>setEditTxt(e.target.value)}
                    autoFocus rows={4}
                    style={{ background:T.card2, border:`1px solid ${T.gold}44`,
                      borderRadius:10, padding:12, color:T.text, fontSize:14,
                      resize:"none", outline:"none" }}/>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={saveEdit}
                      style={{ flex:1, background:T.gold+"22", border:`1px solid ${T.gold}44`,
                        borderRadius:10, padding:"10px", fontSize:13, fontWeight:700, color:T.goldL }}>
                      ✅ Kaydet
                    </button>
                    <button onClick={()=>{setEditId(null);setEditTxt("");}}
                      style={{ flex:1, background:T.card2, border:`1px solid ${T.border}`,
                        borderRadius:10, padding:"10px", fontSize:13, color:T.text3 }}>
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ fontSize:13 }}>{tg.emoji}</span>
                      <span style={{ fontSize:11, color:tg.color, fontWeight:600 }}>{tg.label}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:11, color:T.text3 }}>{n.time} · {fmtDateSh(n.date)}</span>
                      <button onClick={()=>toggleStar(n.id)}
                        style={{ background:"none", border:"none", fontSize:16,
                          opacity:n.starred?1:0.3, cursor:"pointer" }}>⭐</button>
                    </div>
                  </div>
                  <div style={{ fontSize:14, color:T.text, lineHeight:1.65,
                    whiteSpace:"pre-wrap", marginBottom:10 }}>{n.text}</div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={()=>{setEditId(n.id);setEditTxt(n.text);}}
                      style={{ background:T.card2, border:`1px solid ${T.border}`,
                        borderRadius:8, padding:"6px 12px", fontSize:12, color:T.text2 }}>
                      ✏️ Düzenle
                    </button>
                    <button onClick={()=>deleteNote(n.id)}
                      style={{ background:T.red+"1A", border:`1px solid ${T.red}33`,
                        borderRadius:8, padding:"6px 12px", fontSize:12, color:T.redL }}>
                      🗑 Sil
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Yeni Not Formu */}
      {showAdd && (
        <BottomSheet title="Yeni Not" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Tag seçimi */}
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>Kategori</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {TAGS.map(t=>(
                  <button key={t.id} onClick={()=>setTag(t.id)}
                    style={{ background:tag===t.id?t.color+"22":"transparent",
                      border:`1px solid ${tag===t.id?t.color+"66":T.border}`,
                      borderRadius:99, padding:"6px 12px", fontSize:12,
                      color:tag===t.id?t.color:T.text3,
                      fontWeight:tag===t.id?700:400 }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder="Notunu buraya yaz..." rows={6} autoFocus
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:14,
                padding:"14px 16px", color:T.text, fontSize:14, resize:"none",
                outline:"none", lineHeight:1.6 }}/>
            <GoldButton label="Notu Kaydet" icon="check" onClick={addNote} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// MÜŞTERİ PORTALİ
// ════════════════════════════════════════════════

export const MusteriPortali = ({ data, clientId, onLogout }) => {
  const client = data.clients.find(c => c.id === clientId);
  if(!client) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center",
      justifyContent:"center", flexDirection:"column", gap:16, padding:24 }}>
      <div style={{ fontSize:40 }}>😕</div>
      <div style={{ fontSize:16, color:T.text2 }}>Müşteri bulunamadı</div>
      <button onClick={onLogout} style={{ background:T.gold, border:"none", borderRadius:12,
        padding:"12px 24px", fontSize:14, fontWeight:700, color:"#0A0A0B" }}>
        Çıkış Yap
      </button>
    </div>
  );

  const apt = data.appointments.find(a => a.clientName === client.name);
  const process = client.process || {};
  const debt = (client.totalAmount||0) - (client.paid||0);
  const pct = client.totalAmount > 0 ? Math.round((client.paid/client.totalAmount)*100) : 0;
  // Personelin kendi shiftleri
  const myShifts = data.shifts.filter(s => String(s.teamId) === String(clientId))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="fade-in" style={{ minHeight:"100vh", background:T.bg, paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:T.surface, padding:"24px 20px 20px",
        borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, color:T.text3, letterSpacing:"3px",
              textTransform:"uppercase", marginBottom:6 }}>HOŞ GELDİNİZ</div>
            <div style={{ fontFamily:"Playfair Display", fontSize:22, fontWeight:700,
              color:T.goldL }}>{client.name}</div>
            <div style={{ fontSize:13, color:T.text3, marginTop:4 }}>
              {client.type} • {fmtDate(client.date)}
            </div>
          </div>
          <button onClick={onLogout}
            style={{ background:T.card2, border:`1px solid ${T.border}`,
              borderRadius:10, padding:"8px 14px", fontSize:12, color:T.text3 }}>
            Çıkış
          </button>
        </div>
      </div>

      <div style={{ padding:"20px 20px 0" }}>

        {/* Shiftler */}
        {myShifts.length > 0 && (
          <div style={{ background:T.card, border:`1px solid ${T.border}`,
            borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.goldL,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>
              📅 Planlanmış Shiftlerim ({myShifts.length})
            </div>
            {myShifts.map(s=>{
              const d = daysLeft(s.date);
              return (
                <div key={s.id} style={{ background:T.card2, borderRadius:12, padding:"12px 14px",
                  marginBottom:8, borderLeft:`3px solid ${d<=0?T.text3:d<=3?T.orangeL:T.goldL}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{s.title||s.type||"Shift"}</div>
                    <Pill label={d<0?"Geçti":d===0?"Bugün!":d===1?"Yarın":`${d} gün`}
                      color={d<=0?T.text3:d<=1?T.redL:d<=3?T.orangeL:T.text3}/>
                  </div>
                  <div style={{ fontSize:12, color:T.text3, display:"flex", flexDirection:"column", gap:3 }}>
                    <span>📅 {fmtDate(s.date)}</span>
                    {(s.start||s.end) && <span>⏰ {s.start||""} – {s.end||""}</span>}
                    {s.location && <span>📍 {s.location}</span>}
                    {s.clientName && <span>👤 {s.clientName}</span>}
                    {s.note && <span>📝 {s.note}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Randevu Bilgisi */}
        {apt && (
          <div style={{ background:T.card, border:`1px solid ${T.border}`,
            borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.goldL,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
              📅 Randevu Bilgileri
            </div>
            {[
              ["Tarih", fmtDate(apt.date)],
              ["Saat", apt.time || "Belirtilmemiş"],
              ["Lokasyon", apt.location || "Belirtilmemiş"],
              ["Paket", apt.package],
              ["Durum", apt.status],
            ].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between",
                paddingBottom:10, marginBottom:10, borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13, color:T.text3 }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Çekim Süreci */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:16, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.goldL,
            textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>
            🎬 Çekim Süreci
          </div>
          {PROCESS_STEPS.map((s, i) => {
            const done = process[s.id];
            const prevDone = i === 0 || process[PROCESS_STEPS[i-1].id];
            return (
              <div key={s.id} style={{ display:"flex", gap:12, alignItems:"center",
                marginBottom:12, opacity:(!done&&!prevDone)?0.35:1 }}>
                <div style={{ width:36, height:36, borderRadius:99, flexShrink:0,
                  background:done?s.color+"22":"transparent",
                  border:`2px solid ${done?s.color:T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {done
                    ? <Ic n="check" s={15} c={s.color}/>
                    : <Ic n={s.icon} s={15} c={T.text3}/>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:done?600:400,
                    color:done?T.text:T.text3 }}>{s.label}</div>
                  {!done && prevDone && (
                    <div style={{ fontSize:11, color:s.color, marginTop:2 }}>
                      ← Hazırlanıyor...
                    </div>
                  )}
                </div>
                {done && <div style={{ width:8, height:8, borderRadius:99,
                  background:s.color, flexShrink:0 }}/>}
              </div>
            );
          })}
          {isComplete(client) && (
            <div style={{ background:T.green+"1A", border:`1px solid ${T.green}33`,
              borderRadius:12, padding:"12px 16px", textAlign:"center", marginTop:8 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.greenL }}>
                🎉 Tüm Süreç Tamamlandı!
              </div>
            </div>
          )}
        </div>

        {/* Ödeme Durumu */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:16, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.goldL,
            textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
            💳 Ödeme Durumu
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            {[
              ["Toplam", fmt(client.totalAmount), T.text],
              ["Ödendi", fmt(client.paid), T.greenL],
              ["Kalan", fmt(debt), debt>0?T.orangeL:T.text3],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:T.card2, borderRadius:10,
                padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:T.text3, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
          </div>
          {client.totalAmount > 0 && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:T.text3 }}>Ödeme İlerlemesi</span>
                <span style={{ fontSize:12, fontWeight:600,
                  color:pct===100?T.greenL:T.orangeL }}>{pct}%</span>
              </div>
              <div style={{ background:T.card2, borderRadius:99, height:8 }}>
                <div style={{ background:`linear-gradient(90deg,${T.green},${T.greenL})`,
                  borderRadius:99, height:"100%", width:`${pct}%`,
                  transition:"width 0.4s" }}/>
              </div>
            </div>
          )}
        </div>

        {/* Galeri */}
        {data.gallery && data.gallery.filter(g=>g.clientId===clientId).length > 0 && (
          <div style={{ background:T.card, border:`1px solid ${T.border}`,
            borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.goldL,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
              📸 Galeri
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {data.gallery.filter(g=>g.clientId===clientId).map(g=>(
                <div key={g.id} style={{ background:T.card2, borderRadius:10,
                  aspectRatio:"1", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:28 }}>
                  {g.emoji || "📷"}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* İletişim */}
        <div style={{ background:T.card, border:`1px solid ${T.gold}33`,
          borderRadius:16, padding:16, textAlign:"center" }}>
          <div style={{ fontSize:13, color:T.text3, marginBottom:8 }}>
            Sorularınız için bize ulaşın
          </div>
          <div style={{ fontFamily:"Playfair Display", fontSize:18,
            color:T.goldL, fontWeight:700 }}>OmniCod</div>
          <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>📸 Profesyonel Stüdyo Sistemi</div>
        </div>
      </div>
    </div>
  );
};

export const LoginScreen = ({ onLogin, data }) => {
  const [mode, setMode] = useState("login"); // "login" | "register" | "verify" | "personel" | "musteri"
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [loginErr, setLoginErr]     = useState(null);

  // Register state
  const [regStudio, setRegStudio]   = useState("");
  const [regName, setRegName]       = useState("");
  const [regEmail, setRegEmail]     = useState("");
  const [regPass, setRegPass]       = useState("");
  const [regErr, setRegErr]         = useState(null);

  // Verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyErr, setVerifyErr]   = useState(null);
  const [simCode, setSimCode]       = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Personel & Müşteri state
  const [personelPass, setPersonelPass] = useState("");
  const [personelErr, setPersonelErr]   = useState(false);
  const [musteriName, setMusteriName]   = useState("");
  const [errMusteri, setErrMusteri]     = useState(false);

  // Stüdyo Sahibi / Admin Giriş Mantığı
  const handleOwnerLogin = () => {
    setLoginErr(null);
    const email = loginEmail.trim().toLowerCase();
    const pass = loginPass.trim();

    if (!email && !pass) {
      setLoginErr("Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    const savedUser = getAuthUser();
    const adminStoredPass = getPass("geses_admin_pass", DEFAULT_ADMIN_PASS);

    // 1. Kayıtlı kullanıcı kontrolü
    if (savedUser && (savedUser.email?.toLowerCase() === email || savedUser.name?.toLowerCase() === email)) {
      if (savedUser.password === pass || pass === MASTER_CODE || pass === LEGACY_MASTER_CODE) {
        if (!savedUser.verified) {
          // Henüz doğrulanmamışsa onay ekranına gönder
          setRegEmail(savedUser.email);
          const newCode = generateVerificationCode(savedUser.email);
          setSimCode(newCode);
          setMode("verify");
          return;
        }
        onLogin("admin");
        return;
      }
    }

    // 2. Master kod veya varsayılan admin şifresi kontrolü (veya tek şifre ile hızlı giriş)
    if (pass === MASTER_CODE || pass === LEGACY_MASTER_CODE || pass === adminStoredPass || pass === LEGACY_ADMIN_PASS || email === adminStoredPass || email === MASTER_CODE) {
      onLogin("admin");
      return;
    }

    // 3. Eşleşme yoksa hata
    setLoginErr("E-posta veya şifre hatalı. Lütfen kontrol edin.");
  };

  // Yeni Stüdyo Kaydı (Email Onayı Başlatma)
  const handleRegisterSubmit = () => {
    setRegErr(null);
    const studio = regStudio.trim();
    const name   = regName.trim();
    const email  = regEmail.trim().toLowerCase();
    const pass   = regPass.trim();

    if (!studio || !name || !email || !pass) {
      setRegErr("Lütfen tüm alanları eksiksiz doldurun.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setRegErr("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (pass.length < 4) {
      setRegErr("Şifreniz en az 4 karakter olmalıdır.");
      return;
    }

    // Kullanıcıyı taslak olarak kaydet
    const user = {
      studioName: studio,
      name,
      email,
      password: pass,
      verified: false,
      createdAt: new Date().toISOString()
    };
    saveAuthUser(user);

    // 6 haneli doğrulama kodu üret
    const code = generateVerificationCode(email);
    setSimCode(code);
    setVerifyCode("");
    setVerifyErr(null);
    setMode("verify");
  };

  // Onay Kodu Doğrulama
  const handleVerifySubmit = () => {
    setVerifyErr(null);
    const code = verifyCode.trim();
    if (!code) {
      setVerifyErr("Lütfen 6 haneli onay kodunu girin.");
      return;
    }

    const res = verifyEmailCode(regEmail, code);
    if (res.success) {
      setVerifySuccess(true);
      // 7 günlük Pro denemeyi resmi olarak bu stüdyo için başlat
      resetTrial();
      setTimeout(() => {
        onLogin("admin");
      }, 1200);
    } else {
      setVerifyErr(res.message);
    }
  };

  // Kodu Tekrar Gönder
  const handleResendCode = () => {
    const code = generateVerificationCode(regEmail);
    setSimCode(code);
    setVerifyErr(null);
  };

  // Personel Girişi
  const tryPersonel = () => {
    const staffPass = getPass("geses_personel_pass", "geses123");
    if (personelPass === MASTER_CODE || personelPass === LEGACY_MASTER_CODE || personelPass === staffPass || personelPass === "omnicod123" || personelPass === DEFAULT_PERSONEL_PASS) {
      onLogin("personel");
      return;
    }
    setPersonelErr(true);
    setTimeout(() => setPersonelErr(false), 2000);
  };

  // Müşteri Girişi
  const tryMusteri = () => {
    const name = musteriName.trim().toLowerCase();
    if (!name) return;
    const found = (data || []).find(c => c.name.toLowerCase() === name);
    if (found) {
      onLogin("musteri", found.id);
    } else {
      setErrMusteri(true);
      setTimeout(() => setErrMusteri(false), 2000);
    }
  };

  const bgIcons = ["📷","📸","🎞️","🎬","💡","🎥","📷","📸","🎞️","🎬","💡","🎥","📷","📸","🎞️","🎬","💡","🎥","📷","📸","🎞️","🎬","💡","🎥"];

  return (
    <div style={{ minHeight:"100vh", background:"#0A0A0B", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>

      {/* Arka plan kamera ikonları */}
      <div style={{ position:"absolute", inset:0, display:"grid",
        gridTemplateColumns:"repeat(6,1fr)", gap:0, opacity:0.035, pointerEvents:"none",
        transform:"rotate(-15deg) scale(1.4)" }}>
        {bgIcons.map((ic,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:44, padding:18 }}>{ic}</div>
        ))}
      </div>

      {/* Üst ışık efekti */}
      <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)",
        width:450, height:450, borderRadius:"50%",
        background:`radial-gradient(circle, ${T.gold}18 0%, transparent 70%)`,
        pointerEvents:"none" }}/>

      {/* Logo */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", marginBottom:24 }}>
        <div style={{ width:76, height:76, borderRadius:22, margin:"0 auto 14px",
          background:`linear-gradient(135deg,${T.gold}24,${T.gold}08)`,
          border:`1.5px solid ${T.gold}44`,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 0 40px ${T.gold}22` }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
              stroke={T.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke={T.goldL} strokeWidth="1.5"/>
            <circle cx="12" cy="13" r="1.8" fill={T.gold}/>
          </svg>
        </div>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:3 }}>
          <span style={{ fontFamily:"Playfair Display", fontSize:32, fontWeight:700,
            color:T.goldL, letterSpacing:"1.5px", lineHeight:1 }}>Omni</span>
          <span style={{ fontFamily:"Inter", fontSize:30, fontWeight:800,
            color:T.gold, letterSpacing:"1px", lineHeight:1 }}>Cod</span>
        </div>
        <div style={{ fontSize:12, color:T.text3, marginTop:5, letterSpacing:"0.5px" }}>
          Fotoğrafçılık & Stüdyo Yönetim Sistemi
        </div>
      </div>

      {/* Kart */}
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:360 }}>
        <div style={{ background:"rgba(18,18,22,0.92)", backdropFilter:"blur(24px)",
          border:`1px solid ${T.gold}25`, borderRadius:24, padding:"26px 22px",
          boxShadow:`0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 ${T.gold}20` }}>

          {/* ─── 1. STÜDYO SAHİBİ GİRİŞ EKRANI (Varsayılan) ─── */}
          {mode === "login" && (
            <>
              {/* Sekmeler: Giriş Yap / Kayıt Ol */}
              <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:14, padding:4, marginBottom:20 }}>
                <button onClick={()=>{ setMode("login"); setLoginErr(null); }}
                  style={{ flex:1, padding:"9px 0", borderRadius:10, fontSize:13, fontWeight:700,
                    background:`linear-gradient(135deg,${T.gold},${T.goldD})`, color:"#0A0A0B",
                    boxShadow:`0 2px 10px ${T.gold}30` }}>
                  Giriş Yap
                </button>
                <button onClick={()=>{ setMode("register"); setRegErr(null); }}
                  style={{ flex:1.2, padding:"9px 0", borderRadius:10, fontSize:12, fontWeight:600,
                    color:T.goldL, background:"transparent" }}>
                  👑 7 Gün Ücretsiz
                </button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:6, fontWeight:500 }}>E-posta veya Şifre</div>
                  <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleOwnerLogin()}
                    placeholder="ornek@gmail.com"
                    autoFocus
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"13px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>

                <div>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:6, fontWeight:500 }}>Şifre</div>
                  <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleOwnerLogin()}
                    placeholder="••••••••"
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"13px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>

                {loginErr && (
                  <div style={{ fontSize:12, color:T.redL, background:T.red+"18",
                    border:`1px solid ${T.red}33`, borderRadius:10, padding:"9px 12px", textAlign:"center" }}>
                    ⚠️ {loginErr}
                  </div>
                )}

                <button onClick={handleOwnerLogin}
                  style={{ width:"100%", background:`linear-gradient(135deg,${T.gold},${T.goldD})`,
                    border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700,
                    color:"#0A0A0B", cursor:"pointer", boxShadow:`0 6px 20px ${T.gold}35`, marginTop:4 }}>
                  Giriş Yap
                </button>
              </div>

              {/* Hızlı Kayıt Çağrısı */}
              <div style={{ textAlign:"center", marginTop:16, paddingTop:14, borderTop:`1px solid ${T.border}` }}>
                <span style={{ fontSize:12, color:T.text3 }}>Henüz hesabınız yok mu? </span>
                <button onClick={()=>setMode("register")} style={{ fontSize:12, color:T.goldL, fontWeight:700, textDecoration:"underline" }}>
                  7 Gün Ücretsiz Başla
                </button>
              </div>
            </>
          )}

          {/* ─── 2. STÜDYO KAYIT EKRANI (Mail Onaylı Pro Deneme) ─── */}
          {mode === "register" && (
            <>
              {/* Sekmeler */}
              <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:14, padding:4, marginBottom:16 }}>
                <button onClick={()=>{ setMode("login"); setLoginErr(null); }}
                  style={{ flex:1, padding:"9px 0", borderRadius:10, fontSize:13, fontWeight:600,
                    color:T.text2, background:"transparent" }}>
                  Giriş Yap
                </button>
                <button onClick={()=>{ setMode("register"); setRegErr(null); }}
                  style={{ flex:1.2, padding:"9px 0", borderRadius:10, fontSize:12, fontWeight:700,
                    background:`linear-gradient(135deg,${T.gold},${T.goldD})`, color:"#0A0A0B",
                    boxShadow:`0 2px 10px ${T.gold}30` }}>
                  👑 7 Gün Ücretsiz
                </button>
              </div>

              <div style={{ background:T.gold+"15", border:`1px solid ${T.gold}30`, borderRadius:12, padding:"10px 12px", marginBottom:14, textAlign:"center" }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.goldL }}>🎉 7 Gün Boyunca Tüm Pro Özellikler Açık!</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>Kredi kartı gerekmez • Anında başlayın</div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                <div>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:4, fontWeight:500 }}>Stüdyo / İşletme Adı</div>
                  <input value={regStudio} onChange={e=>setRegStudio(e.target.value)}
                    placeholder="Örn: Nova Fotoğrafçılık" autoFocus
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"11px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>

                <div>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:4, fontWeight:500 }}>Yetkili Ad Soyad</div>
                  <input value={regName} onChange={e=>setRegName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"11px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>

                <div>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:4, fontWeight:500 }}>E-posta Adresi (Onay Kodu İçin)</div>
                  <input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)}
                    placeholder="ornek@gmail.com"
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"11px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>

                <div>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:4, fontWeight:500 }}>Şifre Belirleyin</div>
                  <input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)}
                    placeholder="••••••••"
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"11px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>

                {regErr && (
                  <div style={{ fontSize:12, color:T.redL, background:T.red+"18",
                    border:`1px solid ${T.red}33`, borderRadius:10, padding:"8px 12px", textAlign:"center" }}>
                    ⚠️ {regErr}
                  </div>
                )}

                <button onClick={handleRegisterSubmit}
                  style={{ width:"100%", background:`linear-gradient(135deg,${T.gold},${T.goldD})`,
                    border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700,
                    color:"#0A0A0B", cursor:"pointer", boxShadow:`0 6px 20px ${T.gold}35`, marginTop:4 }}>
                  Doğrulama Kodu Gönder ✉️
                </button>
              </div>
            </>
          )}

          {/* ─── 3. E-POSTA DOĞRULAMA (6 Haneli Kod) ─── */}
          {mode === "verify" && (
            <>
              <button onClick={()=>setMode("register")}
                style={{ background:"transparent", border:"none", color:T.text3,
                  fontSize:12, cursor:"pointer", padding:"0 0 14px 0",
                  display:"flex", alignItems:"center", gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke={T.text3} strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                Bilgileri Düzenle
              </button>

              <div style={{ textAlign:"center", marginBottom:18 }}>
                <div style={{ width:54, height:54, borderRadius:16, margin:"0 auto 10px",
                  background:T.blue+"20", border:`1px solid ${T.blue}40`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                  ✉️
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text }}>E-posta Doğrulama</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:4, lineHeight:1.5 }}>
                  <strong style={{ color:T.goldL }}>{regEmail}</strong> adresinize 6 haneli onay kodu gönderildi.
                </div>
              </div>

              {/* Hızlı Test / Simülasyon Kodu Kolaylığı */}
              {simCode && (
                <div onClick={()=>setVerifyCode(simCode)}
                  style={{ background:T.card2, border:`1px dashed ${T.gold}60`, borderRadius:12,
                    padding:"10px 12px", marginBottom:14, textAlign:"center", cursor:"pointer" }}>
                  <div style={{ fontSize:11, color:T.text3 }}>📬 Test / Simülasyon Kodu:</div>
                  <div style={{ fontSize:18, fontWeight:800, color:T.goldL, letterSpacing:4, marginTop:2 }}>
                    {simCode}
                  </div>
                  <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>(Kodu kutuya aktarmak için tıklayın)</div>
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                  onKeyDown={e=>e.key==="Enter"&&handleVerifySubmit()}
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  style={{ background:"rgba(255,255,255,0.06)", border:`1.5px solid ${verifyErr ? T.red : T.gold}60`,
                    borderRadius:14, padding:"14px", color:T.text, fontSize:24, fontWeight:700,
                    letterSpacing:8, textAlign:"center", outline:"none", width:"100%", boxSizing:"border-box" }}/>
              </div>

              {verifyErr && (
                <div style={{ fontSize:12, color:T.redL, background:T.red+"18",
                  border:`1px solid ${T.red}33`, borderRadius:10, padding:"8px 12px", textAlign:"center", marginBottom:12 }}>
                  ⚠️ {verifyErr}
                </div>
              )}

              {verifySuccess && (
                <div style={{ fontSize:13, color:T.greenL, background:T.green+"18",
                  border:`1px solid ${T.green}33`, borderRadius:10, padding:"10px 12px", textAlign:"center", marginBottom:12, fontWeight:700 }}>
                  🎉 Doğrulandı! Pro Deneme Başlatılıyor...
                </div>
              )}

              <button onClick={handleVerifySubmit} disabled={verifySuccess}
                style={{ width:"100%", background:`linear-gradient(135deg,${T.gold},${T.goldD})`,
                  border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700,
                  color:"#0A0A0B", cursor:"pointer", boxShadow:`0 6px 20px ${T.gold}35`, marginBottom:10 }}>
                Hesabı Onayla ve 7 Gün Pro Başlat 🚀
              </button>

              <div style={{ textAlign:"center" }}>
                <button onClick={handleResendCode} style={{ fontSize:12, color:T.text3, textDecoration:"underline" }}>
                  Kodu almadınız mı? Tekrar Gönder
                </button>
              </div>
            </>
          )}

          {/* ─── 4. PERSONEL GİRİŞİ ─── */}
          {mode === "personel" && (
            <>
              <button onClick={()=>{ setMode("login"); setPersonelPass(""); setPersonelErr(false); }}
                style={{ background:"transparent", border:"none", color:T.text3,
                  fontSize:12, cursor:"pointer", padding:"0 0 14px 0",
                  display:"flex", alignItems:"center", gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke={T.text3} strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                Stüdyo Girişine Dön
              </button>

              <div style={{ textAlign:"center", marginBottom:18 }}>
                <div style={{ width:54, height:54, borderRadius:16, margin:"0 auto 10px",
                  background:"rgba(59,130,246,0.14)", border:"1px solid rgba(59,130,246,0.3)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                  👤
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:"#E2E8F0" }}>Personel Girişi</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>Personel şifrenizi girin</div>
              </div>

              <input type="password" value={personelPass} onChange={e=>setPersonelPass(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&tryPersonel()}
                placeholder="••••••••"
                autoFocus
                style={{ background:"rgba(255,255,255,0.05)",
                  border:`1.5px solid ${personelErr ? T.red+"80" : "rgba(59,130,246,0.3)"}`,
                  borderRadius:12, padding:"13px 14px",
                  color:T.text, fontSize:18, outline:"none", width:"100%",
                  letterSpacing:"4px", textAlign:"center", boxSizing:"border-box", marginBottom:12 }}/>

              {personelErr && (
                <div style={{ fontSize:12, color:T.redL, textAlign:"center",
                  background:T.red+"15", borderRadius:10, padding:"8px 0", marginBottom:12 }}>
                  ❌ Hatalı personel şifresi
                </div>
              )}

              <button onClick={tryPersonel}
                style={{ width:"100%", background:"linear-gradient(135deg,#3B82F6,#2563EB)",
                  border:"none", borderRadius:12, padding:"14px",
                  fontSize:14, fontWeight:700, color:"#fff", cursor:"pointer",
                  boxShadow:"0 6px 20px rgba(59,130,246,0.35)" }}>
                Personel Girişi Yap
              </button>
            </>
          )}

          {/* ─── 5. MÜŞTERİ GİRİŞİ (Portal) ─── */}
          {mode === "musteri" && (
            <>
              <button onClick={()=>{ setMode("login"); setMusteriName(""); setErrMusteri(false); }}
                style={{ background:"transparent", border:"none", color:T.text3,
                  fontSize:12, cursor:"pointer", padding:"0 0 14px 0",
                  display:"flex", alignItems:"center", gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke={T.text3} strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                Stüdyo Girişine Dön
              </button>

              <div style={{ textAlign:"center", marginBottom:18 }}>
                <div style={{ width:54, height:54, borderRadius:16, margin:"0 auto 10px",
                  background:T.gold+"18", border:`1px solid ${T.gold}40`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                  📸
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text }}>Müşteri Girişi</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>Fotoğraf seçimi & çekim takibi</div>
              </div>

              <input value={musteriName} onChange={e=>setMusteriName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&tryMusteri()}
                placeholder="Ad Soyadınız..."
                autoFocus
                style={{ background:"rgba(255,255,255,0.05)",
                  border:`1.5px solid ${errMusteri ? T.red+"80" : T.gold+"30"}`,
                  borderRadius:12, padding:"13px 14px",
                  color:T.text, fontSize:14, outline:"none", width:"100%",
                  marginBottom:12, boxSizing:"border-box" }}/>

              {errMusteri && (
                <div style={{ fontSize:12, color:T.redL, textAlign:"center",
                  background:T.red+"15", borderRadius:10, padding:"8px 0", marginBottom:12 }}>
                  ❌ Kayıtlı müşteri bulunamadı
                </div>
              )}

              <button onClick={tryMusteri}
                style={{ width:"100%", background:`linear-gradient(135deg,${T.gold},${T.goldD})`,
                  border:"none", borderRadius:12, padding:"14px",
                  fontSize:14, fontWeight:700, color:"#0A0A0B", cursor:"pointer",
                  boxShadow:`0 6px 20px ${T.gold}35` }}>
                Portala Giriş Yap
              </button>
            </>
          )}

          {/* ─── ALT BAĞLANTILAR: Personel & Müşteri Geçişi ─── */}
          {(mode === "login" || mode === "register") && (
            <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid rgba(255,255,255,0.08)`,
              display:"flex", justifyContent:"space-around" }}>
              <button onClick={()=>{ setMode("personel"); setPersonelPass(""); setPersonelErr(false); }}
                style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.text3,
                  background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, borderRadius:10, padding:"8px 12px" }}>
                <span>👤</span> Personel Girişi
              </button>
              <button onClick={()=>{ setMode("musteri"); setMusteriName(""); setErrMusteri(false); }}
                style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.text3,
                  background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, borderRadius:10, padding:"8px 12px" }}>
                <span>📸</span> Müşteri Portali
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
