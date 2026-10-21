// ════════════════════════════════════════════════
// BULUT GİRİŞİ — e-posta/şifre ile hesap, stüdyo oluşturma, personel katılımı
// Aynı hesapla telefondan ve bilgisayardan giriş yapılır, aynı veri görülür.
// ════════════════════════════════════════════════
import React, { useState } from "react";
import { T } from "../../constants/theme";
import { LoginShell } from "../common/LoginShell";
import {
  signIn, signUp, signOut, verifySignupCode, resendSignupCode, resetPassword,
  fetchMyStudio, createStudio, setMyTeamId, saveStudioProfileRemote, findClientId, currentUser,
} from "../../services/auth";

// Görünüm: eski giriş ekranıyla aynı (kamera vizörü, odaklanan diyafram, cam kart)
const inputStyle = { background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 14, padding: "13px 14px",
  color: T.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", transition: "border 0.2s" };

const Input = ({ label, icon, ...p }) => (
  <label style={{ display: "block", marginBottom: 14 }}>
    <div style={{ fontSize: 12, color: T.text3, marginBottom: 6, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
      {icon && <span>{icon}</span>} {label}
    </div>
    <input {...p} style={inputStyle}/>
  </label>
);
const Btn = ({ children, busy, variant = "primary", ...p }) => (
  <button {...p} disabled={busy || p.disabled}
    style={variant === "primary" ? {
      width: "100%", border: "none", borderRadius: 14, padding: "14px", fontSize: 14.5, fontWeight: 800, color: "#FFFFFF",
      background: `linear-gradient(135deg, ${T.goldL} 0%, ${T.gold} 50%, ${T.goldD} 100%)`, boxShadow: `0 8px 24px ${T.gold}45`,
      letterSpacing: "0.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
      cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
    } : {
      width: "100%", borderRadius: 14, padding: "13px", fontSize: 13.5, fontWeight: 700, marginTop: 4,
      background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.text2, cursor: "pointer",
    }}>
    {busy ? "Lütfen bekleyin..." : children}
  </button>
);
const Link = ({ children, onClick }) => (
  <button type="button" onClick={onClick} style={{ background: "none", border: "none", color: T.goldL, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 4 }}>{children}</button>
);
const Msg = ({ kind = "err", children }) => children ? (
  <div style={{ fontSize: 12, lineHeight: 1.5, borderRadius: 10, padding: "9px 12px", marginBottom: 12, textAlign: "center",
    color: kind === "err" ? T.redL : T.greenL, background: (kind === "err" ? T.red : T.green) + "18",
    border: `1px solid ${(kind === "err" ? T.red : T.green)}33` }}>{kind === "err" ? "⚠️ " : ""}{children}</div>
) : null;

// Giriş Yap / 7 Gün Ücretsiz sekmeleri
const Tabs = ({ mode, go }) => (
  <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 4, marginBottom: 20 }}>
    {[["login", "Giriş Yap", 1], ["register", "👑 7 Gün Ücretsiz", 1.2]].map(([m, label, flex]) => {
      const on = mode === m;
      return (
        <button key={m} type="button" onClick={() => go(m)}
          style={{ flex, padding: "10px 0", borderRadius: 12, fontSize: on ? 13 : 12, fontWeight: on ? 700 : 600, cursor: "pointer",
            color: on ? "#FFFFFF" : T.goldL,
            background: on ? "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)" : "transparent",
            border: on ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
            boxShadow: on ? "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)" : "none" }}>
          {label}
        </button>
      );
    })}
  </div>
);

// Personel / Müşteri geçiş bağlantıları
const RoleLinks = ({ go }) => (
  <div style={{ display: "flex", gap: 8, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
    {[["personel", "👤", "Personel Girişi"], ["musteri", "📸", "Müşteri Portalı"]].map(([m, ic, label]) => (
      <button key={m} type="button" onClick={() => go(m)}
        style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 6px",
          color: T.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span>{ic}</span> {label}
      </button>
    ))}
  </div>
);

// Alt ekran başlığı (geri düğmeli)
const Head = ({ icon, title, sub, onBack }) => (
  <div style={{ marginBottom: 18 }}>
    {onBack && (
      <button type="button" onClick={onBack}
        style={{ background: "none", border: "none", color: T.text3, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 14 }}>
        ← Geri
      </button>
    )}
    <div style={{ textAlign: "center" }}>
      {icon && <div style={{ fontSize: 30, marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: T.text3, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  </div>
);

const Shell = ({ children }) => <LoginShell>{children}</LoginShell>;

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
  const [pendingAfterVerify, setPendingAfterVerify] = useState(null);
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
      <Head icon="👤" title="Siz kimsiniz?" sub="Ekip listesinden kendi adınızı seçin. Size atanan görevler ve bildirimler buna göre gösterilir."/>
      <Msg>{err}</Msg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {team.map(m => (
          <button key={m.id} onClick={() => doPickStaff(m.id)} disabled={busy}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px",
              color: T.text, fontSize: 14, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>
            {m.name} <span style={{ color: T.text3, fontWeight: 400, fontSize: 12 }}>{m.role}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><Btn variant="ghost" onClick={() => onReady(null)}>Listede yokum, şimdilik atla</Btn></div>
      {logoutLink}
    </Shell>
  );

  if (mode === "setup") return (
    <Shell>
      <Head icon="🏢" title="Stüdyo kurulumu" sub="Bu hesap henüz bir stüdyoya bağlı değil. Stüdyonuzun adını girerek kurulumu tamamlayın."/>
      <Msg>{err}</Msg>
      <Input icon="🏢" label="Stüdyo / Firma adı" value={f.studio} onChange={set("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
      <Btn busy={busy} onClick={doSetupCreate}><span>👑</span> Stüdyoyu Oluştur</Btn>
      <div style={{ fontSize: 12, color: T.text3, marginTop: 14, lineHeight: 1.6 }}>
        Personel misiniz? Personel hesabını stüdyo yöneticiniz açar. Yöneticinizin verdiği telefon numarası ve şifreyle giriş yapın.
      </div>
      {logoutLink}
    </Shell>
  );

  if (mode === "register") return (
    <Shell>
      <Tabs mode="register" go={go}/>
      <div style={{ fontSize: 12, color: T.text3, marginBottom: 14, lineHeight: 1.5, textAlign: "center" }}>
        7 gün boyunca tüm Pro özellikler ücretsiz. Aynı hesapla telefondan ve bilgisayardan giriş yapabilirsiniz.
      </div>
      <Msg>{err}</Msg>
      <Input icon="🏢" label="Stüdyo / Firma adı" value={f.studio} onChange={set("studio")} placeholder="Örn: Işık Fotoğrafçılık"/>
      <Input icon="👤" label="Adınız Soyadınız" value={f.name} onChange={set("name")} placeholder="Yetkili kişi"/>
      <Input icon="✉️" label="E-posta" type="email" value={f.email} onChange={set("email")} placeholder="ornek@mail.com" autoComplete="email"/>
      <Input icon="🔒" label="Şifre (en az 6 karakter)" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="new-password"/>
      <Btn busy={busy} onClick={doRegister}><span>👑</span> Stüdyomu Oluştur</Btn>
      <RoleLinks go={go}/>
    </Shell>
  );

  if (mode === "personel") return (
    <Shell>
      <Head icon="👤" title="Personel Girişi" sub="Personel hesabınızı stüdyo yöneticiniz oluşturur ve şifrenizi belirler." onBack={() => go("login")}/>
      <Msg>{err}</Msg>
      <Input icon="📱" label="Telefon numaranız" type="tel" value={f.email} onChange={set("email")} placeholder="05xx xxx xx xx" autoComplete="username"/>
      <Input icon="🔒" label="Şifre" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="current-password"
        onKeyDown={e => e.key === "Enter" && doLogin()}/>
      <Btn busy={busy} onClick={doLogin}><span>👤</span> Personel Girişi Yap</Btn>
      <div style={{ fontSize: 12, color: T.text3, marginTop: 12, lineHeight: 1.6, textAlign: "center" }}>
        Şifrenizi unuttuysanız stüdyo yöneticiniz uygulamadaki Ekip bölümünden yeni şifre belirleyebilir.
      </div>
    </Shell>
  );

  if (mode === "verify") return (
    <Shell>
      <Head icon="✉️" title="E-postanızı doğrulayın" sub={`${f.email} adresine gönderilen doğrulama kodunu girin.`} onBack={() => go("register")}/>
      <Msg kind="ok">{info}</Msg><Msg>{err}</Msg>
      <Input icon="🔑" label="Doğrulama kodu" value={f.otp} onChange={set("otp")} inputMode="numeric" placeholder="Kod"/>
      <Btn busy={busy} onClick={doVerify}>Doğrula</Btn>
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link onClick={() => run(async () => { await resendSignupCode(f.email); setInfo("Kod tekrar gönderildi."); })}>Kodu tekrar gönder</Link>
      </div>
    </Shell>
  );

  if (mode === "reset") return (
    <Shell>
      <Head icon="🔑" title="Şifremi unuttum" sub="E-posta adresinize şifre sıfırlama bağlantısı gönderilir. Personelseniz şifrenizi yöneticiniz değiştirebilir." onBack={() => go("login")}/>
      <Msg kind="ok">{info}</Msg><Msg>{err}</Msg>
      <Input icon="✉️" label="E-posta" type="email" value={f.email} onChange={set("email")} placeholder="ornek@mail.com"/>
      <Btn busy={busy} onClick={doReset}>Bağlantı Gönder</Btn>
    </Shell>
  );

  if (mode === "musteri") return (
    <Shell>
      <Head icon="📸" title="Müşteri Portalı" sub="Stüdyonuzun gönderdiği linke tıklayarak da doğrudan girebilirsiniz." onBack={() => go("login")}/>
      <Msg>{err}</Msg>
      <Input icon="🏢" label="Stüdyo kodu" value={f.code} placeholder="Örn: A1B2C3" autoCapitalize="characters"
        onChange={e => setF(p => ({ ...p, code: e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6).toUpperCase() }))}/>
      <Input icon="👤" label="Ad Soyad" value={f.name} onChange={set("name")} placeholder="Ad Soyad"/>
      <Input icon="📱" label="Telefonunuzun son 4 hanesi" placeholder="••••" value={f.phone4} onChange={e => setF(p => ({ ...p, phone4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} inputMode="numeric"/>
      <Btn busy={busy} onClick={doCustomer}><span>📸</span> Portala Giriş Yap</Btn>
    </Shell>
  );

  return (
    <Shell>
      <Tabs mode="login" go={go}/>
      <Msg>{err}</Msg>
      <Input icon="✉️" label="E-posta veya telefon" type="text" value={f.email} onChange={set("email")} placeholder="ornek@gmail.com" autoComplete="username"/>
      <Input icon="🔒" label="Şifre" type="password" value={f.password} onChange={set("password")} placeholder="••••••••" autoComplete="current-password"
        onKeyDown={e => e.key === "Enter" && doLogin()}/>
      <Btn busy={busy} onClick={doLogin}><span>📸</span> Stüdyoya Giriş Yap</Btn>
      <div style={{ textAlign: "right", marginTop: 6 }}><Link onClick={() => go("reset")}>Şifremi unuttum</Link></div>
      <RoleLinks go={go}/>
    </Shell>
  );
};
