import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Portal = ({ data }) => {
  const [selClient, setSelClient] = useState("");
  const [portalOpen, setPortalOpen] = useState(false);
  const [selections, setSelections] = useState({});

  const client = data.clients.find(c=>c.id===selClient);
  const galleryPhotos = data.gallery.filter(g=>g.clientId===selClient || !g.clientId);

  const toggle = (id) => setSelections(p=>({...p,[id]:!p[id]}));
  const selectedCount = Object.values(selections).filter(Boolean).length;

  const sendPortalLink = () => {
    if(!client?.phone) return;
    const phone = client.phone.replace(/\D/g,"").replace(/^0/,"");
    const msg = `Merhaba ${client.name} hanım/bey 👋\n\nÇekimleriniz hazır! Aşağıdaki simülasyon üzerinden favori fotoğraflarınızı seçebilirsiniz.\n\nSeçimlerinizi yaptıktan sonra bize bildirmeniz yeterli.\n\nOmniCod 📸`;
    window.open(`https://wa.me/90${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="fade-in">
      <PageHeader title="Müşteri Portali" sub="Fotoğraf seçim sistemi"/>
      <div style={{ padding:"0 20px" }}>
        <div style={{ background:T.gold+"1A", border:`1px solid ${T.gold}33`, borderRadius:14, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.gold, marginBottom:6 }}>🔗 Nasıl Çalışır?</div>
          <div style={{ fontSize:12, color:T.text2, lineHeight:1.7 }}>
            Müşterinizi seç → Galeri fotoğraflarını göster → Müşteri ❤️ işaretler → WhatsApp ile bildir
          </div>
          <div style={{ marginTop:10, fontSize:11, color:T.text3 }}>
            ⚠️ Gerçek link için Supabase + Vercel kurulumu gerekli
          </div>
        </div>

        <Field label="Müşteri Seç" value={selClient}
          onChange={v=>{ setSelClient(v); setSelections({}); setPortalOpen(false); }}
          options={["", ...data.clients.map(c=>c.id)]}/>
        {selClient && !portalOpen && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, color:T.text2, marginBottom:10 }}>
              Seçilen: <strong>{client?.name}</strong>
              {galleryPhotos.length>0 ? ` · ${galleryPhotos.length} fotoğraf` : " · Galeride fotoğraf yok"}
            </div>
            <GoldButton label="Portali Simüle Et" icon="eye" onClick={()=>setPortalOpen(true)} full/>
          </div>
        )}

        {/* MÜŞTERİ PORTAL SİMÜLASYONU */}
        {portalOpen && client && (
          <div className="fade-in" style={{ marginTop:16 }}>
            <div style={{ background:T.card, border:`1px solid ${T.gold}44`, borderRadius:16, overflow:"hidden" }}>
              {/* Portal header */}
              <div style={{ background:`linear-gradient(135deg,${T.goldD},${T.goldL})`, padding:"20px 16px" }}>
                <div style={{ fontFamily:"Playfair Display", fontSize:20, fontWeight:700, color:T.bg }}>OmniCod</div>
                <div style={{ fontSize:13, color:T.bg+"CC", marginTop:4 }}>Merhaba, {client.name} 👋</div>
                <div style={{ fontSize:12, color:T.bg+"99", marginTop:2 }}>Favori fotoğraflarınızı seçin</div>
              </div>
              {/* Photos */}
              <div style={{ padding:14 }}>
                {galleryPhotos.length===0 ? (
                  <div style={{ textAlign:"center", padding:30, color:T.text3, fontSize:13 }}>
                    Önce Portföy Galerisi'ne fotoğraf ekleyin
                  </div>
                ) : (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                      {galleryPhotos.map((g,i)=>(
                        <div key={g.id} onClick={()=>toggle(g.id)}
                          style={{ aspectRatio:"1", borderRadius:10, overflow:"hidden", position:"relative", cursor:"pointer",
                            background:selections[g.id]?T.green+"22":T.card2,
                            border:`2px solid ${selections[g.id]?T.green:T.border}`, transition:"all 0.2s" }}>
                          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:24, background:g.color||T.card2 }}>
                            {g.emoji||"📷"}
                          </div>
                          {selections[g.id] && (
                            <div style={{ position:"absolute", top:4, right:4, background:T.green,
                              borderRadius:99, width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Ic n="check" s={11} c="#fff"/>
                            </div>
                          )}
                          <div style={{ position:"absolute", bottom:4, left:4, fontSize:9, color:T.text3,
                            background:T.bg+"CC", borderRadius:4, padding:"2px 5px" }}>#{i+1}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background:T.card2, borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:14, fontWeight:600, color:T.gold }}>{selectedCount} fotoğraf seçildi</div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>Seçimlerinizi tamamladığınızda bildirin</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <GoldButton label="WhatsApp ile Bildir" icon="send" onClick={sendPortalLink} full/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════
// RAPORLAR
// ════════════════════════════════════════════════
