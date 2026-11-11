// ════════════════════════════════════════════════
// MODÜL LİSTESİ — telefon ("Devamı") ve masaüstü (sol menü) aynı simge, renk ve adları kullanır
// ════════════════════════════════════════════════
import { T } from "./theme";

// Renkler tema değişince güncel kalsın diye fonksiyon olarak verilir
// admin: yalnızca yönetici görür · staff: personelin görebildiği ekranlar
export const getModules = () => ({
  dashboard:    { icon:"home",     color:T.goldL,  label:"Ana Sayfa",           desc:"Günün özeti",                                  staff:true },
  ajanda:       { icon:"calendar", color:T.gold,   label:"Ajanda",              desc:"Düğün ve çekim randevuları",                   staff:true },
  musteriler:   { icon:"users",    color:T.goldL,  label:"Müşteriler",          desc:"Müşteri CRM, paket ve bakiye takibi",          staff:true },
  mesajlar:     { icon:"msg",      color:T.blueL,  label:"Mesajlar",            desc:"Müşteri iletişimi",                            staff:true },
  takvim:       { icon:"calendar", color:T.blueL,  label:"Takvim",              desc:"Yıllık randevu takvimi" },
  hatirlatici:  { icon:"bell",     color:T.orangeL,label:"Hatırlatıcılar",      desc:"Tarih & ödeme hatırlatmaları" },
  muhasebe:     { icon:"money",    color:T.green,  label:"Muhasebe",            desc:"Gelir, gider ve kasa",                         admin:true },
  teklif:       { icon:"tag",      color:T.greenL, label:"Fiyat Teklifi",       desc:"Müşterilere özel teklif oluştur",              admin:true },
  sozlesmeler:  { icon:"pen",      color:T.orange, label:"Sözleşmeler",         desc:"Müşteri sözleşmeleri & PDF",                   admin:true },
  paketler:     { icon:"box",      color:T.gold,   label:"Paketler & Fiyatlar", desc:"Hizmet paketlerini yönet",                     admin:true },
  raporlar:     { icon:"chart",    color:T.blueL,  label:"Raporlar",            desc:"Aylık & yıllık analizler",                     admin:true },
  sablonlar:    { icon:"layers",   color:T.blue,   label:"Hazır Şablonlar",     desc:"Müşterilere hazır mesajlar" },
  portal:       { icon:"eye",      color:"#C94C9F",label:"Müşteri Portalı",     desc:"Fotoğraf seçim sistemi",                       admin:true },
  galeri:       { icon:"image",    color:T.green,  label:"Portföy Galerisi",    desc:"Fotoğraf arşivi ve kategoriler" },
  ekip:         { icon:"team",     color:"#C94C9F",label:"Ekip & Shift",        desc:"Personel ve görev planı" },
  isasistani:   { icon:"zap",      color:T.goldL,  label:"İş Asistanı",         desc:"Otomasyonlar, alarmlar, arşiv",                admin:true },
  notdefteri:   { icon:"notebook", color:T.gold,   label:"Not Defteri",         desc:"Hızlı ve etiketli notlar",                     admin:true },
  altinsaat:    { icon:"sun",      color:T.goldL,  label:"Altın Saat & Işık",   desc:"Dış çekim gün batımı ve ters ışık hesaplayıcı" },
  pozrehberi:   { icon:"pose",     color:T.gold,   label:"Poz Rehberi",         desc:"Görsel pozlar ve çifte komut rehberi" },
  kartvizit:    { icon:"qr",       color:T.blueL,  label:"Dijital Kartvizit",   desc:"Düğün salonları için anında QR kartvizit" },
  sesliasistan: { icon:"mic",      color:"#C94C9F",label:"Sesli Randevu",       desc:"Konuşarak hızlı randevu ve not ekleme" },
});

// Personelin açabildiği ekranlar (finans ve yönetim ekranları kapalı)
export const STAFF_SCREENS = ["dashboard", "ajanda", "musteriler", "mesajlar", "more"];

// Masaüstü sol menü grupları
export const DESKTOP_GROUPS = [
  { group:"Genel",             items:["dashboard","ajanda","takvim","musteriler","hatirlatici"] },
  { group:"Finans",            items:["muhasebe","teklif","sozlesmeler","paketler","raporlar"] },
  { group:"Müşteri İletişimi", items:["mesajlar","sablonlar","portal","galeri"] },
  { group:"Ekip & Araçlar",    items:["ekip","isasistani","notdefteri","altinsaat","pozrehberi","kartvizit","sesliasistan"] },
];

// Telefon "Devamı" listesinin sırası
export const MORE_ORDER = ["musteriler","takvim","hatirlatici","ekip","mesajlar","sablonlar","paketler","sozlesmeler","teklif",
  "raporlar","portal","galeri","isasistani","notdefteri","altinsaat","pozrehberi","kartvizit","sesliasistan"];
