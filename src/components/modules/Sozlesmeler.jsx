import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";

export const Sozlesmeler = ({ data, setData, role }) => {
  const isAdmin = role === "admin";
  const [showAdd,  setShowAdd]  = useState(false);
  const [detailId, setDetailId] = useState(null);
  const F = { clientName:"", package:"Bronz Paket", signDate:todayStr(), eventDate:"", total:"", deposit:"", status:"taslak", terms:"Kapora iadesi yapılmaz. Kalan ödeme etkinlik gününde nakit/havale olarak alınır." };
  const [form, setForm] = useState(F);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  // detail her zaman data'dan türetiliyor → tek kaynak
  const detail = detailId ? data.contracts.find(c => c.id === detailId) || null : null;

  const save = () => {
    const newContract = {...form, id:uid(), total:Number(form.total), deposit:Number(form.deposit)};
    setData(p=>({...p, contracts:[...p.contracts, newContract]}));
    sb.upsert("contracts", toDB.contracts(newContract)).catch(()=>{});
    setShowAdd(false); setForm(F);
  };
  const updateStatus = (id, s) => {
    setData(p=>({...p, contracts:p.contracts.map(c=>c.id===id?{...c,status:s}:c)}));
    const c = data.contracts.find(x=>x.id===id);
    if(c) sb.upsert("contracts", toDB.contracts({...c,status:s})).catch(()=>{});
  };
  const sc = s => STATUS_COLORS[s]||T.text3;

  const printContract = (c) => {
    const pkg = data.packages.find(p=>p.name===c.package) || {};
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sözleşme — ${c.clientName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #B8953F; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-family: 'Playfair Display', serif; font-size: 24px; color: #B8953F; margin: 0; }
    .badge { background: #fdf6e7; border: 1px solid #B8953F; color: #8A6E2E; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
    th { background: #faf8f5; color: #555; }
    .terms { background: #fafafa; border: 1px solid #eaeaea; border-radius: 8px; padding: 18px; margin: 24px 0; font-size: 13px; }
    .signs { display: flex; justify-content: space-between; margin-top: 50px; }
    .sign-box { width: 45%; border-top: 1px solid #333; padding-top: 10px; text-align: center; font-size: 13px; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${SIRKET?.unvan || "OMNICOD"}</h1>
      <div style="font-size: 12px; color: #666; margin-top: 4px;">Fotoğrafçılık & Prodüksiyon Hizmet Sözleşmesi</div>
    </div>
    <div>
      <span class="badge">DURUM: ${(c.status||"taslak").toUpperCase()}</span>
    </div>
  </div>

  <table>
    <tr><th style="width:30%">Müşteri Adı</th><td><strong>${c.clientName}</strong></td></tr>
    <tr><th>Seçilen Paket</th><td>${c.package}</td></tr>
    <tr><th>Etkinlik Tarihi</th><td>${fmtDate(c.eventDate)}</td></tr>
    <tr><th>İmza Tarihi</th><td>${fmtDate(c.signDate)}</td></tr>
    <tr><th>Toplam Hizmet Bedeli</th><td><strong>${fmt(c.total)}</strong></td></tr>
    <tr><th>Alınan Kapora</th><td>${fmt(c.deposit)}</td></tr>
    <tr><th>Kalan Bakiye</th><td><strong style="color:#c53030">${fmt(Math.max(0, (c.total||0) - (c.deposit||0)))}</strong></td></tr>
  </table>

  ${pkg.includes && pkg.includes.length > 0 ? `
  <div style="margin: 20px 0;">
    <strong style="font-size: 13px;">Paket İçeriği:</strong>
    <ul style="font-size: 12px; color: #444; margin-top: 6px;">
      ${pkg.includes.map(item => `<li>${item}</li>`).join("")}
    </ul>
  </div>` : ""}

  <div class="terms">
    <strong style="display:block; margin-bottom: 8px; color: #333;">Sözleşme Şartları ve Hükümleri:</strong>
    <div style="white-space: pre-wrap;">${c.terms || "Kapora iadesi yapılmaz. Kalan ödeme etkinlik gününde nakit/havale olarak alınır."}</div>
  </div>

  <div class="signs">
    <div class="sign-box">
      <strong>Hizmet Veren (Stüdyo)</strong><br/>
      ${SIRKET?.ad || "Stüdyo Yetkilisi"}<br/>
      İmza / Kaşe
    </div>
    <div class="sign-box">
      <strong>Hizmet Alan (Müşteri)</strong><br/>
      ${c.clientName}<br/>
      İmza
    </div>
  </div>
</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Sözleşmeler" sub={`${data.contracts.length} sözleşme`} action={isAdmin} onAction={()=>setShowAdd(true)} actionLabel="Oluştur"/>
      <div style={{ padding:"0 20px" }}>
        {data.contracts.length===0 ? <EmptyState icon="doc" title="Sözleşme Bulunamadı" sub="Müşterilerinle sözleşme oluştur." action="İlk Sözleşmeyi Oluştur" onAction={()=>setShowAdd(true)}/> :
        data.contracts.map(c=>(
          <Card key={c.id} onClick={()=>setDetailId(c.id)} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontWeight:600, fontSize:16 }}>{c.clientName}</div>
              <Pill label={c.status} color={sc(c.status)}/>
            </div>
            <Pill label={c.package} color={data.packages.find(p=>p.name===c.package)?.color||T.gold}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:14 }}>
              {[["İmza",fmtDateSh(c.signDate)],["Etkinlik",fmtDateSh(c.eventDate)],["Toplam",fmt(c.total)],["Kapora",fmt(c.deposit)]].map(([l,v])=>(
                <div key={l} style={{ background:T.card2, borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:T.text3, marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {detail && (
        <BottomSheet title="Sözleşme" onClose={()=>setDetailId(null)}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
            <Pill label={detail.status} color={sc(detail.status)}/>
            <Pill label={detail.package} color={data.packages.find(p=>p.name===detail.package)?.color||T.gold}/>
          </div>
          {[["Müşteri",detail.clientName],["İmza Tarihi",fmtDate(detail.signDate)],["Etkinlik Tarihi",fmtDate(detail.eventDate)],
            ["Toplam Tutar",fmt(detail.total)],["Kapora",fmt(detail.deposit)],["Kalan",fmt(detail.total-detail.deposit)]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", borderBottom:`1px solid ${T.border}`, paddingBottom:13, marginBottom:13 }}>
              <span style={{ fontSize:13, color:T.text3 }}>{l}</span>
              <span style={{ fontSize:14, fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div style={{ background:T.card2, borderRadius:12, padding:16 }}>
            <div style={{ fontSize:11, color:T.text3, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Sözleşme Şartları</div>
            <div style={{ fontSize:13, color:T.text2, lineHeight:1.7 }}>{detail.terms}</div>
          </div>
          
          {/* Yazdır / PDF İndir */}
          <div style={{ marginTop:16 }}>
            <GoldButton label="📄 Sözleşmeyi Yazdır / PDF" icon="doc" variant="outline" full onClick={()=>printContract(detail)}/>
          </div>

          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12, color:T.text3, marginBottom:10 }}>Durum Güncelle</div>
            <div style={{ display:"flex", gap:8 }}>
              {["taslak","imzalı","iptal edildi"].map(s=>(
                <button key={s} onClick={()=>updateStatus(detail.id, s)}
                  style={{ flex:1, background:detail.status===s?sc(s)+"22":"transparent", color:sc(s), border:`1px solid ${sc(s)}44`, borderRadius:10, padding:"9px", fontSize:12, fontWeight:600 }}>
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {isAdmin && (
            <GoldButton label="Sözleşmeyi Sil" icon="trash" variant="danger" full
              onClick={()=>{ sb.delete("contracts", detail.id).catch(()=>{}); setData(p=>({...p, contracts:p.contracts.filter(c=>c.id!==detail.id)})); setDetailId(null); }}
              style={{ marginTop:12 }}/>
          )}
        </BottomSheet>
      )}
      {showAdd && (
        <BottomSheet title="Yeni Sözleşme" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Müşteri Adı" value={form.clientName} onChange={f("clientName")} placeholder="Ad Soyad" required/>
            <Field label="Paket" value={form.package} onChange={f("package")} options={data.packages.map(p=>p.name)}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <DatePicker label="İmza Tarihi" value={form.signDate} onChange={f("signDate")}/>
              <DatePicker label="Etkinlik Tarihi" value={form.eventDate} onChange={f("eventDate")}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Toplam (₺)" type="number" value={form.total} onChange={f("total")}/>
              <Field label="Kapora (₺)" type="number" value={form.deposit} onChange={f("deposit")}/>
            </div>
            <Field label="Sözleşme Şartları" value={form.terms} onChange={f("terms")} textarea rows={4}/>
            <GoldButton label="Sözleşmeyi Kaydet" icon="check" onClick={save} full/>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
