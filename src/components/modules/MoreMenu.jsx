import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { PlanBadge, ProBadge } from "../common/ProGate";
import { PLANS, getTrialInfo } from "../../services/plan";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const MoreMenu = ({ setActive, darkMode, setDarkMode, role, plan, onLogout, themeKey = "sapphire", setThemeKey }) => {
  const [showSifre,   setShowSifre]   = useState(false);
  const [showAyarlar, setShowAyarlar] = useState(false);
  const [sForm, setSForm] = useState({ adminPass:"", personelPass:"" });
  const saveSifre = () => {
    if(sForm.adminPass.length >= 4)    setPass("geses_admin_pass",    sForm.adminPass);
    if(sForm.personelPass.length >= 4) setPass("geses_personel_pass", sForm.personelPass);
    setShowSifre(false);
    setSForm({ adminPass:"", personelPass:"" });
    alert("✅ Şifreler güncellendi!");
  };

  const isPro = plan === "pro";
  const isTrial = plan === "trial";
  const trial = getTrialInfo();

  const THEMES = [
    { key: "sapphire", name: "Safir & Titanyum", sub: "Modern stüdyo koyu palet", icon: "💎", primary: "#3B82F6", bg: "#090D16" },
    { key: "emerald",  name: "Zümrüt & Grafit",   sub: "Derin yeşil fotoğrafçı paleti", icon: "🌿", primary: "#10B981", bg: "#06100D" },
    { key: "nordic",   name: "Nordic Aydınlık",  sub: "Ferah ve minimalist beyaz", icon: "🕊️", primary: "#2563EB", bg: "#F8FAFC" },
  ];

  return (
  <div className="fade-in">
    <PageHeader title="Diğer Modüller" sub="Tüm stüdyo araçları"/>
    <div style={{ padding:"0 20px" }}>

      {/* Plan Yönetim Kartı */}
      <Card onClick={()=>setActive("planyonetimi")} style={{ marginBottom:14, padding:16, display:"flex", alignItems:"center", gap:14, borderColor:isPro?T.gold:isTrial?T.blue:T.border, background:isPro?T.gold+"12":isTrial?T.blue+"12":T.card, cursor:"pointer" }}>
        <div style={{ fontSize:28 }}>{isPro?"👑":isTrial?"⏳":"🆓"}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>{isPro?"Pro Plan":isTrial?"Pro Deneme":"Basic Plan"}</span>
            <PlanBadge plan={plan}/>
          </div>
          <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>
            {isPro ? "Sınırsız çekim ve tüm özellikler aktif" : isTrial ? `Tüm özellikler açık • Kalan: ${trial.daysLeft} gün` : "20 çekim limiti • Pro'ya Yükselt (₺749/ay)"}
          </div>
        </div>
        <span style={{ fontSize:12, color:isPro?T.goldL:isTrial?T.blueL:T.goldL, fontWeight:600 }}>{isPro?"Yönet →":isTrial?"İncele →":"Yükselt →"}</span>
      </Card>

      {[
        {i:"users",   l:"Müşteriler",          d:"Müşteri CRM, paket ve bakiye takibi", s:"musteriler", c:T.goldL,    adminOnly:false},
        {i:"calendar",l:"🌅 Altın Saat & Işık", d:"Dış çekim gün batımı ve ters ışık hesaplayıcı", s:"altinsaat", c:T.goldL, adminOnly:false},
        {i:"camera",  l:"📸 Poz Rehberi",      d:"Görsel pozlar ve çifte komut rehberi", s:"pozrehberi", c:T.gold, adminOnly:false},
        {i:"copy",    l:"📇 Dijital QR Kartvizit", d:"Düğün salonları için anında vCard paylaşımı", s:"kartvizit", c:T.blueL, adminOnly:false},
        {i:"sparkle", l:"🎙️ Sesli Randevu",     d:"Konuşarak hızlı randevu ve not ekleme", s:"sesliasistan", c:"#C94C9F", adminOnly:false},
        {i:"notebook",l:"Notlarım",            d:"Hızlı ve etiketli notlar",            s:"notdefteri", c:T.gold,     adminOnly:true},
        {i:"calendar",l:"Takvim",              d:"Yıllık randevu takvimi",             s:"takvim",     c:T.blueL,    adminOnly:false},
        {i:"doc",     l:"Sözleşmeler",         d:"Müşteri sözleşmeleri & PDF",         s:"sozlesmeler", c:T.orange,   adminOnly:true, pro:true},
        {i:"doc",     l:"Fiyat Teklifi",       d:"Müşterilere özel teklif oluştur",    s:"teklif",     c:T.greenL,   adminOnly:true, pro:true},
        {i:"team",    l:"Ekip & Shiftler",     d:"Personel ve görev planı",            s:"ekip",       c:"#C94C9F",  adminOnly:false},
        {i:"box",     l:"Paketler & Fiyatlar", d:"Hizmet paketlerini yönet",          s:"paketler",   c:T.gold,     adminOnly:true},
        {i:"msg",     l:"Mesajlar",            d:"Müşteri iletişimi",                  s:"mesajlar",   c:T.blueL,    adminOnly:false},
        {i:"copy",    l:"Hazır Şablonlar",     d:"Müşterilere hazır mesajlar",         s:"sablonlar",  c:T.blue,     adminOnly:false},
        {i:"bell",    l:"Hatırlatıcılar",      d:"Tarih & ödeme hatırlatmaları",       s:"hatirlatici", c:T.orangeL,  adminOnly:false},
        {i:"camera",  l:"Portföy Galerisi",    d:"Fotoğraf arşivi ve kategoriler",     s:"galeri",     c:T.green,    adminOnly:false, pro:true},
        {i:"chart",   l:"Raporlar",            d:"Aylık & yıllık analizler",           s:"raporlar",   c:T.blueL,    adminOnly:true, pro:true},
        {i:"eye",     l:"Müşteri Portali",     d:"Fotoğraf seçim sistemi",             s:"portal",     c:"#C94C9F",  adminOnly:true, pro:true},
        {i:"warn",    l:"🛠 İş Asistanı",       d:"Otomasyonlar, alarmlar, arşiv",     s:"isasistani", c:T.goldL,    adminOnly:true, pro:true},
      ].filter(it => !it.adminOnly || role==="admin").map(it=>(
        <Card key={it.l} onClick={()=>setActive(it.s)} style={{ marginBottom:10, display:"flex", gap:14, alignItems:"center", padding:16 }}>
          <div style={{ background:it.c+"1A", borderRadius:14, padding:12, flexShrink:0 }}>
            <Ic n={it.i} s={22} c={it.c}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:15, display:"flex", alignItems:"center" }}>
              {it.l}
              {it.pro && plan === "basic" && <ProBadge/>}
            </div>
            <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>{it.d}</div>
          </div>
          <Ic n="back" s={16} c={T.text3} style={{ transform:"rotate(180deg)" }}/>
        </Card>
      ))}

      {/* Ayarlar */}
      <Card onClick={()=>setShowAyarlar(true)} style={{ marginBottom:10, display:"flex", gap:14, alignItems:"center", padding:16 }}>
        <div style={{ background:T.text3+"1A", borderRadius:14, padding:12, flexShrink:0 }}>
          <Ic n="settings" s={22} c={T.text2}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:15 }}>Ayarlar</div>
          <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>Tema ve şifre yönetimi</div>
        </div>
        <Ic n="back" s={16} c={T.text3} style={{ transform:"rotate(180deg)" }}/>
      </Card>

      {/* Çıkış */}
      <GoldButton label="Çıkış Yap" icon="close" onClick={onLogout} full variant="danger" style={{ marginTop:8 }}/>
    </div>

    {/* Ayarlar BottomSheet */}
    {showAyarlar && (
      <BottomSheet title="Ayarlar" onClose={()=>setShowAyarlar(false)}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Tema Seçimi */}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <span>🎨 Stüdyo Renk Paleti</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {THEMES.map(th => {
                const isSelected = themeKey === th.key;
                return (
                  <div
                    key={th.key}
                    onClick={() => setThemeKey && setThemeKey(th.key)}
                    style={{
                      background: isSelected ? T.gold + "14" : T.card,
                      border: `1.5px solid ${isSelected ? T.gold : T.border}`,
                      borderRadius: 14,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ fontSize: 22, width: 34, height: 34, borderRadius: 10, background: th.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${th.primary}44` }}>
                      {th.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? T.gold : T.text }}>
                        {th.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                        {th.sub}
                      </div>
                    </div>
                    {/* Renk Çemberleri */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: th.primary, boxShadow: `0 0 8px ${th.primary}66` }} />
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: th.bg, border: `1px solid ${T.border}` }} />
                      {isSelected && (
                        <div style={{ marginLeft: 4, width: 20, height: 20, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 900 }}>
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Şifre Değiştir - sadece admin */}
          {role==="admin" && (
            <Card onClick={()=>{ setShowAyarlar(false); setTimeout(()=>setShowSifre(true),200); }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor:"pointer" }}>
              <div style={{ background:T.red+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                <Ic n="warn" s={20} c={T.redL}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>Şifreleri Değiştir</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>Admin ve personel şifrelerini güncelle</div>
              </div>
              <Ic n="back" s={16} c={T.text3} style={{ transform:"rotate(180deg)" }}/>
            </Card>
          )}

          {/* Uygulama bilgisi */}
          <div style={{ textAlign:"center", padding:"14px 0 6px 0", borderTop:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:3 }}>
              <span style={{ fontFamily:"Plus Jakarta Sans, Inter, sans-serif", fontSize:18, fontWeight:900, color:T.text, letterSpacing:1.5 }}>STÜDYO</span>
              <span style={{ fontFamily:"Plus Jakarta Sans, Inter, sans-serif", fontSize:18, fontWeight:900, color:T.gold, letterSpacing:1.5 }}>M</span>
            </div>
            <div style={{ fontSize:11, color:T.text3, marginTop:4, fontWeight:500 }}>Fotoğrafçılık & Stüdyo Yönetim Sistemi v2.5</div>
          </div>
        </div>
      </BottomSheet>
    )}

    {/* Şifreleri Değiştir BottomSheet */}
    {showSifre && (
      <BottomSheet title="Şifreleri Değiştir" onClose={()=>setShowSifre(false)}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:T.orange+"1A", border:`1px solid ${T.orange}33`, borderRadius:12,
            padding:"12px 14px", fontSize:13, color:T.orangeL }}>
            ⚠️ Şifreyi not almayı unutma! En az 4 karakter olmalı.
          </div>
          <div>
            <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>👑 Yeni Admin Şifresi</div>
            <input type="password" value={sForm.adminPass}
              onChange={e=>setSForm(p=>({...p,adminPass:e.target.value}))}
              placeholder="Boş bırakırsan değişmez"
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>👤 Yeni Personel Şifresi</div>
            <input type="password" value={sForm.personelPass}
              onChange={e=>setSForm(p=>({...p,personelPass:e.target.value}))}
              placeholder="Boş bırakırsan değişmez"
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
          </div>
          <GoldButton label="Şifreleri Kaydet" icon="check" onClick={saveSifre} full/>
        </div>
      </BottomSheet>
    )}
  </div>
  );
};

// ════════════════════════════════════════════════
// HAZIR ŞABLONLAR
// ════════════════════════════════════════════════
