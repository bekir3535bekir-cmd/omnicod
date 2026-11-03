// ════════════════════════════════════════════════
// GİRİŞ EKRANI ÇERÇEVESİ — solda stüdyo fotoğrafı (üstünde STÜDYOM logosu), sağda kamera diyaframı + form
// Telefonda ve dar pencerede fotoğraf üstte kapak görseli olur, form altında devam eder.
// ════════════════════════════════════════════════
import React from "react";
// Fotoğraf: Unsplash (ücretsiz lisans). Uygulamaya gömülü; açılışta dışarıya istek gitmez.
import PHOTO from "../../assets/login-photo.webp";
import LOGO from "../../assets/studyom-logo.png";

// Giriş ekranı renkleri (Safir temasıyla aynı)
export const C = {
  bg: "#090D16", field: "#111A2E", line: "rgba(148,163,184,0.20)", lineHover: "rgba(148,163,184,0.45)",
  text: "#F8FAFC", text2: "#94A3B8", text3: "#7C8BA1", accent: "#2563EB", accentL: "#60A5FA", accentD: "#1D4ED8", onAccent: "#FFFFFF",
};

const CSS = `
.ls-root { position: fixed; inset: 0; overflow-y: auto; display: flex; background: ${C.bg}; color: ${C.text}; z-index: 1;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
.ls-root button, .ls-root input { font-family: inherit; }
.ls-photo { flex: 1.1; position: relative; overflow: hidden; margin: 12px 0 12px 12px; border-radius: 16px; background: #111A2E center / cover no-repeat; }
.ls-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%); }
.ls-side { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 48px 28px; }
.ls-form { width: 100%; max-width: 360px; }
@keyframes lsBlades { 0%, 100% { transform: rotate(0deg) scale(1); } 6% { transform: rotate(14deg) scale(1.08); } 12% { transform: rotate(-8deg) scale(0.95); } 18% { transform: rotate(4deg) scale(1.02); } 24% { transform: rotate(0deg) scale(1); } }
@keyframes lsRing { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ls-root * { animation: none !important; } }
.ls-cap { position: absolute; left: 28px; right: 28px; bottom: 28px; z-index: 1; max-width: 420px; }
.ls-brand { position: absolute; top: 22px; left: 22px; z-index: 1; display: flex; align-items: center; gap: 10px; }
/* Telefon: fotoğraf üstte kenardan kenara kısa kapak; marka yalnızca fotoğrafın üstünde, form altında */
@media (max-width: 860px) {
  .ls-root { flex-direction: column; }
  .ls-photo { flex: none; height: 34vh; min-height: 220px; max-height: 300px; margin: 0; border-radius: 0 0 24px 24px; background-position: center 40%; }
  .ls-cap, .ls-head { display: none !important; }
  .ls-brand { top: 18px; left: 20px; }
  .ls-side { justify-content: flex-start; padding: 28px 20px 36px; }
}
`;

// Kamera diyaframı (STÜDYOM simgesi): kanatlar ara sıra açılıp kapanır; parlama yok
const Lens = ({ size = 64 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", border: `1.5px solid ${C.accent}`, background: C.field,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
    <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="lsLensCore" cx="42%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#38BDF8"/><stop offset="40%" stopColor="#1E1B4B"/><stop offset="100%" stopColor="#020306"/>
        </radialGradient>
      </defs>
      <g style={{ transformOrigin: "50px 50px", animation: "lsRing 40s linear infinite" }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke={C.accent} strokeWidth="2" strokeDasharray="4 2.5" opacity="0.6"/>
      </g>
      <g style={{ transformOrigin: "50px 50px", animation: "lsBlades 9s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}>
        <path d="M 50 10 L 80 40 L 60 50 Z" fill={C.accentL}/>
        <path d="M 90 50 L 60 80 L 50 60 Z" fill={C.accent}/>
        <path d="M 50 90 L 20 60 L 40 50 Z" fill={C.accentL}/>
        <path d="M 10 50 L 40 20 L 50 40 Z" fill={C.accent}/>
        <path d="M 22 22 L 50 20 L 45 42 Z" fill={C.accentD}/>
        <path d="M 78 22 L 80 50 L 58 45 Z" fill={C.accentD}/>
        <path d="M 78 78 L 50 80 L 55 58 Z" fill={C.accentD}/>
        <path d="M 22 78 L 20 50 L 42 55 Z" fill={C.accentD}/>
      </g>
      <circle cx="50" cy="50" r="20" fill="url(#lsLensCore)"/>
      <circle cx="44" cy="44" r="4.5" fill="#FFFFFF" opacity="0.9"/>
    </svg>
  </div>
);

// STÜDYO[M] yazı logosu
export const Wordmark = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.15, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: size, fontWeight: 800, lineHeight: 1, color: C.text, letterSpacing: "0.04em" }}>
    <span>STÜDYO</span>
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "1.1em", minWidth: "1.1em",
      padding: "0 0.14em", borderRadius: "0.22em", background: "#3B5AF6", color: "#FFFFFF" }}>M</span>
  </div>
);

export const LoginShell = ({ children }) => (
  <div className="ls-root">
    <style>{CSS}</style>

    <div className="ls-photo" style={{ backgroundImage: `url(${PHOTO})` }}>
      {/* STÜDYOM logosu (uygulama ikonu) */}
      <div className="ls-brand">
        <img src={LOGO} alt="" width={40} height={40} style={{ borderRadius: 10, display: "block" }}/>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", color: "#FFFFFF",
          textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>STÜDYOM</span>
      </div>
      <div className="ls-cap">
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", lineHeight: 1.35 }}>
          Siz çekime odaklanın.
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.55 }}>
          Randevular, sözleşmeler, ödemeler ve müşteri galerileri tek yerde.
        </div>
      </div>
    </div>

    <div className="ls-side">
      <div className="ls-form">
        <div className="ls-head" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Lens/>
          <div>
            <Wordmark/>
            <div style={{ fontSize: 12.5, color: C.text3, marginTop: 7 }}>Fotoğrafçılık ve stüdyo yönetimi</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  </div>
);
