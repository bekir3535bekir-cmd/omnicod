const fs = require('fs');
const path = require('path');

// 1. Fix templates.js
let templates = fs.readFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/constants/templates.js', 'utf8');
templates = templates.replace('const initProcess =', 'export const initProcess =');
templates = templates.replace('const isComplete =', 'export const isComplete =');
fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/constants/templates.js', templates, 'utf8');

// 2. Fix storage.js
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
    return localStorage.getItem(PREFIX + "role") || null;
  } catch(e) { return null; }
};

export const getClientId = () => {
  try {
    return localStorage.getItem(PREFIX + "client_id") || null;
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

// 3. Fix imports in all modules
const modulesDir = 'C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules';
const files = fs.readdirSync(modulesDir);

files.forEach(file => {
  if (!file.endsWith('.jsx')) return;
  const filePath = path.join(modulesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Ensure initProcess and isComplete are imported if used
  if (content.includes('initProcess') && !content.includes('import {') || (content.includes('initProcess') && !content.includes('initProcess,') && !content.includes('initProcess }'))) {
    content = content.replace(/from "\.\.\/\.\.\/constants\/templates";/, ', initProcess, isComplete } from "../../constants/templates";');
    content = content.replace(/import {([^}]+)} from "\.\.\/\.\.\/constants\/templates";/, (match, p1) => {
      const items = p1.split(',').map(s=>s.trim()).filter(Boolean);
      if (!items.includes('initProcess')) items.push('initProcess');
      if (!items.includes('isComplete')) items.push('isComplete');
      return `import { ${items.join(', ')} } from "../../constants/templates";`;
    });
  }

  if (content.includes('isComplete') && !content.includes('isComplete,') && !content.includes('isComplete }') && !content.includes('export const isComplete')) {
    content = content.replace(/import {([^}]+)} from "\.\.\/\.\.\/constants\/templates";/, (match, p1) => {
      const items = p1.split(',').map(s=>s.trim()).filter(Boolean);
      if (!items.includes('isComplete')) items.push('isComplete');
      return `import { ${items.join(', ')} } from "../../constants/templates";`;
    });
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

// 4. Update App.jsx to properly handle initial data and session
let appContent = fs.readFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/App.jsx', 'utf8');

// Ensure getClientId is imported
if (!appContent.includes('getClientId')) {
  appContent = appContent.replace('getSession,', 'getSession, getClientId,');
}

// In App.jsx, ensure musteriClientId is initialized from storage if musteri
appContent = appContent.replace(
  'const [musteriClientId, setMusteriClientId] = useState(null);',
  'const [musteriClientId, setMusteriClientId] = useState(() => getClientId());'
);

// In load(), if dev mode or null data, keep initial/cached data
appContent = appContent.replace(
  'setData({\n          clients:        loadedClients,',
  `// Dev mode fallback
        const useInit = !clients && (!loadedClients || loadedClients.length === 0);
        setData({
          clients:        useInit ? INIT.clients : loadedClients,`
);

fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/App.jsx', appContent, 'utf8');

console.log('Applied all fixes!');
