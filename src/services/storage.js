import { DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS } from "../constants/templates";

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

// ─── E-POSTA DOĞRULAMALI ÜYELİK VE AUTH SİSTEMİ ─────────────────────
export const getAuthUser = () => {
  try {
    const u = localStorage.getItem(PREFIX + "auth_user");
    return u ? JSON.parse(u) : null;
  } catch(e) { return null; }
};

export const saveAuthUser = (user) => {
  try {
    localStorage.setItem(PREFIX + "auth_user", JSON.stringify(user));
  } catch(e) {}
};

export const generateVerificationCode = (email) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const data = {
    email: (email || "").trim().toLowerCase(),
    code,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 dakika geçerli
  };
  try {
    localStorage.setItem(PREFIX + "pending_verification", JSON.stringify(data));
  } catch(e) {}
  return code;
};

export const getPendingVerification = () => {
  try {
    const raw = localStorage.getItem(PREFIX + "pending_verification");
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
};

export const verifyEmailCode = (email, inputCode) => {
  try {
    const pending = getPendingVerification();
    if (!pending) return { success: false, message: "Onay kodu bulunamadı. Lütfen tekrar kod talep edin." };
    if (pending.email !== (email || "").trim().toLowerCase()) {
      return { success: false, message: "E-posta adresi eşleşmiyor." };
    }
    if (Date.now() > pending.expiresAt) {
      return { success: false, message: "Onay kodunun süresi dolmuş. Lütfen yeni kod isteyin." };
    }
    if (pending.code !== String(inputCode).trim()) {
      return { success: false, message: "Hatalı onay kodu! Lütfen tekrar kontrol edin." };
    }
    
    // Doğrulandı olarak kaydet
    const user = getAuthUser();
    if (user && user.email.toLowerCase() === pending.email) {
      user.verified = true;
      saveAuthUser(user);
    }
    localStorage.removeItem(PREFIX + "pending_verification");
    return { success: true, message: "E-posta başarıyla onaylandı!" };
  } catch(e) {
    return { success: false, message: "Doğrulama işlemi başarısız oldu." };
  }
};

