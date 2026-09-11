import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Mesajlar = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const [sel, setSel]           = useState(null);
  const [msg, setMsg]           = useState("");
  const [showTpl, setShowTpl]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [mainTab, setMainTab]   = useState("mesajlar");
  const [customTpls, setCustomTpls] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("geses_custom_tpls")||"[]"); } catch{ return []; }
  });
  const [showAddTpl, setShowAddTpl] = useState(false);
  const [tplForm, setTplForm]   = useState({ label:"", text:"", category:"Genel" });
  const [selTplWA, setSelTplWA] = useState(null);
  const chatEnd = useRef(null);

  useEffect(()=>{if(chatEnd.current) chatEnd.current.scrollIntoView({behavior:"smooth"});},[sel?.chat?.length]);

  const allTpls = [...MSG_TEMPLATES, ...customTpls];
  const TPL_CATEGORIES = ["Genel","Randevu","Ödeme","Teslimat","Özel"];

  const saveCustomTpls = (updated) => {
    setCustomTpls(updated);
    localStorage.setItem("geses_custom_tpls", JSON.stringify(updated));
  };
  const addCustomTpl = () => {
    if(!tplForm.label.trim()||!tplForm.text.trim()) return;
    saveCustomTpls([...customTpls,{...tplForm,id:uid(),custom:true}]);
    setShowAddTpl(false); setTplForm({label:"",text:"",category:"Genel"});
  };
  const deleteCustomTpl = id => saveCustomTpls(customTpls.filter(t=>t.id!==id));

  const fillTpl = (tpl, client) => {
    const apt = data.appointments.find(a=>a.clientId===client?.id||a.clientName===client?.name)||{};
    return tpl.text
      .replace(/\{isim\}/g, client?.name?.split(" ")[0]||"")
      .replace(/\{tarih\}/g, fmtDate(apt.date))
      .replace(/\{saat\}/g, apt.time||"")
      .replace(/\{konum\}/g, apt.location||"")
      .replace(/\{tip\}/g, apt.type||"Düğün")
      .replace(/\{tutar\}/g, client?.totalAmount>0?fmt(client.totalAmount-client.paid):"");
  };

  const useTpl = (tpl) => {
    const client = data.clients.find(c=>c.id===sel?.clientId)||{};
    setMsg(fillTpl(tpl,client)); setShowTpl(false);
  };

  const sendWATpl = (tpl, client) => {
    const ph = client?.phone?.replace(/\D/g,"").replace(/^0/,"");
    const url = ph
      ? `https://wa.me/90${ph}?text=${encodeURIComponent(fillTpl(tpl,client))}`
      : `https://wa.me/?text=${encodeURIComponent(fillTpl(tpl,client))}`;
    window.open(url,"_blank");
    setSelTplWA(null);
  };

  const sendMsg = () => {
    if(!msg.trim()) return;
    const m={from:"me",text:msg.trim(),time:new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}),date:todayStr()};
    setData(p=>({...p,messages:p.messages.map(x=>x.id===sel.id?{...x,chat:[...x.chat,m],lastMsg:msg.trim(),unread:0}:x)}));
    setSel(s=>({...s,chat:[...s.chat,m]}));
    setMsg("");
  };

  const addConvo = () => {
    if(!newName.trim()) return;
    const c={id:uid(),clientId:null,clientName:newName.trim(),unread:0,lastMsg:"",chat:[]};
    setData(p=>({...p,messages:[...p.messages,c]}));
    setShowNew(false); setNewName(""); setSel(c);
  };

  const deleteConvo = (id) => {
    sb.delete("messages", id).catch(()=>{});
    setData(p=>({...p,messages:p.messages.filter(x=>x.id!==id)}));
    setSel(null);
  };

  if(sel) return (
    <div style={{ position:"fixed", inset:0, background:T.bg, zIndex:150, display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto" }}>
      <div style={{ padding:"54px 16px 14px", background:T.surface, borderBottom:`1px solid ${T.border}`,
        display:"flex", gap:12, alignItems:"center" }}>
        <button onClick={()=>setSel(null)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic n="back" s={16} c={T.text2}/>
        </button>
        <div style={{ background:T.goldGlow, borderRadius:99, width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", ...NUM_FONT, fontSize:18, fontWeight:700, color:T.goldL, flexShrink:0 }}>
          {sel.clientName.charAt(0)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:15 }}>{sel.clientName}</div>
          <div style={{ fontSize:11, color:T.text3 }}>{data.clients.find(c=>c.id===sel.clientId)?.package||"Müşteri"}</div>
        </div>
        {isAdmin && (
          <button onClick={()=>deleteConvo(sel.id)} style={{ background:T.red+"1A", border:`1px solid ${T.red}33`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Ic n="trash" s={16} c={T.redL}/>
          </button>
        )}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
        {sel.chat.length===0 && <div style={{ textAlign:"center", padding:40 }}><div style={{ fontSize:13, color:T.text3 }}>Konuşmayı başlat veya hazır şablon kullan</div></div>}
        {sel.chat.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.from==="me"?"flex-end":"flex-start", marginBottom:10 }}>
            <div style={{ background:m.from==="me"?`linear-gradient(135deg,${T.goldL},${T.goldD})`:T.card2, color:m.from==="me"?T.bg:T.text, borderRadius:m.from==="me"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", maxWidth:"78%", fontSize:14, lineHeight:1.5 }}>
              {m.text}
              <div style={{ fontSize:10, marginTop:4, opacity:0.6, textAlign:"right" }}>{m.time}</div>
            </div>
          </div>
        ))}
        <div ref={chatEnd}/>
      </div>
      <div style={{ padding:"10px 12px 36px", background:T.surface, borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <button onClick={()=>setShowTpl(true)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"11px", flexShrink:0 }}>
            <Ic n="copy" s={18} c={T.gold}/>
          </button>
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Mesaj yaz..." rows={1}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
            style={{ flex:1, background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"11px 14px", color:T.text, fontSize:14, resize:"none", lineHeight:1.4 }}/>
          <button onClick={sendMsg} style={{ background:`linear-gradient(135deg,${T.goldL},${T.goldD})`, borderRadius:12, padding:"11px", flexShrink:0 }}>
            <Ic n="send" s={18} c={T.bg}/>
          </button>
        </div>
      </div>
      {showTpl && (
        <BottomSheet title="Hazır Şablonlar" onClose={()=>setShowTpl(false)}>
          {allTpls.map((t,i)=>(
            <div key={i} onClick={()=>useTpl(t)} style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10, cursor:"pointer" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.goldL, marginBottom:6 }}>{t.label}</div>
              <div style={{ fontSize:12, color:T.text2, lineHeight:1.5 }}>{t.text.slice(0,90)}...</div>
            </div>
          ))}
        </BottomSheet>
      )}
    </div>
  );

  return (
    <div className="fade-in">
      <PageHeader title="Mesajlar" sub="Müşteri iletişimi"/>

      {/* Ana Sekmeler */}
      <div style={{ display:"flex", gap:8, padding:"0 20px 16px" }}>
        {[["mesajlar","💬 Mesajlar"],["sablonlar","📋 WA Şablonları"]].map(([id,l])=>(
          <button key={id} onClick={()=>setMainTab(id)}
            style={{ flex:1, background:mainTab===id?T.gold:"transparent",
              color:mainTab===id?T.bg:T.text2, border:`1px solid ${mainTab===id?T.gold:T.border}`,
              borderRadius:12, padding:"10px", fontSize:13, fontWeight:600 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Mesajlar */}
      {mainTab==="mesajlar" && (
        <div style={{ padding:"0 20px" }}>
          <GoldButton label="Yeni Konuşma" icon="plus" onClick={()=>setShowNew(true)} full style={{ marginBottom:16 }}/>
          {data.messages.length===0
            ? <EmptyState icon="msg" title="Henüz Mesaj Yok" sub="Müşterilerinle buradan iletişim kurabilirsin."/>
            : data.messages.map(m=>(
              <Card key={m.id} onClick={()=>setSel(m)} style={{ marginBottom:10, display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ background:T.goldGlow, borderRadius:99, width:48, height:48, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", ...NUM_FONT, fontSize:20, fontWeight:700, color:T.goldL }}>
                  {m.clientName.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:15 }}>{m.clientName}</div>
                  <div style={{ fontSize:12, color:T.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:3 }}>{m.lastMsg||"Henüz mesaj yok"}</div>
                </div>
                {m.unread>0 && <div style={{ background:T.gold, borderRadius:99, minWidth:22, height:22, padding:"0 6px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.bg }}>{m.unread}</div>}
              </Card>
            ))
          }
        </div>
      )}

      {/* WA Şablonları */}
      {mainTab==="sablonlar" && (
        <div style={{ padding:"0 20px 120px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:13, color:T.text3 }}>Hazır mesajlar tek tıkla WA'ya gider</div>
            <button onClick={()=>setShowAddTpl(true)}
              style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:10,
                padding:"6px 14px", fontSize:12, fontWeight:700, color:T.goldL }}>
              + Şablon Ekle
            </button>
          </div>
          {allTpls.map((tpl,i)=>(
            <div key={i} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.goldL }}>{tpl.label}</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {tpl.category && <Pill label={tpl.category} color={T.text3}/>}
                  {tpl.custom && (
                    <button onClick={()=>deleteCustomTpl(tpl.id)}
                      style={{ background:T.red+"1A", borderRadius:8, padding:"4px 6px", display:"flex", alignItems:"center" }}>
                      <Ic n="trash" s={12} c={T.redL}/>
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize:12, color:T.text2, lineHeight:1.6, marginBottom:12, background:T.card2, borderRadius:10, padding:"10px 12px" }}>
                {tpl.text.replace(/\{isim\}/g,"[İsim]").replace(/\{tarih\}/g,"[Tarih]").replace(/\{saat\}/g,"[Saat]").replace(/\{konum\}/g,"[Konum]").replace(/\{tip\}/g,"[Etkinlik]").replace(/\{tutar\}/g,"[Tutar]")}
              </div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
                {["{isim}","{tarih}","{saat}","{konum}","{tip}","{tutar}"].filter(v=>tpl.text.includes(v)).map(v=>(
                  <span key={v} style={{ background:T.blue+"1A", color:T.blueL, fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:99 }}>{v}</span>
                ))}
              </div>
              <div style={{ fontSize:11, color:T.text3, marginBottom:6 }}>Müşteri seç ve gönder:</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {data.clients.filter(c=>c.status!=="arşiv").slice(0,5).map(c=>(
                  <button key={c.id} onClick={()=>sendWATpl(tpl,c)}
                    style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99,
                      padding:"5px 10px", fontSize:11, fontWeight:600, color:T.text2, display:"flex", alignItems:"center", gap:4 }}>
                    {c.name.split(" ")[0]}
                    {c.phone && <span style={{ color:"#25D366", fontSize:11 }}>✓</span>}
                  </button>
                ))}
                {data.clients.filter(c=>c.status!=="arşiv").length > 5 && (
                  <button onClick={()=>setSelTplWA(tpl)}
                    style={{ background:T.gold+"22", border:`1px solid ${T.gold}44`, borderRadius:99, padding:"5px 10px", fontSize:11, fontWeight:600, color:T.goldL }}>
                    Tümü...
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tüm müşteri listesi */}
      {selTplWA && (
        <BottomSheet title={`Müşteri Seç — ${selTplWA.label}`} onClose={()=>setSelTplWA(null)}>
          {data.clients.filter(c=>c.status!=="arşiv").map(c=>(
            <div key={c.id} onClick={()=>sendWATpl(selTplWA,c)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, paddingBottom:12, marginBottom:12, cursor:"pointer" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{c.name}</div>
                <div style={{ fontSize:11, color:T.text3 }}>{c.phone||"Telefon yok"}</div>
              </div>
              <div style={{ background:"#25D36622", border:"1px solid #25D36644", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#25D366" }}>WA 💬</div>
            </div>
          ))}
        </BottomSheet>
      )}

      {/* Şablon Ekle */}
      {showAddTpl && (
        <BottomSheet title="Özel Şablon Ekle" onClose={()=>setShowAddTpl(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Şablon Adı" value={tplForm.label} onChange={v=>setTplForm(p=>({...p,label:v}))} placeholder="Örn: Albüm Hatırlatması"/>
            <div>
              <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:6 }}>Kategori</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {TPL_CATEGORIES.map(c=>(
                  <button key={c} onClick={()=>setTplForm(p=>({...p,category:c}))}
                    style={{ background:tplForm.category===c?T.gold+"22":"transparent", border:`1px solid ${tplForm.category===c?T.gold:T.border}`, borderRadius:99, padding:"5px 12px", fontSize:12, fontWeight:tplForm.category===c?700:400, color:tplForm.category===c?T.goldL:T.text2 }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Mesaj Metni" value={tplForm.text} onChange={v=>setTplForm(p=>({...p,text:v}))} textarea placeholder="Merhaba {isim}! ..."/>
            <div style={{ fontSize:11, color:T.text3, lineHeight:1.7 }}>
              Değişkenler: <span style={{ color:T.blueL }}>{"{isim} {tarih} {saat} {konum} {tip} {tutar}"}</span>
            </div>
            <GoldButton label="Şablonu Kaydet" icon="check" onClick={addCustomTpl} full/>
          </div>
        </BottomSheet>
      )}

      {showNew && (
        <BottomSheet title="Yeni Konuşma" onClose={()=>setShowNew(false)}>
          <Field label="Müşteri Adı" value={newName} onChange={setNewName} placeholder="Ad Soyad"/>
          <div style={{ marginTop:16 }}><GoldButton label="Başlat" icon="msg" onClick={addConvo} full/></div>
        </BottomSheet>
      )}
    </div>
  );
};
// ════════════════════════════════════════════════
// HATIRLATICILAR
// ════════════════════════════════════════════════
