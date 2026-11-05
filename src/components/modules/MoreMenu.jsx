import React, { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET} from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { PlanBadge, LockBadge } from "../common/ProGate";
import { resetTips } from "../../constants/tips";
import { PLANS, getTrialInfo, planHasFeature, requiredPlanFor } from "../../services/plan";
import { sb, fromDB, toDB, IS_CLOUD } from "../../services/supabase";
import { changePassword, deleteMyAccount } from "../../services/auth";
import { exportStudioData } from "../../services/exportData";
import { LEGAL } from "../../constants/legal";
import { getModules, MORE_ORDER } from "../../constants/modules";
import { getPass, setPass, getSession, saveSession, clearSession, getStudioProfile, saveStudioProfile, getCurrentStudio } from "../../services/storage";

export const MoreMenu = ({ data, setActive, darkMode, setDarkMode, role, plan, onLogout, themeKey = "sapphire", setThemeKey }) => {
  const [showSifre,   setShowSifre]   = useState(false);
  const [showAyarlar, setShowAyarlar] = useState(false);
  const [sForm, setSForm] = useState({ adminPass:"", personelPass:"" });
  const [showFirma, setShowFirma] = useState(false);
  const [firma, setFirma] = useState(null);
  const ff = k => v => setFirma(p => ({ ...p, [k]: v }));
  const openFirma = () => { setFirma(getStudioProfile()); setShowAyarlar(false); setTimeout(() => setShowFirma(true), 200); };
  const saveFirma = () => {
    const clean = Object.fromEntries(Object.entries(firma).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
    saveStudioProfile(clean);
    setShowFirma(false);
    alert("Firma bilgileri kaydedildi. Sözleşme, fatura ve kartvizitte bu bilgiler kullanılacak.");
  };
  const [showSil, setShowSil] = useState(false);
  const [silOnay, setSilOnay] = useState("");
  const [silBusy, setSilBusy] = useState(false);
  const doDeleteAccount = async () => {
    setSilBusy(true);
    try { await deleteMyAccount(); onLogout && onLogout(); }
    catch (e) { alert("Hesap silinemedi: " + e.message); setSilBusy(false); }
  };
  const [tipsReset, setTipsReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    setExporting(true);
    try {
      const name = await exportStudioData(data, getStudioProfile()?.studio || getCurrentStudio()?.name);
      if (!Capacitor.isNativePlatform()) alert(`${name} indirildi.`);
    } catch (e) { alert("Veriler indirilemedi: " + (e.message || e)); }
    finally { setExporting(false); }
  };
  const saveSifre = async () => {
    // Bulutta: giriş yapan kişinin kendi hesap şifresi değişir (tüm cihazlarda geçerli)
    if (IS_CLOUD) {
      if (sForm.adminPass.length < 6) { alert("Yeni şifre en az 6 karakter olmalı."); return; }
      try { await changePassword(sForm.adminPass); }
      catch (e) { alert("Şifre değiştirilemedi: " + e.message); return; }
      setShowSifre(false); setSForm({ adminPass:"", personelPass:"" });
      alert("Şifreniz değiştirildi. Diğer cihazlarda yeni şifreyle giriş yapın.");
      return;
    }
    if(sForm.adminPass.length >= 4)    setPass("geses_admin_pass",    sForm.adminPass);
    if(sForm.personelPass.length >= 4) setPass("geses_personel_pass", sForm.personelPass);
    setShowSifre(false);
    setSForm({ adminPass:"", personelPass:"" });
    alert("Şifreler güncellendi!");
  };

  const isPro = plan === "pro";
  const isTrial = plan === "trial";
  const isStd = plan === "standart";
  const trial = getTrialInfo();
  const isAdmin = role === "admin";
  const MODULES = getModules();

  const THEMES = [
    { key: "sapphire", name: "Safir",  sub: "Koyu lacivert", icon: "", primary: "#3B82F6", bg: "#090D16" },
    { key: "nordic",   name: "Nordic", sub: "Açık, beyaz",   icon: "", primary: "#2563EB", bg: "#FFFFFF" },
  ];

  return (
  <div className="fade-in">
    <PageHeader title={isAdmin ? "Diğer Modüller" : "Ayarlar"} sub={isAdmin ? "Tüm stüdyo araçları" : "Tema, şifre ve hesap"}/>
    <div style={{ padding:"0 20px" }}>

      {/* Plan Yönetim Kartı */}
      {isAdmin && <Card onClick={()=>setActive("planyonetimi")} style={{ marginBottom:14, padding:16, display:"flex", alignItems:"center", gap:14, borderColor:isPro?T.gold:isTrial?T.blue:T.border, background:isPro?T.gold+"12":isTrial?T.blue+"12":T.card, cursor:"pointer" }}>
        {!T.flat && <div style={{ fontSize:28 }}>{isPro?"👑":isTrial?"⏳":isStd?"⭐":"🆓"}</div>}
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>{isPro?"Pro Plan":isTrial?"Pro Deneme":isStd?"Standart Plan":"Basic Plan"}</span>
            <PlanBadge plan={plan}/>
          </div>
          <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>
            {isPro ? "Tüm özellikler aktif" : isTrial ? `Tüm özellikler açık • Kalan: ${trial.daysLeft} gün` : isStd ? "Özelliklerin çoğu açık • Pro ile hepsi" : "Temel özellikler • Kilitli özellikleri görmek için dokunun"}
          </div>
        </div>
        <span style={{ fontSize:12, color:isPro?T.goldL:isTrial?T.blueL:T.goldL, fontWeight:600 }}>{isPro?"Yönet →":isTrial?"İncele →":"Planlar →"}</span>
      </Card>}

      {isAdmin && MORE_ORDER.map(id => ({ id, ...MODULES[id] })).map(it=>(
        <Card key={it.id} onClick={()=>setActive(it.id)} style={{ marginBottom:10, display:"flex", gap:14, alignItems:"center", padding:16 }}>
          <div style={{ background: T.flat ? T.card2 : it.color+"1A", borderRadius:14, padding:12, flexShrink:0 }}>
            <Ic n={it.icon} s={22} c={it.color}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:15, display:"flex", alignItems:"center" }}>
              {it.label}
              {!planHasFeature(plan, it.id) && <LockBadge plan={requiredPlanFor(it.id)}/>}
            </div>
            <div style={{ fontSize:12, color:T.text3, marginTop:3 }}>{it.desc}</div>
          </div>
          <Ic n="back" s={16} c={T.text3} style={{ transform:"rotate(180deg)" }}/>
        </Card>
      ))}

      {/* Ayarlar */}
      <Card onClick={()=>setShowAyarlar(true)} style={{ marginBottom:10, display:"flex", gap:14, alignItems:"center", padding:16 }}>
        <div style={{ background: T.flat ? T.card2 : T.text3+"1A", borderRadius:14, padding:12, flexShrink:0 }}>
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
              <span>Stüdyo Renk Paleti</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {THEMES.map(th => {
                const isSelected = themeKey === th.key;
                return (
                  <div role="button" tabIndex={0}
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
                        <div style={{ marginLeft: 4, width: 20, height: 20, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", color: T.onAccent, fontSize: 11, fontWeight: 900 }}>
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Müşteri portalı kodu — müşteri elle girişte bu kodu yazar */}
          {role==="admin" && IS_CLOUD && getCurrentStudio()?.portal_code && (
            <Card onClick={()=>{ try { navigator.clipboard.writeText(getCurrentStudio().portal_code); alert("Stüdyo kodu kopyalandı."); } catch(e) {} }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor:"pointer" }}>
              <div style={{ background: T.flat ? T.card2 : T.green+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                <Ic n="eye" s={20} c={T.greenL}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>Müşteri Portalı Kodu: <span style={{ letterSpacing:2, color:T.greenL }}>{getCurrentStudio().portal_code}</span></div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>Müşteri linki açamazsa "Müşteri Portalı" ekranında bu kodu yazar. Kopyalamak için dokunun.</div>
              </div>
            </Card>
          )}

          {/* Firma & Kişi Bilgileri - sadece admin */}
          {role==="admin" && (
            <Card onClick={openFirma}
              style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor:"pointer" }}>
              <div style={{ background: T.flat ? T.card2 : T.blue+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                <Ic n="users" s={20} c={T.blueL}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>Firma & Kişi Bilgileri</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>Unvan, yetkili, iletişim, vergi ve IBAN</div>
              </div>
              <Ic n="back" s={16} c={T.text3} style={{ transform:"rotate(180deg)" }}/>
            </Card>
          )}

          {/* Şifre Değiştir - yerelde sadece admin, bulutta herkes kendi şifresini */}
          {(role==="admin" || IS_CLOUD) && (
            <Card onClick={()=>{ setShowAyarlar(false); setTimeout(()=>setShowSifre(true),200); }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor:"pointer" }}>
              <div style={{ background: T.flat ? T.card2 : T.red+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                <Ic n="warn" s={20} c={T.redL}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>{IS_CLOUD ? "Şifremi Değiştir" : "Şifreleri Değiştir"}</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{IS_CLOUD ? "Hesabınızın giriş şifresini güncelleyin" : "Admin ve personel şifrelerini güncelle"}</div>
              </div>
              <Ic n="back" s={16} c={T.text3} style={{ transform:"rotate(180deg)" }}/>
            </Card>
          )}

          {/* Ekran tanıtımlarını yeniden göster */}
          <Card onClick={() => { resetTips(); setTipsReset(true); }}
            style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor:"pointer" }}>
            <div style={{ background: T.flat ? T.card2 : T.blue+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
              <Ic n="info" s={20} c={T.blueL}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:15 }}>İpuçlarını yeniden göster</div>
              <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{tipsReset ? "Tamam: ekranlara girdikçe tanıtım kartları yeniden çıkacak" : "Ekranların ne işe yaradığını anlatan kartlar"}</div>
            </div>
          </Card>

          {/* Verilerimi İndir — yalnızca yönetici; hesap silmeden önce kayıtları saklamak için */}
          {role==="admin" && (
            <Card onClick={exporting ? undefined : doExport}
              style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor: exporting ? "wait" : "pointer" }}>
              <div style={{ background: T.flat ? T.card2 : T.green+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                <Ic n="doc" s={20} c={T.greenL}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>{exporting ? "Hazırlanıyor..." : "Verilerimi İndir (Excel)"}</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>Müşteri, randevu, muhasebe ve tüm kayıtlar tek dosyada</div>
              </div>
            </Card>
          )}

          {/* Hesabımı Sil (bulut) — App Store / Google Play zorunluluğu */}
          {IS_CLOUD && (
            <Card onClick={()=>{ setShowAyarlar(false); setSilOnay(""); setTimeout(()=>setShowSil(true),200); }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:16, cursor:"pointer", borderColor:T.red+"44" }}>
              <div style={{ background: T.flat ? T.card2 : T.red+"1A", borderRadius:12, padding:10, flexShrink:0 }}>
                <Ic n="trash" s={20} c={T.redL}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15, color:T.redL }}>Hesabımı Sil</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{role==="admin" ? "Hesap, stüdyo ve tüm veriler kalıcı olarak silinir" : "Personel hesabınız kalıcı olarak silinir"}</div>
              </div>
            </Card>
          )}

          {/* Yasal metinler — mağazalar ve KVKK için uygulama içinden erişilebilir olmalı */}
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"6px 14px", fontSize:12.5 }}>
            {[[LEGAL.gizlilik, "Gizlilik ve KVKK"], [LEGAL.sartlar, "Kullanım Şartları"], [LEGAL.destek, "Destek: destek@gesblabs.com"]].map(([href, label]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{ color:T.goldL, fontWeight:600, textDecoration:"none" }}>{label}</a>
            ))}
          </div>

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
      <BottomSheet title={IS_CLOUD ? "Şifremi Değiştir" : "Şifreleri Değiştir"} onClose={()=>setShowSifre(false)}>
        {IS_CLOUD ? (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ fontSize:13, color:T.text3, lineHeight:1.6 }}>Yeni şifre tüm cihazlarda (telefon ve bilgisayar) geçerli olur. En az 6 karakter.</div>
            <input type="password" value={sForm.adminPass} onChange={e=>setSForm(p=>({...p,adminPass:e.target.value}))}
              placeholder="Yeni şifre" autoComplete="new-password"
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
            <GoldButton label="Şifreyi Değiştir" icon="check" onClick={saveSifre} full/>
          </div>
        ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:T.orange+"1A", border:`1px solid ${T.orange}33`, borderRadius:12,
            padding:"12px 14px", fontSize:13, color:T.orangeL }}>
            Şifreyi not almayı unutma! En az 4 karakter olmalı.
          </div>
          <div>
            <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>Yeni Admin Şifresi</div>
            <input type="password" value={sForm.adminPass}
              onChange={e=>setSForm(p=>({...p,adminPass:e.target.value}))}
              placeholder="Boş bırakırsan değişmez"
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:T.text2, fontWeight:500, marginBottom:8 }}>Yeni Personel Şifresi</div>
            <input type="password" value={sForm.personelPass}
              onChange={e=>setSForm(p=>({...p,personelPass:e.target.value}))}
              placeholder="Boş bırakırsan değişmez"
              style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
          </div>
          <GoldButton label="Şifreleri Kaydet" icon="check" onClick={saveSifre} full/>
        </div>
        )}
      </BottomSheet>
    )}

    {showSil && (
      <BottomSheet title="Hesabımı Sil" onClose={()=>!silBusy && setShowSil(false)}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:T.red+"14", border:`1px solid ${T.red}44`, borderRadius:12, padding:"12px 14px", fontSize:13, color:T.text2, lineHeight:1.6 }}>
            {role==="admin"
              ? <>Bu işlem <b>geri alınamaz</b>. Hesabınızla birlikte <b>stüdyonuz, tüm müşteri, randevu, muhasebe kayıtları</b> ve <b>personel hesapları</b> kalıcı olarak silinir. Muhasebe kayıtlarını yasal süre boyunca saklamanız gerekebilir; silmeden önce <b>Ayarlar → Verilerimi İndir</b> ile Excel olarak indirin.</>
              : <>Bu işlem <b>geri alınamaz</b>. Personel hesabınız silinir; stüdyonun verileri etkilenmez.</>}
          </div>
          <div style={{ fontSize:12.5, color:T.text3 }}>Onaylamak için aşağıya <b>SİL</b> yazın.</div>
          <input value={silOnay} onChange={e=>setSilOnay(e.target.value)} placeholder="SİL"
            style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", color:T.text, fontSize:14, width:"100%", outline:"none" }}/>
          <button disabled={silOnay.trim().toLocaleUpperCase("tr-TR") !== "SİL" || silBusy} onClick={doDeleteAccount}
            style={{ background:T.red, color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:700,
              opacity: silOnay.trim().toLocaleUpperCase("tr-TR") === "SİL" && !silBusy ? 1 : 0.45, cursor:"pointer" }}>
            {silBusy ? "Siliniyor..." : "Hesabımı Kalıcı Olarak Sil"}
          </button>
        </div>
      </BottomSheet>
    )}

    {/* Firma & Kişi Bilgileri BottomSheet */}
    {showFirma && firma && (
      <BottomSheet title="Firma & Kişi Bilgileri" onClose={()=>setShowFirma(false)}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:12, color:T.text3, lineHeight:1.6 }}>
            Bu bilgiler sözleşme, fatura, kartvizit ve müşteriye giden mesajlarda kullanılır.
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:T.text }}>Firma</div>
          <Field label="Firma / Stüdyo Adı (Unvan)" value={firma.studio||""} onChange={ff("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
          <Field label="Adres" value={firma.address||""} onChange={ff("address")} placeholder="Mahalle, cadde, ilçe / il"/>
          <Field label="Firma Telefonu" type="tel" value={firma.phone||""} onChange={ff("phone")} placeholder="05xx xxx xx xx"/>
          <Field label="E-posta" type="email" value={firma.email||""} onChange={ff("email")} placeholder="studyo@mail.com"/>
          <Field label="Instagram" value={firma.instagram||""} onChange={ff("instagram")} placeholder="@kullaniciadi"/>

          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginTop:4 }}>Yetkili Kişi</div>
          <Field label="Ad Soyad" value={firma.name||""} onChange={ff("name")} placeholder="Sözleşmede imza atan kişi"/>

          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginTop:4 }}>Fatura Bilgileri</div>
          <Field label="Vergi Dairesi" value={firma.vdaire||""} onChange={ff("vdaire")} placeholder="Örn: Gebze Vergi Dairesi"/>
          <Field label="Vergi / TC Kimlik No" value={firma.vno||""} onChange={ff("vno")} placeholder="Vergi numarası"/>
          <Field label="IBAN" value={firma.iban||""} onChange={ff("iban")} placeholder="TR.. .... .... .... .... .... .."/>

          <GoldButton label="Bilgileri Kaydet" icon="check" onClick={saveFirma} full/>
        </div>
      </BottomSheet>
    )}
  </div>
  );
};

// ════════════════════════════════════════════════
// HAZIR ŞABLONLAR
// ════════════════════════════════════════════════
