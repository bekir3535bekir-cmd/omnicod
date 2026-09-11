const fs = require('fs');
const path = require('path');

const modulesDir = 'C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules';
const files = fs.readdirSync(modulesDir);

files.forEach(file => {
  if (!file.endsWith('.jsx')) return;
  const filePath = path.join(modulesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // If file declares CEKIM_CHECKLIST, remove it from templates import
  if (content.includes('const CEKIM_CHECKLIST =') || content.includes('let CEKIM_CHECKLIST =')) {
    content = content.replace(/CEKIM_CHECKLIST,\s*/g, '');
  }

  // If file declares MSG_TEMPLATES, remove it from templates import
  if (content.includes('const MSG_TEMPLATES =') || content.includes('let MSG_TEMPLATES =')) {
    content = content.replace(/MSG_TEMPLATES,\s*/g, '');
  }

  // If file declares PROCESS_STEPS, remove it from templates import
  if (content.includes('const PROCESS_STEPS =') || content.includes('let PROCESS_STEPS =')) {
    content = content.replace(/PROCESS_STEPS,\s*/g, '');
  }

  // If file declares SIRKET, remove it from templates import
  if (content.includes('const SIRKET =') || content.includes('let SIRKET =')) {
    content = content.replace(/SIRKET,\s*/g, '');
  }

  // If file declares USD_TRY_RATES, remove it from theme import
  if (content.includes('const USD_TRY_RATES =') || content.includes('let USD_TRY_RATES =')) {
    content = content.replace(/USD_TRY_RATES,\s*/g, '');
  }

  // If file declares DEFAULT_ADMIN_PASS, remove it
  if (content.includes('const DEFAULT_ADMIN_PASS =')) {
    content = content.replace(/DEFAULT_ADMIN_PASS,\s*/g, '');
  }
  if (content.includes('const DEFAULT_PERSONEL_PASS =')) {
    content = content.replace(/DEFAULT_PERSONEL_PASS,\s*/g, '');
  }
  if (content.includes('const MASTER_CODE =')) {
    content = content.replace(/MASTER_CODE,\s*/g, '');
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Cleaned duplicate imports across all modules.');
