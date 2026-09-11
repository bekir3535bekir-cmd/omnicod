import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Muhasebe = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const now     = new Date();
  const [tab,      setTab]      = useState("ozet");
  const [period,   setPeriod]   = useState("aylik");
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [showInc,  setShowInc]  = useState(false);
  const [showExp,  setShowExp]  = useState(false);
  const [editInc,  setEditInc]  = useState(null);
  const [editExp,  setEditExp]  = useState(null);
  const [showFatura, setShowFatura] = useState(false);
  const [faturaClient, setFaturaClient] = useState(null);
  const [faturaFormat, setFaturaFormat] = useState("basit"); // basit | detayli
  const [faturaNo, setFaturaNo]   = useState(() => {
    const n = parseInt(localStorage.getItem("geses_fatura_no")||"1");
    return String(n).padStart(4,"0");
  });
  const FI = { clientName:"", amount:"", type:"Kapora", method:"Nakit", date:todayStr(), note:"", category:"Düğün" };
  const FE = { amount:"", category:"Ekipman", description:"", date:todayStr(), method:"Nakit" };
  const [iForm, setIForm] = useState(FI);
  const [eForm, setEForm] = useState(FE);
  const fi = k => v => setIForm(p=>({...p,[k]:v}));
  const fe = k => v => setEForm(p=>({...p,[k]:v}));

  // Müşteri ödemelerinden eksik incomes'ları birleştir
  const existingIds = new Set(data.incomes.map(i=>i.id));
  const clientPaymentIncomes = data.clients.flatMap(c=>
    (c.payments||[]).filter(p=>p.type==="Ödeme Alındı" && !existingIds.has(p.id))
      .map(p=>({ id:p.id, clientName:c.name, amount:p.amount, type:"Ödeme", method:"Nakit",
        date:p.date||todayStr(), note:p.note||"", category:c.type||"Düğün" }))
  );
  const allIncomes  = [...data.incomes, ...clientPaymentIncomes];
  const pkgs = data.packages || [];

  const filterByPeriod = arr => {
    if(period==="gunluk") return arr.filter(x=>x.date===todayStr());
    if(period==="aylik")  return arr.filter(x=>monthOf(x.date)===selMonth&&yearOf(x.date)===selYear);
    if(period==="yillik") return arr.filter(x=>yearOf(x.date)===selYear);
    return arr;
  };

  const fInc = filterByPeriod(allIncomes);
  const fExp = filterByPeriod(data.expenses);
  const totalInc  = fInc.reduce((s,i)=>s+Number(i.amount||0),0);
  const totalExp  = fExp.reduce((s,e)=>s+Number(e.amount||0),0);
  const netProfit = totalInc - totalExp;

  // Vergi hesaplama (yıllık baz)
  const yearInc = allIncomes.filter(i=>yearOf(i.date)===selYear).reduce((s,i)=>s+Number(i.amount||0),0);
  const KDV_RATE     = 0.20;
  const STOPAJ_RATE  = 0.17;
  const kdvTutar     = totalInc * KDV_RATE;
  const stopajTutar  = totalInc * STOPAJ_RATE;
  // Gelir vergisi dilimleri 2024
  const gvDilim = (yil) => {
    if(yil <= 110000) return yil * 0.15;
    if(yil <= 230000) return 16500 + (yil-110000)*0.20;
    if(yil <= 580000) return 40500 + (yil-230000)*0.27;
    if(yil <= 3000000)return 135000 + (yil-580000)*0.35;
    return 982000 + (yil-3000000)*0.40;
  };
  const gvTutar = gvDilim(yearInc);

  // Grafik verisi — son 12 ay
  const chartData = Array.from({length:12},(_,i)=>{
    const d = new Date(selYear, i, 1);
    const m = d.getMonth(), y = d.getFullYear();
    const inc = allIncomes.filter(x=>monthOf(x.date)===m&&yearOf(x.date)===y).reduce((s,x)=>s+Number(x.amount||0),0);
    const exp = data.expenses.filter(x=>monthOf(x.date)===m&&yearOf(x.date)===y).reduce((s,x)=>s+Number(x.amount||0),0);
    return { label:MN[i].slice(0,3), inc, exp, net:inc-exp };
  });
  const maxVal = Math.max(...chartData.map(d=>d.inc), 1);

  const saveInc = () => {
    if(!iForm.amount||!iForm.date) return;
    const newInc = {...iForm, id:uid(), amount:Number(iForm.amount)};
    setData(p=>({...p, incomes:[...p.incomes, newInc]}));
    sb.upsert("incomes", toDB.incomes(newInc)).catch(()=>{});
    setShowInc(false); setIForm(FI);
  };
  const saveExp = () => {
    if(!eForm.amount||!eForm.date) return;
    const newExp = {...eForm, id:uid(), amount:Number(eForm.amount)};
    setData(p=>({...p, expenses:[...p.expenses, newExp]}));
    sb.upsert("expenses", toDB.expenses(newExp)).catch(()=>{});
    setShowExp(false); setEForm(FE);
  };

  const saveEditInc = () => {
    if(!editInc) return;
    const updated = {...editInc, amount:Number(editInc.amount)};
    setData(p=>({...p, incomes:p.incomes.map(i=>i.id===editInc.id?updated:i)}));
    sb.upsert("incomes", toDB.incomes(updated)).catch(()=>{});
    setEditInc(null);
  };
  const saveEditExp = () => {
    if(!editExp) return;
    const updated = {...editExp, amount:Number(editExp.amount)};
    setData(p=>({...p, expenses:p.expenses.map(e=>e.id===editExp.id?updated:e)}));
    sb.upsert("expenses", toDB.expenses(updated)).catch(()=>{});
    setEditExp(null);
  };
  const delInc = (i) => { sb.delete("incomes", i.id).catch(()=>{}); setData(p=>({...p, incomes:p.incomes.filter(x=>x.id!==i.id), clients:p.clients.map(c=>{ const has=(c.payments||[]).some(pp=>pp.id===i.id); return has?{...c,paid:Math.max(0,c.paid-i.amount),payments:(c.payments||[]).filter(p=>p.id!==i.id)}:c; })})); };
  const delExp = (e) => { sb.delete("expenses", e.id).catch(()=>{}); setData(p=>({...p, expenses:p.expenses.filter(x=>x.id!==e.id)})); };

  // Fatura oluştur
  const nextFaturaNo = () => {
    const n = parseInt(localStorage.getItem("geses_fatura_no")||"1") + 1;
    localStorage.setItem("geses_fatura_no", String(n));
    return String(n).padStart(4,"0");
  };

  const generateFatura = (client, format) => {
    const apt    = data.appointments.find(a=>a.clientName===client.name)||{};
    const fNo    = `OMNICOD-${selYear}-${nextFaturaNo()}`;
    const today  = new Date().toLocaleDateString("tr-TR");
    const kdv    = format==="detayli" ? client.totalAmount * KDV_RATE : 0;
    const stopaj = format==="detayli" ? client.totalAmount * STOPAJ_RATE : 0;
    const net    = format==="detayli" ? client.totalAmount / (1 + KDV_RATE) : client.totalAmount;

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>
<title>Fatura ${fNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;color:#1a1a1a;padding:32px;max-width:750px;margin:0 auto;font-size:13px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #1a3a5c;}
  .logo{width:180px;height:auto;}
  .firm{text-align:right;}
  .firm h2{font-size:15px;color:#1a3a5c;margin-bottom:4px;}
  .firm p{font-size:11px;color:#555;line-height:1.7;}
  .fatura-no{background:#1a3a5c;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:20px;display:inline-block;}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;}
  .party{background:#f8f9fa;border-radius:8px;padding:14px 16px;}
  .party h4{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:8px;}
  .party p{font-size:13px;font-weight:600;color:#1a1a1a;line-height:1.7;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  th{background:#1a3a5c;color:#fff;padding:10px 14px;text-align:left;font-size:12px;}
  td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px;}
  tr:nth-child(even) td{background:#f9f9f9;}
  .totals{margin-left:auto;width:280px;}
  .totals tr td:first-child{color:#555;}
  .totals tr td:last-child{text-align:right;font-weight:600;}
  .totals .grand td{font-size:15px;font-weight:800;color:#1a3a5c;border-top:2px solid #1a3a5c;padding-top:10px;}
  .iban{background:#f0f4ff;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:#1a3a5c;}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:16px;}
  .badge{display:inline-block;background:#e8f5e9;color:#2e7d32;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;}
  @media print{body{padding:20px;}}
</style></head><body>
<div class="header">
  <img src="${SIRKET.logo}" class="logo" alt="OmniCod"/>
  <div class="firm">
    <h2>${SIRKET.unvan}</h2>
    <p>${SIRKET.adres}<br/>${SIRKET.tel} · ${SIRKET.email}<br/>Vergi Dairesi: ${SIRKET.vdaire}<br/>Vergi No: ${SIRKET.vno}</p>
  </div>
</div>

<div>
  <span class="fatura-no">📄 FATURA No: ${fNo}</span>
  <span style="margin-left:12px;font-size:12px;color:#888;">Tarih: ${today}</span>
</div>

<div class="parties" style="margin-top:16px;">
  <div class="party">
    <h4>Satıcı</h4>
    <p>${SIRKET.ad}<br/><span style="font-size:11px;color:#666;font-weight:400;">${SIRKET.unvan}</span></p>
  </div>
  <div class="party">
    <h4>Müşteri / Alıcı</h4>
    <p>${client.name}<br/><span style="font-size:11px;color:#666;font-weight:400;">${client.phone||""}</span></p>
  </div>
</div>

<table>
  <thead><tr><th>Hizmet Açıklaması</th><th>Tarih</th><th style="text-align:right">Tutar</th></tr></thead>
  <tbody>
    <tr>
      <td>${apt.type||"Düğün"} Fotoğraf & Video Çekimi Hizmeti<br/><span style="font-size:11px;color:#888;">${apt.package||client.package||""}</span></td>
      <td>${fmtDate(apt.date||client.date)}</td>
      <td style="text-align:right;font-weight:700;">${format==="detayli"?fmt(net):fmt(client.totalAmount)}</td>
    </tr>
    ${(apt.extraDates||[]).filter(Boolean).map((d,i)=>`
    <tr>
      <td>Ek Çekim Günü ${i+2}</td>
      <td>${fmtDate(d)}</td>
      <td style="text-align:right">—</td>
    </tr>`).join("")}
  </tbody>
</table>

<table class="totals">
  ${format==="detayli" ? `
  <tr><td>Ara Toplam (KDV Hariç)</td><td>${fmt(net)}</td></tr>
  <tr><td>KDV (%20)</td><td style="color:#e53e3e;">+ ${fmt(kdv)}</td></tr>
  <tr><td>Stopaj (%17)</td><td style="color:#e53e3e;">- ${fmt(stopaj)}</td></tr>
  ` : ""}
  <tr class="grand"><td>TOPLAM TUTAR</td><td>${fmt(client.totalAmount)}</td></tr>
  <tr><td style="font-size:11px;color:#888;">Ödenen</td><td style="font-size:11px;color:#2e7d32;">- ${fmt(client.paid)}</td></tr>
  <tr><td style="font-size:12px;font-weight:700;">Kalan Bakiye</td><td style="font-size:12px;font-weight:700;color:#c53030;">${fmt(Math.max(0,client.totalAmount-client.paid))}</td></tr>
</table>

<div class="iban">
  🏦 <strong>Ödeme Bilgisi:</strong> ${SIRKET.iban}<br/>
  <span style="font-size:11px;">Hesap Sahibi: ${SIRKET.ad}</span>
</div>

${format==="detayli" ? `
<div style="margin-top:16px;background:#fff8e1;border-radius:8px;padding:12px 16px;font-size:12px;">
  <strong>Vergi Özeti:</strong> KDV: ${fmt(kdv)} · Stopaj: ${fmt(stopaj)}
  <br/><span style="font-size:11px;color:#888;">*Stopaj, müşteri tarafından vergi dairesine yatırılır.</span>
</div>` : ""}

<div class="footer">
  Bu belge bilgilendirme amaçlıdır. ${SIRKET.unvan} · ${today}
</div>
</body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 600);
  };

  const TABS = [
    {id:"ozet",     label:"📊 Özet"},
    {id:"grafik",   label:"📈 Grafik"},
    {id:"islemler", label:"💰 İşlemler"},
    {id:"vergi",    label:"🧾 Vergi & Fatura"},
  ];

  return (
    <div className="fade-in">
      <div style={{ padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h1 style={{ fontFamily:"Playfair Display", fontSize:24, fontWeight:600, color:T.goldL }}>Muhasebe</h1>
        <div style={{ display:"flex", gap:8 }}>
          {isAdmin && <button onClick={()=>setShowInc(true)} style={{ background:T.green+"22", border:`1px solid ${T.green}44`, borderRadius:10, padding:"7px 12px", fontSize:12, fontWeight:700, color:T.greenL }}>+ Gelir</button>}
          {isAdmin && <button onClick={()=>setShowExp(true)} style={{ background:T.red+"22", border:`1px solid ${T.red}44`, borderRadius:10, padding:"7px 12px", fontSize:12, fontWeight:700, color:T.redL }}>+ Gider</button>}
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", padding:"0 20px 16px" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ background:tab===t.id?T.gold:"transparent", color:tab===t.id?T.bg:T.text2,
              border:`1px solid ${tab===t.id?T.gold:T.border}`, borderRadius:12, padding:"9px 14px",
              fontSize:12, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dönem Filtresi — Özet ve İşlemlerde */}
      {(tab==="ozet"||tab==="islemler") && (
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ display:"flex", background:T.card, borderRadius:14, padding:4, gap:2, marginBottom:10 }}>
            {["gunluk","aylik","yillik","tumu"].map(p=>(
              <button key={p} onClick={()=>setPeriod(p)}
                style={{ flex:1, background:period===p?T.gold:"transparent", color:period===p?T.bg:T.text2,
                  borderRadius:11, padding:"10px", fontSize:12, fontWeight:600 }}>
                {p==="gunluk"?"Bugün":p==="aylik"?"Ay":p==="yillik"?"Yıl":"Tümü"}
              </button>
            ))}
          </div>
          {(period==="aylik"||period==="yillik") && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>{ if(period==="aylik"){ if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1); } else setSelYear(y=>y-1); }}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="back" s={15} c={T.text2}/>
              </button>
              <div style={{ flex:1, textAlign:"center", fontSize:14, fontWeight:700, color:T.goldL }}>
                {period==="aylik"?`${MN[selMonth]} ${selYear}`:String(selYear)}
              </div>
              <button onClick={()=>{ if(period==="aylik"){ if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1); } else setSelYear(y=>y+1); }}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="back" s={15} c={T.text2} style={{transform:"rotate(180deg)"}}/>
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ padding:"0 20px 120px" }}>

        {/* ── ÖZET ── */}
        {tab==="ozet" && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              {label:"Toplam Gelir",  val:fmt(totalInc),  color:T.greenL, icon:"📈"},
              {label:"Toplam Gider",  val:fmt(totalExp),  color:T.redL,   icon:"📉"},
              {label:"Net Kâr",       val:fmt(netProfit), color:netProfit>=0?T.greenL:T.redL, icon:"💰"},
              {label:"Bekleyen",      val:fmt(data.clients.filter(c=>c.paid<c.totalAmount).reduce((s,c)=>s+(c.totalAmount-c.paid),0)), color:T.orangeL, icon:"⏳"},
            ].map(s=>(
              <div key={s.label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14 }}>
                <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
                <div style={{ ...NUM_FONT, fontSize:18, fontWeight:700, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* En çok kazandıran paketler */}
          {pkgs.map(pkg=>{
            const pkgInc = allIncomes.filter(i=>{ const c=data.clients.find(x=>x.name===i.clientName); return c?.package===pkg.name; }).reduce((s,i)=>s+Number(i.amount||0),0);
            if(pkgInc===0) return null;
            const pct = totalInc > 0 ? pkgInc/totalInc*100 : 0;
            return (
              <div key={pkg.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{pkg.name}</span>
                  <span style={{ ...NUM_FONT, fontSize:13, fontWeight:700, color:pkg.color }}>{fmt(pkgInc)}</span>
                </div>
                <div style={{ background:T.card2, borderRadius:99, height:6 }}>
                  <div style={{ background:pkg.color, borderRadius:99, height:"100%", width:`${pct}%`, transition:"width 0.4s" }}/>
                </div>
              </div>
            );
          })}
        </>}

        {/* ── GRAFİK ── */}
        {tab==="grafik" && <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{selYear} Yılı Gelir/Gider</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setSelYear(y=>y-1)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:8, padding:"5px 10px", fontSize:12, color:T.text2 }}>◀</button>
              <button onClick={()=>setSelYear(y=>y+1)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:8, padding:"5px 10px", fontSize:12, color:T.text2 }}>▶</button>
            </div>
          </div>
          {/* Bar Chart */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:160 }}>
              {chartData.map((d,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                  <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:140, gap:2 }}>
                    {d.exp > 0 && <div style={{ width:"100%", background:T.red+"88", borderRadius:"4px 4px 0 0", height:`${(d.exp/maxVal)*100}%`, minHeight:2 }}/>}
                    {d.inc > 0 && <div style={{ width:"100%", background:i===now.getMonth()&&selYear===now.getFullYear()?T.goldL:T.green+"CC", borderRadius:"4px 4px 0 0", height:`${(d.inc/maxVal)*100}%`, minHeight:2 }}/>}
                  </div>
                  <div style={{ fontSize:9, color:T.text3, textAlign:"center" }}>{d.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:10, justifyContent:"center" }}>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ width:10, height:10, borderRadius:2, background:T.greenL }}/>
                <span style={{ fontSize:11, color:T.text3 }}>Gelir</span>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ width:10, height:10, borderRadius:2, background:T.redL }}/>
                <span style={{ fontSize:11, color:T.text3 }}>Gider</span>
              </div>
            </div>
          </div>
          {/* Aylık özet tablo */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:8 }}>
              {["Ay","Gelir","Gider","Net"].map(h=><div key={h} style={{ fontSize:11, color:T.text3, fontWeight:600 }}>{h}</div>)}
            </div>
            {chartData.map((d,i)=>(
              <div key={i} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.border}`, display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:8, background:i===now.getMonth()&&selYear===now.getFullYear()?T.gold+"0A":"transparent" }}>
                <div style={{ fontSize:13, fontWeight:i===now.getMonth()&&selYear===now.getFullYear()?700:400 }}>{MN[i]}{i===now.getMonth()&&selYear===now.getFullYear()?" ⭐":""}</div>
                <div style={{ ...NUM_FONT, fontSize:12, color:T.greenL }}>{d.inc>0?fmtShort(d.inc):"—"}</div>
                <div style={{ ...NUM_FONT, fontSize:12, color:T.redL }}>{d.exp>0?fmtShort(d.exp):"—"}</div>
                <div style={{ ...NUM_FONT, fontSize:12, color:d.net>=0?T.greenL:T.redL, fontWeight:600 }}>{d.net!==0?fmtShort(d.net):"—"}</div>
              </div>
            ))}
            <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:8, background:T.card2 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>TOPLAM</div>
              <div style={{ ...NUM_FONT, fontSize:13, fontWeight:700, color:T.greenL }}>{fmtShort(chartData.reduce((s,d)=>s+d.inc,0))}</div>
              <div style={{ ...NUM_FONT, fontSize:13, fontWeight:700, color:T.redL }}>{fmtShort(chartData.reduce((s,d)=>s+d.exp,0))}</div>
              <div style={{ ...NUM_FONT, fontSize:13, fontWeight:700, color:T.goldL }}>{fmtShort(chartData.reduce((s,d)=>s+d.net,0))}</div>
            </div>
          </div>
        </>}

        {/* ── İŞLEMLER ── */}
        {tab==="islemler" && <>
          {fInc.length===0 && fExp.length===0
            ? <EmptyState icon="money" title="İşlem Yok" sub="Bu dönemde gelir veya gider kaydı bulunmuyor."/>
            : <>
              {fInc.map(i=>(
                <div key={i.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14, marginBottom:8, display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ background:T.green+"1A", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:16 }}>📥</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{i.clientName||i.type}</div>
                    <div style={{ fontSize:11, color:T.text3 }}>{fmtDate(i.date)} · {i.method}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ ...NUM_FONT, fontSize:15, fontWeight:700, color:T.greenL }}>+{fmt(i.amount)}</div>
                    {isAdmin && <button onClick={()=>delInc(i)} style={{ fontSize:10, color:T.redL, background:"none", marginTop:2 }}>sil</button>}
                  </div>
                </div>
              ))}
              {fExp.map(e=>(
                <div key={e.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14, marginBottom:8, display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ background:T.red+"1A", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:16 }}>📤</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{e.description||e.category}</div>
                    <div style={{ fontSize:11, color:T.text3 }}>{fmtDate(e.date)} · {e.category}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ ...NUM_FONT, fontSize:15, fontWeight:700, color:T.redL }}>-{fmt(e.amount)}</div>
                    {isAdmin && <button onClick={()=>delExp(e)} style={{ fontSize:10, color:T.redL, background:"none", marginTop:2 }}>sil</button>}
                  </div>
                </div>
              ))}
            </>
          }
        </>}

        {/* ── VERGİ & FATURA ── */}
        {tab==="vergi" && <>
          {/* Yıl seçici */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <button onClick={()=>setSelYear(y=>y-1)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n="back" s={15} c={T.text2}/>
            </button>
            <div style={{ flex:1, textAlign:"center", fontSize:15, fontWeight:700, color:T.goldL }}>{selYear} Vergi Özeti</div>
            <button onClick={()=>setSelYear(y=>y+1)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n="back" s={15} c={T.text2} style={{transform:"rotate(180deg)"}}/>
            </button>
          </div>

          {/* Yıllık gelir */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:12, color:T.text3, marginBottom:4 }}>📊 {selYear} Yılı Toplam Gelir</div>
            <div style={{ ...NUM_FONT, fontSize:28, fontWeight:700, color:T.goldL }}>{fmt(yearInc)}</div>
          </div>

          {/* Vergi kartları */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              {label:"KDV (%20)", val:fmt(yearInc*KDV_RATE), color:T.blueL, icon:"🧾", sub:"Dönemsel beyan"},
              {label:"Stopaj (%17)", val:fmt(yearInc*STOPAJ_RATE), color:T.orangeL, icon:"🏛", sub:"Müşteri öder"},
              {label:"Gelir Vergisi", val:fmt(gvTutar), color:T.redL, icon:"📋", sub:"Tahmini yıllık"},
              {label:"Net Kalan", val:fmt(Math.max(0,yearInc-gvTutar)), color:T.greenL, icon:"💚", sub:"Vergi sonrası"},
            ].map(s=>(
              <div key={s.label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14 }}>
                <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
                <div style={{ ...NUM_FONT, fontSize:17, fontWeight:700, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.text, marginTop:2 }}>{s.label}</div>
                <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Gelir vergisi dilimi */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>📐 Gelir Vergisi Dilimleri (2024)</div>
            {[
              {label:"0 – 110.000 ₺",     rate:"15%", active:yearInc<=110000},
              {label:"110.000 – 230.000 ₺",rate:"20%", active:yearInc>110000&&yearInc<=230000},
              {label:"230.000 – 580.000 ₺",rate:"27%", active:yearInc>230000&&yearInc<=580000},
              {label:"580.000 – 3.000.000 ₺",rate:"35%",active:yearInc>580000&&yearInc<=3000000},
              {label:"3.000.000 ₺ üzeri",  rate:"40%", active:yearInc>3000000},
            ].map(d=>(
              <div key={d.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", borderRadius:8, marginBottom:4,
                background:d.active?T.gold+"22":"transparent", border:`1px solid ${d.active?T.gold+"44":"transparent"}` }}>
                <span style={{ fontSize:12, color:d.active?T.goldL:T.text3 }}>{d.label}</span>
                <span style={{ fontSize:13, fontWeight:d.active?800:400, color:d.active?T.goldL:T.text3 }}>{d.rate}{d.active?" ← SEN":""}
                </span>
              </div>
            ))}
          </div>

          {/* Fatura */}
          <div style={{ background:T.card, border:`1.5px solid ${T.gold}44`, borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.goldL, marginBottom:12 }}>📄 Fatura Oluştur</div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:10 }}>Format seç:</div>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[["basit","📋 Basit"],["detayli","🔍 Detaylı (KDV)"]].map(([v,l])=>(
                <button key={v} onClick={()=>setFaturaFormat(v)}
                  style={{ flex:1, background:faturaFormat===v?T.gold+"22":"transparent",
                    border:`1.5px solid ${faturaFormat===v?T.gold:T.border}`,
                    borderRadius:12, padding:"10px 8px", fontSize:12, fontWeight:faturaFormat===v?700:400,
                    color:faturaFormat===v?T.goldL:T.text2 }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>Müşteri seç:</div>
            <div style={{ maxHeight:200, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {data.clients.filter(c=>c.status!=="arşiv"&&c.totalAmount>0).map(c=>(
                <button key={c.id} onClick={()=>generateFatura(c, faturaFormat)}
                  style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 14px",
                    display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:T.text3 }}>{fmtDate(c.date)} · {c.package}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ ...NUM_FONT, fontSize:13, fontWeight:700, color:T.goldL }}>{fmt(c.totalAmount)}</div>
                    <div style={{ fontSize:10, color:T.greenL }}>Fatura Kes →</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Uyarı notu */}
          <div style={{ background:T.orange+"1A", border:`1px solid ${T.orange}33`, borderRadius:12, padding:"12px 14px", fontSize:11, color:T.orangeL, lineHeight:1.7 }}>
            ⚠️ Bu vergi hesaplamaları tahminidir. Kesin vergi için muhasebecine danışmanı öneririz.
          </div>
        </>}

      </div>

      {/* Gelir Ekle */}
      {showInc && (
        <BottomSheet title="Gelir Ekle" onClose={()=>setShowInc(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Müşteri / Kaynak" value={iForm.clientName} onChange={fi("clientName")} placeholder="Müşteri adı"/>
            <Field label="Tutar (₺)" type="number" value={iForm.amount} onChange={fi("amount")} placeholder="0" required/>
            <DatePicker label="Tarih" value={iForm.date} onChange={fi("date")} required/>
            <Field label="Tür" value={iForm.type} onChange={fi("type")} options={["Kapora","Ödeme","Bonus","Diğer"]}/>
            <Field label="Yöntem" value={iForm.method} onChange={fi("method")} options={["Nakit","Havale","Kredi Kartı","Diğer"]}/>
            <Field label="Not" value={iForm.note} onChange={fi("note")} placeholder="Opsiyonel"/>
            <GoldButton label="Geliri Kaydet" icon="check" onClick={saveInc} full/>
          </div>
        </BottomSheet>
      )}

      {/* Gider Ekle */}
      {showExp && (
        <BottomSheet title="Gider Ekle" onClose={()=>setShowExp(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Tutar (₺)" type="number" value={eForm.amount} onChange={fe("amount")} placeholder="0" required/>
            <DatePicker label="Tarih" value={eForm.date} onChange={fe("date")} required/>
            <Field label="Kategori" value={eForm.category} onChange={fe("category")} options={["Ekipman","Ulaşım","Yazılım","Kira","Personel","Vergi","Diğer"]}/>
            <Field label="Açıklama" value={eForm.description} onChange={fe("description")} placeholder="Ne için?"/>
            <Field label="Yöntem" value={eForm.method} onChange={fe("method")} options={["Nakit","Havale","Kredi Kartı","Diğer"]}/>
            <GoldButton label="Gideri Kaydet" icon="check" onClick={saveExp} full/>
          </div>
        </BottomSheet>
      )}

    </div>
  );
};

// ════════════════════════════════════════════════
// MORE MENU → sub-screens
// ════════════════════════════════════════════════
