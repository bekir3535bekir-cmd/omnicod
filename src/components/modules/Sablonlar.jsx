import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Sablonlar = ({ data }) => {
  const [copied, setCopied] = useState(null);
  const [selClient, setSelClient] = useState("");
  const client = data.clients.find(c=>c.name===selClient)||{};
  const apt    = data.appointments.find(a=>a.clientName===selClient)||{};

  const fillTemplate = (text) => {
    return text
      .replace("{isim}", selClient.split(" ")[0]||"{isim}")
      .replace("{tarih}", apt.date ? fmtDate(apt.date) : "{tarih}")
      .replace("{saat}",  apt.time||"{saat}")
      .replace("{konum}", apt.location||"{konum}")
      .replace("{tip}",   apt.type||"{tip}")
      .replace("{tutar}", client.totalAmount>0 ? fmt(client.totalAmount-client.paid) : "{tutar}");
  };

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopied(id);
    setTimeout(()=>setCopied(null), 2000);
  };

  const CATEGORIES = [
    { label:"📅 Randevu", templates: MSG_TEMPLATES.filter((_,i)=>i<2) },
    { label:"🔔 Hatırlatma", templates: MSG_TEMPLATES.filter((_,i)=>i===2||i===4) },
    { label:"🎉 Teşekkür & Teslimat", templates: MSG_TEMPLATES.filter((_,i)=>i===3||i===5) },
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Hazır Şablonlar" sub="Müşterilere gönderilecek mesajlar"/>
      <div style={{ padding:"0 20px" }}>
        {/* Müşteri seç */}
        <Card style={{ marginBottom:20, padding:16 }}>
          <div style={{ fontSize:13, color:T.text2, fontWeight:500, marginBottom:10 }}>
            💡 Müşteri seçersen bilgiler otomatik dolar
          </div>
          <select value={selClient} onChange={e=>setSelClient(e.target.value)}
            style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
              padding:"11px 14px", color:T.text, fontSize:14, width:"100%" }}>
            <option value="">Müşteri seç (opsiyonel)</option>
            {data.clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Card>

        {CATEGORIES.map(cat=>(
          <div key={cat.label} style={{ marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text2, marginBottom:12, letterSpacing:"0.3px" }}>{cat.label}</div>
            {cat.templates.map((tpl,i)=>{
              const filled = fillTemplate(tpl.text);
              const isCopied = copied===`${cat.label}-${i}`;
              return (
                <Card key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:T.goldL }}>{tpl.label}</span>
                    <button onClick={()=>copyText(filled,`${cat.label}-${i}`)}
                      style={{ display:"flex", alignItems:"center", gap:6, background:isCopied?T.green+"22":T.gold+"1A",
                        border:`1px solid ${isCopied?T.green:T.gold}44`, borderRadius:8,
                        padding:"6px 12px", fontSize:12, fontWeight:600, color:isCopied?T.greenL:T.gold,
                        transition:"all 0.2s" }}>
                      <Ic n={isCopied?"check":"copy"} s={13} c={isCopied?T.greenL:T.gold}/>
                      {isCopied?"Kopyalandı!":"Kopyala"}
                    </button>
                  </div>
                  <div style={{ background:T.card2, borderRadius:10, padding:"12px 14px",
                    fontSize:13, color:T.text2, lineHeight:1.6, borderLeft:`2px solid ${T.gold}44` }}>
                    {filled}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════
// PAKETLER
// ════════════════════════════════════════════════
