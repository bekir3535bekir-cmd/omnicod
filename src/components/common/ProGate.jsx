import React from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { PLANS, FEATURES, getPlan, requiredPlanFor, featuresOfPlan, isNativeApp } from "../../services/plan";

const fmtPrice = (n) => new Intl.NumberFormat("tr-TR").format(n) + " ₺";

// Plan rengi: Standart mavi, Pro altın
const planColor = (planId) => planId === "pro" ? { c: T.gold, l: T.goldL } : planId === "standart" ? { c: T.blue, l: T.blueL } : { c: T.text3, l: T.text3 };

// Telefon uygulamalarında (mağaza kuralı) fiyat/satın alma yerine bu yönlendirme gösterilir
const NativeUpgradeNote = () => (
  <div style={{ fontSize: 12.5, color: T.text3, lineHeight: 1.6, marginTop: 4 }}>
    Planınızı STÜDYOM masaüstü programından veya web sitemizden yükseltebilirsiniz.
    Yükseltme yapıldığında bu cihazda da otomatik açılır.
  </div>
);

// Düz tema: SaaS yükseltme kartı — ikon ve başlık, tikli özellik listesi, altta fiyat ve buton
const FlatGate = ({ icon, badge, title, desc, children, price, current, cta, onUpgrade, native }) => (
  <div className="fade-in" style={{ padding: "0 20px" }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius || 14, boxShadow: T.cardShadow || "none",
      margin: "20px 0", maxWidth: 560, overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.card2, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic n={icon || "star"} s={20} c={T.text2}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: T.text }}>{title}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: T.goldL,
                background: T.gold + "1A", borderRadius: 99, padding: "2px 9px" }}>
                <Ic n="lock" s={12} c={T.goldL}/> {badge}
              </span>
            </div>
            {desc && <div style={{ fontSize: 13.5, color: T.text2, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>}
          </div>
        </div>
        {children}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        padding: "14px 22px", borderTop: `1px solid ${T.border}`, background: T.card2 }}>
        <div>
          {!native && price && <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{price}<span style={{ fontSize: 13, fontWeight: 500, color: T.text3 }}> / ay</span></div>}
          {current && <div style={{ fontSize: 12.5, color: T.text3, marginTop: 2 }}>Şu anki planınız: {current}</div>}
        </div>
        <button onClick={onUpgrade} style={{ background: T.gold, color: T.onAccent, border: "none", borderRadius: T.btnRadius || 10,
          padding: "0 18px", minHeight: 44, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {cta}
        </button>
      </div>
      {native && <div style={{ padding: "0 22px 16px" }}><NativeUpgradeNote/></div>}
    </div>
  </div>
);
// Planla açılan özellikler: tikli iki sütunlu liste
const FeatureChecks = ({ items }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text3, marginBottom: 10 }}>Bu planla açılanlar</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "8px 16px" }}>
      {items.map(o => (
        <div key={o} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: T.text }}>
          <Ic n="check" s={15} c={T.goldL}/> {o}
        </div>
      ))}
    </div>
  </div>
);

// ─── ProGate: Kilitli özellik veya dolan limit kartı ─────────
// Özellik kilidi: <ProGate feature="raporlar" onUpgrade={()=>setActive("planyonetimi")} />
// Limit:          <ProGate check={limitCheck} featureLabel="Randevu" onUpgrade={...} />
export const ProGate = ({ feature, check, featureLabel, onUpgrade, children, proOnly }) => {
  const native = isNativeApp();
  const current = getPlan();

  // Özellik kilidi
  if (feature || proOnly) {
    const f = FEATURES[feature] || { label: featureLabel, desc: "", plan: "pro", icon: "star" };
    const need = feature ? requiredPlanFor(feature) : "pro";
    const { c, l } = planColor(need);
    const others = featuresOfPlan(need).filter(k => k !== feature).map(k => FEATURES[k].label);
    if (T.flat) return (
      <FlatGate icon={f.icon} badge={PLANS[need].label} title={f.label} desc={f.desc} onUpgrade={onUpgrade} native={native}
        price={fmtPrice(PLANS[need].price)} current={PLANS[current]?.label || current} cta={`${PLANS[need].label} planına geç`}>
        <FeatureChecks items={[f.label, ...others]}/>
      </FlatGate>
    );
    return (
      <div className="fade-in" style={{ padding: "0 20px" }}>
        <div style={{ background: `linear-gradient(135deg, ${c}08, ${c}18)`, border: `1.5px solid ${c}44`,
          borderRadius: 20, padding: "28px 22px", textAlign: "center", margin: "20px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 14px", background: c + "22",
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Ic n={f.icon || "star"} s={28} c={l}/>
            <span style={{ position: "absolute", right: -6, bottom: -6, fontSize: 18 }}>🔒</span>
          </div>
          <div style={{ fontFamily: "Playfair Display", fontSize: 21, fontWeight: 700, color: l, marginBottom: 6 }}>{f.label}</div>
          {f.desc && <div style={{ fontSize: 13.5, color: T.text2, lineHeight: 1.6, marginBottom: 12 }}>{f.desc}</div>}
          <div style={{ display: "inline-block", fontSize: 12.5, color: T.text2, background: T.card2, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "8px 12px", marginBottom: 14, lineHeight: 1.5 }}>
            Bu özellik <b style={{ color: l }}>{PLANS[need].label}</b> planında açılır.<br/>
            Şu anki planınız: <b>{PLANS[current]?.label || current}</b>
          </div>
          {others.length > 0 && (
            <div style={{ textAlign: "left", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 8 }}>{PLANS[need].label} planıyla ayrıca açılanlar:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {others.map(o => <span key={o} style={{ fontSize: 11.5, color: l, background: T.flat ? T.card2 : c + "18", borderRadius: 8, padding: "4px 8px" }}>{o}</span>)}
              </div>
            </div>
          )}
          {!native && (
            <div style={{ fontSize: 13, color: T.text3, marginBottom: 14 }}>
              {PLANS[need].label}: <b style={{ color: l }}>aylık {fmtPrice(PLANS[need].price)}</b>
            </div>
          )}
          <button onClick={onUpgrade} style={{ background: `linear-gradient(135deg, ${c}, ${c})`, color: "#fff", border: "none",
            borderRadius: 14, padding: "13px 28px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 20px ${c}40` }}>
            Planları Karşılaştır
          </button>
          {native && <NativeUpgradeNote/>}
        </div>
      </div>
    );
  }

  // Limit kontrolü
  if (check && !check.allowed) {
    const up = check.upgradeTo || "pro";
    const { c, l } = planColor(up);
    if (T.flat) {
      const pct = Math.min(100, Math.round((check.current / Math.max(1, check.limit)) * 100));
      return (
        <FlatGate icon="warn" badge="Limit doldu" title={`${featureLabel} limiti`} onUpgrade={onUpgrade} native={native}
          desc={`${PLANS[check.plan]?.label || "Mevcut"} planında en fazla ${check.limit} ${featureLabel.toLowerCase()} eklenebilir.`}
          price={fmtPrice(PLANS[up].price)} current={PLANS[check.plan]?.label} cta={`${PLANS[up].label} planına geç`}>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.text2, marginBottom: 8 }}>
              <span>Kullanılan</span><span style={{ fontWeight: 600, color: T.text }}>{check.current} / {check.limit}</span>
            </div>
            <div role="progressbar" aria-valuenow={check.current} aria-valuemin={0} aria-valuemax={check.limit}
              style={{ height: 6, background: T.card3, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? T.red : T.gold, borderRadius: 99 }}/>
            </div>
          </div>
        </FlatGate>
      );
    }
    return (
      <div className="fade-in" style={{ background: `linear-gradient(135deg, ${T.orange}08, ${T.orange}18)`, border: `1.5px solid ${T.orange}44`,
        borderRadius: 20, padding: "28px 24px", textAlign: "center", margin: "20px 0" }}>
        <div style={{ fontFamily: "Playfair Display", fontSize: 18, fontWeight: 700, color: T.orangeL, marginBottom: 8 }}>
          {featureLabel} Limiti Doldu
        </div>
        <div style={{ fontSize: 13, color: T.text2, marginBottom: 6, lineHeight: 1.6 }}>
          {PLANS[check.plan]?.label || "Mevcut"} planında en fazla <strong>{check.limit} {featureLabel.toLowerCase()}</strong> ekleyebilirsiniz.
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {Array.from({ length: Math.min(check.limit, 10) }).map((_, i) => (
            <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: i < check.current ? T.orangeL : T.card2,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: i < check.current ? T.bg : T.text3, fontWeight: 700 }}>{i < check.current ? "✓" : ""}</div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 16 }}>
          <b style={{ color: l }}>{PLANS[up].label}</b> planına geçerek daha fazla {featureLabel.toLowerCase()} ekleyebilirsiniz
          {!native && <> — aylık <b style={{ color: l }}>{fmtPrice(PLANS[up].price)}</b></>}.
        </div>
        <button onClick={onUpgrade} style={{ background: `linear-gradient(135deg, ${c}, ${c})`, color: "#fff", border: "none",
          borderRadius: 14, padding: "13px 28px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 20px ${c}40` }}>
          Planları Karşılaştır
        </button>
        {native && <NativeUpgradeNote/>}
      </div>
    );
  }

  return children || null;
};

// ─── UsageBadge: Kalan Hak Göstergesi ────────────
export const UsageBadge = ({ check, label }) => {
  if (!check || check.unlimited || check.limit === Infinity) return null;
  const pct = Math.round((check.current / Math.max(1, check.limit)) * 100);
  const color = pct >= 100 ? T.redL : pct >= 80 ? T.orangeL : T.goldL;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: color + "12", border: `1px solid ${color}33`,
      borderRadius: 10, padding: "6px 12px", fontSize: 12 }}>
      <span style={{ color: T.text3 }}>{label}:</span>
      <span style={{ fontWeight: 700, color }}>{check.current}/{check.limit}</span>
      <div style={{ flex: 1, height: 4, background: T.card2, borderRadius: 99, overflow: "hidden", minWidth: 40 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.3s ease" }}/>
      </div>
    </div>
  );
};

// ─── PlanBadge: Küçük plan etiketi ───────────────
export const PlanBadge = ({ plan }) => {
  const map = {
    pro:      { t: "Pro",          ...planColor("pro") },
    standart: { t: "Standart",     ...planColor("standart") },
    trial:    { t: "Pro Deneme",   c: T.blue, l: T.blueL },
    basic:    { t: "🆓 Basic",        c: T.text3, l: T.text3 },
  };
  const m = map[plan] || map.basic;
  if (T.flat) return (
    <span style={{ fontSize: 11, fontWeight: 500, color: T.text2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px" }}>{m.t.replace(/^\S+\s/, "")}</span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: m.c + "22", border: `1px solid ${m.c}66`,
      borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: m.l }}>{m.t}</span>
  );
};

// ─── LockBadge: Menüde kilitli özellik etiketi (hangi planda açıldığı) ───
export const LockBadge = ({ plan = "pro" }) => {
  const { c, l } = planColor(plan);
  // Düz tema: sade gri etiket, kilit emojisi yok
  if (T.flat) return (
    <span style={{ fontSize: 10.5, color: T.text3, border: `1px solid ${T.border}`, borderRadius: 5, padding: "1px 6px",
      marginLeft: 6, fontWeight: 500, whiteSpace: "nowrap" }}>{PLANS[plan].short}</span>
  );
  return (
    <span style={{ fontSize: 9.5, background: c + "26", color: l, borderRadius: 6, padding: "2px 6px", fontWeight: 800,
      marginLeft: 6, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{PLANS[plan].short.toUpperCase()}</span>
  );
};

// Eski kullanım
export const ProBadge = () => <LockBadge plan="pro"/>;
