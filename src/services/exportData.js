// ════════════════════════════════════════════════
// VERİLERİMİ İNDİR — stüdyonun tüm kayıtları tek Excel dosyasında
// Hesap silinmeden önce kayıtların saklanabilmesi (muhasebe kayıtları yasal olarak saklanmalı)
// ve kişisel verilere erişim hakkı için.
// ════════════════════════════════════════════════
import writeExcelFile from "write-excel-file/browser";
import { Capacitor } from "@capacitor/core";

// Excel sayfaları: veri anahtarı → sayfa adı
const SHEETS = [
  ["clients", "Müşteriler"], ["appointments", "Randevular"], ["incomes", "Gelirler"], ["expenses", "Giderler"],
  ["packages", "Paketler"], ["contracts", "Sözleşmeler"], ["quotes", "Teklifler"], ["team", "Ekip"],
  ["shifts", "Görevler"], ["reminders", "Hatırlatıcılar"], ["notes", "Notlar"], ["messages", "Mesajlar"],
  ["gallery", "Fotoğraflar"], ["locations", "Mekanlar"], ["deletedClients", "Silinen Müşteriler"],
];

// Sık kullanılan alanların Türkçe başlıkları; diğerleri olduğu gibi yazılır
const LABELS = {
  id: "Kayıt No", name: "Ad Soyad", phone: "Telefon", email: "E-posta", type: "Tür", date: "Tarih", time: "Saat",
  location: "Yer", package: "Paket", notes: "Notlar", note: "Not", clientName: "Müşteri", clientPhone: "Müşteri Telefonu",
  clientId: "Müşteri No", totalAmount: "Toplam Tutar", paid: "Ödenen", amount: "Tutar", price: "Fiyat", category: "Kategori",
  desc: "Açıklama", description: "Açıklama", title: "Başlık", status: "Durum", role: "Görev", createdAt: "Oluşturulma",
  uploadedAt: "Yüklenme", staffName: "Personel", process: "Süreç", extraDates: "Ek Tarihler", staffIds: "Personel No", method: "Ödeme Şekli", text: "Metin", address: "Adres", url: "Bağlantı",
};

const MAX_CELL = 30000; // Excel hücre sınırı 32.767 karakter
const cell = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.startsWith("data:")) return "[görsel uygulamada]";
    return v.length > MAX_CELL ? v.slice(0, MAX_CELL) + "…" : v;
  }
  const s = JSON.stringify(v);
  return s.length > MAX_CELL ? s.slice(0, MAX_CELL) + "…" : s;
};

const sheetOf = (rows, sheet) => {
  const keys = [];
  rows.forEach(r => Object.keys(r || {}).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
  const header = keys.map(k => ({ value: LABELS[k] || k, fontWeight: "bold" }));
  return { sheet, stickyRowsCount: 1, data: [header, ...rows.map(r => keys.map(k => cell(r?.[k])))],
    columns: keys.map(k => ({ width: k === "notes" || k === "desc" || k === "text" ? 40 : 18 })) };
};

const blobToBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

export const exportStudioData = async (data, studioName = "") => {
  const sheets = SHEETS
    .filter(([k]) => Array.isArray(data?.[k]) && data[k].length > 0)
    .map(([k, label]) => sheetOf(data[k], label));
  if (!sheets.length) throw new Error("Henüz indirilecek kayıt yok.");

  const blob = await writeExcelFile(sheets).toBlob();
  const safe = (studioName || "Studyom").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") || "Studyom";
  const fileName = `${safe}_Veriler_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Telefonda dosya indirilemez: geçici olarak kaydedilip paylaşım menüsüyle (Drive, WhatsApp, e-posta…) gönderilir
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory.Cache });
    await Share.share({ title: fileName, url: uri, dialogTitle: "Verilerinizi kaydedin" });
    return fileName;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return fileName;
};
