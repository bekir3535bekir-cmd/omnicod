import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE, isComplete } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { PlanBadge, UsageBadge } from "../common/ProGate";
import { canAddAppointment, getTrialInfo } from "../../services/plan";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Dashboard = ({ data, setActive, role, plan }) => {
  const isAdmin = role === "admin";
  const now     = new Date();
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
      {/* Hero Header */}
      <div style={{ padding:"16px 20px 18px", borderBottom:`1px solid ${T.border}`, marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:T.text }}>Stüdyo Yönetimi</div>
          <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>
            {now.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <div onClick={()=>setActive("planyonetimi")} style={{ cursor:"pointer" }}>
            <PlanBadge plan={plan}/>
          </div>
          <Pill label={isAdmin ? "Yönetici" : "Personel"} color={isAdmin ? T.goldL : T.blueL}/>
        </div>
      </div>

      <div style={{ padding:"0 20px" }}>
        {/* Pro Deneme Banner */}
        {plan === "trial" && (
          <Card onClick={()=>setActive("planyonetimi")} style={{ marginBottom:16, padding:14, cursor:"pointer",
            background:`linear-gradient(135deg, ${T.blue}15, ${T.card})`, borderColor:T.blue+"55" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>⏳</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.blueL }}>
                    7 Günlük Pro Deneme Aktif
                  </div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                    Tüm özellikler açık • Kalan: {getTrialInfo().daysLeft} gün
                  </div>
                </div>
              </div>
              <span style={{ fontSize:11, color:T.goldL, fontWeight:600 }}>İncele →</span>
            </div>
          </Card>
        )}

        {/* Basic Plan Limit Banner */}
        {plan === "basic" && (
          <Card onClick={()=>setActive("planyonetimi")} style={{ marginBottom:16, padding:14, cursor:"pointer",
            background:`linear-gradient(135deg, ${T.gold}10, ${T.card})`, borderColor:T.gold+"44" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:15 }}>⚡</span>
                <span style={{ fontSize:13, fontWeight:700, color:T.goldL }}>Basic Plan — 20 Düğün Limiti</span>
              </div>
              <span style={{ fontSize:11, color:T.goldL, fontWeight:600 }}>Pro'ya Geç (₺749/ay) →</span>
            </div>
            <UsageBadge check={canAddAppointment(data)} label="Kullanılan Düğün / Çekim" />
          </Card>
        )}
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
