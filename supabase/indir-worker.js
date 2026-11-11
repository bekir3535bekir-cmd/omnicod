// STÜDYOM — indir.gesblabs.com (Cloudflare Worker + R2)
// R2 bucket "studyom-indir" bu worker'a BUCKET adıyla bağlanır (Settings → Bindings → R2 bucket).
// Yalnızca listedeki dosyalar verilir; bucket'ın geri kalanı dışarıya kapalı kalır.
const DOSYALAR = ["Studyom-Kurulum.exe"];

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("İzin verilmeyen istek", { status: 405 });
    const ad = decodeURIComponent(new URL(request.url).pathname.slice(1));
    if (!DOSYALAR.includes(ad)) return Response.redirect("https://gesblabs.com/studyom.html", 302);
    const obj = await env.BUCKET.get(ad);
    if (!obj) return new Response("Dosya bulunamadı", { status: 404 });
    return new Response(request.method === "HEAD" ? null : obj.body, { headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${ad}"`,
      "content-length": String(obj.size),
      "cache-control": "public, max-age=3600",
    } });
  },
};
