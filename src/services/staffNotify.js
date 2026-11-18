// ════════════════════════════════════════════════
// PERSONEL ATAMA & BİLDİRİM
// Randevuya atanan personel için uygulama içi bildirim kaydı ve
// personelin telefonuna gidecek WhatsApp mesajı hazırlar.
// ════════════════════════════════════════════════
import { uid, fmtDate, todayStr } from "../utils/helpers";
import { getStudioInfo } from "./storage";

// Randevuya atanmış personel id'leri (eski kayıtlarda sadece isim tutuluyordu)
export const staffIdsOf = (apt, team = []) => {
  if (Array.isArray(apt?.staffIds)) return apt.staffIds;
  const names = String(apt?.staffName || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return team.filter(m => names.includes((m.name || "").toLowerCase())).map(m => m.id);
};

// Seçilen id'lerden görünen isim listesi (Ajanda/Dashboard bu alanı gösteriyor)
export const staffNameOf = (ids, team = []) =>
  ids.map(id => team.find(m => m.id === id)?.name).filter(Boolean).join(", ");

// Yeni atanan her personel için bir bildirim kaydı
export const assignmentNotifications = (apt, memberIds, team = []) =>
  memberIds.map(id => {
    const m = team.find(x => x.id === id);
    return {
      id: uid(),
      teamId: id,
      memberName: m?.name || "",
      appointmentId: apt.id,
      title: `Yeni görev: ${apt.clientName} — ${apt.type || "Çekim"}`,
      body: `${apt.date ? fmtDate(apt.date) : "Tarih belirlenmedi"}${apt.time ? " • " + apt.time : ""}${apt.location ? " • " + apt.location : ""}`,
      createdAt: new Date().toISOString(),
      date: todayStr(),
      read: false,
    };
  });

// Personelin telefonuna gidecek WhatsApp linki (telefon yoksa null)
export const assignmentWhatsApp = (member, apt) => {
  const digits = String(member?.phone || "").replace(/\D/g, "").replace(/^0/, "");
  if (!digits) return null;
  const phone = digits.startsWith("90") ? digits : "90" + digits;
  const studio = getStudioInfo().unvan || "Stüdyo";
  const lines = [
    `Merhaba ${String(member.name || "").split(" ")[0]} 👋`,
    ``,
    `${studio} — size yeni bir çekim görevi atandı:`,
    ``,
    `👰 Müşteri: ${apt.clientName}`,
    `📸 Tür: ${apt.type || "Çekim"}${apt.package ? " • " + apt.package : ""}`,
    `📅 Tarih: ${apt.date ? fmtDate(apt.date) : "Belirlenmedi"}${apt.time ? " • Saat " + apt.time : ""}`,
    apt.location ? `📍 Konum: ${apt.location}` : null,
    apt.notes ? `📝 Not: ${apt.notes}` : null,
    ``,
    `Lütfen ekipmanlarınızı çekimden önce hazırlayın. Kolay gelsin!`,
  ].filter(l => l !== null);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
};
