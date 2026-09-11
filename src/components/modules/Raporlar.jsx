import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Raporlar = ({ data }) => {
  const [tab, setTab] = useState("genel");
  const [dollarYear, setDollarYear]     = useState(String(new Date().getFullYear()));
  const [dollarAmount, setDollarAmount] = useState("");
  const [currentRate, setCurrentRate]   = useState("38.50");
  const [rateLoading, setRateLoading]   = useState(false);
  const [rateError,   setRateError]     = useState(false);
  const [editRate, setEditRate]         = useState(false);
  const now = new Date();

  // Uygulama açılınca otomatik kur çek
  useEffect(() => {
    setRateLoading(true);
    // ExchangeRate-API - CORS destekli, ücretsiz
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(d => {
        const rate = d?.rates?.TRY;
        if(rate) { setCurrentRate(rate.toFixed(2)); setRateError(false); }
        else {
          // Fallback: frankfurter.app
          return fetch("https://api.frankfurter.app/latest?from=USD&to=TRY")
            .then(r=>r.json())
            .then(d2=>{ const r2=d2?.rates?.TRY; if(r2){setCurrentRate(r2.toFixed(2));setRateError(false);}else setRateError(true); });
        }
      })
      .catch(() => setRateError(true))
      .finally(() => setRateLoading(false));
  }, []);
  const yInc = data.incomes.filter(i=>yearOf(i.date)===now.getFullYear()).reduce((a,i)=>a+i.amount,0);
  const yExp = data.expenses.filter(e=>yearOf(e.date)===now.getFullYear()).reduce((a,e)=>a+e.amount,0);
  const mInc = data.incomes.filter(i=>monthOf(i.date)===now.getMonth()&&yearOf(i.date)===now.getFullYear()).reduce((a,i)=>a+i.amount,0);
  const pending = data.clients.filter(c=>c.paid<c.totalAmount).reduce((a,c)=>a+(c.totalAmount-c.paid),0);
  const total = data.clients.length;

  const monthly = Array.from({length:12},(_,m)=>({
    m:MN[m].slice(0,3),
    inc:data.incomes.filter(i=>monthOf(i.date)===m&&yearOf(i.date)===now.getFullYear()).reduce((a,i)=>a+i.amount,0),
    exp:data.expenses.filter(e=>monthOf(e.date)===m&&yearOf(e.date)===now.getFullYear()).reduce((a,e)=>a+e.amount,0),
    apts:data.appointments.filter(a=>monthOf(a.date)===m&&yearOf(a.date)===now.getFullYear()).length,
  }));
  const maxVal  = Math.max(...monthly.map(m=>Math.max(m.inc,m.exp)),1);
  const maxApts = Math.max(...monthly.map(m=>m.apts),1);

  const pkgStats = data.packages.map(p=>({
    name:p.name, color:p.color,
    count:data.clients.filter(c=>c.package===p.name).length,
  })).sort((a,b)=>b.count-a.count);

  const seasons = [
    { label:"İlkbahar", months:[2,3,4], color:"#4CAF50", emoji:"🌸" },
    { label:"Yaz",      months:[5,6,7], color:"#FF9800", emoji:"☀️" },
    { label:"Sonbahar", months:[8,9,10],color:"#FF5722", emoji:"🍂" },
    { label:"Kış",      months:[11,0,1],color:"#2196F3", emoji:"❄️" },
  ];
  const seasonData = seasons.map(s=>({
    ...s,
    count:  data.appointments.filter(a=>s.months.includes(monthOf(a.date))).length,
    income: data.incomes.filter(i=>s.months.includes(monthOf(i.date))).reduce((a,i)=>a+i.amount,0),
  }));
  const maxSeasonCount = Math.max(...seasonData.map(s=>s.count),1);

  const refSources = ["Instagram","Google","Tavsiye","Düğün Fuarı","Diğer"];
  const refStats = refSources.map(s=>({
    label:s, count:data.clients.filter(c=>c.referralSource===s).length,
  })).filter(s=>s.count>0).sort((a,b)=>b.count-a.count);
  const topReferrers = data.clients
    .filter(c=>c.referralSource==="Tavsiye"&&c.referralName)
    .reduce((acc,c)=>{ acc[c.referralName]=(acc[c.referralName]||0)+1; return acc; },{});
  const topReferrerList = Object.entries(topReferrers).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const TABS = [{id:"genel",label:"Genel"},{id:"sezon",label:"Sezon"},{id:"referans",label:"Referans"},{id:"ekip",label:"Ekip"},{id:"dolar",label:"$ Dolar"}];

  // Ekip performans hesapları
  const ekipStats = data.team.map(m => {
    const memberShifts = data.shifts.filter(s => s.teamId === m.id);
    const completedShifts = memberShifts.filter(s => s.status === "tamamlandı");
    const totalFee = memberShifts.reduce((a,s) => a + (s.fee||0), 0);
    const paid = m.totalPaid || 0;
    const earned = m.totalEarned || 0;
    const debt = earned - paid;
    return { ...m, shiftCount: memberShifts.length, completedCount: completedShifts.length, totalFee, paid, earned, debt };
  }).sort((a,b) => b.shiftCount - a.shiftCount);

    return (
    <div className="fade-in">
      <PageHeader title="Raporlar" sub={`${now.getFullYear()} Yıl Özeti`}/>
      <div style={{ display:"flex", gap:8, padding:"0 20px 16px", overflowX:"auto" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flexShrink:0, background:tab===t.id?T.gold:T.card, border:`1px solid ${tab===t.id?T.gold:T.border}`,
              color:tab===t.id?T.bg:T.text2, borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:600 }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding:"0 20px" }}>

        {tab==="genel" && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              {l:"Yıllık Gelir",v:fmt(yInc),c:T.greenL,i:"trending"},
              {l:"Yıllık Gider",v:fmt(yExp),c:T.redL,i:"down"},
              {l:"Net Kâr",v:fmt(yInc-yExp),c:yInc>=yExp?T.gold:T.redL,i:"chart"},
              {l:"Bu Ay Gelir",v:fmt(mInc),c:T.blueL,i:"money"},
              {l:"Bekleyen",v:fmt(pending),c:T.orangeL,i:"warn"},
              {l:"Toplam Müşteri",v:String(total),c:T.text2,i:"users"},
            ].map(s=>(
              <Card key={s.l} style={{ padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ fontSize:10, color:T.text3, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px" }}>{s.l}</div>
                  <Ic n={s.i} s={14} c={s.c}/>
                </div>
                <div style={{ ...NUM_FONT, fontSize:20, fontWeight:700, color:s.c }}>{s.v}</div>
              </Card>
            ))}
          </div>
          {(yInc>0||yExp>0) && (
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontWeight:600, color:T.text2, marginBottom:18, fontSize:14 }}>Aylık Gelir / Gider</div>
              <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:80 }}>
                {monthly.map(({m,inc,exp})=>(
                  <div key={m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:"100%", display:"flex", gap:1 }}>
                      <div style={{ flex:1, background:T.green, borderRadius:"3px 3px 0 0", height:`${Math.max(inc/maxVal*70,inc>0?4:0)}px`, transition:"height 0.4s" }}/>
                      <div style={{ flex:1, background:T.red,   borderRadius:"3px 3px 0 0", height:`${Math.max(exp/maxVal*70,exp>0?4:0)}px`, transition:"height 0.4s" }}/>
                    </div>
                    <span style={{ fontSize:8, color:T.text3 }}>{m}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:16, marginTop:12 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}><div style={{ width:10,height:10,borderRadius:3,background:T.green }}/><span style={{ fontSize:11,color:T.text3 }}>Gelir</span></div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}><div style={{ width:10,height:10,borderRadius:3,background:T.red }}/><span style={{ fontSize:11,color:T.text3 }}>Gider</span></div>
              </div>
            </Card>
          )}
          {pkgStats.some(p=>p.count>0) && (
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontWeight:600, color:T.text2, marginBottom:16, fontSize:14 }}>En Çok Tercih Edilen Paketler</div>
              {pkgStats.map(p=>(
                <div key={p.name} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:13, color:p.color, fontWeight:600 }}>{p.name}</span>
                    <span style={{ fontSize:13, color:T.text2 }}>{p.count} müşteri</span>
                  </div>
                  <div style={{ background:T.card2, borderRadius:99, height:7 }}>
                    <div style={{ background:p.color, borderRadius:99, height:"100%", width:`${total>0?p.count/total*100:0}%`, transition:"width 0.4s" }}/>
                  </div>
                </div>
              ))}
            </Card>
          )}
          {yInc===0&&yExp===0&&total===0 && <EmptyState icon="chart" title="Veri Yok" sub="Müşteri ve işlem ekledikçe raporlar burada görünür."/>}
        </>}

        {tab==="sezon" && <>
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, color:T.text2, marginBottom:4, fontSize:14 }}>Sezona Göre Yoğunluk</div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:18 }}>Tüm zamanlar</div>
            {seasonData.map(s=>(
              <div key={s.label} style={{ marginBottom:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"center" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:18 }}>{s.emoji}</span>
                    <span style={{ fontSize:14, fontWeight:600 }}>{s.label}</span>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <span style={{ fontSize:12, color:T.text3 }}>{s.count} çekim</span>
                    <span style={{ ...NUM_FONT, fontSize:13, fontWeight:600, color:s.color }}>{fmtShort(s.income)}</span>
                  </div>
                </div>
                <div style={{ background:T.card2, borderRadius:99, height:10 }}>
                  <div style={{ background:s.color, borderRadius:99, height:"100%",
                    width:`${s.count/maxSeasonCount*100}%`, transition:"width 0.6s" }}/>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, color:T.text2, marginBottom:16, fontSize:14 }}>Aylık Çekim Sayısı</div>
            <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:70 }}>
              {monthly.map(({m,apts})=>(
                <div key={m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <div style={{ background:T.gold, borderRadius:"3px 3px 0 0", width:"100%",
                    height:`${Math.max(apts/maxApts*60,apts>0?4:0)}px`, transition:"height 0.4s" }}/>
                  <span style={{ fontSize:8, color:T.text3 }}>{m}</span>
                </div>
              ))}
            </div>
            {monthly.every(m=>m.apts===0) && (
              <div style={{ textAlign:"center", color:T.text3, fontSize:13, padding:"20px 0" }}>Henüz randevu yok</div>
            )}
          </Card>
          <Card>
            <div style={{ fontWeight:600, color:T.text2, marginBottom:4, fontSize:14 }}>En Yoğun Ay</div>
            {(() => {
              const busiest = [...monthly].sort((a,b)=>b.apts-a.apts)[0];
              if(busiest.apts===0) return <div style={{ fontSize:13, color:T.text3, marginTop:8 }}>Veri yok</div>;
              return (
                <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ background:T.gold+"1A", borderRadius:14, padding:"12px 16px",
                    fontFamily:"Playfair Display", fontSize:28, fontWeight:700, color:T.gold }}>
                    {MN[monthly.indexOf(busiest)].slice(0,3)}
                  </div>
                  <div>
                    <div style={{ ...NUM_FONT, fontSize:22, fontWeight:700, color:T.gold }}>{busiest.apts} çekim</div>
                    <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>{fmt(busiest.inc)} gelir</div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </>}

        {tab==="referans" && <>
          {refStats.length===0&&topReferrerList.length===0
            ? <EmptyState icon="users" title="Referans Verisi Yok" sub="Müşteri eklerken 'Bizi Nereden Duydunuz?' alanını doldurun."/>
            : <>
              {refStats.length>0 && (
                <Card style={{ marginBottom:16 }}>
                  <div style={{ fontWeight:600, color:T.text2, marginBottom:16, fontSize:14 }}>Müşteri Kaynakları</div>
                  {refStats.map(s=>{
                    const icons={Instagram:"📸",Google:"🔍",Tavsiye:"🤝","Düğün Fuarı":"💒",Diğer:"📌"};
                    return (
                      <div key={s.label} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:13, fontWeight:600 }}>{icons[s.label]||"📌"} {s.label}</span>
                          <span style={{ fontSize:13, color:T.gold, fontWeight:600 }}>{s.count} müşteri</span>
                        </div>
                        <div style={{ background:T.card2, borderRadius:99, height:8 }}>
                          <div style={{ background:T.gold, borderRadius:99, height:"100%",
                            width:`${total>0?s.count/total*100:0}%`, transition:"width 0.6s" }}/>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}
              {topReferrerList.length>0 && (
                <Card>
                  <div style={{ fontWeight:600, color:T.text2, marginBottom:16, fontSize:14 }}>🏆 En İyi Referanslar</div>
                  {topReferrerList.map(([name,count],i)=>(
                    <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      borderBottom:i<topReferrerList.length-1?`1px solid ${T.border}`:"none",
                      paddingBottom:12, marginBottom:12 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <div style={{ background:T.gold+"22", borderRadius:99, width:32, height:32,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontFamily:"Playfair Display", fontWeight:700, color:T.gold, fontSize:14 }}>
                          {i+1}
                        </div>
                        <span style={{ fontSize:14, fontWeight:600 }}>{name}</span>
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ ...NUM_FONT, fontSize:16, fontWeight:700, color:T.gold }}>{count}</span>
                        <span style={{ fontSize:11, color:T.text3 }}>müşteri</span>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </>
          }
        </>}

          {tab==="ekip" && <>
            {ekipStats.length === 0
              ? <EmptyState icon="team" title="Ekip Yok" sub="Ekip & Shiftler modülünden personel ekle."/>
              : <>
                  {/* Özet kartlar */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                    {[
                      ["👥 Toplam Personel", ekipStats.length, T.blueL],
                      ["📸 Toplam Shift", ekipStats.reduce((a,m)=>a+m.shiftCount,0), T.gold],
                      ["✅ Tamamlanan", ekipStats.reduce((a,m)=>a+m.completedCount,0), T.greenL],
                      ["💰 Toplam Hak Ediş", fmt(ekipStats.reduce((a,m)=>a+m.earned,0)), T.orangeL],
                    ].map(([l,v,c])=>(
                      <Card key={l} style={{ textAlign:"center", padding:"14px 10px" }}>
                        <div style={{ fontSize:11, color:T.text3, marginBottom:6 }}>{l}</div>
                        <div style={{ fontSize:18, fontWeight:700, color:c, fontFamily:"DM Sans" }}>{v}</div>
                      </Card>
                    ))}
                  </div>

                  {/* Personel kartları */}
                  {ekipStats.map(m => (
                    <Card key={m.id} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                        <div style={{ width:40, height:40, borderRadius:99, background:(m.color||T.gold)+"22",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:18, fontWeight:700, color:m.color||T.gold, flexShrink:0 }}>
                          {m.name.charAt(0)}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:15 }}>{m.name}</div>
                          <div style={{ fontSize:12, color:T.text3 }}>{m.role}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:12, color:T.text3 }}>Shift</div>
                          <div style={{ fontSize:20, fontWeight:700, color:m.color||T.gold, fontFamily:"DM Sans" }}>{m.shiftCount}</div>
                        </div>
                      </div>

                      {/* Shift bar */}
                      {m.shiftCount > 0 && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.text3, marginBottom:4 }}>
                            <span>Tamamlanma Oranı</span>
                            <span>{m.shiftCount > 0 ? Math.round(m.completedCount/m.shiftCount*100) : 0}%</span>
                          </div>
                          <div style={{ height:6, background:T.card2, borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${m.shiftCount>0?m.completedCount/m.shiftCount*100:0}%`,
                              background:`linear-gradient(90deg,${m.color||T.gold},${m.color||T.goldL})`, borderRadius:99,
                              transition:"width 0.5s" }}/>
                          </div>
                        </div>
                      )}

                      {/* Finansal */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                        {[["Hak Ediş", fmt(m.earned), T.gold],["Ödenen", fmt(m.paid), T.greenL],["Kalan", fmt(m.debt), m.debt>0?T.orangeL:T.text3]].map(([l,v,c])=>(
                          <div key={l} style={{ background:T.card2, borderRadius:10, padding:"8px", textAlign:"center" }}>
                            <div style={{ fontSize:10, color:T.text3, marginBottom:3 }}>{l}</div>
                            <div style={{ fontSize:12, fontWeight:700, color:c }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </>
            }
          </>}

        {tab==="dolar" && (() => {
          const rate = parseFloat(currentRate)||38.50;
          const tlAmount = parseFloat(dollarAmount.replace(/\./g,"").replace(",","."))||0;
          const historicRate = USD_TRY_RATES[parseInt(dollarYear)]||1;
          const usdAtYear = tlAmount > 0 ? tlAmount / historicRate : 0;
          const usdToday  = tlAmount > 0 ? tlAmount / rate : 0;

          // Portföy analizi: müşterilerin TL gelirini dolar bazında göster
          const portfolio = data.clients
            .filter(c=>c.totalAmount>0 && c.date)
            .map(c=>{
              const yr = yearOf(c.date);
              const r = USD_TRY_RATES[yr] || rate;
              return { ...c, usd: Math.round(c.totalAmount / r) };
            })
            .sort((a,b)=>b.usd-a.usd);
          const portfolioTotalUSD = portfolio.reduce((s,c)=>s+c.usd,0);

          return (<>
            {/* Güncel Kur */}
            <Card style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text }}>💱 Güncel USD/TRY Kuru</div>
                  <div style={{ fontSize:11, color:rateError?T.redL:T.greenL, marginTop:3 }}>
                    {rateLoading ? "🔄 Kur çekiliyor..." : rateError ? "⚠️ Otomatik çekilemedi — manuel giriş" : "✅ Otomatik güncellendi"}
                  </div>
                </div>
                <button onClick={()=>setEditRate(e=>!e)}
                  style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:10,
                    padding:"5px 12px", fontSize:12, fontWeight:700, color:T.goldL }}>
                  {editRate ? "Kapat" : "Manuel Düzenle"}
                </button>
              </div>
              {editRate ? (
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <input type="number" value={currentRate} onChange={e=>setCurrentRate(e.target.value)}
                    step="0.01" placeholder="38.50"
                    style={{ flex:1, background:T.card2, border:`1px solid ${T.gold}44`, borderRadius:12,
                      padding:"11px 14px", color:T.text, fontSize:16, fontWeight:700, outline:"none" }}/>
                  <button onClick={()=>setEditRate(false)}
                    style={{ background:`linear-gradient(135deg,${T.goldL},${T.goldD})`,
                      borderRadius:12, padding:"11px 18px", fontSize:13, fontWeight:700, color:T.bg }}>
                    Kaydet
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                  {rateLoading
                    ? <div style={{ fontSize:28, color:T.text3 }}>⏳ Yükleniyor...</div>
                    : <><span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:36, fontWeight:700, color:T.goldL }}>₺{parseFloat(currentRate).toFixed(2)}</span>
                       <span style={{ fontSize:14, color:T.text3 }}>= 1 USD</span></>
                  }
                </div>
              )}
              <div style={{ fontSize:11, color:T.text3, marginTop:8 }}>
                Kaynak: open.er-api.com · Her açılışta otomatik güncellenir
              </div>
            </Card>

            {/* Hesap Makinesi */}
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>🧮 TL → USD Çevirici</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:6 }}>Yıl</div>
                  <select value={dollarYear} onChange={e=>setDollarYear(e.target.value)}
                    style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                      padding:"12px 14px", color:T.text, fontSize:14, width:"100%" }}>
                    {Object.keys(USD_TRY_RATES).map(y=>(
                      <option key={y} value={y}>{y} (₺{USD_TRY_RATES[y]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:6 }}>TL Tutarı</div>
                  <input type="number" value={dollarAmount} onChange={e=>setDollarAmount(e.target.value)}
                    placeholder="100000"
                    style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                      padding:"12px 14px", color:T.text, fontSize:14, outline:"none", width:"100%" }}/>
                </div>
              </div>
              {tlAmount > 0 ? (
                <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div style={{ background:T.card2, borderRadius:12, padding:14, textAlign:"center" }}>
                    <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>{dollarYear} Yılında</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:T.blueL }}>
                      ${Math.round(usdAtYear).toLocaleString("tr-TR")}
                    </div>
                    <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>kur: ₺{historicRate}</div>
                  </div>
                  <div style={{ background:T.gold+"1A", border:`1px solid ${T.gold}33`, borderRadius:12, padding:14, textAlign:"center" }}>
                    <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>Bugünkü Değeri</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:T.goldL }}>
                      ${Math.round(usdToday).toLocaleString("tr-TR")}
                    </div>
                    <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>kur: ₺{rate}</div>
                  </div>
                </div>
              ) : (
                <div style={{ background:T.card2, borderRadius:12, padding:14, textAlign:"center",
                  fontSize:13, color:T.text3 }}>Yukarıya TL tutarı girin</div>
              )}
            </Card>

            {/* Portföy Analizi */}
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>📊 Portföy — Dolar Bazlı</div>
              <div style={{ fontSize:12, color:T.text3, marginBottom:14 }}>Müşterilerin TL geliri, çekim yılının kuruyla hesaplandı</div>
              {portfolio.length === 0 ? (
                <div style={{ textAlign:"center", color:T.text3, fontSize:13, padding:20 }}>Henüz müşteri kaydı yok</div>
              ) : (
                <>
                  <div style={{ background:T.gold+"1A", border:`1px solid ${T.gold}33`, borderRadius:12,
                    padding:14, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, color:T.text2, fontWeight:600 }}>Toplam Portföy</span>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:T.goldL }}>
                      ${portfolioTotalUSD.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  {portfolio.slice(0,10).map((c,i)=>{
                    const yr = yearOf(c.date);
                    const barW = portfolioTotalUSD > 0 ? Math.max(c.usd/portfolio[0].usd*100,2) : 0;
                    return (
                      <div key={c.id} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:T.text3, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>#{i+1}</span>
                            <span style={{ fontSize:13, fontWeight:600 }}>{c.name}</span>
                          </div>
                          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:T.text3 }}>{yr} · ₺{USD_TRY_RATES[yr]}</span>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:T.blueL }}>
                              ${c.usd.toLocaleString("tr-TR")}
                            </span>
                          </div>
                        </div>
                        <div style={{ background:T.card2, borderRadius:99, height:5 }}>
                          <div style={{ background:T.blueL, borderRadius:99, height:"100%", width:`${barW}%`, transition:"width 0.4s" }}/>
                        </div>
                      </div>
                    );
                  })}
                  {portfolio.length > 10 && (
                    <div style={{ textAlign:"center", fontSize:12, color:T.text3, marginTop:4 }}>
                      +{portfolio.length-10} daha müşteri var
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Tarihsel Kurlar */}
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>📅 USD/TRY Tarihsel Kurlar</div>
              {Object.entries(USD_TRY_RATES).map(([y,r])=>{
                const maxR = 38.50;
                return (
                  <div key={y} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:12, color:T.text3, fontFamily:"'DM Sans',sans-serif", minWidth:34 }}>{y}</span>
                    <div style={{ flex:1, background:T.card2, borderRadius:99, height:6 }}>
                      <div style={{ background:T.gold, borderRadius:99, height:"100%", width:`${r/maxR*100}%`, transition:"width 0.4s" }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:T.goldL, fontFamily:"'DM Sans',sans-serif", minWidth:44, textAlign:"right" }}>₺{r}</span>
                  </div>
                );
              })}
            </Card>
          </>);
        })()}

      </div>
    </div>
  );
};

// ════════════════════════════════════════════════
// SUPABASE BAĞLANTISI
// ════════════════════════════════════════════════
