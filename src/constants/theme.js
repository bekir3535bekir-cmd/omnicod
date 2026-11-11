// Safir: uygulamanın kendi koyu lacivert paleti; düz yüzeyler (parlama, geçiş ve buzlu cam yok)
export const SAPPHIRE_THEME = {
  id: "sapphire",
  name: "Safir",
  bg: "#090D16",
  surface: "#0D1424",
  card: "#111A2E",
  card2: "#172238",
  card3: "#1F2C47",
  border: "rgba(148, 163, 184, 0.14)",
  borderL: "rgba(148, 163, 184, 0.28)",
  gold: "#2563EB",
  goldL: "#60A5FA",
  goldD: "#1D4ED8",
  goldGlow: "rgba(0, 0, 0, 0)",
  onAccent: "#FFFFFF",
  text: "#F8FAFC",
  text2: "#94A3B8",
  text3: "#7C8BA1",
  green: "#10B981",
  greenL: "#34D399",
  red: "#F43F5E",
  redL: "#FB7185",
  orange: "#FB923C",
  orangeL: "#FDBA74",
  blue: "#06B6D4",
  blueL: "#67E8F9",
  glass: "#111A2E",
  glassCard: "#111A2E",
  glassBorder: "rgba(148, 163, 184, 0.14)",
  glassHighlight: "rgba(255, 255, 255, 0)",
  glassBlur: "none",
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  flat: true,
  radius: 14,
  btnRadius: 10,
  isDark: true,
};

// Nordic: uygulamanın kendi açık paleti (beyaz ve mavi); düz yüzeyler
export const NORDIC_LIGHT = {
  id: "nordic",
  name: "Nordic",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  card2: "#F1F5F9",
  card3: "#E2E8F0",
  border: "rgba(15, 23, 42, 0.08)",
  borderL: "rgba(15, 23, 42, 0.16)",
  gold: "#2563EB",
  goldL: "#2563EB",
  goldD: "#1D4ED8",
  goldGlow: "rgba(0, 0, 0, 0)",
  onAccent: "#FFFFFF",
  text: "#0F172A",
  text2: "#475569",
  text3: "#64748B",
  green: "#047857",
  greenL: "#047857",
  red: "#BE123C",
  redL: "#BE123C",
  orange: "#C2410C",
  orangeL: "#C2410C",
  blue: "#0369A1",
  blueL: "#0369A1",
  glass: "#FFFFFF",
  glassCard: "#FFFFFF",
  glassBorder: "rgba(15, 23, 42, 0.08)",
  cardShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  glassHighlight: "rgba(255, 255, 255, 0)",
  glassBlur: "none",
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  flat: true,
  radius: 14,
  btnRadius: 10,
  isDark: false,
};

export const DARK_THEME = SAPPHIRE_THEME;
export const LIGHT_THEME = NORDIC_LIGHT;

export const THEME_PALETTES = {
  sapphire: SAPPHIRE_THEME,
  nordic: NORDIC_LIGHT,
};
// Denenip kaldırılan temalardan geçiş: açık olanlar Nordic'e, koyu olanlar Safir'e
export const migrateThemeKey = (key) => THEME_PALETTES[key] ? key : (["bento", "grafit-acik"].includes(key) ? "nordic" : "sapphire");

export let T = SAPPHIRE_THEME;
export const setGlobalTheme = (theme) => {
  T = theme;
};

// Yazı tipleri src/fonts.css içinden yüklenir (Google'a istek gitmez)
export const FONT = ``;

export const makeCSS = (theme) => `
${FONT}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; background:${theme.bg}; }
html { color-scheme: ${theme.isDark ? "dark" : "light"}; }
body { font-family:${theme.font || `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Inter", sans-serif`}; color:${theme.text}; overflow-x:hidden; max-width:430px; margin:0 auto; -webkit-font-smoothing:antialiased; }
input,textarea,select,button { font-family:${theme.font || `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Inter", sans-serif`}; }
input,textarea,select { outline:none; background:transparent; color:${theme.text}; border:none; width:100%; color-scheme: ${theme.isDark ? "dark" : "light"}; }
select option { background-color: ${theme.isDark ? "#111827" : "#FFFFFF"} !important; color: ${theme.text} !important; padding: 10px 14px; }
button { cursor:pointer; border:none; background:transparent; }
.num { font-family:'DM Sans',-apple-system,sans-serif; font-variant-numeric:tabular-nums; }
@media (max-width: 860px) { input, textarea, select { font-size: 16px !important; } }
/* HIG: dokunma alanı en az 44x44 — görünüş değişmez, yalnızca dokunulabilir alan genişler.
   Yalnızca içinde başka düğme olmayan <button>'larda (iç düğmelerin üstünü kapatmasın diye) */
@media (max-width: 860px) {
  button:not(:has(button)) { position: relative; }
  button:not(:has(button))::after { content: ""; position: absolute; top: 50%; left: 50%; width: max(100%, 44px); height: max(100%, 44px); transform: translate(-50%, -50%); }
}
@media (max-width: 860px) {
  .bs-wrap { align-items: flex-end !important; padding: 0 !important; }
  .bs-box { max-width: none !important; border-radius: 20px 20px 0 0 !important; max-height: 92vh !important; padding-bottom: env(safe-area-inset-bottom); animation: slideUp 0.35s cubic-bezier(.16,1,.3,1) !important; }
  .bs-grab { display: flex !important; }
}
${theme.flat ? `[style*="Playfair"] { font-family: inherit !important; letter-spacing: -0.02em; }
[style*="font-size: 8px"], [style*="font-size: 8.5px"], [style*="font-size: 9px"], [style*="font-size: 9.5px"],
[style*="font-size: 10px"], [style*="font-size: 10.5px"], [style*="font-size: 11px"], [style*="font-size: 11.5px"] { font-size: 12px !important; }
:focus-visible { outline: 2px solid ${theme.text} !important; outline-offset: 2px; border-radius: 6px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }` : ""}
::-webkit-scrollbar { width:2px; height:2px; }
::-webkit-scrollbar-thumb { background:${theme.border}; border-radius:2px; }
.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.slide-up { animation: slideUp 0.35s cubic-bezier(.16,1,.3,1); }
@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
.modal-pop { animation: modalPop 0.25s cubic-bezier(.16,1,.3,1); }
@keyframes modalPop { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
.liquid-glass {
  background: ${theme.glassCard || 'rgba(22, 22, 28, 0.65)'};
  backdrop-filter: ${theme.glassBlur || 'blur(28px) saturate(190%)'};
  -webkit-backdrop-filter: ${theme.glassBlur || 'blur(28px) saturate(190%)'};
  border: 1px solid ${theme.border};
  box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.16);
}
.liquid-pill {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
`;


export const STATUS_COLORS = {
  "onaylı": DARK_THEME.green, "tamamlandı": DARK_THEME.text3, "iptal": DARK_THEME.red, "bekliyor": DARK_THEME.orange,
  "aktif": DARK_THEME.green, "pasif": DARK_THEME.text3, "arşiv": DARK_THEME.text3,
  "imzalı": DARK_THEME.green, "taslak": DARK_THEME.orange, "iptal edildi": DARK_THEME.red,
};

export const PKG_COLORS = { "Bronz Paket":"#C4893A","Silver Paket":"#8A9BB0","Gold Paket":"#B8953F" };

export const USD_TRY_RATES = {
  "2023": 23.8,
  "2024": 32.5,
  "2025": 38.0,
  "2026": 44.0,
};
