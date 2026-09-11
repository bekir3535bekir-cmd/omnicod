import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE , initProcess, isComplete } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { UsageBadge, ProGate } from "../common/ProGate";
import { canAddAppointment } from "../../services/plan";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Ajanda = ({ data, setData, role, plan, setActive }) => {
  const isAdmin = role === "admin";
  const [showAdd,   setShowAdd]   = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [detailId,  setDetailId]  = useState(null);
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [showCekim, setShowCekim] = useState(false);
  const [cekimApt,  setCekimApt]  = useState(null);
  const F = { clientName:"", date:"", time:"", location:"", type:"Düğün", package:"Bronz Paket", notes:"", reminderDays:3, status:"onaylı", totalAmount:"", kapora:"", extraDates:[] };
  const [form, setForm] = useState(F);
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const [editApt, setEditApt] = useState(null);
  const ea = k => v => setEditApt(p=>({...p,[k]:v}));

  const aptLimitCheck = canAddAppointment(data);

  // detail her zaman data'dan türetiliyor → tek kaynak
  const detail = detailId ? data.appointments.find(a => a.id === detailId) || null : null;

  const handleOpenAdd = () => {
    if (!aptLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    setShowAdd(true);
  };

  const save = () => {
    if(!form.clientName||!form.date) return;
    if(!aptLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    const total  = Number(form.totalAmount)||0;
    const kapora = Number(form.kapora)||0;

    const existingClient = data.clients.find(c=>c.name.toLowerCase()===form.clientName.toLowerCase());

    const kaporaId = uid();
    const kaporaPayment = kapora > 0 ? [{
      id: kaporaId, amount: kapora, type:"Ödeme Alındı",
      promiseDate:"", note:"Kapora", date: todayStr(), done: false
    }] : [];

    // Kapora varsa muhasebe incomes'a da ekle
    const kaporaIncome = kapora > 0 ? {
      id: kaporaId, clientName: form.clientName, amount: kapora,
      type: "Kapora", method: "Nakit", date: todayStr(),
      note: "Kapora", category: form.type||"Düğün"
    } : null;

    // clientId: varolan müşteriden al, yoksa yeni müşteri id'si sonra atanacak
    const newClientId = existingClient ? existingClient.id : uid();
    const newA = { ...form, id:uid(), clientId: existingClient ? existingClient.id : newClientId };

    let updatedClients;
    let syncedClientForDB;
    const cleanExtraDates = (form.extraDates||[]).filter(Boolean);
    if(existingClient) {
      const mergedClient = {
        ...existingClient,
        totalAmount: total>0 ? total : existingClient.totalAmount,
        paid: existingClient.paid + kapora,
        payments: [...(existingClient.payments||[]), ...kaporaPayment],
        extraDates: cleanExtraDates.length>0 ? cleanExtraDates : existingClient.extraDates,
      };
      updatedClients = data.clients.map(c => c.id===existingClient.id ? mergedClient : c);
      syncedClientForDB = mergedClient;
    } else {
      const newClient = {
        id: newClientId, name: form.clientName, phone:"", email:"",
        type: form.type, package: form.package, date: form.date,
        totalAmount: total, paid: kapora,
        notes: form.notes, status:"aktif", extraDates: cleanExtraDates,
        payments: kaporaPayment, process: initProcess()
      };
      updatedClients = [...data.clients, newClient];
      syncedClientForDB = newClient;
    }

    const remDate = new Date(form.date+"T12:00:00");
    remDate.setDate(remDate.getDate()-form.reminderDays);
    const newReminders = [];
    // Ana tarih hatırlatıcısı
    if(form.date) {
      newReminders.push({ id:uid(), title:`${form.clientName} — ${form.type} Çekimi`,
        linkedType:"appointment", linkedId:newA.id,
        triggerDate:remDate.toISOString().split("T")[0],
        triggerTime:"09:00", daysBefore:form.reminderDays, done:false });
    }
    // Ek tarihler için hatırlatıcı
    (form.extraDates||[]).filter(Boolean).forEach((ed, i) => {
      const edDate = new Date(ed+"T12:00:00");
      edDate.setDate(edDate.getDate()-form.reminderDays);
      newReminders.push({ id:uid(), title:`${form.clientName} — ${form.type} Çekimi (Gün ${i+2})`,
        linkedType:"appointment", linkedId:newA.id,
        triggerDate:edDate.toISOString().split("T")[0],
        triggerTime:"09:00", daysBefore:form.reminderDays, done:false });
    });

    setData(p=>({
      ...p,
      appointments: [...p.appointments, newA],
      clients:      updatedClients,
      incomes:      kaporaIncome ? [...p.incomes, kaporaIncome] : p.incomes,
      reminders:    [...p.reminders, ...newReminders]
    }));
    // Anında Supabase'e yaz — randevu + müşteri + hatırlatıcı + kapora
    sb.upsert("appointments", toDB.appointments(newA)).catch(e=>console.error("Randevu kayıt hatası:",e));
    sb.upsert("clients", toDB.clients(syncedClientForDB)).catch(e=>console.error("Müşteri kayıt hatası:",e));
    newReminders.forEach(r => sb.upsert("reminders", toDB.reminders(r)).catch(()=>{}));
    if(kaporaIncome) sb.upsert("incomes", toDB.incomes(kaporaIncome)).catch(()=>{});
    setShowAdd(false); setForm(F);
  };

  const del = id => {
    sb.delete("appointments", id).catch(e=>console.error("Randevu sil hatası:", e));
    setData(p=>({...p,appointments:p.appointments.filter(a=>a.id!==id)}));
    setDetailId(null);
  };
  const changeStatus = (id,s) => {
    setData(p=>({...p,appointments:p.appointments.map(a=>a.id===id?{...a,status:s}:a)}));
    const apt = data.appointments.find(a=>a.id===id);
    if(apt) sb.upsert("appointments", toDB.appointments({...apt,status:s})).catch(e=>console.error("Durum güncelleme hatası:",e));
  };
  const copyAppointment = (apt) => {
    setDetailId(null);
    setForm({ clientName:apt.clientName, date:"", time:apt.time||"", location:apt.location||"",
      type:apt.type, package:apt.package, notes:apt.notes||"", reminderDays:3,
      status:"bekliyor", totalAmount:apt.totalAmount||"", kapora:"", extraDates:[] });
    setShowAdd(true);
  };

  const statuses = ["aktif","onaylı","bekliyor","tamamlandı","iptal","Tümü"];
  const filtered = data.appointments
    .filter(a => {
      if(statusFilter === "aktif") return a.status !== "tamamlandı" && a.status !== "iptal";
      if(statusFilter === "Tümü") return true;
      return a.status === statusFilter;
    })
    .sort((a,b) => new Date(a.date||0) - new Date(b.date||0));

  return (
    <div className="fade-in">
      <PageHeader title="Ajanda" sub={`${data.appointments.length} randevu`} action onAction={handleOpenAdd} actionLabel="Randevu Ekle"/>

      {/* Plan Kullanım Rozeti - Basic ise */}
      {!aptLimitCheck.isPro && (
        <div style={{ padding:"0 20px 14px" }}>
          <UsageBadge check={aptLimitCheck} label="Düğün / Çekim Randevusu" />
        </div>
      )}

      {/* Status filter */}
      {data.appointments.length>0 && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 20px 16px" }}>
          {statuses.map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              style={{ background:statusFilter===s?T.gold:"transparent",
                color:statusFilter===s?T.bg:T.text2, border:`1px solid ${statusFilter===s?T.gold:T.border}`,
                borderRadius:99, padding:"7px 16px", fontSize:12, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
              {s==="Tümü"?"Tümü":s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding:"0 20px" }}>
        {filtered.length === 0 ? (
          <EmptyState icon="calendar" title="Randevu Bulunamadı"
            sub="Yeni bir randevu ekleyerek takibine başla." action="İlk Randevuyu Ekle" onAction={handleOpenAdd}/>
        ) : filtered.map(a => {
          const d = daysLeft(a.date);
          const pkgColor = data.packages.find(p=>p.name===a.package)?.color||T.gold;
          const linkedClient = data.clients.find(c => c.id===a.clientId || c.name===a.clientName);
          const aExtraDates = linkedClient?.extraDates || a.extraDates || [];
          return (
            <Card key={a.id} onClick={()=>setDetailId(a.id)} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", flex:1 }}>
                  {/* Ana tarih */}
                  <div style={{ background:pkgColor+"1A", borderRadius:14, padding:"10px 14px",
                    textAlign:"center", minWidth:54, flexShrink:0 }}>
                    <div style={{ fontFamily:"Playfair Display", fontSize:22, fontWeight:700, color:pkgColor, lineHeight:1 }}>
                      {a.date ? new Date(a.date+"T12:00:00").getDate() : "—"}
                    </div>
                    <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>
                      {a.date ? MN[new Date(a.date+"T12:00:00").getMonth()].slice(0,3) : ""}
                    </div>
                  </div>
                  {/* Ek tarihler - ana tarih yanında */}
                  {aExtraDates.filter(Boolean).map((ed,i)=>(
                    <div key={i} style={{ background:T.card2, borderRadius:12, padding:"8px 10px",
                      textAlign:"center", minWidth:46, flexShrink:0 }}>
                      <div style={{ fontFamily:"Playfair Display", fontSize:16, fontWeight:700, color:T.text2, lineHeight:1 }}>
                        {new Date(ed+"T12:00:00").getDate()}
                      </div>
                      <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>
                        {MN[new Date(ed+"T12:00:00").getMonth()].slice(0,3)}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontWeight:600, fontSize:16, marginBottom:3 }}>{a.clientName}</div>
                    <div style={{ fontSize:13, color:T.text2 }}>{a.type}</div>
                  </div>
                </div>
                <Pill label={a.status} color={STATUS_COLORS[a.status]||T.text3}/>
              </div>
              <div style={{ display:"flex", gap:16, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <Ic n="clock" s={13} c={T.text3}/>
                  <span style={{ fontSize:12, color:T.text2 }}>{a.time||"—"}</span>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center", flex:1, minWidth:0 }}>
                  <Ic n="pin" s={13} c={T.text3}/>
                  <span style={{ fontSize:12, color:T.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.location||"—"}</span>
                </div>
                <Pill label={a.package} color={pkgColor}/>
              </div>
              {a.notes && <div style={{ marginTop:10, background:T.card2, borderRadius:10, padding:"8px 12px", fontSize:12, color:T.text2 }}>💬 {a.notes}</div>}
              {a.date && <WeatherCard date={a.date} location={a.location||""}/>}
              {isAdmin && (() => {
                const client = data.clients.find(c=>c.name.toLowerCase()===a.clientName.toLowerCase());
                if(!client||!client.totalAmount) return null;
                const debt = client.totalAmount - client.paid;
                return (
                  <div style={{ marginTop:8, display:"flex", gap:10 }}>
                    <div style={{ background:T.green+"1A", borderRadius:8, padding:"5px 10px", fontSize:11, color:T.greenL }}>
                      ✅ {fmt(client.paid)} alındı
                    </div>
                    {debt>0 && <div style={{ background:T.orange+"1A", borderRadius:8, padding:"5px 10px", fontSize:11, color:T.orangeL }}>
                      ⏳ {fmt(debt)} kalan
                    </div>}
                  </div>
                );
              })()}
              {a.status==="onaylı"&&d>=0 && <div style={{ marginTop:8 }}>
                <Pill label={d===0?"Bugün!":d===1?"Yarın!":d<=7?`${d} gün kaldı`:`${d} gün kaldı`} color={d<=1?T.redL:d<=7?T.orangeL:T.text3}/>
              </div>}
            </Card>
          );
        })}
      </div>

      {/* Detail */}
      {detail && (
        <BottomSheet title="Randevu Detayı" onClose={()=>setDetailId(null)}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
            <Pill label={detail.status} color={STATUS_COLORS[detail.status]||T.text3}/>
            <Pill label={detail.type}/>
            <Pill label={detail.package} color={data.packages.find(p=>p.name===detail.package)?.color||T.gold}/>
          </div>
          {[["Müşteri",detail.clientName],["Tarih",fmtDate(detail.date)],["Saat",detail.time||"—"],
            ["Konum",detail.location||"—"],["Notlar",detail.notes||"—"]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
              borderBottom:`1px solid ${T.border}`, paddingBottom:14, marginBottom:14 }}>
              <span style={{ fontSize:13, color:T.text3 }}>{l}</span>
              <span style={{ fontSize:14, fontWeight:500, maxWidth:"60%", textAlign:"right" }}>{v}</span>
            </div>
          ))}
          {(()=>{
            const linkedClientForDetail = data.clients.find(c => c.id===detail.clientId || c.name===detail.clientName);
            const detailExtraDates = (linkedClientForDetail?.extraDates || detail.extraDates || []).filter(Boolean);
            return detailExtraDates.length > 0 && (
              <div style={{ borderBottom:`1px solid ${T.border}`, paddingBottom:14, marginBottom:14 }}>
                <div style={{ fontSize:13, color:T.text3, marginBottom:8 }}>📅 Ek Günler</div>
                {detailExtraDates.map((d,i)=>(
                  <div key={i} style={{ background:T.card2, borderRadius:10, padding:"8px 12px",
                    fontSize:13, fontWeight:500, color:T.text, marginBottom:4 }}>
                    {fmtDate(d)}
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:T.text3, marginBottom:10 }}>Durum Değiştir</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {(isAdmin ? ["onaylı","tamamlandı","bekliyor","iptal"] : ["onaylı","tamamlandı","bekliyor"]).map(s=>(
                <button key={s} onClick={()=>changeStatus(detail.id,s)}
                  style={{ background:detail.status===s?(STATUS_COLORS[s]||T.gold)+"22":"transparent",
                    color:STATUS_COLORS[s]||T.text2, border:`1px solid ${STATUS_COLORS[s]||T.border}44`,
                    borderRadius:99, padding:"7px 14px", fontSize:12, fontWeight:600 }}>
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Hava durumu — butonların altında, tıklamayı engellemez */}
          {detail.date && (
            <div style={{ marginBottom:16, pointerEvents:"none" }}>
              <WeatherCard date={detail.date} location={detail.location||""}/>
            </div>
          )}
          {isAdmin && (
            <GoldButton label="Randevuyu Düzenle" icon="edit" variant="outline" full
              onClick={()=>{
                // Ek tarihler için tek doğru kaynak müşteri kartıdır (appointments'ta kalıcı saklanmıyor)
                const linkedClient = data.clients.find(c => c.id===detail.clientId || c.name===detail.clientName);
                setEditApt({...detail, extraDates: linkedClient?.extraDates || detail.extraDates || []});
              }}
              style={{ marginBottom:10 }}/>
          )}
          {/* Çekim Günü Modu */}
          <button onClick={()=>{ setCekimApt(detail); setShowCekim(true); setDetailId(null); }}
            style={{ width:"100%", background:`linear-gradient(135deg,${T.gold}22,${T.blue}22)`,
              border:`1.5px solid ${T.gold}66`, borderRadius:14, padding:"14px",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:20 }}>📸</span>
            <span style={{ fontSize:15, fontWeight:700, color:T.goldL }}>Çekim Günü Modu</span>
          </button>
          <div style={{ display:"flex", gap:10 }}>
            <GoldButton label="Randevuyu Kopyala" icon="copy" onClick={()=>copyAppointment(detail)} full variant="outline"/>
            {isAdmin && <GoldButton label="Sil" icon="trash" onClick={()=>del(detail.id)} full variant="danger"/>}
          </div>
        </BottomSheet>
      )}

      {/* Randevu Düzenle */}
      {editApt && (
        <BottomSheet title="Randevuyu Düzenle" onClose={()=>setEditApt(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Müşteri Adı" value={editApt.clientName} onChange={v=>setEditApt(p=>({...p,clientName:v}))} placeholder="Ad Soyad" required/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <DatePicker label="Tarih" value={editApt.date} onChange={v=>setEditApt(p=>({...p,date:v}))} required/>
              <Field label="Saat" type="time" value={editApt.time||""} onChange={v=>setEditApt(p=>({...p,time:v}))}/>
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>📅 Ek Günler</span>
                <button onClick={()=>setEditApt(p=>({...p,extraDates:[...(p.extraDates||[]),""]}))}
                  style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:8,
                    padding:"5px 12px", fontSize:12, color:T.goldL, fontWeight:600 }}>
                  + Ek Gün Ekle
                </button>
              </div>
              {(editApt.extraDates||[]).map((d,i)=>(
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-end", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <DatePicker label={`Ek Gün ${i+1}`} value={d}
                      onChange={v=>setEditApt(p=>({...p,extraDates:p.extraDates.map((x,j)=>j===i?v:x)}))}/>
                  </div>
                  <button onClick={()=>setEditApt(p=>({...p,extraDates:p.extraDates.filter((_,j)=>j!==i)}))}
                    style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:10,
                      padding:"11px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ic n="close" s={14} c={T.redL}/>
                  </button>
                </div>
              ))}
            </div>
            <Field label="Konum" value={editApt.location||""} onChange={v=>setEditApt(p=>({...p,location:v}))} placeholder="Düğün salonu..."/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Tür" value={editApt.type} onChange={v=>setEditApt(p=>({...p,type:v}))} options={["Düğün","Nişan","Kına","Portre","Bebek","Mezuniyet","Diğer"]}/>
              <Field label="Paket" value={editApt.package} onChange={v=>setEditApt(p=>({...p,package:v}))} options={data.packages.map(p=>p.name)}/>
            </div>
            <Field label="Notlar" value={editApt.notes||""} onChange={v=>setEditApt(p=>({...p,notes:v}))} textarea placeholder="Özel istekler..."/>
            <GoldButton label="Değişiklikleri Kaydet" icon="check" full onClick={()=>{
              if(!editApt.clientName||!editApt.date) return;
              const finalExtraDates = (editApt.extraDates||[]).filter(Boolean);
              const updatedApt = {...editApt, extraDates: finalExtraDates};
              
              setData(p=>{
                const newAppointments = p.appointments.map(a=>a.id===editApt.id?updatedApt:a);
                // Randevuya bağlı müşteri kartını da senkron tut (isim/tarih/paket/tutar/ek tarihler/notlar)
                const origApt = p.appointments.find(a=>a.id===editApt.id);
                let newClients = p.clients;
                if(origApt) {
                  const client = p.clients.find(c => c.id===origApt.clientId || c.name===origApt.clientName);
                  if(client) {
                    newClients = p.clients.map(c => c.id===client.id ? {
                      ...c,
                      name: updatedApt.clientName || c.name,
                      date: updatedApt.date || c.date,
                      type: updatedApt.type || c.type,
                      package: updatedApt.package || c.package,
                      notes: updatedApt.notes !== undefined ? updatedApt.notes : c.notes,
                      totalAmount: updatedApt.totalAmount!==undefined && updatedApt.totalAmount!=="" ? Number(updatedApt.totalAmount) : c.totalAmount,
                      extraDates: finalExtraDates,
                    } : c);
                    // Diğer randevularda da clientName referansını güncelle (isim değiştiyse)
                    if(updatedApt.clientName && updatedApt.clientName !== origApt.clientName) {
                      return {
                        ...p,
                        appointments: newAppointments.map(a => a.clientId===client.id && a.id!==editApt.id ? {...a, clientName:updatedApt.clientName} : a),
                        clients: newClients,
                      };
                    }
                  }
                }
                return {...p, appointments:newAppointments, clients:newClients};
              });
              // Anında Supabase'e yaz
              sb.upsert("appointments", toDB.appointments(updatedApt)).catch(e=>console.error("Randevu güncelleme hatası:",e));
              const client = data.clients.find(c => c.id===detail.clientId || c.name===detail.clientName);
              if(client) {
                const syncedClient = {
                  ...client,
                  name: updatedApt.clientName || client.name,
                  date: updatedApt.date || client.date,
                  type: updatedApt.type || client.type,
                  package: updatedApt.package || client.package,
                  notes: updatedApt.notes !== undefined ? updatedApt.notes : client.notes,
                  totalAmount: updatedApt.totalAmount!==undefined && updatedApt.totalAmount!=="" ? Number(updatedApt.totalAmount) : client.totalAmount,
                  extraDates: finalExtraDates,
                };
                sb.upsert("clients", toDB.clients(syncedClient)).catch(e=>console.error("Müşteri senkron hatası:",e));
              }
              setEditApt(null);
            }}/>
          </div>
        </BottomSheet>
      )}

      {/* Add */}
      {showAdd && (
        <BottomSheet title="Yeni Randevu" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Müşteri Adı" value={form.clientName} onChange={f("clientName")} placeholder="Ad Soyad" required/>
            {form.clientName.length>1 && (
              data.clients.some(c=>c.name.toLowerCase()===form.clientName.toLowerCase())
              ? <div style={{ background:T.green+"1A", border:`1px solid ${T.green}33`, borderRadius:10,
                  padding:"9px 14px", fontSize:12, color:T.greenL, display:"flex", gap:8, alignItems:"center" }}>
                  <Ic n="check" s={13} c={T.greenL}/> Bu müşteri zaten kayıtlı
                </div>
              : <div style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`, borderRadius:10,
                  padding:"9px 14px", fontSize:12, color:T.blueL, display:"flex", gap:8, alignItems:"center" }}>
                  <Ic n="info" s={13} c={T.blueL}/> Müşteriler listesine otomatik eklenecek
                </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <DatePicker label="Tarih" value={form.date} onChange={f("date")} required/>
              <Field label="Saat" type="time" value={form.time} onChange={f("time")}/>
            </div>
            {/* Ek Günler */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>📅 Ek Günler</span>
                <button onClick={()=>setForm(p=>({...p,extraDates:[...(p.extraDates||[]),""]})) }
                  style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:8,
                    padding:"5px 12px", fontSize:12, color:T.goldL, fontWeight:600 }}>
                  + Ek Gün Ekle
                </button>
              </div>
              {(form.extraDates||[]).map((d,i)=>(
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-end", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <DatePicker label={`Ek Gün ${i+1}`} value={d}
                      onChange={v=>setForm(p=>({...p,extraDates:p.extraDates.map((x,j)=>j===i?v:x)}))}/>
                  </div>
                  <button onClick={()=>setForm(p=>({...p,extraDates:p.extraDates.filter((_,j)=>j!==i)}))}
                    style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:10,
                      padding:"11px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ic n="close" s={14} c={T.redL}/>
                  </button>
                </div>
              ))}
            </div>
            {/* Konum - Arşivden seç veya manuel gir */}
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:6 }}>📍 Konum / Mekan</div>
              {data.locations.length > 0 && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                  {data.locations.map(loc => (
                    <button key={loc.id} onClick={()=>setForm(p=>({...p,location:loc.name}))}
                      style={{ background:form.location===loc.name?T.gold+"33":T.card2,
                        border:`1px solid ${form.location===loc.name?T.gold:T.border}`,
                        borderRadius:20, padding:"5px 12px", fontSize:12, color:form.location===loc.name?T.goldL:T.text2,
                        cursor:"pointer", fontWeight:form.location===loc.name?600:400 }}>
                      {loc.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))}
                  placeholder="Düğün salonu, stüdyo..."
                  style={{ flex:1, background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                    padding:"12px 14px", color:T.text, fontSize:14, outline:"none" }}/>
                {form.location.trim() && !data.locations.some(l=>l.name.toLowerCase()===form.location.toLowerCase()) && (
                  <button onClick={()=>{
                    const newLoc={id:uid(),name:form.location.trim(),address:"",note:""};
                    setData(p=>({...p,locations:[...p.locations,newLoc]}));
                    sb.upsert("locations",toDB.locations(newLoc)).catch(()=>{});
                  }}
                    title="Arşive Kaydet"
                    style={{ background:T.green+"1A", border:`1px solid ${T.green}33`, borderRadius:12,
                      padding:"0 14px", fontSize:12, color:T.greenL, fontWeight:600, flexShrink:0, whiteSpace:"nowrap" }}>
                    + Kaydet
                  </button>
                )}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Tür" value={form.type} onChange={f("type")} options={["Düğün","Nişan","Kına","Portre","Bebek","Mezuniyet","Diğer"]}/>
              <Field label="Paket" value={form.package} onChange={f("package")} options={data.packages.map(p=>p.name)}/>
            </div>
            <Field label="Notlar" value={form.notes} onChange={f("notes")} textarea placeholder="Özel istekler, dikkat edilecekler..."/>

            {/* Ödeme Bilgileri */}
            <div style={{ background:T.card2, borderRadius:14, padding:14 }}>
              <div style={{ fontSize:12, color:T.text3, fontWeight:600, textTransform:"uppercase",
                letterSpacing:"0.5px", marginBottom:12 }}>💰 Ödeme Bilgileri</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Toplam Tutar (₺)" type="number" value={form.totalAmount} onChange={f("totalAmount")} placeholder="0"/>
                <Field label="Alınan Kapora (₺)" type="number" value={form.kapora} onChange={f("kapora")} placeholder="0"/>
              </div>
              {(Number(form.totalAmount)>0 || Number(form.kapora)>0) && (
                <div className="fade-in" style={{ marginTop:10, display:"flex", justifyContent:"space-between",
                  background:T.card3, borderRadius:10, padding:"10px 12px" }}>
                  <span style={{ fontSize:12, color:T.text3 }}>Kalan Borç</span>
                  <span style={{ fontSize:14, fontWeight:700, color:T.orangeL }}>
                    {fmt(Math.max(0, (Number(form.totalAmount)||0) - (Number(form.kapora)||0)))}
                  </span>
                </div>
              )}
              <div style={{ fontSize:11, color:T.text3, marginTop:8 }}>
                💡 Müşteriler bölümüne otomatik aktarılır
              </div>
            </div>

            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:10 }}>🔔 Kaç gün önce hatırlat?</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[1,2,3,7,14,30].map(d=>(
                  <button key={d} onClick={()=>setForm(p=>({...p,reminderDays:d}))}
                    style={{ background:form.reminderDays===d?T.gold:T.card2,
                      color:form.reminderDays===d?T.bg:T.text2,
                      border:`1px solid ${form.reminderDays===d?T.gold:T.border}`,
                      borderRadius:10, padding:"9px 14px", fontSize:13, fontWeight:600, transition:"all 0.15s" }}>
                    {d===7?"1 hafta":d===14?"2 hafta":d===30?"1 ay":`${d} gün`}
                  </button>
                ))}
              </div>
            </div>
            <GoldButton label="Randevuyu Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}

      {/* ÇEKİM GÜNÜ MODU */}
      {showCekim && cekimApt && (
        <CekimGunuModu
          apt={cekimApt}
          data={data}
          onClose={()=>{ setShowCekim(false); setCekimApt(null); }}
          onComplete={()=>{
            setData(p=>({...p, appointments:p.appointments.map(a=>a.id===cekimApt.id?{...a,status:"tamamlandı"}:a)}));
            setShowCekim(false); setCekimApt(null);
          }}
        />
      )}

      {/* Randevu Limiti Doldu Modal */}
      {showLimitModal && (
        <BottomSheet title="Randevu Limiti" onClose={()=>setShowLimitModal(false)}>
          <ProGate check={aptLimitCheck} featureLabel="Randevu" onUpgrade={()=>{ setShowLimitModal(false); setActive && setActive("planyonetimi"); }} />
        </BottomSheet>
      )}

    </div>
  );
};

// ════════════════════════════════════════════════
// MÜŞTERİLER
// ════════════════════════════════════════════════
