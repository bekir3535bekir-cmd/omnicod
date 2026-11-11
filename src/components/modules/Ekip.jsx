import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET} from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { UsageBadge, ProGate } from "../common/ProGate";
import { canAddTeamMember } from "../../services/plan";
import { sb, fromDB, toDB, IS_CLOUD } from "../../services/supabase";
import { fetchStaffAccounts, createStaffAccount, setStaffPassword, removeStaffAccount, normalizePhone } from "../../services/auth";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Ekip = ({ data, setData, role, plan, setActive }) => {
  const isAdmin = role === "admin";
  const [tab, setTab] = useState("ekip");
  const [showMember, setShowMember] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showShift,  setShowShift]  = useState(false);
  const [showPay,    setShowPay]    = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [selMember,  setSelMember]  = useState(null);
  // Personel uygulama girişi (bulut): hangi üyenin hesabı var
  const [accounts, setAccounts] = useState({});        // team_id → telefon
  const [accessFor, setAccessFor] = useState(null);    // pencerede düzenlenen üye
  const [accForm, setAccForm] = useState({ phone:"", password:"" });
  const [accMsg, setAccMsg] = useState(null);
  const [accBusy, setAccBusy] = useState(false);
  const loadAccounts = () => {
    if (!IS_CLOUD || role !== "admin") return;
    fetchStaffAccounts().then(list => setAccounts(Object.fromEntries((list || []).map(a => [String(a.team_id), a.phone])))).catch(() => {});
  };
  useEffect(loadAccounts, []);
  const openAccess = (m) => { setAccessFor(m); setAccForm({ phone: m.phone || "", password: "" }); setAccMsg(null); };
  const accRun = async (fn, okText) => {
    setAccBusy(true); setAccMsg(null);
    try { await fn(); setAccMsg({ ok: true, text: okText }); loadAccounts(); setAccForm(f => ({ ...f, password: "" })); }
    catch (e) { setAccMsg({ ok: false, text: e.message }); }
    finally { setAccBusy(false); }
  };
  const [weekOffset, setWeekOffset] = useState(0);
  const FM = { name:"", role:"Fotoğrafçı", phone:"", color:T.blue, salary:0, totalEarned:0, totalPaid:0 };
  const FS = { teamId:"", title:"", date:"", start:"08:00", end:"18:00", location:"", note:"" };
  const FP = { amount:"", type:"Ödeme", note:"", date:todayStr() };
  const [mForm, setMForm] = useState(FM);
  const [shiftForm, setShiftForm] = useState(FS);
  const [pForm, setPForm] = useState(FP);
  const mf = k => v => setMForm(p=>({...p,[k]:v}));
  const sf = k => v => setShiftForm(p=>({...p,[k]:v}));
  const pf = k => v => setPForm(p=>({...p,[k]:v}));

  const teamLimitCheck = canAddTeamMember(data);

  const handleOpenAddMember = () => {
    if (!teamLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    setShowMember(true);
  };

  const saveMember = () => {
    if(!mForm.name.trim()) { alert("İsim zorunlu!"); return; }
    if(!teamLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    const newMember = {...mForm, id:uid(), salary:Number(mForm.salary)||0, totalEarned:Number(mForm.totalEarned)||0, totalPaid:Number(mForm.totalPaid)||0};
    setData(p=>({...p, team:[...p.team, newMember]}));
    sb.upsert("team", toDB.team(newMember)).catch(e=>console.error("Üye kayıt hatası:",e));
    setShowMember(false); setMForm(FM);
  };
  const delMember = (id) => {
    if (IS_CLOUD && accounts[String(id)]) removeStaffAccount(id).then(loadAccounts).catch(()=>{});
    sb.delete("team", id).catch(()=>{});
    setData(p => {
      const memberShifts = p.shifts.filter(s=>s.teamId===id);
      memberShifts.forEach(s => sb.delete("shifts", s.id).catch(()=>{}));
      return {...p, team:p.team.filter(m=>m.id!==id), shifts:p.shifts.filter(s=>s.teamId!==id)};
    });
  };
  const saveShift = () => {
    if(!shiftForm.teamId || !shiftForm.date) { alert("Ekip üyesi ve tarih zorunlu!"); return; }
    const newShift = {...shiftForm, id:uid(), teamId:String(shiftForm.teamId)};
    // memberName'i otomatik doldur
    const member = data.team.find(m=>m.id===shiftForm.teamId);
    if(member) newShift.memberName = member.name;
    setData(p=>({...p, shifts:[...p.shifts, newShift]}));
    sb.upsert("shifts", toDB.shifts(newShift)).catch(e=>console.error("Shift kayıt hatası:",e));
    setShowShift(false); setShiftForm(FS);
  };
  const savePayment = () => {
    const amt = Number(pForm.amount)||0;
    if(!(amt > 0) || !selMember) return;
    setData(p=>({...p,
      team:p.team.map(m=>m.id===selMember?.id
        ? {...m, totalPaid:pForm.type==="Ödeme"?(m.totalPaid||0)+amt:m.totalPaid,
                 totalEarned:pForm.type==="Kazanç"?(m.totalEarned||0)+amt:m.totalEarned}
        : m)
    }));
    // Supabase'e güncelle
    const updMember = data.team.find(m=>m.id===selMember?.id);
    if(updMember) {
      const patched = pForm.type==="Ödeme"
        ? {...updMember, totalPaid:(updMember.totalPaid||0)+amt}
        : {...updMember, totalEarned:(updMember.totalEarned||0)+amt};
      sb.upsert("team", toDB.team(patched)).catch(()=>{});
    }
    setShowPay(false); setPForm(FP);
  };

  const [editShift, setEditShift] = useState(null);
  const saveEditShift = () => {
    if(!editShift) return;
    setData(p=>({...p, shifts:p.shifts.map(s=>s.id===editShift.id?{...editShift}:s)}));
    sb.upsert("shifts", toDB.shifts(editShift)).catch(()=>{});
    setEditShift(null);
  };
  const delShift = (id) => {
    sb.delete("shifts", id).catch(()=>{});
    setData(p=>({...p, shifts:p.shifts.filter(s=>s.id!==id)}));
  };

  const upShifts = [...data.shifts].sort((a,b)=>new Date(a.date)-new Date(b.date));

  return (
    <div className="fade-in">
      <PageHeader title="Ekip & Shift" sub="Personel yönetimi"/>
      <div style={{ padding:"0 20px 16px", display:"flex", gap:8 }}>
        {["ekip","shiftler"].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ background:tab===t?T.gold:T.card, border:`1px solid ${tab===t?T.gold:T.border}`,
              color:tab===t?T.bg:T.text2, borderRadius:99, padding:"9px 20px", fontSize:13, fontWeight:600 }}>
            {t==="ekip"?"Ekip Üyeleri":"Shiftler"}
          </button>
        ))}
      </div>
      <div style={{ padding:"0 20px" }}>
        {tab==="ekip" && (
          <>
            {!teamLimitCheck.isPro && (
              <div style={{ marginBottom: 12 }}>
                <UsageBadge check={teamLimitCheck} label="Ekip Üyesi" />
              </div>
            )}
            {isAdmin && <GoldButton label="Üye Ekle" icon="plus" onClick={handleOpenAddMember} full style={{ marginBottom:14 }}/>}
            {data.team.length===0 ? <EmptyState icon="team" title="Ekip Üyesi Yok" sub="Personel ekleyerek shift ve maaş takibi yap."/> :
            data.team.map(m=>{
              const ms = data.shifts.filter(s=>s.teamId===m.id);
              const earned = m.totalEarned||0;
              const paid   = m.totalPaid||0;
              const debt   = earned - paid;
              const pct    = earned>0 ? Math.min(100,Math.round(paid/earned*100)) : 0;
              return (
                <Card key={m.id} style={{ marginBottom:12 }}>
                  {/* Header */}
                  <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
                    <div style={{ background: T.flat ? T.card2 : m.color+"22", borderRadius:99, width:50, height:50, flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      ...NUM_FONT, fontSize:20, fontWeight:700, color:m.color }}>
                      {m.name.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:15 }}>{m.name}</div>
                      <div style={{ fontSize:12, color:T.text2, marginTop:2 }}>{m.role}</div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>{m.phone}</div>
                    </div>
                    <div style={{ background: T.flat ? T.card2 : m.color+"1A", borderRadius:12, padding:"8px 14px", textAlign:"center" }}>
                      <div style={{ ...NUM_FONT, fontSize:18, fontWeight:700, color:m.color }}>{ms.length}</div>
                      <div style={{ fontSize:10, color:T.text3 }}>shift</div>
                    </div>
                  </div>

                  {/* Finance — ücret bilgileri yalnızca yöneticiye görünür */}
                  {isAdmin && <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginBottom:12 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                      {[["Kazanç",fmt(earned),T.gold],["Ödenen",fmt(paid),T.greenL],["Kalan",fmt(debt),debt>0?T.orangeL:T.text3]].map(([l,v,c])=>(
                        <div key={l} style={{ background:T.card2, borderRadius:10, padding:"8px", textAlign:"center" }}>
                          <div style={{ fontSize:10, color:T.text3, marginBottom:3 }}>{l}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {earned>0 && (
                      <div>
                        <div style={{ background:T.card2, borderRadius:99, height:5 }}>
                          <div style={{ background:`linear-gradient(90deg,${T.green},${T.greenL})`,
                            borderRadius:99, height:"100%", width:`${pct}%`, transition:"width 0.4s" }}/>
                        </div>
                        <div style={{ fontSize:11, color:T.text3, marginTop:4, textAlign:"right" }}>{pct}% ödendi</div>
                      </div>
                    )}
                  </div>}

                  {/* Actions */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {isAdmin && <button onClick={()=>{ setShiftForm({...FS, teamId:m.id}); setShowShift(true); }}
                      style={{ flex:1, background:T.blue+"1A", border:`1px solid ${T.blue}33`,
                        borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, color:T.blueL }}>
                      Shift Ekle
                    </button>}
                    {isAdmin && <button onClick={()=>{setSelMember(m);setPForm({...FP,type:"Kazanç"});setShowPay(true);}}
                      style={{ flex:1, background:T.gold+"1A", border:`1px solid ${T.gold}33`,
                        borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, color:T.goldL }}>
                      + Kazanç Ekle
                    </button>}
                    {isAdmin && <button onClick={()=>{setSelMember(m);setPForm({...FP,type:"Ödeme"});setShowPay(true);}}
                      style={{ flex:1, background:T.green+"1A", border:`1px solid ${T.green}33`,
                        borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, color:T.greenL }}>
                      + Ödeme Yap
                    </button>}
                    {isAdmin && IS_CLOUD && <button onClick={()=>openAccess(m)}
                      style={{ flex:"1 1 100%", background:accounts[String(m.id)]?T.green+"1A":T.card2, border:`1px solid ${accounts[String(m.id)]?T.green+"55":T.border}`,
                        borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, color:accounts[String(m.id)]?T.greenL:T.text2 }}>
                      {accounts[String(m.id)] ? `Uygulama girişi açık · 0${accounts[String(m.id)]}` : "Uygulama Girişi Oluştur"}
                    </button>}
                    {isAdmin && <button aria-label="Sil" onClick={()=>setConfirmDel(m.id)}
                      style={{ background:T.red+"1A", border:`1px solid ${T.red}33`,
                        borderRadius:10, padding:"9px 12px", fontSize:12, fontWeight:600, color:T.redL }}>
                      <Ic n="trash" s={15} c={T.redL}/>
                    </button>}
                  </div>

                  {/* Inline confirm */}
                  {confirmDel===m.id && (
                    <div style={{ marginTop:10, background:T.red+"1A", border:`1px solid ${T.red}33`,
                      borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ flex:1, fontSize:13, color:T.redL, fontWeight:500 }}>
                        {m.name} silinsin mi? Shiftleri de silinir.
                      </span>
                      <button onClick={()=>{delMember(m.id);setConfirmDel(null);}}
                        style={{ background:T.red, borderRadius:8, padding:"7px 14px",
                          fontSize:12, fontWeight:700, color:"#fff" }}>Evet, Sil</button>
                      <button onClick={()=>setConfirmDel(null)}
                        style={{ background:T.card3, borderRadius:8, padding:"7px 14px",
                          fontSize:12, fontWeight:600, color:T.text2 }}>İptal</button>
                    </div>
                  )}
                </Card>
              );
            })}
          </>
        )}
        {tab==="shiftler" && (
          <>
            {isAdmin && <GoldButton label="Shift Ekle" icon="plus" onClick={()=>setShowShift(true)} full style={{ marginBottom:14 }}/>}

            {/* Haftalık Takvim */}
            {(()=>{
              const getWeekStart = () => {
                const d = new Date();
                const day = d.getDay();
                const diff = day===0 ? -6 : 1-day;
                d.setDate(d.getDate()+diff+(weekOffset*7));
                d.setHours(0,0,0,0);
                return d;
              };
              const weekStart = getWeekStart();
              const weekDays = Array.from({length:7},(_,i)=>{
                const d = new Date(weekStart);
                d.setDate(d.getDate()+i);
                return d;
              });
              const DAYS_TR = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
              const startLabel = weekDays[0].toLocaleDateString("tr-TR",{day:"numeric",month:"short"});
              const endLabel   = weekDays[6].toLocaleDateString("tr-TR",{day:"numeric",month:"short"});
              return (
                <Card style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <button aria-label="Önceki hafta" onClick={()=>setWeekOffset(w=>w-1)}
                      style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99,
                        width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n="back" s={14} c={T.text}/>
                    </button>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.goldL }}>{startLabel} – {endLabel}</div>
                      {weekOffset===0 && <div style={{ fontSize:10, color:T.text3 }}>Bu Hafta</div>}
                    </div>
                    <button aria-label="Sonraki hafta" onClick={()=>setWeekOffset(w=>w+1)}
                      style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99,
                        width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n="back" s={14} c={T.text} style={{transform:"rotate(180deg)"}}/>
                    </button>
                  </div>
                  {data.team.length===0 ? (
                    <div style={{ textAlign:"center", padding:"16px 0", fontSize:13, color:T.text3 }}>
                      Önce ekip üyesi ekleyin
                    </div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"70px repeat(7,1fr)", gap:3, marginBottom:6 }}>
                        <div/>
                        {weekDays.map((day,i)=>{
                          const isToday = day.toDateString()===new Date().toDateString();
                          return (
                            <div key={i} style={{ textAlign:"center" }}>
                              <div style={{ fontSize:10, fontWeight:600, color:isToday?T.goldL:T.text3 }}>{DAYS_TR[i]}</div>
                              <div style={{ fontSize:12, fontWeight:isToday?700:400,
                                color:isToday?T.gold:T.text2,
                                background:isToday?T.gold+"1A":"transparent",
                                borderRadius:6, padding:"2px 0" }}>
                                {day.getDate()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {data.team.map(member=>(
                        <div key={member.id} style={{ display:"grid", gridTemplateColumns:"70px repeat(7,1fr)", gap:3, marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5, paddingRight:4 }}>
                            <div style={{ width:7, height:7, borderRadius:99, background:member.color||T.gold, flexShrink:0 }}/>
                            <span style={{ fontSize:10, color:T.text2, fontWeight:500,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {member.name.split(" ")[0]}
                            </span>
                          </div>
                          {weekDays.map((day,i)=>{
                            const dayKey = day.toISOString().split("T")[0];
                            const dayShifts = data.shifts.filter(s=>s.teamId===member.id && s.date===dayKey);
                            return (
                              <div key={i} style={{ minHeight:36 }}>
                                {dayShifts.length===0
                                  ? <div style={{ height:"100%", minHeight:36, background:T.card2,
                                      borderRadius:6, border:`1px dashed ${T.border}` }}/>
                                  : dayShifts.map(s=>(
                                    <div key={s.id} style={{
                                      background:(member.color||T.gold)+"22",
                                      border:`1px solid ${member.color||T.gold}55`,
                                      borderRadius:6, padding:"3px 5px", marginBottom:2 }}>
                                      <div style={{ fontSize:9, fontWeight:700, color:member.color||T.gold,
                                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                        {s.title||"Shift"}
                                      </div>
                                      <div style={{ fontSize:8, color:T.text3 }}>{s.start}–{s.end}</div>
                                    </div>
                                  ))
                                }
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {upShifts.length===0
              ? <EmptyState icon="clock" title="Shift Yok" sub="Ekip üyelerine shift ata."/>
              : upShifts.map(s=>{
                  const member=data.team.find(t=>t.id===s.teamId);
                  return (
                    <Card key={s.id} style={{ marginBottom:10, borderLeft:`3px solid ${member?.color||T.gold}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>{s.title}</div>
                        <Pill label={fmtDateSh(s.date)} color={T.text3}/>
                      </div>
                      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:10 }}>
                        {member && <div style={{ display:"flex", gap:6, alignItems:"center" }}><Ic n="users" s={13} c={T.text3}/><span style={{ fontSize:12, color:T.text2 }}>{member.name}</span></div>}
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}><Ic n="clock" s={13} c={T.text3}/><span style={{ fontSize:12, color:T.text2 }}>{s.start} – {s.end}</span></div>
                        {s.location && <div style={{ display:"flex", gap:6, alignItems:"center" }}><Ic n="pin" s={13} c={T.text3}/><span style={{ fontSize:12, color:T.text2 }}>{s.location}</span></div>}
                      </div>
                      {isAdmin && (
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={()=>setEditShift({...s})}
                            style={{ flex:1, background:T.gold+"22", border:`1px solid ${T.gold}44`,
                              borderRadius:10, padding:"7px", fontSize:12, fontWeight:600, color:T.goldL }}>
                            Düzenle
                          </button>
                          <button onClick={()=>delShift(s.id)}
                            style={{ flex:1, background:T.red+"1A", border:`1px solid ${T.red}33`,
                              borderRadius:10, padding:"7px", fontSize:12, fontWeight:600, color:T.redL }}>
                            Sil
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })
            }
          </>
        )}
      </div>

      {showMember && (
        <BottomSheet title="Yeni Ekip Üyesi" onClose={()=>setShowMember(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Ad Soyad" value={mForm.name} onChange={mf("name")} placeholder="Ad Soyad" required/>
            <Field label="Rol" value={mForm.role} onChange={mf("role")} options={["Baş Fotoğrafçı","Fotoğrafçı","Kameraman","Video Editörü","Asistan","Diğer"]}/>
            <Field label="Telefon" type="tel" value={mForm.phone} onChange={mf("phone")} placeholder="05xx xxx xx xx"/>
            <Field label="Başlangıç Kazanç" type="number" value={mForm.totalEarned} onChange={mf("totalEarned")} placeholder="0" note="Opsiyonel"/>
            <Field label="Başlangıç Ödenen" type="number" value={mForm.totalPaid} onChange={mf("totalPaid")} placeholder="0" note="Opsiyonel"/>
            <GoldButton label="Üyeyi Kaydet" icon="check" onClick={saveMember} full/>
          </div>
        </BottomSheet>
      )}

      {editShift && (
        <BottomSheet title="Shift Düzenle" onClose={()=>setEditShift(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Başlık" value={editShift.title||""} onChange={v=>setEditShift(p=>({...p,title:v}))} placeholder="Hangi çekim?"/>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>Ekip Üyesi</span>
              <select value={editShift.teamId} onChange={e=>setEditShift(p=>({...p,teamId:e.target.value}))}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", color:T.text, fontSize:14 }}>
                <option value="">-- Seç --</option>
                {data.team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <Field label="Tarih" type="date" value={editShift.date||""} onChange={v=>setEditShift(p=>({...p,date:v}))}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Başlangıç" type="time" value={editShift.start||"08:00"} onChange={v=>setEditShift(p=>({...p,start:v}))}/>
              <Field label="Bitiş" type="time" value={editShift.end||"18:00"} onChange={v=>setEditShift(p=>({...p,end:v}))}/>
            </div>
            <Field label="Konum" value={editShift.location||""} onChange={v=>setEditShift(p=>({...p,location:v}))} placeholder="Mekan"/>
            <Field label="Not" value={editShift.note||""} onChange={v=>setEditShift(p=>({...p,note:v}))} placeholder="Açıklama..."/>
            <GoldButton label="Değişiklikleri Kaydet" icon="check" onClick={saveEditShift} full/>
          </div>
        </BottomSheet>
      )}

      {showShift && (
        <BottomSheet title="Yeni Shift" onClose={()=>setShowShift(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Başlık / Etkinlik" value={shiftForm.title} onChange={sf("title")} placeholder="Hangi çekim?" required/>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>Ekip Üyesi</span>
              <select value={shiftForm.teamId} onChange={e=>setShiftForm(p=>({...p,teamId:e.target.value}))}
                style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", color:T.text, fontSize:14 }}>
                <option value="">Seç...</option>
                {data.team.map(t=><option key={t.id} value={t.id}>{t.name} — {t.role}</option>)}
              </select>
            </div>
            <Field label="Tarih" type="date" value={shiftForm.date} onChange={sf("date")}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Başlangıç" type="time" value={shiftForm.start} onChange={sf("start")}/>
              <Field label="Bitiş" type="time" value={shiftForm.end} onChange={sf("end")}/>
            </div>
            <Field label="Konum" value={shiftForm.location} onChange={sf("location")} placeholder="Mekan"/>
            <Field label="Not" value={shiftForm.note} onChange={sf("note")} placeholder="Açıklama..."/>
            <GoldButton label="Shift Kaydet" icon="check" onClick={saveShift} full/>
          </div>
        </BottomSheet>
      )}

      {showPay && selMember && (
        <BottomSheet title={`${pForm.type} — ${selMember.name}`} onClose={()=>setShowPay(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", gap:8 }}>
              {["Kazanç","Ödeme"].map(t=>(
                <button key={t} onClick={()=>setPForm(p=>({...p,type:t}))}
                  style={{ flex:1, background:pForm.type===t?T.gold:T.card2,
                    color:pForm.type===t?T.bg:T.text2, border:`1px solid ${pForm.type===t?T.gold:T.border}`,
                    borderRadius:10, padding:"10px", fontSize:13, fontWeight:600 }}>
                  {t==="Kazanç"?"Kazanç Ekle":"Ödeme Yap"}
                </button>
              ))}
            </div>
            <Field label="Tutar" type="number" value={pForm.amount} onChange={pf("amount")} placeholder="0" required/>
            <Field label="Tarih" type="date" value={pForm.date} onChange={pf("date")}/>
            <Field label="Not" value={pForm.note} onChange={pf("note")} placeholder="Açıklama..."/>
            <GoldButton label="Kaydet" icon="check" onClick={savePayment} full/>
          </div>
        </BottomSheet>
      )}

      {/* Ekip Limiti Doldu Modal */}
      {showLimitModal && (
        <BottomSheet title="Ekip Limiti" onClose={()=>setShowLimitModal(false)}>
          <ProGate check={teamLimitCheck} featureLabel="Ekip Üyesi" onUpgrade={()=>{ setShowLimitModal(false); setActive && setActive("planyonetimi"); }} />
        </BottomSheet>
      )}
      {accessFor && (
        <BottomSheet title={`${accessFor.name} — Uygulama Girişi`} onClose={()=>!accBusy && setAccessFor(null)}>
          {(() => {
            const has = accounts[String(accessFor.id)];
            const inp = { background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none", boxSizing:"border-box" };
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ fontSize:12.5, color:T.text3, lineHeight:1.6 }}>
                  {has
                    ? <>Bu personel STÜDYOM uygulamasına <b style={{ color:T.text }}>0{has}</b> numarası ve sizin belirlediğiniz şifreyle giriş yapıyor. Kendisine atanan görevleri ve bildirimleri görür; gelir-gider ve firma bilgilerini göremez.</>
                    : <>Personel uygulamayı telefonuna veya bilgisayarına indirip <b style={{ color:T.text }}>"Personel girişi"</b> ekranından bu telefon numarası ve şifreyle girer.</>}
                </div>
                {!has && (
                  <input type="tel" value={accForm.phone} onChange={e=>setAccForm(f=>({ ...f, phone:e.target.value }))} placeholder="Telefon (05xx xxx xx xx)" style={inp}/>
                )}
                <input type="text" value={accForm.password} onChange={e=>setAccForm(f=>({ ...f, password:e.target.value }))}
                  placeholder={has ? "Yeni şifre (en az 6 karakter)" : "Şifre (en az 6 karakter)"} style={inp} autoComplete="new-password"/>
                {accMsg && <div style={{ fontSize:12.5, color:accMsg.ok?T.greenL:T.redL, lineHeight:1.5 }}>{accMsg.text}</div>}
                {!has ? (
                  <GoldButton label={accBusy ? "Oluşturuluyor..." : "Girişi Oluştur"} full onClick={()=>!accBusy && accRun(async () => {
                    await createStaffAccount(accessFor.id, accForm.phone, accForm.password);
                    // Telefon numarası ekip kaydına da yazılır
                    const ph = normalizePhone(accForm.phone);
                    if (!normalizePhone(accessFor.phone || "")) {
                      const upd = { ...accessFor, phone: "0" + ph };
                      setData(p => ({ ...p, team: p.team.map(x => x.id === upd.id ? upd : x) }));
                      sb.upsert("team", toDB.team(upd)).catch(()=>{});
                    }
                  }, `Giriş oluşturuldu. Personel "Personel girişi" ekranından 0${normalizePhone(accForm.phone)} numarası ve belirlediğiniz şifreyle girebilir.`)}/>
                ) : (
                  <>
                    <GoldButton label={accBusy ? "Kaydediliyor..." : "Şifreyi Değiştir"} full onClick={()=>!accBusy && accRun(
                      () => setStaffPassword(accessFor.id, accForm.password), "Şifre değiştirildi. Personel yeni şifreyle giriş yapmalı.")}/>
                    <button onClick={()=>{ if (!accBusy && confirm(`${accessFor.name} uygulamaya artık giriş yapamayacak. Devam edilsin mi?`)) accRun(() => removeStaffAccount(accessFor.id), "Uygulama erişimi kaldırıldı."); }}
                      style={{ background:"transparent", border:`1px solid ${T.red}55`, color:T.redL, borderRadius:12, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      Uygulama Erişimini Kaldır
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// GALERİ
// ════════════════════════════════════════════════
