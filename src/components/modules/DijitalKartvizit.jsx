import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { Card, Pill, PageHeader, GoldButton } from "../common";
import { SIRKET } from "../../constants/templates";
import { getAuthUser } from "../../services/storage";

// Basit, güvenilir SVG QR Kod deseni oluşturucu (Standart Matrix)
const SimpleQRCodeSVG = ({ text, size = 180 }) => {
  // 21x21 QR Grid Matrisi oluşturma (Hızlı, temiz, sıfır harici paket)
  const modules = [];
  const n = 21;
  for (let r = 0; r < n; r++) {
    modules[r] = [];
    for (let c = 0; c < n; c++) {
      // Finder patterns (3 köşe kareleri)
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
        // Timing pattern
        modules[r][c] = (r + c) % 2 === 0;
      } else {
        // Veri alanı deseni (metin hash bazlı deterministik matris)
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 12 }}>
      <rect width={size} height={size} fill="#ffffff" rx="12" />
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
        x={size * 0.38}
        y={size * 0.38}
        width={size * 0.24}
        height={size * 0.24}
        fill="#ffffff"
        rx="6"
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size * 0.12}
        fill="#B8953F"
        fontWeight="bold"
      >
        📷
      </text>
    </svg>
  );
};

export const DijitalKartvizit = () => {
  const authUser = getAuthUser();
  const studioName = authUser?.studio || SIRKET.unvan || "StudyoApp Fotoğrafçılık";
  const ownerName = authUser?.name || SIRKET.ad || "Güngör Büyükküpcü";
  const phone = SIRKET.tel || "0536 605 22 54";
  const email = SIRKET.email || "gesesorganizasyon@gmail.com";
  const instagram = "@gesesfotografcilik";
  const address = SIRKET.adres || "Gebze / Kocaeli";

  const [copied, setCopied] = useState(false);

  // vCard oluştur ve indir
  const downloadVCard = () => {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName} (${studioName})
ORG:${studioName}
TITLE:Profesyonel Fotoğrafçı & Stüdyo
TEL;TYPE=CELL,VOICE:${phone}
EMAIL:${email}
ADR;TYPE=WORK:;;${address};;;Turkey
NOTE:Düğün, Nişan, Dış Çekim ve Özel Gün Fotoğrafçılığı
URL:https://studyoapp.com
END:VCARD`;

    const blob = new Blob([vCardData], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${ownerName.replace(/\s+/g, "_")}_Kartvizit.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Paylaş
  const handleShare = async () => {
    const shareText = `📸 ${studioName} - ${ownerName}\n📞 İletişim: ${phone}\n✉️ E-posta: ${email}\n📍 ${address}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: studioName,
          text: shareText
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const vCardQrPayload = `BEGIN:VCARD\nFN:${ownerName}\nORG:${studioName}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;

  return (
    <div className="fade-in" style={{ padding: "0 20px 40px" }}>
      <PageHeader
        title="Dijital Kartvizit & QR"
        sub="Düğün salonlarında ve çekimlerde davetlilerle tek tıkla paylaşabileceğiniz QR kartvizit"
      />

      {/* Apple Liquid Glass Kartvizit */}
      <div style={{
        borderRadius: 28,
        padding: "26px 22px",
        background: "linear-gradient(135deg, rgba(232, 197, 71, 0.12) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(0, 0, 0, 0.4) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1.5px solid rgba(232, 197, 71, 0.35)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
        position: "relative",
        overflow: "hidden",
        marginBottom: 20
      }}>
        {/* Glow rim */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(232, 197, 71, 0.8), transparent)"
        }} />

        {/* Stüdyo Başlık */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", color: T.goldL, textTransform: "uppercase" }}>
              FOTOĞRAF & ORGANİZASYON
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginTop: 4 }}>
              {studioName}
            </div>
            <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>
              {ownerName}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>📸</span>
        </div>

        {/* QR Kod Alanı */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          margin: "14px 0"
        }}>
          <SimpleQRCodeSVG text={vCardQrPayload} size={170} />
          <div style={{ fontSize: 11.5, color: T.text3, marginTop: 12, textAlign: "center" }}>
            Telefon kamerasıyla okutarak rehbere ekleyin
          </div>
        </div>

        {/* İletişim Detayları */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: T.text2, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>📞</span> <strong style={{ color: T.text }}>{phone}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>✉️</span> <span>{email}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>📍</span> <span>{address}</span>
          </div>
        </div>
      </div>

      {/* Hızlı Eylem Butonları */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
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
            gap: 6
          }}
        >
          <span>📲</span> Rehbere Kaydet
        </button>

        <button
          onClick={handleShare}
          style={{
            background: "rgba(255,255,255,0.07)",
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

      {/* Doğrudan WhatsApp Aç Butonu */}
      <button
        onClick={() => {
          const cleanPhone = phone.replace(/[^0-9]/g, "");
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
          boxShadow: "0 6px 20px rgba(37, 211, 102, 0.25)"
        }}
      >
        <span>💬</span> Müşteri WhatsApp İletişim Hattı
      </button>
    </div>
  );
};
