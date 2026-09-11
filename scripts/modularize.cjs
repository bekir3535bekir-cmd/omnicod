const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/root/Desktop/PhotoApp.jsx';
const fullCode = fs.readFileSync(srcPath, 'utf8');

function extractBetween(startAnchor, endAnchor) {
  const startIdx = typeof startAnchor === 'number' ? startAnchor : fullCode.indexOf(startAnchor);
  if (startIdx === -1) throw new Error('Start anchor not found: ' + startAnchor);
  const endIdx = typeof endAnchor === 'number' ? endAnchor : fullCode.indexOf(endAnchor, startIdx + (typeof startAnchor === 'string' ? startAnchor.length : 0));
  if (endIdx === -1) throw new Error('End anchor not found: ' + endAnchor);
  return fullCode.slice(startIdx, endIdx).trim();
}

console.log('Modularizing PhotoApp into PhotoApp_Dev...');

// 1. constants/theme.js
const themeCode = `export const DARK_THEME = {
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

export const FONT = \`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');\`;

export const makeCSS = (theme) => \`
\${FONT}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; background:\${theme.bg}; }
body { font-family:'Inter',sans-serif; color:\${theme.text}; overflow-x:hidden; max-width:430px; margin:0 auto; }
input,textarea,select,button { font-family:'Inter',sans-serif; }
input,textarea,select { outline:none; background:transparent; color:\${theme.text}; border:none; width:100%; }
button { cursor:pointer; border:none; background:transparent; }
.num { font-family:'DM Sans',sans-serif; font-variant-numeric:tabular-nums; }
::-webkit-scrollbar { width:2px; height:2px; }
::-webkit-scrollbar-thumb { background:\${theme.border}; border-radius:2px; }
.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.slide-up { animation: slideUp 0.35s cubic-bezier(.16,1,.3,1); }
@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
\`;

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
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/constants/theme.js', themeCode, 'utf8');

// 2. constants/icons.jsx
const iconsExtracted = extractBetween('const ICONS = {', 'const Ic = ({');
const icExtracted = extractBetween('const Ic = ({', '// ─── HELPERS');
const iconsCode = `import React from "react";
import { T } from "./theme";

export ${iconsExtracted}

export ${icExtracted}
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/constants/icons.jsx', iconsCode, 'utf8');

// 3. utils/helpers.js
const helpersExtracted = extractBetween('const fmt    =', 'const STATUS_COLORS =');
const helpersCode = `export ${helpersExtracted}
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/utils/helpers.js', helpersCode, 'utf8');

// 4. constants/templates.js
const msgTemplates = extractBetween('const MSG_TEMPLATES = [', '// ─── BASE COMPONENTS');
const processSteps = extractBetween('const PROCESS_STEPS = [', 'const INIT = {');
const checklist = extractBetween('const CEKIM_CHECKLIST = [', 'const CekimGunuModu =');
const sirket = extractBetween('const SIRKET = {', 'const Muhasebe =');
const authConsts = `export const DEFAULT_ADMIN_PASS    = "geses2024";
export const DEFAULT_PERSONEL_PASS = "personel123";
export const MASTER_CODE           = "GESES@KURTARMA"; // Gizli kurtarma kodu
`;

const templatesCode = `import { uid } from "../utils/helpers";

export ${msgTemplates}

export ${processSteps}

export ${checklist}

export ${sirket}

${authConsts}
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/constants/templates.js', templatesCode, 'utf8');

// 5. constants/initialData.js
const initDataExtracted = extractBetween('const INIT = {', 'const Dashboard =');
const initDataCode = `export ${initDataExtracted}
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/constants/initialData.js', initDataCode, 'utf8');

// 6. services/storage.js
const storageCode = `import { DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS } from "../constants/templates";

const PREFIX = import.meta.env.VITE_DEV_MODE === "false" ? "geses_" : "geses_dev_";

export const getPass = (key, def) => {
  try { return localStorage.getItem(PREFIX + key) || def; } catch(e) { return def; }
};

export const setPass = (key, val) => {
  try { localStorage.setItem(PREFIX + key, val); } catch(e) {}
};

export const getSession = () => {
  try {
    const r = localStorage.getItem(PREFIX + "role");
    const c = localStorage.getItem(PREFIX + "client_id");
    return r ? { role: r, clientId: c || null } : null;
  } catch(e) { return null; }
};

export const saveSession = (role, clientId) => {
  try {
    localStorage.setItem(PREFIX + "role", role);
    if(clientId) localStorage.setItem(PREFIX + "client_id", clientId);
    else localStorage.removeItem(PREFIX + "client_id");
  } catch(e) {}
};

export const clearSession = () => {
  try {
    localStorage.removeItem(PREFIX + "role");
    localStorage.removeItem(PREFIX + "client_id");
  } catch(e) {}
};
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/services/storage.js', storageCode, 'utf8');

// 7. services/supabase.js
const fromDBExtracted = extractBetween('const fromDB = {', '// App → DB formatına çevir');
const toDBExtracted = extractBetween('const toDB = {', '// ════════════════════════════════════════════════');

const supabaseCode = `import { createClient } from "@supabase/supabase-js";

export const IS_DEV = import.meta.env.VITE_DEV_MODE !== "false";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jlnodwzhljbzevasdhtd.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_3xYfYyHGjy3Fx6MqDWFPpw_Wgt1KHFm";

export const supabase = (SUPABASE_URL && SUPABASE_KEY && !IS_DEV) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export const sb = {
  get: async (table) => {
    if (IS_DEV) {
      console.log(\`[DEV SAFE] sb.get(\${table}) - isolated fallback\`);
      return null;
    }
    try {
      const r = await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}?select=*\`, {
        headers: { apikey: SUPABASE_KEY, Authorization: \`Bearer \${SUPABASE_KEY}\` }
      });
      return r.ok ? await r.json() : null;
    } catch(e) {
      console.warn(\`sb.get \${table} error:\`, e);
      return null;
    }
  },
  insert: async (table, data) => {
    if (IS_DEV) {
      console.log(\`[DEV SAFE PROTECTED] insert into \${table}\`, data);
      return;
    }
    try {
      await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}\`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: \`Bearer \${SUPABASE_KEY}\`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(data)
      });
    } catch(e) { console.warn(\`sb.insert \${table} error:\`, e); }
  },
  delete: async (table, id) => {
    if (IS_DEV) {
      console.log(\`[DEV SAFE PROTECTED] delete from \${table} id=\${id}\`);
      return;
    }
    try {
      await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}?id=eq.\${id}\`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: \`Bearer \${SUPABASE_KEY}\` }
      });
    } catch(e) { console.warn(\`sb.delete \${table} error:\`, e); }
  },
  update: async (table, id, data) => {
    if (IS_DEV) {
      console.log(\`[DEV SAFE PROTECTED] update \${table} id=\${id}\`, data);
      return;
    }
    try {
      await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}?id=eq.\${id}\`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: \`Bearer \${SUPABASE_KEY}\`, "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch(e) { console.warn(\`sb.update \${table} error:\`, e); }
  }
};

export ${toDBExtracted}

export ${fromDBExtracted}
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/services/supabase.js', supabaseCode, 'utf8');

// .env
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/.env', 'VITE_DEV_MODE=true\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n', 'utf8');

// 8. Common UI Components
const commonCode = extractBetween('// ─── BASE COMPONENTS', '// ─── LOGO');
const logoCode = extractBetween('// ─── LOGO', 'const PROCESS_STEPS = [');

const uiComponentsFile = `import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtDate, uid } from "../../utils/helpers";

${commonCode}

${logoCode}

export { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo };
`;
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/common/index.jsx', uiComponentsFile, 'utf8');

// Now let's extract all individual modules
const commonImports = `import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";
`;

// Extract module components
const dashboardBlock = extractBetween('const Dashboard =', 'const Ajanda =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Dashboard.jsx', `${commonImports}\nexport ${dashboardBlock}\n`, 'utf8');

const ajandaBlock = extractBetween('const Ajanda =', 'const Musteriler =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Ajanda.jsx', `${commonImports}\nexport ${ajandaBlock}\n`, 'utf8');

const musterilerBlock = extractBetween('const Musteriler =', 'const SIRKET =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Musteriler.jsx', `${commonImports}\nexport ${musterilerBlock}\n`, 'utf8');

const muhasebeBlock = extractBetween('const Muhasebe =', 'const MoreMenu =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Muhasebe.jsx', `${commonImports}\nexport ${muhasebeBlock}\n`, 'utf8');

const moreMenuBlock = extractBetween('const MoreMenu =', 'const Sablonlar =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/MoreMenu.jsx', `${commonImports}\nexport ${moreMenuBlock}\n`, 'utf8');

const sablonlarBlock = extractBetween('const Sablonlar =', 'const Paketler =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Sablonlar.jsx', `${commonImports}\nexport ${sablonlarBlock}\n`, 'utf8');

const paketlerBlock = extractBetween('const Paketler =', 'const Sozlesmeler =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Paketler.jsx', `${commonImports}\nexport ${paketlerBlock}\n`, 'utf8');

const sozlesmelerBlock = extractBetween('const Sozlesmeler =', 'const Mesajlar =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Sozlesmeler.jsx', `${commonImports}\nexport ${sozlesmelerBlock}\n`, 'utf8');

const mesajlarBlock = extractBetween('const Mesajlar =', 'const Hatirlaticilar =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Mesajlar.jsx', `${commonImports}\nexport ${mesajlarBlock}\n`, 'utf8');

const hatirlaticilarBlock = extractBetween('const Hatirlaticilar =', 'const Takvim =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Hatirlaticilar.jsx', `${commonImports}\nexport ${hatirlaticilarBlock}\n`, 'utf8');

const takvimBlock = extractBetween('const Takvim =', 'const Ekip =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Takvim.jsx', `${commonImports}\nexport ${takvimBlock}\n`, 'utf8');

const ekipBlock = extractBetween('const Ekip =', 'const Galeri =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Ekip.jsx', `${commonImports}\nexport ${ekipBlock}\n`, 'utf8');

const galeriBlock = extractBetween('const Galeri =', 'const Teklif =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Galeri.jsx', `${commonImports}\nexport ${galeriBlock}\n`, 'utf8');

const teklifBlock = extractBetween('const Teklif =', 'const Portal =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Teklif.jsx', `${commonImports}\nexport ${teklifBlock}\n`, 'utf8');

const portalBlock = extractBetween('const Portal =', 'const USD_TRY_RATES =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Portal.jsx', `${commonImports}\nexport ${portalBlock}\n`, 'utf8');

const raporlarBlock = extractBetween('const Raporlar =', 'const SUPABASE_URL =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/Raporlar.jsx', `${commonImports}\nexport ${raporlarBlock}\n`, 'utf8');

const utilitiesBlock = extractBetween('const HizliNot =', 'export default function App');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/AppModals.jsx', `${commonImports}\nexport ${utilitiesBlock}\n`, 'utf8');

// App.jsx
const appBlock = extractBetween('export default function App', fullCode.length);
const appFileContent = `import React, { useState, useEffect, useRef } from "react";
import { T, DARK_THEME, LIGHT_THEME, setGlobalTheme, makeCSS } from "./constants/theme";
import { Ic } from "./constants/icons";
import { fmt, fmtDate, todayStr, uid } from "./utils/helpers";
import { INIT } from "./constants/initialData";
import { sb, fromDB, toDB } from "./services/supabase";
import { getSession, saveSession, clearSession } from "./services/storage";

// Modules
import { Dashboard } from "./components/modules/Dashboard";
import { Ajanda } from "./components/modules/Ajanda";
import { Musteriler } from "./components/modules/Musteriler";
import { Muhasebe } from "./components/modules/Muhasebe";
import { MoreMenu } from "./components/modules/MoreMenu";
import { Sablonlar } from "./components/modules/Sablonlar";
import { Paketler } from "./components/modules/Paketler";
import { Sozlesmeler } from "./components/modules/Sozlesmeler";
import { Mesajlar } from "./components/modules/Mesajlar";
import { Hatirlaticilar } from "./components/modules/Hatirlaticilar";
import { Takvim } from "./components/modules/Takvim";
import { Ekip } from "./components/modules/Ekip";
import { Galeri } from "./components/modules/Galeri";
import { Teklif } from "./components/modules/Teklif";
import { Portal } from "./components/modules/Portal";
import { Raporlar } from "./components/modules/Raporlar";
import { HizliNot, HizliArama, GeceModu, IsAsistani, NotDefteri, MusteriPortali, LoginScreen } from "./components/modules/AppModals";

export default function App${appBlock.slice(appBlock.indexOf('('))}
`;

const updatedAppContent = appFileContent.replace(
  'T = darkMode ? DARK_THEME : LIGHT_THEME;',
  'const currentTheme = darkMode ? DARK_THEME : LIGHT_THEME; setGlobalTheme(currentTheme);'
);

fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/App.jsx', updatedAppContent, 'utf8');

console.log('ALL MODULES EXTRACTED SUCCESSFULLY!');
