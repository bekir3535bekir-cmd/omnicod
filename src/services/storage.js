import { hashSecret, isHashed, matchSecret } from "../utils/secret";
import { SIRKET } from "../constants/templates";

const PREFIX = import.meta.env.VITE_DEV_MODE === "false" ? "geses_" : "geses_dev_";

// Not: Cihazda artık yalnızca şifre özeti (sha256) saklanır.
export const getPass = (key, def) => {
  try { return localStorage.getItem(PREFIX + key) || def; } catch(e) { return def; }
};

export const setPass = (key, val) => {
  try { localStorage.setItem(PREFIX + key, hashSecret(val)); } catch(e) {}
};

// Şifre doğrulama: kullanıcı kendi şifresini belirlediyse yalnızca o geçerlidir,
// belirlemediyse varsayılan şifre özetleri kabul edilir.
// Eski sürümden kalan düz metin şifre eşleşirse otomatik olarak özete dönüştürülür.
export const verifyPass = (key, input, defaultHashes = []) => {
  if (!input) return false;
  let stored = null;
  try { stored = localStorage.getItem(PREFIX + key); } catch(e) {}
  if (stored) {
    const ok = matchSecret(input, stored);
    if (ok && !isHashed(stored)) setPass(key, input);
    return ok;
  }
  return defaultHashes.includes(hashSecret(input));
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

// Girişi yapan personelin ekip kaydı (bildirimler buna göre gösterilir)
export const getStaffId = () => {
  try { return localStorage.getItem(PREFIX + "staff_id") || null; } catch(e) { return null; }
};

export const saveSession = (role, clientId, staffId) => {
  try {
    localStorage.setItem(PREFIX + "role", role);
    if(clientId) localStorage.setItem(PREFIX + "client_id", clientId);
    else localStorage.removeItem(PREFIX + "client_id");
    if(staffId) localStorage.setItem(PREFIX + "staff_id", staffId);
    else localStorage.removeItem(PREFIX + "staff_id");
  } catch(e) {}
};

export const clearSession = () => {
  try {
    localStorage.removeItem(PREFIX + "role");
    localStorage.removeItem(PREFIX + "client_id");
    localStorage.removeItem(PREFIX + "staff_id");
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
    const safe = user && user.password && !isHashed(user.password)
      ? { ...user, password: hashSecret(user.password) }
      : user;
    localStorage.setItem(PREFIX + "auth_user", JSON.stringify(safe));
  } catch(e) {}
};

// Kayıtlı stüdyo sahibinin şifresini doğrular (eski düz metin kayıtları da yükseltir)
export const verifyAuthUserPass = (input) => {
  const user = getAuthUser();
  if (!user || !matchSecret(input, user.password)) return false;
  if (!isHashed(user.password)) saveAuthUser(user);
  return true;
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

// ─── STÜDYO PROFİL & KARTVİZİT BİLGİLERİ ─────────────────────────────
export const getStudioProfile = () => {
  try {
    const raw = localStorage.getItem(PREFIX + "studio_profile");
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  const auth = getAuthUser();
  // Kayıtlı (yeni) bir stüdyo varsa varsayılan firmanın iletişim bilgileri gösterilmez
  if (auth) return {
    name: auth.name || "",
    studio: auth.studioName || auth.studio || "",
    phone: auth.phone || "",
    email: auth.email || "",
    address: auth.address || "",
    instagram: auth.instagram || ""
  };
  return {
    name: "Güngör Büyükküpcü",
    studio: SIRKET.unvan,
    phone: "0536 605 22 54",
    email: "gesesorganizasyon@gmail.com",
    address: "Arapçeşme Mh. Yeni Bağdat Cad. No:755 Gebze / Kocaeli",
    instagram: ""
  };
};

// Sözleşme ve faturalarda kullanılacak stüdyo bilgileri.
// Profil hiç kaydedilmediyse varsayılan firma bilgileri (SIRKET) aynen kullanılır.
// Başka bir stüdyo kendi profilini kaydettiyse, varsayılan firmanın vergi/IBAN/logo
// bilgileri ASLA o stüdyonun belgelerine düşmez.
export const getStudioInfo = () => {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(PREFIX + "studio_profile") || "null"); } catch(e) {}
  const auth = getAuthUser();
  if (!saved && !auth) return SIRKET;
  const p = saved || getStudioProfile();
  const sameOwner = (p.name || "").trim().toLowerCase() === SIRKET.ad.toLowerCase();
  const own = (v, def) => (v && String(v).trim()) || (sameOwner ? def : "");
  return {
    ad:     own(p.name, SIRKET.ad),
    unvan:  own(p.studio, SIRKET.unvan),
    adres:  own(p.address, SIRKET.adres),
    tel:    own(p.phone, SIRKET.tel),
    email:  own(p.email, SIRKET.email),
    vdaire: own(p.vdaire, SIRKET.vdaire),
    vno:    own(p.vno, SIRKET.vno),
    iban:   own(p.iban, SIRKET.iban),
    logo:   sameOwner ? SIRKET.logo : "",
  };
};

export const saveStudioProfile = (profile) => {
  try {
    localStorage.setItem(PREFIX + "studio_profile", JSON.stringify(profile));
  } catch(e) {}
};

// ─── UYGULAMA VERİ YEDEKLEME & YEREL VERİTABANI ────────────────────────
export const getLocalData = () => {
  try {
    const raw = localStorage.getItem(PREFIX + "app_data");
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
};

export const saveLocalData = (data) => {
  try {
    if (!data) return;
    localStorage.setItem(PREFIX + "app_data", JSON.stringify(data));
  } catch(e) {}
};


