// ════════════════════════════════════════════════
// STÜDYOM — Masaüstü (Windows) uygulaması
// Web uygulamasının derlenmiş hali (dist/) Electron penceresinde açılır.
// ════════════════════════════════════════════════
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

// Windows bildirimlerinin uygulama adıyla görünmesi için
app.setAppUserModelId("com.studyom.app");

// Tarayıcı kimliğinde (User-Agent) Türkçe karakter olmasın: Electron uygulama adını ("STÜDYOM") ekliyor,
// "Ü" harfi sunucuya bozuk gidiyor ve Supabase oturum açarken "Database error granting user" hatası veriyor.
app.userAgentFallback = app.userAgentFallback.replace(/[^\x20-\x7E]/g, "").replace(/STDYOM/g, "Studyom");

// Uygulama ikinci kez açılırsa yeni pencere yerine mevcut pencereyi öne getir
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

const createWindow = () => {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    title: "STÜDYOM",
    backgroundColor: "#090D16",
    icon: path.join(__dirname, "..", "resources", "icon.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Fatura / sözleşme / rapor yazdırma pencereleri (about:blank + document.write)
    if (url === "about:blank" || url === "") {
      return {
        action: "allow",
        overrideBrowserWindowOptions: { width: 900, height: 1000, autoHideMenuBar: true, title: "STÜDYOM — Yazdır" },
      };
    }
    // WhatsApp, haritalar vb. dış bağlantılar varsayılan tarayıcıda açılır
    if (/^(https?:|mailto:|tel:)/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // Uygulama penceresi kendi içinde başka bir siteye yönlenmesin
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });
};

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
