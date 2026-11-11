// ════════════════════════════════════════════════
// BULUT GİRİŞİ — e-posta/şifre ile hesap, stüdyo oluşturma, personel katılımı
// Aynı hesapla telefondan ve bilgisayardan giriş yapılır, aynı veri görülür.
// ════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { T } from "../../constants/theme";
import { LoginShell, C } from "../common/LoginShell";
import { LEGAL } from "../../constants/legal";
import { Ic } from "../../constants/icons";
import {
  signIn, signUp, signOut, verifySignupCode, resendSignupCode, resetPassword,
  fetchMyStudio, createStudio, setMyTeamId, saveStudioProfileRemote, findClientId, currentUser, changePassword,
} from "../../services/auth";

// Görünüm: Grafit — koyu nötr form, ince çizgili alanlar, beyaz ana buton
const ACCENT = C.accent;
const inputStyle = { background: C.field, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px",
  color: C.text, fontSize: 14.5, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.15s" };

const Input = ({ label, icon, ...p }) => (
  <label style={{ display: "block", marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 500, color: C.text2, marginBottom: 6 }}>{label}</div>
    <input {...p} style={inputStyle}
      onFocus={e => (e.target.style.borderColor = C.lineHover)} onBlur={e => (e.target.style.borderColor = C.line)}/>
  </label>
);
const Btn = ({ children, busy, variant = "primary", ...p }) => (
  <button {...p} disabled={busy || p.disabled}
    style={variant === "primary" ? {
      width: "100%", border: "none", borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 600, color: C.onAccent,
      background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6,
      cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
    } : {
      width: "100%", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 500, marginTop: 6,
      background: "transparent", border: `1px solid ${C.line}`, color: C.text, cursor: "pointer",
    }}>
    {busy ? "Lütfen bekleyin..." : children}
  </button>
);
const Link = ({ children, onClick }) => (
  <button type="button" onClick={onClick} style={{ background: "none", border: "none", color: C.accentL, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}>{children}</button>
);
const Msg = ({ kind = "err", children }) => children ? (
  <div style={{ fontSize: 13, lineHeight: 1.5, padding: "9px 12px", marginBottom: 14, borderRadius: 8,
    color: kind === "err" ? "#FDA4AF" : "#6EE7B7", background: kind === "err" ? "rgba(244,63,94,0.10)" : "rgba(16,185,129,0.10)",
    border: `1px solid ${kind === "err" ? "rgba(244,63,94,0.28)" : "rgba(16,185,129,0.28)"}` }}>{children}</div>
) : null;

// Giriş Yap / 1 Ay Ücretsiz: başlık + alt satırda diğerine geçiş
const Tabs = ({ mode }) => (
  <div className="ls-title" style={{ marginBottom: 24, fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>
    {mode === "login" ? "Tekrar hoş geldiniz" : "Stüdyonuzu oluşturun"}
  </div>
);
// Giriş ↔ kayıt geçişi: ana butonun hemen altında
const SwitchLine = ({ mode, go }) => (
  <div style={{ textAlign: "center", fontSize: 13.5, color: C.text2, marginTop: 14 }}>
    {mode === "login"
      ? <>Hesabınız yok mu? <Link onClick={() => go("register")}>1 ay ücretsiz deneyin</Link></>
      : <>Zaten hesabınız var mı? <Link onClick={() => go("login")}>Giriş yapın</Link></>}
  </div>
);

// Personel / Müşteri geçiş bağlantıları
const RoleLinks = ({ go }) => (
  <div style={{ display: "flex", gap: 8, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
    {[["personel", "users", "Personel girişi"], ["musteri", "image", "Müşteri portalı"]].map(([m, ic, label]) => (
      <button key={m} type="button" onClick={() => go(m)}
        style={{ flex: 1, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 6px",
          color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <Ic n={ic} s={15} c={C.text}/> {label}
      </button>
    ))}
  </div>
);

// Alt ekran başlığı (geri düğmeli)
const Head = ({ icon, title, sub, onBack }) => (
  <div style={{ marginBottom: 22 }}>
    {onBack && (
      <button type="button" onClick={onBack}
        style={{ background: "none", border: "none", color: C.text2, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 18,
          display: "flex", alignItems: "center", gap: 6 }}>
        <Ic n="back" s={15} c={C.text}/> Geri
      </button>
    )}
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: C.text }}>{title}</div>
    {sub && <div style={{ fontSize: 13.5, color: C.text2, marginTop: 6, lineHeight: 1.55 }}>{sub}</div>}
  </div>
);

const Shell = ({ children }) => <LoginShell>{children}</LoginShell>;

// Yasal metinler tarayıcıda açılır (uygulama içinde kalmaz)
const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.text2, fontWeight: 500, textDecoration: "underline", textDecorationColor: C.text3, textUnderlineOffset: 2 }}>{children}</a>
);
const LegalFooter = () => (
  <div style={{ textAlign: "center", fontSize: 11.5, color: C.text3, marginTop: 18 }}>
    <A href={LEGAL.gizlilik}>Gizlilik ve KVKK</A> · <A href={LEGAL.sartlar}>Kullanım Şartları</A>
  </div>
);
// Kısa bilgilendirme notu (personel ve müşteri ekranları)
const Note = ({ children }) => (
  <div style={{ fontSize: 11, color: C.text3, marginTop: 12, lineHeight: 1.6, textAlign: "center" }}>{children}</div>
);

/**
 * stage: "signedOut" | "noStudio" | "pickStaff"
 * onReady(studio)  — giriş + stüdyo hazır
 * onCustomer(id)   — müşteri portalı
 */
export const CloudAuth = ({ stage = "signedOut", team = [], notice = "", onReady, onCustomer, onLogout }) => {
  const [mode, setMode] = useState(stage === "noStudio" ? "setup" : stage === "pickStaff" ? "pickStaff" : stage === "recovery" ? "newpass" : notice ? "reset" : "login");
  const [f, setF] = useState({ email: "", password: "", password2: "", studio: "", name: "", code: "", otp: "", phone4: "" });
  const [err, setErr] = useState(notice || "");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAfterVerify, setPendingAfterVerify] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  // Süresi dolmuş link gibi uyarılar ekran açıldıktan sonra gelebilir: "Şifremi unuttum" ekranında gösterilir
  useEffect(() => { if (notice) { setMode("reset"); setErr(notice); setInfo(""); } }, [notice]);
  const go = m => { setMode(m); setErr(""); setInfo(""); };

  const run = async (fn) => {
    setErr(""); setInfo(""); setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message || String(e)); } finally { setBusy(false); }
  };

  // Hesap açıldıktan / doğrulandıktan sonra stüdyo kur veya katıl
  const finishRegister = async () => {
    const s = await createStudio(f.studio);
    const me = await currentUser().catch(() => null);
    await saveStudioProfileRemote({ studio: f.studio.trim(), name: f.name.trim() || me?.name || "", email: f.email.trim() || me?.email || "" }).catch(() => {});
    onReady(await fetchMyStudio() || s);
  };
  const doLogin = () => run(async () => {
    if (!f.email || !f.password) throw new Error("E-posta (veya telefon) ve şifrenizi girin.");
    await signIn(f.email, f.password);
    const s = await fetchMyStudio();
    if (!s) { go("setup"); return; }
    onReady(s);
  });

  const doRegister = () => run(async () => {
    if (!f.studio.trim() || !f.name.trim() || !f.email || !f.password) throw new Error("Lütfen tüm alanları doldurun.");
    if (f.password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
    if (!accepted) throw new Error("Devam etmek için Kullanım Şartları'nı ve Gizlilik Politikası'nı okuyup kabul edin.");
    const r = await signUp(f.email, f.password, { name: f.name.trim() });
    if (r.needsVerification) { setPendingAfterVerify("register"); go("verify"); setInfo("E-postanıza doğrulama kodu gönderildi."); return; }
    await finishRegister();
  });

  const doVerify = () => run(async () => {
    if (!f.otp.trim()) throw new Error("Doğrulama kodunu girin.");
    await verifySignupCode(f.email, f.otp);
    await finishRegister();
  });

  const doSetupCreate = () => run(async () => {
    if (!f.studio.trim()) throw new Error("Stüdyo adını girin.");
    await finishRegister();
  });
  const doNewPassword = () => run(async () => {
    if (f.password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
    if (f.password !== f.password2) throw new Error("İki şifre aynı değil.");
    await changePassword(f.password);
    const s = await fetchMyStudio();
    if (!s) { go("setup"); return; }
    onReady(s);
  });
  const doReset = () => run(async () => {
    if (!f.email) throw new Error("E-posta adresinizi girin.");
    await resetPassword(f.email);
    setInfo("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
  });

  const doCustomer = () => run(async () => {
    const tel4 = f.phone4.replace(/\D/g, "");
    const code = f.code.trim().toUpperCase();
    if (code.length !== 6 || !f.name.trim() || tel4.length !== 4) throw new Error("Stüdyo kodunu, ad soyadınızı ve telefonunuzun son 4 hanesini girin.");
    const id = await findClientId(code, f.name, tel4);
    if (!id) throw new Error("Bilgiler eşleşmedi. Stüdyonuzdan size gönderilen linki kullanabilir veya kodu tekrar isteyebilirsiniz.");
    onCustomer(id);
  });

  const doPickStaff = (id) => run(async () => {
    await setMyTeamId(id);
    onReady(await fetchMyStudio());
  });

  const logoutLink = onLogout && <div style={{ textAlign: "center", marginTop: 10 }}><Link onClick={async () => { await signOut(); onLogout(); }}>Farklı hesapla giriş yap</Link></div>;

  if (mode === "pickStaff") return (
    <Shell>
      <Head title="Siz kimsiniz?" sub="Ekip listesinden kendi adınızı seçin. Size atanan görevler ve bildirimler buna göre gösterilir."/>
      <Msg>{err}</Msg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {team.map(m => (
          <button key={m.id} onClick={() => doPickStaff(m.id)} disabled={busy}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px",
              color: T.text, fontSize: 14, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>
            {m.name} <span style={{ color: C.text3, fontWeight: 400, fontSize: 12 }}>{m.role}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><Btn variant="ghost" onClick={() => onReady(null)}>Listede yokum, şimdilik atla</Btn></div>
      {logoutLink}
    </Shell>
  );

  if (mode === "setup") return (
    <Shell>
      <Head title="Stüdyo kurulumu" sub="Bu hesap henüz bir stüdyoya bağlı değil. Stüdyonuzun adını girerek kurulumu tamamlayın."/>
      <Msg>{err}</Msg>
      <Input label="Stüdyo / Firma adı" value={f.studio} onChange={set("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
      <Btn busy={busy} onClick={doSetupCreate}>Stüdyoyu Oluştur</Btn>
      <div style={{ fontSize: 12, color: C.text3, marginTop: 14, lineHeight: 1.6 }}>
        Personel misiniz? Personel hesabını stüdyo yöneticiniz açar. Yöneticinizin verdiği telefon numarası ve şifreyle giriş yapın.
      </div>
      {logoutLink}
    </Shell>
  );

  if (mode === "register") return (
    <Shell>
      <Tabs mode="register" go={go}/>
      <div style={{ fontSize: 12, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>
        1 ay boyunca tüm Pro özellikler ücretsiz. Aynı hesapla telefondan ve bilgisayardan giriş yapabilirsiniz.
      </div>
      <Msg>{err}</Msg>
      <Input label="Stüdyo / Firma adı" value={f.studio} onChange={set("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
      <Input label="Adınız Soyadınız" value={f.name} onChange={set("name")} placeholder="Yetkili kişi"/>
      <Input label="E-posta" type="email" value={f.email} onChange={set("email")} placeholder="ornek@mail.com" autoComplete="email"/>
      <Input label="Şifre (en az 6 karakter)" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="new-password"/>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: C.text2, lineHeight: 1.55, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: ACCENT, cursor: "pointer" }}/>
        <span>
          <A href={LEGAL.sartlar}>Kullanım Şartları</A>'nı okudum, kabul ediyorum. Kişisel verilerimin{" "}
          <A href={LEGAL.gizlilik}>Gizlilik Politikası ve KVKK Aydınlatma Metni</A>'nde anlatıldığı şekilde işleneceği konusunda bilgilendirildim.
        </span>
      </label>
      <Btn busy={busy} onClick={doRegister}>Stüdyomu Oluştur</Btn>
      <SwitchLine mode="register" go={go}/>
      <RoleLinks go={go}/>
    </Shell>
  );

  if (mode === "personel") return (
    <Shell>
      <Head title="Personel Girişi" sub="Personel hesabınızı stüdyo yöneticiniz oluşturur ve şifrenizi belirler." onBack={() => go("login")}/>
      <Msg>{err}</Msg>
      <Input label="Telefon numaranız" type="tel" value={f.email} onChange={set("email")} placeholder="05xx xxx xx xx" autoComplete="username"/>
      <Input label="Şifre" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="current-password"
        onKeyDown={e => e.key === "Enter" && doLogin()}/>
      <Btn busy={busy} onClick={doLogin}>Personel Girişi Yap</Btn>
      <div style={{ fontSize: 12, color: C.text3, marginTop: 12, lineHeight: 1.6, textAlign: "center" }}>
        Şifrenizi unuttuysanız stüdyo yöneticiniz uygulamadaki Ekip bölümünden yeni şifre belirleyebilir.
      </div>
      <Note>Adınız ve telefon numaranız, çalıştığınız stüdyo tarafından iş takibi için işlenir. Ayrıntılar: <A href={LEGAL.gizlilik}>Gizlilik ve KVKK</A></Note>
    </Shell>
  );

  if (mode === "verify") return (
    <Shell>
      <Head title="E-postanızı doğrulayın" sub={`${f.email} adresine gönderilen doğrulama kodunu girin.`} onBack={() => go("register")}/>
      <Msg kind="ok">{info}</Msg><Msg>{err}</Msg>
      <Input label="Doğrulama kodu" value={f.otp} onChange={set("otp")} inputMode="numeric" placeholder="Kod"/>
      <Btn busy={busy} onClick={doVerify}>Doğrula</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link onClick={() => run(async () => { await resendSignupCode(f.email); setInfo("Kod tekrar gönderildi."); })}>Kodu tekrar gönder</Link>
      </div>
    </Shell>
  );

  // E-postadaki şifre sıfırlama linkinden gelindi: yeni şifre belirlenir, ardından doğrudan stüdyoya girilir
  if (mode === "newpass") return (
    <Shell>
      <Head title="Yeni şifrenizi belirleyin" sub="Bundan sonra bu şifreyle telefondan ve bilgisayardan giriş yapacaksınız."/>
      <Msg>{err}</Msg>
      <Input label="Yeni şifre (en az 6 karakter)" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="new-password"/>
      <Input label="Yeni şifre (tekrar)" type="password" value={f.password2} onChange={set("password2")} placeholder="••••••••" autoComplete="new-password"
        onKeyDown={e => e.key === "Enter" && doNewPassword()}/>
      <Btn busy={busy} onClick={doNewPassword}>Şifremi Kaydet ve Giriş Yap</Btn>
    </Shell>
  );

  if (mode === "reset") return (
    <Shell>
      <Head title="Şifremi unuttum" sub="E-posta adresinize şifre sıfırlama bağlantısı gönderilir. Personelseniz şifrenizi yöneticiniz değiştirebilir." onBack={() => go("login")}/>
      <Msg kind="ok">{info}</Msg><Msg>{err}</Msg>
      <Input label="E-posta" type="email" value={f.email} onChange={set("email")} placeholder="ornek@mail.com"/>
      <Btn busy={busy} onClick={doReset}>Bağlantı Gönder</Btn>
    </Shell>
  );

  if (mode === "musteri") return (
    <Shell>
      <Head title="Müşteri Portalı" sub="Stüdyonuzun gönderdiği linke tıklayarak da doğrudan girebilirsiniz." onBack={() => go("login")}/>
      <Msg>{err}</Msg>
      <Input label="Stüdyo kodu" value={f.code} placeholder="Örn: A1B2C3" autoCapitalize="characters"
        onChange={e => setF(p => ({ ...p, code: e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6).toUpperCase() }))}/>
      <Input label="Ad Soyad" value={f.name} onChange={set("name")} placeholder="Ad Soyad"/>
      <Input label="Telefonunuzun son 4 hanesi" placeholder="••••" value={f.phone4} onChange={e => setF(p => ({ ...p, phone4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} inputMode="numeric"/>
      <Btn busy={busy} onClick={doCustomer}>Portala Giriş Yap</Btn>
      <Note>Bilgileriniz ve fotoğraflarınız çekimi yapan stüdyo tarafından işlenir; STÜDYOM yalnızca stüdyo adına saklar. Ayrıntılar: <A href={LEGAL.gizlilik}>Gizlilik ve KVKK</A></Note>
    </Shell>
  );

  return (
    <Shell>
      <Tabs mode="login" go={go}/>
      <Msg>{err}</Msg>
      <Input label="E-posta veya telefon" type="text" value={f.email} onChange={set("email")} placeholder="ornek@gmail.com" autoComplete="username"/>
      <Input label="Şifre" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="current-password"
        onKeyDown={e => e.key === "Enter" && doLogin()}/>
      <div style={{ textAlign: "right", marginTop: -6, marginBottom: 8 }}><Link onClick={() => go("reset")}>Şifremi unuttum</Link></div>
      <Btn busy={busy} onClick={doLogin}>Stüdyoya Giriş Yap</Btn>
      <SwitchLine mode="login" go={go}/>
      <RoleLinks go={go}/>
      <LegalFooter/>
    </Shell>
  );
};
