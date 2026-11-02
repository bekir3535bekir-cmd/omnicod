import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmtDate } from "../../utils/helpers";
import { Card, GoldButton, BottomSheet, PageHeader } from "../common";
import { PlanBadge } from "../common/ProGate";
import {
  PLANS, PLAN_ORDER, FEATURES, planHasFeature, getUsageSummary, getPlanExpiry, getTrialInfo,
  activatePro, resetTrial, expireTrial, getPlan, isNativeApp,
} from "../../services/plan";
import { IS_CLOUD } from "../../services/supabase";

const fmtPrice = (n) => new Intl.NumberFormat("tr-TR").format(n) + " ₺";
// Satış iletişimi (WhatsApp numarası veya e-posta) — .env içinde VITE_SALES_CONTACT
const SALES_CONTACT = (import.meta.env.VITE_SALES_CONTACT || "").trim();

export const PlanYonetimi = ({ data, plan, setPlanState }) => {
  const native = isNativeApp();
  const trial = getTrialInfo();
  const usage = getUsageSummary(data);
  const expiry = getPlanExpiry();
  const [upgradeTo, setUpgradeTo] = useState(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [msg, setMsg] = useState(null);
  const [showLicense, setShowLicense] = useState(false);

  // Deneme sırasında tüm özellikler açık (Pro gibi)
  const effective = plan === "trial" ? "pro" : plan;
  const colorOf = (p) => p === "pro" ? { c: T.gold, l: T.goldL } : p === "standart" ? { c: T.blue, l: T.blueL } : { c: T.text3, l: T.text2 };
  const featureIds = Object.keys(FEATURES);
  const countOf = (p) => featureIds.filter(f => planHasFeature(p, f)).length;

  const limitText = (p, key, unit) => {
    const v = PLANS[p].limits[key];
    return v === Infinity ? `Sınırsız ${unit}` : v === 0 ? `${unit[0].toUpperCase() + unit.slice(1)} yok` : `${v} ${unit}`;
  };

  return (
    <div className="fade-in">
      <PageHeader title="Planlar" sub="Planınızı ve hangi özelliklerin açık olduğunu görün"/>
      <div style={{ padding: "0 20px 40px" }}>

        {/* Mevcut plan */}
        <Card style={{ padding: 18, marginBottom: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>Mevcut planınız</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{PLANS[plan]?.label}</span>
              <PlanBadge plan={plan}/>
            </div>
            <div style={{ fontSize: 12.5, color: T.text3, marginTop: 6, lineHeight: 1.5 }}>
              {plan === "trial"
                ? <>Tüm özellikler açık. Deneme bitişine <b style={{ color: T.blueL }}>{trial.daysLeft} gün</b> kaldı ({fmtDate(trial.endDate?.slice(0, 10))}). Sonrasında Basic plana geçilir.</>
                : <>{countOf(effective)} / {featureIds.length} özellik açık{expiry ? <> · Bitiş: {fmtDate(expiry.slice(0, 10))}</> : null}</>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[["clients", "Müşteri"], ["appointments", "Randevu"], ["team", "Personel"]].map(([k, l]) => {
              const u = usage.usage[k];
              return (
                <div key={k} style={{ textAlign: "center", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 12px", minWidth: 86 }}>
                  <div style={{ fontSize: 11, color: T.text3 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{u.current}{u.limit === Infinity ? "" : ` / ${u.limit}`}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Plan kartları */}
        <div className="plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginBottom: 20 }}>
          {PLAN_ORDER.map(p => {
            const { c, l } = colorOf(p);
            const isCurrent = effective === p && plan !== "trial";
            const higher = PLANS[p].level > PLANS[effective].level || plan === "trial";
            return (
              <div key={p} style={{ background: isCurrent ? c + "14" : T.card, border: `1.5px solid ${isCurrent ? c : T.border}`, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: l }}>{p === "pro" ? "" : p === "standart" ? "" : ""}{PLANS[p].label}</div>
                  {isCurrent && <span style={{ fontSize: 10.5, fontWeight: 800, color: c, background: T.flat ? T.card2 : c + "22", borderRadius: 6, padding: "3px 7px" }}>MEVCUT</span>}
                </div>
                {!native && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: T.text }}>{PLANS[p].price ? fmtPrice(PLANS[p].price) : "Ücretsiz"}</span>
                    {PLANS[p].price ? <span style={{ fontSize: 12, color: T.text3 }}> / ay</span> : null}
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: T.text3, marginTop: 6, lineHeight: 1.5, minHeight: 36 }}>{PLANS[p].desc}</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 10, lineHeight: 1.7 }}>
                  {countOf(p)} / {featureIds.length} özellik<br/>
                  {limitText(p, "clients", "müşteri")}, {limitText(p, "appointments", "randevu").toLowerCase()}<br/>
                  {limitText(p, "team", "personel")}
                </div>
                <div style={{ flex: 1 }}/>
                {!native && p !== "basic" && higher && !isCurrent && (
                  <button onClick={() => setUpgradeTo(p)} style={{ marginTop: 14, background: c, color: "#fff", border: "none", borderRadius: 12, padding: "11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                    {PLANS[p].label}'a Geç
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {native && (
          <Card style={{ padding: 14, marginBottom: 18, fontSize: 12.5, color: T.text3, lineHeight: 1.6 }}>
            Planınızı STÜDYOM masaüstü programından veya web sitemizden yükseltebilirsiniz. Yükseltme yapıldığında bu cihazda da otomatik açılır.
          </Card>
        )}

        {/* Özellik karşılaştırma tablosu */}
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 72px)", padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 800, color: T.text2 }}>
            <span>Özellik</span>
            {PLAN_ORDER.map(p => <span key={p} style={{ textAlign: "center", color: colorOf(p).l }}>{PLANS[p].short}</span>)}
          </div>
          {featureIds.map((f, i) => {
            const mine = planHasFeature(effective, f);
            return (
              <div key={f} style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 72px)", alignItems: "center", padding: "10px 14px",
                borderBottom: i < featureIds.length - 1 ? `1px solid ${T.border}` : "none", background: mine ? "transparent" : T.card2 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: mine ? T.text : T.text2 }}>{!mine && ""}{FEATURES[f].label}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{FEATURES[f].desc}</div>
                </div>
                {PLAN_ORDER.map(p => (
                  <span key={p} style={{ textAlign: "center", fontSize: 15, color: planHasFeature(p, f) ? T.greenL : T.text3 }}>
                    {planHasFeature(p, f) ? "✓" : "—"}
                  </span>
                ))}
              </div>
            );
          })}
        </Card>

        {/* Yerel mod: lisans kodu */}
        {!IS_CLOUD && !native && (
          <button onClick={() => setShowLicense(true)} style={{ background: "none", border: "none", color: T.text3, fontSize: 12, textDecoration: "underline", cursor: "pointer", marginBottom: 16 }}>
            Lisans kodum var
          </button>
        )}

        {/* Test araçları — yalnızca geliştirme sunucusunda */}
        {import.meta.env.DEV && (
          <Card style={{ padding: 14, background: T.card2, border: `1px dashed ${T.border}` }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: 8 }}>Test araçları (yalnızca geliştirme)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => { resetTrial(); setPlanState(getPlan()); }} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.text2 }}>Denemeyi başlat</button>
              <button onClick={() => { expireTrial(); setPlanState(getPlan()); }} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.text2 }}>Basic yap</button>
              {["standart", "pro"].map(p => (
                <button key={p} onClick={() => { try { localStorage.setItem((import.meta.env.VITE_DEV_MODE === "false" ? "geses_" : "geses_dev_") + "plan", p); } catch (e) {} setPlanState(getPlan()); }}
                  style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.text2 }}>{PLANS[p].label} yap</button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Yükseltme penceresi (masaüstü / web) */}
      {upgradeTo && (
        <BottomSheet title={`${PLANS[upgradeTo].label} Plan`} onClose={() => setUpgradeTo(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{fmtPrice(PLANS[upgradeTo].price)} <span style={{ fontSize: 13, color: T.text3, fontWeight: 500 }}>/ ay</span></div>
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
              {PLANS[upgradeTo].label} planı stüdyo hesabınıza tanımlanır; masaüstü programında ve tüm telefonlarda (personel dahil) aynı anda açılır.
            </div>
            <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
              Online ödeme çok yakında. Şimdilik planınızı yükseltmek için bizimle iletişime geçin
              {SALES_CONTACT ? <>: <b style={{ color: T.text }}>{SALES_CONTACT}</b></> : "."}
              {" "}Ödemeniz onaylandığında planınız birkaç dakika içinde açılır.
            </div>
            <GoldButton label="Tamam" full onClick={() => setUpgradeTo(null)}/>
          </div>
        </BottomSheet>
      )}

      {showLicense && (
        <BottomSheet title="Lisans Kodu" onClose={() => { setShowLicense(false); setMsg(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={licenseKey} onChange={e => setLicenseKey(e.target.value)} placeholder="Lisans kodunuz"
              style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", color: T.text, fontSize: 14, outline: "none" }}/>
            {msg && <div style={{ fontSize: 12.5, color: msg.success ? T.greenL : T.redL }}>{msg.message}</div>}
            <GoldButton label="Etkinleştir" full onClick={() => { const r = activatePro(licenseKey); setMsg(r); if (r.success) { setPlanState(getPlan()); setLicenseKey(""); } }}/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
