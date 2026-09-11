import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Paketler = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const [showAdd, setShowAdd] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const F = { name:"", price:"", color:T.gold, includes:[""], note:"" };
  const [form, setForm] = useState(F);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const save = () => {
    if(!form.name||!form.price) return;
    const newPkg = {...form, id:uid(), price:Number(form.price), includes:form.includes.filter(Boolean)};
    setData(p=>({...p, packages:[...p.packages, newPkg]}));
    sb.upsert("packages", toDB.packages(newPkg)).catch(()=>{});
    setShowAdd(false); setForm(F);
  };

  const saveEdit = () => {
    if(!editPkg.name||!editPkg.price) return;
    setData(p=>({...p,packages:p.packages.map(pkg=>pkg.id===editPkg.id
      ? {...editPkg, price:Number(editPkg.price), includes:(editPkg.includes||[]).filter(Boolean)}
      : pkg
    )}));
    setEditPkg(null);
  };

  const deletePkg = (pkg) => {
    sb.delete("packages", pkg.id).catch(()=>{});
    setData(p=>({...p, packages:p.packages.filter(x=>x.id!==pkg.id)}));
  };

  const COLORS = ["#B8953F","#8A9BB0","#C4893A","#4A90D9","#7B68EE","#E87040","#4CAF50","#C94C9F"];

  return (
    <div className="fade-in">
      <PageHeader title="Paketler" sub="Hizmet paketleri ve fiyatlar" action={isAdmin} onAction={()=>setShowAdd(true)} actionLabel="Paket Ekle"/>
      <div style={{ padding:"0 20px" }}>
        {[...data.packages].sort((a,b)=>a.price-b.price).map(pkg=>{
          const useCount = data.clients.filter(c=>c.package===pkg.name).length;
          return (
            <Card key={pkg.id} style={{ marginBottom:14, borderColor:pkg.color+"44" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"Playfair Display", fontSize:24, fontWeight:600, color:pkg.color }}>{pkg.name}</div>
                  {useCount>0 && <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>{useCount} müşteri bu pakette</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ ...NUM_FONT, fontSize:26, fontWeight:700, color:pkg.color }}>{fmt(pkg.price)}</div>
                  {isAdmin && (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <button onClick={()=>setEditPkg({...pkg, price:String(pkg.price), includes:[...(pkg.includes||[])]})}
                        style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`, borderRadius:9,
                          width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Ic n="edit" s={13} c={T.blueL}/>
                      </button>
                      <button onClick={()=>deletePkg(pkg)}
                        style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:9,
                          width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Ic n="trash" s={13} c={T.redL}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
                {(pkg.includes||[]).map((item,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
                    <div style={{ width:7, height:7, borderRadius:99, background:pkg.color, flexShrink:0 }}/>
                    <span style={{ fontSize:13, color:T.text2 }}>{item}</span>
                  </div>
                ))}
              </div>
              {pkg.note && (
                <div style={{ marginTop:12, background:T.card2, borderRadius:10, padding:"10px 14px",
                  fontSize:12, color:T.text3, fontStyle:"italic", borderLeft:`2px solid ${pkg.color}` }}>
                  {pkg.note}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* YENİ PAKET */}
      {showAdd && (
        <BottomSheet title="Yeni Paket" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Paket Adı" value={form.name} onChange={f("name")} placeholder="Örn: Platin Paket" required/>
            <Field label="Fiyat (₺)" type="number" value={form.price} onChange={f("price")} required/>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>Renk</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>setForm(p=>({...p,color:c}))}
                    style={{ width:30, height:30, borderRadius:99, background:c,
                      border:form.color===c?`3px solid ${T.text}`:"2px solid transparent" }}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:10 }}>Paket İçerikleri</div>
              {form.includes.map((inc,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <Field value={inc} onChange={v=>setForm(p=>({...p,includes:p.includes.map((x,j)=>i===j?v:x)}))} placeholder={`İçerik ${i+1}`}/>
                  </div>
                  {form.includes.length>1 && (
                    <button onClick={()=>setForm(p=>({...p,includes:p.includes.filter((_,j)=>j!==i)}))}
                      style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:8,
                        width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Ic n="trash" s={12} c={T.redL}/>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={()=>setForm(p=>({...p,includes:[...p.includes,""]}))}
                style={{ background:"transparent", border:`1.5px dashed ${T.border}`, borderRadius:12, padding:"10px",
                  color:T.text3, fontSize:13, width:"100%", marginTop:4 }}>+ İçerik Ekle</button>
            </div>
            <Field label="Not / Açıklama" value={form.note} onChange={f("note")} textarea placeholder="Paket hakkında..."/>
            <GoldButton label="Paketi Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}

      {/* PAKET DÜZENLE */}
      {editPkg && (
        <BottomSheet title="Paketi Düzenle" onClose={()=>setEditPkg(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Paket Adı" value={editPkg.name} onChange={v=>setEditPkg(p=>({...p,name:v}))} placeholder="Paket adı" required/>
            <Field label="Fiyat (₺)" type="number" value={editPkg.price} onChange={v=>setEditPkg(p=>({...p,price:v}))} required/>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>Renk</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>setEditPkg(p=>({...p,color:c}))}
                    style={{ width:30, height:30, borderRadius:99, background:c,
                      border:editPkg.color===c?`3px solid ${T.text}`:"2px solid transparent" }}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:10 }}>Paket İçerikleri</div>
              {(editPkg.includes||[]).map((inc,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <Field value={inc} onChange={v=>setEditPkg(p=>({...p,includes:p.includes.map((x,j)=>i===j?v:x)}))} placeholder={`İçerik ${i+1}`}/>
                  </div>
                  {(editPkg.includes||[]).length>1 && (
                    <button onClick={()=>setEditPkg(p=>({...p,includes:p.includes.filter((_,j)=>j!==i)}))}
                      style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:8,
                        width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Ic n="trash" s={12} c={T.redL}/>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={()=>setEditPkg(p=>({...p,includes:[...(p.includes||[]),""]}))}
                style={{ background:"transparent", border:`1.5px dashed ${T.border}`, borderRadius:12, padding:"10px",
                  color:T.text3, fontSize:13, width:"100%", marginTop:4 }}>+ İçerik Ekle</button>
            </div>
            <Field label="Not / Açıklama" value={editPkg.note||""} onChange={v=>setEditPkg(p=>({...p,note:v}))} textarea placeholder="Paket hakkında..."/>
            <GoldButton label="Değişiklikleri Kaydet" icon="check" onClick={saveEdit} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// SÖZLEŞMELER
// ════════════════════════════════════════════════
