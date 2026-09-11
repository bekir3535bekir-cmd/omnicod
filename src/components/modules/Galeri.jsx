import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Galeri = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const [filter, setFilter] = useState("Tümü");
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const F = { category:"Düğün", title:"", url:"" };
  const [form, setForm] = useState(F);
  const cats = ["Tümü",...[...new Set(data.gallery.map(g=>g.category))]];
  const filtered = filter==="Tümü"?data.gallery:data.gallery.filter(g=>g.category===filter);
  const save = () => {
    const newG = {...form, id:uid()};
    setData(p=>({...p, gallery:[...p.gallery, newG]}));
    sb.upsert("gallery", toDB.gallery(newG)).catch(()=>{});
    setShowAdd(false); setForm(F);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Portföy" sub={`${data.gallery.length} fotoğraf`} action={isAdmin} onAction={()=>setShowAdd(true)} actionLabel="Ekle"/>
      {data.gallery.length>0 && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 20px 16px" }}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setFilter(c)}
              style={{ background:filter===c?T.gold:"transparent", color:filter===c?T.bg:T.text2,
                border:`1px solid ${filter===c?T.gold:T.border}`, borderRadius:99, padding:"7px 14px",
                fontSize:12, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding:"0 20px" }}>
        {filtered.length===0 ? <EmptyState icon="camera" title="Portföy Boş" sub="Fotoğraflarını ekleyerek portföyünü oluştur." action="Fotoğraf Ekle" onAction={()=>setShowAdd(true)}/> : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {filtered.map(g=>(
              <div key={g.id} onClick={()=>setSel(g)}
                style={{ borderRadius:16, overflow:"hidden", cursor:"pointer", position:"relative", aspectRatio:"1",
                  background:T.card, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {g.url ? (
                  <><img src={g.url} alt={g.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{e.target.style.display="none"}}/>
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%)" }}/>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 12px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{g.title}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)" }}>{g.category}</div>
                  </div></>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:20 }}>
                    <Ic n="camera" s={28} c={T.text3}/>
                    <span style={{ fontSize:12, color:T.text3, textAlign:"center" }}>{g.title}</span>
                    <Pill label={g.category}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {sel && (
        <BottomSheet title={sel.title} onClose={()=>setSel(null)}>
          {sel.url && <img src={sel.url} alt={sel.title} style={{ width:"100%", borderRadius:14, marginBottom:14 }}/>}
          <Pill label={sel.category}/>
          {isAdmin && (
            <GoldButton label="Fotoğrafı Sil" icon="trash" variant="danger" full
              onClick={()=>{ sb.delete("gallery", sel.id).catch(()=>{}); setData(p=>({...p, gallery:p.gallery.filter(g=>g.id!==sel.id)})); setSel(null); }}
              style={{ marginTop:14 }}/>
          )}
        </BottomSheet>
      )}
      {showAdd && (
        <BottomSheet title="Fotoğraf Ekle" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Başlık" value={form.title} onChange={v=>setForm(p=>({...p,title:v}))} placeholder="Fotoğraf başlığı"/>
            <Field label="Kategori" value={form.category} onChange={v=>setForm(p=>({...p,category:v}))} options={["Düğün","Nişan","Kına","Portre","Bebek","Mezuniyet","Dış Çekim","Diğer"]}/>
            <Field label="Fotoğraf URL" value={form.url} onChange={v=>setForm(p=>({...p,url:v}))} placeholder="https://..." note="Opsiyonel"/>
            <GoldButton label="Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// FİYAT TEKLİFİ OLUŞTURUCU
// ════════════════════════════════════════════════
