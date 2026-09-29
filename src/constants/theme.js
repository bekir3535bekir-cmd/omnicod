export const DARK_THEME = {
  bg:"#070709", surface:"rgba(14, 14, 18, 0.72)", card:"rgba(22, 22, 28, 0.65)", card2:"rgba(28, 28, 36, 0.55)", card3:"rgba(36, 36, 46, 0.5)",
  border:"rgba(255, 255, 255, 0.08)", borderL:"rgba(255, 255, 255, 0.16)",
  gold:"#F5A623", goldL:"#FFD074", goldD:"#C68012", goldGlow:"#F5A62333",
  text:"#F5F5F7", text2:"#A1A1A6", text3:"#6E6E73",
  green:"#30D158", greenL:"#54D976", red:"#FF453A", redL:"#FF6961",
  orange:"#FF9F0A", orangeL:"#FFB340", blue:"#0A84FF", blueL:"#409CFF",
  glass:"linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)",
  glassCard:"linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
  glassHighlight:"rgba(255, 255, 255, 0.20)",
  glassBorder:"rgba(255, 255, 255, 0.09)",
  glassBlur:"blur(28px) saturate(190%)",
  isDark: true,
};

export const LIGHT_THEME = {
  bg:"#F5F2EC", surface:"rgba(255, 255, 255, 0.8)", card:"rgba(255, 255, 255, 0.7)", card2:"#F0EDE6", card3:"#E8E4DC",
  border:"#DDD8CE", borderL:"#C8C3B8",
  gold:"#8A6E2E", goldL:"#7A5E1E", goldD:"#6A4E0E", goldGlow:"#B8953F22",
  text:"#1A1714", text2:"#6B6560", text3:"#A09890",
  green:"#2A7A4E", greenL:"#1E6E40", red:"#B03030", redL:"#C44040",
  orange:"#A06020", orangeL:"#B07030", blue:"#2A5E9A", blueL:"#3A6EAA",
  glass:"linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.5) 100%)",
  glassCard:"rgba(255, 255, 255, 0.8)",
  glassHighlight:"rgba(255, 255, 255, 0.5)",
  glassBorder:"rgba(0, 0, 0, 0.08)",
  glassBlur:"blur(20px)",
  isDark: false,
};

export let T = DARK_THEME;
export const setGlobalTheme = (theme) => {
  T = theme;
};

export const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`;

export const makeCSS = (theme) => `
${FONT}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; background:${theme.bg}; }
body { font-family:-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif; color:${theme.text}; overflow-x:hidden; max-width:430px; margin:0 auto; -webkit-font-smoothing:antialiased; }
input,textarea,select,button { font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif; }
input,textarea,select { outline:none; background:transparent; color:${theme.text}; border:none; width:100%; }
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
