export const SAPPHIRE_THEME = {
  id: "sapphire",
  name: "Safir & Titanyum (Mavi)",
  bg: "#090D16",
  surface: "rgba(15, 23, 42, 0.78)",
  card: "rgba(22, 33, 56, 0.65)",
  card2: "rgba(30, 41, 69, 0.6)",
  card3: "rgba(42, 58, 96, 0.5)",
  border: "rgba(148, 163, 184, 0.16)",
  borderL: "rgba(148, 163, 184, 0.3)",
  gold: "#3B82F6",
  goldL: "#60A5FA",
  goldD: "#1D4ED8",
  goldGlow: "rgba(59, 130, 246, 0.35)",
  text: "#F8FAFC",
  text2: "#94A3B8",
  text3: "#64748B",
  green: "#10B981",
  greenL: "#34D399",
  red: "#F43F5E",
  redL: "#FB7185",
  orange: "#FB923C",
  orangeL: "#FDBA74",
  blue: "#06B6D4",
  blueL: "#67E8F9",
  glass: "linear-gradient(135deg, rgba(59, 130, 246, 0.09) 0%, rgba(255, 255, 255, 0.02) 100%)",
  glassCard: "linear-gradient(145deg, rgba(22, 33, 56, 0.75) 0%, rgba(15, 23, 42, 0.8) 100%)",
  glassHighlight: "rgba(255, 255, 255, 0.22)",
  glassBorder: "rgba(148, 163, 184, 0.18)",
  glassBlur: "blur(28px) saturate(190%)",
  isDark: true,
};

export const EMERALD_THEME = {
  id: "emerald",
  name: "Zümrüt & Grafit (Yeşil)",
  bg: "#06100D",
  surface: "rgba(6, 30, 24, 0.78)",
  card: "rgba(12, 45, 36, 0.65)",
  card2: "rgba(18, 58, 46, 0.6)",
  card3: "rgba(26, 77, 62, 0.5)",
  border: "rgba(52, 211, 153, 0.16)",
  borderL: "rgba(52, 211, 153, 0.3)",
  gold: "#10B981",
  goldL: "#34D399",
  goldD: "#047857",
  goldGlow: "rgba(16, 185, 129, 0.35)",
  text: "#F0FDF4",
  text2: "#86EFAC",
  text3: "#4ADE80",
  green: "#10B981",
  greenL: "#34D399",
  red: "#F43F5E",
  redL: "#FB7185",
  orange: "#FB923C",
  orangeL: "#FDBA74",
  blue: "#38BDF8",
  blueL: "#7DD3FC",
  glass: "linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(255, 255, 255, 0.02) 100%)",
  glassCard: "linear-gradient(145deg, rgba(12, 45, 36, 0.75) 0%, rgba(6, 30, 24, 0.8) 100%)",
  glassHighlight: "rgba(255, 255, 255, 0.22)",
  glassBorder: "rgba(52, 211, 153, 0.18)",
  glassBlur: "blur(28px) saturate(190%)",
  isDark: true,
};

export const NORDIC_LIGHT = {
  id: "nordic",
  name: "Nordic Ferah Aydınlık (Beyaz & Mavi)",
  bg: "#F8FAFC",
  surface: "rgba(255, 255, 255, 0.94)",
  card: "rgba(255, 255, 255, 0.88)",
  card2: "#F1F5F9",
  card3: "#E2E8F0",
  border: "rgba(203, 213, 225, 0.85)",
  borderL: "rgba(148, 163, 184, 0.45)",
  gold: "#2563EB",
  goldL: "#3B82F6",
  goldD: "#1D4ED8",
  goldGlow: "rgba(37, 99, 235, 0.2)",
  text: "#0F172A",
  text2: "#475569",
  text3: "#94A3B8",
  green: "#059669",
  greenL: "#10B981",
  red: "#E11D48",
  redL: "#F43F5E",
  orange: "#EA580C",
  orangeL: "#FB923C",
  blue: "#0284C7",
  blueL: "#38BDF8",
  glass: "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(241, 245, 249, 0.8) 100%)",
  glassCard: "rgba(255, 255, 255, 0.92)",
  glassHighlight: "rgba(255, 255, 255, 0.8)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  glassBlur: "blur(20px)",
  isDark: false,
};

export const DARK_THEME = SAPPHIRE_THEME;
export const LIGHT_THEME = NORDIC_LIGHT;

export const THEME_PALETTES = {
  sapphire: SAPPHIRE_THEME,
  emerald: EMERALD_THEME,
  nordic: NORDIC_LIGHT,
};

export let T = SAPPHIRE_THEME;
export const setGlobalTheme = (theme) => {
  T = theme;
};

export const FONT = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');`;

export const makeCSS = (theme) => `
${FONT}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; background:${theme.bg}; }
body { font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Inter", sans-serif; color:${theme.text}; overflow-x:hidden; max-width:430px; margin:0 auto; -webkit-font-smoothing:antialiased; }
input,textarea,select,button { font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Inter", sans-serif; }
input,textarea,select { outline:none; background:transparent; color:${theme.text}; border:none; width:100%; color-scheme: ${theme.isDark ? "dark" : "light"}; }
select option { background-color: ${theme.isDark ? "#111827" : "#FFFFFF"} !important; color: ${theme.text} !important; padding: 10px 14px; }
button { cursor:pointer; border:none; background:transparent; }
.num { font-family:'DM Sans',-apple-system,sans-serif; font-variant-numeric:tabular-nums; }
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
