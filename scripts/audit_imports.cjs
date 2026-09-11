const fs = require('fs');
const path = require('path');

const modulesDir = 'C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules';
const files = fs.readdirSync(modulesDir);

const checkList = [
  'isComplete', 'initProcess', 'fmt', 'fmtShort', 'fmtDate', 'fmtDateSh', 
  'todayStr', 'daysLeft', 'MN', 'monthOf', 'yearOf', 'uid', 'NUM_FONT', 
  'makeCSS', 'T', 'DARK_THEME', 'LIGHT_THEME', 'setGlobalTheme', 'sb', 
  'fromDB', 'toDB', 'getPass', 'setPass', 'getSession', 'saveSession', 
  'clearSession', 'MSG_TEMPLATES', 'PROCESS_STEPS', 'CEKIM_CHECKLIST', 
  'SIRKET', 'DEFAULT_ADMIN_PASS', 'DEFAULT_PERSONEL_PASS', 'MASTER_CODE',
  'STATUS_COLORS', 'PKG_COLORS', 'USD_TRY_RATES'
];

let foundIssues = 0;

files.forEach(f => {
  if (!f.endsWith('.jsx')) return;
  const content = fs.readFileSync(path.join(modulesDir, f), 'utf8');
  checkList.forEach(ident => {
    const used = new RegExp('\\b' + ident + '\\b').test(content);
    const declaredOrImported = new RegExp('(import.*\\b' + ident + '\\b|const\\s+' + ident + '\\b|let\\s+' + ident + '\\b|function\\s+' + ident + '\\b|export\\s+const\\s+' + ident + '\\b)').test(content);
    if (used && !declaredOrImported) {
      console.log(`[ISSUE] File ${f} uses ${ident} but it is NOT declared or imported!`);
      foundIssues++;
    }
  });
});

console.log(`Audit complete. Found ${foundIssues} issues.`);
