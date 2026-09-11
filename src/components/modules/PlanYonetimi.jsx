import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtDate } from "../../utils/helpers";
import { Card, Pill, GoldButton, Field, BottomSheet, PageHeader } from "../common";
import { PLANS, getPlan, activatePro, deactivatePro, getUsageSummary, getPlanExpiry, getTrialInfo, resetTrial, expireTrial } from "../../services/plan";

export const PlanYonetimi = ({ data, plan, setPlanState, setActive }) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [msg, setMsg] = useState(null);
  const [showActivate, setShowActivate] = useState(false);

  const isPro = plan === "pro";
  const isTrial = plan === "trial";
  const trial = getTrialInfo();
  const usage = getUsageSummary(data);
  const expiry = getPlanExpiry();

  const handleActivate = () => {
    const result = activatePro(licenseKey);
    setMsg(result);
    if (result.success) {
      setPlanState("pro");
      setLicenseKey("");
      setTimeout(() => setShowActivate(false), 1500);
    }
  };

  const handleDeactivate = () => {
    if (confirm("Pro planı iptal etmek istediğinize emin misiniz?")) {
      deactivatePro();
      setPlanState("basic");
      setMsg({ success: true, message: "Plan Basic'e düşürüldü." });
    }
  };

  const handleResetTrial = () => {
    resetTrial();
    setPlanState(getPlan());
    setMsg({ success: true, message: "7 günlük Pro deneme süresi sıfırlandı! 🎉" });
  };

  const handleExpireTrial = () => {
    expireTrial();
    setPlanState(getPlan());
    setMsg({ success: true, message: "Deneme süresi sona erdirildi, Basic plan aktif edildi." });
  };

  const features = [
    { label: "Randevu Ekleme",          basic: "20 adet",    pro: "Sınırsız",  icon: "calendar" },
    { label: "Müşteri Ekleme",          basic: "20 adet",    pro: "Sınırsız",  icon: "users" },
    { label: "Ekip Üyesi",             basic: "2 kişi",     pro: "Sınırsız",  icon: "team" },
    { label: "Hatırlatıcılar",          basic: "20 adet",    pro: "Sınırsız",  icon: "bell" },
    { label: "Not Defteri",             basic: "50 not",     pro: "Sınırsız",  icon: "notebook" },
    { label: "Sözleşme PDF",            basic: "—",          pro: "✅",         icon: "doc" },
    { label: "Fiyat Teklifi",           basic: "—",          pro: "✅",         icon: "doc" },
    { label: "Detaylı Raporlar",        basic: "—",          pro: "✅",         icon: "chart" },
    { label: "Portföy Galerisi",        basic: "—",          pro: "✅",         icon: "camera" },
    { label: "Müşteri Portali",         basic: "—",          pro: "✅",         icon: "eye" },
    { label: "İş Asistanı",            basic: "—",          pro: "✅",         icon: "warn" },
    { label: "Tema Değiştirme",         basic: "—",          pro: "✅",         icon: "settings" },
    { label: "Paket Düzenleme",         basic: "—",          pro: "✅",         icon: "box" },
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Plan Yönetimi" sub={isPro ? "👑 Pro Plan Aktif" : isTrial ? `⏳ Pro Deneme (${trial.daysLeft} Gün Kaldı)` : "🆓 Basic Plan"} />
      <div style={{ padding: "0 20px" }}>

        {/* Mevcut Plan Kartı */}
        {isTrial ? (
          <Card glow style={{ padding: 22, marginBottom: 20, textAlign: "center", background: `linear-gradient(135deg, ${T.blue}15, ${T.gold}15)` }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>⏳</div>
            <div style={{ fontFamily: "Playfair Display", fontSize: 24, fontWeight: 700, color: T.goldL, marginBottom: 6 }}>
              7 Günlük Ücretsiz Pro Deneme Aktif!
            </div>
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 12 }}>
              İlk 7 gün boyunca tüm Pro özellikleri (Sözleşmeler, Raporlar, Teklif, Galeri) ve sınırsız çekim hakkını ücretsiz deneyimliyorsunuz.
            </div>
            <div style={{ display: "inline-block", background: T.blue + "22", border: `1px solid ${T.blue}55`, borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 700, color: T.blueL }}>
              ⏱️ Kalan Deneme Süresi: {trial.daysLeft} Gün
            </div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 10 }}>
              Deneme süresi bitince ödeme yapmazsanız uygulama otomatik olarak 20 limitli Basic planda kalır.
            </div>
          </Card>
        ) : (
          <Card glow={isPro} style={{ padding: 24, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{isPro ? "👑" : "🆓"}</div>
            <div style={{
              fontFamily: "Playfair Display",
              fontSize: 28,
              fontWeight: 700,
              color: isPro ? T.goldL : T.text,
              marginBottom: 8,
            }}>
              {isPro ? "Pro Plan" : "Basic Plan"}
            </div>
            {isPro ? (
              <>
                <div style={{ fontSize: 14, color: T.greenL, fontWeight: 600, marginBottom: 4 }}>
                  ✅ Tüm özellikler aktif
                </div>
                {expiry && (
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 8 }}>
                    Bitiş: {fmtDate(expiry.split("T")[0])}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 14, color: T.text3, lineHeight: 1.6 }}>
                7 günlük ücretsiz deneme süresi sona erdi.
                <br />Şu anda 20 randevu ve müşteri limitli Basic plandasınız.
              </div>
            )}
          </Card>
        )}

        {/* Kullanım Durumu — Sadece Basic */}
        {!isPro && (
          <Card style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>
              📊 Kullanım Durumunuz
            </div>
            {Object.entries(usage.usage).map(([key, u]) => {
              const labels = { appointments: "Randevu", clients: "Müşteri", team: "Ekip", reminders: "Hatırlatıcı", notes: "Not" };
              const pct = u.limit === Infinity ? 0 : Math.round((u.current / u.limit) * 100);
              const color = pct >= 100 ? T.redL : pct >= 80 ? T.orangeL : T.greenL;
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.text2 }}>{labels[key] || key}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>
                      {u.current}/{u.limit === Infinity ? "∞" : u.limit}
                    </span>
                  </div>
                  <div style={{ height: 6, background: T.card2, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`,
                      height: "100%",
                      background: color,
                      borderRadius: 99,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Fiyatlandırma */}
        {!isPro && (
          <Card glow style={{ padding: 24, marginBottom: 20, textAlign: "center",
            background: `linear-gradient(135deg, ${T.gold}08, ${T.gold}15)` }}>
            <div style={{ fontSize: 14, color: T.text3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
              Pro'ya Yükselt
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ fontFamily: "Playfair Display", fontSize: 42, fontWeight: 700, color: T.goldL }}>₺{PLANS.pro.price}</span>
              <span style={{ fontSize: 16, color: T.text3 }}>/ay</span>
            </div>
            <div style={{ fontSize: 12, color: T.text3, marginBottom: 16 }}>
              veya ₺{PLANS.pro.priceYearly}/yıl ile %17 tasarruf
            </div>
            <GoldButton
              label="👑 Lisans Kodu ile Aktive Et"
              icon="check"
              full
              onClick={() => setShowActivate(true)}
            />
          </Card>
        )}

        {/* Karşılaştırma Tablosu */}
        <Card style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>
            ⚡ Özellik Karşılaştırması
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: "0",
            fontSize: 12,
          }}>
            {/* Header */}
            <div style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: T.text3 }}>Özellik</div>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: T.text3, textAlign: "center" }}>Basic</div>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: T.goldL, textAlign: "center" }}>👑 Pro</div>
            {/* Rows */}
            {features.map((f, i) => (
              <React.Fragment key={i}>
                <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}22`, color: T.text2, display: "flex", alignItems: "center", gap: 6 }}>
                  <Ic n={f.icon} s={13} c={T.text3} />
                  {f.label}
                </div>
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}22`, textAlign: "center", color: f.basic === "—" ? T.redL : T.text2 }}>
                  {f.basic === "—" ? "🔒" : f.basic}
                </div>
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}22`, textAlign: "center", color: T.greenL, fontWeight: 600 }}>
                  {f.pro}
                </div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Pro iptal */}
        {isPro && (
          <button
            onClick={handleDeactivate}
            style={{
              width: "100%",
              background: "transparent",
              border: `1px solid ${T.red}44`,
              borderRadius: 14,
              padding: "14px",
              fontSize: 13,
              color: T.redL,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            Pro Planı İptal Et
          </button>
        )}

        {/* Test & Simülasyon Araçları */}
        <Card style={{ padding: 16, marginBottom: 20, background: T.card2, border: `1px dashed ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            🧪 SaaS Deneme Test Araçları
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginBottom: 12, lineHeight: 1.5 }}>
            7 günlük deneme ve sonrasındaki Basic geçişini test etmek için kullanabilirsiniz:
          </div>
          <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
            <button
              onClick={handleResetTrial}
              style={{
                background: T.blue + "1A",
                border: `1px solid ${T.blue}44`,
                color: T.blueL,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              ⏳ 7 Günlük Denemeyi Yeniden Başlat (İlk Geliş Simülasyonu)
            </button>
            <button
              onClick={handleExpireTrial}
              style={{
                background: T.orange + "1A",
                border: `1px solid ${T.orange}44`,
                color: T.orangeL,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              🔒 Deneme Süresini Bitir (Basic Plan & Teklif Simülasyonu)
            </button>
          </div>
        </Card>

        {/* Destek */}
        <Card style={{ padding: 16, marginBottom: 30, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.6 }}>
            Sorularınız mı var? 📧 destek@omnicod.com
            <br />WhatsApp: 0532 000 00 00
          </div>
        </Card>
      </div>

      {/* Aktivasyon Modal */}
      {showActivate && (
        <BottomSheet title="Pro Aktivasyon" onClose={() => { setShowActivate(false); setMsg(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
              Pro lisans kodunuzu girin. Kod satın almak için web sitemizi ziyaret edin
              veya WhatsApp ile iletişime geçin.
            </div>
            <Field
              label="Lisans Kodu"
              value={licenseKey}
              onChange={setLicenseKey}
              placeholder="OMNICOD-PRO-XXXX"
            />
            {msg && (
              <div style={{
                background: msg.success ? T.green + "1A" : T.red + "1A",
                border: `1px solid ${msg.success ? T.green : T.red}33`,
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 13,
                color: msg.success ? T.greenL : T.redL,
              }}>
                {msg.message}
              </div>
            )}
            <GoldButton
              label="Aktive Et"
              icon="check"
              full
              onClick={handleActivate}
            />
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
