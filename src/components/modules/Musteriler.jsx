import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE , initProcess, isComplete } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { UsageBadge, ProGate } from "../common/ProGate";
import { canAddClient } from "../../services/plan";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Musteriler = ({ data, setData, role, plan, setActive, initialClientId, onConsumeInitialClientId }) => {
  const isAdmin = role === "admin";
  const [showAdd,        setShowAdd]        = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [detailId,       setDetailId]       = useState(null);
  const [showPayment,    setShowPayment]    = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [showDeleted,    setShowDeleted]    = useState(false);
  const [pkgFilter,      setPkgFilter]      = useState("Tümü");
  const [search,         setSearch]         = useState("");
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [editTotal,   setEditTotal]   = useState(null);

  const [showEditClient, setShowEditClient] = useState(false);
  const [editClientForm, setEditClientForm] = useState(null);

  // Başka sekmeden (Takvim) belirli bir müşteri kartı açılması istendiyse
  useEffect(() => {
    if(initialClientId) {
      setDetailId(initialClientId);
      if(onConsumeInitialClientId) onConsumeInitialClientId();
    }
  }, [initialClientId]);

  // detail her zaman data.clients'tan türetiliyor → tek kaynak
  const detail = detailId ? data.clients.find(c => c.id === detailId) || null : null;

  const clientLimitCheck = canAddClient(data);

  const handleOpenAdd = () => {
    if (!clientLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    setShowAdd(true);
  };

  const F  = { name:"",phone:"",email:"",type:"Düğün",package:"Bronz Paket",notes:"",date:"",extraDates:[],totalAmount:"",paid:"",status:"aktif",referralSource:"",referralName:"",anniversaryDate:"" };
  const FP = { amount:"", promiseDate:"", note:"", type:"Ödeme Alındı", payDate:todayStr() };
  const [form,  setForm]  = useState(F);
  const [pForm, setPForm] = useState(FP);
  const f  = k => v => setForm(p=>({...p,[k]:v}));
  const pf = k => v => setPForm(p=>({...p,[k]:v}));
  const ecf = k => v => setEditClientForm(p=>({...p,[k]:v}));

  // Müşteriyi güncelle — randevuları da otomatik senkronlar
  const updateClient = (id, patch) => {
    setData(p => {
      const newClients = p.clients.map(c => c.id===id ? {...c, ...patch} : c);
      const targetClient = p.clients.find(c => c.id===id);
      const oldName = targetClient?.name;
      const newAppointments = p.appointments.map(a => {
        if(a.clientId === id || (oldName && a.clientName === oldName)) {
          return {
            ...a,
            clientName: patch.name || a.clientName,
            date: patch.date || a.date,
            type: patch.type || a.type,
            package: patch.package || a.package,
            notes: patch.notes !== undefined ? patch.notes : a.notes,
            extraDates: patch.extraDates !== undefined ? patch.extraDates : a.extraDates,
          };
        }
        return a;
      });
      return { ...p, clients: newClients, appointments: newAppointments };
    });
    const client = data.clients.find(c=>c.id===id);
    if(client) {
      sb.upsert("clients", toDB.clients({...client, ...patch})).catch(()=>{});
      const matchingApt = data.appointments.find(a => a.clientId === id || a.clientName === client.name);
      if(matchingApt) {
        sb.upsert("appointments", toDB.appointments({
          ...matchingApt,
          clientName: patch.name || matchingApt.clientName,
          date: patch.date || matchingApt.date,
          type: patch.type || matchingApt.type,
          package: patch.package || matchingApt.package,
          notes: patch.notes !== undefined ? patch.notes : matchingApt.notes,
          extraDates: patch.extraDates !== undefined ? patch.extraDates : matchingApt.extraDates,
        })).catch(()=>{});
      }
    }
  };

  const saveEditClient = () => {
    if(!editClientForm || !editClientForm.name) return;
    const finalExtraDates = (editClientForm.extraDates||[]).filter(Boolean);
    updateClient(editClientForm.id, {
      name:            editClientForm.name,
      phone:           editClientForm.phone||"",
      email:           editClientForm.email||"",
      type:            editClientForm.type,
      package:         editClientForm.package,
      date:            editClientForm.date,
      extraDates:      finalExtraDates,
      notes:           editClientForm.notes||"",
      status:          editClientForm.status,
      referralSource:  editClientForm.referralSource||"",
      referralName:    editClientForm.referralName||"",
      anniversaryDate: editClientForm.anniversaryDate||"",
    });
    setShowEditClient(false);
    setEditClientForm(null);
  };

  const save = () => {
    if(!form.name||!form.phone) return;
    if(!clientLimitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }
    const totalAmt = Number(form.totalAmount)||0;
    const kaporaAmt = Number(form.paid)||0;
    const newClientId = uid();
    const kaporaPayment = kaporaAmt > 0 ? [{
      id: uid(), amount: kaporaAmt, type: "Ödeme Alındı",
      date: todayStr(), note: "Kapora", done: false
    }] : [];
    const kaporaIncome = kaporaAmt > 0 ? {
      id: kaporaPayment[0]?.id || uid(),
      clientName: form.name, amount: kaporaAmt,
      type: "Kapora", method: "Nakit",
      date: todayStr(), note: "", category: form.type||"Düğün"
    } : null;
    // Yıldönümü hatırlatıcısı
    const anniversaryReminders = [];
    if(form.anniversaryDate) {
      const [, annMM, annDD] = form.anniversaryDate.split("-");
      const nextYear = new Date().getFullYear() + (new Date() > new Date(`${new Date().getFullYear()}-${annMM}-${annDD}`) ? 1 : 0);
      const trigDate = `${nextYear}-${annMM}-${annDD}`;
      const remD = new Date(trigDate + "T12:00:00");
      remD.setDate(remD.getDate() - 7);
      anniversaryReminders.push({
        id: uid(), title: `💍 ${form.name} — Yıldönümü (${annDD}/${annMM})`,
        linkedType: "manual", linkedId: newClientId,
        triggerDate: remD.toISOString().split("T")[0],
        triggerTime: "09:00", daysBefore: 7, done: false, recurring: true
      });
    }
    setData(p => {
      const newClient = {
        ...form, id: newClientId,
        totalAmount: totalAmt,
        paid: kaporaAmt,
        payments: kaporaPayment,
        process: initProcess()
      };
      // Otomatik ajanda randevusu — tarih olmasa bile oluştur
      const newAppointment = {
        id: uid(),
        clientName: form.name,
        clientId: newClientId,
        date: form.date || "",
        extraDates: form.extraDates||[],
        time: "",
        location: "",
        type: form.type || "Düğün",
        package: form.package || "Bronz Paket",
        notes: form.notes || "",
        reminderDays: 3,
        status: form.date ? "onaylı" : "bekliyor",
        totalAmount: String(totalAmt),
        kapora: String(kaporaAmt),
      };
      return {
        ...p,
        clients: [...p.clients, newClient],
        appointments: [...p.appointments, newAppointment],
        incomes: kaporaIncome ? [...p.incomes, kaporaIncome] : p.incomes,
        reminders: anniversaryReminders.length > 0 ? [...p.reminders, ...anniversaryReminders] : p.reminders,
      };
    });
    // Anında Supabase'e yaz — polling ezmesin
    const newClientObj = {
      ...form, id: newClientId,
      totalAmount: totalAmt,
      paid: kaporaAmt,
      payments: kaporaAmt > 0 ? [{id: kaporaPayment[0]?.id||uid(), amount:kaporaAmt, type:"Ödeme Alındı", date:todayStr(), note:"Kapora", done:false}] : [],
      process: initProcess()
    };
    sb.upsert("clients", toDB.clients(newClientObj)).catch(e=>console.error("Client kayıt hatası:",e));
    const newAptObj = {
      id: uid(), clientName: form.name, clientId: newClientId,
      date: form.date||"", extraDates: form.extraDates||[], time:"", location:"",
      type: form.type||"Düğün", package: form.package||"Bronz Paket",
      notes: form.notes||"", reminderDays:3,
      status: form.date?"onaylı":"bekliyor",
      totalAmount: String(totalAmt), kapora: String(kaporaAmt),
    };
    sb.upsert("appointments", toDB.appointments(newAptObj)).catch(e=>console.error("Randevu kayıt hatası:",e));
    if(kaporaIncome) sb.upsert("incomes", toDB.incomes(kaporaIncome)).catch(()=>{});
    anniversaryReminders.forEach(r => sb.upsert("reminders", toDB.reminders(r)).catch(()=>{}));
    setShowAdd(false); setForm(F);
  };

  const savePayment = () => {
    if(!pForm.amount || !detail) return;
    const amt     = Number(pForm.amount);
    const payId   = uid();
    const payDate = pForm.payDate || todayStr();
    const payment = { id:payId, amount:amt, type:pForm.type,
      promiseDate:pForm.promiseDate, note:pForm.note, date:payDate, done:false };
    const newPaid = pForm.type==="Ödeme Alındı" ? detail.paid + amt : detail.paid;

    let newReminder = null;
    if(pForm.type==="Ödeme Sözü" && pForm.promiseDate) {
      newReminder = { id:uid(), title:`💰 ${detail.name} — Ödeme Günü`,
        linkedType:"payment", triggerDate:pForm.promiseDate,
        triggerTime:"09:00", daysBefore:0, done:false };
    }

    const newIncome = pForm.type==="Ödeme Alındı" ? {
      id: payId, clientName: detail.name, amount: amt,
      type: "Ödeme", method: "Nakit", date: payDate,
      note: pForm.note||"", category: detail.type||"Düğün"
    } : null;

    setData(p => ({
      ...p,
      clients:   p.clients.map(c => c.id===detail.id
        ? {...c, paid:newPaid, payments:[...(c.payments||[]), payment]} : c),
      incomes:   newIncome ? [...p.incomes, newIncome] : p.incomes,
      reminders: newReminder ? [...p.reminders, newReminder] : p.reminders,
    }));
    // Anında Supabase'e yaz — müşteri + income + reminder
    const updatedClient = {...detail, paid:newPaid, payments:[...(detail.payments||[]), payment]};
    sb.upsert("clients", toDB.clients(updatedClient)).catch(e=>console.error("Müşteri ödeme kayıt hatası:",e));
    if(newIncome) sb.upsert("incomes", toDB.incomes(newIncome)).catch(()=>{});
    if(newReminder) sb.upsert("reminders", toDB.reminders(newReminder)).catch(()=>{});
    setShowPayment(false); setPForm(FP);
  };

  const saveEditPayment = () => {
    if(!editPayment || !detail) return;
    const updatedPayment = {...editPayment, amount: Number(editPayment.amount)||0};

    setData(p => {
      // Güncel client'ı p'den al (stale closure'dan değil)
      const freshClient = p.clients.find(c => c.id===detail.id);
      if(!freshClient) return p;

      const oldP    = (freshClient.payments||[]).find(x => x.id===editPayment.id);
      const oldAmt  = oldP?.type==="Ödeme Alındı" ? Number(oldP.amount)||0 : 0;
      const newAmt  = editPayment.type==="Ödeme Alındı" ? Number(editPayment.amount)||0 : 0;
      const newPaid = Math.max(0, freshClient.paid - oldAmt + newAmt);
      const newPayments = (freshClient.payments||[]).map(x =>
        x.id===editPayment.id ? updatedPayment : x
      );

      const newClients = p.clients.map(c =>
        c.id===detail.id ? {...c, paid:newPaid, payments:newPayments} : c
      );

      const existsInIncomes = p.incomes.some(i => i.id===editPayment.id);
      let newIncomes;
      if(editPayment.type==="Ödeme Alındı") {
        if(existsInIncomes) {
          newIncomes = p.incomes.map(i => i.id===editPayment.id
            ? {...i, amount:newAmt, note:editPayment.note||"", clientName:freshClient.name} : i);
        } else {
          newIncomes = [...p.incomes, {
            id:editPayment.id, clientName:freshClient.name, amount:newAmt,
            type:"Ödeme", method:"Nakit", date:updatedPayment.date||todayStr(),
            note:editPayment.note||"", category:freshClient.type||"Düğün"
          }];
        }
      } else {
        newIncomes = p.incomes.filter(i => i.id!==editPayment.id);
      }
      return {...p, clients:newClients, incomes:newIncomes};
    });
    // Anında Supabase'e yaz
    const freshClient = data.clients.find(c => c.id===detail.id);
    if(freshClient) {
      const oldP    = (freshClient.payments||[]).find(x => x.id===editPayment.id);
      const oldAmt  = oldP?.type==="Ödeme Alındı" ? Number(oldP.amount)||0 : 0;
      const newAmt  = editPayment.type==="Ödeme Alındı" ? Number(editPayment.amount)||0 : 0;
      const newPaid = Math.max(0, freshClient.paid - oldAmt + newAmt);
      const newPayments = (freshClient.payments||[]).map(x => x.id===editPayment.id ? updatedPayment : x);
      sb.upsert("clients", toDB.clients({...freshClient, paid:newPaid, payments:newPayments})).catch(()=>{});
      if(editPayment.type==="Ödeme Alındı") {
        sb.upsert("incomes", toDB.incomes({
          id:editPayment.id, clientName:freshClient.name, amount:newAmt,
          type:"Ödeme", method:"Nakit", date:updatedPayment.date||todayStr(),
          note:editPayment.note||"", category:freshClient.type||"Düğün"
        })).catch(()=>{});
      } else {
        sb.delete("incomes", editPayment.id).catch(()=>{});
      }
    }
    setEditPayment(null);
  };

  const deletePayment = (p) => {
    if(!detail) return;
    const removedAmt  = p.type==="Ödeme Alındı" ? p.amount : 0;
    const newPaid     = Math.max(0, detail.paid - removedAmt);
    const newPayments = (detail.payments||[]).filter(x => x.id!==p.id);
    // incomes'dan da sil
    if(p.type==="Ödeme Alındı") sb.delete("incomes", p.id).catch(()=>{});
    setData(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id===detail.id ? {...c, paid:newPaid, payments:newPayments} : c),
      incomes: prev.incomes.filter(i => i.id!==p.id),
    }));
    // Anında Supabase'e yaz — müşteri kartı güncel kalsın
    sb.upsert("clients", toDB.clients({...detail, paid:newPaid, payments:newPayments})).catch(()=>{});
  };

  const saveEditTotal = () => {
    if(!detail) return;
    updateClient(detail.id, { totalAmount: Number(editTotal)||0 });
    setEditTotal(null);
  };

  const toggleProcess = (stepId) => {
    if(!detail) return;
    const newProc = {...(detail.process||initProcess()), [stepId]: !(detail.process||{})[stepId]};
    updateClient(detail.id, { process:newProc });
  };

  const SMART_FILTERS = [
    { id:"Tümü",            label:"Tümü" },
    { id:"bekleyen_odeme",  label:"💰 Bekleyen Ödeme" },
    { id:"bekleyen_teslim", label:"📦 Bekleyen Teslim" },
    { id:"tamamlandi",      label:"✅ Tamamlandı" },
    ...data.packages.map(p=>({ id:p.name, label:p.name })),
  ];

  const hasPendingPayment  = c => c.totalAmount>0 && c.paid<c.totalAmount;
  const hasPendingDelivery = c => { const p=c.process||{}; return !p.album||!p.digital; };

  const [sortBy, setSortByRaw] = useState(() => { try { return localStorage.getItem("geses_sort")||"isim"; } catch{ return "isim"; } });
  const setSortBy = v => { setSortByRaw(v); try { localStorage.setItem("geses_sort", v); } catch{} };

  const filtered = data.clients.filter(c => {
    if(c.status === "arşiv") return false;
    const matchSearch = !search
      || c.name.toLowerCase().includes(search.toLowerCase())
      || (c.phone||"").includes(search);
    let matchFilter = true;
    if     (pkgFilter==="bekleyen_odeme")  matchFilter = hasPendingPayment(c)  && !isComplete(c);
    else if(pkgFilter==="bekleyen_teslim") matchFilter = hasPendingDelivery(c) && !isComplete(c);
    else if(pkgFilter==="tamamlandi")      matchFilter = isComplete(c);
    else if(pkgFilter!=="Tümü")            matchFilter = c.package===pkgFilter;
    return matchFilter && matchSearch;
  }).sort((a,b) => {
    if(sortBy==="isim")      return a.name.localeCompare(b.name, "tr", {sensitivity:"base"});
    if(sortBy==="fiyat_cok") return (b.totalAmount||0) - (a.totalAmount||0);
    if(sortBy==="fiyat_az")  return (a.totalAmount||0) - (b.totalAmount||0);
    if(sortBy==="kalan")     return ((b.totalAmount||0)-(b.paid||0)) - ((a.totalAmount||0)-(a.paid||0));
    if(sortBy==="tur")       return (a.type||"").localeCompare(b.type||"", "tr");
    if(sortBy==="paket")     return (a.package||"").localeCompare(b.package||"", "tr");
    if(sortBy==="tarih")     return new Date(b.date||0) - new Date(a.date||0);
    return 0;
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        padding:"20px 20px 16px", borderBottom:`1px solid ${T.border}`, marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:"Playfair Display", fontSize:26, fontWeight:600, color:T.goldL, lineHeight:1.1 }}>Müşteriler</h1>
          <p style={{ fontSize:13, color:T.text3, marginTop:5 }}>{data.clients.length} kayıtlı müşteri</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>{setSearchOpen(s=>!s);setSearch("");}}
            style={{ background:searchOpen?T.gold:T.card2, border:`1px solid ${searchOpen?T.gold:T.border}`,
              borderRadius:99, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n="eye" s={16} c={searchOpen?T.bg:T.text2}/>
          </button>
          <GoldButton label="Ekle" icon="plus" onClick={handleOpenAdd} sm/>
        </div>
      </div>

      {/* Plan Kullanım Rozeti - Basic ise */}
      {!clientLimitCheck.isPro && (
        <div style={{ padding:"0 20px 14px" }}>
          <UsageBadge check={clientLimitCheck} label="Kayıtlı Müşteri" />
        </div>
      )}

      {/* Search bar */}
      {searchOpen && (
        <div style={{ padding:"0 20px 14px" }} className="fade-in">
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="İsim veya telefon numarası ara..." autoFocus
              style={{ background:T.card2, border:`1px solid ${T.gold}66`, borderRadius:12,
                padding:"12px 14px 12px 42px", color:T.text, fontSize:14, width:"100%" }}/>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}>
              <Ic n="eye" s={16} c={T.gold}/>
            </div>
            {search && (
              <button onClick={()=>setSearch("")}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:T.card3, borderRadius:99, width:22, height:22,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ic n="close" s={12} c={T.text3}/>
              </button>
            )}
          </div>
          {search && <div style={{ fontSize:12, color:T.text3, marginTop:8 }}>{filtered.length} sonuç</div>}
        </div>
      )}

      {/* Filters */}
      {data.clients.length > 0 && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 20px 10px" }}>
          {SMART_FILTERS.map(f=>(
            <button key={f.id} onClick={()=>setPkgFilter(f.id)}
              style={{ background:pkgFilter===f.id?T.gold:"transparent",
                color:pkgFilter===f.id?T.bg:T.text2, border:`1px solid ${pkgFilter===f.id?T.gold:T.border}`,
                borderRadius:99, padding:"7px 14px", fontSize:11, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Sıralama */}
      {data.clients.length > 0 && (
        <div style={{ display:"flex", gap:6, alignItems:"center", overflowX:"auto", padding:"0 20px 14px" }}>
          <span style={{ fontSize:11, color:T.text3, fontWeight:600, flexShrink:0 }}>Sırala:</span>
          {[
            {id:"isim",      label:"A-Z"},
            {id:"tarih",     label:"📅 Tarih"},
            {id:"fiyat_cok", label:"💰 ↓"},
            {id:"fiyat_az",  label:"💰 ↑"},
            {id:"kalan",     label:"⏳ Borç"},
            {id:"tur",       label:"🎯 Tür"},
            {id:"paket",     label:"📦 Paket"},
          ].map(s=>(
            <button key={s.id} onClick={()=>setSortBy(s.id)}
              style={{ background:sortBy===s.id?T.gold+"33":"transparent",
                color:sortBy===s.id?T.goldL:T.text3,
                border:`1px solid ${sortBy===s.id?T.gold+"66":T.border}`,
                borderRadius:99, padding:"5px 11px", fontSize:11,
                fontWeight:sortBy===s.id?700:400, whiteSpace:"nowrap", flexShrink:0 }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Müşteri kartları */}
      <div style={{ padding:"0 20px" }}>
        {filtered.length === 0 ? (
          <EmptyState icon="users" title={search?"Müşteri Bulunamadı":"Henüz Müşteri Yok"}
            sub={search?`"${search}" ile eşleşen müşteri yok.`:"İlk müşterini ekleyerek başla."}
            action={isAdmin && !search?"Müşteri Ekle":undefined} onAction={()=>setShowAdd(true)}/>
        ) : filtered.map(c => {
          const debt = c.totalAmount - c.paid;
          const pct  = c.totalAmount>0 ? Math.min(100,Math.round(c.paid/c.totalAmount*100)) : 0;
          const pkgColor = data.packages.find(p=>p.name===c.package)?.color||T.gold;
          const pendingPromise = (c.payments||[]).find(p=>p.promiseDate&&!p.done);
          return (
            <Card key={c.id} onClick={()=>setDetailId(c.id)} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ background:pkgColor+"22", borderRadius:99, width:48, height:48, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    ...NUM_FONT, fontSize:20, fontWeight:700, color:pkgColor }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:16 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>{c.phone||"Telefon yok"}</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
                  <Pill label={c.package} color={pkgColor}/>
                  <Pill label={c.status} color={STATUS_COLORS[c.status]||T.text3}/>
                </div>
              </div>
{isAdmin && (
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:T.text3 }}>Ödeme Durumu</span>
                  <span style={{ fontSize:12, fontWeight:600, color:pct===100?T.greenL:T.orangeL }}>{pct}%</span>
                </div>
                <div style={{ background:T.card2, borderRadius:99, height:6 }}>
                  <div style={{ background:`linear-gradient(90deg,${pkgColor},${pkgColor}88)`,
                    borderRadius:99, height:"100%", width:`${pct}%`, transition:"width 0.4s" }}/>
                </div>
              </div>
            )}
{isAdmin && (              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[["Toplam",fmt(c.totalAmount),T.text],["Ödendi",fmt(c.paid),T.greenL],
                  ["Kalan",fmt(debt),debt>0?T.orangeL:T.text3]].map(([l,v,col])=>(
                  <div key={l} style={{ background:T.card2, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:10, color:T.text3, marginBottom:4, fontWeight:500 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:col }}>{v}</div>
                  </div>
                ))}
              </div>)}
              {isAdmin && pendingPromise && (
                <div style={{ marginTop:10, background:T.orange+"1A", border:`1px solid ${T.orange}33`,
                  borderRadius:10, padding:"8px 12px", display:"flex", gap:8, alignItems:"center" }}>
                  <Ic n="clock" s={13} c={T.orangeL}/>
                  <span style={{ fontSize:12, color:T.orangeL }}>
                    Söz: {fmtDate(pendingPromise.promiseDate)} — {fmt(pendingPromise.amount)}
                  </span>
                </div>
              )}
              {c.date && <div style={{ marginTop:8, display:"flex", gap:6, alignItems:"center" }}>
                <Ic n="calendar" s={12} c={T.text3}/>
                <span style={{ fontSize:12, color:T.text3 }}>Etkinlik: {fmtDate(c.date)}</span>
              </div>}
              {(c.extraDates||[]).filter(Boolean).length > 0 && (
                <div style={{ marginTop:6, display:"flex", gap:5, flexWrap:"wrap" }}>
                  {c.extraDates.filter(Boolean).map((d,i)=>(
                    <div key={i} style={{ display:"flex", gap:4, alignItems:"center",
                      background:T.card2, borderRadius:8, padding:"3px 8px" }}>
                      <Ic n="calendar" s={11} c={T.text3}/>
                      <span style={{ fontSize:11, color:T.text2 }}>{fmtDateSh(d)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop:10, display:"flex", gap:5, flexWrap:"wrap" }}>
                {PROCESS_STEPS.map(s=>{
                  const done=(c.process||{})[s.id];
                  return (
                    <div key={s.id} style={{ width:28, height:28, borderRadius:99,
                      background:done?s.color+"22":"transparent",
                      border:`1.5px solid ${done?s.color:T.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n={s.icon} s={13} c={done?s.color:T.text3}/>
                    </div>
                  );
                })}
                {isComplete(c) && <Pill label="Tamamlandı ✓" color={T.greenL}/>}
              </div>
              <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end" }}>
                <button onClick={(e)=>{ e.stopPropagation(); setDetailId(c.id); }}
                  style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:10,
                    padding:"7px 16px", fontSize:12, fontWeight:600, color:T.goldL,
                    display:"flex", alignItems:"center", gap:6 }}>
                  <Ic n="eye" s={13} c={T.goldL}/>
                  Detay
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MÜŞTERİ DETAY — her zaman data.clients'tan okuyor */}
      {detail && (
        <BottomSheet title="Müşteri Kartı" onClose={()=>setDetailId(null)}>
          <div style={{ display:"flex", gap:14, alignItems:"center", marginBottom:20 }}>
            <div style={{ background:T.goldGlow, borderRadius:99, width:60, height:60, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"Playfair Display", fontSize:26, fontWeight:700, color:T.goldL }}>
              {detail.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontFamily:"Playfair Display", fontSize:20, fontWeight:600, marginBottom:6 }}>{detail.name}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <Pill label={detail.status} color={STATUS_COLORS[detail.status]||T.text3}/>
                <Pill label={detail.package} color={data.packages.find(p=>p.name===detail.package)?.color||T.gold}/>
              </div>
            </div>
          </div>

          {/* İletişim bilgileri */}
          {[["📧 E-Posta",detail.email||"—"],["🎯 Tür",detail.type],["📅 Etkinlik",fmtDate(detail.date)]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between",
              borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
              <span style={{ fontSize:13, color:T.text3 }}>{l}</span>
              <span style={{ fontSize:14, fontWeight:500 }}>{v}</span>
            </div>
          ))}
          {/* Ek Günler */}
          {(detail.extraDates||[]).filter(Boolean).length > 0 && (
            <div style={{ borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
              <div style={{ fontSize:13, color:T.text3, marginBottom:8 }}>📅 Ek Günler</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {detail.extraDates.filter(Boolean).map((d,i)=>(
                  <div key={i} style={{ background:T.card2, borderRadius:10, padding:"8px 12px",
                    fontSize:13, fontWeight:500, color:T.text }}>
                    {fmtDate(d)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Telefon - WhatsApp ile */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
            <span style={{ fontSize:13, color:T.text3 }}>📱 Telefon</span>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:14, fontWeight:500 }}>{detail.phone||"—"}</span>
              {detail.phone && (
                <button onClick={()=>{
                  const ph = detail.phone.replace(/\D/g,"").replace(/^0/,"");
                  const msg = `Merhaba ${detail.name.split(" ")[0]} hanım/bey 👋

OmniCod'u tercih ettiğiniz için teşekkür ederiz. Size nasıl yardımcı olabiliriz?`;
                  window.open(`https://wa.me/90${ph}?text=${encodeURIComponent(msg)}`,"_blank");
                }} style={{ background:"#25D36622", border:"1px solid #25D36644", borderRadius:8,
                  padding:"4px 10px", fontSize:12, color:"#25D366", fontWeight:600 }}>
                  WA 💬
                </button>
              )}
            </div>
          </div>
          {detail.anniversaryDate && (
            <div style={{ display:"flex", justifyContent:"space-between",
              borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
              <span style={{ fontSize:13, color:T.text3 }}>💍 Yıldönümü</span>
              <span style={{ fontSize:14, fontWeight:500 }}>{fmtDate(detail.anniversaryDate)}</span>
            </div>
          )}
          {detail.referralSource && (
            <div style={{ display:"flex", justifyContent:"space-between",
              borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
              <span style={{ fontSize:13, color:T.text3 }}>📣 Kaynak</span>
              <span style={{ fontSize:14, fontWeight:500, color:T.gold }}>
                {detail.referralSource}{detail.referralName ? ` — ${detail.referralName}` : ""}
              </span>
            </div>
          )}
          {detail.phone && (
            <a href={`https://wa.me/90${detail.phone.replace(/\D/g,"").replace(/^0/,"")}`}
              target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                background:"#25D366"+"22", border:`1px solid #25D366`+"44", borderRadius:14,
                padding:"13px 20px", marginBottom:16, textDecoration:"none",
                color:"#25D366", fontWeight:600, fontSize:14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp'ta Mesaj Gönder
            </a>
          )}

          {/* Ödeme özeti */}
          {isAdmin && (<>
          <div style={{ background:T.card2, borderRadius:14, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:12, color:T.text3, fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.5px", marginBottom:12 }}>Ödeme Özeti</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
              {[["Toplam",fmt(detail.totalAmount),T.text],
                ["Ödendi",fmt(detail.paid),T.greenL],
                ["Kalan",fmt(detail.totalAmount-detail.paid),(detail.totalAmount-detail.paid)>0?T.orangeL:T.text3]
              ].map(([l,v,c])=>(
                <div key={l} style={{ background:T.card3, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.text3, marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                </div>
              ))}
            </div>
            {detail.totalAmount>0 && (
              <div style={{ background:T.card3, borderRadius:99, height:7 }}>
                <div style={{ background:`linear-gradient(90deg,${T.green},${T.greenL})`,
                  borderRadius:99, height:"100%",
                  width:`${Math.min(100,Math.round((detail.paid/detail.totalAmount)*100))}%` }}/>
              </div>
            )}
          </div>

          {/* Ödeme geçmişi */}
          {(detail.payments||[]).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:12, color:T.text3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Ödeme Geçmişi</div>
                {isAdmin && <div style={{ fontSize:11, color:T.text3 }}>Düzenlemek için tıkla</div>}
              </div>
              {[...(detail.payments||[])].reverse().map(p=>(
                <div key={p.id} style={{ display:"flex", gap:10, alignItems:"flex-start",
                  borderBottom:`1px solid ${T.border}`, paddingBottom:10, marginBottom:10 }}>
                  <div style={{ background:p.type==="Ödeme Alındı"?T.green+"1A":T.orange+"1A",
                    borderRadius:10, padding:8, flexShrink:0 }}>
                    <Ic n={p.type==="Ödeme Alındı"?"check":"clock"} s={14}
                      c={p.type==="Ödeme Alındı"?T.greenL:T.orangeL}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{p.type}</span>
                      <span style={{ fontSize:14, fontWeight:700,
                        color:p.type==="Ödeme Alındı"?T.greenL:T.orangeL }}>{fmt(p.amount)}</span>
                    </div>
                    {p.promiseDate && <div style={{ fontSize:11, color:T.orangeL }}>🗓 Söz: {fmtDate(p.promiseDate)}</div>}
                    {p.note && <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>📝 {p.note}</div>}
                    <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>Kayıt: {fmtDate(p.date)}</div>
                  </div>
                  {isAdmin && <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <button onClick={()=>setEditPayment({...p})}
                      style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:8,
                        width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n="edit" s={13} c={T.text2}/>
                    </button>
                    <button onClick={()=>deletePayment(p)}
                      style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:8,
                        width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n="trash" s={13} c={T.redL}/>
                    </button>
                  </div>}
                </div>
              ))}
            </div>
          )}

          {/* Toplam tutar düzelt */}
          <div style={{ marginBottom:16 }}>
            <button onClick={isAdmin ? ()=>setEditTotal(String(detail.totalAmount||"")) : undefined}
              style={{ background:"transparent", border:`1px dashed ${T.border}`, borderRadius:10,
                padding:"10px 14px", width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:T.text3 }}>✏️ Toplam tutarı düzelt</span>
              <span style={{ ...NUM_FONT, fontSize:13, fontWeight:600, color:T.text2 }}>{fmt(detail.totalAmount)}</span>
            </button>
          </div>

          {/* Süreç Takibi */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:T.text3, fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.5px", marginBottom:12 }}>İş Süreci</div>
            {PROCESS_STEPS.map((s,i)=>{
              const proc = detail.process||{};
              const done = proc[s.id];
              const prevDone = i===0 || proc[PROCESS_STEPS[i-1].id];
              return (
                <div key={s.id} style={{ display:"flex", gap:12, alignItems:"center",
                  marginBottom:10, opacity:(!done&&!prevDone)?0.4:1 }}>
                  <button onClick={()=>toggleProcess(s.id)}
                    style={{ width:40, height:40, borderRadius:99, flexShrink:0,
                      background:done?s.color+"22":"transparent",
                      border:`2px solid ${done?s.color:T.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                    {done ? <Ic n="check" s={16} c={s.color}/> : <Ic n={s.icon} s={16} c={T.text3}/>}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:done?600:400, color:done?T.text:T.text3 }}>{s.label}</div>
                    {!done && prevDone && <div style={{ fontSize:11, color:s.color, marginTop:2 }}>← Sıradaki adım</div>}
                  </div>
                  <div style={{ width:10, height:10, borderRadius:99, background:done?s.color:T.border }}/>
                </div>
              );
            })}
            {isComplete(detail) && (
              <div className="fade-in" style={{ background:T.green+"1A", border:`1px solid ${T.green}33`,
                borderRadius:12, padding:"12px 16px", textAlign:"center", marginTop:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.greenL }}>🎉 Tüm Süreç Tamamlandı!</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>Bu müşteri aktif listelerden çıkar.</div>
              </div>
            )}
          </div>
          </>
          )}
          {isAdmin && <GoldButton label="Ödeme / Söz Ekle" icon="money" onClick={()=>setShowPayment(true)} full/>}
          {detail.notes && (
            <div style={{ marginTop:14, background:T.card2, borderRadius:12, padding:"12px 14px",
              fontSize:13, color:T.text2, lineHeight:1.6 }}>📝 {detail.notes}</div>
          )}
          {/* WhatsApp Hızlı Eylemler */}
          {detail.phone && (() => {
            const ph = detail.phone.replace(/\D/g,"").replace(/^0/,"");
            const kalan = (detail.totalAmount||0) - (detail.paid||0);
            return (
              <div style={{ display:"flex", gap:10, marginTop:14 }}>
                <button onClick={()=>{
                  const msg = `Merhaba ${detail.name.split(" ")[0]} hanım/bey 👋

Size ${fmtDate(detail.date)} tarihli ${detail.type} çekiminizle ilgili bilgi vermek istedik.

OmniCod 📸`;
                  window.open(`https://wa.me/90${ph}?text=${encodeURIComponent(msg)}`,"_blank");
                }} style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:12,
                  padding:"12px 8px", fontSize:12, fontWeight:700, color:"#25D366" }}>
                  💬 Hızlı Mesaj
                </button>
                {kalan > 0 && isAdmin && (
                  <button onClick={()=>{
                    const msg = `Merhaba ${detail.name.split(" ")[0]} hanım/bey 👋\n\n${fmtDate(detail.date)} tarihli çekiminize ait ${fmt(kalan)} tutarındaki ödemenizin hatırlatmasını yapmak istedik.\n\nKolaylıklar dileriz 🙏\nOmniCod 📸`;
                    window.open(`https://wa.me/90${ph}?text=${encodeURIComponent(msg)}`,"_blank");
                  }} style={{ flex:1, background:T.orange+"22", border:`1px solid ${T.orange}44`, borderRadius:12,
                    padding:"12px 8px", fontSize:12, fontWeight:700, color:T.orangeL }}>
                    💰 Ödeme Hatırlatma
                  </button>
                )}
              </div>
            );
          })()}
          <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:10 }}>
            {isAdmin && <GoldButton label="Müşteriyi Düzenle" icon="edit" variant="outline" full onClick={()=>{ setEditClientForm({...detail, extraDates:detail.extraDates||[]}); setShowEditClient(true); }}/>}
            {isAdmin && <GoldButton label="Müşteriyi Sil" icon="trash" variant="danger" full onClick={()=>setConfirmDelete(true)}/>}
          </div>
        </BottomSheet>
      )}

      {/* MÜŞTERİ DÜZENLE */}
      {showEditClient && editClientForm && (
        <BottomSheet title="Müşteriyi Düzenle" onClose={()=>{setShowEditClient(false);setEditClientForm(null);}}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Ad Soyad" value={editClientForm.name} onChange={ecf("name")} placeholder="Müşteri adı" required/>
            <Field label="Telefon" type="tel" value={editClientForm.phone||""} onChange={ecf("phone")} placeholder="05xx xxx xx xx" required/>
            <Field label="E-Posta" type="email" value={editClientForm.email||""} onChange={ecf("email")} placeholder="mail@mail.com"/>
            <Field label="Etkinlik Türü" value={editClientForm.type} onChange={ecf("type")} options={["Düğün","Nişan","Kına","Portre","Bebek","Mezuniyet","Diğer"]}/>
            <Field label="Paket" value={editClientForm.package} onChange={ecf("package")} options={data.packages.map(p=>p.name)}/>
            <Field label="Durum" value={editClientForm.status} onChange={ecf("status")} options={["aktif","pasif","arşiv"]}/>
            <DatePicker label="Etkinlik Tarihi" value={editClientForm.date||""} onChange={ecf("date")}/>
            {/* Ek Günler */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>📅 Ek Günler</span>
                <button onClick={()=>setEditClientForm(p=>({...p, extraDates:[...(p.extraDates||[]),""]}))}
                  style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:8,
                    padding:"5px 12px", fontSize:12, color:T.goldL, fontWeight:600 }}>
                  + Ek Gün Ekle
                </button>
              </div>
              {(editClientForm.extraDates||[]).map((d,i)=>(
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-end", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <DatePicker label={`Ek Gün ${i+1}`} value={d}
                      onChange={v=>setEditClientForm(p=>({...p,extraDates:p.extraDates.map((x,j)=>j===i?v:x)}))}/>
                  </div>
                  <button onClick={()=>setEditClientForm(p=>({...p,extraDates:p.extraDates.filter((_,j)=>j!==i)}))}
                    style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:10,
                      padding:"11px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ic n="close" s={14} c={T.redL}/>
                  </button>
                </div>
              ))}
            </div>
            <Field label="Notlar" value={editClientForm.notes||""} onChange={ecf("notes")} textarea placeholder="Özel istekler, tercihler..."/>
            <Field label="Bizi Nereden Duydunuz?" value={editClientForm.referralSource||""} onChange={ecf("referralSource")} options={["","Instagram","Google","Tavsiye","Düğün Fuarı","Diğer"]}/>
            {editClientForm.referralSource==="Tavsiye" && (
              <Field label="Kim Tavsiye Etti?" value={editClientForm.referralName||""} onChange={ecf("referralName")}
                placeholder="Müşteri adı..." options={["", ...data.clients.map(c=>c.name)]}/>
            )}
            {(editClientForm.type==="Düğün"||editClientForm.type==="Nişan") && (
              <DatePicker label="💍 Evlilik / Etkinlik Yıldönümü" value={editClientForm.anniversaryDate||""} onChange={ecf("anniversaryDate")}/>
            )}
            <GoldButton label="Değişiklikleri Kaydet" icon="check" onClick={saveEditClient} full/>
          </div>
        </BottomSheet>
      )}

      {/* SİL ONAY */}
      {confirmDelete && detail && (
        <BottomSheet title="Müşteriyi Sil" onClose={()=>setConfirmDelete(false)}>
            <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
              <div style={{ fontWeight:600, fontSize:16, marginBottom:8 }}>{detail.name}</div>
              <div style={{ fontSize:13, color:T.text3, lineHeight:1.6, marginBottom:24 }}>
                Bu müşteri kalıcı olarak silinecek.<br/>Tüm ödeme geçmişi de silinir.<br/>Bu işlem geri alınamaz!
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setConfirmDelete(false)}
                  style={{ flex:1, background:T.card2, border:`1px solid ${T.border}`, borderRadius:14,
                    padding:"14px", fontSize:15, fontWeight:600, color:T.text2 }}>
                  Vazgeç
                </button>
                <button onClick={()=>{
                  const deletedClient = {...detail, deletedAt: todayStr()};
                  // Bu müşteriye bağlı randevuları da bul
                  const linkedApts = data.appointments.filter(a => a.clientId===detail.id || a.clientName===detail.name);
                  // Supabase'den direkt sil — müşteri + ödemeler + bağlı randevular + hatırlatıcılar
                  sb.delete("clients", detail.id).catch(e=>console.error("Müşteri sil hatası:", e));
                  (detail.payments||[]).forEach(p => {
                    sb.delete("incomes", p.id).catch(()=>{});
                  });
                  linkedApts.forEach(a => sb.delete("appointments", a.id).catch(()=>{}));
                  const linkedAptIds = new Set(linkedApts.map(a=>a.id));
                  const linkedReminders = data.reminders.filter(r => linkedAptIds.has(r.linkedId));
                  linkedReminders.forEach(r => sb.delete("reminders", r.id).catch(()=>{}));
                  setData(p=>({
                    ...p,
                    clients: p.clients.filter(c=>c.id!==detail.id),
                    appointments: p.appointments.filter(a=>a.clientId!==detail.id && a.clientName!==detail.name),
                    reminders: p.reminders.filter(r=>!linkedAptIds.has(r.linkedId)),
                    deletedClients: [...(p.deletedClients||[]), deletedClient],
                    incomes: p.incomes.filter(i=>!(detail.payments||[]).some(pp=>pp.id===i.id)),
                  }));
                  setConfirmDelete(false);
                  setDetailId(null);
                }}
                  style={{ flex:1, background:T.red, border:"none", borderRadius:14,
                    padding:"14px", fontSize:15, fontWeight:700, color:"#fff" }}>
                  Evet, Sil
                </button>
              </div>
            </div>
        </BottomSheet>
      )}

      {/* ÖDEME DÜZENLE */}
      {editPayment && detail && (
        <BottomSheet title="Ödemeyi Düzenle" onClose={()=>setEditPayment(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:T.orange+"1A", border:`1px solid ${T.orange}33`, borderRadius:12,
              padding:"12px 14px", fontSize:13, color:T.orangeL }}>
              ⚠️ Tutarı veya notu düzeltebilirsin.
            </div>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:10 }}>İşlem Türü</div>
              <div style={{ display:"flex", gap:8 }}>
                {["Ödeme Alındı","Ödeme Sözü"].map(t=>(
                  <button key={t} onClick={()=>setEditPayment(p=>({...p,type:t}))}
                    style={{ flex:1, background:editPayment.type===t?(t==="Ödeme Alındı"?T.green:T.orange)+"22":"transparent",
                      color:editPayment.type===t?(t==="Ödeme Alındı"?T.greenL:T.orangeL):T.text2,
                      border:`1px solid ${editPayment.type===t?(t==="Ödeme Alındı"?T.green:T.orange)+"66":T.border}`,
                      borderRadius:12, padding:"12px 8px", fontSize:13, fontWeight:600 }}>
                    {t==="Ödeme Alındı"?"✅ Ödeme Alındı":"🗓 Ödeme Sözü"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Tutar (₺)" type="number" value={String(editPayment.amount)}
              onChange={v=>setEditPayment(p=>({...p,amount:v}))} required/>
            {editPayment.type==="Ödeme Sözü" && (
              <DatePicker label="Söz Verilen Tarih" value={editPayment.promiseDate}
                onChange={v=>setEditPayment(p=>({...p,promiseDate:v}))}/>
            )}
            <Field label="Not" value={editPayment.note||""} onChange={v=>setEditPayment(p=>({...p,note:v}))}
              textarea rows={2} placeholder="Açıklama..."/>
            <GoldButton label="Düzeltmeyi Kaydet" icon="check" onClick={saveEditPayment} full/>
          </div>
        </BottomSheet>
      )}

      {/* TOPLAM TUTAR DÜZELT */}
      {editTotal !== null && detail && (
        <BottomSheet title="Toplam Tutarı Düzelt" onClose={()=>setEditTotal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`, borderRadius:12,
              padding:"12px 14px", fontSize:13, color:T.blueL }}>
              ℹ️ Sadece toplam sözleşme tutarını düzeltir. Alınan ödemeler değişmez.
            </div>
            <Field label="Yeni Toplam Tutar (₺)" type="number" value={editTotal}
              onChange={setEditTotal} placeholder="0" required/>
            <div style={{ background:T.card2, borderRadius:12, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:T.text3 }}>Alınan ödemeler</span>
                <span style={{ ...NUM_FONT, fontSize:14, fontWeight:600, color:T.greenL }}>{fmt(detail.paid)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, color:T.text3 }}>Yeni kalan borç</span>
                <span style={{ fontSize:14, fontWeight:700, color:T.orangeL }}>
                  {fmt(Math.max(0,(Number(editTotal)||0)-detail.paid))}
                </span>
              </div>
            </div>
            <GoldButton label="Tutarı Güncelle" icon="check" onClick={saveEditTotal} full/>
          </div>
        </BottomSheet>
      )}

      {/* ÖDEME / SÖZ FORMU */}
      {showPayment && detail && (
        <BottomSheet title={`Ödeme — ${detail.name}`} onClose={()=>setShowPayment(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:10 }}>İşlem Türü</div>
              <div style={{ display:"flex", gap:8 }}>
                {["Ödeme Alındı","Ödeme Sözü"].map(t=>(
                  <button key={t} onClick={()=>setPForm(p=>({...p,type:t}))}
                    style={{ flex:1, background:pForm.type===t?(t==="Ödeme Alındı"?T.green:T.orange)+"22":"transparent",
                      color:pForm.type===t?(t==="Ödeme Alındı"?T.greenL:T.orangeL):T.text2,
                      border:`1px solid ${pForm.type===t?(t==="Ödeme Alındı"?T.green:T.orange)+"66":T.border}`,
                      borderRadius:12, padding:"12px 8px", fontSize:13, fontWeight:600, textAlign:"center" }}>
                    {t==="Ödeme Alındı"?"✅ Ödeme Alındı":"🗓 Ödeme Sözü"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Tutar (₺)" type="number" value={pForm.amount} onChange={pf("amount")} placeholder="Ne kadar?" required/>
            {pForm.type==="Ödeme Alındı" && (
              <DatePicker label="Ödeme Tarihi" value={pForm.payDate} onChange={pf("payDate")}
                note="Ödemenin gerçekleştiği tarih"/>
            )}
            {pForm.type==="Ödeme Sözü" && (
              <DatePicker label="Söz Verilen Tarih" value={pForm.promiseDate} onChange={pf("promiseDate")}
                note="Hatırlatıcı otomatik eklenecek 🔔"/>
            )}
            <Field label="Not" value={pForm.note} onChange={pf("note")} textarea rows={2} placeholder="Nasıl ödeyecek, ne konuştunuz..."/>
            <div style={{ background:T.card2, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>Güncel Durum</div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, color:T.text2 }}>Kalan borç</span>
                <span style={{ ...NUM_FONT, fontSize:15, fontWeight:700, color:T.orangeL }}>{fmt(detail.totalAmount - detail.paid)}</span>
              </div>
              {pForm.amount && pForm.type==="Ödeme Alındı" && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                  <span style={{ fontSize:13, color:T.text2 }}>Bu ödemeden sonra</span>
                  <span style={{ fontSize:15, fontWeight:700, color:T.greenL }}>
                    {fmt(Math.max(0, detail.totalAmount - detail.paid - Number(pForm.amount)))}
                  </span>
                </div>
              )}
            </div>
            <GoldButton label="Kaydet" icon="check" onClick={savePayment} full/>
          </div>
        </BottomSheet>
      )}

      {/* SİLİNEN MÜŞTERİLER BÖLÜMÜ */}
      {(data.deletedClients||[]).length > 0 && (
        <div style={{ padding:"0 20px", marginTop:8, marginBottom:20 }}>
          <button onClick={()=>setShowDeleted(s=>!s)}
            style={{ display:"flex", alignItems:"center", gap:8, background:"transparent",
              border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 14px", width:"100%" }}>
            <Ic n="trash" s={15} c={T.text3}/>
            <span style={{ fontSize:13, color:T.text3, fontWeight:500 }}>
              Silinen Müşteriler ({(data.deletedClients||[]).length})
            </span>
            <Ic n="back" s={13} c={T.text3} style={{ marginLeft:"auto", transform:showDeleted?"rotate(-90deg)":"rotate(90deg)", transition:"transform 0.2s" }}/>
          </button>

          {showDeleted && (
            <div style={{ marginTop:10 }}>
              {(data.deletedClients||[]).map(c=>(
                <Card key={c.id} style={{ marginBottom:10, opacity:0.7, borderStyle:"dashed" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>
                        {c.phone} · {c.package} · Silindi: {fmtDate(c.deletedAt)}
                      </div>
                      <div style={{ fontSize:12, color:T.text2, marginTop:4 }}>
                        Toplam: {fmt(c.totalAmount||0)} · Ödenen: {fmt(c.paid||0)}
                      </div>
                    </div>
                    <button onClick={()=>{
                      const restored = Object.assign({}, c);
                      delete restored.deletedAt;
                      setData(p=>({
                        ...p,
                        clients: [...p.clients, restored],
                        deletedClients: (p.deletedClients||[]).filter(x=>x.id!==c.id),
                      }));
                    }}
                      style={{ background:T.green+"1A", border:`1px solid ${T.green}33`,
                        borderRadius:10, padding:"8px 12px", fontSize:12, fontWeight:600, color:T.greenL, flexShrink:0 }}>
                      Geri Al
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* YENİ MÜŞTERİ FORMU */}
      {showAdd && (
        <BottomSheet title="Yeni Müşteri" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Ad Soyad" value={form.name} onChange={f("name")} placeholder="Müşteri adı" required/>
            <Field label="Telefon" type="tel" value={form.phone} onChange={f("phone")} placeholder="05xx xxx xx xx" required/>
            <Field label="E-Posta" type="email" value={form.email} onChange={f("email")} placeholder="mail@mail.com"/>
            <Field label="Etkinlik Türü" value={form.type} onChange={f("type")} options={["Düğün","Nişan","Kına","Portre","Bebek","Mezuniyet","Diğer"]}/>
            <Field label="Paket" value={form.package} onChange={f("package")} options={data.packages.map(p=>p.name)}/>
            <DatePicker label="Etkinlik Tarihi" value={form.date} onChange={f("date")}/>
            {/* Ek Günler */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>📅 Ek Günler</span>
                <button onClick={()=>setForm(p=>({...p, extraDates:[...(p.extraDates||[]),""]}))}
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
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Toplam Tutar (₺)" type="number" value={form.totalAmount} onChange={f("totalAmount")} placeholder="0"/>
              <Field label="Alınan Kapora (₺)" type="number" value={form.paid} onChange={f("paid")} placeholder="0"/>
            </div>
            <Field label="Notlar" value={form.notes} onChange={f("notes")} textarea placeholder="Özel istekler, tercihler..."/>
            <Field label="Bizi Nereden Duydunuz?" value={form.referralSource} onChange={f("referralSource")} options={["","Instagram","Google","Tavsiye","Düğün Fuarı","Diğer"]}/>
            {form.referralSource==="Tavsiye" && (
              <Field label="Kim Tavsiye Etti?" value={form.referralName} onChange={f("referralName")}
                placeholder="Müşteri adı..." options={["", ...data.clients.map(c=>c.name)]}/>
            )}
            {(form.type==="Düğün"||form.type==="Nişan") && (
              <DatePicker label="💍 Evlilik / Etkinlik Yıldönümü" value={form.anniversaryDate} onChange={f("anniversaryDate")}
                note="Her yıl otomatik hatırlatıcı oluşturulur"/>
            )}
            <GoldButton label="Müşteriyi Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}

      {/* Müşteri Limiti Doldu Modal */}
      {showLimitModal && (
        <BottomSheet title="Müşteri Limiti" onClose={()=>setShowLimitModal(false)}>
          <ProGate check={clientLimitCheck} featureLabel="Müşteri" onUpgrade={()=>{ setShowLimitModal(false); setActive && setActive("planyonetimi"); }} />
        </BottomSheet>
      )}
    </div>
  );
};
// ════════════════════════════════════════════════
