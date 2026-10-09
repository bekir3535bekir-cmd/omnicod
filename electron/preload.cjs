// Web uygulamasına masaüstünde çalıştığını bildirir (service worker kaydı vb. buna göre atlanır)
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("studyomDesktop", {
  platform: process.platform,
});
