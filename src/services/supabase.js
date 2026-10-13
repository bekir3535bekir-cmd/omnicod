import { createClient } from "@supabase/supabase-js";

// STÜDYOM kendi veritabanını kullanır: adres/anahtar yalnızca .env üzerinden verilir.
// Kodda sabit (fallback) bir veritabanı adresi YOKTUR — verilmezse uygulama tamamen yerel modda çalışır.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
// IS_DEV: yerel mod (veritabanı yok, veriler yalnızca bu cihazda)
export const IS_DEV = import.meta.env.VITE_DEV_MODE !== "false" || !SUPABASE_URL || !SUPABASE_KEY;
export const IS_CLOUD = !IS_DEV;

// Oturum (giriş) bilgisi cihazda saklanır; aynı hesapla her cihazdan aynı veriye erişilir
export const supabase = IS_CLOUD
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

// Kayıtlar stüdyo bazında benzersiz: (studio_id, id). studio_id veritabanında otomatik doldurulur.
const CONFLICT = "studio_id,id";
const warn = (op, table, error) => console.warn(`sb.${op} ${table}:`, error?.message || error);

export const sb = {
  get: async (table) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).select("*");
    if (error) { warn("get", table, error); return null; }
    return data;
  },
  insert: async (table, data) => {
    if (!supabase) return;
    const { error } = await supabase.from(table).upsert(data, { onConflict: CONFLICT });
    if (error) warn("insert", table, error);
  },
  delete: async (table, id) => {
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq("id", String(id));
    if (error) warn("delete", table, error);
  },
  update: async (table, id, data) => {
    if (!supabase) return;
    const { error } = await supabase.from(table).update(data).eq("id", String(id));
    if (error) warn("update", table, error);
  },
  upsert: async (table, data) => {
    if (!supabase) return;
    const { error } = await supabase.from(table).upsert(data, { onConflict: CONFLICT });
    if (error) warn("upsert", table, error);
  },
  // Toplu kayıt: tablo başına tek istek
  upsertMany: async (table, rows) => {
    if (!supabase || !rows?.length) return;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict: CONFLICT });
      if (error) warn("upsertMany", table, error);
    }
  },
  rpc: async (fn, args) => {
    if (!supabase) return { data: null, error: { message: "Veritabanı bağlı değil" } };
    return supabase.rpc(fn, args);
  },
};

export const toDB = {
  clients: r => ({ id:String(r.id), name:r.name, phone:r.phone||"", email:r.email||"", type:r.type, package:r.package, notes:r.notes||"", date:r.date||"", total_amount:r.totalAmount||0, paid:r.paid||0, status:r.status, payments:r.payments||[], process:{...(r.process||{}), extraDates:r.extraDates||[]}, referral_source:r.referralSource||"", referral_name:r.referralName||"", anniversary_date:r.anniversaryDate||"" }),
  appointments: r => ({ id:String(r.id), client_name:r.clientName||"", client_id:String(r.clientId||""), date:r.date||"", time:r.time||"", location:r.location||"", type:r.type||"Düğün", package:r.package||"Bronz Paket", notes:r.notes||"", reminder_days:r.reminderDays||3, status:r.status||"onaylı", total_amount:Number(r.totalAmount)||0, kapora:Number(r.kapora)||0, staff_name:r.staffName||"", staff_ids:r.staffIds||[], approval:r.approval||"onaylandı", requested_by:String(r.requestedBy||""), request_info:r.requestInfo||{} }),
  packages: r => ({ id:String(r.id), name:r.name, price:r.price||0, color:r.color, includes:r.includes||[], note:r.note||"" }),
  incomes: r => ({ id:String(r.id), client_name:r.clientName||"", amount:r.amount||0, type:r.type||"", method:r.method||"Nakit", date:r.date||"", note:r.note||"", category:r.category||"" }),
  expenses: r => ({ id:String(r.id), amount:r.amount||0, category:r.category||"", description:r.description||"", date:r.date||"", method:r.method||"Nakit" }),
  reminders: r => ({ id:String(r.id), title:r.title||"", linked_type:r.linkedType||"", linked_id:String(r.linkedId||""), trigger_date:r.triggerDate||"", trigger_time:r.triggerTime||"09:00", days_before:r.daysBefore||0, done:r.done||false }),
  contracts: r => ({ id:String(r.id), client_name:r.clientName||"", package:r.package||"", sign_date:r.signDate||"", event_date:r.eventDate||"", total:r.total||0, deposit:r.deposit||0, status:r.status||"taslak", terms:r.terms||"" }),
  team: r => ({ id:String(r.id), name:r.name||"", role:r.role||"", phone:r.phone||"", color:r.color||"", salary:Number(r.salary)||0, total_earned:Number(r.totalEarned)||0, total_paid:Number(r.totalPaid)||0 }),
  shifts: r => ({ id:String(r.id), member_id:String(r.teamId||""), member_name:r.memberName||"", date:r.date||"", appointment_id:String(r.appointmentId||""), client_name:r.clientName||"", type:r.type||"", status:r.status||"planlandı", fee:r.fee||0, title:r.title||"", start:r.start||"08:00", end:r.end||"18:00", location:r.location||"", note:r.note||"" }),
  gallery: r => ({ id:String(r.id), title:r.title||"", category:r.category||"", url:r.url||"", client_id:String(r.clientId||""), emoji:r.emoji||"📷", color:r.color||"" }),
  quotes:    r => ({ id:String(r.id), client_name:r.clientName||"", package:r.package||"", base_price:r.basePrice||0, items:r.items||[], discount:r.discount||0, total:r.total||0, note:r.note||"", date:r.date||"", status:r.status||"taslak" }),
  locations: r => ({ id:String(r.id), name:r.name||"", address:r.address||"", note:r.note||"" }),
  messages:  r => ({ id:String(r.id), client_id:String(r.clientId||""), client_name:r.clientName||"", unread:r.unread||0, last_msg:r.lastMsg||"", chat:r.chat||[] }),
  notifications: r => ({ id:String(r.id), team_id:String(r.teamId||""), member_name:r.memberName||"", appointment_id:String(r.appointmentId||""), title:r.title||"", body:r.body||"", created_at:r.createdAt||"", date:r.date||"", read:!!r.read }),
  notes:     r => ({ id:String(r.id), text:r.text||"", tag:r.tag||"genel", date:r.date||"", time:r.time||"00:00", starred:r.starred||false }),
};

export const fromDB = {
  clients: r => ({ ...r, totalAmount: r.total_amount, payments: r.payments||[], process: r.process||{}, referralSource: r.referral_source||"", referralName: r.referral_name||"", anniversaryDate: r.anniversary_date||"", extraDates: (r.process||{}).extraDates||[] }),
  appointments: r => ({ ...r, clientName: r.client_name, clientId: r.client_id||"", reminderDays: r.reminder_days||3, totalAmount: r.total_amount||0, extraDates: [], staffName: r.staff_name||"", staffIds: Array.isArray(r.staff_ids) ? r.staff_ids : undefined, approval: r.approval||"onaylandı", requestedBy: r.requested_by||"", requestInfo: r.request_info||{} }),
  notifications: r => ({ ...r, teamId: r.team_id, memberName: r.member_name, appointmentId: r.appointment_id, createdAt: r.created_at }),
  packages: r => ({ ...r, includes: r.includes||[] }),
  incomes: r => ({ ...r, clientName: r.client_name }),
  expenses: r => r,
  reminders: r => ({ ...r, linkedType: r.linked_type, linkedId: r.linked_id, triggerDate: r.trigger_date, triggerTime: r.trigger_time, daysBefore: r.days_before }),
  contracts: r => ({ ...r, clientName: r.client_name, signDate: r.sign_date, eventDate: r.event_date }),
  messages: r => ({ ...r, clientId: r.client_id, from: r.from_me ? "me" : "them" }),
  team: r => ({ ...r, salary: r.salary||0, totalEarned: r.total_earned||0, totalPaid: r.total_paid||0 }),
  shifts: r => ({ ...r, teamId: r.member_id, memberName: r.member_name, clientName: r.client_name, appointmentId: r.appointment_id }),
  gallery: r => ({ ...r, clientId: r.client_id }),
  quotes: r => ({ ...r, clientName: r.client_name, basePrice: r.base_price, items: r.items||[] }),
  portals: r => ({ ...r, clientId: r.client_id, clientName: r.client_name, expiresAt: r.expires_at }),
  locations: r => ({ ...r }),
  notes:     r => ({ ...r }),
};
