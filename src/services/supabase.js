import { createClient } from "@supabase/supabase-js";

export const IS_DEV = import.meta.env.VITE_DEV_MODE !== "false";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jlnodwzhljbzevasdhtd.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_3xYfYyHGjy3Fx6MqDWFPpw_Wgt1KHFm";

export const supabase = (SUPABASE_URL && SUPABASE_KEY && !IS_DEV) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export const sb = {
  get: async (table) => {
    if (IS_DEV) {
      console.log(`[DEV SAFE] sb.get(${table}) - isolated fallback`);
      return null;
    }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      return r.ok ? await r.json() : null;
    } catch(e) {
      console.warn(`sb.get ${table} error:`, e);
      return null;
    }
  },
  insert: async (table, data) => {
    if (IS_DEV) {
      console.log(`[DEV SAFE PROTECTED] insert into ${table}`, data);
      return;
    }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(data)
      });
    } catch(e) { console.warn(`sb.insert ${table} error:`, e); }
  },
  delete: async (table, id) => {
    if (IS_DEV) {
      console.log(`[DEV SAFE PROTECTED] delete from ${table} id=${id}`);
      return;
    }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
    } catch(e) { console.warn(`sb.delete ${table} error:`, e); }
  },
  update: async (table, id, data) => {
    if (IS_DEV) {
      console.log(`[DEV SAFE PROTECTED] update ${table} id=${id}`, data);
      return;
    }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch(e) { console.warn(`sb.update ${table} error:`, e); }
  }
};

export const toDB = {
  clients: r => ({ id:String(r.id), name:r.name, phone:r.phone||"", email:r.email||"", type:r.type, package:r.package, notes:r.notes||"", date:r.date||"", total_amount:r.totalAmount||0, paid:r.paid||0, status:r.status, payments:r.payments||[], process:{...(r.process||{}), extraDates:r.extraDates||[]}, referral_source:r.referralSource||"", referral_name:r.referralName||"", anniversary_date:r.anniversaryDate||"" }),
  appointments: r => ({ id:String(r.id), client_name:r.clientName||"", client_id:String(r.clientId||""), date:r.date||"", time:r.time||"", location:r.location||"", type:r.type||"Düğün", package:r.package||"Bronz Paket", notes:r.notes||"", reminder_days:r.reminderDays||3, status:r.status||"onaylı", total_amount:Number(r.totalAmount)||0, kapora:Number(r.kapora)||0 }),
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
  notes:     r => ({ id:String(r.id), text:r.text||"", tag:r.tag||"genel", date:r.date||"", time:r.time||"00:00", starred:r.starred||false }),
};

export const fromDB = {
  clients: r => ({ ...r, totalAmount: r.total_amount, payments: r.payments||[], process: r.process||{}, referralSource: r.referral_source||"", referralName: r.referral_name||"", anniversaryDate: r.anniversary_date||"", extraDates: (r.process||{}).extraDates||[] }),
  appointments: r => ({ ...r, clientName: r.client_name, clientId: r.client_id||"", reminderDays: r.reminder_days||3, totalAmount: r.total_amount||0, extraDates: [] }),
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
