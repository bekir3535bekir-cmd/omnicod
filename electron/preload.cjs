// Web uygulamasına masaüstünde çalıştığını bildirir (service worker kaydı vb. buna göre atlanır)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studyomDesktop", {
  platform: process.platform,
  // Bildirime tıklanınca pencereyi öne getir
  focusWindow: () => ipcRenderer.send("studyom:focus"),
});
