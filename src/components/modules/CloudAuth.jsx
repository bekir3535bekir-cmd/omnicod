// ════════════════════════════════════════════════
// BULUT GİRİŞİ — e-posta/şifre ile hesap, stüdyo oluşturma, personel katılımı
// Aynı hesapla telefondan ve bilgisayardan giriş yapılır, aynı veri görülür.
// ════════════════════════════════════════════════
import React, { useState } from "react";
import { Logo } from "../common";
import {
  signIn, signUp, signOut, verifySignupCode, resendSignupCode, resetPassword,
  fetchMyStudio, createStudio, joinStudio, setMyTeamId, saveStudioProfileRemote, findClientId, currentUser,
} from "../../services/auth";

const C = {
  bg: "radial-gradient(circle at 50% 12%, rgba(59,130,246,0.14) 0%, rgba(14,18,28,0.96) 45%, #070709 100%)",
  card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)", text: "#E2E8F0", text2: "#94A3B8",
  blue: "#3B82F6", blueL: "#93C5FD", red: "#F87171", green: "#34D399",
};

const Input = ({ label, ...p }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <div style={{ fontSize: 12, color: C.text2, marginBottom: 6, fontWeight: 600 }}>{label}</div>
    <input {...p} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)",
      border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 14, outline: "none" }}/>
  </label>
);
const Btn = ({ children, busy, variant = "primary", ...p }) => (
  <button {...p} disabled={busy || p.disabled}
    style={{ width: "100%", border: variant === "primary" ? "none" : `1px solid ${C.border}`, borderRadius: 12, padding: "13px",
      fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, marginTop: 4,
      background: variant === "primary" ? `linear-gradient(135deg, ${C.blue}, #2563EB)` : "transparent",
      color: variant === "primary" ? "#fff" : C.text2 }}>
    {busy ? "Lütfen bekleyin..." : children}
  </button>
);
const Link = ({ children, onClick }) => (
  <button type="button" onClick={onClick} style={{ background: "none", border: "none", color: C.blueL, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 4 }}>{children}</button>
);
const Msg = ({ kind = "err", children }) => children ? (
  <div style={{ fontSize: 12.5, lineHeight: 1.5, borderRadius: 10, padding: "9px 12px", marginBottom: 12,
    color: kind === "err" ? C.red : C.green, background: (kind === "err" ? "#F87171" : "#34D399") + "18" }}>{children}</div>
) : null;

const Shell = ({ title, sub, children }) => (
  <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><Logo/></div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 22, padding: "22px 20px", backdropFilter: "blur(20px)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>{sub}</div>}
        {children}
      </div>
    </div>
  </div>
);

/**
 * stage: "signedOut" | "noStudio" | "pickStaff"
 * onReady(studio)  — giriş + stüdyo hazır
 * onCustomer(id)   — müşteri portalı
 */
export const CloudAuth = ({ stage = "signedOut", team = [], onReady, onCustomer, onLogout }) => {
  const [mode, setMode] = useState(stage === "noStudio" ? "setup" : stage === "pickStaff" ? "pickStaff" : "login");
  const [f, setF] = useState({ email: "", password: "", studio: "", name: "", code: "", otp: "", phone4: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAfterVerify, setPendingAfterVerify] = useState(null); // "register" | "join"
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
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
  const finishJoin = async () => {
    await joinStudio(f.code);
    onReady(await fetchMyStudio());
  };

  const doLogin = () => run(async () => {
    if (!f.email || !f.password) throw new Error("E-posta ve şifrenizi girin.");
    await signIn(f.email, f.password);
    const s = await fetchMyStudio();
    if (!s) { go("setup"); return; }
    onReady(s);
  });

  const doRegister = () => run(async () => {
    if (!f.studio.trim() || !f.name.trim() || !f.email || !f.password) throw new Error("Lütfen tüm alanları doldurun.");
    if (f.password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
    const r = await signUp(f.email, f.password, { name: f.name.trim() });
    if (r.needsVerification) { setPendingAfterVerify("register"); go("verify"); setInfo("E-postanıza doğrulama kodu gönderildi."); return; }
    await finishRegister();
  });

  const doJoin = () => run(async () => {
    if (!f.name.trim() || !f.email || !f.password || !f.code.trim()) throw new Error("Lütfen tüm alanları doldurun.");
    if (f.password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
    const r = await signUp(f.email, f.password, { name: f.name.trim() });
    if (r.needsVerification) { setPendingAfterVerify("join"); go("verify"); setInfo("E-postanıza doğrulama kodu gönderildi."); return; }
    await finishJoin();
  });

  const doVerify = () => run(async () => {
    if (!f.otp.trim()) throw new Error("Doğrulama kodunu girin.");
    await verifySignupCode(f.email, f.otp);
    if (pendingAfterVerify === "join") await finishJoin(); else await finishRegister();
  });

  const doSetupCreate = () => run(async () => {
    if (!f.studio.trim()) throw new Error("Stüdyo adını girin.");
    await finishRegister();
  });
  const doSetupJoin = () => run(async () => {
    if (!f.code.trim()) throw new Error("Katılım kodunu girin.");
    await finishJoin();
  });

  const doReset = () => run(async () => {
    if (!f.email) throw new Error("E-posta adresinizi girin.");
    await resetPassword(f.email);
    setInfo("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
  });

  const doCustomer = () => run(async () => {
    const tel4 = f.phone4.replace(/\D/g, "");
    if (!f.name.trim() || tel4.length !== 4) throw new Error("Ad soyad ve telefonunuzun son 4 hanesini girin.");
    const id = await findClientId(f.name, tel4);
    if (!id) throw new Error("Bilgiler eşleşmedi. Stüdyonuzdan giriş linki isteyebilirsiniz.");
    onCustomer(id);
  });

  const doPickStaff = (id) => run(async () => {
    await setMyTeamId(id);
    onReady(await fetchMyStudio());
  });

  const logoutLink = onLogout && <div style={{ textAlign: "center", marginTop: 10 }}><Link onClick={async () => { await signOut(); onLogout(); }}>Farklı hesapla giriş yap</Link></div>;

  if (mode === "pickStaff") return (
    <Shell title="Siz kimsiniz?" sub="Ekip listesinden kendi adınızı seçin. Size atanan görevler ve bildirimler buna göre gösterilir.">
      <Msg>{err}</Msg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {team.map(m => (
          <button key={m.id} onClick={() => doPickStaff(m.id)} disabled={busy}
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px",
              color: C.text, fontSize: 14, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>
            {m.name} <span style={{ color: C.text2, fontWeight: 400, fontSize: 12 }}>{m.role}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><Btn variant="ghost" onClick={() => onReady(null)}>Listede yokum, şimdilik atla</Btn></div>
      {logoutLink}
    </Shell>
  );

  if (mode === "setup") return (
    <Shell title="Stüdyo kurulumu" sub="Bu hesap henüz bir stüdyoya bağlı değil. Yeni stüdyo oluşturun ya da katılım koduyla bir stüdyoya katılın.">
      <Msg>{err}</Msg>
      <Input label="Yeni stüdyo adı" value={f.studio} onChange={set("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
      <Btn busy={busy} onClick={doSetupCreate}>Stüdyoyu Oluştur</Btn>
      <div style={{ textAlign: "center", color: C.text2, fontSize: 12, margin: "14px 0" }}>— veya —</div>
      <Input label="Personel katılım kodu" value={f.code} onChange={set("code")} placeholder="Yöneticinizden alın (6 karakter)"/>
      <Btn busy={busy} variant="ghost" onClick={doSetupJoin}>Koda Göre Katıl</Btn>
      {logoutLink}
    </Shell>
  );

  if (mode === "register") return (
    <Shell title="Stüdyonu oluştur" sub="7 gün boyunca tüm Pro özellikler ücretsiz. Aynı hesapla telefondan ve bilgisayardan giriş yapabilirsiniz.">
      <Msg>{err}</Msg>
      <Input label="Stüdyo / Firma adı" value={f.studio} onChange={set("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
      <Input label="Adınız Soyadınız" value={f.name} onChange={set("name")} placeholder="Yetkili kişi"/>
      <Input label="E-posta" type="email" value={f.email} onChange={set("email")} placeholder="ornek@mail.com" autoComplete="email"/>
      <Input label="Şifre (en az 6 karakter)" type="password" value={f.password} onChange={set("password")} autoComplete="new-password"/>
      <Btn busy={busy} onClick={doRegister}>Hesabı Oluştur</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}><Link onClick={() => go("login")}>Zaten hesabım var — Giriş yap</Link></div>
    </Shell>
  );

  if (mode === "join") return (
    <Shell title="Personel olarak katıl" sub="Stüdyo yöneticinizden aldığınız katılım koduyla kendi hesabınızı oluşturun.">
      <Msg>{err}</Msg>
      <Input label="Katılım kodu" value={f.code} onChange={set("code")} placeholder="Örn: A1B2C3"/>
      <Input label="Adınız Soyadınız" value={f.name} onChange={set("name")}/>
      <Input label="E-posta" type="email" value={f.email} onChange={set("email")} autoComplete="email"/>
      <Input label="Şifre (en az 6 karakter)" type="password" value={f.password} onChange={set("password")} autoComplete="new-password"/>
      <Btn busy={busy} onClick={doJoin}>Hesabı Oluştur ve Katıl</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}><Link onClick={() => go("login")}>Giriş ekranına dön</Link></div>
    </Shell>
  );

  if (mode === "verify") return (
    <Shell title="E-postanızı doğrulayın" sub={`${f.email} adresine gönderilen doğrulama kodunu girin.`}>
      <Msg kind="ok">{info}</Msg><Msg>{err}</Msg>
      <Input label="Doğrulama kodu" value={f.otp} onChange={set("otp")} inputMode="numeric" placeholder="Kod"/>
      <Btn busy={busy} onClick={doVerify}>Doğrula</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link onClick={() => run(async () => { await resendSignupCode(f.email); setInfo("Kod tekrar gönderildi."); })}>Kodu tekrar gönder</Link>
      </div>
    </Shell>
  );

  if (mode === "reset") return (
    <Shell title="Şifremi unuttum" sub="E-posta adresinize şifre sıfırlama bağlantısı gönderilir.">
      <Msg kind="ok">{info}</Msg><Msg>{err}</Msg>
      <Input label="E-posta" type="email" value={f.email} onChange={set("email")}/>
      <Btn busy={busy} onClick={doReset}>Bağlantı Gönder</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}><Link onClick={() => go("login")}>Giriş ekranına dön</Link></div>
    </Shell>
  );

  if (mode === "musteri") return (
    <Shell title="Müşteri Portalı" sub="Fotoğraf seçimi ve çekim takibi için bilgilerinizi girin.">
      <Msg>{err}</Msg>
      <Input label="Ad Soyad" value={f.name} onChange={set("name")}/>
      <Input label="Telefonunuzun son 4 hanesi" value={f.phone4} onChange={e => setF(p => ({ ...p, phone4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} inputMode="numeric"/>
      <Btn busy={busy} onClick={doCustomer}>Portala Giriş Yap</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}><Link onClick={() => go("login")}>Stüdyo girişine dön</Link></div>
    </Shell>
  );

  return (
    <Shell title="Giriş Yap" sub="Stüdyo yöneticisi ve personel kendi e-posta ve şifresiyle giriş yapar.">
      <Msg>{err}</Msg>
      <Input label="E-posta" type="email" value={f.email} onChange={set("email")} placeholder="ornek@mail.com" autoComplete="email"/>
      <Input label="Şifre" type="password" value={f.password} onChange={set("password")} autoComplete="current-password"
        onKeyDown={e => e.key === "Enter" && doLogin()}/>
      <Btn busy={busy} onClick={doLogin}>Giriş Yap</Btn>
      <div style={{ textAlign: "right", marginTop: 6 }}><Link onClick={() => go("reset")}>Şifremi unuttum</Link></div>
      <div style={{ height: 1, background: C.border, margin: "14px 0" }}/>
      <Btn variant="ghost" onClick={() => go("register")}>👑 Stüdyonu Oluştur — 7 Gün Ücretsiz</Btn>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <Link onClick={() => go("join")}>👤 Personel olarak katıl</Link>
        <Link onClick={() => go("musteri")}>📸 Müşteri Portalı</Link>
      </div>
    </Shell>
  );
};
