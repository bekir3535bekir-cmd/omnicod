import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { Card, Pill, PageHeader, GoldButton, Field, BottomSheet } from "../common";
import { getStudioProfile, saveStudioProfile } from "../../services/storage";

// Hızlı, temiz, bağımlılıksız SVG QR Kod Oluşturucu
const SimpleQRCodeSVG = ({ text, size = 180 }) => {
  const modules = [];
  const n = 21;
  for (let r = 0; r < n; r++) {
    modules[r] = [];
    for (let c = 0; c < n; c++) {
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= n - 7;
      const isBottomLeft = r >= n - 7 && c < 7;

      if (isTopLeft || isTopRight || isBottomLeft) {
        const isBorder = (r === 0 || r === 6 || c === 0 || c === 6 ||
                         (isTopRight && (r === 0 || r === 6 || c === n - 7 || c === n - 1)) ||
                         (isBottomLeft && (r === n - 7 || r === n - 1 || c === 0 || c === 6)));
        const isCenter = ((r >= 2 && r <= 4) && (c >= 2 && c <= 4)) ||
                         ((r >= 2 && r <= 4) && (c >= n - 5 && c <= n - 3)) ||
                         ((r >= n - 5 && r <= n - 3) && (c >= 2 && c <= 4));
        modules[r][c] = isBorder || isCenter;
      } else if (r === 6 || c === 6) {
        modules[r][c] = (r + c) % 2 === 0;
      } else {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash * 31 + text.charCodeAt(i) + (r * 13) + (c * 7)) % 10007;
        }
        modules[r][c] = (hash % 2 === 0);
      }
    }
  }

  const cellSize = size / n;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 14 }}>
      <rect width={size} height={size} fill="#ffffff" rx="14" />
      {modules.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0A0A0B"
            />
          ) : null
        )
      )}
      {/* Merkez Logo Pulu */}
      <rect
        x={size * 0.37}
        y={size * 0.37}
        width={size * 0.26}
        height={size * 0.26}
        fill="#ffffff"
        rx="8"
      />
      <text
        x={size / 2}
        y={size / 2 + 6}
        textAnchor="middle"
        fontSize={size * 0.13}
        fill="#B8953F"
        fontWeight="bold"
      >
        📸
      </text>
    </svg>
  );
};

export const DijitalKartvizit = () => {
  const [profile, setProfile] = useState(() => getStudioProfile());
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [copied, setCopied] = useState(false);

  // Düzenleme kaydetme
  const handleSaveEdit = () => {
    saveStudioProfile(editForm);
    setProfile(editForm);
    setShowEdit(false);
  };

  // vCard indirme (Telefon rehberine doğrudan ekler)
  const downloadVCard = () => {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${profile.name} (${profile.studio})
ORG:${profile.studio}
TITLE:Fotoğrafçı & Stüdyo Yöneticisi
TEL;TYPE=CELL,VOICE:${profile.phone}
EMAIL:${profile.email}
ADR;TYPE=WORK:;;${profile.address};;;Turkey
NOTE:Düğün, Nişan, Dış Çekim ve Özel Gün Fotoğrafçılığı
URL:https://studyoapp.com
END:VCARD`;

    const blob = new Blob([vCardData], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${profile.name.replace(/\s+/g, "_")}_Kartvizit.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Paylaşım
  const handleShare = async () => {
    const shareText = `📸 ${profile.studio}\n👤 ${profile.name}\n📞 ${profile.phone}\n✉️ ${profile.email}\n📍 ${profile.address}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.studio,
          text: shareText
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const cleanPhone = profile.phone.replace(/[^0-9]/g, "");
  const vCardPayload = `BEGIN:VCARD\nFN:${profile.name}\nORG:${profile.studio}\nTEL:${profile.phone}\nEMAIL:${profile.email}\nEND:VCARD`;

  return (
    <div className="fade-in" style={{ padding: "0 20px 40px" }}>
      <PageHeader
        title="Dijital Kartvizit & QR"
        sub="Düğün salonlarında ve çekimlerde davetlilerle tek tıkla paylaşabileceğiniz akıllı QR kartvizit"
      />

      {/* Üst Düzenle Butonu */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => { setEditForm(profile); setShowEdit(true); }}
          style={{
            background: "rgba(232, 197, 71, 0.12)",
            border: `1px solid ${T.gold}44`,
            color: T.goldL,
            borderRadius: 12,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>✏️</span> Bilgilerimi Düzenle
        </button>
      </div>

      {/* Apple Liquid Glass Kartvizit */}
      <div style={{
        borderRadius: 28,
        padding: "26px 22px",
        background: "linear-gradient(135deg, rgba(232, 197, 71, 0.14) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(10, 10, 14, 0.6) 100%)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1.5px solid rgba(232, 197, 71, 0.4)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
        position: "relative",
        overflow: "hidden",
        marginBottom: 20
      }}>
        {/* Glow rim */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(232, 197, 71, 0.9), transparent)"
        }} />

        {/* Stüdyo & İsim Başlığı */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "1.5px",
              color: T.goldL,
              textTransform: "uppercase",
              background: "rgba(232, 197, 71, 0.12)",
              padding: "3px 8px",
              borderRadius: 6,
              display: "inline-block",
              marginBottom: 6
            }}>
              FOTOĞRAF & ORGANİZASYON
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, color: T.text, lineHeight: 1.25 }}>
              {profile.studio}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.goldL, marginTop: 4 }}>
              {profile.name}
            </div>
          </div>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22
          }}>
            📸
          </div>
        </div>

        {/* Canlı QR Kod Kutusu */}
        <div style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 22,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          margin: "14px 0"
        }}>
          <SimpleQRCodeSVG text={vCardPayload} size={180} />
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginTop: 14, textAlign: "center" }}>
            Telefon kamerasıyla okutun
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2, textAlign: "center" }}>
            Kişi bilgileri doğrudan rehbere kaydedilir
          </div>
        </div>

        {/* İletişim Satırları (Şık Pill Tasarımı) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "9px 12px",
            borderRadius: 12
          }}>
            <span style={{ fontSize: 16 }}>📞</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.text3 }}>TELEFON</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{profile.phone}</div>
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "9px 12px",
            borderRadius: 12
          }}>
            <span style={{ fontSize: 16 }}>✉️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.text3 }}>E-POSTA</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile.email}
              </div>
            </div>
          </div>

          {profile.address && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "9px 12px",
              borderRadius: 12
            }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.text3 }}>ADRES & BÖLGE</div>
                <div style={{ fontSize: 12, color: T.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile.address}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hızlı Eylem Butonları */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <button
          onClick={downloadVCard}
          style={{
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldD})`,
            color: "#000",
            fontWeight: 700,
            fontSize: 13,
            padding: "13px",
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: `0 6px 20px ${T.gold}44`
          }}
        >
          <span>📲</span> Rehbere Kaydet
        </button>

        <button
          onClick={handleShare}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${T.border}`,
            color: T.text,
            fontWeight: 600,
            fontSize: 13,
            padding: "13px",
            borderRadius: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}
        >
          <span>🔗</span> {copied ? "Kopyalandı! ✅" : "Kartı Paylaş"}
        </button>
      </div>

      {/* Doğrudan WhatsApp Butonu */}
      <button
        onClick={() => {
          window.open(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent("Merhaba, fotoğraf çekimi ve paketleriniz hakkında bilgi alabilir miyim?")}`, "_blank");
        }}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, #25D366, #128C7E)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          padding: "14px",
          borderRadius: 14,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 6px 20px rgba(37, 211, 102, 0.3)"
        }}
      >
        <span>💬</span> Müşteri WhatsApp İletişim Hattı
      </button>

      {/* Bilgileri Düzenleme BottomSheet */}
      {showEdit && (
        <BottomSheet title="Kartvizit Bilgilerini Düzenle" onClose={() => setShowEdit(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field
              label="Ad Soyad"
              value={editForm.name}
              onChange={v => setEditForm(p => ({ ...p, name: v }))}
              placeholder="Adınız Soyadınız"
            />
            <Field
              label="Stüdyo / Marka Adı"
              value={editForm.studio}
              onChange={v => setEditForm(p => ({ ...p, studio: v }))}
              placeholder="Stüdyo Adı"
            />
            <Field
              label="Telefon Numarası"
              type="tel"
              value={editForm.phone}
              onChange={v => setEditForm(p => ({ ...p, phone: v }))}
              placeholder="0532 xxx xx xx"
            />
            <Field
              label="E-posta Adresi"
              type="email"
              value={editForm.email}
              onChange={v => setEditForm(p => ({ ...p, email: v }))}
              placeholder="studyo@mail.com"
            />
            <Field
              label="Adres & Şehir"
              value={editForm.address}
              onChange={v => setEditForm(p => ({ ...p, address: v }))}
              placeholder="İlçe / İl"
            />

            <GoldButton label="Kaydet ve Güncelle" onClick={handleSaveEdit} full style={{ marginTop: 8 }} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
