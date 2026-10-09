import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Göreceli yollar: aynı build hem web, hem telefon (Capacitor), hem masaüstü (Electron, file://) için çalışır
  base: "./",
  server: {
    port: 3000,
    open: false
  }
});
