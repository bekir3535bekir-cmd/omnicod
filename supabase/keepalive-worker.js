// STÜDYOM — Supabase canlı tutma (Cloudflare Worker, Cron Trigger: her gün)
// Ücretsiz Supabase planı 7 gün etkinlik görmeyen projeyi duraklatır.
// Bu worker her gün veritabanına küçük bir sorgu atar. Yalnızca herkese açık (publishable) anahtar kullanır;
// satır güvenliği (RLS) nedeniyle hiçbir veri dönmez, sadece etkinlik oluşur.
const URL = "https://uyzuibdcopknklztpmzx.supabase.co";
const KEY = "sb_publishable_58u9dM_JyPUJULE88neXOg_jB7fezlv";

const ping = async () => {
  const r = await fetch(`${URL}/rest/v1/studios?select=id&limit=1`, { headers: { apikey: KEY } });
  return `Supabase: ${r.status} · ${new Date().toISOString()}`;
};

export default {
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(ping().then(console.log));
  },
  // Adresi tarayıcıda açınca da elle test edilebilir
  async fetch() {
    return new Response(await ping(), { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
