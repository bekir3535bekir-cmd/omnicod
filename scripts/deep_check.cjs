const fs = require('fs');
const path = require('path');

function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, allFiles);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      allFiles.push(fullPath);
    }
  });
  return allFiles;
}

const allSrcFiles = getAllFiles('C:/Users/root/Desktop/PhotoApp_Dev/src');

// List of all known identifiers in the project
const allKnown = {
  // common
  Card: "from common",
  Pill: "from common",
  GoldButton: "from common",
  Field: "from common",
  DatePicker: "from common",
  BottomSheet: "from common",
  EmptyState: "from common",
  PageHeader: "from common",
  Divider: "from common",
  Logo: "from common",
  
  // icons
  ICONS: "from icons",
  Ic: "from icons",
  
  // theme
  DARK_THEME: "from theme",
  LIGHT_THEME: "from theme",
  T: "from theme",
  setGlobalTheme: "from theme",
  FONT: "from theme",
  makeCSS: "from theme",
  STATUS_COLORS: "from theme",
  PKG_COLORS: "from theme",
  USD_TRY_RATES: "from theme",
  
  // helpers
  fmt: "from helpers",
  fmtShort: "from helpers",
  fmtDate: "from helpers",
  fmtDateSh: "from helpers",
  todayStr: "from helpers",
  daysLeft: "from helpers",
  MN: "from helpers",
  monthOf: "from helpers",
  yearOf: "from helpers",
  uid: "from helpers",
  NUM_FONT: "from helpers",
  
  // templates
  MSG_TEMPLATES: "from templates",
  PROCESS_STEPS: "from templates",
  initProcess: "from templates",
  isComplete: "from templates",
  CEKIM_CHECKLIST: "from templates",
  SIRKET: "from templates",
  DEFAULT_ADMIN_PASS: "from templates",
  DEFAULT_PERSONEL_PASS: "from templates",
  MASTER_CODE: "from templates",
  
  // storage
  getPass: "from storage",
  setPass: "from storage",
  getSession: "from storage",
  getClientId: "from storage",
  saveSession: "from storage",
  clearSession: "from storage",

  // plan
  PLANS: "from plan",
  getPlan: "from plan",
  setPlan: "from plan",
  getTrialInfo: "from plan",
  resetTrial: "from plan",
  expireTrial: "from plan",
  activatePro: "from plan",
  deactivatePro: "from plan",
  getUsageSummary: "from plan",
  getPlanExpiry: "from plan",
  canAddAppointment: "from plan",
  canAddClient: "from plan",
  canAddTeamMember: "from plan",
  canAddReminder: "from plan",
  canAddNote: "from plan",
  isProFeature: "from plan",
  ProGate: "from ProGate",
  UsageBadge: "from ProGate",
  PlanBadge: "from ProGate",
  ProBadge: "from ProGate",
  PlanYonetimi: "from PlanYonetimi",
  
  // supabase
  sb: "from supabase",
  fromDB: "from supabase",
  toDB: "from supabase",
  supabase: "from supabase",
  SUPABASE_URL: "from supabase",
  SUPABASE_KEY: "from supabase",
  IS_DEV: "from supabase",
  
  // initialData
  INIT: "from initialData",
};

let missingCount = 0;

allSrcFiles.forEach(filePath => {
  const relPath = path.relative('C:/Users/root/Desktop/PhotoApp_Dev/src', filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Find all tokens in content that match words
  const tokens = new Set(content.match(/\b[A-Za-z0-9_$]+\b/g) || []);

  Object.keys(allKnown).forEach(ident => {
    if (tokens.has(ident)) {
      // Check if declared in this file or imported
      const isDecl = new RegExp(`\\b(const|let|var|function|class|export const|export let|export function|export default function)\\s+${ident}\\b`).test(content);
      const isImport = new RegExp(`\\bimport\\s+.*\\b${ident}\\b.*from`).test(content);
      const isParamOrProp = new RegExp(`(\\(.*\\b${ident}\\b.*\\)|\\b${ident}:)`).test(content);
      
      // If it's used in JSX like <Logo or <Ic or called like fmt() or referenced
      const isUsed = new RegExp(`(<${ident}\\b|\\b${ident}\\(|\\b${ident}\\.|\\b${ident}\\[|\\b${ident},|\\b${ident}\\s*===|\\b${ident}\\s*!==|\\b${ident}\\s*\\+|\\b${ident}\\s*\\?|\\b${ident}\\s*:)`).test(content);

      if (isUsed && !isDecl && !isImport) {
        console.log(`[MISSING IMPORT] In ${relPath}: identifier '${ident}' is used but NOT imported or declared!`);
        missingCount++;
      }
    }
  });
});

console.log(`Deep check complete. Total missing: ${missingCount}`);
