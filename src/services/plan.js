// ════════════════════════════════════════════════
// PLAN SERVİSİ — 7 Günlük Ücretsiz Deneme + Basic & Pro SaaS
// ════════════════════════════════════════════════

import { sha256 } from "../utils/secret";

const PREFIX = import.meta.env.VITE_DEV_MODE === "false" ? "geses_" : "geses_dev_";

// ─── Plan Tanımları ──────────────────────────────
export const PLANS = {
  trial: {
    id: "trial",
    label: "Pro Deneme (7 Gün)",
    price: 0,
    limits: {
      appointments: Infinity,
      clients: Infinity,
      team: Infinity,
      reminders: Infinity,
      notes: Infinity,
    },
    proFeatures: true,
  },
  basic: {
    id: "basic",
    label: "Basic",
    price: 0,
    limits: {
      appointments: 20,
      clients: 20,
      team: 2,
      reminders: 20,
      notes: 50,
    },
    proFeatures: false,
  },
  pro: {
    id: "pro",
    label: "Pro",
    price: 749, // ₺/ay
    priceYearly: 7490, // ₺/yıl (%17 indirim)
    limits: {
      appointments: Infinity,
      clients: Infinity,
      team: Infinity,
      reminders: Infinity,
      notes: Infinity,
    },
    proFeatures: true,
  },
};

// Pro-only özellikler listesi
export const PRO_FEATURES = [
  "sozlesmeler",
  "teklif",
  "raporlar",
  "galeri",
  "portal",
  "isasistani",
  "theme_toggle",
  "paket_edit",
];

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

    return {
      startDate: startStr,
      endDate: end.toISOString(),
      daysLeft,
      isActive,
      isExpired: !isActive,
    };
  } catch (e) {
    return { daysLeft: 0, isActive: false, isExpired: true };
  }
};

// Test amaçlı denemeyi sıfırlama (7 gün baştan başlasın)
export const resetTrial = () => {
  try {
    const now = new Date().toISOString();
    localStorage.setItem(PREFIX + "trial_start", now);
    localStorage.removeItem(PREFIX + "plan");
    localStorage.removeItem(PREFIX + "plan_expiry");
  } catch (e) {}
};

// Test amaçlı denemeyi süresi dolmuş yapma (teklif ekranını hemen görmek için)
export const expireTrial = () => {
  try {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(PREFIX + "trial_start", eightDaysAgo);
    localStorage.setItem(PREFIX + "plan", "basic");
    localStorage.removeItem(PREFIX + "plan_expiry");
  } catch (e) {}
};

// ─── Plan Yönetimi (localStorage) ────────────────
export const getPlan = () => {
  try {
    const stored = localStorage.getItem(PREFIX + "plan");

    // 1. Kullanıcı Pro satın aldıysa ve süresi bitmediyse
    if (stored === "pro") {
      const expiry = localStorage.getItem(PREFIX + "plan_expiry");
      if (expiry && new Date(expiry) < new Date()) {
        localStorage.setItem(PREFIX + "plan", "basic");
        localStorage.removeItem(PREFIX + "plan_expiry");
        return "basic";
      }
      return "pro";
    }

    // 2. Kullanıcı açıkça basic seçtiyse (deneme bitip basic'te kalmayı onayladıysa)
    if (stored === "basic") {
      return "basic";
    }

    // 3. İlk 7 günlük Pro deneme kontrolü
    const trial = getTrialInfo();
    if (trial.isActive) {
      return "trial";
    }

    // 4. Deneme süresi bittiyse ve ödeme yapılmadıysa -> Basic plan
    return "basic";
  } catch (e) {
    return "basic";
  }
};

export const setPlan = (planId, expiryDate) => {
  try {
    localStorage.setItem(PREFIX + "plan", planId);
    if (expiryDate) {
      localStorage.setItem(PREFIX + "plan_expiry", expiryDate);
    } else {
      localStorage.removeItem(PREFIX + "plan_expiry");
    }
  } catch (e) {}
};

export const getPlanExpiry = () => {
  try {
    return localStorage.getItem(PREFIX + "plan_expiry") || null;
  } catch (e) {
    return null;
  }
};

// ─── Lisans Kodu Sistemi ─────────────────────────
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

export const deactivatePro = () => {
  setPlan("basic");
};

// ─── Limit Kontrol Fonksiyonları ─────────────────
const checkLimit = (data, dataKey, limitKey) => {
  const plan = getPlan();
  const limits = PLANS[plan].limits;
  const current = (data[dataKey] || []).length;
  const limit = limits[limitKey];
  const isFullAccess = plan === "pro" || plan === "trial";

  return {
    allowed: isFullAccess ? true : current < limit,
    current,
    limit,
    remaining: isFullAccess ? Infinity : Math.max(0, limit - current),
    isPro: plan === "pro",
    isTrial: plan === "trial",
    plan,
  };
};

export const canAddAppointment = (data) => checkLimit(data, "appointments", "appointments");
export const canAddClient = (data) => checkLimit(data, "clients", "clients");
export const canAddTeamMember = (data) => checkLimit(data, "team", "team");
export const canAddReminder = (data) => checkLimit(data, "reminders", "reminders");
export const canAddNote = (data) => checkLimit(data, "notes", "notes");

export const isProFeature = (featureName) => {
  const plan = getPlan();
  // Hem Pro hem de 7 günlük deneme sırasında TÜM özellikler açık!
  if (plan === "pro" || plan === "trial") return false;
  return PRO_FEATURES.includes(featureName);
};

// ─── Kullanım Özeti ──────────────────────────────
export const getUsageSummary = (data) => {
  const plan = getPlan();
  const limits = PLANS[plan].limits;
  const trial = getTrialInfo();

  return {
    plan,
    planLabel: PLANS[plan].label,
    isPro: plan === "pro",
    isTrial: plan === "trial",
    trialDaysLeft: trial.daysLeft,
    trialEndDate: trial.endDate,
    usage: {
      appointments: { current: (data.appointments || []).length, limit: limits.appointments, pct: limits.appointments === Infinity ? 0 : Math.round(((data.appointments || []).length / limits.appointments) * 100) },
      clients:      { current: (data.clients || []).length,      limit: limits.clients,      pct: limits.clients === Infinity ? 0 : Math.round(((data.clients || []).length / limits.clients) * 100) },
      team:         { current: (data.team || []).length,         limit: limits.team,         pct: limits.team === Infinity ? 0 : Math.round(((data.team || []).length / limits.team) * 100) },
      reminders:    { current: (data.reminders || []).length,    limit: limits.reminders,    pct: limits.reminders === Infinity ? 0 : Math.round(((data.reminders || []).length / limits.reminders) * 100) },
      notes:        { current: (data.notes || []).length,        limit: limits.notes,        pct: limits.notes === Infinity ? 0 : Math.round(((data.notes || []).length / limits.notes) * 100) },
    },
    expiry: getPlanExpiry(),
  };
};
