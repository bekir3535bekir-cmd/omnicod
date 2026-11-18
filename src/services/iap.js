// ════════════════════════════════════════════════
// UYGULAMA İÇİ SATIN ALMA (App Store / Google Play) — RevenueCat üzerinden
//
// • Satın almayı yalnızca stüdyo yöneticisi (admin) yapar; abonelik stüdyoya tanımlanır
//   (RevenueCat kullanıcı kimliği = studio_id), personel ve masaüstü de aynı planı görür.
// • Asıl kayıt sunucudadır: RevenueCat → Supabase "revenuecat-webhook" fonksiyonu
//   studios.plan / plan_expiry alanlarını günceller. Uygulama satın alma sonrası
//   ekranı hemen açar, ardından planı sunucudan tekrar okur.
// • Mağaza anahtarları herkese açık (istemci) anahtarlardır; derlemede
//   VITE_RC_APPLE_KEY / VITE_RC_GOOGLE_KEY olarak verilir.
//
// Mağaza ürünleri (App Store Connect / Play Console'da aynı adlarla açılır):
//   studyom_standart_aylik  → yetki (entitlement) "standart"
//   studyom_pro_aylik       → yetki (entitlement) "pro"
// ════════════════════════════════════════════════

import { Purchases as RC } from "@revenuecat/purchases-capacitor";
import { isNativeApp, setPlan, PLAN_ORDER, PLANS } from "./plan";

export const IAP_PRODUCTS = { standart: "studyom_standart_aylik", pro: "studyom_pro_aylik" };

// Apple'ın standart kullanım koşulları (EULA) ve gizlilik politikası — abonelik ekranında zorunlu bağlantılar
export const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const PRIVACY_URL = "https://gesblabs.com/gizlilik";

const platform = () => {
  try { return window.Capacitor?.getPlatform?.() || "web"; } catch (e) { return "web"; }
};

const apiKey = () => platform() === "ios"
  ? (import.meta.env.VITE_RC_APPLE_KEY || "").trim()
  : (import.meta.env.VITE_RC_GOOGLE_KEY || "").trim();

// Bu cihazda satın alma yapılabilir mi? (telefon uygulaması + anahtar tanımlı)
export const iapAvailable = () => isNativeApp() && !!apiKey();

let configuredFor = null;
// Not: Capacitor eklentisi her özellik adına (then dahil) fonksiyon döndüren bir Proxy'dir.
// Promise'ten / async fonksiyondan DÖNDÜRÜLMEMELİ: "thenable" sanılıp sonsuza kadar asılı kalır.

// Stüdyo kimliğiyle bağlan (aynı stüdyo için bir kez; aynı anda gelen çağrılar aynı işlemi bekler)
let initPromise = null;
export const initIap = (studioId) => {
  if (!iapAvailable() || !studioId) return Promise.resolve(false);
  if (configuredFor === studioId && initPromise) return initPromise;
  const prev = configuredFor;
  configuredFor = studioId;
  initPromise = (prev ? RC.logIn({ appUserID: studioId }) : RC.configure({ apiKey: apiKey(), appUserID: studioId }))
    .then(() => true)
    .catch((e) => { configuredFor = prev; initPromise = null; throw e; });
  return initPromise;
};

// Çıkışta: bir sonraki hesap başka stüdyo kimliğiyle bağlansın
export const resetIap = async () => {
  if (!configuredFor) return;
  try { await RC.logOut(); } catch (e) {}
  configuredFor = null; initPromise = null;
};

// Ürün kimliği eşleşmesi (Google'da "ürün:temel-plan" biçiminde gelir)
const planOfProduct = (id = "") => {
  const base = id.split(":")[0];
  return Object.keys(IAP_PRODUCTS).find(p => IAP_PRODUCTS[p] === base) || null;
};

// Mağazadaki paketler: { standart: { pkg, price, title, period }, pro: {...} }
export const loadIapPlans = async () => {
  const Purchases = RC;
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings?.current?.availablePackages || [];
  const out = {};
  for (const pkg of pkgs) {
    const p = planOfProduct(pkg.product?.identifier);
    if (p && !out[p]) out[p] = { pkg, price: pkg.product.priceString, title: pkg.product.title };
  }
  return out;
};

// Müşteri bilgisinden etkin en yüksek planı bul ve cihaza uygula
const applyCustomerInfo = (info) => {
  const active = info?.entitlements?.active || {};
  const best = [...PLAN_ORDER].reverse().find(p => p !== "basic" && active[p]);
  if (!best) return null;
  setPlan(best, active[best].expirationDate || null);
  return best;
};

// Açılışta: mağazadaki etkin abonelik sunucudaki plandan yüksekse cihazda onu kullan
// (sunucu güncellemesi gecikirse ödeme yapan yönetici kilitli ekran görmesin). Dönen: plan ya da null
export const syncIapPlan = async (studioId) => {
  try {
    if (!(await initIap(studioId))) return null;
    const Purchases = RC;
    const { customerInfo } = await Purchases.getCustomerInfo();
    const active = customerInfo?.entitlements?.active || {};
    const best = [...PLAN_ORDER].reverse().find(p => p !== "basic" && active[p]);
    const current = localStorage.getItem((import.meta.env.VITE_DEV_MODE === "false" ? "geses_" : "geses_dev_") + "plan");
    if (best && (PLANS[best].level > (PLANS[current]?.level ?? -1))) return applyCustomerInfo(customerInfo);
  } catch (e) {}
  return null;
};

// Satın al. Dönen: { ok, plan } | { ok:false, cancelled } | { ok:false, message }
export const buyPlan = async (iapPlan) => {
  try {
    const Purchases = RC;
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: iapPlan.pkg });
    const plan = applyCustomerInfo(customerInfo);
    return plan ? { ok: true, plan } : { ok: false, message: "Ödeme alındı ancak plan henüz açılmadı. Birazdan tekrar deneyin veya 'Satın alımları geri yükle'ye dokunun." };
  } catch (e) {
    if (e?.userCancelled || e?.code === "1" || /cancel/i.test(e?.message || "")) return { ok: false, cancelled: true };
    return { ok: false, message: "Satın alma tamamlanamadı. İnternet bağlantınızı kontrol edip tekrar deneyin." };
  }
};

// Daha önce alınmış aboneliği geri yükle (yeni telefon, uygulamayı silip yükleme vb.)
export const restorePurchases = async () => {
  try {
    const Purchases = RC;
    const { customerInfo } = await Purchases.restorePurchases();
    const plan = applyCustomerInfo(customerInfo);
    return plan
      ? { ok: true, plan, message: `${PLANS[plan].label} planınız geri yüklendi.` }
      : { ok: false, message: "Bu mağaza hesabında etkin bir STÜDYOM aboneliği bulunamadı." };
  } catch (e) {
    return { ok: false, message: "Geri yükleme yapılamadı. İnternet bağlantınızı kontrol edin." };
  }
};

// Aboneliği yönet / iptal et: mağazanın kendi abonelik sayfası
export const manageSubscriptionUrl = async () => {
  try {
    const Purchases = RC;
    const { customerInfo } = await Purchases.getCustomerInfo();
    if (customerInfo?.managementURL) return customerInfo.managementURL;
  } catch (e) {}
  return platform() === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";
};
