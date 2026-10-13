// ════════════════════════════════════════════════
// GİRİŞ EKRANI ÇERÇEVESİ — kamera vizörü, odaklanan diyafram, STÜDYOM yazısı ve cam kart
// Telefonda ve masaüstünde aynı giriş görünümü için ortak kullanılır.
// ════════════════════════════════════════════════
import React from "react";
import { T } from "../../constants/theme";

const KEYFRAMES = `
@keyframes lensCenterGitGel {
  0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(212,175,55,0.3)); }
  5% { transform: scale(1.45); filter: drop-shadow(0 0 12px rgba(56,189,248,0.85)); }
  10% { transform: scale(0.72); filter: drop-shadow(0 0 1px rgba(0,0,0,0.9)); }
  15% { transform: scale(1.32); filter: drop-shadow(0 0 10px rgba(56,189,248,0.75)); }
  20% { transform: scale(0.88); filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)); }
  24% { transform: scale(1.05); filter: drop-shadow(0 0 9px rgba(245,215,127,0.95)); }
  27%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(212,175,55,0.3)); }
}
@keyframes lensBladesAperture {
  0% { transform: rotate(0deg) scale(1); }
  5% { transform: rotate(14deg) scale(1.08); }
  10% { transform: rotate(-10deg) scale(0.94); }
  15% { transform: rotate(10deg) scale(1.05); }
  20% { transform: rotate(-6deg) scale(0.97); }
  24% { transform: rotate(1deg) scale(1.02); }
  27%, 100% { transform: rotate(0deg) scale(1); }
}
@keyframes lensDashedRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes lensGlintFlash {
  0%, 20% { opacity: 0.8; transform: scale(1); }
  24% { opacity: 1; transform: scale(1.6); filter: drop-shadow(0 0 6px #ffffff); }
  27%, 100% { opacity: 0.85; transform: scale(1); }
}
@keyframes outerHaloBreath {
  0%, 20% { box-shadow: 0 0 35px rgba(212,175,55,0.38), inset 0 0 15px rgba(255,255,255,0.2); border-color: rgba(212,175,55,0.8); }
  24% { box-shadow: 0 0 55px rgba(245,215,127,0.75), inset 0 0 22px rgba(255,255,255,0.45); border-color: #F5D77F; }
  29%, 100% { box-shadow: 0 0 35px rgba(212,175,55,0.38), inset 0 0 15px rgba(255,255,255,0.2); border-color: rgba(212,175,55,0.8); }
}
@keyframes hudPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.hud-line { white-space: nowrap; }
@media (max-width: 480px) { .hud-wide { display: none; } }
`;

const corner = (pos) => ({ position: "absolute", width: 28, height: 28, pointerEvents: "none", ...pos });

// Odaklanan kamera diyaframı
const Lens = () => (
  <div style={{ width: 86, height: 86, margin: "0 auto 16px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none" }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
      background: `linear-gradient(135deg, ${T.goldL}33 0%, rgba(15, 23, 42, 0.8) 100%)`,
      border: `2px solid ${T.gold}`, boxShadow: `0 0 25px ${T.goldGlow}`, animation: "outerHaloBreath 9.5s ease-in-out infinite" }}/>
    <svg width="56" height="56" viewBox="0 0 100 100" style={{ position: "relative", zIndex: 2, overflow: "visible" }}>
      <defs>
        <radialGradient id="studyoLensCoreGrad2" cx="42%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95"/>
          <stop offset="35%" stopColor="#1e1b4b" stopOpacity="0.9"/>
          <stop offset="70%" stopColor="#0b0b14" stopOpacity="0.98"/>
          <stop offset="100%" stopColor="#020306" stopOpacity="1"/>
        </radialGradient>
      </defs>
      <g style={{ transformOrigin: "50px 50px", animation: "lensDashedRotate 28s linear infinite" }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke={T.gold} strokeWidth="2" strokeDasharray="4 2.5" opacity="0.65"/>
      </g>
      <g style={{ transformOrigin: "50px 50px", animation: "lensBladesAperture 9.5s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}>
        <path d="M 50 10 L 80 40 L 60 50 Z" fill={T.goldL} opacity="0.9"/>
        <path d="M 90 50 L 60 80 L 50 60 Z" fill={T.gold} opacity="0.85"/>
        <path d="M 50 90 L 20 60 L 40 50 Z" fill={T.goldL} opacity="0.9"/>
        <path d="M 10 50 L 40 20 L 50 40 Z" fill={T.gold} opacity="0.85"/>
        <path d="M 22 22 L 50 20 L 45 42 Z" fill={T.goldD} opacity="0.75"/>
        <path d="M 78 22 L 80 50 L 58 45 Z" fill={T.goldD} opacity="0.75"/>
        <path d="M 78 78 L 50 80 L 55 58 Z" fill={T.goldD} opacity="0.75"/>
        <path d="M 22 78 L 20 50 L 42 55 Z" fill={T.goldD} opacity="0.75"/>
      </g>
      <g style={{ transformOrigin: "50px 50px", animation: "lensCenterGitGel 9.5s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}>
        <circle cx="50" cy="50" r="20" fill="url(#studyoLensCoreGrad2)"/>
        <circle cx="50" cy="50" r="19.5" fill="none" stroke={T.gold} strokeWidth="1" opacity="0.5"/>
        <circle cx="44" cy="44" r="5" fill="#FFFFFF" style={{ transformOrigin: "44px 44px", animation: "lensGlintFlash 9.5s ease-in-out infinite" }}/>
        <circle cx="56" cy="56" r="2" fill="#38BDF8" opacity="0.7"/>
      </g>
    </svg>
  </div>
);

export const LoginShell = ({ children }) => (
  <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: "56px 20px 48px",
    background: "radial-gradient(circle at 50% 12%, rgba(212, 175, 55, 0.14) 0%, rgba(18, 18, 24, 0.95) 45%, #070709 100%)" }}>
    <style>{KEYFRAMES}</style>

    {/* Kamera vizörü köşeleri */}
    <div style={corner({ top: 22, left: 22, borderTop: `2px solid ${T.gold}66`, borderLeft: `2px solid ${T.gold}66` })}/>
    <div style={corner({ top: 22, right: 22, borderTop: `2px solid ${T.gold}66`, borderRight: `2px solid ${T.gold}66` })}/>
    <div style={corner({ bottom: 22, left: 22, borderBottom: `2px solid ${T.gold}66`, borderLeft: `2px solid ${T.gold}66` })}/>
    <div style={corner({ bottom: 22, right: 22, borderBottom: `2px solid ${T.gold}66`, borderRight: `2px solid ${T.gold}66` })}/>

    {/* Vizör bilgi çubukları */}
    <div style={{ position: "absolute", top: 26, left: 56, right: 56, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none", opacity: 0.55 }}>
      <div className="hud-line" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, color: T.goldL }}>
        <span style={{ color: "#ff4444", animation: "hudPulse 2s infinite" }}>●</span> RAW • 4K 60P
      </div>
      <div className="hud-line hud-wide" style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, color: T.text3 }}>[ f/1.4 &nbsp; 1/250s &nbsp; ISO 100 ]</div>
    </div>
    <div style={{ position: "absolute", bottom: 26, left: 56, right: 56, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none", opacity: 0.45 }}>
      <div className="hud-line" style={{ fontSize: 9.5, fontFamily: "monospace", letterSpacing: 1.5, color: T.text3 }}>AF-C • 3D TRACKING</div>
      <div className="hud-line hud-wide" style={{ fontSize: 9.5, fontFamily: "monospace", letterSpacing: 1.5, color: T.goldL }}>50mm PRIME F1.4</div>
    </div>

    {/* Stüdyo ışığı */}
    <div style={{ position: "absolute", top: -150, left: "50%", transform: "translateX(-50%)", width: 520, height: 520, borderRadius: "50%",
      background: `radial-gradient(circle, ${T.gold}24 0%, ${T.gold}08 45%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }}/>

    {/* Logo ve başlık */}
    <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginBottom: 26 }}>
      <Lens/>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
        <span style={{ color: "#FFFFFF", letterSpacing: "0.06em", marginRight: "-0.03em" }}>STÜDYO</span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "1.1em", minWidth: "1.1em",
          padding: "0 0.16em", borderRadius: "0.26em", background: "#3B5AF6", color: "#FFFFFF",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)" }}>M</span>
      </div>
      <div style={{ fontSize: 11.5, color: T.text3, marginTop: 8, letterSpacing: "1.2px", fontWeight: 500, textTransform: "uppercase" }}>
        Fotoğrafçılık & Stüdyo İşletim Sistemi
      </div>
    </div>

    {/* Cam kart */}
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
      <div style={{ background: `linear-gradient(160deg, ${T.card} 0%, ${T.bg} 100%)`,
        backdropFilter: "blur(48px) saturate(200%)", WebkitBackdropFilter: "blur(48px) saturate(200%)",
        border: `1px solid ${T.gold}35`, borderRadius: 28, padding: "26px 22px",
        boxShadow: `0 32px 80px -10px rgba(0,0,0,0.95), 0 0 35px ${T.gold}12, inset 0 1px 1px rgba(255,255,255,0.2)` }}>
        {children}
      </div>
    </div>
  </div>
);
