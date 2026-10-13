import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, initProcess, isComplete } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo, WeatherCard, CekimGunuModu } from "../common";
import { UsageBadge, ProGate } from "../common/ProGate";
import { canAddAppointment, canAddClient } from "../../services/plan";
import { staffIdsOf, staffNameOf, assignmentNotifications, assignmentWhatsApp } from "../../services/staffNotify";
import { sb, fromDB, toDB, IS_CLOUD } from "../../services/supabase";
import { submitAppointment } from "../../services/auth";
import { getPass, setPass, getSession, saveSession, clearSession, getStudioInfo } from "../../services/storage";

// Randevuya personel atama (çoklu seçim)
const StaffPicker = ({ team, value, onChange }) => {
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <div>
      <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
        <span>👤</span> Görevli Personel / Fotoğrafçı
        <span style={{ fontSize:10, color:T.text3, fontWeight:400 }}>(birden fazla seçilebilir — seçilenlere bildirim gider)</span>
      </div>
      {team.length === 0 ? (
        <div style={{ fontSize:12, color:T.text3, background:T.card2, border:`1px dashed ${T.border}`, borderRadius:12, padding:"10px 12px" }}>
          Henüz ekip üyesi yok. "Ekip & Shift" bölümünden personel ekleyebilirsiniz.
        </div>
      ) : (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {team.map(m => {
            const on = value.includes(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggle(m.id)}
                style={{ background: on ? T.gold+"33" : T.card2, border:`1px solid ${on ? T.gold : T.border}`,
                  borderRadius:20, padding:"6px 12px", fontSize:12, color: on ? T.goldL : T.text2,
                  cursor:"pointer", fontWeight: on ? 600 : 400 }}>
                {on ? "✓ " : ""}{m.name}{!m.phone ? " (tel yok)" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Ajanda = ({ data: fullData, setData, role, plan, setActive, staffId }) => {
  const isAdmin = role === "admin";
  // Onay bekleyen randevular ayrı listelenir; takvim, limit ve sayımlar yalnızca onaylılarla yapılır
  const pending = (fullData.appointments || []).filter(a => a.approval === "bekliyor");
  const data = pending.length ? { ...fullData, appointments: fullData.appointments.filter(a => a.approval !== "bekliyor") } : fullData;
  const [requestSent, setRequestSent] = useState(null);   // personel: "Yönetici onayı bekleniyor" penceresi
  const [approveApt, setApproveApt] = useState(null);     // yönetici: onay penceresi
  const [approveForm, setApproveForm] = useState({ totalAmount:"", kapora:"" });
  const [busy, setBusy] = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null); // hangi limit doldu: randevu / müşteri
  const [notifyInfo, setNotifyInfo] = useState(null); // personel bilgilendirme penceresi

  // Atanan personele uygulama içi bildirim oluşturur ve WhatsApp bilgilendirme penceresini açar
  const notifyStaff = (apt, memberIds) => {
    const team = data.team || [];
    const ids = memberIds.filter(id => team.some(m => m.id === id));
    if (!ids.length) return;
    const notes = assignmentNotifications(apt, ids, team);
    setData(p => ({ ...p, notifications: [...(p.notifications || []), ...notes] }));
    notes.forEach(n => sb.upsert("notifications", toDB.notifications(n)).catch(() => {}));
    setNotifyInfo({ apt, members: ids.map(id => team.find(m => m.id === id)) });
  };
  const [detailId,  setDetailId]  = useState(null);
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [showCekim, setShowCekim] = useState(false);
  const [cekimApt,  setCekimApt]  = useState(null);
  const F = { clientName:"", clientPhone:"", date:"", time:"14:00", location:"", type:"Düğün", package:"Bronz Paket", notes:"", reminderDays:3, status:"onaylı", totalAmount:"", kapora:"", extraDates:[], staffName:"", equipmentReady:false, equipmentReadyBy:"", equipmentReadyAt:"" };
  const [form, setForm] = useState(F);
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const [editApt, setEditApt] = useState(null);
  const ea = k => v => setEditApt(p=>({...p,[k]:v}));

  const aptLimitCheck = canAddAppointment(data);

  // detail her zaman data'dan türetiliyor → tek kaynak
  const detail = detailId ? fullData.appointments.find(a => a.id === detailId) || null : null;

  const handleOpenAdd = () => {
    if (!aptLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    setShowAdd(true);
  };

  // Personel: randevu talebi gönderir, yönetici onaylayınca sisteme eklenir
  const sendRequest = async () => {
    if (busy) return;
    const req = { ...form, id: uid(), totalAmount: 0, kapora: 0, extraDates: (form.extraDates||[]).filter(Boolean) };
    setBusy(true);
    try {
      if (IS_CLOUD) await submitAppointment(req);
    } catch (e) {
      alert("Randevu gönderilemedi: " + e.message);
      setBusy(false);
      return;
    }
    const me = (data.team||[]).find(m => String(m.id) === String(staffId));
    const local = { ...req, approval: "bekliyor", requestedBy: String(staffId||""),
      requestInfo: { client_phone: req.clientPhone||"", extra_dates: req.extraDates, requested_by_name: me?.name || "Personel" } };
    setData(p => ({ ...p, appointments: [...p.appointments, local] }));
    setBusy(false);
    setShowAdd(false); setForm(F);
    setRequestSent(local);
  };

  const save = () => {
    if(!form.clientName||!form.date) return;
    if(!isAdmin) { sendRequest(); return; }
    if(!aptLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    if(commitAppointment(form)) { setShowAdd(false); setForm(F); }
  };

  // Randevuyu sisteme ekler (müşteri kartı, hatırlatıcı, kapora). fromRequest: onaylanan personel talebi
  const commitAppointment = (form, fromRequest = null) => {
    const total  = Number(form.totalAmount)||0;
    const kapora = Number(form.kapora)||0;

    const existingClient = data.clients.find(c=>c.name.toLowerCase()===form.clientName.toLowerCase());
    // Yeni isimle randevu yeni müşteri oluşturur: müşteri limitine de tabi
    if(!existingClient) {
      const clientCheck = canAddClient(data);
      if(!clientCheck.allowed) {
        setLimitInfo({ check:clientCheck, label:"Müşteri" });
        setShowLimitModal(true);
        return false;
      }
    }

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
    const newA = { ...form, id: fromRequest ? fromRequest.id : uid(), clientId: existingClient ? existingClient.id : newClientId,
      approval: "onaylandı", requestedBy: fromRequest?.requestedBy || "", requestInfo: fromRequest?.requestInfo || {} };

    let updatedClients;
    let syncedClientForDB;
    const cleanExtraDates = (form.extraDates||[]).filter(Boolean);
    if(existingClient) {
      const mergedClient = {
        ...existingClient,
        phone: existingClient.phone || (form.clientPhone||"").trim(),
        totalAmount: total>0 ? total : existingClient.totalAmount,
        paid: existingClient.paid + kapora,
        payments: [...(existingClient.payments||[]), ...kaporaPayment],
        extraDates: cleanExtraDates.length>0 ? cleanExtraDates : existingClient.extraDates,
      };
      updatedClients = data.clients.map(c => c.id===existingClient.id ? mergedClient : c);
      syncedClientForDB = mergedClient;
    } else {
      const newClient = {
        id: newClientId, name: form.clientName, phone:(form.clientPhone||"").trim(), email:"",
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
      appointments: fromRequest ? p.appointments.map(a => a.id === newA.id ? newA : a) : [...p.appointments, newA],
      clients:      updatedClients,
      incomes:      kaporaIncome ? [...p.incomes, kaporaIncome] : p.incomes,
      reminders:    [...p.reminders, ...newReminders]
    }));
    // Anında Supabase'e yaz — randevu + müşteri + hatırlatıcı + kapora
    sb.upsert("appointments", toDB.appointments(newA)).catch(e=>console.error("Randevu kayıt hatası:",e));
    sb.upsert("clients", toDB.clients(syncedClientForDB)).catch(e=>console.error("Müşteri kayıt hatası:",e));
    newReminders.forEach(r => sb.upsert("reminders", toDB.reminders(r)).catch(()=>{}));
    if(kaporaIncome) sb.upsert("incomes", toDB.incomes(kaporaIncome)).catch(()=>{});
    if (fromRequest?.requestedBy) tellRequester(fromRequest, true);
    notifyStaff(newA, staffIdsOf(newA, data.team||[]));
    return true;
  };

  // Talebi gönderen personele sonucu bildir
  const tellRequester = (apt, ok) => {
    const n = { id: uid(), teamId: String(apt.requestedBy), memberName: apt.requestInfo?.requested_by_name || "",
      appointmentId: apt.id,
      title: ok ? `Randevu onaylandı: ${apt.clientName} — ${apt.type || "Çekim"}` : `Randevu talebi onaylanmadı: ${apt.clientName}`,
      body: `${apt.date ? fmtDate(apt.date) : ""}${apt.location ? " • " + apt.location : ""}${ok ? " • Sisteme eklendi" : " • Yönetici reddetti"}`,
      createdAt: new Date().toISOString(), date: todayStr(), read: false };
    setData(p => ({ ...p, notifications: [...(p.notifications||[]), n] }));
    sb.upsert("notifications", toDB.notifications(n)).catch(()=>{});
  };
  const openApprove = (apt) => { setApproveApt(apt); setApproveForm({ totalAmount:"", kapora:"" }); };
  const approve = () => {
    const apt = approveApt;
    if (!apt) return;
    if (!aptLimitCheck.allowed) { setApproveApt(null); setShowLimitModal(true); return; }
    const src = { ...F, ...apt, clientPhone: apt.requestInfo?.client_phone || "", extraDates: apt.requestInfo?.extra_dates || [],
      totalAmount: approveForm.totalAmount, kapora: approveForm.kapora };
    if (commitAppointment(src, apt)) setApproveApt(null);
  };
  const reject = (apt) => {
    if (!confirm(`${apt.clientName} randevu talebi reddedilsin mi? Talep silinir ve personele bildirilir.`)) return;
    sb.delete("appointments", apt.id).catch(()=>{});
    setData(p => ({ ...p, appointments: p.appointments.filter(a => a.id !== apt.id) }));
    if (apt.requestedBy) tellRequester(apt, false);
    setApproveApt(null);
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
      status:"bekliyor", totalAmount:apt.totalAmount||"", kapora:"", extraDates:[],
      staffName:apt.staffName||"", staffIds:staffIdsOf(apt, data.team||[]), equipmentReady:false, equipmentReadyBy:"", equipmentReadyAt:"" });
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
      <PageHeader title="Ajanda" sub={`${data.appointments.length} randevu`} action onAction={handleOpenAdd} actionLabel={isAdmin ? "Randevu Ekle" : "Randevu Talebi"}/>

      {/* Onay bekleyen randevular: yönetici onaylar / reddeder, personel kendi talebinin durumunu görür */}
      {pending.length > 0 && (
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.orangeL, textTransform:"uppercase", letterSpacing:0.6, marginBottom:10 }}>
            ⏳ {isAdmin ? `Onayınızı bekleyen randevular (${pending.length})` : "Yönetici onayı bekleyenler"}
          </div>
          {pending.sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(a => (
            <Card key={a.id} style={{ marginBottom:10, borderColor:T.orange+"66", background:T.orange+"0D" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{a.clientName} <span style={{ fontWeight:500, color:T.text3, fontSize:13 }}>· {a.type}</span></div>
                  <div style={{ fontSize:12.5, color:T.text2, marginTop:4 }}>
                    📅 {fmtDate(a.date)}{a.time ? ` · ${a.time}` : ""}{a.location ? ` · 📍 ${a.location}` : ""}
                  </div>
                  {a.staffName && <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>👤 Görevli: {a.staffName}</div>}
                  {isAdmin && <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>✍️ Ekleyen: <b style={{ color:T.text2 }}>{a.requestInfo?.requested_by_name || "Personel"}</b></div>}
                </div>
                <Pill label="Onay bekliyor" color={T.orangeL}/>
              </div>
              {isAdmin ? (
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={()=>openApprove(a)}
                    style={{ flex:1, background:T.green+"22", border:`1px solid ${T.green}66`, color:T.greenL, borderRadius:10, padding:"9px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    ✓ Onayla
                  </button>
                  <button onClick={()=>reject(a)}
                    style={{ flex:1, background:"transparent", border:`1px solid ${T.red}55`, color:T.redL, borderRadius:10, padding:"9px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    ✕ Reddet
                  </button>
                </div>
              ) : (
                <div style={{ marginTop:10, fontSize:12, color:T.text3, lineHeight:1.5 }}>
                  Yönetici onayladığında sisteme eklenecek ve size bildirim gelecek.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Plan Kullanım Rozeti - Basic ise */}
      {isAdmin && !aptLimitCheck.isPro && (
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

      <div className="card-list" style={{ padding:"0 20px" }}>
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
              {a.staffName && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.text3 }}>
                  <span>👤 Görevli:</span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{a.staffName}</span>
                  {a.equipmentReady ? (
                    <span style={{ color: "#4ade80", fontWeight: 700, marginLeft: 4 }}>• Ekipman Hazır ✅</span>
                  ) : (
                    <span style={{ color: "#fbbf24", fontWeight: 500, marginLeft: 4 }}>• Ekipman Bekleniyor 🎒</span>
                  )}
                </div>
              )}
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

              {/* Hızlı Eylemler (WhatsApp & Altın Saat) */}
              <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cl = data.clients.find(c => c.name.toLowerCase() === a.clientName.toLowerCase() || c.id === a.clientId);
                    const rawPh = cl?.phone || "";
                    const ph = rawPh.replace(/\D/g, "").replace(/^0/, "");
                    const msg = `Merhaba ${a.clientName}! ${fmtDate(a.date)} tarihindeki saat ${a.time || "14:00"}'da gerçekleşecek ${a.type} çekiminiz için hatırlatmak istedik. Görüşmek üzere! — ${getStudioInfo().unvan || "Stüdyomuz"}`;
                    if (ph) {
                      window.open(`https://wa.me/90${ph}?text=${encodeURIComponent(msg)}`, "_blank");
                    } else {
                      const ask = prompt(`${a.clientName} için telefon numarası girin:`, "05");
                      if (ask) {
                        const clean = ask.replace(/\D/g, "").replace(/^0/, "");
                        window.open(`https://wa.me/90${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(37, 211, 102, 0.12)",
                    border: "1px solid rgba(37, 211, 102, 0.3)",
                    color: "#25D366",
                    borderRadius: 10,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5
                  }}
                >
                  <span>💬</span> WhatsApp
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setActive) setActive("altinsaat");
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(232, 197, 71, 0.12)",
                    border: "1px solid rgba(232, 197, 71, 0.3)",
                    color: T.goldL,
                    borderRadius: 10,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5
                  }}
                >
                  <span>🌅</span> Altın Saat
                </button>
              </div>
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

          {/* Görevli Personel ve Ekipman Hazırlık Durumu */}
          <div style={{
            background: detail.equipmentReady ? "rgba(34, 197, 94, 0.08)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${detail.equipmentReady ? "rgba(34, 197, 94, 0.3)" : T.border}`,
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>👤</span>
                <div>
                  <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Görevli Personel
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginTop: 1 }}>
                    {detail.staffName || "Henüz atanmadı"}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                  Ekipman Durumu
                </div>
                <div style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: detail.equipmentReady ? "#4ade80" : "#fbbf24",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  justifyContent: "flex-end"
                }}>
                  {detail.equipmentReady ? `✅ Hazırlandı (${detail.equipmentReadyBy || detail.staffName || "Personel"})` : "⏳ Hazırlık Bekleniyor"}
                </div>
              </div>
            </div>
          </div>

          {isAdmin && <div style={{ marginBottom:16 }}>
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
          </div>}
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

          {/* WhatsApp Butonu */}
          {(() => {
            const cl = data.clients.find(c => c.name.toLowerCase() === detail.clientName.toLowerCase() || c.id === detail.clientId);
            const rawPh = cl?.phone || "";
            const ph = rawPh.replace(/\D/g, "").replace(/^0/, "");
            return (
              <button
                onClick={() => {
                  const msg = `Merhaba ${detail.clientName}! ${fmtDate(detail.date)} tarihindeki saat ${detail.time || "14:00"}'da gerçekleşecek ${detail.type} çekiminiz için hatırlatmak istedik. Sorularınız için bize yazabilirsiniz! — ${getStudioInfo().unvan || "Stüdyomuz"}`;
                  if (ph) {
                    window.open(`https://wa.me/90${ph}?text=${encodeURIComponent(msg)}`, "_blank");
                  } else {
                    const ask = prompt(`${detail.clientName} için telefon numarası girin:`, "05");
                    if (ask) {
                      const clean = ask.replace(/\D/g, "").replace(/^0/, "");
                      window.open(`https://wa.me/90${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                    }
                  }
                }}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "13px",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 10
                }}
              >
                <span>💬</span> WhatsApp ile Hatırlat / Mesaj Gönder
              </button>
            );
          })()}

          {/* Çekim Günü Modu */}
          <button onClick={()=>{ setCekimApt(detail); setShowCekim(true); setDetailId(null); }}
            style={{ width:"100%", background:`linear-gradient(135deg,${T.gold}22,${T.blue}22)`,
              border:`1.5px solid ${T.gold}66`, borderRadius:14, padding:"14px",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:20 }}>📸</span>
            <span style={{ fontSize:15, fontWeight:700, color:T.goldL }}>Çekim Günü Modu</span>
          </button>
          <div style={{ display:"flex", gap:10 }}>
            {isAdmin && <GoldButton label="Randevuyu Kopyala" icon="copy" onClick={()=>copyAppointment(detail)} full variant="outline"/>}
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

            {/* Görevli Personel — birden fazla kişi atanabilir, atananlara bildirim gider */}
            <StaffPicker team={data.team||[]} value={staffIdsOf(editApt, data.team||[])}
              onChange={ids => setEditApt(p => ({ ...p, staffIds: ids, staffName: staffNameOf(ids, data.team||[]) }))}/>

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
              const beforeIds = staffIdsOf(data.appointments.find(a=>a.id===editApt.id), data.team||[]);
              const addedIds = staffIdsOf(updatedApt, data.team||[]).filter(id=>!beforeIds.includes(id));
              setEditApt(null);
              notifyStaff(updatedApt, addedIds);
            }}/>
          </div>
        </BottomSheet>
      )}

      {/* Add */}
      {showAdd && (
        <BottomSheet title={isAdmin ? "Yeni Randevu" : "Randevu Talebi"} onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {!isAdmin && (
              <div style={{ background:T.orange+"14", border:`1px solid ${T.orange}44`, borderRadius:12, padding:"10px 14px", fontSize:12.5, color:T.orangeL, lineHeight:1.5 }}>
                ⏳ Eklediğiniz randevu yönetici onayından sonra sisteme eklenir.
              </div>
            )}
            <Field label="Müşteri Adı" value={form.clientName} onChange={f("clientName")} placeholder="Ad Soyad" required/>
            {form.clientName.length>1 && (
              data.clients.some(c=>c.name.toLowerCase()===form.clientName.toLowerCase())
              ? <div style={{ background:T.green+"1A", border:`1px solid ${T.green}33`, borderRadius:10,
                  padding:"9px 14px", fontSize:12, color:T.greenL, display:"flex", gap:8, alignItems:"center" }}>
                  <Ic n="check" s={13} c={T.greenL}/> Bu müşteri zaten kayıtlı
                </div>
              : <div style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`, borderRadius:10,
                  padding:"9px 14px", fontSize:12, color:T.blueL, display:"flex", gap:8, alignItems:"center" }}>
                  <Ic n="info" s={13} c={T.blueL}/> {isAdmin ? "Müşteriler listesine otomatik eklenecek" : "Onaylanınca müşteriler listesine eklenecek"}
                </div>
            )}
            {form.clientName.length>1 && !data.clients.some(c=>c.name.toLowerCase()===form.clientName.toLowerCase() && c.phone) && (
              <Field label="Telefon" type="tel" value={form.clientPhone} onChange={f("clientPhone")} placeholder="05xx xxx xx xx"/>
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
                {isAdmin && form.location.trim() && !data.locations.some(l=>l.name.toLowerCase()===form.location.toLowerCase()) && (
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

            {/* Görevli Personel — birden fazla kişi atanabilir, atananlara bildirim gider */}
            <StaffPicker team={data.team||[]} value={staffIdsOf(form, data.team||[])}
              onChange={ids => setForm(p => ({ ...p, staffIds: ids, staffName: staffNameOf(ids, data.team||[]) }))}/>

            {/* Ödeme Bilgileri — yalnızca yönetici */}
            {isAdmin && <div style={{ background:T.card2, borderRadius:14, padding:14 }}>
              <div style={{ fontSize:12, color:T.text3, fontWeight:600, textTransform:"uppercase",
                letterSpacing:"0.5px", marginBottom:12 }}>💰 Ödeme Bilgileri</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Toplam Tutar" type="number" value={form.totalAmount} onChange={f("totalAmount")} placeholder="0"/>
                <Field label="Alınan Kapora" type="number" value={form.kapora} onChange={f("kapora")} placeholder="0"/>
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
            </div>}

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
            <GoldButton label={isAdmin ? "Randevuyu Kaydet" : (busy ? "Gönderiliyor..." : "Onaya Gönder")} icon="check" onClick={save} full/>
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
      {notifyInfo && (
        <BottomSheet title="Personeli Bilgilendir" onClose={()=>setNotifyInfo(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:T.green+"1A", border:`1px solid ${T.green}33`, borderRadius:12, padding:"10px 14px", fontSize:12.5, color:T.greenL, lineHeight:1.5 }}>
              ✅ Atanan personele uygulama içi bildirim gönderildi. Personel girişinde zil simgesinde görecekler.
            </div>
            <div style={{ fontSize:12.5, color:T.text2, lineHeight:1.5 }}>
              <b>{notifyInfo.apt.clientName}</b> — {notifyInfo.apt.type} görevini WhatsApp ile de iletebilirsiniz:
            </div>
            {notifyInfo.members.map(m => {
              const link = assignmentWhatsApp(m, notifyInfo.apt);
              return (
                <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 12px" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{m.name}</div>
                    <div style={{ fontSize:11.5, color:T.text3 }}>{m.phone || "Telefon kayıtlı değil — Ekip'ten ekleyin"}</div>
                  </div>
                  {link && (
                    <button onClick={()=>window.open(link, "_blank")}
                      style={{ background:"#25D36622", border:"1px solid #25D36655", color:"#25D366", borderRadius:10, padding:"8px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      💬 WhatsApp
                    </button>
                  )}
                </div>
              );
            })}
            <GoldButton label="Tamam" full onClick={()=>setNotifyInfo(null)}/>
          </div>
        </BottomSheet>
      )}

      {requestSent && (
        <BottomSheet title="Yönetici Onayı Bekleniyor" onClose={()=>setRequestSent(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14, alignItems:"center", textAlign:"center" }}>
            <div style={{ fontSize:44 }}>⏳</div>
            <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{requestSent.clientName} — {requestSent.type}</div>
            <div style={{ fontSize:13.5, color:T.text2, lineHeight:1.6 }}>
              Randevu talebiniz yöneticiye gönderildi.<br/>
              <b style={{ color:T.orangeL }}>Yönetici onayı bekleniyor</b>, onaylandıktan sonra sisteme eklenecek ve size bildirim gelecek.
            </div>
            <GoldButton label="Tamam" full onClick={()=>setRequestSent(null)}/>
          </div>
        </BottomSheet>
      )}

      {approveApt && (
        <BottomSheet title="Randevuyu Onayla" onClose={()=>setApproveApt(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:T.card2, borderRadius:12, padding:"12px 14px", fontSize:13, color:T.text2, lineHeight:1.7 }}>
              <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{approveApt.clientName} — {approveApt.type}</div>
              📅 {fmtDate(approveApt.date)}{approveApt.time ? ` · ${approveApt.time}` : ""}<br/>
              {approveApt.location && <>📍 {approveApt.location}<br/></>}
              {approveApt.requestInfo?.client_phone && <>📞 {approveApt.requestInfo.client_phone}<br/></>}
              {approveApt.staffName && <>👤 Görevli: {approveApt.staffName}<br/></>}
              ✍️ Ekleyen: {approveApt.requestInfo?.requested_by_name || "Personel"}
              {approveApt.notes && <div style={{ marginTop:6 }}>💬 {approveApt.notes}</div>}
            </div>
            <div style={{ fontSize:12, color:T.text3 }}>İsterseniz ücret bilgisini şimdi girin (personel göremez):</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Toplam Tutar" type="number" value={approveForm.totalAmount} onChange={v=>setApproveForm(p=>({...p,totalAmount:v}))} placeholder="0"/>
              <Field label="Alınan Kapora" type="number" value={approveForm.kapora} onChange={v=>setApproveForm(p=>({...p,kapora:v}))} placeholder="0"/>
            </div>
            <GoldButton label="Onayla ve Sisteme Ekle" icon="check" full onClick={approve}/>
            <GoldButton label="Reddet" variant="danger" full onClick={()=>reject(approveApt)}/>
          </div>
        </BottomSheet>
      )}

      {showLimitModal && (
        <BottomSheet title={`${limitInfo?.label||"Randevu"} Limiti`} onClose={()=>{ setShowLimitModal(false); setLimitInfo(null); }}>
          <ProGate check={limitInfo?.check||aptLimitCheck} featureLabel={limitInfo?.label||"Randevu"} onUpgrade={()=>{ setShowLimitModal(false); setLimitInfo(null); setActive && setActive("planyonetimi"); }} />
        </BottomSheet>
      )}

    </div>
  );
};

// ════════════════════════════════════════════════
// MÜŞTERİLER
// ════════════════════════════════════════════════
