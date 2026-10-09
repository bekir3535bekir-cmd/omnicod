// Ekranda tutarlar para birimi işareti olmadan gösterilir (örn. 18.000)
export const fmt    = n => new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(n||0);
// Belge ve müşteri mesajlarında (fatura, sözleşme, teklif, WhatsApp) para birimi korunur
export const fmtTL  = n => fmt(n) + " ₺";
// Tutarlar kısaltılmadan tam yazılır (örn. 18.000 ₺)
export const fmtShort = n => fmt(n);

export const fmtDate  = d => { if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"}); };
export const fmtDateSh= d => { if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("tr-TR",{day:"2-digit",month:"short"}); };
// Yerel tarih (toISOString UTC verir; Türkiye'de gece 00-03 arası bir önceki günü döndürüyordu)
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
export const daysLeft = d => Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000);
export const MN = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
export const monthOf  = d => new Date(d+"T12:00:00").getMonth();
export const yearOf   = d => new Date(d+"T12:00:00").getFullYear();
export const uid      = () => String(Date.now()) + String(Math.floor(Math.random()*1e9));

// DM Sans — tüm sayısal değerler için
export const NUM_FONT = { fontFamily:"'DM Sans',sans-serif", fontVariantNumeric:"tabular-nums" };

// Müşteriye gönderilen linklerin (fotoğraf seçimi / portal) adresi.
// Masaüstü (file://) ve telefon uygulamasında (https://localhost) kendi adresi dışarıdan açılamaz;
// bu yüzden web sürümünün yayınlandığı adres .env içinde VITE_PUBLIC_URL ile verilir.
export const publicAppUrl = () => {
  const env = (import.meta.env.VITE_PUBLIC_URL || "").replace(/\/+$/, "");
  if (env) return env;
  const { protocol, hostname, origin } = window.location;
  if (protocol.startsWith("http") && hostname !== "localhost" && hostname !== "127.0.0.1") return origin;
  return origin.startsWith("http") ? origin : "";
};
