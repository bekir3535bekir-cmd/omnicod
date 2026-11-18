// ════════════════════════════════════════════════
// TELEFON ÖZELLİKLERİ — titreşim (haptik) ve durum çubuğu (Apple HIG)
// Yalnızca iOS/Android uygulamasında çalışır; web ve masaüstünde sessizce hiçbir şey yapmaz.
// ════════════════════════════════════════════════
import { Capacitor } from "@capacitor/core";

const isNative = () => Capacitor.isNativePlatform();

// ─── Titreşim: HIG'deki belgelenmiş anlamlarıyla (success / warning / error / selection) ───
// HIG: "Make haptics optional" — Ayarlar'dan kapatılabilir
const HAPTICS_OFF = "studyom_haptics_off";
export const hapticsEnabled = () => {
  try { return localStorage.getItem(HAPTICS_OFF) !== "1"; } catch (e) { return true; }
};
export const setHapticsEnabled = (on) => {
  try { on ? localStorage.removeItem(HAPTICS_OFF) : localStorage.setItem(HAPTICS_OFF, "1"); } catch (e) {}
};

const play = (fn) => {
  if (!isNative() || !hapticsEnabled()) return;
  import("@capacitor/haptics").then(fn).catch(() => {});
};
export const haptic = {
  // Önemli bir işlem tamamlandı (kayıt, ödeme)
  success: () => play(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success })),
  // Geri alınamayacak bir işlemden önce (silme onayı)
  warning: () => play(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Warning })),
  // İşlem yapılamadı
  error: () => play(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Error })),
  // Seçim değişti (sekme, tema)
  selection: () => play(async ({ Haptics }) => { await Haptics.selectionStart(); await Haptics.selectionChanged(); await Haptics.selectionEnd(); }),
};

// ─── Durum çubuğu: saat ve pil simgeleri zemine göre açık/koyu (HIG: "Match status bar style to your content") ───
export const setStatusBarForBackground = (isDark, bg) => {
  if (!isNative()) return;
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    // Android: çubuğun arka planı uygulama zeminiyle aynı
    if (Capacitor.getPlatform() === "android" && bg) StatusBar.setBackgroundColor({ color: bg }).catch(() => {});
  }).catch(() => {});
};
