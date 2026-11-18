// ════════════════════════════════════════════════════════════════
// STÜDYOM — RevenueCat webhook (App Store / Google Play abonelikleri)
//
// RevenueCat her abonelik olayında (satın alma, yenileme, iptal, süre bitimi, plan değişimi)
// bu adrese POST atar. Olaydaki bilgiye körü körüne güvenmek yerine, aboneliğin GÜNCEL
// durumunu RevenueCat'ten sorar ve stüdyonun planını (studios.plan / plan_expiry) yazar.
// Böylece olaylar sırasız gelse de sonuç doğru olur.
//
// Supabase → Edge Functions → Secrets bölümüne eklenecekler:
//   RC_WEBHOOK_AUTH   RevenueCat webhook ayarındaki "Authorization header" değeriyle aynı uzun rastgele metin
//   RC_SECRET_KEY     RevenueCat → Project settings → API keys → Secret API key (sk_...)
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik verilir.
//
// Yayın: Verify JWT KAPALI olmalı (RevenueCat Supabase oturumu taşımaz; kimlik RC_WEBHOOK_AUTH ile doğrulanır).
// ════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const PLAN_ORDER = ["pro", "standart"]; // yüksekten düşüğe
const TRIAL_DAYS = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

// Sabit sürede karşılaştırma (zamanlama ile şifre tahminine karşı)
const safeEqual = (a: string, b: string) => {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
};

// Bir stüdyonun RevenueCat'teki güncel durumundan planı hesapla ve yaz
async function syncStudio(studioId: string) {
  if (!UUID.test(studioId)) return `atlandı (${studioId.slice(0, 40)})`;

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(studioId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("RC_SECRET_KEY")}` },
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const ents = (await res.json())?.subscriber?.entitlements || {};
  const now = Date.now();
  const activeOf = (id: string) => {
    const e = ents[id];
    if (!e) return null;
    const exp = e.expires_date ? Date.parse(e.expires_date) : Infinity;
    // Ödeme sorununda mağazanın tanıdığı ek süre (grace period) de etkin sayılır
    const grace = e.grace_period_expires_date ? Date.parse(e.grace_period_expires_date) : 0;
    const until = Math.max(exp, grace);
    return until > now ? { until } : null;
  };
  const best = PLAN_ORDER.find(activeOf);

  const { data: studio, error } = await db.from("studios").select("id, plan, trial_start").eq("id", studioId).maybeSingle();
  if (error) throw error;
  if (!studio) return `stüdyo yok (${studioId})`;

  let update: Record<string, unknown>;
  if (best) {
    const until = activeOf(best)!.until;
    update = { plan: best, plan_expiry: Number.isFinite(until) ? new Date(until).toISOString() : null };
  } else if (studio.plan === "pro" || studio.plan === "standart") {
    // Abonelik bitti: deneme süresi hâlâ sürüyorsa denemeye, yoksa Basic'e dön
    const trialEnd = Date.parse(studio.trial_start) + TRIAL_DAYS * 864e5;
    update = { plan: trialEnd > now ? "trial" : "basic", plan_expiry: null };
  } else {
    return `${studioId}: değişiklik yok (${studio.plan})`;
  }
  const { error: upErr } = await db.from("studios").update(update).eq("id", studioId);
  if (upErr) throw upErr;
  return `${studioId}: ${update.plan}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const expected = Deno.env.get("RC_WEBHOOK_AUTH") || "";
  const got = req.headers.get("authorization") || "";
  if (!expected || !(safeEqual(got, expected) || safeEqual(got, `Bearer ${expected}`))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Record<string, unknown> = {};
  try { event = (await req.json())?.event || {}; } catch { return new Response("Bad Request", { status: 400 }); }

  // RevenueCat panelindeki "Send test event"
  if (event.type === "TEST") return Response.json({ ok: true, test: true });

  // Etkilenen tüm stüdyolar (aktarım olayında eski ve yeni sahip de güncellenir)
  const ids = new Set<string>();
  for (const v of [event.app_user_id, event.original_app_user_id]) if (typeof v === "string") ids.add(v);
  for (const k of ["aliases", "transferred_from", "transferred_to"]) {
    const arr = event[k];
    if (Array.isArray(arr)) for (const v of arr) if (typeof v === "string") ids.add(v);
  }

  try {
    const results = [];
    for (const id of ids) results.push(await syncStudio(id));
    console.log(event.type, results.join(" | "));
    return Response.json({ ok: true, results });
  } catch (e) {
    // 5xx dönünce RevenueCat olayı daha sonra tekrar gönderir
    console.error(event.type, String(e));
    return new Response("Sync failed", { status: 500 });
  }
});
