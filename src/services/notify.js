// ════════════════════════════════════════════════
// SİSTEM BİLDİRİMLERİ
// Telefonda (iOS/Android) yerel bildirim, masaüstünde Windows bildirimi gösterilir.
// Bildirime tıklanınca uygulama öne gelir ve ilgili ekran açılır.
// ════════════════════════════════════════════════
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "./plan";

let openHandler = () => {};
let nativeReady = false;

// Bildirim kimliği: telefon tarafı 32 bit tamsayı ister
const numId = (s) => {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) || 1;
};

// Uygulama açılışında bir kez çağrılır; onOpen(screen) bildirime tıklanınca çalışır
export const initNotifications = async (onOpen) => {
  openHandler = onOpen || (() => {});
  if (isNativeApp()) {
    if (nativeReady) return;
    nativeReady = true;
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") await LocalNotifications.requestPermissions();
      await LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
        openHandler(e?.notification?.extra?.screen || "ajanda");
      });
    } catch (e) { /* bildirim izni verilmedi */ }
    return;
  }
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
};

export const showSystemNotification = async ({ id, title, body, screen = "ajanda" }) => {
  if (isNativeApp()) {
    try {
      await LocalNotifications.schedule({ notifications: [{
        id: numId(id), title, body, extra: { screen },
        iconColor: "#E8B931",
      }] });
    } catch (e) { /* izin yok */ }
    return;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "favicon.png", tag: String(id) });
    n.onclick = () => {
      // Masaüstü programı simge durumundaysa pencereyi öne getir
      try { window.studyomDesktop?.focusWindow?.(); } catch (e) {}
      try { window.focus(); } catch (e) {}
      openHandler(screen);
      n.close();
    };
  } catch (e) { /* tarayıcı bildirimi desteklemiyor */ }
};
