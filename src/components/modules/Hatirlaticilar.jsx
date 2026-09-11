import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Hatirlaticilar = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const [showAdd, setShowAdd] = useState(false);
  const F = { title:"", linkedType:"manual", triggerDate:"", triggerTime:"09:00", daysBefore:1, done:false };
  const [form, setForm] = useState(F);
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const save = () => {
    const newRem = {...form, id:uid()};
    setData(p=>({...p, reminders:[...p.reminders, newRem]}));
    sb.upsert("reminders", toDB.reminders(newRem)).catch(()=>{});
    setShowAdd(false); setForm(F);
  };
  const toggle = id => setData(p=>({...p,reminders:p.reminders.map(r=>r.id===id?{...r,done:!r.done}:r)}));
  const del    = id => { sb.delete("reminders", id).catch(()=>{}); setData(p=>({...p,reminders:p.reminders.filter(r=>r.id!==id)})); };

  const active = data.reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.triggerDate)-new Date(b.triggerDate));
  const done   = data.reminders.filter(r=>r.done);

  const ltColor = t => t==="appointment"?T.blue:t==="payment"?T.orange:t==="not"?T.greenL:T.gold;
  const ltIcon  = t => t==="appointment"?"calendar":t==="payment"?"money":t==="not"?"edit":"bell";
  const ltLabel = t => t==="appointment"?"Randevu":t==="payment"?"Ödeme":t==="not"?"Hızlı Not":"Genel";

  return (
    <div className="fade-in">
      <PageHeader title="Hatırlatıcılar" sub={`${active.length} aktif`} action={isAdmin} onAction={()=>setShowAdd(true)} actionLabel="Ekle"/>
      <div style={{ padding:"0 20px" }}>
        {active.length===0 && done.length===0 ? (
          <EmptyState icon="bell" title="Hatırlatıcı Yok" sub="Önemli tarihleri ve ödemeleri takip et." action="Hatırlatıcı Ekle" onAction={()=>setShowAdd(true)}/>
        ) : (
          <>
            {active.map(r=>{
              const d = daysLeft(r.triggerDate);
              const urgent = d<=1&&d>=0;
              return (
                <Card key={r.id} style={{ marginBottom:10, borderColor:urgent?T.orange+"44":T.border }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ background:ltColor(r.linkedType)+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                      <Ic n={ltIcon(r.linkedType)} s={18} c={ltColor(r.linkedType)}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{r.title}</div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <Pill label={fmtDate(r.triggerDate)} color={T.text3}/>
                        <Pill label={`Saat ${r.triggerTime}`} color={T.text3}/>
                        <Pill label={ltLabel(r.linkedType)} color={ltColor(r.linkedType)}/>
                        {r.daysBefore>0 && <Pill label={`${r.daysBefore} gün önce`} color={T.text3}/>}
                        {urgent && <Pill label={d===0?"Bugün!":"Yarın!"} color={T.redL}/>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <button onClick={()=>toggle(r.id)} style={{ background:T.green+"1A", border:`1px solid ${T.green}33`,
                        borderRadius:8, padding:"7px 10px", fontSize:12, fontWeight:700, color:T.greenL }}>✓</button>
                      <button onClick={()=>del(r.id)} style={{ background:T.red+"1A", border:`1px solid ${T.red}33`,
                        borderRadius:8, padding:"7px 10px", fontSize:12, fontWeight:700, color:T.redL }}>✕</button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {done.length>0 && (
              <div style={{ marginTop:20 }}>
                <Divider label="TAMAMLANANLAR"/>
                {done.map(r=>(
                  <div key={r.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"12px 0",
                    borderBottom:`1px solid ${T.border}`, opacity:0.4 }}>
                    <Ic n="check" s={16} c={T.green}/>
                    <span style={{ fontSize:14, textDecoration:"line-through", color:T.text2, flex:1 }}>{r.title}</span>
                    {isAdmin && <button onClick={()=>del(r.id)}><Ic n="trash" s={15} c={T.text3}/></button>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {showAdd && (
        <BottomSheet title="Yeni Hatırlatıcı" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Başlık" value={form.title} onChange={f("title")} placeholder="Ne hatırlatılsın?" required/>
            <Field label="Tür" value={form.linkedType} onChange={f("linkedType")}
              options={[{value:"manual",label:"Genel"},{value:"appointment",label:"Randevu"},{value:"payment",label:"Ödeme"}]}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Tarih" type="date" value={form.triggerDate} onChange={f("triggerDate")} required/>
              <Field label="Saat" type="time" value={form.triggerTime} onChange={f("triggerTime")}/>
            </div>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:10 }}>Etkinlikten kaç gün önce?</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[0,1,2,3,7,14,30].map(d=>(
                  <button key={d} onClick={()=>setForm(p=>({...p,daysBefore:d}))}
                    style={{ background:form.daysBefore===d?T.gold:T.card2, color:form.daysBefore===d?T.bg:T.text2,
                      border:`1px solid ${form.daysBefore===d?T.gold:T.border}`, borderRadius:10, padding:"8px 14px", fontSize:12, fontWeight:600 }}>
                    {d===0?"Gün kendisi":d===7?"1 hafta":d===14?"2 hafta":d===30?"1 ay":`${d} gün`}
                  </button>
                ))}
              </div>
            </div>
            <GoldButton label="Hatırlatıcı Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// TAKVİM
// ════════════════════════════════════════════════
