import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { PLANS, activatePro } from "../../services/plan";

// ─── ProGate: Limit veya Pro Kilit Kartı ─────────
// Örnek: <ProGate check={limitCheck} featureLabel="Randevu" onUpgrade={()=>setActive("planyonetimi")} />
// veya:  <ProGate proOnly featureLabel="Sözleşmeler" onUpgrade={()=>setActive("planyonetimi")} />
export const ProGate = ({ check, proOnly, featureLabel, onUpgrade, children }) => {
  // Pro-only özellik kilidi
  if (proOnly) {
    return (
      <div className="fade-in" style={{
        background: `linear-gradient(135deg, ${T.gold}08, ${T.gold}18)`,
        border: `1.5px solid ${T.gold}44`,
        borderRadius: 20,
        padding: "32px 24px",
        textAlign: "center",
        margin: "20px 0",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👑</div>
        <div style={{
          fontFamily: "Playfair Display",
          fontSize: 20,
          fontWeight: 700,
          color: T.goldL,
          marginBottom: 8,
        }}>
          Pro Özellik
        </div>
        <div style={{ fontSize: 14, color: T.text2, marginBottom: 6, lineHeight: 1.6 }}>
          <strong>{featureLabel}</strong> özelliği Pro planda kullanılabilir.
        </div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 20 }}>
          Aylık sadece <span style={{ color: T.goldL, fontWeight: 700 }}>₺{PLANS.pro.price}</span> ile tüm özellikleri açın.
        </div>
        <button
          onClick={onUpgrade}
          style={{
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldD || T.gold})`,
            color: T.bg,
            border: "none",
            borderRadius: 14,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 4px 20px ${T.gold}40`,
          }}
        >
          👑 Pro'ya Geç — ₺{PLANS.pro.price}/ay
        </button>
      </div>
    );
  }

  // Limit kontrolü
  if (check && !check.allowed) {
    return (
      <div className="fade-in" style={{
        background: `linear-gradient(135deg, ${T.orange}08, ${T.orange}18)`,
        border: `1.5px solid ${T.orange}44`,
        borderRadius: 20,
        padding: "28px 24px",
        textAlign: "center",
        margin: "20px 0",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{
          fontFamily: "Playfair Display",
          fontSize: 18,
          fontWeight: 700,
          color: T.orangeL,
          marginBottom: 8,
        }}>
          {featureLabel} Limiti Doldu
        </div>
        <div style={{ fontSize: 13, color: T.text2, marginBottom: 6, lineHeight: 1.6 }}>
          Basic planda en fazla <strong>{check.limit} {featureLabel.toLowerCase()}</strong> ekleyebilirsiniz.
        </div>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          marginBottom: 16,
        }}>
          {Array.from({ length: Math.min(check.limit, 10) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: i < check.current ? T.orangeL : T.card2,
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: i < check.current ? T.bg : T.text3,
                fontWeight: 700,
              }}
            >
              {i < check.current ? "✓" : ""}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 16 }}>
          Pro'ya geçerek <span style={{ color: T.goldL, fontWeight: 700 }}>sınırsız</span> {featureLabel.toLowerCase()} ekleyebilirsiniz.
        </div>
        <button
          onClick={onUpgrade}
          style={{
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldD || T.gold})`,
            color: T.bg,
            border: "none",
            borderRadius: 14,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 4px 20px ${T.gold}40`,
          }}
        >
          👑 Pro'ya Geç — ₺{PLANS.pro.price}/ay
        </button>
      </div>
    );
  }

  // Limit içinde veya Pro kullanıcı — çocuk bileşenleri göster
  return children || null;
};

// ─── UsageBadge: Kalan Hak Göstergesi ────────────
// Örnek: <UsageBadge check={limitCheck} label="Randevu" />
export const UsageBadge = ({ check, label }) => {
  if (!check || check.isPro || check.limit === Infinity) return null;
  const pct = Math.round((check.current / check.limit) * 100);
  const isWarning = pct >= 80;
  const isFull = pct >= 100;
  const color = isFull ? T.redL : isWarning ? T.orangeL : T.goldL;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: color + "12",
      border: `1px solid ${color}33`,
      borderRadius: 10,
      padding: "6px 12px",
      fontSize: 12,
    }}>
      <span style={{ color: T.text3 }}>{label}:</span>
      <span style={{ fontWeight: 700, color }}>
        {check.current}/{check.limit}
      </span>
      <div style={{
        flex: 1,
        height: 4,
        background: T.card2,
        borderRadius: 99,
        overflow: "hidden",
        minWidth: 40,
      }}>
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
};

// ─── PlanBadge: Küçük plan etiketi ───────────────
export const PlanBadge = ({ plan }) => {
  const isPro = plan === "pro";
  const isTrial = plan === "trial";
  
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: isPro ? T.gold + "22" : isTrial ? T.blue + "22" : T.card2,
      border: `1px solid ${isPro ? T.gold + "66" : isTrial ? T.blue + "66" : T.border}`,
      borderRadius: 8,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 700,
      color: isPro ? T.goldL : isTrial ? T.blueL : T.text3,
    }}>
      {isPro ? "👑 Pro" : isTrial ? "⏳ Pro Deneme" : "🆓 Basic"}
    </span>
  );
};

// ─── ProBadge: Menü ikonu için küçük kilit ───────
export const ProBadge = () => (
  <span style={{
    fontSize: 10,
    background: T.gold + "33",
    color: T.goldL,
    borderRadius: 6,
    padding: "2px 6px",
    fontWeight: 700,
    marginLeft: 6,
  }}>
    PRO
  </span>
);
