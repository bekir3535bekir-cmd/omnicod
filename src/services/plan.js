// ════════════════════════════════════════════════
// PLAN SERVİSİ — Basic (ücretsiz) · Standart · Pro + 7 günlük Pro deneme
// Hangi özelliğin hangi planda olduğu bu dosyadaki FEATURES listesinden yönetilir.
// ════════════════════════════════════════════════

import { sha256 } from "../utils/secret";

const PREFIX = import.meta.env.VITE_DEV_MODE === "false" ? "geses_" : "geses_dev_";

// Planların sırası (soldan sağa: düşükten yükseğe)
export const PLAN_ORDER = ["basic", "standart", "pro"];

// ─── Plan Tanımları ──────────────────────────────
export const PLANS = {
  trial: {
    id: "trial", label: "Pro Deneme (7 Gün)", short: "Deneme", price: 0, level: 2,
    limits: { appointments: Infinity, clients: Infinity, team: Infinity, reminders: Infinity, notes: Infinity },
  },
  basic: {
    id: "basic", label: "Basic", short: "Basic", price: 0, level: 0,
    desc: "Küçük stüdyolar için temel randevu ve müşteri takibi",
    limits: { appointments: 20, clients: 20, team: 0, reminders: 20, notes: 50 },
  },
  standart: {
    id: "standart", label: "Standart", short: "Standart", price: 599, level: 1,
    desc: "Muhasebe, teklif, sözleşme ve ekip yönetimi",
    limits: { appointments: Infinity, clients: Infinity, team: 5, reminders: Infinity, notes: Infinity },
  },
  pro: {
    id: "pro", label: "Pro", short: "Pro", price: 999, level: 2,
    desc: "Tüm özellikler: raporlar, müşteri portalı, iş asistanı ve daha fazlası",
    limits: { appointments: Infinity, clients: Infinity, team: Infinity, reminders: Infinity, notes: Infinity },
  },
};

// ─── Özellikler ve hangi plandan itibaren açık oldukları ─────────
// plan: o özelliği açan en düşük plan
export const FEATURES = {
  dashboard:    { label: "Ana Sayfa",             plan: "basic",    icon: "home",     desc: "Günün özeti, yaklaşan çekimler ve hızlı işlemler." },
  ajanda:       { label: "Ajanda",                plan: "basic",    icon: "calendar", desc: "Düğün ve çekim randevularını planlayın, personel atayın." },
  takvim:       { label: "Takvim",                plan: "basic",    icon: "calendar", desc: "Yıllık takvim ve yoğunluk haritası." },
  musteriler:   { label: "Müşteriler",            plan: "basic",    icon: "users",    desc: "Müşteri kartları, ödeme ve teslim takibi." },
  hatirlatici:  { label: "Hatırlatıcılar",        plan: "basic",    icon: "bell",     desc: "Çekim ve ödeme hatırlatmaları." },
  paketler:     { label: "Paketler & Fiyatlar",   plan: "basic",    icon: "box",      desc: "Hizmet paketlerinizi ve fiyatlarınızı yönetin." },
  notdefteri:   { label: "Not Defteri",           plan: "basic",    icon: "notebook", desc: "Etiketli hızlı notlar." },

  muhasebe:     { label: "Muhasebe",              plan: "standart", icon: "money",    desc: "Gelir-gider takibi, vergi özeti ve fatura oluşturma." },
  teklif:       { label: "Fiyat Teklifi",         plan: "standart", icon: "doc",      desc: "Müşterilere özel teklif hazırlayıp WhatsApp ile gönderin." },
  sozlesmeler:  { label: "Sözleşmeler",           plan: "standart", icon: "doc",      desc: "Müşteri sözleşmeleri ve PDF çıktısı." },
  mesajlar:     { label: "Mesajlar",              plan: "standart", icon: "msg",      desc: "Müşteri yazışma kayıtları ve WhatsApp şablonları." },
  sablonlar:    { label: "Hazır Şablonlar",       plan: "standart", icon: "copy",     desc: "Müşteriye özel doldurulan hazır mesaj şablonları." },
  ekip:         { label: "Ekip & Shift",          plan: "standart", icon: "team",     desc: "Personel, vardiya, ödeme takibi ve personel uygulama girişi." },
  altinsaat:    { label: "Altın Saat & Işık",     plan: "standart", icon: "clock",    desc: "Dış çekim için gün batımı ve altın saat hesaplayıcı." },

  raporlar:     { label: "Raporlar",              plan: "pro",      icon: "chart",    desc: "Yıllık gelir, sezon, referans ve dolar bazlı raporlar." },
  portal:       { label: "Müşteri Portalı",       plan: "pro",      icon: "eye",      desc: "Müşterinin fotoğraf seçtiği ve süreci takip ettiği özel link." },
  galeri:       { label: "Portföy Galerisi",      plan: "pro",      icon: "camera",   desc: "Çalışmalarınızı sergileyen portföy." },
  isasistani:   { label: "İş Asistanı",           plan: "pro",      icon: "warn",     desc: "Haftalık özet, geciken işler ve öneriler, PDF rapor." },
  pozrehberi:   { label: "Poz Rehberi",           plan: "pro",      icon: "camera",   desc: "Çiftler için poz ve yönlendirme rehberi." },
  kartvizit:    { label: "Dijital Kartvizit",     plan: "pro",      icon: "copy",     desc: "QR kodlu dijital kartvizit, rehbere tek dokunuşla kayıt." },
  sesliasistan: { label: "Sesli Asistan",         plan: "pro",      icon: "msg",      desc: "Konuşarak ya da yazarak hızlı randevu ekleme." },
};

// Eski adla kullanan yerler için: Pro'ya özel özellikler
export const PRO_FEATURES = Object.keys(FEATURES).filter(k => FEATURES[k].plan === "pro");

// Uygulama mağazadan indirilen telefon uygulaması mı? (iOS/Android)
// Mağaza kuralları gereği telefon uygulamalarında fiyat ve satın alma gösterilmez.
export const isNativeApp = () => {
  try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch (e) { return false; }
};

const levelOf = (planId) => (PLANS[planId] || PLANS.basic).level;

// Bu plan bu özelliği kullanabiliyor mu?
export const planHasFeature = (planId, featureId) => {
  const f = FEATURES[featureId];
  if (!f) return true; // tanımsız ekranlar (ayarlar vb.) her planda açık
  return levelOf(planId) >= PLANS[f.plan].level;
};
export const requiredPlanFor = (featureId) => FEATURES[featureId]?.plan || "basic";
export const featuresOfPlan = (planId) => Object.keys(FEATURES).filter(k => FEATURES[k].plan === planId);

// ─── 7 Günlük Deneme Yönetimi ────────────────────
export const getTrialInfo = () => {
  try {
    let startStr = localStorage.getItem(PREFIX + "trial_start");
    if (!startStr) {
      // İlk geliş: 7 günlük denemeyi otomatik başlat
      startStr = new Date().toISOString();
      localStorage.setItem(PREFIX + "trial_start", startStr);
    }
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isActive = diffMs > 0;

    return { startDate: startStr, endDate: end.toISOString(), daysLeft, isActive, isExpired: !isActive };
  } catch (e) {
    return { daysLeft: 0, isActive: false, isExpired: true };
  }
};

// Test amaçlı denemeyi sıfırlama (7 gün baştan başlasın)
export const resetTrial = () => {
  try {
    localStorage.setItem(PREFIX + "trial_start", new Date().toISOString());
    localStorage.removeItem(PREFIX + "plan");
    localStorage.removeItem(PREFIX + "plan_expiry");
  } catch (e) {}
};

// Test amaçlı denemeyi süresi dolmuş yapma
export const expireTrial = () => {
  try {
    localStorage.setItem(PREFIX + "trial_start", new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString());
    localStorage.setItem(PREFIX + "plan", "basic");
    localStorage.removeItem(PREFIX + "plan_expiry");
  } catch (e) {}
};

// ─── Aktif Plan ──────────────────────────────────
// Bulutta plan bilgisi stüdyo kaydından gelir (storage.setCurrentStudio cihaza yazar).
export const getPlan = () => {
  try {
    const stored = localStorage.getItem(PREFIX + "plan");

    // 1. Ücretli plan (Standart / Pro) ve süresi bitmediyse
    if (stored === "pro" || stored === "standart") {
      const expiry = localStorage.getItem(PREFIX + "plan_expiry");
      if (expiry && new Date(expiry) < new Date()) return getTrialInfo().isActive ? "trial" : "basic";
      return stored;
    }
    // 2. Açıkça Basic
    if (stored === "basic") return "basic";
    // 3. İlk 7 gün: Pro deneme
    if (getTrialInfo().isActive) return "trial";
    // 4. Deneme bitti, ücretli plan yok → Basic
    return "basic";
  } catch (e) {
    return "basic";
  }
};

export const setPlan = (planId, expiryDate) => {
  try {
    localStorage.setItem(PREFIX + "plan", planId);
    if (expiryDate) localStorage.setItem(PREFIX + "plan_expiry", expiryDate);
    else localStorage.removeItem(PREFIX + "plan_expiry");
  } catch (e) {}
};

export const getPlanExpiry = () => {
  try { return localStorage.getItem(PREFIX + "plan_expiry") || null; } catch (e) { return null; }
};

// ─── Lisans Kodu Sistemi (yalnızca yerel mod) ────
// Geçerli lisans kodlarının SHA-256 özetleri (kodlar düz metin olarak tutulmaz)
const VALID_LICENSE_HASHES = [
  "5d94e90cd086bdc27e3a9dc7992a6f7847dfade8e0d341b5754d372d359238b9",
  "6eee9b62a5c472fa57482caccc272f3e24d197b549087ed1977cac0e60a54204",
  "efbdfe9f105184dbce2db2705a3945cb96d061e04e1e4170101baf0eb45bf425",
  "7fdbe4bf20842cbf8974cee46bc051e4bfdebc9de537b20ed8325b0c372634b5",
  "e9eb2e8c8e9d3db22bf7d4a0164f2e340dbffe70a5c53b33fa0d68f998239fd5",
  "786661f61b36b6baca56dfce4081aba425613ba010305f13e235bd242dbd840a",
  "992d119d119d42fdb39f04a263fdbc6edbc278780f3a2198eed3ede534b78345",
  "75943e4c13c4ed0d94bb2afb1c345c4646cceb0f412748e73bc467357b131ec2",
];

export const activatePro = (licenseKey) => {
  const key = (licenseKey || "").trim().toUpperCase();
  if (key && VALID_LICENSE_HASHES.includes(sha256("studyom-license:" + key))) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    setPlan("pro", expiry.toISOString());
    return { success: true, message: "Pro plan aktive edildi! 🎉", expiry: expiry.toISOString() };
  }
  return { success: false, message: "Geçersiz lisans kodu. Lütfen kontrol edin." };
};

export const deactivatePro = () => setPlan("basic");

// ─── Limit Kontrol Fonksiyonları ─────────────────
const checkLimit = (data, dataKey, limitKey) => {
  const plan = getPlan();
  const limit = PLANS[plan].limits[limitKey];
  const current = (data[dataKey] || []).length;
  const unlimited = limit === Infinity;
  // Bir üst plan (sınırı kaldıran)
  const upgradeTo = PLAN_ORDER.find(p => PLANS[p].level > levelOf(plan) && PLANS[p].limits[limitKey] > limit) || "pro";
  return {
    allowed: unlimited ? true : current < limit,
    current, limit,
    remaining: unlimited ? Infinity : Math.max(0, limit - current),
    isPro: plan === "pro", isTrial: plan === "trial", unlimited,
    plan, upgradeTo,
  };
};

export const canAddAppointment = (data) => checkLimit(data, "appointments", "appointments");
export const canAddClient = (data) => checkLimit(data, "clients", "clients");
export const canAddTeamMember = (data) => checkLimit(data, "team", "team");
export const canAddReminder = (data) => checkLimit(data, "reminders", "reminders");
export const canAddNote = (data) => checkLimit(data, "notes", "notes");

// Eski kullanım: özellik kilitli mi?
export const isProFeature = (featureName) => !planHasFeature(getPlan(), featureName);

// ─── Kullanım Özeti ──────────────────────────────
export const getUsageSummary = (data) => {
  const plan = getPlan();
  const limits = PLANS[plan].limits;
  const trial = getTrialInfo();
  const u = (key) => {
    const current = (data[key] || []).length;
    return { current, limit: limits[key], pct: limits[key] === Infinity ? 0 : Math.round((current / Math.max(1, limits[key])) * 100) };
  };
  return {
    plan, planLabel: PLANS[plan].label,
    isPro: plan === "pro", isTrial: plan === "trial",
    trialDaysLeft: trial.daysLeft, trialEndDate: trial.endDate,
    usage: { appointments: u("appointments"), clients: u("clients"), team: u("team"), reminders: u("reminders"), notes: u("notes") },
    expiry: getPlanExpiry(),
  };
};
