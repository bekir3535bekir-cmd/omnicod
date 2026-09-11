import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Teklif = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const FQ = { clientName:"", package:"", items:[], discount:0, note:"", date:todayStr() };
  const [form,      setForm]      = useState(FQ);
  const [detailId,  setDetailId]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [mainTab,   setMainTab]   = useState("teklifler"); // teklifler | simulatör
  const [customItem, setCustomItem] = useState({ label:"", amount:"" });

  // Simülatör state
  const SIM_EXTRAS = [
    { id:"album",    label:"Fotoğraf Albümü",    price:8000,  icon:"📖" },
    { id:"dis",      label:"Dış Çekim",          price:5000,  icon:"🌿" },
    { id:"klip",     label:"Düğün Klibi",        price:6000,  icon:"🎬" },
    { id:"konvoy",   label:"Konvoy Klibi",       price:4000,  icon:"🚗" },
    { id:"baski",    label:"Baskı Paketi (50)",  price:2500,  icon:"🖼" },
    { id:"drone",    label:"Drone Çekimi",       price:3500,  icon:"🚁" },
    { id:"video2",   label:"2. Kameraman",       price:3000,  icon:"📹" },
    { id:"hizli",    label:"Hızlı Teslimat",     price:2000,  icon:"⚡" },
  ];
  const [simPkg,      setSimPkg]      = useState("");
  const [simExtras,   setSimExtras]   = useState({});
  const [simDiscount, setSimDiscount] = useState("");
  const [simClient,   setSimClient]   = useState("");
  const [simNote,     setSimNote]     = useState("");

  const simBase    = data.packages.find(p=>p.name===simPkg)?.price || 0;
  const simXtotal  = SIM_EXTRAS.filter(e=>simExtras[e.id]).reduce((s,e)=>s+e.price,0);
  const simTotal   = Math.max(0, simBase + simXtotal - (Number(simDiscount)||0));

  const simToQuote = () => {
    if(!simPkg) return;
    const items = SIM_EXTRAS.filter(e=>simExtras[e.id]).map(e=>({id:uid(),label:e.label,amount:e.price}));
    const q = { id:uid(), clientName:simClient||"—", package:simPkg, items,
      discount:Number(simDiscount)||0, total:simTotal, basePrice:simBase,
      note:simNote, date:todayStr(), status:"taslak" };
    setData(p=>({...p, quotes:[...p.quotes, q]}));
    sb.upsert("quotes", toDB.quotes(q)).catch(()=>{});
    setMainTab("teklifler");
  };

  const detail = detailId ? data.quotes.find(q=>q.id===detailId)||null : null;
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const selectedPkg = data.packages.find(p=>p.name===form.package);
  const basePrice   = selectedPkg?.price || 0;
  const extrasTotal = form.items.reduce((a,i)=>a+i.amount,0);
  const subtotal    = basePrice + extrasTotal;
  const discount    = Number(form.discount)||0;
  const total       = Math.max(0, subtotal - discount);

  const addItem = () => {
    if(!customItem.label||!customItem.amount) return;
    setForm(p=>({...p, items:[...p.items, {id:uid(), label:customItem.label, amount:Number(customItem.amount)}]}));
    setCustomItem({ label:"", amount:"" });
  };
  const removeItem = id => setForm(p=>({...p, items:p.items.filter(i=>i.id!==id)}));

  const save = () => {
    if(!form.clientName) return;
    const q = { ...form, id:uid(), total, basePrice, status:"taslak" };
    setData(p=>({...p, quotes:[...p.quotes, q]}));
    setShowAdd(false); setForm(FQ);
  };

  const sendWA = (q) => {
    const client = data.clients.find(c=>c.name.toLowerCase()===q.clientName.toLowerCase());
    const phone  = client?.phone?.replace(/\D/g,"").replace(/^0/,"");
    const lines  = [
      `Merhaba ${q.clientName} hanım/bey,`,
      ``,
      `OmniCod olarak hazırladığımız fiyat teklifimiz:`,
      ``,
      q.package ? `📦 Paket: ${q.package} — ${fmt(q.basePrice)}` : "",
      ...q.items.map(i=>`➕ ${i.label}: ${fmt(i.amount)}`),
      q.discount>0 ? `🎁 İndirim: -${fmt(q.discount)}` : "",
      ``,
      `💰 TOPLAM: ${fmt(q.total)}`,
      ``,
      q.note ? `📝 Not: ${q.note}` : "",
      ``,
      `Sorularınız için her zaman ulaşabilirsiniz. 📸`,
    ].filter(l=>l!==null&&l!==undefined&&!(l===""&&lines?.[lines.indexOf(l)-1]==="")).join("\n");

    const url = phone
      ? `https://wa.me/90${phone}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  };

  const STATUS_Q = { taslak:T.text3, gönderildi:T.blueL, onaylandı:T.greenL, reddedildi:T.redL };

  return (
    <div className="fade-in">
      <PageHeader title="Fiyat Teklifleri" sub={`${data.quotes.length} teklif`} action={isAdmin&&mainTab==="teklifler"} onAction={()=>setShowAdd(true)} actionLabel="Yeni Teklif"/>

      {/* Ana Sekmeler */}
      <div style={{ display:"flex", gap:8, padding:"0 20px 16px" }}>
        {[["teklifler","📋 Teklifler"],["simulatör","🧮 Simülatör"]].map(([id,l])=>(
          <button key={id} onClick={()=>setMainTab(id)}
            style={{ flex:1, background:mainTab===id?T.gold:"transparent",
              color:mainTab===id?T.bg:T.text2, border:`1px solid ${mainTab===id?T.gold:T.border}`,
              borderRadius:12, padding:"10px", fontSize:13, fontWeight:600 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── TEKLİFLER ── */}
      {mainTab==="teklifler" && (
        <div style={{ padding:"0 20px" }}>
          {data.quotes.length===0
            ? <EmptyState icon="doc" title="Henüz Teklif Yok" sub="Müşterilere özel fiyat teklifi oluştur." action="İlk Teklifi Oluştur" onAction={()=>setShowAdd(true)}/>
            : data.quotes.map(q=>(
              <Card key={q.id} onClick={()=>setDetailId(q.id)} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:16 }}>{q.clientName}</div>
                    <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>{fmtDate(q.date)}</div>
                  </div>
                  <Pill label={q.status} color={STATUS_Q[q.status]||T.text3}/>
                </div>
                {q.package && <Pill label={q.package} color={data.packages.find(p=>p.name===q.package)?.color||T.gold}/>}
                <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, color:T.text3 }}>{q.items.length>0?`+${q.items.length} ekstra`:""}{q.discount>0?" · indirimli":""}</span>
                  <span style={{ ...NUM_FONT, fontSize:20, fontWeight:700, color:T.gold }}>{fmt(q.total)}</span>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* ── SİMÜLATÖR ── */}
      {mainTab==="simulatör" && (
        <div style={{ padding:"0 20px 120px" }}>
          {/* Paket Seçimi */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>1. Temel Paket Seç</div>
            {data.packages.map(p=>(
              <button key={p.id} onClick={()=>setSimPkg(p.name)}
                style={{ width:"100%", background:simPkg===p.name?p.color+"22":T.card,
                  border:`1.5px solid ${simPkg===p.name?p.color:T.border}`,
                  borderRadius:14, padding:14, marginBottom:8,
                  display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:simPkg===p.name?p.color:T.text }}>{p.name}</div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{(p.includes||[]).slice(0,2).join(" · ")}</div>
                </div>
                <div style={{ ...NUM_FONT, fontSize:16, fontWeight:700, color:simPkg===p.name?p.color:T.text2 }}>
                  {fmt(p.price)}
                </div>
              </button>
            ))}
          </div>

          {/* Ekstralar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>2. Ekstralar Ekle</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {SIM_EXTRAS.map(e=>(
                <button key={e.id} onClick={()=>setSimExtras(p=>({...p,[e.id]:!p[e.id]}))}
                  style={{ background:simExtras[e.id]?T.blue+"22":T.card,
                    border:`1.5px solid ${simExtras[e.id]?T.blueL:T.border}`,
                    borderRadius:12, padding:"12px 10px", textAlign:"left" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{e.icon}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:simExtras[e.id]?T.blueL:T.text, lineHeight:1.3 }}>{e.label}</div>
                  <div style={{ ...NUM_FONT, fontSize:12, color:T.text3, marginTop:3 }}>+{fmt(e.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* İndirim */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>3. İndirim (opsiyonel)</div>
            <input type="number" value={simDiscount} onChange={e=>setSimDiscount(e.target.value)}
              placeholder="İndirim tutarı ₺"
              style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
          </div>

          {/* Müşteri & Not */}
          <div style={{ marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontSize:12, color:T.text2, marginBottom:6 }}>Müşteri Adı</div>
              <input value={simClient} onChange={e=>setSimClient(e.target.value)}
                placeholder="Opsiyonel"
                style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
                  padding:"11px 12px", color:T.text, fontSize:13, width:"100%", outline:"none" }}/>
            </div>
            <div>
              <div style={{ fontSize:12, color:T.text2, marginBottom:6 }}>Not</div>
              <input value={simNote} onChange={e=>setSimNote(e.target.value)}
                placeholder="Kısa not..."
                style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
                  padding:"11px 12px", color:T.text, fontSize:13, width:"100%", outline:"none" }}/>
            </div>
          </div>

          {/* Fiyat Özeti */}
          <div style={{ background:T.card, border:`1.5px solid ${T.gold}44`, borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:12 }}>💰 Fiyat Özeti</div>
            {simPkg && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:T.text2 }}>{simPkg}</span>
                <span style={{ ...NUM_FONT, fontSize:13, fontWeight:600 }}>{fmt(simBase)}</span>
              </div>
            )}
            {SIM_EXTRAS.filter(e=>simExtras[e.id]).map(e=>(
              <div key={e.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:T.text3 }}>+ {e.label}</span>
                <span style={{ ...NUM_FONT, fontSize:12, color:T.blueL }}>+{fmt(e.price)}</span>
              </div>
            ))}
            {Number(simDiscount)>0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:T.greenL }}>🎁 İndirim</span>
                <span style={{ ...NUM_FONT, fontSize:13, color:T.greenL }}>-{fmt(Number(simDiscount))}</span>
              </div>
            )}
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:8,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:15, fontWeight:700 }}>TOPLAM</span>
              <span style={{ ...NUM_FONT, fontSize:28, fontWeight:700, color:T.goldL }}>{fmt(simTotal)}</span>
            </div>
          </div>

          {simPkg && (
            <GoldButton label="Teklif Olarak Kaydet" icon="check" onClick={simToQuote} full/>
          )}
        </div>
      )}

      {/* DETAY */}
      {detail && (
        <BottomSheet title="Teklif Detayı" onClose={()=>setDetailId(null)}>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <Pill label={detail.status} color={STATUS_Q[detail.status]||T.text3}/>
            {detail.package && <Pill label={detail.package} color={data.packages.find(p=>p.name===detail.package)?.color||T.gold}/>}
          </div>
          {[["Müşteri",detail.clientName],["Tarih",fmtDate(detail.date)]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between",
              borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12 }}>
              <span style={{ fontSize:13, color:T.text3 }}>{l}</span>
              <span style={{ fontSize:14, fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div style={{ background:T.card2, borderRadius:14, padding:14, marginBottom:16 }}>
            {detail.package && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13, fontWeight:600 }}>📦 {detail.package}</span>
                <span style={{ ...NUM_FONT, fontSize:14, fontWeight:600, color:T.gold }}>{fmt(detail.basePrice)}</span>
              </div>
            )}
            {(detail.items||[]).map(i=>(
              <div key={i.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:T.text2 }}>➕ {i.label}</span>
                <span style={{ ...NUM_FONT, fontSize:13, fontWeight:600 }}>{fmt(i.amount)}</span>
              </div>
            ))}
            {detail.discount>0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, color:T.greenL }}>
                <span style={{ fontSize:13 }}>🎁 İndirim</span>
                <span style={{ ...NUM_FONT, fontSize:13, fontWeight:600 }}>-{fmt(detail.discount)}</span>
              </div>
            )}
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:4, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:14, fontWeight:700 }}>Toplam</span>
              <span style={{ ...NUM_FONT, fontSize:20, fontWeight:700, color:T.gold }}>{fmt(detail.total)}</span>
            </div>
          </div>
          {detail.note && <div style={{ background:T.card2, borderRadius:12, padding:"12px 14px", fontSize:13, color:T.text2, marginBottom:16 }}>📝 {detail.note}</div>}
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            {["taslak","gönderildi","onaylandı","reddedildi"].map(s=>(
              <button key={s} onClick={()=>setData(p=>({...p,quotes:p.quotes.map(q=>q.id===detail.id?{...q,status:s}:q)}))}
                style={{ flex:1, background:detail.status===s?(STATUS_Q[s]||T.gold)+"22":"transparent",
                  color:STATUS_Q[s]||T.text3, border:`1px solid ${(STATUS_Q[s]||T.border)}44`,
                  borderRadius:10, padding:"8px 4px", fontSize:10, fontWeight:600 }}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
          <GoldButton label="WhatsApp ile Gönder" icon="send" onClick={()=>sendWA(detail)} full/>
          {isAdmin && (
            <GoldButton label="Teklifi Sil" icon="trash" variant="danger" full
              onClick={()=>{ sb.delete("quotes", detail.id).catch(()=>{}); setData(p=>({...p, quotes:p.quotes.filter(q=>q.id!==detail.id)})); setDetailId(null); }}
              style={{ marginTop:8 }}/>
          )}
        </BottomSheet>
      )}

      {/* YENİ TEKLİF FORMU */}
      {showAdd && (
        <BottomSheet title="Yeni Fiyat Teklifi" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Müşteri Adı" value={form.clientName} onChange={f("clientName")}
              placeholder="Ad Soyad" options={["", ...data.clients.map(c=>c.name)]} required/>
            <Field label="Paket (opsiyonel)" value={form.package} onChange={f("package")}
              options={["Paket seçme", ...data.packages.map(p=>p.name)]}/>
            {selectedPkg && (
              <div style={{ background:T.card2, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:12, color:T.text3, marginBottom:6 }}>Paket içeriği</div>
                {selectedPkg.includes.map((inc,i)=>(
                  <div key={i} style={{ fontSize:12, color:T.text2, marginBottom:4 }}>• {inc}</div>
                ))}
                <div style={{ ...NUM_FONT, fontSize:16, fontWeight:700, color:T.gold, marginTop:8 }}>{fmt(selectedPkg.price)}</div>
              </div>
            )}
            <div style={{ background:T.card2, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:12, color:T.text3, fontWeight:600, marginBottom:12 }}>Ekstra Kalemler</div>
              {form.items.map(i=>(
                <div key={i.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:13 }}>{i.label}</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ ...NUM_FONT, fontSize:13, fontWeight:600, color:T.gold }}>{fmt(i.amount)}</span>
                    <button onClick={()=>removeItem(i.id)} style={{ background:T.red+"1A", border:"none", borderRadius:6, width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n="close" s={11} c={T.redL}/>
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <input value={customItem.label} onChange={e=>setCustomItem(p=>({...p,label:e.target.value}))}
                  placeholder="Kalem adı (Drone, Albüm...)"
                  style={{ flex:2, background:T.card3, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", color:T.text, fontSize:13 }}/>
                <input value={customItem.amount} onChange={e=>setCustomItem(p=>({...p,amount:e.target.value}))}
                  placeholder="₺" type="number"
                  style={{ flex:1, background:T.card3, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", color:T.text, fontSize:13 }}/>
                <button onClick={addItem} style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:10, padding:"0 12px", color:T.gold, fontWeight:700, fontSize:18 }}>+</button>
              </div>
            </div>
            <Field label="İndirim (₺)" type="number" value={form.discount} onChange={f("discount")} placeholder="0"/>
            <Field label="Not" value={form.note} onChange={f("note")} textarea rows={2} placeholder="Geçerlilik süresi, özel şartlar..."/>
            <div style={{ background:T.gold+"1A", border:`1px solid ${T.gold}33`, borderRadius:12, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, color:T.text2 }}>Ara Toplam</span>
                <span style={{ ...NUM_FONT, fontSize:13 }}>{fmt(subtotal)}</span>
              </div>
              {discount>0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, color:T.greenL }}>İndirim</span>
                <span style={{ ...NUM_FONT, fontSize:13, color:T.greenL }}>-{fmt(discount)}</span>
              </div>}
              <div style={{ display:"flex", justifyContent:"space-between", borderTop:`1px solid ${T.gold}33`, paddingTop:10, marginTop:6 }}>
                <span style={{ fontSize:15, fontWeight:700 }}>TOPLAM</span>
                <span style={{ ...NUM_FONT, fontSize:20, fontWeight:700, color:T.gold }}>{fmt(total)}</span>
              </div>
            </div>
            <GoldButton label="Teklifi Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// MÜŞTERİ PORTALI UI
// ════════════════════════════════════════════════
