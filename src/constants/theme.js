export const DARK_THEME = {
  bg:"#0A0A0B", surface:"#111113", card:"#16161A", card2:"#1E1E24", card3:"#26262E",
  border:"#2A2A34", borderL:"#38384A",
  gold:"#B8953F", goldL:"#D4AF6A", goldD:"#8A6E2E", goldGlow:"#B8953F33",
  text:"#EDE8DF", text2:"#999084", text3:"#5A554E",
  green:"#3D9E6E", greenL:"#52C48A", red:"#C94444", redL:"#E05A5A",
  orange:"#C4813A", orangeL:"#E09A50", blue:"#3A7EC4", blueL:"#50A0E0",
  isDark: true,
};

export const LIGHT_THEME = {
  bg:"#F5F2EC", surface:"#FFFFFF", card:"#FFFFFF", card2:"#F0EDE6", card3:"#E8E4DC",
  border:"#DDD8CE", borderL:"#C8C3B8",
  gold:"#8A6E2E", goldL:"#7A5E1E", goldD:"#6A4E0E", goldGlow:"#B8953F22",
  text:"#1A1714", text2:"#6B6560", text3:"#A09890",
  green:"#2A7A4E", greenL:"#1E6E40", red:"#B03030", redL:"#C44040",
  orange:"#A06020", orangeL:"#B07030", blue:"#2A5E9A", blueL:"#3A6EAA",
  isDark: false,
};

export let T = DARK_THEME;
export const setGlobalTheme = (theme) => {
  T = theme;
};

export const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');`;

export const makeCSS = (theme) => `
${FONT}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; background:${theme.bg}; }
body { font-family:'Inter',sans-serif; color:${theme.text}; overflow-x:hidden; max-width:430px; margin:0 auto; }
input,textarea,select,button { font-family:'Inter',sans-serif; }
input,textarea,select { outline:none; background:transparent; color:${theme.text}; border:none; width:100%; }
button { cursor:pointer; border:none; background:transparent; }
.num { font-family:'DM Sans',sans-serif; font-variant-numeric:tabular-nums; }
::-webkit-scrollbar { width:2px; height:2px; }
::-webkit-scrollbar-thumb { background:${theme.border}; border-radius:2px; }
.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.slide-up { animation: slideUp 0.35s cubic-bezier(.16,1,.3,1); }
@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
.modal-pop { animation: modalPop 0.25s cubic-bezier(.16,1,.3,1); }
@keyframes modalPop { from{opacity:0;transform:scale(0.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
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
