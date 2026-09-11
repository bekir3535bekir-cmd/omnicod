import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Takvim = ({ data, setActive, setDetailClientId }) => {
  const now = new Date();
  const [curYear,  setCurYear]  = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [selDay,   setSelDay]   = useState(null);
  const [showDetail, setShowDetail] = useState(null); // seçilen randevu detay
  const DAYS = ["Pt","Sa","Ça","Pe","Cu","Ct","Pz"];

  const getDaysInMonth = (m,y) => new Date(y, m+1, 0).getDate();
  const getFirstDay    = (m,y) => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; };

  // Ana tarih + ek tarihler hepsi takvimde işaretlensin
  const aptDates = {};
  const addToMap = (dateStr, apt, isExtra, extraIdx) => {
    if(!dateStr) return;
    const d = new Date(dateStr+"T12:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if(!aptDates[key]) aptDates[key] = [];
    aptDates[key].push(isExtra ? {...apt, isExtraDate:true, extraDateLabel:`Gün ${extraIdx+2}`} : apt);
  };
  data.appointments.forEach(a=>{
    addToMap(a.date, a, false);
    const linkedClient = data.clients.find(c => c.id===a.clientId || c.name===a.clientName);
    const trueExtraDates = linkedClient?.extraDates || a.extraDates || [];
    trueExtraDates.filter(Boolean).forEach((ed, i) => addToMap(ed, a, true, i));
  });

  const daysInMonth = getDaysInMonth(curMonth, curYear);
  const firstDay    = getFirstDay(curMonth, curYear);
  const cells       = Array(firstDay).fill(null).concat(Array.from({length:daysInMonth},(_,i)=>i+1));
  while(cells.length%7!==0) cells.push(null);

  const selKey  = selDay!=null ? `${curYear}-${curMonth}-${selDay}` : null;
  const selApts = selKey ? (aptDates[selKey]||[]) : [];
  const isToday = (d) => d===now.getDate()&&curMonth===now.getMonth()&&curYear===now.getFullYear();
  const pkgColor = pkg => data.packages.find(p=>p.name===pkg)?.color||T.gold;

  const prevMonth = () => {
    if(curMonth===0){ if(curYear>2026){setCurYear(y=>y-1); setCurMonth(11);} }
    else setCurMonth(m=>m-1);
    setSelDay(null);
  };
  const nextMonth = () => {
    if(curMonth===11){ if(curYear<2036){setCurYear(y=>y+1); setCurMonth(0);} }
    else setCurMonth(m=>m+1);
    setSelDay(null);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Takvim"/>
      <div style={{ padding:"0 20px" }}>

        {/* Ay + Yıl navigasyonu */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={prevMonth}
            style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:40, height:40,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n="back" s={18} c={T.text}/>
          </button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"Playfair Display", fontSize:24, fontWeight:600, color:T.goldL }}>{MN[curMonth]}</div>
            <div style={{ fontSize:13, color:T.text3, fontWeight:500 }}>{curYear}</div>
          </div>
          <button onClick={nextMonth}
            style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:40, height:40,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n="back" s={18} c={T.text} style={{ transform:"rotate(180deg)" }}/>
          </button>
        </div>

        {/* Ay hızlı geçiş */}
        <div style={{ display:"flex", gap:5, overflowX:"auto", marginBottom:16, paddingBottom:4 }}>
          {MN.map((m,i)=>{
            const hasApts = Object.keys(aptDates).some(k=>k.startsWith(`${curYear}-${i}-`));
            return (
              <button key={i} onClick={()=>{setCurMonth(i);setSelDay(null);}}
                style={{ background:curMonth===i?T.gold:T.card, border:`1px solid ${curMonth===i?T.gold:T.border}`,
                  color:curMonth===i?T.bg:T.text2, borderRadius:10, padding:"7px 10px", fontSize:11,
                  fontWeight:600, whiteSpace:"nowrap", flexShrink:0, position:"relative" }}>
                {m.slice(0,3)}
                {hasApts && curMonth!==i && <div style={{ position:"absolute", top:3, right:3,
                  width:5, height:5, borderRadius:99, background:T.gold }}/>}
              </button>
            );
          })}
        </div>

        {/* Takvim grid */}
        <Card style={{ padding:16, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:8 }}>
            {DAYS.map(d=>(
              <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:T.text3, padding:"4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((day,i)=>{
              if(!day) return <div key={i}/>;
              const key=`${curYear}-${curMonth}-${day}`;
              const apts=aptDates[key]||[];
              const isSelected=selDay===day;
              const today=isToday(day);
              return (
                <button key={i} onClick={()=>setSelDay(selDay===day?null:day)}
                  style={{ aspectRatio:"1", borderRadius:10, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", gap:2,
                    background:isSelected?T.gold:today?T.gold+"22":"transparent",
                    border:`1px solid ${isSelected?T.gold:today?T.gold+"44":"transparent"}` }}>
                  <span style={{ fontSize:13, fontWeight:isSelected||today?700:400,
                    color:isSelected?T.bg:today?T.goldL:T.text }}>{day}</span>
                  {apts.length>0 && (
                    <div style={{ display:"flex", gap:2 }}>
                      {apts.slice(0,3).map((a,j)=>(
                        <div key={j} style={{ width:5, height:5, borderRadius:99,
                          background:isSelected?T.bg:pkgColor(a.package) }}/>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Legend */}
        <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          {data.packages.map(p=>(
            <div key={p.id} style={{ display:"flex", gap:6, alignItems:"center" }}>
              <div style={{ width:8, height:8, borderRadius:99, background:p.color }}/>
              <span style={{ fontSize:11, color:T.text3 }}>{p.name}</span>
            </div>
          ))}
        </div>

        {/* YOĞUNLUK HARİTASI */}
        {(() => {
          const MN2=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
          const yr = new Date().getFullYear();
          const monthCounts = Array.from({length:12},(_,m)=>{
            const cnt = data.appointments.filter(a=>{
              if(!a.date||a.status==="iptal") return false;
              const d=new Date(a.date);
              return d.getFullYear()===yr && d.getMonth()===m;
            }).length;
            return { m, cnt };
          });
          const maxCnt = Math.max(1,...monthCounts.map(x=>x.cnt));
          return (
            <div style={{ marginTop:20, padding:"0 20px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
                🗓 {yr} Yoğunluk Haritası
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6 }}>
                {monthCounts.map(({m,cnt})=>{
                  const ratio = cnt/maxCnt;
                  const bg = cnt===0 ? T.card2
                    : ratio<0.4 ? T.gold+"44"
                    : ratio<0.7 ? T.gold+"88"
                    : T.gold;
                  const isNow = m===new Date().getMonth();
                  return (
                    <div key={m} onClick={()=>{ setCurMonth(m); setCurYear(yr); }}
                      style={{ background:bg, borderRadius:10, padding:"8px 4px",
                        textAlign:"center", cursor:"pointer",
                        border:`1.5px solid ${isNow?T.goldL:"transparent"}` }}>
                      <div style={{ fontSize:10, color:cnt>0?T.bg:T.text3, fontWeight:600 }}>
                        {MN2[m]}
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:cnt>0?T.bg:T.text3 }}>
                        {cnt}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:12, marginTop:8, alignItems:"center" }}>
                <div style={{ fontSize:10, color:T.text3 }}>Az</div>
                {[0.2,0.4,0.7,1].map(r=>(
                  <div key={r} style={{ width:16, height:16, borderRadius:4,
                    background:r<0.4?T.gold+"44":r<0.7?T.gold+"88":T.gold }}/>
                ))}
                <div style={{ fontSize:10, color:T.text3 }}>Yoğun</div>
              </div>
            </div>
          );
        })()}


        {/* Seçilen gün detayı */}
        {selDay && (
          <div className="fade-in">
            <div style={{ fontFamily:"Playfair Display", fontSize:18, color:T.goldL, marginBottom:12 }}>
              {selDay} {MN[curMonth]} {curYear}
            </div>
            {selApts.length===0 ? (
              <Card style={{ padding:20, textAlign:"center" }}>
                <div style={{ fontSize:14, color:T.text3 }}>Bu gün için randevu yok</div>
              </Card>
            ) : selApts.map((a,idx)=>(
              <Card key={a.id+"-"+idx} onClick={()=>setShowDetail(a)}
                style={{ marginBottom:10, borderLeft:`3px solid ${pkgColor(a.package)}`, cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontWeight:600, fontSize:15 }}>
                    {a.clientName}
                    {a.isExtraDate && <span style={{ fontSize:11, color:T.text3, fontWeight:400, marginLeft:6 }}>({a.extraDateLabel})</span>}
                  </div>
                  <Pill label={a.status} color={STATUS_COLORS[a.status]||T.text3}/>
                </div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <Ic n="clock" s={13} c={T.text3}/>
                    <span style={{ fontSize:12, color:T.text2 }}>{a.time||"—"}</span>
                  </div>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <Ic n="pin" s={13} c={T.text3}/>
                    <span style={{ fontSize:12, color:T.text2 }}>{a.location||"—"}</span>
                  </div>
                </div>
                <div style={{ marginTop:8 }}><Pill label={a.package} color={pkgColor(a.package)}/></div>
                {a.notes && <div style={{ marginTop:8, fontSize:12, color:T.text3 }}>📝 {a.notes}</div>}
              </Card>
            ))}
          </div>
        )}

        {/* Ay özeti */}
        {!selDay && (()=>{
          const monthApts = data.appointments.filter(a=>{
            if(!a.date) return false;
            const d=new Date(a.date+"T12:00:00");
            return d.getMonth()===curMonth && d.getFullYear()===curYear;
          }).sort((a,b)=>new Date(a.date)-new Date(b.date));
          if(monthApts.length===0) return (
            <Card style={{ padding:20, textAlign:"center" }}>
              <div style={{ fontSize:14, color:T.text3 }}>{MN[curMonth]} {curYear} için randevu yok</div>
            </Card>
          );
          return (
            <Card>
              <div style={{ fontWeight:600, color:T.text2, fontSize:14, marginBottom:14 }}>
                {MN[curMonth]} {curYear} — {monthApts.length} randevu
              </div>
              {monthApts.map(a=>(
                <div key={a.id} onClick={()=>setShowDetail(a)}
                  style={{ display:"flex", gap:12, alignItems:"center", cursor:"pointer",
                  borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
                  <div style={{ background:pkgColor(a.package)+"1A", borderRadius:10, padding:"8px 10px",
                    textAlign:"center", minWidth:44, flexShrink:0 }}>
                    <div style={{ fontFamily:"Playfair Display", fontSize:16, fontWeight:700,
                      color:pkgColor(a.package), lineHeight:1 }}>
                      {new Date(a.date+"T12:00:00").getDate()}
                    </div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{a.clientName}</div>
                    <div style={{ fontSize:12, color:T.text2 }}>{a.time||"—"} · {a.location||"—"}</div>
                  </div>
                  <Pill label={a.status} color={STATUS_COLORS[a.status]||T.text3}/>
                </div>
              ))}
            </Card>
          );
        })()}
      </div>

      {/* Randevu / Müşteri Detay BottomSheet */}
      {showDetail && (()=>{
        const apt = data.appointments.find(a => a.id===showDetail.id) || showDetail;
        const client = data.clients.find(c => c.id===apt.clientId || c.name===apt.clientName);
        const debt = client ? (client.totalAmount||0)-(client.paid||0) : 0;
        const noteText = apt.notes || client?.notes || "";
        const allExtraDates = (client?.extraDates || apt.extraDates || []).filter(Boolean);

        return (
          <BottomSheet title={apt.clientName} onClose={()=>setShowDetail(null)}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <Pill label={apt.status} color={STATUS_COLORS[apt.status]||T.text3}/>
                <Pill label={apt.package} color={pkgColor(apt.package)}/>
                {showDetail.isExtraDate && <Pill label={showDetail.extraDateLabel} color={T.blueL}/>}
              </div>
              {[["📅 Ana Tarih", fmtDate(apt.date)],["⏰ Saat", apt.time||"—"],
                ["📍 Konum", apt.location||"—"],["🎯 Tür", apt.type||"—"]].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between",
                  borderBottom:`1px solid ${T.border}`, paddingBottom:10 }}>
                  <span style={{ fontSize:13, color:T.text3 }}>{l}</span>
                  <span style={{ fontSize:14, fontWeight:500 }}>{v}</span>
                </div>
              ))}

              {/* Ek Günler / İkinci Çekim Tarihleri */}
              {allExtraDates.length > 0 && (
                <div style={{ background:T.card2, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, color:T.text3, fontWeight:600, marginBottom:8 }}>📅 Ek Çekim Günleri</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {allExtraDates.map((ed, idx) => (
                      <div key={idx} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
                        <span style={{ color:T.text2 }}>Gün {idx + 2}:</span>
                        <span style={{ fontWeight:600, color:T.goldL }}>{fmtDate(ed)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notlar & İkinci Açıklamalar */}
              {noteText && (
                <div style={{ background:T.card2, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>📝 Çekim Notları / Açıklamalar</div>
                  <div style={{ fontSize:13, color:T.text, whiteSpace:"pre-wrap", lineHeight:1.5 }}>{noteText}</div>
                </div>
              )}

              {client && (
                <div style={{ background:T.gold+"12", border:`1px solid ${T.gold}33`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:T.text3 }}>Toplam Tutar</span>
                    <span style={{ fontSize:13, fontWeight:700 }}>{fmt(client.totalAmount||0)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:T.text3 }}>Ödenen</span>
                    <span style={{ fontSize:13, fontWeight:700, color:T.greenL }}>{fmt(client.paid||0)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:T.text3 }}>Kalan</span>
                    <span style={{ fontSize:13, fontWeight:700, color:debt>0?T.orangeL:T.greenL }}>{fmt(debt)}</span>
                  </div>
                </div>
              )}
              {client && setActive && (
                <GoldButton label="Müşteri & Randevu Kartını Aç" icon="users" full
                  onClick={()=>{
                    setShowDetail(null);
                    if(setDetailClientId) setDetailClientId(client.id);
                    setActive("musteriler");
                  }}/>
              )}
            </div>
          </BottomSheet>
        );
      })()}
    </div>
  );
};

// ════════════════════════════════════════════════
// EKİP
// ════════════════════════════════════════════════
